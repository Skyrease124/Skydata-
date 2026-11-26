import * as T from 'three';
// V0.37 hand correction for the new main character (Tripo auto-rig with Mixamo bone names).
//
// Findings for this rig (measured headlessly, see test-results/v037-hands):
// * Bind pose is a T-pose, arms along -Z, every bone's local +Y runs down the bone (Mixamo convention),
//   but finger roll is NOT symmetric (right index local X is rolled ~37 deg vs the left), so curl axes are
//   derived from joint positions, never from local axes.
// * The generic skin bridge aligned fingers and forearms by direction only (shortest arc). That left the
//   curl axis arbitrary: the visible fingers bent towards the back of the hand and sideways, the thumb
//   folded ~113 deg, and the forearm roll disagreed with the hand (twisted wrist).
// * Skin weights are sound: every vertex sums to 1, ~80% of wrist vertices blend forearm/hand,
//   ~2.6% of finger vertices are shared by more than two fingers (normal webbing).
//
// The correction is applied ONCE, on the first animated frame, by rewriting the bridge offsets of the
// forearm, hand and the 30 finger bones (15 per hand). Gameplay cost per frame is unchanged, and every
// finger keeps its own driver bone, so any finger animation or grip pose still transfers bone by bone.
export const HAND_PROFILES={
 'main-skin':{
  // degrees; positive curl closes towards the palm, measured per segment from the straight bind finger
  curl:{index:[12,22,10],middle:[16,26,12],ring:[20,28,14],pinky:[24,30,16]},
  // fingers drawn together: fraction of the bind spread kept (1 = unchanged)
  spread:.55,
  // thumb: adduction towards the index (about the palm normal), then flexion per segment towards the palm
  thumb:{adduct:22,flex:[10,14,12]},
  wristFlex:6,        // slight relaxed flexion of the hand towards the palm
  forearmMatchRoll:true
 }
};
const Q=()=>new T.Quaternion(),V=()=>new T.Vector3();
const FINGERS=['index','middle','ring','pinky'];
// Anatomical hand frame from joint positions: z along wrist->middle, x towards the index side, y out of the BACK of the hand.
export function handFrame(m,side){const w=m.get(side+'hand'),i=m.get(side+'handindex1'),mid=m.get(side+'handmiddle1'),p=m.get(side+'handpinky1');if(!w||!i||!mid||!p)return null;const z=mid.getWorldPosition(V()).sub(w.getWorldPosition(V())).normalize(),x=i.getWorldPosition(V()).sub(p.getWorldPosition(V()));x.addScaledVector(z,-x.dot(z)).normalize();const y=V().crossVectors(z,x).normalize();if(side==='left')y.negate();
 // y = back of hand for both sides (left: z x x points INTO the palm, so it is negated; mirrored for the right)
 const xb=V().crossVectors(y,z).normalize();return {z,x,y,q:Q().setFromRotationMatrix(new T.Matrix4().makeBasis(xb,y,z))};}
// Forearm frame: z along elbow->wrist, roll taken from the hand's index direction so forearm and hand agree.
function forearmFrame(m,side){const f=m.get(side+'forearm'),w=m.get(side+'hand'),h=handFrame(m,side);if(!f||!w||!h)return null;const z=w.getWorldPosition(V()).sub(f.getWorldPosition(V())).normalize(),x=h.x.clone();x.addScaledVector(z,-x.dot(z));if(x.lengthSq()<1e-8)return null;x.normalize();const y=V().crossVectors(z,x);return Q().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z));}
const rad=d=>d*Math.PI/180;
function setWorld(bone,q){bone.parent.updateWorldMatrix(true,false);bone.quaternion.copy(bone.parent.getWorldQuaternion(Q()).invert().multiply(q)).normalize();bone.updateMatrixWorld(true);}
// Rotate a bone (world) so its direction moves towards `towards` by `deg` about `axis`; the sign is chosen so it really closes.
function curlBone(bone,child,axis,towards,deg){if(!deg)return;const b=bone.getWorldPosition(V()),d0=child.getWorldPosition(V()).sub(b).normalize();let r=Q().setFromAxisAngle(axis,rad(deg));if(d0.clone().applyQuaternion(r).sub(d0).dot(towards)<0)r=Q().setFromAxisAngle(axis,-rad(deg));setWorld(bone,r.multiply(bone.getWorldQuaternion(Q())));}
/**
 * Pose the visual (target) hands into the profile's relaxed pose, relative to the driver hands, and return
 * world-space goals for every corrected bone. Call with the bridge rows and source/target bone maps.
 * Returns the number of bones corrected.
 */
