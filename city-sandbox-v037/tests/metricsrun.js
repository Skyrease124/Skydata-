const {chromium}=require('playwright');const sleep=ms=>new Promise(r=>setTimeout(r,ms));const fs=require('fs');
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});const p=await b.newPage({viewport:{width:400,height:300}});
await p.goto(process.argv[2]);await p.waitForFunction(()=>globalThis.__skinBridge?.visible,null,{timeout:90000});await sleep(2500);await p.addScriptTag({content:fs.readFileSync(process.argv[3],'utf8')});
const R={};for(const [st,keys] of [['idle',[]],['walk',['w']],['run',['w','Shift']]]){for(const k of keys)await p.keyboard.down(k);await sleep(keys.length?2500:500);
 R[st]=await p.evaluate(()=>{const br=globalThis.__skinBridge;const o={};for(const s of ['left','right']){o['sam_'+s]=handMetrics(br.source,s);o['skin_'+s]=handMetrics(br.target,s)}return o});for(const k of keys)await p.keyboard.up(k);await sleep(1500)}
fs.writeFileSync(process.argv[4],JSON.stringify(R));await b.close()})();
