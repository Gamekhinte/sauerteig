'use strict';
const SB_URL='https://rsirxtxeiolsaultreuz.supabase.co';
const SB_KEY='sb_publishable_VYVOJ--pfOlhIES2swipGg_E33b0185';
const GEMINI='https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const $=id=>document.getElementById(id);
const LS={get:(k,d)=>{try{const v=localStorage.getItem(k'use strict';
const SB_URL='https://rsirxtxeiolsaultreuz.supabase.co';
const SB_KEY='sb_publishable_VYVOJ--pfOlhIES2swipGg_E33b0185';
const GEMINI='https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const $=id=>document.getElementById(id);
const LS={get:(k,d)=>{try{const v=localStorage.getItem(k);return v===null?d:JSON.parse(v)}catch{return d}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}},del:k=>{try{localStorage.removeItem(k)}catch{}}};
const ICON=n=>`<svg class="ic"><use href="#i-${n}"/></svg>`;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let breads=[],plan=LS.get('sb_plan',null),chat=LS.get('sb_chat',[]),pend=null;
let quiet=LS.get('sb_quiet',{on:false,from:'18:00',to:'06:00'});
let ck=LS.get('sb_ck',{profile:null,recipes:[]});

/* ---------- Tabs ---------- */
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('on',x===b));
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.id==='tab-'+b.dataset.tab));
  window.scrollTo(0,0);
});

