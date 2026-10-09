'use strict';
const SB_URL='https://rsirxtxeiolsaultreuz.supabase.co';
const SB_KEY='sb_publishable_VYVOJ--pfOlhIES2swipGg_E33b0185';
const GEMINI='https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const $=id=>document.getElementById(id);
const LS={get:(k,d)=>{try{const v=localStorage.getItem(k);return v===null?d:JSON.parse(v)}catch{return d}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}},del:k=>{try{localStorage.removeItem(k)}catch{}}};
const ICON=n=>`<svg class="ic"><use href="#i-${n}"/></svg>`;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let breads=[],plan=LS.get('sb_plan',null),chat=LS.get('sb_chat',[]),pend=null;
let quiet=LS.get('sb_quiet',{on:false,from:'18:00',to:'06:00'});
let ck={profile:null,recipes:[],folders:[],active:null,...LS.get('sb_ck',{})};

/* ---------- Tabs ---------- */
const NAV=[...document.querySelectorAll('nav button')];
function moveInd(){const i=Math.max(0,NAV.findIndex(x=>x.classList.contains('on'))),e=$('navInd');
  e.style.width=`calc((100% - 12px) / ${NAV.length})`;e.style.transform=`translateX(${i*100}%)`}
NAV.forEach(b=>b.onclick=()=>{
  if(b.classList.contains('on'))return;
  NAV.forEach(x=>x.classList.toggle('on',x===b));moveInd();
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.id==='tab-'+b.dataset.tab));
  window.scrollTo(0,0);
});
moveInd();

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
  syncCkBreads();
  const d=new Date(Date.now()-new Date().getTimezoneOffset()*6e4);$('start').value=d.toISOString().slice(0,16);
  fillSelects();render();
}
// Chefkoch-Rezepte, die zu einer Brotsorte passen (Stichwörter im Rezepttitel)
const KW={weizen:['weizen','weißbrot','baguette'],dinkel:['dinkel'],roggen:['roggen','bauernbrot'],vollkorn:['vollkorn'],koerner:['körner','saaten','mehrkorn'],mischbrot:['mischbrot'],walnuss:['walnuss'],kartoffel:['kartoffel'],sonnenblumen:['sonnenblume'],ciabatta:['ciabatta'],baguette:['baguette'],broetchen:['brötchen','semmel'],focaccia:['focaccia']};
const match=b=>{const k=KW[b.slug]||[b.name.toLowerCase()];return ck.recipes.filter(r=>k.some(w=>r.title.toLowerCase().includes(w)))};
function fillSelects(){
  const own=breads.filter(b=>!b.raw),raws=breads.filter(b=>b.raw),sc=Object.fromEntries(own.map(b=>[b.slug,match(b).length]));
  const opts=[...own].sort((a,b)=>sc[b.slug]-sc[a.slug]).map(b=>`<option value="${esc(b.slug)}">${esc(b.name)}${sc[b.slug]?' · passt zu deinen Rezepten':''}</option>`).join('');
  const optR=raws.length?`<optgroup label="Meine Chefkoch-Rezepte">${raws.map(b=>`<option value="${esc(b.slug)}">${esc(b.name)}</option>`).join('')}</optgroup>`:'';
  [['bread',opts+optR],['cBread',opts]].forEach(([id,h])=>{const e=$(id),v=e.value;e.innerHTML=h;if(v&&getBread(v)&&(id==='bread'||!getBread(v).raw))e.value=v});
  showInfo();fillSetup();calc();
}
const getBread=s=>breads.find(b=>b.slug===s);
function showInfo(){
  const b=getBread($('bread').value);if(!b){$('breadInfo').textContent='';$('ckMatch').innerHTML='';return}
  $('persons').parentElement.hidden=!!b.raw;
  if(b.raw){$('ckMatch').innerHTML='';$('breadInfo').textContent=`Chefkoch-Rezept${b.raw.yield?' · '+b.raw.yield:''} · ${b.bread_steps.length} Schritte. Die Dauer der Schritte wurde aus dem Rezepttext abgelesen und kann abweichen.`;return}
  $('breadInfo').textContent=`${b.tagline}. Teig: ${b.hydration_pct}% Wasser, ${b.starter_pct}% Starter, ${b.salt_pct}% Salz (bezogen auf das Mehl). ${fit(b)||''}`;
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
const ingHTML=L=>L.map(i=>`<div><span>${esc(i.n==='Sauerteig-Starter (aktiv)'&&pet.active?`Starter ${pet.name} (aktiv)`:i.n)}</span><b>${fmt(i.g)}</b></div>`).join('');

/* ---------- Rechner ---------- */
function calc(){
  const b=getBread($('cBread').value);if(!b){$('cResult').innerHTML='';return}
  const am=parseFloat($('cAmount').value),pe=parseFloat($('cPersons').value);let flour=0,head='';
  if(am>0){flour=am;head=`Für ${fmt(am)} Mehl:`}
  else if(pe>0){flour=pe*b.flour_per_person_g;head=`Für ${pe} ${pe==1?'Person':'Personen'}:`}
  $('cResult').innerHTML=flour?`<p class="muted" style="margin:0">${head}</p>`+ingHTML(ingredients(b,flour)):'<p class="muted">Gib Personen oder eine Menge ein.</p>';
}
['cBread','cPersons','cAmount'].forEach(id=>$(id).addEventListener('input',calc));

/* ---------- Wasser-Guide: Wasseraufnahme je Mehlsorte (Richtwerte, Wasser auf 500 g Mehl) ---------- */
const FLOURS=[
  ['Weizen 405',275,310,55,62,'w'],['Weizen 550',300,350,60,70,'w'],['Weizen 1050',325,375,65,75,'w'],['Weizenvollkorn',350,425,70,85,'v'],
  ['Dinkel 630',290,340,58,68,'d'],['Dinkel 1050',310,365,62,73,'d'],['Dinkelvollkorn',350,400,70,80,'dv'],
  ['Roggen 1150',350,425,70,85,'r'],['Roggenvollkorn',400,475,80,95,'rv']];
const FTIP={
  w:'Weizen: elastisch und gut dehnbar. Verträgt bei guter Glutenentwicklung oft auch höhere Wassermengen.',
  v:'Vollkorn braucht meist mehr Wasser, weil Schalenbestandteile und Ballaststoffe zusätzlich Wasser binden.',
  d:'Dinkel: weich und dehnbar, aber empfindlicher. Das Klebergerüst leidet bei zu viel Wasser, daher lieber schrittweise zugeben.',
  dv:'Dinkel: weich und dehnbar, aber empfindlicher. Vollkorn braucht dazu mehr Wasser. Lieber schrittweise zugeben.',
  r:'Roggen: klebrig und pastös, bindet viel Wasser. Er hat kein elastisches Klebergerüst wie Weizen.',
  rv:'Roggen: klebrig und pastös, bindet viel Wasser. Vollkorn braucht noch mehr, und der Teig bleibt weich und streichfähig.'};
// Prüft, ob die Wassermenge einer Sorte (in % vom Mehl, wie in der Tabelle) zum Wasserbedarf ihrer Mehle passt
const FIDX={'Weizenmehl 550':1,'Dinkelmehl 630':4,'Vollkornmehl (Weizen)':3,'Roggenmehl 1150':7};
function fit(b){
  const L=ingredients(b,100),fl=L.filter(x=>x.n in FIDX);
  if(!fl.length||fl.reduce((s,x)=>s+x.g,0)<99)return null;
  let lo=0,hi=0;fl.forEach(x=>{const f=FLOURS[FIDX[x.n]];lo+=x.g/100*f[3];hi+=x.g/100*f[4]});
  const p=b.hydration_pct;
  const r=[Math.round(lo),Math.round(hi)],name=fl.map(x=>x.n).join(' + ');
  const txt=p<lo-3?`Wasser-Check: ${p} % Wasser, für ${name} üblich sind ${r[0]}–${r[1]} %. Der Teig wird eher fest.`
    :p>hi+3?`Wasser-Check: ${p} % Wasser, für ${name} üblich sind ${r[0]}–${r[1]} %. Das wird ein feuchter Teig: Halte beim Mischen 20–30 g Wasser zurück und gib sie nur bei Bedarf dazu.`
    :`Wasser-Check: ${p} % Wasser passen zu ${name} (üblich ${r[0]}–${r[1]} %).`;
  return txt;
}
$('wFlour').innerHTML=FLOURS.map((f,i)=>`<option value="${i}">${f[0]}</option>`).join('');$('wFlour').value=1;
function waterGuide(){
  const f=FLOURS[+$('wFlour').value],m=parseFloat($('wAmount').value);
  if(!(m>0)){$('wResult').innerHTML='';$('wTip').textContent='Gib die Mehlmenge ein.';return}
  const k=m/500;
  $('wResult').innerHTML=`<div><span>Wasser</span><b>${Math.round(f[1]*k)} – ${Math.round(f[2]*k)} g</b></div><div><span>Hydration</span><b>${f[3]} – ${f[4]} %</b></div><div><span>Zurückhalten beim Mischen</span><b>20 – 30 g</b></div>`;
  $('wTip').textContent=FTIP[f[5]];
}
['wFlour','wAmount'].forEach(id=>$(id).addEventListener('input',waterGuide));waterGuide();

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
  LS.set('sb_quiet',quiet);quietUI();render();preview();
}));

