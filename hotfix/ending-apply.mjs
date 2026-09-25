/* Aplica somente a revisão de encerramento à base 23.0 verificada.
   Falha se o jogo divergir. Nenhuma escrita em servidor, painel ou dados privados. */
import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const out=resolve(process.argv[2]||'/out'),own=dirname(fileURLToPath(import.meta.url));
const game=resolve(out,'public/gameseducativos/game.js'),index=resolve(out,'public/gameseducativos/index.html');
let s=readFileSync(game,'utf8');
const hash=s=>createHash('sha256').update(s).digest('hex');
if(hash(s)!=='e80df6df91f84925e67edf743ac5bb070272a0af29d4b053563b66a1a56c05dc')throw Error('Base do jogo divergente. Revise antes de aplicar o encerramento 23.1.');
function replaceBetween(start,end,replacement){const a=s.indexOf(start),b=s.indexOf(end,a+start.length);if(a<0||b<0)throw Error('Ponto de atualização ausente: '+start);s=s.slice(0,a)+replacement+'\n'+s.slice(b);}
replaceBetween(' function renderResults(){',' function updateReceipt(){',`
 let endingFlow=null;
 function ending(){return endingFlow||=(window.MCEnding.create({root:$('#resultsView'),getState:()=>({...state,opinionPending:opinion.pending}),content:C,icon,escape:escapeHTML,feedbackMarkup,bindFeedback,updateReceipt,toast}));}
 function renderResults(){if(!state.results)return;ending().render();$('#resultsTitle')?.focus({preventScroll:true});}
 function feedbackMarkup(){return \`<section class="student-feedback" aria-labelledby="feedbackTitle"><h2 id="feedbackTitle">Aproveite e nos conte: o que achou da dinâmica?</h2><p>Sua avaliação não altera a pontuação. O comentário é opcional.</p><form id="feedbackForm"><fieldset class="opinion-options"><legend class="sr-only">Como você avalia a dinâmica?</legend>\${['Excelente','Muito bom','Bom','Cansativo','Ruim'].map(label=>\`<label class="opinion-option"><input type="radio" name="avaliacao" value="\${label}" \${opinion.rating===label?'checked':''} required><span>\${label}</span></label>\`).join('')}</fieldset><div class="field"><label for="feedbackComment">Comentário <span class="muted">(opcional)</span></label><textarea id="feedbackComment" name="comentario" maxlength="2000" rows="3" placeholder="Conte o que funcionou bem e o que podemos melhorar." aria-describedby="commentCounter">\${escapeHTML(opinion.comment)}</textarea><small id="commentCounter">\${opinion.comment.length} de 2.000 caracteres</small></div><div class="feedback-actions"><button type="submit" class="button primary" id="sendFeedback">\${opinion.saved?'Atualizar avaliação':'Enviar avaliação'} \${icon('arrow')}</button><span id="feedbackStatus" role="status">\${opinion.saved?'Avaliação recebida. Obrigada por compartilhar!':''}</span></div></form></section><section class="forum-invitation" aria-labelledby="forumInvitationTitle">\${icon('book')}<div><h2 id="forumInvitationTitle">Continue a conversa no Fórum de Interação</h2><p>Compartilhe no Fórum de Interação sua pontuação e o que achou da dinâmica. Se desejar, inclua uma imagem do seu resultado.</p><button type="button" class="text-button" data-action="download">Salvar imagem do resultado \${icon('download')}</button></div></section>\`;}
`);
replaceBetween(' function bindFeedback(){',' function award(){',`
 function bindFeedback(){
  const form=$('#feedbackForm'),textarea=$('#feedbackComment');if(!form||!textarea)return;
  function dirtyOpinion(){opinion.saved=false;rememberOpinion();const status=$('#feedbackStatus');if(status)status.textContent='';const button=$('#sendFeedback');if(button)button.innerHTML='Enviar avaliação '+icon('arrow');}
  textarea.oninput=()=>{opinion.comment=textarea.value;$('#commentCounter').textContent=textarea.value.length+' de 2.000 caracteres';dirtyOpinion();};
  form.addEventListener('change',()=>{opinion.rating=new FormData(form).get('avaliacao')||'';dirtyOpinion();});
  if(opinion.pending){form.querySelectorAll('input,textarea,button').forEach(el=>el.disabled=true);$('#sendFeedback').textContent='Enviando…';}
  form.onsubmit=async e=>{e.preventDefault();if(opinion.pending||!form.reportValidity())return;
   opinion.rating=new FormData(form).get('avaliacao');opinion.comment=textarea.value;opinion.pending=true;rememberOpinion();
   const button=$('#sendFeedback'),status=$('#feedbackStatus'),startedAt=state.started;button.disabled=true;form.querySelectorAll('input,textarea').forEach(el=>el.disabled=true);button.textContent='Enviando…';status.textContent='Aguarde a confirmação de recebimento.';
   let r;try{r=await window.MissaoCircularIntegration.send('feedback',{jogoId:C.gameId,nome:state.player,avaliacao:opinion.rating,comentario:opinion.comment});}catch{r={ok:false,error:'Não foi possível confirmar o envio. Sua avaliação foi mantida; tente novamente.'};}
   if(state.started!==startedAt)return;opinion.pending=false;opinion.saved=r?.ok===true;rememberOpinion();
   if(form.isConnected){button.disabled=false;form.querySelectorAll('input,textarea').forEach(el=>el.disabled=false);button.innerHTML=(opinion.saved?'Atualizar avaliação':'Tentar novamente')+' '+icon('arrow');status.textContent=opinion.saved?'Avaliação recebida. Obrigada por compartilhar!':r?.error||'Não foi possível confirmar o envio. Tente novamente.';announce(status.textContent);}
  };
 }
 function downloadResult(){if(state.results)return ending().saveImage();}
`);
replaceBetween(' function award(){',' function restart(){',` function award(){if(state.results)ending().setStep(2);}`);
s=s.replace("case 'copyForum':copyForum();break;",'');
s=s.replace("  if(!['welcome','story',...C.phases.map(p=>p.id)].includes(phase))return;","  if(opinion.pending&&phase!==state.phase){toast('Aguarde a confirmação do envio da sua avaliação.');return;}\n  if(!['welcome','story',...C.phases.map(p=>p.id)].includes(phase))return;");
s='/* Encerramento em três telas e resultado em PNG — interface 23.1. */\n'+s;
if(s.includes('missao-circular-meu-resultado.json')||s.includes('copyForum')||s.includes('Guardar resultado'))throw Error('Exportação técnica ainda presente no jogo.');
writeFileSync(game,s);
let h=readFileSync(index,'utf8');
if(!h.includes('<script src="game.js"></script>'))throw Error('Inclusão do jogo não encontrada.');
h=h.replace('<script src="game.js"></script>','<script src="ending.js?v=23.1"></script>\n<script src="game.js?v=23.1"></script>').replace('</head>','<link rel="stylesheet" href="ending.css?v=23.1">\n</head>').replaceAll('Guardar resultado','Salvar imagem do resultado');
writeFileSync(index,h);
for(const f of ['ending.js','ending.css'])copyFileSync(resolve(own,f),resolve(out,'public/gameseducativos',f));
const manifestPath=resolve(out,'ENDING_SHA256.json');writeFileSync(manifestPath,JSON.stringify({version:'23.1',files:Object.fromEntries(['game.js','index.html','ending.js','ending.css'].map(f=>[f,hash(readFileSync(resolve(out,'public/gameseducativos',f)))]))},null,2));
console.log('Encerramento 23.1 aplicado: resultado, revisão e avaliação final; exportação PNG. Dados privados inalterados.');
