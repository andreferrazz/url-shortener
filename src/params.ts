import { defineParams } from '@sveltejs/kit/params';
import { SLUG_PATTERN } from '#lib/slug.ts';

export const params = defineParams({
	// Paths that cannot be a slug never match the redirect route, so they get a
	// 404 without a database read.
	slug: (param) => (SLUG_PATTERN.test(param) ? param : undefined)
});
