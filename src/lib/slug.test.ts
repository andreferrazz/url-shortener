import { describe, expect, it } from 'vitest';
import { generateSlug, SLUG_LENGTH, SLUG_PATTERN } from './slug';

describe('generateSlug', () => {
	it('returns slugs of the fixed length using only base62 characters', () => {
		for (let i = 0; i < 1000; i++) {
			const slug = generateSlug();
			expect(slug).toHaveLength(SLUG_LENGTH);
			expect(slug).toMatch(SLUG_PATTERN);
		}
	});

	it('does not repeat across a large sample', () => {
		const sample = new Set(Array.from({ length: 100_000 }, generateSlug));
		expect(sample.size).toBe(100_000);
	});

	it('uses every character of the alphabet', () => {
		const seen = new Set(Array.from({ length: 2000 }, generateSlug).join(''));
		expect(seen.size).toBe(62);
	});
});

describe('SLUG_PATTERN', () => {
	it.each(['abc', 'abcdefgh', 'abc-efg', 'abc/efg', ''])('rejects %j', (value) => {
		expect(value).not.toMatch(SLUG_PATTERN);
	});
});
