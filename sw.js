const CACHE="mymusic-shell-v1-9-16";
const FILES=["./","./index.html","./styles.css","./app.js","./manifest.webmanifest","./logo-192.png","./logo-512.png","./apple-touch-icon.png","./vinyl-overlay.jpg","./btn-off.webp","./btn-on.webp","./btn-press-off.webp","./btn-press-on.webp","./knob.png","./vu-meter.png"];
self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",event=>{
  const req=event.request,url=new URL(req.url);
  if(url.origin!==self.location.origin||req.method!=="GET")return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{
      const fresh=await fetch(req,{cache:"no-store"});
      if(fresh&&fresh.ok)cache.put(req,fresh.clone());
      return fresh;
    }catch(err){
      const cached=await cache.match(req);
      if(cached)return cached;
      throw err;
    }
  })());
});
