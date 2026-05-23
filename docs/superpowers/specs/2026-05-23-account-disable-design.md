# Design: Reversible Account Disable + Change History

**Date:** 2026-05-23
**Status:** Approved (v1)
**Component:** WealthTrack — Accounts management

## Problem

A user can close a real-world account (e.g. Standard Chartered credit card) or finish
paying off a loan (HDFC Home Loan), but the app offers no recognizable way to retire
that account. Mechanically an `is_active` flag and a toggle endpoint already exist, but
the Accounts screen renders the state as a static-looking **"Active"** pill that reads as
a read-only badge, not an action — so in practice no account has ever been disabled (all
18 live accounts are `is_active = true`).

The user wants:
1. A clear, explicit way to **disable** an account from the Accounts screen.
2. **Reversible** behavior — re-enable an account later if needed.
3. A **history** of enable/disable changes, kept in the database.
4. **No data ever deleted** — disabling is a soft state change.
5. Charts and totals must stay correct — a disabled account's past contribution must
   still be reflected in historical snapshots.

## Key context discovered

- The live dataset `modular-ground-487105-k2.net_worth_tracker` already has **5 tables**
  (`accounts`, `periods`, `records`, `ingest_log`, `ingest_state`), so CLAUDE.md's
  "keep it at 3 tables" guidance is already historical — adding one small table is fine.
- Net worth has two sources of truth: the cached `periods.total_nw` (drives the trend and
  MoM charts) and the detailed `records` rows (drive the current-snapshot cards and the
  allocation pie). **Neither depends on `accounts.is_active`**, so disabling an account
  does not alter any historical total or chart. This is the property we must preserve.
- `NewSnapshot.jsx` already filters the entry form to `a.is_active`, so a disabled account
  is automatically excluded from future snapshots — the desired behavior.

## Behavior (v1)

- Each account row in **Accounts** shows an explicit **Disable** button (active accounts)
  or **Enable** button (disabled accounts), replacing the ambiguous "Active" pill.
- Disabling shows a confirm dialog: *"This hides the account from new snapshots. All past
  data is kept and totals are unchanged. You can re-enable anytime."*
- The Accounts list is split into an **Active** section and a **Disabled accounts**
  section (at the bottom); each disabled account shows **when it was disabled**
  (e.g. *"Disabled 23 May 2026"*).
- Disabled accounts are excluded from the **New Snapshot** entry form. All their existing
  `records` rows and every `periods.total_nw` value are untouched, so the trend chart,
  MoM velocity chart, KPI cards, and allocation pie are all unaffected.
- Fully reversible: **Enable** brings the account back into the New Snapshot form.

### Out of scope for v1
- No per-account history viewer in the UI (history is stored, not displayed).
- No reason/note input in the UI (the `note` column exists but is left null by the UI).
- No deletion of any data, ever.

## Data model

Add **one** append-only table, following the existing style (`STRING` ids, no foreign
keys, region `asia-south1`):

```sql
CREATE TABLE IF NOT EXISTS `<project>.net_worth_tracker.account_status_events` (
  id STRING NOT NULL,          -- uuid, generated in app code
  account_id STRING NOT NULL,  -- references accounts.id (no FK enforced)
  is_active BOOL NOT NULL,     -- the NEW state established by this change
  changed_at TIMESTAMP NOT NULL,
  note STRING                  -- optional, nullable; reserved for future use
);
```

- `accounts.is_active` remains the **cached current state** (so existing read paths are
  unchanged). This mirrors the app's existing `periods.total_nw`-as-cached-aggregate
  pattern.
- The events table is written **append-only** via streaming `insert()` — BigQuery's
  reliable path, with no DML on this table.
- **Baseline seed:** during setup, insert one `is_active = true` event per existing
  account (using a fixed historical `changed_at`, e.g. the account-creation date or a
  migration timestamp) so every account's timeline is complete from the start.

## API changes

### `PUT /api/accounts/[id]` (modified)
- Change from a blind `SET is_active = NOT is_active` to accepting an explicit body:
  `{ "is_active": <bool>, "note"?: <string> }`.
