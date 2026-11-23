import { describe, expect, it, vi } from 'vitest';
import { createLinkCache, TTL_SECONDS, type KeyValueStore } from './link-cache';

function fakeStore(initial: Record<string, string> = {}) {
	const data = new Map(Object.entries(initial));
	const ttls = new Map<string, number>();
	const store: KeyValueStore = {
		get: (key) => Promise.resolve(data.get(key) ?? null),
		set: (key, value, ttl) => {
			data.set(key, value);
			ttls.set(key, ttl);
			return Promise.resolve();
		}
	};
	return { store, data, ttls };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
const never = <T>() => new Promise<T>(() => {});

describe('link cache', () => {
	it('answers from the cache without loading', async () => {
		const { store } = fakeStore({ 'link:abc1234': 'https://example.com/' });
		const load = vi.fn<(slug: string) => Promise<string | undefined>>();

		expect(await createLinkCache(store).find('abc1234', load)).toBe('https://example.com/');
		expect(load).not.toHaveBeenCalled();
	});

	it('loads on a miss and stores the result with an expiry', async () => {
		const { store, data, ttls } = fakeStore();
		const load = vi.fn(() => Promise.resolve<string | undefined>('https://example.com/'));
		const cache = createLinkCache(store);

		expect(await cache.find('abc1234', load)).toBe('https://example.com/');
		await settle();
		expect(data.get('link:abc1234')).toBe('https://example.com/');
		expect(ttls.get('link:abc1234')).toBe(TTL_SECONDS);

		expect(await cache.find('abc1234', load)).toBe('https://example.com/');
		expect(load).toHaveBeenCalledTimes(1);
	});

	it('does not cache unknown slugs', async () => {
		const { store, data } = fakeStore();

		expect(await createLinkCache(store).find('zzzzzzz', () => Promise.resolve(undefined))).toBe(
			undefined
		);
		await settle();
		expect(data.size).toBe(0);
	});

	it('falls back to loading when the cache fails', async () => {
		const store: KeyValueStore = {
			get: () => Promise.reject(new Error('down')),
			set: () => Promise.reject(new Error('down'))
		};

		expect(
			await createLinkCache(store).find('abc1234', () => Promise.resolve('https://example.com/'))
		).toBe('https://example.com/');
		await settle();
	});

	it('falls back to loading when the cache does not answer in time', async () => {
		const store: KeyValueStore = { get: never, set: never };
		const started = Date.now();

		expect(
			await createLinkCache(store, 20).find('abc1234', () =>
				Promise.resolve('https://example.com/')
			)
		).toBe('https://example.com/');
		expect(Date.now() - started).toBeLessThan(500);
	});

	it('remember stores a link and never throws', async () => {
		const { store, data } = fakeStore();
		await createLinkCache(store).remember('abc1234', 'https://example.com/');
		expect(data.get('link:abc1234')).toBe('https://example.com/');

		const broken: KeyValueStore = { get: never, set: () => Promise.reject(new Error('down')) };
		await expect(createLinkCache(broken).remember('abc1234', 'x')).resolves.toBeUndefined();
	});
});
