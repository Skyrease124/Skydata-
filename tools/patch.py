#!/usr/bin/env python3
"""Build V0.9 index.html from the V0.8 source (tools/v08.html) + tools/head.html. Every replacement is asserted."""
import re,sys,pathlib
root=pathlib.Path(__file__).resolve().parent.parent
src=(root/'tools'/'v08.html').read_text()
head=(root/'tools'/'head.html').read_text()
js=src[src.index('<script type="module">')+len('<script type="module">'):]

def rep(old,new,count=1):
    global js
    assert js.count(old)>=1,'missing: '+old[:70]
    js=js.replace(old,new,count)

def between(start,end,new,include_end=False):
    global js
    a=js.index(start);b=js.index(end,a)+(len(end) if include_end else 0)
    js=js[:a]+new+js[b:]

# ---------- 1. sources: bundled locally, availability checked at startup ----------
between("// Remote sources are opt-in","const startupOrder=['sam','casual','andre','walker'];\n",'''// V0.9: every character is a LOCAL file. A source whose file does not exist is listed but disabled (checked at startup).
const sources = {
  custom: { label:'Custom human', url:'./assets/characters/hero-real.glb', required:['idle','walk','sprint'], credit:'User supplied character; verify its asset license.' },
  sam: { label:'Sam · MakeHuman locomotion', url:'./assets/characters/sam.glb', baked:'./assets/anims/ual-to-sam.json', required:['idle','walk','jog','sprint'], clipAliases:{walk:['Walk_Brisk']}, clipSpeeds:{walk:1.7,jog:2.58,sprint:4.28,crouchWalk:0.58}, credit:'Sam: Innerscene, adapted from MakeHuman / MPFB CC0 assets (CC0). Jump, fall, land and crouch motion: Quaternius Universal Animation Library (CC0), retargeted offline to Sam. Three.js r170 (MIT) is bundled.', },
  casual: { label:'Casual Man · textured human', url:'./assets/characters/casual-man.glb', required:['idle','walk','sprint'], credit:'Casual Man by vinish.dev, CC BY 4.0.', walkSpeed:1.3, runSpeed:3.2 },
  andre: { label:'Andre · detailed face / mocap', url:'./assets/characters/andre_casual.glb', required:['idle','walk'], credit:'Microsoft Rocketbox Avatar Library (MIT).' },
  walker: { label:'Casual Walker · hoodie', url:'./assets/characters/casual-walker.glb', required:['idle','walk'], credit:'Casual Walker by tevy, CC0 1.0.', walkOnly:true, walkSpeed:1.3 },
  proxy: { label:'Development proxy (offline)', url:'./assets/hero.glb', required:['idle','walk','sprint'], credit:'Original development placeholder; not the final human.' }
};
const startupOrder=['sam','proxy'];
let bundled=null;async function sourceExists(url){try{bundled??=await fetch('./assets/manifest.json',{cache:'no-cache'}).then(r=>r.ok?r.json():{files:[]}).catch(()=>({files:[]}));return bundled.files.includes(url.replace(/^\\.\\//,''))}catch(e){return false}} // the manifest is authoritative; a transient HEAD failure must not disable Sam
let bakedCache=null;async function loadBaked(url){if(!bakedCache){const e=window.__early?.[url];if(e)delete window.__early[url];bakedCache=(e?e.p:fetch(url)).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).catch(err=>{bakedCache=null;throw err})}return bakedCache}
function applyArmFix(clip,fx){const drop=new Set(Object.keys(fx.quats).map(b=>b+'.quaternion')),tracks=clip.tracks.filter(t=>!drop.has(t.name)),times=[...fx.times,fx.duration];for(const [bone,arr] of Object.entries(fx.quats))tracks.push(new T.QuaternionKeyframeTrack(bone+'.quaternion',times,[...arr,...arr.slice(0,4)]));return new T.AnimationClip(clip.name+' (arms phase-corrected)',clip.duration,tracks)}\nfunction bakedClips(b){const out={};for(const [state,c] of Object.entries(b.clips)){const times=[...c.times],tracks=[];if(c.loop)times.push(c.duration);const wrap=(arr,n)=>c.loop?[...arr,...arr.slice(0,n)]:arr;for(const [bone,arr] of Object.entries(c.quats))tracks.push(new T.QuaternionKeyframeTrack(bone+'.quaternion',times,wrap(arr,4)));for(const [bone,arr] of Object.entries(c.pos))tracks.push(new T.VectorKeyframeTrack(bone+'.position',times,wrap(arr,3)));for(const [bone,q] of Object.entries(b.fingers))tracks.push(new T.QuaternionKeyframeTrack(bone+'.quaternion',[0,c.duration],[...q,...q]));out[state]=new T.AnimationClip('ual · '+state,c.duration,tracks)}return out}
''',include_end=True)

