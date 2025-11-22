# TinyLink

TinyLink is a small URL shortener and statistics app built with Node.js, Express, Sequelize (Postgres), and EJS for server-rendered views. It provides a lightweight dashboard for creating and managing short links and a small JSON API for programmatic usage.

This README explains how to set up the project locally, available endpoints, and how to use the provided Postman collection.

## Quick facts

- Server: Express (ES modules)
- ORM: Sequelize (Postgres)
- Views: EJS (server-rendered dashboard)
- Static assets: `public/` (CSS/JS)
- Views: `src/views/`
- Main server file: `src/index.js`

## Requirements

- Node.js 18+ (or a recent LTS)
- PostgreSQL (or a hosted Postgres compatible DB)

## Environment

Create a `.env` file or export `DATABASE_URL` pointing at your Postgres instance. Example `.env.sample` is included in the repo.

The app will read `process.env.DATABASE_URL`. Example connection string:

```text
postgres://username:password@localhost:5432/tinylink
```

If you use SSL or managed DBs, set the proper `DATABASE_URL` accordingly.

## Install

1. Install dependencies:

```bash
npm install
```

1. (Optional) Copy the sample env file and edit it:

```bash
cp .env.sample .env
# edit .env to set DATABASE_URL
```

1. Run the app in development:

```bash
npm run dev
```

By default the server listens on port `3000`.

## Database

The app uses Sequelize and calls `sequelize.sync()` on startup (development convenience) so the required table(s) will be created automatically. For production, prefer running migrations instead of `sync()`.

## Routes

### Web UI (server-rendered)

- `GET /` — Dashboard (list of links, create form)
- `POST /links` — Create a link (form, redirects back to `/`)
- `POST /links/delete` — Delete a link (form, redirects back to `/`)
- `GET /code/:code` — Stats page (UI for a single code)
- `GET /healthz.html` — Human-facing health page (HTML)

### JSON API

- `POST /api/links` — Create a short link.

  Body (JSON):

  ```json
  {
    "url": "https://example.com",
    "short_key": "optional"
  }
  ```

  Response: `201` and the created link object on success.

- `GET /api/links` — List all saved links (JSON array).

- `GET /api/links/:code` — Returns stats for a single code. Response shape includes `short_key`, `url`, `stats`, `last_clicked_time`, `createdAt`, `updatedAt`.

- `DELETE /api/links/:code` — Deletes the link. Returns `204` on success.

### Redirect behavior

- `GET /:code`
  - Redirects (`302`) to the stored `url` for the given short key and increments `stats` and `last_clicked_time`.

### Health endpoints

- `GET /healthz`
  - Returns JSON only (for monitoring):

```json
{ "ok": true, "db": "ok", "version": "1.0" }
```

```json
{ "ok": false, "db": "down", "version": "1.0" }
```

- `GET /healthz.html`
  - Renders the same health state as an HTML page for humans.

## Postman collection

A minimal Postman collection containing only the API endpoints is provided at:

```text
postman/TinyLink_API.postman_collection.json
```

Import it into Postman and set the `baseUrl` collection variable (default `http://localhost:3000`). Use `{{code}}` variable for per-code requests.

## Frontend notes

- Dashboard templates: `src/views/dashboard.ejs`, `src/views/partials/*`
- The table in the dashboard is wrapped in a scrollable container with a sticky header for better UX on small screens.
- Minimal client JS is in `public/js/dashboard.js` (copy-to-clipboard and client-side filter/sort).

## Troubleshooting

- Server exits with DB connection errors: verify `DATABASE_URL` and Postgres is reachable.
- Port already in use: change `port` in `src/index.js` or set `PORT` environment variable and adapt `src/index.js` accordingly.
- For production:

  1. Replace `sequelize.sync()` with tracked migrations.
  1. Add proper input validation, rate limiting, and authentication if needed.

## Privacy / security notes

- The stats endpoint currently returns the target `url`. If you want to keep target URLs private, remove `url` from the `/api/links/:code` response.
- Consider adding authentication for management endpoints if this will be used in production.

## Development tips

- The project uses EJS templates and vanilla JS so you can quickly iterate on UI.
- To prefill Postman tests, you can POST a link then copy the returned `short_key` into the `{{code}}` variable for follow-up calls.

## License

This project has no license specified — add a `LICENSE` file if you plan to publish.
