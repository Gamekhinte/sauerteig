'use strict';
const SB_URL='https://rsirxtxeiolsaultreuz.supabase.co';
const SB_KEY='sb_publishable_VYVOJ--pfOlhIES2swipGg_E33b0185';
const GEMINI='https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent'; // aktuelles Standard-Flash-Modell mit kostenlosem Kontingent
const CONTACT=''; // Kontakt für die Datenschutzerklärung, z. B. 'name@example.com' (leer = Zeile wird nicht angezeigt)
const $=id=>document.getElementById(id);
const LS={get:(k,d)=>{try{const v=localStorage.getItem(k);return v===null?d:JSON.parse(v)}catch{return d}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}},del:k=>{try{localStorage.removeItem(k)}catch{}}};
const ICON=n=>`<svg class="ic"><use href="#i-${n}"/></svg>`;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let breads=[],plan=LS.get('sb_plan',null),chat=LS.get('sb_chat',[]),pend=null;
let quiet=LS.get('sb_quiet',{on:false,from:'18:00',to:'06:00'});
let ck={recipes:[],folders:[],...LS.get('sb_ck',{})};
ck.recipes.forEach(r=>{delete r.data;r.notes=r.notes||{ing:'',steps:''}}); // frühere, von Fremdseiten geladene Rezepttexte werden nicht mehr gespeichert
applyLang(); // statische Texte in der gewählten Sprache

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
const goTab=n=>{const b=NAV.find(x=>x.dataset.tab===n);b&&b.click()};

