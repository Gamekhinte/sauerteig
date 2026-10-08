'use strict';
const SB_URL='https://rsirxtxeiolsaultreuz.supabase.co';
const SB_KEY='sb_publishable_VYVOJ--pfOlhIES2swipGg_E33b0185';
const GEMINI='https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const $=id=>document.getElementById(id);
const LS={get:(k,d)=>{try{const v=localStorage.getItem(k);return v===null?d:JSON.parse(v)}catch{return d}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}},del:k=>{try{localStorage.removeItem(k)}catch{}}};
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
