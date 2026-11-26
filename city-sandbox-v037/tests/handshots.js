const {chromium}=require('playwright');const sleep=ms=>new Promise(r=>setTimeout(r,ms));const fs=require('fs');
const [url,out,tag]=[process.argv[2],process.argv[3],process.argv[4]];
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});const p=await b.newPage({viewport:{width:900,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,150))});
await p.goto(url);await p.waitForFunction(()=>window.CharacterLab?.state.loaded&&globalThis.__skinBridge?.visible,null,{timeout:120000});await sleep(3000);
async function shots(state){return p.evaluate(()=>{const {camera,renderer,scene}=globalThis.__lab,T=camera.constructor;const br=globalThis.__skinBridge;const yaw=CharacterLab.state.yaw;const fwd=[Math.sin(yaw),0,Math.cos(yaw)],lft=[Math.cos(yaw),0,-Math.sin(yaw)];
 const cam=camera.clone();cam.fov=28;cam.aspect=1;cam.updateProjectionMatrix();const out={};
 for(const side of ['left','right']){const hand=br.target.get(side+'hand'),mid=br.target.get(side+'handmiddle2');const hp=hand.getWorldPosition(camera.position.clone()),mp=mid.getWorldPosition(camera.position.clone());const c=hp.clone().lerp(mp,.5);const s=side==='left'?1:-1;
  const views={front:[fwd[0],.05,fwd[2]],back:[-fwd[0],.05,-fwd[2]],outside:[lft[0]*s,.05,lft[2]*s],top:[fwd[0]*.25,1,fwd[2]*.25],below:[fwd[0]*.6+lft[0]*s*.3,-.55,fwd[2]*.6+lft[2]*s*.3]};
  for(const [v,d] of Object.entries(views)){const L=Math.hypot(...d);cam.position.set(c.x+d[0]/L*.42,c.y+d[1]/L*.42,c.z+d[2]/L*.42);cam.up.set(0,1,0);if(v==='top')cam.up.set(fwd[0],0,fwd[2]);cam.lookAt(c);renderer.render(scene,cam);
   // square crop from canvas centre
   const cv=renderer.domElement,t=document.createElement('canvas'),m=Math.min(cv.width,cv.height);t.width=t.height=420;t.getContext('2d').drawImage(cv,(cv.width-m)/2,(cv.height-m)/2,m,m,0,0,420,420);out[side+'-'+v]=t.toDataURL('image/png')}}
 return out})}
const states=[['idle',[]],['walk',['w']],['run',['w','Shift']]];
for(const [st,keys] of states){await p.evaluate(()=>document.getElementById('reset')?.click());await sleep(800);for(const k of keys)await p.keyboard.down(k);await sleep(keys.length?2500:1500);
 const r=await shots(st);for(const k of keys)await p.keyboard.up(k);for(const [k,v] of Object.entries(r))fs.writeFileSync(`${out}/${tag}-${st}-${k}.png`,Buffer.from(v.split(',')[1],'base64'));await sleep(1500)}
console.log('errors',errs);await b.close()})();
