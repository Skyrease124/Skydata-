# Character Lab V0.9 – credits and licenses

Everything the game loads at runtime is bundled in this folder; there are no CDN or third-party model requests.

| Asset | File | Source | License |
|---|---|---|---|
| Sam character (rigged, textured) | `assets/characters/sam.glb` | Innerscene "Locomotion collection – Sam", adapted from MakeHuman / MPFB assets (https://www.innerscene.com/tools/library/3d-parts/locomotion-collection-sam-3d-person-animated-dc23800f) | CC0 1.0 (public domain; page checked 2026-11-26) |
| Jump, fall, land, crouch idle, crouch walk | `assets/anims/ual-to-sam.json` | Baked from the Quaternius **Universal Animation Library [Standard]** (https://opengameart.org/content/universal-animation-library) with `tools/bake-retarget.html`. Source GLB kept in `tools/sources/` | CC0 1.0 |
| Arm-phase correction of Sam's Jog and Run | same JSON, `fixes` | Derived from Sam's own clips (mirror swap of the arm chains) | CC0 1.0 (derivative of Sam) |
| Development proxy character | `assets/hero.glb` | Original V0.8 placeholder | Project asset |
| Three.js r170 + GLTFLoader + meshopt decoder | `vendor/three/` | https://threejs.org | MIT (`vendor/three/LICENSE`) |

Sources listed in the selector but not bundled (Custom, Casual Man, Andre, Casual Walker) stay **disabled** until their `.glb` files exist
under `assets/characters/` and are listed in `assets/manifest.json` (run `python3 tools/make-manifest.py`).
Casual Man is CC BY 4.0 (vinish.dev), Casual Walker CC0 (tevy), Andre is Microsoft Rocketbox (MIT): add attribution if you bundle them.
