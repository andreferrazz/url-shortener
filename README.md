# url-shortener

Paste a long URL, get a short link. Opening the short link redirects to the
original URL.

Built with SvelteKit, Postgres and Drizzle.

## Run it locally

You need Node 26 (`mise install` picks it up from `mise.toml`), pnpm and Docker.

```sh
pnpm install
cp .env.example .env
pnpm db:start     # Postgres in Docker, on localhost:5433
pnpm db:migrate   # create the tables
pnpm dev
```

## Commands

| Command            | What it does                                |
| ------------------ | ------------------------------------------- |
| `pnpm dev`         | Start the dev server                        |
| `pnpm test`        | Run the unit tests                          |
| `pnpm check`       | Type-check the project                      |
| `pnpm lint`        | Check formatting and lint                   |
| `pnpm build`       | Build for production                        |
| `pnpm db:generate` | Write a migration after changing the schema |
| `pnpm db:migrate`  | Apply pending migrations                    |

## How it works

- Links live in one `links` table, keyed by slug
  (`src/lib/server/db/schema.ts`). Schema changes go through the SQL
  migrations in `drizzle/`.
- A slug is 7 random base62 characters from the cryptographic generator, so
  links cannot be guessed or enumerated. A collision is rejected by the primary
  key and retried with a new slug.
- The redirect answers with a 302, so every visit reaches the server and a link
  can still be changed or removed later.

## Not built yet

Anyone who can reach the app can create links: there is no sign-in and no rate
limit. Add one of them before deploying it somewhere public.
