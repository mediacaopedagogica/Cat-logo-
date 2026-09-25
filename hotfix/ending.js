/* Encerramento 23.1: três telas; somente imagem do resultado para o participante.
   Não muda tentativas, pontuação, autenticação ou contratos de envio ao servidor. */
'use strict';
window.MCEnding = Object.freeze({
 create({root,getState,content,icon,escape,feedbackMarkup,bindFeedback,updateReceipt,toast}) {
  const labels=['Resultado','Revisão das escolhas','Avaliação e compartilhamento'];
  let step=0,index=0,signature='',busyImage=false;
  const state=()=>getState();
  function sync(){const s=state(),id=`${s.started}:${s.results?.tentativa}:${s.results?.pontuacao}`;
   if(id!==signature){signature=id;step=0;index=0;try{const v=JSON.parse(sessionStorage.getItem('mc-ending:'+id)||'null');if(v&&Number.isInteger(v.step)&&v.step>=0&&v.step<=2)step=v.step;if(v&&Number.isInteger(v.index)&&v.index>=0&&v.index<8)index=v.index;}catch{}}
  }
  function remember(){try{sessionStorage.setItem('mc-ending:'+signature,JSON.stringify({step,index}));}catch{}}
  function level(r){return r.percentual>=90?'Designer circular':r.percentual>=75?'Estrategista do ecodesign':r.percentual>=55?'Analista de ciclo de vida':'Observador sustentável';}
  const action=(label,attrs='',kind='secondary',ic='')=>`<button type="button" class="button ${kind}" ${attrs}>${escape(label)}${ic?icon(ic):''}</button>`;
  const stepButton=(label,n,kind='primary')=>action(label,`data-ending-step="${n}"`,kind,n<step?'back':'arrow');
  function overview(s,r){return `<header class="ending-heading"><h1 id="resultsTitle" tabindex="-1">Seu resultado.</h1><p>Confira sua pontuação. Depois, conheça os critérios das suas escolhas.</p></header>
   <section class="ending-score-card" id="studentResultCard" aria-label="Resumo do resultado">
    <div class="ending-score-main"><p class="eyebrow">Missão Circular · O destino da cadeira</p><h2 class="ending-name">${escape(s.player)}</h2><div class="ending-points"><strong>${r.pontuacao}</strong><span>de ${content.maxPoints} pontos</span></div><p class="ending-outcome">${r.acertos} de 8 decisões nos critérios do caso · ${r.percentual}%</p></div>
    <div class="ending-medal">${icon('star')}<span>Reconhecimento de participação</span><strong>${escape(level(r))}</strong></div>
    <dl class="ending-stats"><div><dt>Dicas utilizadas</dt><dd>${r.ajudasUtilizadas} de 2</dd></div><div><dt>Conferência</dt><dd>${r.tentativa}</dd></div><div><dt>Atividade</dt><dd>Design e Sustentabilidade</dd></div></dl>
   </section>
   <div id="resultReceipt" class="result-receipt" role="status"></div>
   <div class="ending-actions">${action('Salvar imagem do resultado','data-action="download"','secondary','download')}${stepButton('Revisar minhas escolhas',1)}</div>
   <p class="ending-note">A imagem contém apenas seu nome, resultado e reconhecimento. Seus comentários não aparecem nela.</p>`;}
  function review(s,r){const e=r.componentes[index],cat=id=>content.categories.find(c=>c.id===id),chosen=cat(e.escolha),expected=cat(e.esperado);
   return `<header class="ending-heading"><h1 id="resultsTitle" tabindex="-1">Uma escolha de cada vez.</h1><p>Compare suas decisões com os critérios deste caso. Sua pontuação não muda ao navegar por esta revisão.</p></header>
   <div class="ending-review-layout"><section aria-label="Análise dos componentes"><nav class="ending-pieces" aria-label="Escolher componente para revisar">${r.componentes.map((p,i)=>`<button type="button" data-ending-piece="${i}" aria-label="${i+1}. ${escape(p.peca)}" ${i===index?'aria-current="true"':''}>${String(i+1).padStart(2,'0')}</button>`).join('')}</nav>
    <article class="ending-decision"><div class="ending-decision-meta"><span>Componente ${index+1} de 8</span><span class="${e.coerente?'ending-correct':'ending-reconsider'}">${icon(e.coerente?'check':'info')}${e.coerente?'Coerente com o caso':'Retome a análise'}</span></div><h2 id="decisionTitle" tabindex="-1">${escape(e.peca)}</h2>
     <div class="ending-comparison"><div style="--tone:${chosen.color};--pale:${chosen.light}"><span>Sua escolha</span><strong>${escape(chosen.name)}</strong></div><div style="--tone:${expected.color};--pale:${expected.light}"><span>Critério do caso</span><strong>${escape(expected.name)}</strong></div></div>
     <p class="ending-reason">${escape(e.criterio)}</p>
     <div class="ending-piece-controls">${action('Anterior',`data-ending-piece="${index-1}" ${index===0?'disabled':''}`,'secondary','back')}${action('Próximo componente',`data-ending-piece="${index+1}" ${index===7?'disabled':''}`,'secondary','arrow')}</div>
    </article></section><aside class="ending-destinations"><h2>Destinos escolhidos</h2><p>Quantidades encaminhadas por você.</p>${content.categories.map(c=>`<div class="ending-destination" style="--tone:${c.color};--pale:${c.light}">${icon(c.icon)}<span>${escape(c.name)}</span><strong>${r.categorias[c.id]||0}</strong></div>`).join('')}<p class="ending-note">Essas quantidades não representam o gabarito.</p></aside></div>
    <div class="ending-actions"><div>${stepButton('Voltar ao resultado',0,'secondary')}${action('Ajustar minha triagem','data-action="review"','secondary')}</div>${stepButton('Continuar para avaliação',2)}</div>`;
  }
  function final(s,r){return `<header class="ending-heading"><h1 id="resultsTitle" tabindex="-1">Sua experiência importa.</h1><p>Você chegou ao encerramento. Sua pontuação já foi calculada; responder à avaliação é opcional.</p></header>
   <div id="resultReceipt" class="result-receipt" role="status"></div>${feedbackMarkup()}
   <div class="ending-actions">${stepButton('Voltar à revisão',1,'secondary')}${action('Jogar novamente','data-ending-restart','secondary','rotate')}</div>`;}
  function render(focus=false){const s=state(),r=s.results;if(!r||s.phase!=='results')return;sync();
   root.classList.add('ending-view');root.dataset.endingVersion='23.1';root.dataset.endingStep=String(step);
   root.innerHTML=`<div class="ending-step-label">Encerramento · ${step+1} de 3</div><nav class="ending-tabs" aria-label="Telas de encerramento">${labels.map((l,i)=>`<button type="button" data-ending-step="${i}" ${i===step?'aria-current="step"':''}><span>${i+1}</span>${l}</button>`).join('')}</nav>`+(step===0?overview(s,r):step===1?review(s,r):final(s,r));
   if(step===2)bindFeedback();updateReceipt();remember();
   if(focus){window.speechSynthesis?.cancel();root.querySelector('#resultsTitle')?.focus({preventScroll:true});root.scrollIntoView({block:'start',behavior:'instant'});}
  }
  function setStep(n){if(!Number.isInteger(n)||n<0||n>2||state().phase!=='results')return;if(state().opinionPending){toast('Aguarde a confirmação do envio da sua avaliação.');return;}sync();step=n;remember();render(true);}
  root.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!root.contains(b))return;
   if(b.hasAttribute('data-ending-step'))setStep(Number(b.dataset.endingStep));
   if(b.hasAttribute('data-ending-piece')){const n=Number(b.dataset.endingPiece);if(!Number.isInteger(n)||n<0||n>7)return;index=n;remember();render();root.querySelector('#decisionTitle')?.focus({preventScroll:true});}
   if(b.hasAttribute('data-ending-restart')){if(state().opinionPending){toast('Aguarde a confirmação do envio da sua avaliação.');return;}document.querySelector('#confirmDialog')?.showModal();}
  });
  function round(ctx,x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}}
  function lines(ctx,text,max){const words=String(text).split(/\s+/u),out=[];let line='';for(const word of words){const joined=line?line+' '+word:word;if(ctx.measureText(joined).width<=max){line=joined;continue;}if(line)out.push(line);line='';for(const ch of word){if(ctx.measureText(line+ch).width>max&&line){out.push(line);line='';}line+=ch;}}if(line)out.push(line);return out;}
  function drawImage(s,r){const canvas=document.createElement('canvas');canvas.width=1440;canvas.height=1020;const c=canvas.getContext('2d');if(!c)throw Error('Imagem indisponível.');
   const bg=c.createLinearGradient(0,0,1440,1020);bg.addColorStop(0,'#fafaf0');bg.addColorStop(1,'#e8f0df');c.fillStyle=bg;c.fillRect(0,0,1440,1020);
   round(c,38,38,1364,944,36,'#fffdf5','#bccfac');
   c.fillStyle='#236b55';c.font='700 28px system-ui';c.fillText('MISSÃO CIRCULAR',90,114);c.fillStyle='#496349';c.font='25px system-ui';c.fillText('O destino da cadeira · Design e Sustentabilidade',90,156);
   c.fillStyle='#173f33';c.font='650 40px system-ui';const nameLines=lines(c,s.player,1260);nameLines.forEach((line,i)=>c.fillText(line,90,227+i*50));
   const shift=Math.max(0,nameLines.length-1)*50;canvas.height=1020+shift;
   // Alterar a altura limpa o canvas; desenhe o cartão final com folga para nomes longos.
   c.fillStyle=bg;c.fillRect(0,0,1440,canvas.height);round(c,38,38,1364,canvas.height-76,36,'#fffdf5','#bccfac');
   c.fillStyle='#236b55';c.font='700 28px system-ui';c.fillText('MISSÃO CIRCULAR',90,114);c.fillStyle='#496349';c.font='25px system-ui';c.fillText('O destino da cadeira · Design e Sustentabilidade',90,156);
   c.fillStyle='#173f33';c.font='650 40px system-ui';nameLines.forEach((line,i)=>c.fillText(line,90,227+i*50));
   const y=280+shift;round(c,84,y,778,360,28,'#edf4e4','#cfdfbe');c.fillStyle='#164b38';c.font='750 132px system-ui';c.fillText(String(r.pontuacao),124,y+158);c.font='34px system-ui';c.fillText(`de ${content.maxPoints} pontos`,124,y+215);c.font='28px system-ui';c.fillText(`${r.percentual}% de aproveitamento`,124,y+268);c.font='25px system-ui';c.fillText(`${r.acertos} de 8 decisões nos critérios do caso`,124,y+310);
   const mx=1100,my=y+130;c.fillStyle='#f3e8b7';c.strokeStyle='#bb9d4a';c.lineWidth=3;c.beginPath();c.arc(mx,my,88,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='#537242';c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?26:56;if(i===0)c.moveTo(mx+Math.cos(a)*rr,my+Math.sin(a)*rr);else c.lineTo(mx+Math.cos(a)*rr,my+Math.sin(a)*rr);}c.closePath();c.fill();
   c.textAlign='center';c.fillStyle='#4f6544';c.font='20px system-ui';c.fillText('RECONHECIMENTO DE PARTICIPAÇÃO',mx,y+254);c.fillStyle='#244f3c';c.font='650 30px system-ui';lines(c,level(r),390).forEach((line,i)=>c.fillText(line,mx,y+300+i*39));c.textAlign='left';
   round(c,84,y+397,1272,111,20,'#f6f6e9');c.fillStyle='#51654a';c.font='23px system-ui';c.fillText('Dicas utilizadas',111,y+440);c.fillText('Conferência',560,y+440);c.fillText('Data do resultado',964,y+440);c.fillStyle='#1c4f3c';c.font='650 29px system-ui';c.fillText(`${r.ajudasUtilizadas} de 2`,111,y+484);c.fillText(String(r.tentativa),560,y+484);const date=new Date(r.data);c.fillText(Number.isFinite(date.getTime())?date.toLocaleDateString('pt-BR'):'—',964,y+484);
   c.fillStyle='#2d644d';c.font='italic 31px Georgia';c.fillText('Pequenas escolhas, grandes impactos.',90,y+586);c.fillStyle='#5b7054';c.font='22px system-ui';c.fillText('A pontuação considera os critérios apresentados nesta atividade.',90,y+636);return canvas;
  }
  async function saveImage(){const snapshot=state();if(!snapshot.results||busyImage)return;busyImage=true;root.querySelectorAll('[data-action="download"]').forEach(b=>b.disabled=true);
   try{const canvas=drawImage(snapshot,snapshot.results);const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Imagem não gerada.')),'image/png'));const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='missao-circular-resultado.png';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),120000);toast('Imagem do resultado preparada em PNG. Verifique os downloads do seu dispositivo.');}
   catch{toast('Não foi possível salvar a imagem. Você também pode fazer uma captura de tela do resultado.');}
   finally{busyImage=false;root.querySelectorAll('[data-action="download"]').forEach(b=>b.disabled=false);}
  }
  return Object.freeze({render,setStep,saveImage});
 }
});
