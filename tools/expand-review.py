from pathlib import Path
p=Path('tools/bake-retarget.html').read_text()
p=p.replace("const JOBS=[", "const oldJOBS=[",1)
a=p.index("const result={")
p=p[:a]+'''// Pick distinct unarmed locomotion and idle clips from the actual source library.
const used=new Set(oldJOBS.map(j=>j.src));
const candidates=ual.animations.filter(c=>c.duration>.2&&c.duration<=12&&!used.has(c.name)&&!/weapon|rifle|pistol|sword|gun|shoot|attack|hit|death|aim|combat/i.test(c.name));
const patterns=[/walk.*(fwd|forward)|^(walk|walking)(_|$)/i,/run.*(fwd|forward)|^(run|running|jog)(_|$)/i,/sprint/i,/walk.*(back|bwd)/i,/walk.*(left|_l_)|strafe.*left/i,/walk.*(right|_r_)|strafe.*right/i,/turn.*left/i,/turn.*right/i,/idle/i,/run.*(back|bwd)/i,/run.*(left|right)/i,/walk/i,/run/i];
const picked=[];
for(const pattern of patterns){const c=candidates.find(c=>pattern.test(c.name)&&!picked.includes(c));if(c)picked.push(c);}
for(const c of candidates.filter(c=>/walk|run|sprint|jog|strafe|turn|idle/i.test(c.name))){if(picked.length>=12)break;if(!picked.includes(c))picked.push(c);}
const JOBS=picked.slice(0,12).map(c=>({out:'CC0 '+c.name,src:c.name,t0:0,t1:Math.floor(c.duration*FPS)/FPS,loop:/loop/i.test(c.name)}));
if(JOBS.length<3)throw Error('Not enough distinct locomotion candidates: '+ual.animations.map(c=>c.name).join(', '));
window.sourceClipNames=ual.animations.map(c=>c.name);
''' + p[a:]
# Retain the original proven retargeter, but use an independent review catalog.
p=p.replace("const {S}=solvePose();times.push", "const {S}=solvePose();times.push")
# Avoid source clip wrapping on the last sample of one-shot motions.
p=p.replace("sMixer.setTime(t);ual.scene.updateMatrixWorld(true);const {S}=solvePose()", "sMixer.setTime(Math.min(t,clip.duration-1e-5));ual.scene.updateMatrixWorld(true);const {S}=solvePose()")
# Preserve the existing gameplay fixes; review bake only needs relaxed fingers.
a=p.index("// ---- Sam's own Jog")
b=p.index("// relaxed idle fingers",a)
p=p[:a]+p[b:]
Path('tools/bake-expanded.html').write_text(p)
