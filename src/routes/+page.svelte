<script lang="ts">
	import { enhance } from '$app/forms';
	import { MAX_URL_LENGTH } from '#lib/url.ts';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();

	let submitting = $state(false);
	let copyLabel = $state('Copy');

	async function copy(text: string) {
		// The clipboard is missing on plain-http origins and can be refused by
		// the browser; the link stays on screen to copy by hand.
		try {
			await navigator.clipboard.writeText(text);
			copyLabel = 'Copied';
		} catch {
			copyLabel = 'Copy failed';
		}
	}
</script>

<svelte:head>
	<title>URL shortener</title>
</svelte:head>

<main>
	<h1>Shorten a link</h1>

	<form
		method="POST"
		use:enhance={() => {
			submitting = true;
			copyLabel = 'Copy';
			return async ({ update }) => {
				await update();
				submitting = false;
			};
		}}
	>
		<label for="url">Long URL</label>
		<div class="row">
			<input
				id="url"
				name="url"
				type="url"
				required
				maxlength={MAX_URL_LENGTH}
				placeholder="https://example.com/a/very/long/path"
				value={form?.url ?? ''}
				aria-invalid={form?.message && !form.limited ? 'true' : undefined}
				aria-describedby={form?.message ? 'url-error' : undefined}
			/>
			<button disabled={submitting}>{submitting ? 'Shortening…' : 'Shorten'}</button>
		</div>
		{#if form?.message}
			<p id="url-error" class="error">{form.message}</p>
		{/if}
	</form>

	{#if form?.shortUrl}
		<section class="result" aria-live="polite">
			<p class="label">Short link</p>
			<div class="row">
				<!-- An absolute URL answered by the redirect endpoint, not an app page to resolve. -->
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a href={form.shortUrl} rel="external">{form.shortUrl}</a>
				<button type="button" onclick={() => copy(form.shortUrl)}>
					{copyLabel}
				</button>
			</div>
			<p class="target">Goes to {form.target}</p>
		</section>
	{/if}
</main>

<style>
	:global(body) {
		margin: 0;
		font-family: system-ui, sans-serif;
		line-height: 1.5;
		color-scheme: light dark;
	}

	main {
		max-width: 36rem;
		margin: 0 auto;
		padding: 4rem 1.25rem;
	}

	h1 {
		margin: 0 0 1.5rem;
		font-size: 1.75rem;
	}

	label,
	.label {
		display: block;
		margin: 0 0 0.375rem;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.row {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	input {
		flex: 1;
		min-width: 0;
	}

	input,
	button {
		padding: 0.625rem 0.75rem;
		font: inherit;
		border: 1px solid light-dark(#b4b4b4, #555);
		border-radius: 0.375rem;
	}

	button {
		cursor: pointer;
		white-space: nowrap;
	}

	button:disabled {
		cursor: progress;
		opacity: 0.6;
	}

	input[aria-invalid='true'] {
		border-color: light-dark(#b3261e, #f2b8b5);
	}

	.error {
		margin: 0.375rem 0 0;
		font-size: 0.875rem;
		color: light-dark(#b3261e, #f2b8b5);
	}

	.result {
		margin-top: 2rem;
		padding: 1rem;
		border: 1px solid light-dark(#d0d0d0, #444);
		border-radius: 0.5rem;
	}

	.result a {
		flex: 1;
		min-width: 0;
		font-size: 1.125rem;
		overflow-wrap: anywhere;
	}

	.target {
		margin: 0.5rem 0 0;
		font-size: 0.875rem;
		opacity: 0.75;
		overflow-wrap: anywhere;
	}
</style>
