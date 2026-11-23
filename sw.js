'use strict';
const release='ebb15f7f80897b1a6b7c';
const scope=self.registration.scope;
const prefix='modian-reading:'+scope+':';
const cacheName=prefix+release;
const index=new URL('index.html',scope).href;
const marker='<meta name="handbook-release" content="'+release+'">';
self.addEventListener('install',e=>{
  e.waitUntil((async()=>{
    const res=await fetch(index+'?offline='+release,{cache:'reload',credentials:'omit'});
    if(!res.ok || !(await res.clone().text()).includes(marker)) throw Error('Release not yet available');
    const cache=await caches.open(cacheName);
    await cache.put(index,res);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',e=>{
  e.waitUntil((async()=>{
    const names=await caches.keys();
    await Promise.all(names.filter(n=>n.startsWith(prefix)&&n!==cacheName).map(n=>caches.delete(n)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);url.search='';url.hash='';
  if(e.request.mode!=='navigate'||e.request.method!=='GET'||(url.href!==index && url.href!==scope))return;
  e.respondWith((async()=>{
    const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),4500);
    try {
      const live=await fetch(e.request,{cache:'no-store',signal:ctl.signal});
      if(live.ok)return live;
      const cached=await caches.match(index,{cacheName});
      return cached||live;
    } catch(err) {
      const cached=await caches.match(index,{cacheName});
      if(cached)return cached;
      throw err;
    } finally{clearTimeout(timer);}
  })());
});