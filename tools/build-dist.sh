#!/bin/sh
# Assemble the deployable folder (runtime files only; no tools/, tests or source GLBs).
set -e
cd "$(dirname "$0")/.."
python3 tools/patch.py && python3 tools/make-manifest.py
rm -rf dist && mkdir -p dist
cp -r index.html _headers CREDITS.md assets vendor dist/
(cd dist && zip -qr ../character-lab-v09-static-preview.zip .)
du -sh dist; ls -la character-lab-v09-static-preview.zip
