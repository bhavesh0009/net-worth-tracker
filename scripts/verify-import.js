// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const { query } = require('../lib/bigquery');

async function verifyImport() {
  try {
    console.log('Verifying historical data import...\n');

    // Count accounts
    const accountsSql = `
      SELECT COUNT(*) as count
      FROM \`${process.env.GCP_PROJECT_ID}.${process.env.GCP_DATASET_ID}.accounts\`
    `;
    const accountsResult = await query(accountsSql);
    console.log(`✓ Accounts created: ${accountsResult[0].count}`);

    // Count periods
    const periodsSql = `
      SELECT COUNT(*) as count
      FROM \`${process.env.GCP_PROJECT_ID}.${process.env.GCP_DATASET_ID}.periods\`
    `;
    const periodsResult = await query(periodsSql);
    console.log(`✓ Periods created: ${periodsResult[0].count}`);

    // Count records
    const recordsSql = `
      SELECT COUNT(*) as count
      FROM \`${process.env.GCP_PROJECT_ID}.${process.env.GCP_DATASET_ID}.records\`
    `;
    const recordsResult = await query(recordsSql);
    console.log(`✓ Records created: ${recordsResult[0].count}\n`);

    // Get date range
    const dateRangeSql = `
      SELECT
        MIN(month_date) as first_date,
        MAX(month_date) as last_date
      FROM \`${process.env.GCP_PROJECT_ID}.${process.env.GCP_DATASET_ID}.periods\`
    `;
    const dateRange = await query(dateRangeSql);
    console.log('Date range:');
    console.log(`  First: ${dateRange[0].first_date.value}`);
    console.log(`  Last: ${dateRange[0].last_date.value}\n`);

    // Get latest period with total_nw
    const latestSql = `
      SELECT month_date, total_nw, notes
      FROM \`${process.env.GCP_PROJECT_ID}.${process.env.GCP_DATASET_ID}.periods\`
      ORDER BY month_date DESC
      LIMIT 1
    `;
    const latest = await query(latestSql);
    console.log('Latest period:');
    console.log(`  Date: ${latest[0].month_date.value}`);
    console.log(`  Total NW: ₹${parseFloat(latest[0].total_nw).toLocaleString('en-IN')}`);
    console.log(`  Notes: ${latest[0].notes || 'None'}\n`);

    // List all periods
    const allPeriodsSql = `
      SELECT month_date, total_nw, notes
      FROM \`${process.env.GCP_PROJECT_ID}.${process.env.GCP_DATASET_ID}.periods\`
      ORDER BY month_date ASC
    `;
    const allPeriods = await query(allPeriodsSql);
    console.log('All periods:');
    console.log('Date          | Total NW      | Notes');
    console.log('--------------|---------------|----------------------------------');
    allPeriods.forEach(p => {
      const date = p.month_date.value;
      const nw = parseFloat(p.total_nw).toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).padEnd(13);
      const notes = (p.notes || '').substring(0, 30);
      console.log(`${date} | ₹${nw} | ${notes}`);
    });

    console.log('\n===============================================');
    console.log('Verification completed successfully!');
    console.log('===============================================\n');

  } catch (error) {
    console.error('Error verifying import:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  verifyImport()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { verifyImport };
