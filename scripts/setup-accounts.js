// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const { insertRows } = require('../lib/bigquery');
const { v4: uuidv4 } = require('uuid');

const accounts = [
  // Assets
  { name: 'Flat', type: 'Asset', category: 'Real Estate' },
  { name: 'Angel One PF', type: 'Asset', category: 'Equity' },
  { name: 'Angel One Cash', type: 'Asset', category: 'Cash' },
  { name: 'ICICI Cash', type: 'Asset', category: 'Cash' },
  { name: 'ICICI second account', type: 'Asset', category: 'Cash' },
  { name: 'Sharekhan Demat Equity', type: 'Asset', category: 'Equity' },
  { name: 'Mutual Funds', type: 'Asset', category: 'Mutual Funds' },
  { name: 'EPF1', type: 'Asset', category: 'EPF' },
  { name: 'EPF2', type: 'Asset', category: 'EPF' },
  { name: 'NPS', type: 'Asset', category: 'NPS' },
  { name: 'ACN ESPP', type: 'Asset', category: 'Equity' },

  // Liabilities
  { name: 'ICICI Credit Card', type: 'Liability', category: 'Credit Card' },
  { name: 'SC Credit Card', type: 'Liability', category: 'Credit Card' },
  { name: 'HDFC Home Loan', type: 'Liability', category: 'Loan' },
  { name: 'SBI Credit Card', type: 'Liability', category: 'Credit Card' },
];

async function setupAccounts() {
  try {
    console.log('Setting up accounts...');

    const accountsWithIds = accounts.map(account => ({
      id: uuidv4(),
      name: account.name,
      type: account.type,
      category: account.category,
      is_active: true,
    }));

    await insertRows('accounts', accountsWithIds);

    console.log(`Successfully created ${accountsWithIds.length} accounts!`);
    console.log('\nAccount IDs for reference:');
    accountsWithIds.forEach(acc => {
      console.log(`${acc.name}: ${acc.id}`);
    });

    // Save account IDs to a file for use in historical import
    const fs = require('fs');
    const accountMap = {};
    accountsWithIds.forEach(acc => {
      accountMap[acc.name] = acc.id;
    });

    fs.writeFileSync(
      './scripts/account-ids.json',
      JSON.stringify(accountMap, null, 2)
    );
    console.log('\nAccount IDs saved to scripts/account-ids.json');

  } catch (error) {
    console.error('Error setting up accounts:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  setupAccounts()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { setupAccounts };
