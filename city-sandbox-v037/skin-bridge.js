import * as T from 'three';
import {boneMap,fitCharacter,rigInfo} from './library.js?v=032';
import {HAND_PROFILES,calibrateHands} from './hand-profile.js?v=037';
const Q=()=>new T.Quaternion(), V=()=>new T.Vector3();
const axisChildren={hips:'spine',spine:'spine1',spine1:'spine2',spine2:'neck',neck:'head'};
for(const side of ['left','right']){
 for(const [a,b] of Object.entries({shoulder:'arm',arm:'forearm',forearm:'hand',upleg:'leg',leg:'foot',foot:'toebase'}))axisChildren[side+a]=side+b;
 for(const f of ['thumb','index','middle','ring','pinky'])for(let i=1;i<=2;i++)axisChildren[side+'hand'+f+i]=side+'hand'+f+(i+1);
}
function handBasis(m,side){const w=m.get(side+'hand'),i=m.get(side+'handindex1'),mid=m.get(side+'handmiddle1'),p=m.get(side+'handpinky1');if(!w||!i||!mid||!p)return null;const z=mid.getWorldPosition(V()).sub(w.getWorldPosition(V())).normalize(),x=i.getWorldPosition(V()).sub(p.getWorldPosition(V()));x.addScaledVector(z,-x.dot(z)).normalize();const y=V().crossVectors(z,x).normalize();return Q().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z));}
// The old skeleton remains the gameplay driver. The visual skeleton follows
// its world-space rotations, with calibrated A-pose to T-pose direction offsets.
export function createSkinBridge(driver,visual,container,opts={}){const handProfile=HAND_PROFILES[opts.handProfile]||null;let frames=0,handsCorrected=0;
 const info=rigInfo(visual);if(!info.meshes||info.missing.length)throw Error('New skin has an incomplete rig: '+info.missing.join(', '));
 // Uploaded GLB faces +X, with its left arm along -Z. Rotate to the game +Z convention.
 visual.rotation.y=-Math.PI/2;visual.updateMatrixWorld(true);const bindQ=new Map();visual.traverse(b=>{if(b.isBone)bindQ.set(b,b.quaternion.clone())});
 const fitted=fitCharacter(visual);container.add(fitted);container.updateWorldMatrix(true,true);
 const source=boneMap(driver),target=boneMap(visual),rootInv=container.getWorldQuaternion(Q()).invert(),depth=b=>{let d=0;while(b.parent){d++;b=b.parent;}return d;};
 const rows=[];for(const [key,dst] of target){const src=source.get(key);if(!src)continue;const sq=src.getWorldQuaternion(Q()),tq=dst.getWorldQuaternion(Q());let correction=Q();const child=axisChildren[key];if(child&&source.has(child)&&target.has(child)){
  const a=source.get(child).getWorldPosition(V()).sub(src.getWorldPosition(V())),b=target.get(child).getWorldPosition(V()).sub(dst.getWorldPosition(V()));if(a.lengthSq()>1e-8&&b.lengthSq()>1e-8)correction.setFromUnitVectors(b.normalize(),a.normalize());
 }else if(key==='lefthand'||key==='righthand'){const side=key==='lefthand'?'left':'right',a=handBasis(source,side),b=handBasis(target,side);if(a&&b)correction.copy(a).multiply(b.invert());}
 const offset=sq.invert().multiply(correction).multiply(tq).normalize();rows.push({src,dst,offset,depth:depth(dst)});}
 rows.sort((a,b)=>a.depth-b.depth);const sh=source.get('hips'),th=target.get('hips');const sh0=container.worldToLocal(sh.getWorldPosition(V())),th0=container.worldToLocal(th.getWorldPosition(V()));const world=V(),dest=Q(),parent=Q();let visible=true;
 const driverMeshes=[];driver.traverse(o=>{if(o.isMesh){driverMeshes.push([o,o.visible,o.castShadow]);o.visible=false;o.castShadow=false;}});visual.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}});
 function update(){if(!visible)return;container.updateWorldMatrix(true,false);driver.updateWorldMatrix(true,true);world.copy(sh.getWorldPosition(world));container.worldToLocal(world).sub(sh0).add(th0);container.localToWorld(world);th.parent.worldToLocal(world);th.position.copy(world);fitted.updateWorldMatrix(true,true);for(const {src,dst,offset} of rows){src.getWorldQuaternion(dest).multiply(offset);dst.parent.getWorldQuaternion(parent).invert();dst.quaternion.copy(parent.multiply(dest)).normalize();dst.updateMatrixWorld(true);}
  // one-time hand calibration on the first animated frame; folds into the offsets, so later frames cost nothing extra
  if(++frames===2&&handProfile)handsCorrected=calibrateHands(handProfile,source,target,rows,bindQ);}
 function setVisible(on){visible=!!on;fitted.visible=visible;for(const [o,v,s] of driverMeshes){o.visible=visible?false:v;o.castShadow=visible?false:s;}}
 function dispose(){setVisible(false);fitted.removeFromParent();}
 const palmRig=side=>({hand:target.get(side+'hand'),index_01:target.get(side+'handindex1'),middle_01:target.get(side+'handmiddle1'),pinky_01:target.get(side+'handpinky1')});
 update();return {update,setVisible,dispose,root:fitted,visual,palmRig,get handsCorrected(){return handsCorrected;},handProfile:opts.handProfile||null,get visible(){return visible;},mapped:rows.length,info};
}
