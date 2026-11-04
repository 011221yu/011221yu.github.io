/* Presentation only. Existing nodes, handlers, package IDs and saved answers are retained. */
(function(){
 'use strict';
 const one=(s,r=document)=>r.querySelector(s),all=(s,r=document)=>[...r.querySelectorAll(s)],choices=new Map();
 const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n};
 const icons={today:'M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',gd:'M5 4h14v16H5z M8 8h8 M8 12h8 M8 16h5',learn:'M12 6c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1z M12 6v15',essay:'M4 20l4-1L20 7l-3-3L5 16z M14 7l3 3',my:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z M4 21v-2a8 8 0 0 1 16 0v2',other:'M5 5h14v14H5z M9 9h6 M9 13h6'};
 function svg(key){const s=document.createElementNS('http://www.w3.org/2000/svg','svg');for(const [k,v]of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.6','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'}))s.setAttribute(k,v);const p=document.createElementNS(s.namespaceURI,'path');p.setAttribute('d',icons[key]||icons.other);s.append(p);return s}
 function fold(parent,nodes,title='使用说明与安排依据'){
  nodes=nodes.filter(Boolean);if(!nodes.length)return;const d=make('details','study-help'),s=make('summary','',title);d.append(s,...nodes);parent.append(d);return d;
 }
 function header(id){
  const h=one('#'+id+'>article.card');if(!h||h.dataset.studyHeader||h.hasAttribute('data-foundation-header'))return;h.dataset.studyHeader='1';h.classList.add('study-header');const toolbar=one(':scope>.gd-toolbar',h);if(!toolbar)return;
  const ps=all(':scope>p',h),extra=[];
  if(id==='essay'){
   if(ps[0]){const original=ps[0].cloneNode(true);extra.push(original);ps[0].textContent=GongkaoEssay.lessons.length+'个学习单元 · 12组段落练笔 · 本机'+(essayPack?.questions.length||0)+'道原书题＋2道原创作文'}
   extra.push(...ps.slice(1));
  }else if(id==='national')extra.push(...ps.slice(1),one(':scope>.nat-steps',h));
  else if(id==='idioms')extra.push(...ps.slice(2));
  else if(id==='gd'&&ps[0]?.textContent.includes('。')){extra.push(ps[0].cloneNode(true));ps[0].textContent=ps[0].textContent.split('。')[0]}
  const utilities=all('[data-nat-tab="priority"],[data-nat-tab="sources"],[data-essay-tab="library"],#gdUpdateBundle',h);fold(h,[...extra,...utilities],'使用说明与资料管理');
 }
 function facts(list){
  if(!list||list.dataset.studyFacts)return;list.dataset.studyFacts='1';list.classList.add('study-facts');
  for(const li of [...list.children]){const text=li.textContent.trim(),colon=text.indexOf('：');li.replaceChildren();if(colon>0&&colon<=16){li.append(make('b','',text.slice(0,colon)));li.append(make('p','',text.slice(colon+1)))}else li.append(make('p','',text));
   const p=one('p',li),parts=p.textContent.split(/(\d+(?:\.\d+)?(?:%|％|万亿元|亿元|万人|年|项|个|条)?)/g);p.replaceChildren(...parts.map((x,i)=>i%2?make('mark','',x):document.createTextNode(x)));
  }
 }
 function tabbed(root,key,groups,initial='read'){
  if(!root||root.dataset.studyTabs)return;root.dataset.studyTabs='1';root.classList.add('study-reading');
  const tabs=make('div','study-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','学习内容分区');
  const panes=groups.map(([id,title,nodes])=>{const pane=make('section','study-pane');pane.dataset.studyPane=id;pane.id='study-'+key.replace(/[^a-zA-Z0-9-]/g,'-')+'-'+id;pane.setAttribute('role','tabpanel');nodes.filter(Boolean).forEach(n=>pane.append(n));const b=make('button','',title);b.type='button';b.dataset.studyTab=id;b.setAttribute('role','tab');b.setAttribute('aria-controls',pane.id);tabs.append(b);root.append(pane);return {id,b,pane}});
  const anchor=one(':scope>h2,:scope>h3',root);if(anchor)anchor.after(tabs);else root.prepend(tabs);
  const set=id=>{choices.set(key,id);for(const x of panes){x.pane.hidden=x.id!==id;x.b.classList.toggle('active',x.id===id);x.b.setAttribute('aria-selected',String(x.id===id));x.b.tabIndex=x.id===id?0:-1}};
  panes.forEach((x,i)=>{x.b.onclick=()=>set(x.id);x.b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const j=e.key==='Home'?0:e.key==='End'?panes.length-1:(i+(e.key==='ArrowRight'?1:-1)+panes.length)%panes.length;set(panes[j].id);panes[j].b.focus()};if(i<panes.length-1){const bar=make('div','study-next'),next=make('button','btn primary',groups[i+1][1]);next.type='button';next.onclick=()=>{set(panes[i+1].id);tabs.scrollIntoView({block:'start',behavior:'smooth'})};bar.append(next);x.pane.append(bar)}});
  const selected=choices.get(key)||initial;set(panes.some(p=>p.id===selected)?selected:initial);return {set,panes};
 }
 function focusPanel(panel,label,back){
  const parent=panel?.parentElement;if(!parent?.classList.contains('card')||parent.dataset.studyFocus)return;parent.dataset.studyFocus='1';
  for(const node of [...parent.children])if(node!==panel)node.hidden=true;
  const button=make('button','btn study-back',label);button.type='button';button.onclick=back;parent.prepend(button);parent.closest('.page').classList.add('study-focused');
 }
 function national(){
  const root=one('#natLessonPanel>.nat-reading');if(!root||root.dataset.studyTabs)return;
  const children=[...root.children],start=children.indexOf(one('#natPoints',root)),question=children.findIndex(x=>x.tagName==='H3'),memo=children.findIndex(x=>x.tagName==='LABEL');if(start<0||question<0||memo<0)return;
  facts(one('#natPoints>ol',root));const stem=children[question+1];stem?.classList.add('study-stem');
  const groups=[['read','记忆要点',children.slice(start,question)],['quiz','回忆自测',children.slice(question,memo)],['note','笔记与打卡',children.slice(memo)]];
  const flow=tabbed(root,'national-'+natLesson,groups);flow.panes[1].pane.classList.add('study-question');one('#natFeedback',root)?.classList.add('study-answer');
  const source=one('.nat-source-line',root);if(source){source.classList.add('study-source');const details=one('details',flow.panes[0].pane);if(details)details.before(source)}
  focusPanel(root.parentElement,'‹ 返回专题列表',()=>{natLesson='';one('#national').classList.remove('study-focused');natRender()});
 }
 function essayLesson(){
  const root=one('#essayLessonPanel>.nat-reading');if(!root||root.dataset.studyTabs)return;
  const ch=[...root.children],start=ch.indexOf(one('#essayPoints',root)),exercise=ch.findIndex(x=>x.tagName==='H3'),record=ch.findIndex(x=>x.matches('label.essay-check'));if(start<0||exercise<0||record<0)return;
  facts(one('#essayPoints>ol',root));const scenario=ch[exercise+1],prompt=ch[exercise+2];if(scenario){scenario.classList.add('study-material');scenario.before(make('div','study-section-label','练习材料'))}prompt?.classList.add('study-prompt');
  const current=[...root.children],a=current.indexOf(ch[start]),b=current.indexOf(ch[exercise]),c=current.indexOf(ch[record]);
  const flow=tabbed(root,'essay-'+essayLesson,[['read','记忆要点',current.slice(a,b)],['quiz','迁移练习',current.slice(b,c)],['note','学习打卡',current.slice(c)]]);
  const read=flow.panes[0].pane;fold(read,all(':scope>p.formula,:scope>p.essay-muted',read),'选材与出处');
  all('.formula',one('[data-study-pane="quiz"]',root)).forEach(x=>x.classList.add('study-answer'));
  if(essayView==='lessons')focusPanel(root.parentElement,'‹ 返回主题与方法',()=>{essayLesson='';one('#essay').classList.remove('study-focused');essayRender()});
 }
 function knowledge(card,index){
  if(card.dataset.studyTabs)return;const ch=[...card.children],points=one('[data-knowledge-points]',card),start=ch.indexOf(points),h=ch.findIndex(x=>x.tagName==='H4'),source=ch.findIndex(x=>x.tagName==='DETAILS'&&!x.classList.contains('gd-recall-question'));if(start<0||h<0)return;
  facts(one('ol',points));const quizzes=ch.filter((x,i)=>i>=h&&(x.tagName==='H4'||x.matches('.gd-recall-question'))),record=ch.filter((x,i)=>i>h&&!quizzes.includes(x)&&i!==source),read=ch.slice(start,h);if(source>=0){ch[source].classList.add('study-source');read.push(ch[source])}
  const initial=points.hidden?'quiz':'read';points.hidden=false;const toggle=one('[data-knowledge-toggle]',card);if(toggle)toggle.hidden=true;
  const groups=[['read','记忆要点',read],['quiz','回忆自测',quizzes]];if(record.length)groups.push(['note','学习打卡',record]);const flow=tabbed(card,'gd-'+card.dataset.knowledgeCard+'-'+(record.length?'day':'browse')+'-'+index,groups,initial);if(flow)flow.panes[1].pane.classList.add('study-question');
  const reminder=one('.formula',points),use=reminder?.nextElementSibling;fold(points,[reminder,use?.tagName==='P'?use:null],'易混点与申论运用');
 }
 function guangdong(){
  const parent=one('#gdStudyBody>article.card');if(!parent)return;
  const cards=all(':scope>.gd-reading-card',parent);if(cards.length){
   const intro=[...parent.children].filter(x=>x.tagName==='P'||(x.tagName==='H3'&&x.textContent.startsWith('到期回忆')));fold(parent,intro,'今日数量与学习安排');
   const memo=one('#gdRecall',parent);if(memo){const title=memo.previousElementSibling;title.hidden=true;fold(parent,[title,memo,memo.nextElementSibling],'今日一句话笔记（可选）')}
   const deck=make('div','study-deck'),rail=make('div','study-card-list'),host=make('div','study-card-host');rail.setAttribute('aria-label','今日知识卡');deck.append(rail,host);const title=one('h2',parent);title.after(deck);title.textContent='广东省情时政 · 今日记忆';
   cards.forEach((card,i)=>{knowledge(card,i);const b=make('button','',one('h3',card)?.textContent||'知识卡');b.type='button';const small=make('small','',one('.tag',card)?.textContent||'');b.prepend(small);rail.append(b);host.append(card);b.onclick=()=>{cards.forEach((x,j)=>x.hidden=i!==j);all('button',rail).forEach((x,j)=>x.classList.toggle('active',i===j));choices.set('gd-card',card.dataset.knowledgeCard)}});
   const selected=Math.max(0,cards.findIndex(c=>c.dataset.knowledgeCard===choices.get('gd-card')));all('button',rail)[selected].click();
  }
  const q=one('#gdPairQuestion',parent);if(q&&!q.dataset.studyLabel){q.dataset.studyLabel='1';q.closest('.gd-image-window').before(make('div','study-section-label','题目'));one('.gd-choices',parent)?.before(make('div','study-section-label','选择答案'));one('#gdPairAnswer',parent)?.closest('.formula')?.classList.add('study-answer')}
  if(q){const toolbar=one(':scope>.gd-toolbar',parent);if(toolbar){const d=make('details','study-help study-filter');d.append(make('summary','','切换题库、专题与练习方式'),toolbar);parent.prepend(d)}}
  all('#gdKnowledgeBrowse>[data-knowledge-card]').forEach(knowledge);
 }
 function essayPractice(){
  const root=one('#essayBody>.card'),columns=one('.essay-cols',root||document);if(!root||!columns||root.dataset.studyPractice)return;root.dataset.studyPractice='1';
  const p=one(':scope>p',root);if(p)fold(root,[p],'作答与订正说明');
  const [material,answer]=[...columns.children];material.prepend(make('div','study-section-label','题目与给定材料'));answer.prepend(make('div','study-section-label','我的作答'));
  const source=all(':scope>p',material).find(x=>x.classList.contains('essay-muted'));if(source)fold(material,[source],'题目来源');one('.nat-reading',material)?.classList.add('study-material');
  one('.formula',answer)?.classList.add('study-answer');
 }
 function idiom(){
  for(const card of all('.idiom-flash')){if(card.dataset.studyWord)return;card.dataset.studyWord='1';const title=one('h2',card),tip=title?.nextElementSibling;if(tip?.tagName==='P')fold(card,[tip],'回忆提示');const memo=one('#idiomMemo',card)?.closest('label'),source=one('#idiomOriginal',card);if(memo)fold(card,[memo,source],'我的辨析笔记与原书');}
 }
 function today(){
  const root=one('#today'),hero=one('.hero',root);if(hero&&!hero.dataset.studyHero){hero.dataset.studyHero='1';one('h2',hero).textContent='今日学习';one('p',hero).textContent='按计划开始学习，完成后打卡。听课在粉笔，已导入的题目可在工作台练习。'}
  const extras=one(':scope>.grid.two',root);if(extras){const d=make('details','study-today-extra');d.append(make('summary','','时间安排与学习建议'),extras);root.append(d)}
  const launchers=all('#gdTodayRead,#natTodayStart,#idiomTodayStart,#essayTodayStart',root).map(b=>b.closest('article'));if(launchers.length&&!one(':scope>.study-launch-grid',root)){const grid=make('div','study-launch-grid');for(const c of launchers){c.classList.add('study-launch');const ps=all(':scope>p',c);fold(c,ps.slice(1),'任务明细');grid.append(c)}root.append(grid)}
 }
 const labels={today:'今日学习',gd:'广东题库',learn:'背诵记忆',essay:'申论学习',my:'我的',national:'全国时政',idioms:'成语积累',courses:'粉笔课程',mistakes:'错题本',notes:'我的笔记',records:'学习记录',review:'每周复盘',stats:'学习统计',plan:'计划设置',jobs:'选岗工具',cloud:'私人同步',data:'数据备份'};
 function go(id){if(id==='gd'){gdView='read';openPage(id);gdRender()}else if(id==='national')natOpen();else if(id==='essay')essayOpen();else{openPage(id);if(id==='idioms')idiomRender();if(id==='cloud')cloudRender()}}
 function hub(id,title,rows){const page=make('section','page');page.id=id;const card=make('article','card'),h=make('h2','',title),list=make('div','study-hub-list');card.append(h,list);for(const [target,desc]of rows){const b=make('button','study-hub-row'),text=make('span');text.append(make('strong','',id==='learn'&&target==='gd'?'广东省情时政':labels[target]),make('small','',desc));b.append(text,make('span','','›'));b.onclick=()=>go(target);list.append(b)}page.append(card);one('main').append(page);titles[id]=[title,'按板块进入，学习内容与操作说明分开展示'];const nav=make('button','nav-btn study-primary',title);nav.dataset.page=id;nav.onclick=()=>openPage(id);one('#side .side-foot').before(nav);return page}
 hub('learn','背诵记忆',[['gd','广东省情、地方时政 · 按分类记忆与回忆'],['national','全国政策 · 主题要点与配套自测'],['idioms','高频成语与实词 · 新学、复习和易混辨析'],['essay','申论方法、主题表达、案例与迁移练习']]);
 hub('my','我的学习档案',[['mistakes','重做错题，查看错因与订正'],['notes','查看课堂笔记，按模块和细分题型归档'],['records','记录粉笔题量、正确率和学习用时'],['stats','查看学习进度与统计'],['review','复盘本周学习，调整后续重点'],['plan','作息、休息日与考试日期'],['cloud','在电脑与iPad之间取回私人资料'],['data','导出和导入学习档案']]);
 const navs=new Map(all('#side [data-page]').map(n=>[n.dataset.page,n]));all('#side .nav-title').forEach(n=>n.remove());const footer=one('#side .side-foot');
 for(const [title,ids]of [['日常学习',['today','gd','learn','essay','my']],['更多学习',['national','idioms','courses']],['学习档案',['mistakes','notes','records','review','stats']],['设置与工具',['plan','jobs','cloud','data']]]){footer.before(make('div','nav-title',title));for(const id of ids){const b=navs.get(id);if(!b)continue;b.replaceChildren(svg(id),make('span','',labels[id]));b.classList.toggle('study-primary',['today','gd','learn','essay','my'].includes(id));footer.before(b);if(titles[id])titles[id][0]=labels[id]}}
 navs.get('gd').onclick=()=>{gdView='practice';openPage('gd');gdRender()};
 const mascot=one('.mascot');if(mascot)mascot.replaceChildren(svg('learn'));const bottom=make('nav','study-bottom-nav');bottom.setAttribute('aria-label','主要导航');for(const id of ['today','gd','learn','essay','my']){const b=make('button');b.dataset.studyGo=id;b.append(svg(id),make('span','',labels[id]));b.onclick=()=>{if(id==='gd'){gdView='practice';openPage(id);gdRender()}else openPage(id)};bottom.append(b)}document.body.append(bottom);
 function refresh(){
  const id=one('.page.active')?.id||'today',active=id==='gd'&&gdView==='read'?'learn':['national','idioms'].includes(id)?'learn':id;document.body.dataset.studyPage=id;for(const b of all('[data-study-go]'))b.classList.toggle('active',b.dataset.studyGo===active);
  if(id==='gd'){one('#pageTitle').textContent=gdView==='read'?'广东省情时政':'广东题库';one('#pageSub').textContent=gdView==='read'?'按分类学要点，闭卷回忆后打卡。':'按专题练习，提交后查看答案与解析。';navs.get('gd').classList.toggle('active',active==='gd');navs.get('learn').classList.toggle('active',active==='learn')}
  ['gd','national','essay','idioms'].forEach(header);national();essayLesson();guangdong();essayPractice();idiom();today();
  for(const id of ['national','essay'])if(!one(id==='national'?'#natLessonPanel>.nat-reading':'#essayLessonPanel>.nat-reading'))one('#'+id)?.classList.remove('study-focused');
  for(const page of all('#notes,#mistakes')){const trigger=one(page.id==='notes'?'#notePasteZone':'#mistakePasteZone',page),card=trigger?.closest('article.card');if(card&&!card.parentElement.classList.contains('study-form-fold')){const d=make('details','study-form-fold');d.append(make('summary','',page.id==='notes'?'新增笔记 / 导入图片':'新增错题 / PDF或图片导入'));card.before(d);d.append(card)}}
 }
 const observer=new MutationObserver(()=>{observer.disconnect();try{refresh()}finally{observer.observe(one('main'),{childList:true,subtree:true})}});refresh();observer.observe(one('main'),{childList:true,subtree:true});
})();
