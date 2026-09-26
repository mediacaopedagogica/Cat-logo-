/* Optional administrative controls. No existing participation is changed on startup.
 * Destructive operations require an authenticated, CSRF-checked preview and confirmation.
 */
export function createDataManagement({db,fail,body,output,broadcast,audit,digest,token,now}) {
  db.exec(`CREATE TABLE IF NOT EXISTS game_feedback_settings (
    game_id TEXT PRIMARY KEY REFERENCES games(id) ON DELETE CASCADE,
    enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)));
    CREATE TABLE IF NOT EXISTS feedback_archives (
    feedback_id TEXT PRIMARY KEY REFERENCES feedback(id) ON DELETE CASCADE,
    archived_at INTEGER NOT NULL);`);
  const previews=new Map();
  const enabled=id=>db.prepare('SELECT enabled FROM game_feedback_settings WHERE game_id=?').get(id)?.enabled!==0;
  function setEnabled(id,value){
    if(typeof value!=='boolean')fail(400,'Estado do recebimento de avaliações inválido.');
    db.prepare('INSERT INTO game_feedback_settings(game_id,enabled) VALUES(?,?) ON CONFLICT(game_id) DO UPDATE SET enabled=excluded.enabled').run(id,Number(value));
  }
  const archivedSQL='EXISTS(SELECT 1 FROM feedback_archives fa WHERE fa.feedback_id=f.id)';
  function filter(clauses,q){const mode=q.get('archive')||'active';if(!['active','archived','all'].includes(mode))fail(400,'Filtro de arquivamento inválido.');if(mode!=='all')clauses.push((mode==='active'?'NOT ':'')+archivedSQL);}
  function selection(b){
    if(!['attempts','feedback'].includes(b.kind))fail(400,'Tipo de registro inválido.');
    if(!Array.isArray(b.ids)||b.ids.length<1||b.ids.length>100||b.ids.some(id=>typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id))||new Set(b.ids).size!==b.ids.length)fail(400,'Selecione de 1 a 100 registros, sem duplicações.');
    return {kind:b.kind,ids:[...b.ids].sort()};
  }
  function snapshot(kind,ids){
    const marks=ids.map(()=>'?').join(',');
    const attempts=kind==='attempts'?db.prepare(`SELECT a.id,a.name,a.game_id gameId,a.updated_at updatedAt,g.title gameTitle FROM attempts a JOIN games g ON g.id=a.game_id WHERE a.id IN (${marks}) ORDER BY a.id`).all(...ids):[];
    const feedback=db.prepare(`SELECT f.id,f.attempt_id attemptId,f.result_id resultId,f.rating,f.comment,f.is_read isRead,f.updated_at updatedAt,${archivedSQL} isArchived,a.name,a.game_id gameId,g.title gameTitle FROM feedback f JOIN attempts a ON a.id=f.attempt_id JOIN games g ON g.id=a.game_id WHERE ${kind==='attempts'?'f.attempt_id':'f.id'} IN (${marks}) ORDER BY f.id`).all(...ids);
    const results=kind==='attempts'?db.prepare(`SELECT id,attempt_id,points,created_at FROM results WHERE attempt_id IN (${marks}) ORDER BY id`).all(...ids):[];
    if((kind==='attempts'?attempts:feedback).length!==ids.length)fail(409,'A seleção mudou. Atualize a lista e selecione novamente.');
    return {attempts,feedback,results,hash:digest(JSON.stringify({attempts,feedback,results}))};
  }
  const counts=s=>({participations:s.attempts.length,results:s.results.length,feedbacks:s.feedback.length});
  function transaction(fn){db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}
  async function handle(path,method,req,res,session){
    if(path==='/admin/data/preview'&&method==='POST'){
      const b=selection(await body(req)),s=snapshot(b.kind,b.ids);
      for(const [k,v]of previews)if(v.expires<now())previews.delete(k);
      if(previews.size>=200)fail(429,'Há muitas confirmações abertas. Aguarde alguns minutos.');
      const key=token();previews.set(key,{...b,hash:s.hash,session:session.hash,expires:now()+300000});
      output(res,200,{ok:true,previewToken:key,kind:b.kind,counts:counts(s),items:(b.kind==='attempts'?s.attempts:s.feedback).map(x=>({id:x.id,name:x.name,gameTitle:x.gameTitle,at:x.updatedAt})),expiresIn:300});return true;
    }
    if(path==='/admin/data/delete'&&method==='POST'){
      const b=await body(req),p=previews.get(b.previewToken);
      if(!p||p.expires<now()||p.session!==session.hash)fail(409,'A confirmação expirou. Selecione os registros novamente.');
      if(b.confirm!=='EXCLUIR')fail(400,'Digite EXCLUIR para confirmar.');
      let deleted;
      transaction(()=>{
        const s=snapshot(p.kind,p.ids);if(s.hash!==p.hash)fail(409,'Os registros mudaram desde a prévia. Confira a seleção novamente antes de excluir.');
        const marks=p.ids.map(()=>'?').join(',');
        if(p.kind==='attempts'){
          db.prepare(`DELETE FROM feedback WHERE attempt_id IN (${marks})`).run(...p.ids);
          db.prepare(`DELETE FROM results WHERE attempt_id IN (${marks})`).run(...p.ids);
          db.prepare(`DELETE FROM attempts WHERE id IN (${marks})`).run(...p.ids);
        }else db.prepare(`DELETE FROM feedback WHERE id IN (${marks})`).run(...p.ids);
        deleted=counts(s);audit('data_deleted',JSON.stringify({kind:p.kind,...deleted}));
      });
      previews.delete(b.previewToken);broadcast('data-deleted');output(res,200,{ok:true,deleted});return true;
    }
    if(path==='/admin/data/analytics-export'&&method==='GET'){
      const attempts=db.prepare('SELECT a.id,a.name,a.game_id gameId,a.updated_at updatedAt,g.title gameTitle FROM attempts a JOIN games g ON g.id=a.game_id ORDER BY a.updated_at').all();
      const results=db.prepare('SELECT r.id,r.attempt_id attemptId,r.points,r.created_at createdAt,a.name,a.game_id gameId,g.title gameTitle FROM results r JOIN attempts a ON a.id=r.attempt_id JOIN games g ON g.id=a.game_id ORDER BY r.created_at').all();
      const feedback=db.prepare('SELECT f.id,f.attempt_id attemptId,f.result_id resultId,f.rating,f.comment,f.updated_at updatedAt,a.name,a.game_id gameId,g.title gameTitle FROM feedback f JOIN attempts a ON a.id=f.attempt_id JOIN games g ON g.id=a.game_id ORDER BY f.updated_at').all();
      const events=[];
      for(const a of attempts)events.push({id:'mc-attempt-'+a.id,projectId:'missao-circular',type:'attempt',at:new Date(a.updatedAt).toISOString(),participantId:a.name,participantName:a.name,actorRole:'student',sessionId:a.id,metadata:{sourceGameId:a.gameId,gameTitle:a.gameTitle}});
      for(const r of results){
        events.push({id:'mc-completion-'+r.id,projectId:'missao-circular',type:'completion',at:new Date(r.createdAt).toISOString(),participantId:r.name,participantName:r.name,actorRole:'student',sessionId:r.attemptId,metadata:{sourceGameId:r.gameId,gameTitle:r.gameTitle}});
        events.push({id:'mc-score-'+r.id,projectId:'missao-circular',type:'score',at:new Date(r.createdAt).toISOString(),participantId:r.name,participantName:r.name,actorRole:'student',sessionId:r.attemptId,score:Number(r.points)||0,maxScore:80,metadata:{sourceGameId:r.gameId,gameTitle:r.gameTitle}});
      }
      for(const x of feedback)events.push({id:'mc-feedback-'+x.id,projectId:'missao-circular',type:'feedback',at:new Date(x.updatedAt).toISOString(),participantId:x.name,participantName:x.name,actorRole:'student',sessionId:x.attemptId,rating:((({Excelente:5,'Muito bom':4,Bom:3,Cansativo:2,Ruim:1}[x.rating]??Number(x.rating)))||null),comment:x.comment||null,metadata:{sourceGameId:x.gameId,gameTitle:x.gameTitle,resultId:x.resultId||null}});
      output(res,200,{schema:'keise-learning-analytics/v1',project:{id:'missao-circular',name:'Missão Circular',discipline:'Design e Sustentabilidade'},generatedAt:new Date(now()).toISOString(),events});return true;
    }
    if(path==='/admin/data/archive'&&method==='POST'){
      const b=await body(req),chosen=selection({...b,kind:'feedback'});
      if(typeof b.archived!=='boolean')fail(400,'Estado de arquivamento inválido.');
      transaction(()=>{
        snapshot('feedback',chosen.ids);
        for(const id of chosen.ids){if(b.archived)db.prepare('INSERT OR IGNORE INTO feedback_archives VALUES(?,?)').run(id,now());else db.prepare('DELETE FROM feedback_archives WHERE feedback_id=?').run(id);}
        audit(b.archived?'feedback_archived':'feedback_restored',String(chosen.ids.length));
      });
      broadcast('feedback-archive');output(res,200,{ok:true,count:chosen.ids.length,archived:b.archived});return true;
    }
    return false;
  }
  return {enabled,setEnabled,filter,handle,archivedSQL};
}
