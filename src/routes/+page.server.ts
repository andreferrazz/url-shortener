import { fail } from '@sveltejs/kit';
import { createLink } from '#lib/server/links.ts';
import { createRateLimiter } from '#lib/server/rate-limit.ts';
import { valkey } from '#lib/server/valkey.ts';
import { parseTargetUrl } from '#lib/url.ts';
import type { Actions } from './$types';

const limiter = createRateLimiter({
	hit: async (key, ttlSeconds) => {
		// One round trip. NX starts the expiry on the first hit only, so later
		// hits do not keep pushing the window's end back.
		const [count] = await valkey.multi().incr(key).expire(key, ttlSeconds, 'NX').exec();
		return Number(count);
	}
});

export const actions: Actions = {
	default: async ({ request, url, getClientAddress, setHeaders }) => {
		const value = (await request.formData()).get('url');
		const input = typeof value === 'string' ? value : '';

		const target = parseTargetUrl(input, url.host);
		if (!target.ok) return fail(400, { url: input, limited: false, message: target.message });

		// After validation, so a typo does not use up the allowance.
		const verdict = await limiter.check(getClientAddress());
		if (!verdict.allowed) {
			setHeaders({ 'retry-after': String(verdict.retryAfterSeconds) });
			return fail(429, {
				url: input,
				limited: true,
				message: `You have created too many links. Try again in ${wait(verdict.retryAfterSeconds)}.`
			});
		}

		const slug = await createLink(target.url);
		return { shortUrl: `${url.origin}/${slug}`, target: target.url };
	}
};

function wait(seconds: number): string {
	if (seconds < 90) return `${seconds} seconds`;
	if (seconds < 90 * 60) return `${Math.round(seconds / 60)} minutes`;
	return `${Math.round(seconds / 3600)} hours`;
}
