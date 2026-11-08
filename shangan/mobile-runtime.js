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
   // Keep this document and unsaved forms alive; a page navigation can become an HTML download on iOS.
   if('serviceWorker' in navigator)navigator.serviceWorker.getRegistration().then(r=>r?.update()).catch(e=>console.warn('新版检查暂未完成',e.message));
   save('今日日期和任务已更新，资料与学习记录已保留');
  }catch(e){console.error('刷新今日未完成',e);const t=$('#toast');t.textContent='刷新暂未完成，请稍后重试；本机资料未清除';t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3000)}
  finally{b.disabled=false;b.textContent='刷新今日';refreshing=false}
 }
 // Older desktop bookmarks may retain a cache-busting parameter. Remove it without another request.
 const entry=new URL(location.href);if(entry.searchParams.has('_refresh')){entry.searchParams.delete('_refresh');history.replaceState(history.state,'',entry.href)}
 const button=document.createElement('button');button.id='appRefresh';button.type='button';button.className='btn';button.textContent='刷新今日';button.title='更新今日日期与任务，保留当前输入、资料和学习记录';button.onclick=refreshApp;document.querySelector('.top-actions')?.prepend(button);
 const resume=()=>{if(!document.hidden)refreshDate()};
 document.addEventListener('change',event=>{if(event.target.id==='logDate')event.target.dataset.userDate='1'});
 document.addEventListener('visibilitychange',resume);window.addEventListener('pageshow',resume);window.addEventListener('focus',resume);window.addEventListener('online',resume);
 setInterval(resume,30000);refreshDate();
 window.ShanganMobile={refreshDate,refreshApp};
})();
