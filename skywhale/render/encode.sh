#!/usr/bin/env bash
# Encode rendered PNG frames (frame_00000.png ...) to the final film: 1920x1080, 48 fps, H.264,
# muxed with the soundtrack. Also writes a lighter web version for the site.
# usage: ./encode.sh FRAMES_DIR AUDIO_WAV OUT.mp4
set -euo pipefail
FRAMES="${1:?frames dir}"; AUDIO="${2:-}"; OUT="${3:-skywhale.mp4}"
AIN=(); AMAP=(); [ -n "$AUDIO" ] && [ -f "$AUDIO" ] && AIN=(-i "$AUDIO") && AMAP=(-map 0:v -map 1:a -c:a aac -b:a 256k -shortest)
# master: high quality, grain preserved
ffmpeg -y -framerate 48 -i "$FRAMES/frame_%05d.png" "${AIN[@]}" "${AMAP[@]}" \
  -c:v libx264 -preset slow -crf 14 -tune grain -pix_fmt yuv420p -profile:v high -movflags +faststart \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 "$OUT"
# web: smaller, still 1080p48
ffmpeg -y -i "$OUT" -c:v libx264 -preset slow -crf 22 -tune grain -pix_fmt yuv420p -movflags +faststart -c:a copy "${OUT%.mp4}_web.mp4"
ls -la "$OUT" "${OUT%.mp4}_web.mp4"
