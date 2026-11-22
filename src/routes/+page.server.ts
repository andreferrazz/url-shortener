import { fail } from '@sveltejs/kit';
import { createLink } from '#lib/server/links.ts';
import { parseTargetUrl } from '#lib/url.ts';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, url }) => {
		const value = (await request.formData()).get('url');
		const input = typeof value === 'string' ? value : '';

		const target = parseTargetUrl(input, url.host);
		if (!target.ok) return fail(400, { url: input, message: target.message });

		const slug = await createLink(target.url);
		return { shortUrl: `${url.origin}/${slug}`, target: target.url };
	}
};
