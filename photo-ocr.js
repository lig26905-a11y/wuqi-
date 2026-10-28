'use strict';
let ocrLibraryPromise;
function loadOcrLibrary(){
 if(globalThis.Tesseract)return Promise.resolve(globalThis.Tesseract);
 if(!ocrLibraryPromise)ocrLibraryPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';script.crossOrigin='anonymous';
  const timeout=setTimeout(()=>{script.remove();reject(Error('识别工具加载超时，请检查网络后重试。'));},30000);
  script.onload=()=>{clearTimeout(timeout);globalThis.Tesseract?resolve(globalThis.Tesseract):reject(Error('识别工具未加载成功。'));};script.onerror=()=>{clearTimeout(timeout);script.remove();reject(Error('无法下载识别工具，请联网后重试。'));};document.head.append(script);
 }).catch(e=>{ocrLibraryPromise=null;throw e;});return ocrLibraryPromise;
}
function mergeOcrText(existing,recognized,append){return append&&existing.trim()?existing+'\n'+recognized:recognized;}
function createPhotoOcr(target){
 const group=el('div',undefined,'ocrgroup'),buttons=el('div',undefined,'actions'),status=el('p','可拍照或选择图片，识别后先核对，再填入。首次使用需要联网下载识别工具。','muted');status.setAttribute('role','status');
 const camera=el('input'),album=el('input');for(const input of [camera,album]){input.type='file';input.accept='image/*';input.hidden=true;}camera.setAttribute('capture','environment');
 const shoot=action('拍照识别',()=>camera.click()),choose=action('选择照片识别',()=>album.click()),cancel=action('取消识别',()=>stop());cancel.hidden=true;
 buttons.append(shoot,choose,cancel);const preview=el('img');preview.className='ocrpreview';preview.alt='待识别照片预览';preview.hidden=true;
 const result=el('textarea');result.rows=5;result.className='ocrresult';result.setAttribute('aria-label','识别结果，可修改');result.hidden=true;
 const apply=el('div',undefined,'actions');apply.hidden=true;apply.append(action('追加到文字后面',()=>insert(true),'primary'),action('替换此处文字',()=>insert(false)));
 group.append(buttons,camera,album,status,preview,result,apply);
 let worker=null,job=0,photoUrl=null,busy=false;
 function stop(){job++;if(worker){worker.terminate().catch(()=>{});worker=null;}busy=false;shoot.disabled=choose.disabled=false;cancel.hidden=true;status.textContent='识别已取消，原来的文字保持不变。';}
 function insert(append){const text=result.value.trim();if(!text){status.textContent='识别结果为空，请先填写或重新识别。';return;}const merged=mergeOcrText(target.value,text,append);if(merged.length>target.maxLength){status.textContent=`文字超过 ${target.maxLength} 字，请删减后再填入。`;return;}target.value=merged;target.dispatchEvent(new Event('input',{bubbles:true}));status.textContent='已填入，请检查文字，最后点击“保存错题”。';apply.hidden=true;target.focus();}
 async function recognize(file){
  if(!file)return;if(file.size>20*1024*1024){status.textContent='照片超过20MB，请选择小一点的图片。';return;}if(file.type&&!file.type.startsWith('image/')){status.textContent='请选择图片文件。';return;}
  const token=++job;busy=true;shoot.disabled=choose.disabled=true;cancel.hidden=false;apply.hidden=true;result.hidden=true;
  if(photoUrl)URL.revokeObjectURL(photoUrl);photoUrl=URL.createObjectURL(file);preview.src=photoUrl;preview.hidden=false;status.textContent='正在准备识别工具，第一次可能需要稍等……';let timeout;
  try{
   const operation=(async()=>{const library=await loadOcrLibrary();if(token!==job)return null;
    const active=await library.createWorker('chi_sim+eng',1,{workerPath:'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/worker.min.js',logger:message=>{if(token!==job)return;if(message.status==='recognizing text')status.textContent=`正在识别文字 ${Math.round((message.progress||0)*100)}%`;else status.textContent='正在加载中文识别资源，请稍等……';}});
    if(token!==job){await active.terminate();return null;}worker=active;return await active.recognize(file);
   })();
   const output=await Promise.race([operation,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('识别耗时过长，请检查网络，或换一张更清晰、更小的照片重试。')),120000);})]);
   if(token!==job)return;const text=output?.data?.text?.trim()||'';if(!text){status.textContent='没有识别出文字，请拍清晰一些，并尽量只拍题目或答案区域。';return;}
   result.value=text;result.hidden=false;apply.hidden=false;status.textContent='识别完成。请核对下方文字，尤其是数字、公式和手写内容，再选择追加或替换。';
  }catch(e){if(token===job)status.textContent=e.message||'识别失败，请重新选择清晰照片。';}
  finally{clearTimeout(timeout);if(token===job){job++;if(worker){worker.terminate().catch(()=>{});worker=null;}busy=false;shoot.disabled=choose.disabled=false;cancel.hidden=true;}}
 }
 for(const input of [camera,album])input.onchange=()=>{const file=input.files?.[0];input.value='';recognize(file);};
 // Closing the editor cancels work, so a late result cannot alter another question.
 const editor=$('knowledgeEditor');editor.addEventListener('close',()=>{if(busy)stop();if(photoUrl){URL.revokeObjectURL(photoUrl);photoUrl=null;}},{once:true});
 return group;
}
