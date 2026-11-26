// injected into the page: hand metrics for a boneMap (Map canonical -> bone)
globalThis.handMetrics=function(m,side){const V=()=>new (m.get('hips').position.constructor)();const P=k=>m.get(side+k)?.getWorldPosition(V());const deg=r=>Math.round(r*180/Math.PI);
 const fa=P('forearm'),w=P('hand'),i1=P('handindex1'),m1=P('handmiddle1'),p1=P('handpinky1'),t1=P('handthumb1');if(!w||!m1)return null;
 const fore=w.clone().sub(fa).normalize(),handDir=m1.clone().sub(w).normalize();
 let lat=i1.clone().sub(p1);lat.addScaledVector(handDir,-lat.dot(handDir)).normalize();
 // palm normal: right-hand rule so it points out of the palm for both sides
 const n=V().crossVectors(handDir,lat).multiplyScalar(side==='left'?-1:1).normalize();
 const r={wristBendDeg:deg(fore.angleTo(handDir))};
 // flexion (+ toward palm) vs extension (- toward back of hand)
 r.wristFlexDeg=deg(Math.asin(Math.max(-1,Math.min(1,-handDir.dot(n)+fore.dot(n)))) );
 const fingers={};let spread=0;
 for(const f of ['thumb','index','middle','ring','pinky']){const a=P('hand'+f+'1'),b=P('hand'+f+'2'),c=P('hand'+f+'3'),d=P('hand'+f+'4');if(!a||!b||!c)continue;const s1=b.clone().sub(a).normalize(),s3=(d||c).clone().sub(c.clone()).length()>1e-5&&d?d.clone().sub(c).normalize():c.clone().sub(b).normalize();
  const bend=s3.clone().sub(s1);fingers[f]={curlDeg:deg(s1.angleTo(s3)),towardPalm:+(bend.dot(n)/Math.max(1e-6,bend.length())).toFixed(2),sideways:+(Math.abs(bend.dot(lat))/Math.max(1e-6,bend.length())).toFixed(2),splayDeg:deg(s1.angleTo(handDir))}}
 r.fingers=fingers;r.indexPinkySpreadDeg=deg(i1.clone().sub(w).normalize().angleTo(p1.clone().sub(w).normalize()));
 const tt=P('handthumb4')||P('handthumb3');r.thumbTipToIndex1_cm=+(tt.distanceTo(i1)*100).toFixed(1);r.thumbTipPalmSide_cm=+((tt.clone().sub(w)).dot(n)*100).toFixed(1);
 // palm facing: + means palm faces the body midline (natural relaxed hang)
 const hips=m.get('hips').getWorldPosition(V());const toMid=hips.clone().sub(w);toMid.y=0;toMid.normalize();r.palmFacesBody=+n.dot(toMid).toFixed(2);r.palmFacesBack=0;return r};
