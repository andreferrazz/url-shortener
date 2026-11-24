import { withDeadline } from './deadline';

/**
 * Runs `first` with a deadline and, if it fails or is too slow, `second`.
 * Without a `second` the failure is passed on.
 */
export async function withFallback<T>(
	first: () => Promise<T>,
	second: (() => Promise<T>) | undefined,
	{ timeoutMs, onFallback }: { timeoutMs: number; onFallback?: (error: unknown) => void }
): Promise<T> {
	try {
		return await withDeadline(first(), timeoutMs);
	} catch (error) {
		if (!second) throw error;
		onFallback?.(error);
		return withDeadline(second(), timeoutMs);
	}
}
