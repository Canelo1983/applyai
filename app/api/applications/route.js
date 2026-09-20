import { db } from '../../../lib/db';

async function currentUser(request){
  const r=await fetch(new URL('/api/me',request.url),{headers:{cookie:request.headers.get('cookie')||'',accept:'application/json'},cache:'no-store'});
  if(!r.ok)return null; return (await r.json()).user||null;
}
export async function GET(request){
  const user=await currentUser(request); if(!user)return Response.json({error:'Sign in required'},{status:401});
  const sql=db(); const rows=await sql`SELECT * FROM applications WHERE user_id=${user.id} ORDER BY updated_at DESC`;
  return Response.json({applications:rows},{headers:{'Cache-Control':'no-store'}});
}
export async function POST(request){
  const user=await currentUser(request); if(!user)return Response.json({error:'Sign in required'},{status:401});
  const b=await request.json(); const key=String(b.opportunity_key||b.id||b.source_url||b.title||'').slice(0,500); if(!key)return Response.json({error:'Opportunity required'},{status:400});
  const sql=db(); const rows=await sql`INSERT INTO applications(user_id,opportunity_key,title,organization,source_url,status,progress) VALUES(${user.id},${key},${b.title||'Opportunity'},${b.organization||null},${b.source_url||null},'Draft',10) ON CONFLICT(user_id,opportunity_key) DO UPDATE SET title=EXCLUDED.title,organization=EXCLUDED.organization,source_url=EXCLUDED.source_url,updated_at=now() RETURNING *`;
  return Response.json({application:rows[0]});
}
export async function PATCH(request){
  const user=await currentUser(request); if(!user)return Response.json({error:'Sign in required'},{status:401});
  const b=await request.json(); if(!b.id)return Response.json({error:'Application id required'},{status:400});
  const sql=db(); const rows=await sql`UPDATE applications SET status=COALESCE(${b.status||null},status),progress=COALESCE(${Number.isFinite(b.progress)?b.progress:null},progress),cv_text=COALESCE(${b.cv_text??null},cv_text),cover_letter_text=COALESCE(${b.cover_letter_text??null},cover_letter_text),submitted_at=CASE WHEN ${b.status||null}='Submitted' THEN COALESCE(submitted_at,now()) ELSE submitted_at END,updated_at=now() WHERE id=${b.id} AND user_id=${user.id} RETURNING *`;
  if(!rows[0])return Response.json({error:'Not found'},{status:404}); return Response.json({application:rows[0]});
}
