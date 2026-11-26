# City Sandbox – Character Lab V0.9

Static site (no build step). Deploy the contents of `dist/` (or `character-lab-v09-static-preview.zip`) as a **draft** Netlify deploy:

    npx netlify-cli deploy --dir dist --site 254aa3ed-6d20-4a56-a3aa-992aa3064a88      # no --prod

## What changed from V0.8
* Sam gets jump / fall / land / crouch idle / crouch walk, retargeted offline from the CC0 Quaternius Universal Animation Library (`tools/bake-retarget.html`).
  Rules: world-delta rotation for spine/head/feet, aim-at-direction for arms (T-pose to A-pose safe), two-bone IK with the source knee as pole for legs.
* Walk now uses Sam's `Walk_Brisk` (measured 1.70 m/s, game walk is 1.65 m/s); per-clip measured ground speeds (`clipSpeeds`) drive playback rate. Foot slip while walking: 0.41 to 0.065 m/s.
* Sam's Jog/Run swung each arm with the same-side leg (calf~hand correlation +0.79/+0.88). The baker mirror-swaps the arm chains (now -0.79/-0.88).
* Leg solver works with Sam's detached IK-style foot bones (V0.8's foot lock never activated on Sam) and plants feet when the pelvis moves.
* Natural motion layer: breathing, idle weight shift, walking pelvis sway toward the stance foot, torso/shoulder counter-rotation, extra arm swing and elbow flex.
* Landing plays over ~0.6 s as an animation overlay; physics landing timer (0.16 s) and all movement/physics constants are unchanged.
* Floating Settings pill (collapsed on phones), front / side / rear / reset camera buttons.
* Touch: pointer capture is guarded (`InvalidPointerId`), per-button pointer sets, release on cancel / leave / blur / page hide.
* Three.js and all character files are local; unavailable sources are disabled via `assets/manifest.json`.

## Loading (fixed after the first Netlify publish)
V0.9's first upload showed a stand-in character on a phone: Sam was 21.9 MB and the fixed 18 s timeout expired, so the game silently fell back to the placeholder.
* `sam.glb` textures converted PNG to WebP at the same resolution: 21.9 MB to 7.2 MB (`gltf-transform webp in.glb out.glb --quality 90 --slots "*"`).
* Download progress card; the timeout now only fires after 30 s with no bytes; one automatic retry; a clear error card with Try again.
* No silent swap to another character, and the stand-in rig is never shown while Sam loads. Source availability comes only from `assets/manifest.json`.

## Rebuild
    python3 tools/patch.py            # tools/v08.html + tools/head.html -> index.html
    python3 tools/make-manifest.py    # list bundled .glb files
    # re-bake animations (serve the folder, open tools/bake-retarget.html in Chromium, save window.OUT to assets/anims/ual-to-sam.json)
