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