/* ---------- Daten aus Supabase ---------- */
async function loadBreads(){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/breads?select=*,bread_steps(*)&order=sort_order`,{headers:{apikey:SB_KEY}});
    if(!r.ok)throw new Error(r.status);
    breads=await r.json();
    breads.forEach(b=>b.bread_steps.sort((a,c)=>a.position-c.position));
    LS.set('sb_breads',breads);
  }catch(e){breads=LS.get('sb_breads',[]);if(!breads.length)toast('Brotsorten konnten nicht geladen werden. Bitte Internet prüfen.')}
  EXTRA_BREADS.forEach(x=>{if(!breads.some(b=>b.slug===x.slug))breads.push(x)});
  const d=new Date(Date.now()-new Date().getTimezoneOffset()*6e4);$('start').value=d.toISOString().slice(0,16);
  fillSelects();render();
}
// Chefkoch-Rezepte, die zu einer Brotsorte passen (Stichwörter im Rezepttitel)
const KW={weizen:['weizen','weißbrot','baguette'],dinkel:['dinkel'],roggen:['roggen','bauernbrot'],vollkorn:['vollkorn'],koerner:['körner','saaten','mehrkorn'],mischbrot:['mischbrot'],walnuss:['walnuss'],kartoffel:['kartoffel'],sonnenblumen:['sonnenblume'],ciabatta:['ciabatta'],baguette:['baguette'],broetchen:['brötchen','semmel'],focaccia:['focaccia']};
const match=b=>{const k=KW[b.slug]||[b.name.toLowerCase()];return ck.recipes.filter(r=>k.some(w=>r.title.toLowerCase().includes(w)))};
function fillSelects(){
  const sc=Object.fromEntries(breads.map(b=>[b.slug,match(b).length]));
  const opts=[...breads].sort((a,b)=>sc[b.slug]-sc[a.slug]).map(b=>`<option value="${esc(b.slug)}">${esc(b.name)}${sc[b.slug]?' · passt zu deinen Rezepten':''}</option>`).join('');
  ['bread','cBread'].forEach(id=>{const e=$(id),v=e.value;e.innerHTML=opts;if(v&&getBread(v))e.value=v});
  showInfo();calc();
}
const getBread=s=>breads.find(b=>b.slug===s);
function showInfo(){
  const b=getBread($('bread').value);if(!b){$('breadInfo').textContent='';$('ckMatch').innerHTML='';return}
  $('breadInfo').textContent=`${b.tagline}. Teig: ${b.hydration_pct}% Wasser, ${b.starter_pct}% Starter, ${b.salt_pct}% Salz (bezogen auf das Mehl).`;
  const m=match(b).slice(0,3);
  $('ckMatch').innerHTML=m.length?`<p class="muted" style="margin:0 0 4px">Aus deinen Chefkoch-Rezepten:</p>`+m.map(r=>`<a href="${esc(r.url)}" target="_blank" rel="noopener">${ICON('link')} ${esc(r.title)}</a>`).join(''):'';
}
$('bread').onchange=showInfo;

/* ---------- Mengen ---------- */
const fmt=g=>g<10?g.toFixed(1).replace('.',',')+' g':Math.round(g)+' g';
function ingredients(b,flour){
  const L=[];
  if(b.fl)b.fl.forEach(([n,s])=>L.push({n,g:flour*s}));
  else if(b.slug==='roggen'){L.push({n:'Roggenmehl 1150',g:flour*.7},{n:'Weizenmehl 550',g:flour*.3})}
  else L.push({n:{weizen:'Weizenmehl 550',dinkel:'Dinkelmehl 630',vollkorn:'Vollkornmehl (Weizen)',koerner:'Weizenmehl 550'}[b.slug]||'Mehl',g:flour});
  L.push({n:'Wasser (lauwarm)',g:flour*b.hydration_pct/100},{n:'Sauerteig-Starter (aktiv)',g:flour*b.starter_pct/100},{n:'Salz',g:flour*b.salt_pct/100});
  (b.extras||[]).forEach(e=>L.push({n:e.name,g:flour*e.pct/100}));
  return L;
}
const ingHTML=L=>L.map(i=>`<div><span>${esc(i.n)}</span><b>${fmt(i.g)}</b></div>`).join('');

/* ---------- Rechner ---------- */
function calc(){
  const b=getBread($('cBread').value);if(!b){$('cResult').innerHTML='';return}
  const base=ingredients(b,100);
  if($('cIngr').dataset.s!==b.slug){$('cIngr').innerHTML=base.map((x,i)=>`<option value="${i}">${esc(x.n)}</option>`).join('');$('cIngr').dataset.s=b.slug}
  const am=parseFloat($('cAmount').value),pe=parseFloat($('cPersons').value);let flour=0,head='';
  if(am>0){flour=100*am/base[+$('cIngr').value].g;head=`Für ${fmt(am)} ${base[+$('cIngr').value].n}:`}
  else if(pe>0){flour=pe*b.flour_per_person_g;head=`Für ${pe} ${pe==1?'Person':'Personen'}:`}
  $('cResult').innerHTML=flour?`<p class="muted" style="margin:0">${head}</p>`+ingHTML(ingredients(b,flour)):'<p class="muted">Gib Personen oder eine Menge ein.</p>';
}
['cBread','cPersons','cAmount','cIngr'].forEach(id=>$(id).addEventListener('input',calc));

/* ---------- Ruhezeit ---------- */
const toMin=s=>{const [h,m]=s.split(':');return +h*60+ +m};
// Schiebt einen Zeitpunkt aus der Ruhezeit auf deren Ende
function adj(t){
  if(!quiet.on)return t;
  const f=toMin(quiet.from),e=toMin(quiet.to);if(f===e)return t;
  const d=new Date(t),m=d.getHours()*60+d.getMinutes();
  if(!(f<e?(m>=f&&m<e):(m>=f||m<e)))return t;
  const r=new Date(t);r.setHours(Math.floor(e/60),e%60,0,0);
  if(r.getTime()<=t)r.setDate(r.getDate()+1);
  return r.getTime();
}
function quietUI(){
  $('qOn').checked=quiet.on;$('qFrom').value=quiet.from;$('qTo').value=quiet.to;
  $('qTimes').style.opacity=quiet.on?1:.5;
}
['qOn','qFrom','qTo'].forEach(id=>$(id).addEventListener('change',()=>{
  quiet={on:$('qOn').checked,from:$('qFrom').value||quiet.from,to:$('qTo').value||quiet.to};
  LS.set('sb_quiet',quiet);quietUI();render();
}));

/* ---------- Plan ---------- */
$('makePlan').onclick=()=>{
  const b=getBread($('bread').value);if(!b)return;
  const n=Math.round(+$('persons').value);if(!(n>=1))return toast('Bitte die Personenzahl eingeben.');
  const raw=new Date($('start').value).getTime()||Date.now(),st=adj(raw);
  plan={slug:b.slug,persons:Math.min(n,50),starts:[st],idx:0,fired:[]};
  LS.set('sb_plan',plan);render();
  // Berechtigungen müssen per Tipp angefragt werden: jetzt Ton freischalten und ggf. Benachrichtigungen erfragen
  try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();actx.resume()}catch{}
  if('Notification' in window&&Notification.permission==='default')Notification.requestPermission().then(()=>{notifState();syncPush(true)});
  keepAwake();
  if(st!==raw)toast(`Start auf ${hhmm(st)} verschoben (Ruhezeit).`);
};
$('newBake').onclick=()=>{if(confirm('Aktuellen Ablauf beenden?')){plan=null;LS.del('sb_plan');render()}};
const hhmm=t=>{const d=new Date(t),n=new Date(),same=d.toDateString()===n.toDateString();
  return (same?'':d.toLocaleDateString('de-DE',{weekday:'short'})+' ')+d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})};
const dur=m=>m>=60?`${Math.floor(m/60)} Std${m%60?' '+m%60+' Min':''}`:`${m} Min`;
const stepEnd=(s,st)=>adj(st+s.minutes*6e4);
function schedule(b){ // projizierte Startzeiten; sh[i]: wegen Ruhezeit verschoben
  const S=b.bread_steps,T=[],sh=[];
  for(let i=0;i<S.length;i++){
    if(i<plan.starts.length){T.push(plan.starts[i]);sh.push(false)}
    else{const raw=T[i-1]+S[i-1].minutes*6e4,a=adj(raw);T.push(a);sh.push(a!==raw)}
  }
  return {T,sh};
}
function render(){
  const b=plan&&getBread(plan.slug);
  $('setup').hidden=!!b;$('plan').hidden=!b;
  keepAwake();notifState();syncPush();
  if(!b)return;
  const flour=plan.persons*b.flour_per_person_g;
  $('planTitle').textContent=`${b.name} · ${plan.persons} ${plan.persons==1?'Person':'Personen'}`;
  $('planIngr').innerHTML=ingHTML(ingredients(b,flour));
  const S=b.bread_steps,{T,sh}=schedule(b);let h='';
  S.forEach((s,i)=>{
    const cls=i<plan.idx?'done':i===plan.idx?'cur':'';
    const when=i<plan.idx?ICON('check'):(sh[i]?ICON('moon')+' ':'')+hhmm(T[i]);
    h+=`<div class="step ${cls}"><div class="t"><span><span class="n">${i+1}</span>${esc(s.title)}</span><span class="when">${when}</span></div>`;
    if(i===plan.idx){
      const end=stepEnd(s,plan.starts[i]),late=end!==plan.starts[i]+s.minutes*6e4;
      h+=`<p>${esc(s.description)}</p><div class="count" id="count">--:--</div><p class="muted">Dauer: ${dur(s.minutes)}${/Falten/.test(s.title)?' · Erinnerung alle 30 Min':''}</p>${late?`<p class="muted">${ICON('moon')} Wegen der Ruhezeit erst um ${hhmm(end)}.</p>`:''}<button class="btn" id="doneBtn">${i===S.length-1?'FERTIG – GUTEN APPETIT':'SCHRITT ERLEDIGT'}</button>`;
    }else if(i>plan.idx)h+=`<p class="muted" style="margin:4px 0 0">Dauer: ${dur(s.minutes)}</p>`;
    h+='</div>';
  });
  $('steps').innerHTML=h;
  const db=$('doneBtn');if(db)db.onclick=nextStep;
  tick();
}
function nextStep(){
  const b=getBread(plan.slug),S=b.bread_steps;
  if(plan.idx>=S.length-1){plan=null;LS.del('sb_plan');render();toast('Fertig! Lass es gut auskühlen.');return}
  plan.idx++;plan.starts[plan.idx]=Date.now();LS.set('sb_plan',plan);render();
}

/* ---------- Timer & Erinnerungen ---------- */
function eventsFor(b,i,st){ // Erinnerungen eines Schritts, der um st beginnt
  const s=b.bread_steps[i],nx=b.bread_steps[i+1],E=[];
  if(/Falten/.test(s.title))for(let n=1;n<=3;n++){const t=st+n*30*6e4;if(adj(t)===t)E.push({k:`${i}:f${n}`,t,title:'Dehnen und Falten',body:`Runde ${n+1} von 4: Teig einmal dehnen und falten.`})}
  E.push({k:`${i}:end`,t:stepEnd(s,st),title:`${s.title}: fertig`,body:nx?`Weiter mit: ${nx.title}`:'Dein Brot ist durch. Gut auskühlen lassen!'});
  return E;
}
function events(){const b=plan&&getBread(plan.slug);return b?eventsFor(b,plan.idx,plan.starts[plan.idx]):[]}

/* ---------- Push (auch bei geschlossener App, über Supabase) ---------- */
const PUSH=SB_URL+'/functions/v1/push-api';
let pushEp=null,pushOn=false,pushLast='',pushT;
const pushCall=body=>fetch(PUSH,{method:'POST',headers:{'Content-Type':'application/json',apikey:SB_KEY},body:JSON.stringify(body)}).then(r=>r.json());
const b64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));
async function ensurePush(){
  if(pushEp)return pushEp;
  if(!('serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window)||Notification.permission!=='granted')return null;
  try{
    const reg=await navigator.serviceWorker.ready;let sub=await reg.pushManager.getSubscription();
    if(!sub){const c=await pushCall({action:'config'});sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(c.publicKey)})}
    const j=sub.toJSON(),r=await pushCall({action:'subscribe',endpoint:j.endpoint,keys:j.keys});
    if(!r.ok)throw new Error(r.error);
    pushEp=j.endpoint;pushOn=true;notifState();return pushEp;
  }catch(e){pushOn=false;return null}
}
// Schickt alle anstehenden Erinnerungen an den Server; der verschickt sie zur richtigen Zeit per Push
function syncPush(force){
  clearTimeout(pushT);
  pushT=setTimeout(async()=>{
    const b=plan&&getBread(plan.slug);
    if(!b&&!pushEp)return;
    const ep=await ensurePush();if(!ep)return;
    let jobs=[];
    if(b){const {T}=schedule(b),now=Date.now();
      for(let i=plan.idx;i<b.bread_steps.length;i++)eventsFor(b,i,i===plan.idx?plan.starts[i]:T[i]).forEach(e=>{if(e.t>now)jobs.push({t:e.t,title:e.title,body:e.body})});}
    const sig=JSON.stringify(jobs);if(!force&&sig===pushLast)return;
    try{const r=await pushCall(jobs.length?{action:'schedule',endpoint:ep,jobs}:{action:'cancel',endpoint:ep});if(r.ok)pushLast=sig}catch{}
  },600);
}
function tick(){
  if(!plan)return;
  const b=getBread(plan.slug),s=b.bread_steps[plan.idx],end=stepEnd(s,plan.starts[plan.idx]),left=end-Date.now(),c=$('count');
  if(c){const a=Math.abs(left)/1e3,H=Math.floor(a/3600),M=Math.floor(a%3600/60),S=Math.floor(a%60),p=n=>String(n).padStart(2,'0');
    c.textContent=(left<0?'+':'')+(H?H+':':'')+p(M)+':'+p(S);c.style.color=left<0?'#a33':''}
  events().forEach(e=>{if(e.t<=Date.now()&&!plan.fired.includes(e.k)){plan.fired.push(e.k);LS.set('sb_plan',plan);notify(e.title,e.body)}});
}
setInterval(tick,1000);document.addEventListener('visibilitychange',()=>!document.hidden&&tick());
let actx;
function beep(){ // kurzer Signalton, damit man es auch ohne Blick aufs Handy mitbekommt
  try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();actx.resume();
    [0,.25,.5].forEach(d=>{const o=actx.createOscillator(),g=actx.createGain();o.frequency.value=880;g.gain.value=.2;o.connect(g);g.connect(actx.destination);o.start(actx.currentTime+d);o.stop(actx.currentTime+d+.15)})}catch{}
}
let wl;
async function keepAwake(){ // Bildschirm anlassen, solange ein Plan läuft und die App sichtbar ist
  try{if(plan&&!document.hidden&&navigator.wakeLock&&!wl){wl=await navigator.wakeLock.request('screen');wl.onrelease=()=>wl=null}
    else if(!plan&&wl){wl.release();wl=null}}catch{}
}
document.addEventListener('visibilitychange',keepAwake);
function notifState(){
  const n=$('notifState');if(!n)return;
  n.textContent=!('Notification' in window)?'Dieses Gerät unterstützt keine Browser-Benachrichtigungen. Auf dem iPhone zuerst „Zum Home-Bildschirm“ wählen.'
    :Notification.permission==='granted'?(pushOn?'Benachrichtigungen sind aktiv, auch bei geschlossener App (Push).':'Benachrichtigungen sind aktiv, solange die App offen ist. Push im Hintergrund wird eingerichtet …')
    :Notification.permission==='denied'?'Benachrichtigungen sind blockiert. Erlaube sie in den Browser- oder Handy-Einstellungen für diese Seite.':'Noch nicht aktiviert.';
}
function notify(title,body){
  toast(`${title} – ${body}`);navigator.vibrate&&navigator.vibrate([300,150,300,150,300]);beep();
  if('Notification' in window&&Notification.permission==='granted'){
    const o={body,icon:'icon-192.png',badge:'icon-192.png',tag:'step',renotify:true,requireInteraction:true,vibrate:[300,150,300,150,300]};
    navigator.serviceWorker?.ready.then(r=>r.showNotification(title,o)).catch(()=>{try{new Notification(title,o)}catch{}});
  }
}
let bt;function toast(m){const e=$('banner');e.textContent=m;e.hidden=false;clearTimeout(bt);bt=setTimeout(()=>e.hidden=true,12000);e.onclick=()=>e.hidden=true}
$('notifBtn').onclick=async()=>{
  if(!('Notification' in window))return toast('Dieses Gerät unterstützt keine Benachrichtigungen im Browser. Auf dem iPhone zuerst „Zum Home-Bildschirm“ wählen.');
  const p=await Notification.requestPermission();notifState();toast(p==='granted'?'Benachrichtigungen sind aktiv.':'Benachrichtigungen wurden nicht erlaubt.');
  if(p==='granted'){notify('Test','So melde ich mich, wenn ein Schritt ansteht.');syncPush(true)}
};
$('icsBtn').onclick=()=>{
  const b=plan&&getBread(plan.slug);if(!b)return;const {T}=schedule(b),z=t=>new Date(t).toISOString().replace(/[-:]|\.\d+/g,'');
  const esc2=t=>t.replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,');
  let o='BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Sauerteig Helfer//DE\r\n';
  b.bread_steps.forEach((s,i)=>{if(i<plan.idx)return;o+=`BEGIN:VEVENT\r\nUID:${plan.starts[0]}-${i}@sauerteig\r\nDTSTAMP:${z(Date.now())}\r\nDTSTART:${z(T[i])}\r\nDTEND:${z(T[i]+Math.max(s.minutes,5)*6e4)}\r\nSUMMARY:${esc2(s.title)}\r\nDESCRIPTION:${esc2(s.description)}\r\nBEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:${esc2(s.title)}\r\nTRIGGER:PT0M\r\nEND:VALARM\r\nEND:VEVENT\r\n`});
  o+='END:VCALENDAR\r\n';
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([o],{type:'text/calendar'}));a.download='sauerteig.ics';a.click();
};

/* ---------- Chefkoch ---------- */
const saveCk=()=>LS.set('sb_ck',ck);
// Erkennt einen chefkoch.de-Link (auch aus Teilen-Text) und leitet den Titel aus dem Text oder der URL ab
function parseCk(txt){
  const m=txt.match(/https?:\/\/[^\s]+/);if(!m)return null;
  let u;try{u=new URL(m[0])}catch{return null}
  if(!/(^|\.)chefkoch\.de$/.test(u.hostname))return null;
  let title=txt.replace(m[0],'').split('\n').map(x=>x.trim()).find(Boolean)||'';
  title=title.replace(/^[„"“]+|[“”"]+$/g,'').slice(0,80);
  if(!title){try{title=decodeURIComponent((u.pathname.split('/').filter(Boolean).pop()||'').replace(/\.html$/,'')).replace(/-/g,' ').trim()}catch{}}
  if(!title||/^\d+$/.test(title))title='Chefkoch-Rezept';
  return {url:`https://${u.hostname}${u.pathname}`,title};
}
function drawCk(){
  const p=ck.profile;
  $('ckProfState').innerHTML=p?`${ICON('check')} Verknüpft mit <b>${esc(p.name)}</b>${p.url?` · <a href="${esc(p.url)}" target="_blank" rel="noopener">Profil öffnen</a>`:''}`:'Noch kein Profil verknüpft.';
  $('ckList').innerHTML=ck.recipes.map((r,i)=>`<div><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a><button data-i="${i}" aria-label="Entfernen">${ICON('trash')}</button></div>`).join('');
  $('ckList').querySelectorAll('button').forEach(b=>b.onclick=()=>{ck.recipes.splice(+b.dataset.i,1);saveCk();drawCk();fillSelects()});
}
$('ckProfSave').onclick=()=>{
  const v=$('ckProf').value.trim();if(!v)return;
  if(/^https?:/i.test(v)){
    const r=parseCk(v);if(!r)return toast('Das ist kein chefkoch.de-Link.');
    ck.profile={name:r.title==='Chefkoch-Rezept'?'Chefkoch-Profil':r.title,url:r.url};
  }else ck.profile={name:v.slice(0,40),url:''};
  saveCk();$('ckProf').value='';drawCk();toast('Chefkoch-Profil verknüpft.');
};
$('ckProfDel').onclick=()=>{ck.profile=null;saveCk();drawCk()};
function addRecipe(){
  const v=$('ckUrl').value.trim();if(!v)return;
  const r=parseCk(v);if(!r)return toast('Bitte einen Link von chefkoch.de einfügen.');
  if(ck.recipes.some(x=>x.url===r.url))return toast('Dieses Rezept ist schon in der Liste.');
  if(ck.recipes.length>=50)return toast('Maximal 50 Rezepte.');
  ck.recipes.unshift(r);saveCk();$('ckUrl').value='';drawCk();fillSelects();
}
$('ckAdd').onclick=addRecipe;$('ckUrl').addEventListener('keydown',e=>e.key==='Enter'&&addRecipe());

