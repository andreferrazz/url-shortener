import { client } from '#lib/server/db/index.ts';

// The Node adapter emits this once it has stopped accepting requests and the
// in-flight ones have finished (on SIGTERM or SIGINT). Closing the database
// connections here lets the process exit promptly during a rolling restart.
process.on('sveltekit:shutdown', () => {
	void client.end({ timeout: 5 });
});
