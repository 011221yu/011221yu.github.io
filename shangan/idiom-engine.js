(function(root){
 'use strict';
 const intervals=[1,3,7,14],dayMs=86400000;
 const addDays=(date,n)=>new Date(Date.parse(date+'T00:00:00Z')+n*dayMs).toISOString().slice(0,10);
 function validate(p){
  if(p?.format!=='shangan-idioms-v1'||!Array.isArray(p.entries)||p.entries.length!==993)throw new Error('成语词库不完整');
  const ids=new Set();
  for(const e of p.entries){
   if(!/^idiom-\d{4}$/.test(e.id)||ids.has(e.id)||typeof e.word!=='string'||e.word.length<2||e.word.length>20||typeof e.definition!=='string'||!e.definition||e.definition.length>5000||!['成语','实词'].includes(e.kind)||!e.group||!e.subgroup||!Number.isInteger(e.page)||e.page<1||e.page>p.pages||!Array.isArray(e.bbox)||e.bbox.length!==4||!e.bbox.every(Number.isFinite))throw new Error('有词条或原书位置不完整');
   ids.add(e.id);
  }
  return p;
 }
 function words(entries){
  const seen=new Map();
  for(const e of entries){if(seen.has(e.word))seen.get(e.word).variants.push(e);else seen.set(e.word,{...e,variants:[e]})}
  return [...seen.values()];
 }
 function plan({date,words,days={},progress={},quota=20,rest=false}){
  if(rest)return {newIds:[],reviewIds:[],rest:true};
  const ids=new Set(words.map(w=>w.id));
  if(days[date])return {...days[date],newIds:days[date].newIds.filter(id=>ids.has(id)),reviewIds:days[date].reviewIds.filter(id=>ids.has(id))};
  const due=words.filter(w=>progress[w.id]?.learnedAt&&progress[w.id].learnedAt<date&&progress[w.id].nextReview&&progress[w.id].nextReview<=date).sort((a,b)=>progress[a.id].nextReview.localeCompare(progress[b.id].nextReview));
  const count=Math.max(1,Math.ceil(Number(quota)||40));
  const carried=Object.keys(days).filter(d=>d<date).sort().flatMap(d=>days[d].newIds||[]);
  const fresh=[...new Set([...carried,...words.map(w=>w.id)])].filter(id=>ids.has(id)&&!progress[id]?.learnedAt);
  return {newIds:fresh.slice(0,count),reviewIds:due.slice(0,Math.max(120,count*3)).map(w=>w.id),quota:count};
 }
 function grade(previous={},result,date){
  if(!['remembered','fuzzy','forgot'].includes(result))throw new Error('请选择本次记忆情况');
  const base=previous.lastStudy===date?previous.stageBeforeToday:Number(previous.stage)||0;
  const learnedAt=previous.learnedAt||date;
  const stage=result==='remembered'?(learnedAt===date?0:Math.min(intervals.length,base+1)):result==='forgot'?0:base;
  return {...previous,learnedAt,lastStudy:date,lastResult:result,stageBeforeToday:base,stage,mastered:stage>=intervals.length,nextReview:stage>=intervals.length?'':addDays(date,result==='remembered'?intervals[stage]:1)};
 }
 const clean=s=>String(s||'').replace(/\s+/g,'');
 function extractPage(page,content,operators,lib,context){
  const [width,height]=[page.view[2]-page.view[0],page.view[3]-page.view[1]];
  const items=content.items.filter(t=>t.str?.trim()).map(t=>({text:t.str,x:t.transform[4]+t.width/2,y:height-t.transform[5]-t.height*.35}));
  // 表格填色矩形就是单元格边界；先找单元格，再提取其中的文字，避免串行。
  const rectangles=[];const seen=new Set();
  operators.fnArray.forEach((op,i)=>{if(op!==lib.OPS.constructPath)return;const value=operators.argsArray[i]?.[2];if(!value)return;const [x0,y0,x1,y1]=Array.from(value);if(y1-y0<5)return;const key=[x0,y0,x1,y1].map(n=>Math.round(n*10)).join(',');if(!seen.has(key)&&!rectangles.some(r=>Math.abs(r.x0-x0)<1&&Math.abs(r.y0-y0)<1&&Math.abs(r.x1-x1)<1&&Math.abs(r.y1-y1)<1)){seen.add(key);rectangles.push({x0,y0,x1,y1})}});
  const text=r=>clean(items.filter(t=>t.x>=r.x0+.4&&t.x<r.x1-.4&&t.y>r.y0+.4&&t.y<r.y1-.4).sort((a,b)=>Math.abs(a.y-b.y)>1?a.y-b.y:a.x-b.x).map(t=>t.text).join(''));
  const wordCells=rectangles.filter(r=>r.x0/width>.27&&r.x0/width<.31&&r.x1/width>.41&&r.x1/width<.45&&r.y0>=45&&r.y1<height).sort((a,b)=>a.y0-b.y0);
  const rows=[];
  for(const cell of wordCells){
   const word=text(cell);if(word==='词语'){context.kind='实词';continue}if(word==='成语'||!word||!/^[\u3400-\u9fff、，/（）()·——]+$/.test(word))continue;
   const mid=(cell.y0+cell.y1)/2;
   const major=rectangles.find(r=>r.x0/width<.05&&r.x1/width>.15&&r.x1/width<.18&&r.y0<mid&&r.y1>mid);
   const minor=rectangles.find(r=>r.x0/width>.15&&r.x0/width<.18&&r.x1/width>.27&&r.x1/width<.31&&r.y0<mid&&r.y1>mid);
   const raw=major?text(major):'';
   const heading=raw.match(/【第[^】]+】/);
   const location=major?`${page.pageNumber}:${major.y0}:${major.y1}`:context.location;
   if(location!==context.location){
    const key=heading?context.kind+heading[0]:'';
    let group=key?context.groups.get(key):null;
    if(!group&&major?.y0<54)group=context.currentGroup;
    if(!group){group={id:'group-'+String(++context.groupIndex).padStart(2,'0'),name:''};context.allGroups.push(group)}
    if(key){group.key=key;context.groups.set(key,group)}
    context.currentGroup=group;context.location=location;context.groupId=group.id;context.group=group.name||group.id;
   }
   if(heading){
    const group=context.currentGroup,key=context.kind+heading[0];group.key=key;context.groups.set(key,group);
    const name=raw.replace(/【第[^】]+】|[（(]\d+个[）)]/g,'');if(name.length>group.name.length)group.name=name;
    context.groupId=group.id;context.group=group.name||group.id;
    const count=raw.match(/[（(](\d+)个[）)]/);if(count)context.expected[group.id]=Number(count[1]);
   }
   const sub=minor?text(minor):'';if(sub)context.subgroup=sub;
   const meaning=rectangles.find(r=>Math.abs(r.x0-cell.x1)<1&&Math.abs(r.y0-cell.y0)<1&&Math.abs(r.y1-cell.y1)<1&&r.x1/width>.9);
   const definition=text(meaning||{...cell,x0:cell.x1,x1:width*.97}).replace(/公考资源免费学微信[：:].*/,'');
   if(!definition||!context.group)throw new Error(`第${page.pageNumber}页：${word}的${!definition?'释义':'分组'}未完整识别，请重试`);
   rows.push({id:'idiom-'+String(++context.index).padStart(4,'0'),word,definition,kind:context.kind,groupId:context.groupId,group:context.group,subgroup:context.subgroup||context.group,page:page.pageNumber,bbox:[cell.x0,cell.y0,meaning?.x1||width*.97,cell.y1].map(n=>Math.round(n*100)/100)});
  }
  return rows;
 }
 async function importPdf(file,onProgress=()=>{},providedLibrary){
  if(!file||file.size>20*1024*1024||!/\.pdf$/i.test(file.name))throw new Error('请选择这份花生成语原PDF（20MB以内）');
  const lib=providedLibrary||await import('./vendor/pdf.min.mjs');
  if(!providedLibrary)lib.GlobalWorkerOptions.workerSrc=new URL('vendor/pdf.worker.min.mjs',document.baseURI).href;
  const original=await file.arrayBuffer();let pdf;
  try{
   pdf=await lib.getDocument({data:new Uint8Array(original.slice(0)),useSystemFonts:true,isEvalSupported:false,verbosity:0}).promise;
   if(pdf.numPages!==41)throw new Error('请选择你提供的41页花生成语原PDF');
   const context={index:0,groupIndex:0,kind:'成语',group:'',subgroup:'',groups:new Map(),allGroups:[],expected:{}},entries=[];
   for(let n=1;n<=pdf.numPages;n++){onProgress(n,pdf.numPages);const page=await pdf.getPage(n);const [text,operators]=await Promise.all([page.getTextContent(),page.getOperatorList()]);entries.push(...extractPage(page,text,operators,lib,context));page.cleanup()}
   const counts={};for(const e of entries)counts[e.groupId]=(counts[e.groupId]||0)+1;
   for(const group of context.groups.values())for(const entry of entries)if(entry.groupId===group.id)entry.group=group.name||entry.group;
   if(Object.keys(counts).length!==81||Object.entries(context.expected).some(([id,n])=>counts[id]!==n))throw new Error('分组条数与原书不符，未保存不完整结果，请重试');
   return {...validate({format:'shangan-idioms-v1',revision:'huasheng-20261102',title:file.name.replace(/\.pdf$/i,''),pages:pdf.numPages,entries}),pdf:new Blob([original],{type:'application/pdf'})};
  }finally{if(pdf)await pdf.destroy()}
 }
 root.GongkaoIdioms={validate,words,plan,grade,importPdf};
})(globalThis);
