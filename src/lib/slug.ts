const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export const SLUG_LENGTH = 7;
export const SLUG_PATTERN = new RegExp(`^[0-9A-Za-z]{${SLUG_LENGTH}}$`);

// Bytes at or above this would make the low characters of the alphabet slightly
// more likely after the modulo, so they are thrown away.
const UNBIASED_LIMIT = 256 - (256 % ALPHABET.length);

/**
 * A random slug that cannot be predicted from earlier ones: it comes from the
 * cryptographic generator, not Math.random, so links cannot be enumerated.
 */
export function generateSlug(): string {
	let slug = '';
	while (slug.length < SLUG_LENGTH) {
		for (const byte of crypto.getRandomValues(new Uint8Array(SLUG_LENGTH * 2))) {
			if (byte >= UNBIASED_LIMIT) continue;
			slug += ALPHABET[byte % ALPHABET.length];
			if (slug.length === SLUG_LENGTH) break;
		}
	}
	return slug;
}
