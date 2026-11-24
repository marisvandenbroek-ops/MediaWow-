#!/usr/bin/env bash
# Haalt de Vonca-webfonts van de live LILOU-site op.
# Vonca is een gelicenseerd lettertype van LILOU en staat daarom niet in deze (openbare) repo.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p fonts
for w in Light Regular Medium; do
  curl -fsS "https://lilou-ede.nl/wp-content/uploads/2026/10/Vonca-$w.woff" -o "fonts/Vonca-$w.woff"
done
echo "Fonts opgehaald in fonts/"