/* ---------- Plan ---------- */
// Fütterungsverhältnisse: [Teile Mehl/Wasser je Teil Anstellgut, Peak von Std, Peak bis Std, Hinweis]
const RATIOS=[[1,3,6,'Schnelle Reifung. Sinnvoll, wenn du zeitnah backen möchtest oder die Aktivität deines Starters beobachten willst.'],
  [2,4,7,'Alltagsfütterung. Praktisch für regelmäßige Fütterungen und zum Auffrischen eines aktiven Starters.'],
  [3,5,8,'Ausgewogen: etwas längere Reifezeit bei kräftiger Aktivität.'],[4,6,9,'Längere Reifezeit mit viel frischem Futter.'],
  [5,7,10,'Längere Reifezeit. Sinnvoll, wenn du morgens fütterst und erst später backen möchtest.'],[6,8,11,'Lange Reifezeit, wenig Anstellgut im Verhältnis zum Futter.'],
  [10,8,14,'Sehr lange Reifezeit. Kann als Vorbereitung auf eine Kühlschrankpause sinnvoll sein.']];
const rLbl=r=>`1:${r[0]}:${r[0]}`;
const withOver=(b,o)=>o?{...b,bread_steps:b.bread_steps.map((s,i)=>o[i]!=null?{...s,minutes:o[i]}:s)}:b;
const pb=()=>{const b=plan&&getBread(plan.slug);return b&&withOver(b,plan.over)};
const isBake=s=>s.bake||/^Backen/.test(s.title);
const bakeIdx=S=>S.findIndex(isBake);
const lastBake=S=>S.reduce((k,s,i)=>isBake(s)?i:k,-1);
// Zeitpunkt, zu dem das Ziel erreicht ist, wenn man bei Schritt from um start beginnt
function milestone(b,goal,from,start){
  const S=b.bread_steps,bi=bakeIdx(S);let t=adj(start);
  const stop=goal==='oven'&&bi>0?bi-1:goal==='out'&&bi>=0?lastBake(S):S.length-1;
  for(let i=from;i<=stop;i++)t=stepEnd(S[i],t);
  return t;
}
// Spätester Start, damit das Ziel zur Zielzeit erreicht ist (Ruhezeit eingerechnet)
function startFor(b,goal,from,target){
  const S=b.bread_steps,bi=bakeIdx(S),stop=goal==='oven'&&bi>0?bi-1:goal==='out'&&bi>=0?lastBake(S):S.length-1;
  // milestone() wächst mit dem Start; also den spätesten Start per Halbierung suchen (auf die Minute genau)
  let lo=target-S.slice(from,stop+1).reduce((a,x)=>a+x.minutes,0)*6e4-14*864e5,hi=target;
  for(let k=0;k<45&&hi-lo>6e4;k++){const mid=Math.floor((lo+hi)/2);if(milestone(b,goal,from,mid)<=target)lo=mid;else hi=mid}
  return adj(lo);
}
const GOALS={oven:'Backbeginn im Ofen',out:'Brot kommt aus dem Ofen',eat:'Essfertig'};
let mode='start';
const setupBread=()=>{const b=getBread($('bread').value);if(!b)return null;
  const from=+$('fromStep').value||0,ri=$('ratio').value,o=ri!==''&&from===0&&/Starter füttern/.test(b.bread_steps[0].title)?{0:Math.round((RATIOS[ri][1]+RATIOS[ri][2])/2*60)}:null;
  return {b:withOver(b,o),over:o,from}};
