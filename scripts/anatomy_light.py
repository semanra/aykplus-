# v38: aydınlık tema için vücut haritası çiziminin zeminsiz kopyası (anatomy-light.webp).
# anatomy.jpg'nin siyah zemini kenarlardan doldurularak bulunur ve saydam yapılır; figürlerin içindeki koyu
# gölgelere dokunulmaz (kenara bağlı değiller). Saydam WebP (iOS 14+) olarak kaydedilir: PNG'nin yarısı boyutunda.
# Çalıştırma: python scripts/anatomy_light.py   (gerekirse: pip install pillow)
import os
from PIL import Image, ImageDraw, ImageFilter, ImageChops

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
src = Image.open(os.path.join(REPO, "anatomy.jpg")).convert("L")
W, H = src.size
dark = src.point(lambda v: 255 if v < 40 else 0).convert("RGB")
seeds = [(0, 0), (W - 1, 0), (0, H - 1), (W - 1, H - 1), (W // 2, 0), (W // 2, H - 1), (382, 600)]
for s in seeds:
    if dark.getpixel(s) == (255, 255, 255):
        ImageDraw.floodfill(dark, s, (255, 0, 0))
r, g, _ = dark.split()
background = ImageChops.subtract(r, g)                # yalnızca doldurulan (kenara bağlı) siyah zemin
alpha = ImageChops.invert(background).filter(ImageFilter.GaussianBlur(1.2))
out = Image.merge("LA", (src, alpha)).convert("RGBA")
dst = os.path.join(REPO, "anatomy-light.webp")
out.save(dst, "WEBP", quality=90, method=6)
print("anatomy-light.webp", os.path.getsize(dst) // 1024, "KB")
