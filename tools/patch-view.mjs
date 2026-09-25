/* Presentation-only hotfix. Database, authentication, invitations and scoring are not changed. */
import {readFileSync,writeFileSync,copyFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
const root=resolve(process.argv[2]||'/out');
const source=resolve(process.argv[3]||'hotfix');
for(const [from,to]of[['embed.css','gameseducativos/embed.css'],['embed.js','shared/embed.js'],['embed-parent.js','shared/embed-parent.js']]){
 const target=resolve(root,'public',to);mkdirSync(dirname(target),{recursive:true});copyFileSync(resolve(source,from),target);
}
const game=resolve(root,'public/gameseducativos/index.html');let html=readFileSync(game,'utf8');
if(!html.includes('embed.css'))html=html.replace('</head>','<link rel="stylesheet" href="embed.css?v=23.1">\n<script src="../shared/embed.js?v=23.1" defer></script>\n</head>');
writeFileSync(game,html);
const panel=resolve(root,'public/mediadora/panel.js');let js=readFileSync(panel,'utf8');
const old='   const code=`<iframe src="${esc(g.studentUrl)}" title="${esc(g.title)}" style="display:block;width:100%;height:950px;border:0;border-radius:16px;" allow="fullscreen" allowfullscreen loading="lazy" referrerpolicy="no-referrer"></iframe>`;';
const replacement='   const embedUrl=new URL(g.studentUrl);embedUrl.searchParams.set("embed","1");\n'+
'   const code=`<iframe data-mediacao-embed="1" src="${esc(embedUrl.href)}" title="${esc(g.title)}" width="100%" height="1800" style="display:block;width:100%;height:1800px;max-width:100%;border:0;border-radius:16px;background:#f6f8ef;" allow="fullscreen" allowfullscreen loading="lazy" referrerpolicy="no-referrer"></iframe>`;';
if(!js.includes(old)&&!js.includes('data-mediacao-embed="1"'))throw Error('Expected forum generator not found; refusing to modify unrelated code.');
js=js.replace(old,replacement);
js=js.replace('Cole no modo HTML do fórum. Este código usa o endereço e a chave do jogo selecionado, não um link antigo.','Cole no modo HTML do fórum. O código mantém o convite e define 1.800 px de altura, inclusive quando estilos são removidos. A caixa de edição do fórum pode mostrar só uma parte; confira a postagem salva.');
writeFileSync(panel,js);
console.log('Presentation hotfix applied: embed layout and forum height.');