function preview(){
  const s=setupBread(),p=$('planPrev');if(!s){p.textContent='';return}
  const raw=new Date($('start').value).getTime();if(!raw){p.textContent='';return}
  if(mode==='end'){
    const st=startFor(s.b,$('goal').value,s.from,raw);
    p.textContent=st<Date.now()-6e4?`Bis dahin reicht die Zeit nicht mehr. Frühestens möglich: ${GOALS[$('goal').value]} um ${hhmm(milestone(s.b,$('goal').value,s.from,Date.now()))}.`
      :`Dafür musst du ${hhmm(st)} starten.`;
  }else p.textContent=`Voraussichtlich Backbeginn im Ofen ${hhmm(milestone(s.b,'oven',s.from,raw))} · essfertig ${hhmm(milestone(s.b,'eat',s.from,raw))}.`;
}
function fillSetup(){
  const b=getBread($('bread').value);if(!b)return;
  const fs=$('fromStep'),old=fs.value;
  fs.innerHTML=b.bread_steps.map((s,i)=>`<option value="${i}">${i+1}. ${esc(s.title)}</option>`).join('');if(old&&+old<b.bread_steps.length)fs.value=old;
  const ro=$('ratio'),rv=ro.value;
  ro.innerHTML=`<option value="">Wie im Rezept (${dur(b.bread_steps[0].minutes)})</option>`+RATIOS.map((r,i)=>`<option value="${i}">${rLbl(r)} · Peak nach ${r[1]}–${r[2]} Std</option>`).join('');ro.value=rv;
  ro.parentElement.hidden=!/Starter füttern/.test(b.bread_steps[0].title)||+fs.value!==0;
  preview();
}
const localIso=t=>new Date(t-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,16);
function setMode(m){
  mode=m;$('mStart').classList.toggle('on',m==='start');$('mEnd').classList.toggle('on',m==='end');
  $('goalL').hidden=m!=='end';$('startLbl').textContent=m==='end'?'Bis wann soll es fertig sein?':'Wann startest du?';
  const d=new Date();if(m==='end'){d.setHours(18,0,0,0);if(d<=Date.now())d.setDate(d.getDate()+1);$('start').value=localIso(d)}else $('start').value=localIso(Date.now());
  preview();
}
$('mStart').onclick=()=>setMode('start');$('mEnd').onclick=()=>setMode('end');
['bread','fromStep','ratio','goal','start'].forEach(id=>$(id).addEventListener('change',()=>{if(id==='bread'||id==='fromStep')fillSetup();else preview()}));
$('start').addEventListener('input',preview);
$('makePlan').onclick=()=>{
  const s=setupBread();if(!s)return;const b=getBread($('bread').value);
  const n=Math.round(+$('persons').value);if(!(n>=1))return toast('Bitte die Personenzahl eingeben.');
  const rawIn=new Date($('start').value).getTime()||Date.now(),goal=$('goal').value;let raw=rawIn,note='';
  if(mode==='end'){raw=startFor(s.b,goal,s.from,rawIn);if(raw<Date.now()){raw=Date.now();note=`Bis dahin reicht die Zeit nicht ganz: ${GOALS[goal]} erst um ${hhmm(milestone(s.b,goal,s.from,raw))}. `}}
  const st=adj(raw);
  plan={slug:b.slug,persons:Math.min(n,50),starts:[...Array(s.from).fill(st),st],idx:s.from,fired:[],over:s.over,goal:mode==='end'?{type:goal,t:rawIn}:null};
  LS.set('sb_plan',plan);render();
  if(note)toast(note);
  // Berechtigungen müssen per Tipp angefragt werden: jetzt Ton freischalten und ggf. Benachrichtigungen erfragen
  try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();actx.resume()}catch{}
  if('Notification' in window&&Notification.permission==='default')Notification.requestPermission().then(()=>{notifState();syncPush(true)});
  keepAwake();
  if(st!==raw)toast(`Start auf ${hhmm(st)} verschoben (Ruhezeit).`);
};
$('newBake').onclick=async()=>{
  if(!confirm('Plan wirklich stoppen? Der Ablauf und alle Erinnerungen werden gelöscht.'))return;
  const wasCk=plan&&plan.slug.startsWith('ck-');plan=null;LS.del('sb_plan');pushLast='';
  if(wasCk){ck.active=null;saveCk()}
  render();toast('Plan gestoppt und gelöscht.');
  try{const r=await navigator.serviceWorker?.ready;(await r?.getNotifications())?.forEach(n=>n.close())}catch{} // Meldungen wegräumen, ohne den Stopp zu blockieren
};
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
  const b=pb();
  $('setup').hidden=!!b;$('plan').hidden=!b;
  keepAwake();notifState();syncPush();drawRec();
  if(!b)return;
  const flour=plan.persons*b.flour_per_person_g;
  setImg($('planImg'),b.raw&&b.raw.image,b.name);$('planTitle').textContent=b.raw?b.name:`${b.name} · ${plan.persons} ${plan.persons==1?'Person':'Personen'}`;
  $('planIngr').innerHTML=b.raw?b.raw.ingredients.map(l=>`<div><span>${esc(l)}</span></div>`).join(''):ingHTML(ingredients(b,flour));
  $('planFit').textContent=fit(b)||'';
  {const g=plan.goal,ty=g?g.type:'eat',eta=milestone(b,ty,plan.idx,plan.starts[plan.idx]),late=g&&eta>g.t+5*6e4;
    $('planEta').textContent=(g?`Ziel: ${GOALS[ty]} um ${hhmm(g.t)}. `:'')+`Voraussichtlich: ${GOALS[ty]} ${hhmm(eta)}.`+(late?` Das ist ca. ${dur(Math.round((eta-g.t)/6e4))} später als geplant.`:'')+(g&&eta<g.t-30*6e4?` Das ist ca. ${dur(Math.round((g.t-eta)/6e4))} früher: Die Stückgare kannst du im Kühlschrank verlängern.`:'')}
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
  const b=pb(),S=b.bread_steps;
  if(pet.active&&/Starter füttern/.test(S[plan.idx].title))feedPet(true); // Schritt erledigt = Starter gefüttert
  if(plan.idx>=S.length-1){const wasCk=plan.slug.startsWith('ck-');plan=null;LS.del('sb_plan');if(wasCk){ck.active=null;saveCk()}if(pet.active){pet.bakes++;addXp(50);drawPet()}render();toast(pet.active?`Fertig! Lass es gut auskühlen. ${pet.name} bekommt +50 XP.`:'Fertig! Lass es gut auskühlen.');return}
  plan.idx++;plan.starts[plan.idx]=Date.now();LS.set('sb_plan',plan);render();
}

