import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';

export async function GET() {
  try {
    const sql = db();
    const rows = await sql`SELECT current_database() AS database, now() AS time`;
    return NextResponse.json({ ok: true, service: 'ApplyAI', database: rows[0].database, time: rows[0].time });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Database connection failed' }, { status: 500 });
  }
}
