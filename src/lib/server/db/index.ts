import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { DATABASE_POOL_MAX, DATABASE_URL } from '$app/env/private';

if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

export const client = postgres(DATABASE_URL, {
	max: DATABASE_POOL_MAX,
	// A pooler in transaction mode (PgBouncer) gives each query whichever
	// connection is free, so a statement prepared on one is missing on the next.
	prepare: false,
	// Fail fast when the database is unreachable, so /health can report it.
	connect_timeout: 5
});

export const db = drizzle(client, { schema });
