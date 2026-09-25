/* Ajustes editoriais aplicados ao mesmo portfólio. Não troca a navegação nem a virada de folhas. */
(()=>{
 'use strict';
 const revision='20260925-layout2';
 let safeImage=null;
 const originalPath=new URL('assets/imagem-01.webp',document.baseURI).href;
 const isTours=value=>/(?:^|\/)imagem-01\.webp(?:[?#]|$)/.test(value||'');
 const ready=new Promise((resolve,reject)=>{
  const source=new Image();
  source.onload=()=>{
   try{
    const top=Math.ceil(source.naturalHeight*58/613);
    const canvas=document.createElement('canvas');canvas.width=source.naturalWidth;canvas.height=source.naturalHeight-top;
    canvas.getContext('2d').drawImage(source,0,top,source.naturalWidth,canvas.height,0,0,canvas.width,canvas.height);
    safeImage=canvas.toDataURL('image/webp',.94);
    window.KEISE_IMAGES={...(window.KEISE_IMAGES||{}),'01':safeImage};resolve(safeImage);
   }catch(error){reject(error);}
  };
  source.onerror=()=>reject(new Error('A captura de Tours não pôde ser carregada.'));
  source.src=originalPath;
 });
 function cleanImages(d){if(!safeImage)return;d.querySelectorAll('img').forEach(img=>{if(isTours(img.getAttribute('src')))img.src=safeImage;});}
 ready.then(()=>cleanImages(document)).catch(()=>{});
 new MutationObserver(()=>cleanImages(document)).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
 const frame=document.getElementById('magazine-frame');
 if(!frame)return;
 let fit=()=>{};
 function attach(){
  const d=frame.contentDocument;if(!d?.querySelector('#magazine'))return;
  const guard=d.createElement('style');guard.textContent='img[src*="imagem-01.webp"]{visibility:hidden!important}';d.head.append(guard);
  const images=()=>cleanImages(d);
  const cleanStyles=()=>{if(!safeImage)return;d.querySelectorAll('style').forEach(style=>{if(style.textContent.includes('assets/imagem-01.webp'))style.textContent=style.textContent.replaceAll('assets/imagem-01.webp',safeImage);});};
  images();cleanStyles();ready.then(()=>{images();cleanStyles();}).catch(()=>{});
  const sheet=d.createElement('link');sheet.rel='stylesheet';sheet.href=new URL('revista-layout.css?v='+revision,document.baseURI).href;d.head.append(sheet);
  let generation=0,timer;
  function adjust(){
   const run=++generation;clearTimeout(timer);
   const narrow=frame.clientWidth<=900;
   const heading=document.querySelector('.magazine-top').getBoundingClientRect().height;
   let height=Math.max(narrow?850:700,Math.min(1000,window.innerHeight-heading));
   frame.style.height=height+'px';
   function measure(round=0){
    if(run!==generation||!frame.contentDocument||frame.offsetParent===null)return;
    let missing=0;
    d.querySelectorAll('.half').forEach(half=>{
     if(!half.offsetWidth)return;const edge=half.getBoundingClientRect();
     const walker=d.createTreeWalker(half,NodeFilter.SHOW_TEXT);
     for(let node;node=walker.nextNode();){
      if(!node.textContent.trim()||node.parentElement.closest('.page-no,.spark,.blob,[aria-hidden=true]'))continue;
      const style=d.defaultView.getComputedStyle(node.parentElement);if(style.display==='none'||style.visibility==='hidden')continue;
      const range=d.createRange();range.selectNodeContents(node);
      for(const r of range.getClientRects())if(r.width>0&&r.height>0)missing=Math.max(missing,edge.top+20-r.top,r.bottom-(edge.bottom-36));
     }
    });
    if(missing>2&&round<6&&height<2300){height=Math.ceil(height+missing*2+18);frame.style.height=height+'px';d.defaultView.requestAnimationFrame(()=>measure(round+1));}
    else frame.dataset.layoutChecked='true';
   }
   d.defaultView.requestAnimationFrame(()=>d.defaultView.requestAnimationFrame(()=>measure()));
  }
  fit=()=>{clearTimeout(timer);timer=setTimeout(adjust,40);};
  const observer=new MutationObserver(()=>{images();fit();});
  ['leftPage','rightPage'].forEach(id=>{const el=d.getElementById(id);if(el)observer.observe(el,{childList:true});});
  sheet.onload=fit;sheet.onerror=fit;d.fonts?.ready.then(fit);fit();
 }
 frame.addEventListener('load',attach);
 window.addEventListener('resize',()=>fit());window.addEventListener('hashchange',()=>fit());
 document.addEventListener('fullscreenchange',()=>fit());
})();
