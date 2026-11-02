/* offline support: pages and live.json network-first, audio and icons cache-first */
const C="ajf-v31";
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(["./","index.html","manifest.json","icon-192.png"]).catch(()=>{})))});
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);if(e.request.method!=="GET"||u.origin!==location.origin||/\.mp4$/.test(u.pathname))return;
  const media=/\.(mp3|png)$/.test(u.pathname);
  e.respondWith(media
    ?caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{const cp=res.clone();caches.open(C).then(c=>c.put(e.request,cp));return res}))
    :fetch(e.request,{cache:"no-cache"}).then(res=>{const cp=res.clone();caches.open(C).then(c=>c.put(e.request,cp));return res}).catch(()=>caches.match(e.request,{ignoreSearch:true})));
});
