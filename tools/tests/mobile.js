const {chromium,devices}=require('playwright');const sleep=ms=>new Promise(r=>setTimeout(r,ms));const OUT='/home/user/character-lab-v09/test-results';
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const c=await b.newContext({...devices['iPhone 13'],deviceScaleFactor:2});const p=await c.newPage();const errs=[],hosts=new Set();p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('console',m=>{if(m.type()==='error'||(m.type()==='warning'&&!/GPU stall|GL Driver/.test(m.text())))errs.push(m.type()+': '+m.text().slice(0,160))});p.on('request',r=>{const u=new URL(r.url());if(u.protocol.startsWith('http'))hosts.add(u.host)});
await p.goto('http://localhost:8124/index.html');await p.waitForFunction(()=>window.CharacterLab?.state.loaded,null,{timeout:90000});await sleep(3000);
const R={};const cdp=await c.newCDPSession(p);
const box=async sel=>{const r=await p.locator(sel).boundingBox();return r&&{x:r.x,y:r.y,w:r.width,h:r.height}};
const ctr=async k=>{const r=await p.locator(`#touch [data-key="${k}"]`).boundingBox();return {x:r.x+r.width/2,y:r.y+r.height/2}};
const tp=(id,pt)=>({x:pt.x,y:pt.y,id,radiusX:12,radiusY:12,force:1});const touch=(type,pts)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts});
const st=()=>p.evaluate(()=>({mode:CharacterLab.state.mode,speed:+CharacterLab.state.speed.toFixed(2)}));
const vp=p.viewportSize();R.viewport=vp;
R.menuCollapsedByDefault=await p.evaluate(()=>document.getElementById('panel').hidden);R.toggle=await box('#menu-toggle');R.panelBoxBefore=await box('#panel');
await p.screenshot({path:`${OUT}/mobile-menu-closed.png`});
await p.locator('#menu-toggle').tap();await sleep(500);R.panelOpen=await box('#panel');R.panelAreaPct=Math.round(100*R.panelOpen.w*R.panelOpen.h/(vp.width*vp.height));R.ariaExpanded=await p.getAttribute('#menu-toggle','aria-expanded');await p.screenshot({path:`${OUT}/mobile-menu-open.png`});
await p.locator('#menu-toggle').tap();await sleep(400);R.closedAgain=await p.evaluate(()=>document.getElementById('panel').hidden);
R.headerBox=await box('header');R.statsBox=await box('aside');
// multi-touch: forward + RUN + left (all three fingers at once)
const W=await ctr('w'),Rn=await ctr('shift'),A=await ctr('a'),J=await ctr(' '),Cr=await ctr('c');
R.buttonSizes=await p.evaluate(()=>[...document.querySelectorAll('#touch button')].map(b=>b.dataset.key+':'+Math.round(b.getBoundingClientRect().width)+'x'+Math.round(b.getBoundingClientRect().height)));
await touch('touchStart',[tp(1,W)]);await sleep(2500);R.W=await st();
await touch('touchStart',[tp(1,W),tp(2,Rn)]);await sleep(3000);R.W_RUN=await st();R.pressedClass=await p.evaluate(()=>[...document.querySelectorAll('#touch .on')].map(b=>b.dataset.key));
await p.screenshot({path:`${OUT}/mobile-sprint.png`});
await touch('touchStart',[tp(1,W),tp(2,Rn),tp(3,A)]);await sleep(2000);R.W_RUN_A=await st();
await touch('touchEnd',[tp(1,W),tp(3,A)]);await sleep(1500);R.afterReleasingWandA_runStillHeld=await p.evaluate(()=>[...document.querySelectorAll('#touch .on')].map(b=>b.dataset.key));
await touch('touchEnd',[]);await sleep(2500);R.released=await st();R.stuck=await p.evaluate(()=>document.querySelectorAll('#touch .on').length);
// jump + crouch taps, rapid taps (capture race)
for(let i=0;i<8;i++){await touch('touchStart',[tp(7,J)]);await touch('touchEnd',[]);await sleep(40)}
await sleep(2500);R.afterRapidJumpTaps=await st();
await touch('touchStart',[tp(8,Cr)]);await sleep(1500);R.crouch=await st();await touch('touchStart',[tp(8,Cr),tp(9,W)]);await sleep(2500);R.crouchWalk=await st();await touch('touchEnd',[]);await sleep(800);
// touch cancel mid-press must release
await touch('touchStart',[tp(10,W)]);await sleep(800);await touch('touchCancel',[]);await sleep(1200);R.afterCancel=await st();R.stuckAfterCancel=await p.evaluate(()=>document.querySelectorAll('#touch .on').length);
// camera drag with a second finger on the pad (look while moving)
const before=await p.evaluate(()=>CharacterLab.camera.yaw);await touch('touchStart',[tp(11,W),tp(12,{x:200,y:300})]);for(let i=1;i<=6;i++){await touch('touchMove',[tp(11,W),tp(12,{x:200+i*18,y:300})]);await sleep(60)}await touch('touchEnd',[]);R.cameraYawChanged=(await p.evaluate(()=>CharacterLab.camera.yaw))!==before;
R.fps=[];for(let i=0;i<3;i++){await sleep(1000);R.fps.push(await p.evaluate(()=>document.getElementById('fps').textContent))}
R.scrollOverflowX=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth);R.hosts=[...hosts];R.errors=[...new Set(errs)];
require('fs').writeFileSync(OUT+'/mobile-results.json',JSON.stringify(R,null,1));console.log(JSON.stringify(R,null,1));await b.close()})();