/* ---------- Gemini ---------- */
function keyState(){const k=LS.get('sb_key','');$('keyState').textContent=k?'gespeichert (••••'+k.slice(-4)+')':'fehlt';$('keyBox').open=!k}
$('keySave').onclick=()=>{const k=$('keyIn').value.trim();if(!k)return;LS.set('sb_key',k);$('keyIn').value='';keyState();toast('Key gespeichert.')};
$('keyDel').onclick=()=>{LS.del('sb_key');keyState()};
const HI={r:'a',t:'Hi! Ich helfe dir bei Sauerteig: Starter, Teig zu klebrig, Gare, Kruste … Frag einfach. Du kannst mir auch ein Foto von Teig oder Brot schicken.'};
function drawChat(){
  const log=$('chatLog');log.textContent='';
  (chat.length?chat:[HI]).forEach(m=>{
    const d=document.createElement('div');d.className='msg '+m.r;
    if(m.p){const i=new Image();i.src=m.p;d.appendChild(i)}
    else if(m.img){const s=document.createElement('div');s.className='muted';s.innerHTML=ICON('image')+' Foto';d.appendChild(s)}
    if(m.t){const s=document.createElement('span');s.textContent=m.t;d.appendChild(s)}
    log.appendChild(d);
  });
  log.scrollTop=1e9;
}
// Foto klein rechnen: bis 384 px Kantenlänge zählt Gemini pauschal ca. 258 Tokens
function shrink(f,max=384){return new Promise((ok,no)=>{
  const u=URL.createObjectURL(f),im=new Image();
  im.onload=()=>{const s=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');
    c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);c.getContext('2d').drawImage(im,0,0,c.width,c.height);
    URL.revokeObjectURL(u);ok(c.toDataURL('image/jpeg',.6))};
  im.onerror=()=>{URL.revokeObjectURL(u);no()};im.src=u;
})}
function setPend(d){pend=d;$('pend').hidden=!d;$('pendImg').src=d||''}
$('imgBtn').onclick=()=>$('imgIn').click();
$('imgIn').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
  try{setPend(await shrink(f))}catch{toast('Das Bild konnte nicht gelesen werden.')}};
