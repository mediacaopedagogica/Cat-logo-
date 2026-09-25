/* Loaded only in the private panel. No changes are performed on page load. */
'use strict';
window.MediacaoDataControls=(()=>{
 let archiveMode='active',ctx=null,selectionKey='',selected=new Set(),pending=null,message='',busy=false;
 const el=(tag,text,cls='')=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const qty=(n,one,many)=>n+' '+(n===1?one:many);
 const button=(text,fn,cls='button outline')=>{const n=el('button',text,cls);n.type='button';n.onclick=fn;return n;};
 const dialog=el('dialog',undefined,'dialog data-confirm');dialog.id='dataConfirm';dialog.setAttribute('aria-labelledby','dataConfirmTitle');document.body.append(dialog);
 function status(t){message=t;document.querySelector('#dataControlStatus')?.replaceChildren(document.createTextNode(t));}
 function fail(e){status(e.message||'Não foi possível concluir.');}
 function setCount(bar){bar.querySelector('.selection-count').textContent=selected.size+' selecionada'+(selected.size===1?'':'s');bar.querySelectorAll('[data-needs-selection]').forEach(b=>b.disabled=!selected.size||busy);const all=bar.querySelector('[data-select-all]'),checks=[...document.querySelectorAll('.data-select')];if(all){all.checked=checks.length>0&&checks.every(n=>n.checked);all.indeterminate=checks.some(n=>n.checked)&&!all.checked;}}
 async function preview(kind,ids){
  if(busy||dialog.open)return;busy=true;const api=ctx.api,load=ctx.load;
  try{
   const p=await api('/admin/data/preview',{method:'POST',body:{kind,ids}});pending={p,api,load};dialog.replaceChildren();
   const h=el('h2',kind==='attempts'?'Excluir participações selecionadas?':'Excluir avaliações selecionadas?');h.id='dataConfirmTitle';dialog.append(h);
   const c=p.counts,w=el('p',kind==='attempts'?`A exclusão removerá ${qty(c.participations,'participação','participações')}, ${qty(c.results,'resultado','resultados')} e ${qty(c.feedbacks,'avaliação vinculada','avaliações vinculadas')}. ${c.participations===1?'Essa participação sairá':'Essas participações sairão'} do ranking.`:`A exclusão removerá ${qty(c.feedbacks,'avaliação','avaliações')}, incluindo os comentários. As participações e pontuações serão mantidas.`,'data-warning');w.id='dataConfirmDescription';dialog.setAttribute('aria-describedby',w.id);dialog.append(w);
   const list=el('ul',undefined,'data-preview-list');p.items.forEach(x=>list.append(el('li',`${x.name} · ${x.gameTitle} · ${new Date(x.at).toLocaleString('pt-BR')}`)));dialog.append(list);
   dialog.append(el('p','Essa exclusão é definitiva no painel. Confira a seleção. Você pode cancelar e exportar os registros antes de prosseguir.'));
   const label=el('label','Digite EXCLUIR para confirmar.');label.htmlFor='deleteConfirmation';const input=el('input');input.id='deleteConfirmation';input.autocomplete='off';input.spellcheck=false;input.maxLength=7;dialog.append(label,input);
   const error=el('p','', 'error');error.setAttribute('role','alert');dialog.append(error);
   const actions=el('div',undefined,'actions'),cancel=button('Cancelar',()=>dialog.close()),confirm=button('Excluir definitivamente',async()=>{
    if(input.value!=='EXCLUIR'||!pending)return;confirm.disabled=true;cancel.disabled=true;input.disabled=true;
    try{const job=pending;await job.api('/admin/data/delete',{method:'POST',body:{previewToken:job.p.previewToken,confirm:'EXCLUIR'}});selected.clear();status('Registros selecionados excluídos. Os demais foram preservados.');dialog.close();await job.load();}
    catch(e){error.textContent=e.message;cancel.disabled=false;input.disabled=false;input.value='';}
   },'button danger');confirm.disabled=true;input.oninput=()=>confirm.disabled=input.value!=='EXCLUIR';cancel.autofocus=true;actions.append(cancel,confirm);dialog.append(actions);dialog.showModal();cancel.focus();
  }catch(e){fail(e);}finally{busy=false;}
 }
 dialog.addEventListener('close',()=>pending=null);
 async function archive(ids,value){if(busy)return;busy=true;try{await ctx.api('/admin/data/archive',{method:'POST',body:{ids,archived:value}});selected.clear();status(value?'Avaliações arquivadas. Use o filtro Arquivados para restaurá-las.':'Avaliações restauradas.');await ctx.load();}catch(e){fail(e);}finally{busy=false;}}
 function toolbar(kind,records){
  const bar=el('div',undefined,'data-tools');const label=el('label'),all=el('input');all.type='checkbox';all.dataset.selectAll='1';label.append(all,document.createTextNode('Selecionar os exibidos'));bar.append(label,el('span','0 selecionadas','selection-count'));
  all.onchange=()=>{selected.clear();if(all.checked)records.forEach(x=>selected.add(x.id));document.querySelectorAll('.data-select').forEach(n=>n.checked=selected.has(n.value));setCount(bar);};
  if(kind==='feedback')for(const [title,value]of[['Arquivar',true],['Restaurar',false]]){const b=button(title,()=>archive([...selected],value));b.dataset.needsSelection='1';bar.append(b);}
  const del=button('Excluir selecionadas',()=>preview(kind,[...selected]),'button danger');del.dataset.needsSelection='1';bar.append(del);
  bar.append(el('p',kind==='attempts'?'Selecione os testes que deseja remover. Excluir uma participação também remove seus resultados e feedbacks. Nenhum registro é selecionado automaticamente.':'Arquivar apenas retira da lista de ativos e pode ser desfeito. Excluir remove somente a avaliação e o comentário, sem alterar a pontuação.'));
  return bar;
 }
 function check(id,name,bar){const n=el('input',undefined,'data-select');n.type='checkbox';n.value=id;n.checked=selected.has(id);n.setAttribute('aria-label','Selecionar '+name);n.onchange=()=>{n.checked?selected.add(id):selected.delete(id);setCount(bar);};return n;}
 function render(context){
  ctx=context;const {view,data}=ctx,root=document.querySelector('#panelContent');if(!root)return;
  const key=view+'|'+ctx.query().toString();if(key!==selectionKey){selected.clear();selectionKey=key;}
  const records=view==='participants'?data.attempts:data.feedback;const valid=new Set(records.map(x=>x.id));selected=new Set([...selected].filter(id=>valid.has(id)));
  const notice=el('div',message,'data-control-status');notice.id='dataControlStatus';notice.setAttribute('role','status');root.prepend(notice);
  if(view==='feedback'){
   const label=el('label','Mostrar '),select=el('select');select.id='archiveFilter';select.setAttribute('aria-label','Estado de arquivamento');for(const [v,t]of[['active','Ativos'],['archived','Arquivados'],['all','Todos']]){const o=el('option',t);o.value=v;select.append(o);}select.value=archiveMode;label.append(select);root.querySelector('.extra-filters')?.append(label);select.onchange=()=>{archiveMode=select.value;selected.clear();ctx.resetPage();ctx.load();};
  }
  if(view==='participants'&&data.attempts.length){
   const wrap=[...root.querySelectorAll('.table-wrap')].at(-1),table=wrap.querySelector('table'),bar=toolbar('attempts',data.attempts);wrap.before(bar);table.querySelector('thead tr').prepend(el('th','Selecionar'));table.querySelector('thead tr').append(el('th','Ações'));
   table.querySelectorAll('tbody tr').forEach((tr,i)=>{const a=data.attempts[i],td=el('td');td.append(check(a.id,a.name,bar));tr.prepend(td);const action=el('td');action.append(button('Excluir',()=>preview('attempts',[a.id]),'button danger'));tr.append(action);});setCount(bar);
  }
  if(view==='feedback'||view==='overview'){
   let bar=null;if(view==='feedback'&&data.feedback.length){bar=toolbar('feedback',data.feedback);root.querySelector('.feedback-list').before(bar);}
   root.querySelectorAll('[data-feedback-id]').forEach(card=>{const f=data.feedback.find(x=>x.id===card.dataset.feedbackId);if(!f)return;
    if(f.isArchived)card.querySelector('.feedback-name').append(el('span','Arquivado','data-archive-tag'));
    const actions=el('div',undefined,'data-card-actions');if(bar){const label=el('label');label.append(check(f.id,f.name,bar),document.createTextNode(' Selecionar'));actions.append(label);}
    actions.append(button(f.isArchived?'Restaurar':'Arquivar',()=>archive([f.id],!f.isArchived)),button('Excluir',()=>preview('feedback',[f.id]),'button danger'));card.append(actions);
   });if(bar)setCount(bar);
  }
  if(view==='games')root.querySelectorAll('.game-card').forEach((card,i)=>card.append(el('span',data.games[i].feedbackEnabled===false?'Recebimento de avaliações pausado.':'Recebimento de avaliações ativo.','data-policy-status')));
 }
 return Object.freeze({render,getArchiveMode:()=>archiveMode,reset(){archiveMode='active';selectionKey='';selected.clear();message='';if(dialog.open)dialog.close();},query(q){if(archiveMode!=='active')q.set('archive',archiveMode);return q;}});
})();
