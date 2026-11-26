const {chromium}=require('playwright');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});const p=await b.newPage({viewport:{width:300,height:200}});
await p.goto('http://localhost:8130/index.html');await p.waitForFunction(()=>globalThis.__skinBridge?.visible,null,{timeout:90000});await sleep(1000);
console.log(JSON.stringify(await p.evaluate(()=>{const br=globalThis.__skinBridge;const out={meshes:[]};
 br.visual.traverse(o=>{if(!o.isSkinnedMesh)return;const g=o.geometry,si=g.attributes.skinIndex,sw=g.attributes.skinWeight,pos=g.attributes.position,bones=o.skeleton.bones;const n=si.count;const name=i=>bones[i]?.name.replace('mixamorig:','');
  const st={name:o.name,verts:n,influencesPerVertex:si.itemSize,badSum:0,zeroWeight:0,wrist:{},fingerCross:0,fingerVerts:0};
  for(const side of ['Left','Right']){let tot=0,hard=0,blend=0,handOnly=0,foreOnly=0;const hi=bones.findIndex(b=>b.name.endsWith(side+'Hand')),fi=bones.findIndex(b=>b.name.endsWith(side+'ForeArm'));if(hi<0)continue;
   // wrist band: vertices whose dominant bone is Hand or ForeArm and with any Hand/ForeArm weight, near the wrist joint (bind space)
   const V=new (bones[0].position.constructor)(),wristBind=new (bones[0].position.constructor)().setFromMatrixPosition(o.skeleton.boneInverses[hi].clone().invert());
   for(let v=0;v<n;v++){let wh=0,wf=0,s=0;for(let k=0;k<si.itemSize;k++){const w=sw.getComponent(v,k),b=si.getComponent(v,k);s+=w;if(b===hi)wh+=w;if(b===fi)wf+=w}
    if(wh+wf<.5)continue;V.fromBufferAttribute(pos,v);if(V.distanceTo(wristBind)>.06*(1/ (o.matrixWorld.getMaxScaleOnAxis()||1))&&false)continue;
    // distance in bind space units of the mesh
    const d=V.distanceTo(wristBind);if(d>0.06/ (o.parent?1:1) && d>Math.max(0.06,0))continue;tot++;if(wh>.98)handOnly++;else if(wf>.98)foreOnly++;else blend++}
   st.wrist[side]={vertsNearWrist:tot,handOnly,foreOnly,blended:blend}}
  for(let v=0;v<n;v++){let s=0,fing=new Set();for(let k=0;k<si.itemSize;k++){const w=sw.getComponent(v,k);s+=w;const nm=name(si.getComponent(v,k));if(w>.05&&/Hand(Index|Middle|Ring|Pinky|Thumb)/.test(nm||''))fing.add(nm.replace(/\d$/,''))}if(Math.abs(s-1)>.02)st.badSum++;if(s<1e-4)st.zeroWeight++;if(fing.size){st.fingerVerts++;if(fing.size>2)st.fingerCross++}}
  st.unitScale=o.matrixWorld.getMaxScaleOnAxis();out.meshes.push(st)});return out})))
await b.close()})();
