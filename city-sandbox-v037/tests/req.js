const {chromium}=require('playwright');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});const p=await b.newPage({viewport:{width:400,height:300}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/404/.test(m.text()))errs.push(m.text().slice(0,150))});
await p.goto(process.argv[2]);await p.waitForFunction(()=>globalThis.__skinBridge?.visible,null,{timeout:90000});await sleep(2500);
const r=await p.evaluate(()=>{const br=globalThis.__skinBridge;const out={handsCorrected:br.handsCorrected,profile:br.handProfile,mapped:br.mapped};
 const fingerRows=br.rows.filter(r=>/hand(thumb|index|middle|ring|pinky)\d/.test([...br.target].find(([k,v])=>v===r.dst)?.[0]||''));out.fingerRowsMapped=fingerRows.length;
 // independence: rotate each driver finger bone alone and see which visual bones move
 const keyOf=new Map([...br.target].map(([k,v])=>[v,k]));let independent=0,leaks=[];const Q=br.rows[0].offset.constructor;
 const snap=()=>new Map(fingerRows.map(r=>[r.dst,r.dst.getWorldQuaternion(new Q())]));
 for(const row of fingerRows){br.update();const before=snap();const saved=row.src.quaternion.clone();row.src.quaternion.multiply(new Q().setFromAxisAngle({x:1,y:0,z:0,isVector3:true},.35));br.update();const after=snap();row.src.quaternion.copy(saved);br.update();
  const moved=[...after].filter(([b,q])=>q.angleTo(before.get(b))>.01).map(([b])=>keyOf.get(b));const k=keyOf.get(row.dst);const desc=moved.filter(n=>n!==k);
  // descendants of the moved bone are expected to follow (same finger, later segments)
  const ok=moved.includes(k)&&desc.every(n=>n.slice(0,-1)===k.slice(0,-1)&&+n.slice(-1)>+k.slice(-1));if(ok)independent++;else leaks.push(k+'->'+moved.join(','))}
 out.fingersIndependent=independent+'/'+fingerRows.length;out.leaks=leaks;
 // per-frame cost of the bridge
 const t0=performance.now();for(let i=0;i<400;i++)br.update();out.bridgeUpdateMs=+((performance.now()-t0)/400).toFixed(3);
 const st=CharacterLab.state;out.npcs=st.library?.npcs;out.propLab={ready:st.propLab?.ready,models:st.propLab?.models,anchors:st.propLab?.anchors?.length,gripBones:st.propLab?.gripBones};out.clips=st.clips?.length;out.reviewClips=st.reviewClips?.length;out.pack=st.pack;return out});
r.errors=errs;console.log(JSON.stringify(r,null,1));await b.close()})();
