/* Cena da cadeira: um único conjunto de oito componentes persiste entre os estados.
 * A geometria do desgaste não é reconstituída ao mudar de fase.
 */
'use strict';
function createMissionScene(R){
 const E=MC3D,G=()=>new E.Node(),material=(color,rough=.75,metal=0,texture=null)=>({color,rough,metal,texture});
 function put(parent,node,x=0,y=0,z=0,rx=0,ry=0,rz=0){node.p=[x,y,z];node.r=[rx,ry,rz];parent.add(node);return node}
 const mesh=(geo,mat)=>new E.Node(geo,mat);
 const slab=(w,h,d,m,r=.30)=>mesh(E.slab(w,h,d,r),m);
 const box=(w,h,d,m,r=.04)=>mesh(E.roundedBox(w,h,d,r,5),m),cyl=(rt,rb,h,m,s=36,arc=Math.PI*2,start=0)=>mesh(E.cylinder(rt,rb,h,s,arc,start),m),ball=(x,y,z,m)=>mesh(E.sphere(x,y,z,20,12),m);
 function seed(n){return()=>{n=(Math.imul(1664525,n)+1013904223)>>>0;return n/4294967296}}
 function texture(draw,size=512){const c=document.createElement('canvas');c.width=c.height=size;draw(c.getContext('2d'),size,seed(8392));return c}
 const fabric=texture((c,s,r)=>{c.fillStyle='#778665';c.fillRect(0,0,s,s);for(let i=0;i<47000;i++){const p=r(),a=.07+r()*.19;c.fillStyle=p<.5?`rgba(34,48,28,${a})`:`rgba(247,245,214,${a})`;c.fillRect(r()*s,r()*s,.7+r()*1.5,.4+r()*1.0)}for(let i=0;i<s;i+=2){c.strokeStyle=i%4?'rgba(37,52,28,.045)':'rgba(255,249,219,.055)';c.beginPath();c.moveTo(i,0);c.lineTo(i+.4,s);c.stroke()}},1024);
 const wornFabric=texture((c,s,r)=>{c.drawImage(fabric,0,0,s,s);for(let i=0;i<38;i++){const x=r()*s,y=r()*s,rad=12+r()*80,g=c.createRadialGradient(x,y,1,x,y,rad);g.addColorStop(0,i%2?'rgba(83,64,29,.19)':'rgba(225,213,164,.2)');g.addColorStop(1,'rgba(105,102,67,0)');c.fillStyle=g;c.fillRect(x-rad,y-rad,rad*2,rad*2)}for(let i=0;i<80;i++){const x=r()*s,y=r()*s;c.strokeStyle='rgba(205,195,145,.34)';c.lineWidth=.4+r();c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+8,y+3,x+15,y-5,x+24,y+8);c.stroke()}},1024);
 const wood=texture((c,s,r)=>{c.fillStyle='#c19a75';c.fillRect(0,0,s,s);for(let i=0;i<s;i++){let v=114+Math.sin(i*.1)*5+r()*19;c.strokeStyle=`rgba(${v+40},${v+18},${v-8},.2)`;c.beginPath();c.moveTo(0,i);for(let x=0;x<=s;x+=16)c.lineTo(x,i+Math.sin(x*.009+i*.046)*3+Math.sin(x*.022)*1.2);c.stroke()}for(let i=0;i<5;i++){let y=i*s/4;c.strokeStyle='rgba(71,42,17,.11)';c.beginPath();c.moveTo(0,y);c.lineTo(s,y);c.stroke()}},1024);
 const rust=texture((c,s,r)=>{c.fillStyle='#444b47';c.fillRect(0,0,s,s);for(let i=0;i<120;i++){let x=r()*s,y=r()*s;const rad=2+r()*15;c.fillStyle=['#986344','#a97146','#744b34','#ba8051'][i%4];c.beginPath();for(let k=0;k<8;k++){let a=k/8*Math.PI*2,rr=rad*(.5+r()*.5);k?c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr):c.moveTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr)}c.closePath();c.fill()}},512);
 const foam=texture((c,s,r)=>{c.fillStyle='#d4bf8c';c.fillRect(0,0,s,s);for(let i=0;i<14000;i++){c.fillStyle=i%2?'rgba(95,65,26,.12)':'rgba(255,243,198,.3)';c.beginPath();c.arc(r()*s,r()*s,r()*1.3+.2,0,6.3);c.fill()}},512);
 const M={fabric:material('#ffffff',.92,0,fabric),worn:material('#e4dcc9',.98,0,wornFabric),plastic:material('#202927',.57,.035),rubber:material('#292e2a',.9),metal:material('#b4b9b1',.25,.84),steel:material('#303733',.46,.28),rust:material('#ffffff',.86,.12,rust),foam:material('#ffffff',.99,0,foam),wood:material('#ffffff',.81,0,wood),floor:material('#e3dacb',.94),wall:material('#f3eee3',.98),sage:material('#8b9d85',.9),seam:material('#697756',.98),black:material('#171e1a',.97),clothEdge:material('#a9a585',.97),pot:material('#e4d8c0',.86)};
 const room=G(),display=G(),tableGroup=G(),partsGroup=G(),inspectorGroup=G();R.root.add(room,display,tableGroup,partsGroup,inspectorGroup);inspectorGroup.visible=false;
 const floor=put(room,mesh(E.plane(42,40),M.floor),0,-.13,0);floor.cast=false;floor.mat={...M.floor,repeat:[5,5]};
 const wall=put(room,box(32,13,.2,M.wall,0),0,6.35,-8.4);wall.cast=false;
 const sidewall=put(room,box(.18,13,20,material('#e7e7d9',.98),0),-14,6.3,0);sidewall.cast=false;
 const windowPanel=put(room,box(7.4,5.4,.08,{...material('#d4e4d8',.8),emit:.5}),7.8,5.9,-8.22);windowPanel.cast=false;
 for(let k=0;k<4;k++)put(room,box(.075,5.45,.11,material('#f8f4eb')),(4.15+k*2.45),5.9,-8.08);
 put(room,box(7.5,.08,.14,M.wall),7.8,5.8,-8.03);
 // Lames de bois, étagère, livres et végétation : décor secondaire, sans interaction.
 for(let i=0;i<12;i++)put(room,box(.18,8.3,.12,M.wood,.02),-8.0+i*.31,4.0,-8.15);
 [-7.0,-4.2].forEach((x,i)=>{put(room,box(3.0,.13,1.0,M.wood,.035),x,3.6+i*2,-7.65);for(let j=0;j<4;j++){const b=box(.24,1.0+j*.08,.57,material(['#4c6659','#6f8263','#c6b690','#e3d9bc'][j],.88));put(room,b,x-1+j*.3,4.14+i*2,-7.7,0,0,j===3?-.09:0)}});
 function plant(parent,x,y,z,scale=1){const g=G();g.s=[scale,scale,scale];put(parent,g,x,y,z);put(g,cyl(.42,.30,.65,M.pot,36),0,.33,0);put(g,cyl(.39,.39,.04,material('#574c3b'),32),0,.66,0);const r=seed(Math.abs(Math.round(x*217+y*999+z*152))+8);for(let i=0;i<9;i++){let a=i*2.4,hh=.95+r()*.8,rr=.25+r()*.4;put(g,cyl(.015,.018,hh,material('#5a6b41'),8),Math.cos(a)*rr*.22,.68+hh/2,Math.sin(a)*rr*.22,Math.sin(a)*.18,0,Math.cos(a)*.2);put(g,ball(.21,.065,.47,material(i%3?'#657d46':'#879651',.8)),Math.cos(a)*rr,.8+hh,Math.sin(a)*rr,-.55-r()*.70,a,.30-r()*.6)}return g}
 plant(room,10.9,0,-4.8,1.75);plant(room,-10.1,0,-4.3,1.45);plant(room,-4.1,5.65,-7.45,.65);
 put(room,box(3.9,.14,1.0,M.wood),10.7,2.85,-6.9);plant(room,10.6,2.93,-6.8,.85);
 const poster=texture((ctx,n)=>{ctx.fillStyle='#f6f0e3';ctx.fillRect(0,0,n,n);ctx.strokeStyle='#a8b99a';ctx.lineWidth=3;ctx.strokeRect(26,26,n-52,n-52);ctx.fillStyle='#315c48';ctx.textAlign='center';ctx.font='500 38px Georgia';ctx.fillText('Materiais hoje.',n/2,205);ctx.fillText('Soluções amanhã.',n/2,267);ctx.fillStyle='#829271';ctx.fillRect(205,324,102,3);},512);
 put(room,box(3.45,2.55,.075,material('#ffffff',.95,0,poster),.04),-.55,6.15,-8.23);
 const peg=texture((ctx,n)=>{ctx.fillStyle='#c7ad85';ctx.fillRect(0,0,n,n);ctx.fillStyle='#756c53';for(let y=22;y<n;y+=33)for(let x=22;x<n;x+=33){ctx.beginPath();ctx.arc(x,y,2.0,0,Math.PI*2);ctx.fill();}},512);
 put(room,box(2.5,3.0,.08,material('#ffffff',.91,0,peg),.03),3.0,5.45,-8.23);
 // Piédestal de la séquence d'observation.
 const pedestal=put(display,cyl(3.2,3.25,.20,material('#e6dfcf',.92),72),0,.01,0);const pedestalTop=put(display,cyl(3.02,3.08,.025,material('#f7f3e9',.95),72),0,.12,0);
 const tableTop=put(tableGroup,box(13.8,.24,8.4,M.wood,.09),0,1.56,.55);[-6.1,6.1].forEach(x=>put(tableGroup,box(.35,1.5,7.4,material('#9f7a53',.82,0,wood),.03),x,.70,.55));
 put(tableGroup,box(14.0,.20,2.2,M.wood,.055),0,2.54,-5.3);put(tableGroup,box(14.0,1.6,.16,material('#ebece0',.97)),0,3.27,-6.27);
 const binGroup=G();tableGroup.add(binGroup);const bins={};
 MC_CONTENT.categories.forEach((cat,i)=>{const g=G();g.pickId=30+i;put(binGroup,g,-5.56+i*2.78,2.71,-5.2);const m=material(cat.color,.48,.04);put(g,box(2.42,.12,1.7,m,.055),0,0,0);put(g,box(2.42,.92,.12,m,.055),0,.45,-.80);put(g,box(2.42,.34,.12,m,.045),0,.16,.79);[-1.15,1.15].forEach(x=>put(g,box(.13,.70,1.58,m,.04),x,.34,0));bins[cat.id]={node:g,label:[g.p[0],3.15,-4.32],center:[g.p[0],2.87,-5.23]}});
 const parts={},newNodes=[],wornNodes=[],changes=[];
 const damage=(parent,node,...p)=>{node.visible=false;wornNodes.push(node);return put(parent,node,...p)};
 const pristine=(parent,node,...p)=>{newNodes.push(node);return put(parent,node,...p)};
 function wornMaterial(node,a,b){changes.push({node,a,b});return node}
 function makePart(id){const g=G();g.name=id;g.pickId=MC_CONTENT.parts.findIndex(x=>x.id===id)+1;partsGroup.add(g);parts[id]=g;return g}
 // Géométrie unique du siège, identique avant et après (sauf usure et dégâts).
 const seat=makePart('seat');put(seat,slab(3.25,.22,2.68,M.plastic,.32),0,0,0);wornMaterial(put(seat,slab(3.04,.46,2.48,M.fabric,.35),0,.30,.04),M.fabric,M.worn);
 function stitch(parent,axis,a,b,len,mat=M.seam){const o=box(axis==='x'?len:.014,.008,axis==='z'?len:.014,mat,.003);put(parent,o,a,.534,b);return o}
 [-.51,.51].forEach(x=>stitch(seat,'z',x,.04,2.10));stitch(seat,'x',0,.50,2.71);stitch(seat,'x',0,-.5,2.71);
 function tear(parent,x,y,z,w=.95,d=.25,vertical=false){const g=G();g.p=[x,y,z];if(vertical)g.r[0]=Math.PI/2;g.visible=false;wornNodes.push(g);parent.add(g);const r=seed(2546+Math.round(w*111));const pts=[];for(let i=0;i<22;i++){const a=i/22*Math.PI*2,rr=.76+r()*.28;pts.push([Math.cos(a)*w/2*rr,0,Math.sin(a)*d/2*rr])}put(g,mesh(E.polygon(pts),M.black));const inner=pts.map(p=>[p[0]*.82,.014,p[2]*.71]);put(g,mesh(E.polygon(inner),M.foam));for(let i=0;i<26;i++){const xx=(r()-.5)*w*.92,zz=(i%2?1:-1)*d*.4;const f=box(.010,.014,.055+r()*.08,M.clothEdge,.003);put(g,f,xx,.02,zz,0,(r()-.5)*1.2,(r()-.5)*.2)}return g}
 tear(seat,.55,.54,.77,1.13,.38);
 // Encosto com superfície têxtil e avaria no suporte visível na inspeção traseira.
 const back=makePart('back');put(back,slab(3.06,.24,2.50,M.plastic,.35),0,0,0,Math.PI/2);wornMaterial(put(back,slab(2.77,.22,2.20,M.fabric,.33),0,0,.20,Math.PI/2),M.fabric,M.worn);
 [-.46,.46].forEach(x=>put(back,box(.012,1.99,.012,M.seam,.002),x,0,.321));[-.4,.4].forEach(y=>put(back,box(2.55,.012,.012,M.seam,.002),0,y,.321));
 pristine(back,box(.28,1.55,.20,M.plastic,.055),0,-1.55,-.12);
 damage(back,box(.28,.83,.20,M.plastic,.035),0,-1.20,-.12);
 damage(back,box(.28,.63,.20,M.plastic,.035),.045,-1.996,-.12,0,0,.045);
 put(back,box(.72,.18,.52,M.plastic,.045),0,-2.26,-.05);
 tear(back,-.58,.20,.326,.98,.21,true);tear(back,.4,-.62,.326,1.05,.27,true);
 damage(back,box(.07,.62,.035,M.black,.008),.75,-.80,-.148,0,0,.48);
 // Os dois braços não recebem o mesmo desgaste: o esquerdo é íntegro no gabarito.
 ['armL','armR'].forEach(id=>{const g=makePart(id);put(g,box(.20,1.06,.23,M.steel,.065),0,.5,0);put(g,box(.48,.15,.38,M.plastic,.045),0,.01,0);const pad=slab(.99,.23,.54,M.plastic,.17);if(id==='armL')put(g,pad,0,1.04,0);else{pristine(g,pad,0,1.04,0);damage(g,box(.70,.23,.54,M.plastic,.10),-.145,1.04,0);damage(g,box(.24,.23,.51,M.plastic,.07),.39,1.04,.045,0,.16,-.07);damage(g,box(.055,.17,.49,M.black,.003),.25,1.07,0,0,.16,.12)}});
 // Estrutura metálica em estrela, quatro rodízios integrados; o quinto é uma peça própria.
 const base=makePart('base');put(base,cyl(.34,.42,.28,M.plastic),0,.62,0);
 function wheel(parent,x,y,z,damaged=false){const g=G();put(parent,g,x,y,z);put(g,box(.19,.36,.27,M.plastic,.045),0,.29,0);const arc=damaged?Math.PI*1.56:Math.PI*2,start=damaged?.30:0;[-.10,.10].forEach(xx=>{put(g,cyl(.24,.24,.13,M.rubber,40,arc,start),xx,.20,0,0,0,Math.PI/2);put(g,cyl(.11,.11,.14,M.steel,24,arc,start),xx,.20,0,0,0,Math.PI/2)});put(g,cyl(.04,.04,.37,M.metal,16),0,.20,0,0,0,Math.PI/2);return g}
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const leg=G();put(base,leg,0,0,0,0,a,0);wornMaterial(put(leg,box(.30,.18,2.0,M.steel,.07),0,.61,1.01),M.steel,M.rust);put(leg,box(.37,.19,.38,M.plastic,.065),0,.57,1.94);if(i)wheel(leg,0,0,2.02)}
 const caster=makePart('caster');pristine(caster,wheel(G(),0,0,0));damage(caster,wheel(G(),0,0,0,true));
 const piston=makePart('piston');put(piston,cyl(.23,.27,1.05,M.plastic,40),0,.53,0);const stem=put(piston,cyl(.13,.13,.74,M.metal,40),0,1.26,0);put(piston,cyl(.29,.29,.075,M.steel,36),0,1.02,0);put(piston,box(1.04,.16,.81,M.plastic,.10),0,1.68,0);damage(piston,box(.015,.26,.014,material('#6c746c',.7)),.129,1.28,.019,0,0,-.09);
 const screws=makePart('screws');for(let i=0;i<6;i++){const x=(i%3)*.37-.37,z=Math.floor(i/3)*.28-.14;put(screws,cyl(.041,.041,.55,M.metal,16),x,.065,z,0,0,Math.PI/2);put(screws,cyl(.09,.09,.075,M.steel,6),x-.27,.065,z,0,0,Math.PI/2);for(let j=0;j<3;j++)put(screws,cyl(.05,.05,.015,M.steel,14),x+.07+j*.048,.065,z,0,0,Math.PI/2)}
 const assembled={seat:{p:[0,2.72,.08],r:[0,0,0]},back:{p:[0,4.46,-1.30],r:[0,0,0]},armL:{p:[-1.65,2.77,.18],r:[0,0,0]},armR:{p:[1.65,2.77,.18],r:[0,0,0]},base:{p:[0,.15,0],r:[0,0,0]},piston:{p:[0,.98,0],r:[0,0,0]},caster:{p:[0,.15,2.02],r:[0,0,0]},screws:{p:[0,2.57,.36],r:[0,0,0]}};
 const exploded={seat:{p:[0,4.25,.50],r:[0,0,0]},back:{p:[0,6.55,-1.3],r:[0,0,0]},armL:{p:[-2.65,4.1,.18],r:[0,0,-.12]},armR:{p:[2.65,4.1,.18],r:[0,0,.12]},base:{p:[0,.15,0],r:[0,0,0]},piston:{p:[0,1.60,0],r:[0,0,0]},caster:{p:[1.8,.15,2.65],r:[0,.4,0]},screws:{p:[2.75,2.15,.18],r:[0,0,0]}};
 const onTable={seat:{p:[-4.65,1.88,2.43],r:[0,.06,0]},back:{p:[-1.37,1.86,1.48],r:[-Math.PI/2,0,0]},armL:{p:[2.20,1.73,1.85],r:[0,.03,0]},armR:{p:[4.75,1.73,1.85],r:[0,-.12,0]},base:{p:[-3.95,1.73,-1.40],r:[0,.37,0]},piston:{p:[-.35,1.73,-1.40],r:[0,0,0]},caster:{p:[2.55,1.73,-1.15],r:[0,.3,0]},screws:{p:[4.95,1.73,-1.23],r:[0,0,0]}};
 let worn=false,inspector=null;
 function setWorn(value){worn=!!value;wornNodes.forEach(n=>n.visible=worn);newNodes.forEach(n=>n.visible=!worn);changes.forEach(({node,a,b})=>node.mat=worn?b:a)}
 function layout(map){Object.entries(parts).forEach(([id,g])=>{g.p=[...map[id].p];g.r=[...map[id].r];g.s=[1,1,1];g.visible=true})}
 function settleOnTable(){Object.values(parts).forEach(g=>{const clone=g.clone();clone.p[1]=0;const bb=bounds(clone);g.p[1]=1.695-bb.min[1];});}
 function stage(phase){room.visible=true;inspectorGroup.visible=false;partsGroup.visible=true;display.visible=!['triage','results'].includes(phase);tableGroup.visible=['triage','results'].includes(phase);setWorn(!['welcome','story','new'].includes(phase));layout(phase==='disassembly'?exploded:phase==='triage'||phase==='results'?onTable:assembled);if(['triage','results'].includes(phase))settleOnTable();}
 function inspect(id){inspectorGroup.children=[];const g=parts[id].clone();g.p=[0,0,0];g.r=[0,0,0];g.s=[1,1,1];inspectorGroup.add(g);const b=bounds(g);g.p=[-(b.min[0]+b.max[0])/2,-b.min[1]+.13,-(b.min[2]+b.max[2])/2];inspector=g;partsGroup.visible=false;tableGroup.visible=false;display.visible=true;inspectorGroup.visible=true;return{height:b.max[1]-b.min[1],size:Math.max(...b.max.map((x,i)=>x-b.min[i]))}}
 function bounds(node){let min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];function walk(o,parent){if(!o.visible)return;const w=E.mul(parent,E.compose(o.p,o.r,o.s));if(o.geo){const p=o.geo.p;for(let i=0;i<p.length;i+=3){const v=E.transform(w,[p[i],p[i+1],p[i+2]]);v.forEach((x,j)=>{min[j]=Math.min(min[j],x);max[j]=Math.max(max[j],x)})}}o.children.forEach(c=>walk(c,w))}walk(node,E.identity());return{min,max}}
 function resetInspector(){inspectorGroup.visible=false;inspectorGroup.children=[];inspector=null}
 function place(id,category,placements){
  const g=parts[id],cat=bins[category];if(!cat)return;
  const ids=MC_CONTENT.parts.filter(p=>placements[p.id]===category).map(p=>p.id),slot=Math.max(0,ids.indexOf(id)),columns=ids.length===1?1:2,rows=Math.ceil(ids.length/columns);
  g.r=[...onTable[id].r];g.s=[1,1,1];g.p=[0,0,0];const bb=bounds(g),size=bb.max.map((v,i)=>v-bb.min[i]);
  const cellW=2.10/columns,cellD=1.38/rows,scale=Math.min(.56,(cellW-.08)/size[0],(cellD-.08)/size[2],1.18/size[1]);
  g.s=[scale,scale,scale];g.p=[cat.center[0]+(slot%columns-(columns-1)/2)*cellW-(bb.min[0]+bb.max[0])/2*scale,2.79-bb.min[1]*scale,cat.center[2]+(Math.floor(slot/columns)-(rows-1)/2)*cellD-(bb.min[2]+bb.max[2])/2*scale];
 }

 function restorePlacements(placements){layout(onTable);settleOnTable();Object.entries(placements).forEach(([id,cat])=>{if(parts[id]&&bins[cat])place(id,cat,placements)})}
 function atAnchor(id){const g=parts[id];if(!g)return[0,0,0];const off={seat:[0,.55,0],back:[0,.4,.3],armL:[0,1.25,0],armR:[0,1.25,0],base:[0,.95,0],piston:[0,.58,0],caster:[0,.65,0],screws:[0,.4,0]}[id];return R.worldPoint(g,off)}
 function testAnimation(id,t){const w=Math.sin(Math.PI*t);if(inspector){if(id==='piston'){const descendants=[];const rec=n=>{if(n.geo)descendants.push(n);n.children.forEach(rec)};rec(inspector);const st=descendants[1],plate=descendants[3];if(st)st.p[1]=1.26-(worn?.36:.04)*w;if(plate)plate.p[1]=1.68-(worn?.36:.04)*w}else if(id==='caster')inspector.r[2]=(worn?.17:.06)*Math.sin(t*Math.PI*5);else if(id==='armL'||id==='armR')inspector.r[2]=(id==='armR'&&worn?.065:.01)*Math.sin(t*Math.PI*4);else inspector.r[1]=Math.sin(t*Math.PI*2)*.32}}
 stage('welcome');return{R,parts,bins,room,display,tableGroup,partsGroup,inspectorGroup,assembled,exploded,onTable,stage,setWorn,inspect,resetInspector,layout,place,restorePlacements,atAnchor,testAnimation,bounds,materials:M};
}
