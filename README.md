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

## System design

```mermaid
flowchart LR
    visitor([Browser])
    target([Target site])

    subgraph app [SvelteKit server]
        create["<b>Create page</b><br/>checks the URL,<br/>picks a random 7-character slug"]
        redirect["<b>Redirect route</b><br/>only matches paths<br/>shaped like a slug"]
    end

    db[("<b>Postgres</b><br/>links table,<br/>slug is the primary key")]

    visitor -- "1. POST / with a long URL" --> create
    create -- "insert, retry if the slug is taken" --> db
    create -. "short link, or 400" .-> visitor

    visitor -- "2. GET /aB3xY9z" --> redirect
    redirect -- "one read by primary key" --> db
    redirect -. "302 to the target, or 404" .-> visitor

    visitor -- "3. follows the redirect" --> target
```

There are two paths through the app. Creating a link validates the URL, picks
a random slug and inserts a row. Opening a short link is a single read by
primary key followed by a 302; it is the path that carries almost all the
traffic, so it does nothing else.

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
