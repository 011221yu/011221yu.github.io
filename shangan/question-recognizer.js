(function(root){
  'use strict';
  const OCR_URL='https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js';
  const rules=[
    {module:'资料分析',type:'增长率/增长量',words:['同比','环比','增长率','增速','增长量','基期','现期','年均增长','百分点','亿元','万吨']},
    {module:'资料分析',type:'比重/平均数/倍数',words:['占比','比重','平均数','倍数','每','材料','根据上述资料','表中','图中']},
    {module:'数量关系',type:'工程/行程问题',words:['工程','完工','效率','相遇','追及','行程','速度','路程','流水行船']},
    {module:'数量关系',type:'经济利润/排列概率',words:['利润','成本','售价','折扣','浓度','排列','组合','概率','至少有','至多有','抽取']},
    {module:'数量关系',type:'方程/几何/最值',words:['方程','年龄','鸡兔','容斥','最多','最少','周长','面积','体积','圆','三角形']},
    {module:'判断推理',type:'定义判断',words:['定义是指','下列属于','符合上述定义','不符合上述定义','定义判断']},
    {module:'判断推理',type:'逻辑判断',words:['加强','削弱','前提','假设','推出','不能推出','论点','论据','结论','矛盾','真假']},
    {module:'判断推理',type:'类比推理',words:['对于','相当于','类比推理','词语关系']},
    {module:'判断推理',type:'图形推理',words:['图形','规律','问号处','纸盒','折叠','展开图','一笔画']},
    {module:'言语理解',type:'逻辑填空',words:['依次填入','填入画横线','最恰当的一项','成语','词语']},
    {module:'言语理解',type:'片段阅读',words:['文段意在','主旨','概括最准确','这段文字','作者认为','主要说明','中心意思']},
    {module:'言语理解',type:'语句表达',words:['语句排序','顺序最恰当','填入文中','承接最恰当','病句','歧义']},
    {module:'常识判断',type:'法律/政治理论',words:['宪法','刑法','民法','行政法','法律','政府','人民代表大会','中国共产党','新时代','马克思']},
    {module:'常识判断',type:'科技/人文历史地理',words:['物理','化学','生物','科技','历史','朝代','文学','地理','气候','文化常识']},
    {module:'申论小题',type:'归纳概括/综合分析',words:['给定资料','根据给定资料','概括','归纳','谈谈理解','分析原因','不超过','字数']},
    {module:'申论小题',type:'提出对策/应用文',words:['提出对策','解决措施','工作建议','撰写','讲话稿','倡议书','公开信','简报']},
    {module:'申论作文',type:'文章写作',words:['自选角度','自拟题目','写一篇文章','参考给定资料','总字数','立意明确']}
  ];
  const moduleBias={'资料分析':['201','202','%','同比','环比'],'数量关系':['多少','至少','至多'],'判断推理':['以下哪项','最能','不能'],'言语理解':['文段','填入','语句'],'常识判断':['下列说法','正确的是','不正确的是'],'申论小题':['资料','作答'],'申论作文':['文章']};
  const noteCatalog={
    '判断推理':[
      {subtype:'位置规律',words:['位置规律','平移','旋转','翻转','顺时针','逆时针','相邻移动']},
      {subtype:'样式规律',words:['样式规律','叠加','求同','求异','去同存异','黑白叠加','遍历']},
      {subtype:'数量规律',words:['数量规律','点数量','线数量','面数量','角数量','笔画数','元素个数']},
      {subtype:'属性规律',words:['属性规律','对称性','曲直性','封闭性','开放性','轴对称','中心对称']},
      {subtype:'空间重构',words:['空间重构','六面体','展开图','折叠','相对面','相邻面','截面','投影']},
      {subtype:'定义判断',words:['定义判断','主体','客体','目的','条件','关键词匹配']},
      {subtype:'类比推理',words:['类比推理','种属关系','组成关系','功能关系','近义关系','反义关系']},
      {subtype:'逻辑判断',words:['逻辑判断','加强','削弱','前提','翻译推理','真假推理','排列组合']}
    ],
    '言语理解':[
      {subtype:'逻辑填空',words:['逻辑填空','近义词','成语','语境','词语辨析','关联词']},
      {subtype:'主旨概括',words:['主旨概括','中心句','主题词','总分','分总','文段主旨']},
      {subtype:'意图判断',words:['意图判断','作者意在','言外之意','对策句']},
      {subtype:'细节理解',words:['细节理解','偷换概念','无中生有','以偏概全']},
      {subtype:'语句排序',words:['语句排序','首句','捆绑','指代词','时间顺序']},
      {subtype:'语句衔接',words:['语句衔接','横线处','承上启下','话题一致']}
    ],
    '数量关系':[
      {subtype:'工程问题',words:['工程问题','工作总量','工作效率','完工','合作']},
      {subtype:'行程问题',words:['行程问题','相遇','追及','速度','路程','流水行船']},
      {subtype:'经济利润',words:['经济利润','利润率','成本','售价','折扣']},
      {subtype:'排列组合与概率',words:['排列组合','概率','捆绑法','插空法','隔板法']},
      {subtype:'几何问题',words:['几何问题','面积','周长','体积','三角形','圆']},
      {subtype:'容斥与最值',words:['容斥','最值','最多','最少','至少','至多']}
    ],
    '资料分析':[
      {subtype:'增长率与增长量',words:['增长率','增长量','同比','环比','基期量','现期量','百分点']},
      {subtype:'比重',words:['比重','占比','部分量','整体量','比重变化']},
      {subtype:'平均数',words:['平均数','均值','人均','单位面积']},
      {subtype:'倍数',words:['倍数','是几倍','多几倍']},
      {subtype:'综合分析',words:['综合分析','正确的是','错误的是','根据材料']}
    ],
    '常识判断':[
      {subtype:'政治理论',words:['政治理论','马克思','新时代','中国共产党','党史']},
      {subtype:'法律',words:['法律','宪法','民法','刑法','行政法']},
      {subtype:'经济',words:['经济','财政政策','货币政策','宏观调控']},
      {subtype:'科技',words:['科技','物理','化学','生物','航天']},
      {subtype:'人文历史',words:['人文历史','历史','朝代','文学','传统文化']},
      {subtype:'地理',words:['地理','气候','地形','河流','资源分布']}
    ],
    '科学推理':[
      {subtype:'力学',words:['力学','受力','摩擦力','杠杆','浮力','压强']},
      {subtype:'电学',words:['电学','电路','电流','电压','电阻']},
      {subtype:'光学',words:['光学','反射','折射','透镜','成像']},
      {subtype:'热学',words:['热学','温度','热传递','比热容']},
      {subtype:'化学实验',words:['化学实验','溶液','反应','气体','实验装置']},
      {subtype:'生物',words:['生物','细胞','遗传','生态系统','人体']}
    ],
    '申论':[
      {subtype:'归纳概括',words:['归纳概括','概括问题','概括原因','概括做法']},
      {subtype:'综合分析',words:['综合分析','谈谈理解','分析原因','观点现象']},
      {subtype:'提出对策',words:['提出对策','解决措施','工作建议']},
      {subtype:'应用文',words:['应用文','讲话稿','倡议书','公开信','简报','提纲']},
      {subtype:'文章写作',words:['文章写作','大作文','立意','分论点','标题']}
    ]
  };
  const clean=text=>(text||'').replace(/\s+/g,'').replace(/[|｜]/g,'');
  function classify(text){
    const value=clean(text),scored=rules.map(rule=>{
      const hits=rule.words.filter(word=>value.includes(word));
      const bias=(moduleBias[rule.module]||[]).filter(word=>value.includes(word));
      return {...rule,score:hits.length*3+bias.length,hits:[...hits,...bias]};
    }).sort((a,b)=>b.score-a.score);
    const first=scored[0],second=scored[1],gap=first.score-second.score;
    const confidence=first.score>=9&&gap>=3?'高':first.score>=4&&gap>=1?'中':'低';
    return {module:first.score?first.module:'言语理解',type:first.score?first.type:'请手动确认',confidence,score:first.score,candidates:scored.filter(x=>x.score>0).slice(0,3).map(x=>({module:x.module,type:x.type,score:x.score})),reason:first.hits.slice(0,4).join('、')||'未识别到稳定关键词'};
  }
  function classifyNote(text){
    const value=clean(text),scored=[];
    Object.entries(noteCatalog).forEach(([module,items])=>items.forEach(item=>{
      const hits=item.words.filter(word=>value.includes(word));
      const moduleHit=value.includes(module)?1:0;
      scored.push({module,subtype:item.subtype,score:hits.length*3+moduleHit,hits});
    }));
    scored.sort((a,b)=>b.score-a.score);
    const first=scored[0],second=scored[1],gap=first.score-second.score;
    const confidence=first.score>=7&&gap>=3?'高':first.score>=3&&gap>=1?'中':'低';
    const lines=String(text||'').split(/\r?\n/).map(line=>line.replace(/\s+/g,' ').trim()).filter(line=>line.length>=2);
    const title=(lines.find(line=>line.length<=34)||lines[0]||'课堂笔记').slice(0,34);
    return {module:first.score?first.module:'判断推理',subtype:first.score?first.subtype:'请手动填写',title,confidence,score:first.score,reason:first.hits.slice(0,4).join('、')||'未识别到稳定关键词',candidates:scored.filter(x=>x.score>0).slice(0,3).map(x=>({module:x.module,subtype:x.subtype,score:x.score}))};
  }
  function parseQuestion(text){
    const raw=String(text||'').replace(/\r/g,'').replace(/[ＡＢＣＤ]/g,letter=>String.fromCharCode(letter.charCodeAt(0)-65248)).trim();
    const answer=(raw.match(/(?:参考)?答案\s*[:：]?\s*([A-D])/i)||[])[1]?.toUpperCase()||'';
    const analysis=(raw.match(/(?:答案解析|解析)\s*[:：]?\s*([\s\S]*)$/i)||[])[1]?.trim()||'';
    const markers=[];let match,pattern=/(?:^|\n)\s*([A-D])\s*[.．、:：)）]\s*/gi;
    while((match=pattern.exec(raw)))markers.push({label:match[1].toUpperCase(),start:match.index,end:pattern.lastIndex});
    if(markers.length<2){markers.length=0;pattern=/\s([A-D])\s*[.．、:：)）]\s*/gi;while((match=pattern.exec(' '+raw)))markers.push({label:match[1].toUpperCase(),start:Math.max(0,match.index-1),end:pattern.lastIndex-1})}
    const stopPositions=[raw.search(/(?:参考)?答案\s*[:：]?\s*[A-D]/i),raw.search(/(?:答案解析|解析)\s*[:：]?/i)].filter(index=>index>=0);
    const stem=(markers.length>=2?raw.slice(0,markers[0].start):raw.split(/(?:参考)?答案\s*[:：]?/i)[0]).replace(/^\s*(?:第?\s*\d+\s*题|\d+)\s*[.、．]?\s*/,'').trim();
    const options=markers.length>=2?markers.map((item,index)=>{const next=markers[index+1]?.start??raw.length,stop=Math.min(next,...stopPositions.filter(position=>position>item.end),raw.length);return {label:item.label,text:raw.slice(item.end,stop).replace(/\s+/g,' ').trim()}}).filter(item=>item.text):[];
    const searchQuery=(stem||raw).replace(/\s+/g,' ').slice(0,90);
    return {stem,options,answer,analysis,searchQuery,isPlayable:options.length>=2};
  }
  function loadOcr(){
    if(root.Tesseract)return Promise.resolve(root.Tesseract);
    if(root.__gongkaoOcrLoading)return root.__gongkaoOcrLoading;
    root.__gongkaoOcrLoading=new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src=OCR_URL;script.async=true;
      script.onload=()=>resolve(root.Tesseract);script.onerror=()=>reject(new Error('识别组件加载失败，请检查网络后重试'));
      document.head.appendChild(script);
    });
    return root.__gongkaoOcrLoading;
  }
  async function recognize(file,onProgress){
    const T=await loadOcr();
    const worker=await T.createWorker('chi_sim+eng',1,{logger:m=>onProgress?.(m)});
    try{const result=await worker.recognize(file);return {text:result.data.text.trim(),ocrConfidence:Math.round(result.data.confidence||0)}}
    finally{await worker.terminate()}
  }
  function thumbnail(file,max=720,quality=.58){
    return new Promise((resolve,reject)=>{const image=new Image(),url=URL.createObjectURL(file);image.onload=()=>{const scale=Math.min(1,max/Math.max(image.width,image.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);URL.revokeObjectURL(url);resolve(canvas.toDataURL('image/jpeg',quality))};image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('无法读取这张图片，请改用JPG或PNG'))};image.src=url});
  }
  root.GongkaoRecognizer={classify,classifyNote,parseQuestion,recognize,thumbnail,noteCatalog};
})(globalThis);
