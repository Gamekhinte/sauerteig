'use strict';
/* Sprachen: Deutsch (Quelltexte) und Englisch. tr('Deutscher Text {0}', wert) liefert den Text in der gewählten Sprache. */
let LANG=(()=>{try{const v=JSON.parse(localStorage.getItem('sb_lang'));if(v==='de'||v==='en')return v}catch{}return /^de/i.test(navigator.language||'de')?'de':'en'})();
const LOCALE=()=>LANG==='de'?'de-DE':'en-GB';
// Erfahrung: neu (Neuling), fort (Fortgeschritten), pro (Profi); null = noch nicht gewählt
let LEVEL=(()=>{try{const v=JSON.parse(localStorage.getItem('sb_level'));if(v==='neu'||v==='fort'||v==='pro')return v}catch{}return null})();
// Neulinge bekommen einfachere Wörter statt Fachbegriffen
const JG={
  de:[[/Anstellgut \(Starter\)/g,'Starter'],[/Stückgare/g,'letzte Gehzeit'],[/Autolyse/g,'Quellzeit'],[/Anstellgut/g,'Starter'],[/\bPeak\b/g,'Höchststand'],[/Hydration/g,'Wassermenge'],[/Gärkorb/g,'Gärkörbchen (oder Schüssel mit Tuch)'],[/Krume/g,'Inneres'],[/\bGare\b/g,'Gehzeit']],
  en:[[/final proof/gi,'last rise'],[/autolyse/gi,'soaking rest'],[/\bpeak\b/gi,'highest point'],[/hydration/gi,'water amount'],[/proofing basket/gi,'bowl lined with a cloth'],[/crumb/gi,'inside'],[/proofing/gi,'rising'],[/\bproof\b/gi,'rise']]};
function jg(s){
  if(LEVEL!=='neu')return s;
  return JG[LANG].reduce((t,[re,to])=>t.replace(re,(...a)=>{const off=a[a.length-2],str=a[a.length-1],cap=off===0||/[.:!?]\s$/.test(str.slice(0,off));return cap?to[0].toUpperCase()+to.slice(1):to}),s);
}
const tr=(k,...a)=>jg(((LANG==='en'&&EN[k])||k).replace(/\{(\d)\}/g,(m,i)=>a[+i]??''));
const td=s=>jg(LANG==='en'?(EN_DATA[s]||s):s); // Texte aus den Brotdaten (Namen, Schritte, Zutaten)

// Statische Texte der Seite: Original merken, in der gewählten Sprache anzeigen
function applyLang(){
  document.documentElement.lang=LANG;
  const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
  while(n=w.nextNode()){
    if(n.parentNode.closest('script,style,svg'))continue;
    if(n._de===undefined){if(!n.nodeValue.trim())continue;n._de=n.nodeValue}
    const key=n._de.replace(/\s+/g,' ').trim(),lead=n._de.match(/^\s*/)[0],trail=n._de.match(/\s*$/)[0];
    n.nodeValue=jg(LANG==='en'&&EN[key]?lead+EN[key]+trail:n._de);
  }
  document.querySelectorAll('[placeholder],[aria-label],[alt]').forEach(e=>['placeholder','aria-label','alt'].forEach(a=>{
    if(!e.hasAttribute(a))return;const k='_de_'+a;if(e[k]===undefined)e[k]=e.getAttribute(a);
    e.setAttribute(a,jg(LANG==='en'&&EN[e[k]]?EN[e[k]]:e[k]));
  }));
}

