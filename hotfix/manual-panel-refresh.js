/* Painel da Mediadora — atualização sob demanda, sem polling contínuo. */
'use strict';
(()=>{
  /* Bloqueia somente o canal SSE de atualização contínua deste painel. */
  const NativeEventSource=window.EventSource;
  class ManualEventSource{
    constructor(url){this.url=String(url||'');this.readyState=2;this.withCredentials=false;this.onopen=null;this.onmessage=null;this.onerror=null;}
    addEventListener(){}
    removeEventListener(){}
    dispatchEvent(){return false;}
    close(){this.readyState=2;}
  }
  ManualEventSource.CONNECTING=0;ManualEventSource.OPEN=1;ManualEventSource.CLOSED=2;
  window.__MEDIADORA_NATIVE_EVENT_SOURCE__=NativeEventSource;
  window.EventSource=ManualEventSource;
  function install(){
    if(document.getElementById('manualDataRefresh'))return;

    const button=document.createElement('button');
    button.id='manualDataRefresh';
    button.type='button';
    button.textContent='Atualizar dados';
    button.title='Buscar os dados mais recentes somente agora.';
    button.setAttribute('aria-label','Atualizar dados agora');
    button.style.cssText='border:1px solid #c8d6cc;background:#fff;color:#244b3b;border-radius:10px;padding:9px 13px;font:700 12px/1.2 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer;min-height:38px;box-shadow:0 2px 8px rgba(20,55,42,.06)';

    button.addEventListener('click',()=>{
      button.disabled=true;
      button.textContent='Atualizando…';
      try{sessionStorage.setItem('mediadora_manual_refresh_at',new Date().toISOString());}catch{}
      location.reload();
    });


    const exportButton=document.createElement('button');
    exportButton.id='exportKeiseAnalytics';
    exportButton.type='button';
    exportButton.textContent='Exportar para Keise Analytics';
    exportButton.title='Gerar agora um arquivo com participações, resultados e feedbacks.';
    exportButton.style.cssText=button.style.cssText+';border-color:#d8c9ef;color:#644f8c;background:#fbf8ff';
    exportButton.addEventListener('click',async()=>{
      const bridge=window.__KLA_PANEL__;
      if(!bridge?.api){note.textContent='Entre no painel e tente novamente.';return;}
      exportButton.disabled=true;const label=exportButton.textContent;exportButton.textContent='Preparando…';
      try{
        const payload=await bridge.api('/admin/data/analytics-export');
        const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});
        const url=URL.createObjectURL(blob),a=document.createElement('a');
        a.href=url;a.download='keise-analytics-missao-circular-'+new Date().toISOString().slice(0,10)+'.json';
        document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
        note.textContent='Arquivo preparado agora.';
      }catch(e){note.textContent=e?.message||'Não foi possível exportar agora.';}
      finally{exportButton.disabled=false;exportButton.textContent=label;}
    });

    const note=document.createElement('span');
    note.id='manualDataRefreshNote';
    note.textContent='Atualização manual';
    note.style.cssText='font:600 11px/1.2 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#66756e;white-space:nowrap';

    const wrap=document.createElement('div');
    wrap.id='manualDataRefreshWrap';
    wrap.style.cssText='display:flex;align-items:center;gap:8px;flex-wrap:wrap';
    wrap.append(button,exportButton,note);

    const target=
      document.querySelector('.toolbar .actions')||
      document.querySelector('.actions')||
      document.querySelector('.toolbar')||
      document.querySelector('header');

    if(target)target.append(wrap);
    else{
      wrap.style.cssText+=';position:fixed;right:18px;top:18px;z-index:9999;background:#f7faf8;border:1px solid #dce6df;border-radius:12px;padding:8px';
      document.body.append(wrap);
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
