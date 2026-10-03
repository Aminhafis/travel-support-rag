<div align="center">

# 🤖 Travel Support RAG Chatbot

**A production-grade AI customer support chatbot powered by Retrieval-Augmented Generation (RAG)**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-travel--support--rag.vercel.app-6366f1?style=for-the-badge&logo=vercel)](https://travel-support-rag.vercel.app)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://github.com/pgvector/pgvector)
[![Gemini API](https://img.shields.io/badge/Google-Gemini%20API-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

*Ask any travel question → get grounded, hallucination-resistant answers from your own knowledge base.*

</div>

---

## 📖 What Is This?

**Travel Support RAG** is a full-stack AI chatbot that answers customer travel questions using **Retrieval-Augmented Generation (RAG)** — an architecture that grounds LLM responses in your own documents, eliminating hallucinations.

Instead of relying on a generic AI that makes things up, this chatbot:
1. **Finds** the most relevant paragraphs in a knowledge base (vector search)
2. **Feeds** those exact paragraphs as context to the AI model
3. **Generates** a precise, sourced answer — refusing to answer if no relevant data is found

> **Why RAG over a plain chatbot?** A plain LLM invents answers. A RAG system *retrieves facts first, then generates* — giving you control over what the AI knows.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        RAG PIPELINE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  INGESTION (one-time setup)          INFERENCE (per question)   │
│  ─────────────────────────          ──────────────────────────  │
│                                                                  │
│  data/*.md files                     User Question              │
│       │                                    │                    │
│       ▼                                    ▼                    │
│  chunker.js                    Gemini Embedding API             │
│  (split by ## headings)        (gemini-embedding-001)           │
│       │                        (768 dimensions)                 │
│       ▼                                    │                    │
│  Gemini Embedding API                      ▼                    │
│  (vectorize each chunk)        PostgreSQL + pgvector            │
│       │                        (cosine similarity <=>)          │
│       ▼                                    │                    │
│  PostgreSQL / pgvector                     ▼                    │
│  (store 768-dim vectors)       Top 3 matching chunks            │
│                                            │                    │
│                                            ▼                    │
│                                Gemini Flash (generation)        │
│                                + retrieved context              │
│                                            │                    │
│                                            ▼                    │
│                                   Grounded Answer               │
│                                  (with source citations)        │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✨ Features

- 🧠 **Semantic search** — finds relevant content by *meaning*, not just keyword matching
- 🛡️ **Anti-hallucination guardrails** — strict system prompt prevents the AI from making up answers outside the knowledge base
- 📎 **Source citations** — every answer cites which document it came from
- 📄 **Markdown-native knowledge base** — add any `.md` file to `data/` and run ingest
- 🔄 **Idempotent ingestion** — run `npm run ingest` as many times as you want; it safely replaces old data
- 🏥 **Health check endpoint** — `/api/health` shows document count and database status
- 🌐 **Full-stack** — Express backend + vanilla HTML/CSS/JS frontend, both on one Vercel deployment
- ☁️ **Serverless-ready** — deployed on Vercel with `@vercel/node` runtime

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js (ES Modules) |
| **Server** | Express.js |
| **AI Embeddings** | Google Gemini API — `gemini-embedding-001` (768 dims) |
| **AI Generation** | Google Gemini Flash |
| **Vector Database** | PostgreSQL + pgvector extension |
| **Database Host** | Supabase (managed PostgreSQL) |
| **Chunking Strategy** | Markdown heading-based (`## ` splits) |
| **Similarity Metric** | Cosine Distance (`<=>` operator) |
| **Frontend** | Vanilla HTML · CSS · JavaScript |
| **Deployment** | Vercel (serverless Node.js) |

---

## 📁 Project Structure

```
travel-support-rag/
├── server.js           # Express app — REST API + static frontend serving
├── vercel.json         # Vercel deployment config (@vercel/node)
├── .env.example        # Environment variable template
├── package.json        # Dependencies + npm scripts
│
├── src/
│   ├── rag.js          # Core RAG logic: embed question → retrieve → generate
│   ├── ingest.js       # Knowledge base ingestion pipeline
│   ├── chunker.js      # Markdown document → chunks splitter
│   └── db.js           # PostgreSQL pool + pgvector schema init
│
├── data/               # 📂 YOUR KNOWLEDGE BASE — drop .md files here
│   └── *.md            # Each file = one topic (visa, flights, hotels, etc.)
│
└── public/             # Chat UI (served as static files by Express)
    ├── index.html
    ├── style.css
    └── app.js
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- A [Supabase](https://supabase.com) account (free tier works)
- A [Google AI Studio](https://aistudio.google.com) API key (free)

### 1. Clone the repository

```bash
git clone https://github.com/Aminhafis/travel-support-rag.git
cd travel-support-rag
npm install
```

### 2. Set up your environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
PORT=3000
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxx.supabase.co:5432/postgres
GEMINI_API_KEY=your_gemini_api_key_here
```

> **Get your keys:**
> - `DATABASE_URL` → Supabase Dashboard → Project Settings → Database → Connection String
> - `GEMINI_API_KEY` → [Google AI Studio](https://aistudio.google.com/app/apikey) → Create API key

### 3. Add your knowledge base

Place one or more `.md` files in the `data/` folder. Use `##` headings to separate topics — the chunker splits on these:

```markdown
# Travel FAQ

## Visa Requirements for Germany
International students need a...

## Flight Booking Tips
The best time to book flights is...
```

### 4. Ingest your knowledge base

This command reads all `.md` files, creates embeddings via Gemini, and stores them in PostgreSQL:

```bash
npm run ingest
```

You should see output like:
```
 Starting Knowledge Base Ingestion...
 Reading documents from ./data...
 Found 12 flashcards to vectorize.
🧠 Sending text to Google Gemini (gemini-embedding-001)...
✅ Ingestion complete. 12 chunks stored.
```

### 5. Start the server

```bash
npm start
```

Open `http://localhost:3000` — the chat UI is live.

---

## 🔌 API Reference

### `GET /api/health`
Returns the server status and number of document chunks in the database.

```json
{
  "status": "healthy",
  "documentChunksCount": 12,
  "database": "connected"
}
```

### `POST /api/chat`
Accepts a user question and returns a grounded AI answer.

**Request:**
```json
{
  "question": "What documents do I need for a German student visa?"
}
```

**Response:**
```json
{
  "answer": "For a German student visa, you need: ...",
  "sources": [
    {
      "source_file": "germany-visa.md",
      "title": "Student Visa Requirements",
      "similarity_score": 0.9241
    }
  ]
}
```

---

## ☁️ Deploy to Vercel

### One-click deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Aminhafis/travel-support-rag)

### Manual deploy

```bash
npm install -g vercel
vercel --prod
```

Add your environment variables in the Vercel dashboard:
`Settings → Environment Variables → Add: DATABASE_URL, GEMINI_API_KEY`

Then re-run ingest against your production database:
```bash
DATABASE_URL=your_prod_url npm run ingest
```

---

## 🧠 How RAG Works (Under the Hood)

```
User types: "What documents do I need for a German student visa?"
                          │
                          ▼
          ┌───────────────────────────────┐
          │  Gemini Embedding API         │
          │  → 768-dimensional vector     │
          │  [0.023, -0.891, 0.341, ...]  │
          └───────────────────────────────┘
                          │
                          ▼
          ┌───────────────────────────────┐
          │  PostgreSQL + pgvector        │
          │  SELECT ... ORDER BY          │
          │  embedding <=> $1 ASC         │  ← cosine distance
          │  LIMIT 3                      │
          └───────────────────────────────┘
                          │
                 Top 3 matching chunks
                          │
                          ▼
          ┌───────────────────────────────┐
          │  Gemini Flash (generation)    │
          │                               │
          │  System: "You are a travel    │
          │  assistant. Answer ONLY from  │
          │  the provided context..."     │
          │                               │
          │  Context: [chunk1][chunk2]    │
          │  [chunk3]                     │
          │                               │
          │  Question: "What documents..."│
          └───────────────────────────────┘
                          │
                          ▼
          Grounded answer with source citations
```

**Cosine similarity explained:**
- Score `1.0` = identical meaning
- Score `0.9+` = highly relevant
- Score `< 0.5` = probably unrelated

The query uses the `<=>` (cosine distance) operator from pgvector, converts to similarity with `1 - distance`, and returns the top 3 closest chunks.

---

## 🔧 Customizing for Your Use Case

This project is not just for travel — swap out the `data/` files for any domain:

| Domain | What to put in `data/` |
|---|---|
| E-commerce support | Product FAQs, shipping policies, return policies |
| HR chatbot | Company handbook, benefits docs, onboarding guides |
| University assistant | Course catalog, exam regulations, campus FAQ |
| Legal FAQ | Summarized legal documents, jurisdiction guides |
| Medical clinic | Appointment policies, common procedures FAQ |

Just drop your `.md` files into `data/` and re-run `npm run ingest`.

---

## 📚 What I Learned Building This

This project taught me:
- **RAG architecture** — the retrieve-then-generate pattern and why it beats plain LLMs for factual accuracy
- **Vector embeddings** — how text becomes 768-dimensional coordinate space and how cosine similarity finds semantic matches
- **pgvector** — enabling vector operations natively inside PostgreSQL using the `<=>` operator
- **Supabase** — managed PostgreSQL with SSL configuration for cloud deployment
- **Anti-hallucination design** — writing strict system prompts that force the model to refuse questions outside its knowledge base
- **Full-stack deployment** — serving an Express API + static frontend as a single Vercel serverless function

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 👤 Author

**Amin Hafis**
- GitHub: [@Aminhafis](https://github.com/Aminhafis)
- LinkedIn: [linkedin.com/in/amin-hafis](https://www.linkedin.com/in/amin-hafis/)
- Portfolio: [portfolio-seven-wheat-42.vercel.app](https://portfolio-seven-wheat-42.vercel.app)

---

## 📄 License

MIT © [Amin Hafis](https://github.com/Aminhafis)

---

<div align="center">

**⭐ If this project helped you understand RAG, give it a star!**

*Built with Node.js · Express · PostgreSQL · pgvector · Google Gemini API · Supabase · Vercel*

</div>
