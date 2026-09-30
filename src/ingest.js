import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { pool, initDb, toSqlVector } from './db.js';
import { loadAndChunkDocuments } from './chunker.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');

// 1. Initialize Gemini with your API key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function ingestKnowledgeBase() {
  console.log(' Starting Knowledge Base Ingestion...\n');

  if (!process.env.GEMINI_API_KEY) {
    throw new Error(' Missing GEMINI_API_KEY in your .env file');
  }

  // 2. Make sure table schema exists in Supabase
  await initDb();

  // 3. Cut our files into flashcards
  console.log(` Reading documents from ${DATA_DIR}...`);
  const chunks = loadAndChunkDocuments(DATA_DIR);
  console.log(` Found ${chunks.length} flashcards to vectorize.\n`);

  const client = await pool.connect();

  try {
    // 4. Wipe old data so we don't get duplicates if we run this twice
    console.log(' Clearing old data in travel_documents...');
    await client.query('TRUNCATE TABLE travel_documents RESTART IDENTITY;');

    console.log('🧠 Sending text to Google Gemini (gemini-embedding-001)...');

    // 5. Loop through each flashcard one-by-one
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const textToEmbed = `Title: ${chunk.title}\nContent:\n${chunk.content}`;

      // Call Gemini: Turns the paragraph into 768 numbers
      const response = await ai.models.embedContent({
        model: 'gemini-embedding-001',
        contents: textToEmbed,
        config: {
          outputDimensionality: 768
        }
      });

      const embeddingVector =
        response.embedding?.values ||
        response.embeddings?.[0]?.values ||
        response.values;

      if (!embeddingVector) {
        console.error('Unexpected response structure:', JSON.stringify(response, null, 2));
        throw new Error('Could not extract embedding vector from Gemini response');
      }

      // Save into PostgreSQL table
      await client.query(
        `INSERT INTO travel_documents (source_file, title, content, embedding)
         VALUES ($1, $2, $3, $4::vector)`,
        [chunk.sourceFile, chunk.title, chunk.content, toSqlVector(embeddingVector)]
      );

      console.log(`   [${i + 1}/${chunks.length}] Vectorized & Saved: "${chunk.title}"`);
    }

    console.log('\n Ingestion complete! All documents are stored in PostgreSQL with AI embeddings.');
  } catch (error) {
    console.error(' Ingestion failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Allow running from terminal: node src/ingest.js
if (process.argv[1] && process.argv[1].endsWith('ingest.js')) {
  ingestKnowledgeBase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Error during ingestion:', err);
      process.exit(1);
    });
}