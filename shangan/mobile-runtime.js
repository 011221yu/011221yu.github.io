/* Refresh the calendar when a home-screen app resumes; learning databases are never cleared. */
(function(){
 'use strict';
 const editable=new Set(['notes','mistakes','records','jobs']);let rolling=false;
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
 async function refreshApp(){
  refreshDate();persist();const active=document.querySelector('.page.active')?.id;
  if(editable.has(active)||idiomImportBusy||typeof cloudBusy!=='undefined'&&cloudBusy){save('日期已更新；请先保存当前输入或等资料传输完成，再回到今日页刷新');return}
  const b=$('#appRefresh');b.disabled=true;b.textContent='刷新中…';
  if('serviceWorker' in navigator)navigator.serviceWorker.getRegistration().then(r=>r?.update()).catch(e=>console.warn('新版检查暂未完成',e.message));
  const url=new URL(location.href);url.searchParams.set('_refresh',Date.now());location.replace(url.href);
 }
 const button=document.createElement('button');button.id='appRefresh';button.type='button';button.className='btn';button.textContent='刷新';button.title='刷新今日日期与程序，保留本机资料和学习记录';button.onclick=refreshApp;document.querySelector('.top-actions')?.prepend(button);
 const resume=()=>{if(!document.hidden)refreshDate()};
 document.addEventListener('change',event=>{if(event.target.id==='logDate')event.target.dataset.userDate='1'});
 document.addEventListener('visibilitychange',resume);window.addEventListener('pageshow',resume);window.addEventListener('focus',resume);window.addEventListener('online',resume);
 setInterval(resume,30000);refreshDate();
 window.ShanganMobile={refreshDate,refreshApp};
})();
