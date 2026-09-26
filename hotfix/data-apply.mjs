/* Add optional data management. No existing records are removed or reclassified. */
import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(process.argv[2]||'/out'),src=resolve(process.argv[3]||'/build/hotfix');
function edit(path,fn){const p=resolve(root,path),before=readFileSync(p,'utf8'),after=fn(before);if(before===after)throw Error('No change applied: '+path);writeFileSync(p,after);}
function rep(s,a,b){if(!s.includes(a))throw Error('Expected source not found: '+a.slice(0,90));return s.replace(a,b);}
for(const [from,to]of[['data-management.mjs','server/data-management.mjs'],['data-controls.js','public/mediadora/data-controls.js'],['data-controls.css','public/mediadora/data-controls.css'],['manual-panel-refresh.js','public/mediadora/manual-panel-refresh.js'],['feedback-policy.js','public/gameseducativos/feedback-policy.js']])copyFileSync(resolve(src,from),resolve(root,to));
edit('server/portal.mjs',s=>{
 s=rep(s,"import { DatabaseSync } from 'node:sqlite';","import { DatabaseSync } from 'node:sqlite';\nimport { createDataManagement } from './data-management.mjs';");
 s=rep(s,'  const subscribers=new Set(),limits=new Map();','  const dataControls=createDataManagement({db,fail,body,output,broadcast,audit,digest,token,now});\n  const subscribers=new Set(),limits=new Map();');
 s=rep(s,'scoreMode:g.score_mode,enabled:!!g.enabled','scoreMode:g.score_mode,feedbackEnabled:dataControls.enabled(g.id),enabled:!!g.enabled');
 s=rep(s,"    const fw=where(feedFilter.clauses);","    dataControls.filter(feedFilter.clauses,q);\n    const fw=where(feedFilter.clauses);");
 s=rep(s,'SELECT f.id,f.rating,f.comment,f.is_read isRead','SELECT f.id,${dataControls.archivedSQL} isArchived,f.rating,f.comment,f.is_read isRead');
 s=rep(s,"      if(path==='/public/feedback'&&method==='POST'){", "      if(path==='/public/feedback-policy'&&method==='GET'){const a=student(req);output(res,200,{ok:true,enabled:dataControls.enabled(a.game_id)});return true;}\n      if(path==='/public/feedback'&&method==='POST'){");
 s=rep(s,"        if(!RATINGS.includes(b.avaliacao))", "        if(!dataControls.enabled(a.game_id))fail(409,'O recebimento de avaliações está pausado no momento. Sua pontuação permanece registrada.');\n        if(!RATINGS.includes(b.avaliacao))");
 s=rep(s,"        if(path==='/admin/session'&&method==='GET')", "        if(path.startsWith('/admin/data/')){limit('data:'+s.hash,60);if(await dataControls.handle(path,method,req,res,s))return true;}\n        if(path==='/admin/session'&&method==='GET')");
 s=rep(s,"          db.prepare('UPDATE games SET enabled=?,opens_at=?,closes_at=?,link_required=? WHERE id=?')", "          if(Object.hasOwn(b,'feedbackEnabled'))dataControls.setEnabled(g.id,b.feedbackEnabled);\n          db.prepare('UPDATE games SET enabled=?,opens_at=?,closes_at=?,link_required=? WHERE id=?')");
 s=rep(s,"          const rows=kind==='feedback'?", "          if(kind==='feedback')dataControls.filter(f.clauses,u.searchParams);\n          const rows=kind==='feedback'?");
 return s;
});
edit('public/mediadora/index.html',s=>{
 s=rep(s,'</head>','<link rel="stylesheet" href="data-controls.css?v=23.3"></head>');
 s=rep(s,'<script src="panel.js"></script>','<script src="data-controls.js?v=23.3"></script><script src="manual-panel-refresh.js?v=23.3"></script><script src="panel.js?v=23.3"></script>');
 return rep(s,'<label class="check-row"><input type="checkbox" id="gameLinkRequired">','<label class="check-row"><input type="checkbox" id="gameFeedbackEnabled" checked> Receber avaliações ao final</label><p class="note">Desmarque para pausar novos envios. Avaliações já recebidas, resultados e acesso ao jogo são preservados.</p><label class="check-row"><input type="checkbox" id="gameLinkRequired">');
});
edit('public/mediadora/panel.js',s=>{
 s=rep(s,'  return q;','  return window.MediacaoDataControls.query(q);');
 s=rep(s,"  if(view==='feedback'){", "  window.MediacaoDataControls.render({view,data,api,load,query,resetPage:()=>{offset=0;}});\n  if(view==='feedback'){");
 s=rep(s,"$('#gameLinkRequired').checked=g.linkRequired;", "$('#gameLinkRequired').checked=g.linkRequired;$('#gameFeedbackEnabled').checked=g.feedbackEnabled!==false;");
 s=rep(s,"body:{enabled:$('#gameEnabled').checked,", "body:{feedbackEnabled:$('#gameFeedbackEnabled').checked,enabled:$('#gameEnabled').checked,");
 s=rep(s,"$('#clearFilters').onclick=()=>{", "$('#clearFilters').onclick=()=>{window.MediacaoDataControls.reset();");
 s=rep(s,"  stopLive();csrf='';data=null;", "  window.MediacaoDataControls.reset();stopLive();csrf='';data=null;");
 s=rep(s,'function startLive(){','function startLive(){return;/* atualização manual: sem SSE contínuo */');
 return s;
});
edit('public/shared/host-client.js',s=>{
 s=rep(s,"async function request(path,payload,authToken=null){", "async function request(path,payload,authToken=null,method='POST'){");
 s=rep(s,"{method:'POST',headers,credentials:'omit',body:JSON.stringify(payload),signal:controller.signal}","{method,headers,credentials:'omit',body:method==='GET'?undefined:JSON.stringify(payload),signal:controller.signal}");
 return rep(s,'return {onParticipant,onProgress,onResult,onFeedback,getSession:',"return {onParticipant,onProgress,onResult,onFeedback,onFeedbackPolicy:()=>request('/public/feedback-policy',null,saved?.token,'GET'),getSession:");
});
edit('public/gameseducativos/index.html',s=>rep(s,'</body>','<script src="feedback-policy.js?v=23.3"></script>\n</body>'));
const files=['server/portal.mjs','server/data-management.mjs','public/mediadora/panel.js','public/mediadora/index.html','public/mediadora/data-controls.js','public/mediadora/data-controls.css','public/mediadora/manual-panel-refresh.js','public/shared/host-client.js','public/gameseducativos/feedback-policy.js','public/gameseducativos/index.html'];
writeFileSync(resolve(root,'DATA_CONTROLS_SHA256.json'),JSON.stringify({version:'23.3',files:Object.fromEntries(files.map(p=>[p,createHash('sha256').update(readFileSync(resolve(root,p))).digest('hex')]))},null,2));
console.log('23.3: painel da mediadora em atualização manual; sem live/SSE contínuo. Nenhum registro alterado.');
