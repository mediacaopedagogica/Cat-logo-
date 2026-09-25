/* Reports layout dimensions only. Names, scores, invitation keys and admin data never leave the game through this channel. */
(()=>{
 'use strict';
 const framed=window.self!==window.top;
 if(!framed&&new URLSearchParams(location.search).get('embed')!=='1')return;
 document.documentElement.classList.add('in-forum');
 if(!framed)return;
 let hostOrigin=null,last=0,pending=0;
 function height(){
  const nodes=[...document.body.children].filter(el=>!['SCRIPT','STYLE','DIALOG'].includes(el.tagName)&&!el.classList.contains('toast')&&!el.classList.contains('sr-only')&&!el.classList.contains('skip')&&getComputedStyle(el).display!=='none');
  return Math.ceil(Math.max(0,...nodes.map(el=>el.getBoundingClientRect().bottom+scrollY))+20);
 }
 function report(){
  cancelAnimationFrame(pending);pending=requestAnimationFrame(()=>{
   if(!hostOrigin)return;const value=Math.min(6000,Math.max(480,height()));
   if(Math.abs(value-last)>2){last=value;parent.postMessage({type:'mediacao:layout',height:value},hostOrigin);}
  });
 }
 window.addEventListener('message',e=>{
  if(e.source!==parent||e.data?.type!=='mediacao:layout-request')return;
  if(!/^https:\/\//.test(e.origin)&&!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(e.origin))return;
  hostOrigin=e.origin;last=0;report();
 });
 window.addEventListener('resize',report);
 function watch(){new ResizeObserver(report).observe(document.body);new MutationObserver(report).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['open','class','data-phase']});report();}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch,{once:true});else watch();
})();