- Steps, in order:
  1. `insert` an event row into `account_status_events`
     (`{ id: uuid, account_id: id, is_active, changed_at: now, note: note ?? null }`).
     This is the durable record of truth.
  2. `UPDATE accounts SET is_active = @is_active WHERE id = @id` (best-effort cached flag).
- On error from either step, return non-200 so the UI surfaces it (no silent success).
- Rationale for explicit target state (vs. toggle): the event must record the exact new
  state, and the client already knows the current state, so it sends the intended value.

### `GET /api/accounts` (modified, same row shape + one field)
- Return each account plus its latest `changed_at`, via a `LEFT JOIN` to the most-recent
  event per account, e.g.:
  ```sql
  SELECT a.*, e.changed_at AS status_changed_at
  FROM `<ds>.accounts` a
  LEFT JOIN (
    SELECT account_id, changed_at,
           ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY changed_at DESC) AS rn
    FROM `<ds>.account_status_events`
  ) e ON e.account_id = a.id AND e.rn = 1
  ORDER BY a.type, a.category, a.name
  ```
- `status_changed_at` is used only to render the "Disabled on …" label; existing
  consumers ignore the extra field.

### No new endpoints in v1
- A `GET /api/accounts/[id]/history` endpoint is deferred (history viewer is out of scope).

## UI changes

### `components/AccountSettings.jsx`
- Replace the `Active`/`Hidden` status pill with an explicit **Disable** / **Enable**
  button (destructive-looking for Disable, neutral for Enable).
- Add a confirm dialog before disabling (and a lighter confirm or none for enabling).
- Split rendering into two groups: **Active** accounts and **Disabled accounts**; render
  the disabled-on date (`status_changed_at`) for each disabled account.

### `app/page.jsx`
- `handleToggleAccount(id)` becomes `handleSetAccountActive(id, isActive)` (or keeps the
  name but sends the explicit target). It `PUT`s `{ is_active }`, and on success updates
  local `accounts` state with the new `is_active` and a fresh `status_changed_at`.
- Keep the optimistic-update-after-success pattern already in place.

## Backup plan (before any change)

The database is tiny and all changes are additive, but per the user's request we snapshot
first:
- Export `accounts`, `periods`, `records` to timestamped local JSON files
  (read-only `SELECT`), **and/or** `bq cp` each to a `*_backup_YYYYMMDD` table in the
  dataset.
- Verify row counts match the live tables before proceeding with the DDL.

## Edge cases

- **Streaming-buffer UPDATE limit:** a freshly *added* account disabled within ~90 minutes
  could hit BigQuery's restriction on DML against rows still in the streaming buffer. The
  event insert still records the change correctly; the cached-flag `UPDATE` may fail and
  the UI shows the error to retry. Does not affect the existing 18 accounts (long since
  flushed to managed storage).
- **Re-enable after a gap:** an account re-enabled after being skipped for some months
  pre-fills 0 in the next snapshot (its last `record` predates the gap). The user
  re-enters the value. Acceptable.
- **Disabling an account that still has a record in the latest period:** that record
  still displays/counts for that period (it was real), and the account simply drops out of
  *future* snapshots. Correct.

## Testing

No automated test suite exists. Manual verification checklist:
1. Backup exists and row counts match before changes.
2. `account_status_events` table created; baseline events present for all accounts.
3. Disable **SC Credit Card** → it moves to the Disabled section with today's date; an
   event row is written; it no longer appears in New Snapshot; Dashboard trend / MoM /
   KPIs / allocation are unchanged.
4. Disable **HDFC Home Loan** → same checks.
5. Re-enable SC Credit Card → it returns to the Active section and to the New Snapshot
   form; a second event row is written.
6. Confirm no `records` or `periods` rows were modified or deleted.

## Files affected

- `bigquery-setup.sql` — add `account_status_events` DDL.
- `scripts/` — (optional) seed baseline events + backup helper.
- `app/api/accounts/[id]/route.js` — explicit target state + event insert.
- `app/api/accounts/route.js` — join latest event for `status_changed_at`.
- `components/AccountSettings.jsx` — Disable/Enable buttons, confirm, grouped sections.
- `app/page.jsx` — send explicit target state, update local state.
- `CLAUDE.md` — note the new table and the disable/history behavior.
