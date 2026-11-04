/* A slower starting point, using existing plans and records. No completed logs are invented. */
(function(root){
 'use strict';
 const START='2026-11-04',VERSION='deadline-sprint-20261104-v2',addDays=(d,n)=>new Date(Date.parse(d+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
 const units=[
  {id:'read-question',title:'认识申论与审题',method:'audit',goal:'看懂题目要你做什么，先不写答案。',steps:['在粉笔听申论入门或审题课，约40—60分钟；超时就分段续听。','读下面的方法和示例，圈出对象、范围、任务、字数四项。','口头说出题目只问什么、没有问什么。'],recall:'这道题问问题，还是问做法？答案要依据哪段材料？'},
  {id:'find-points',title:'从材料里找到要点',method:'cause',goal:'分清问题、原因、影响和已有做法。',steps:['听对应的材料阅读基础方法，不额外追第二节课。','把示例中不同维度分别圈出来；不会概括也可以先保留原词。','口头解释每句话属于哪个维度。'],recall:'哪句话是原因，哪句话是问题，哪句话是结果？'},
  {id:'merge-points',title:'同类归并与分条',method:'group',goal:'把意思相近的内容放在一起，保留不同方面。',steps:['看归纳概括基础方法，听课与核对共用本块时间。','先读示例，再看示范怎样把四件事分成两类。','用嘴说出两类的区别，不要求写完整答案。'],recall:'为什么这两条能合并，另外两条不能混在一起？'},
  {id:'plain-words',title:'从口语到准确表达',method:'words',goal:'只学3个规范表达，知道什么时候能用。',steps:['看方法中的适用场景，不背孤立词表。','对照材料与示范，找出保留了什么、压缩了什么。','给一个表达口头举例，不能根据词语脑补原因。'],recall:'这个概括词在材料中有什么依据？'},
  {id:'specific-action',title:'问题与措施一一对应',method:'action',goal:'说清谁来做、做什么、怎样做。',steps:['在粉笔听提出对策入门，没听完下次接着听。','对照示例逐条连线：每条措施解决哪个问题。','口头把一个空泛动作说具体，不要求独立写一题。'],recall:'这条措施由谁执行，解决的具体问题是什么？'},
  {id:'essay-frame',title:'认识作文结构与论证',method:'thesis',goal:'能识别中心论点、分论点和材料依据。',steps:['读一份提纲或听作文入门，不抄整篇范文。','对照方法找中心论点、分论点和材料来源。','口头讲清一个观点为什么成立，只认识结构。'],recall:'这个观点来自哪里，材料怎样支持它？'},
  {id:'foundation-review',title:'基础回顾与短题过渡',method:'argue',goal:'回看前六步，带着材料说出思路。',steps:['按“审题—找点—归类—表达”口头复述一遍。','看一个论证示范，分清观点、事实与分析。','从旧材料挑一段口头列2—3个要点；下一学习日才开始独立短题。'],recall:'不看方法，你准备先做哪四步？'}
 ];
 function status(date,record={}){
  const start=record.start||START,days=record.days||{},done=new Set(Object.entries(days).filter(([d,v])=>d<=date&&v.done).map(([,v])=>v.unitId).filter(id=>units.some(u=>u.id===id))),saved=days[date];
  const unit=units.find(u=>u.id===saved?.unitId)||units.find(u=>!done.has(u.id))||units[6];
  const active=date>=start&&(date<addDays(start,7)||done.size<units.length),last=Object.entries(days).filter(([d,v])=>d<=date&&v.done).map(([d])=>d).sort().at(-1)||start;
  return {active,start,earliestWriting:addDays(start,7),unit,index:units.indexOf(unit),done:done.size,doneToday:!!saved?.done,transition:!active&&date<addDays(last,8)};
 }
 const catalogs=[['判断推理',41,28],['资料分析',21,21],['数量关系',24,12],['科学推理',14,10]];
 const defaultCourse={rawMinutes:90,speed:2,exercise:15,mode:'priority'};
 const minute=t=>{const [h,m]=t.split(':').map(Number);return h*60+m},clock=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
 function slots(start='09:50',end='20:50'){
  let cur=minute(start),stop=minute(end);const out=[],meals=[[730,810,'午饭午休'],[1050,1110,'晚饭休息']];
  while(cur<stop){const meal=meals.find(b=>cur>=b[0]&&cur<b[1]);if(meal){const next=Math.min(stop,meal[1]);out.push({start:cur,end:next,kind:'rest',title:meal[2]});cur=next;continue}
   const boundary=Math.min(stop,...meals.filter(b=>b[0]>cur).map(b=>b[0])),next=Math.min(cur+50,boundary);out.push({start:cur,end:next,kind:'study'});cur=next;
   if(cur<boundary){const next=Math.min(cur+10,boundary);out.push({start:cur,end:next,kind:'rest',title:'离屏活动、休息眼睛'});cur=next}
  }return out;
 }
 const net=rows=>rows.filter(x=>x.kind==='study').reduce((n,x)=>n+x.end-x.start,0);
 function courseProgress(logs=[],baseline={}){return Object.fromEntries(catalogs.map(([module])=>[module,module==='判断推理'?Math.min(41,Math.max(4,Number(baseline.judgementUnits)||4)+Math.max(0,root.GongkaoPlanner.progress(logs,'7+1理论课',module)-(Number(baseline.loggedAtSetup)||0))):root.GongkaoPlanner.progress(logs,'7+1理论课',module)]))}
 function courseInfo(logs=[],baseline={},settings={}){const cfg={...defaultCourse,...settings},unitMinutes=Math.ceil(Math.max(60,Math.min(120,Number(cfg.rawMinutes)||90))/Math.max(1.5,Math.min(2,Number(cfg.speed)||2)))+Math.max(10,Math.min(30,Number(cfg.exercise)||15)),done=courseProgress(logs,baseline),rows=catalogs.map(([module,total,priority])=>({module,total,target:cfg.mode==='full'?total:priority,done:Math.min(total,done[module])}));return {cfg,unitMinutes,rows,remaining:rows.reduce((n,r)=>n+Math.max(0,r.target-r.done),0),allRemaining:rows.reduce((n,r)=>n+Math.max(0,r.total-r.done),0)}}
 function timeline(tasks,windows){let index=0,left=tasks[0]?.minutes||0;const out=[];for(const slot of windows){if(slot.kind==='rest'){out.push(slot);continue}let cur=slot.start;while(cur<slot.end&&index<tasks.length){const n=Math.min(left,slot.end-cur);out.push({start:cur,end:cur+n,kind:'study',title:tasks[index].title,taskId:tasks[index].id});cur+=n;left-=n;if(!left){index++;left=tasks[index]?.minutes||0}}if(cur<slot.end)out.push({start:cur,end:slot.end,kind:'buffer',title:'机动与休息，不追加硬任务'})}return out}
 function build({date,hours,logs=[],carried=[],foundation={},baseline={},courseSettings={},window},base){
  const f=status(date,foundation),active=date>=START&&date<='2026-12-06',windows=slots(window?.start||(date===START?'15:30':'09:50'),window?.end||'20:50'),available=Math.max(0,Math.min(net(windows),Math.round((Number(hours)||0)*60))),info=courseInfo(logs,baseline,courseSettings);
  if(!active)return base;
  const exam=['2026-11-29','2026-12-06'].includes(date),mock=base.tasks.some(t=>t.kind==='paper');
  if(exam||mock&&!f.active)return {...base,tasks:base.tasks.slice().sort((a,b)=>Number(a.module==='申论')-Number(b.module==='申论')),adaptationVersion:VERSION,courseInfo:info};
  const total=Math.min(available,date==='2026-11-28'||date>='2026-12-04'?240:440),essayBudget=Math.round(total*.3),xing=total-essayBudget,tasks=[];
  const put=(key,title,minutes,details,module,source='工作台',extra={})=>{if(minutes>0)tasks.push({id:`gd:${date}:${key}`,date,kind:key,title,minutes,details,module,source,adapted:true,...extra})};
  const reserve=total>=400?68:Math.min(34,Math.floor(xing/3)),capacity=Math.min(total<300?2:4,Math.floor(Math.max(0,xing-reserve)/info.unitMinutes)),count=Math.min(capacity,info.remaining),assignments=[],used={};
  const order=['判断推理','资料分析','判断推理','数量关系','科学推理'];let cursor=Math.max(0,info.rows.reduce((n,r)=>n+r.done,0)-4);
  for(let i=0;i<count;i++){let picked='';for(let j=0;j<order.length;j++){const module=order[(cursor+j)%order.length],r=info.rows.find(r=>r.module===module);if(r.done+(used[module]||0)<r.target){picked=module;cursor+=j+1;break}}if(!picked)break;used[picked]=(used[picked]||0)+1;assignments.push({module:picked,ordinal:info.rows.find(r=>r.module===picked).done+used[picked]})}
  const actualCount=assignments.length,courseMinutes=actualCount?actualCount*info.unitMinutes:Math.max(0,xing-reserve),course=Object.keys(used).map(m=>m+used[m]+'节').join('＋');
  put('learning-primary',actualCount?'重点课｜'+course:'重点方法与随堂题｜分段推进',courseMinutes,`按单课原长约${info.cfg.rawMinutes}分钟、${info.cfg.speed}倍速，另留${info.cfg.exercise}分钟练习估算；实际目录按粉笔未完成内容接续，讲义下载不算课。每节听后立即做5—10道同类题。完成后登记实际节数与用时；课太长就分段，不挤占饭点。`,'重点行测','粉笔',{courseUnits:assignments,units:actualCount,id:`gd:${date}:learning-primary:${VERSION}`} );
  const memory=xing-courseMinutes,weights=total>=400?[16,24,18,10]:[8,12,8,6],sum=weights.reduce((a,b)=>a+b,0);let left=memory;
  weights.forEach((w,i)=>{const n=i===3?left:Math.floor(memory*w/sum);left-=n;
   if(i===0)put('idioms','成语｜新学与到期回忆',n,'按本块时长回忆、辨析，不整篇抄写。','言语理解');
   if(i===1)put(date<'2026-11-29'?'national':'politics',date<'2026-11-29'?'全国时政｜主题与自测':'政治常识｜错题回顾',n,'政治常识以题带点，先核对易混口径。','政治理论常识');
   if(i===2)put('knowledge','广东省情时政｜知识卡',n,'读要点后遮住回忆，再核对。','广东省情时政');
   if(i===3)put('gd','广东题库｜今日一小组',n,'按实际时长选题，做完核对原答案。','广东省情时政','广东资料');
  });
  const known=info.rows[0].done;
  if(f.active){
   const read=Math.min(15,Math.floor(essayBudget/4));
   put('essay-foundation',`申论基础 ${f.index+1}/7｜${f.unit.title}`,essayBudget-read,'先听或看方法，再对照示例，最后口头复述；本周不要求独立写完整答案。','申论','粉笔＋工作台');
   put('material','申论基础回忆｜看懂一个示范',read,'回看今日示范，口头说出方法。可自愿记一句心得，不要求仿写或抄整篇。','申论');
  }else{
   const original=base.tasks.find(t=>t.kind==='essay'),read=Math.min(15,Math.floor(essayBudget/4)),practice=Math.min(essayBudget-read,f.transition?45:original?.minutes||60),review=essayBudget-read-practice;
   put('essay',f.transition?'申论起步｜一小题找点与短答':original?.title||'申论小题｜作答与订正',practice,f.transition?'从一段材料、2—3个要点开始；先列要点再写短答，接着核对修改。不直接写完整作文。':original?.details||'先独立作答，再对照材料修改。','申论','粉笔＋工作台');
   put('material','申论每日一段｜拆解与仿写',read,'读一个短段，理解逻辑后仿写；不整篇照抄。','申论');
   put('essay-review','申论回看｜方法与订正',review,f.transition?'先回看本题对应方法，再改漏点；余下时间口头复述，不额外开第二题。':'修改最弱处并回看方法。','申论');
  }
  return {...base,available,tasks,used:total,remaining:available-total,backlog:[],stage:f.active?'行测冲刺＋申论基础':f.transition?'行测强化＋申论短题':'重点强化',foundation:f,essayBudget,studyRatio:'70:30',adaptationVersion:VERSION,nextModule:course||'薄弱点查漏',judgementKnown:known,courseInfo:info,courseUnits:actualCount,timeline:timeline(tasks,windows),studyWindows:windows};
 }
 root.ShanganFoundation={START,VERSION,units,status,build,addDays,slots,net,clock,timeline,courseInfo,defaultCourse};
})(globalThis);

// Browser integration: original records and private packages remain in their existing stores.
if(typeof document!=='undefined'){
 const foundationBaseBuild=GongkaoPlanner.buildDay;
 if(!state.notes.learningBaseline20261104){state.notes.learningBaseline20261104={date:'2026-11-04',judgementUnits:4,loggedAtSetup:GongkaoPlanner.progress(state.studyLogs,'7+1理论课','判断推理')};persist()}
 if(!state.notes.deadlineSprint20261104){state.notes.deadlineSprint20261104={start:'2026-11-04',course:{...ShanganFoundation.defaultCourse},todayWindow:{date:'2026-11-04',start:'15:30',end:'20:50'}};state.planner.dayHours['2026-11-04']=220/60;persist()}
 function sprintSettings(){return state.notes.deadlineSprint20261104}
 function sprintWindow(date){return date===sprintSettings().todayWindow.date?sprintSettings().todayWindow:{start:state.planner.settings.studyStart||'09:50',end:state.planner.settings.studyEnd||'20:50'}}
 const sprintHours=currentHours;
 currentHours=function(date=today0){const key=typeof date==='string'?date:dateKey(date),w=sprintWindow(key);return Math.min(sprintHours(date),ShanganFoundation.net(ShanganFoundation.slots(w.start,w.end))/60)};
 function foundationRecord(){const r=essayRecord();return r.foundation||(r.foundation={start:ShanganFoundation.START,days:{}})}
 function foundationState(date=essayDate()){return ShanganFoundation.status(date,foundationRecord())}
 function foundationSignature(){return JSON.stringify([foundationRecord(),state.notes.learningBaseline20261104,state.studyLogs.map(x=>[x.id,x.module,x.units]),sprintSettings(),state.planner.settings.studyStart,state.planner.settings.studyEnd])}
 GongkaoPlanner.buildDay=function(args){const input={...args,foundation:args.foundation||foundationRecord(),baseline:args.baseline||state.notes.learningBaseline20261104,courseSettings:args.courseSettings||sprintSettings().course,window:args.window||sprintWindow(args.date)},p=ShanganFoundation.build(input,foundationBaseBuild(args));return {...p,foundationSignature:foundationSignature()}};
 const foundationEnsure=ensureDayPlan;
 ensureDayPlan=function(date=today0,force=false){const k=dateKey(date),p=state.planner.days[k];if(k>=ShanganFoundation.START&&(p?.adaptationVersion!==ShanganFoundation.VERSION||p?.foundationSignature!==foundationSignature()))force=true;return foundationEnsure(date,force)};
 const foundationPractice=essayPracticeToday;
 essayPracticeToday=function(){return foundationState().active?{mode:'foundation',id:'',type:''}:foundationState().transition?GongkaoEssayEngine.practicePlan({date:essayDate(),examDate:state.examTargets.find(t=>t.id==='guangdong')?.date||'2026-12-06',rest:!currentHours(today0),minutes:Math.min(45,ensureDayPlan().tasks.find(t=>t.kind==='essay')?.minutes||0),paperType:essayRecord().paperType,questions:essayQuestions().filter(q=>q.type!=='作文'),records:essayRecord().practice}):foundationPractice()};
 const foundationReading=essayReadingPlan;
 essayReadingPlan=function(){return foundationState().active?null:foundationReading()};
 const foundationRender=essayRender;
 essayRender=function(){
  const f=foundationState();
  if(!f.active||!['today','reading','practice'].includes(essayView))return foundationRender();
  const p=ensureDayPlan(),t=p.tasks.find(t=>t.kind==='essay-foundation'),u=f.unit,l=GongkaoEssay.byId.get(u.method),r=foundationRecord(),a=r.days[essayDate()]||{unitId:u.id,checks:[],note:'',done:false};
  essaySection.innerHTML=`<article class="card foundation-header" data-foundation-header><span class="tag">先行测，后申论 · 基础 ${f.index+1}/7</span><h2>先把方法学会，再开始独立写</h2><p>基础期至少一周，最早11月11日起练短题；按完成情况顺延。已完成 ${f.done}/7 个基础单元，今天最多推进一个。${t?'今日申论合计'+p.essayBudget+'分钟，已计入三成时间。':'今日休息或考试，不派新任务。'}</p><div class="gd-toolbar"><button class="btn primary" id="essayFoundationToday">今日基础</button><button class="btn" id="essayFoundationMethods">方法资料</button><button class="btn" id="essayFoundationLibrary">原资料与导入</button></div></article><div id="essayBody" style="margin-top:16px"><article class="card"><h2>${esc(u.title)}</h2><p>${esc(u.goal)}</p>${t?`<ol class="nat-points">${u.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol><h3>先读方法</h3><ol>${l.points.map(s=>`<li>${esc(s)}</li>`).join('')}</ol><details><summary>看一个教学示范（不是测验）</summary><p class="study-material">${esc(l.scenario)}</p><p><b>示范怎样处理：</b>${esc(l.reference)}</p></details><h3>口头回忆</h3><p>${esc(u.recall)}</p>${['我已学过今天的方法（听课或阅读均可）','我已对照示例，知道方法怎样用','我已遮住方法口头复述；不懂的地方已回看'].map((s,i)=>`<label class="essay-check"><input type="checkbox" data-foundation-check="${i}" ${(a.checks||[]).includes(i)?'checked':''}>${esc(s)}</label>`).join('')}<label>一句心得（可留空）<textarea id="essayFoundationNote" placeholder="记一个今天弄懂的地方即可">${esc(a.note)}</textarea></label><button class="btn primary" id="essayFoundationDone">${a.done?'已完成，保存补充':'完成今日基础学习'}</button><p class="essay-muted">不需要先写答案才能打卡。同一天完成后只回看，下一学习日再进下一单元。</p>`:'<p>今天保留休息，可自主回看，不计作必须完成的基础任务。</p>'}<details class="study-help"><summary>一周基础路线</summary><ol>${ShanganFoundation.units.map(x=>`<li>${esc(x.title)}</li>`).join('')}</ol><p>没学完就接着上一单元，不叠加新课；原有草稿、笔记和错题继续保留。</p></details></article></div>`;
  $('#essayFoundationToday').onclick=()=>{essayView='today';essayRender()};$('#essayFoundationMethods').onclick=()=>{essayView='lessons';essayLesson=u.method;essayRender()};$('#essayFoundationLibrary').onclick=()=>{essayView='library';essayRender()};
  if(!t)return;
  const keep=()=>{r.days[essayDate()]=a;persist()};
  $$('[data-foundation-check]').forEach(b=>b.onchange=()=>{a.checks=$$('[data-foundation-check]').filter(x=>x.checked).map(x=>Number(x.dataset.foundationCheck));keep()});
  $('#essayFoundationNote').oninput=e=>{a.note=e.target.value;keep()};
  $('#essayFoundationDone').onclick=()=>{if(a.checks.length!==3)return save('先学方法、看示例并口头复述，再完成打卡');a.done=true;a.completedOn=essayDate();keep();for(const x of p.tasks.filter(x=>['essay-foundation','material'].includes(x.kind)))state.done[x.id]=true;persist();renderToday();essayRender();save('今日基础已完成，下一学习日继续；不用加写作文')};
 };
 essayOpen=function(){essayView='today';openPage('essay');essayRender()};essayNav.onclick=essayOpen;
 function sprintDay(date=dateKey(today0)){return Math.max(1,Math.floor((Date.parse(date)-Date.parse(ShanganFoundation.START))/DAY)+1)}
 scheduleNotice=function(){const w=sprintWindow(dateKey(today0));return `今日 ${w.start}—${w.end}，已扣除饭点和离屏休息；净可用约${Math.round(currentHours()*60)}分钟。行测在前，申论在后，按七三分配。`};
 function sprintGo(kind){
  if(kind==='knowledge'){gdView='read';openPage('gd');gdRender()}
  else if(kind==='gd'){openPage('gd');if(gdQuestions.length)gdStartDaily();else{gdView='practice';gdRender()}}
  else if(kind==='idioms'){idiomView='new';idiomOpen()}
  else if(kind==='national')natOpen();
  else if(kind==='politics'){openPage('mistakes')}
  else if(kind==='essay-foundation'||kind==='material'&&foundationState().active)essayOpen();
  else if(['essay','material','essay-review'].includes(kind)){essayView=kind==='material'?'reading':'practice';openPage('essay');essayRender()}
  else if(kind==='learning-primary'){openPage('records');$('#logSource').value='7+1理论课';const rows=ensureDayPlan().tasks.find(t=>t.kind===kind)?.courseUnits||[];if(rows.length){$('#logModule').value=rows[0].module;$('#logUnits').value=rows.filter(x=>x.module===rows[0].module).length}$('#logMinutes').value='';$('#logNote').value='请按粉笔实际完成的节数和用时登记；计划量不等于已完成。';$('#logModule').focus()}
  else openPage('records');
 }
 const sprintTaskHTML=taskHTML;
 taskHTML=function(t){const row=ensureDayPlan().tasks.find(x=>x.id===t.id);if(!row)return sprintTaskHTML(t);const label=row.kind==='learning-primary'?'登记粉笔进度':row.kind==='knowledge'?'去背省情时政':row.kind==='gd'?'开始今日刷题':row.kind==='national'?'开始全国时政':row.kind==='idioms'?'去背成语':row.kind==='politics'?'看错题':'开始学习';return `<div class="task sprint-task ${state.done[t.id]?'done':''}"><button class="check ${state.done[t.id]?'done':''}" data-check="${esc(t.id)}" aria-label="完成${esc(t.title)}">${state.done[t.id]?'✓':''}</button><div class="task-main"><b>${esc(t.title)}</b><small>${esc(t.tag)} · ${row.source==='粉笔'?'在粉笔听课与练习':'可在工作台学习'}</small><details><summary>本项要求</summary><small>${esc(t.desc)}</small></details><button class="btn primary sprint-jump" data-sprint-go="${row.kind}">${label}</button></div></div>`};
 const foundationToday=renderToday;
 renderToday=function(){
  foundationToday();const p=ensureDayPlan(),f=foundationState();if(p.adaptationVersion!==ShanganFoundation.VERSION)return;
  for(const id of ['gdTodayRead','natTodayStart','idiomTodayStart','essayTodayStart'])$('#'+id)?.closest('article')?.remove();
  const top=$('#gdGo')?.closest('article');if(top)top.remove();
  const hero=$('#today .hero');if(hero){hero.dataset.studyHero='1';hero.querySelector('.eyebrow').textContent='冲刺第'+sprintDay()+'天 · 从11月4日重新起算';hero.querySelector('h2').textContent='先行测，后申论';hero.querySelector('p').textContent=`${p.courseUnits?`今日目标${p.courseUnits}节重点课（含随堂练习）。`:'今天按本日时长练习。'}申论${f.active?'先学基础方法，不要求写完整答案':'从短题与订正逐步练写'}。课量和倍速可在计划设置调整，旧记录继续保留。`}
  const sections=$$('#today .section-head'),head=sections.find(x=>x.textContent.includes('今日任务')),card=head?.nextElementSibling;
  if(head&&card){head.querySelector('h2').textContent='按顺序开始 · 3组任务';const own=state.custom.filter(x=>x.date===dateKey(today0)),asTask=x=>({id:x.id,title:x.title,tag:x.minutes+'分钟',desc:x.details}),core=p.tasks.filter(t=>t.kind==='learning-primary'),memory=p.tasks.filter(t=>['idioms','national','politics','knowledge','gd'].includes(t.kind)),essay=p.tasks.filter(t=>t.module==='申论');card.innerHTML=`<h3>一、行测重点课</h3>${core.map(x=>taskHTML(asTask(x))).join('')}<section class="sprint-memory"><h3>二、记忆与小练 · ${memory.reduce((n,x)=>n+x.minutes,0)}分钟</h3><div class="gd-toolbar">${memory.map(t=>`<button class="btn sprint-jump" data-sprint-go="${t.kind}">${({idioms:'成语',national:'全国时政',politics:'政治错题',knowledge:'省情时政',gd:'广东刷题'})[t.kind]} · ${t.minutes}分</button>`).join('')}</div><details><summary>各项打卡与要求</summary>${memory.map(x=>taskHTML(asTask(x))).join('')}</details></section><h3>三、申论 · ${p.essayBudget||0}分钟</h3>${essay.filter(x=>!(f.active&&x.kind==='material')).map(x=>taskHTML(asTask(x))).join('')}${f.active&&essay.length?'<p class="essay-muted">包含方法学习和回忆；在基础学习页完成后，两项会一起打卡。</p>':''}${own.length?'<h3>自定义任务</h3>'+own.map(taskHTML).join(''):''}`;bindChecks()}
  $$('[data-sprint-go]').forEach(b=>b.onclick=()=>sprintGo(b.dataset.sprintGo));
  if(p.timeline?.length){const d=document.createElement('details');d.className='card sprint-timeline';d.innerHTML='<summary>今日具体时段（含饭点与休息）</summary>'+p.timeline.map(x=>`<div class="schedule-row ${x.kind==='rest'?'rest':''}"><span class="time">${ShanganFoundation.clock(x.start)}—${ShanganFoundation.clock(x.end)}</span><span>${esc(x.title)}</span></div>`).join('');$('#today').append(d)}
  const numbers=$$('#today .hero-stat b');if(numbers[2])numbers[2].textContent=(currentHours()).toFixed(1)+'h';const hours=$('#todayHours');if(hours)hours.value=String(Math.round(currentHours()*100)/100);
 };
 const sprintChrome=updateChrome;updateChrome=function(){sprintChrome();const target=primaryTarget();$('#sideCountdown').textContent=(target?'距'+target.name+' '+daysLeft(target)+'天':'考试日期待确认')+' · 冲刺第'+sprintDay()+'天'};
 const foundationLessonRender=essayLessonView;
 essayLessonView=function(){foundationLessonRender();if(!foundationState().active)return;const panel=$('#essayLessonPanel');if(panel)panel.insertAdjacentHTML('afterbegin','<p class="formula">本周只需读方法、看示范并口头复述；下方书面短练可暂不做，返回“今日学习”完成基础打卡。</p>')};
 function sprintCourseSummary(){const p=ensureDayPlan(),c=p.courseInfo||ShanganFoundation.courseInfo(state.studyLogs,state.notes.learningBaseline20261104,sprintSettings().course);let capacity=0,days=0;for(let d=dateKey(today0);d<'2026-11-28';d=ShanganFoundation.addDays(d,1)){if(['2026-11-14','2026-11-18','2026-11-21','2026-11-25'].includes(d))continue;const h=currentHours(new Date(d+'T12:00:00'));if(!h)continue;const total=Math.round(h*60),x=total-Math.round(total*.3),reserve=total>=400?68:Math.min(34,Math.floor(x/3));capacity+=Math.min(total<300?2:4,Math.floor(Math.max(0,x-reserve)/c.unitMinutes));days++}return {c,capacity,days}}
 const foundationPlanRender=renderPlan;
 renderPlan=function(){foundationPlanRender();const {c,capacity,days}=sprintCourseSummary(),cfg=sprintSettings().course;const card=document.createElement('article');card.className='card sprint-course-settings';card.innerHTML=`<h2>重点课倒排 · 从真实进度开始</h2><p>7+1共215条，扣10份讲义后205节；其中判断、资料、数量、科推共100节。你反馈判断已听4节，目前全部重点课约剩${c.allRemaining}节。粉刷刷用于听后补弱；大笔桶按整卷计时，不把98条目录算成98节课。</p><div class="settings-grid"><label>单课原长估计（分钟）<input class="field" id="sprintRaw" type="number" min="60" max="120" step="5" value="${cfg.rawMinutes}"></label><label>倍速<select class="field" id="sprintSpeed"><option value="2">2倍</option><option value="1.75">1.75倍</option><option value="1.5">1.5倍</option></select></label><label>每节随堂练习（分钟）<input class="field" id="sprintExercise" type="number" min="10" max="30" value="${cfg.exercise}"></label><label>听课范围<select class="field" id="sprintMode"><option value="priority">先重点71节，其余查漏</option><option value="full">全部重点100节（量力安排）</option></select></label></div><p>暂按单节含练习约${c.unitMinutes}分钟估算。11月28日前约${days}个非整卷学习日，可容纳约${capacity}节；所选范围还剩${c.remaining}节。${capacity<c.remaining?'容量不足：优先高收益内容，无法保证全部听完；不把未完成变成熬夜补课。':'有机会完成所选范围，前提是实际课长与登记进度接近估计。'}</p><details><summary>课程取舍与统计口径</summary><p>优先配额是学习建议，具体课名尚未逐条核对；按粉笔实际目录挑重点：判断重图推与逻辑，资料覆盖基础方法，数量重常见模型，科推重基础应用。并不代表原目录前几节刚好对应这些考点。</p><table class="nat-table"><tr><th>模块</th><th>总课量</th><th>本轮目标</th><th>已听估计</th></tr>${c.rows.map(r=>`<tr><td>${r.module}</td><td>${r.total}</td><td>${r.target}</td><td>${r.done}</td></tr>`).join('')}</table><p>常识和政治不排整套听课，言语主要刷题和积累；申论先基础再写作。原长90分钟、2倍速、练习15分钟是可修改的预算假设；没有伪造单节实际时长。每天目标2—4节会按可用时间缩放。</p></details>`;$('#plan').prepend(card);$('#sprintSpeed').value=String(cfg.speed);$('#sprintMode').value=cfg.mode;const change=()=>{cfg.rawMinutes=Math.max(60,Math.min(120,Number($('#sprintRaw').value)||90));cfg.speed=Number($('#sprintSpeed').value);cfg.exercise=Math.max(10,Math.min(30,Number($('#sprintExercise').value)||15));cfg.mode=$('#sprintMode').value;persist();ensureDayPlan(today0,true);renderAll();save('课时预算已更新，按实际容量重排')};for(const id of ['sprintRaw','sprintSpeed','sprintExercise','sprintMode'])$('#'+id).onchange=change;
  const notice=$$('#plan .formula').find(n=>n.textContent.includes('建议节奏'));if(notice)notice.textContent='可学习窗口09:50—20:50，扣午饭午休80分钟、晚饭60分钟和离屏休息后，完整日净学习约7小时20分钟；今天15:30开始，净约3小时40分钟。先行测、后申论，七三比例。休息日继续生效。';for(const p of $$('#plan p'))if(p.textContent.includes('广东省考：2026-12-05'))p.textContent=state.examTargets.filter(t=>t.date).map(t=>t.name+'：'+t.date).join('；')+'。事业编仍按目标月份安排。';};
 renderAll();
}