/* ---------- Daten aus Supabase ---------- */
async function loadBreads(){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/breads?select=*,bread_steps(*)&order=sort_order`,{headers:{apikey:SB_KEY}});
    if(!r.ok)throw new Error(r.status);
    breads=await r.json();
    breads.forEach(b=>b.bread_steps.sort((a,c)=>a.position-c.position));
    LS.set('sb_breads',breads);
  }catch(e){breads=LS.get('sb_breads',[]);if(!breads.length)toast(tr('Brotsorten konnten nicht geladen werden. Bitte Internet prüfen.'))}
  EXTRA_BREADS.forEach(x=>{if(!breads.some(b=>b.slug===x.slug))breads.push(x)});
  syncCkBreads();
  $('start').value=localIso(Date.now());
  fillSelects();render();
}
// Rezepte, die zu einer Brotsorte passen (Stichwörter im Rezepttitel)
const KW={weizen:['weizen','weißbrot','baguette'],dinkel:['dinkel'],roggen:['roggen','bauernbrot'],vollkorn:['vollkorn'],koerner:['körner','saaten','mehrkorn'],mischbrot:['mischbrot'],walnuss:['walnuss'],kartoffel:['kartoffel'],sonnenblumen:['sonnenblume'],ciabatta:['ciabatta'],baguette:['baguette'],broetchen:['brötchen','semmel'],focaccia:['focaccia']};
const match=b=>{const k=KW[b.slug]||[b.name.toLowerCase()];return ck.recipes.filter(r=>k.some(w=>r.title.toLowerCase().includes(w)))};
function fillSelects(){
  const own=breads.filter(b=>!b.raw),raws=breads.filter(b=>b.raw),sc=Object.fromEntries(own.map(b=>[b.slug,match(b).length]));
  const opts=[...own].sort((a,b)=>sc[b.slug]-sc[a.slug]).map(b=>`<option value="${esc(b.slug)}">${esc(td(b.name))}${sc[b.slug]?' · '+tr('passt zu deinen Rezepten'):''}</option>`).join('');
  const optR=raws.length?`<optgroup label="${esc(tr('Meine Rezepte'))}">${raws.map(b=>`<option value="${esc(b.slug)}">${esc(b.name)}</option>`).join('')}</optgroup>`:'';
  [['bread',opts+optR],['cBread',opts]].forEach(([id,h])=>{const e=$(id),v=e.value;e.innerHTML=h;if(v&&getBread(v)&&(id==='bread'||!getBread(v).raw))e.value=v});
  showInfo();fillSetup();calc();
}
const getBread=s=>breads.find(b=>b.slug===s);
function showInfo(){
  const b=getBread($('bread').value);if(!b){$('breadInfo').textContent='';$('ckMatch').innerHTML='';return}
  $('persons').parentElement.hidden=!!b.raw;
  if(b.raw){
    const n=b.raw.starterG,r=RATIOS[1],a=Math.max(1,Math.ceil(n/(1+2*r[0])));$('ckMatch').innerHTML='';
    $('breadInfo').textContent=tr('Eigenes Rezept · {0} Schritte. Die Dauer der Schritte wurde aus deinem Text abgelesen und kann abweichen.',b.bread_steps.length)
      +(n?' '+tr('Das Rezept braucht ca. {0} g Starter. Füttere dafür z. B. {1} g Anstellgut mit {2} Wasser und {3} Mehl ({4}).',n,a,fmt(a*r[0]),fmt(a*r[0]),rLbl(r)):'');
    return;
  }
  $('breadInfo').textContent=tr('{0}. Teig: {1}% Wasser, {2}% Starter, {3}% Salz (bezogen auf das Mehl).',td(b.tagline),b.hydration_pct,b.starter_pct,b.salt_pct)+' '+(fit(b)||'');
  const m=match(b).slice(0,3);
  $('ckMatch').innerHTML=m.length?`<p class="muted" style="margin:0 0 4px">${esc(tr('Aus deinen Rezepten:'))}</p>`+m.map(r=>`<a href="${esc(r.url)}" target="_blank" rel="noopener">${ICON('link')} ${esc(r.title)}</a>`).join(''):'';
}
$('bread').onchange=showInfo;

/* ---------- Mengen ---------- */
const fmt=g=>g<10?g.toFixed(1).replace('.',LANG==='de'?',':'.')+' g':Math.round(g)+' g';
function ingredients(b,flour){
  const L=[];
  if(b.fl)b.fl.forEach(([n,s])=>L.push({n,g:flour*s}));
  else if(b.slug==='roggen'){L.push({n:'Roggenmehl 1150',g:flour*.7},{n:'Weizenmehl 550',g:flour*.3})}
  else L.push({n:{weizen:'Weizenmehl 550',dinkel:'Dinkelmehl 630',vollkorn:'Vollkornmehl (Weizen)',koerner:'Weizenmehl 550'}[b.slug]||'Mehl',g:flour});
  L.push({n:'Wasser (lauwarm)',g:flour*b.hydration_pct/100},{n:'Sauerteig-Starter (aktiv)',g:flour*b.starter_pct/100},{n:'Salz',g:flour*b.salt_pct/100});
  (b.extras||[]).forEach(e=>L.push({n:e.name,g:flour*e.pct/100}));
  return L;
}
const ingName=n=>n==='Sauerteig-Starter (aktiv)'&&pet.active?tr('Starter {0} (aktiv)',pet.name):td(n);
const ingHTML=L=>L.map(i=>`<div><span>${esc(ingName(i.n))}</span><b>${fmt(i.g)}</b></div>`).join('');
const persons=n=>`${n} ${n==1?tr('Person'):tr('Personen')}`;

/* ---------- Rechner ---------- */
function calc(){
  const b=getBread($('cBread').value);if(!b){$('cResult').innerHTML='';return}
  const am=parseFloat($('cAmount').value),pe=parseFloat($('cPersons').value);let flour=0,head='';
  if(am>0){flour=am;head=tr('Für {0} Mehl:',fmt(am))}
  else if(pe>0){flour=pe*b.flour_per_person_g;head=tr('Für {0}:',persons(pe))}
  $('cResult').innerHTML=flour?`<p class="muted" style="margin:0">${esc(head)}</p>`+ingHTML(ingredients(b,flour)):`<p class="muted">${esc(tr('Gib Personen oder eine Menge ein.'))}</p>`;
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
  const p=b.hydration_pct,a=Math.round(lo),z=Math.round(hi),name=fl.map(x=>td(x.n)).join(' + ');
  return p<lo-3?tr('Wasser-Check: {0} % Wasser, für {1} üblich sind {2} bis {3} %. Der Teig wird eher fest.',p,name,a,z)
    :p>hi+3?tr('Wasser-Check: {0} % Wasser, für {1} üblich sind {2} bis {3} %. Der Teig wird feucht. Lass beim Mischen 20 bis 30 g Wasser weg und gib sie nur zu, wenn nötig.',p,name,a,z)
    :tr('Wasser-Check: {0} % Wasser passen zu {1} (üblich {2} bis {3} %).',p,name,a,z);
}
function fillFlours(){const v=$('wFlour').value||1;$('wFlour').innerHTML=FLOURS.map((f,i)=>`<option value="${i}">${esc(tr(f[0]))}</option>`).join('');$('wFlour').value=v}
function waterGuide(){
  const f=FLOURS[+$('wFlour').value],m=parseFloat($('wAmount').value);
  if(!(m>0)){$('wResult').innerHTML='';$('wTip').textContent=tr('Gib die Mehlmenge ein.');return}
  const k=m/500;
  $('wResult').innerHTML=`<div><span>${esc(tr('Wasser'))}</span><b>${Math.round(f[1]*k)} ${tr('bis')} ${Math.round(f[2]*k)} g</b></div><div><span>${esc(tr('Hydration'))}</span><b>${f[3]} ${tr('bis')} ${f[4]} %</b></div><div><span>${esc(tr('Zurückhalten beim Mischen'))}</span><b>20 ${tr('bis')} 30 g</b></div>`;
  $('wTip').textContent=tr(FTIP[f[5]]);
}
['wFlour','wAmount'].forEach(id=>$(id).addEventListener('input',waterGuide));

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
const goalName=k=>tr(GOALS[k]);
let mode='start';
/* Gehzeiten an Raumtemperatur und Starter anpassen. Rezepte gelten bei ca. 22 °C; die Gärung verdoppelt ihr Tempo etwa alle 8 °C. */
let temp=LS.get('sb_temp',22);
const TREF=22;
const tempFactor=t=>Math.min(2.2,Math.max(.5,Math.pow(2,(TREF-t)/8)));
// Persönliche Starter-Geschwindigkeit aus den eingetragenen Peaks (1 = wie in der Tabelle). Erst mit mehreren Messungen voll wirksam.
function petSpeed(){
  const L=(pet.active&&pet.log||[]).slice(-8);if(!L.length)return 1;
  const xs=L.map(e=>{const r=RATIOS[e.r]||RATIOS[1];return e.h/tempFactor(e.t)/((r[1]+r[2])/2)}).sort((a,b)=>a-b);
  const med=xs[Math.floor(xs.length/2)];
  return Math.min(2,Math.max(.5,1+(med-1)*Math.min(1,L.length/3)));
}
// Schritte, deren Dauer von der Gärung abhängt (Kühlschrank-Gare über Nacht bleibt unverändert)
const scalable=s=>s.bake!==undefined?(!s.bake&&s.minutes>=20&&s.minutes<480&&/gehen lassen|aufgehen|ruhen|gare|rise|proof|ferment|rest/i.test(s.description))
  :/Teig ruhen lassen|Dehnen und Falten/.test(s.title)||(/Stückgare/.test(s.title)&&s.minutes<480);
// Angepasste Minuten je Schritt (nur Abweichungen). ratio: '' = Zeit aus dem Rezept
function overFor(b,ratio,tempC,fromIdx=0){
  const o={},f=tempFactor(tempC),sp=petSpeed();
  b.bread_steps.forEach((s,i)=>{
    if(i<fromIdx)return;let m=s.minutes;
    if(/Starter füttern/.test(s.title)){if(ratio!==''&&ratio!=null)m=(RATIOS[ratio][1]+RATIOS[ratio][2])/2*60;m=m*f*sp}
    else if(scalable(s))m=m*f*Math.sqrt(sp);
    else return;
    m=Math.max(5,Math.round(m/5)*5);if(m!==s.minutes)o[i]=m;
  });
  return Object.keys(o).length?o:null;
}
function tempNote(){
  const f=tempFactor(temp),sp=petSpeed(),p=Math.round((f*sp-1)*100);
  return (Math.abs(p)<3?tr('Wie im Rezept (gilt für ca. {0} °C).',TREF):p>0?tr('Bei {0} °C dauern die Gehzeiten etwa {1} % länger als im Rezept.',temp,p):tr('Bei {0} °C dauern die Gehzeiten etwa {1} % kürzer als im Rezept.',temp,-p))
    +(sp!==1?' '+tr('Dein Starter ist dabei eingerechnet.'):'');
}
function setTemp(v){
  v=Math.round(+v);if(!(v>=5&&v<=40))return;temp=v;LS.set('sb_temp',v);
  document.querySelectorAll('.tempIn').forEach(i=>{if(document.activeElement!==i)i.value=v});
  document.querySelectorAll('.tempNote').forEach(e=>e.textContent=tempNote());
  if(plan){const keep=Object.fromEntries(Object.entries(plan.over||{}).filter(([i])=>+i<=plan.idx)),fut=overFor(getBread(plan.slug),'',v,plan.idx+1);plan.temp=v;plan.over=Object.keys({...keep,...fut}).length?{...keep,...fut}:null;LS.set('sb_plan',plan);render()}
  preview();feedGuide();
}
document.querySelectorAll('.tempIn').forEach(i=>i.addEventListener('change',()=>setTemp(i.value)));
const setupBread=()=>{const b=getBread($('bread').value);if(!b)return null;
  const from=+$('fromStep').value||0,ri=$('ratio').value,o=overFor(b,from===0?ri:'',temp);
  return {b:withOver(b,o),over:o,from,ratio:ri===''?null:+ri}};
function preview(){
  const s=setupBread(),p=$('planPrev');if(!s){p.textContent='';return}
  const raw=new Date($('start').value).getTime();if(!raw){p.textContent='';return}
  if(mode==='end'){
    const g=$('goal').value,st=startFor(s.b,g,s.from,raw);
    p.textContent=st<Date.now()-6e4?tr('Bis dahin reicht die Zeit nicht mehr. Frühestens möglich: {0} um {1}.',goalName(g),hhmm(milestone(s.b,g,s.from,Date.now())))
      :tr('Dafür musst du {0} starten.',hhmm(st));
  }else p.textContent=tr('Voraussichtlich Backbeginn im Ofen {0} · essfertig {1}.',hhmm(milestone(s.b,'oven',s.from,raw)),hhmm(milestone(s.b,'eat',s.from,raw)));
}
function fillSetup(){
  const b=getBread($('bread').value);if(!b)return;
  const fs=$('fromStep'),old=fs.value;
  fs.innerHTML=b.bread_steps.map((s,i)=>`<option value="${i}">${i+1}. ${esc(td(s.title))}</option>`).join('');if(old&&+old<b.bread_steps.length)fs.value=old;
  const ro=$('ratio'),rv=ro.value;
  ro.innerHTML=`<option value="">${esc(tr('Wie im Rezept ({0})',dur(b.bread_steps[0].minutes)))}</option>`+RATIOS.map((r,i)=>`<option value="${i}">${rLbl(r)} · ${esc(tr('Peak nach {0} bis {1} Std',r[1],r[2]))}</option>`).join('');ro.value=rv;
  ro.parentElement.hidden=!/Starter füttern/.test(b.bread_steps[0].title)||+fs.value!==0;
  preview();
}
const localIso=t=>new Date(t-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,16);
function modeLabels(){$('startLbl').textContent=mode==='end'?tr('Bis wann soll es fertig sein?'):tr('Wann startest du?')}
function setMode(m){
  mode=m;$('mStart').classList.toggle('on',m==='start');$('mEnd').classList.toggle('on',m==='end');
  $('goalL').hidden=m!=='end';modeLabels();
  const d=new Date();if(m==='end'){d.setHours(18,0,0,0);if(d<=Date.now())d.setDate(d.getDate()+1);$('start').value=localIso(d)}else $('start').value=localIso(Date.now());
  preview();
}
$('mStart').onclick=()=>setMode('start');$('mEnd').onclick=()=>setMode('end');
['bread','fromStep','ratio','goal','start'].forEach(id=>$(id).addEventListener('change',()=>{if(id==='bread'||id==='fromStep')fillSetup();else preview()}));
$('start').addEventListener('input',preview);
$('makePlan').onclick=()=>{
  const s=setupBread();if(!s)return;const b=getBread($('bread').value);
  const n=Math.round(+$('persons').value);if(!b.raw&&!(n>=1))return toast(tr('Bitte die Personenzahl eingeben.'));
  const rawIn=new Date($('start').value).getTime()||Date.now(),goal=$('goal').value;let raw=rawIn,note='';
  if(mode==='end'){raw=startFor(s.b,goal,s.from,rawIn);if(raw<Date.now()){raw=Date.now();note=tr('Bis dahin reicht die Zeit nicht ganz: {0} erst um {1}.',goalName(goal),hhmm(milestone(s.b,goal,s.from,raw)))}}
  const st=adj(raw);
  plan={slug:b.slug,persons:Math.min(n||1,50),starts:[...Array(s.from).fill(st),st],idx:s.from,fired:[],over:s.over,temp,ratio:s.ratio,goal:mode==='end'?{type:goal,t:rawIn}:null};
  LS.set('sb_plan',plan);render();
  if(note)toast(note);
  // Berechtigungen müssen per Tipp angefragt werden: jetzt Ton freischalten und ggf. Benachrichtigungen erfragen
  try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();actx.resume()}catch{}
  if('Notification' in window&&Notification.permission==='default')Notification.requestPermission().then(()=>{notifState();syncPush(true)});
  keepAwake();
  if(st!==raw)toast(tr('Start auf {0} verschoben (Ruhezeit).',hhmm(st)));
};
$('newBake').onclick=async()=>{
  if(!confirm(tr('Plan wirklich stoppen? Der Ablauf und alle Erinnerungen werden gelöscht.')))return;
  plan=null;LS.del('sb_plan');pushLast='';
  render();toast(tr('Plan gestoppt und gelöscht.'));
  try{const r=await navigator.serviceWorker?.ready;(await r?.getNotifications())?.forEach(n=>n.close())}catch{} // Meldungen wegräumen, ohne den Stopp zu blockieren
};
const hhmm=t=>{const d=new Date(t),n=new Date(),same=d.toDateString()===n.toDateString();
  return (same?'':d.toLocaleDateString(LOCALE(),{weekday:'short'})+' ')+d.toLocaleTimeString(LOCALE(),{hour:'2-digit',minute:'2-digit'})};
const dur=m=>m>=60?`${Math.floor(m/60)} ${tr('Std')}${m%60?' '+m%60+' '+tr('Min'):''}`:`${m} ${tr('Min')}`;
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
  keepAwake();notifState();syncPush();
  if(!b)return;
  const flour=plan.persons*b.flour_per_person_g;
  $('planTitle').textContent=b.raw?b.name:`${td(b.name)} · ${persons(plan.persons)}`;
  $('planIngr').innerHTML=b.raw?b.raw.ingredients.map(l=>`<div><span>${esc(l)}</span></div>`).join(''):ingHTML(ingredients(b,flour));
  $('planFit').textContent=fit(b)||'';
  {const g=plan.goal,ty=g?g.type:'eat',eta=milestone(b,ty,plan.idx,plan.starts[plan.idx]),late=g&&eta>g.t+5*6e4;
    $('planEta').textContent=(g?tr('Ziel: {0} um {1}.',goalName(ty),hhmm(g.t))+' ':'')+tr('Voraussichtlich: {0} {1}.',goalName(ty),hhmm(eta))
      +(late?' '+tr('Das ist ca. {0} später als geplant.',dur(Math.round((eta-g.t)/6e4))):'')
      +(g&&eta<g.t-30*6e4?' '+tr('Das ist ca. {0} früher. Verlängere die Stückgare im Kühlschrank.',dur(Math.round((g.t-eta)/6e4))):'')}
  const S=b.bread_steps,{T,sh}=schedule(b),base=getBread(plan.slug).bread_steps;let h='';const durTxt=(s,i)=>tr('Dauer: {0}',dur(s.minutes))+(base[i]&&base[i].minutes!==s.minutes?' '+tr('(Rezept: {0})',dur(base[i].minutes)):'');
  S.forEach((s,i)=>{
    const cls=i<plan.idx?'done':i===plan.idx?'cur':'';
    const when=i<plan.idx?ICON('check'):(sh[i]?ICON('moon')+' ':'')+hhmm(T[i]);
    h+=`<div class="step ${cls}"><div class="t"><span><span class="n">${i+1}</span>${esc(td(s.title))}</span><span class="when">${when}</span></div>`;
    if(i===plan.idx){
      const end=stepEnd(s,plan.starts[i]),late=end!==plan.starts[i]+s.minutes*6e4;
      h+=`<p>${esc(td(s.description))}</p><div class="count" id="count">--:--</div><p class="muted">${esc(durTxt(s,i))}${/Falten/.test(s.title)?' · '+esc(tr('Erinnerung alle {0} Min',foldGap(s))):''}</p>${late?`<p class="muted">${ICON('moon')} ${esc(tr('Wegen der Ruhezeit erst um {0}.',hhmm(end)))}</p>`:''}<button class="btn" id="doneBtn">${esc(i===S.length-1?tr('FERTIG, GUTEN APPETIT'):tr('SCHRITT ERLEDIGT'))}</button>`;
    }else if(i>plan.idx)h+=`<p class="muted" style="margin:4px 0 0">${esc(durTxt(s,i))}</p>`;
    h+='</div>';
  });
  $('steps').innerHTML=h;
  const db=$('doneBtn');if(db)db.onclick=nextStep;
  tick();
}
function nextStep(){
  const b=pb(),S=b.bread_steps;
  if(pet.active&&/Starter füttern/.test(S[plan.idx].title))feedPet(true); // Schritt erledigt = Starter gefüttert
  if(plan.idx>=S.length-1){jDraft={bread:b.name,temp:plan.temp??temp,hours:Math.round((Date.now()-plan.starts[0])/36e5*2)/2};LS.set('sb_jdraft',jDraft);plan=null;LS.del('sb_plan');setTimeout(()=>openJournal(jDraft),400);if(pet.active){pet.bakes++;addXp(50);drawPet()}render();toast(pet.active?tr('Fertig! Lass es gut auskühlen. {0} bekommt +50 XP.',pet.name):tr('Fertig! Lass es gut auskühlen.'));return}
  plan.idx++;plan.starts[plan.idx]=Date.now();LS.set('sb_plan',plan);render();
}

/* ---------- Timer & Erinnerungen ---------- */
const foldGap=s=>Math.max(5,Math.round(s.minutes/4/5)*5); // 4 Faltrunden gleichmäßig über den Schritt verteilt
function eventsFor(b,i,st){ // Erinnerungen eines Schritts, der um st beginnt
  const s=b.bread_steps[i],nx=b.bread_steps[i+1],E=[];
  if(/Falten/.test(s.title))for(let n=1;n<=3;n++){const t=st+n*foldGap(s)*6e4;if(adj(t)===t)E.push({k:`${i}:f${n}`,t,title:tr('Dehnen und Falten'),body:tr('Runde {0} von 4: Teig einmal dehnen und falten.',n+1)})}
  E.push({k:`${i}:end`,t:stepEnd(s,st),title:tr('{0}: fertig',td(s.title)),body:nx?tr('Weiter mit: {0}',td(nx.title)):tr('Dein Brot ist durch. Gut auskühlen lassen!')});
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
  const txt=!('Notification' in window)?tr('Dieses Gerät unterstützt keine Browser-Benachrichtigungen. Auf dem iPhone zuerst „Zum Home-Bildschirm“ wählen.')
    :Notification.permission==='granted'?(pushOn?tr('Benachrichtigungen sind aktiv, auch bei geschlossener App (Push).'):tr('Benachrichtigungen sind aktiv, solange die App offen ist. Push im Hintergrund wird eingerichtet …'))
    :Notification.permission==='denied'?tr('Benachrichtigungen sind blockiert. Erlaube sie in den Browser- oder Handy-Einstellungen für diese Seite.'):tr('Noch nicht aktiviert.');
  document.querySelectorAll('[data-notif]').forEach(n=>n.textContent=txt);
}
function notify(title,body){
  toast(`${title}: ${body}`);navigator.vibrate&&navigator.vibrate([300,150,300,150,300]);beep();
  if('Notification' in window&&Notification.permission==='granted'){
    const o={body,icon:'icon-192.png',badge:'icon-192.png',tag:'step',renotify:true,requireInteraction:true,vibrate:[300,150,300,150,300]};
    navigator.serviceWorker?.ready.then(r=>r.showNotification(title,o)).catch(()=>{try{new Notification(title,o)}catch{}});
  }
}
let bt;function toast(m){const e=$('banner');e.textContent=m;e.hidden=false;clearTimeout(bt);bt=setTimeout(()=>e.hidden=true,12000);e.onclick=()=>e.hidden=true}
async function enableNotif(){
  if(!('Notification' in window))return toast(tr('Dieses Gerät unterstützt keine Benachrichtigungen im Browser. Auf dem iPhone zuerst „Zum Home-Bildschirm“ wählen.'));
  const p=await Notification.requestPermission();notifState();toast(p==='granted'?tr('Benachrichtigungen sind aktiv.'):tr('Benachrichtigungen wurden nicht erlaubt.'));
  if(p==='granted'){notify(tr('Test'),tr('So melde ich mich, wenn ein Schritt ansteht.'));syncPush(true)}
}
$('notifBtn').onclick=enableNotif;$('notifBtn2').onclick=enableNotif;
$('icsBtn').onclick=()=>{
  const b=pb();if(!b)return;const {T}=schedule(b),z=t=>new Date(t).toISOString().replace(/[-:]|\.\d+/g,'');
  const esc2=t=>t.replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,');
  let o='BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//LilDough//DE\r\n';
  b.bread_steps.forEach((s,i)=>{if(i<plan.idx)return;o+=`BEGIN:VEVENT\r\nUID:${plan.starts[0]}-${i}@lildough\r\nDTSTAMP:${z(Date.now())}\r\nDTSTART:${z(T[i])}\r\nDTEND:${z(T[i]+Math.max(s.minutes,5)*6e4)}\r\nSUMMARY:${esc2(td(s.title))}\r\nDESCRIPTION:${esc2(td(s.description))}\r\nBEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:${esc2(td(s.title))}\r\nTRIGGER:PT0M\r\nEND:VALARM\r\nEND:VEVENT\r\n`});
  o+='END:VCALENDAR\r\n';
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([o],{type:'text/calendar'}));a.download='lildough.ics';a.click();
};

/* ---------- Rezepte: Links, Ordner und eigene Notizen ---------- */
let ckFilter='all',ckOpen=-1;
const saveCk=()=>LS.set('sb_ck',ck);
// Erkennt einen Link (auch aus Teilen-Text) und leitet den Titel aus dem Text oder der Adresse ab
function parseLink(txt){
  const m=txt.match(/https?:\/\/[^\s]+/);if(!m)return null;
  let u;try{u=new URL(m[0])}catch{return null}
  if(u.protocol!=='https:'&&u.protocol!=='http:')return null;
  let title=txt.replace(m[0],'').split('\n').map(x=>x.trim()).find(Boolean)||'';
  title=title.replace(/^[^:]*:\s*/,'').replace(/^[„"“]+|[“”"]+$/g,'').slice(0,80); // alles vor dem ersten Doppelpunkt samt Doppelpunkt entfernen
  if(!title){try{title=decodeURIComponent((u.pathname.split('/').filter(Boolean).pop()||'').replace(/\.html?$/,'')).replace(/[-_]+/g,' ').trim()}catch{}}
  if(!title||/^\d+$/.test(title))title=u.hostname.replace(/^www\./,'');
  return {url:`${u.protocol}//${u.hostname}${u.pathname}`,title};
}
// Nimmt einen oder mehrere Links (oder Teilen-Text) auf und gibt die Zahl der neuen Rezepte zurück
function addRecipes(txt){
  const urls=[...txt.matchAll(/https?:\/\/[^\s]+/g)].map(m=>m[0]);let n=0,bad=0;
  (urls.length===1?[txt]:urls).forEach(t=>{
    const r=parseLink(t);if(!r){bad++;return}
    if(ck.recipes.some(x=>x.url===r.url)||ck.recipes.length>=50)return;
    ck.recipes.unshift({...r,f:ckFilter!=='all'&&ckFilter!=='none'?ckFilter:null,notes:{ing:'',steps:''}});n++;
  });
  if(n){ckOpen=-1;saveCk();drawCk();fillSelects()}
  return {n,bad};
}
function drawCk(){
  if(ckFilter!=='all'&&ckFilter!=='none'&&!ck.folders.some(f=>f.id===ckFilter))ckFilter='all';
  const cnt=id=>ck.recipes.filter(r=>id==='all'?true:id==='none'?!r.f:r.f===id).length;
  $('ckFolders').innerHTML=[['all',tr('Alle')],...ck.folders.map(f=>[f.id,f.name]),...(ck.folders.length?[['none',tr('Ohne Ordner')]]:[])]
    .map(([id,n])=>`<button class="${ckFilter===id?'on':''}" data-f="${esc(id)}">${ICON('folder')} ${esc(n)} (${cnt(id)})</button>`).join('')+`<button data-f="+">${ICON('plus')} ${esc(tr('Ordner'))}</button>`;
  $('ckFolders').querySelectorAll('button').forEach(b=>b.onclick=()=>{
    if(b.dataset.f==='+'){const n=(prompt(tr('Name des neuen Ordners'))||'').trim().slice(0,24);if(!n)return;const id='f'+Date.now().toString(36);ck.folders.push({id,name:n});ckFilter=id;saveCk()}
    else ckFilter=b.dataset.f;
    ckOpen=-1;drawCk();
  });
  const real=ckFilter!=='all'&&ckFilter!=='none';$('ckFolderTools').hidden=!real;
  const opts=sel=>`<option value="">${esc(tr('Ohne Ordner'))}</option>`+ck.folders.map(f=>`<option value="${esc(f.id)}"${sel===f.id?' selected':''}>${esc(f.name)}</option>`).join('');
  const rows=ck.recipes.map((r,i)=>[r,i]).filter(([r])=>ckFilter==='all'||(ckFilter==='none'?!r.f:r.f===ckFilter));
  const panel=(r,i)=>ckOpen!==i?'':`<div class="rn"><label>${esc(tr('Zutaten (eine pro Zeile)'))}<textarea data-ni="${i}" rows="4">${esc(r.notes.ing)}</textarea></label><label>${esc(tr('Schritte (eine pro Zeile, Zeiten wie „30 Min“ werden erkannt)'))}<textarea data-ns="${i}" rows="6">${esc(r.notes.steps)}</textarea></label><button class="btn" data-go="${i}">${ICON('play')} ${esc(tr('PLAN AUS NOTIZEN'))}</button></div>`;
  $('ckList').innerHTML=rows.length?rows.map(([r,i])=>`<div class="rec"><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a><div class="ra"><select data-mv="${i}" aria-label="${esc(tr('Ordner'))}">${opts(r.f)}</select><button class="go${ckOpen===i?' on':''}" data-note="${i}">${ICON('note')} ${esc(tr('NOTIZEN'))}</button><button data-del="${i}" aria-label="${esc(tr('Entfernen'))}">${ICON('trash')}</button></div>${panel(r,i)}</div>`).join('')
    :`<p class="muted" style="margin:6px 0 0">${esc(ck.recipes.length?tr('In diesem Ordner ist noch nichts.'):tr('Noch keine Rezepte. Teile eines mit dieser App oder füge einen Link ein.'))}</p>`;
  const L=$('ckList');
  L.querySelectorAll('[data-mv]').forEach(s=>s.onchange=()=>{ck.recipes[+s.dataset.mv].f=s.value||null;saveCk();drawCk()});
  L.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{ck.recipes.splice(+b.dataset.del,1);ckOpen=-1;saveCk();syncCkBreads();drawCk();fillSelects()});
  L.querySelectorAll('[data-note]').forEach(b=>b.onclick=()=>{ckOpen=ckOpen===+b.dataset.note?-1:+b.dataset.note;drawCk()});
  L.querySelectorAll('[data-ni]').forEach(t=>t.onchange=()=>{ck.recipes[+t.dataset.ni].notes.ing=t.value;saveCk();syncCkBreads()});
  L.querySelectorAll('[data-ns]').forEach(t=>t.onchange=()=>{ck.recipes[+t.dataset.ns].notes.steps=t.value;saveCk();syncCkBreads()});
  L.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>startRecipe(+b.dataset.go));
}
$('ckRen').onclick=()=>{const f=ck.folders.find(x=>x.id===ckFilter);if(!f)return;const n=(prompt(tr('Neuer Name'),f.name)||'').trim().slice(0,24);if(n){f.name=n;saveCk();drawCk()}};
$('ckDelF').onclick=()=>{const f=ck.folders.find(x=>x.id===ckFilter);if(!f||!confirm(tr('Ordner „{0}“ löschen? Die Rezepte bleiben erhalten.',f.name)))return;
  ck.recipes.forEach(r=>{if(r.f===f.id)r.f=null});ck.folders=ck.folders.filter(x=>x!==f);ckFilter='all';saveCk();drawCk()};
