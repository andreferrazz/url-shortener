import { json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { db, readDb } from '#lib/server/db/index.ts';
import { withDeadline } from '#lib/server/deadline.ts';
import { valkey } from '#lib/server/valkey.ts';
import type { RequestHandler } from './$types';

// A pooler queues queries while the database is away instead of refusing them,
// so without a deadline a check would hang for as long as the pooler waits.
const TIMEOUT_MS = 2000;

const probe = (check: Promise<unknown>) =>
	withDeadline(check, TIMEOUT_MS).then(
		() => true,
		() => false
	);

// For load balancers. An instance stays in rotation as long as it can serve
// some redirects: from the cache, a replica or the primary. Losing the primary
// alone must not take every instance out, or cached links would stop working
// during a failover. The body says what is up, for monitoring.
//
// The path is deliberately not 7 characters long, so it can never shadow a slug.
export const GET: RequestHandler = async () => {
	const [primary, replica, cache] = await Promise.all([
		probe(db.execute(sql`select 1`)),
		readDb === db ? undefined : probe(readDb.execute(sql`select 1`)),
		probe(valkey.ping())
	]);

	const canRedirect = primary || replica === true || cache;
	const state = (up: boolean) => (up ? 'up' : 'down');

	return json(
		{
			status: canRedirect ? 'ok' : 'unavailable',
			primary: state(primary),
			...(replica === undefined ? {} : { replica: state(replica) }),
			cache: state(cache)
		},
		{ status: canRedirect ? 200 : 503 }
	);
};
