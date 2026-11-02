(function(root){
  'use strict';
  const STORAGE_KEY='shangan-v2', SCHEMA_VERSION=8;
  const isRecord=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  const addDays=(date,days)=>new Date(Date.parse(date+'T00:00:00Z')+days*86400000).toISOString().slice(0,10);
  function normalizeMistake(item){
    if(!isRecord(item))return null;
    const stage=Math.max(0,Math.min(3,Number(item.reviewStage)||0));
    return {...item,status:item.status==='mastered'?'mastered':'reviewing',reviewStage:stage,nextReview:typeof item.nextReview==='string'?item.nextReview:(item.date||''),lastReview:typeof item.lastReview==='string'?item.lastReview:''};
  }
  function normalize(raw,defaults){
    if(!isRecord(raw))throw new Error('备份内容不是有效的学习档案');
    const record=key=>isRecord(raw[key])?raw[key]:{};
    const list=key=>Array.isArray(raw[key])?raw[key]:[];
    const practice=record('practice'),jobs=record('jobs'),planner=record('planner'),settings=isRecord(planner.settings)?planner.settings:{};
    const legacy=Number(raw.schemaVersion||0)<SCHEMA_VERSION;
    const defaultTargets=Array.isArray(defaults.examTargets)?defaults.examTargets:[{id:'guokao',name:'国考',date:'',source:'pending'},{id:'guangdong',name:'广东省考',date:'',source:'pending'},{id:'shiye',name:'事业编',date:'',source:'pending'}];
    const examTargets=(Array.isArray(raw.examTargets)?raw.examTargets:defaultTargets).map((item,index)=>{const base=defaultTargets[index]||{};const date=typeof item?.date==='string'&&item.date?item.date:(legacy?base.date||'':'');const month=typeof item?.month==='string'&&item.month?item.month:(legacy?base.month||'':'');return {id:typeof item?.id==='string'?item.id:(base.id||`target-${index}`),name:typeof item?.name==='string'?item.name:(base.name||'考试'),date,month,source:item?.source==='official'?'official':item?.source==='user'||date||month?'user':'pending'}});
    return {
      ...defaults,
      start:typeof raw.start==='string'?raw.start:defaults.start,
      exam:typeof raw.exam==='string'?raw.exam:defaults.exam,
      done:record('done'), custom:list('custom'), mistakes:list('mistakes').map(normalizeMistake).filter(Boolean),
      review:record('review'), stats:record('stats'), notes:record('notes'), studyNotes:list('studyNotes'),
      materials:record('materials'), bankProgress:record('bankProgress'),
      courseDone:record('courseDone'),
      studyLogs:list('studyLogs'),
      examTargets,
      planner:{settings:{studyStart:typeof settings.studyStart==='string'?settings.studyStart:(defaults.planner?.settings?.studyStart||'09:50'),studyEnd:typeof settings.studyEnd==='string'?settings.studyEnd:(defaults.planner?.settings?.studyEnd||'20:50'),studyDayHours:Number(settings.studyDayHours)||Number(defaults.planner?.settings?.studyDayHours)||8,restDayHours:Number.isFinite(Number(settings.restDayHours))?Number(settings.restDayHours):Number(defaults.planner?.settings?.restDayHours)||0,restSundays:Array.isArray(settings.restSundays)?[...new Set(settings.restSundays.filter(x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)))].sort():[],restSundayAnchor:typeof settings.restSundayAnchor==='string'?settings.restSundayAnchor:'',confirmed:settings.confirmed===true},dayHours:isRecord(planner.dayHours)?planner.dayHours:{},days:isRecord(planner.days)?planner.days:{}},
      practice:{history:Array.isArray(practice.history)?practice.history:[],currentId:typeof practice.currentId==='string'?practice.currentId:'',module:typeof practice.module==='string'?practice.module:'全部'},
      jobs:{profile:isRecord(jobs.profile)?jobs.profile:{},rows:Array.isArray(jobs.rows)?jobs.rows:[],sourceType:typeof jobs.sourceType==='string'?jobs.sourceType:'广东省考'},
      schemaVersion:SCHEMA_VERSION
    };
  }
  function load(storage,defaults){
    const raw=storage.getItem(STORAGE_KEY);
    if(!raw)return normalize(defaults,defaults);
    try{return normalize(JSON.parse(raw),defaults)}catch(error){
      console.warn('学习档案读取失败，原数据未被覆盖。',error);
      return normalize(defaults,defaults);
    }
  }
  function createBackup(state,now=new Date()){
    return JSON.stringify({app:'gongkao-ai-os',formatVersion:SCHEMA_VERSION,exportedAt:now.toISOString(),storageKey:STORAGE_KEY,data:state},null,2);
  }
  function readBackup(text,defaults){
    let parsed;
    try{parsed=JSON.parse(text)}catch{throw new Error('文件不是有效的 JSON 备份')}
    if(isRecord(parsed)&&parsed.app==='gongkao-ai-os'){
      if(parsed.formatVersion>SCHEMA_VERSION)throw new Error('该备份来自更新版本，请先升级工作台');
      parsed=parsed.data;
    }
    return normalize(parsed,defaults);
  }
  function reviewMistake(item,correct,date){
    const next=normalizeMistake(item);
    next.lastReview=date;
    if(!correct){next.status='reviewing';next.reviewStage=0;next.nextReview=addDays(date,1);return next}
    next.reviewStage=Math.min(3,next.reviewStage+1);
    if(next.reviewStage===3){next.status='mastered';next.nextReview=''}
    else next.nextReview=addDays(date,next.reviewStage===1?5:14);
    return next;
  }
  root.GongkaoData={STORAGE_KEY,SCHEMA_VERSION,normalize,load,createBackup,readBackup,reviewMistake};
})(globalThis);