function addFromInput(){
  const v=$('ckUrl').value.trim();if(!v)return;
  const {n,bad}=addRecipes(v);$('ckUrl').value='';
  toast(n?(n==1?tr('1 Rezept hinzugefügt.'):tr('{0} Rezepte hinzugefügt.',n)):bad?tr('Bitte einen gültigen Link einfügen.'):tr('Schon in der Liste.'));
}
$('ckAdd').onclick=addFromInput;$('ckUrl').addEventListener('keydown',e=>e.key==='Enter'&&addFromInput());
$('ckPaste').onclick=async()=>{
  try{const t=await navigator.clipboard.readText();if(!t)return toast(tr('Die Zwischenablage ist leer.'));$('ckUrl').value=t;addFromInput()}
  catch{toast(tr('Zugriff auf die Zwischenablage nicht erlaubt. Füge den Link bitte ins Feld ein.'))}
};
function updateHints(){ // Hinweis passend zum Gerät: Teilen-Menü gibt es nur bei installierten Android-Apps
  const ios=/iPhone|iPad|iPod/.test(navigator.userAgent),app=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
  $('ckHint').innerHTML=ios?esc(tr('Auf dem iPhone kann diese App nicht im Teilen-Menü auftauchen. Kopiere den Link des Rezepts und tippe hier auf das Einfügen-Symbol neben dem Feld. Mehrere Links gehen auch. Zutaten und Schritte schreibst du selbst bei „Notizen“.'))
    :app?esc(tr('Tippe beim Rezept auf Teilen und wähle diese App. Wird sie nicht angezeigt, installiere die App neu (Menü, „App installieren“). Sonst Link kopieren und das Einfügen-Symbol nutzen. Zutaten und Schritte schreibst du selbst bei „Notizen“.'))
    :esc(tr('Im Teilen-Menü erscheint die App nur, wenn sie richtig installiert ist (Chrome-Menü, „App installieren“, nicht nur „Zum Startbildschirm“). Sonst Link kopieren und das Einfügen-Symbol nutzen. Zutaten und Schritte schreibst du selbst bei „Notizen“.'));
}
// Vom Teilen-Menü (Android, installierte App): Link kommt per Adresse an
(function handleShare(){
  const p=new URLSearchParams(location.search);if(!['url','text','title'].some(k=>p.get(k)))return;
  const txt=[p.get('title'),p.get('text'),p.get('url')].filter(Boolean).join('\n');
  try{history.replaceState(null,'',location.pathname)}catch{}
  setTimeout(()=>{const {n,bad}=addRecipes(txt);goTab('ck');toast(n?tr('Rezept übernommen.'):bad?tr('Das war kein gültiger Link.'):tr('Das Rezept ist schon in der Liste.'))},0);
})();

