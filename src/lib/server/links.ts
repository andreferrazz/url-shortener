import { eq } from 'drizzle-orm';
import { generateSlug } from '#lib/slug.ts';
import { db } from './db';
import { links } from './db/schema';

const MAX_ATTEMPTS = 5;

/** Stores a link under a new random slug and returns the slug. */
export async function createLink(url: string): Promise<string> {
	for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
		// A taken slug inserts nothing and returns no row, so we try another one.
		// No lookup first: the primary key decides, even between racing requests.
		const [created] = await db
			.insert(links)
			.values({ slug: generateSlug(), url })
			.onConflictDoNothing()
			.returning({ slug: links.slug });

		if (created) return created.slug;
	}

	throw new Error(`No free slug after ${MAX_ATTEMPTS} attempts`);
}

export async function findUrl(slug: string): Promise<string | undefined> {
	const [link] = await db
		.select({ url: links.url })
		.from(links)
		.where(eq(links.slug, slug))
		.limit(1);

	return link?.url;
}
