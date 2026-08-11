"""从原图重新处理：去水印 -> 裁剪 -> 扩散填充黑角 -> 生成 icns。"""
import os
import subprocess
import numpy as np
from PIL import Image, ImageFilter

ROOT = "/Users/fusijing/code/anime-tracker"
SRC = os.path.join(ROOT, "icon-src.png")
OUT = os.path.join(ROOT, "icon-1024.png")

img = Image.open(SRC).convert("RGB")
a = np.array(img)
h, w = a.shape[:2]

# 1. 去左下角 "AI生成" 水印
patch_h = 90
region = a[h - 2 * patch_h: h - patch_h, 0:120].copy()
a[h - patch_h: h, 0:120] = region[::-1]
img = Image.fromarray(a).filter(ImageFilter.GaussianBlur(0.6))
a = np.array(img).astype(np.float64)

# 2. 裁剪到彩色内容包围盒（多收一些，确保不进黑边）
mask = a.sum(axis=2) > 150
rows = np.where(mask.any(axis=1))[0]
cols = np.where(mask.any(axis=0))[0]
cy = (rows[0] + rows[-1]) // 2
cx = (cols[0] + cols[-1]) // 2
half = min(rows[-1] - rows[0], cols[-1] - cols[0]) // 2 - 16
a = a[cy - half: cy + half, cx - half: cx + half]

# 3. 扩散填充：近黑像素反复取邻近非黑像素的均值，直到填满
filled = a.sum(axis=2) > 90
out = a.copy()
for _ in range(400):
    if filled.all():
        break
    # 四个方向的已填充邻居均值
    acc = np.zeros_like(out)
    cnt = np.zeros(out.shape[:2])
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        shifted = np.roll(out, (dy, dx), axis=(0, 1))
        shifted_f = np.roll(filled, (dy, dx), axis=(0, 1))
        acc[shifted_f] += shifted[shifted_f]
        cnt[shifted_f] += 1
    grow = (~filled) & (cnt > 0)
    out[grow] = acc[grow] / cnt[grow][:, None]
    filled[grow] = True

img = Image.fromarray(out.astype(np.uint8)).resize((1024, 1024), Image.LANCZOS)
img.save(OUT)
print("saved", OUT)

# 4. 打包 icns
iconset = os.path.join(ROOT, "icon.iconset")
os.makedirs(iconset, exist_ok=True)
for size in (16, 32, 128, 256, 512):
    for scale, suffix in ((1, ""), (2, "@2x")):
        px = size * scale
        img.resize((px, px), Image.LANCZOS).save(
            os.path.join(iconset, f"icon_{size}x{size}{suffix}.png"))
subprocess.run(["iconutil", "-c", "icns", iconset, "-o", os.path.join(ROOT, "icon.icns")], check=True)
print("saved", os.path.join(ROOT, "icon.icns"))
