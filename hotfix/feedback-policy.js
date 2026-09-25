/* Keep the optional survey in sync with the game's server-side setting. */
'use strict';
(()=>{
 let last=null,checking=false,next=0,requestVersion=0;
 const root=document.getElementById('resultsView');if(!root)return;
 function apply(){const section=root.querySelector('.student-feedback');if(!section)return;
  section.hidden=last!==true;
  section.style.display=last===true?'':'none';
  const intro=root.querySelector('.ending-heading>p');if(intro){intro.dataset.defaultText??=intro.textContent;intro.textContent=last===false?'Você chegou ao encerramento. Compartilhe sua pontuação e sua experiência no Fórum de Interação.':intro.dataset.defaultText;}
 }
 async function refresh(force=false){
  if(checking||(!force&&Date.now()<next)||document.body.dataset.phase!=='results')return;
  const host=window.MissaoCircularHost;if(typeof host?.onFeedbackPolicy!=='function')return;
  checking=true;const seq=++requestVersion;
  try{const r=await host.onFeedbackPolicy();if(seq===requestVersion&&r?.ok){last=r.enabled===true;apply();}}catch{/* The API still enforces the setting if the network fails. */}
  finally{checking=false;next=Date.now()+15000;}
 }
 new MutationObserver(records=>{if(records.some(r=>r.type==='childList'&&[...r.addedNodes].some(n=>n.nodeType===1))){apply();refresh();}}).observe(root,{childList:true,subtree:true});
 window.addEventListener('missao-circular:resultado',()=>refresh(true));
 window.addEventListener('missao-circular:participante',()=>{last=null;next=0;});
 setInterval(()=>{if(!document.hidden)refresh();},15000);apply();
})();
