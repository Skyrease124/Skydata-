const {chromium,devices}=require('playwright');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const mbps=Number(process.argv[2]||8);const url=process.argv[3]||'http://localhost:8124/index.html';const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});const c=await b.newContext({...devices['iPhone 13'],deviceScaleFactor:1});const p=await c.newPage();
const cdp=await c.newCDPSession(p);await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:80,downloadThroughput:mbps*125000,uploadThroughput:125000});
const t0=Date.now();await p.goto(url);const rep=()=>p.evaluate(()=>({report:document.getElementById('report').textContent,source:document.getElementById('source').value,loaded:!!window.CharacterLab?.state.loaded}));
for(const s of [6,15,30,50]){await sleep(Math.max(0,t0+s*1000-Date.now()));console.log(`t=${s}s`,JSON.stringify(await rep()));if(s===6||s===50)await p.screenshot({path:`${process.argv[4]||'/tmp'}/slow-${mbps}mbps-t${s}.png`})}
await b.close()})();
