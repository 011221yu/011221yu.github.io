/* 广东综合管理冲刺扩展；沿用原档案和打卡键。 */
const gdBaseBuild=GongkaoPlanner.buildDay;
GongkaoPlanner.buildDay=function(args){
 if(args.date<'2026-11-02'||args.date>'2026-12-06')return gdBaseBuild(args);
 const base=gdBaseBuild({...args,carried:[],hours:0}),tasks=[],available=Math.round(args.hours*60);let used=0;
 const add=(key,title,minutes,details,module='综合',source='粉笔')=>{if(used+minutes>available)return;tasks.push({id:`gd:${args.date}:${key}`,date:args.date,kind:key,title,minutes,details,module,source});used+=minutes};
 const special={'2026-11-02':'广东行测摸底','2026-11-07':'广东行测模考','2026-11-14':'广东行测模考','2026-11-18':'国考行测练手','2026-11-21':'广东双科模拟','2026-11-25':'国考双科模拟','2026-12-02':'广东双科全真模拟'};
 const nationalBefore=args.date<'2026-11-29';
 const day=new Date(args.date+'T12:00:00').getDay(),mixedPolitics=day===2||day===5,stage=args.date<='2026-11-11'?'重点补基':args.date<='2026-11-22'?'限时强化':args.date<='2026-11-29'?'国考实战周':'广东考前收口';
 if(!['2026-11-29','2026-12-06'].includes(args.date)){
  add('idioms','言语成语｜新学＋到期回忆',40,'按省考时间倒排首轮；新学与复习分开统计，打开“言语·成语积累”完成。','言语理解','工作台');
  if(nationalBefore)add('national','全国时政｜主题精读＋自测',mixedPolitics?25:35,'按国考日期倒排，完成一个主题的要点、易混辨析与4道自测；到期回忆优先。国考前最后两天收口，不再开新长专题。','政治理论常识','工作台');
  add('knowledge','广东省情时政｜新学＋回忆',25,'按考试日期与休息日倒排知识卡；打开“广东资料与刷题→省情时政背诵”。','广东省情时政','工作台');
 }
 if(args.date==='2026-11-29'||args.date==='2026-12-06'){
  add('exam',args.date==='2026-11-29'?'国考实战练手':'广东综合管理笔试',Math.min(available,240),'携带身份证、准考证及考试用品；考试时段按准考证执行。');
 }else if(special[args.date]&&available>=300){
  add('paper',special[args.date],special[args.date].includes('双科')?240:180,special[args.date].includes('国考')?'按国考对应类别完成行测与申论。':'广东行测14:00–15:30；双科模拟另安排申论16:15–18:45。行测单科块含作答及初步复盘。','套卷','大笔桶');
  add('paper-review','套卷复盘',60,'分模块记录正确率、用时和取舍，选出三个最需改进的动作。','复盘');
 }else{
  const light=args.date==='2026-11-28'||args.date>='2026-12-04';
  if(!nationalBefore||mixedPolitics)add('politics',nationalBefore?'粉笔政治／常识混合诊断':'政治理论／常识刷题',nationalBefore?10:30,nationalBefore?'做一小组马哲、法律等混合诊断，补全国时政之外的薄弱点；和当天25分钟全国专题合计35分钟。':'15–20题，订正后闭卷回忆；不排整套理论课。','政治理论常识');
  add('essay','广东综合管理申论精练',light?40:day===3?110:70,day===3?'完成作文或作文提纲，结合材料论证；每周安排一次长练。':'一道小题独立作答，对照材料找遗漏并重写；不只读解析。','申论');
  add('material','申论方法与表达｜微课＋短练',15,'打开“申论·学习与实作”，完成方法回忆、场景表达短练与核对；原素材时间不另叠加。','申论','工作台');
  add('review','错题重做与学习登记',nationalBefore?25:30,'先重做昨天错题；登记正确率、耗时和错因。','复盘','工作台');
  add('gd','广东省情／时政在线练习',40,'省情每次25题，分20单元完成；时政轮换专题。完成后进入错题汇总。','广东省情时政','广东资料');
  if(!light){
   add('math-data','数资联学｜资料分析＋数量关系听课',args.date<='2026-11-11'?100:80,'数资两部分都听：分别选一个重点方法，按1.5–2倍速分段学习，每部分听完立即做对应练习。资料侧重计算与读数，数量侧重方程、工程、行程、经济利润等基础。两部分分别登记学习记录。','资料分析＋数量关系');
   add('judgement','判断推理｜听课＋对应练习',args.date<='2026-11-11'?55:45,'按图推、逻辑等薄弱题型听重点方法，听完立即练习。','判断推理');
   add('science','科学推理｜听课＋专项练习',35,'力学、电学等基础分小段听课，再完成对应专项。','科学推理');
   add('verbal','言语限时练习',30,'词语辨析配合成语积累；片段阅读限时完成并登记错因。','言语理解');
   add('weak','判断／数资薄弱项补练',25,'从近期低正确率题型中挑一小组，限时完成后复盘。',GongkaoPlanner.weakestModule(args.logs)?.module||'判断推理');
  }
 }
 const seen=new Set(tasks.map(t=>t.id)),backlog=[];
 for(const t of args.carried||[])if(t.id?.startsWith('gd:')&&!seen.has(t.id)){seen.add(t.id);if(['material','politics','idioms','knowledge','national'].includes(t.kind))continue;if(used+t.minutes<=available&&t.minutes<=40){tasks.push({...t,title:t.title.startsWith('顺延｜')?t.title:'顺延｜'+t.title});used+=t.minutes}else backlog.push(t)}
 return {...base,date:args.date,available,used,remaining:Math.max(0,available-used),tasks,backlog,mode:'gd-sprint',stage,version:'gd-20261103-essay',nextModule:'数资（资料分析＋数量关系）／判断／科学推理'};
};
const gdOldEnsure=ensureDayPlan;
ensureDayPlan=function(date=today0,force=false){const key=dateKey(date),cached=state.planner.days[key];if(key>='2026-11-02'&&key<='2026-12-06'&&cached?.version!=='gd-20261103-essay')force=true;return gdOldEnsure(date,force)};
const gdOldPrimary=primaryTarget;
primaryTarget=function(){return state.examTargets.find(x=>x.id==='guangdong'&&x.date>=dateKey(today0))||gdOldPrimary()};
if(!state.notes.gdOfficialDates20261102){state.examTargets.forEach(t=>{if(t.id==='guangdong'){t.date='2026-12-06';t.source='official'}if(t.id==='guokao'){t.date='2026-11-29';t.source='official'}});state.notes.gdOfficialDates20261102=true;persist()}
const gdOldToday=renderToday;
renderToday=function(){gdOldToday();const plan=ensureDayPlan();if(plan.mode!=='gd-sprint')return;$('#today .hero h2').textContent='广东综合管理冲刺 · '+plan.stage;$('#today').insertAdjacentHTML('afterbegin',`<article class="card" style="margin-bottom:18px"><h2>广东主攻 · 国考练手</h2><p>省考 12月6日｜国考 11月29日｜听课集中判断、数资（资料分析＋数量关系）、科推；政治和常识刷题订正。</p><button class="btn primary" id="gdGo">打开广东资料与刷题</button><p style="color:var(--muted)">09:50开始；每50分钟离屏休息10分钟，12:10–13:30午饭午休、17:30–18:30晚饭。模考按正式考试时段。</p></article>`);$('#gdGo').onclick=()=>openPage('gd')};
const gdButton=document.createElement('button');gdButton.className='nav-btn';gdButton.dataset.page='gd';gdButton.textContent='📚 广东资料与刷题';document.querySelector('[data-page="mistakes"]').before(gdButton);
const gdSection=document.createElement('section');gdSection.id='gd';gdSection.className='page';document.querySelector('main').append(gdSection);titles.gd=['广东资料与刷题','省情、时政、政府报告 · 在线学习与错题汇总'];gdButton.onclick=()=>openPage('gd');
let gdDocs=[],gdQuestions=[],gdDoc='doc1',gdMode='all',gdIndex=0,gdSelected=[],gdFeedback=false,gdLockedId='';
let gdImages={};function gdAsset(path){return gdImages[path]||''}
function gdHistory(){return state.practice.history.filter(x=>x.gd===true)}
function gdRender(){
 const hist=gdHistory(),wrongIds=new Set(hist.filter(x=>!x.correct).map(x=>x.questionId)),pool=gdQuestions.filter(q=>q.doc===gdDoc&&(gdMode==='wrong'?wrongIds.has(q.id):gdMode==='new'?(!hist.some(h=>h.questionId===q.id)||(gdFeedback&&q.id===gdLockedId)):true));gdIndex=Math.min(gdIndex,Math.max(0,pool.length-1));const q=pool[gdIndex],doc=gdDocs.find(d=>d.id===gdDoc),readPage=Number(state.notes['gd-page-'+gdDoc]||1);
 $('#gd').innerHTML=`<div class="grid three"><article class="card">已答 <b>${hist.length}</b> 次</article><article class="card">正确率 <b>${hist.length?Math.round(hist.filter(x=>x.correct).length/hist.length*100):0}%</b></article><article class="card">错题 <b>${wrongIds.size}</b> 道</article></div><article class="card" style="margin-top:16px"><label>资料<select id="gdDoc" class="field">${gdDocs.map(d=>`<option value="${d.id}" ${d.id===gdDoc?'selected':''}>${esc(d.title)}（${d.pages}页）</option>`).join('')}</select></label><div class="search-actions"><button class="btn" id="gdAll">全部题</button><button class="btn" id="gdNew">未做题</button><button class="btn" id="gdWrong">错题汇总</button><button class="btn" id="gdMistakes">打开错题本</button></div><p>题目与答案来自你的资料；扫描识别文字可对照原页。资料中的多选、判断题用于积累训练。</p></article>${q?`<article class="card" style="margin-top:16px"><b>${gdIndex+1}/${pool.length} · 原题${q.number} · ${q.answer.length>1?'多选':'单选／判断'}</b><p class="question-stem">${esc(q.stem)}</p><details open><summary>查看清晰原题页（答案已遮挡）</summary><img loading="lazy" style="width:100%" src="${gdAsset(q.questionImage)}"></details>${q.options.map(o=>`<button class="quiz-option ${gdSelected.includes(o.label)?'selected':''}" data-gd-choice="${o.label}"><b>${o.label}</b><span>${esc(o.text)}</span></button>`).join('')}<div class="search-actions"><button class="btn primary" id="gdSubmit" ${gdFeedback?'disabled':''}>提交答案</button><button class="btn" id="gdPrev">上一题</button><button class="btn" id="gdNext">下一题</button></div>${gdFeedback?`<div class="formula"><b>${gdSelected.slice().sort().join('')===q.answer?'回答正确':'回答错误'}，资料答案：${esc(q.answer)}</b><p>${esc(q.analysis)}</p><details><summary>核对原答案页</summary><img loading="lazy" style="width:100%" src="${gdAsset(`gd-materials/${q.doc}/${q.answerPage}.jpg`)}"></details></div>`:''}</article>`:'<article class="card" style="margin-top:16px">当前筛选暂无可自动判分题，可继续阅读原页学习。</article>'}<article class="card" style="margin-top:16px"><h2>原资料阅读 · 自动记住页码</h2><div class="input-row"><input id="gdPage" class="field" type="number" min="1" max="${doc?.pages||1}" value="${readPage}"><button class="btn" id="gdReadPrev">上一页</button><button class="btn" id="gdReadNext">下一页</button></div><p>${esc(doc?.title||'')} · 已保留全部原页，可查看未结构化题目和图表。</p><img id="gdReadImage" loading="lazy" style="width:100%;margin-top:12px" src="${gdAsset(`gd-materials/${gdDoc}/${readPage}.jpg`)}"></article>`;
 $('#gdDoc').onchange=e=>{gdDoc=e.target.value;gdIndex=0;gdSelected=[];gdFeedback=false;gdRender()};for(const [id,mode]of[['gdAll','all'],['gdNew','new'],['gdWrong','wrong']])$('#'+id).onclick=()=>{gdMode=mode;gdIndex=0;gdSelected=[];gdFeedback=false;gdRender()};$('#gdMistakes').onclick=()=>openPage('mistakes');
 const changePage=n=>{state.notes['gd-page-'+gdDoc]=Math.max(1,Math.min(doc.pages,n));persist();$('#gdPage').value=state.notes['gd-page-'+gdDoc];$('#gdReadImage').src=gdAsset(`gd-materials/${gdDoc}/${state.notes['gd-page-'+gdDoc]}.jpg`)};$('#gdPage').onchange=e=>changePage(+e.target.value||1);$('#gdReadPrev').onclick=()=>changePage(+$('#gdPage').value-1);$('#gdReadNext').onclick=()=>changePage(+$('#gdPage').value+1);
 if(!q)return;$$('[data-gd-choice]').forEach(b=>b.onclick=()=>{if(gdFeedback)return;const c=b.dataset.gdChoice;gdSelected=q.answer.length>1?(gdSelected.includes(c)?gdSelected.filter(x=>x!==c):[...gdSelected,c]):[c];gdRender()});
 $('#gdPrev').onclick=()=>{gdIndex=Math.max(0,gdIndex-1);gdSelected=[];gdFeedback=false;gdRender()};$('#gdNext').onclick=()=>{gdIndex=(gdIndex+1)%pool.length;gdSelected=[];gdFeedback=false;gdRender()};
 $('#gdSubmit').onclick=()=>{if(!gdSelected.length)return save('请先选择答案');const choice=gdSelected.slice().sort().join(''),correct=choice===q.answer;state.practice.history.push({gd:true,questionId:q.id,module:'广东省情时政',date:dateKey(today0),choice,answer:q.answer,correct});if(!correct&&!state.mistakes.some(m=>m.sourceId===q.id))state.mistakes.unshift({id:'gd-wrong-'+q.id,sourceId:q.id,module:'常识判断',type:doc.title,text:q.stem+'\n'+q.options.map(o=>o.label+'.'+o.text).join('\n')+'\n正确答案：'+q.answer+'\n解析：'+q.analysis,reason:'知识盲区',date:dateKey(today0),status:'reviewing',reviewStage:0,nextReview:dateKey(new Date(today0.getTime()+DAY)),lastReview:''});save(correct?'回答正确':'已加入错题汇总和错题本');gdLockedId=q.id;gdFeedback=true;gdRender();renderMistakes()};
}
function gdImportView(message=''){ $('#gd').innerHTML='<article class="card"><h2>导入你的广东题库</h2><p>题库和原资料只存当前浏览器，不会上传到 GitHub。选择我提供的 shangan-materials.json.gz 文件，一次导入后可离线刷题。</p><label class="btn primary">选择题库包<input id="gdBundleFile" type="file" accept=".gz,.json" hidden></label><p id="gdBundleStatus"></p></article>';$('#gdBundleStatus').textContent=message;$('#gdBundleFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{$('#gdBundleStatus').textContent='正在导入，请保持页面打开…';const p=GongkaoLocalMaterials.activate(await GongkaoLocalMaterials.importFile(file));gdDocs=p.docs;gdQuestions=p.questions;gdImages=p.images;gdRender();save('题库已保存到本机')}catch(error){$('#gdBundleStatus').textContent=error.message}}}
GongkaoLocalMaterials.read().then(p=>{if(!p)return gdImportView();p=GongkaoLocalMaterials.activate(p);gdDocs=p.docs;gdQuestions=p.questions;gdImages=p.images;gdRender()}).catch(e=>gdImportView(e.message));
if(!recordSources.includes('广东资料'))recordSources.push('广东资料');if(!recordModules.includes('广东省情时政'))recordModules.push('广东省情时政');
renderAll();
