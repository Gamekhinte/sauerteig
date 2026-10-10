'use strict';
/* Zusätzliche Brotsorten, die fest in der App stehen und mit den Sorten aus Supabase zusammengeführt werden.
   fl = Mehlsorten mit Anteil am Gesamtmehl, extras = weitere Zutaten in % vom Mehl. */
const st=(title,minutes,description)=>({title,minutes,description});
const S_START=[
  st('Starter füttern',360,'Füttere deinen Sauerteig-Starter und stelle ihn warm. Er ist bereit, wenn er sich etwa verdoppelt hat und Blasen wirft.'),
  st('Mehl und Wasser mischen',30,'Mehl und Wasser nur grob verrühren, ohne Starter und Salz. Abdecken und quellen lassen (Autolyse).'),
  st('Starter und Salz einarbeiten',10,'Starter und Salz zugeben und alles zu einem glatten Teig verkneten oder falten.')
];
const S_FOLD=[
  st('Dehnen und Falten',120,'Alle 30 Minuten den Teig einmal dehnen und falten, insgesamt 4 Runden. Danach abgedeckt weiterruhen.'),
  st('Teig ruhen lassen',120,'Teig abgedeckt bei Raumtemperatur ruhen lassen, bis er sichtbar aufgegangen ist und luftig wirkt.')
];
const S_POT=[
  st('Teig formen',15,'Teig vorsichtig auf die bemehlte Arbeitsfläche geben, rund oder lang formen und mit dem Schluss nach oben in den Gärkorb legen.'),
  st('Stückgare',720,'Brot abgedeckt gehen lassen, gerne über Nacht im Kühlschrank.'),
  st('Ofen und Topf vorheizen',45,'Gusseisentopf mit Deckel im Ofen auf 250 Grad Ober-/Unterhitze vorheizen.'),
  st('Backen mit Deckel',25,'Brot einschneiden, in den heißen Topf setzen und mit Deckel backen. So entsteht Dampf für die Kruste.'),
  st('Backen ohne Deckel',20,'Deckel abnehmen, Temperatur auf 220 Grad senken und goldbraun fertig backen.'),
  st('Auskühlen lassen',60,'Brot auf einem Gitter komplett auskühlen lassen, bevor du es anschneidest.')
];
const withStep=(arr,after,step)=>{const i=arr.findIndex(s=>s.title===after);return [...arr.slice(0,i+1),step,...arr.slice(i+1)]};
const mk=(n,slug,name,tagline,fpp,hyd,sta,salt,steps,o={})=>({id:'x-'+slug,slug,name,tagline,emoji:'',flour_per_person_g:fpp,hydration_pct:hyd,starter_pct:sta,salt_pct:salt,extras:o.extras||[],fl:o.fl||null,sort_order:100+n,
  bread_steps:steps.map((s,i)=>({...s,position:i+1,id:`x-${slug}-${i}`}))});

