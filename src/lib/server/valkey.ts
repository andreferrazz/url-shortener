import { createClient } from 'redis';
import { building } from '$app/env';
import { VALKEY_URL } from '$app/env/private';

/**
 * One shared connection to Valkey. Valkey is an optimisation here, never a
 * requirement: callers must keep working when a command fails.
 */
export const valkey = createClient({
	url: VALKEY_URL,
	// While disconnected, fail commands straight away instead of queueing them,
	// so a request falls back to the database at once.
	disableOfflineQueue: true,
	socket: {
		connectTimeout: 1000,
		reconnectStrategy: (retries) => Math.min(retries * 100, 2000)
	}
});

// The client emits an error on every failed reconnect attempt; without a
// listener that would crash the process, and unthrottled it would flood the log.
let lastLogged = 0;
valkey.on('error', (error: unknown) => {
	const now = Date.now();
	if (now - lastLogged < 10_000) return;
	lastLogged = now;
	console.error('Valkey error:', error instanceof Error ? error.message : error);
});

// SvelteKit imports server code while building; there is nothing to connect to then.
if (!building) {
	valkey.connect().catch(() => {
		// Reported by the error listener; the client keeps retrying in the background.
	});
}
