(function(root){
  'use strict';
  const CATALOGS={
    theory:{name:'粉笔7+1理论课',total:215,groups:{'合集讲义':10,'言语理解':32,'数量关系':24,'资料分析':21,'判断推理':41,'政治理论常识':34,'科学推理':14,'申论':39}},
    drill:{name:'粉刷刷专项刷题营',total:104,groups:{'合集讲义':7,'言语理解':16,'资料分析':12,'数量关系':10,'判断推理':23,'政治理论常识':7,'科学推理':15,'申论':14}},
    paper:{name:'大笔桶套卷集训营',total:98,groups:{'讲义下载':6,'解析下载':6,'言语':18,'数资':18,'判断':18,'政治':9,'科学推理':8,'申论':15}}
  };
  const THEORY_ORDER=['判断推理','科学推理','资料分析','言语理解','数量关系','政治理论常识'];
  const CORE_MODULES=['言语理解','判断推理','数量关系','资料分析','科学推理','政治理论常识'];
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
  const clean=value=>String(value||'').trim();
  function progress(logs,source,module){
    return (Array.isArray(logs)?logs:[]).reduce((sum,item)=>sum+(item.source===source&&item.module===module?(Number(item.units)||0):0),0);
  }
  function theorySummary(logs){
    const groups=Object.fromEntries(Object.entries(CATALOGS.theory.groups).map(([module,total])=>[module,{total,done:clamp(progress(logs,'7+1理论课',module),0,total)}]));
    const done=Object.entries(groups).reduce((sum,[module,item])=>sum+(module==='合集讲义'?0:item.done),0);
    const total=CATALOGS.theory.total-CATALOGS.theory.groups['合集讲义'];
    return {groups,done,total,pct:Math.round(done/total*100)};
  }
  function weakestModule(logs){
    const rows={};
    for(const item of Array.isArray(logs)?logs:[]){
      if(!CORE_MODULES.includes(item.module))continue;
      const rate=Number(item.accuracy),questions=Number(item.questions)||0;
      if(!Number.isFinite(rate)||questions<=0)continue;
      const row=rows[item.module]||(rows[item.module]={weighted:0,questions:0});
      row.weighted+=clamp(rate,0,100)*questions;row.questions+=questions;
    }
    return Object.entries(rows).filter(([,row])=>row.questions>=10).map(([module,row])=>({module,rate:Math.round(row.weighted/row.questions),questions:row.questions})).sort((a,b)=>a.rate-b.rate||b.questions-a.questions)[0]||null;
  }
  function nextTheoryModule(logs){
    const summary=theorySummary(logs);
    return THEORY_ORDER.find(module=>summary.groups[module].done<summary.groups[module].total)||'申论';
  }
  function dateObject(date){return new Date(`${date}T12:00:00`)}
  function scheduleHours(date,settings={},override){
    const saved=Number(override);if(saved>0)return saved;
    const key=typeof date==='string'?date:`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`,when=typeof date==='string'?dateObject(date):date,anchor=settings.restSundayAnchor;
    const customRest=Array.isArray(settings.restSundays)&&settings.restSundays.includes(key);
    const restSunday=customRest||(when.getDay()===0&&anchor&&Math.round((when-dateObject(anchor))/86400000)%14===0);
    const studyHours=Number(settings.studyDayHours),restHours=Number(settings.restDayHours);
    return restSunday?(Number.isFinite(restHours)?restHours:0):(Number.isFinite(studyHours)&&studyHours>0?studyHours:8);
  }
  function weekNumber(date){const first=new Date(date.getFullYear(),0,1);return Math.floor((date-first)/604800000)+1}
  function buildDay({date,hours,logs=[],carried=[]}){
    const available=Math.round(clamp(Number(hours)||0,0,16)*60),when=dateObject(date),summary=theorySummary(logs),weak=weakestModule(logs),tasks=[],backlog=[];
    let used=0,seq=0;
    const add=(task)=>{const minutes=Math.max(5,Number(task.minutes)||0);if(used+minutes>available)return false;tasks.push({...task,date:task.date||date,minutes,id:task.id||`plan:${date}:${task.kind}:${clean(task.module)||'all'}:${seq++}`});used+=minutes;return true};
    const seen=new Set();
    for(const item of Array.isArray(carried)?carried:[]){
      if(!item?.id||seen.has(item.id))continue;seen.add(item.id);
      const carriedTask={...item,title:item.title.startsWith('顺延｜')?item.title:`顺延｜${item.title}`,carriedFrom:item.carriedFrom||item.date};
      if(!add(carriedTask))backlog.push(item);
    }
    const deepEssay=when.getDay()===3&&available-used>=110;
    const essayMinutes=deepEssay?90:(available>=120?20:15);
    const weakBlock=weak&&weak.rate<75,reviewMinutes=available>=150?20:10,reserve=essayMinutes+reviewMinutes+(weakBlock?45:0);
    const paperDay=when.getDay()===6&&available-used>=260&&summary.pct>=35;
    if(paperDay){
      const exam=['国考','广东省考','事业编'][weekNumber(when)%3];
      add({kind:'paper',source:'大笔桶',module:'套卷',title:`大笔桶｜${exam}完整套卷`,minutes:180,details:'按完整套卷计时，一次固定预留3小时；不按目录节数拆分。'});
      add({kind:'paper-review',source:'大笔桶',module:'套卷复盘',title:'套卷复盘',minutes:60,details:'统计各模块正确率、耗时和取舍；整理错题类型与下次动作。'});
    }else{
      const module=nextTheoryModule(logs),unitMinutes=available<150?80:95,maxUnits=available>=480?4:available>=360?3:available>=180?2:1;
      for(let i=0;i<maxUnits&&used+unitMinutes+reserve<=available;i++)add({kind:'theory',source:'7+1理论课',module,title:`7+1理论｜${module} 1节＋对应练习`,minutes:unitMinutes,units:1,details:'课程在粉笔按1.5–2倍速观看；听完立刻完成对应练习并订正。'});
      if(weakBlock)add({kind:'drill',source:'粉刷刷',module:weak.module,title:`粉刷刷补弱｜${weak.module}`,minutes:45,units:1,details:`近期待核记录正确率约${weak.rate}%；只补薄弱项，完成后登记正确率与错因。`});
      const supplement=when.getDay()===2?'科学推理':when.getDay()===5?'政治理论常识':'';
      if(supplement&&module!==supplement&&used+25+reserve<=available)add({kind:'balance',source:'粉笔',module:supplement,title:`国省事考平衡｜${supplement}`,minutes:25,details:'完成一小组诊断题；有明显薄弱再回到课程补知识点。'});
    }
    add({kind:deepEssay?'essay-deep':'essay-daily',source:deepEssay?'粉笔':'申论素材书',module:'申论',title:deepEssay?'申论每周深度练习':'申论素材书精读',minutes:deepEssay?essayMinutes:20,details:deepEssay?'完成1道小题或1份作文提纲，按“要点—结构—表达”复盘。':'阅读10分钟，摘录1个案例和3个规范词，再用5分钟做80–120字改写。'});
    add({kind:'review',source:'工作台',module:'复盘',title:'学习记录与错题复盘',minutes:reviewMinutes,details:'登记粉笔题量、正确率、主要错题类型和明日最重要的一件事。'});
    return {date,available,used,remaining:Math.max(0,available-used),tasks,backlog,summary,weak,nextModule:nextTheoryModule(logs),mode:paperDay?'paper':deepEssay?'deep-essay':'foundation'};
  }
  root.GongkaoPlanner={CATALOGS,THEORY_ORDER,CORE_MODULES,progress,theorySummary,weakestModule,nextTheoryModule,scheduleHours,buildDay};
})(globalThis);
