#!/usr/bin/env bash
# 从 icon-rounded-1024.png（macOS 圆角风格，与 Windows icon.ico 同源）生成 icon.icns。
# 仅用 macOS 自带 sips/iconutil，零第三方依赖。用法：./make_icns.sh
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
SRC="$ROOT/icon-rounded-1024.png"
OUT="$ROOT/icon.icns"
TMP="$(mktemp -d)"
ICONSET="$TMP/icon.iconset"
trap 'rm -rf "$TMP"' EXIT
[ -f "$SRC" ] || { echo "缺少源图 $SRC" >&2; exit 1; }
mkdir -p "$ICONSET"
sips -z 16 16 "$SRC" --out "$ICONSET/icon_16x16.png" >/dev/null
sips -z 32 32 "$SRC" --out "$ICONSET/icon_16x16@2x.png" >/dev/null
sips -z 32 32 "$SRC" --out "$ICONSET/icon_32x32.png" >/dev/null
sips -z 64 64 "$SRC" --out "$ICONSET/icon_32x32@2x.png" >/dev/null
sips -z 128 128 "$SRC" --out "$ICONSET/icon_128x128.png" >/dev/null
sips -z 256 256 "$SRC" --out "$ICONSET/icon_128x128@2x.png" >/dev/null
sips -z 256 256 "$SRC" --out "$ICONSET/icon_256x256.png" >/dev/null
sips -z 512 512 "$SRC" --out "$ICONSET/icon_256x256@2x.png" >/dev/null
sips -z 512 512 "$SRC" --out "$ICONSET/icon_512x512.png" >/dev/null
sips -z 1024 1024 "$SRC" --out "$ICONSET/icon_512x512@2x.png" >/dev/null
iconutil -c icns "$ICONSET" -o "$OUT"
echo "saved $OUT"