rep("function clipSpeed(source,state){return","function clipSpeed(source,state){if(source.clipSpeeds&&source.clipSpeeds[state])return source.clipSpeeds[state];return")

# ---------- 2. leg solver (works for attached AND detached IK-style foot bones) ----------
between("function createFootIK(model){","\n\n\n\n\n\n\n\nconst $=s=>",'''function createLegSolver(model){const bones=[];model.traverse(n=>{if(n.isBone)bones.push(n)});model.updateWorldMatrix(true,true);const legs=[];
 for(const aliases of Object.values(names)){const [hip,knee,foot]=aliases.map(x=>get(bones,x));if(!hip||!knee||!foot)continue;const h=hip.getWorldPosition(v()),k=knee.getWorldPosition(v()),f=foot.getWorldPosition(v());legs.push({hip,knee,foot,detached:!ancestor(knee,foot),a:h.distanceTo(k),b:k.distanceTo(f),sole:f.y,previous:null,lock:null,weight:0,original:null});}
 let drift=0,contacts=0;
 // Restore the animated pose before the next mixer update (covers bones with no animated tracks).
 function restore(){for(const l of legs)if(l.original){l.hip.quaternion.copy(l.original[0]);l.knee.quaternion.copy(l.original[1]);l.foot.quaternion.copy(l.original[2]);l.foot.position.copy(l.original[3]);l.original=null;}}
 function reset(){restore();for(const l of legs){l.previous=null;l.lock=null;l.weight=0;}drift=0;contacts=0;}
 function update(dt,{lock=false,solve=false}={}){if(!(lock||solve)||dt<=0||dt>.06){for(const l of legs){l.previous=null;l.lock=null;l.weight=0}drift=0;contacts=0;return;}model.updateWorldMatrix(true,true);drift=0;contacts=0;
 for(const l of legs){const h=l.hip.getWorldPosition(v()),k=l.knee.getWorldPosition(v()),f=l.foot.getWorldPosition(v());let target=f.clone();
  if(lock){const prev=l.previous;l.previous=f.clone();if(prev){const horizontal=Math.hypot(f.x-prev.x,f.z-prev.z)/dt;const contact=isContact({height:f.y-l.sole,verticalSpeed:(f.y-prev.y)/dt,horizontalSpeed:horizontal,locked:!!l.lock&&l.weight>.5});if(contact&&!l.lock)l.lock=f.clone();const keep=contact&&l.lock&&l.lock.distanceTo(f)<.20;l.weight=smooth(l.weight,keep?1:0,dt,.06);if(l.lock&&(l.lock.distanceTo(f)>.20||l.weight<.015)){l.lock=null;l.weight=0}if(l.lock&&keep){contacts++;drift+=horizontal;target=f.clone().lerp(l.lock,Math.min(.85,l.weight));}}}
  else{l.previous=null;l.lock=null;l.weight=0}
  if(target.y<l.sole)target.y=l.sole; // never sink the ankle below its standing height
  if(!solve&&target.distanceTo(f)<1e-5)continue;
  const dir=target.clone().sub(h),d=dir.length(),g=kneeGeometry(l.a,l.b,d);if(!g||d<.001)continue;dir.normalize();const bend=k.clone().sub(h);bend.addScaledVector(dir,-bend.dot(dir));if(bend.lengthSq()<1e-6)continue;bend.normalize();
  const newK=h.clone().addScaledVector(dir,g.along).addScaledVector(bend,g.side),newF=h.clone().addScaledVector(dir,g.reach);
  l.original=[l.hip.quaternion.clone(),l.knee.quaternion.clone(),l.foot.quaternion.clone(),l.foot.position.clone()];
  const footWorld=l.foot.getWorldQuaternion(new T.Quaternion()),shin=f.clone().sub(k),thighFrom=k.clone().sub(h),thighTo=newK.clone().sub(h);
  shin.applyQuaternion(new T.Quaternion().setFromUnitVectors(thighFrom.clone().normalize(),thighTo.clone().normalize())); // the shin turns with the thigh
  orient(l.hip,thighFrom,thighTo);const currentK=l.knee.getWorldPosition(v());orient(l.knee,shin,newF.clone().sub(currentK));
  if(l.detached){l.foot.parent.updateWorldMatrix(true,false);l.foot.position.copy(l.foot.parent.worldToLocal(newF.clone()));l.foot.updateWorldMatrix(false,true)}
  else{l.foot.quaternion.copy(l.foot.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(footWorld));l.foot.updateWorldMatrix(false,true)}
 }}
 return {restore,reset,update,get count(){return legs.length},get contacts(){return contacts},get drift(){return contacts?drift/contacts:0},get detached(){return legs.some(l=>l.detached)}};
}

// V0.9 natural motion layer: small additive, world-axis corrections applied after the mixer (breathing, weight shift,
// counter-rotating torso/shoulders and arm swing). Everything fades out in the air, while landing and when disabled.
const AX=new T.Vector3(1,0,0),AY=new T.Vector3(0,1,0),AZ=new T.Vector3(0,0,1);
const damp=(c,t,dt,tau)=>t+(c-t)*Math.exp(-Math.max(0,dt)/tau);
function createMotionLayer(model,rootNode){const bones=[];model.traverse(n=>{if(n.isBone)bones.push(n)});const find=(...ns)=>{for(const n of ns){const b=bones.find(x=>x.name===n);if(b)return b}return null};
 const B={pelvis:find('pelvis','Hips','hips'),sp2:find('spine_02','Spine1'),sp3:find('spine_03','Spine2'),neck:find('neck_01','Neck'),head:find('head','Head'),cl:find('clavicle_l','LeftShoulder'),cr:find('clavicle_r','RightShoulder'),al:find('upperarm_l','LeftArm'),ar:find('upperarm_r','RightArm'),fl:find('lowerarm_l','LeftForeArm'),fr:find('lowerarm_r','RightForeArm')};
 const footL=get(bones,names.left[2]),footR=get(bones,names.right[2]);if(!B.pelvis||!B.sp3||!B.head||!B.al||!B.ar||!B.cl||!B.cr||!footL||!footR)return null;
 const rootQ=new T.Quaternion(),qa=new T.Quaternion(),qb=new T.Quaternion(),qc=new T.Quaternion(),axis=new T.Vector3(),p0=new T.Vector3(),pL=new T.Vector3(),pR=new T.Vector3(),fwd=new T.Vector3();
 const S={t:0,breath:0,m:0,s:0,lift:0,strength:0};
 function rot(bone,ax,angle){if(!bone||Math.abs(angle)<1e-5)return;axis.copy(ax).applyQuaternion(rootQ);qa.setFromAxisAngle(axis,angle);bone.getWorldQuaternion(qb).premultiply(qa);bone.parent.getWorldQuaternion(qc).invert();bone.quaternion.copy(qc.multiply(qb));bone.updateMatrixWorld(true)}
 function shift(bone,dx){axis.copy(AX).applyQuaternion(rootQ);bone.getWorldPosition(p0).addScaledVector(axis,dx);bone.parent.updateWorldMatrix(true,false);bone.position.copy(bone.parent.worldToLocal(p0));bone.updateMatrixWorld(true)}
 function apply(dt,o){const crouch=o.state.startsWith('crouch'),air=o.state==='jump'||o.state==='fall';const want=o.enabled&&o.grounded&&!air?(crouch?.55:1)*(1-Math.min(1,Math.max(0,o.landWeight)))*o.amount:0;S.strength=damp(S.strength,want,dt,.12);if(S.strength<.004)return false;
  const k=S.strength;S.t+=dt;rootNode.getWorldQuaternion(rootQ);model.updateWorldMatrix(true,true);
  S.m=damp(S.m,Math.min(1,o.speed/3.2),dt,.15);const m=S.m;
  fwd.copy(AZ).applyQuaternion(rootQ);B.pelvis.getWorldPosition(p0);footL.getWorldPosition(pL);footR.getWorldPosition(pR);
  S.s=damp(S.s,Math.max(-1,Math.min(1,((pL.x-p0.x)*fwd.x+(pL.z-p0.z)*fwd.z-((pR.x-p0.x)*fwd.x+(pR.z-p0.z)*fwd.z))/.55)),dt,.05);   // + : left foot forward
  S.lift=damp(S.lift,Math.max(-1,Math.min(1,(pL.y-pR.y)/.14)),dt,.06);                                                                 // + : left foot raised
  S.breath+=dt*(.23+.35*m)*Math.PI*2;const br=Math.sin(S.breath)*(.9+.5*m);
  const idle=(Math.sin(S.t*Math.PI*2/7.3)*.65+Math.sin(S.t*Math.PI*2/4.1+1.3)*.35)*(1-m);
  const roll=(-S.lift*m*.034+idle*.02)*k,twist=S.s*m*.075*k,swing=S.s*(.16*m)*k,flex=(.08+.26*Math.min(1,Math.max(0,(o.speed-1.4)/3.6)))*m*k;
  shift(B.pelvis,(-S.lift*m*.014+idle*.011)*k);rot(B.pelvis,AZ,roll);rot(B.pelvis,AY,-.3*twist);
  rot(B.sp2,AZ,-.55*roll);rot(B.sp2,AY,.45*twist);rot(B.sp3,AZ,-.25*roll);rot(B.sp3,AY,.55*twist);rot(B.sp3,AX,-br*.012*k);
  rot(B.cl,AZ,br*.010*k);rot(B.cr,AZ,-br*.010*k);rot(B.cl,AY,S.s*.035*m*k);rot(B.cr,AY,S.s*.035*m*k);
  rot(B.al,AX,swing);rot(B.ar,AX,-swing);rot(B.fl,AX,-flex);rot(B.fr,AX,-flex);
  rot(B.neck,AY,-.35*twist);rot(B.head,AY,-.3*twist);rot(B.head,AZ,.7*roll);rot(B.head,AX,br*.006*k);
  return true}
 return {apply,get strength(){return S.strength},get stride(){return S.s}};
}
''')

