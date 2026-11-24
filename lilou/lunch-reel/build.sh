#!/usr/bin/env bash
# Bouwt export/lilou-lunch-reel.mp4 opnieuw: fonts -> frames -> audio -> mp4.
set -euo pipefail
cd "$(dirname "$0")"
[ -f fonts/Vonca-Light.woff ] || ./get-fonts.sh
node render.js video
python3 build_audio.py
# de reel-animatie duurt 18,6 s; de eindkaart blijft 1,4 s langer staan voor de uitklank
ffmpeg -y -loglevel error -framerate 30 -i frames/f%04d.jpg -i audio/mix.wav \
  -filter_complex "[0:v]tpad=stop_mode=clone:stop_duration=1.4[v]" -map "[v]" -map 1:a \
  -c:v libx264 -pix_fmt yuv420p -crf 18 -preset slow -c:a aac -b:a 256k -t 20 \
  -movflags +faststart export/lilou-lunch-reel.mp4
echo "Klaar: export/lilou-lunch-reel.mp4"