/* ---------- Plan aus eigenen Notizen ---------- */
function stepMinutes(t){
  let m=/über nacht|overnight/i.test(t)?600:0;
  for(const x of t.matchAll(/(\d+(?:[.,]\d+)?)(?:\s*(?:-|–|bis|to)\s*(\d+(?:[.,]\d+)?))?\s*(Stunden?|Std\.?|hours?|hrs?|h\b|Minuten?|Min\.?|minutes?|mins?)/gi)){
    const n=parseFloat((x[2]||x[1]).replace(',','.'));m=Math.max(m,Math.round(n*(/^(S|h)/i.test(x[3])?60:1)));
  }
  return Math.min(m||10,1440);
}
function shortTitle(t){
  let s=t.replace(/\b(ca|bzw|ggf|evtl|Min|Std|z\.\s?B)\./gi,'$1').split(/[.:;!?]/)[0].trim();if(s.length>48){s=s.slice(0,48);s=s.slice(0,s.lastIndexOf(' ')>20?s.lastIndexOf(' '):48)+' …'}
  return s||tr('Schritt');
}
const lines=s=>String(s||'').split('\n').map(x=>x.trim()).filter(Boolean);
function recipeToBread(r){
  const ing=lines(r.notes.ing),steps=lines(r.notes.steps),id=String(Math.abs([...r.url].reduce((a,c)=>(a*31+c.charCodeAt(0))|0,7)));
  const sg=ing.map(l=>/anstellgut|sauerteig|starter|ansatz|sourdough/i.test(l)?l.match(/(\d+(?:[.,]\d+)?)\s*(kg|g)\b/i):null).find(Boolean);
  return {id:'ck-'+id,slug:'ck-'+id,name:r.title,tagline:'',emoji:'',flour_per_person_g:0,hydration_pct:0,starter_pct:0,salt_pct:0,extras:[],sort_order:900,
    bread_steps:steps.map((t,i)=>({id:`ck-${id}-${i}`,position:i+1,title:shortTitle(t),description:t,minutes:stepMinutes(t),bake:/backofen|\bofen\b|backen|oven|bake/i.test(t)})),
    raw:{ingredients:ing,url:r.url,starterG:sg?Math.round(parseFloat(sg[1].replace(',','.'))*(sg[2].toLowerCase()==='kg'?1000:1)):0}};
}
function syncCkBreads(){breads=breads.filter(b=>!b.raw);ck.recipes.forEach(r=>{if(lines(r.notes&&r.notes.steps).length)breads.push(recipeToBread(r))})}
function startRecipe(i){
  const r=ck.recipes[i];if(!r)return;
  if(!lines(r.notes.steps).length)return toast(tr('Schreibe zuerst mindestens einen Schritt unter „Notizen“ auf.'));
  syncCkBreads();const b=breads.find(x=>x.raw&&x.raw.url===r.url);
  fillSelects();$('bread').value=b.slug;showInfo();fillSetup();goTab('bake');
  toast(plan?tr('„{0}“ ist ausgewählt. Es läuft aber schon ein Plan: Stoppe ihn zuerst.',b.name):tr('„{0}“ ist ausgewählt. Wähle jetzt die Zeit und erstelle den Plan.',b.name));
}
const activeRec=()=>plan&&plan.slug.startsWith('ck-')?breads.find(b=>b.slug===plan.slug&&b.raw)||null:null;

