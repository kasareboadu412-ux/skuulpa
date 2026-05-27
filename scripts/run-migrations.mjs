#!/usr/bin/env node
import { readFileSync, readdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const envPath = join(root, '.env.local');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^\s*([^#=]+?)\s*=\s*(.*?)\s*$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
}

const dbUrl = process.env.DATABASE_URL || (
  process.env.SUPABASE_DB_PASSWORD
    ? `postgresql://postgres:${encodeURIComponent(process.env.SUPABASE_DB_PASSWORD)}@db.rerwtsuahvajgvzfrwzl.supabase.co:5432/postgres`
    : null
);

if (!dbUrl) {
  console.error('Need SUPABASE_DB_PASSWORD env var or DATABASE_URL in .env.local');
  process.exit(1);
}

const migrationsDir = join(root, 'supabase', 'migrations');
const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  console.log('Connected to database\n');
  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), 'utf-8');
    console.log('Running', file, '...');
    await client.query(sql);
    console.log('  OK -', file);
  }
  console.log('\nAll migrations applied!');
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
