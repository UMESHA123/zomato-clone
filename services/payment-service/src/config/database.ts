import knex, { type Knex } from 'knex';
import { config } from './index.js';

let db: Knex | null = null;

export async function connectDatabase(): Promise<void> {
  try {
    db = knex({
      client: 'pg',
      connection: {
        host: config.postgres.host,
        port: config.postgres.port,
        user: config.postgres.user,
        password: config.postgres.password,
        database: config.postgres.database,
      },
      pool: { min: 2, max: 10 },
    });

    // Test connection
    await db.raw('SELECT 1');
    console.log('Connected to PostgreSQL');
  } catch (error) {
    console.error('PostgreSQL connection error:', error);
    process.exit(1);
  }
}

export function getDb(): Knex {
  if (!db) throw new Error('Database not initialized');
  return db;
}

export async function getDbStatus(): Promise<string> {
  try {
    if (!db) return 'disconnected';
    await db.raw('SELECT 1');
    return 'connected';
  } catch {
    return 'disconnected';
  }
}
