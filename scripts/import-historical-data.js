// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const { insertRows } = require('../lib/bigquery');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const { historicalPeriods, october2025Data } = require('./historical-data');

async function importHistoricalData() {
  try {
    console.log('Starting historical data import...\n');

    // Load account IDs
    const accountIdsPath = path.join(__dirname, 'account-ids.json');
    if (!fs.existsSync(accountIdsPath)) {
      throw new Error(
        'account-ids.json not found. Please run setup-accounts.js first.'
      );
    }

    const accountMap = JSON.parse(fs.readFileSync(accountIdsPath, 'utf8'));
    console.log('Loaded account IDs successfully\n');

    // Prepare October 2025 data with actual account IDs and values
    const octoberValues = {
      [accountMap['Flat']]: 12500000,
      [accountMap['Angel One PF']]: 3732900,
      [accountMap['Angel One Cash']]: 43176,
      [accountMap['ICICI Cash']]: 259724,
      [accountMap['ICICI second account']]: 0,
      [accountMap['Sharekhan Demat Equity']]: 411416,
      [accountMap['Mutual Funds']]: 950000,
      [accountMap['EPF1']]: 1150572,
      [accountMap['EPF2']]: 2397059,
      [accountMap['NPS']]: 1034471,
      [accountMap['ACN ESPP']]: 568260,

      // Liabilities (negative values)
      [accountMap['ICICI Credit Card']]: -19581,
      [accountMap['SC Credit Card']]: -13900,
      [accountMap['HDFC Home Loan']]: -295280,
      [accountMap['SBI Credit Card']]: -39118,
    };

    october2025Data.values = octoberValues;

    // Combine all periods
    const allPeriods = [...historicalPeriods, october2025Data];

    console.log(`Importing ${allPeriods.length} periods...\n`);

    // Prepare data for bulk insert
    const periodsToInsert = [];
    const recordsToInsert = [];

    for (const period of allPeriods) {
      const periodId = uuidv4();

      // Create period
      periodsToInsert.push({
        id: periodId,
        month_date: period.date,
        notes: period.notes || null,
        total_nw: period.total_nw || null,
      });

      // Create records if values exist
      if (period.values) {
        for (const [accountId, amount] of Object.entries(period.values)) {
          recordsToInsert.push({
            id: uuidv4(),
            period_id: periodId,
            account_id: accountId,
            amount: parseFloat(amount),
          });
        }
      }
    }

    // Insert periods
    console.log(`Inserting ${periodsToInsert.length} periods...`);
    await insertRows('periods', periodsToInsert);
    console.log('✓ Periods inserted successfully\n');

    // Insert records
    if (recordsToInsert.length > 0) {
      console.log(`Inserting ${recordsToInsert.length} records...`);
      await insertRows('records', recordsToInsert);
      console.log('✓ Records inserted successfully\n');
    }

    console.log('===============================================');
    console.log('Historical data import completed successfully!');
    console.log('===============================================');
    console.log(`Total periods: ${periodsToInsert.length}`);
    console.log(`Total records: ${recordsToInsert.length}`);
    console.log(`Date range: ${allPeriods[0].date} to ${allPeriods[allPeriods.length - 1].date}`);
    console.log('===============================================\n');

  } catch (error) {
    console.error('Error importing historical data:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  importHistoricalData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { importHistoricalData };
