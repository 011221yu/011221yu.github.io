(function(root){
 'use strict';let dbPromise,urls=[];
 function db(){return dbPromise||(dbPromise=new Promise((resolve,reject)=>{const r=indexedDB.open('shangan-private-materials',1);r.onupgradeneeded=()=>r.result.createObjectStore('packages');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)}))}
 async function read(key='gd'){const d=await db();return new Promise((resolve,reject)=>{const r=d.transaction('packages').objectStore('packages').get(key);r.onsuccess=()=>{try{resolve(decodeStored(r.result||null))}catch(e){reject(e)}};r.onerror=()=>reject(r.error)})}
 // Some iPhone storage modes reject Blob values. Retry bytes in a new atomic transaction.
 async function encodeStored(value){
  if(value instanceof Blob){const bytes=await value.arrayBuffer();return {__shanganStoredBlobV1:true,type:value.type,size:value.size,bytes,...(typeof File!=='undefined'&&value instanceof File?{name:value.name,lastModified:value.lastModified}:{})}}
  if(value instanceof ArrayBuffer||ArrayBuffer.isView(value)||value instanceof Date)return value;
  if(Array.isArray(value)){const out=[];for(const x of value)out.push(await encodeStored(x));return out}
  if(value&&typeof value==='object'){const out={};for(const k of Object.keys(value))if(!['__proto__','constructor','prototype'].includes(k))out[k]=await encodeStored(value[k]);return out}return value;
 }
 function decodeStored(value){
  if(value&&value.__shanganStoredBlobV1===true){if(!(value.bytes instanceof ArrayBuffer)||value.bytes.byteLength!==value.size||typeof value.type!=='string')throw new Error('本机资料字节校验失败，原有数据保留');return typeof value.name==='string'&&typeof File!=='undefined'?new File([value.bytes],value.name,{type:value.type,lastModified:value.lastModified}):new Blob([value.bytes],{type:value.type})}
  if(value instanceof Blob||value instanceof ArrayBuffer||ArrayBuffer.isView(value)||value instanceof Date)return value;
  if(Array.isArray(value))return value.map(decodeStored);
  if(value&&typeof value==='object'){const out={};for(const k of Object.keys(value))if(!['__proto__','constructor','prototype'].includes(k))out[k]=decodeStored(value[k]);return out}return value;
 }
 function putRaw(d,store,key,value){return new Promise((resolve,reject)=>{const t=d.transaction(store,'readwrite');t.oncomplete=()=>resolve(value);t.onerror=()=>reject(t.error||new Error('本机保存失败'));t.onabort=()=>reject(t.error||new Error('本机空间不足，资料未保存'));try{t.objectStore(store).put(value,key)}catch(e){try{t.abort()}catch(_){}reject(e)}})}
 async function putStored(d,store,key,value){try{await putRaw(d,store,key,value)}catch(e){if(!/BlobURLs|DataCloneError/.test((e.name||'')+' '+e.message))throw e;await putRaw(d,store,key,await encodeStored(value))}return value}
 async function writePackage(key,p){const d=await db();await putStored(d,'packages',key,p);return p}
 function validate(p){if(p?.format!=='shangan-materials-v1'||!Array.isArray(p.docs)||!Array.isArray(p.questions)||!p.images||typeof p.images!=='object')throw new Error('不是有效的工作台题库包');const docs=new Set();for(const d of p.docs){if(!/^doc\d+$/.test(d.id)||!Number.isInteger(d.pages)||d.pages<1)throw new Error('资料目录不完整');docs.add(d.id)}for(const [path,value]of Object.entries(p.images)){if(!/^gd-materials\/doc\d+\/(?:\d+(?:-q)?|pair-\d+-\d+-[qa])\.jpg$/.test(path)||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value))throw new Error('题图格式错误')}for(const q of p.questions){if(!docs.has(q.doc)||!Array.isArray(q.options)||!q.stem||!p.images[q.questionImage]||!p.images[`gd-materials/${q.doc}/${q.answerPage}.jpg`])throw new Error('题目或原页缺失')}return p}
 async function importFile(file){if(file.size>200*1024*1024)throw new Error('题库包超过200MB');const stream=/\.gz$/i.test(file.name)?file.stream().pipeThrough(new DecompressionStream('gzip')):file.stream();const p=validate(JSON.parse(await new Response(stream).text()));await writePackage('gd',p);return p}
 function activate(p){for(const u of urls)URL.revokeObjectURL(u);urls=[];const images={};for(const [path,data]of Object.entries(p.images)){const raw=atob(data.split(',')[1]),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0)),u=URL.createObjectURL(new Blob([bytes],{type:'image/jpeg'}));urls.push(u);images[path]=u}return {...p,images}}
 const originalActivate=activate;
 function activateWithMeta(p){const result=originalActivate(p);root.GongkaoLocalMaterials.meta={readings:p.readings||[],audit:p.audit||[],revision:p.revision||''};setTimeout(()=>{if(typeof renderToday==='function')renderToday()},0);return result}
 async function keys(){const d=await db();return new Promise((resolve,reject)=>{const r=d.transaction('packages').objectStore('packages').getAllKeys();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
 root.GongkaoLocalMaterials={read,readPackage:read,writePackage,importFile,activate:activateWithMeta,validate,keys,putStored,encodeStored,decodeStored};
})(globalThis);
