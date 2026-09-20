export default async function VacancyPage({searchParams}){
  const p=await searchParams;
  const role=p?.role||'Opportunity';
  const employer=p?.employer||'Employer';
  const location=p?.location||'See vacancy details';
  const summary=p?.summary||'Vacancy details have been captured for your ApplyAI application workspace.';
  return <main style={{minHeight:'100vh',background:'#f6f7fb',padding:'40px 20px',fontFamily:'Arial,sans-serif',color:'#101828'}}>
    <div style={{maxWidth:900,margin:'0 auto'}}>
      <a href="/" style={{color:'#5b3df5',fontWeight:700,textDecoration:'none'}}>← Back to ApplyAI</a>
      <div style={{background:'#fff',border:'1px solid #e4e7ec',borderRadius:20,padding:32,marginTop:22,boxShadow:'0 12px 35px rgba(16,24,40,.06)'}}>
        <div style={{fontSize:13,fontWeight:800,letterSpacing:2,color:'#5b3df5'}}>APPLYAI · VERIFIED VACANCY REVIEW</div>
        <h1 style={{fontSize:42,marginBottom:8}}>{role}</h1>
        <h2 style={{fontSize:22,fontWeight:600,color:'#475467'}}>{employer}</h2>
        <p style={{fontSize:17}}><b>Location:</b> {location}</p>
        <hr style={{border:0,borderTop:'1px solid #eaecf0',margin:'26px 0'}}/>
        <h2>Job summary</h2>
        <p style={{fontSize:17,lineHeight:1.7,whiteSpace:'pre-wrap'}}>{summary}</p>
        <div style={{marginTop:28,padding:18,background:'#f4f3ff',borderRadius:12,lineHeight:1.6}}><b>Stay inside ApplyAI:</b> return to your saved application workspace to run eligibility review, tailor your CV and cover letter, attach documents, save progress and complete the final application check.</div>
        <a href="/" style={{display:'inline-block',marginTop:24,background:'#5b3df5',color:'#fff',padding:'14px 22px',borderRadius:10,fontWeight:800,textDecoration:'none'}}>Return to ApplyAI →</a>
      </div>
    </div>
  </main>
}