/* ---------- Coach (Gemini) ---------- */
const devId=()=>{let d=LS.get('sb_dev',null);if(!d){d=(crypto.randomUUID?crypto.randomUUID():String(Math.random()).slice(2)+Date.now());LS.set('sb_dev',d)}return d};
function keyState(){const k=LS.get('sb_key','');$('keyState').textContent=k?tr('gespeichert ({0})','••••'+k.slice(-4)):tr('fehlt');$('keyBox').open=!k;coachState()}
function coachState(){$('coachMode').textContent=LS.get('sb_key','')?tr('Eigener Key gespeichert. Die Anfragen gehen direkt von deinem Gerät an Google, ohne Limit der App.'):tr('Ohne eigenen Key nutzt der Coach den App-Zugang, falls eingerichtet, mit Tageslimit. Mit eigenem Key (kostenlos bei Google) gibt es kein Limit.')}
$('keySave').onclick=()=>{const k=$('keyIn').value.trim();if(!k)return;LS.set('sb_key',k);$('keyIn').value='';keyState();toast(tr('Key gespeichert.'))};
$('keyDel').onclick=()=>{LS.del('sb_key');keyState()};
const HI=()=>({r:'a',t:tr('Hi, ich bin dein Brot-Coach. Frag mich, was dich beim Sauerteig beschäftigt, zum Beispiel zu Starter, Gare oder Kruste. Fotos von Teig oder Brot kannst du mir auch schicken.')});
function drawChat(){
  const log=$('chatLog');log.textContent='';
  (chat.length?chat:[HI()]).forEach(m=>{
    const d=document.createElement('div');d.className='msg '+m.r;
    if(m.p){const i=new Image();i.src=m.p;d.appendChild(i)}
    else if(m.img){const s=document.createElement('div');s.className='muted';s.innerHTML=ICON('image')+' '+esc(tr('Foto'));d.appendChild(s)}
    if(m.t){const s=document.createElement('span');s.textContent=m.t;d.appendChild(s)}
    log.appendChild(d);
  });
  log.scrollTop=1e9;
}
// Foto klein rechnen: bis 384 px Kantenlänge zählt Gemini pauschal ca. 258 Tokens
function shrink(f,max=384,q=.6){return new Promise((ok,no)=>{ // f: Datei oder Bild-Adresse
  const isUrl=typeof f==='string',u=isUrl?f:URL.createObjectURL(f),im=new Image();
  im.onload=()=>{const s=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');
    c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);c.getContext('2d').drawImage(im,0,0,c.width,c.height);
    if(!isUrl)URL.revokeObjectURL(u);ok(c.toDataURL('image/jpeg',q))};
  im.onerror=()=>{if(!isUrl)URL.revokeObjectURL(u);no()};im.src=u;
})}
function setPend(d){pend=d;$('pend').hidden=!d;$('pendImg').src=d||''}
$('imgBtn').onclick=()=>$('imgIn').click();
$('imgIn').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
  try{setPend(await shrink(f))}catch{toast(tr('Das Bild konnte nicht gelesen werden.'))}};