const EN={
/* --- Seite (statisch) --- */
'RUHEZEIT':'QUIET TIME','In dieser Zeit soll nichts anstehen':'Nothing should be due during this time','Von':'From','Bis':'To',
'In der Ruhezeit startet und meldet sich nichts. Lange Gehzeiten über Nacht gehen trotzdem, der nächste Schritt beginnt dann erst, wenn die Ruhezeit vorbei ist.':'Nothing starts or pings you during quiet time. Long rests overnight still work, the next step just begins once quiet time is over.',
'NEUES BROT':'NEW BREAD','Für wie viele Personen?':'For how many people?','Welche Brotsorte?':'Which bread?','Lade Sorten…':'Loading breads…',
'Wo stehst du gerade?':'Where are you right now?','Starter füttern im Verhältnis':'Feed the starter at ratio',
'Startzeit festlegen':'Set start time','Zielzeit festlegen':'Set finish time','Was soll dann fertig sein?':'What should be ready then?',
'Backbeginn im Ofen':'Oven start','Essfertig':'Ready to eat','Brot kommt aus dem Ofen':'Bread comes out of the oven','Essfertig (ausgekühlt)':'Ready to eat (cooled)',
'Wann startest du?':'When do you start?','PLAN ERSTELLEN':'CREATE PLAN','STOPPEN UND ALLES LÖSCHEN':'STOP AND DELETE EVERYTHING',
'ERINNERUNGEN':'REMINDERS',
'Wenn ein Schritt fertig ist, kommt eine Mitteilung, auch bei geschlossener App (Push, kann bis zu 30 Sekunden dauern). Auf dem iPhone klappt das nur, wenn die App über „Zum Home-Bildschirm“ installiert ist. Zur Sicherheit kannst du den Ablauf auch in deinen Kalender laden.':'You get a notification when a step is done, even if the app is closed (push, can take up to 30 seconds). On iPhone this only works if the app is installed via Add to Home Screen. For safety you can also add the schedule to your calendar.',
'AKTIVIEREN':'ENABLE','IN KALENDER':'TO CALENDAR','RECHNER':'CALC','Brotsorte':'Bread','Personen':'People','oder Mehl in g':'or flour in g',
'Der Starter besteht je zur Hälfte aus Mehl und Wasser. Das ist unten schon eingerechnet, du musst nichts abziehen.':'The starter is half flour, half water. That is already counted below, you do not need to subtract anything.',
'WASSER-GUIDE':'WATER GUIDE','Jedes Mehl nimmt unterschiedlich viel Wasser auf. Such dein Mehl aus und gib die Menge ein.':'Every flour absorbs a different amount of water. Pick your flour and enter the amount.',
'Mehlsorte':'Flour type','Mehl in g':'Flour in g',
'Das sind nur Richtwerte, je nach Mehl und Quellzeit kann es abweichen. Lass beim ersten Mischen 20 bis 30 g Wasser weg und gib sie dazu, wenn der Teig sie braucht.':'These are only rough values, it can vary with the flour and soaking time. Leave out 20 to 30 g of water at first and add it if the dough needs it.',
'BROT-COACH (GEMINI)':'BREAD COACH (GEMINI)','API KEY':'API KEY','SPEICHERN':'SAVE','LÖSCHEN':'DELETE',
'Gibt es kostenlos auf aistudio.google.com/apikey. Der Key bleibt in diesem Browser und geht nur an Google.':'Free at aistudio.google.com/apikey. The key stays in this browser and only goes to Google.',
'Fotos werden vorher auf 384 px verkleinert und nur einmal mitgeschickt, das spart Tokens.':'Photos are shrunk to 384 px first and only sent once, which saves tokens.',
'STARTER ANLEGEN':'CREATE STARTER','Wie heißt dein Starter, wie alt ist er und wann hast du ihn zuletzt gefüttert?':'What is your starter called, how old is it and when did you last feed it?',
'Name':'Name','Alter in Tagen':'Age in days','Gefüttert vor (Std)':'Fed (hours ago)','HABE GEFÜTTERT':'I FED IT',
'Tippe hier, nachdem du deinen echten Starter gefüttert hast. Mit regelmäßigem Füttern und gebackenen Broten steigt er im Level und bekommt neues Zubehör.':'Tap here after you fed your real starter. Regular feeding and baked breads level it up and unlock new accessories.',
'ANPASSEN':'CUSTOMIZE','Farbe':'Color','Augen':'Eyes','Zubehör':'Accessory','STARTER LÖSCHEN':'DELETE STARTER',
'FÜTTERN-GUIDE':'FEEDING GUIDE','Verhältnis':'Ratio','Anstellgut (g)':'Starter (g)',
'Richtwerte bei 21 bis 22 °C. Wie lange dein Starter wirklich braucht, hängt von Mehl, Temperatur und Aktivität ab. Über das Verhältnis steuerst du die Reifezeit.':'Rough values at 21 to 22 °C. How long your starter really takes depends on flour, temperature and activity. The ratio lets you steer the ripening time.',
'MEINE REZEPTE':'MY RECIPES','UMBENENNEN':'RENAME','ORDNER LÖSCHEN':'DELETE FOLDER',
'SPRACHE':'LANGUAGE','Deutsch':'Deutsch','English':'English','DARSTELLUNG':'APPEARANCE','Automatisch':'Automatic','Hell':'Light','Dunkel':'Dark',
'BENACHRICHTIGUNGEN':'NOTIFICATIONS','BROT-COACH':'BREAD COACH','API-KEY ÄNDERN':'CHANGE API KEY','MEINE DATEN':'MY DATA',
'Alles liegt nur auf diesem Gerät. Der API-Key ist nicht im Export enthalten.':'Everything is stored only on this device. The API key is not part of the export.',
'EXPORTIEREN':'EXPORT','ALLES LÖSCHEN':'DELETE EVERYTHING','DATENSCHUTZ':'PRIVACY',
'BACKEN':'BAKE','COACH':'COACH','STARTER':'STARTER','REZEPTE':'RECIPES','OPTIONEN':'SETTINGS',
'z. B. 4':'e.g. 4','z. B. 80':'e.g. 80','API Key einfügen':'Paste API key','Foto':'Photo','Foto entfernen':'Remove photo','Foto anhängen':'Attach photo',
'Frag etwas zu deinem Teig…':'Ask something about your dough…','Senden':'Send','z. B. Blubb':'e.g. Bubbles','unbekannt':'unknown',
'Wie heißt dein Starter?':'What is your starter called?','Rezept-Link(s) einfügen':'Paste recipe link(s)','Aus Zwischenablage einfügen':'Paste from clipboard','Rezept hinzufügen':'Add recipe',
/* --- Meldungen und dynamische Texte --- */
'Brotsorten konnten nicht geladen werden. Bitte Internet prüfen.':'Breads could not be loaded. Please check your internet.',
'passt zu deinen Rezepten':'matches your recipes','Meine Rezepte':'My recipes',
'Eigenes Rezept · {0} Schritte. Die Dauer der Schritte wurde aus deinem Text abgelesen und kann abweichen.':'Own recipe · {0} steps. Step durations were read from your text and may be off.',
'Das Rezept braucht ca. {0} g Starter. Füttere dafür z. B. {1} g Anstellgut mit {2} Wasser und {3} Mehl ({4}).':'The recipe needs about {0} g of starter. For that, feed e.g. {1} g starter with {2} water and {3} flour ({4}).',
'{0}. Teig: {1}% Wasser, {2}% Starter, {3}% Salz (bezogen auf das Mehl).':'{0}. Dough: {1}% water, {2}% starter, {3}% salt (relative to the flour).',
'Aus deinen Rezepten:':'From your recipes:','Starter {0} (aktiv)':'Starter {0} (active)','Person':'person','Personen':'people',
'Für {0} Mehl:':'For {0} flour:','Für {0}:':'For {0}:','Gib Personen oder eine Menge ein.':'Enter people or an amount.',
'Wasser-Check: {0} % Wasser, für {1} üblich sind {2} bis {3} %. Der Teig wird eher fest.':'Water check: {0} % water, usual for {1} is {2} to {3} %. The dough will be rather firm.',
'Wasser-Check: {0} % Wasser, für {1} üblich sind {2} bis {3} %. Der Teig wird feucht. Lass beim Mischen 20 bis 30 g Wasser weg und gib sie nur zu, wenn nötig.':'Water check: {0} % water, usual for {1} is {2} to {3} %. The dough will be wet. Leave out 20 to 30 g of water when mixing and only add it if needed.',
'Wasser-Check: {0} % Wasser passen zu {1} (üblich {2} bis {3} %).':'Water check: {0} % water suits {1} (usual {2} to {3} %).',
'Gib die Mehlmenge ein.':'Enter the flour amount.','Wasser':'Water','Hydration':'Hydration','Zurückhalten beim Mischen':'Hold back when mixing',
'Bis dahin reicht die Zeit nicht mehr. Frühestens möglich: {0} um {1}.':'There is not enough time left. Earliest possible: {0} at {1}.',
'Dafür musst du {0} starten.':'You need to start {0}.',
'Voraussichtlich Backbeginn im Ofen {0} · essfertig {1}.':'Expected oven start {0} · ready to eat {1}.',
'Wie im Rezept ({0})':'As in the recipe ({0})','Peak nach {0} bis {1} Std':'Peak after {0} to {1} h',
'Bis wann soll es fertig sein?':'By when should it be ready?',
'Bitte die Personenzahl eingeben.':'Please enter the number of people.',
'Bis dahin reicht die Zeit nicht ganz: {0} erst um {1}.':'There is not quite enough time: {0} only at {1}.',
'Start auf {0} verschoben (Ruhezeit).':'Start moved to {0} (quiet time).',
'Plan wirklich stoppen? Der Ablauf und alle Erinnerungen werden gelöscht.':'Really stop the plan? The schedule and all reminders will be deleted.',
'Plan gestoppt und gelöscht.':'Plan stopped and deleted.','Std':'h','Min':'min',
'Ziel: {0} um {1}.':'Goal: {0} at {1}.','Voraussichtlich: {0} {1}.':'Expected: {0} {1}.',
'Das ist ca. {0} später als geplant.':'That is about {0} later than planned.',
'Das ist ca. {0} früher. Verlängere die Stückgare im Kühlschrank.':'That is about {0} earlier. Extend the final proof in the fridge.',
'Dauer: {0}':'Duration: {0}','Erinnerung alle 30 Min':'Reminder every 30 min','Wegen der Ruhezeit erst um {0}.':'Only at {0} because of the quiet time.',
'FERTIG, GUTEN APPETIT':'DONE, ENJOY','SCHRITT ERLEDIGT':'STEP DONE',
'Fertig! Lass es gut auskühlen. {0} bekommt +50 XP.':'Done! Let it cool well. {0} gets +50 XP.','Fertig! Lass es gut auskühlen.':'Done! Let it cool well.',
'Dehnen und Falten':'Stretch and fold','Runde {0} von 4: Teig einmal dehnen und falten.':'Round {0} of 4: stretch and fold the dough once.',
'{0}: fertig':'{0}: done','Weiter mit: {0}':'Next: {0}','Dein Brot ist durch. Gut auskühlen lassen!':'Your bread is done. Let it cool well!',
'Dieses Gerät unterstützt keine Browser-Benachrichtigungen. Auf dem iPhone zuerst „Zum Home-Bildschirm“ wählen.':'This device does not support browser notifications. On iPhone first choose “Add to Home Screen”.',
'Benachrichtigungen sind aktiv, auch bei geschlossener App (Push).':'Notifications are on, even when the app is closed (push).',
'Benachrichtigungen sind aktiv, solange die App offen ist. Push im Hintergrund wird eingerichtet …':'Notifications are on while the app is open. Background push is being set up …',
'Benachrichtigungen sind blockiert. Erlaube sie in den Browser- oder Handy-Einstellungen für diese Seite.':'Notifications are blocked. Allow them in your browser or phone settings for this site.',
'Noch nicht aktiviert.':'Not enabled yet.',
'Dieses Gerät unterstützt keine Benachrichtigungen im Browser. Auf dem iPhone zuerst „Zum Home-Bildschirm“ wählen.':'This device does not support notifications in the browser. On iPhone first choose “Add to Home Screen”.',
'Benachrichtigungen sind aktiv.':'Notifications are on.','Benachrichtigungen wurden nicht erlaubt.':'Notifications were not allowed.',
'Test':'Test','So melde ich mich, wenn ein Schritt ansteht.':'This is how I will notify you when a step is due.',
'Alle':'All','Ohne Ordner':'No folder','Ordner':'Folder','Name des neuen Ordners':'Name of the new folder',
'Zutaten (eine pro Zeile)':'Ingredients (one per line)','Schritte (eine pro Zeile, Zeiten wie „30 Min“ werden erkannt)':'Steps (one per line, times like “30 min” are recognized)',
'PLAN AUS NOTIZEN':'PLAN FROM NOTES','NOTIZEN':'NOTES','Entfernen':'Remove',
'In diesem Ordner ist noch nichts.':'This folder is empty.','Noch keine Rezepte. Teile eines mit dieser App oder füge einen Link ein.':'No recipes yet. Share one to this app or paste a link.',
'Neuer Name':'New name','Ordner „{0}“ löschen? Die Rezepte bleiben erhalten.':'Delete folder “{0}”? The recipes are kept.',
'1 Rezept hinzugefügt.':'1 recipe added.','{0} Rezepte hinzugefügt.':'{0} recipes added.','Bitte einen gültigen Link einfügen.':'Please paste a valid link.','Schon in der Liste.':'Already in the list.',
'Die Zwischenablage ist leer.':'The clipboard is empty.','Zugriff auf die Zwischenablage nicht erlaubt. Füge den Link bitte ins Feld ein.':'Clipboard access not allowed. Please paste the link into the field.',
'Auf dem iPhone kann diese App nicht im Teilen-Menü auftauchen. Kopiere den Link des Rezepts und tippe hier auf das Einfügen-Symbol neben dem Feld. Mehrere Links gehen auch. Zutaten und Schritte schreibst du selbst bei „Notizen“.':'On iPhone this app cannot show up in the share menu. Copy the recipe link and tap the paste icon next to the field. Several links work too. You write ingredients and steps yourself under Notes.',
'Tippe beim Rezept auf Teilen und wähle diese App. Wird sie nicht angezeigt, installiere die App neu (Menü, „App installieren“). Sonst Link kopieren und das Einfügen-Symbol nutzen. Zutaten und Schritte schreibst du selbst bei „Notizen“.':'On the recipe tap Share and pick this app. If it is not shown, install the app again (menu, Install app). Otherwise copy the link and use the paste icon. You write ingredients and steps yourself under Notes.',
'Im Teilen-Menü erscheint die App nur, wenn sie richtig installiert ist (Chrome-Menü, „App installieren“, nicht nur „Zum Startbildschirm“). Sonst Link kopieren und das Einfügen-Symbol nutzen. Zutaten und Schritte schreibst du selbst bei „Notizen“.':'The app only shows in the share menu when it is properly installed (Chrome menu, Install app, not just Add to Home screen). Otherwise copy the link and use the paste icon. You write ingredients and steps yourself under Notes.',
'Rezept übernommen.':'Recipe added.','Das war kein gültiger Link.':'That was not a valid link.','Das Rezept ist schon in der Liste.':'The recipe is already in the list.',
'Schritt':'Step','Schreibe zuerst mindestens einen Schritt unter „Notizen“ auf.':'First write down at least one step under “Notes”.',
'„{0}“ ist ausgewählt. Es läuft aber schon ein Plan: Stoppe ihn zuerst.':'“{0}” is selected. A plan is already running though: stop it first.',
'„{0}“ ist ausgewählt. Wähle jetzt die Zeit und erstelle den Plan.':'“{0}” is selected. Now choose the time and create the plan.',
'gespeichert ({0})':'saved ({0})','fehlt':'missing',
'Eigener Key gespeichert. Die Anfragen gehen direkt von deinem Gerät an Google, ohne Limit der App.':'Own key saved. Requests go straight from your device to Google, without the app limit.',
'Ohne eigenen Key nutzt der Coach den App-Zugang, falls eingerichtet, mit Tageslimit. Mit eigenem Key (kostenlos bei Google) gibt es kein Limit.':'Without your own key the coach uses the app access, if set up, with a daily limit. With your own key (free from Google) there is no limit.',
'Key gespeichert.':'Key saved.',
'Hi, ich bin dein Brot-Coach. Frag mich, was dich beim Sauerteig beschäftigt, zum Beispiel zu Starter, Gare oder Kruste. Fotos von Teig oder Brot kannst du mir auch schicken.':'Hi, I am your bread coach. Ask me anything about sourdough, like starter, proofing or crust. You can send photos of your dough or bread too.',
'Das Bild konnte nicht gelesen werden.':'The image could not be read.','(keine Antwort)':'(no answer)',
'Das Tageslimit des App-Coachs ist erreicht. Trage deinen eigenen Key ein, dann gibt es kein Limit.':'The daily limit of the app coach is reached. Enter your own key, then there is no limit.',
'Was siehst du auf dem Foto? Was sollte ich tun?':'What do you see in the photo? What should I do?',
'Bitte zuerst oben deinen Gemini API Key speichern.':'Please save your Gemini API key above first.','Fehler: {0}':'Error: {0}',
'Level-up: {0} ist jetzt Level {1}.':'Level up: {0} is now level {1}.','Gefüttert, +5 XP für {0}.':'Fed, +5 XP for {0}.','{0} ist schon satt.':'{0} is already full.',
'Level {0} · {1} · {2} {3} alt · {4} {5} gebacken':'Level {0} · {1} · {2} {3} old · {4} {5} baked','Tag':'day','Tage':'days','Brot':'bread','Brote':'breads',
'{0} wurde noch nie gefüttert und hat Hunger.':'{0} has never been fed and is hungry.',
'{0} ist satt und zufrieden (zuletzt gefüttert vor {1} Std).':'{0} is full and happy (last fed {1} h ago).',
'{0} wird hungrig. Zuletzt gefüttert vor {1} Std.':'{0} is getting hungry. Last fed {1} h ago.',
'{0} hat großen Hunger. Zuletzt gefüttert vor {1} Tg {2} Std.':'{0} is very hungry. Last fed {1} d {2} h ago.',
'(ab Lv {0})':'(from lvl {0})','{0} ist jetzt dabei.':'{0} has joined.','{0} wirklich löschen? Level und Aussehen gehen verloren.':'Really delete {0}? Level and looks will be lost.',
'Gib die Menge Anstellgut ein.':'Enter the amount of starter.','Anstellgut (Starter)':'Starter','Mehl':'Flour','Gesamt':'Total','Peak nach':'Peak after',
'Was auf deinem Gerät gespeichert wird':'What is stored on your device',
'Plan, Starter, Rezepte, Chat, Einstellungen und dein API-Key (falls eingetragen) bleiben in diesem Browser. Unter „Meine Daten“ kannst du alles exportieren oder löschen.':'Plan, starter, recipes, chat, settings and your API key (if entered) stay in this browser. Under My data you can export or delete everything.',
'Was an Server geht':'What goes to servers',
'Die Brotsorten kommen von unserem Server (Supabase, EU). Für Erinnerungen bei geschlossener App speichert der Server dein Push-Abo sowie Zeitpunkte und Texte der Erinnerungen, bis sie verschickt sind. Gegen Missbrauch wird deine IP-Adresse kurz für Zähler genutzt.':'The breads come from our server (Supabase, EU). For reminders while the app is closed, the server stores your push subscription plus the times and texts of the reminders until they are sent. To prevent abuse, your IP address is briefly used for counters.',
'Coach':'Coach',
'Fragen und Fotos gehen an Google (Gemini). Mit eigenem Key direkt von deinem Gerät, ohne eigenen Key über unseren Server, der nur eine zufällige Geräte-ID für das Tageslimit speichert. Schick keine Fotos von Personen oder privaten Dingen.':'Questions and photos go to Google (Gemini). With your own key straight from your device, without your own key via our server, which only stores a random device ID for the daily limit. Do not send photos of people or private things.',
'Rezepte':'Recipes','Links, Ordner und Notizen bleiben auf deinem Gerät. Die App liest keine fremden Rezeptseiten aus.':'Links, folders and notes stay on your device. The app does not read other sites’ recipe pages.',
'Kontakt':'Contact','Wirklich alles löschen? Plan, Starter, Rezepte, Chat und Einstellungen auf diesem Gerät sind dann weg.':'Really delete everything? Plan, starter, recipes, chat and settings on this device will be gone.',
/* --- Hinweistexte, Namen --- */
'Schnelle Reifung. Sinnvoll, wenn du zeitnah backen möchtest oder die Aktivität deines Starters beobachten willst.':'Fast ripening. Useful if you want to bake soon or want to watch your starter’s activity.',
'Alltagsfütterung. Praktisch für regelmäßige Fütterungen und zum Auffrischen eines aktiven Starters.':'Everyday feeding. Handy for regular feedings and refreshing an active starter.',
'Ausgewogen: etwas längere Reifezeit bei kräftiger Aktivität.':'Balanced: slightly longer ripening with strong activity.','Längere Reifezeit mit viel frischem Futter.':'Longer ripening with plenty of fresh feed.',
'Längere Reifezeit. Sinnvoll, wenn du morgens fütterst und erst später backen möchtest.':'Longer ripening. Useful if you feed in the morning and bake later.',
'Lange Reifezeit, wenig Anstellgut im Verhältnis zum Futter.':'Long ripening, little starter relative to the feed.',
'Sehr lange Reifezeit. Kann als Vorbereitung auf eine Kühlschrankpause sinnvoll sein.':'Very long ripening. Can be useful as preparation for a fridge break.',
'Weizen 405':'Wheat 405','Weizen 550':'Wheat 550','Weizen 1050':'Wheat 1050','Weizenvollkorn':'Whole wheat','Dinkel 630':'Spelt 630','Dinkel 1050':'Spelt 1050','Dinkelvollkorn':'Whole spelt','Roggen 1150':'Rye 1150','Roggenvollkorn':'Whole rye',
'Weizen: elastisch und gut dehnbar. Verträgt bei guter Glutenentwicklung oft auch höhere Wassermengen.':'Wheat: elastic and stretches well. With good gluten development it often handles more water.',
'Vollkorn braucht meist mehr Wasser, weil Schalenbestandteile und Ballaststoffe zusätzlich Wasser binden.':'Whole grain usually needs more water because bran and fiber bind extra water.',
'Dinkel: weich und dehnbar, aber empfindlicher. Das Klebergerüst leidet bei zu viel Wasser, daher lieber schrittweise zugeben.':'Spelt: soft and stretchy but more delicate. The gluten network suffers from too much water, so add it gradually.',
'Dinkel: weich und dehnbar, aber empfindlicher. Vollkorn braucht dazu mehr Wasser. Lieber schrittweise zugeben.':'Spelt: soft and stretchy but more delicate. Whole grain needs more water. Better add it gradually.',
'Roggen: klebrig und pastös, bindet viel Wasser. Er hat kein elastisches Klebergerüst wie Weizen.':'Rye: sticky and pasty, binds a lot of water. It has no elastic gluten network like wheat.',
'Roggen: klebrig und pastös, bindet viel Wasser. Vollkorn braucht noch mehr, und der Teig bleibt weich und streichfähig.':'Rye: sticky and pasty, binds a lot of water. Whole grain needs even more, and the dough stays soft and spreadable.',
'Creme':'Cream','Gold':'Gold','Roggen':'Rye','Rosa':'Pink','Mint':'Mint','Lila':'Purple',
'Rund':'Round','Fröhlich':'Happy','Müde':'Sleepy','Cool':'Cool','Keins':'None','Kochmütze':'Chef hat','Blume':'Flower','Schleife':'Bow','Krone':'Crown',
'Frischling':'Newbie','Blubberer':'Bubbler','Gärmeister':'Proof master','Sauerteig-Profi':'Sourdough pro','Legende':'Legend'
};