/* ---------- Timer & Erinnerungen ---------- */
function eventsFor(b,i,st){ // Erinnerungen eines Schritts, der um st beginnt
  const s=b.bread_steps[i],nx=b.bread_steps[i+1],E=[];
  if(/Falten/.test(s.title))for(let n=1;n<=3;n++){const t=st+n*30*6e4;if(adj(t)===t)E.push({k:`${i}:f${n}`,t,title:'Dehnen und Falten',body:`Runde ${n+1} von 4: Teig einmal dehnen und falten.`})}
  E.push({k:`${i}:end`,t:stepEnd(s,st),title:`${s.title}: fertig`,body:nx?`Weiter mit: ${nx.title}`:'Dein Brot ist durch. Gut auskühlen lassen!'});
  return E;
}
function events(){const b=pb();return b?eventsFor(b,plan.idx,plan.starts[plan.idx]):[]}

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
    const b=pb();
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
  const b=pb(),s=b.bread_steps[plan.idx],end=stepEnd(s,plan.starts[plan.idx]),left=end-Date.now(),c=$('count');
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
  const b=pb();if(!b)return;const {T}=schedule(b),z=t=>new Date(t).toISOString().replace(/[-:]|\.\d+/g,'');
  const esc2=t=>t.replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,');
  let o='BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Sauerteig Helfer//DE\r\n';
  b.bread_steps.forEach((s,i)=>{if(i<plan.idx)return;o+=`BEGIN:VEVENT\r\nUID:${plan.starts[0]}-${i}@sauerteig\r\nDTSTAMP:${z(Date.now())}\r\nDTSTART:${z(T[i])}\r\nDTEND:${z(T[i]+Math.max(s.minutes,5)*6e4)}\r\nSUMMARY:${esc2(s.title)}\r\nDESCRIPTION:${esc2(s.description)}\r\nBEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:${esc2(s.title)}\r\nTRIGGER:PT0M\r\nEND:VALARM\r\nEND:VEVENT\r\n`});
  o+='END:VCALENDAR\r\n';
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([o],{type:'text/calendar'}));a.download='sauerteig.ics';a.click();
};

