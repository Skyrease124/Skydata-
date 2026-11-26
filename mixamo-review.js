import * as T from 'three';
const V=()=>new T.Vector3(), Q=()=>new T.Quaternion();
const wp=b=>b.getWorldPosition(V()),wq=b=>b.getWorldQuaternion(Q());
const norm=n=>n.toLowerCase().replace(/^mixamorig\d*[:_]?/,'').replace(/[^a-z0-9]/g,'');
const map={pelvis:'Hips',spine_01:'Spine',spine_02:'Spine1',spine_03:'Spine2',neck_01:'Neck',head:'Head'};
for(const [s,side] of [['l','Left'],['r','Right']]){
 Object.assign(map,{['clavicle_'+s]:side+'Shoulder',['upperarm_'+s]:side+'Arm',['lowerarm_'+s]:side+'ForeArm',['hand_'+s]:side+'Hand',['middle_01_'+s]:side+'HandMiddle1',['thigh_'+s]:side+'UpLeg',['calf_'+s]:side+'Leg',['foot_'+s]:side+'Foot',['ball_'+s]:side+'ToeBase'});
}
function setQ(b,q){b.quaternion.copy(wq(b.parent).invert().multiply(q));b.updateWorldMatrix(false,true)}
function setP(b,p){b.position.copy(b.parent.worldToLocal(p.clone()));b.updateWorldMatrix(false,true)}
export function retargetMixamo(source,clip,target,idleClip){
 if(!clip||!Number.isFinite(clip.duration)||clip.duration<=0||clip.duration>30)throw Error('Choose an animation lasting 0–30 seconds.');
 const src={},dst={},sourceBones=new Map();source.traverse(b=>{if(b.isBone)sourceBones.set(norm(b.name),b)});
 for(const [key,name] of Object.entries(map)){src[key]=sourceBones.get(norm(name));dst[key]=target.getObjectByName(key);if(!src[key]||!dst[key]?.isBone)throw Error('Missing required bone: '+name)}
 // Target is a detached clone loaded exclusively for baking. Never mutate live Sam.
 const tm=new T.AnimationMixer(target);tm.clipAction(idleClip).play();tm.setTime(0);target.updateMatrixWorld(true);
 const all=[];target.traverse(b=>{if(b.isBone)all.push(b)});
 const rest=all.map(b=>[b,b.position.clone(),b.quaternion.clone(),b.scale.clone()]);
 const ti={},si={};source.updateMatrixWorld(true);
 for(const n of Object.keys(map)){ti[n]={p:wp(dst[n]),q:wq(dst[n])};si[n]={p:wp(src[n]),q:wq(src[n])}}
 tm.stopAllAction();
 const srcHeight=si.pelvis.p.y-(si.foot_l.p.y+si.foot_r.p.y)/2;
 const dstHeight=ti.pelvis.p.y-(ti.foot_l.p.y+ti.foot_r.p.y)/2;
 const scale=dstHeight/srcHeight;
 if(!Number.isFinite(scale)||scale<=0||scale>1000)throw Error('Unsupported source rig scale or pose.');
 const reset=()=>{for(const [b,p,q,s] of rest){b.position.copy(p);b.quaternion.copy(q);b.scale.copy(s)}target.updateMatrixWorld(true)};
 const localAxis=(b,c)=>ti[c].p.clone().sub(ti[b].p).applyQuaternion(ti[b].q.clone().invert()).normalize();
 const aim=(b,parent,c,dir)=>{if(dir.lengthSq()<1e-12)throw Error('Degenerate limb');const o=wq(dst[parent]).multiply(ti[parent].q.clone().invert().multiply(ti[b].q));setQ(dst[b],Q().setFromUnitVectors(localAxis(b,c).applyQuaternion(o).normalize(),dir.clone().normalize()).multiply(o))};
 const sm=new T.AnimationMixer(source);sm.clipAction(clip).setLoop(T.LoopOnce,1).clampWhenFinished=true;sm.clipAction(clip).play();
 const keys=Object.keys(map).filter(n=>!n.startsWith('middle_01'));
 const positions=['pelvis','foot_l','foot_r'],times=[],qs=Object.fromEntries(keys.map(n=>[n,[]])),ps=Object.fromEntries(positions.map(n=>[n,[]]));
 const frames=Math.ceil(clip.duration*30);
 for(let i=0;i<=frames;i++){
  const t=Math.min(clip.duration,i/30);sm.setTime(Math.min(t,clip.duration-0.000001));source.updateMatrixWorld(true);reset();
  const cur={};for(const n of Object.keys(map))cur[n]={p:wp(src[n]),q:wq(src[n])};
  // Remove horizontal root travel; physics owns player displacement. Keep vertical motion.
  const travel=cur.pelvis.p.clone().sub(si.pelvis.p);travel.y=0;
  const targetPos=n=>ti[n].p.clone().add(cur[n].p.clone().sub(si[n].p).sub(travel).multiplyScalar(scale));
  const dq=n=>cur[n].q.clone().multiply(si[n].q.clone().invert()).multiply(ti[n].q);
  setP(dst.pelvis,targetPos('pelvis'));setQ(dst.pelvis,dq('pelvis'));
  for(const n of ['spine_01','spine_02','spine_03','neck_01','head','clavicle_l','clavicle_r'])setQ(dst[n],dq(n));
  for(const s of ['l','r']){
   const u='upperarm_'+s,l='lowerarm_'+s,h='hand_'+s,m='middle_01_'+s,cl='clavicle_'+s;
   for(const [b,p,c] of [[u,cl,l],[l,u,h],[h,l,m]])aim(b,p,c,cur[c].p.clone().sub(cur[b].p));
   const th='thigh_'+s,ca='calf_'+s,ft='foot_'+s,bt='ball_'+s;
   const H=wp(dst[th]), F=targetPos(ft), dV=F.clone().sub(H), a=ti[th].p.distanceTo(ti[ca].p),b=ti[ca].p.distanceTo(ti[ft].p);
   if(dV.lengthSq()<1e-12||a<1e-5||b<1e-5)throw Error('Invalid leg geometry');
   const dir=dV.normalize(),d=T.MathUtils.clamp(H.distanceTo(F),Math.abs(a-b)+1e-5,a+b-1e-5);
   let bend=cur[ca].p.clone().sub(cur[th].p);bend.addScaledVector(dir,-bend.dot(dir));
   if(bend.lengthSq()<1e-12){bend.set(0,0,1);bend.addScaledVector(dir,-bend.dot(dir));if(bend.lengthSq()<1e-12)bend.set(1,0,0).addScaledVector(dir,-dir.x)}
   bend.normalize();const along=(a*a-b*b+d*d)/(2*d),K=H.clone().addScaledVector(dir,along).addScaledVector(bend,Math.sqrt(Math.max(0,a*a-along*along))), ankle=H.clone().addScaledVector(dir,d);
   aim(th,'pelvis',ca,K.clone().sub(H));aim(ca,th,ft,ankle.clone().sub(K));setP(dst[ft],ankle);setQ(dst[ft],dq(ft));setQ(dst[bt],dq(bt));
  }
  times.push(t);
  for(const n of keys){let q=dst[n].quaternion.toArray();const prev=qs[n].slice(-4);if(prev.length&&q.reduce((sum,v,j)=>sum+v*prev[j],0)<0)q=q.map(v=>-v);qs[n].push(...q)}
  for(const n of positions)ps[n].push(...dst[n].position.toArray());
 }
 sm.stopAllAction();tm.stopAllAction();
 const tracks=[];for(const n of keys)tracks.push(new T.QuaternionKeyframeTrack(n+'.quaternion',times,qs[n]));
 for(const n of positions)tracks.push(new T.VectorKeyframeTrack(n+'.position',times,ps[n]));
 for(const [b,p,q] of rest)if(/(index|middle|pinky|ring|thumb)_0\d_[lr]$/.test(b.name))tracks.push(new T.QuaternionKeyframeTrack(b.name+'.quaternion',[0,clip.duration],[...q.toArray(),...q.toArray()]));
 if(tracks.some(t=>!t.validate()||Array.from(t.values).some(v=>!Number.isFinite(v))))throw Error('Retarget produced invalid tracks.');
 return new T.AnimationClip('Mixamo · '+(clip.name||'Imported motion'),clip.duration,tracks);
}
