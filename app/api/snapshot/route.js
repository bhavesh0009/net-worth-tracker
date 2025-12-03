import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
const { insertRows } = require('@/lib/bigquery');
const { v4: uuidv4 } = require('uuid');

// POST /api/snapshot - Create new monthly snapshot (period + records)
export async function POST(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { date, notes, values, total_nw } = body;

    if (!date || !values) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate new period ID
    const newPeriodId = uuidv4();

    // Create period object
    const newPeriod = {
      id: newPeriodId,
      month_date: date,
      notes: notes || null,
      total_nw: total_nw || null,
    };

    // Create records array
    const newRecords = Object.entries(values).map(([accountId, amount]) => ({
      id: uuidv4(),
      period_id: newPeriodId,
      account_id: accountId,
      amount: parseFloat(amount) || 0,
    }));

    // Insert period
    await insertRows('periods', [newPeriod]);

    // Insert all records
    if (newRecords.length > 0) {
      await insertRows('records', newRecords);
    }

    return NextResponse.json(
      {
        success: true,
        period: newPeriod,
        recordsCount: newRecords.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to create snapshot' },
      { status: 500 }
    );
  }
}
