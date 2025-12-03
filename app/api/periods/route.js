import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
const { query } = require('@/lib/bigquery');

// GET /api/periods - Fetch all periods
export async function GET(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = `
      SELECT * FROM \`${process.env.GCP_PROJECT_ID}.${process.env.GCP_DATASET_ID}.periods\`
      ORDER BY month_date ASC
    `;

    const rows = await query(sql);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching periods:', error);
    return NextResponse.json(
      { error: 'Failed to fetch periods' },
      { status: 500 }
    );
  }
}
