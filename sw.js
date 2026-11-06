/* offline support: pages and live.json network-first, audio and icons cache-first */
const C="ajf-v57";
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(["./","index.html","manifest.json","icon-192.png"]).catch(()=>{})))});
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);if(e.request.method!=="GET"||u.origin!==location.origin||/\.mp4$/.test(u.pathname))return;
  const media=/\.(mp3|png)$/.test(u.pathname);
  e.respondWith(media
    ?caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{const cp=res.clone();caches.open(C).then(c=>c.put(e.request,cp));return res}))
    :fetch(e.request,{cache:"no-cache"}).then(res=>{const cp=res.clone();caches.open(C).then(c=>c.put(e.request,cp));return res}).catch(()=>caches.match(e.request,{ignoreSearch:true})));
});
/* تنبيهات وصول الرحلات (Web Push): نفس tag يستبدل التنبيه السابق مثل لوحة المطار */
self.addEventListener("push",e=>{let d={};try{d=e.data?e.data.json():{}}catch(x){d={body:e.data&&e.data.text()}}
  e.waitUntil(self.registration.showNotification(d.title||"رحلات الجوف",{body:d.body||"",tag:d.tag||"ajf",renotify:true,requireInteraction:false,vibrate:[200,100,200],
    icon:"icon-192.png",badge:"icon-192.png",lang:"ar",dir:"rtl",data:{url:d.url||"./"}}))});
self.addEventListener("notificationclick",e=>{e.notification.close();const u=new URL((e.notification.data&&e.notification.data.url)||"./",self.registration.scope).href;
  e.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(ws=>{for(const w of ws)if(w.url.startsWith(self.registration.scope)&&"focus" in w)return w.focus();return clients.openWindow(u)}))});
