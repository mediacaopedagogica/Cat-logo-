/* Feedback policy: consulta somente por evento, sem polling automático. */
'use strict';
(()=>{
 let last=null,checking=false,requestVersion=0;
 const root=document.getElementById('resultsView');if(!root)return;

 function apply(){
  const section=root.querySelector('.student-feedback');if(!section)return;
  section.hidden=last!==true;
  section.style.display=last===true?'':'none';
  const intro=root.querySelector('.ending-heading>p');
  if(intro){
   intro.dataset.defaultText??=intro.textContent;
   intro.textContent=last===false
    ?'Você chegou ao encerramento. Compartilhe sua pontuação e sua experiência no Fórum de Interação.'
    :intro.dataset.defaultText;
  }
 }

 async function refresh(){
  if(checking||document.body.dataset.phase!=='results')return;
  const host=window.MissaoCircularHost;
  if(typeof host?.onFeedbackPolicy!=='function')return;
  checking=true;const seq=++requestVersion;
  try{
   const r=await host.onFeedbackPolicy();
   if(seq===requestVersion&&r?.ok){last=r.enabled===true;apply();}
  }catch{/* A API continua validando a regra no momento do envio. */}
  finally{checking=false;}
 }

 /* Renderizações internas apenas reaplicam o último estado conhecido;
    não fazem nova consulta ao servidor. */
 new MutationObserver(records=>{
  if(records.some(r=>r.type==='childList'&&[...r.addedNodes].some(n=>n.nodeType===1)))apply();
 }).observe(root,{childList:true,subtree:true});

 /* Uma única consulta quando o resultado é produzido. */
 window.addEventListener('missao-circular:resultado',()=>refresh());
 window.addEventListener('missao-circular:participante',()=>{last=null;});
 apply();
})();
