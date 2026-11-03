/* 广东综合管理冲刺扩展；沿用原档案和打卡键。 */
const gdBaseBuild=GongkaoPlanner.buildDay;
GongkaoPlanner.buildDay=function(args){
 if(args.date<'2026-11-02'||args.date>'2026-12-06')return gdBaseBuild(args);
 const base=gdBaseBuild({...args,carried:[],hours:0}),tasks=[],available=Math.round(args.hours*60);let used=0;
 const add=(key,title,minutes,details,module='综合',source='粉笔')=>{if(minutes<=0||used+minutes>available)return;tasks.push({id:`gd:${args.date}:${key}`,date:args.date,kind:key,title,minutes,details,module,source});used+=minutes};
 const special={'2026-11-02':'广东行测摸底','2026-11-07':'广东行测模考','2026-11-14':'广东行测模考','2026-11-18':'国考行测练手','2026-11-21':'广东双科模拟','2026-11-25':'国考双科模拟','2026-12-02':'广东双科全真模拟'};
 const nationalBefore=args.date<'2026-11-29';
 const day=new Date(args.date+'T12:00:00').getDay(),mixedPolitics=day===2||day===5,stage=args.date<='2026-11-11'?'重点补基':args.date<='2026-11-22'?'限时强化':args.date<='2026-11-29'?'国考实战周':'广东考前收口';
 const light=args.date==='2026-11-28'||args.date>='2026-12-04';
 const exam=['2026-11-29','2026-12-06'].includes(args.date),mock=special[args.date]&&available>=300;
 // Scale complete module blocks inside each subject budget, instead of dropping the last modules.
 const fit=(rows,budget)=>{if(budget<=0)return;const active=rows.slice(0,Math.min(rows.length,Math.max(1,Math.floor(budget/12)))),sum=active.reduce((n,x)=>n+x[2],0);let rest=budget;active.forEach((r,i)=>{const minutes=i===active.length-1?rest:Math.max(1,Math.floor(budget*r[2]/sum));rest-=minutes;add(r[0],r[1],minutes,r[3],r[4],r[5]||'粉笔')})};
 let essayBudget=0;
 if(exam){add('exam',args.date==='2026-11-29'?'国考实战练手':'广东综合管理笔试',Math.min(available,240),'考试时段和各科时长按准考证执行，预留交通与进场时间。','考试')}
 else if(mock){
  add('paper',special[args.date],special[args.date].includes('双科')?240:180,special[args.date].includes('国考')?'按国考对应类别练习；双科各科时长按准考证执行，必要时在计划设置增加当日时长。':'完整套卷块保留3小时；广东双科按行测90分钟、申论150分钟全真训练，作息临时服从模考时段。','套卷','大笔桶');
  add('paper-review','套卷复盘',60,'先标记漏点与耗时，再选三个改进动作；双科复盘同时记录申论审题、材料要点和论证问题。','复盘');
  // Full-paper sessions are indivisible. The 70:30 rule applies to regular study days.
  if(!special[args.date].includes('双科')){const remaining=available-used;if(remaining>=45){const n=Math.min(day===3?110:90,remaining-15);add('essay',n>=100?'申论精练｜每周完整议论文':'申论小题｜作答与订正',n,n>=100?'保留完整议论文：审题、提纲、写作和修改，字数依题干。':'独立作答、核对漏点、改写。','申论');essayBudget+=n;add('material','申论每日一段｜拆解与仿写',15,'读一个段落，提炼论证关系，再换材料练写；不整篇照抄。','申论','工作台');essayBudget+=15}}
  fit([['knowledge','广东省情时政｜回忆',25,'模考日只回忆已学要点。','广东省情时政','工作台'],['national','全国时政｜回忆',25,'国考后转为政治常识错题回看，不开新长专题。','政治理论常识','工作台'],['idioms','言语成语｜到期回忆',30,'先回忆再核对，不加新长任务。','言语理解','工作台']],available-used);
 }else{
  const total=light?Math.min(available,240):Math.min(available,440);
  essayBudget=Math.round(total*.3);
  const reading=essayBudget>=45?15:Math.min(5,essayBudget),practice=Math.min(essayBudget-reading,light?40:day===3?110:90),review=essayBudget-reading-practice;
  add('essay',day===3&&!light&&practice>=100?'广东申论精练｜每周完整议论文':'广东申论精练｜共通能力＋卷型专项',practice,day===3&&!light&&practice>=100?'完整议论文：审题提纲20分钟、写作60分钟、检查改写30分钟；申论一、二均保留，依题干要求作答。':'独立作答后核对漏点、查原因、重写。周五可在本块练作文提纲或论证段，其他日按概括、对策、分析和贯彻执行轮换。','申论');
  add('material','申论每日一段｜拆解与仿写',reading,'只读原书一个段落：看观点、事例和分析怎样衔接，再盖住仿写。短抄可选，不要求每天抄整篇。','申论','工作台');
  if(review)add('essay-review','申论复盘｜修改一段／回看漏点',review,'挑本题最弱处改写，或闭卷重写一道旧题要点。方法单元按错因查，不另加一套背诵任务。','申论','工作台');
  const rows=[
   ['math-data','数资联学｜资料分析＋数量关系',100,'两部分都听重点方法，1.5–2倍速分段学习，各听完立即练。冲刺期以错题定位补课，不追求刷完整目录。','资料分析＋数量关系'],
   ['judgement','判断推理｜方法＋限时练习',55,'图推、逻辑按薄弱项分段听，练后分析错因。','判断推理'],
   ['knowledge','广东省情时政｜新学＋回忆',25,'按省考倒排新学与回忆，打开广东省情时政。','广东省情时政','工作台'],
   ...(nationalBefore?[['national','全国时政｜主题与自测',mixedPolitics?25:35,'完成短主题与自测，先复习到期内容；考前两天不学新长专题。','政治理论常识','工作台']]:[]),
   ['gd','广东省情／时政在线练习',40,'在题库练一组，未做完顺延；题量以实际时长为准，不强凑数量。','广东省情时政','广东资料'],
   ['review','行测错题重做与登记',25,'先闭卷重做，再登记正确率、耗时、错因。','复盘','工作台'],
   ['science','科学推理｜重点方法与专项',35,'力学、电学等按错题定位补课，练基础应用。','科学推理'],
   ['idioms','言语成语｜新学＋到期回忆',40,'按考试倒排首轮与复习，新学、熟悉、记牢分开统计。','言语理解','工作台'],
   ['politics','政治理论／常识刷题订正',mixedPolitics||!nationalBefore?15:10,'不排整套常识课，用题目定位知识漏洞并订正。','政治理论常识'],
   ['verbal','言语理解｜限时练习',30,'片段阅读与词语辨析，记录错误选项为什么错。','言语理解']
  ];
  if(light)rows.splice(0,2);fit(rows,total-essayBudget);
 }
 const seen=new Set(tasks.map(t=>t.id)),backlog=[];
 for(const t of args.carried||[])if(t.id?.startsWith('gd:')&&!seen.has(t.id)){seen.add(t.id);if(['material','politics','idioms','knowledge','national'].includes(t.kind))continue;backlog.push(t)}
 return {...base,date:args.date,available,used,remaining:Math.max(0,available-used),tasks,backlog,mode:'gd-sprint',stage,essayBudget,studyRatio:exam?'exam':mock?'full-paper':'70:30',version:'gd-20261103-writing-transfer',nextModule:'数资（资料分析＋数量关系）／判断／科学推理'};
};
const gdOldEnsure=ensureDayPlan;
ensureDayPlan=function(date=today0,force=false){const key=dateKey(date),cached=state.planner.days[key];if(key>='2026-11-02'&&key<='2026-12-06'&&cached?.version!=='gd-20261103-writing-transfer')force=true;return gdOldEnsure(date,force)};
const gdOldPrimary=primaryTarget;
primaryTarget=function(){return state.examTargets.find(x=>x.id==='guangdong'&&x.date>=dateKey(today0))||gdOldPrimary()};
if(!state.notes.gdOfficialDates20261102){state.examTargets.forEach(t=>{if(t.id==='guangdong'){t.date='2026-12-06';t.source='official'}if(t.id==='guokao'){t.date='2026-11-29';t.source='official'}});state.notes.gdOfficialDates20261102=true;persist()}
const gdOldToday=renderToday;
renderToday=function(){gdOldToday();const plan=ensureDayPlan();if(plan.mode!=='gd-sprint')return;$('#today .hero h2').textContent='广东综合管理冲刺 · '+plan.stage;$('#today').insertAdjacentHTML('afterbegin',`<article class="card" style="margin-bottom:18px"><h2>广东主攻 · 国考练手</h2><p>常规日：有效学习时间行测70%、申论30%。${plan.studyRatio==='70:30'?'今日申论合计'+plan.essayBudget+'分钟，包含段落学习、作答与复盘。':'整卷模拟与考试日按试卷完整时长，不拆分凑比例。'}考前轻量日减量。</p><p>省考 12月6日｜国考 11月29日｜听课集中判断、数资（资料分析＋数量关系）、科推；政治和常识刷题订正。</p><button class="btn primary" id="gdGo">打开广东资料与刷题</button><p style="color:var(--muted)">09:50开始；每50分钟离屏休息10分钟，12:10–13:30午饭午休、17:30–18:30晚饭。模考按正式考试时段。</p></article>`);$('#gdGo').onclick=()=>openPage('gd')};
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
