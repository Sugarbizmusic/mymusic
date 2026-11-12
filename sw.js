const CACHE="mymusic-shell-v1-9-2";
const FILES=["./","./index.html","./styles.css","./app.js","./manifest.webmanifest"];

self.addEventListener("install",event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(cache=>cache.addAll(FILES))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch",event=>{
  const request=event.request;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin || request.method!=="GET") return;

  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try {
      const fresh=await fetch(request,{cache:"no-store"});
      if(fresh && fresh.ok) cache.put(request,fresh.clone());
      return fresh;
    } catch(error) {
      const cached=await cache.match(request);
      if(cached) return cached;
      throw error;
    }
  })());
});
