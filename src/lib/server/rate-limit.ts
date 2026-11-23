import { isIPv4, isIPv6 } from 'node:net';
import { withDeadline } from './deadline';

/** The one counter operation the limiter needs, so tests can supply a fake. */
export interface CounterStore {
	/** Adds one to the counter, starting its expiry on the first hit, and returns the new count. */
	hit(key: string, ttlSeconds: number): Promise<number>;
}

export interface Limit {
	windowSeconds: number;
	max: number;
}

// Shortest window first: an attempt stopped by the minute limit does not use
// up the day's allowance.
export const CREATE_LIMITS: Limit[] = [
	{ windowSeconds: 60, max: 10 },
	{ windowSeconds: 24 * 60 * 60, max: 100 }
];

// A slow limiter must not hold up link creation.
const TIMEOUT_MS = 100;

export type Verdict = { allowed: true } | { allowed: false; retryAfterSeconds: number };

/**
 * The key a client is counted under. An IPv4 address counts on its own. An
 * IPv6 address counts by its /64 prefix, because one subscriber is handed the
 * whole /64 and could otherwise use a fresh address for every request.
 */
export function clientKey(address: string): string {
	const ip = address.split('%')[0].toLowerCase();

	if (isIPv4(ip)) return ip;
	if (!isIPv6(ip)) return address;

	// An IPv4 client seen through an IPv6 socket, such as ::ffff:203.0.113.7.
	const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(ip);
	if (mapped) return mapped[1];

	const [head, tail = ''] = ip.split('::');
	const headGroups = head ? head.split(':') : [];
	const tailGroups = tail ? tail.split(':') : [];
	const missing = ip.includes('::') ? 8 - headGroups.length - tailGroups.length : 0;
	const groups = [...headGroups, ...Array<string>(Math.max(missing, 0)).fill('0'), ...tailGroups];

	return (
		groups
			.slice(0, 4)
			.map((group) => group.replace(/^0+(?=.)/, ''))
			.join(':') + '::/64'
	);
}

/**
 * Fixed-window rate limiter. Counters live in the shared store, so the limit
 * holds across all app instances.
 */
export function createRateLimiter(
	store: CounterStore,
	{ limits = CREATE_LIMITS, now = Date.now, timeoutMs = TIMEOUT_MS } = {}
) {
	async function check(address: string): Promise<Verdict> {
		const client = clientKey(address);
		const seconds = Math.floor(now() / 1000);

		try {
			for (const { windowSeconds, max } of limits) {
				const window = Math.floor(seconds / windowSeconds);
				const key = `rate:create:${windowSeconds}:${client}:${window}`;
				const count = await withDeadline(store.hit(key, windowSeconds), timeoutMs);

				if (count > max) {
					return { allowed: false, retryAfterSeconds: (window + 1) * windowSeconds - seconds };
				}
			}
		} catch (error) {
			// Fail open: when the store is unreachable, creating links stays
			// possible and the limit is briefly not enforced.
			console.error('Rate limit not enforced:', error instanceof Error ? error.message : error);
		}

		return { allowed: true };
	}

	return { check };
}
