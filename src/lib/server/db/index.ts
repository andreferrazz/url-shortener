import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { DATABASE_POOL_MAX, DATABASE_READ_URL, DATABASE_URL } from '$app/env/private';

if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

const options = {
	max: DATABASE_POOL_MAX,
	// A pooler in transaction mode (PgBouncer) gives each query whichever
	// connection is free, so a statement prepared on one is missing on the next.
	prepare: false,
	// Fail fast when the database is unreachable.
	connect_timeout: 5
};

/** The primary: the only connection that can write. */
export const client = postgres(DATABASE_URL, options);
export const db = drizzle(client, { schema });

/**
 * Standby replicas, for reads. They keep answering while the primary is down
 * or being replaced. Without DATABASE_READ_URL this is the primary itself.
 */
export const readClient = DATABASE_READ_URL ? postgres(DATABASE_READ_URL, options) : client;
export const readDb = readClient === client ? db : drizzle(readClient, { schema });