rep("footIK=createFootIK(candidate);","solver=createLegSolver(candidate);natural=createMotionLayer(candidate,root);")
rep("let gait={},gaitPhase=0,footIK=null,playing=new Set(),previousAudition=null;","let gait={},gaitPhase=0,solver=null,natural=null,playing=new Set(),previousAudition=null;")

# ---------- 3. install(): merge baked clips ----------
rep("function install(gltf,name,meta=sources.custom){","function install(gltf,name,meta=sources.custom,baked=null){")
rep("if(n)next[state]=gltf.animations.find(c=>c.name===n)}try{requireClips(next,meta)}","if(n)next[state]=gltf.animations.find(c=>c.name===n)}if(baked){const extra=bakedClips(baked);for(const [state,clip] of Object.entries(extra))if(!next[state])next[state]=clip}try{requireClips(next,meta)}")
rep("const names=gltf.animations.map(c=>c.name);","const names=gltf.animations.map(c=>c.name);const sourceClips=names.length;")
rep("for(const [state,clip] of Object.entries(extra))if(!next[state])next[state]=clip}try{requireClips(next,meta)}","for(const [state,clip] of Object.entries(extra))if(!next[state])next[state]=clip;if(baked.fixes)for(const [state,clip] of Object.entries(next)){const fx=baked.fixes[clip.name];if(fx)next[state]=applyArmFix(clip,fx)}}try{requireClips(next,meta)}")
rep("if(['jump','land'].includes(state)){a.setLoop(T.LoopOnce,1);a.clampWhenFinished=true}","if(ONE_SHOT.has(state)){a.setLoop(T.LoopOnce,1);a.clampWhenFinished=true}")
rep("refreshAudition(names,skinned);","refreshAudition(names,skinned,baked);")
rep("(['jump','fall','land','crouchIdle','crouchWalk'].filter(x=>!actions[x]).join(', ')||'none')+(meta.walkOnly?'. Walk only; run animation not supplied.':'. Use in-place clips; inspect foot alignment.');}","(['jump','fall','land','crouchIdle','crouchWalk'].filter(x=>!actions[x]).join(', ')||'none')+(baked?'. Retargeted jump/fall/land/crouch added.':'')+(meta.walkOnly?'. Walk only; run animation not supplied.':'')}")
rep("function refreshAudition(names,skinned){","function refreshAudition(names,skinned,baked){")
rep("$('#asset-details').textContent=skinned+' skinned meshes · '+names.length+' original clips';","$('#asset-details').textContent=skinned+' skinned meshes · '+names.length+' original clips'+(baked?' + '+Object.keys(baked.clips).length+' retargeted':'');")

