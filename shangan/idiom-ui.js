/* 独立的言语积累区；个人词库在本机，进度沿用工作台备份。 */
const idiomStyle=document.createElement('style');idiomStyle.textContent='.idiom-head{display:flex;gap:12px;justify-content:space-between;align-items:center;flex-wrap:wrap}.idiom-word{font-size:clamp(30px,5vw,46px);letter-spacing:.08em;margin:22px 0}.idiom-definition{line-height:1.9;font-size:17px;white-space:pre-wrap}.idiom-flash{margin:16px 0;padding:22px;border:1px solid var(--line);border-radius:16px;background:var(--paper,#fff)}.idiom-flash[hidden]{display:none}.idiom-footer{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0}.idiom-footer .btn{min-height:44px}.idiom-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:10px;margin:14px 0}.idiom-list button{text-align:left;border-radius:12px}.idiom-list small{display:block;color:var(--muted);line-height:1.5;margin-top:6px}.idiom-source{width:100%;height:70vh;border:1px solid var(--line);border-radius:12px}.idiom-meter{font-weight:700;color:var(--green);padding:12px 0}.idiom-note{min-height:75px}';document.head.append(idiomStyle);
const idiomNav=document.createElement('button');idiomNav.className='nav-btn';idiomNav.dataset.page='idioms';idiomNav.textContent='🔤 言语·成语积累';document.querySelector('[data-page="gd"]').before(idiomNav);
const idiomSection=document.createElement('section');idiomSection.id='idioms';idiomSection.className='page';document.querySelector('main').append(idiomSection);titles.idioms=['言语·成语积累','高频成语与实词 · 按省考时间倒排 · 看词回忆与易混辨析'];
let idiomBook=null,idiomWords=[],idiomPdfUrl='',idiomView='new',idiomCursor=0,idiomRevealed=false,idiomSelected='',idiomBrowsePage=0,idiomQuery='',idiomGroup='',idiomKind='';
function idiomRecord(){return state.notes.idiomStudy||(state.notes.idiomStudy={days:{},progress:{},memos:{},starred:{},settings:{pace:'exam'}})}
function idiomToday(){
 const date=dateKey(today0),r=idiomRecord(),calendar=gdStudyCalendar(),rest=calendar.restDates.includes(date);
 if(!idiomWords.length)return {newIds:[],reviewIds:[],rest,unimported:true};
 const remaining=idiomWords.filter(w=>!r.progress[w.id]?.learnedAt).length;
 const pace=GongkaoReading.pace({date,...calendar,remaining,round:5});
 const plan=GongkaoIdioms.plan({date,words:idiomWords,days:r.days,progress:r.progress,quota:pace.quota,rest});
 if(!rest&&!r.days[date]){r.days[date]={...plan,...pace};persist();return r.days[date]}
 return plan;
}
function idiomOpen(){if(idiomWords.length&&['new','review'].includes(idiomView))idiomCursor=Math.max(0,idiomQueue().findIndex(w=>!idiomDone(w.id)));openPage('idioms');idiomRender()}
idiomNav.onclick=idiomOpen;
function idiomActivate(book){GongkaoIdioms.validate(book);if(idiomPdfUrl)URL.revokeObjectURL(idiomPdfUrl);idiomBook=book;idiomWords=GongkaoIdioms.words(book.entries);idiomPdfUrl=book.pdf instanceof Blob?URL.createObjectURL(book.pdf):''}
function idiomImportMarkup(){return `<article class="card"><h2>载入你的花生成语词库</h2><p>已按原书整理993条条目、990个不同词语，保留81组分类、释义和原页出处。包括成语与实词；重复词只排一次新学。</p><p>首次选择《花生高频成语1000记忆版（彩色）》原PDF即可。资料和进度保存在当前浏览器，以后直接学习。</p><label class="btn primary" style="display:inline-block">选择原PDF，载入成语<input id="idiomFile" type="file" accept="application/pdf,.pdf" hidden></label><p id="idiomImportStatus" role="status"></p></article>`}
function idiomBindImport(){const input=$('#idiomFile');if(!input)return;input.onchange=async e=>{
 const file=e.target.files[0];if(!file)return;input.disabled=true;
 try{$('#idiomImportStatus').textContent='正在本机读取PDF…';const book=await GongkaoIdioms.importPdf(file,(page,total)=>{$('#idiomImportStatus').textContent=`正在本机识别第${page}/${total}页，并核对分组条数…`});await GongkaoLocalMaterials.writePackage('idioms-v1',book);idiomActivate(book);idiomRender();renderToday();save(`已载入${idiomWords.length}个词，原有省情题库与学习记录保留`)}catch(error){$('#idiomImportStatus').textContent=error.message;input.disabled=false}
}}
function idiomQueue(){const p=idiomToday();return (idiomView==='review'?p.reviewIds:p.newIds).map(id=>idiomWords.find(w=>w.id===id)).filter(Boolean)}
function idiomDone(id){return idiomRecord().progress[id]?.lastStudy===dateKey(today0)}
function idiomSync(){const p=idiomToday(),ids=[...p.newIds,...p.reviewIds],task=ensureDayPlan().tasks.find(t=>t.kind==='idioms');if(task&&ids.length)state.done[task.id]=ids.every(idiomDone);persist();renderToday()}
function idiomMark(word,result){const r=idiomRecord();r.progress[word.id]=GongkaoIdioms.grade(r.progress[word.id],result,dateKey(today0));idiomSync();idiomRevealed=false;if(['new','review'].includes(idiomView)){const queue=idiomQueue(),next=queue.findIndex((w,i)=>i>idiomCursor&&!idiomDone(w.id));idiomCursor=next>=0?next:Math.max(0,queue.findIndex(w=>!idiomDone(w.id)))}idiomRender()}
function idiomWordMarkup(word,practice=true){
 const r=idiomRecord(),progress=r.progress[word.id],isReview=idiomView==='review',show=idiomRevealed||!practice;
 return `<div class="idiom-flash" data-idiom-word="${word.id}"><span class="tag">${esc(word.kind)} · ${esc(word.group)}</span><p style="color:var(--muted)">${esc(word.subgroup)}</p><h2 class="idiom-word">${esc(word.word)}</h2><p>${isReview?'先闭卷说出含义，再与原书核对。':'先想含义、适用对象和常见搭配，再展开释义。'}</p>${!show?'<button class="btn primary" id="idiomReveal">展开原书释义</button>':`<div class="idiom-definition" id="idiomDefinition">${esc(word.definition)}</div>${word.variants.length>1?`<details><summary>同词在原书其他分类中的释义（${word.variants.length-1}处）</summary>${word.variants.slice(1).map(v=>`<p><b>${esc(v.group)} · 第${v.page}页：</b>${esc(v.definition)}</p>`).join('')}</details>`:''}`}${practice?`<div class="idiom-footer"><button class="btn primary" data-idiom-grade="remembered" ${show?'':'disabled'}>记住了</button><button class="btn" data-idiom-grade="fuzzy" ${show?'':'disabled'}>还模糊</button><button class="btn" data-idiom-grade="forgot" ${show?'':'disabled'}>没记住</button></div>`:''}<p style="color:var(--muted)">${progress?.lastStudy?`最近学习 ${esc(progress.lastStudy)} · ${progress.mastered?'已完成本轮复习':`下次回忆 ${esc(progress.nextReview)}`}`:'尚未记录记忆情况'}</p><div class="idiom-footer"><button class="btn" id="idiomStar">${r.starred[word.id]?'★ 已加入易混词':'☆ 加入易混词'}</button><button class="btn" id="idiomSource">原书第${word.page}页</button></div><label>我的辨析笔记<textarea class="idiom-note" id="idiomMemo" placeholder="我容易与哪个词混淆？侧重点、适用对象或搭配有什么不同？">${esc(r.memos[word.id]||'')}</textarea></label><div id="idiomOriginal"></div></div>`;
}
function idiomBindWord(word){
 if($('#idiomReveal'))$('#idiomReveal').onclick=()=>{idiomRevealed=true;idiomRender()};
 $$('[data-idiom-grade]').forEach(b=>b.onclick=()=>idiomMark(word,b.dataset.idiomGrade));
 $('#idiomMemo').oninput=e=>{idiomRecord().memos[word.id]=e.target.value;persist()};
 $('#idiomStar').onclick=()=>{const r=idiomRecord();r.starred[word.id]=!r.starred[word.id];persist();$('#idiomStar').textContent=r.starred[word.id]?'★ 已加入易混词':'☆ 加入易混词'};
 $('#idiomSource').onclick=()=>{$('#idiomOriginal').innerHTML=idiomPdfUrl?`<p>原书第${word.page}页 · ${esc(word.word)}</p><iframe class="idiom-source" title="原书第${word.page}页" src="${idiomPdfUrl}#page=${word.page}"></iframe><p><a href="${idiomPdfUrl}#page=${word.page}" target="_blank" rel="noopener">单独打开原PDF</a></p>`:'<p>重新选择原PDF后即可核对原书位置。</p>'};
}
function idiomRender(){
 if(!idiomBook){$('#idioms').innerHTML=idiomImportMarkup();idiomBindImport();return}
 const p=idiomToday(),r=idiomRecord(),learned=idiomWords.filter(w=>r.progress[w.id]?.learnedAt).length,newDone=p.newIds.filter(idiomDone).length,reviewDone=p.reviewIds.filter(idiomDone).length;
 $('#idioms').innerHTML=`<article class="card"><div class="idiom-head"><h2>言语·成语积累</h2><span class="tag">与广东省情时政分开打卡</span></div><p>990个不同词语 · ${learned}个已学习 · 原书993条条目，81组。</p><p>${p.rest?'今天是休息或考试日，不派新学，可自主查看词库。':`首轮目标 ${esc(p.deadline||'')} · 按考试日期和休息日倒排；今天新学${p.newIds.length}词，复习${p.reviewIds.length}词。新学与复习分开统计。`}</p><p style="color:var(--muted)">完成首轮后继续巩固。没记住的次日再记，记住的逐步延长到1、3、7、14天回忆；未完成的新学顺延。学习量次日按剩余时间重算。</p><div class="gd-toolbar">${[['new',`今日新学 ${newDone}/${p.newIds.length}`],['review',`到期复习 ${reviewDone}/${p.reviewIds.length}`],['all','全部词库'],['difficult','难词／易混']].map(([k,v])=>`<button class="btn ${idiomView===k?'primary':''}" data-idiom-tab="${k}">${v}</button>`).join('')}</div></article><article class="card" id="idiomBody" style="margin-top:16px"></article>`;
 $$('[data-idiom-tab]').forEach(b=>b.onclick=()=>{idiomView=b.dataset.idiomTab;idiomCursor=0;idiomRevealed=false;idiomSelected='';idiomQuery='';idiomGroup='';idiomKind='';idiomBrowsePage=0;idiomRender()});
 if(['all','difficult'].includes(idiomView)){idiomRenderLibrary();return}
 const queue=idiomQueue();
 if(!queue.length){$('#idiomBody').innerHTML=`<h3>${idiomView==='review'?'暂无到期复习':'今天没有新学任务'}</h3><p>可以切换到全部词库自主学习。</p>`;return}
 if(queue.every(w=>idiomDone(w.id))){$('#idiomBody').innerHTML=`<h3>${idiomView==='new'?'今日新学':'本次到期复习'}已完成</h3><p>${idiomView==='new'?'新学完成后，记得完成到期回忆。':'记不住的会继续进入复习队列。'}</p><button class="btn primary" id="idiomNextTab">${idiomView==='new'?'去到期复习':'查看难词／易混'}</button>`;$('#idiomNextTab').onclick=()=>{idiomView=idiomView==='new'?'review':'difficult';idiomCursor=0;idiomRender()};return}
 idiomCursor=Math.max(0,Math.min(queue.length-1,idiomCursor));const word=queue[idiomCursor];
 $('#idiomBody').innerHTML=`<div class="idiom-head"><b>${idiomView==='new'?'新学':'复习'} ${idiomCursor+1}/${queue.length}</b><span>${queue.filter(w=>idiomDone(w.id)).length}词已记录</span></div>${idiomWordMarkup(word)}<div class="idiom-footer"><button class="btn" id="idiomPrev">上一个</button><button class="btn" id="idiomNext">下一个</button></div>`;
 idiomBindWord(word);const move=n=>{idiomCursor=Math.max(0,Math.min(queue.length-1,n));idiomRevealed=false;idiomRender()};$('#idiomPrev').onclick=()=>move(idiomCursor-1);$('#idiomNext').onclick=()=>move(idiomCursor+1);
}
function idiomRenderLibrary(){
 const groups=[...new Map(idiomWords.flatMap(w=>w.variants).map(w=>[w.groupId,w.group])).entries()];
 $('#idiomBody').innerHTML=`<h3>${idiomView==='difficult'?'难词与易混词':'按原书分组查词'}</h3><div class="gd-toolbar"><input class="field" id="idiomSearch" aria-label="搜索词语或释义" placeholder="搜索词语或释义" value="${esc(idiomQuery)}"><select class="field" id="idiomKind" aria-label="成语或实词">${[['','成语＋实词'],['成语','只看成语'],['实词','只看实词']].map(([k,v])=>`<option value="${k}" ${idiomKind===k?'selected':''}>${v}</option>`).join('')}</select><select class="field" id="idiomGroup" aria-label="原书分组"><option value="">全部分组</option>${groups.map(([k,v])=>`<option value="${k}" ${idiomGroup===k?'selected':''}>${esc(v)}</option>`).join('')}</select></div><div id="idiomLibraryList"></div><div id="idiomWordPanel"></div>`;
 $('#idiomSearch').oninput=e=>{idiomQuery=e.target.value;idiomBrowsePage=0;idiomRenderList()};$('#idiomKind').onchange=e=>{idiomKind=e.target.value;idiomBrowsePage=0;idiomRenderList()};$('#idiomGroup').onchange=e=>{idiomGroup=e.target.value;idiomBrowsePage=0;idiomRenderList()};idiomRenderList();
}
function idiomRenderList(){
 const r=idiomRecord(),query=idiomQuery.trim(),list=idiomWords.filter(w=>(!idiomKind||w.kind===idiomKind)&&(!idiomGroup||w.variants.some(v=>v.groupId===idiomGroup))&&(!query||w.word.includes(query)||w.variants.some(v=>v.definition.includes(query)))&&(idiomView!=='difficult'||r.starred[w.id]||['fuzzy','forgot'].includes(r.progress[w.id]?.lastResult)));
 const pages=Math.max(1,Math.ceil(list.length/40));idiomBrowsePage=Math.min(idiomBrowsePage,pages-1);
 $('#idiomLibraryList').innerHTML=`<p>共${list.length}词 · 第${idiomBrowsePage+1}/${pages}页</p><div class="idiom-list">${list.slice(idiomBrowsePage*40,idiomBrowsePage*40+40).map(w=>`<button class="btn" data-idiom-detail="${w.id}"><b>${esc(w.word)}</b><small>${esc(w.kind)} · ${esc(w.group)}</small></button>`).join('')||'<p>当前没有符合条件的词。</p>'}</div><div class="idiom-footer"><button class="btn" id="idiomListPrev">上一页</button><button class="btn" id="idiomListNext">下一页</button></div>`;
 $('#idiomListPrev').onclick=()=>{idiomBrowsePage=Math.max(0,idiomBrowsePage-1);idiomRenderList()};$('#idiomListNext').onclick=()=>{idiomBrowsePage=Math.min(pages-1,idiomBrowsePage+1);idiomRenderList()};
 $$('[data-idiom-detail]').forEach(b=>b.onclick=()=>{const word=idiomWords.find(w=>w.id===b.dataset.idiomDetail);$('#idiomWordPanel').innerHTML=idiomWordMarkup(word,false);idiomBindWord(word);$('#idiomWordPanel').scrollIntoView({behavior:'smooth',block:'start'})});
}
const idiomOldToday=renderToday;
renderToday=function(){idiomOldToday();const p=idiomToday();if(p.rest)return;const done=p.newIds.filter(idiomDone).length,rDone=p.reviewIds.filter(idiomDone).length;$('#today').insertAdjacentHTML('beforeend',`<article class="card" style="margin-top:16px"><span class="tag">言语理解 · 成语与实词</span><h2 style="margin-top:10px">言语·成语积累</h2><p>${p.unimported?'首次选择原PDF载入990个词。按省考时间倒排，当前约每天40–45个新词，复习单独安排。':`今日新学 ${done}/${p.newIds.length} · 到期回忆 ${rDone}/${p.reviewIds.length} · 首轮目标 ${esc(p.deadline||'')}`}</p><button class="btn primary" id="idiomTodayStart">${p.unimported?'载入成语原PDF':'开始今日成语'}</button></article>`);$('#idiomTodayStart').onclick=idiomOpen};
GongkaoLocalMaterials.readPackage('idioms-v1').then(book=>{if(book)idiomActivate(book);if($('#idioms').classList.contains('active'))idiomRender();renderToday()}).catch(error=>{idiomSection.innerHTML=idiomImportMarkup();idiomBindImport();$('#idiomImportStatus').textContent='本机词库暂未读出：'+error.message});
renderToday();
