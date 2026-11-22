import { describe, expect, it } from 'vitest';
import { MAX_URL_LENGTH, parseTargetUrl } from './url';

const OWN_HOST = 'sho.rt';
const parse = (input: string) => parseTargetUrl(input, OWN_HOST);

/** The rejection message, or undefined when the URL was accepted. */
function rejection(input: string, ownHost = OWN_HOST): string | undefined {
	const result = parseTargetUrl(input, ownHost);
	return result.ok ? undefined : result.message;
}

describe('parseTargetUrl', () => {
	it('accepts http and https URLs and normalises them', () => {
		expect(parse('https://example.com/a?b=c#d')).toEqual({
			ok: true,
			url: 'https://example.com/a?b=c#d'
		});
		expect(parse('  HTTP://Example.com  ')).toEqual({ ok: true, url: 'http://example.com/' });
	});

	it.each(['', '   '])('rejects empty input %j', (input) => {
		expect(rejection(input)).toBe('Enter a URL.');
	});

	it.each(['example.com', 'not a url', '/relative/path'])('rejects %j as not a URL', (input) => {
		expect(rejection(input)).toContain('full URL');
	});

	it.each(['ftp://example.com', 'javascript:alert(1)', 'data:text/html,hi', 'file:///etc/passwd'])(
		'rejects the non-web scheme in %j',
		(input) => {
			expect(rejection(input)).toContain('Only http and https');
		}
	);

	it('rejects URLs over the length limit and accepts one at the limit', () => {
		const base = 'https://example.com/';
		const atLimit = base + 'a'.repeat(MAX_URL_LENGTH - base.length);
		expect(rejection(atLimit)).toBeUndefined();
		expect(rejection(atLimit + 'a')).toContain('too long');
	});

	it('rejects links to the app itself, whatever the case or scheme', () => {
		expect(rejection('https://sho.rt/abc1234')).toContain('this site');
		expect(rejection('http://SHO.RT/')).toContain('this site');
		expect(rejection('http://localhost:5173/x', 'localhost:5173')).toContain('this site');
		expect(rejection('https://sho.rt.example.com/')).toBeUndefined();
	});
});
