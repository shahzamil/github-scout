(function(){
  'use strict';
  const URL='https://welgeoyeurirwujlowle.supabase.co';
  const KEY='sb_publishable_jU_058tObbl9KzXA0BXXqw_WogEzgUV';
  const ADMIN_EMAIL='shahzad.muzzamil@gmail.com';
  if(!window.supabase||!window.supabase.createClient){console.warn('GitHub Scout account service could not load.');return;}

  const client=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  let session=null;
  let authMode='signup';
  let syncTimer=null;
  const byId=id=>document.getElementById(id);
  const cleanText=(value,max=160)=>String(value||'').trim().slice(0,max);
  const isAdmin=()=>session&&String(session.user.email||'').toLowerCase()===ADMIN_EMAIL;
  const productEvent=name=>{if(typeof window.trackEvent==='function')window.trackEvent(name);};

  function setStatus(id,message,error=false){const el=byId(id);if(!el)return;el.textContent=message||'';el.classList.toggle('err',!!error);}
  function openModal(){byId('accountModal').classList.remove('hidden');}
  function closeModal(){byId('accountModal').classList.add('hidden');}

  function renderAuth(){
    const loggedIn=!!(session&&session.user);
    byId('authView').classList.toggle('hidden',loggedIn);
    byId('memberView').classList.toggle('hidden',!loggedIn);
    byId('accountBtn').textContent=loggedIn?cleanText(session.user.user_metadata.full_name||session.user.email,26):'Create account / Sign in';
    if(!loggedIn)return;
    byId('memberIdentity').textContent=(session.user.user_metadata.full_name?session.user.user_metadata.full_name+' · ':'')+session.user.email;
    byId('adminSection').classList.toggle('hidden',!isAdmin());
    loadProjects();
    if(isAdmin())loadAdmin();
  }

  function renderMode(){
    const signup=authMode==='signup';
    byId('signupFields').classList.toggle('hidden',!signup);
    byId('authSubmit').textContent=signup?'Create account':'Sign in';
    byId('authToggle').textContent=signup?'Already registered? Sign in':'Need an account? Register';
    byId('authPassword').autocomplete=signup?'new-password':'current-password';
    setStatus('authStatus','');
  }

  async function submitAuth(){
    const email=cleanText(byId('authEmail').value,254).toLowerCase();
    const password=String(byId('authPassword').value||'');
    if(!email||!email.includes('@'))return setStatus('authStatus','Enter a valid email address.',true);
    if(password.length<8)return setStatus('authStatus','Password must contain at least 8 characters.',true);
    byId('authSubmit').disabled=true;
    setStatus('authStatus',authMode==='signup'?'Creating your account…':'Signing in…');
    try{
      if(authMode==='signup'){
        const fullName=cleanText(byId('authName').value,100),company=cleanText(byId('authCompany').value,120);
        if(!fullName)return setStatus('authStatus','Enter your full name.',true);
        const {data,error}=await client.auth.signUp({email,password,options:{data:{full_name:fullName,company}}});
        if(error)throw error;
        productEvent('account_signup');
        if(data.session){session=data.session;renderAuth();await touchProfile();setStatus('memberStatus','Account created and signed in.');}
        else setStatus('authStatus','Account created. Check your email and open the confirmation link, then sign in.');
      }else{
        const {data,error}=await client.auth.signInWithPassword({email,password});
        if(error)throw error;session=data.session;productEvent('account_login');renderAuth();await touchProfile();await mergeCloudShortlist();setStatus('memberStatus','Signed in. Your workspace is synchronized.');
      }
    }catch(error){setStatus('authStatus',error.message||'Account request failed. Please try again.',true);}
    finally{byId('authSubmit').disabled=false;}
  }

  async function touchProfile(){
    if(!session)return;
    await client.from('profiles').update({last_seen_at:new Date().toISOString()}).eq('id',session.user.id);
  }

  function shortlistRow(item){
    return{
      user_id:session.user.id,
      github_login:cleanText(item.login,100),
      full_name:cleanText(item.name,160),
      github_url:cleanText(item.url,500),
      score:Number.isFinite(Number(item.score))?Number(item.score):null,
      jd_match:item.jdPct==null?null:Math.max(0,Math.min(100,Number(item.jdPct)||0)),
      status:cleanText(item.status||'Sourced',40),
      notes:cleanText(item.note,2000),
      summary:cleanText(item.summary,8000),
      saved_at:item.ts?new Date(item.ts).toISOString():new Date().toISOString(),
      updated_at:new Date().toISOString()
    };
  }

  async function syncShortlist(list){
    if(!session||!Array.isArray(list))return;
    clearTimeout(syncTimer);
    syncTimer=setTimeout(async()=>{
      const rows=list.filter(x=>x&&x.login).map(shortlistRow);
      if(rows.length){
        const {error}=await client.from('saved_candidates').upsert(rows,{onConflict:'user_id,github_login'});
        if(error)setStatus('memberStatus','Local shortlist saved, but cloud sync failed: '+error.message,true);
      }
      const keep=rows.map(x=>x.github_login);
      let q=client.from('saved_candidates').delete().eq('user_id',session.user.id);
      if(keep.length)q=q.not('github_login','in','('+keep.map(x=>'"'+x.replace(/"/g,'')+'"').join(',')+')');
      await q;
    },500);
  }

  async function mergeCloudShortlist(){
    if(!session||typeof window.getShort!=='function'||typeof window.setShort!=='function')return;
    const {data,error}=await client.from('saved_candidates').select('*').order('saved_at',{ascending:false});
    if(error)return setStatus('memberStatus','Could not load your cloud shortlist: '+error.message,true);
    const local=window.getShort();const merged=new Map(local.map(x=>[String(x.login).toLowerCase(),x]));
    (data||[]).forEach(row=>{const key=row.github_login.toLowerCase();if(!merged.has(key))merged.set(key,{login:row.github_login,name:row.full_name||row.github_login,score:row.score,jdPct:row.jd_match,url:row.github_url,status:row.status,note:row.notes||'',ts:new Date(row.saved_at).getTime()});});
    window.setShort([...merged.values()]);
  }

  async function saveProject(){
    if(!session)return;
    const title=cleanText(byId('projectTitle').value,160);
    const jd=byId('jd')?String(byId('jd').value||'').trim().slice(0,30000):'';
    if(!title)return setStatus('memberStatus','Enter a project title.',true);
    if(!jd)return setStatus('memberStatus','Paste a job description in the evaluator first.',true);
    const {error}=await client.from('projects').insert({user_id:session.user.id,title,job_description:jd});
    if(error)return setStatus('memberStatus','Project could not be saved: '+error.message,true);
    productEvent('project_save');byId('projectTitle').value='';setStatus('memberStatus','Hiring project saved.');loadProjects();
  }

  async function loadProjects(){
    if(!session)return;
    const {data,error}=await client.from('projects').select('id,title,created_at').order('created_at',{ascending:false}).limit(20);
    const el=byId('projectList');if(error){el.innerHTML='<div class="account-status err">Projects could not be loaded.</div>';return;}
    el.innerHTML=(data||[]).length?(data||[]).map(p=>'<div class="account-item"><div><b>'+escapeHtml(p.title)+'</b><small>'+new Date(p.created_at).toLocaleDateString()+'</small></div><button class="account-link" data-delete-project="'+p.id+'">Delete</button></div>').join(''):'<div class="account-status">No projects saved yet.</div>';
    el.querySelectorAll('[data-delete-project]').forEach(button=>button.onclick=async()=>{await client.from('projects').delete().eq('id',button.dataset.deleteProject);loadProjects();});
  }

  async function loadAdmin(){
    if(!isAdmin())return;
    const [profiles,candidates,projects,eventCount,recentEvents]=await Promise.all([
      client.from('profiles').select('id,email,full_name,company,created_at,last_seen_at').order('created_at',{ascending:false}).limit(100),
      client.from('saved_candidates').select('id',{count:'exact',head:true}),
      client.from('projects').select('id',{count:'exact',head:true}),
      client.from('visitor_events').select('id',{count:'exact',head:true}),
      client.from('visitor_events').select('id,user_id,visitor_id,event_name,created_at,is_returning,device_type,browser,operating_system,referrer_host,timezone').order('created_at',{ascending:false}).limit(50)
    ]);
    if(profiles.error||recentEvents.error)return setStatus('memberStatus','Admin data could not be loaded: '+(profiles.error||recentEvents.error).message,true);
    byId('adminStats').innerHTML='<div class="admin-stat"><b>'+profiles.data.length+'</b><span>accounts</span></div><div class="admin-stat"><b>'+(projects.count||0)+'</b><span>projects</span></div><div class="admin-stat"><b>'+(candidates.count||0)+'</b><span>saved candidates</span></div><div class="admin-stat"><b>'+(eventCount.count||0)+'</b><span>usage events</span></div>';
    byId('adminUsers').innerHTML=profiles.data.map(user=>'<div class="account-item"><div><b>'+escapeHtml(user.full_name||user.email)+'</b><small>'+escapeHtml(user.email)+(user.company?' · '+escapeHtml(user.company):'')+'</small></div><small>Joined '+new Date(user.created_at).toLocaleDateString()+'<br>Last active '+new Date(user.last_seen_at||user.created_at).toLocaleString()+'</small></div>').join('');
    const emailById=new Map(profiles.data.map(user=>[user.id,user.email]));
    byId('adminEvents').innerHTML=recentEvents.data.map(event=>'<div class="account-item"><div><b>'+escapeHtml(event.event_name.replace(/_/g,' '))+'</b><small>'+(event.user_id?'Account: '+escapeHtml(emailById.get(event.user_id)||event.user_id):'Anonymous: '+escapeHtml(String(event.visitor_id).slice(0,8)))+' · '+escapeHtml(event.device_type)+' · '+escapeHtml(event.browser)+' / '+escapeHtml(event.operating_system)+(event.referrer_host?' · from '+escapeHtml(event.referrer_host):'')+'</small></div><small>'+new Date(event.created_at).toLocaleString()+'<br>'+escapeHtml(event.timezone||'Unknown time zone')+'</small></div>').join('')||'<div class="account-status">No activity recorded yet.</div>';
  }

  function escapeHtml(value){return String(value||'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));}

  async function logout(){await client.auth.signOut();session=null;renderAuth();closeModal();}
  function bind(){
    byId('accountBtn').onclick=openModal;byId('accountClose').onclick=closeModal;
    byId('accountModal').addEventListener('click',event=>{if(event.target===byId('accountModal'))closeModal();});
    byId('authToggle').onclick=()=>{authMode=authMode==='signup'?'login':'signup';renderMode();};
    byId('authSubmit').onclick=submitAuth;byId('authLogout').onclick=logout;
    byId('syncNow').onclick=async()=>{await mergeCloudShortlist();productEvent('shortlist_sync');setStatus('memberStatus','Shortlist synchronized.');};
    byId('saveProject').onclick=saveProject;
    byId('authPassword').addEventListener('keydown',event=>{if(event.key==='Enter')submitAuth();});
    document.addEventListener('keydown',event=>{if(event.key==='Escape')closeModal();});
  }

  window.scoutBackend={
    getAccessToken:()=>session&&session.access_token||'',
    getUser:()=>session&&session.user||null,
    syncShortlist,
    openAccount:openModal
  };

  document.addEventListener('DOMContentLoaded',async()=>{
    bind();renderMode();
    const {data}=await client.auth.getSession();session=data.session;renderAuth();
    if(session){await touchProfile();await mergeCloudShortlist();}
    client.auth.onAuthStateChange((_event,nextSession)=>{session=nextSession;setTimeout(async()=>{renderAuth();if(session){await touchProfile();await mergeCloudShortlist();}},0);});
  });
})();