/* ---------- Chefkoch ---------- */
const CKAPI=SB_URL+'/functions/v1/chefkoch-api';
let ckFilter='all';
const saveCk=()=>LS.set('sb_ck',ck);
const goTab=n=>{const b=NAV.find(x=>x.dataset.tab===n);b&&b.click()};
// Erkennt einen chefkoch.de-Link (auch aus Teilen-Text) und leitet den Titel aus dem Text oder der URL ab
function parseCk(txt){
  const m=txt.match(/https?:\/\/[^\s]+/);if(!m)return null;
  let u;try{u=new URL(m[0])}catch{return null}
  if(!/(^|\.)chefkoch\.de$/.test(u.hostname))return null;
  let title=txt.replace(m[0],'').split('\n').map(x=>x.trim()).find(Boolean)||'';
  title=title.replace(/^[^:]*:\s*/,'').replace(/^[„"“]+|[“”"]+$/g,'').slice(0,80); // alles vor dem ersten Doppelpunkt samt Doppelpunkt entfernen
  if(!title){try{title=decodeURIComponent((u.pathname.split('/').filter(Boolean).pop()||'').replace(/\.html$/,'')).replace(/-/g,' ').trim()}catch{}}
  if(!title||/^\d+$/.test(title))title='Chefkoch-Rezept';
  return {url:`https://${u.hostname}${u.pathname}`,title};
}
// Nimmt einen oder mehrere Links (oder Teilen-Text) auf und gibt die Zahl der neuen Rezepte zurück
function addRecipes(txt){
  const urls=[...txt.matchAll(/https?:\/\/[^\s]+/g)].map(m=>m[0]);let n=0,bad=0;
  (urls.length===1?[txt]:urls).forEach(t=>{
    const r=parseCk(t);if(!r){bad++;return}
    if(ck.recipes.some(x=>x.url===r.url)||ck.recipes.length>=50)return;
    ck.recipes.unshift({...r,f:ckFilter!=='all'&&ckFilter!=='none'?ckFilter:null});n++;
  });
  if(n){saveCk();drawCk();fillSelects()}
  return {n,bad};
}
function drawCk(){
  const p=ck.profile;
  $('ckProfState').innerHTML=p?`${ICON('check')} Verknüpft mit <b>${esc(p.name)}</b>${p.url?` · <a href="${esc(p.url)}" target="_blank" rel="noopener">Profil öffnen</a>`:''}`:'Noch kein Profil verknüpft.';
  if(ckFilter!=='all'&&ckFilter!=='none'&&!ck.folders.some(f=>f.id===ckFilter))ckFilter='all';
  const cnt=id=>ck.recipes.filter(r=>id==='all'?true:id==='none'?!r.f:r.f===id).length;
  $('ckFolders').innerHTML=[['all','Alle'],...ck.folders.map(f=>[f.id,f.name]),...(ck.folders.length?[['none','Ohne Ordner']]:[])]
    .map(([id,n])=>`<button class="${ckFilter===id?'on':''}" data-f="${esc(id)}">${ICON('folder')} ${esc(n)} (${cnt(id)})</button>`).join('')+`<button data-f="+">${ICON('plus')} Ordner</button>`;
  $('ckFolders').querySelectorAll('button').forEach(b=>b.onclick=()=>{
    if(b.dataset.f==='+'){const n=(prompt('Name des neuen Ordners')||'').trim().slice(0,24);if(!n)return;const id='f'+Date.now().toString(36);ck.folders.push({id,name:n});ckFilter=id;saveCk()}
    else ckFilter=b.dataset.f;
    drawCk();
  });
  const real=ckFilter!=='all'&&ckFilter!=='none';$('ckFolderTools').hidden=!real;
  const opts=sel=>`<option value="">Ohne Ordner</option>`+ck.folders.map(f=>`<option value="${esc(f.id)}"${sel===f.id?' selected':''}>${esc(f.name)}</option>`).join('');
  const rows=ck.recipes.map((r,i)=>[r,i]).filter(([r])=>ckFilter==='all'||(ckFilter==='none'?!r.f:r.f===ckFilter));
  $('ckList').innerHTML=rows.length?rows.map(([r,i])=>`<div class="rec"><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a><div class="ra"><select data-mv="${i}" aria-label="Ordner">${opts(r.f)}</select><button class="go" data-go="${i}">${ICON('play')} STARTEN</button><button data-del="${i}" aria-label="Entfernen">${ICON('trash')}</button></div></div>`).join('')
    :`<p class="muted" style="margin:6px 0 0">${ck.recipes.length?'In diesem Ordner ist noch nichts.':'Noch keine Rezepte. Teile eines aus Chefkoch mit dieser App oder füge einen Link ein.'}</p>`;
  $('ckList').querySelectorAll('[data-mv]').forEach(s=>s.onchange=()=>{ck.recipes[+s.dataset.mv].f=s.value||null;saveCk();drawCk()});
  $('ckList').querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{ck.recipes.splice(+b.dataset.del,1);saveCk();syncCkBreads();drawCk();fillSelects();drawRec()});
  $('ckList').querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>startRecipe(+b.dataset.go,b));
}
$('ckRen').onclick=()=>{const f=ck.folders.find(x=>x.id===ckFilter);if(!f)return;const n=(prompt('Neuer Name',f.name)||'').trim().slice(0,24);if(n){f.name=n;saveCk();drawCk()}};
$('ckDelF').onclick=()=>{const f=ck.folders.find(x=>x.id===ckFilter);if(!f||!confirm(`Ordner „${f.name}“ löschen? Die Rezepte bleiben erhalten.`))return;
  ck.recipes.forEach(r=>{if(r.f===f.id)r.f=null});ck.folders=ck.folders.filter(x=>x!==f);ckFilter='all';saveCk();drawCk()};
$('ckProfSave').onclick=()=>{
  const v=$('ckProf').value.trim();if(!v)return;
  if(/^https?:/i.test(v)){
    const r=parseCk(v);if(!r)return toast('Das ist kein chefkoch.de-Link.');
    ck.profile={name:r.title==='Chefkoch-Rezept'?'Chefkoch-Profil':r.title,url:r.url};
  }else ck.profile={name:v.slice(0,40),url:''};
  saveCk();$('ckProf').value='';drawCk();toast('Chefkoch-Profil gemerkt.');
};
$('ckProfDel').onclick=()=>{ck.profile=null;saveCk();drawCk()};
function addFromInput(){
  const v=$('ckUrl').value.trim();if(!v)return;
  const {n,bad}=addRecipes(v);$('ckUrl').value='';
  toast(n?`${n} ${n==1?'Rezept':'Rezepte'} hinzugefügt.`:bad?'Bitte Links von chefkoch.de einfügen.':'Schon in der Liste.');
}
$('ckAdd').onclick=addFromInput;$('ckUrl').addEventListener('keydown',e=>e.key==='Enter'&&addFromInput());
$('ckPaste').onclick=async()=>{
  try{const t=await navigator.clipboard.readText();if(!t)return toast('Die Zwischenablage ist leer.');$('ckUrl').value=t;addFromInput()}
  catch{toast('Zugriff auf die Zwischenablage nicht erlaubt. Füge den Link bitte ins Feld ein.')}
};
{ // Hinweis passend zum Gerät: Teilen-Menü gibt es nur bei installierten Android-Apps
  const ios=/iPhone|iPad|iPod/.test(navigator.userAgent),app=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
  $('ckHint').innerHTML=ios?'Auf dem iPhone können Web-Apps nicht im Teilen-Menü erscheinen. Kopiere in Chefkoch den Link (Teilen, Link kopieren) und tippe hier auf den Einfügen-Knopf neben dem Feld. Mehrere Links gehen auch.'
    :app?'Tippe in Chefkoch beim Rezept auf <b>Teilen</b> und wähle diese App. Erscheint sie nicht, deinstalliere die App einmal und installiere sie neu (Menü, „App installieren“). Alternativ: Link kopieren und den Einfügen-Knopf nutzen.'
    :'Das Teilen-Menü zeigt diese App nur, wenn sie richtig installiert ist (Chrome-Menü, „App installieren“, nicht nur „Zum Startbildschirm“). Sonst: Link kopieren und den Einfügen-Knopf nutzen.';
}
// Vom Teilen-Menü (Android, installierte App): Link kommt per Adresse an
(function handleShare(){
  const p=new URLSearchParams(location.search);if(!['url','text','title'].some(k=>p.get(k)))return;
  const txt=[p.get('title'),p.get('text'),p.get('url')].filter(Boolean).join('\n');
  try{history.replaceState(null,'',location.pathname)}catch{}
  setTimeout(()=>{const {n,bad}=addRecipes(txt);goTab('ck');toast(n?'Rezept aus Chefkoch übernommen.':bad?'Das war kein chefkoch.de-Link.':'Das Rezept ist schon in der Liste.')},0);
})();