# ---------- 4. load / sources UI / startup ----------
rep("const bytes=typeof source==='string'?await fetchModel(source):source;const gltf=await loader.parseAsync(bytes,'');install(gltf,name,meta);return true}","const bytes=typeof source==='string'?await fetchModel(source):source;const gltf=await loader.parseAsync(bytes,'');const baked=meta.baked&&meta.compat!==false?await loadBaked(meta.baked).catch(()=>null):null;install(gltf,name,meta,baked);return true}")
between("for(const [key,meta] of Object.entries(sources)){const option","(async()=>{const failures=[]",'''const availability=(async()=>{await Promise.all(Object.entries(sources).map(async([key,meta])=>{meta.available=await sourceExists(meta.url);const o=document.createElement('option');o.value=key;o.textContent=meta.label+(meta.available?'':' (file not bundled)');o.disabled=!meta.available;$('#source').append(o)}))})();$('#load-source').onclick=()=>selectSource($('#source').value);
const sortOptions=()=>{const sel=$('#source');[...sel.options].sort((a,b)=>Object.keys(sources).indexOf(a.value)-Object.keys(sources).indexOf(b.value)).forEach(o=>sel.append(o))};
$('#asset').addEventListener('change',async e=>{const f=e.target.files[0];if(f){if(f.size>80*1024*1024){$('#report').textContent='Model exceeds 80 MB test limit.';return}const selected=sources[$('#source').value];await load(await f.arrayBuffer(),f.name,selected===sources.proxy?sources.custom:selected)}e.target.value=''});
''')
rep("(async()=>{const failures=[];for(const id of startupOrder){if(await selectSource(id))","(async()=>{await availability;sortOptions();if(sources[startupOrder[0]]?.available)$('#source').value=startupOrder[0];const failures=[];for(const id of startupOrder){if(!sources[id].available){failures.push(sources[id].label+' missing');continue}if(await selectSource(id))")
rep("Human sources unavailable; use the selector or import a GLB. '+failures.join(' · ')","Human sources unavailable. '+failures.join(' · ')")

