import { error, redirect } from '@sveltejs/kit';
import { findUrl } from '#lib/server/links.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const url = await findUrl(params.slug);
	if (!url) error(404, 'Link not found');

	// 302, not 301: browsers cache a 301 for good, so a link could never be
	// changed, removed or counted afterwards. Sending visitors to another site
	// is the whole point here, so the external redirect is allowed on purpose.
	redirect(302, url, { external: true });
};
