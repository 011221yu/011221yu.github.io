(function(root){
  'use strict';
  const PDFJS_URL='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs';
  const WORKER_URL='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
  let loader;
  function questionNumber(text){const match=String(text||'').trim().match(/^(\d{1,3})[.．、]\s*/);return match?Number(match[1]):0}
  async function pdfjs(){
    loader=loader||import(PDFJS_URL).then(lib=>(lib.GlobalWorkerOptions.workerSrc=WORKER_URL,lib));
    return loader;
  }
  function pageItems(content,viewport,lib){
    return content.items.filter(item=>item.str?.trim()).map(item=>{const matrix=lib.Util.transform(viewport.transform,item.transform);return {text:item.str.trim(),x:matrix[4],y:matrix[5]}});
  }
  function crop(source,top,bottom){
    const canvas=document.createElement('canvas'),context=canvas.getContext('2d');
    canvas.width=source.width;canvas.height=Math.max(1,Math.round(bottom-top));
    context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);
    context.drawImage(source,0,top,source.width,canvas.height,0,0,source.width,canvas.height);
    return canvas.toDataURL('image/jpeg',.78);
  }
  async function importQuestions(file,onProgress=()=>{}){
    if(!file||file.type!=='application/pdf'&&!/\.pdf$/i.test(file.name||''))throw new Error('请选择粉笔导出的 PDF 文件');
    if(file.size>40*1024*1024)throw new Error('PDF 请控制在 40MB 以内');
    const lib=await pdfjs(),documentTask=lib.getDocument({data:new Uint8Array(await file.arrayBuffer())}),pdf=await documentTask.promise,questions=[];
    for(let pageNo=1;pageNo<=pdf.numPages;pageNo++){
      onProgress(pageNo,pdf.numPages);
      const page=await pdf.getPage(pageNo),viewport=page.getViewport({scale:1.55}),content=await page.getTextContent(),items=pageItems(content,viewport,lib),starts=items.map((item,index)=>({...item,index,number:questionNumber(item.text)})).filter(item=>item.number).sort((a,b)=>a.y-b.y);
      if(!starts.length)continue;
      const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
      await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
      for(let i=0;i<starts.length;i++){
        const start=starts[i],top=Math.max(0,Math.floor(start.y-28)),bottom=Math.min(canvas.height,Math.ceil((starts[i+1]?.y||canvas.height*.93)-12));
        const text=items.filter(item=>item.y>=top&&item.y<bottom).sort((a,b)=>Math.abs(a.y-b.y)>5?a.y-b.y:a.x-b.x).map(item=>item.text).join(' ').replace(/\s+/g,' ').trim();
        questions.push({number:start.number,page:pageNo,text,image:crop(canvas,top,bottom)});
      }
    }
    if(!questions.length)throw new Error('没有识别到题号；这份 PDF 可改用截图上传');
    return questions;
  }
  root.GongkaoPdfImporter={questionNumber,importQuestions};
  if(typeof module!=='undefined')module.exports=root.GongkaoPdfImporter;
})(globalThis);
