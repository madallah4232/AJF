/* offline support: pages/js cache-first with background update, json always network-first, audio and icons cache-first */
const C="ajf-v175";
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(["./","index.html","manifest.json","icon-192.png","fonts/ibm-plex-mono-latin-500-normal.woff2","fonts/ibm-plex-mono-latin-600-normal.woff2","fonts/ibm-plex-mono-latin-ext-500-normal.woff2","fonts/ibm-plex-mono-latin-ext-600-normal.woff2","fonts/ibm-plex-sans-arabic-arabic-400-normal.woff2","fonts/ibm-plex-sans-arabic-arabic-500-normal.woff2","fonts/ibm-plex-sans-arabic-arabic-600-normal.woff2","fonts/ibm-plex-sans-arabic-arabic-700-normal.woff2","fonts/ibm-plex-sans-arabic-latin-400-normal.woff2","fonts/ibm-plex-sans-arabic-latin-500-normal.woff2","fonts/ibm-plex-sans-arabic-latin-600-normal.woff2","fonts/ibm-plex-sans-arabic-latin-700-normal.woff2","fonts/ibm-plex-sans-arabic-latin-ext-400-normal.woff2","fonts/ibm-plex-sans-arabic-latin-ext-500-normal.woff2","fonts/ibm-plex-sans-arabic-latin-ext-600-normal.woff2","fonts/ibm-plex-sans-arabic-latin-ext-700-normal.woff2","fonts/readex-pro-arabic-500-normal.woff2","fonts/readex-pro-arabic-600-normal.woff2","fonts/readex-pro-arabic-700-normal.woff2","fonts/readex-pro-latin-500-normal.woff2","fonts/readex-pro-latin-600-normal.woff2","fonts/readex-pro-latin-700-normal.woff2","fonts/readex-pro-latin-ext-500-normal.woff2","fonts/readex-pro-latin-ext-600-normal.woff2","fonts/readex-pro-latin-ext-700-normal.woff2"]).catch(()=>{})))});
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);if(e.request.method!=="GET"||u.origin!==location.origin||/\.mp4$/.test(u.pathname))return;
  const media=/\.(mp3|png|woff2)$/.test(u.pathname);
  e.respondWith(media
    ?caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{const cp=res.clone();caches.open(C).then(c=>c.put(e.request,cp));return res}))
    :fresh(e,/\.json$/.test(u.pathname)));
});
/* الصفحة والسكربتات: تفتح فوراً من النسخة المحفوظة في الجوال، والنسخة الجديدة تنزل بالخلفية للفتحة الجاية.
   بيانات الرحلات (.json) تبقى من الشبكة دائماً */
function fresh(e,data){
  const net=fetch(e.request,{cache:"no-cache"}).then(res=>{if(res.ok){const cp=res.clone();caches.open(C).then(c=>c.put(e.request,cp))}return res});
  const cached=()=>caches.match(e.request,{ignoreSearch:true});
  if(data)return net.catch(cached);
  e.waitUntil(net.catch(()=>{}));
  return cached().then(r=>r||net);
}
/* تنبيهات وصول الرحلات (Web Push): نفس tag يستبدل التنبيه السابق مثل لوحة المطار */
self.addEventListener("push",e=>{let d={};try{d=e.data?e.data.json():{}}catch(x){d={body:e.data&&e.data.text()}}
  e.waitUntil(self.registration.showNotification(d.title||"رحلات الجوف",{body:d.body||"",tag:d.tag||"ajf",renotify:true,requireInteraction:!!d.ri,vibrate:[200,100,200],
    icon:"icon-192.png",badge:"icon-192.png",lang:"ar",dir:"rtl",data:{url:d.url||"./"}}))});
self.addEventListener("notificationclick",e=>{e.notification.close();const u=new URL((e.notification.data&&e.notification.data.url)||"./",self.registration.scope).href;
  e.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(ws=>{for(const w of ws)if(w.url.startsWith(self.registration.scope)&&"focus" in w){try{w.postMessage({ajfOpen:u})}catch(x){}return w.focus()}return clients.openWindow(u)}))});
