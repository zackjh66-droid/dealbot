const API='https://iqexlxddywxuflvhjrkj.supabase.co/functions/v1/operator-api'
const CONNECT='https://iqexlxddywxuflvhjrkj.supabase.co/functions/v1/operator-connect'

const escapeHtml=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))
const icon=id=>`<svg class="ico" aria-hidden="true"><use href="/operator-icons-v2.svg#${id}"></use></svg>`

function initScenes(){
  let scenes=[],current=0,target=0,lastTouch=null,settle=null
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v))
  const refresh=()=>{scenes=[...document.querySelectorAll('.scene')].filter(x=>getComputedStyle(x).display!=='none');target=clamp(target,0,Math.max(0,scenes.length-1))}
  const render=()=>{
    current+=(target-current)*.105
    if(Math.abs(target-current)<.0006)current=target
    scenes.forEach((el,i)=>{
      const d=i-current,a=Math.abs(d),y=d*78,z=-Math.min(a,1.65)*330,sc=1-Math.min(a*.105,.22),rx=-d*7.5,op=clamp(1-a*.88,0,1)
      el.style.transform=`translate3d(-50%,calc(-50% + ${y}vh),${z}px) scale(${sc}) rotateX(${rx}deg)`
      el.style.opacity=String(op);el.style.filter=`blur(${Math.min(a*12,16)}px)`;el.style.pointerEvents=a<.45?'auto':'none';el.style.zIndex=String(40-Math.round(a*10))
    })
    requestAnimationFrame(render)
  }
  const settleSoon=()=>{clearTimeout(settle);settle=setTimeout(()=>{target=Math.round(target)},260)}
  const add=v=>{target=clamp(target+v,0,Math.max(0,scenes.length-1));settleSoon()}
  addEventListener('wheel',e=>{if(Math.abs(e.deltaY)<1)return;e.preventDefault();add(e.deltaY*.00145)},{passive:false})
  addEventListener('touchstart',e=>{lastTouch=e.touches[0]?.clientY??null},{passive:true})
  addEventListener('touchmove',e=>{if(lastTouch===null)return;const y=e.touches[0]?.clientY??lastTouch,dy=lastTouch-y;lastTouch=y;add(dy*.0062)},{passive:true})
  addEventListener('touchend',()=>{lastTouch=null;settleSoon()},{passive:true})
  addEventListener('keydown',e=>{if(['ArrowDown','PageDown',' '].includes(e.key)){e.preventDefault();target=clamp(Math.round(target)+1,0,Math.max(0,scenes.length-1))}if(['ArrowUp','PageUp'].includes(e.key)){e.preventDefault();target=clamp(Math.round(target)-1,0,Math.max(0,scenes.length-1))}})
  window.OperatorScenes={refresh,go:n=>{target=clamp(n,0,Math.max(0,scenes.length-1))}}
  refresh();render()
}

