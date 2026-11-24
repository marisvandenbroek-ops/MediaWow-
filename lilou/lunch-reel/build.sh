#!/usr/bin/env bash
# Bouwt de reel opnieuw: fonts -> frames -> audio -> mp4 (met muziek) + mp4 zonder muziek.
set -euo pipefail
cd "$(dirname "$0")"
[ -f fonts/Vonca-Light.woff ] || ./get-fonts.sh
node render.js video
python3 build_audio.py
# de animatie duurt 18,6 s; de eindkaart blijft staan tot END uit build_audio.py
END=$(python3 -c "import build_audio; print(build_audio.END)")
HOLD=$(python3 -c "print(round($END - 18.6, 2))")
VOPTS=(-c:v libx264 -pix_fmt yuv420p -crf 18 -preset slow -movflags +faststart)
ffmpeg -y -loglevel error -framerate 30 -i frames/f%04d.jpg -i audio/mix.wav \
  -filter_complex "[0:v]tpad=stop_mode=clone:stop_duration=$HOLD[v]" -map "[v]" -map 1:a \
  -af "loudnorm=I=-14:TP=-1:LRA=11" -ar 48000 "${VOPTS[@]}" -c:a aac -b:a 256k -t "$END" export/lilou-lunch-reel.mp4
# versie zonder geluid, om zelf een (trending) nummer in Instagram toe te voegen
ffmpeg -y -loglevel error -framerate 30 -i frames/f%04d.jpg \
  -filter_complex "[0:v]tpad=stop_mode=clone:stop_duration=1.4[v]" -map "[v]" \
  "${VOPTS[@]}" -t 20 export/lilou-lunch-reel-zonder-muziek.mp4
echo "Klaar: export/lilou-lunch-reel.mp4 en export/lilou-lunch-reel-zonder-muziek.mp4"
