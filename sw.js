const C='sauerteig-v8',F=['./','index.html','styles.css','app.js','extra-breads.js','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png','apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(F)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(u.origin!==location.origin||e.request.method!=='GET')return;
e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));return r}).catch(()=>caches.match(e.request)))});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.matchAll({type:'window'}).then(l=>l.length?l[0].focus():clients.openWindow('./')))});
self.addEventListener('push',e=>{let d={};try{d=e.data.json()}catch{}
e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(l=>{
if(l.some(c=>c.visibilityState==='visible'))return; // App offen: sie meldet sich selbst
return self.registration.showNotification(d.title||'Sauerteig',{body:d.body||'',icon:'icon-192.png',badge:'icon-192.png',tag:'step',renotify:true,requireInteraction:true,vibrate:[300,150,300,150,300]})}))});