export function calibrateHands(profile,source,target,rows,bind){if(!profile)return 0;const row=new Map(rows.map(r=>[r.dst,r]));let n=0;
 for(const side of ['left','right']){const fa=target.get(side+'forearm'),hand=target.get(side+'hand');if(!fa||!hand||!row.has(fa)||!row.has(hand))continue;
  const chain=[fa,hand];for(const f of [...FINGERS,'thumb'])for(let i=1;i<=3;i++){const b=target.get(side+'hand'+f+i);if(b)chain.push(b);}
  // finger bones keep their bind pose relative to the hand (straight T-pose fingers) before the profile curls them
  const bindLocal=new Map(chain.map(b=>[b,(bind?.get(b)||b.quaternion).clone()]));
  // 1. forearm roll: match the driver forearm frame (direction + roll from the hand), not just its direction
  if(profile.forearmMatchRoll){const a=forearmFrame(source,side),b=forearmFrame(target,side);if(a&&b)setWorld(fa,a.multiply(b.invert()).multiply(fa.getWorldQuaternion(Q())));}
  // 2. hand: full anatomical frame match with the driver hand, then a small relaxed flexion towards the palm
  for(const b of chain.slice(2))b.quaternion.copy(bindLocal.get(b));
  const hs=handFrame(source,side),ht=handFrame(target,side);if(hs&&ht)setWorld(hand,hs.q.clone().multiply(ht.q.clone().invert()).multiply(hand.getWorldQuaternion(Q())));
  let H=handFrame(target,side);if(profile.wristFlex&&H){const mid=target.get(side+'handmiddle1');curlBone(hand,mid,H.x,H.y.clone().negate(),profile.wristFlex);H=handFrame(target,side);}
  if(!H)continue;const palm=H.y.clone().negate();
  // 3. fingers: restore the straight bind fingers under the corrected hand, draw them together, then curl each segment
  for(const b of chain.slice(2))b.quaternion.copy(bindLocal.get(b));hand.updateMatrixWorld(true);
  const midDir=H.z;
  for(const f of FINGERS){const s=[1,2,3,4].map(i=>target.get(side+'hand'+f+i));if(!s[0]||!s[1])continue;
   if(profile.spread!=null&&f!=='middle'){const b=s[0].getWorldPosition(V()),d=s[1].getWorldPosition(V()).sub(b).normalize();const inPlane=d.clone().addScaledVector(palm,-d.dot(palm)).normalize(),ang=inPlane.angleTo(midDir)*(1-profile.spread);if(ang>1e-4){const ax=V().crossVectors(inPlane,midDir).normalize();setWorld(s[0],Q().setFromAxisAngle(ax,ang).multiply(s[0].getWorldQuaternion(Q())));}}
   const c=profile.curl[f]||[0,0,0];for(let i=0;i<3;i++){if(!s[i]||!s[i+1])continue;const fr=handFrame(target,side);curlBone(s[i],s[i+1],fr.x,palm,c[i]);}}
  const t=[1,2,3,4].map(i=>target.get(side+'handthumb'+i));if(t[0]&&t[1]&&profile.thumb){const idx=target.get(side+'handindex1').getWorldPosition(V());
   // adduct the first thumb bone about the palm normal towards the index base
   const b=t[0].getWorldPosition(V()),d=t[1].getWorldPosition(V()).sub(b).normalize(),toIdx=idx.clone().sub(b).normalize();curlBone(t[0],t[1],palm,toIdx,profile.thumb.adduct);
   for(let i=0;i<3;i++){if(!t[i]||!t[i+1])continue;const p0=t[i].getWorldPosition(V()),dd=t[i+1].getWorldPosition(V()).sub(p0).normalize();const ax=V().crossVectors(dd,palm);if(ax.lengthSq()<1e-8)continue;curlBone(t[i],t[i+1],ax.normalize(),palm,profile.thumb.flex[i]);}}
  // 4. fold the goals into the bridge offsets: dest = sourceWorld * offset  =>  offset = sourceWorld^-1 * goal
  for(const b of chain){const r=row.get(b);if(!r)continue;r.offset.copy(r.src.getWorldQuaternion(Q()).invert().multiply(b.getWorldQuaternion(Q()))).normalize();n++;}
 }
 return n;
}
