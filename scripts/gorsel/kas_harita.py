# v67 paylaşım kartı kas haritası: Gemini'nin renk anahtarlı görselinden etiket görseli üretir.
# Kaynak: tasarimlar/_paylasim/kaynak-gemini.jpg (her kas grubu ayrı düz renk, siyah zemin)
# Çıktı:  img/kas-harita.png — yalnız 11 anahtar renk (palet PNG), 900 px genişlik. Uygulama (src/app/31-paylasim.js)
#         renkleri okuyup çalışan kasları turkuaza boyar. Çalıştır: python scripts/gorsel/kas_harita.py
import os
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC = os.path.join(ROOT, "tasarimlar", "_paylasim", "kaynak-gemini.jpg")
OUT = os.path.join(ROOT, "img", "kas-harita.png")
WIDTH = 900
# Sıra = palet sırası. 31-paylasim.js MAP_KEYS ile aynı renkler.
KEYS = [(0, 0, 0), (128, 128, 128), (255, 0, 0), (255, 255, 0), (0, 0, 255), (255, 0, 255),
        (255, 128, 0), (0, 255, 0), (0, 255, 255), (128, 0, 255), (128, 64, 0)]

def main():
    im = np.asarray(Image.open(SRC).convert("RGB")).astype(np.int32)
    cols = np.array(KEYS, dtype=np.int32)
    lab = ((im[:, :, None, :] - cols[None, None]) ** 2).sum(-1).argmin(-1).astype(np.uint8)
    # JPEG kenar gürültüsü: tek tük yanlış renkli pikselleri çoğunluk rengine çevir
    lab = np.asarray(Image.fromarray(lab).filter(ImageFilter.ModeFilter(5)))
    ys, xs = np.where(lab > 0)
    pad = int(0.03 * (ys.max() - ys.min()))
    lab = lab[max(0, ys.min() - pad):ys.max() + pad, max(0, xs.min() - pad):xs.max() + pad]
    h = round(lab.shape[0] * WIDTH / lab.shape[1])
    out = Image.fromarray(lab, "P").resize((WIDTH, h), Image.NEAREST)
    out.putpalette([v for c in KEYS for v in c] + [0] * (768 - 3 * len(KEYS)))
    out.save(OUT, optimize=True)
    print("✓", OUT, out.size, os.path.getsize(OUT), "bayt")

if __name__ == "__main__":
    main()