/* ---------- Rezept starten: Chefkoch-Rezept als Plan ---------- */
function stepMinutes(t){
  let m=/über nacht/i.test(t)?600:0;
  for(const x of t.matchAll(/(\d+(?:[.,]\d+)?)(?:\s*(?:-|–|bis)\s*(\d+(?:[.,]\d+)?))?\s*(Stunden?|Std\.?|h\b|Minuten?|Min\.?)/gi)){
    const n=parseFloat((x[2]||x[1]).replace(',','.'));m=Math.max(m,Math.round(n*(/^(S|h)/i.test(x[3])?60:1)));
  }
  return Math.min(m||10,1440);
}
function shortTitle(t){
  let s=t.replace(/\b(ca|bzw|ggf|evtl|Min|Std|z\.\s?B)\./gi,'$1').split(/[.:;!?]/)[0].trim();if(s.length>48){s=s.slice(0,48);s=s.slice(0,s.lastIndexOf(' ')>20?s.lastIndexOf(' '):48)+' …'}
  return s||'Schritt';
}
function recipeToBread(r){
  const d=r.data,id=(r.url.match(/rezepte\/(\d+)/)||[])[1]||String(Math.abs([...r.url].reduce((a,c)=>(a*31+c.charCodeAt(0))|0,7)));
  const steps=d.steps&&d.steps.length?d.steps:['Rezept wie beschrieben zubereiten.'];
  const sg=(d.ingredients||[]).map(l=>/anstellgut|sauerteig|starter|ansatz/i.test(l)?l.match(/(\d+(?:[.,]\d+)?)\s*(kg|g)\b/i):null).find(Boolean);
  return {id:'ck-'+id,slug:'ck-'+id,name:d.name||r.title,tagline:'Chefkoch-Rezept',emoji:'',flour_per_person_g:0,hydration_pct:0,starter_pct:0,salt_pct:0,extras:[],sort_order:900,
    bread_steps:steps.map((t,i)=>({id:`ck-${id}-${i}`,position:i+1,title:shortTitle(t),description:t,minutes:stepMinutes(t),bake:/backofen|\bofen\b|backen/i.test(t)})),
    raw:{ingredients:d.ingredients||[],yield:d.yield||'',image:d.image||'',url:r.url,starterG:sg?Math.round(parseFloat(sg[1].replace(',','.'))*(sg[2].toLowerCase()==='kg'?1000:1)):0}};
}
function syncCkBreads(){breads=breads.filter(b=>!b.raw);ck.recipes.forEach(r=>{if(r.data)breads.push(recipeToBread(r))})}
async function startRecipe(i,btn){
  const r=ck.recipes[i];if(!r)return;
  if(!r.data||r.data.image===undefined){
    if(btn){btn.disabled=true}toast('Rezept wird geladen …');
    try{
      const j=await fetch(CKAPI,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'recipe',url:r.url})}).then(x=>x.json());
      if(j.error)throw new Error(j.error);r.data=j;if(j.name)r.title=j.name;saveCk();
    }catch(e){if(btn)btn.disabled=false;return toast('Rezept konnte nicht geladen werden: '+(e.message||e))}
  }
  syncCkBreads();const b=breads.find(x=>x.raw&&x.raw.url===r.url);
  ck.active=b.slug;saveCk();fillSelects();$('bread').value=b.slug;showInfo();fillSetup();drawCk();drawRec();
  goTab('pet');toast(`„${b.name}“ ist ausgewählt. Hier siehst du, was dein Starter dafür braucht.`);
}
function setImg(el,src,alt){el.hidden=!src;if(src){if(el.getAttribute('src')!==src)el.src=src;el.alt=alt||''}else el.removeAttribute('src')}
const activeRec=()=>{const s=(plan&&plan.slug.startsWith('ck-')&&plan.slug)||ck.active;return s&&breads.find(b=>b.slug===s&&b.raw)||null};
function drawRec(){
  const b=activeRec();$('recCard').hidden=!b;if(!b)return;
  const n=b.raw.starterG,r=RATIOS[+$('gRatio').value]||RATIOS[1];
  $('recName').textContent=b.name;setImg($('recImg'),b.raw.image,b.name);
  $('recInfo').textContent=`${b.raw.yield?b.raw.yield+' · ':''}${b.bread_steps.length} Schritte · ${b.raw.ingredients.length} Zutaten`;
  if(n){const a=Math.max(1,Math.ceil(n/(1+2*r[0])));
    $('recStarter').innerHTML=`Dieses Rezept braucht ca. <b>${n} g Starter</b>. Füttere dafür z. B. <b>${a} g Anstellgut</b> mit ${fmt(a*r[0])} Wasser und ${fmt(a*r[0])} Mehl (${rLbl(r)}). Das ergibt ${fmt(a*(1+2*r[0]))}, bereit nach ${r[1]}–${r[2]} Std.`;
    if(document.activeElement!==$('gAsg')){$('gAsg').value=a;feedGuide()}
  }else $('recStarter').textContent='Im Rezept steht keine Starter-Menge. Der Plan läuft trotzdem mit den Schritten des Rezepts.';
  $('recPlan').hidden=!!plan;
}
$('recPlan').onclick=()=>{const b=activeRec();if(!b)return;fillSelects();$('bread').value=b.slug;showInfo();fillSetup();goTab('bake')};
$('recClear').onclick=()=>{if(plan&&plan.slug.startsWith('ck-')&&!confirm('Der laufende Plan zu diesem Rezept bleibt bestehen. Nur die Anzeige hier lösen?'))return;ck.active=null;saveCk();drawRec()};
$('gRatio').addEventListener('input',drawRec);
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
  const b=pb(),rec=ck.recipes.slice(0,5).map(r=>r.title).join('; ');
  const sys='Du bist ein freundlicher, erfahrener Sauerteig-Bäcker. Antworte auf Deutsch, kurz und praktisch.'
    +(b?` Die Person backt gerade: ${b.name} für ${plan.persons} Personen, aktueller Schritt: ${b.bread_steps[plan.idx].title}.`:'')
    +(pet.active?` Ihr Starter heißt ${pet.name}.`:'')
    +(activeRec()?` Aktuelles Chefkoch-Rezept: ${activeRec().name}.`:'')
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

