# City Sandbox V0.37: main character hand correction

Only three runtime files differ from the live V0.36: `index.html` (passes `{handProfile:'main-skin'}`, label 037),
`skin-bridge.js` (one-time hand calibration hook) and the new `hand-profile.js`. Assets and all other modules are unchanged
(the full playable folder is the `city-sandbox-v037-hands.zip` delivered separately; the 21 MB of unchanged assets are not duplicated here).

Root cause: the skin bridge matched finger and forearm bones by direction only, so finger curl axes were arbitrary
(fingers bent towards the back of the hand and sideways, thumb folded ~113 deg) and the forearm roll disagreed with the hand.
Fix: anatomical frames from joint positions (the Tripo auto-rig's finger roll is asymmetric, so local axes are not trusted),
a per-character relaxed-hand profile, applied once on the first animated frame and folded into the existing offsets
(no extra per-frame work; 30/30 finger bones still follow their own driver bones).

External code: none copied. three.js SkeletonUtils (MIT) and Ozbrett/handhold (MIT) were reviewed; Sheggyb/AnimStudio is AGPL-3.0, so it was not used.
