import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
const { query } = require('@/lib/bigquery');

// GET /api/periods/latest - Get most recent period
export async function GET(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = `
      SELECT * FROM \`${process.env.GCP_PROJECT_ID}.${process.env.GCP_DATASET_ID}.periods\`
      ORDER BY month_date DESC
      LIMIT 1
    `;

    const rows = await query(sql);

    if (rows.length === 0) {
      return NextResponse.json(null);
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Error fetching latest period:', error);
    return NextResponse.json(
      { error: 'Failed to fetch latest period' },
      { status: 500 }
    );
  }
}
