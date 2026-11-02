(function(root){
 'use strict';
 const addDays=(date,n)=>new Date(Date.parse(date+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
 function plan({date,examDate='2026-11-29',restDates=[],days={},progress={},minutes=35,lessons=root.GongkaoNational.lessons}){
  const firstPass=addDays(examDate,-6),lightStart=addDays(examDate,-2);
  if(date>=examDate)return {mode:date===examDate?'exam':'after',newIds:[],reviewIds:[],firstPass,examDate};
  if(restDates.includes(date)||minutes<=0)return {mode:restDates.includes(date)?'rest':'unavailable',newIds:[],reviewIds:[],firstPass,examDate};
  if(days[date]?.version===1&&days[date].examDate===examDate)return days[date];
  const due=lessons.filter(t=>progress[t.id]?.completed&&progress[t.id]?.nextReview&&progress[t.id].nextReview<=date&&progress[t.id].learnedAt<date).sort((a,b)=>progress[a.id].nextReview.localeCompare(progress[b.id].nextReview));
  const carried=Object.keys(days).filter(d=>d<date).sort().flatMap(d=>days[d].newIds||[]);
  const ids=new Set(lessons.map(t=>t.id)),remaining=[...new Set([...carried,...lessons.map(t=>t.id)])].filter(id=>ids.has(id)&&!progress[id]?.completed);
  let studyDays=0;for(let d=date;d<=firstPass;d=addDays(d,1))if(!restDates.includes(d))studyDays++;
  const mode=date>=lightStart?'light':date>firstPass?'consolidate':'learn';
  const quota=mode==='light'||minutes<15?0:mode==='consolidate'?Math.min(1,remaining.length):Math.min(minutes>=30?2:1,Math.ceil(remaining.length/Math.max(1,studyDays)));
  return {version:1,date,mode,firstPass,examDate,minutes,studyDays,remaining:remaining.length,newIds:remaining.slice(0,quota),reviewIds:due.slice(0,mode==='light'?6:3).map(t=>t.id),unassigned:Math.max(0,remaining.length-quota)};
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