// Brotdaten (Namen, Schritte, Zutaten) auf Englisch
const EN_DATA={
'Klassisches Weizenbrot':'Classic wheat bread','Dinkelbrot':'Spelt bread','Roggenmischbrot':'Rye mix bread','Vollkornbrot':'Whole grain bread','Körnerbrot':'Seeded bread',
'Weizen-Roggen-Mischbrot':'Wheat-rye mixed bread','Walnussbrot':'Walnut bread','Kartoffelbrot':'Potato bread','Sonnenblumenkernbrot':'Sunflower seed bread','Ciabatta':'Ciabatta','Baguette':'Baguette','Sauerteig-Brötchen':'Sourdough rolls','Focaccia':'Focaccia',
'Knusprige Kruste, luftige Krume':'Crisp crust, airy crumb','Mild-nussig und saftig':'Mild, nutty and juicy','Kräftig, würzig, lange frisch':'Hearty, spicy, stays fresh long','Rustikal und sättigend':'Rustic and filling','Knackig mit Saaten':'Crunchy with seeds',
'Kräftig im Geschmack, saftige Krume':'Bold flavor, juicy crumb','Nussig und aromatisch':'Nutty and aromatic','Besonders weich und lange frisch':'Extra soft and stays fresh long','Knackig mit viel Biss':'Crunchy with lots of bite',
'Grobporig, leicht und knusprig':'Open crumb, light and crisp','Dünne Kruste, luftiges Inneres':'Thin crust, airy inside','Knusprige Brötchen fürs Frühstück':'Crusty rolls for breakfast','Fluffig, ölig und mit Meersalz':'Fluffy, oily and with sea salt',
/* Zutaten */
'Mehl':'Flour','Weizenmehl 550':'Wheat flour 550','Dinkelmehl 630':'Spelt flour 630','Vollkornmehl (Weizen)':'Whole wheat flour','Roggenmehl 1150':'Rye flour 1150','Wasser (lauwarm)':'Water (lukewarm)','Sauerteig-Starter (aktiv)':'Sourdough starter (active)','Salz':'Salt',
'Saaten-Mix (Sonnenblumen, Leinsamen, Kürbiskerne)':'Seed mix (sunflower, flax, pumpkin)','Wasser zum Einweichen der Saaten':'Water for soaking the seeds','Walnüsse (gehackt)':'Walnuts (chopped)','Kartoffeln (gekocht, zerdrückt)':'Potatoes (boiled, mashed)',
'Sonnenblumenkerne (geröstet)':'Sunflower seeds (toasted)','Olivenöl':'Olive oil','Butter (weich)':'Butter (soft)',
/* Schritte */
'Starter füttern':'Feed the starter','Füttere deinen Sauerteig-Starter und stelle ihn warm. Er ist bereit, wenn er sich etwa verdoppelt hat und Blasen wirft.':'Feed your sourdough starter and keep it warm. It is ready when it has about doubled and is bubbly.',
'Mehl und Wasser mischen':'Mix flour and water','Mehl und Wasser nur grob verrühren, ohne Starter und Salz. Abdecken und quellen lassen (Autolyse).':'Just roughly stir flour and water, without starter and salt. Cover and let it soak (autolyse).',
'Starter und Salz einarbeiten':'Work in starter and salt','Starter und Salz zugeben und alles zu einem glatten Teig verkneten oder falten.':'Add starter and salt and knead or fold everything into a smooth dough.',
'Dehnen und Falten':'Stretch and fold','Alle 30 Minuten den Teig einmal dehnen und falten, insgesamt 4 Runden. Danach abgedeckt weiterruhen.':'Stretch and fold the dough once every 30 minutes, 4 rounds in total. Then let it rest covered.',
'Teig ruhen lassen':'Let the dough rest','Teig abgedeckt bei Raumtemperatur ruhen lassen, bis er sichtbar aufgegangen ist und luftig wirkt.':'Let the dough rest covered at room temperature until it has visibly risen and looks airy.',
'Teig formen':'Shape the dough','Teig vorsichtig auf die bemehlte Arbeitsfläche geben, rund oder lang formen und mit dem Schluss nach oben in den Gärkorb legen.':'Gently place the dough on the floured surface, shape it round or long and put it seam side up in the proofing basket.',
'Stückgare':'Final proof','Brot abgedeckt gehen lassen. Beim Weizen, Dinkel, Vollkorn und Körnerbrot gerne über Nacht im Kühlschrank, Roggen bleibt kurz bei Raumtemperatur.':'Let the bread proof covered. Wheat, spelt, whole grain and seeded bread are fine overnight in the fridge, rye stays briefly at room temperature.',
'Ofen und Topf vorheizen':'Preheat oven and pot','Gusseisentopf mit Deckel im Ofen auf 250 Grad Ober-/Unterhitze vorheizen.':'Preheat a cast iron pot with lid in the oven at 250 °C (482 °F) top and bottom heat.',
'Backen mit Deckel':'Bake with lid','Brot einschneiden, in den heißen Topf setzen und mit Deckel backen. So entsteht Dampf für die Kruste.':'Score the bread, put it in the hot pot and bake with the lid on. This creates steam for the crust.',
'Backen ohne Deckel':'Bake without lid','Deckel abnehmen, Temperatur auf 220 Grad senken und goldbraun fertig backen.':'Remove the lid, lower the temperature to 220 °C (428 °F) and bake until golden brown.',
'Auskühlen lassen':'Let it cool','Brot auf einem Gitter komplett auskühlen lassen, bevor du es anschneidest. Die Krume setzt sich noch.':'Let the bread cool completely on a rack before cutting. The crumb is still setting.',
'Brot abgedeckt gehen lassen, gerne über Nacht im Kühlschrank.':'Let the bread proof covered, preferably overnight in the fridge.',
'Brot auf einem Gitter komplett auskühlen lassen, bevor du es anschneidest.':'Let the bread cool completely on a rack before cutting.',
'Walnüsse einarbeiten':'Work in walnuts','Gehackte Walnüsse in der letzten Faltrunde vorsichtig unterarbeiten.':'Gently fold the chopped walnuts in during the last fold.',
'Kerne einarbeiten':'Work in seeds','Angeröstete Sonnenblumenkerne in der letzten Faltrunde unterarbeiten.':'Fold the toasted sunflower seeds in during the last fold.',
'Füttere deinen Sauerteig-Starter und stelle ihn warm, bis er sich verdoppelt hat.':'Feed your sourdough starter and keep it warm until it has doubled.',
'Mehl und Wasser verrühren, abdecken und quellen lassen (Autolyse).':'Stir flour and water, cover and let it soak (autolyse).',
'Starter, Salz und Öl einarbeiten':'Work in starter, salt and oil','Starter, Salz und Olivenöl zugeben und zu einem sehr weichen, klebrigen Teig verarbeiten.':'Add starter, salt and olive oil and work into a very soft, sticky dough.',
'Alle 30 Minuten den nassen Teig mit feuchten Händen dehnen und falten, insgesamt 4 Runden.':'Stretch and fold the wet dough with wet hands every 30 minutes, 4 rounds in total.',
'Abgedeckt ruhen lassen, bis der Teig deutlich aufgegangen und blasig ist.':'Let it rest covered until the dough has clearly risen and is bubbly.',
'Teig teilen und formen':'Divide and shape the dough','Teig ganz vorsichtig auf eine stark bemehlte Fläche geben, in Rechtecke teilen und auf Backpapier legen, ohne die Luft rauszudrücken.':'Very gently place the dough on a heavily floured surface, cut into rectangles and put on baking paper without pressing out the air.',
'Abgedeckt noch einmal gehen lassen. Währenddessen Ofen mit Backstein oder Blech auf 250 Grad vorheizen.':'Let it proof covered once more. Meanwhile preheat the oven with a baking stone or tray at 250 °C (482 °F).',
'Backen':'Bake','Mit Dampf (Schale mit heißem Wasser im Ofen) bei 250 Grad backen, bis die Kruste goldbraun ist.':'Bake with steam (a dish of hot water in the oven) at 250 °C (482 °F) until the crust is golden brown.',
'Auf einem Gitter auskühlen lassen.':'Let it cool on a rack.',
'Abgedeckt bei Raumtemperatur ruhen lassen, bis er luftig aufgegangen ist.':'Let it rest covered at room temperature until it has risen and is airy.',
'Teig teilen, locker vorformen, 15 Minuten entspannen lassen und dann zu langen Baguettes ausrollen.':'Divide the dough, pre-shape loosely, let it relax for 15 minutes, then roll into long baguettes.',
'Auf einem bemehlten Leinentuch abgedeckt gehen lassen. Ofen mit Backstein auf 250 Grad vorheizen.':'Let it proof covered on a floured linen cloth. Preheat the oven with a baking stone at 250 °C (482 °F).',
'Baguettes mehrfach schräg einschneiden, mit reichlich Dampf backen, nach 10 Minuten den Dampf ablassen.':'Score the baguettes several times diagonally, bake with plenty of steam and release the steam after 10 minutes.',
'Abgedeckt ruhen lassen, bis der Teig aufgegangen ist.':'Let it rest covered until the dough has risen.','In gleich große Stücke (ca. 80 g) teilen und rund oder länglich formen.':'Divide into equal pieces (about 80 g) and shape round or oval.',
'Abgedeckt auf dem Blech gehen lassen. Ofen auf 240 Grad mit Schale für Wasser vorheizen.':'Let proof covered on the tray. Preheat the oven to 240 °C (464 °F) with a dish for water.',
'Brötchen einschneiden, Wasser in die Schale geben und bei 240 Grad goldbraun backen.':'Score the rolls, add water to the dish and bake at 240 °C (464 °F) until golden brown.','Kurz auf einem Gitter auskühlen lassen.':'Briefly let cool on a rack.',
'Starter, Salz und die Hälfte des Olivenöls zugeben und zu einem weichen Teig verarbeiten.':'Add starter, salt and half of the olive oil and work into a soft dough.',
'Alle 30 Minuten den Teig dehnen und falten, insgesamt 4 Runden.':'Stretch and fold the dough every 30 minutes, 4 rounds in total.',
'Abgedeckt ruhen lassen, am besten im Kühlschrank für mehr Aroma, bis er blasig ist.':'Let it rest covered, ideally in the fridge for more flavor, until bubbly.',
'In die Form geben':'Put into the pan','Blech oder Form großzügig mit Öl einfetten, Teig hineingeben und mit den Fingern bis in die Ecken dehnen.':'Grease a tray or pan generously with oil, add the dough and stretch it to the corners with your fingers.',
'Abgedeckt gehen lassen. Ofen auf 230 Grad vorheizen.':'Let proof covered. Preheat the oven to 230 °C (446 °F).',
'Mit den Fingern Mulden eindrücken, mit Öl, Salz und Rosmarin belegen und goldbraun backen.':'Press dimples with your fingers, top with oil, salt and rosemary and bake until golden brown.',
'Kurz auf einem Gitter auskühlen lassen und lauwarm genießen.':'Briefly cool on a rack and enjoy lukewarm.'
};
Object.assign(EN,{
'Raumtemperatur (°C)':'Room temperature (°C)','PEAK-TAGEBUCH':'PEAK LOG',
'Trag ein, wann du fütterst und wann dein Starter am höchsten steht. Daraus merkt sich LilDough, wie schnell er ist, und plant damit.':'Log when you feed and when your starter peaks. LilDough remembers how fast it is and plans with that.',
'Verhältnis beim Füttern':'Ratio when feeding','PEAK ERREICHT':'PEAK REACHED','LETZTEN EINTRAG LÖSCHEN':'DELETE LAST ENTRY',
'Wie im Rezept (gilt für ca. {0}).':'Same as in the recipe (valid for about {0}).',
'Bei {0} dauern die Gehzeiten etwa {1} % länger als im Rezept.':'At {0} the rising times take about {1} % longer than in the recipe.',
'Bei {0} dauern die Gehzeiten etwa {1} % kürzer als im Rezept.':'At {0} the rising times take about {1} % less than in the recipe.',
'Dein Starter ist dabei eingerechnet.':'Your starter is factored in.','(Rezept: {0})':'(recipe: {0})','Erinnerung alle {0} Min':'Reminder every {0} min',
'Trag zuerst ein, wann du gefüttert hast.':'First log when you fed.','Für diese Fütterung ist der Peak schon eingetragen.':'The peak for this feeding is already logged.',
'Die Fütterung ist {0} Std her. Trag sie zuerst neu ein.':'The feeding was {0} h ago. Please log it again first.','Peak nach {0} Std gespeichert.':'Peak after {0} h saved.',
'Noch keine Peaks eingetragen. Tippe auf „Peak erreicht“, sobald dein Starter am höchsten steht.':'No peaks logged yet. Tap Peak reached as soon as your starter is at its highest.',
'Dein Starter liegt genau auf der Tabelle (aus {0} Messungen).':'Your starter matches the table exactly (from {0} measurements).',
'Dein Starter ist ca. {0} % schneller als die Tabelle (aus {1} Messungen).':'Your starter is about {0} % faster than the table (from {1} measurements).',
'Dein Starter ist ca. {0} % langsamer als die Tabelle (aus {1} Messungen).':'Your starter is about {0} % slower than the table (from {1} measurements).',
'Dein Peak bei {0}':'Your peak at {0}'
});
Object.assign(EN,{
'BACK-TAGEBUCH':'BAKING JOURNAL','NEUER EINTRAG':'NEW ENTRY','Name des Brots':'Name of the bread','z. B. Dinkelbrot':'e.g. spelt bread','Bewertung':'Rating','Gesamtdauer (Std)':'Total time (h)','Notiz':'Note',
'z. B. Krume, Kruste, Geschmack …':'e.g. crumb, crust, taste …','FOTO':'PHOTO','ABBRECHEN':'CANCEL',
'Hier sammelst du deine Brote mit Foto, Bewertung und Notiz. Ab 3 bewerteten Broten siehst du, was bei dir am besten klappt.':'Collect your breads here with photo, rating and note. After 3 rated breads you can see what works best for you.',
'Noch kein Brot mit 4 oder 5 Sternen (Schnitt {0}). Trag auch die Temperatur ein, dann sieht man bald, was bei dir funktioniert.':'No bread with 4 or 5 stars yet (average {0}). Log the temperature too, then it will soon show what works for you.',
'Deine besten Brote ({0}, ab 4 Sternen) entstanden im Schnitt{1}. Durchschnitt aller Brote: {2} Sterne.':'Your best breads ({0}, 4 stars and up) were made on average{1}. Average of all breads: {2} stars.',
'und':'and','bei {0}':'at {0}','nach {0} Std Gesamtzeit':'after {0} h total time','{0} Sterne':'{0} stars','COACH FRAGEN':'ASK COACH','Noch keine Einträge.':'No entries yet.','Diesen Eintrag löschen?':'Delete this entry?',
'Bewerte bitte die Krume und Kruste meines Brotes ({0}) und gib mir einen Tipp.':'Please rate the crumb and crust of my bread ({0}) and give me a tip.',
'Bitte gib dem Brot einen Namen.':'Please give the bread a name.','Eintrag gespeichert.':'Entry saved.',
'Das Foto konnte nicht gespeichert werden (Speicher voll oder privater Modus). Der Eintrag wurde ohne Foto gespeichert.':'The photo could not be saved (storage full or private mode). The entry was saved without a photo.'
});
Object.assign(EN,{'bis':'to'});
Object.assign(EN,{
'Gemini ist gerade überlastet. Ich habe mehrere Modelle probiert. Versuch es in einer Minute noch einmal.':'Gemini is overloaded right now. I tried several models. Try again in a minute.',
'Das Gratis-Kontingent bei Google ist gerade aufgebraucht. Warte kurz oder versuch es später noch einmal.':'The free quota at Google is used up for now. Wait a bit or try again later.',
'Google hat den API-Key abgelehnt. Prüfe ihn oben unter „API Key“.':'Google rejected the API key. Check it above under API Key.'
});
Object.assign(EN,{
'ERFAHRUNG':'EXPERIENCE','Neuling':'Beginner','Fortgeschritten':'Intermediate','Profi':'Pro','ANZEIGE':'DISPLAY','Schriftgröße':'Text size','Normal':'Normal','Groß':'Large','Einheiten':'Units',
'Metrisch (g, °C)':'Metric (g, °C)','US (oz, °F)':'US (oz, °F)','GÄRFORMEL':'FERMENTATION FORMULA','BEGRIFFE ERKLÄRT':'TERMS EXPLAINED',
'Standard sind 8 °C (etwa 14 °F). Kleiner heißt: dein Teig reagiert stärker auf Temperatur. Der Bezugswert für Rezepte bleibt 22 °C.':'Default is 8 °C (about 14 °F). Smaller means your dough reacts more strongly to temperature. The reference for recipes stays 22 °C.',
'Wie gut kennst du dich mit Sauerteig aus?':'How well do you know sourdough?',
'Danach richten sich Begriffe und Einstellungen. Du kannst das später in den Optionen ändern.':'Terms and settings follow from this. You can change it later in Settings.',
'Ich fange gerade an. Bitte einfache Wörter und wenige Einstellungen.':'I am just starting. Please use simple words and few settings.',
'Ich habe schon ein paar Brote gebacken und kenne die Grundbegriffe.':'I have baked a few loaves and know the basic terms.',
'Ich kenne die Fachbegriffe und will volle Kontrolle, auch Bäckerprozente.':'I know the technical terms and want full control, including baker percentages.',
'ZEITFENSTER':'TIME WINDOW','optional':'optional','Rezept skalieren (Faktor)':'Scale recipe (factor)','Raumtemperatur':'Room temperature','Gärung verdoppelt ihr Tempo alle ({0})':'Fermentation doubles its speed every ({0})',
'Einfache Wörter und wenige Einstellungen. Fachbegriffe werden umschrieben.':'Simple words and few settings. Technical terms are put in plain language.',
'Alle Funktionen. Fachbegriffe findest du unter „Begriffe erklärt“.':'All features. You can find technical terms under Terms explained.',
'Alles, dazu Bäckerprozente, Gärformel und Skalieren eigener Rezepte.':'Everything, plus baker percentages, fermentation formula and scaling your own recipes.',
'Starter (Anstellgut)':'Starter','Peak':'Peak','Autolyse':'Autolyse','Hydration':'Hydration','Dehnen und Falten':'Stretch and fold','Stückgare':'Final proof','Gärkorb':'Proofing basket','Krume':'Crumb','Bäckerprozente':'Baker percentages',
'Lebendige Mischung aus Mehl und Wasser mit wilden Hefen und Milchsäurebakterien. Sie lässt das Brot aufgehen und gibt den Geschmack.':'A living mix of flour and water with wild yeast and lactic acid bacteria. It makes the bread rise and gives the flavor.',
'Der Moment, in dem der Starter am höchsten steht. Dann ist er am aktivsten und gut zum Backen.':'The moment your starter is at its highest. Then it is most active and good for baking.',
'Mehl und Wasser ruhen zuerst allein, ohne Starter und Salz. Das macht den Teig geschmeidiger und leichter zu formen.':'Flour and water rest first on their own, without starter and salt. This makes the dough smoother and easier to shape.',
'Wie viel Wasser im Teig ist, in Prozent vom Mehl. Mehr Wasser gibt einen feuchteren, luftigeren Teig, der aber klebriger ist.':'How much water is in the dough, as a percentage of the flour. More water gives a wetter, airier dough that is stickier.',
'Statt zu kneten ziehst du den Teig in Abständen kurz in die Länge und faltest ihn ein. So entsteht Struktur.':'Instead of kneading you briefly stretch the dough and fold it in at intervals. This builds structure.',
'Die letzte Gehzeit des geformten Brotes, bevor es in den Ofen kommt. Über Nacht im Kühlschrank bringt mehr Geschmack.':'The last rise of the shaped bread before it goes into the oven. Overnight in the fridge adds flavor.',
'Eine Form oder Schüssel mit Tuch, in der das geformte Brot geht und seine Form behält.':'A basket or bowl with a cloth in which the shaped bread rises and keeps its shape.',
'Das Innere des Brotes.':'The inside of the bread.','Alle Zutaten als Prozent vom Mehlgewicht. Das Mehl ist immer 100 %.':'All ingredients as a percentage of the flour weight. The flour is always 100 %.',
'Gluten':'gluten','Saaten (Sonnenblumen, Lein, Kürbis)':'seeds (sunflower, flax, pumpkin)','Walnüsse':'walnuts','Sonnenblumenkerne':'sunflower seeds','Milch (Butter)':'milk (butter)','Enthält: {0}.':'Contains: {0}.',
'Glutenfrei gedacht. Bei Zöliakie auf zertifiziert glutenfreie Zutaten, einen glutenfreien Starter und saubere Geräte achten. Das ersetzt keine ärztliche Beratung.':'Meant to be gluten free. With coeliac disease use certified gluten free ingredients, a gluten free starter and clean equipment. This is not medical advice.',
'Richtwerte bei {0} bis {1}. Wie lange dein Starter wirklich braucht, hängt von Mehl, Temperatur und Aktivität ab. Über das Verhältnis steuerst du die Reifezeit.':'Rough values at {0} to {1}. How long your starter really takes depends on flour, temperature and activity. The ratio lets you steer the ripening time.',
'Wann ist mein Starter bereit?':'When is my starter ready?','Mein Starter blubbert kaum. Was tun?':'My starter hardly bubbles. What should I do?','Welches Mehl nehme ich zum Füttern?':'Which flour should I feed with?',
'Warum ist mein Teig so klebrig?':'Why is my dough so sticky?','Wie lange soll ich den Teig verarbeiten?':'How long should I work the dough?','Kann ich den Teig mit der Maschine kneten?':'Can I knead the dough with a machine?',
'Woran erkenne ich, dass der Teig reif ist?':'How do I know the dough is ready?','Der Teig geht kaum auf. Was tun?':'The dough hardly rises. What should I do?','Wie dehne und falte ich richtig?':'How do I stretch and fold properly?',
'Wie forme ich den Teig richtig?':'How do I shape the dough properly?','Woran erkenne ich, dass die Gehzeit fertig ist?':'How do I know the rise is done?','Kann ich die Gehzeit im Kühlschrank verlängern?':'Can I extend the rise in the fridge?',
'Woran sehe ich, dass das Brot durch ist?':'How can I tell the bread is done?','Die Kruste wird zu dunkel. Was tun?':'The crust gets too dark. What should I do?','Ich habe keinen Gusseisentopf. Was nun?':'I do not have a cast iron pot. What now?',
'Warum muss das Brot auskühlen?':'Why does the bread need to cool?','Wie bewahre ich das Brot auf?':'How do I store the bread?','Wie friere ich Brot am besten ein?':'What is the best way to freeze bread?',
'Welches Brot passt für den Anfang?':'Which bread suits a beginner?','Wie füttere ich meinen Starter richtig?':'How do I feed my starter properly?','Mein Brot wird zu flach. Woran liegt das?':'My bread comes out too flat. Why?',
'Erklär das bitte einfacher.':'Please explain that more simply.','Was kann ich dagegen tun?':'What can I do about it?','Woran erkenne ich das beim nächsten Mal?':'How do I spot that next time?',
'Foto prüfen':'Check photo','Chat leeren':'Clear chat','Chat wirklich leeren?':'Really clear the chat?'
});
Object.assign(EN_DATA,{
'Glutenfreies Buchweizenbrot':'Gluten free buckwheat bread','Saftig, ohne Weizen, mit Flohsamenschalen':'Juicy, without wheat, with psyllium husk',
'Buchweizenmehl':'Buckwheat flour','Hirsemehl':'Millet flour','Reismehl (Vollkorn)':'Brown rice flour','Flohsamenschalen (gemahlen)':'Psyllium husk (ground)',
'Füttere deinen glutenfreien Starter (z. B. aus Buchweizenmehl) und stelle ihn warm, bis er sich deutlich vergrößert hat und Blasen wirft.':'Feed your gluten free starter (e.g. made with buckwheat flour) and keep it warm until it has clearly grown and is bubbly.',
'Flohsamenschalen quellen lassen':'Let the psyllium husk swell','Flohsamenschalen mit dem Wasser verrühren und quellen lassen, bis ein Gel entsteht. Das ersetzt das Klebergerüst.':'Stir the psyllium husk into the water and let it swell until it forms a gel. It replaces the gluten network.',
'Teig anrühren':'Mix the batter','Mehle, Salz und Starter zum Gel geben und kräftig zu einem weichen, klebrigen Teig verrühren. Er wird nicht geknetet.':'Add flours, salt and starter to the gel and stir vigorously into a soft, sticky dough. It is not kneaded.',
'Teig in die Form geben':'Put the dough into the pan','Den Teig in eine gefettete Kastenform füllen und mit nassen Händen glatt streichen.':'Fill the dough into a greased loaf pan and smooth it with wet hands.',
'Abgedeckt bei Raumtemperatur gehen lassen, bis der Teig sichtbar höher ist und die Oberfläche leicht einreißt.':'Let it rise covered at room temperature until the dough is visibly higher and the surface cracks slightly.',
'Ofen vorheizen':'Preheat the oven','Ofen auf 230 Grad Ober-/Unterhitze vorheizen und eine Schale mit Wasser auf den Boden stellen.':'Preheat the oven to 230 °C (446 °F) top and bottom heat and put a dish of water on the bottom.',
'Das Brot 15 Minuten bei 230 Grad backen, dann auf 200 Grad senken und etwa 40 Minuten fertig backen. Beim Klopfen auf die Unterseite soll es hohl klingen.':'Bake the bread for 15 minutes at 230 °C (446 °F), then lower to 200 °C (392 °F) and bake about 40 minutes more. It should sound hollow when you tap the bottom.',
'Komplett auskühlen lassen, am besten mehrere Stunden. Glutenfreies Brot setzt sich erst beim Auskühlen und schmiert sonst.':'Let it cool completely, ideally for several hours. Gluten free bread only sets while cooling and is gummy otherwise.'
});
Object.assign(EN,{'Gärung verdoppelt ihr Tempo alle (°C)':'Fermentation doubles its speed every (°C)'});