$('pendX').onclick=()=>setPend(null);
async function send(){
  const q=$('chatIn').value.trim();if(!q&&!pend)return;
  const k=LS.get('sb_key','');if(!k){$('keyBox').open=true;toast('Bitte zuerst oben deinen Gemini API Key speichern.');return}
  const img=pend;$('chatIn').value='';setPend(null);
  chat.push({r:'u',t:q,img:!!img,p:img||undefined});chat.push({r:'a',t:'…'});drawChat();$('chatSend').disabled=true;
  const b=plan&&getBread(plan.slug),rec=ck.recipes.slice(0,5).map(r=>r.title).join('; ');
  const sys='Du bist ein freundlicher, erfahrener Sauerteig-Bäcker. Antworte auf Deutsch, kurz und praktisch.'
    +(b?` Die Person backt gerade: ${b.name} für ${plan.persons} Personen, aktueller Schritt: ${b.bread_steps[plan.idx].title}.`:'')
    +(rec?` Ihre Chefkoch-Lieblingsrezepte: ${rec}.`:'');
  // Verlauf nur als Text (Fotos werden nie erneut gesendet), kurz gehalten
  const hist=chat.slice(0,-2).filter(m=>!m.e).slice(-6).map(m=>({role:m.r==='u'?'user':'model',parts:[{text:(m.img?'[Foto] ':'')+m.t}]}));
  while(hist.length&&hist[0].role!=='user')hist.shift();
  const parts=[{text:q||'Was siehst du auf dem Foto? Was sollte ich tun?'}];
  if(img)parts.push({inlineData:{mimeType:'image/jpeg',data:img.split(',')[1]}});
  hist.push({role:'user',parts});
  const last=chat[chat.length-1];
  try{
    const r=await fetch(GEMINI,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':k},body:JSON.stringify({systemInstruction:{parts:[{text:sys}]},contents:hist,generationConfig:{maxOutputTokens:600,thinkingConfig:{thinkingBudget:0}}})});
    const j=await r.json();if(!r.ok)throw new Error(j.error?.message||r.status);
    last.t=j.candidates?.[0]?.content?.parts?.map(p=>p.text).join('')||'(keine Antwort)';
  }catch(e){last.t='Fehler: '+e.message;last.e=1}
  chat=chat.slice(-30);LS.set('sb_chat',chat.map(({p,...m})=>m));drawChat();$('chatSend').disabled=false;
}
$('chatSend').onclick=send;$('chatIn').addEventListener('keydown',e=>e.key==='Enter'&&send());

/* ---------- Start ---------- */
quietUI();keyState();drawChat();drawCk();loadBreads();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
);return v===null?d:JSON.parse(v)}catch{return d}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}},del:k=>{try{localStorage.removeItem(k)}catch{}}};
let breads=[],plan=LS.get('sb_plan',null),chat=LS.get('sb_chat',[]);

