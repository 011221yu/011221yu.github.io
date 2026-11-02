(function(root){
  'use strict';
  const HEADER_MAP={
    department:['招录机关','单位名称','主管部门','招考单位','用人单位'],code:['职位代码','岗位代码','招考职位代码'],name:['职位名称','岗位名称','招考职位'],region:['工作地点','地区','职位所在地','考区'],education:['学历','学历要求'],degree:['学位','学位要求'],major:['专业','专业要求','本科专业','研究生专业'],politics:['政治面貌','政治面貌要求'],grassroots:['基层工作最低年限','基层工作年限','工作经历'],fresh:['应届毕业生','是否限应届','应届要求'],hukou:['户籍','户籍要求','生源地'],other:['其他条件','备注','其他要求']
  };
  const clean=value=>String(value??'').replace(/^\uFEFF/,'').trim();
  function parseCSV(text){
    const rows=[];let row=[],cell='',quoted=false;
    text=String(text??'').replace(/^\uFEFF/,'');
    for(let i=0;i<text.length;i++){
      const char=text[i];
      if(quoted){if(char==='"'&&text[i+1]==='"'){cell+='"';i++}else if(char==='"')quoted=false;else cell+=char}
      else if(char==='"')quoted=true;
      else if(char===','){row.push(cell);cell=''}
      else if(char==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell=''}
      else cell+=char;
    }
    if(cell||row.length){row.push(cell.replace(/\r$/,''));rows.push(row)}
    const headers=(rows.shift()||[]).map(clean);
    return rows.filter(values=>values.some(value=>clean(value))).map(values=>Object.fromEntries(headers.map((header,index)=>[header,clean(values[index])] )));
  }
  function pick(raw,aliases){
    for(const alias of aliases){const key=Object.keys(raw).find(header=>header===alias||header.includes(alias));if(key&&clean(raw[key]))return clean(raw[key])}
    return '';
  }
  function normalizeRow(raw,sourceType='未分类',index=0){
    const row={sourceType,raw};
    Object.entries(HEADER_MAP).forEach(([key,aliases])=>row[key]=pick(raw,aliases));
    const majorValues=Object.entries(raw).filter(([header,value])=>/专业/.test(header)&&clean(value)).map(([,value])=>clean(value));
    if(majorValues.length)row.major=[...new Set(majorValues)].join('、');
    row.id=`${sourceType}-${row.code||index+1}`;
    return row;
  }
  function rowsFromCSV(text,sourceType){return parseCSV(text).map((raw,index)=>normalizeRow(raw,sourceType,index))}
  const pass=(label,detail)=>({status:'pass',label,detail}),fail=(label,detail)=>({status:'fail',label,detail}),uncertain=(label,detail)=>({status:'uncertain',label,detail});
  function educationCheck(profileValue,requirement){
    const rank=value=>/博士/.test(value)?4:/硕士|研究生/.test(value)?3:/本科/.test(value)?2:/大专|专科/.test(value)?1:0;
    if(!requirement||/不限|无要求/.test(requirement))return pass('学历','不限');
    if(!profileValue)return uncertain('学历','尚未填写本人学历');
    const have=rank(profileValue),need=rank(requirement);
    if(!need)return uncertain('学历',`无法自动识别：${requirement}`);
    if(/仅限|限/.test(requirement)&&!/(及以上|以上)/.test(requirement))return have===need?pass('学历',requirement):fail('学历',`要求${requirement}`);
    return have>=need?pass('学历',requirement):fail('学历',`要求${requirement}`);
  }
  function degreeCheck(profileValue,requirement){
    if(!requirement||/不限|无要求/.test(requirement))return pass('学位','不限');
    if(!profileValue)return uncertain('学位','尚未填写本人学位');
    const rank=value=>/博士/.test(value)?3:/硕士/.test(value)?2:/学士|本科/.test(value)?1:0;
    return rank(profileValue)>=rank(requirement)?pass('学位',requirement):fail('学位',`要求${requirement}`);
  }
  function majorCheck(profileValue,requirement){
    if(!requirement||/不限|无要求/.test(requirement))return pass('专业','不限');
    if(!profileValue)return uncertain('专业','尚未填写本人专业');
    const norm=value=>clean(value).replace(/[（(].*?[）)]/g,'').replace(/\s/g,'');
    const mine=norm(profileValue),tokens=requirement.split(/[、,，;；/\n]/).map(norm).filter(Boolean);
    if(tokens.includes(mine)||tokens.some(token=>mine.length>=4&&(token.includes(mine)||mine.includes(token))))return pass('专业',`匹配“${profileValue}”`);
    return uncertain('专业',`需结合专业目录人工核验：${requirement}`);
  }
  function politicsCheck(profileValue,requirement){
    if(!requirement||/不限|无要求/.test(requirement))return pass('政治面貌','不限');
    if(!profileValue)return uncertain('政治面貌','尚未填写');
    if(/中共党员/.test(requirement)&&/中共党员|中共预备党员/.test(profileValue))return pass('政治面貌',requirement);
    if(/共青团员/.test(requirement)&&/共青团员/.test(profileValue))return pass('政治面貌',requirement);
    if(requirement.includes(profileValue))return pass('政治面貌',requirement);
    return fail('政治面貌',`要求${requirement}`);
  }
  function grassrootsCheck(profileValue,requirement){
    if(!requirement||/不限|无要求/.test(requirement))return pass('基层经历','不限');
    if(profileValue===undefined||profileValue===null||profileValue==='')return uncertain('基层经历','尚未填写基层工作年限');
    const match=requirement.match(/(\d+)\s*年/);if(!match)return uncertain('基层经历',requirement);
    return (+profileValue||0)>=+match[1]?pass('基层经历',requirement):fail('基层经历',`要求至少${match[1]}年`);
  }
  function freshCheck(profileValue,requirement){
    if(!requirement||/不限|无要求/.test(requirement))return pass('应届身份','不限');
    if(!profileValue)return uncertain('应届身份','尚未填写应届身份');
    if(/应届/.test(requirement))return profileValue==='是'?pass('应届身份',requirement):fail('应届身份',`要求${requirement}`);
    return uncertain('应届身份',requirement);
  }
  function hukouCheck(profileValue,requirement){
    if(!requirement||/不限|无要求/.test(requirement))return pass('户籍/生源','不限');
    if(!profileValue)return uncertain('户籍/生源',`需核验：${requirement}`);
    if(requirement.includes(profileValue)||(requirement.includes('广东')&&profileValue.includes('广东')))return pass('户籍/生源',requirement);
    return uncertain('户籍/生源',`需人工核验：${requirement}`);
  }
  function evaluate(profile,row){
    const checks=[educationCheck(profile.education,row.education),degreeCheck(profile.degree,row.degree),majorCheck(profile.major,row.major),politicsCheck(profile.politics,row.politics),grassrootsCheck(profile.grassrootsYears,row.grassroots),freshCheck(profile.fresh,row.fresh),hukouCheck(profile.hukou,row.hukou)];
    if(row.other&&!/^(无|不限|无要求)$/.test(row.other))checks.push(uncertain('备注',row.other));
    const status=checks.some(item=>item.status==='fail')?'ineligible':checks.some(item=>item.status==='uncertain')?'uncertain':'eligible';
    return {status,checks};
  }
  const api={HEADER_MAP,parseCSV,normalizeRow,rowsFromCSV,evaluate};
  root.GongkaoJobs=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
