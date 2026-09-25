/* Missão Circular v21 — revisão funcional do jogo fornecido (v19.7).
 * Mantém IDs, gabarito, 8 peças, 2 dicas, pontuação de 80 e reconhecimento.
 * Dados ficam na sessão local. Nenhum ranking remoto é simulado ou publicado.
 */
'use strict';
(()=>{
 const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],C=MC_CONTENT,P=C.parts,cats=C.categories;
 const storageKey='missao-circular-v21-session';
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const state={phase:'welcome',previous:'new',player:'',focus:null,selected:null,visited:[],placements:{},hints:2,hintUsed:[],hintText:'',highest:-1,attempts:0,results:null,sound:false,speech:false,labels:false,contrast:false,reduced,explode:100,started:0};
 let saved=null;try{const v=JSON.parse(sessionStorage.getItem(storageKey)||'null');if(v&&v.version===C.version&&typeof v==='object')saved=v}catch{}
 let R=null,world=null,dirty=true,raf=0,toastTimer=0,noticeTimer=0,testing=false,returnCamera=null,lastViewportSize='',lastFocusBeforeInspect=null;
 const panelScroll={};
 const orbit={target:[0,2.75,0],radius:10.6,theta:.46,phi:1.10,min:3.2,max:32};
 const animations=[];let audioContext=null;
 const validPart=id=>P.some(p=>p.id===id),part=id=>P.find(p=>p.id===id),category=id=>cats.find(c=>c.id===id),phaseIndex=()=>C.phases.findIndex(p=>p.id===state.phase);
 function safeName(v){return String(v||'').replace(/[\u0000-\u001F\u007F]/g,'').trim().slice(0,42)}
 function persist(){
  if(state.phase==='welcome'&&!state.started)return;
  try{sessionStorage.setItem(storageKey,JSON.stringify({version:C.version,phase:state.phase,previous:state.previous,player:state.player,visited:state.visited,placements:state.placements,hints:state.hints,hintUsed:state.hintUsed,hintText:state.hintText,highest:state.highest,attempts:state.attempts,started:state.started,explode:state.explode,results:state.results,settings:{sound:state.sound,speech:state.speech,labels:state.labels,contrast:state.contrast,reduced:state.reduced}}))}catch{}
 }
 function announce(t){$('#live').textContent=t;if(state.speech)say(t)}
 function toast(t){clearTimeout(toastTimer);$('#toast').textContent=t;$('#toast').classList.remove('hidden');toastTimer=setTimeout(()=>$('#toast').classList.add('hidden'),3600);announce(t)}
 function notice(t){clearTimeout(noticeTimer);$('#sceneNotice').textContent=t;$('#sceneNotice').classList.remove('hidden');noticeTimer=setTimeout(()=>$('#sceneNotice').classList.add('hidden'),4800);announce(t)}
 function say(t){if(!('speechSynthesis'in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang='pt-BR';u.rate=.98;const voices=window.speechSynthesis.getVoices();const voice=voices.find(v=>v.lang==='pt-BR')||voices.find(v=>v.lang.startsWith('pt'));if(voice)u.voice=voice;window.speechSynthesis.speak(u)}
 function sound(kind='place'){
  if(!state.sound)return;
  try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;audioContext||=new A();audioContext.resume().catch(()=>{});
   const t=audioContext.currentTime,g=audioContext.createGain();g.connect(audioContext.destination);
   const len=Math.ceil(audioContext.sampleRate*.13),buf=audioContext.createBuffer(1,len,audioContext.sampleRate),data=buf.getChannelData(0);
   for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/(len*.13));const src=audioContext.createBufferSource();src.buffer=buf;
   const filter=audioContext.createBiquadFilter();filter.type='lowpass';filter.frequency.value=kind==='place'?900:1700;
   src.connect(filter).connect(g);g.gain.value=.08;src.start(t);src.onended=()=>{src.disconnect();filter.disconnect();g.disconnect()};
  }catch{}
 }
 function request(){dirty=true;if(!raf)raf=requestAnimationFrame(frame)}
 function frame(now){
  raf=0;let changed=false;
  for(let i=animations.length-1;i>=0;i--){const a=animations[i],t=Math.min(1,Math.max(0,(now-a.start)/a.duration)),v=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;a.fn(v,t);changed=true;if(t===1){animations.splice(i,1);a.done?.()}}
  if(R&&state.phase!=='results'&&(dirty||changed||animations.length)&&!R.lost){
   const si=Math.sin(orbit.phi);R.eye=[orbit.target[0]+orbit.radius*si*Math.sin(orbit.theta),orbit.target[1]+orbit.radius*Math.cos(orbit.phi),orbit.target[2]+orbit.radius*si*Math.cos(orbit.theta)];R.target=[...orbit.target];R.render();updateLabels();dirty=false;
  }
  if(animations.length)request();
 }
 function stopAnimations(){animations.length=0;if(testing&&state.focus)world?.testAnimation(state.focus,1);testing=false;}
 function tween(duration,fn,done){if(state.reduced){fn(1,1);done?.();request();return}animations.push({start:performance.now(),duration,fn,done});request()}
 function setCamera(target,radius,theta,phi,smooth=false){if(!smooth){Object.assign(orbit,{target:[...target],radius,theta,phi});request();return}const a={target:[...orbit.target],radius:orbit.radius,theta:orbit.theta,phi:orbit.phi};tween(580,t=>{orbit.target=a.target.map((x,i)=>x+(target[i]-x)*t);orbit.radius=a.radius+(radius-a.radius)*t;orbit.theta=a.theta+(theta-a.theta)*t;orbit.phi=a.phi+(phi-a.phi)*t})}
 function defaultView(smooth=false){
  if(!world||!R)return;
  const inspecting=!!state.focus,isTriage=['triage','results'].includes(state.phase);
  let bounds=world.bounds(inspecting?world.inspectorGroup:world.partsGroup),target,theta,phi;
  if(inspecting){target=[(bounds.min[0]+bounds.max[0])/2,(bounds.min[1]+bounds.max[1])/2,(bounds.min[2]+bounds.max[2])/2];theta=.40;phi=1.06;}
  else if(isTriage){bounds={min:[-7.1,1.1,-6.4],max:[7.1,4.0,4.8]};target=[0,2.10,-.6];theta=0;phi=.89;}
  else{const h=bounds.max[1];bounds.min=[-2.8,.08,-2.6];bounds.max=[2.8,h+.10,2.6];target=[0,h*.49,0];theta=.38;phi=1.15;}
  const r=$('#viewport').getBoundingClientRect(),aspect=Math.max(.2,r.width/Math.max(1,r.height));
  const compact=isTriage&&(r.width<850);if(compact)target[1]=4.0;const padX=inspecting?.79:.88,padTop=compact?.56:.77,padBottom=.77;
  const fit=radius=>{const si=Math.sin(phi),eye=[target[0]+radius*si*Math.sin(theta),target[1]+radius*Math.cos(phi),target[2]+radius*si*Math.cos(theta)];const vp=MC3D.mul(MC3D.perspective(R.fov,aspect),MC3D.look(eye,target));
   const points=[];if(isTriage&&!inspecting){for(const x of[-7.1,7.1])for(const z of[-3.7,4.8])points.push([x,1.70,z]);for(const x of[-7.1,7.1])points.push([x,3.80,-6.4]);}else{for(const x of[bounds.min[0],bounds.max[0]])for(const y of[bounds.min[1],bounds.max[1]])for(const z of[bounds.min[2],bounds.max[2]])points.push([x,y,z]);}for(const point of points){const q=MC3D.transform(vp,point);if(Math.abs(q[0])>padX||q[1]>padTop||q[1]<-padBottom||q[2]<-1||q[2]>1)return false;}return true;};
  let radius=inspecting?1.9:5;while(!fit(radius)&&radius<70)radius*=1.075;
  if(inspecting)radius=Math.max(radius,3.4);
  orbit.min=Math.max(inspecting?1.6:3.5,radius*.58);orbit.max=radius*1.9;
  setCamera(target,radius,theta,phi,smooth);
 }
 function button(text,action,style='primary',ico='arrow',extra=''){return `<button type="button" class="button ${style}" data-action="${action}" ${extra}>${escapeHTML(text)}${ico?icon(ico):''}</button>`}
 function partsList(open=false){return `<details class="part-details" ${open?'open':''}><summary>Inspecionar os 8 componentes ${icon('list')}</summary><div class="part-grid">${P.map(p=>`<button class="part-button ${p.id===state.selected?'selected':''}" data-part="${p.id}" id="part-${p.id}" aria-label="Selecionar ${escapeHTML(p.name)}${state.visited.includes(p.id)?', já examinado':''}" aria-pressed="${p.id===state.selected}"><span class="part-number">${String(p.n).padStart(2,'0')}</span><span>${escapeHTML(p.name)}</span>${state.visited.includes(p.id)?'<span class="done-dot" aria-hidden="true"></span>':''}</button>`).join('')}</div></details>`}
 function progress(label,n,total,caption=''){return `<div class="progress-box"><div class="progress-line"><span>${label}</span><strong>${n} de ${total}</strong></div><div class="progress-track" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${n}"><div class="progress-fill" style="width:${n/total*100}%"></div></div>${caption?`<div class="progress-caption">${caption}</div>`:''}</div>`}
 function selectedCard(){if(!state.selected)return `<div class="tip-box">${icon('eye')}<span>Selecione uma peça na cena ou abra a lista para examinar seus detalhes.</span></div>`;const p=part(state.selected),worn=state.phase!=='new',chosen=category(state.placements[p.id]);return `<section class="part-summary" aria-label="Componente selecionado"><div class="part-meta"><span class="part-number">${String(p.n).padStart(2,'0')}</span><h2>${escapeHTML(p.name)}</h2></div><p>${escapeHTML(worn?p.observation:p.newText)}</p><button class="text-button" data-inspect="${p.id}">${icon('zoom')}Examinar em detalhe</button>${state.phase==='triage'?`<p class="small">${chosen?`Destino escolhido: <b>${chosen.name}</b>`:'Escolha um destino para esta peça:'}</p><div class="category-picks">${cats.map(c=>`<button type="button" class="category-pick" data-destination="${c.id}" style="--cat:${c.color};--catLight:${c.light}" aria-label="Encaminhar ${escapeHTML(p.name)} para ${c.name}" aria-pressed="${state.placements[p.id]===c.id}">${icon(c.icon)}${c.name}</button>`).join('')}</div>${chosen?'<button class="text-button" data-action="returnPiece">Retirar da bandeja</button>':''}`:''}</section>`}
 function renderSteps(){const i=phaseIndex();$('#steps').innerHTML=C.phases.map((p,n)=>`<button class="step ${n===i?'active':''} ${n<i?'done':''}" data-phase="${p.id}" aria-label="Etapa ${n+1}: ${p.label}" ${n===i?'aria-current="step"':''} ${n>state.highest||p.id==='results'&&!state.results?'disabled':''}><span class="step-n">${n<i?icon('check'):n+1}</span><span class="step-name">${p.label}</span></button>`).join('')}
 function renderSide(){const active=document.activeElement,activeId=active?.id,activeDest=active?.dataset?.destination,open=$('.part-details')?.open||false,scroller=$('.panel-scroll'),scroll=scroller.scrollTop;const ey=$('#eyebrow'),title=$('#screenTitle'),intro=$('#screenIntro'),content=$('#sideContent'),actions=$('#panelActions');
  if(state.focus){const p=part(state.focus),isNew=state.phase==='new';ey.textContent='Inspeção do componente';title.textContent=p.name;intro.textContent=p.material;content.innerHTML=`<span class="inspection-status">${isNew?'Antes · nova':'Depois · após o uso'}</span><p class="inspection-detail">${escapeHTML(isNew?p.newText:p.observation)}</p><div class="tip-box">${icon('eye')}<span>${escapeHTML(isNew?'Observe a superfície, os encaixes e a integridade do componente.':p.detail)}</span></div><button class="button secondary inspection-test" data-action="test">${icon('eye')}${escapeHTML(isNew&&!(['armL','piston','caster'].includes(p.id))?'Examinar o componente':p.test)}</button><p class="phase-note">Use os controles de giro e aproximação. Esta inspeção é exclusivamente virtual.</p>`;actions.innerHTML=button('Voltar à cena','closeInspect','primary','back');return}
  if(state.phase==='welcome'){ey.textContent='Design e Sustentabilidade';title.innerHTML='Pequenas escolhas,<br><em>grandes impactos.</em>';intro.textContent='Uma cadeira. Oito componentes. Descubra o que pode ganhar um novo ciclo através das suas decisões.';content.innerHTML=`<div class="hero-features">${[['eye','Observe'],['zoom','Analise'],['reuse','Decida'],['leaf','Transforme']].map(([i,t])=>`<div class="hero-feature"><span>${icon(i)}</span>${t}</div>`).join('')}</div><p class="hero-note">O uso deixa marcas.<br>O design abre possibilidades.</p>`;actions.innerHTML=`<form id="entryForm" class="welcome-entry"><div class="field"><label for="playerInput">Como podemos chamar você? <span class="muted">(opcional)</span></label><input id="playerInput" name="apelido" maxlength="42" placeholder="Seu apelido" autocomplete="off" value="${escapeHTML(state.player)}"><small>Não é preciso informar seu nome. A atividade não envia suas escolhas a um servidor.</small></div><button type="submit" class="button primary full" id="startButton">Iniciar missão${icon('arrow')}</button>${saved?'<button type="button" class="text-button restore-button" data-action="restore">Continuar sessão anterior</button>':''}</form>`;$('#entryForm').onsubmit=e=>{e.preventDefault();state.player=safeName($('#playerInput').value)||'Participante';state.started=Date.now();state.previous='welcome';go('story')};return}
  if(state.phase==='story'){ey.textContent='A história do produto';title.innerHTML='Antes do descarte,<br>havia uma cadeira.';intro.textContent='Ela foi retirada de uma empresa sem uma avaliação de seus componentes. Mas sua história não precisa terminar aí.';content.innerHTML=`<div class="story-list">${[['Produto novo','Completa e funcional, pronta para acompanhar a rotina.'],['Uso contínuo','A passagem do tempo deixa marcas no produto.'],['Manutenção adiada','Rasgos, oxidação e falhas não foram tratados.'],['Retirada de uso','Várias peças ainda poderiam ser aproveitadas.']].map(([h,t],i)=>`<div class="story-row"><span>${i+1}</span><div><b>${h}</b><p>${t}</p></div></div>`).join('')}</div><button class="text-button" data-action="hearStory">${icon('sound')}Ouvir a história</button>`;actions.innerHTML=button('Conhecer a cadeira','startNew')+`<button class="text-button" data-action="storyBack">${icon('back')}Voltar</button>`;return}
  const phase=C.phases.find(p=>p.id===state.phase);if(!phase)return;ey.textContent=`Etapa ${phaseIndex()+1} de 5 · ${phase.subtitle}`;title.textContent=phase.title;intro.textContent=phase.text;
  if(state.phase==='new'){content.innerHTML=selectedCard()+partsList(open||!R)+`<p class="phase-note">Este é o estado de referência. Compare superfícies, encaixes e função antes de observar o desgaste.</p>`;actions.innerHTML=button(phase.next,'next')}
  if(state.phase==='worn'){content.innerHTML=progress('Componentes consultados',state.visited.length,8)+selectedCard()+partsList(open||!R);actions.innerHTML=button(phase.next,'next')+`<button class="text-button" data-action="previous">${icon('back')}Comparar com a cadeira nova</button>`}
  if(state.phase==='disassembly'){content.innerHTML=`<div class="field"><label for="explosionRange">Separação dos componentes</label><input id="explosionRange" type="range" min="0" max="100" value="${state.explode}" aria-label="Grau de separação dos componentes" style="accent-color:var(--green);width:100%;min-height:35px"><small>Deslize para montar e separar virtualmente.</small></div>`+selectedCard()+partsList(open||!R);actions.innerHTML=button(phase.next,'next')+`<button class="text-button" data-action="previous">${icon('back')}Voltar à inspeção</button>`;$('#explosionRange').oninput=e=>{stopAnimations();state.explode=Number(e.target.value);applyExplosion(state.explode/100);persist();request()}}
  if(state.phase==='triage'){const n=Object.keys(state.placements).length;content.innerHTML=progress('Peças encaminhadas',n,8,n<8?'Você pode rever qualquer destino antes de conferir.':'Tudo encaminhado. Confira e reflita sobre suas decisões.')+selectedCard()+partsList(open||!R)+`${state.hintUsed.length?`<details class="hint-history"><summary>Dicas já consultadas (${state.hintUsed.length})</summary>${state.hintUsed.map(id=>`<p><b>${escapeHTML(part(id).name)}:</b> ${escapeHTML(part(id).hint)}</p>`).join('')}</details>`:''}`;actions.innerHTML=`<button class="hint-button" data-action="hint" ${state.hints===0?'disabled':''}>${icon('bulb')}${state.hints?`Usar dica · ${state.hints} restante${state.hints===1?'':'s'}`:'Dicas utilizadas'}</button>`+button(phase.next,'check','primary','check',n<8?'disabled aria-describedby="screenIntro"':'')+`<button class="text-button" data-action="previous">${icon('back')}Voltar aos componentes</button>`}
  scroller.scrollTop=scroll;const replacement=activeId?document.getElementById(activeId):activeDest?$(`[data-destination="${activeDest}"]`):null;replacement?.focus({preventScroll:true});
 }
 function renderLabels(){
  const allowed=!!world&&['new','worn','disassembly','triage'].includes(state.phase)&&!state.focus;
  $('#labels').innerHTML=allowed?P.map(p=>`<button type="button" class="object-label ${p.id===state.selected?'selected':''}" data-part="${p.id}" data-object="${p.id}" aria-label="Selecionar ${escapeHTML(p.name)}"><span class="object-n">${String(p.n).padStart(2,'0')}</span>${state.labels?`<span>${escapeHTML(p.name)}</span>`:''}</button>`).join(''):'';
  $('#binLabels').innerHTML=state.phase==='triage'&&!state.focus?cats.map(c=>`<button type="button" class="bin-label" data-bin="${c.id}" style="--cat:${c.color};--catLight:${c.light}" aria-label="${state.selected?'Encaminhar peça selecionada para':'Sobre a categoria'} ${c.name}" title="${c.name}: ${c.summary}">${icon(c.icon)}<span>${c.name}</span><span class="bin-count">${Object.values(state.placements).filter(x=>x===c.id).length||''}</span></button>`).join(''):'';
  const quick=$('#quickInspect');quick.classList.toggle('hidden',!state.selected||!!state.focus||!allowed);quick.innerHTML=state.selected?icon('zoom')+'Examinar '+escapeHTML(part(state.selected).name):'';
  request();
 }
 function updateLabels(){
  if(!R||!world)return;const vw=R.width,vh=R.height,compact=vw<850;
  $('#binLabels').classList.toggle('compact-bins',compact);$('#viewport').classList.toggle('compact-scene',compact);
  const occupied=[];
  $$('[data-object]').sort((a,b)=>Number(b.dataset.object===state.selected)-Number(a.dataset.object===state.selected)).forEach(el=>{
   const id=el.dataset.object,q=R.project(world.atAnchor(id)),assembled=['new','worn'].includes(state.phase);
   const show=q.visible&&q.x>12&&q.x<vw-12&&q.y>57&&q.y<vh-65&&!(assembled&&id==='screws')&&(!state.placements[id]||state.selected===id||state.phase!=='triage');
   el.style.display=show?'flex':'none';if(!show)return;
   const ew=Math.min(el.offsetWidth||38,vw-28),eh=el.offsetHeight||32;
   let x=Math.max(ew/2+10,Math.min(vw-ew/2-10,q.x)),y=q.y;
   for(let n=0;n<5;n++){const rect={l:x-ew/2-3,r:x+ew/2+3,t:y-eh-3,b:y+3};if(!occupied.some(o=>rect.l<o.r&&rect.r>o.l&&rect.t<o.b&&rect.b>o.t)){occupied.push(rect);break;}y=Math.max(compact&&state.phase==='triage'?148:92,y-eh-8);}
   el.style.left=x+'px';el.style.top=y+'px';
  });
  $$('[data-bin]').forEach(el=>{if(compact||!world){el.style.display='flex';el.style.left='';el.style.top='';return;}
   const q=R.project(world.bins[el.dataset.bin].label);el.style.display=q.visible?'flex':'none';const w=el.offsetWidth||110;el.style.left=Math.max(w/2+8,Math.min(vw-w/2-8,q.x))+'px';el.style.top=Math.max(93,Math.min(vh-94,q.y))+'px';});
 }
 function renderChrome(){document.body.dataset.phase=state.phase;document.body.classList.toggle('inspecting',!!state.focus);$('#workspace').classList.toggle('hidden',state.phase==='results');$('#resultsView').classList.toggle('hidden',state.phase!=='results');$('#closeInspection').classList.toggle('hidden',!state.focus);$('#viewportTop').classList.toggle('hidden',!!state.focus);$('#viewCaption').textContent=({welcome:'Explore em 3D · arraste para girar',story:'A mesma cadeira, uma nova perspectiva',new:'Antes · produto novo',worn:'Depois · sinais de uso',disassembly:'Separação virtual · desgaste preservado',triage:'Bancada de triagem · 8 componentes'})[state.phase]||'';$('#labelButton').innerHTML=icon('list')+(state.labels?'Nomes visíveis':'Mostrar nomes');$('#labelButton').setAttribute('aria-pressed',String(state.labels));$('#labelButton').classList.toggle('hidden',['welcome','story','results'].includes(state.phase));$('#gestureHint').innerHTML=icon('mouse')+(state.focus?'Arraste para girar · aproxime para observar':state.phase==='triage'?'Selecione uma peça ou arraste até uma bandeja':'Arraste para girar · clique para examinar');$('.scene-signature').classList.toggle('hidden',!!state.focus||['triage','disassembly'].includes(state.phase));renderSteps();renderSide();renderLabels();}
 function applyExplosion(t){if(!world)return;P.forEach(p=>{const a=world.assembled[p.id],b=world.exploded[p.id],g=world.parts[p.id];g.p=a.p.map((x,i)=>x+(b.p[i]-x)*t);g.r=a.r.map((x,i)=>x+(b.r[i]-x)*t)})}
 function go(phase,{animate=false,keepSelected=false,restoreExplosion=false}={}){
  if(!['welcome','story',...C.phases.map(p=>p.id)].includes(phase))return;
  if(phase==='results'&&!state.results){toast('Confira uma triagem completa para abrir os resultados.');return;}
  stopAnimations();cancelGesture();window.speechSynthesis?.cancel();
  if(state.focus)world?.resetInspector();state.focus=null;returnCamera=null;
  panelScroll[state.phase]=$('.panel-scroll').scrollTop;state.phase=phase;
  if(!keepSelected)state.selected=null;if(R)R.highlight=state.selected?part(state.selected).n:0;
  state.highest=Math.max(state.highest,phaseIndex());world?.stage(phase);
  if(phase==='triage'||phase==='results')world?.restorePlacements(state.placements);
  if(phase==='disassembly'){if(!restoreExplosion)state.explode=animate?0:100;applyExplosion(state.explode/100)}
  clearTimeout(noticeTimer);$('#sceneNotice').classList.add('hidden');renderChrome();$('.panel-scroll').scrollTop=0;
  defaultView(false);
  if(phase==='disassembly'&&animate)tween(1400,t=>{state.explode=Math.round(t*100);const input=$('#explosionRange');if(input)input.value=state.explode;applyExplosion(t)},()=>{persist();announce('A cadeira foi separada virtualmente em oito componentes.');});
  if(phase==='results')renderResults();persist();request();
  const focus=phase==='results'?$('#resultsTitle'):$('#screenTitle');focus?.focus({preventScroll:true});
  if(innerWidth<960)window.scrollTo({top:0,behavior:state.reduced?'instant':'smooth'});
  announce(phase==='story'?'A história do produto':C.phases.find(p=>p.id===phase)?.title||'Início da Missão Circular');
 }
 function selectPart(id){
  if(!validPart(id)||state.focus||!['new','worn','disassembly','triage'].includes(state.phase))return;
  state.selected=id;if(state.phase!=='new'&&!state.visited.includes(id))state.visited.push(id);
  if(R)R.highlight=part(id).n;renderSide();renderLabels();persist();
  const summary=$('.part-summary');if(summary){const sc=$('.panel-scroll');if(sc.scrollHeight>sc.clientHeight)sc.scrollTop=Math.max(0,summary.offsetTop-sc.offsetTop-15);}
  announce(`${part(id).name}. ${state.phase==='new'?part(id).newText:part(id).observation}`);request();
 }
 function inspectPart(id){
  if(!validPart(id)||!['new','worn','disassembly','triage'].includes(state.phase))return;
  stopAnimations();cancelGesture();lastFocusBeforeInspect=document.activeElement;
  if(!state.focus)returnCamera={target:[...orbit.target],radius:orbit.radius,theta:orbit.theta,phi:orbit.phi,min:orbit.min,max:orbit.max};
  state.selected=id;state.focus=id;if(state.phase!=='new'&&!state.visited.includes(id))state.visited.push(id);
  world?.inspect(id);if(R)R.highlight=0;renderChrome();$('.panel-scroll').scrollTop=0;defaultView(false);persist();request();
  announce(`Inspeção de ${part(id).name}. ${state.phase==='new'?part(id).newText:part(id).observation}`);
  $('#screenTitle').focus({preventScroll:true});if(innerWidth<700)window.scrollTo({top:0,behavior:state.reduced?'instant':'smooth'});
 }
 function closeInspect(){
  if(!state.focus)return;stopAnimations();world?.resetInspector();state.focus=null;
  world?.stage(state.phase);if(state.phase==='triage')world?.restorePlacements(state.placements);
  if(state.phase==='disassembly')applyExplosion(state.explode/100);
  if(R)R.highlight=part(state.selected)?.n||0;renderChrome();
  if(returnCamera){Object.assign(orbit,returnCamera);returnCamera=null;}else defaultView(false);
  const el=document.getElementById('part-'+state.selected)||$(`[data-inspect="${state.selected}"]`);el?.focus({preventScroll:true});persist();request();
 }
 function assign(id,dest){
  if(state.phase!=='triage'||state.focus||!validPart(id)||!category(dest))return;
  stopAnimations();const old=state.placements[id];if(old===dest){world?.restorePlacements(state.placements);request();toast(`${part(id).name} já está nesta categoria.`);return;}
  state.placements[id]=dest;state.selected=id;if(!state.visited.includes(id))state.visited.push(id);
  world?.restorePlacements(state.placements);if(R)R.highlight=part(id).n;state.results=null;
  renderSide();renderLabels();renderSteps();persist();sound();
  announce(`${part(id).name} encaminhado para ${category(dest).name}. ${Object.keys(state.placements).length} de 8 componentes encaminhados. A conferência ocorre no final.`);request();
 }
 function returnPiece(){
  const id=state.selected;if(!id||state.phase!=='triage'||!state.placements[id])return;
  stopAnimations();delete state.placements[id];state.results=null;world?.restorePlacements(state.placements);
  renderSide();renderLabels();renderSteps();persist();request();announce(`${part(id).name} voltou à bancada.`);
 }
 function useHint(){
  if(state.phase!=='triage')return;
  const id=state.selected||P.find(p=>!state.placements[p.id]&&!state.hintUsed.includes(p.id))?.id||P.find(p=>!state.hintUsed.includes(p.id))?.id;
  if(!id)return;
  if(state.hintUsed.includes(id)){notice(`${part(id).name}: ${part(id).hint}`);return;}
  if(!state.hints)return;
  state.selected=id;state.hints--;state.hintUsed.push(id);state.hintText=`${part(id).name}: ${part(id).hint}`;
  renderSide();renderLabels();persist();notice(state.hintText);
 }
 function computeResult(){const entries=P.map(p=>({id:p.id,peca:p.name,escolha:state.placements[p.id],esperado:p.destination,coerente:state.placements[p.id]===p.destination,criterio:p.reason,ajuda:state.hintUsed.includes(p.id)})),hits=entries.filter(e=>e.coerente).length,counts=Object.fromEntries(cats.map(c=>[c.id,entries.filter(e=>e.escolha===c.id).length]));state.attempts++;const data={versao:C.version,jogoId:C.gameId,nomeExibido:state.player||'Participante',pontuacao:hits*10,percentual:Math.round(hits/8*100),acertos:hits,erros:8-hits,acertosSemAjuda:entries.filter(e=>e.coerente&&!e.ajuda).length,ajudasUtilizadas:2-state.hints,tentativa:state.attempts,tempoTotal:Math.max(0,Math.round((Date.now()-(state.started||Date.now()))/1000)),categorias:counts,componentes:entries,data:new Date().toISOString(),natureza:'Simulação didática; sem estimativa de impacto ambiental real.'};return data}
 function check(){
  if(state.phase!=='triage')return;
  if(P.some(p=>!category(state.placements[p.id]))){notice('Encaminhe os oito componentes antes de conferir.');return;}
  state.results=computeResult();go('results');sound('complete');window.dispatchEvent(new CustomEvent('missao-circular:resultado',{detail:structuredClone(state.results)}));
 }
 function renderResults(){const res=state.results;if(!res)return;const hits=res.acertos;$('#resultsView').innerHTML=`<header class="results-head"><div><div class="eyebrow">Etapa 5 de 5 · Reflita sobre as escolhas</div><h1 id="resultsTitle" tabindex="-1">Sua triagem,<br><em>explicada.</em></h1><p>${escapeHTML(state.player)}, ${hits===8?'todos os encaminhamentos estão alinhados aos critérios deste caso.':'compare os encaminhamentos e retome as peças que merecem uma nova análise.'}</p></div><div class="score-orbit"><strong>${hits}<span style="font-size:17px">/8</span></strong><span>nos critérios do caso</span></div></header><div class="result-categories" aria-label="Quantidades de peças por destino escolhido">${cats.map(c=>`<div class="result-category" style="--cat:${c.color};--catLight:${c.light}">${icon(c.icon)}<strong>${res.categorias[c.id]}</strong><span>${c.name}</span></div>`).join('')}</div><div class="result-note">${icon('leaf')}<span><b>As quantidades acima representam suas escolhas.</b> O desgaste não torna todas as peças iguais: cada encaminhamento depende da condição do componente e das possibilidades previstas no cenário.</span></div><section class="result-decisions" aria-label="Devolutiva dos oito componentes">${res.componentes.map(e=>`<article class="result-row"><div><h3>${escapeHTML(e.peca)}</h3><small>Sua escolha: ${category(e.escolha)?.name||'Sem destino'}</small></div><div class="result-state ${e.coerente?'':'review'}">${icon(e.coerente?'check':'info')}${e.coerente?'Coerente com o caso':'Retome a análise'}</div><p>${!e.coerente?`<b>Critério esperado: ${category(e.esperado).name}.</b> `:''}${escapeHTML(e.criterio)}</p></article>`).join('')}</section><div class="result-footer"><div>${button('Rever minhas escolhas','review','secondary','back')}${button('Guardar resultado','download','secondary','download')}</div>${button('Concluir experiência','award','primary','check')}</div><p class="scope-note">Pontuação: ${res.pontuacao} de 80. Dicas utilizadas: ${res.ajudasUtilizadas} de 2. Tentativa de conferência: ${res.tentativa}. A pontuação registra suas respostas neste cenário didático; não estima massa ou emissões evitadas. As categorias seguem o caso didático da versão original.</p>`;$('#resultsTitle').focus({preventScroll:true})}
 function downloadResult(){if(!state.results)return;const blob=new Blob([JSON.stringify(state.results,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='missao-circular-meu-resultado.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)}
 function award(){const res=state.results;if(!res)return;let level='Observador sustentável';if(res.percentual>=90)level='Designer circular';else if(res.percentual>=75)level='Estrategista do ecodesign';else if(res.percentual>=55)level='Analista de ciclo de vida';$('#awardPlayer').textContent=state.player;$('#awardScore').textContent=`${res.pontuacao} de 80 pontos · ${res.percentual}%` ;$('#awardLevel').textContent=level;$('#awardDialog').showModal()}
 function restart(){
  stopAnimations();cancelGesture();window.speechSynthesis?.cancel();
  ['awardDialog','confirmDialog'].forEach(id=>$('#'+id).close());
  Object.assign(state,{player:'',phase:'welcome',previous:'welcome',selected:null,focus:null,visited:[],placements:{},hints:2,hintUsed:[],hintText:'',highest:-1,attempts:0,results:null,started:0,explode:100});
  saved=null;returnCamera=null;try{sessionStorage.removeItem(storageKey)}catch{}go('welcome');
 }
 function restore(){
  if(!saved)return;const array=x=>Array.isArray(x)?x:[];const num=(x,a,b,d)=>Number.isFinite(Number(x))?Math.min(b,Math.max(a,Number(x))):d;
  state.player=safeName(saved.player)||'Participante';state.visited=[...new Set(array(saved.visited).filter(validPart))];state.placements={};
  if(saved.placements&&typeof saved.placements==='object')Object.entries(saved.placements).forEach(([id,c])=>{if(validPart(id)&&category(c))state.placements[id]=c;});
  state.hintUsed=[...new Set(array(saved.hintUsed).filter(validPart))].slice(0,2);state.hints=2-state.hintUsed.length;
  state.hintText=state.hintUsed.length?`${part(state.hintUsed.at(-1)).name}: ${part(state.hintUsed.at(-1)).hint}`:'';
  state.highest=num(saved.highest,0,4,0);state.attempts=num(saved.attempts,0,10000,0);state.started=num(saved.started,Date.now()-86400000*30,Date.now(),Date.now());state.explode=num(saved.explode,0,100,100);
  state.previous=['welcome','new','worn','disassembly','triage','results'].includes(saved.previous)?saved.previous:'new';
  const settings=saved.settings||{};['sound','speech','labels','contrast','reduced'].forEach(k=>{if(typeof settings[k]==='boolean')state[k]=settings[k]});
  document.body.classList.toggle('high-contrast',state.contrast);document.body.classList.toggle('reduce-motion',state.reduced);
  $('#contrastSetting').checked=state.contrast;$('#speechSetting').checked=state.speech;$('#motionSetting').checked=state.reduced;$('#labelsSetting').checked=state.labels;syncSoundButton();
  const phase=['story','new','worn','disassembly','triage','results'].includes(saved.phase)?saved.phase:'new';
  if(phase==='results'&&P.every(p=>category(state.placements[p.id]))){const attempts=state.attempts;state.results=computeResult();state.attempts=attempts;state.results.tentativa=attempts||1;go('results');}
  else go(phase==='results'?'triage':phase,{restoreExplosion:true});
  toast('Sessão recuperada neste navegador.');
 }
 function testPart(){if(!state.focus||testing)return;const id=state.focus,p=part(id);if(!world){notice(state.phase==='new'?p.newText:p.observation);return}if(id==='back'){setCamera([...orbit.target],orbit.radius,orbit.theta+Math.PI,orbit.phi,true);notice(state.phase==='new'?p.newText:p.detail);return}testing=true;tween(1500,(v,t)=>world.testAnimation(id,t),()=>{testing=false;world.testAnimation(id,1);notice(state.phase==='new'?p.newText:p.observation)})}
 function next(){const i=phaseIndex();if(i<0)return;const p=C.phases[i+1];if(p)go(p.id,{animate:p.id==='disassembly'})}
 function action(a){switch(a){case 'next':next();break;case 'previous':{const p=C.phases[Math.max(0,phaseIndex()-1)];go(p.id);break}case 'startNew':go('new');break;case 'storyBack':go(state.previous||'welcome');break;case 'hearStory':say(C.story);break;case 'closeInspect':closeInspect();break;case 'returnPiece':returnPiece();break;case 'hint':useHint();break;case 'check':check();break;case 'review':go('triage',{keepSelected:true});break;case 'download':downloadResult();break;case 'award':award();break;case 'restore':restore();break;case 'test':testPart();break;case 'openSelected':if(state.selected)inspectPart(state.selected);break}}
 function cameraControl(dir){stopAnimations();switch(dir){case'left':orbit.theta-=.28;break;case'right':orbit.theta+=.28;break;case'in':orbit.radius=Math.max(orbit.min,orbit.radius*.88);break;case'out':orbit.radius=Math.min(orbit.max,orbit.radius*1.12);break;case'reset':defaultView(false);break}request()}
 document.addEventListener('click',e=>{const target=e.target.closest('button');if(!target)return;if(target.dataset.action){action(target.dataset.action);return}if(target.dataset.part){selectPart(target.dataset.part);return}if(target.dataset.inspect){inspectPart(target.dataset.inspect);return}if(target.dataset.destination){assign(state.selected,target.dataset.destination);return}if(target.dataset.bin){if(state.selected)assign(state.selected,target.dataset.bin);else showCategory(target.dataset.bin);return}if(target.dataset.camera){cameraControl(target.dataset.camera);return}if(target.dataset.phase){if(C.phases.findIndex(p=>p.id===target.dataset.phase)<=state.highest)go(target.dataset.phase);return}if(target.dataset.close)$('#'+target.dataset.close).close()});
 $('#brand').innerHTML=logo()+'<span class="brand-name">Missão<span>Circular</span><small>Design e Sustentabilidade</small></span>';
 $('#brand').onclick=e=>{e.preventDefault();if(state.phase!=='welcome')$('#confirmDialog').showModal()};
 $('#storyButton').innerHTML=icon('book');$('#soundButton').innerHTML=icon('mute');$('#accessButton').innerHTML=icon('access');$('#fullButton').innerHTML=icon('expand');$('#awardSymbol').innerHTML=icon('star');$$('[data-close].icon-button').forEach(b=>b.innerHTML=icon('close'));$('#closeInspection').innerHTML=icon('back')+'Voltar à cena';
 $$('[data-camera]').forEach(b=>{const x=b.dataset.camera;b.innerHTML=icon(x==='left'||x==='right'?'rotate':x==='in'?'plus':x==='out'?'minus':'expand');if(x==='left')b.firstChild.style.transform='scaleX(-1)'});
 $('#storyButton').onclick=()=>{if(state.phase==='story')return;state.previous=state.phase;go('story')};
 function syncSoundButton(){const b=$('#soundButton');b.setAttribute('aria-pressed',String(state.sound));b.setAttribute('aria-label',state.sound?'Desativar som':'Ativar som');b.title=state.sound?'Som ligado':'Som desligado';b.innerHTML=icon(state.sound?'sound':'mute')}
 $('#soundButton').onclick=()=>{state.sound=!state.sound;syncSoundButton();if(state.sound)sound();announce(state.sound?'Som ligado.':'Som desligado.');persist()};
 $('#accessButton').onclick=()=>$('#accessDialog').showModal();$('#speechSetting').onchange=e=>{state.speech=e.target.checked;if(state.speech){if(!('speechSynthesis'in window))toast('A leitura em voz alta não está disponível neste navegador. As descrições continuam em texto.');else say(`${$('#screenTitle').textContent}. ${$('#screenIntro').textContent}`)}else window.speechSynthesis?.cancel();persist()};
 $('#contrastSetting').onchange=e=>{state.contrast=e.target.checked;document.body.classList.toggle('high-contrast',state.contrast);persist()};
 $('#motionSetting').checked=state.reduced;$('#motionSetting').onchange=e=>{state.reduced=e.target.checked;document.body.classList.toggle('reduce-motion',state.reduced);if(state.reduced){animations.forEach(a=>{a.fn(1,1);a.done?.()});stopAnimations();request()}persist()};
 function toggleLabels(v){state.labels=v;$('#labelsSetting').checked=v;renderChrome();persist()};$('#labelsSetting').onchange=e=>toggleLabels(e.target.checked);$('#labelButton').onclick=()=>toggleLabels(!state.labels);$('#closeInspection').onclick=closeInspect;
 $('#fullButton').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast('Tela cheia não está disponível neste navegador.')}catch{toast('O navegador não permitiu abrir tela cheia.')}};
 $('#confirmRestart').onclick=restart;$('#replayButton').onclick=()=>{$('#awardDialog').close();$('#confirmDialog').showModal()};$('#awardDownload').onclick=downloadResult;
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.focus&&!$('dialog[open]'))closeInspect()});
 $('#scene').addEventListener('keydown',e=>{const map={ArrowLeft:'left',ArrowRight:'right','+':'in','=':'in','-':'out',Home:'reset'};if(map[e.key]){e.preventDefault();cameraControl(map[e.key])}else if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();orbit.phi=Math.max(.4,Math.min(1.48,orbit.phi+(e.key==='ArrowUp'?-.12:.12)));request()}});
 // Arraste, seleção e zoom usam coordenadas da cena; rótulos também podem ser arrastados.
 let gesture=null,overBin=null,pinch=null;const pointers=new Map();let suppressClickUntil=0;
 const local=e=>{const r=$('#scene').getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]};
 function binAt(x,y){
  if(!R||!world||state.phase!=='triage'||state.focus)return null;const vp=$('#scene').getBoundingClientRect();
  for(const el of $$('[data-bin]')){const r=el.getBoundingClientRect();if(el.offsetParent!==null&&x+vp.left>=r.left-6&&x+vp.left<=r.right+6&&y+vp.top>=r.top-6&&y+vp.top<=r.bottom+6)return el.dataset.bin;}
  let best=null,dist=Infinity;for(const cat of cats){const bin=world.bins[cat.id],poly=[];for(const [xx,yy,zz]of[[-1.26,0,-.9],[1.26,0,-.9],[1.26,0,.9],[-1.26,0,.9]])poly.push(R.project([bin.center[0]+xx,2.82+yy,bin.center[2]+zz]));
   const minX=Math.min(...poly.map(p=>p.x))-8,maxX=Math.max(...poly.map(p=>p.x))+8,minY=Math.min(...poly.map(p=>p.y))-45,maxY=Math.max(...poly.map(p=>p.y))+18;
   if(x>=minX&&x<=maxX&&y>=minY&&y<=maxY){const q=R.project(bin.center),d=Math.hypot(x-q.x,y-q.y);if(d<dist){best=cat.id;dist=d;}}
  }return best;
 }
 function cancelGesture(){
  if(gesture?.piece&&world){const obj=world.parts[gesture.piece];if(gesture.before){obj.p=[...gesture.before.p];obj.r=[...gesture.before.r];obj.s=[...gesture.before.s]}}
  gesture=null;pinch=null;pointers.clear();overBin=null;$$('[data-bin]').forEach(b=>b.classList.remove('over'));$('#viewport').classList.remove('is-dragging');request();
 }
 function projectedPlane(x,y,center){const V=MC3D.V,f=V.norm(V.sub(R.target,R.eye)),right=V.norm(V.cross(f,[0,1,0])),up=V.cross(right,f);const distance=V.dot(V.sub(center,R.eye),f),unit=2*distance*Math.tan(R.fov/2)/R.height;return V.add(center,V.add(V.mul(right,x*unit),V.mul(up,-y*unit)));}
 $('#viewport').addEventListener('pointerdown',e=>{
  if(!R||!world||R.lost||e.button>0||!['CANVAS'].includes(e.target.tagName)&&!e.target.closest('[data-object]'))return;
  stopAnimations();const point=local(e);pointers.set(e.pointerId,point);
  if(pointers.size===2){if(gesture?.piece&&gesture.before){const o=world.parts[gesture.piece];Object.assign(o,{p:gesture.before.p,r:gesture.before.r,s:gesture.before.s});}gesture=null;const [a,b]=[...pointers.values()];pinch={distance:Math.hypot(a[0]-b[0],a[1]-b[1]),radius:orbit.radius};$('#scene').setPointerCapture(e.pointerId);return;}
  const label=e.target.closest('[data-object]'),pick=label?part(label.dataset.object)?.n:R.pick(...point),p=P.find(p=>p.n===pick);
  gesture={id:e.pointerId,start:point,last:point,piece:state.phase==='triage'&&!state.focus&&p?p.id:null,pick:p?.id,drag:false,moved:false};
  if(gesture.piece){const o=world.parts[p.id];gesture.before={p:[...o.p],r:[...o.r],s:[...o.s]};gesture.anchor=R.worldPoint(o);selectPart(p.id);}
  $('#scene').setPointerCapture(e.pointerId);
 });
 $('#viewport').addEventListener('pointermove',e=>{
  if(!R||!world||R.lost)return;const [x,y]=local(e);
  if(pointers.has(e.pointerId))pointers.set(e.pointerId,[x,y]);
  if(pinch&&pointers.size===2){const [a,b]=[...pointers.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]);orbit.radius=Math.max(orbit.min,Math.min(orbit.max,pinch.radius*pinch.distance/Math.max(8,d)));request();return;}
  if(!gesture||gesture.id!==e.pointerId)return;const dx=x-gesture.last[0],dy=y-gesture.last[1];
  if(Math.hypot(x-gesture.start[0],y-gesture.start[1])>8)gesture.moved=true;
  if(gesture.piece&&gesture.moved){gesture.drag=true;$('#viewport').classList.add('is-dragging');const o=world.parts[gesture.piece],p=projectedPlane(x-gesture.start[0],y-gesture.start[1],gesture.before.p);o.p=p;
   overBin=binAt(x,y);$$('[data-bin]').forEach(b=>b.classList.toggle('over',b.dataset.bin===overBin));
  }else if(gesture.moved){orbit.theta-=dx*.008;orbit.phi=Math.max(.40,Math.min(1.47,orbit.phi+dy*.006));}
  gesture.last=[x,y];request();
 });
 function finishGesture(e,cancel=false){
  pointers.delete(e.pointerId);if(pinch){if(pointers.size<2)pinch=null;gesture=null;request();return;}
  if(!gesture||e.pointerId!==gesture.id)return;const g=gesture;gesture=null;$('#viewport').classList.remove('is-dragging');$$('[data-bin]').forEach(b=>b.classList.remove('over'));
  if(g.moved)suppressClickUntil=performance.now()+350;
  if(g.drag&&g.piece){const dest=cancel?null:binAt(...local(e));if(dest)assign(g.piece,dest);else{const obj=world.parts[g.piece];obj.p=[...g.before.p];obj.r=[...g.before.r];obj.s=[...g.before.s];if(!cancel)notice('Solte sobre uma bandeja colorida ou escolha o destino no painel. A posição anterior foi mantida.');}}
  else if(!cancel&&!g.moved&&g.pick&&!state.focus&&['new','worn','disassembly'].includes(state.phase))selectPart(g.pick);
  try{$('#scene').releasePointerCapture(e.pointerId)}catch{}overBin=null;request();
 }
 $('#viewport').addEventListener('pointerup',e=>finishGesture(e));$('#viewport').addEventListener('pointercancel',e=>finishGesture(e,true));
 $('#viewport').addEventListener('click',e=>{if(performance.now()<suppressClickUntil){e.preventDefault();e.stopPropagation();}},true);
 $('#viewport').addEventListener('dblclick',e=>{if(!R||state.focus||!e.target.closest('canvas,[data-object]'))return;const label=e.target.closest('[data-object]'),n=label?part(label.dataset.object)?.n:R.pick(...local(e));const p=P.find(p=>p.n===n);if(p&&['new','worn','disassembly','triage'].includes(state.phase))inspectPart(p.id);});
 $('#viewport').addEventListener('wheel',e=>{if(!R||e.target.tagName!=='CANVAS')return;e.preventDefault();stopAnimations();orbit.radius=Math.max(orbit.min,Math.min(orbit.max,orbit.radius*Math.exp(Math.max(-100,Math.min(100,e.deltaY))*.0013)));request();},{passive:false});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&gesture){cancelGesture();announce('Movimento cancelado. A peça voltou à posição anterior.');}});
 new ResizeObserver(entries=>{const {width,height}=entries[0].contentRect;if(width<10||height<10)return;const key=Math.round(width)+'x'+Math.round(height);if(key!==lastViewportSize){lastViewportSize=key;defaultView(false);}request();}).observe($('#viewport'));
 function showCategory(id){const c=category(id);if(!c)return;notice(`${c.name}: ${c.description} Selecione uma peça para escolher este destino.`);}
 $('#scene').addEventListener('webglcontextlost',e=>{e.preventDefault();if(R)R.lost=true;persist();notice('O navegador interrompeu o 3D. Suas escolhas foram preservadas. Continue pela lista de componentes ou aguarde a recuperação.');$('.part-details')?.setAttribute('open','');});
 $('#scene').addEventListener('webglcontextrestored',()=>{try{R=new MC3D.Renderer($('#scene'));world=createMissionScene(R);world.stage(state.phase);if(state.phase==='triage')world.restorePlacements(state.placements);if(state.phase==='disassembly')applyExplosion(state.explode/100);if(state.focus)world.inspect(state.focus);renderChrome();defaultView();request();notice('Ambiente 3D recuperado. Suas escolhas continuam disponíveis.');}catch{notice('O 3D não pôde ser recuperado. Continue usando a lista e os controles de classificação.');}});
 renderChrome();
 setTimeout(()=>{try{try{R=new MC3D.Renderer($('#scene'))}catch{R=new MC3D.SoftwareRenderer($('#scene'))}world=createMissionScene(R);world.stage(state.phase);if(state.phase==='triage'||state.phase==='results')world.restorePlacements(state.placements);if(state.phase==='disassembly')applyExplosion(state.explode/100);if(state.focus)world.inspect(state.focus);defaultView(false);$('#loading').classList.add('hidden');document.body.dataset.ready=R.software?'software':'webgl';renderLabels();if(R.software)$('#footerNote').textContent='3D em modo compatível · inspeção exclusivamente virtual.';request()}catch(err){console.error('Falha do renderizador',err);$('#loading').innerHTML='<div class="empty-webgl"><h2>Modo de inspeção textual</h2><p>O 3D não está disponível neste dispositivo. Você ainda pode examinar as descrições, selecionar componentes pela lista e realizar toda a triagem. Para a cena 3D, use um navegador com WebGL2 e aceleração gráfica.</p></div>';document.body.dataset.ready='fallback';R=null;world=null;renderSide();renderLabels();$('#binLabels').classList.add('compact-bins');}},70);
 // Apenas observação de estado para testes e integrações; sem acesso de administrador.
 window.MissaoCircular={version:C.version,getState:()=>structuredClone({phase:state.phase,focus:state.focus,selected:state.selected,visited:state.visited,placements:state.placements,hints:state.hints,highest:state.highest,explode:state.explode,results:state.results}),getSceneMetrics:()=>R?{objects:R.draws?.length||0,triangles:R.draws?.reduce((n,d)=>n+d.node.geo.idx.length/3,0)||0,renderer:R.software?'Canvas 2D / modelos 3D locais':'WebGL2 local',width:R.width,height:R.height,lastFrameMs:R.lastFrameMs||null,frameErrors:R.gl?R.gl.getError():0}:null};
 window.MissaoCircular.getDiagnostics=()=>({animations:animations.length,camera:structuredClone(orbit),rendererReady:document.body.dataset.ready,parts:world?Object.fromEntries(P.map(p=>[p.id,{position:[...world.parts[p.id].p],rotation:[...world.parts[p.id].r],scale:[...world.parts[p.id].s],bounds:world.bounds(world.parts[p.id]),anchor:R?.project(world.atAnchor(p.id)),destination:state.placements[p.id]||null}])):{}});

})();