# ---------- 5. animate(): rewritten, old procedural rig kept as fallback ----------
a=js.index("function animate(dt){if(mixer){")
b=js.index("const keys=new Set(),edges=new Set();")
old=js[a:b]
pa=old.index(" const blend=1-Math.exp(-dt*13),moving")
procedural=old[pa:].rstrip()
assert procedural.endswith('} }'),procedural[-40:]
procedural=procedural[:-1].rstrip()   # drop the closing brace of the old animate()
new_animate='''const ONE_SHOT=new Set(['jump','land']),STATE_RATE={jump:1.35,land:1.5},LOCO=['idle','walk','jog','sprint'];
let lastState='idle',landT=9,landAmp=0,airVy=0,debugPose=null;const natural_ui={on:true,amount:1};
function proceduralAnimate(dt){
'''+procedural+'''
}
function animate(dt){if(!mixer){proceduralAnimate(dt);return}
 solver?.restore();
 if(debugPose){const a=actions[debugPose.state];if(a){for(const [,o] of Object.entries(actions))if(o!==a)o.stop();if(!a.isRunning())a.reset().play();a.setEffectiveWeight(1);a.setEffectiveTimeScale(0);a.time=Math.min(debugPose.time,a.getClip().duration-1e-3);mixer.update(0);$('#gait-status').textContent='Pose '+debugPose.state+' @ '+debugPose.time.toFixed(2)+'s'}return}
 if(audition!==previousAudition){mixer.stopAllAction();playing.clear();gait={};gaitPhase=0;solver?.reset();previousAudition=audition;}
 if(auditionPaused&&audition)return;
 const state=player.state,entering=state!==lastState;if(!player.grounded)airVy=Math.min(airVy,player.vy);
 if(entering){if(state==='land'){landT=0;landAmp=T.MathUtils.clamp(-airVy/5,.35,1)}if(player.grounded)airVy=0;lastState=state}
 landT+=dt;
 const keys=Object.keys(actions),special=!LOCO.includes(state)&&state!=='land';
 const lw=!audition&&player.grounded&&actions.land&&landT<.62?landAmp*(landT<.4?1:Math.max(0,1-(landT-.4)/.22))*(1-T.MathUtils.clamp(player.speed/2.8,0,.75)):0;
 let target=audition?{[audition]:1}:special?{[actions[state]?state:'idle']:1}:gaitWeights(player.speed,sourceMeta,keys);
 if(lw>.01){const scaled={};for(const [k,w] of Object.entries(target))scaled[k]=w*(1-lw);scaled.land=lw;target=scaled}
 gait=blendWeights(gait,target,dt,audition?.07:lw>.01?.05:state==='jump'?.06:.13);
 if(entering&&ONE_SHOT.has(state)&&actions[state]){const a=actions[state];a.reset();if(!playing.has(a)){a.play();playing.add(a)}}
 const nominal={},durations={};for(const k of keys){nominal[k]=clipSpeed(sourceMeta,k);durations[k]=actions[k].getClip().duration;}
 const sync=$('#phase-sync').checked&&!audition&&!special;gaitPhase=(gaitPhase+dt*strideFrequency(gait,player.speed,nominal,durations))%1;
 const groups=new Map();for(const [key,w] of Object.entries(gait)){const a=actions[key];if(!a)continue;const existing=groups.get(a)||{weight:0,cycle:false,rate:0};existing.weight+=w;existing.cycle||=['walk','jog','sprint'].includes(key);existing.rate+=w*(audition?playbackRate:['walk','jog','sprint','crouchWalk'].includes(key)?T.MathUtils.clamp(player.speed/(nominal[key]||1),.2,1.65):(STATE_RATE[key]||1));groups.set(a,existing);}
 for(const a of playing)if(!groups.has(a)){a.stop();playing.delete(a);}
 for(const [a,g] of groups){if(!playing.has(a)){a.reset().play();playing.add(a);}a.setEffectiveWeight(g.weight);if(sync&&g.cycle){a.time=gaitPhase*a.getClip().duration;a.setEffectiveTimeScale(0);}else a.setEffectiveTimeScale(g.rate/g.weight);}
 mixer.update(dt);
 const live=!audition&&!inspect,moved=natural?natural.apply(dt,{enabled:natural_ui.on&&live,amount:natural_ui.amount,speed:player.speed,state,landWeight:lw,grounded:player.grounded})||false:false;
 const lock=$('#foot-lock').checked&&live&&player.grounded&&!special&&player.speed>.15;solver?.update(dt,{lock,solve:moved&&$('#foot-lock').checked});
 $('#gait-status').textContent=Object.entries(gait).filter(([,w])=>w>.02).map(([k,w])=>k+' '+Math.round(w*100)+'%').join(' · ');$('#foot-status').textContent=solver?.count===2?(($('#foot-lock').checked?'Leg solver on':'Leg solver off')+(solver.detached?' (IK-style feet)':'')+' · '+solver.contacts+' contacts'+(natural?' · natural layer '+Math.round(natural.strength*100)+'%':'')):'Leg solver unavailable: matching leg bones not found';
}
'''
js=js[:a]+new_animate+js[b:]
# crouch/jump input gates use the merged actions, unchanged. Reset the cached animation state with the model.
rep("active=null;audition=null;auditionPaused=false;sourceMeta=meta;","active=null;audition=null;auditionPaused=false;lastState='idle';landT=9;airVy=0;sourceMeta=meta;")


