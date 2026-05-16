import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import dotenv from 'dotenv';
dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://pdks_admin:pdks_secure_password_123@localhost:5432/pdks_saas',
});

export const db = drizzle(pool, { schema });