async function loginPage(){
  const go=document.getElementById('go'),msg=document.getElementById('msg')
  go.onclick=async()=>{msg.textContent='Checking…';const r=await fetch(API+'/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:user.value,password:pw.value})});const d=await r.json();if(!r.ok){msg.textContent=d.error||'Login failed';return}localStorage.setItem('op_session',d.session_token);location.href='/dashboard'}
}
async function setupPage(){
  const token=new URLSearchParams(location.search).get('token'),go=document.getElementById('go'),msg=document.getElementById('msg')
  go.onclick=async()=>{msg.textContent='Creating…';const r=await fetch(API+'/setup',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token,password:pw.value})});const d=await r.json();if(!r.ok){msg.textContent=d.error||'Could not create account';return}msg.textContent='Account created. Opening login…';setTimeout(()=>location.href='/login',600)}
}
async function dashboardPage(){
  const t=localStorage.getItem('op_session');if(!t){location.href='/login';return}
  const r=await fetch(API+'/me',{headers:{authorization:'Bearer '+t}});if(!r.ok){localStorage.removeItem('op_session');location.href='/login';return}
  const d=await r.json();name.textContent='@'+d.user.username;status.textContent=d.user.role==='admin'?'Owner / admin access':'OPERATOR workspace';st.textContent=d.user.status;pl.textContent=d.user.active_plan||(d.user.role==='admin'?'owner':'—');lc.textContent=String((d.leads||[]).length)
  leadList.innerHTML=(d.leads||[]).slice(0,6).map(x=>`<div class="row"><div class="rowLeft"><div class="iconBubble">${icon('leads')}</div><div><div class="rowTitle">${escapeHtml(x.display_name||'Opportunity')}</div><div class="rowSub">${escapeHtml((x.summary||'').slice(0,130))}</div></div></div><span class="status">${escapeHtml(x.stage||'new')}</span></div>`).join('')||'<div class="note">No active saved opportunities yet. Run /find in Telegram.</div>'
}
async function connectionsPage(){
  const token=localStorage.getItem('op_session');if(!token){location.href='/login';return}
  const H={authorization:'Bearer '+token,'content-type':'application/json'},byProvider={}
  const message=document.getElementById('oauthMessage'),ownerMsg=document.getElementById('ownerMsg'),infraMsg=document.getElementById('infraMsg')
  const load=async()=>{const r=await fetch(CONNECT+'/status',{headers:{authorization:'Bearer '+token}});if(!r.ok){localStorage.removeItem('op_session');location.href='/login';return}const d=await r.json();(d.connections||[]).forEach(x=>byProvider[x.provider]=x);document.querySelectorAll('[data-provider]').forEach(b=>{const p=b.dataset.provider,c=byProvider[p];b.textContent=c&&c.status==='connected'?'Disconnect':'Connect';b.classList.toggle('danger',Boolean(c&&c.status==='connected'));const st=document.querySelector(`[data-status="${p}"]`);if(st){st.textContent=c&&c.status==='connected'?'Connected':d.oauth?.[p]?'Ready':'Owner setup required';st.className='status '+(c&&c.status==='connected'?'on':d.oauth?.[p]?'on':'warn')}});const qs=new URLSearchParams(location.search);message.textContent=qs.get('connected')?'Connection completed successfully.':qs.get('oauth_error')?'Connection was not completed: '+qs.get('oauth_error'):'Choose a provider below. Approval happens on the provider’s own site.';const isAdmin=Object.prototype.hasOwnProperty.call(d,'global');if(!isAdmin){document.querySelectorAll('.ownerScene').forEach(x=>x.style.display='none');window.OperatorScenes.refresh()}}
  async function connect(p,btn){const connected=byProvider[p]&&byProvider[p].status==='connected';btn.disabled=true;if(connected){const r=await fetch(CONNECT+'/oauth/disconnect',{method:'POST',headers:H,body:JSON.stringify({provider:p})});const d=await r.json();message.textContent=r.ok?'Disconnected.':d.error||'Could not disconnect';if(r.ok)setTimeout(()=>location.href='/connections',300);btn.disabled=false;return}const r=await fetch(CONNECT+'/oauth/start',{method:'POST',headers:H,body:JSON.stringify({provider:p})});const d=await r.json();if(!r.ok){message.textContent=d.error||'Connector unavailable';btn.disabled=false;return}location.href=d.authorization_url}
  document.querySelectorAll('[data-provider]').forEach(b=>b.onclick=()=>connect(b.dataset.provider,b))
  document.querySelectorAll('[data-save-oauth]').forEach(b=>b.onclick=async()=>{const p=b.dataset.saveOauth,ids={meta_business:['metaId','metaSecret'],tiktok:['tiktokId','tiktokSecret'],google_workspace:['googleId','googleSecret']}[p];const r=await fetch(CONNECT+'/owner-oauth-app',{method:'POST',headers:H,body:JSON.stringify({provider:p,client_id:document.getElementById(ids[0]).value,client_secret:document.getElementById(ids[1]).value})});const d=await r.json();ownerMsg.textContent=r.ok?'Provider app saved. Register this callback URL with the provider: '+d.callback_url:d.error||'Could not save';if(r.ok)load()})
  saveBrave.onclick=async()=>{const r=await fetch(CONNECT+'/owner-key',{method:'POST',headers:H,body:JSON.stringify({provider:'brave_search',secret:braveKey.value})});const d=await r.json();infraMsg.textContent=r.ok?'Broad web search enabled for all OPERATOR users.':d.error||'Could not enable search'}
  await load()
}

document.addEventListener('DOMContentLoaded',async()=>{initScenes();const p=document.body.dataset.page;if(p==='login')await loginPage();if(p==='setup')await setupPage();if(p==='dashboard')await dashboardPage();if(p==='connections')await connectionsPage()})
