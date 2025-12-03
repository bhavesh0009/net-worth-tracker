import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
const { query } = require('@/lib/bigquery');

// PUT /api/accounts/[id] - Toggle account active status
export async function PUT(request, { params }) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Toggle is_active status
    const sql = `
      UPDATE \`${process.env.GCP_PROJECT_ID}.${process.env.GCP_DATASET_ID}.accounts\`
      SET is_active = NOT is_active
      WHERE id = @id
    `;

    await query(sql, [id]);

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Error updating account:', error);
    return NextResponse.json(
      { error: 'Failed to update account' },
      { status: 500 }
    );
  }
}
