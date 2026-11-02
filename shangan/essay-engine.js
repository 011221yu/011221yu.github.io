(function(root){
 'use strict';
 const addDays=(date,n)=>new Date(Date.parse(date+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
 function plan({date,examDate,rest=false,minutes=15,days={},progress={},lessons=root.GongkaoEssay.lessons}){
  const blank={version:1,date,examDate,minutes,newIds:[],reviewIds:[]};
  if(date>=examDate)return {...blank,mode:date===examDate?'exam':'after'};
  if(rest||minutes<=0)return {...blank,mode:rest?'rest':'unavailable'};
  if(days[date]?.version===1&&days[date].examDate===examDate)return days[date];
  const light=date>=addDays(examDate,-2);
  const pending=lessons.filter(l=>!progress[l.id]?.completed);
  const due=lessons.filter(l=>progress[l.id]?.nextReview&&progress[l.id].nextReview<=date&&progress[l.id].learnedAt<date).sort((a,b)=>progress[a.id].nextReview.localeCompare(progress[b.id].nextReview));
  return {...blank,mode:light?'light':pending.length?'learn':'review',newIds:light?[]:pending.slice(0,1).map(l=>l.id),reviewIds:due.slice(0,2).map(l=>l.id)};
 }
 function complete(previous={},date){return previous.completed?previous:{...previous,completed:true,learnedAt:date,stage:0,nextReview:addDays(date,1)}}
 function review(previous,date,remembered){if(!previous?.completed)throw Error('先完成学习');const base=previous.reviewedOn===date?previous.stageBeforeToday:previous.stage||0,stage=remembered?Math.min(3,base+1):0;return {...previous,stage,stageBeforeToday:base,reviewedOn:date,nextReview:stage===3?'':addDays(date,remembered?[1,3,7][stage]:1)}}
 function validate(pack){if(pack?.format!=='essay-library-v1'||!Array.isArray(pack.docs)||!Array.isArray(pack.questions)||!pack.pages)throw Error('请选择申论精选资料包');const imageOK=x=>typeof x==='string'&&/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(x);for(const pages of Object.values(pack.pages))for(const img of Object.values(pages))if(!imageOK(img))throw Error('资料原页图片格式错误');const ids=new Set();for(const q of pack.questions){if(typeof q.id!=='string'||!q.id||ids.has(q.id)||typeof q.title!=='string'||typeof q.prompt!=='string'||!q.prompt||typeof q.source!=='string'||!Number.isInteger(q.limit)||q.limit<1||q.limit>5000||!Array.isArray(q.checks)||q.checks.length!==3||!q.checks.every(x=>typeof x==='string')||!Array.isArray(q.materialImages)||!q.materialImages.length||!Array.isArray(q.answerImages)||!q.answerImages.length||![...q.materialImages,...q.answerImages].every(imageOK))throw Error('原题与答案配对不完整');ids.add(q.id)}return pack}
 root.GongkaoEssayEngine={plan,complete,review,validate,addDays};
})(globalThis);
