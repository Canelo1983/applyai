import { db } from '../../../lib/db';

async function currentUser(request){
  const url=new URL('/api/me',request.url);
  const r=await fetch(url,{headers:{cookie:request.headers.get('cookie')||'',accept:'application/json'},cache:'no-store'});
  if(!r.ok)return null;
  const data=await r.json().catch(()=>null);
  return data?.user||null;
}

async function ensureApplications(sql){
  await sql`CREATE TABLE IF NOT EXISTS applications (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    opportunity_key TEXT NOT NULL,
    title TEXT NOT NULL,
    organization TEXT,
    source_url TEXT,
    status TEXT NOT NULL DEFAULT 'Draft',
    progress INTEGER NOT NULL DEFAULT 10,
    cv_text TEXT,
    cover_letter_text TEXT,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  /* Existing production databases may have been created by an earlier ApplyAI build.
     CREATE TABLE IF NOT EXISTS does not add later columns, so migrate safely here. */
  await sql`ALTER TABLE applications ADD COLUMN IF NOT EXISTS opportunity_key TEXT`;
  await sql`ALTER TABLE applications ADD COLUMN IF NOT EXISTS title TEXT`;
  await sql`ALTER TABLE applications ADD COLUMN IF NOT EXISTS organization TEXT`;
  await sql`ALTER TABLE applications ADD COLUMN IF NOT EXISTS source_url TEXT`;
  await sql`ALTER TABLE applications ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Draft'`;
  await sql`ALTER TABLE applications ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 10`;
  await sql`ALTER TABLE applications ADD COLUMN IF NOT EXISTS cv_text TEXT`;
  await sql`ALTER TABLE applications ADD COLUMN IF NOT EXISTS cover_letter_text TEXT`;
  await sql`ALTER TABLE applications ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ`;
  await sql`ALTER TABLE applications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now()`;
  await sql`ALTER TABLE applications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now()`;
  await sql`UPDATE applications SET opportunity_key=COALESCE(opportunity_key,'legacy-'||id::text),title=COALESCE(title,'Opportunity'),status=COALESCE(status,'Draft'),progress=COALESCE(progress,10),created_at=COALESCE(created_at,now()),updated_at=COALESCE(updated_at,now())`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS applications_user_opportunity_idx ON applications(user_id,opportunity_key)`;
  await sql`CREATE INDEX IF NOT EXISTS applications_user_updated_idx ON applications(user_id,updated_at DESC)`;
}

export async function GET(request){
  try{
    const user=await currentUser(request);
    if(!user)return Response.json({error:'Sign in required'},{status:401});
    const sql=db(); await ensureApplications(sql);
    const rows=await sql`SELECT * FROM applications WHERE user_id=${String(user.id)} ORDER BY updated_at DESC`;
    return Response.json({applications:rows},{headers:{'Cache-Control':'no-store'}});
  }catch(e){console.error('applications GET',e);return Response.json({error:'Application workspace unavailable',detail:e.message},{status:500})}
}

export async function POST(request){
  try{
    const user=await currentUser(request);
    if(!user)return Response.json({error:'Your session expired. Please sign in again.'},{status:401});
    const b=await request.json();
    const key=String(b.opportunity_key||b.id||b.source_url||b.title||'').slice(0,500);
    if(!key)return Response.json({error:'Opportunity required'},{status:400});
    const sql=db(); await ensureApplications(sql);
    const rows=await sql`
      INSERT INTO applications(user_id,opportunity_key,title,organization,source_url,status,progress,updated_at)
      VALUES(${String(user.id)},${key},${b.title||'Opportunity'},${b.organization||null},${b.source_url||null},'Draft',10,now())
      ON CONFLICT(user_id,opportunity_key) DO UPDATE SET
        title=EXCLUDED.title,
        organization=EXCLUDED.organization,
        source_url=EXCLUDED.source_url,
        updated_at=now()
      RETURNING *`;
    return Response.json({application:rows[0]});
  }catch(e){console.error('applications POST',e);return Response.json({error:'Could not prepare application',detail:e.message},{status:500})}
}

export async function PATCH(request){
  try{
    const user=await currentUser(request);
    if(!user)return Response.json({error:'Your session expired. Please sign in again.'},{status:401});
    const b=await request.json();
    if(!b.id)return Response.json({error:'Application id required'},{status:400});
    const sql=db(); await ensureApplications(sql);
    const rows=await sql`
      UPDATE applications SET
        status=COALESCE(${b.status||null},status),
        progress=COALESCE(${Number.isFinite(b.progress)?b.progress:null},progress),
        cv_text=COALESCE(${b.cv_text??null},cv_text),
        cover_letter_text=COALESCE(${b.cover_letter_text??null},cover_letter_text),
        submitted_at=CASE WHEN ${b.status||null}='Submitted' THEN COALESCE(submitted_at,now()) ELSE submitted_at END,
        updated_at=now()
      WHERE id=${b.id} AND user_id=${String(user.id)} RETURNING *`;
    if(!rows[0])return Response.json({error:'Application not found'},{status:404});
    return Response.json({application:rows[0]});
  }catch(e){console.error('applications PATCH',e);return Response.json({error:'Could not save application',detail:e.message},{status:500})}
}