/* ---------- Tabs ---------- */
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('on',x===b));
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.id==='tab-'+b.dataset.tab));
  window.scrollTo(0,0);
});

/* ---------- Daten aus Supabase ---------- */
async function loadBreads(){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/breads?select=*,bread_steps(*)&order=sort_order`,{headers:{apikey:SB_KEY}});
    if(!r.ok)throw new Error(r.status);
    breads=await r.json();
    breads.forEach(b=>b.bread_steps.sort((a,c)=>a.position-c.position));
    LS.set('sb_breads',breads);
  }catch(e){breads=LS.get('sb_breads',[]);if(!breads.length)toast('Brotsorten konnten nicht geladen werden. Bitte Internet prüfen.')}
  fillSelects();render();
}
function fillSelects(){
  const opts=breads.map(b=>`<option value="${b.slug}">${b.emoji} ${b.name}</option>`).join('');
  $('bread').innerHTML=opts;$('cBread').innerHTML=opts;
  $('persons').innerHTML=Array.from({length:12},(_,i)=>`<option value="${i+1}"${i==3?' selected':''}>${i+1} ${i?'Personen':'Person'}</option>`).join('');
  const d=new Date(Date.now()-new Date().getTimezoneOffset()*6e4);$('start').value=d.toISOString().slice(0,16);
  showInfo();calc();
}
const getBread=s=>breads.find(b=>b.slug===s);
function showInfo(){const b=getBread($('bread').value);if(b)$('breadInfo').textContent=`${b.tagline}. Teig: ${b.hydration_pct}% Wasser, ${b.starter_pct}% Starter, ${b.salt_pct}% Salz (bezogen auf das Mehl).`}
$('bread').onchange=showInfo;

/* ---------- Mengen ---------- */
const fmt=g=>g<10?g.toFixed(1).replace('.',',')+' g':Math.round(g)+' g';
function ingredients(b,flour){
  const L=[];
  if(b.slug==='roggen'){L.push({n:'Roggenmehl 1150',g:flour*.7},{n:'Weizenmehl 550',g:flour*.3})}
  else L.push({n:{weizen:'Weizenmehl 550',dinkel:'Dinkelmehl 630',vollkorn:'Vollkornmehl (Weizen)',koerner:'Weizenmehl 550'}[b.slug]||'Mehl',g:flour});
  L.push({n:'Wasser (lauwarm)',g:flour*b.hydration_pct/100},{n:'Sauerteig-Starter (aktiv)',g:flour*b.starter_pct/100},{n:'Salz',g:flour*b.salt_pct/100});
  (b.extras||[]).forEach(e=>L.push({n:e.name,g:flour*e.pct/100}));
  return L;
}
const ingHTML=L=>L.map(i=>`<div><span>${i.n}</span><b>${fmt(i.g)}</b></div>`).join('');

/* ---------- Rechner ---------- */
function calc(){
  const b=getBread($('cBread').value);if(!b){$('cResult').innerHTML='';return}
  const base=ingredients(b,100),cur=$('cIngr').value;
  if($('cIngr').dataset.s!==b.slug){$('cIngr').innerHTML=base.map((x,i)=>`<option value="${i}">${x.n}</option>`).join('');$('cIngr').dataset.s=b.slug}
  const am=parseFloat($('cAmount').value),pe=parseFloat($('cPersons').value);let flour=0,head='';
  if(am>0){flour=100*am/base[+$('cIngr').value].g;head=`Für ${fmt(am)} ${base[+$('cIngr').value].n}:`}
  else if(pe>0){flour=pe*b.flour_per_person_g;head=`Für ${pe} ${pe==1?'Person':'Personen'}:`}
  $('cResult').innerHTML=flour?`<p class="muted" style="margin:0">${head}</p>`+ingHTML(ingredients(b,flour)):'<p class="muted">Gib Personen oder eine Menge ein.</p>';
}
['cBread','cPersons','cAmount','cIngr'].forEach(id=>$(id).addEventListener('input',calc));

/* ---------- Plan ---------- */
$('makePlan').onclick=()=>{
  const b=getBread($('bread').value);if(!b)return;
  const st=new Date($('start').value).getTime()||Date.now();
  plan={slug:b.slug,persons:+$('persons').value,starts:[st],idx:0,fired:[]};
  LS.set('sb_plan',plan);render();
};
$('newBake').onclick=()=>{if(confirm('Aktuellen Ablauf beenden?')){plan=null;LS.del('sb_plan');render()}};
const hhmm=t=>{const d=new Date(t),n=new Date(),same=d.toDateString()===n.toDateString();
  return (same?'':d.toLocaleDateString('de-DE',{weekday:'short'})+' ')+d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})};
const dur=m=>m>=60?`${Math.floor(m/60)} Std${m%60?' '+m%60+' Min':''}`:`${m} Min`;
function schedule(b){ // projizierte Startzeiten
  const S=b.bread_steps,out=[];
  for(let i=0;i<S.length;i++)out.push(i<plan.starts.length?plan.starts[i]:out[i-1]+S[i-1].minutes*6e4);
  return out;
}
function render(){
  const b=plan&&getBread(plan.slug);
  $('setup').hidden=!!b;$('plan').hidden=!b;
  if(!b)return;
  const flour=plan.persons*b.flour_per_person_g;
  $('planTitle').textContent=`${b.emoji} ${b.name} · ${plan.persons} ${plan.persons==1?'Person':'Personen'}`;
  $('planIngr').innerHTML=ingHTML(ingredients(b,flour));
  const S=b.bread_steps,T=schedule(b);let h='';
  S.forEach((s,i)=>{
    const cls=i<plan.idx?'done':i===plan.idx?'cur':'';
    h+=`<div class="step ${cls}"><div class="t"><span><span class="n">${i+1}</span>${s.title}</span><span class="when">${i<plan.idx?'✓':hhmm(T[i])}</span></div>`;
    if(i===plan.idx)h+=`<p>${s.description}</p><div class="count" id="count">--:--</div><p class="muted">Dauer: ${dur(s.minutes)}${/Falten/.test(s.title)?' · Erinnerung alle 30 Min':''}</p><button class="btn" id="doneBtn">${i===S.length-1?'FERTIG – GUTEN APPETIT':'SCHRITT ERLEDIGT'}</button>`;
    else if(i>plan.idx)h+=`<p class="muted" style="margin:4px 0 0">Dauer: ${dur(s.minutes)}</p>`;
    h+='</div>';
  });
  $('steps').innerHTML=h;
  const db=$('doneBtn');if(db)db.onclick=nextStep;
  tick();
}
function nextStep(){
  const b=getBread(plan.slug),S=b.bread_steps;
  if(plan.idx>=S.length-1){plan=null;LS.del('sb_plan');render();toast('Fertig! Lass es gut auskühlen. 🍞');return}
  plan.idx++;plan.starts[plan.idx]=Date.now();LS.set('sb_plan',plan);render();
}

/* ---------- Timer & Erinnerungen ---------- */
function events(){
  const b=plan&&getBread(plan.slug);if(!b)return[];
  const s=b.bread_steps[plan.idx],st=plan.starts[plan.idx],nx=b.bread_steps[plan.idx+1],E=[];
  if(/Falten/.test(s.title))for(let n=1;n<=3;n++)E.push({k:`${plan.idx}:f${n}`,t:st+n*30*6e4,title:'Dehnen und Falten',body:`Runde ${n+1} von 4: Teig einmal dehnen und falten.`});
  E.push({k:`${plan.idx}:end`,t:st+s.minutes*6e4,title:`${s.title}: fertig`,body:nx?`Weiter mit: ${nx.title}`:'Dein Brot ist durch. Gut auskühlen lassen!'});
  return E;
}
function tick(){
  if(!plan)return;
  const b=getBread(plan.slug),s=b.bread_steps[plan.idx],end=plan.starts[plan.idx]+s.minutes*6e4,left=end-Date.now(),c=$('count');
  if(c){const a=Math.abs(left)/1e3,H=Math.floor(a/3600),M=Math.floor(a%3600/60),S=Math.floor(a%60),p=n=>String(n).padStart(2,'0');
    c.textContent=(left<0?'+':'')+(H?H+':':'')+p(M)+':'+p(S);c.style.color=left<0?'#a33':''}
  events().forEach(e=>{if(e.t<=Date.now()&&!plan.fired.includes(e.k)){plan.fired.push(e.k);LS.set('sb_plan',plan);notify(e.title,e.body)}});
}
setInterval(tick,1000);document.addEventListener('visibilitychange',()=>!document.hidden&&tick());
function notify(title,body){
  toast(`${title} – ${body}`);navigator.vibrate&&navigator.vibrate([200,100,200]);
  if('Notification' in window&&Notification.permission==='granted'){
    const o={body,icon:'icon-192.png',tag:title};
    navigator.serviceWorker?.ready.then(r=>r.showNotification(title,o)).catch(()=>{try{new Notification(title,o)}catch{}});
  }
}
let bt;function toast(m){const e=$('banner');e.textContent=m;e.hidden=false;clearTimeout(bt);bt=setTimeout(()=>e.hidden=true,12000);e.onclick=()=>e.hidden=true}
$('notifBtn').onclick=async()=>{
  if(!('Notification' in window))return toast('Dieses Gerät unterstützt keine Benachrichtigungen im Browser. Auf dem iPhone zuerst „Zum Home-Bildschirm“ wählen.');
  const p=await Notification.requestPermission();toast(p==='granted'?'Benachrichtigungen sind aktiv.':'Benachrichtigungen wurden nicht erlaubt.');
};
$('icsBtn').onclick=()=>{
  const b=plan&&getBread(plan.slug);if(!b)return;const T=schedule(b),z=t=>new Date(t).toISOString().replace(/[-:]|\.\d+/g,'');
  const esc=t=>t.replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,');
  let o='BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Sauerteig Helfer//DE\r\n';
  b.bread_steps.forEach((s,i)=>{if(i<plan.idx)return;o+=`BEGIN:VEVENT\r\nUID:${plan.starts[0]}-${i}@sauerteig\r\nDTSTAMP:${z(Date.now())}\r\nDTSTART:${z(T[i])}\r\nDTEND:${z(T[i]+Math.max(s.minutes,5)*6e4)}\r\nSUMMARY:${esc('🍞 '+s.title)}\r\nDESCRIPTION:${esc(s.description)}\r\nBEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:${esc(s.title)}\r\nTRIGGER:PT0M\r\nEND:VALARM\r\nEND:VEVENT\r\n`});
  o+='END:VCALENDAR\r\n';
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([o],{type:'text/calendar'}));a.download='sauerteig.ics';a.click();
};

/* ---------- Gemini ---------- */
function keyState(){const k=LS.get('sb_key','');$('keyState').textContent=k?'Key gespeichert (••••'+k.slice(-4)+').':'Kein Key hinterlegt. Hol dir kostenlos einen auf aistudio.google.com/apikey.'}
$('keySave').onclick=()=>{const k=$('keyIn').value.trim();if(!k)return;LS.set('sb_key',k);$('keyIn').value='';keyState();toast('Key gespeichert.')};
$('keyDel').onclick=()=>{LS.del('sb_key');keyState()};
function drawChat(){$('chatLog').innerHTML=(chat.length?chat:[{r:'a',t:'Hi! Ich helfe dir bei Sauerteig: Starter, Teig zu klebrig, Gare, Kruste … Frag einfach.'}]).map(m=>`<div class="msg ${m.r}"></div>`).join('');
  [...$('chatLog').children].forEach((el,i)=>el.textContent=(chat.length?chat:[{t:'Hi! Ich helfe dir bei Sauerteig: Starter, Teig zu klebrig, Gare, Kruste … Frag einfach.'}])[i].t);$('chatLog').scrollTop=1e9}
async function send(){
  const q=$('chatIn').value.trim();if(!q)return;
  const k=LS.get('sb_key','');if(!k){toast('Bitte zuerst im Tab KEY deinen Gemini API Key speichern.');return}
  $('chatIn').value='';chat.push({r:'u',t:q});chat.push({r:'a',t:'…'});drawChat();$('chatSend').disabled=true;
  const b=plan&&getBread(plan.slug);
  const sys='Du bist ein freundlicher, erfahrener Sauerteig-Bäcker. Antworte auf Deutsch, kurz und praktisch.'+(b?` Die Person backt gerade: ${b.name} für ${plan.persons} Personen, aktueller Schritt: ${b.bread_steps[plan.idx].title}.`:'');
  try{
    const r=await fetch(GEMINI,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':k},body:JSON.stringify({systemInstruction:{parts:[{text:sys}]},contents:chat.slice(0,-1).slice(-12).map(m=>({role:m.r==='u'?'user':'model',parts:[{text:m.t}]}))})});
    const j=await r.json();if(!r.ok)throw new Error(j.error?.message||r.status);
    chat[chat.length-1].t=j.candidates?.[0]?.content?.parts?.map(p=>p.text).join('')||'(keine Antwort)';
  }catch(e){chat[chat.length-1].t='Fehler: '+e.message}
  chat=chat.slice(-30);LS.set('sb_chat',chat);drawChat();$('chatSend').disabled=false;
}
$('chatSend').onclick=send;$('chatIn').addEventListener('keydown',e=>e.key==='Enter'&&send());

/* ---------- Start ---------- */
keyState();drawChat();loadBreads();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
