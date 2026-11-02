const PREFIX='shangan-github-';
const CACHE=PREFIX+'v1';
const SHELL=['./','index.html','data-store.js','planner-engine.js','job-engine.js','question-recognizer.js','pdf-importer.js','gd-sprint.js','local-materials.js','migration-help.js','manifest.webmanifest','icon.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(!event.request.url.startsWith(self.registration.scope)||event.request.method!=='GET'||new URL(event.request.url).origin!==location.origin)return;
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok&&SHELL.some(path=>new URL(path,location.href).href===event.request.url))caches.open(CACHE).then(cache=>cache.put(event.request,response.clone()));
    return response;
  }).catch(()=>caches.match(event.request).then(hit=>hit||(/^document$/.test(event.request.destination)?caches.match('index.html'):undefined))));
});
