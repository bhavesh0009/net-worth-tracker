# Account Disable + Change History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an explicit, reversible Disable/Enable action to the Accounts screen, backed by an append-only `account_status_events` history table, without altering any historical snapshot data or chart.

**Architecture:** Keep `accounts.is_active` as the cached current state (existing read paths unchanged). Every state change appends a row to a new `account_status_events` table via streaming insert, then best-effort updates the cached flag via DML. The Accounts UI splits into Active/Disabled sections with a clear Disable/Enable button and shows when each account was disabled.

**Tech Stack:** Next.js 14 App Router (JSX), NextAuth, BigQuery (`lib/bigquery.js`), Tailwind, lucide-react. Live dataset: `modular-ground-487105-k2.net_worth_tracker` (region `asia-south1`).

**Spec:** `docs/superpowers/specs/2026-05-23-account-disable-design.md`

**No automated test suite exists.** Verification = read-only SQL queries (BigQuery MCP `execute_sql_readonly` tool or the BigQuery console) and manual UI checks against a local `npm run dev` server. Writes to BigQuery (DDL/seed/backup) run via the BigQuery MCP `execute_sql` tool or the console.

**Conventions used below:**
- `<ds>` in SQL means the fully-qualified `modular-ground-487105-k2.net_worth_tracker` prefix.
- In app code, table names are interpolated as `${process.env.GCP_PROJECT_ID}.${process.env.GCP_DATASET_ID}` — keep that pattern.

---

### Task 0: Back up the three data tables

**Files:** none (BigQuery only).

- [ ] **Step 1: Create backup copies of accounts, periods, records**

Run in the BigQuery console (or via the `execute_sql` MCP tool), one statement at a time:

```sql
CREATE TABLE `modular-ground-487105-k2.net_worth_tracker.accounts_backup_20260523` AS
SELECT * FROM `modular-ground-487105-k2.net_worth_tracker.accounts`;

CREATE TABLE `modular-ground-487105-k2.net_worth_tracker.periods_backup_20260523` AS
SELECT * FROM `modular-ground-487105-k2.net_worth_tracker.periods`;

CREATE TABLE `modular-ground-487105-k2.net_worth_tracker.records_backup_20260523` AS
SELECT * FROM `modular-ground-487105-k2.net_worth_tracker.records`;
```

- [ ] **Step 2: Verify backup row counts match the live tables**

Run (read-only):

```sql
SELECT 'accounts' t,
  (SELECT COUNT(*) FROM `modular-ground-487105-k2.net_worth_tracker.accounts`) AS live,
  (SELECT COUNT(*) FROM `modular-ground-487105-k2.net_worth_tracker.accounts_backup_20260523`) AS backup
UNION ALL SELECT 'periods',
  (SELECT COUNT(*) FROM `modular-ground-487105-k2.net_worth_tracker.periods`),
  (SELECT COUNT(*) FROM `modular-ground-487105-k2.net_worth_tracker.periods_backup_20260523`)
UNION ALL SELECT 'records',
  (SELECT COUNT(*) FROM `modular-ground-487105-k2.net_worth_tracker.records`),
  (SELECT COUNT(*) FROM `modular-ground-487105-k2.net_worth_tracker.records_backup_20260523`);
```

Expected: every row has `live == backup` (accounts should be 18).

- [ ] **Step 3: Commit (no code change yet — record the backup in the plan progress only)**

No file change in this task. Proceed to Task 1.

---

### Task 1: Add `account_status_events` table

**Files:**
- Modify: `bigquery-setup.sql` (append new table DDL)
- BigQuery: create the table in the live dataset

- [ ] **Step 1: Append the DDL to `bigquery-setup.sql`**

Add this block after the `records` table definition (after the `CLUSTER BY period_id, account_id;` block, before the VERIFICATION QUERIES section):

