# V0.38 Realistic weapon handling (main character skin)

Before: a held weapon copied the palm basis directly (barrel along the fingers, weapon "up" through the back of the hand),
sat at a fixed offset tuned for Sam, the support hand never touched the weapon and the fingers kept a relaxed pose.

Now (`weapon-grip.js`, called from `prop-lab.js` only while a weapon is held on the new skin; Sam's skin keeps the old placement):
* Grip geometry measured from each weapon GLB (grip centre, grip tilt, handguard, stock) in the weapon's own space.
* The weapon is posed FROM the right hand: grip axis from pinky to index, palm on the back strap, knuckles forward.
* Closed power grip on the right hand: index along the frame while carrying, on the trigger while aiming/firing.
* Two-bone IK for both arms, blended in and out:
  - pistol carry: two-handed low ready (muzzle ~40 deg down); aim/fire: isosceles stance, both hands on the grip;
  - rifle carry/walk: two-handed low ready across the chest; aim: stock in the shoulder pocket, left hand on the handguard;
  - reload: the support hand releases so the reload animation plays.
* Aim detection is case-insensitive, so imported "idle aiming" rifle packages also use the shoulder stance.
Also fixed in `hand-profile.js`: finger curl direction is now chosen once per finger (deep grip curls no longer fold backwards).
Verified headlessly with the real pickup flow: pistol and rifle pick up, carry, aim, fire, reload, walk, put away; no errors.
Not verified: the user's imported rifle aim package (not available in the test browser) and real-device FPS.
