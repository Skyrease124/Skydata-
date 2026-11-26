import * as T from 'three';
import {handFrame,curlBone} from './hand-profile.js?v=038';
// V0.38 realistic weapon handling for the visible main character skin.
//
// Before: the weapon copied the palm basis directly (barrel along the fingers, weapon "up" along the palm normal),
// sat at a fixed offset tuned for Sam, the support hand never touched the weapon and the fingers kept a relaxed pose.
// Now every held weapon is posed FROM the hand with a real grip relationship measured on its own mesh:
//   * the grip axis runs from the pinky (bottom) to the index (top), tilted like the real grip,
//   * the palm sits on the back strap, knuckles point forward and slightly right, the grip centre is in the palm,
//   * a closed power grip on the right hand (index along the frame when carrying, on the trigger when aiming/firing),
//   * a two-bone IK support hand: rifle handguard always, pistol only while aiming (not during reloads),
//   * a limited wrist correction while aiming so the barrel points where the character faces.
// Grip geometry (weapon space: +Z muzzle, +Y up, +X weapon-left) was measured from each GLB's skinned vertices and
// named sockets (Attach_RailBottom etc.). Work only happens while a weapon is held.
export const WEAPON_GRIPS={
 pistol:{centre:[0,-.008,.010],up:[0,.94,.34],wrapYaw:12,palmIn:.012,palmFwd:.004,
  fingersCarry:{index:[6,6,4],middle:[72,88,48],ring:[76,88,46],pinky:[80,82,44],thumb:{adduct:34,flex:[14,24,18]}},
  fingersAim:{index:[30,46,22]},
  support:{when:'always',point:[.034,-.006,.012],frame:'pistol'},
  aim:{type:'isosceles',forward:.44,drop:.16,right:.02},
  // two-handed low ready while carrying: both hands on, muzzle about 40 deg down in front of the body
  carry:{type:'isosceles',forward:.30,drop:.40,right:.0,pitch:-40}},
 rifle:{centre:[0,-.012,.002],up:[0,.954,.301],wrapYaw:10,palmIn:.012,palmFwd:.004,
  fingersCarry:{index:[6,6,4],middle:[74,88,48],ring:[78,88,46],pinky:[82,82,44],thumb:{adduct:34,flex:[14,24,18]}},
  fingersAim:{index:[30,46,22]},
  support:{when:'always',point:[0,.040,.17],frame:'handguard',
   fingers:{index:[34,44,26],middle:[40,50,28],ring:[44,52,30],pinky:[48,52,30],thumb:{adduct:8,flex:[10,14,10]}}},
  aim:{type:'shoulder',stock:[0,.098,-.19],pocket:[.035,-.055,.05]},
  // two-handed low ready while carrying: stock low on the right chest, muzzle forward-down and slightly across the body
  carry:{type:'shoulder',stock:[0,.098,-.19],pocket:[.03,-.06,.0],pitch:-28,yaw:35}}
};
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),Q=()=>new T.Quaternion();
const FINGERS=['index','middle','ring','pinky'];
const basis=(x,y,z)=>Q().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z));
function setWorldQ(bone,q){bone.parent.updateWorldMatrix(true,false);bone.quaternion.copy(bone.parent.getWorldQuaternion(Q()).invert().multiply(q)).normalize();bone.updateMatrixWorld(true);}
// hand frame exactly as prop-lab's palm(): z wrist->middle1, x pinky1->index1 (orthogonal), y = z x x
function palmBasis(m,side){const h=m.get(side+'hand'),i=m.get(side+'handindex1'),mid=m.get(side+'handmiddle1'),p=m.get(side+'handpinky1');if(!h||!i||!mid||!p)return null;const w=h.getWorldPosition(V()),c=mid.getWorldPosition(V());const z=c.clone().sub(w).normalize(),x=i.getWorldPosition(V()).sub(p.getWorldPosition(V()));x.addScaledVector(z,-x.dot(z)).normalize();const y=V().crossVectors(z,x).normalize();return {w,c,x,y,z,q:basis(x,y,z)};}

