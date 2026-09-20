import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';

export async function GET() {
  try {
    const sql = db();
    const rows = await sql`SELECT id,type,title,organization,location,funding,deadline,source_url,source_name,is_verified FROM opportunities WHERE is_verified = true AND (deadline IS NULL OR deadline >= CURRENT_DATE) ORDER BY deadline NULLS LAST LIMIT 100`;
    return NextResponse.json({ opportunities: rows });
  } catch {
    return NextResponse.json({ opportunities: [], error: 'Unable to load opportunities' }, { status: 500 });
  }
}
