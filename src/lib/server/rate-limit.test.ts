import { afterEach, describe, expect, it, vi } from 'vitest';
import { clientKey, createRateLimiter, type CounterStore } from './rate-limit';

function fakeStore() {
	const counts = new Map<string, number>();
	const store: CounterStore = {
		hit: (key) => {
			const count = (counts.get(key) ?? 0) + 1;
			counts.set(key, count);
			return Promise.resolve(count);
		}
	};
	return { store, counts };
}

const LIMITS = [
	{ windowSeconds: 60, max: 3 },
	{ windowSeconds: 3600, max: 5 }
];

function setup(startSeconds = 600_000) {
	const clock = { seconds: startSeconds };
	const { store, counts } = fakeStore();
	const limiter = createRateLimiter(store, { limits: LIMITS, now: () => clock.seconds * 1000 });
	return { clock, counts, limiter };
}

async function hits(limiter: ReturnType<typeof createRateLimiter>, address: string, n: number) {
	const verdicts = [];
	for (let i = 0; i < n; i++) verdicts.push(await limiter.check(address));
	return verdicts.map((verdict) => verdict.allowed);
}

afterEach(() => vi.restoreAllMocks());

describe('clientKey', () => {
	it('keeps an IPv4 address as it is', () => {
		expect(clientKey('203.0.113.7')).toBe('203.0.113.7');
	});

	it('unwraps an IPv4 address seen through an IPv6 socket', () => {
		expect(clientKey('::ffff:203.0.113.7')).toBe('203.0.113.7');
	});

	it.each([
		['2001:db8:abcd:12:1:2:3:4', '2001:db8:abcd:12::/64'],
		['2001:db8:abcd:12:ffff:ffff:ffff:ffff', '2001:db8:abcd:12::/64'],
		['2001:0DB8:ABCD:0012::1', '2001:db8:abcd:12::/64'],
		['2001:db8::1', '2001:db8:0:0::/64'],
		['::1', '0:0:0:0::/64'],
		['fe80::1%eth0', 'fe80:0:0:0::/64']
	])('buckets %s by its /64 prefix', (address, key) => {
		expect(clientKey(address)).toBe(key);
	});

	it('separates neighbouring /64 prefixes', () => {
		expect(clientKey('2001:db8:abcd:12::1')).not.toBe(clientKey('2001:db8:abcd:13::1'));
	});

	it('passes through anything that is not an IP address', () => {
		expect(clientKey('unknown')).toBe('unknown');
	});
});

describe('rate limiter', () => {
	it('allows up to the limit, then refuses with the time left in the window', async () => {
		const { limiter, clock } = setup(600_000);
		clock.seconds += 20;

		expect(await hits(limiter, '203.0.113.7', 3)).toEqual([true, true, true]);
		expect(await limiter.check('203.0.113.7')).toEqual({ allowed: false, retryAfterSeconds: 40 });
	});

	it('allows again once the window has passed', async () => {
		const { limiter, clock } = setup();

		expect(await hits(limiter, '203.0.113.7', 4)).toEqual([true, true, true, false]);
		clock.seconds += 60;
		expect(await hits(limiter, '203.0.113.7', 1)).toEqual([true]);
	});

	it('enforces the longer window across several short ones', async () => {
		const { limiter, clock } = setup(3600 * 200);

		expect(await hits(limiter, '203.0.113.7', 3)).toEqual([true, true, true]);
		clock.seconds += 60;
		expect(await hits(limiter, '203.0.113.7', 2)).toEqual([true, true]);
		clock.seconds += 60;
		expect(await limiter.check('203.0.113.7')).toEqual({
			allowed: false,
			retryAfterSeconds: 3600 - 120
		});
	});

	it('does not spend the longer allowance on attempts the short window refused', async () => {
		const { limiter, counts } = setup();

		await hits(limiter, '203.0.113.7', 10);
		const hourly = [...counts].find(([key]) => key.startsWith('rate:create:3600:'));
		expect(hourly?.[1]).toBe(3);
	});

	it('counts clients separately', async () => {
		const { limiter } = setup();

		expect(await hits(limiter, '203.0.113.7', 4)).toEqual([true, true, true, false]);
		expect(await hits(limiter, '203.0.113.8', 1)).toEqual([true]);
	});

	it('counts every address in an IPv6 /64 as one client', async () => {
		const { limiter } = setup();

		expect(await hits(limiter, '2001:db8:abcd:12::1', 3)).toEqual([true, true, true]);
		expect(await hits(limiter, '2001:db8:abcd:12:9:9:9:9', 1)).toEqual([false]);
		expect(await hits(limiter, '2001:db8:abcd:13::1', 1)).toEqual([true]);
	});

	it('allows the request when the store fails', async () => {
		const log = vi.spyOn(console, 'error').mockImplementation(() => {});
		const limiter = createRateLimiter({ hit: () => Promise.reject(new Error('down')) });

		expect(await limiter.check('203.0.113.7')).toEqual({ allowed: true });
		expect(log).toHaveBeenCalledOnce();
	});

	it('allows the request when the store does not answer in time', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const limiter = createRateLimiter({ hit: () => new Promise(() => {}) }, { timeoutMs: 20 });
		const started = Date.now();

		expect(await limiter.check('203.0.113.7')).toEqual({ allowed: true });
		expect(Date.now() - started).toBeLessThan(500);
	});
});
