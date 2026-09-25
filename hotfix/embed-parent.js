/* Optional host-page enhancement. The iframe remains usable when a forum strips scripts. */
(()=>{
 'use strict';
 if(window.__mediacaoLayoutListener)return;window.__mediacaoLayoutListener=true;
 const selector='iframe[data-mediacao-embed]';
 function init(frame){
  let origin;try{origin=new URL(frame.src,document.baseURI).origin;}catch{return;}
  const ask=()=>frame.contentWindow?.postMessage({type:'mediacao:layout-request'},origin);
  if(!frame.dataset.layoutBound){frame.dataset.layoutBound='1';frame.addEventListener('load',ask);}
  ask();
 }
 window.addEventListener('message',e=>{
  if(e.data?.type!=='mediacao:layout'||!Number.isFinite(e.data.height))return;
  const frame=[...document.querySelectorAll(selector)].find(f=>f.contentWindow===e.source);if(!frame)return;
  let origin;try{origin=new URL(frame.src,document.baseURI).origin;}catch{return;}
  if(e.origin!==origin)return;
  frame.style.height=Math.ceil(Math.min(6000,Math.max(480,e.data.height)))+'px';
 });
 function scan(){document.querySelectorAll(selector).forEach(init);}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan,{once:true});else scan();
 new MutationObserver(records=>{if(records.some(r=>r.addedNodes.length))scan();}).observe(document.documentElement,{childList:true,subtree:true});
})();
