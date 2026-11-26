#!/usr/bin/env python3
"""Lists the model files that physically exist so the game can disable sources whose files are absent (no 404 probing)."""
import json,pathlib
root=pathlib.Path(__file__).resolve().parent.parent
files=sorted(str(p.relative_to(root)) for p in (root/'assets').rglob('*.glb'))
(root/'assets'/'manifest.json').write_text(json.dumps({'files':files},indent=1)+'\n');print(files)
