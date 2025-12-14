import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

const connectionString =
  process.env.REMOTE_SUPABASE_DB_URL ||
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error(
    'Missing REMOTE_SUPABASE_DB_URL / DATABASE_URL / SUPABASE_DB_URL environment variable.'
  );
  process.exit(1);
}

const migrationsDir = path.resolve('supabase', 'migrations');
const migrationFilter = process.env.MIGRATION_FILE;

if (!fs.existsSync(migrationsDir)) {
  console.error(`Migrations directory not found at ${migrationsDir}`);
  process.exit(1);
}

const run = async () => {
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  await client.connect();
  console.log('Connected to remote database.');

  let files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  if (migrationFilter) {
    files = files.filter((file) => file.includes(migrationFilter));
    if (files.length === 0) {
      throw new Error(`No migration matching "${migrationFilter}" found.`);
    }
  }

  for (const file of files) {
    const fullPath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(fullPath, 'utf8');
    if (!sql.trim()) {
      continue;
    }

    console.log(`\nRunning migration: ${file}`);
    try {
      await client.query(sql);
      console.log(`Migration ${file} applied successfully.`);
    } catch (err) {
      console.error(`Failed while running ${file}:`, err.message);
      throw err;
    }
  }

  await client.end();
  console.log('\nAll migrations applied successfully.');
};

run().catch((err) => {
  console.error('\nMigration process aborted.');
  console.error(err);
  process.exit(1);
});
