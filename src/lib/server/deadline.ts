/** Rejects if the promise has not settled within `ms` milliseconds. */
export function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const deadline = new Promise<never>((_, reject) => {
		timer = setTimeout(() => reject(new Error(`No answer in ${ms} ms`)), ms);
	});
	return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}
