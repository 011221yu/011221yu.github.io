const PREFIX='shangan-github-';
const CACHE=PREFIX+'v22-mobile-resume';
const SHELL=['mobile-runtime.js','foundation-week.js','practice-engine.js','study-layout.css','study-layout.js','essay-core.js','essay-writing.js','essay-applied.js','essay-curriculum.js','essay-catalog.js','essay-engine.js','essay-ui.js','cloud-migrate.js','vendor/cloudbase.min.js','cloud-config.js','sync-engine.js','cloud-sync.js','./','index.html','data-store.js','planner-engine.js','job-engine.js','question-recognizer.js','pdf-importer.js','gd-sprint.js','reading-cards.js','gd-study-ui.js','idiom-engine.js','idiom-ui.js','national-curriculum.js','national-engine.js','national-ui.js','vendor/pdf.min.mjs','vendor/pdf.worker.min.mjs','local-materials.js','migration-help.js','manifest.webmanifest','icon.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==location.origin||!url.href.startsWith(self.registration.scope))return;
 const canonical=SHELL.map(path=>new URL(path,self.location.href).href).find(path=>new URL(path).pathname===url.pathname),navigation=event.request.mode==='navigate';
 if(!canonical&&!navigation)return;
 event.respondWith((async()=>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
  try{const response=await fetch(event.request,{cache:'no-cache',signal:controller.signal});if(response.ok){const cached=response.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(canonical||new URL('index.html',self.location.href).href,cached)))}return response}
  catch(e){const hit=await caches.match(canonical||event.request,{ignoreSearch:true})||(navigation?await caches.match(new URL('index.html',self.location.href).href):null);return hit||new Response('当前离线，此内容尚未缓存。请联网后点刷新。',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}})}
  finally{clearTimeout(timer)}
 })());
});
