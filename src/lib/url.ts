export const MAX_URL_LENGTH = 2048;

export type TargetUrl = { ok: true; url: string } | { ok: false; message: string };

/**
 * Checks a URL someone wants to shorten. `ownHost` is this app's host, so a
 * short link cannot point back at the app and loop.
 */
export function parseTargetUrl(input: string, ownHost: string): TargetUrl {
	const value = input.trim();

	if (!value) return invalid('Enter a URL.');
	if (value.length > MAX_URL_LENGTH) {
		return invalid(`The URL is too long. The limit is ${MAX_URL_LENGTH} characters.`);
	}
	if (!URL.canParse(value)) {
		return invalid('Enter a full URL, starting with http:// or https://.');
	}

	const url = new URL(value);

	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		return invalid('Only http and https links can be shortened.');
	}
	if (url.host === ownHost.toLowerCase()) {
		return invalid('That link already points to this site.');
	}

	return { ok: true, url: url.href };
}

function invalid(message: string): TargetUrl {
	return { ok: false, message };
}
