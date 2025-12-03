import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
const { query } = require('@/lib/bigquery');

// GET /api/records?period_id={id} - Get records for a specific period
export async function GET(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get('period_id');

    if (!periodId) {
      return NextResponse.json(
        { error: 'period_id is required' },
        { status: 400 }
      );
    }

    const sql = `
      SELECT * FROM \`${process.env.GCP_PROJECT_ID}.${process.env.GCP_DATASET_ID}.records\`
      WHERE period_id = @periodId
    `;

    const rows = await query(sql, [periodId]);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch records' },
      { status: 500 }
    );
  }
}
