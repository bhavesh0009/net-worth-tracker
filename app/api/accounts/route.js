import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
const { query, insertRows } = require('@/lib/bigquery');
const { v4: uuidv4 } = require('uuid');

// GET /api/accounts - Fetch all accounts with latest status-change timestamp
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const project = process.env.GCP_PROJECT_ID;
    const dataset = process.env.GCP_DATASET_ID;

    const sql = `
      SELECT a.id, a.name, a.type, a.category, a.is_active,
             e.changed_at AS status_changed_at
      FROM \`${project}.${dataset}.accounts\` a
      LEFT JOIN (
        SELECT account_id, changed_at,
               ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY changed_at DESC) AS rn
        FROM \`${project}.${dataset}.account_status_events\`
      ) e ON e.account_id = a.id AND e.rn = 1
      ORDER BY a.type, a.category, a.name
    `;

    const rows = await query(sql);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}

// POST /api/accounts - Create new account (+ baseline status event)
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, category } = body;

    if (!name || !type || !category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const newAccount = {
      id: uuidv4(),
      name,
      type,
      category,
      is_active: true,
    };

    const changedAt = new Date().toISOString();

    await insertRows('accounts', [newAccount]);
    await insertRows('account_status_events', [{
      id: uuidv4(),
      account_id: newAccount.id,
      is_active: true,
      changed_at: changedAt,
      note: 'created',
    }]);

    return NextResponse.json({ ...newAccount, status_changed_at: changedAt }, { status: 201 });
  } catch (error) {
    console.error('Error creating account:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
