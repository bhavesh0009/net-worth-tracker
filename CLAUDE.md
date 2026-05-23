# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

WealthTrack is a single-user personal net-worth tracker. It replaces a manual Excel sheet by storing **account-level monthly snapshots** in Google BigQuery. Stack: Next.js 14 (App Router, JavaScript/JSX — no TypeScript), NextAuth (Google OAuth), Tailwind, Recharts. Deploys to both Vercel and Google Cloud Run.

## Commands

```bash
npm run dev          # Local dev server (localhost:3000)
npm run build        # Production build (output: 'standalone' for Docker)
npm run lint         # next lint (eslint-config-next)

# One-time / historical data scripts (run directly with node, need .env.local)
npm run setup-accounts      # Create accounts, writes scripts/account-ids.json
npm run import-historical   # Bulk import historical periods (depends on account-ids.json)
npm run verify-import       # Print counts + date range to verify an import
```

There is no test suite. The historical-data scripts and `scripts/account-ids.json` are gitignored (contain personal data); `scripts/setup-accounts.js` must run before `import-historical-data.js`.

## Architecture

Three layers, all server-side data access funnels through `lib/bigquery.js`:

- **`app/page.jsx`** — single client component holding ALL app state. On auth it calls `fetchAllData()`, which fetches accounts + periods, then loops `/api/records?period_id=` once per period (N+1 by design). View is toggled via local `view` state between `Dashboard`, `NewSnapshot`, `AccountSettings` — there is no routing beyond the API.
- **`app/api/*/route.js`** — REST handlers. Every handler starts by calling `getServerSession(authOptions)` and returns 401 if absent. They build SQL strings interpolating `process.env.GCP_PROJECT_ID`/`GCP_DATASET_ID` for the table name and pass user values as params.
- **`lib/bigquery.js`** — thin BigQuery wrapper. `query(sql, params)`, `insertRows(table, rows)`. Location is hardcoded to `asia-south1`. Credentials come from `GOOGLE_APPLICATION_CREDENTIALS_JSON` (full service-account JSON as a single env string, `JSON.parse`d at runtime).

### Data model (4 app tables + 2 ingest tables)

`accounts` (id, name, type `'Asset'|'Liability'`, category, is_active) · `periods` (id, month_date, notes, total_nw) · `records` (id, period_id, account_id, amount). See `bigquery-setup.sql` for DDL; `records` is clustered by `(period_id, account_id)`. (The live dataset also has `ingest_log` / `ingest_state` from the historical import.)

`account_status_events` (id, account_id, is_active, changed_at, note) is an **append-only** history of every enable/disable change. `accounts.is_active` stays the cached current state; this table is the durable log. Written via streaming insert in `PUT /api/accounts/[id]` (which also best-effort `UPDATE`s the cached flag) and in `POST /api/accounts` (a `'created'` baseline event). `GET /api/accounts` LEFT JOINs the latest event per account as `status_changed_at` (the Accounts UI shows "Disabled on …"). Disabling drops an account from the New Snapshot form but never touches `records`/`periods`, so all historical charts and totals are unchanged.

### Net worth has two sources of truth — this is the central gotcha

`periods.total_nw` is a **cached** aggregate written at snapshot time. Most historical periods (imported in bulk) have ONLY `total_nw` and **no `records` rows**. Only app-created snapshots (and the seeded Oct 2025 period) have full account-level records.

Consequences when touching `Dashboard.jsx` / `NewSnapshot.jsx`:
- The **trend chart and previous-month comparisons read `total_nw` exclusively** — they work for periods that lack records.
- The **current-snapshot cards / allocation pie compute from `records`**, falling back to `total_nw` only when a period has zero records.
- Sign convention is inconsistent and easy to break: `Dashboard.jsx` does `Math.abs()` on liability amounts then `assets - liabilities`, while `NewSnapshot.jsx` sums liability inputs as entered. Verify the sign of any liability amount you write so it agrees with both readers.

### BigQuery streaming-insert gotchas

All writes use `table.insert()` (streaming buffer), not DML. Rows are not immediately deletable/updatable, and there are **no DELETE endpoints** — re-importing requires manual `DELETE ... WHERE TRUE` in the BigQuery console (see `scripts/README.md`). The one exception is `PUT /api/accounts/[id]`, which appends an `account_status_events` row (streaming) and then sets `accounts.is_active` via a DML `UPDATE` (the boolean is inlined as `TRUE`/`FALSE`, not a param); the `UPDATE` can fail or be delayed if the account row is still in the streaming buffer (only a risk for an account disabled within ~90 min of being created — the event log still records the change). `POST /api/accounts` writes the account then its baseline event sequentially; if the second insert fails the account exists without a baseline event, which the `GET` LEFT JOIN tolerates (`status_changed_at` is just null).

Note `query()` quietly rewrites `@named` placeholders to positional `?` when params is a non-empty array — but it still passes the original array, so named-param SQL with multiple params can mis-bind. Prefer a single positional param per query, matching the existing routes.

## Auth

Single-user. `lib/auth.js` `signIn` callback returns `true` only when `user.email === process.env.ALLOWED_EMAIL`; everyone else is denied. JWT session strategy. To change who can log in, change the env var, not code.

## Deployment

Two targets share the same env vars:
- **Vercel** (primary, per README) — set env vars in dashboard, set `NEXTAUTH_URL` to the prod URL, add the Google OAuth redirect URI `<url>/api/auth/callback/google`.
- **Cloud Run** — `deploy-cloud-run.sh` (Cloud Build + `gcloud run deploy`); relies on `next.config.js` `output: 'standalone'` and the `Dockerfile`.

## Notes / traps

- **`app.jsx` at the repo root is dead code** (an early single-file prototype) — gitignored and unused. The live app is under `app/`. Don't edit `app.jsx`.
- Path alias `@/*` → repo root (`jsconfig.json`), e.g. `@/lib/auth`, `@/components/Dashboard`.
- Required env (`.env.example`): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GCP_PROJECT_ID`, `GCP_DATASET_ID`, `GOOGLE_APPLICATION_CREDENTIALS_JSON`, `ALLOWED_EMAIL`.
