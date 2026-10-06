#!/bin/sh
# build_preview_video.sh — assemble the App Store preview animatic.
#
# WHAT THIS IS: a 30-second animatic built from the storyboard frames. It proves
# the caption copy, the ordering and the pacing.
#
# WHAT IT IS NOT: a submittable App Store preview. A preview must show the app
# running, and the app has never been built on this machine. Submitting this
# would misrepresent it. When real simulator screenshots exist, drop them into
# preview/store/ with the same filenames and re-run this script.
#
# App Store Connect requires 1290x2796 for a 6.9 inch iPhone preview, 15 to 30
# seconds, and it accepts silent video. No music bed is used, both because
# licensing is a real question and because an urgent music bed is off-doctrine.
#
# Usage: sh scripts/build_preview_video.sh
set -e

cd "$(dirname "$0")/.."
STORE=preview/store
OUT=preview/store/preview-animatic.mp4
TMP=/tmp/gse-video
SECS_PER_FRAME=5
FPS=30

command -v ffmpeg >/dev/null 2>&1 || { echo "ffmpeg is required"; exit 1; }

rm -rf "$TMP"
mkdir -p "$TMP"

FRAMES="01-gate 02-evidence 03-calibration 04-withheld 05-quiet 06-receipt"

echo "── 1/3  building clips (${SECS_PER_FRAME}s each, slow push in) ──────────"
for f in $FRAMES; do
  [ -f "$STORE/$f.png" ] || { echo "missing $STORE/$f.png"; exit 1; }
  # A very slow zoom (1.0 to 1.04) gives the still frame life without the
  # motion competing with the copy. The design contract forbids decorative
  # animation; this is a camera move on a static frame, not an animated value.
  ffmpeg -loglevel error -y \
    -loop 1 -i "$STORE/$f.png" \
    -t "$SECS_PER_FRAME" \
    -filter_complex "[0:v]scale=1677:3635,zoompan=z='min(1.0+0.0004*on,1.04)':d=${SECS_PER_FRAME}*${FPS}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1290x2796:fps=${FPS},format=yuv420p[v]" \
    -map "[v]" -c:v libx264 -preset veryfast -crf 20 -r "$FPS" "$TMP/$f.mp4"
  echo "   $f.mp4"
done

echo "── 2/3  chaining with crossfades ──────────────────────────────────────"
# Build the xfade chain. Each transition is 0.6s, and the offsets account for
# the shortened duration as clips are merged.
set -- $FRAMES
INPUTS=""
for f in $FRAMES; do INPUTS="$INPUTS -i $TMP/$f.mp4"; done

FADE=0.6
# shellcheck disable=SC2086
ffmpeg -loglevel error -y $INPUTS -filter_complex "
[0:v][1:v]xfade=transition=fade:duration=${FADE}:offset=$(echo "$SECS_PER_FRAME - $FADE" | bc)[v01];
[v01][2:v]xfade=transition=fade:duration=${FADE}:offset=$(echo "$SECS_PER_FRAME*2 - $FADE*2" | bc)[v02];
[v02][3:v]xfade=transition=fade:duration=${FADE}:offset=$(echo "$SECS_PER_FRAME*3 - $FADE*3" | bc)[v03];
[v03][4:v]xfade=transition=fade:duration=${FADE}:offset=$(echo "$SECS_PER_FRAME*4 - $FADE*4" | bc)[v04];
[v04][5:v]xfade=transition=fade:duration=${FADE}:offset=$(echo "$SECS_PER_FRAME*5 - $FADE*5" | bc)[vout]
" -map "[vout]" -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -movflags +faststart -an "$OUT"

echo "── 3/3  verifying ─────────────────────────────────────────────────────"
DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$OUT" 2>/dev/null || echo "?")
SIZE=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$OUT" 2>/dev/null || echo "?")
echo "   duration: ${DURATION}s  (App Store allows 15 to 30)"
echo "   size:     ${SIZE}  (App Store requires 1290x2796)"
echo "   output:   $OUT"
ls -la "$OUT"
