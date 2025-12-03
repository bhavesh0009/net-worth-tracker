import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
const { query, insertRows } = require('@/lib/bigquery');
const { v4: uuidv4 } = require('uuid');

// GET /api/accounts - Fetch all accounts
export async function GET(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = `
      SELECT * FROM \`${process.env.GCP_PROJECT_ID}.${process.env.GCP_DATASET_ID}.accounts\`
      ORDER BY type, category, name
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

// POST /api/accounts - Create new account
export async function POST(request) {
  try {
    // Check authentication
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

    await insertRows('accounts', [newAccount]);

    return NextResponse.json(newAccount, { status: 201 });
  } catch (error) {
    console.error('Error creating account:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