$('pendX').onclick=()=>setPend(null);
// Eigener Key: direkt an Google. Ohne Key: über den Server der App (mit Tageslimit), falls eingerichtet.
async function askCoach(sys,hist){
  const k=LS.get('sb_key','');
  if(k){
    // Gemini 3.x lässt Denken nicht ganz abschalten: "low" spart Tokens. Falls die Einstellung abgelehnt wird, ohne sie wiederholen.
    const ask=gc=>fetch(GEMINI,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':k},body:JSON.stringify({systemInstruction:{parts:[{text:sys}]},contents:hist,generationConfig:gc})});
    let r=await ask({maxOutputTokens:1200,thinkingConfig:{thinkingLevel:'low'}}),j=await r.json();
    if(!r.ok&&/think/i.test(j.error?.message||'')){r=await ask({maxOutputTokens:1200});j=await r.json()}
    if(!r.ok)throw new Error(j.error?.message||r.status);
    return j.candidates?.[0]?.content?.parts?.map(p=>p.text).join('')||tr('(keine Antwort)');
  }
  let r,j;
  try{r=await fetch(SB_URL+'/functions/v1/coach',{method:'POST',headers:{'Content-Type':'application/json',apikey:SB_KEY},body:JSON.stringify({device:devId(),system:sys,contents:hist})});j=await r.json()}
  catch{throw new Error('NOKEY')}
  if(r.status===429)throw new Error(tr('Das Tageslimit des App-Coachs ist erreicht. Trage deinen eigenen Key ein, dann gibt es kein Limit.'));
  if(!r.ok||j.error)throw new Error(j.error==='not_configured'||r.status===404||r.status===503?'NOKEY':(j.error||r.status));
  return j.text||tr('(keine Antwort)');
}
async function send(){
  const q=$('chatIn').value.trim();if(!q&&!pend)return;
  const img=pend;$('chatIn').value='';setPend(null);
  chat.push({r:'u',t:q,img:!!img,p:img||undefined});chat.push({r:'a',t:'…'});drawChat();$('chatSend').disabled=true;
  const b=pb(),rec=ck.recipes.slice(0,5).map(r=>r.title).join('; ');
  const sys=(LANG==='de'?'Du bist ein freundlicher, erfahrener Sauerteig-Bäcker. Antworte auf Deutsch, kurz und praktisch. Schreib wie ein normaler Mensch: keine Gedankenstriche, keine Emojis, keine Floskeln wie „Gerne!“ oder „Gute Frage!“, keine Aufzählungen, wenn zwei Sätze reichen.':'You are a friendly, experienced sourdough baker. Answer in English, briefly and practically. Write like a normal person: no dashes, no emojis, no filler like "Sure!" or "Great question!", no bullet lists when two sentences do.')
    +(b?(LANG==='de'?` Die Person backt gerade: ${b.name} für ${plan.persons} Personen, aktueller Schritt: ${b.bread_steps[plan.idx].title}.`:` The person is baking: ${td(b.name)} for ${plan.persons} people, current step: ${td(b.bread_steps[plan.idx].title)}.`):'')
    +(pet.active?(LANG==='de'?` Ihr Starter heißt ${pet.name}.`:` Their starter is called ${pet.name}.`):'')
    +(activeRec()?(LANG==='de'?` Aktuelles eigenes Rezept: ${activeRec().name}.`:` Current own recipe: ${activeRec().name}.`):'')
    +(rec?(LANG==='de'?` Gemerkte Rezepte: ${rec}.`:` Saved recipes: ${rec}.`):'');
  // Verlauf nur als Text (Fotos werden nie erneut gesendet), kurz gehalten
  const hist=chat.slice(0,-2).filter(m=>!m.e).slice(-6).map(m=>({role:m.r==='u'?'user':'model',parts:[{text:(m.img?'[Foto] ':'')+m.t}]}));
  while(hist.length&&hist[0].role!=='user')hist.shift();
  const parts=[{text:q||tr('Was siehst du auf dem Foto? Was sollte ich tun?')}];
  if(img)parts.push({inlineData:{mimeType:'image/jpeg',data:img.split(',')[1]}});
  hist.push({role:'user',parts});
  const last=chat[chat.length-1];
  try{last.t=await askCoach(sys,hist)}
  catch(e){
    if(e.message==='NOKEY'){chat.splice(-2,2);if(q)$('chatIn').value=q;if(img)setPend(img);$('keyBox').open=true;toast(tr('Bitte zuerst oben deinen Gemini API Key speichern.'))}
    else{last.t=tr('Fehler: {0}',e.message);last.e=1}
  }
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
function addXp(n){const l=petLvl();pet.xp+=n;savePet();if(petLvl()>l)toast(tr('Level-up: {0} ist jetzt Level {1}.',pet.name,petLvl()))}
function feedPet(auto){
  const fresh=!pet.fed||Date.now()-pet.fed>8*36e5;pet.fed=Date.now();pet.fedTemp=temp;pet.fedRatio=auto&&plan&&plan.ratio!=null?plan.ratio:(+$('feedRatio').value||1);
  if(fresh)addXp(5);else savePet();
  drawPet();if(!auto)toast(fresh?tr('Gefüttert, +5 XP für {0}.',pet.name):tr('{0} ist schon satt.',pet.name));
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
  const l=petLvl(),lo=(l-1)**2*25,hi=l**2*25,m=petMood(),ago=pet.fed?Date.now()-pet.fed:0,h=Math.floor(ago/36e5),d=petDays();
  $('petArt').innerHTML=petSVG();$('petName').textContent=pet.name;
  $('petLvl').textContent=tr('Level {0} · {1} · {2} {3} alt · {4} {5} gebacken',l,tr(PTITLE[Math.min(l-1,PTITLE.length-1)]),d,d==1?tr('Tag'):tr('Tage'),pet.bakes,pet.bakes==1?tr('Brot'):tr('Brote'));
  if(document.activeElement!==$('pAge'))$('pAge').value=d;
  if(document.activeElement!==$('pFedH'))$('pFedH').value=pet.fed?h:'';
  $('petXp').style.width=Math.round((pet.xp-lo)/(hi-lo)*100)+'%';
  $('petMood').textContent=!pet.fed?tr('{0} wurde noch nie gefüttert und hat Hunger.',pet.name):m==2?tr('{0} ist satt und zufrieden (zuletzt gefüttert vor {1} Std).',pet.name,h):m==1?tr('{0} wird hungrig. Zuletzt gefüttert vor {1} Std.',pet.name,h):tr('{0} hat großen Hunger. Zuletzt gefüttert vor {1} Tg {2} Std.',pet.name,Math.floor(h/24),h%24);
  drawPeaks();
  const chip=(id,arr,key,fn)=>{$(id).innerHTML=arr.map((a,i)=>fn(a,i)).join('');$(id).querySelectorAll('button:not([disabled])').forEach(b=>b.onclick=()=>{pet[key]=+b.dataset.i;savePet();drawPet()})};
  chip('pCol',PCOL,'col',(c,i)=>`<button class="sw${pet.col==i?' on':''}" data-i="${i}" style="background:${c[1]}" aria-label="${esc(tr(c[0]))}"></button>`);
  chip('pEye',PEYE,'eye',(e,i)=>`<button class="${pet.eye==i?'on':''}" data-i="${i}">${esc(tr(e))}</button>`);
  chip('pAcc',PACC,'acc',(a,i)=>`<button class="${pet.acc==i?'on':''}" data-i="${i}"${a[1]>l?' disabled':''}>${esc(tr(a[0]))}${a[1]>l?' '+esc(tr('(ab Lv {0})',a[1])):''}</button>`);
}
/* ---------- Peak-Tagebuch: der Starter lernt, wie schnell er wirklich ist ---------- */
function fillFeedRatio(){const e=$('feedRatio'),v=e.value||String(pet.lastRatio??1);e.innerHTML=RATIOS.map((r,i)=>`<option value="${i}">${rLbl(r)}</option>`).join('');e.value=v}
function drawPeaks(){
  const L=pet.log||[],sp=petSpeed(),p=Math.round((sp-1)*100);
  $('peakInfo').textContent=!L.length?tr('Noch keine Peaks eingetragen. Tippe auf „Peak erreicht“, sobald dein Starter am höchsten steht.')
    :Math.abs(p)<3?tr('Dein Starter liegt genau auf der Tabelle (aus {0} Messungen).',L.length)
    :p<0?tr('Dein Starter ist ca. {0} % schneller als die Tabelle (aus {1} Messungen).',-p,L.length):tr('Dein Starter ist ca. {0} % langsamer als die Tabelle (aus {1} Messungen).',p,L.length);
  $('peakList').innerHTML=L.slice(-5).reverse().map(e=>`<div><span>${rLbl(RATIOS[e.r]||RATIOS[1])} · ${e.t} °C</span><b>${String(e.h).replace('.',LANG==='de'?',':'.')} ${esc(tr('Std'))}</b></div>`).join('');
  $('peakUndo').hidden=!L.length;
}
$('feedRatio').addEventListener('change',()=>{pet.lastRatio=+$('feedRatio').value;savePet()});
$('petPeak').onclick=()=>{
  if(!pet.fed)return toast(tr('Trag zuerst ein, wann du gefüttert hast.'));
  if(pet.peakAt===pet.fed)return toast(tr('Für diese Fütterung ist der Peak schon eingetragen.'));
  const h=(Date.now()-pet.fed)/36e5;
  if(h<1||h>36)return toast(tr('Die Fütterung ist {0} Std her. Trag sie zuerst neu ein.',Math.round(h)));
  pet.log=[...(pet.log||[]),{h:Math.round(h*10)/10,r:pet.fedRatio??1,t:pet.fedTemp??temp,at:Date.now()}].slice(-20);
  pet.peakAt=pet.fed;savePet();drawPet();fillSetup();feedGuide();toast(tr('Peak nach {0} Std gespeichert.',(Math.round(h*10)/10).toString().replace('.',LANG==='de'?',':'.')));
};
$('peakUndo').onclick=()=>{const L=pet.log||[];if(!L.length)return;pet.log=L.slice(0,-1);pet.peakAt=null;savePet();drawPet();fillSetup();feedGuide()};
$('nGo').onclick=()=>{
  const fh=$('nFed').value;
  pet={name:$('nName').value.trim().slice(0,16)||'Blubb',col:0,eye:0,acc:0,xp:0,bakes:0,born:Date.now()-Math.max(0,+$('nAge').value||0)*864e5,fed:fh===''?null:Date.now()-Math.max(0,+fh)*36e5,active:true};
  savePet();$('petIn').value=pet.name;drawPet();render();toast(tr('{0} ist jetzt dabei.',pet.name));
};
$('pAge').addEventListener('change',()=>{pet.born=Date.now()-Math.max(0,+$('pAge').value||0)*864e5;savePet();drawPet()});
$('pFedH').addEventListener('change',()=>{const v=$('pFedH').value;pet.fed=v===''?null:Date.now()-Math.max(0,+v)*36e5;savePet();drawPet()});
$('petDel').onclick=()=>{if(!confirm(tr('{0} wirklich löschen? Level und Aussehen gehen verloren.',pet.name)))return;
  pet={name:'Blubb',col:0,eye:0,acc:0,xp:0,bakes:0,fed:null,born:Date.now(),active:false};savePet();$('nName').value='';drawPet();render()};

/* ---------- Füttern-Guide ---------- */
$('gRatio').innerHTML=RATIOS.map((r,i)=>`<option value="${i}">${rLbl(r)}</option>`).join('');$('gRatio').value=1;
function feedGuide(){
  const r=RATIOS[+$('gRatio').value],a=parseFloat($('gAsg').value);
  if(!(a>0)){$('gRes').innerHTML='';$('gTip').textContent=tr('Gib die Menge Anstellgut ein.');return}
  const x=a*r[0],row=(n,v)=>`<div><span>${esc(n)}</span><b>${fmt(v)}</b></div>`;
  $('gRes').innerHTML=row(tr('Anstellgut (Starter)'),a)+row(tr('Wasser'),x)+row(tr('Mehl'),x)+row(tr('Gesamt'),a+2*x)+`<div><span>${esc(tr('Peak nach'))}</span><b>${r[1]} ${esc(tr('bis'))} ${r[2]} ${esc(tr('Std'))}</b></div>`+(tempFactor(temp)*petSpeed()!==1?`<div><span>${esc(tr('Dein Peak bei {0} °C',temp))}</span><b>${(r[1]*tempFactor(temp)*petSpeed()).toFixed(1)} ${esc(tr('bis'))} ${(r[2]*tempFactor(temp)*petSpeed()).toFixed(1)} ${esc(tr('Std'))}</b></div>`:'');
  $('gTip').textContent=tr(r[3]);
}
['gRatio','gAsg'].forEach(id=>$(id).addEventListener('input',feedGuide));
$('petFeed').onclick=()=>feedPet(false);
$('petIn').value=pet.name;
$('petIn').addEventListener('input',()=>{pet.name=$('petIn').value.trim().slice(0,16)||'Starter';savePet();$('petName').textContent=pet.name});
$('petIn').addEventListener('change',drawPet);
setInterval(()=>{if(!document.hidden&&$('tab-pet').classList.contains('active')&&document.activeElement!==$('petIn'))drawPet()},60000);

/* ---------- Back-Tagebuch: Ergebnis, Foto und Notiz je Brot; Fotos liegen in IndexedDB ---------- */
let jr=LS.get('sb_journal',[]),jRating=0,jPhotoData=null,jDraft=LS.get('sb_jdraft',null);
const idb=()=>new Promise((ok,no)=>{const r=indexedDB.open('lildough',1);r.onupgradeneeded=()=>r.result.createObjectStore('photos');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
const idbDo=async(mode,fn)=>{const d=await idb();return new Promise((ok,no)=>{const t=d.transaction('photos',mode),q=fn(t.objectStore('photos'));t.oncomplete=()=>{d.close();ok(q&&q.result)};t.onerror=()=>no(t.error)})};
const photoPut=(id,v)=>idbDo('readwrite',s=>s.put(v,id)),photoGet=id=>idbDo('readonly',s=>s.get(id)),photoDel=id=>idbDo('readwrite',s=>s.delete(id));
const star=on=>`<svg class="ic${on?'':' off'}"><use href="#i-star"/></svg>`;
function jInsight(){
  const R=jr.filter(e=>e.rating);
  if(R.length<3)return tr('Hier sammelst du deine Brote mit Foto, Bewertung und Notiz. Ab 3 bewerteten Broten siehst du, was bei dir am besten klappt.');
  const good=R.filter(e=>e.rating>=4),avg=(R.reduce((s,e)=>s+e.rating,0)/R.length).toFixed(1).replace('.',LANG==='de'?',':'.');
  if(!good.length)return tr('Noch kein Brot mit 4 oder 5 Sternen (Schnitt {0}). Trag auch die Temperatur ein, dann sieht man bald, was bei dir funktioniert.',avg);
  const m=k=>{const v=good.map(e=>e[k]).filter(x=>x>0);return v.length?Math.round(v.reduce((s,x)=>s+x,0)/v.length*10)/10:null};
  const t=m('temp'),h=m('hours');
  return tr('Deine besten Brote ({0}, ab 4 Sternen) entstanden im Schnitt{1}. Durchschnitt aller Brote: {2} Sterne.',good.length,
    (t?' '+tr('bei {0} °C',String(t).replace('.',LANG==='de'?',':'.')):'')+(h?(t?' '+tr('und')+' ':' ')+tr('nach {0} Std Gesamtzeit',String(h).replace('.',LANG==='de'?',':'.')):''),avg);
}
async function drawJournal(){
  $('jInfo').textContent=jInsight();
  $('jNew').hidden=!$('jForm').hidden;
  $('jStars').innerHTML=[1,2,3,4,5].map(n=>`<button type="button" data-n="${n}" class="${jRating>=n?'on':''}" aria-label="${esc(tr('{0} Sterne',n))}">${star(true)}</button>`).join('');
  $('jStars').querySelectorAll('button').forEach(b=>b.onclick=()=>{jRating=jRating===+b.dataset.n?0:+b.dataset.n;drawJournal()});
  $('jList').innerHTML=jr.length?jr.map(e=>`<div class="jitem" data-id="${e.id}">${e.photo?`<img alt="" data-ph="${e.id}">`:''}<div class="jb"><div class="jt">${esc(td(e.bread))}</div><div class="js">${[1,2,3,4,5].map(n=>star(e.rating>=n)).join('')}</div>${e.note?`<div class="jn">${esc(e.note)}</div>`:''}<div class="jm">${new Date(e.at).toLocaleDateString(LOCALE(),{day:'numeric',month:'short',year:'numeric'})}${e.temp?' · '+e.temp+' °C':''}${e.hours?' · '+String(e.hours).replace('.',LANG==='de'?',':'.')+' '+esc(tr('Std')):''}</div><div class="ja">${e.photo?`<button data-ask="${e.id}">${ICON('chat')} ${esc(tr('COACH FRAGEN'))}</button>`:''}<button data-del="${e.id}" aria-label="${esc(tr('Entfernen'))}">${ICON('trash')}</button></div></div></div>`).join('')
    :`<p class="muted" style="margin:8px 0 0">${esc(tr('Noch keine Einträge.'))}</p>`;
  $('jList').querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{
    if(!confirm(tr('Diesen Eintrag löschen?')))return;const id=b.dataset.del;jr=jr.filter(e=>e.id!==id);LS.set('sb_journal',jr);try{await photoDel(id)}catch{}drawJournal()});
  $('jList').querySelectorAll('[data-ask]').forEach(b=>b.onclick=async()=>{
    const e=jr.find(x=>x.id===b.dataset.ask);try{const p=await photoGet(e.id);setPend(await shrink(p));$('chatIn').value=tr('Bewerte bitte die Krume und Kruste meines Brotes ({0}) und gib mir einen Tipp.',td(e.bread));goTab('chat')}catch{toast(tr('Das Bild konnte nicht gelesen werden.'))}});
  // Vorschaubilder erst nach dem Zeichnen aus IndexedDB laden
  $('jList').querySelectorAll('img[data-ph]').forEach(async im=>{try{im.src=await photoGet(im.dataset.ph)}catch{}});
}
function openJournal(d){
  jRating=0;jPhotoData=null;$('jPrev').hidden=true;$('jNote').value='';
  $('jBread').value=d&&d.bread?td(d.bread):'';$('jTemp').value=d&&d.temp?d.temp:temp;$('jHours').value=d&&d.hours?d.hours:'';
  $('jForm').hidden=false;drawJournal();$('jForm').scrollIntoView({behavior:'smooth',block:'center'});
}
$('jNew').onclick=()=>openJournal(jDraft);
$('jCancel').onclick=()=>{$('jForm').hidden=true;drawJournal()};
$('jPhotoBtn').onclick=()=>$('jPhoto').click();
$('jPhoto').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
  try{jPhotoData=await shrink(f,900,.72);$('jPrev').src=jPhotoData;$('jPrev').hidden=false}catch{toast(tr('Das Bild konnte nicht gelesen werden.'))}};
$('jSave').onclick=async()=>{
  const name=$('jBread').value.trim();if(!name)return toast(tr('Bitte gib dem Brot einen Namen.'));
  const e={id:'j'+Date.now().toString(36),at:Date.now(),bread:name,rating:jRating,temp:Math.round(+$('jTemp').value)||0,hours:Math.round((+$('jHours').value||0)*10)/10,note:$('jNote').value.trim().slice(0,400),photo:false};
  let msg=tr('Eintrag gespeichert.');
  if(jPhotoData){try{await photoPut(e.id,jPhotoData);e.photo=true}catch{msg=tr('Das Foto konnte nicht gespeichert werden (Speicher voll oder privater Modus). Der Eintrag wurde ohne Foto gespeichert.')}}
  jr=[e,...jr].slice(0,100);LS.set('sb_journal',jr);jDraft=null;LS.del('sb_jdraft');
  $('jForm').hidden=true;drawJournal();toast(msg);
};

/* ---------- Optionen: Sprache, Darstellung, Daten, Datenschutz ---------- */
const theme=()=>LS.get('sb_theme','auto');
function applyTheme(){
  const t=theme(),el=document.documentElement;
  if(t==='dark'||t==='light')el.setAttribute('data-theme',t);else el.removeAttribute('data-theme');
  const m=document.querySelector('meta[name=theme-color]');if(m)m.content=getComputedStyle(document.body).backgroundColor;
}
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',applyTheme);
function settingsUI(){
  document.querySelectorAll('#langSeg button').forEach(b=>b.classList.toggle('on',b.dataset.l===LANG));
  document.querySelectorAll('#themeSeg button').forEach(b=>b.classList.toggle('on',b.dataset.th===theme()));
  const L=[[tr('Was auf deinem Gerät gespeichert wird'),tr('Plan, Starter, Rezepte, Chat, Einstellungen und dein API-Key (falls eingetragen) bleiben in diesem Browser. Unter „Meine Daten“ kannst du alles exportieren oder löschen.')],
    [tr('Was an Server geht'),tr('Die Brotsorten kommen von unserem Server (Supabase, EU). Für Erinnerungen bei geschlossener App speichert der Server dein Push-Abo sowie Zeitpunkte und Texte der Erinnerungen, bis sie verschickt sind. Gegen Missbrauch wird deine IP-Adresse kurz für Zähler genutzt.')],
    [tr('Coach'),tr('Fragen und Fotos gehen an Google (Gemini). Mit eigenem Key direkt von deinem Gerät, ohne eigenen Key über unseren Server, der nur eine zufällige Geräte-ID für das Tageslimit speichert. Schick keine Fotos von Personen oder privaten Dingen.')],
    [tr('Rezepte'),tr('Links, Ordner und Notizen bleiben auf deinem Gerät. Die App liest keine fremden Rezeptseiten aus.')]];
  $('legal').innerHTML=L.map(([h,p])=>`<h3>${esc(h)}</h3><p>${esc(p)}</p>`).join('')+(CONTACT?`<h3>${esc(tr('Kontakt'))}</h3><p>${esc(CONTACT)}</p>`:'');
}
function setLang(l){
  LANG=l;LS.set('sb_lang',l);applyLang();refreshAll();
}
document.querySelectorAll('#langSeg button').forEach(b=>b.onclick=()=>setLang(b.dataset.l));
document.querySelectorAll('#themeSeg button').forEach(b=>b.onclick=()=>{LS.set('sb_theme',b.dataset.th);applyTheme();settingsUI()});
$('goKey').onclick=()=>{goTab('chat');$('keyBox').open=true};
$('dataExp').onclick=()=>{
  const o={};Object.keys(localStorage).filter(k=>k.startsWith('sb_')&&k!=='sb_key'&&k!=='sb_breads').forEach(k=>o[k]=LS.get(k,null));
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(o,null,1)],{type:'application/json'}));a.download='lildough-daten.json';a.click();
};
$('dataDel').onclick=async()=>{
  if(!confirm(tr('Wirklich alles löschen? Plan, Starter, Rezepte, Chat und Einstellungen auf diesem Gerät sind dann weg.')))return;
  try{await pushCall({action:'cancel',endpoint:pushEp||(await (await navigator.serviceWorker.ready).pushManager.getSubscription())?.endpoint})}catch{}
  try{const s=await (await navigator.serviceWorker.ready).pushManager.getSubscription();await s?.unsubscribe()}catch{}
  Object.keys(localStorage).filter(k=>k.startsWith('sb_')).forEach(k=>localStorage.removeItem(k));
  try{indexedDB.deleteDatabase('lildough')}catch{}
  location.reload();
};

/* ---------- Sprache neu zeichnen ---------- */
function syncTempUI(){document.querySelectorAll('.tempIn').forEach(i=>{if(document.activeElement!==i)i.value=temp});document.querySelectorAll('.tempNote').forEach(e=>e.textContent=tempNote())}
function refreshAll(){
  fillFeedRatio();syncTempUI();fillFlours();waterGuide();feedGuide();fillSelects();modeLabels();preview();
  render();drawPet();drawCk();drawChat();keyState();notifState();updateHints();settingsUI();drawJournal();
}

/* ---------- Start ---------- */
quietUI();applyTheme();fillFeedRatio();syncTempUI();fillFlours();$('wFlour').value=1;waterGuide();feedGuide();
keyState();drawChat();drawCk();drawPet();updateHints();settingsUI();notifState();drawJournal();loadBreads();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
