const {chromium}=require('playwright');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const url=process.argv[2],label=process.argv[3],secs=Number(process.argv[4]||40);const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});const p=await b.newPage({viewport:{width:320,height:240}});
await p.goto(url);await p.waitForFunction(()=>window.CharacterLab?.state.loaded,null,{timeout:90000});await sleep(1500);
async function capture(amount,secs){await p.evaluate(a=>{CharacterLab.setNatural(a>0,a);document.getElementById('reset').click()},amount);await sleep(1200);
 await p.evaluate(()=>{window.__s=[];window.__run=true;let prev=performance.now(),t=0;(function loop(){const n=performance.now(),dt=Math.min(.05,(n-prev)/1000);prev=n;t+=dt;const g=CharacterLab.bone;__s.push({t,pel:g('pelvis'),head:g('head'),cl:g('clavicle_l'),cr:g('clavicle_r'),sp3:g('spine_03'),fl:g('foot_l'),fr:g('foot_r'),bl:g('ball_l'),br:g('ball_r'),tl:g('thigh_l'),cal:g('calf_l')});if(__run)requestAnimationFrame(loop)})()});await sleep(secs*1000);return p.evaluate(()=>{__run=false;return __s})}
const rel=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];const range=(v)=>Math.max(...v)-Math.min(...v);
const rng3=(s,name)=>Math.round(Math.hypot(range(s.map(f=>rel(f[name],f.pel)[0])),range(s.map(f=>rel(f[name],f.pel)[1])),range(s.map(f=>rel(f[name],f.pel)[2])))*1000);
const yaw=f=>Math.atan2(f.bl[0]-f.fl[0],f.bl[2]-f.fl[2])*180/Math.PI;
const windows=s=>{const T=s.at(-1).t,third=T/3;return [s.filter(f=>f.t<third),s.filter(f=>f.t>=2*third)]};
// power at frequency f (Hz) of a series on a uniform-ish sim-time axis (Goertzel-like DFT on the actual times)
const power=(s,vals,f)=>{const m=vals.reduce((a,b)=>a+b,0)/vals.length;let re=0,im=0;s.forEach((o,i)=>{const w=2*Math.PI*f*o.t;re+=(vals[i]-m)*Math.cos(w);im+=(vals[i]-m)*Math.sin(w)});return (re*re+im*im)/vals.length**2};
const on=await capture(1,secs);const [a,c]=windows(on);
const R={label,simSeconds:+on.at(-1).t.toFixed(1),frames:on.length,
 headRelPelvisRange_mm:{firstThird:rng3(a,'head'),lastThird:rng3(c,'head')},
 clavicleRelPelvisRange_mm:{firstThird:rng3(a,'cl'),lastThird:rng3(c,'cl')},
 footYawRange_deg:{l_first:+range(a.map(yaw)).toFixed(2),l_last:+range(c.map(yaw)).toFixed(2)},
 legRange_mm:{thigh_first:rng3(a,'tl'),thigh_last:rng3(c,'tl'),calf_first:rng3(a,'cal'),calf_last:rng3(c,'cal')},
 pelvisRange_mm:{first:Math.round(Math.hypot(range(a.map(f=>f.pel[0])),range(a.map(f=>f.pel[2])))*1000),last:Math.round(Math.hypot(range(c.map(f=>f.pel[0])),range(c.map(f=>f.pel[2])))*1000)}};
if(process.argv[5]==='breath'){const off=await capture(0,secs);const y=s=>s.map(f=>f.cl[1]-f.pel[1]);
 const band=(s,v)=>{let best=0,bf=0;for(let f=.15;f<=.40;f+=.01){const pw=power(s,v,f);if(pw>best){best=pw;bf=f}}return {peakHz:+bf.toFixed(2),power:best}};const bo=band(on,y(on)),bf=band(off,y(off));
 // power exactly in the breathing band (idle breathing = 0.23 Hz) relative to the same band with the layer off
 const at=(s,v)=>power(s,v,.23);R.breathing={clavicleHeight_range_mm:{layerOn:Math.round(range(y(on))*1000),layerOff:Math.round(range(y(off))*1000)},powerAt_0_23Hz:{layerOn:+at(on,y(on)).toExponential(2),layerOff:+at(off,y(off)).toExponential(2)},ratio:+(at(on,y(on))/Math.max(1e-12,at(off,y(off)))).toFixed(1),peakInBand:{layerOn:bo,layerOff:bf}}}
console.log(JSON.stringify(R,null,1));await b.close()})();
