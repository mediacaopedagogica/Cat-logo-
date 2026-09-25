/* Reconstrói os fontes 23.0 a partir do pacote verificado e da base versionada.
 * Os arquivos completos são escritos no build; nenhuma credencial está no pacote.
 */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {brotliDecompressSync} from 'node:zlib';
const baseline=resolve(process.argv[2]||'baseline'),out=resolve(process.argv[3]||'/out');
const hash=b=>createHash('sha256').update(b).digest('hex');
const bundle=Buffer.concat([1,2,3,4,5].map(n=>readFileSync(new URL('../release/part-'+String(n).padStart(2,'0')+'.br',import.meta.url))));
if(hash(bundle)!=='fc5d5c8522da543b6b432b70defdcb12e010ae7ac09e57f8c0353fb274a3a3a7')throw Error('Pacote de publicação corrompido.');
const release=JSON.parse(brotliDecompressSync(bundle,{maxOutputLength:1000000}));
if(release.format!=='source-patch-v1'||release.files.length!==22)throw Error('Formato de publicação inválido.');
const manifest={};
for(const f of release.files){
 if(!/^(?:package\.json|(?:public|server|scripts)\/[A-Za-z0-9_./-]+)$/.test(f.path)||f.path.split('/').includes('..'))throw Error('Caminho de publicação inválido.');
 let text=f.text;
 if(f.base){
  if(!/^[a-z0-9.-]+$/.test(f.base))throw Error('Base inválida.');
  const base=readFileSync(resolve(baseline,f.base));
  if(hash(base)!==f.baseSHA256)throw Error('Base divergente: '+f.base);
  const lines=base.toString('utf8').match(/[^\n]*\n|[^\n]+$/g)||[];
  text=f.ops.map(op=>{
   if(typeof op==='string')return op;
   if(!Array.isArray(op)||op.length!==2||!op.every(Number.isInteger)||op[0]<0||op[1]<op[0]||op[1]>lines.length)throw Error('Operação de reconstrução inválida.');
   return lines.slice(op[0],op[1]).join('');
  }).join('');
 }
 if(typeof text!=='string'||hash(Buffer.from(text))!==f.sha256)throw Error('Fonte divergente: '+f.path);
 const file=resolve(out,f.path);if(!file.startsWith(out+sep))throw Error('Destino inválido.');
 mkdirSync(dirname(file),{recursive:true});writeFileSync(file,text,{mode:0o644});manifest[f.path]=f.sha256;
}
writeFileSync(resolve(out,'SOURCE_SHA256.json'),JSON.stringify(manifest,null,2));
console.log('22 arquivos reconstruídos e verificados. Nenhuma credencial incluída.');
