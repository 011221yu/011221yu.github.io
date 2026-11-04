(function(root){
 'use strict';
 const addDays=(date,n)=>new Date(Date.parse(date+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
 function plan({date,examDate='2026-11-29',restDates=[],days={},progress={},minutes=35,lessons=root.GongkaoNational.lessons}){
  minutes=Math.max(0,Math.floor(minutes));const firstPass=addDays(examDate,-6),lightStart=addDays(examDate,-2),blank={version:2,date,minutes,estimatedMinutes:0,mixedMinutes:0,newIds:[],reviewIds:[],firstPass,examDate,deferredReviews:0};
  if(date>=examDate)return {...blank,mode:date===examDate?'exam':'after'};
  if(restDates.includes(date)||!minutes)return {...blank,mode:restDates.includes(date)?'rest':'unavailable'};
  const cached=days[date];if(cached?.version===2&&cached.examDate===examDate&&cached.minutes===minutes)return cached;
  const due=lessons.filter(t=>progress[t.id]?.completed&&progress[t.id]?.nextReview&&progress[t.id].nextReview<=date&&progress[t.id].learnedAt<date&&progress[t.id].reviewedOn!==date).sort((a,b)=>progress[a.id].nextReview.localeCompare(progress[b.id].nextReview));
  const carried=Object.keys(days).filter(d=>d<date).sort().flatMap(d=>days[d].newIds||[]),ids=new Set(lessons.map(t=>t.id));
  const remaining=[...new Set([...(cached?.newIds||[]),...carried,...lessons.map(t=>t.id)])].filter(id=>ids.has(id)&&!progress[id]?.completed);
  const doneToday=lessons.filter(t=>progress[t.id]?.completed&&progress[t.id].learnedAt===date).map(t=>t.id);let studyDays=0;for(let d=date;d<=firstPass;d=addDays(d,1))if(!restDates.includes(d))studyDays++;
  const mode=date>=lightStart?'light':date>firstPass?'consolidate':'learn';
  const quota=mode==='light'?0:Math.min(minutes>=24?2:1,mode==='consolidate'?1:Math.ceil((remaining.length+doneToday.length)/Math.max(1,studyDays))),reserve=Math.min(Math.max(0,quota-doneToday.length),remaining.length,Math.floor(minutes/12))*12;
  const reviewCount=Math.min(due.length,mode==='light'?6:3,Math.floor((minutes-reserve)/3));let used=reviewCount*3;
  const fresh=remaining.slice(0,Math.min(Math.max(0,quota-doneToday.length),Math.floor((minutes-used)/12)));used+=fresh.length*12;
  const mixedMinutes=mode==='light'?Math.min(6,minutes-used):Math.min(6,Math.max(0,minutes-used));
  const reviewed=(cached?.reviewIds||[]).filter(id=>ids.has(id)&&progress[id]?.reviewedOn===date);
  return {...blank,mode,studyDays,remaining:remaining.length,newIds:[...doneToday,...fresh],reviewIds:[...new Set([...reviewed,...due.slice(0,reviewCount).map(t=>t.id)])],mixedMinutes,estimatedMinutes:used+mixedMinutes,deferredReviews:due.length-reviewCount,unassigned:remaining.length-fresh.length};
 }

 function complete(previous={},date){if(previous.completed)return previous;return {...previous,completed:true,learnedAt:date,stage:0,nextReview:addDays(date,1)}}
 function review(previous,result,date){
  if(!previous?.completed)throw new Error('请先完成专题学习');
  const base=previous.reviewedOn===date?previous.stageBeforeToday:Number(previous.stage)||0;
  const stage=result==='remembered'?Math.min(3,base+1):0;
  return {...previous,stageBeforeToday:base,stage,reviewedOn:date,lastRecall:result,nextReview:stage>=3?'':addDays(date,result==='remembered'?[1,3,7][stage]:1)};
 }
 function canComplete(topic,attempts,recalled){return !!recalled&&topic.questions.every(q=>attempts[q.id]&&Number.isInteger(attempts[q.id].choice))}
 function matchFile(name,docs=root.GongkaoNational.docs){const normalize=s=>s.normalize('NFKC').replace(/\s+/g,'');return docs.find(d=>normalize(d.name)===normalize(name))||null}
 root.GongkaoNationalEngine={plan,complete,review,canComplete,matchFile,addDays};
})(globalThis);
