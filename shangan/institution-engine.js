(function(root){
 'use strict';
 const KEY='gd-institution-v1',addDays=(d,n)=>new Date(Date.parse(d+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
 const string=(v,max=12000)=>typeof v==='string'&&v.length<=max;
 function validate(p){
  const fail=()=>{throw Error('事业编资料包不完整，原资料保留')};
  if(p?.format!==KEY||p.version!==1||!Array.isArray(p.sources)||!p.sources.length||p.sources.length>200||!Array.isArray(p.cards)||p.cards.length>10000||!Array.isArray(p.questions)||p.questions.length>20000)fail();
  const sources=new Map(),ids=new Set();
  for(const s of p.sources){if(!/^gdi-[a-z0-9-]+$/.test(s.id)||sources.has(s.id)||!string(s.name,200)||!/^\d{4}-\d{2}/.test(s.month)||!Number.isInteger(s.pages)||s.pages<1||s.pages>2000||!/^[a-f0-9]{64}$/.test(s.sha256)||!(s.pdf instanceof Blob||typeof s.pdf==='string'&&/^data:application\/pdf;base64,[A-Za-z0-9+/=]+$/.test(s.pdf)))fail();sources.set(s.id,s)}
  const check=x=>{const s=sources.get(x.source);if(!s||!/^gdi-[mq]-[a-z0-9-]+$/.test(x.id)||ids.has(x.id)||!Number.isInteger(x.page)||x.page<1||x.page>s.pages||!/^\d{4}-\d{2}$/.test(x.month)||!/^[a-f0-9]{16}$/.test(x.revision))fail();ids.add(x.id)};
  for(const c of p.cards){check(c);if(!['title','prompt','answer','topic','note','kind'].every(k=>string(c[k]))||!c.answer.trim()||c.track!==undefined&&!['foundation','current'].includes(c.track)||c.subject!==undefined&&!string(c.subject,80)||c.references!==undefined&&(!Array.isArray(c.references)||c.references.length>10||c.references.some(r=>!string(r.title,200)||!string(r.url,1500)||!/^https:\/\/[^\s"'<>]+$/.test(r.url)))||c.evidence!==undefined&&(!Array.isArray(c.evidence)||c.evidence.length>30||c.evidence.some(e=>!sources.has(e.source)||!Number.isInteger(e.page)||e.page<1||e.page>sources.get(e.source).pages)))fail()}
  for(const q of p.questions){check(q);if(!string(q.stem)||!Array.isArray(q.options)||q.options.length!==4||q.options.some((o,i)=>o.label!=='ABCD'[i]||!string(o.text))||!/^A?B?C?D?$/.test(q.answer)||!q.answer||q.multi!==(q.answer.length>1)||typeof q.hold!=='boolean'||q.image&&!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(q.image))fail()}
  return p;
 }
 function merge(previous,incoming){validate(incoming);if(!previous)return incoming;validate(previous);const replaced=new Set(incoming.sources.map(s=>s.id));return validate({...incoming,sources:[...previous.sources.filter(s=>!replaced.has(s.id)),...incoming.sources],cards:[...previous.cards.filter(c=>!replaced.has(c.source)),...incoming.cards],questions:[...previous.questions.filter(q=>!replaced.has(q.source)),...incoming.questions]})}
 const current=(x,p)=>p?.revision===x.revision?p:{};
 function daily({date,minutes=30,cards=[],questions=[],progress={},attempts={},saved,days={}}){
  minutes=Math.max(10,Math.min(90,Number(minutes)||30));const quizQuota=Math.min(questions.filter(q=>!q.hold).length,Math.max(1,Math.floor(minutes/6))),quizMinutes=quizQuota*2,budget=minutes-quizMinutes;
  const ids=new Set(cards.map(c=>c.id)),qids=new Set(questions.filter(q=>!q.hold).map(q=>q.id));
  const mixed=cards.some(c=>c.track==='foundation'),upgrade=saved&&mixed&&!saved.mixVersion;
  if(saved&&saved.minutes===minutes&&!upgrade)return {...saved,newIds:saved.newIds.filter(id=>ids.has(id)),reviewIds:saved.reviewIds.filter(id=>ids.has(id)),questionIds:saved.questionIds.filter(id=>qids.has(id))};
  const finished=(list,isQuiz=false)=>(list||[]).filter(id=>(isQuiz?qids:ids).has(id)&&(isQuiz?current(questions.find(q=>q.id===id),attempts[id]).date:current(cards.find(c=>c.id===id),progress[id]).lastStudy)===date);
  const completedNew=upgrade?finished(saved.newIds):[],completedReviews=upgrade?finished(saved.reviewIds):[],completedQuestions=upgrade?finished(saved.questionIds,true):[];
  const due=cards.filter(c=>{const p=current(c,progress[c.id]);return p.learnedAt&&p.learnedAt<date&&p.nextReview<=date&&p.lastStudy!==date}).sort((a,b)=>progress[a.id].nextReview.localeCompare(progress[b.id].nextReview));
  const reviewIds=[...completedReviews,...due.slice(0,Math.max(0,Math.floor(budget/3)-completedReviews.length)).map(c=>c.id)],quota=Math.floor((budget-reviewIds.length)/2),carried=Object.keys(days).filter(d=>d<date).sort().flatMap(d=>days[d].newIds),rank=new Map([...new Set(carried)].map((id,i)=>[id,i]));
  const fresh=cards.filter(c=>!current(c,progress[c.id]).learnedAt).sort((a,b)=>(rank.get(a.id)??99999)-(rank.get(b.id)??99999)||b.month.localeCompare(a.month)||a.id.localeCompare(b.id));
  let newCards=fresh;
  if(mixed){const groups=new Map();for(const c of fresh.filter(c=>c.track==='foundation')){const subject=c.subject||c.topic;if(!groups.has(subject))groups.set(subject,[]);groups.get(subject).push(c)}const foundation=[],groupNames=[...groups.keys()].sort((a,b)=>{const score=s=>cards.filter(c=>(c.subject||c.topic)===s&&current(c,progress[c.id]).learnedAt).length;return score(a)-score(b)||a.localeCompare(b,'zh-CN')});for(let n=0;foundation.length<fresh.length;n++){let added=false;for(const s of groupNames){const c=groups.get(s)[n];if(c){foundation.push(c);added=true}}if(!added)break}const news=fresh.filter(c=>c.track!=='foundation'),need=Math.max(0,quota-completedNew.length),n=Math.min(foundation.length,Math.round(need*.7)),first=[...foundation.slice(0,n),...news.slice(0,need-n)];newCards=[...first,...foundation.slice(n),...news.slice(need-n)]}
  const pool=questions.filter(q=>!q.hold),wrong=pool.filter(q=>{const a=current(q,attempts[q.id]);return a.correct===false||a.nextReview&&a.nextReview<=date&&a.date<date}),newQ=pool.filter(q=>!current(q,attempts[q.id]).date).sort((a,b)=>b.month.localeCompare(a.month)||a.number-b.number);
  const questionIds=[...new Set([...completedQuestions,...wrong.map(q=>q.id),...newQ.map(q=>q.id)])].slice(0,quizQuota);
  if(!questionIds.length)questionIds.push(...pool.slice(0,quizQuota).map(q=>q.id));
  return {date,minutes,newIds:[...completedNew,...newCards.slice(0,Math.max(0,quota-completedNew.length)).map(c=>c.id)],reviewIds,questionIds,mixVersion:mixed?1:0};
 }
 function grade(card,previous={},result,date){if(!['remembered','fuzzy'].includes(result))throw Error('请选择记忆结果');const p=current(card,previous),base=p.lastStudy===date?p.stageBeforeToday:p.stage||0,stage=result==='remembered'?(p.learnedAt&&p.learnedAt<date?Math.min(4,base+1):0):0;return {...p,revision:card.revision,learnedAt:p.learnedAt||date,lastStudy:date,lastResult:result,stageBeforeToday:base,stage,nextReview:addDays(date,result==='remembered'?[1,3,7,14,30][stage]:1)}}
 function answer(q,choice,date){const sorted=[...new Set(choice)].sort().join('');if(!sorted||![...sorted].every(x=>'ABCD'.includes(x))||!q.multi&&sorted.length!==1)throw Error('请先选择答案');const correct=sorted===q.answer;return {revision:q.revision,choice:sorted,answer:q.answer,correct,date,attemptedAt:new Date().toISOString(),nextReview:addDays(date,correct?3:1)}}
 root.InstitutionEngine={KEY,validate,merge,daily,grade,answer,current,addDays};
})(globalThis);
