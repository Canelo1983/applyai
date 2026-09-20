import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';
import { normalizeOpportunity, isUsable } from '../../../lib/opportunity-engine';

const TRUSTED_HOSTS = [
  '.ac.uk','.edu','.edu.au','.ac.nz','.ac.za','.edu.hk','.edu.sg','.edu.my',
  'jobs.nhs.uk','healthjobsuk.com','euraxess.ec.europa.eu','academicpositions.com',
  'findaphd.com','daad.de','studyinaustralia.gov.au','scholarships.gov.au'
];
const ADZUNA_COUNTRIES=['gb','us','ca','au','nz','de','fr','nl','sg','za','in','br','pl','at'];
function trusted(url='') {
  try { const h=new URL(url).hostname.toLowerCase(); return TRUSTED_HOSTS.some(x=>h===x.replace(/^\./,'')||h.endsWith(x)); }
  catch { return false; }
}
async function searchAdzuna(q){
  if(!q || !process.env.ADZUNA_APP_ID || !process.env.ADZUNA_APP_KEY) return [];
  const searches=ADZUNA_COUNTRIES.map(async country=>{
    try{
      const u=new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/1`);
      u.searchParams.set('app_id',process.env.ADZUNA_APP_ID);
      u.searchParams.set('app_key',process.env.ADZUNA_APP_KEY);
      u.searchParams.set('results_per_page','20');
      u.searchParams.set('what',q);
      u.searchParams.set('content-type','application/json');
      const r=await fetch(u,{cache:'no-store'}); if(!r.ok)return [];
      const d=await r.json();
      return (d.results||[]).map(raw=>normalizeOpportunity({...raw,type:'Job',source_name:'Adzuna',source_url:raw.redirect_url,country})).filter(isUsable);
    }catch{return []}
  });
  const batches=await Promise.all(searches); return batches.flat().slice(0,100);
}
export async function GET(request) {
  try {
    const sql=db(); const {searchParams}=new URL(request.url); const q=(searchParams.get('q')||'').trim();
    const rows=q ? await sql`SELECT id,type,title,organization,location,funding,deadline,source_url,source_name,is_verified,requirements FROM opportunities WHERE is_verified=true AND (deadline IS NULL OR deadline>=CURRENT_DATE) AND (title ILIKE ${'%'+q+'%'} OR organization ILIKE ${'%'+q+'%'} OR type ILIKE ${'%'+q+'%'} OR requirements ILIKE ${'%'+q+'%'}) ORDER BY deadline NULLS LAST LIMIT 100` : await sql`SELECT id,type,title,organization,location,funding,deadline,source_url,source_name,is_verified,requirements FROM opportunities WHERE is_verified=true AND (deadline IS NULL OR deadline>=CURRENT_DATE) ORDER BY deadline NULLS LAST LIMIT 100`;
    const verified=rows.filter(x=>trusted(x.source_url));
    if(!q || verified.length>=10) return NextResponse.json({opportunities:verified,source:'ApplyAI verified catalogue'});
    const live=await searchAdzuna(q);
    const seen=new Set(verified.map(x=>`${String(x.title).toLowerCase()}|${String(x.organization).toLowerCase()}`));
    const combined=[...verified];
    for(const x of live){const k=`${String(x.title).toLowerCase()}|${String(x.organization).toLowerCase()}`;if(seen.has(k))continue;seen.add(k);combined.push({...x,id:`adzuna-${countrySafe(x.source_url)}-${combined.length}`,is_verified:true});}
    return NextResponse.json({opportunities:combined.slice(0,100),source:'Verified catalogue + live Adzuna international search',live_count:live.length});
  } catch(e) { return NextResponse.json({opportunities:[],error:'Unable to load opportunities',detail:String(e?.message||e)},{status:500}); }
}
function countrySafe(s=''){let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return h.toString(36)}
