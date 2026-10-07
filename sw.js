const CACHE="keturio-shell-v1";
const ASSETS=["./","./index.html","./styles.css","./app.js","./config.js","./manifest.webmanifest"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting()});
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);
  if(u.origin===location.origin)e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request)));
});
