import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { pool, toSqlVector } from './db.js';

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Step 1: RETRIEVAL
 * Converts the user's question into 768 coordinates and asks
 * PostgreSQL to find the top matching document chunks using Cosine Distance (<=>).
 */
export async function retrieveRelevantDocs(question, limit = 3) {
  // 1. Get 768 coordinates for the question
  const embedResponse = await ai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: question,
    config: {
      outputDimensionality: 768
    }
  });

  const questionVector =
    embedResponse.embedding?.values ||
    embedResponse.embeddings?.[0]?.values ||
    embedResponse.values;

  // 2. Query PostgreSQL for the closest vectors
  // <=> is the Cosine Distance operator: 0 = identical, 1 = completely different
  // Similarity score = 1 - distance (e.g. 0.92 = 92% match)
  const query = `
    SELECT 
      id,
      source_file,
      title,
      content,
      ROUND((1 - (embedding <=> $1::vector))::numeric, 4) AS similarity_score
    FROM travel_documents
    ORDER BY embedding <=> $1::vector ASC
    LIMIT $2;
  `;

  const { rows } = await pool.query(query, [toSqlVector(questionVector), limit]);
  return rows;
}

/**
 * Step 2: AUGMENTED GENERATION
 * Combines the retrieved chunks + the customer question into a prompt for Gemini Chat.
 */
export async function answerQuestion(question) {
  // 1. Retrieve top 3 matching chunks
  const relevantDocs = await retrieveRelevantDocs(question, 3);

  if (!relevantDocs || relevantDocs.length === 0) {
    return {
      answer: "I apologize, but our travel knowledge base hasn't been initialized yet.",
      sources: []
    };
  }

  // 2. Format the retrieved paragraphs into a clean context block
  const contextString = relevantDocs
    .map((doc, idx) => `[Source ${idx + 1}: ${doc.source_file} - "${doc.title}"]\n${doc.content}`)
    .join('\n\n---\n\n');

  // 3. Strict System Prompt (Guardrails against hallucination)
  const systemPrompt = `
You are "Thaikootam Concierge", the official AI customer support assistant for Thaikootam Travel.

Rules:
1. Answer the customer's question politely, clearly, and warmly using ONLY the provided context.
2. If the context does not contain the answer, say: "I don't have that specific information in our current policies. Please contact our 24/7 team at support@thaikootamtravel.com."
3. Never make up prices, rules, or baggage limits.
4. At the very end of your response, list the source files you used under a "Citations:" heading.
`.trim();

  const userPrompt = `
Context:
${contextString}

Customer Question:
${question}
`.trim();

  // 4. Ask Gemini to generate the grounded answer (with automatic retry on 503 high demand)
  let response;
  const modelsToTry = ['gemini-3.6-flash', 'gemini-2.0-flash'];
  let lastError;

  for (const modelName of modelsToTry) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: `${systemPrompt}\n\n${userPrompt}`
        });
        if (response) break;
      } catch (err) {
        lastError = err;
        if (err.status === 503) {
          console.warn(`⚠️ ${modelName} experiencing high demand (503). Retrying in 1.5s...`);
          await new Promise((resolve) => setTimeout(resolve, 1500));
        } else {
          break;
        }
      }
    }
    if (response) break;
  }

  if (!response) {
    throw lastError;
  }

  return {
    answer: response.text,
    sources: relevantDocs.map((doc) => ({
      sourceFile: doc.source_file,
      title: doc.title,
      similarity: parseFloat(doc.similarity_score),
      snippet: doc.content.slice(0, 140) + '...'
    }))
  };
}

// Quick CLI test from terminal: node src/rag.js "What is the baggage limit?"
if (process.argv[1] && process.argv[1].endsWith('rag.js')) {
  const query = process.argv[2] || 'Can I get a refund if I cancel my flight 5 days before?';
  console.log(`\n🔍 Customer Question: "${query}"\n`);
  
  answerQuestion(query)
    .then((res) => {
      console.log('🤖 Thaikootam Concierge Answer:\n');
      console.log(res.answer);
      console.log('\n📚 Retrieved Sources & Similarity:');
      console.dir(res.sources, { depth: null });
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Error:', err);
      process.exit(1);
    });
}