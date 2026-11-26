const {chromium}=require('playwright');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const BONES=['pelvis','thigh_l','thigh_r','calf_l','calf_r','foot_l','foot_r','ball_l','ball_r','spine_01','spine_02','spine_03','neck_01','head','clavicle_l','clavicle_r','upperarm_l','upperarm_r','lowerarm_l','lowerarm_r','hand_l','hand_r'];
const GROUPS={legs:['thigh_l','thigh_r','calf_l','calf_r','foot_l','foot_r','ball_l','ball_r'],pelvis:['pelvis'],torso:['spine_01','spine_02','spine_03','neck_01','head'],arms:['clavicle_l','clavicle_r','upperarm_l','upperarm_r','lowerarm_l','lowerarm_r','hand_l','hand_r']};
(async()=>{const url=process.argv[2],label=process.argv[3];const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});const p=await b.newPage({viewport:{width:320,height:240}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(url);await p.waitForFunction(()=>window.CharacterLab?.state.loaded,null,{timeout:90000});await sleep(1500);
async function capture(natural,keys,secs){await p.evaluate(n=>{CharacterLab.setNatural(n,1);document.getElementById('reset').click()},natural);await sleep(1500);for(const k of keys)await p.keyboard.down(k);
 await p.evaluate(names=>{window.__s=[];window.__run=true;(function loop(){const f={};for(const n of names)f[n]=CharacterLab.bone(n);__s.push(f);if(__run)requestAnimationFrame(loop)})()},BONES);await sleep(secs*1000);for(const k of keys)await p.keyboard.up(k);
 const s=await p.evaluate(()=>{__run=false;return __s});return s.slice(Math.floor(s.length*.2))}
const d=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);const sd=a=>{const m=a.reduce((x,y)=>x+y,0)/a.length;return Math.sqrt(a.reduce((x,y)=>x+(y-m)**2,0)/a.length)};
// motion range of a bone relative to the pelvis-forward travel is hard while walking, so use pelvis-relative position ranges
function stats(s,moving){const rel=(f,n)=>[f[n][0]-f.pelvis[0],f[n][1]-f.pelvis[1],f[n][2]-f.pelvis[2]];const out={};
 for(const [g,names] of Object.entries(GROUPS)){let worst=0;for(const n of names){for(let ax=0;ax<3;ax++){const v=s.map(f=>(n==='pelvis'?f[n]:rel(f,n))[ax]);if(moving&&ax===2&&n!=='pelvis')continue;worst=Math.max(worst,Math.max(...v)-Math.min(...v))}}out[g+'Range_mm']=Math.round(worst*1000)}
 out.pelvisRangeY_mm=Math.round((Math.max(...s.map(f=>f.pelvis[1]))-Math.min(...s.map(f=>f.pelvis[1])))*1000);
 out.pelvisRangeX_mm=Math.round((Math.max(...s.map(f=>f.pelvis[0]))-Math.min(...s.map(f=>f.pelvis[0])))*1000);
 for(const sd2 of ['l','r']){out['thighCalfLenSD_mm_'+sd2]=+(sd(s.map(f=>d(f['thigh_'+sd2],f['calf_'+sd2])))*1000).toFixed(2);out['calfFootLenSD_mm_'+sd2]=+(sd(s.map(f=>d(f['calf_'+sd2],f['foot_'+sd2])))*1000).toFixed(2);out['calfFootLenMax_mm_'+sd2]=Math.round(Math.max(...s.map(f=>d(f['calf_'+sd2],f['foot_'+sd2])))*1000)}
 return out}
const R={label,scenarios:{}};
for(const [name,keys,secs] of [['idle',[],14],['walk',['w'],7]]){const on=await capture(true,keys,secs),off=await capture(false,keys,secs);R.scenarios[name]={natural_ON:stats(on,keys.length>0),natural_OFF:stats(off,keys.length>0),frames:[on.length,off.length]}}
R.errors=errs;console.log(JSON.stringify(R));await b.close()})();
