import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const links = pgTable('links', {
	// The primary key is the unique index the redirect reads, and what makes a
	// slug collision fail the insert instead of overwriting a link.
	slug: text('slug').primaryKey(),
	url: text('url').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});
