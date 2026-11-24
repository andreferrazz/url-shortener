import { describe, expect, it, vi } from 'vitest';
import { withFallback } from './fallback';

const never = <T>() => new Promise<T>(() => {});

describe('withFallback', () => {
	it('returns the first result without trying the second', async () => {
		const second = vi.fn(() => Promise.resolve('second'));

		expect(await withFallback(() => Promise.resolve('first'), second, { timeoutMs: 50 })).toBe(
			'first'
		);
		expect(second).not.toHaveBeenCalled();
	});

	it('keeps an empty first result: a miss is an answer, not a failure', async () => {
		const second = vi.fn(() => Promise.resolve<string | undefined>('second'));

		expect(await withFallback(() => Promise.resolve(undefined), second, { timeoutMs: 50 })).toBe(
			undefined
		);
		expect(second).not.toHaveBeenCalled();
	});

	it('uses the second when the first fails, and reports why', async () => {
		const onFallback = vi.fn();
		const failure = new Error('replica down');

		expect(
			await withFallback(
				() => Promise.reject(failure),
				() => Promise.resolve('second'),
				{ timeoutMs: 50, onFallback }
			)
		).toBe('second');
		expect(onFallback).toHaveBeenCalledWith(failure);
	});

	it('uses the second when the first does not answer in time', async () => {
		const started = Date.now();

		expect(
			await withFallback(never<string>, () => Promise.resolve('second'), { timeoutMs: 20 })
		).toBe('second');
		expect(Date.now() - started).toBeLessThan(500);
	});

	it('fails when there is no second', async () => {
		await expect(
			withFallback(() => Promise.reject(new Error('down')), undefined, { timeoutMs: 50 })
		).rejects.toThrow('down');
	});

	it('fails when both fail or the second is too slow', async () => {
		await expect(
			withFallback(
				() => Promise.reject(new Error('replica down')),
				() => Promise.reject(new Error('primary down')),
				{ timeoutMs: 50 }
			)
		).rejects.toThrow('primary down');

		await expect(
			withFallback(() => Promise.reject(new Error('replica down')), never<string>, {
				timeoutMs: 20
			})
		).rejects.toThrow('No answer');
	});
});