```sql
-- ============================================================
-- 5. CREATE TABLE: account_status_events
-- ============================================================
-- Append-only history of account enable/disable changes.
-- accounts.is_active remains the cached current state; this table is the
-- durable record of every change. Never updated or deleted.
CREATE TABLE IF NOT EXISTS `deep-span-266614.net_worth_tracker.account_status_events` (
  id STRING NOT NULL,          -- uuid, generated in app code
  account_id STRING NOT NULL,  -- references accounts.id (no FK enforced)
  is_active BOOL NOT NULL,     -- the NEW state established by this change
  changed_at TIMESTAMP NOT NULL,
  note STRING                  -- optional, nullable
);
```

(Note: `bigquery-setup.sql` is a historical artifact still referencing the old project id `deep-span-266614`; keep that consistent with the rest of the file. The live table is created against the real project in Step 2.)

- [ ] **Step 2: Create the table in the live dataset**

Run in the BigQuery console (or via the `execute_sql` MCP tool):

```sql
CREATE TABLE IF NOT EXISTS `modular-ground-487105-k2.net_worth_tracker.account_status_events` (
  id STRING NOT NULL,
  account_id STRING NOT NULL,
  is_active BOOL NOT NULL,
  changed_at TIMESTAMP NOT NULL,
  note STRING
);
```

- [ ] **Step 3: Verify the table exists with the right schema**

Run (read-only):

```sql
SELECT column_name, data_type
FROM `modular-ground-487105-k2.net_worth_tracker.INFORMATION_SCHEMA.COLUMNS`
WHERE table_name = 'account_status_events'
ORDER BY ordinal_position;
```

Expected rows: `id STRING`, `account_id STRING`, `is_active BOOL`, `changed_at TIMESTAMP`, `note STRING`.

- [ ] **Step 4: Commit**

```bash
git add bigquery-setup.sql
git commit -m "feat: add account_status_events table DDL"
```

---

### Task 2: Seed baseline status events

**Files:** none (BigQuery only). Establishes one "active" baseline event per existing account so every account's timeline is complete.

- [ ] **Step 1: Insert one baseline event per existing account**

Run in the BigQuery console (or via the `execute_sql` MCP tool). The events table is brand-new and empty, so this DML INSERT runs cleanly:

```sql
INSERT INTO `modular-ground-487105-k2.net_worth_tracker.account_status_events`
  (id, account_id, is_active, changed_at, note)
SELECT GENERATE_UUID(), id, is_active, TIMESTAMP('2025-12-01 00:00:00 UTC'), 'baseline'
FROM `modular-ground-487105-k2.net_worth_tracker.accounts`;
```

(`2025-12-01` is the dataset creation date, used as the baseline marker.)

- [ ] **Step 2: Verify one baseline event per account, all active**

Run (read-only):

```sql
SELECT
  (SELECT COUNT(*) FROM `modular-ground-487105-k2.net_worth_tracker.accounts`) AS accounts,
  (SELECT COUNT(*) FROM `modular-ground-487105-k2.net_worth_tracker.account_status_events`) AS events,
  (SELECT COUNT(*) FROM `modular-ground-487105-k2.net_worth_tracker.account_status_events` WHERE is_active = TRUE) AS active_events;
```

Expected: `accounts == events == active_events == 18`.

- [ ] **Step 3: No commit (data-only task). Proceed to Task 3.**

---

### Task 3: Record events on account creation (`POST /api/accounts`)

**Files:**
- Modify: `app/api/accounts/route.js` (POST handler)

- [ ] **Step 1: Update the POST handler to also append a baseline event**

Replace the entire contents of `app/api/accounts/route.js` with:

```js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
const { query, insertRows } = require('@/lib/bigquery');
const { v4: uuidv4 } = require('uuid');

// GET /api/accounts - Fetch all accounts with latest status-change timestamp
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const project = process.env.GCP_PROJECT_ID;
    const dataset = process.env.GCP_DATASET_ID;

    const sql = `
      SELECT a.id, a.name, a.type, a.category, a.is_active,
             e.changed_at AS status_changed_at
      FROM \`${project}.${dataset}.accounts\` a
      LEFT JOIN (
        SELECT account_id, changed_at,
               ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY changed_at DESC) AS rn
        FROM \`${project}.${dataset}.account_status_events\`
      ) e ON e.account_id = a.id AND e.rn = 1
      ORDER BY a.type, a.category, a.name
    `;

    const rows = await query(sql);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}

