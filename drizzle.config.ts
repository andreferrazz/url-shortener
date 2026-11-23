import { defineConfig } from 'drizzle-kit';

// Migrations go to Postgres directly, not through the pooler: they take locks
// and run in a session, which a transaction-mode pooler does not preserve.
const url = process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error('Set DATABASE_DIRECT_URL (or DATABASE_URL)');

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'postgresql',
	dbCredentials: { url },
	verbose: true,
	strict: true
});
