/* A slower starting point, using existing plans and records. No completed logs are invented. */
(function(root){
 'use strict';
 const START='2026-11-04',VERSION='foundation-20261104',addDays=(d,n)=>new Date(Date.parse(d+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
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
 function build({date,hours,logs=[],carried=[],foundation={},baseline={}},base){
  const f=status(date,foundation),active=date>=START&&date<='2026-12-06',available=Math.max(0,Math.round((Number(hours)||0)*60));
  if(!active)return base;
  const exam=['2026-11-29','2026-12-06'].includes(date),mock=base.tasks.some(t=>t.kind==='paper');
  if(exam||mock&&!f.active)return {...base,tasks:base.tasks.slice().sort((a,b)=>Number(a.module==='申论')-Number(b.module==='申论')),adaptationVersion:VERSION};
  const total=Math.min(available,date==='2026-11-28'||date>='2026-12-04'?240:f.active?360:420),essayBudget=Math.round(total*.3),xing=total-essayBudget,tasks=[];
  const put=(key,title,minutes,details,module,source='工作台',extra={})=>{if(minutes>0)tasks.push({id:`gd:${date}:${key}`,date,kind:key,title,minutes,details,module,source,adapted:true,...extra})};
  const elapsed=Math.max(0,Math.floor((Date.parse(date)-Date.parse(START))/86400000)),cycle=['judgement','math-data','judgement','math-data','science','math-data','judgement'];
  const carry=carried.find(t=>t.adapted&&t.kind==='learning-primary'),primary=carry?.primary||cycle[elapsed%cycle.length];
  const logged=root.GongkaoPlanner.progress(logs,'7+1理论课','判断推理'),known=Math.max(4,Number(baseline.judgementUnits)||4)+Math.max(0,logged-(Number(baseline.loggedAtSetup)||0));
  const names={judgement:'判断推理', 'math-data':'数资（资料分析＋数量关系）',science:'科学推理'},course=names[primary];
  const weights=[120,22,30,25,20,35],kinds=['learning-primary','idioms',date<'2026-11-29'?'national':'politics','knowledge','gd','review'];let left=xing;
  // One main course replaces an unfinished one; a missed day does not accumulate extra new lessons.
  weights.forEach((w,i)=>{
   const n=i===weights.length-1?left:Math.floor(xing*w/252);left-=n;
   if(i===0)put(kinds[i],`${carry?'续学｜':'主课｜'}${course} · 最多1节＋随堂练习`,n,`${primary==='judgement'?`你反馈判断已听4节；结合之后登记，当前约${known}节。接着未掌握的内容学。` : primary==='math-data'?'资料分析与数量关系都要听：先接上次未完部分，再轮换另一部分；同一天不硬塞两节新课。':'只补力学、电学等基础方法。'}按1.5—2倍速分段听；听后做5—10道同类基础题并订正。听不完就在下一次主课续学，不追课数。`,course,'粉笔',{primary,...(carry?{id:carry.id,carriedFrom:carry.carriedFrom||carry.date}:{})});
   if(i===1)put(kinds[i],'言语成语｜短时回忆',n,'按本块时间先复习再新学；不把背诵量挤进吃饭和休息。','言语理解');
   if(i===2)put(kinds[i],'全国时政与政治常识｜主题＋自测',n,'过一个短主题及配套基础题；政治常识以做题订正为主。国考后以回顾为主。','政治理论常识');
   if(i===3)put(kinds[i],'广东省情时政｜新学与回忆',n,'按卡片逐条读、遮住回忆；不整页生背。','广东省情时政');
   if(i===4)put(kinds[i],'广东省情时政｜一小组练习',n,'按本块时长练题，核对原答案；错题先弄懂，不强凑数量。','广东省情时政','广东资料');
   if(i===5)put(kinds[i],'行测回看｜今天学过的题',n,'只重做今天主课的错题与犹豫题，登记耗时和错因；不再开第二个大模块。','复盘');
  });
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
  return {...base,available,tasks,used:total,remaining:available-total,backlog:[],stage:f.active?'基础适应周':f.transition?'短题起步':'重点强化',foundation:f,essayBudget,studyRatio:'70:30',adaptationVersion:VERSION,nextModule:course,judgementKnown:known};
 }
 root.ShanganFoundation={START,VERSION,units,status,build,addDays};
})(globalThis);

// Browser integration: original records and private packages remain in their existing stores.
if(typeof document!=='undefined'){
 const foundationBaseBuild=GongkaoPlanner.buildDay;
 if(!state.notes.learningBaseline20261104){state.notes.learningBaseline20261104={date:'2026-11-04',judgementUnits:4,loggedAtSetup:GongkaoPlanner.progress(state.studyLogs,'7+1理论课','判断推理')};persist()}
 function foundationRecord(){const r=essayRecord();return r.foundation||(r.foundation={start:ShanganFoundation.START,days:{}})}
 function foundationState(date=essayDate()){return ShanganFoundation.status(date,foundationRecord())}
 function foundationSignature(){return JSON.stringify([foundationRecord(),state.notes.learningBaseline20261104,GongkaoPlanner.progress(state.studyLogs,'7+1理论课','判断推理')])}
 GongkaoPlanner.buildDay=function(args){const input={...args,foundation:args.foundation||foundationRecord(),baseline:args.baseline||state.notes.learningBaseline20261104},p=ShanganFoundation.build(input,foundationBaseBuild(args));return {...p,foundationSignature:foundationSignature()}};
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
 const foundationNotice=scheduleNotice;
 scheduleNotice=function(){return foundationState().active?`可学习时段 ${state.planner.settings.studyStart}—${state.planner.settings.studyEnd}；基础周按净学习最多6小时安排，剩余可用时间留作消化和休息。自定义休息日保留。`:foundationNotice()};
 const foundationToday=renderToday;
 renderToday=function(){
  foundationToday();const p=ensureDayPlan(),f=foundationState();if(p.adaptationVersion!==ShanganFoundation.VERSION)return;
  const top=$('#gdGo')?.closest('article');if(top){top.querySelector('h2').textContent=f.active?'先行测，后申论 · 基础适应周':'先行测，后申论 · 逐步练写';const ps=top.querySelectorAll('p');if(ps[0])ps[0].textContent=`常规日保持行测70%、申论30%；${f.active?'先按净学习最多6小时，听课、练习、回看都算在内。申论先学方法、看示例、口头回忆。':'按完成情况推进短题与订正。'}饭点和离屏休息保留。`;if(ps[1])ps[1].textContent='判断推理已听4节；一天最多一节新课。数资两部分都听，分天推进；不再同一天铺开所有听课模块。'}
  const old=$('#essayTodayStart')?.closest('article');if(old)old.remove();
  if(f.active&&p.tasks.some(t=>t.kind==='essay-foundation')){$('#today').insertAdjacentHTML('beforeend',`<article class="card" style="margin-top:16px"><span class="tag">完成行测后再打开</span><h2>申论基础 ${f.index+1}/7 · ${esc(f.unit.title)}</h2><p>${esc(f.unit.goal)} 已完成${f.done}/7单元。</p><button class="btn primary" id="essayTodayStart">开始基础学习与打卡</button></article>`);$('#essayTodayStart').onclick=essayOpen}
  const hero=$('#today .hero p');if(hero)hero.textContent='先完成行测主课和小组练习，再进入申论。没有听完的主课接着学，基础周先不安排整卷模考；未完成不加倍。';
 };
 const foundationLessonRender=essayLessonView;
 essayLessonView=function(){foundationLessonRender();if(!foundationState().active)return;const panel=$('#essayLessonPanel');if(panel)panel.insertAdjacentHTML('afterbegin','<p class="formula">本周只需读方法、看示范并口头复述；下方书面短练可暂不做，返回“今日学习”完成基础打卡。</p>')};
 const foundationPlanRender=renderPlan;
 renderPlan=function(){foundationPlanRender();const notice=$$('#plan .formula').find(n=>n.textContent.includes('建议节奏'));if(notice)notice.textContent='基础周每天净学习最多6小时，先行测后申论，保留七三比例；其余可用时间留给消化和休息。50分钟左右离屏活动10分钟，午饭午休12:10—13:30，晚饭17:30—18:30。自定义休息日继续生效。';for(const p of $$('#plan p'))if(p.textContent.includes('广东省考：2026-12-05'))p.textContent=state.examTargets.filter(t=>t.date).map(t=>t.name+'：'+t.date).join('；')+'。事业编仍按目标月份安排。';};
 renderAll();
}