// POST /api/accounts - Create new account (+ baseline status event)
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, category } = body;

    if (!name || !type || !category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const newAccount = {
      id: uuidv4(),
      name,
      type,
      category,
      is_active: true,
    };

    const changedAt = new Date().toISOString();

    await insertRows('accounts', [newAccount]);
    await insertRows('account_status_events', [{
      id: uuidv4(),
      account_id: newAccount.id,
      is_active: true,
      changed_at: changedAt,
      note: 'created',
    }]);

    return NextResponse.json({ ...newAccount, status_changed_at: changedAt }, { status: 201 });
  } catch (error) {
    console.error('Error creating account:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
```

Note: this task folds the modified GET (with the latest-event join) and the modified POST into one file rewrite, since both live in `app/api/accounts/route.js`.

- [ ] **Step 2: Verify the GET join compiles against live data**

Run the GET's join query directly (read-only) to confirm it is valid SQL and returns 18 rows each with a non-null `status_changed_at` (the baseline from Task 2):

```sql
SELECT a.id, a.name, a.is_active, e.changed_at AS status_changed_at
FROM `modular-ground-487105-k2.net_worth_tracker.accounts` a
LEFT JOIN (
  SELECT account_id, changed_at,
         ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY changed_at DESC) AS rn
  FROM `modular-ground-487105-k2.net_worth_tracker.account_status_events`
) e ON e.account_id = a.id AND e.rn = 1
ORDER BY a.type, a.category, a.name;
```

Expected: 18 rows, every `status_changed_at` = `2025-12-01T00:00:00Z`.

- [ ] **Step 3: Commit**

```bash
git add app/api/accounts/route.js
git commit -m "feat: join latest status event in GET accounts; log event on create"
```

---

### Task 4: Set explicit active state + append event (`PUT /api/accounts/[id]`)

**Files:**
- Modify: `app/api/accounts/[id]/route.js` (full rewrite)

- [ ] **Step 1: Rewrite the PUT handler**

Replace the entire contents of `app/api/accounts/[id]/route.js` with:

```js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
const { query, insertRows } = require('@/lib/bigquery');
const { v4: uuidv4 } = require('uuid');

// PUT /api/accounts/[id] - Set account active state explicitly + record history event
// Body: { is_active: boolean, note?: string }
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json().catch(() => ({}));
    const { is_active, note } = body;

    if (typeof is_active !== 'boolean') {
      return NextResponse.json(
        { error: 'is_active (boolean) is required' },
        { status: 400 }
      );
    }

    const changedAt = new Date().toISOString();

    // 1. Append the durable history event (streaming insert — reliable on BigQuery)
    await insertRows('account_status_events', [{
      id: uuidv4(),
      account_id: id,
      is_active,
      changed_at: changedAt,
      note: note || null,
    }]);

    // 2. Update the cached current-state flag (best-effort DML).
    //    is_active is a validated boolean, so inlining TRUE/FALSE is safe and avoids
    //    the multi-named-param mis-binding quirk in lib/bigquery.js (keep one param).
    const sql = `
      UPDATE \`${process.env.GCP_PROJECT_ID}.${process.env.GCP_DATASET_ID}.accounts\`
      SET is_active = ${is_active ? 'TRUE' : 'FALSE'}
      WHERE id = @id
    `;
    await query(sql, [id]);

    return NextResponse.json({ success: true, id, is_active, status_changed_at: changedAt });
  } catch (error) {
    console.error('Error updating account:', error);
    return NextResponse.json(
      { error: 'Failed to update account' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Verify the file has no syntax errors**

Run: `npm run lint`
Expected: no errors for `app/api/accounts/[id]/route.js` (pre-existing warnings elsewhere are fine).

- [ ] **Step 3: Commit**

```bash
git add "app/api/accounts/[id]/route.js"
git commit -m "feat: PUT accounts sets explicit is_active and appends status event"
```

---

### Task 5: Wire explicit target state through `app/page.jsx`

**Files:**
- Modify: `app/page.jsx:90-104` (the `handleToggleAccount` function) and the `<AccountSettings>` render props.

- [ ] **Step 1: Replace `handleToggleAccount` with `handleSetAccountActive`**

Replace this block (currently around lines 89-104):

```js
  // Handle toggle account
  const handleToggleAccount = async (id) => {
    try {
      const response = await fetch(`/api/accounts/${id}`, {
        method: 'PUT',
      });

      if (!response.ok) throw new Error('Failed to toggle account');

      // Update local state
      setAccounts(prev => prev.map(a => a.id === id ? { ...a, is_active: !a.is_active } : a));
    } catch (err) {
      console.error('Error toggling account:', err);
      alert('Failed to update account. Please try again.');
    }
  };
```

with:

```js
  // Handle enable/disable account (explicit target state)
  const handleSetAccountActive = async (id, isActive) => {
    try {
      const response = await fetch(`/api/accounts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive }),
      });

      if (!response.ok) throw new Error('Failed to update account');

      const result = await response.json();

      // Update local state with new flag + change timestamp
      setAccounts(prev => prev.map(a => a.id === id
        ? { ...a, is_active: isActive, status_changed_at: result.status_changed_at }
        : a));
    } catch (err) {
      console.error('Error updating account:', err);
      alert('Failed to update account. Please try again.');
    }
  };
