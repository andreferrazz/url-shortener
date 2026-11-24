import { eq } from 'drizzle-orm';
import { generateSlug } from '#lib/slug.ts';
import { db, readDb } from './db';
import { links } from './db/schema';
import { withDeadline } from './deadline';
import { withFallback } from './fallback';
import { createLinkCache } from './link-cache';
import { valkey } from './valkey';

const MAX_ATTEMPTS = 5;

// A pooler queues queries while a database is away instead of refusing them,
// so every query gets a deadline; otherwise requests would hang during a
// failover instead of failing cleanly.
const WRITE_TIMEOUT_MS = 3000;
const READ_TIMEOUT_MS = 1000;

const cache = createLinkCache({
	get: (key) => valkey.get(key),
	set: (key, value, ttlSeconds) =>
		valkey.set(key, value, { expiration: { type: 'EX', value: ttlSeconds } })
});

/**
 * Stores a link under a new random slug and returns the slug. Throws when the
 * primary database does not answer in time.
 */
export async function createLink(url: string): Promise<string> {
	for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
		// A taken slug inserts nothing and returns no row, so we try another one.
		// No lookup first: the primary key decides, even between racing requests.
		const [created] = await withDeadline(
			db
				.insert(links)
				.values({ slug: generateSlug(), url })
				.onConflictDoNothing()
				.returning({ slug: links.slug }),
			WRITE_TIMEOUT_MS
		);

		if (created) {
			// Cached straight away, so the first click does not read the database.
			void cache.remember(created.slug, url);
			return created.slug;
		}
	}

	throw new Error(`No free slug after ${MAX_ATTEMPTS} attempts`);
}

async function selectUrl(database: typeof db, slug: string): Promise<string | undefined> {
	const [link] = await database
		.select({ url: links.url })
		.from(links)
		.where(eq(links.slug, slug))
		.limit(1);

	return link?.url;
}

/**
 * The target of a short link: from the cache when it is there, else from a
 * replica, else from the primary. Throws only when none of them answers.
 *
 * A slug the replica does not have is reported as unknown without asking the
 * primary, so a scan of made-up slugs never reaches the primary.
 */
export function findUrl(slug: string): Promise<string | undefined> {
	return cache.find(slug, (slug) =>
		withFallback(
			() => selectUrl(readDb, slug),
			readDb === db ? undefined : () => selectUrl(db, slug),
			{
				timeoutMs: READ_TIMEOUT_MS,
				onFallback: (error) =>
					console.error(
						'Replica read failed, using the primary:',
						error instanceof Error ? error.message : error
					)
			}
		)
	);
}
