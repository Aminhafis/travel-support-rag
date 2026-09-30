import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// 1. Connection pool to Supabase
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for Supabase cloud SSL
});

// 2. Helper to turn a JS array into Postgres vector format: [0.1, 0.2] -> "[0.1,0.2]"
export function toSqlVector(embeddingArray) {
  return JSON.stringify(embeddingArray);
}

// 3. Initialize table schema & vector index
export async function initDb() {
  let client;
  try {
    console.log('🔄 Connecting to database & checking pgvector extension...');
    client = await pool.connect();

    // Step A: Enable pgvector extension
    await client.query('CREATE EXTENSION IF NOT EXISTS vector;');

    // Step B: Create travel_documents table with 768-dimension vector
    await client.query(`
      CREATE TABLE IF NOT EXISTS travel_documents (
        id SERIAL PRIMARY KEY,
        source_file VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        embedding vector(768),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Step C: Create HNSW vector index for lightning-fast similarity lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS travel_docs_embedding_idx 
      ON travel_documents 
      USING hnsw (embedding vector_cosine_ops);
    `);

    console.log(' Connected to Supabase and verified travel_documents table schema!');
  } catch (err) {
    console.error('❌ Database initialization error:', err);
    throw err;
  } finally {
    if (client) client.release(); // Return client back to the pool
  }
}

// Allow running directly from terminal: node src/db.js
if (process.argv[1] && process.argv[1].endsWith('db.js')) {
  initDb()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}