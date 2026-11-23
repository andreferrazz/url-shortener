import { json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { withDeadline } from '#lib/server/deadline.ts';
import type { RequestHandler } from './$types';

// A pooler queues queries while the database is away instead of refusing them,
// so without a deadline this check would hang for as long as the pooler waits.
const TIMEOUT_MS = 2000;

// For load balancers: an instance that cannot reach the database should stop
// receiving traffic. The path is deliberately not 7 characters long, so it can
// never shadow a slug.
export const GET: RequestHandler = async () => {
	try {
		await withDeadline(db.execute(sql`select 1`), TIMEOUT_MS);
		return json({ status: 'ok' });
	} catch (error) {
		console.error('Health check failed:', error instanceof Error ? error.message : error);
		return json({ status: 'unavailable' }, { status: 503 });
	}
};
