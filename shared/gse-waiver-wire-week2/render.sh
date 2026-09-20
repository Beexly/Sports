#!/bin/sh
# Render every GSE Week 2 graphic to PNG via the in-app browser.
cd /var/minis/shared/gse-waiver-wire-week2
B=minis-browser-use
OUT=/var/minis/shared/gse-waiver-wire-week2/graphics
PREV=""

shoot() {   # shoot <html> <out.png> <w> <h>
  html="$1"; out="$2"; w="$3"; h="$4"
  $B set_viewport --width "$w" --height "$h" >/dev/null 2>&1
  $B navigate --url "minis://shared/gse-waiver-wire-week2/graphics/$html" >/dev/null 2>&1
  $B wait_for_dom_stable --timeout 4000 >/dev/null 2>&1
  i=0
  while [ $i -lt 5 ]; do
    i=$((i+1))
    img=$($B screenshot --compact 2>/dev/null | jq -r '.data.image_path // empty')
    [ -z "$img" ] && continue
    n=0
    while [ $n -lt 40 ]; do
      [ -s "$img" ] && break
      n=$((n+1)); sleep 1
    done
    [ -s "$img" ] || { echo "  lag  $out (no file)"; continue; }
    h1=$(md5sum "$img" | cut -d' ' -f1)
    if [ "$h1" != "$PREV" ]; then
      PREV="$h1"
      cp "$img" "$OUT/$out"
      echo "  ok  $out  $(magick identify -format '%wx%h' "$OUT/$out" 2>/dev/null)"
      return 0
    fi
    echo "  dup  $out (retry $i)"
  done
  echo "  FAIL $out"
}

shoot 00-header-week2-waiver-wire.html 00-header.png 1600 900
shoot 10-rb-monangai.html  01-monangai.png  1080 1350
shoot 11-rb-corum.html     02-corum.png     1080 1350
shoot 12-rb-johnson.html   03-emmett-johnson.png 1080 1350
shoot 13-rb-black.html     04-kaelon-black.png 1080 1350
shoot 14-rb-allgeier.html  05-allgeier.png   1080 1350
shoot 15-rb-demercado.html 06-demercado.png  1080 1350
$B set_viewport --reset >/dev/null 2>&1
echo "done"