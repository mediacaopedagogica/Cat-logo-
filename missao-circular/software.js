/* Renderizador de compatibilidade: modelos 3D reais com z-buffer e texturas,
 * sem WebGL nem dependências externas. A seleção usa o mesmo buffer de profundidade.
 * Iluminação difusa interpolada; os reflexos e as sombras detalhadas usam WebGL2.
 */
'use strict';
MC3D.SoftwareRenderer=class{
 constructor(canvas){
  this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});if(!this.ctx)throw Error('Canvas indisponível');
  this.root=new MC3D.Node();this.eye=[7,7,11];this.target=[0,2.5,0];this.fov=40*Math.PI/180;
  this.width=1;this.height=1;this.exposure=.98;this.highlight=0;this.shadows=false;this.software=true;
  this.textureCache=new WeakMap();this.tone=new Uint8Array(16384);
  for(let i=0;i<this.tone.length;i++){const x=i/4096;this.tone[i]=Math.round(Math.pow(Math.min(1,x*(2.51*x+.03)/(x*(2.43*x+.59)+.14)),1/2.2)*255)}
  this.resize();
 }
 resize(){const r=this.canvas.getBoundingClientRect();this.width=Math.max(1,r.width);this.height=Math.max(1,r.height);
  this.k=Math.min(1,960/this.width);const w=Math.max(1,Math.round(this.width*this.k)),h=Math.max(1,Math.round(this.height*this.k));
  if(w!==this.canvas.width||h!==this.canvas.height||!this.image){this.canvas.width=w;this.canvas.height=h;this.image=this.ctx.createImageData(w,h);this.pixels=new Uint32Array(this.image.data.buffer);this.depth=new Float32Array(w*h);this.ids=new Uint8Array(w*h)}
 }
 update(){const E=MC3D;this.vp=E.mul(E.perspective(this.fov,this.width/this.height),E.look(this.eye,this.target));this.forward=E.V.norm(E.V.sub(this.target,this.eye));this.draws=[];
  const walk=(n,p,id=0)=>{if(!n.visible)return;n.world=E.mul(p,E.compose(n.p,n.r,n.s));id=n.pickId||id;if(n.geo)this.draws.push({node:n,id});n.children.forEach(c=>walk(c,n.world,id))};walk(this.root,E.identity());
 }
 project(p){const q=MC3D.transform(this.vp,p),d=MC3D.V.dot(MC3D.V.sub(p,this.eye),this.forward);return{x:(q[0]+1)*.5*this.width,y:(1-q[1])*.5*this.height,z:q[2],visible:d>.1&&q[2]>-1&&q[2]<1}}
 worldPoint(node,p=[0,0,0]){return MC3D.transform(node.world,p)}
 rayOnPlane(x,y,height){const V=MC3D.V,f=V.norm(V.sub(this.target,this.eye)),right=V.norm(V.cross(f,[0,1,0])),up=V.cross(right,f),nx=(x/this.width*2-1)*Math.tan(this.fov/2)*this.width/this.height,ny=(1-y/this.height*2)*Math.tan(this.fov/2),dir=V.norm(V.add(f,V.add(V.mul(right,nx),V.mul(up,ny))));const t=(height-this.eye[1])/dir[1];return t>0?V.add(this.eye,V.mul(dir,t)):null}
 texture(t){if(!t)return null;if(this.textureCache.has(t))return this.textureCache.get(t);
  const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(t,0,0,256,256);const bytes=ctx.getImageData(0,0,256,256).data,data=new Float32Array(256*256*3);
  for(let i=0,j=0;i<bytes.length;i+=4){data[j++]=Math.pow(bytes[i]/255,2.2);data[j++]=Math.pow(bytes[i+1]/255,2.2);data[j++]=Math.pow(bytes[i+2]/255,2.2)}
  this.textureCache.set(t,data);return data;
 }
 render(){const begun=performance.now();this.resize();this.update();const E=MC3D,V=E.V,light=V.norm([-7,13,9]),vp=this.vp,fw=this.forward,eye=this.eye,k=this.k;
  this.pixels.fill(0xffe7eeeb);this.depth.fill(Infinity);this.ids.fill(0);
  // Front-to-back mesh order reduces overdraw. Per-pixel depth remains authoritative.
  const draws=[...this.draws].sort((a,b)=>V.dot(V.sub([a.node.world[12],a.node.world[13],a.node.world[14]],eye),fw)-V.dot(V.sub([b.node.world[12],b.node.world[13],b.node.world[14]],eye),fw));
  for(const {node,id}of draws){const g=node.geo,m=node.mat||{},p=g.p,n=g.n,uv=g.u,w=node.world,vertices=[],base=m.linearColor||(m.linearColor=E.color(m.color||'#ffffff')),rep=m.repeat||[1,1],metal=m.metal||0;
   for(let i=0,j=0;i<p.length;i+=3,j+=2){const x=p[i],y=p[i+1],z=p[i+2],wx=w[0]*x+w[4]*y+w[8]*z+w[12],wy=w[1]*x+w[5]*y+w[9]*z+w[13],wz=w[2]*x+w[6]*y+w[10]*z+w[14];
    const nn=V.norm([w[0]*n[i]+w[4]*n[i+1]+w[8]*n[i+2],w[1]*n[i]+w[5]*n[i+1]+w[9]*n[i+2],w[2]*n[i]+w[6]*n[i+1]+w[10]*n[i+2]]),nl=Math.max(0,V.dot(nn,light)),hemi=nn[1]*.5+.5;
    const cw=vp[3]*wx+vp[7]*wy+vp[11]*wz+vp[15],cx=vp[0]*wx+vp[4]*wy+vp[8]*wz+vp[12],cy=vp[1]*wx+vp[5]*wy+vp[9]*wz+vp[13],cz=vp[2]*wx+vp[6]*wy+vp[10]*wz+vp[14];
    const shade=(.30+.38*hemi+nl*.80+(m.emit||0))*(1-metal*.12);
    vertices.push({cx,cy,cz,cw,u:uv[j]*rep[0],v:uv[j+1]*rep[1],shade,nn,world:[wx,wy,wz]});
   }
   const tex=this.texture(m.texture),spec=metal*.045;const material={base,tex,spec,highlight:id===this.highlight&&id>0,id};
   for(let j=0;j<g.idx.length;j+=3){const a=vertices[g.idx[j]],b=vertices[g.idx[j+1]],c=vertices[g.idx[j+2]];const nn=V.add(V.add(a.nn,b.nn),c.nn),center=V.mul(V.add(V.add(a.world,b.world),c.world),1/3);if(V.dot(nn,V.sub(eye,center))<-.005)continue;
    let poly=[a,b,c],out=[];for(let i=0;i<poly.length;i++){const x=poly[i],y=poly[(i+1)%poly.length],d1=x.cw-.1,d2=y.cw-.1;if(d1>=0)out.push(x);if((d1>=0)!==(d2>=0)){const t=d1/(d1-d2),v={};for(const key of['cx','cy','cz','cw','u','v','shade'])v[key]=x[key]+(y[key]-x[key])*t;out.push(v)}}
    if(out.length<3)continue;const screen=out.map(v=>{const iw=1/v.cw;return{x:(v.cx*iw+1)*.5*this.canvas.width,y:(1-v.cy*iw)*.5*this.canvas.height,z:v.cz*iw,iw,u:v.u*iw,v:v.v*iw,shade:v.shade*iw}});
    for(let i=1;i<screen.length-1;i++)this.triangle(screen[0],screen[i],screen[i+1],material);
   }
  }
  this.ctx.putImageData(this.image,0,0);this.lastFrameMs=Math.round(performance.now()-begun);
 }
 triangle(a,b,c,m){const W=this.canvas.width,H=this.canvas.height,area=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);if(Math.abs(area)<.015)return;
  const minX=Math.max(0,Math.ceil(Math.min(a.x,b.x,c.x)-.5)),maxX=Math.min(W-1,Math.floor(Math.max(a.x,b.x,c.x)-.5)),minY=Math.max(0,Math.ceil(Math.min(a.y,b.y,c.y)-.5)),maxY=Math.min(H-1,Math.floor(Math.max(a.y,b.y,c.y)-.5));if(minX>maxX||minY>maxY)return;
  const inv=1/area,x0=(b.y-c.y)*inv,y0=(c.x-b.x)*inv,x1=(c.y-a.y)*inv,y1=(a.x-c.x)*inv;
  let row0=((b.x-(minX+.5))*(c.y-(minY+.5))-(b.y-(minY+.5))*(c.x-(minX+.5)))*inv;
  let row1=((c.x-(minX+.5))*(a.y-(minY+.5))-(c.y-(minY+.5))*(a.x-(minX+.5)))*inv;
  const depth=this.depth,pixels=this.pixels,ids=this.ids,tone=this.tone,tex=m.tex,base=m.base,ex=this.exposure*4096,add=m.highlight?[.014,.044,.024]:[0,0,0];
  for(let y=minY;y<=maxY;y++){let q0=row0,q1=row1,off=y*W+minX;for(let x=minX;x<=maxX;x++,off++,q0+=x0,q1+=x1){const q2=1-q0-q1;if(q0<-.00001||q1<-.00001||q2<-.00001)continue;const z=q0*a.z+q1*b.z+q2*c.z;if(z>=depth[off]||z>1)continue;
    const iw=q0*a.iw+q1*b.iw+q2*c.iw,shade=(q0*a.shade+q1*b.shade+q2*c.shade)/iw;
    let tr=1,tg=1,tb=1;if(tex){let u=(q0*a.u+q1*b.u+q2*c.u)/iw,v=(q0*a.v+q1*b.v+q2*c.v)/iw;u=u-Math.floor(u);v=v-Math.floor(v);const t=(((Math.floor((1-v)*255)&255)*256)+(Math.floor(u*255)&255))*3;tr=tex[t];tg=tex[t+1];tb=tex[t+2]}
    const r=tone[Math.min(16383,Math.max(0,((base[0]*tr*(shade+m.spec)+add[0])*ex)|0))],g=tone[Math.min(16383,Math.max(0,((base[1]*tg*(shade+m.spec)+add[1])*ex)|0))],b0=tone[Math.min(16383,Math.max(0,((base[2]*tb*(shade+m.spec)+add[2])*ex)|0))];
    pixels[off]=(255<<24)|(b0<<16)|(g<<8)|r;depth[off]=z;ids[off]=m.id;
   }row0+=y0;row1+=y1;
  }
 }
 pick(x,y){const xx=Math.max(0,Math.min(this.canvas.width-1,Math.floor(x*this.k))),yy=Math.max(0,Math.min(this.canvas.height-1,Math.floor(y*this.k)));return this.ids[yy*this.canvas.width+xx]||0}
};
