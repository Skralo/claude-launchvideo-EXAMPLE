#!/usr/bin/env bash
# SKRALOVNIK film, whole pipeline:
#   plates (grade, 1-bit, colour) from the 4K source -> timeline export -> 4K punch-ins
#   -> SFX (prototypes, audition reel, cue sheet, QC, soundtrack) -> Remotion frames
#   -> grain + H.264/AAC master + sync / true-peak / flash checks.
# track.json is committed, so tracking (MediaPipe) only reruns if it is missing.
#
# Usage: scripts/skralovnik/render.sh [out.mp4]
set -euo pipefail
cd "$(dirname "$0")/../.."
OUT=${1:-video/skralovnik-v1.mp4}
if [[ ! -f public/skralovnik/plate/bw/0241.jpg ]]; then
  if [[ -f public/skralovnik/track.json ]]; then python3 scripts/skralovnik/prep.py --skip-track; else python3 scripts/skralovnik/prep.py; fi
fi
npx tsx scripts/skralovnik/export-cues.ts
python3 scripts/skralovnik/prep.py --punch
python3 scripts/skralovnik/sfx.py
TMP=$(mktemp -d /tmp/skralovnikXXXXXX)
trap 'rm -rf "$TMP"' EXIT
npx remotion render src/index.ts Skralovnik "$TMP/frames" --sequence --image-format=png --gl=angle --log=error
python3 scripts/skralovnik/post.py "$TMP/frames" "$OUT"
