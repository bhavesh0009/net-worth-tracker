const { BigQuery } = require('@google-cloud/bigquery');

// Initialize BigQuery client
let bigquery;

function getBigQueryClient() {
  if (!bigquery) {
    try {
      // Parse service account credentials from environment variable
      const credentials = JSON.parse(
        process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || '{}'
      );

      bigquery = new BigQuery({
        projectId: process.env.GCP_PROJECT_ID,
        credentials,
      });
    } catch (error) {
      console.error('Error initializing BigQuery client:', error);
      throw new Error('Failed to initialize BigQuery client');
    }
  }
  return bigquery;
}

// Helper function to execute queries
async function query(sql, params = []) {
  try {
    const client = getBigQueryClient();

    // If params is an array and SQL contains named parameters (@param),
    // we need to convert to positional parameters (?)
    let finalSql = sql;
    let finalParams = params;

    if (Array.isArray(params) && params.length > 0 && sql.includes('@')) {
      // Replace named parameters with positional ?
      finalSql = sql.replace(/@\w+/g, '?');
    }

    const options = {
      query: finalSql,
      params: finalParams,
      location: 'asia-south1', // Mumbai region as per setup
    };

    const [rows] = await client.query(options);
    return rows;
  } catch (error) {
    console.error('BigQuery query error:', error);
    throw error;
  }
}

// Helper to get dataset reference
function getDataset() {
  const client = getBigQueryClient();
  return client.dataset(process.env.GCP_DATASET_ID);
}

// Helper to get table reference
function getTable(tableName) {
  return getDataset().table(tableName);
}

// Insert rows into a table
async function insertRows(tableName, rows) {
  try {
    const table = getTable(tableName);
    await table.insert(rows);
    return true;
  } catch (error) {
    console.error(`Error inserting into ${tableName}:`, error);
    throw error;
  }
}

module.exports = {
  getBigQueryClient,
  query,
  getDataset,
  getTable,
  insertRows,
};
