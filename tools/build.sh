#!/usr/bin/env bash
# Minifies dist/ and syncs the library into the skill's assets/ folder.
set -euo pipefail
cd "$(dirname "$0")/.."
npx --yes esbuild@0.24.2 dist/liquid-glass.js --minify --legal-comments=inline --outfile=dist/liquid-glass.min.js --log-level=warning
npx --yes esbuild@0.24.2 dist/liquid-glass.css --minify --legal-comments=inline --outfile=dist/liquid-glass.min.css --log-level=warning
cp dist/liquid-glass.js dist/liquid-glass.css skills/liquid-glass/assets/
echo "min+gzip: js $(gzip -c dist/liquid-glass.min.js | wc -c | tr -d ' ') B, css $(gzip -c dist/liquid-glass.min.css | wc -c | tr -d ' ') B"
