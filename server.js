import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { answerQuestion } from './src/rag.js';
import { ingestKnowledgeBase } from './src/ingest.js';
import { pool } from './src/db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
// Serve the chat frontend from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// 1. Health & Document Count Endpoint
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM travel_documents;');
    res.json({
      status: 'healthy',
      documentChunksCount: parseInt(result.rows[0].count, 10),
      database: 'connected'
    });
  } catch (err) {
    res.status(500).json({
      status: 'unhealthy',
      error: err.message
    });
  }
});

// 2. Chat Support Endpoint (Calls your RAG engine!)
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Missing "message" in request body' });
  }

  try {
    const result = await answerQuestion(message);
    res.json(result);
  } catch (err) {
    console.error('Chat error:', err);
    const isHighDemand = err.status === 503 || err.message?.includes('high demand') || err.message?.includes('503');
    res.status(500).json({
      error: 'Failed to process question',
      details: isHighDemand
        ? 'The AI model is experiencing a temporary traffic spike. Please click Send again in a few seconds.'
        : err.message
    });
  }
});

// 3. Re-sync / Ingest Endpoint
app.post('/api/ingest', async (req, res) => {
  try {
    await ingestKnowledgeBase();
    res.json({ message: 'Ingestion completed successfully!' });
  } catch (err) {
    console.error('Ingestion error:', err);
    res.status(500).json({
      error: 'Ingestion failed',
      details: err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`\n==============================================`);
  console.log(`🌍 Thaikootam Travel Support RAG Server Running!`);
  console.log(`📍 Web Chat UI: http://localhost:${PORT}`);
  console.log(`==============================================\n`);
});