/* ---------- Starter-Maskottchen ---------- */
const PCOL=[['Creme','#f1dcae'],['Gold','#e5b96a'],['Roggen','#b88a5a'],['Rosa','#f3b3c0'],['Mint','#b6e0c8'],['Lila','#cdb6ea']];
const PEYE=['Rund','Fröhlich','Müde','Cool'];
const PACC=[['Keins',0],['Kochmütze',1],['Blume',2],['Schleife',3],['Krone',5]]; // [Name, ab Level]
const PTITLE=['Frischling','Blubberer','Gärmeister','Sauerteig-Profi','Legende'];
const petStored=LS.get('sb_pet',null);
let pet={name:'Blubb',col:0,eye:0,acc:0,xp:0,bakes:0,fed:null,born:Date.now(),active:true,...petStored};
if(!petStored)pet.active=false; // noch kein Starter angelegt
const savePet=()=>LS.set('sb_pet',pet);
if(petStored&&!petStored.born)savePet();
const petDays=()=>Math.max(0,Math.floor((Date.now()-pet.born)/864e5));
const petLvl=()=>Math.floor(Math.sqrt(pet.xp/25))+1;
const petMood=()=>!pet.fed?0:Date.now()-pet.fed<12*36e5?2:Date.now()-pet.fed<24*36e5?1:0; // 2 satt, 1 hungrig, 0 sehr hungrig
function addXp(n){const l=petLvl();pet.xp+=n;savePet();if(petLvl()>l)toast(`${pet.name} ist jetzt Level ${petLvl()}!`)}
function feedPet(auto){
  const fresh=!pet.fed||Date.now()-pet.fed>8*36e5;pet.fed=Date.now();
  if(fresh)addXp(5);else savePet();
  drawPet();if(!auto)toast(fresh?`${pet.name} sagt danke! +5 XP`:`${pet.name} ist schon satt.`);
}
function petSVG(){
  const ink='#3b2a1a',m=petMood(),T=[80,70,58][m],col=PCOL[pet.col][1];
  const eyes=[`<circle cx="45" cy="98" r="4" fill="${ink}"/><circle cx="75" cy="98" r="4" fill="${ink}"/>`,
    `<path d="M40 100q5-8 10 0M70 100q5-8 10 0" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>`,
    `<path d="M40 98h10M70 98h10" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>`,
    `<rect x="37" y="92" width="20" height="11" rx="4" fill="${ink}"/><rect x="63" y="92" width="20" height="11" rx="4" fill="${ink}"/><path d="M57 96h6" stroke="${ink}" stroke-width="2"/>`][pet.eye];
  const mouth=[`<path d="M52 114q8-7 16 0" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>`,
    `<path d="M52 111h16" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>`,
    `<path d="M52 107q8 9 16 0" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>`][m];
  const bub=[[38,T+14,3],[82,T+22,2.5],[70,T+9,2],...(m==2?[[50,T+30,2],[84,T+36,3]]:[])].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity=".55"/>`).join('');
  const acc=['',
    `<path d="M40 30v-7a9 9 0 0 1 5-15 11 11 0 0 1 30 0 9 9 0 0 1 5 15v7z" fill="#fff" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/>`,
    [0,72,144,216,288].map(a=>`<circle cx="${(60+7*Math.cos(a*Math.PI/180)).toFixed(1)}" cy="${(20+7*Math.sin(a*Math.PI/180)).toFixed(1)}" r="5" fill="#f08aa5" stroke="${ink}" stroke-width="1.5"/>`).join('')+`<circle cx="60" cy="20" r="4" fill="#f2c230" stroke="${ink}" stroke-width="1.5"/>`,
    `<path d="M60 36L42 27v18zM60 36l18-9v18z" fill="#e0556b" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/><circle cx="60" cy="36" r="4.5" fill="#c23a50" stroke="${ink}" stroke-width="1.5"/>`,
    `<path d="M38 30l-3-19 13 10 12-15 12 15 13-10-3 19z" fill="#f2c230" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/>`][pet.acc];
  return `<svg viewBox="0 0 120 140" role="img" aria-label="${esc(pet.name)}"><ellipse cx="60" cy="130" rx="38" ry="6" fill="#3b2a1a" opacity=".12"/>
    <rect x="25" y="40" width="70" height="85" rx="14" fill="#fffaf0" stroke="${ink}" stroke-width="2.5"/>
    <path d="M27 ${T}Q60 ${T-8} 93 ${T}V111a12 12 0 0 1-12 12H39a12 12 0 0 1-12-12z" fill="${col}"/>${bub}
    <path d="M33 52v38" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>${eyes}${mouth}
    <rect x="30" y="30" width="60" height="12" rx="4" fill="#b5772f" stroke="${ink}" stroke-width="2.5"/>${acc}</svg>`;
}
function drawPet(){
  $('petNew').hidden=pet.active;$('petMain').hidden=!pet.active;
  if(!pet.active)return;
  const l=petLvl(),lo=(l-1)**2*25,hi=l**2*25,m=petMood(),ago=pet.fed?Date.now()-pet.fed:0,h=Math.floor(ago/36e5);
  $('petArt').innerHTML=petSVG();$('petName').textContent=pet.name;
  $('petLvl').textContent=`Level ${l} · ${PTITLE[Math.min(l-1,PTITLE.length-1)]} · ${petDays()} ${petDays()==1?'Tag':'Tage'} alt · ${pet.bakes} ${pet.bakes==1?'Brot':'Brote'} gebacken`;
  if(document.activeElement!==$('pAge'))$('pAge').value=petDays();
  if(document.activeElement!==$('pFedH'))$('pFedH').value=pet.fed?Math.floor(ago/36e5):'';
  $('petXp').style.width=Math.round((pet.xp-lo)/(hi-lo)*100)+'%';
  $('petMood').textContent=!pet.fed?`${pet.name} wurde noch nie gefüttert und hat Hunger.`:m==2?`${pet.name} ist satt und zufrieden (zuletzt gefüttert vor ${h} Std).`:m==1?`${pet.name} wird hungrig. Zuletzt gefüttert vor ${h} Std.`:`${pet.name} hat großen Hunger! Zuletzt gefüttert vor ${Math.floor(h/24)} Tg ${h%24} Std.`;
  const chip=(id,arr,key,fn)=>{$(id).innerHTML=arr.map((a,i)=>fn(a,i)).join('');$(id).querySelectorAll('button:not([disabled])').forEach(b=>b.onclick=()=>{pet[key]=+b.dataset.i;savePet();drawPet()})};
  chip('pCol',PCOL,'col',(c,i)=>`<button class="sw${pet.col==i?' on':''}" data-i="${i}" style="background:${c[1]}" aria-label="${c[0]}"></button>`);
  chip('pEye',PEYE,'eye',(e,i)=>`<button class="${pet.eye==i?'on':''}" data-i="${i}">${e}</button>`);
  chip('pAcc',PACC,'acc',(a,i)=>`<button class="${pet.acc==i?'on':''}" data-i="${i}"${a[1]>l?' disabled':''}>${a[0]}${a[1]>l?` (ab Lv ${a[1]})`:''}</button>`);
}
$('nGo').onclick=()=>{
  const fh=$('nFed').value;
  pet={name:$('nName').value.trim().slice(0,16)||'Blubb',col:0,eye:0,acc:0,xp:0,bakes:0,born:Date.now()-Math.max(0,+$('nAge').value||0)*864e5,fed:fh===''?null:Date.now()-Math.max(0,+fh)*36e5,active:true};
  savePet();$('petIn').value=pet.name;drawPet();render();toast(`${pet.name} ist jetzt dabei.`);
};
$('pAge').addEventListener('change',()=>{pet.born=Date.now()-Math.max(0,+$('pAge').value||0)*864e5;savePet();drawPet()});
$('pFedH').addEventListener('change',()=>{const v=$('pFedH').value;pet.fed=v===''?null:Date.now()-Math.max(0,+v)*36e5;savePet();drawPet()});
$('petDel').onclick=()=>{if(!confirm(`${pet.name} wirklich löschen? Level und Aussehen gehen verloren.`))return;
  pet={name:'Blubb',col:0,eye:0,acc:0,xp:0,bakes:0,fed:null,born:Date.now(),active:false};savePet();$('nName').value='';drawPet();render()};

/* ---------- Füttern-Guide ---------- */
$('gRatio').innerHTML=RATIOS.map((r,i)=>`<option value="${i}">${rLbl(r)}</option>`).join('');$('gRatio').value=1;
function feedGuide(){
  const r=RATIOS[+$('gRatio').value],a=parseFloat($('gAsg').value);
  if(!(a>0)){$('gRes').innerHTML='';$('gTip').textContent='Gib die Menge Anstellgut ein.';return}
  const x=a*r[0],row=(n,v)=>`<div><span>${n}</span><b>${fmt(v)}</b></div>`;
  $('gRes').innerHTML=row('Anstellgut (Starter)',a)+row('Wasser',x)+row('Mehl',x)+row('Gesamt',a+2*x)+`<div><span>Peak nach</span><b>${r[1]} – ${r[2]} Std</b></div>`;
  $('gTip').textContent=r[3];
}
['gRatio','gAsg'].forEach(id=>$(id).addEventListener('input',feedGuide));feedGuide();

$('petIn').value=pet.name;
$('petIn').addEventListener('input',()=>{pet.name=$('petIn').value.trim().slice(0,16)||'Starter';savePet();$('petName').textContent=pet.name});
$('petIn').addEventListener('change',drawPet);
$('petFeed').onclick=()=>feedPet(false);
setInterval(()=>{if(!document.hidden&&$('tab-pet').classList.contains('active')&&document.activeElement!==$('petIn'))drawPet()},60000);

/* ---------- Start ---------- */
quietUI();keyState();drawChat();drawCk();drawPet();drawRec();loadBreads();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});

