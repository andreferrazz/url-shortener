import { withDeadline } from './deadline';

/** The two Valkey commands the cache needs, so tests can supply a fake. */
export interface KeyValueStore {
	get(key: string): Promise<string | null>;
	set(key: string, value: string, ttlSeconds: number): Promise<unknown>;
}

// Links cannot be edited yet, so a cached target is never wrong. The expiry is
// here so that, once links can be changed or taken down, the old target is
// served for a bounded time.
export const TTL_SECONDS = 24 * 60 * 60;

// A slow cache must not make a redirect slower than reading the database.
export const TIMEOUT_MS = 100;

const key = (slug: string) => `link:${slug}`;

export function createLinkCache(store: KeyValueStore, timeoutMs = TIMEOUT_MS) {
	async function read(slug: string): Promise<string | undefined> {
		try {
			return (await withDeadline(store.get(key(slug)), timeoutMs)) ?? undefined;
		} catch {
			// Unreachable or slow cache: treat it as a miss.
			return undefined;
		}
	}

	/** Stores a link. Never throws and never needs awaiting. */
	async function remember(slug: string, url: string): Promise<void> {
		try {
			await withDeadline(store.set(key(slug), url, TTL_SECONDS), timeoutMs);
		} catch {
			// The link is in the database; the next lookup will try again.
		}
	}

	/**
	 * Returns the target for a slug from the cache, or loads it and caches it.
	 * Unknown slugs are not cached: a scan tries a different slug every time, so
	 * remembering the misses would only fill memory.
	 */
	async function find(
		slug: string,
		load: (slug: string) => Promise<string | undefined>
	): Promise<string | undefined> {
		const cached = await read(slug);
		if (cached !== undefined) return cached;

		const url = await load(slug);
		if (url !== undefined) void remember(slug, url);
		return url;
	}

	return { find, remember };
}