export function createWeaponGrip(){
 let bones=null,poses=new Map(),offsetL=null,armLen=null,state={right:0,support:0,aimFix:0,stance:0},last=0,seg=null;
 // Pre-compute finger grip poses as LOCAL rotations (intrinsic to the hand, valid in any hand pose).
 function fingerPose(side,spec,bind){const saved=new Map(),out=new Map();const chain=[];for(const f of [...FINGERS,'thumb'])for(let i=1;i<=3;i++){const b=bones.get(side+'hand'+f+i);if(b)chain.push(b);}
  for(const b of chain){saved.set(b,b.quaternion.clone());b.quaternion.copy(bind.get(b)||b.quaternion);}bones.get(side+'hand').updateMatrixWorld(true);
  const H=handFrame(bones,side);if(!H){for(const [b,q] of saved)b.quaternion.copy(q);return out;}const palm=H.y.clone().negate();
  for(const f of FINGERS){const c=spec[f];if(!c)continue;let sg=0;for(let i=1;i<=3;i++){const a=bones.get(side+'hand'+f+i),b=bones.get(side+'hand'+f+(i+1));if(a&&b)sg=curlBone(a,b,handFrame(bones,side).x,palm,c[i-1],sg);}}
  const t=[1,2,3,4].map(i=>bones.get(side+'handthumb'+i));if(spec.thumb&&t[0]&&t[1]){const idx=bones.get(side+'handindex1').getWorldPosition(V());curlBone(t[0],t[1],palm,idx.sub(t[0].getWorldPosition(V())).normalize(),spec.thumb.adduct);for(let i=0;i<3;i++){if(!t[i]||!t[i+1])continue;const dd=t[i+1].getWorldPosition(V()).sub(t[i].getWorldPosition(V())).normalize(),ax=V().crossVectors(dd,palm);if(ax.lengthSq()>1e-8)curlBone(t[i],t[i+1],ax.normalize(),palm,spec.thumb.flex[i]);}}
  for(const b of chain)out.set(b,b.quaternion.clone());for(const [b,q] of saved)b.quaternion.copy(q);bones.get(side+'hand').updateMatrixWorld(true);return out;}
 function bind(bridge,bindQ){bones=bridge?.bones||null;poses.clear();if(!bones)return;
  for(const [kind,g] of Object.entries(WEAPON_GRIPS)){poses.set(kind+':carry',fingerPose('right',g.fingersCarry,bindQ));poses.set(kind+':aim',fingerPose('right',{...g.fingersCarry,...g.fingersAim},bindQ));if(g.support?.fingers)poses.set(kind+':support',fingerPose('left',g.support.fingers,bindQ));}
  poses.set('pistol:support',fingerPose('left',{index:[28,36,22],middle:[46,58,32],ring:[50,60,32],pinky:[54,58,30],thumb:{adduct:20,flex:[10,16,12]}},bindQ));
  // left hand: wrist -> palm centre offset in hand-local space, and arm segment lengths
  const h=bones.get('lefthand'),m=bones.get('lefthandmiddle1'),fa=bones.get('leftforearm'),ua=bones.get('leftarm');if(h&&m&&fa&&ua){const hq=h.getWorldQuaternion(Q()).invert(),pb=palmBasis(bones,'left');const palmC=h.getWorldPosition(V()).lerp(m.getWorldPosition(V()),.55).addScaledVector(pb.y,.016);offsetL=palmC.sub(h.getWorldPosition(V())).applyQuaternion(hq);seg={a:ua.getWorldPosition(V()).distanceTo(fa.getWorldPosition(V())),b:fa.getWorldPosition(V()).distanceTo(h.getWorldPosition(V()))};}}
 function blendFingers(map,w){if(!map||w<.002)return;for(const [b,q] of map)b.quaternion.slerp(q,w);}
 // two-bone IK for a visible arm towards a wrist goal; bend plane from the current elbow; segment lengths measured live
 function solveArm(side,goal,w){const ua=bones.get(side+'arm'),fa=bones.get(side+'forearm'),h=bones.get(side+'hand');if(!ua||!fa||!h||w<.001)return false;const A=ua.getWorldPosition(V()),B=fa.getWorldPosition(V()),C=h.getWorldPosition(V());const sa=A.distanceTo(B),sb=B.distanceTo(C);
  const target=C.clone().lerp(goal,w);const d0=target.clone().sub(A),len=d0.length(),reach=sa+sb;state[side+'Reach']=+(reach*100).toFixed(1);state[side+'Need']=+(len*100).toFixed(1);if(len>reach*1.06)return false;const d=Math.min(reach-1e-3,Math.max(Math.abs(sa-sb)+1e-3,len)),dir=d0.normalize();
  const bend=B.clone().sub(A);bend.addScaledVector(dir,-bend.dot(dir));if(bend.lengthSq()<1e-8)bend.set(0,-1,0);bend.normalize();const along=(sa*sa-sb*sb+d*d)/(2*d),off=Math.sqrt(Math.max(0,sa*sa-along*along));const K=A.clone().addScaledVector(dir,along).addScaledVector(bend,off);
  setWorldQ(ua,Q().setFromUnitVectors(B.clone().sub(A).normalize(),K.clone().sub(A).normalize()).multiply(ua.getWorldQuaternion(Q())));const B2=fa.getWorldPosition(V()),C2=h.getWorldPosition(V());const goalW=A.clone().addScaledVector(dir,d);setWorldQ(fa,Q().setFromUnitVectors(C2.clone().sub(B2).normalize(),goalW.sub(B2).normalize()).multiply(fa.getWorldQuaternion(Q())));return true;}
 // rotate a hand bone so its anatomical basis becomes `target` (world), blended by w
 function orientHand(side,target,w){const h=bones.get(side+'hand'),P=palmBasis(bones,side);if(!h||!P)return;const delta=target.clone().multiply(P.q.clone().invert());setWorldQ(h,Q().slerp(delta,w).multiply(h.getWorldQuaternion(Q())));}
 /**
  * Pose `prop` (a weapon group) in the visible right hand and drive both hands. Returns true when handled.
  * kind: 'pistol'|'rifle'; mode flags from the current clip; facing: world forward of the character.
  */
 function hold(prop,kind,{aiming=false,reloading=false,firing=false,facing=null}={}){const g=WEAPON_GRIPS[kind];if(!bones||!g)return false;const now=performance.now(),dt=Math.min(.1,last?(now-last)/1000:.016);last=now;const k=1-Math.exp(-dt*14);
  const aim=aiming||firing;state.right+=(1-state.right)*k;state.aimFix+=((aim?1:0)-state.aimFix)*k;state.stance+=((!aim&&!reloading&&g.carry?1:0)-state.stance)*k;
  const wantSupport=g.support&&!reloading&&(g.support.when==='always'||aim)?1:0;state.support+=(wantSupport-state.support)*k;
  // 1. wrist correction while aiming: turn the hand (max 35 deg) so the barrel points along the facing direction
  const hand=bones.get('righthand');let P=palmBasis(bones,'right');if(!P)return false;
  const up=V().fromArray(g.up).normalize(),F=V(0,0,1).addScaledVector(up,-up.z).normalize(),L=V().crossVectors(up,F).normalize(); // weapon-left (+X) perpendicular to the grip
  const yaw=g.wrapYaw*Math.PI/180;const zW=F.clone().multiplyScalar(Math.cos(yaw)).addScaledVector(L,-Math.sin(yaw)).normalize(); // knuckles: forward, slightly to the weapon's right
  const handInWeapon=basis(up,V().crossVectors(zW,up).normalize(),zW); // x = grip axis (index up), y = z x x, z = knuckles
  for(const [st,wS] of [[g.aim,state.aimFix],[g.carry,state.stance]])if(facing&&st&&wS>.01){const neck=bones.get('neck'),rs=bones.get('rightarm');if(neck&&rs){const fw=facing.clone().setY(0).normalize(),upW=V(0,1,0),leftW=V().crossVectors(upW,fw).normalize();
   let qT=basis(leftW,upW,fw); // weapon frame in the world: +X weapon-left, +Y up, +Z along the facing
   if(st.pitch||st.yaw)qT=Q().setFromAxisAngle(upW,(st.yaw||0)*Math.PI/180).multiply(Q().setFromAxisAngle(leftW,-(st.pitch||0)*Math.PI/180)).multiply(qT);
   // shoulder stances use a centred anchor: torso twist while walking moves the shoulders in opposite directions
   let pos;if(st.type==='shoulder'){const ls=bones.get('leftarm');const sh=ls?rs.getWorldPosition(V()).lerp(ls.getWorldPosition(V()),.5).addScaledVector(leftW,-.17):rs.getWorldPosition(V());const pocket=sh.addScaledVector(leftW,st.pocket[0]).addScaledVector(upW,st.pocket[1]).addScaledVector(fw,st.pocket[2]);pos=pocket.sub(V().fromArray(st.stock).applyQuaternion(qT));}
   else{const n=neck.getWorldPosition(V());const gripW=n.addScaledVector(fw,st.forward).addScaledVector(upW,-st.drop).addScaledVector(leftW,-st.right);pos=gripW.sub(V().fromArray(g.centre).applyQuaternion(qT));}
   const gripTarget=V().fromArray(g.centre).applyQuaternion(qT).add(pos);const handTarget=qT.clone().multiply(handInWeapon); // hand basis that holds the weapon in that pose
   // wrist goal: keep the palm-point offset of this hand (expressed in its own basis)
   const o=P.w.clone().lerp(P.c,.55).addScaledVector(P.y,-g.palmIn).addScaledVector(P.z,g.palmFwd).sub(P.w),ob=V(o.dot(P.x),o.dot(P.y),o.dot(P.z));const wristGoal=gripTarget.clone().sub(ob.applyQuaternion(handTarget));
   solveArm('right',wristGoal,wS);orientHand('right',handTarget,wS);P=palmBasis(bones,'right');}}
  // 2. right-hand fingers: power grip (trigger finger moves in while aiming/firing)
  blendFingers(poses.get(kind+(aim?':aim':':carry')),state.right);P=palmBasis(bones,'right');
  // 3. weapon pose from the hand: R_weapon = R_hand * R_handInWeapon^-1; grip centre sits in the palm
  const qW=P.q.clone().multiply(handInWeapon.clone().invert()).normalize();
  const palmPoint=P.w.clone().lerp(P.c,.55).addScaledVector(P.y,-g.palmIn).addScaledVector(P.z,g.palmFwd); // y is the back of the right hand; -y is the palm
  prop.quaternion.copy(qW);prop.position.copy(palmPoint).sub(V().fromArray(g.centre).applyQuaternion(qW));prop.updateMatrixWorld(true);
  // 4. support hand
  if(state.support>.01){{const h=bones.get('lefthand'),m=bones.get('lefthandmiddle1'),pb=palmBasis(bones,'left');if(h&&m&&pb){const hq=h.getWorldQuaternion(Q()).invert();offsetL=h.getWorldPosition(V()).lerp(m.getWorldPosition(V()),.55).addScaledVector(pb.y,.016).sub(h.getWorldPosition(V())).applyQuaternion(hq);}}const sp=V().fromArray(g.support.point).applyMatrix4(prop.matrixWorld);const Fw=V(0,0,1).applyQuaternion(qW),Uw=V(0,1,0).applyQuaternion(qW),Lw=V(1,0,0).applyQuaternion(qW);
   // left hand frame (x pinky->index, y = z x x points INTO the left palm): handguard = palm up under the rail, fingers wrap to the right side;
   // pistol = palm against the grip's left side, fingers down over the right hand's fingers.
   const x=Fw.clone(),y=g.support.frame==='handguard'?Uw.clone():Lw.clone().negate();const z=V().crossVectors(x,y).normalize();const yy=V().crossVectors(z,x).normalize();const qL=basis(x,yy,z);
   const wristGoal=sp.clone().sub(offsetL.clone().applyQuaternion(qL));
   const ok=solveArm('left',wristGoal,state.support);state.supportReached=ok;state.supportGap=+(bones.get('lefthand').getWorldPosition(V()).distanceTo(wristGoal)*100).toFixed(1);if(ok){const h=bones.get('lefthand');setWorldQ(h,h.getWorldQuaternion(Q()).slerp(qL,state.support));blendFingers(poses.get(kind+':support'),state.support);}}
  return true;}
 function release(){state.right=0;state.support=0;state.aimFix=0;last=0;}
 return {bind,hold,release,get ready(){return !!bones&&poses.size>0},get state(){return {...state}}};
}
