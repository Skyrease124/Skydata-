# V0.37 Main character hand correction

Only the hands changed. Files touched: `index.html` (passes `{handProfile:'main-skin'}` to the skin bridge, label 037),
`skin-bridge.js` (one-time hand calibration on the first animated frame) and new `hand-profile.js` (correction profile for this character).

Cause: the bridge matched finger and forearm bones by direction only, leaving the finger curl axes arbitrary: fingers bent towards
the back of the hand and sideways, the thumb folded about 113 deg, and the forearm roll disagreed with the hand (twisted wrist).
Rig: Tripo auto-rig with Mixamo names, T-pose bind, local +Y down every bone, but asymmetric finger roll (right index ~37 deg off),
so the profile derives curl axes from joint positions. Skin weights checked: all vertices normalized, ~80% of wrist vertices blended,
2.6% of finger vertices shared by more than two fingers (normal webbing).

Result (headless Chromium): fingers curl towards the palm (sideways component 0.8 -> ~0.05), thumb rests beside the index,
graded index-to-pinky curl; 30/30 finger bones still follow their own driver bones (finger clips and grip poses transfer);
bridge cost unchanged (~0.17 ms/frame); clips, packages, props, ankle and NPC code unchanged.
External code: none copied. three.js SkeletonUtils (MIT) and Ozbrett/handhold (MIT) reviewed; Sheggyb/AnimStudio is AGPL-3.0 and was not used.
