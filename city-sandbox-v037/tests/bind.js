const {chromium}=require('playwright');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});const p=await b.newPage({viewport:{width:300,height:200}});
await p.goto('http://localhost:8130/index.html');await p.waitForFunction(()=>globalThis.__skinBridge?.visible,null,{timeout:90000});
console.log(JSON.stringify(await p.evaluate(()=>{const br=globalThis.__skinBridge;let mesh;br.visual.traverse(o=>{if(o.isSkinnedMesh)mesh=o});const sk=mesh.skeleton,M=sk.boneInverses[0].constructor,Vc=br.target.get('hips').position.constructor,Qc=br.target.get('hips').quaternion.constructor;
 // bind-space world matrices (mesh space) from inverse bind matrices
 const bind=n=>{const i=sk.bones.findIndex(b=>b.name.replace(/^mixamorig:?/,'')===n);return sk.boneInverses[i].clone().invert()};
 const pos=n=>new Vc().setFromMatrixPosition(bind(n)),rot=n=>new Qc().setFromRotationMatrix(new M().extractRotation(bind(n)));
 const r=v=>v.toArray().map(x=>+x.toFixed(2));const out={};
 out.leftArmDir=r(pos('LeftForeArm').sub(pos('LeftArm')).normalize());out.leftForeDir=r(pos('LeftHand').sub(pos('LeftForeArm')).normalize());out.upAxis='mesh space';
 for(const n of ['LeftHand','LeftHandIndex1','LeftHandIndex2','LeftHandMiddle1','LeftHandThumb1','LeftHandThumb2','RightHandIndex1']){const child=n.replace(/(\d)$/,d=>+d+1).replace(/Hand$/,'HandMiddle1');const q=rot(n);const dirW=pos(child).sub(pos(n)).normalize();const dirL=dirW.clone().applyQuaternion(q.clone().invert());out[n]={dirWorld:r(dirW),dirLocal:r(dirL),localX_world:r(new Vc(1,0,0).applyQuaternion(q)),localZ_world:r(new Vc(0,0,1).applyQuaternion(q))}}
 // palm normal in bind from index/pinky lateral and middle direction
 const w=pos('LeftHand'),m=pos('LeftHandMiddle1').sub(w).normalize(),lat=pos('LeftHandIndex1').sub(pos('LeftHandPinky1'));lat.addScaledVector(m,-lat.dot(m)).normalize();out.leftPalmNormal_bind=r(new Vc().crossVectors(m,lat).multiplyScalar(-1));
 out.thumbAngleFromMiddleDeg=Math.round(pos('LeftHandThumb2').sub(pos('LeftHandThumb1')).normalize().angleTo(m)*57.3);out.fingerSpreadDeg=Math.round(pos('LeftHandIndex2').sub(pos('LeftHandIndex1')).normalize().angleTo(pos('LeftHandPinky2').sub(pos('LeftHandPinky1')).normalize())*57.3);return out})))
await b.close()})();
