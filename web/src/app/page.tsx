'use client';
import { useState } from 'react';

export default function Home() {
  const [code,setCode]=useState('');
  return <main style={{minHeight:'100vh',background:'#080b12',color:'#fff',fontFamily:'system-ui',display:'grid',placeItems:'center',padding:24}}>
    <section style={{width:'min(620px,100%)',border:'1px solid #263044',background:'#101622',padding:32}}>
      <div style={{letterSpacing:4,fontSize:13,color:'#8da2c8'}}>PROJECT ZERO</div>
      <h1 style={{fontSize:44,margin:'10px 0'}}>Link your Xbox</h1>
      <p style={{color:'#aeb9cb'}}>Enter the eight-character code shown by the Project Zero Xbox launcher.</p>
      <input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} maxLength={9} placeholder="ABCD-EFGH" style={{boxSizing:'border-box',width:'100%',fontSize:30,letterSpacing:5,padding:16,background:'#080b12',color:'#fff',border:'1px solid #394963',margin:'18px 0'}} />
      <button onClick={()=>location.href=`/link?code=${encodeURIComponent(code)}`} style={{width:'100%',padding:16,fontSize:17,fontWeight:700,border:0,background:'#fff',color:'#080b12'}}>CONTINUE</button>
      <p style={{fontSize:12,color:'#697891',marginTop:20}}>Project Zero accounts are separate from Microsoft/Epic accounts. Never enter a Microsoft or Epic password here.</p>
    </section>
  </main>;
}
