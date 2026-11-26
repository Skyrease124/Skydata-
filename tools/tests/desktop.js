const {chromium}=require('playwright');const sleep=ms=>new Promise(r=>setTimeout(r,ms));const OUT='/home/user/character-lab-v09/test-results';
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});const p=await b.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});
const errs=[],hosts=new Set(),reqs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('console',m=>{if(m.type()==='error'||(m.type()==='warning'&&!/GPU stall|GL Driver/.test(m.text())))errs.push(m.type()+': '+m.text().slice(0,160))});p.on('requestfailed',r=>errs.push('REQFAIL '+r.url()));p.on('request',r=>{const u=new URL(r.url());if(u.protocol.startsWith('http'))hosts.add(u.host);reqs.push(u.pathname)});
const t0=Date.now();await p.goto('http://localhost:8124/index.html');await p.waitForFunction(()=>window.CharacterLab?.state.loaded,null,{timeout:90000});const loadMs=Date.now()-t0;await sleep(2500);
const R={loadMs};R.sources=await p.evaluate(()=>[...document.querySelectorAll('#source option')].map(o=>o.textContent+(o.disabled?' [disabled]':' [enabled]')));
R.state0=await p.evaluate(()=>CharacterLab.state);R.report=await p.evaluate(()=>[document.getElementById('report').textContent,document.getElementById('asset-details').textContent,document.getElementById('foot-status').textContent]);
const poll=async(ms,every=120)=>{const seq=[];const end=Date.now()+ms;while(Date.now()<end){seq.push(await p.evaluate(()=>CharacterLab.state.mode));await sleep(every)}return seq.filter((m,i,a)=>i===0||m!==a[i-1])};
// locomotion
await p.keyboard.down('w');R.walk=await poll(3500);await p.keyboard.down('Shift');R.sprint=await poll(3500);await p.keyboard.up('Shift');await p.keyboard.up('w');await sleep(1500);
// jump twice (second one verifies one-shot clips restart)
for(const n of [1,2]){await p.keyboard.press(' ');R['jump'+n]=await poll(3000,60);await sleep(1200)}
// crouch
await p.keyboard.down('c');R.crouchIdle=await poll(1500);await p.keyboard.down('w');R.crouchWalk=await poll(2500);await p.keyboard.up('w');await p.keyboard.up('c');await sleep(800);
R.gaitDuringCrouch=await p.evaluate(()=>document.getElementById('gait-status').textContent);
R.fps=[];for(let i=0;i<4;i++){await sleep(1000);R.fps.push(await p.evaluate(()=>document.getElementById('fps').textContent))}
R.hosts=[...hosts];R.errors=[...new Set(errs)];R.requests=[...new Set(reqs)];
// screenshots: live idle (natural layer on) front/side/rear
await p.evaluate(()=>{document.getElementById('reset').click();document.getElementById('panel').hidden=true;document.getElementById('hint').style.display='none'});
for(const v of ['front','side','rear']){await p.evaluate(v=>CharacterLab.setView(v),v);await sleep(3000);await p.screenshot({path:`${OUT}/live-idle-${v}.png`})}
require('fs').writeFileSync(OUT+'/desktop-results.json',JSON.stringify(R,null,1));console.log(JSON.stringify(R,null,1));await b.close()})();
