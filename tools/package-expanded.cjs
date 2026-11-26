const {chromium}=require('playwright');
const fs=require('fs');const assert=require('assert');
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||undefined,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 try{
 const p=await b.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 p.on('pageerror',e=>console.error('PAGEERROR',e.message));
 p.on('console',m=>{if(m.type()==='error')console.error(m.text())});
 await p.goto('http://127.0.0.1:8124/tools/bake-expanded.html');
 await p.waitForFunction(()=>!!window.OUT,null,{timeout:120000});
 const out=await p.evaluate(()=>window.OUT);
 const names=Object.keys(out.clips); console.log('BUNDLED',names);
 assert(names.length>=3);
 for(const [n,c] of Object.entries(out.clips)){
  assert(c.duration>0&&c.times.length>2&&c.times.every((x,i)=>Number.isFinite(x)&&(!i||x>c.times[i-1])),n+' times');
  for(const q of Object.values(c.quats)){assert(q.length===c.times.length*4&&q.every(Number.isFinite),n+' rotations');for(let i=0;i<q.length;i+=4)assert(Math.abs(Math.hypot(...q.slice(i,i+4))-1)<.002,n+' normalized rotations')}
  for(const v of Object.values(c.pos))assert(v.length===c.times.length*3&&v.every(Number.isFinite),n+' positions');
 }
 const old=JSON.parse(fs.readFileSync('assets/anims/ual-to-sam.json','utf8'));old.review=out.clips;fs.writeFileSync('assets/anims/ual-to-sam.json',JSON.stringify(old));
 await p.goto('http://127.0.0.1:8124/index.html');
 await p.waitForFunction(()=>window.CharacterLab?.state.loaded,null,{timeout:90000});
 const original=await p.evaluate(()=>CharacterLab.state.clips);
 const keys=await p.evaluate(()=>CharacterLab.state.reviewClips.filter(k=>k.startsWith('review:expanded:')));
 assert.equal(keys.length,names.length);
 const report=[];
 for(const k of keys){
  await p.evaluate(k=>{const s=document.getElementById('clip-test');s.value=k;s.dispatchEvent(new Event('change'))},k);
  await p.waitForFunction(()=>document.getElementById('foot-status').textContent.includes('Review only'));
  await p.waitForTimeout(250);
  const data=await p.evaluate(()=>({status:document.getElementById('gait-status').textContent,feet:CharacterLab.footWorld(),hip:CharacterLab.bone('pelvis')}));
  assert(data.hip?.every(Number.isFinite));assert(Object.values(data.feet).every(v=>v.every(Number.isFinite)));
  report.push({key:k,status:data.status});
 }
 await p.evaluate(()=>document.getElementById('view').click());
 await p.waitForTimeout(500);
 assert.deepStrictEqual(await p.evaluate(()=>CharacterLab.state.clips),original);
 assert(await p.evaluate(()=>CharacterLab.state.loaded));
 fs.writeFileSync('motion-review-report.json',JSON.stringify({newClips:names,originalGameplayStates:original,checks:report,scope:'Headless browser smoke and finite track checks; not visual quality or iPhone hardware testing.'},null,2));
 console.log('PASS',JSON.stringify({newClips:names,original}));
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exit(1)});
