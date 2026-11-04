/* Derive review state without deleting or rewriting historical attempts. */
(function(root){
 'use strict';
 const addDays=(d,n)=>new Date(Date.parse(d+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
 function events(rows){
  const legacy=new Map(),dated=[];
  for(const r of rows){if(!/^\d{4}-\d{2}-\d{2}$/.test(r.date||''))continue;if(r.attemptedAt)dated.push(r);else{const old=legacy.get(r.date);legacy.set(r.date,{...r,correct:old?old.correct&&r.correct:r.correct,legacy:true})}}
  return [...legacy.values(),...dated].sort((a,b)=>a.date.localeCompare(b.date)||(a.attemptedAt||'').localeCompare(b.attemptedAt||'')||(a.id||'').localeCompare(b.id||''));
 }
 function review(rows,date){
  let everWrong=false,stage=0,nextReview='',lastCorrect=false,lastAdvance='',lastDate='';
  for(const r of events(rows).filter(r=>r.date<=date)){
   lastCorrect=r.correct===true;lastDate=r.date;
   if(!lastCorrect){everWrong=true;stage=0;nextReview=addDays(r.date,1);lastAdvance=r.date}
   else if(everWrong&&stage<3&&r.date>=nextReview&&r.date!==lastAdvance){stage++;lastAdvance=r.date;nextReview=stage===3?'':addDays(r.date,[0,3,7][stage])}
  }
  return {everWrong,stage,nextReview,lastCorrect,lastDate,status:!everWrong?(lastDate?'learned':'new'):stage>=3?'mastered':!lastCorrect?'retry':nextReview<=date?'due':'waiting'};
 }
 function stats(rows,date){
  const groups=new Map();for(const r of rows.filter(r=>r.date<=date)){if(!groups.has(r.questionId))groups.set(r.questionId,[]);groups.get(r.questionId).push(r)}
  const first=[],repeat=[],recent=new Map();let legacyMixed=false;
  for(const [id,rs]of groups){const es=events(rs);if(!es.length)continue;first.push(es[0]);const originals=rs.slice().sort((a,b)=>a.date.localeCompare(b.date)||(a.attemptedAt||'').localeCompare(b.attemptedAt||''));const firstIndex=originals.findIndex(x=>x.date===es[0].date&&x.correct===es[0].correct);repeat.push(...originals.filter((_,i)=>i!==firstIndex));const day=originals[0].date,same=originals.filter(r=>r.date===day&&!r.attemptedAt);if(same.some(x=>x.correct)&&same.some(x=>!x.correct))legacyMixed=true;
   for(const x of es.filter(x=>x.date>=addDays(date,-6))){const key=x.module||'未分类';const old=recent.get(key)||{module:key,total:0,correct:0};old.total++;old.correct+=Number(x.correct===true);recent.set(key,old)}
  }
  const rate=xs=>xs.length?Math.round(xs.filter(x=>x.correct).length/xs.length*100):null;
  return {firstCount:first.length,firstRate:rate(first),repeatCount:repeat.length,repeatRate:rate(repeat),legacyMixed,weak:[...recent.values()].filter(x=>x.total>=2).sort((a,b)=>a.correct/a.total-b.correct/b.total||b.total-a.total).slice(0,3)};
 }
 function dailyQuestions(questions,history,date,limit){
  const grouped=new Map();for(const h of history){if(!grouped.has(h.questionId))grouped.set(h.questionId,[]);grouped.get(h.questionId).push(h)}
  const due=questions.filter(q=>['retry','due'].includes(review(grouped.get(q.id)||[],date).status));
  due.sort((a,b)=>(review(grouped.get(a.id)||[],date).nextReview||'').localeCompare(review(grouped.get(b.id)||[],date).nextReview||''));
  const ids=due.slice(0,Math.ceil(limit/2)).map(q=>q.id),docs=[...new Set(questions.map(q=>q.doc||q.topic))],offset=Math.floor(Date.parse(date+'T00:00:00Z')/86400000)%Math.max(1,docs.length),buckets=docs.map((_,i)=>questions.filter(q=>(q.doc||q.topic)===docs[(i+offset)%docs.length]&&!grouped.has(q.id)));
  while(ids.length<limit&&buckets.some(b=>b.length))for(const b of buckets){if(ids.length>=limit)break;if(b.length)ids.push(b.shift().id)}
  for(const q of [...due,...questions.filter(q=>review(grouped.get(q.id)||[],date).status==='waiting')])if(ids.length<limit&&!ids.includes(q.id))ids.push(q.id);
  return ids;
 }
 root.ShanganPractice={events,review,stats,dailyQuestions,addDays};
})(globalThis);
