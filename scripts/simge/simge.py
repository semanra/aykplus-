# v55: uygulama simgelerini scripts/simge/ayk-simge.svg'den üretir (opak RGB PNG; iOS simgesi şeffaf olamaz).
# Kullanım: python scripts/simge/simge.py   → icon.png (180), icon-192.png, icon-512.png, scripts/simge/icon-1024.png (mağaza; uygulamada sunulmaz)
import os, io
from PIL import Image
from playwright.sync_api import sync_playwright
KOK = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SVG = open(os.path.join(KOK, "scripts", "simge", "ayk-simge.svg"), encoding="utf-8").read()
OUT = {"icon.png": 180, "icon-192.png": 192, "icon-512.png": 512, "scripts/simge/icon-1024.png": 1024}
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1024, "height": 1024})
    pg.set_content('<html><body style="margin:0;background:#000">' + SVG.replace("<svg ", '<svg width="1024" height="1024" ', 1) + "</body></html>")
    big = Image.open(io.BytesIO(pg.screenshot(clip={"x": 0, "y": 0, "width": 1024, "height": 1024}))).convert("RGB")
    b.close()
for name, size in OUT.items():
    (big if size == 1024 else big.resize((size, size), Image.LANCZOS)).save(os.path.join(KOK, name), optimize=True)
    print(name, size)
