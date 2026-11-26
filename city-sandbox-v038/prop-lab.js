import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createWeaponGrip} from './weapon-grip.js?v=038';
// Batch static, same-material furniture parts without changing their geometry or appearance.
function batchFurniture(group){const byMat=new Map();for(const o of group.children){if(!o.isMesh||Array.isArray(o.material))continue;let list=byMat.get(o.material);if(!list)byMat.set(o.material,list=[]);list.push(o);}for(const [material,parts] of byMat){if(parts.length<2)continue;const baked=parts.map(o=>{o.updateMatrix();return o.geometry.clone().applyMatrix4(o.matrix);});const geometry=mergeGeometries(baked);baked.forEach(g=>g.dispose());if(!geometry)continue;const mesh=new T.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);for(const o of parts){group.remove(o);o.geometry.dispose();}}}
// Original low-poly interaction proxies, built with bundled Three.js (MIT).
// No real-world weapon mechanics; this is a visual animation test.
const v=()=>new T.Vector3();
const mat=(color,roughness=.8,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
function part(parent,w,h,d,m,x,y,z){const a=new T.Mesh(new T.BoxGeometry(w,h,d),m);a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;parent.add(a);return a}
export function createPropLab(scene){
 const wood=mat(0x70523e),cushion=mat(0x3d4549),steel=mat(0x525c63,.6,.25),blue=mat(0x275a87,.5,.12),black=mat(0x26323a),orange=mat(0xf3973a),parcelMat=mat(0xaf8c62);
 const chair=new T.Group();chair.name='Chair interaction proxy';scene.add(chair);
 // Seat surface is y=0 in the group. Positive Z is forward.
 part(chair,.48,.055,.46,cushion,0,-.0275,0);for(const x of [-.19,.19])for(const z of [-.18,.18])part(chair,.045,.44,.045,wood,x,-.28,z);
 for(const x of [-.19,.19])part(chair,.04,.45,.04,wood,x,.17,-.205);part(chair,.45,.29,.055,wood,0,.28,-.205);
 batchFurniture(chair);chair.position.set(-2,.5,1.5);chair.rotation.y=Math.PI;
 const table=new T.Group();table.name='Pickup station';scene.add(table);part(table,.36,.04,.34,wood,0,-.02,0);for(const x of [-.14,.14])for(const z of [-.13,.13])part(table,.035,.84,.035,steel,x,-.45,z);batchFurniture(table);table.position.set(2,.9,1.5);table.rotation.y=Math.PI;
 const boxTable=table.clone(true);boxTable.name='Box pickup station';boxTable.position.set(4,.9,1.5);boxTable.rotation.set(0,Math.PI,0);scene.add(boxTable);
 const pistol=new T.Group();pistol.name='Blue virtual training prop';scene.add(pistol); // stylized original game-only visual
 part(pistol,.045,.052,.17,blue,0,.058,.048);part(pistol,.049,.037,.135,black,0,.022,.035);const grip=part(pistol,.042,.092,.055,black,0,-.03,-.015);grip.rotation.x=-.15;part(pistol,.045,.05,.017,orange,0,.058,.14);part(pistol,.05,.025,.053,black,0,-.069,-.015);
 const rifleTable=table.clone(true);rifleTable.name='Rifle model station';rifleTable.position.set(0,.9,4.5);scene.add(rifleTable);
 const rifle=new T.Group();rifle.name='Rifle visual prop';scene.add(rifle);
 // Small visual placeholders are replaced only after successful local GLB loading.
 part(rifle,.055,.085,.47,black,0,.04,.12);part(rifle,.045,.11,.075,black,0,-.035,0);
 const modelStatus={pistol:'loading',rifle:'loading'};
 const assetLoader=new GLTFLoader();
 async function loadVisual(kind,group,file){try{const g=await assetLoader.loadAsync('./assets/props/'+file);const visual=g.scene;visual.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(visual);if(bounds.isEmpty()||![...bounds.min.toArray(),...bounds.max.toArray()].every(Number.isFinite))throw Error('Invalid visual bounds');visual.rotation.y=Math.PI;visual.position.set(0,.072,kind==='pistol'?.045:.105);visual.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});for(const child of [...group.children])if(child.isMesh&&child!==flash){group.remove(child);child.geometry?.dispose();}group.add(visual);modelStatus[kind]='loaded';}catch(e){modelStatus[kind]='fallback';console.warn('Prop model unavailable',kind,e.message);}}
 const parcel=new T.Group();parcel.name='Pickup box';scene.add(parcel);part(parcel,.14,.10,.12,parcelMat,0,0,0);part(parcel,.023,.104,.124,mat(0xe0c5a0),0,0,0);
 const flash=new T.Mesh(new T.SphereGeometry(.045,8,6),new T.MeshBasicMaterial({color:0xffdf8b}));flash.position.set(0,.058,.19);flash.visible=false;pistol.add(flash);
 let right=null,left=null,candidate=null,visualRig=null;const weaponGrip=createWeaponGrip();
 const assetsReady=Promise.all([loadVisual('pistol',pistol,'Pistol_Full_West.glb'),loadVisual('rifle',rifle,'Rifle_Assault_West.glb')]);
 const a=v(),b=v(),c=v(),d=v(),x=v(),y=v(),z=v(),basis=new T.Matrix4(),q=new T.Quaternion();
 const rig=(model,side)=>Object.fromEntries(['hand','index_01','middle_01','pinky_01'].map(n=>[n,model?.getObjectByName(n+'_'+side)]));
 const valid=r=>!!r&&Object.values(r).every(Boolean);
 function bind(model){visualRig=null;candidate=model;right=rig(model,'r');left=rig(model,'l');if(candidate){const scale=Math.abs(candidate.getWorldScale(v()).y);chair.scale.setScalar(scale);chair.position.y=worldPoint(seatLocal,v()).y;table.position.y=worldPoint(pickupLocal,v()).y-.035;boxTable.position.y=worldPoint(boxPickupLocal,v()).y-.055;rifleTable.position.y=table.position.y;}}
 function worldPoint(local,out){if(!candidate)return out.set(0,0,0);return candidate.localToWorld(out.copy(local))}
 // Right palm center measured from the mirrored PickUp_Table clip at 30%.
 const seatLocal=new T.Vector3(0,.50,-.24),pickupLocal=new T.Vector3(-.079758292,.850840997,.534730506),boxPickupLocal=pickupLocal.clone();
 function setVisualRig(bridge){visualRig=bridge;weaponGrip.bind(bridge?.bones?bridge:null,bridge?.bindPose);}
 function palm(out,side='r'){const r=visualRig?.palmRig(side==='l'?'left':'right')||(side==='l'?left:right);if(!valid(r))return false;r.hand.getWorldPosition(a);r.index_01.getWorldPosition(b);r.middle_01.getWorldPosition(c);r.pinky_01.getWorldPosition(d);z.subVectors(c,a);x.subVectors(b,d);if(z.lengthSq()<1e-8||x.lengthSq()<1e-8)return false;z.normalize();x.addScaledVector(z,-x.dot(z)).normalize();y.crossVectors(z,x).normalize();if(y.lengthSq()<.5)return false;basis.makeBasis(x,y,z);q.setFromRotationMatrix(basis);out.quaternion.copy(q);out.position.copy(a).lerp(c,.68);return true;}
 // Furniture and pickup stations remain fixed in world space. Align the player, never the object.
 // Place each prop 10.5 cm toward the accessible edge; the fitted Sam
 // has a 41 cm root-to-palm reach, shorter than the 49 cm collision clearance.
 const pickupEdge=.105;
 function restingPoint(table,out){return out.copy(table.position).addScaledVector(new T.Vector3(-Math.sin(table.rotation.y),0,-Math.cos(table.rotation.y)),pickupEdge);}
 function anchor(kind,root){if(!candidate)return null;const object=kind==='chair'?chair:kind==='pistol'?table:kind==='rifle'?rifleTable:boxTable;
  const local=kind==='chair'?seatLocal:kind==='box'?boxPickupLocal:pickupLocal;const off=candidate.localToWorld(local.clone()).sub(root.position).applyAxisAngle(new T.Vector3(0,1,0),object.rotation.y-root.rotation.y);
  const point=kind==='chair'?object.position:restingPoint(object,v());
  return {kind,x:point.x-off.x,z:point.z-off.z,yaw:object.rotation.y,...(kind!=='chair'?{frontX:-Math.sin(object.rotation.y),frontZ:-Math.cos(object.rotation.y),objectX:point.x,objectZ:point.z}: {})};}
 function update({name='',mode='',time=0,duration=1,equipped='',pickup='',flashOn=false}){
  const picking=mode==='game'&&/PickUp_Table/.test(name),grabbed=picking&&time/Math.max(duration,.001)>=.30;
  const pistolInHand=equipped==='pistol'||(pickup==='pistol'&&grabbed),parcelInHand=equipped==='box'||(pickup==='box'&&picking&&time/Math.max(duration,.001)>=.30);
  pistol.visible=!!candidate;parcel.visible=!!candidate;rifle.visible=!!candidate;
  const rifleInHand=equipped==='rifle'||(pickup==='rifle'&&grabbed);
  // V0.38: weapons are posed from the visible hand with a measured grip (weapon-grip.js); Sam's skin keeps the old palm placement
  const flags={aiming:/aim/i.test(name),firing:/shoot|fire|firing/i.test(name),reloading:/reload/i.test(name),facing:candidate?new T.Vector3(0,0,1).applyQuaternion(candidate.getWorldQuaternion(new T.Quaternion())).setY(0).normalize():null};
  const held=rifleInHand?'rifle':pistolInHand?'pistol':'';if(!held||!visualRig)weaponGrip.release();
  if(rifleInHand&&visualRig&&weaponGrip.hold(rifle,'rifle',flags)){}else if(rifleInHand&&palm(rifle)){}else{restingPoint(rifleTable,rifle.position);rifle.position.y+=.055;rifle.rotation.set(0,rifleTable.rotation.y,Math.PI/2);}
  if(pistolInHand&&visualRig&&weaponGrip.hold(pistol,'pistol',flags)){}else if(pistolInHand&&palm(pistol)){}else{restingPoint(table,pistol.position);pistol.position.y+=.035;pistol.rotation.set(0,table.rotation.y,Math.PI/2);}
  if(parcelInHand&&palm(parcel,'r')){}else{restingPoint(boxTable,parcel.position);parcel.position.y+=.055;parcel.rotation.set(0,boxTable.rotation.y,0);}
  flash.visible=!!(pistolInHand&&flashOn);
 }

 function pickupColliders(){return [table,boxTable,rifleTable].map(o=>({minX:o.position.x-.18,maxX:o.position.x+.18,minZ:o.position.z-.17,maxZ:o.position.z+.17}));}
 return {weaponGrip,bind,setVisualRig,update,anchor,pickupColliders,chair,table,boxTable,pistol,rifle,rifleTable,parcel,assetsReady,modelStatus,get ready(){return valid(right)&&valid(left)}};
}