```

- [ ] **Step 2: Update the `<AccountSettings>` prop**

Find (around line 289-295):

```jsx
        {view === 'settings' && (
          <AccountSettings
            accounts={accounts}
            onToggle={handleToggleAccount}
            onAdd={handleAddAccount}
          />
        )}
```

Replace with:

```jsx
        {view === 'settings' && (
          <AccountSettings
            accounts={accounts}
            onSetActive={handleSetAccountActive}
            onAdd={handleAddAccount}
          />
        )}
```

- [ ] **Step 3: Verify lint passes**

Run: `npm run lint`
Expected: no new errors in `app/page.jsx`.

- [ ] **Step 4: Commit**

```bash
git add app/page.jsx
git commit -m "feat: page sends explicit is_active target to PUT accounts"
```

---

### Task 6: Rebuild `AccountSettings.jsx` (Disable/Enable + grouped sections)

**Files:**
- Modify: `components/AccountSettings.jsx` (full rewrite)

- [ ] **Step 1: Rewrite the component**

Replace the entire contents of `components/AccountSettings.jsx` with:

```jsx
import { useState } from 'react';
import { PlusCircle, Wallet, CreditCard } from 'lucide-react';

const formatChangedAt = (ts) => {
  // BigQuery TIMESTAMP comes back as { value: '...' }; plain ISO strings also supported.
  const v = ts?.value || ts;
  if (!v) return null;
  return new Date(v).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
};

