// Офлайн: всегда берём свежую версию из сети, без интернета — из кэша
self.addEventListener('install',function(){self.skipWaiting()});
self.addEventListener('activate',function(e){e.waitUntil(self.clients.claim())});
self.addEventListener('fetch',function(e){
  if(e.request.method!=='GET')return;
  if(new URL(e.request.url).origin!==location.origin)return;
  e.respondWith(fetch(e.request,{cache:'no-cache'}).then(function(r){
    if(r&&r.ok){var c=r.clone();caches.open('uhod-v1').then(function(ch){ch.put(e.request,c)})}
    return r}).catch(function(){return caches.match(e.request)}))});
