/* Refresh the calendar when a home-screen app resumes; learning databases are never cleared. */
(function(){
 'use strict';
 let rolling=false,refreshing=false;
 function refreshDate(){
  const now=new Date(),key=dateKey(now),previous=dateKey(today0);if(key===previous||rolling)return false;
  rolling=true;try{
   persist();today=now;today0=new Date(now.getFullYear(),now.getMonth(),now.getDate());
   const active=document.querySelector('.page.active')?.id||'today';
   updateChrome();renderToday();renderTodaySignals();renderPlan();renderReview();renderStats();
   // Do not replace unsaved forms or their in-memory image attachments.
   if($('#logDate')?.value===previous&&!$('#logDate').dataset.userDate)$('#logDate').value=key;
   if(active==='idioms'&&!idiomImportBusy){idiomCursor=0;idiomRevealed=false;idiomSelected='';idiomRender()}
   if(active==='gd'){gdFeedback=false;gdReveal=false;gdPinned=null;gdSelected=[];gdRender()}
   if(active==='national'){natView='today';natChoose('');natRender()}
   if(active==='essay'){essayView='today';essayQuestion='';essayRender()}
   if(active==='courses')renderCourses();
   document.dispatchEvent(new CustomEvent('shangan:daychange',{detail:{previous,date:key}}));
   save('已切换到 '+key+'，昨天的学习记录已保留');return true;
  }finally{rolling=false}
 }
 function refreshApp(){
  if(refreshing)return;refreshing=true;
  const b=$('#appRefresh');b.disabled=true;b.textContent='刷新中…';
  try{
   if(!refreshDate()){persist();updateChrome();renderToday();renderTodaySignals();renderPlan();renderReview();renderStats()}
   save('今日日期和任务已更新，资料与学习记录已保留');
  }catch(e){console.error('刷新今日未完成',e);const t=$('#toast');t.textContent='刷新暂未完成，请稍后重试；本机资料未清除';t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3000)}
  finally{b.disabled=false;b.textContent='刷新今日';refreshing=false}
 }
 const workers=navigator.serviceWorker;
 const editedFields=new WeakSet();
 for(const event of ['input','change'])document.addEventListener(event,e=>{
  if(e.target.matches('input,textarea,select'))editedFields.add(e.target);
 },true);
 let hadController=!!workers?.controller,newVersion=false,lastVersionCheck=0;
 const updateButton=document.createElement('button');
 updateButton.id='appUpdate';updateButton.type='button';updateButton.className='btn';
 updateButton.textContent='更新网页';updateButton.title='联网重新加载工作台页面';
 function checkForUpdate(){
  if(document.hidden||!navigator.onLine||!workers||Date.now()-lastVersionCheck<30000)return;
  lastVersionCheck=Date.now();
  workers.getRegistration().then(reg=>reg?.update()).catch(error=>console.warn('网页版本检查未完成',error.message));
 }
 function hasEditedForm(){
  return [...document.querySelectorAll('.page textarea,.page input:not([type=hidden]),.page select')].some(field=>{
   if(field.disabled||!editedFields.has(field))return false;
   if(field.type==='file')return !!field.files.length;
   if(field.type==='checkbox'||field.type==='radio')return field.checked!==field.defaultChecked;
   if(field.tagName==='SELECT')return [...field.options].some(option=>option.selected!==option.defaultSelected);
   return field.value!==(field.dataset.note?state.notes[field.dataset.note]??'':field.defaultValue);
  });
 }
 async function reloadPage(){
  if(updateButton.disabled)return;
  if(!navigator.onLine)return save('请联网后更新网页');
  if(!workers?.controller)return save('网页更新组件正在准备，请稍后再点更新网页');
  if(cloudBusy||idiomImportBusy||$('#insStatus')?.textContent.startsWith('正在校验并导入'))return save('请等同步或资料导入完成后更新网页');
  updateButton.disabled=true;updateButton.textContent='正在更新…';
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetch(new URL('index.html',location.href),{cache:'no-store',signal:controller.signal});
   if(!response.ok||!(await response.text()).includes('<title>上岸工作台</title>'))throw Error('没有收到工作台页面');
   if(cloudBusy||idiomImportBusy||$('#insStatus')?.textContent.startsWith('正在校验并导入'))return save('请等同步或资料导入完成后更新网页');
   if(hasEditedForm()&&!confirm('当前页面有编辑过的内容，未保存的输入会随页面关闭。现在更新网页吗？'))return;
   persist();
   location.reload();
  }catch(error){
   console.warn('网页更新未完成',error.message);
   save('暂时连不上新版网页，请稍后重试');
  }finally{
   clearTimeout(timeout);
   updateButton.disabled=false;updateButton.textContent=newVersion?'更新到新版':'更新网页';
  }
 }
 updateButton.onclick=reloadPage;
 workers?.addEventListener('controllerchange',()=>{
  if(hadController){newVersion=true;if(!updateButton.disabled)updateButton.textContent='更新到新版'}
  hadController=!!workers.controller;
 });
 // Older desktop bookmarks may retain a cache-busting parameter. Remove it without another request.
 const entry=new URL(location.href);if(entry.searchParams.has('_refresh')){entry.searchParams.delete('_refresh');history.replaceState(history.state,'',entry.href)}
 const button=document.createElement('button');button.id='appRefresh';button.type='button';button.className='btn';button.textContent='刷新今日';button.title='更新今日日期与任务，保留当前输入、资料和学习记录';button.onclick=refreshApp;document.querySelector('.top-actions')?.prepend(button,updateButton);
 const resume=()=>{if(!document.hidden)refreshDate()};
 document.addEventListener('change',event=>{if(event.target.id==='logDate')event.target.dataset.userDate='1'});
 document.addEventListener('visibilitychange',()=>{resume();checkForUpdate()});
 for(const event of ['pageshow','focus','online'])window.addEventListener(event,()=>{resume();checkForUpdate()});
 setInterval(resume,30000);refreshDate();
 window.ShanganMobile={refreshDate,refreshApp};
})();