# ---------- 8. robust loading: progress, stall timeout, never silently swap characters ----------
between("async function fetchModel(","// Pure locomotion blend",'''async function fetchModel(url,{fetcher=fetch,stall=30000,maxBytes=80*1024*1024,onProgress}={}){
  // A fixed total timeout fails on phone connections (V0.8 gave up after 18 s). Only abort when no bytes arrive for `stall` ms.
  const controller=new AbortController(),early=window.__early?.[url.replace(/^\\.\\//,'./')];if(early)delete window.__early[url];let timer;const arm=()=>{clearTimeout(timer);timer=setTimeout(()=>{controller.abort();early?.controller.abort()},stall)};arm();
  try{const response=await (early?early.p:fetcher(url,{signal:controller.signal,credentials:'omit'}));if(!response.ok)throw Error('HTTP '+response.status);const total=Number(response.headers.get('content-length'))||0;if(total>maxBytes)throw Error('Model exceeds size limit');
   let buf;if(response.body&&response.body.getReader){const reader=response.body.getReader(),chunks=[];let got=0;for(;;){const {done,value}=await reader.read();if(done)break;arm();chunks.push(value);got+=value.length;if(got>maxBytes)throw Error('Model exceeds size limit');onProgress?.(got,total)}const out=new Uint8Array(got);let o=0;for(const c of chunks){out.set(c,o);o+=c.length}buf=out.buffer}else buf=await response.arrayBuffer();
   if(buf.byteLength>maxBytes||buf.byteLength<20)throw Error('Invalid model size');const v=new DataView(buf);if(v.getUint32(0,true)!==0x46546c67||v.getUint32(4,true)!==2||v.getUint32(8,true)!==buf.byteLength)throw Error('Source did not return a complete GLB v2');return buf;}
  catch(e){if(e.name==='AbortError')throw Error('download stalled for '+stall/1000+' s');throw e}finally{clearTimeout(timer)}
}

''')
rep("let loading=false;","""const loadingUI=(()=>{const box=$('#loading'),bar=$('#loading-bar'),title=$('#loading-title'),detail=$('#loading-detail'),retry=$('#loading-retry'),dismiss=$('#loading-dismiss');let again=null;retry.onclick=()=>{const f=again;again=null;if(f)f()};dismiss.onclick=()=>{box.hidden=true};const mb=x=>(x/1048576).toFixed(1);
 return {start(name){again=null;box.hidden=false;box.classList.remove('failed');title.textContent='Loading '+name;detail.textContent='Starting download…';bar.style.width='3%';retry.hidden=true;dismiss.hidden=true},
 progress(got,total){if(total){bar.style.width=Math.max(3,Math.round(100*got/total))+'%';detail.textContent=mb(got)+' / '+mb(total)+' MB'}else detail.textContent=mb(got)+' MB'},
 parsing(){bar.style.width='100%';detail.textContent='Preparing character…'},done(){box.hidden=true},
 fail(msg,fn){box.hidden=false;box.classList.add('failed');title.textContent='Could not load the character';detail.textContent=msg;again=fn;retry.hidden=false;dismiss.hidden=false}}})();
let loading=false;""")
rep("$('#report').textContent='Loading '+name+'…';try{const bytes=typeof source==='string'?await fetchModel(source):source;const gltf=","$('#report').textContent='Loading '+name+'…';if(typeof source==='string'||true)loadingUI.start(name);try{const bytes=typeof source==='string'?await fetchModel(source,{onProgress:loadingUI.progress}):source;loadingUI.parsing();const gltf=")
rep("install(gltf,name,meta,baked);return true}catch(e){$('#report').textContent='Import failed: '+e.message+'. Previous model kept.';return false;}","install(gltf,name,meta,baked);loadingUI.done();return true}catch(e){$('#report').textContent='Import failed: '+e.message+(model?'. Previous model kept.':'.');loadingUI.fail(e.message,()=>load(source,name,meta));return false;}")
rep("const startupOrder=['sam','proxy'];","const startupOrder=['sam']; // never swap to a different character automatically; the placeholder is only available from the menu")
rep("if(await selectSource(id)){","if(await selectSource(id)||await selectSource(id)){")
rep("$('#report').textContent='No GLB loaded. Procedural fallback active.'","$('#report').textContent='Sam could not be loaded. Use Try again, or pick another source in Settings.'")
rep("const fallback=new T.Group();root.add(fallback);","const fallback=new T.Group();root.add(fallback);fallback.visible=false; // never show the stand-in rig while Sam loads\n")

