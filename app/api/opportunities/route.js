import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';

const TRUSTED_HOSTS = [
  '.ac.uk','.edu','.edu.au','.ac.nz','.ac.za','.edu.hk','.edu.sg','.edu.my',
  'jobs.nhs.uk','healthjobsuk.com','euraxess.ec.europa.eu','academicpositions.com',
  'findaphd.com','daad.de','studyinaustralia.gov.au','scholarships.gov.au'
];
function trusted(url='') {
  try { const h=new URL(url).hostname.toLowerCase(); return TRUSTED_HOSTS.some(x=>h===x.replace(/^\./,'')||h.endsWith(x)); }
  catch { return false; }
}
export async function GET(request) {
  try {
    const sql=db(); const {searchParams}=new URL(request.url); const q=(searchParams.get('q')||'').trim();
    const rows=q ? await sql`SELECT id,type,title,organization,location,funding,deadline,source_url,source_name,is_verified,requirements FROM opportunities WHERE is_verified=true AND (deadline IS NULL OR deadline>=CURRENT_DATE) AND (title ILIKE ${'%'+q+'%'} OR organization ILIKE ${'%'+q+'%'} OR type ILIKE ${'%'+q+'%'} OR requirements ILIKE ${'%'+q+'%'}) ORDER BY deadline NULLS LAST LIMIT 100` : await sql`SELECT id,type,title,organization,location,funding,deadline,source_url,source_name,is_verified,requirements FROM opportunities WHERE is_verified=true AND (deadline IS NULL OR deadline>=CURRENT_DATE) ORDER BY deadline NULLS LAST LIMIT 100`;
    return NextResponse.json({opportunities:rows.filter(x=>trusted(x.source_url)),policy:'Only verified records from trusted academic, government, health-service or established research vacancy sources are displayed.'});
  } catch { return NextResponse.json({opportunities:[],error:'Unable to load verified opportunities'},{status:500}); }
}
