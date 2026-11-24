'use strict';
const release='083096e229ca77cbae45';
const scope=self.registration.scope;
const prefix='modian-reading:'+scope+':';
const cacheName=prefix+release;
const index=new URL('index.html',scope).href;
const exams=new URL('unit-tests.html',scope).href;
const printable=new URL('unit-exams-print.pdf',scope).href;
const marker='<meta name="handbook-release" content="'+release+'">';
self.addEventListener('install',e=>{
  e.waitUntil((async()=>{
    const pages=await Promise.all([index,exams,printable].map(async url=>{
      const response=await fetch(url+'?offline='+release,{cache:'reload',credentials:'omit'});
      if(!response.ok)throw Error('Release not yet available');
      if(url===printable){
        const bytes=new Uint8Array(await response.clone().arrayBuffer());
        if(String.fromCharCode(...bytes.subarray(0,5))!=='%PDF-')throw Error('Missing exam booklet');
      }else if(!(await response.clone().text()).includes(marker))throw Error('Release not yet available');
      return [url,response];
    }));
    const cache=await caches.open(cacheName);
    await Promise.all(pages.map(([url,response])=>cache.put(url,response)));
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
  const page=url.href===scope?index:url.href;
  if(e.request.method!=='GET')return;
  if(page!==printable && (e.request.mode!=='navigate' || (page!==index && page!==exams)))return;
  e.respondWith((async()=>{
    const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),4500);
    try {
      const live=await fetch(e.request,{cache:'no-store',signal:ctl.signal});
      if(live.ok)return live;
      const cached=await caches.match(page,{cacheName});
      return cached||live;
    } catch(err) {
      const cached=await caches.match(page,{cacheName});
      if(cached)return cached;
      throw err;
    } finally{clearTimeout(timer);}
  })());
});
