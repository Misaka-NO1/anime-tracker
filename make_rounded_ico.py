"""从 icon-1024.png 生成 macOS 风格圆角图标（Windows 用）：内缩 80% + 圆角 + 透明底，输出 icon.ico。"""
from PIL import Image, ImageDraw

CANVAS = 1024
INNER = 824                    # macOS 图标栅格：画面约占 80%
RADIUS = int(INNER * 0.2237)   # macOS 圆角比例

img = Image.open("icon-1024.png").convert("RGBA").resize((INNER, INNER), Image.LANCZOS)

mask = Image.new("L", (INNER, INNER), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, INNER - 1, INNER - 1], radius=RADIUS, fill=255)
img.putalpha(mask)

canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
off = (CANVAS - INNER) // 2
canvas.paste(img, (off, off), img)
canvas.save("icon-rounded-1024.png")
canvas.save("icon.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print("saved icon-rounded-1024.png and icon.ico")