const EXTRA_BREADS=[
  mk(1,'mischbrot','Weizen-Roggen-Mischbrot','Kräftig im Geschmack, saftige Krume',60,75,20,2,[...S_START,...S_FOLD,...S_POT],
    {fl:[['Weizenmehl 550',.5],['Roggenmehl 1150',.5]]}),
  mk(2,'walnuss','Walnussbrot','Nussig und aromatisch',60,72,20,2,
    [...S_START,...withStep(S_FOLD,'Dehnen und Falten',st('Walnüsse einarbeiten',10,'Gehackte Walnüsse in der letzten Faltrunde vorsichtig unterarbeiten.')),...S_POT],
    {fl:[['Weizenmehl 550',.7],['Vollkornmehl (Weizen)',.3]],extras:[{name:'Walnüsse (gehackt)',pct:25}]}),
  mk(3,'kartoffel','Kartoffelbrot','Besonders weich und lange frisch',60,65,20,2,
    [...S_START,...S_FOLD,...S_POT],{fl:[['Weizenmehl 550',1]],extras:[{name:'Kartoffeln (gekocht, zerdrückt)',pct:30}]}),
  mk(4,'sonnenblumen','Sonnenblumenkernbrot','Knackig mit viel Biss',60,74,20,2,
    [...S_START,...withStep(S_FOLD,'Dehnen und Falten',st('Kerne einarbeiten',10,'Angeröstete Sonnenblumenkerne in der letzten Faltrunde unterarbeiten.')),...S_POT],
    {fl:[['Weizenmehl 550',.6],['Dinkelmehl 630',.4]],extras:[{name:'Sonnenblumenkerne (geröstet)',pct:20}]}),
  mk(5,'ciabatta','Ciabatta','Grobporig, leicht und knusprig',70,82,15,2,[
    st('Starter füttern',360,'Füttere deinen Sauerteig-Starter und stelle ihn warm, bis er sich verdoppelt hat.'),
    st('Mehl und Wasser mischen',45,'Mehl und Wasser verrühren, abdecken und quellen lassen (Autolyse).'),
    st('Starter, Salz und Öl einarbeiten',10,'Starter, Salz und Olivenöl zugeben und zu einem sehr weichen, klebrigen Teig verarbeiten.'),
    st('Dehnen und Falten',120,'Alle 30 Minuten den nassen Teig mit feuchten Händen dehnen und falten, insgesamt 4 Runden.'),
    st('Teig ruhen lassen',90,'Abgedeckt ruhen lassen, bis der Teig deutlich aufgegangen und blasig ist.'),
    st('Teig teilen und formen',15,'Teig ganz vorsichtig auf eine stark bemehlte Fläche geben, in Rechtecke teilen und auf Backpapier legen, ohne die Luft rauszudrücken.'),
    st('Stückgare',60,'Abgedeckt noch einmal gehen lassen. Währenddessen Ofen mit Backstein oder Blech auf 250 Grad vorheizen.'),
    st('Backen',25,'Mit Dampf (Schale mit heißem Wasser im Ofen) bei 250 Grad backen, bis die Kruste goldbraun ist.'),
    st('Auskühlen lassen',30,'Auf einem Gitter auskühlen lassen.')
  ],{fl:[['Weizenmehl 550',1]],extras:[{name:'Olivenöl',pct:3}]}),
  mk(6,'baguette','Baguette','Dünne Kruste, luftiges Inneres',60,70,15,2,[
    ...S_START,
    st('Dehnen und Falten',120,'Alle 30 Minuten den Teig einmal dehnen und falten, insgesamt 4 Runden. Danach abgedeckt weiterruhen.'),
    st('Teig ruhen lassen',60,'Abgedeckt bei Raumtemperatur ruhen lassen, bis er luftig aufgegangen ist.'),
    st('Teig teilen und formen',20,'Teig teilen, locker vorformen, 15 Minuten entspannen lassen und dann zu langen Baguettes ausrollen.'),
    st('Stückgare',60,'Auf einem bemehlten Leinentuch abgedeckt gehen lassen. Ofen mit Backstein auf 250 Grad vorheizen.'),
    st('Backen',25,'Baguettes mehrfach schräg einschneiden, mit reichlich Dampf backen, nach 10 Minuten den Dampf ablassen.'),
    st('Auskühlen lassen',30,'Auf einem Gitter auskühlen lassen.')
  ],{fl:[['Weizenmehl 550',1]]}),
  mk(7,'broetchen','Sauerteig-Brötchen','Knusprige Brötchen fürs Frühstück',100,62,20,2,[
    ...S_START,
    st('Dehnen und Falten',120,'Alle 30 Minuten den Teig einmal dehnen und falten, insgesamt 4 Runden. Danach abgedeckt weiterruhen.'),
    st('Teig ruhen lassen',60,'Abgedeckt ruhen lassen, bis der Teig aufgegangen ist.'),
    st('Teig teilen und formen',20,'In gleich große Stücke (ca. 80 g) teilen und rund oder länglich formen.'),
    st('Stückgare',90,'Abgedeckt auf dem Blech gehen lassen. Ofen auf 240 Grad mit Schale für Wasser vorheizen.'),
    st('Backen',22,'Brötchen einschneiden, Wasser in die Schale geben und bei 240 Grad goldbraun backen.'),
    st('Auskühlen lassen',20,'Kurz auf einem Gitter auskühlen lassen.')
  ],{fl:[['Weizenmehl 550',1]],extras:[{name:'Butter (weich)',pct:4}]}),
  mk(8,'focaccia','Focaccia','Fluffig, ölig und mit Meersalz',70,80,15,2,[
    st('Starter füttern',360,'Füttere deinen Sauerteig-Starter und stelle ihn warm, bis er sich verdoppelt hat.'),
    st('Mehl und Wasser mischen',30,'Mehl und Wasser verrühren, abdecken und quellen lassen (Autolyse).'),
    st('Starter, Salz und Öl einarbeiten',10,'Starter, Salz und die Hälfte des Olivenöls zugeben und zu einem weichen Teig verarbeiten.'),
    st('Dehnen und Falten',120,'Alle 30 Minuten den Teig dehnen und falten, insgesamt 4 Runden.'),
    st('Teig ruhen lassen',240,'Abgedeckt ruhen lassen, am besten im Kühlschrank für mehr Aroma, bis er blasig ist.'),
    st('In die Form geben',20,'Blech oder Form großzügig mit Öl einfetten, Teig hineingeben und mit den Fingern bis in die Ecken dehnen.'),
    st('Stückgare',90,'Abgedeckt gehen lassen. Ofen auf 230 Grad vorheizen.'),
    st('Backen',25,'Mit den Fingern Mulden eindrücken, mit Öl, Salz und Rosmarin belegen und goldbraun backen.'),
    st('Auskühlen lassen',20,'Kurz auf einem Gitter auskühlen lassen und lauwarm genießen.')
  ],{fl:[['Weizenmehl 550',1]],extras:[{name:'Olivenöl',pct:6}]}),
  mk(9,'glutenfrei','Glutenfreies Buchweizenbrot','Saftig, ohne Weizen, mit Flohsamenschalen',60,95,20,2,[
    st('Starter füttern',360,'Füttere deinen glutenfreien Starter (z. B. aus Buchweizenmehl) und stelle ihn warm, bis er sich deutlich vergrößert hat und Blasen wirft.'),
    st('Flohsamenschalen quellen lassen',20,'Flohsamenschalen mit dem Wasser verrühren und quellen lassen, bis ein Gel entsteht. Das ersetzt das Klebergerüst.'),
    st('Teig anrühren',10,'Mehle, Salz und Starter zum Gel geben und kräftig zu einem weichen, klebrigen Teig verrühren. Er wird nicht geknetet.'),
    st('Teig in die Form geben',10,'Den Teig in eine gefettete Kastenform füllen und mit nassen Händen glatt streichen.'),
    st('Stückgare',240,'Abgedeckt bei Raumtemperatur gehen lassen, bis der Teig sichtbar höher ist und die Oberfläche leicht einreißt.'),
    st('Ofen vorheizen',30,'Ofen auf 230 Grad Ober-/Unterhitze vorheizen und eine Schale mit Wasser auf den Boden stellen.'),
    st('Backen',55,'Das Brot 15 Minuten bei 230 Grad backen, dann auf 200 Grad senken und etwa 40 Minuten fertig backen. Beim Klopfen auf die Unterseite soll es hohl klingen.'),
    st('Auskühlen lassen',180,'Komplett auskühlen lassen, am besten mehrere Stunden. Glutenfreies Brot setzt sich erst beim Auskühlen und schmiert sonst.')
  ],{fl:[['Buchweizenmehl',.5],['Hirsemehl',.3],['Reismehl (Vollkorn)',.2]],extras:[{name:'Flohsamenschalen (gemahlen)',pct:6},{name:'Olivenöl',pct:3}]})
];
