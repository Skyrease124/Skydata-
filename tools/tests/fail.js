const {chromium,devices}=require('playwright');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});const c=await b.newContext({...devices['iPhone 13'],deviceScaleFactor:1});const p=await c.newPage();let blocked=true,hits=0;
await p.route('**/assets/characters/sam.glb',r=>{if(blocked){hits++;r.fulfill({status:503,body:'nope'})}else r.continue()});
await p.goto('http://localhost:8124/index.html');await sleep(6000);
const card=await p.evaluate(()=>({visible:!document.getElementById('loading').hidden,title:document.getElementById('loading-title').textContent,detail:document.getElementById('loading-detail').textContent,retry:!document.getElementById('loading-retry').hidden,source:document.getElementById('source').value,loaded:!!window.CharacterLab?.state.loaded}));console.log('while Sam is blocked:',JSON.stringify(card),'requests',hits);
await p.screenshot({path:`${process.argv[2]}/fail-card.png`});
blocked=false;await p.locator('#loading-retry').tap();await sleep(12000);
console.log('after Try again:',JSON.stringify(await p.evaluate(()=>({cardHidden:document.getElementById('loading').hidden,loaded:!!window.CharacterLab?.state.loaded,source:document.getElementById('source').value,clips:window.CharacterLab?.state.clips.length}))));await b.close()})();
