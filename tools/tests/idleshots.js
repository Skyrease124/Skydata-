const {chromium}=require('playwright');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const [url,out,waitS]=[process.argv[2],process.argv[3],Number(process.argv[4]||25)];const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});const p=await b.newPage({viewport:{width:720,height:760}});
await p.goto(url);await p.waitForFunction(()=>window.CharacterLab?.state.loaded,null,{timeout:90000});await sleep(500);
await p.evaluate(()=>{for(const id of ['panel','hint','touch','menu-toggle'])document.getElementById(id).style.display='none'});
await sleep(waitS*1000); // let the live idle (with the natural-motion layer) run
const st=await p.evaluate(()=>CharacterLab.state);console.log('mode',st.mode,'natural layer strength',st.natural?.toFixed(2));
// orbit the gameplay camera with a mouse drag (keeps the character in live play, so the layer stays active)
async function drag(dx){await p.mouse.move(40,400);await p.mouse.down();await p.mouse.move(40+dx,400,{steps:8});await p.mouse.up()}
await p.evaluate(()=>{});await sleep(1500);await p.screenshot({path:`${out}-rear.png`});
await drag(314);await sleep(2500);await p.screenshot({path:`${out}-side.png`});   // yaw +90 deg
await drag(314);await sleep(2500);await p.screenshot({path:`${out}-front.png`});  // yaw +180 deg
console.log('camera',JSON.stringify(await p.evaluate(()=>CharacterLab.camera)));await b.close()})();