# ---------- 6. input: guarded pointer capture, per-button pointer sets, safety release ----------
between("document.querySelectorAll('[data-key]').forEach(b=>{","let yaw=0,pitch=.18,zoom=4.5,last=null;",'''// V0.9: setPointerCapture throws InvalidPointerId when a pointer was cancelled/never existed (e.g. a touch taken over by the
// browser, or synthetic events). Capture is only a convenience, so failures are ignored and release also happens on pointerleave.
const tryCapture=(el,id)=>{try{el.setPointerCapture(id);return true}catch(e){return false}},hasCapture=(el,id)=>{try{return el.hasPointerCapture(id)}catch(e){return false}};
document.querySelectorAll('[data-key]').forEach(b=>{const key=b.dataset.key,active=new Set();const release=e=>{if(!active.delete(e.pointerId))return;if(!active.size){up(key);b.classList.remove('on')}};
 b.addEventListener('pointerdown',e=>{e.preventDefault();tryCapture(b,e.pointerId);active.add(e.pointerId);down(key);b.classList.add('on')});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,release);
 b.addEventListener('pointerleave',e=>{if(!hasCapture(b,e.pointerId))release(e)});b.addEventListener('contextmenu',e=>e.preventDefault());
 b._releaseAll=()=>{active.clear();up(key);b.classList.remove('on')}});
const releaseAll=()=>{keys.clear();edges.clear();document.querySelectorAll('[data-key]').forEach(b=>b._releaseAll?.())};addEventListener('pagehide',releaseAll);document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseAll()});
''')
rep("renderer.domElement.addEventListener('pointerdown',e=>{if(last)return;renderer.domElement.setPointerCapture(e.pointerId);","renderer.domElement.addEventListener('pointerdown',e=>{if(last)return;tryCapture(renderer.domElement,e.pointerId);")
rep("addEventListener('blur',()=>{keys.clear();edges.clear()});","addEventListener('blur',()=>{keys.clear();edges.clear()});")

