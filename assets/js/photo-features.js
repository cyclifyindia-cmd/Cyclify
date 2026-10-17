/* Shared, deterministic preprocessing and cosine ranking for catalogue photo search. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CyclifyPhotoFeatures=factory();})(typeof window!=='undefined'?window:this,function(){
  'use strict';
  function bounds(data,width,height){
    let left=width,top=height,right=-1,bottom=-1,white=0;
    const corners=[[0,0],[width-1,0],[0,height-1],[width-1,height-1]];
    for(const [x,y] of corners){const p=(y*width+x)*4;if(data[p+3]<32||Math.min(data[p],data[p+1],data[p+2])>235)white++;}
    if(white<3)return {x:0,y:0,width,height};
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){const p=(y*width+x)*4;if(data[p+3]>32&&Math.min(data[p],data[p+1],data[p+2])<232){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}}
    if(right<left||bottom<top||(right-left)*(bottom-top)<width*height*.025)return {x:0,y:0,width,height};
    const pad=Math.ceil(Math.max(right-left,bottom-top)*.035);left=Math.max(0,left-pad);top=Math.max(0,top-pad);right=Math.min(width-1,right+pad);bottom=Math.min(height-1,bottom+pad);
    return {x:left,y:top,width:right-left+1,height:bottom-top+1};
  }
  function normalise(values){let n=0;for(const v of values)n+=v*v;n=Math.sqrt(n)||1;return Float32Array.from(values,v=>v/n);}
  function flatBounds(data,width,height){
    const corners=[[0,0],[width-1,0],[0,height-1],[width-1,height-1]].map(([x,y])=>{const p=(y*width+x)*4;return data[p+3]<32?[255,255,255]:[data[p],data[p+1],data[p+2]];});
    const background=[0,1,2].map(c=>corners.reduce((sum,v)=>sum+v[c],0)/4);
    if(corners.some(v=>v.some((c,i)=>Math.abs(c-background[i])>18)))return {x:0,y:0,width,height};
    let left=width,top=height,right=-1,bottom=-1;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){const p=(y*width+x)*4;if(data[p+3]>32&&Math.max(Math.abs(data[p]-background[0]),Math.abs(data[p+1]-background[1]),Math.abs(data[p+2]-background[2]))>45){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}}
    if(right<left||bottom<top||(right-left)*(bottom-top)<width*height*.025)return {x:0,y:0,width,height};
    const pad=Math.ceil(Math.max(right-left,bottom-top)*.035);left=Math.max(0,left-pad);top=Math.max(0,top-pad);right=Math.min(width-1,right+pad);bottom=Math.min(height-1,bottom+pad);return {x:left,y:top,width:right-left+1,height:bottom-top+1};
  }
  function quantise(values){const max=Math.max(...values)||1;return Uint8Array.from(values,v=>Math.round(Math.max(0,v)/max*255));}
  function cosine(a,b){if(a.length!==b.length)return -1;let score=0;for(let i=0;i<a.length;i++)score+=a[i]*b[i];return score;}
  function fingerprint(data,channels=3){const blocks=new Float32Array(256);let mean=0;for(let by=0;by<16;by++)for(let bx=0;bx<16;bx++){let sum=0;for(let y=by*14;y<(by+1)*14;y++)for(let x=bx*14;x<(bx+1)*14;x++){const p=(y*224+x)*channels;sum+=data[p]*.299+data[p+1]*.587+data[p+2]*.114;}const value=sum/196;blocks[by*16+bx]=value;mean+=value;}mean/=256;return normalise(blocks.map(v=>v-mean));}
  function packFingerprint(values){return Uint8Array.from(values,v=>Math.max(0,Math.min(255,Math.round(v*512+128))));}
  function unpackFingerprint(bytes){return normalise(Float32Array.from(bytes,v=>(v-128)/512));}
  function rank(targets,entries,products){
    const byId=new Map(products.map(p=>[String(p.id),p])),best=new Map();
    for(const entry of entries){const p=byId.get(String(entry.id));if(!p||p.image!==entry.primary)continue;let score=-1;for(const t of targets){const semantic=cosine(t.values||t,entry.values);let bonus=0;if(t.fingerprint&&entry.fingerprintValues&&semantic>.65){const shape=cosine(t.fingerprint,entry.fingerprintValues);bonus=Math.max(0,shape-.82)*.65;}score=Math.max(score,semantic+bonus);}if(score>(best.get(String(p.id))?.visualScore??-1))best.set(String(p.id),{...p,visualScore:score});}
    const ranked=[...best.values()].sort((a,b)=>b.visualScore-a.visualScore),top=ranked[0]?.visualScore||0;
    // Do not force a list of unrelated products when the model has no plausible match.
    const threshold=Math.max(.68,top-.15);
    return ranked.filter(p=>p.visualScore>=threshold).slice(0,24);
  }
  return {bounds,flatBounds,normalise,quantise,cosine,fingerprint,packFingerprint,unpackFingerprint,rank,version:'mobilenet-v2-050-fit-v1'};
});
