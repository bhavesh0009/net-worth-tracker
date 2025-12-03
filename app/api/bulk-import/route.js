import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
const { insertRows } = require('@/lib/bigquery');
const { v4: uuidv4 } = require('uuid');

// POST /api/bulk-import - Bulk import historical periods and records
export async function POST(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { periods } = body;

    if (!periods || !Array.isArray(periods)) {
      return NextResponse.json(
        { error: 'Invalid data format. Expected { periods: [...] }' },
        { status: 400 }
      );
    }

    let totalRecords = 0;
    const allPeriods = [];
    const allRecords = [];

    // Process each period
    for (const period of periods) {
      const { date, notes, total_nw, values } = period;

      if (!date) {
        return NextResponse.json(
          { error: 'Each period must have a date' },
          { status: 400 }
        );
      }

      // Generate new period ID
      const periodId = uuidv4();

      // Create period object
      allPeriods.push({
        id: periodId,
        month_date: date,
        notes: notes || null,
        total_nw: total_nw || null,
      });

      // Create records if values provided
      if (values && Object.keys(values).length > 0) {
        const records = Object.entries(values).map(([accountId, amount]) => ({
          id: uuidv4(),
          period_id: periodId,
          account_id: accountId,
          amount: parseFloat(amount) || 0,
        }));

        allRecords.push(...records);
        totalRecords += records.length;
      }
    }

    // Bulk insert periods
    if (allPeriods.length > 0) {
      await insertRows('periods', allPeriods);
    }

    // Bulk insert records
    if (allRecords.length > 0) {
      await insertRows('records', allRecords);
    }

    return NextResponse.json(
      {
        success: true,
        periodsCreated: allPeriods.length,
        recordsCreated: allRecords.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in bulk import:', error);
    return NextResponse.json(
      { error: 'Failed to import data', details: error.message },
      { status: 500 }
    );
  }
}