function AccountRow({ acc, onSetActive }) {
  const disabledOn = !acc.is_active ? formatChangedAt(acc.status_changed_at) : null;

  const handleDisable = () => {
    const ok = window.confirm(
      `Disable "${acc.name}"?\n\nThis hides the account from new snapshots. All past data is kept and totals are unchanged. You can re-enable anytime.`
    );
    if (ok) onSetActive(acc.id, false);
  };

  const handleEnable = () => onSetActive(acc.id, true);

  return (
    <div className="p-4 border-b border-slate-50 flex items-center justify-between hover:bg-slate-50">
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-lg ${acc.type === 'Asset' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
          {acc.type === 'Asset' ? <Wallet size={20} /> : <CreditCard size={20} />}
        </div>
        <div>
          <p className={`font-medium ${!acc.is_active ? 'text-slate-400 line-through' : ''}`}>{acc.name}</p>
          <p className="text-xs text-slate-400">
            {acc.category} • {acc.type}
            {disabledOn ? ` • Disabled ${disabledOn}` : ''}
          </p>
        </div>
      </div>
      {acc.is_active ? (
        <button
          onClick={handleDisable}
          className="text-sm px-3 py-1 rounded-full border border-rose-200 text-rose-600 hover:bg-rose-50"
        >
          Disable
        </button>
      ) : (
        <button
          onClick={handleEnable}
          className="text-sm px-3 py-1 rounded-full border border-emerald-200 text-emerald-600 hover:bg-emerald-50"
        >
          Enable
        </button>
      )}
    </div>
  );
}

export default function AccountSettings({ accounts, onSetActive, onAdd }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newAcc, setNewAcc] = useState({ name: '', type: 'Asset', category: 'Cash' });

  const handleAdd = (e) => {
    e.preventDefault();
    onAdd(newAcc);
    setIsAdding(false);
    setNewAcc({ name: '', type: 'Asset', category: 'Cash' });
  };

  const activeAccounts = accounts.filter(a => a.is_active);
  const disabledAccounts = accounts.filter(a => !a.is_active);

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Manage Accounts</h2>
          <p className="text-slate-500 text-sm">Add accounts, or disable ones you've closed. Disabling keeps all past data.</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-700"
        >
          <PlusCircle size={18} /> Add Account
        </button>
      </div>

      {isAdding && (
        <div className="bg-slate-100 p-6 rounded-2xl mb-6 animate-slide-down">
          <form onSubmit={handleAdd} className="flex gap-4 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Account Name</label>
              <input required type="text" className="w-full p-2 rounded border" placeholder="e.g. Bitcoin Wallet" value={newAcc.name} onChange={e => setNewAcc({...newAcc, name: e.target.value})}/>
            </div>
            <div className="w-32">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Type</label>
              <select className="w-full p-2 rounded border" value={newAcc.type} onChange={e => setNewAcc({...newAcc, type: e.target.value})}>
                <option>Asset</option>
                <option>Liability</option>
              </select>
            </div>
            <div className="w-40">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Category</label>
              <select className="w-full p-2 rounded border" value={newAcc.category} onChange={e => setNewAcc({...newAcc, category: e.target.value})}>
                <option>Cash</option>
                <option>Equity</option>
                <option>Real Estate</option>
                <option>Retirement</option>
                <option>Loan</option>
                <option>Credit Card</option>
              </select>
            </div>
            <button className="bg-indigo-600 text-white px-6 py-2 rounded">Save</button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {activeAccounts.map(acc => (
          <AccountRow key={acc.id} acc={acc} onSetActive={onSetActive} />
        ))}
      </div>

      {disabledAccounts.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Disabled accounts</h3>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {disabledAccounts.map(acc => (
              <AccountRow key={acc.id} acc={acc} onSetActive={onSetActive} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify lint passes**

Run: `npm run lint`
Expected: no new errors in `components/AccountSettings.jsx`.

- [ ] **Step 3: Commit**

```bash
git add components/AccountSettings.jsx
git commit -m "feat: explicit Disable/Enable buttons + Disabled accounts section"
```

---

### Task 7: Manual end-to-end verification

**Files:** none. Requires `.env.local` and a logged-in browser session.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Open `http://localhost:3000`, sign in with the allowed Google account, go to **Accounts**.

- [ ] **Step 2: Note the baseline net worth**

On **Dashboard**, record the current Net Worth, Total Assets, Total Liabilities, and the look of the trend / MoM / allocation charts.

- [ ] **Step 3: Disable "SC Credit Card"**

In **Accounts**, click **Disable** on `SC Credit Card`, accept the confirm. Expected:
- It moves to the **Disabled accounts** section with `Disabled <today>` and a strikethrough name.
- Go to **New Snapshot** → `SC Credit Card` is no longer listed.
- Go to **Dashboard** → Net Worth, totals, and all charts are **unchanged** from Step 2.

- [ ] **Step 4: Verify the event was written**

Run (read-only):

```sql
SELECT account_id, is_active, changed_at, note
FROM `modular-ground-487105-k2.net_worth_tracker.account_status_events`
WHERE account_id = '86f7a387-0f8c-484c-abb3-ffa8ed4e7be0'  -- SC Credit Card
ORDER BY changed_at;
```

Expected: 2 rows — the `2025-12-01` baseline (`is_active=true`) and a new `is_active=false` row dated today.

- [ ] **Step 5: Disable "HDFC Home Loan" and repeat the chart check**

Disable `HDFC Home Loan` (id `8efa8330-6c5a-461d-8436-ea493edf991c`). Confirm it leaves New Snapshot and the trend chart is unchanged.

- [ ] **Step 6: Re-enable "SC Credit Card"**

In the **Disabled accounts** section, click **Enable** on `SC Credit Card`. Expected:
- It returns to the active list.
- It reappears in **New Snapshot** (pre-filled 0 if its last record predates the latest period).
- A third event row exists for it (`is_active=true`, today).

- [ ] **Step 7: Confirm no destructive changes**

Run (read-only):

```sql
SELECT
  (SELECT COUNT(*) FROM `modular-ground-487105-k2.net_worth_tracker.records`) AS records,
  (SELECT COUNT(*) FROM `modular-ground-487105-k2.net_worth_tracker.records_backup_20260523`) AS records_backup,
  (SELECT COUNT(*) FROM `modular-ground-487105-k2.net_worth_tracker.periods`) AS periods,
  (SELECT COUNT(*) FROM `modular-ground-487105-k2.net_worth_tracker.periods_backup_20260523`) AS periods_backup;
```

Expected: `records == records_backup` and `periods == periods_backup` (disabling never touches them).

- [ ] **Step 8: Leave HDFC Home Loan disabled (it's genuinely paid off); re-enable any others changed only for testing.**

---

### Task 8: Update project documentation

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Document the new table and behavior**

In `CLAUDE.md`, under the "Data model" section, update the table count line and add the new table. Change:

```
### Data model (3 tables, by design — keep it at 3)
```

to:

```
### Data model (4 app tables + 2 ingest tables)
```

And add this paragraph after the existing `accounts` / `periods` / `records` description:

```
`account_status_events` (id, account_id, is_active, changed_at, note) is an **append-only**
history of every enable/disable change. `accounts.is_active` is the cached current state;
this table is the durable log. Written via streaming insert in `PUT /api/accounts/[id]`,
which also best-effort `UPDATE`s the cached flag. `GET /api/accounts` LEFT JOINs the latest
event per account as `status_changed_at` (used by the Accounts UI to show "Disabled on …").
Disabling drops an account from the New Snapshot form but never touches `records`/`periods`,
so all historical charts and totals are unchanged.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document account_status_events table and disable behavior"
```

---

## Self-Review Notes

- **Spec coverage:** clear Disable/Enable action (Task 6) ✓; reversible (Tasks 4-6, verified Task 7 Step 6) ✓; history stored (Tasks 1-2, PUT in Task 4) ✓; no data deleted (verified Task 7 Step 7) ✓; charts/totals intact (verified Task 7 Steps 3/5) ✓; Disabled section + disabled-on date (Task 6) ✓; baseline seed (Task 2) ✓; backup (Task 0) ✓; CLAUDE.md (Task 8) ✓.
- **Out of scope (per spec v1):** no history-viewer endpoint, no note input in UI — `note` column exists but UI leaves it null. ✓
- **Type consistency:** `is_active` (bool), `status_changed_at` (returned by PUT and GET, consumed by `formatChangedAt` and `page.jsx` local-state update), `onSetActive(id, isActive)` prop name consistent across `page.jsx` and `AccountSettings.jsx`. ✓
- **Account ids** used in Task 7 verified against the live DB query run during design (SC Credit Card `86f7a387-…`, HDFC Home Loan `8efa8330-…`).
