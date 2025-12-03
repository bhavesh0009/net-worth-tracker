# Historical Data Import Guide

This guide explains how to import your historical net worth data from August 2023 to October 2025.

## Overview

The import process consists of two steps:
1. **Setup Accounts**: Create all your financial accounts (assets & liabilities)
2. **Import Historical Data**: Import 27 months of historical snapshots

## Prerequisites

- Ensure your `.env.local` file is configured with:
  - `GCP_PROJECT_ID`
  - `GCP_DATASET_ID`
  - `GOOGLE_APPLICATION_CREDENTIALS_JSON`
- BigQuery tables should be created (run `bigquery-setup.sql` if not done)

## Step 1: Setup Accounts

This script creates all 15 accounts (11 assets + 4 liabilities):

```bash
npm run setup-accounts
# OR
node scripts/setup-accounts.js
```

**What it does:**
- Creates all accounts in the database
- Generates unique IDs for each account
- Saves account IDs to `scripts/account-ids.json` (needed for Step 2)

**Expected Output:**
```
Setting up accounts...
Successfully created 15 accounts!

Account IDs for reference:
Flat: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Angel One PF: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
...

Account IDs saved to scripts/account-ids.json
```

## Step 2: Import Historical Data

This script imports all historical periods:

```bash
npm run import-historical
# OR
node scripts/import-historical-data.js
```

**What it does:**
- Imports 26 periods with aggregate data (Aug 2023 - Sep 2025)
- Imports 1 period with detailed account-level data (Oct 2025)
- Total: 27 periods

**Expected Output:**
```
Starting historical data import...

Loaded account IDs successfully

Importing 27 periods...

Inserting 27 periods...
✓ Periods inserted successfully

Inserting 15 records...
✓ Records inserted successfully

===============================================
Historical data import completed successfully!
===============================================
Total periods: 27
Total records: 15
Date range: 2023-08-30 to 2025-10-01
===============================================
```

## Step 3: Verify Import (Optional)

Check that all data was imported correctly:

```bash
npm run verify-import
# OR
node scripts/verify-import.js
```

**What it shows:**
- Count of accounts, periods, and records
- Date range of imported data
- List of all periods with their total net worth

## Data Included

### Aggregate Monthly Data (26 periods)
From August 2023 to September 2025, each with:
- Date
- Total Net Worth (with home)
- Notes/Comments

### Detailed Account Data (1 period)
October 2025 with breakdown of all 15 accounts:
- **Assets**: Flat, Angel One PF, Angel One Cash, ICICI Cash, ICICI second account, Sharekhan Demat Equity, Mutual Funds, EPF1, EPF2, NPS, ACN ESPP
- **Liabilities**: ICICI Credit Card, SC Credit Card, HDFC Home Loan, SBI Credit Card

## Troubleshooting

### Error: "account-ids.json not found"
**Solution**: Run Step 1 first (`setup-accounts.js`)

### Error: "Failed to initialize BigQuery client"
**Solution**: Check your `.env.local` file has valid credentials

### Error: "Table not found"
**Solution**: Run the `bigquery-setup.sql` script to create tables

### Duplicate Data
If you need to re-import, you'll need to manually delete the periods and records from BigQuery first:

```sql
DELETE FROM `deep-span-266614.net_worth_tracker.records` WHERE TRUE;
DELETE FROM `deep-span-266614.net_worth_tracker.periods` WHERE TRUE;
DELETE FROM `deep-span-266614.net_worth_tracker.accounts` WHERE TRUE;
```

## Files

- `setup-accounts.js` - Creates all accounts
- `import-historical-data.js` - Imports all historical periods
- `historical-data.js` - Contains the raw historical data
- `account-ids.json` - Generated file mapping account names to IDs (created by step 1)

## Next Steps

After import:
1. Verify the data in your app dashboard
2. Add November 2025 snapshot manually through the app (you mentioned you missed it)
3. Add December 2025 snapshot for today

## Support

If you encounter any issues, check:
1. BigQuery console for the actual data
2. Application logs for detailed error messages
3. Ensure all environment variables are set correctly
