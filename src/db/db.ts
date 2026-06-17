import { Pool, PoolClient } from 'pg';
import * as fs from 'fs/promises';
import * as path from 'path';

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'internal_memo_portal'
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export async function initializeDatabase() {
  const client = await pool.connect();
  try {
    console.log('Initializing database...');
    
    // Read and execute schema
    const schemaPath = path.resolve(process.cwd(), 'src', 'db', 'schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf-8');
    
    // Split schema into individual statements and execute
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    for (const statement of statements) {
      try {
        await client.query(statement);
      } catch (err) {
        // Table already exists errors are OK
        if (!((err as any).code === '42P07' || (err as any).code === '23505')) {
          throw err;
        }
      }
    }
    
    console.log('Database initialized successfully');
  } finally {
    client.release();
  }
}

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 100) {
      console.log('Executed query', { text, duration, rows: result.rowCount });
    }
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

export async function closePool() {
  await pool.end();
}

export default pool;