# ---------- 7. camera presets, settings menu, natural-motion controls, debug API ----------
rep("$('#reset').onclick=()=>{footIK?.reset();","$('#reset').onclick=()=>{solver?.reset();")
tail='''
// ---- V0.9 UI: floating settings menu, camera presets, natural-motion controls ----
const menuToggle=$('#menu-toggle'),panelEl=$('#panel');function setMenu(open){panelEl.hidden=!open;menuToggle.setAttribute('aria-expanded',String(open))}
menuToggle.onclick=()=>setMenu(panelEl.hidden);setMenu(!matchMedia('(pointer:coarse),(max-width:640px)').matches);
const VIEWS={front:Math.PI,side:Math.PI/2,rear:0};
function setView(name){if(!(name in VIEWS))return;if(!inspect)$('#view').click();yaw=VIEWS[name];pitch=.08;zoom=3.4}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));$('#reset-view').onclick=()=>{if(inspect)$('#view').click();yaw=0;pitch=.18;zoom=4.5};
$('#natural').onchange=e=>{natural_ui.on=e.target.checked};$('#natural-amount').oninput=e=>{natural_ui.amount=Number(e.target.value);$('#natural-label').textContent=natural_ui.amount.toFixed(2)+'×'};
// Test/inspection hooks (read-only state plus deterministic poses for screenshots).
window.CharacterLab={version:'0.9',setView,pose:(state,time=0)=>{debugPose=state?{state,time}:null},get state(){return {mode:player.state,speed:player.speed,x:player.x,z:player.z,y:player.y,grounded:player.grounded,yaw:player.yaw,clips:Object.keys(actions),loaded:!!model,source:$('#source').value,legs:solver?{count:solver.count,detached:solver.detached,contacts:solver.contacts}:null,natural:natural?natural.strength:null}},setMeta:o=>Object.assign(sourceMeta,o),get camera(){return {yaw,pitch,zoom}},
 footWorld(){const out={};model?.traverse(n=>{if(n.isBone&&/^foot_[lr]$|^ball_[lr]$/.test(n.name))out[n.name]=n.getWorldPosition(new T.Vector3()).toArray()});return out},
 bone(n){const o=model?.getObjectByName(n);return o?o.getWorldPosition(new T.Vector3()).toArray():null},setNatural(on,amt=1){natural_ui.on=on;natural_ui.amount=amt;$('#natural').checked=on;$('#natural-amount').value=String(amt)}};
'''
js=js.replace("\n</script></body></html>",tail+"\n</script></body></html>")
assert tail in js
out=head+js
(root/'index.html').write_text(out)
print('wrote index.html',len(out))
