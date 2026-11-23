import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	DATABASE_URL: { description: 'The database connection string.' },
	VALKEY_URL: {
		description: 'Connection string of the Valkey (or Redis) server holding the redirect cache.'
	},
	DATABASE_POOL_MAX: {
		description:
			'Most database connections one app instance may open. Instances times this must fit the pooler or Postgres limit.',
		schema: (value) => {
			if (value === undefined || value === '') return 10;
			const max = Number(value);
			if (!Number.isInteger(max) || max < 1) {
				throw new Error('DATABASE_POOL_MAX must be a positive integer');
			}
			return max;
		}
	}
});
