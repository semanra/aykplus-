# v68 3D kas haritası: Gemini Pro'nun 3D görünümlü renk anahtarlı vücut görselinden iki dosya üretir.
# Kaynak: tasarimlar/_paylasim/3d/kaynak-3d-gemini-tam.jpg (her kas grubu ayrı renk, gölgeli, siyah zemin)
# Çıktı:  img/kas-3d-etiket.png  paletli (renk = gri indeks×17); 0 zemin, 1 gövde, 2.. = MUSCLES sırası (indeks = MUSCLES.indexOf(ad) + 2)
#         img/kas-3d-isik.webp   gri ton ışık (grup başına normalize, 0…1,15 → 0…255)
# Uygulama (src/app/32-kas-harita.js) ikisini okuyup tema / set yoğunluğuna göre boyar. Çalıştır: python scripts/gorsel/kas_3d.py
import os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC = os.path.join(ROOT, "tasarimlar", "_paylasim", "3d", "kaynak-3d-gemini-tam.jpg")
OUT_LAB = os.path.join(ROOT, "img", "kas-3d-etiket.png")
OUT_SHD = os.path.join(ROOT, "img", "kas-3d-isik.webp")
OUT_CHK = os.path.join(ROOT, "tasarimlar", "_paylasim", "3d", "etiket-kontrol-uretim.png")
WIDTH = 900
# 09-kas-plaka-koc-takviye.js MUSCLES ile aynı sıra
MUSCLES = ["Göğüs", "Sırt", "Omuz", "Ön Bacak", "Arka Bacak & Kalça", "Kalf", "Biceps", "Triceps", "Karın", "Ön Kol", "Boyun", "İç Bacak", "Kaval"]
# kaynaktaki ton → kas (Gemini görselinin renk anahtarı)
HUES = [("Göğüs", 0), ("Karın", 30), ("Omuz", 58), ("Ön Kol", 90), ("Ön Bacak", 120), ("Sırt", 185), ("Biceps", 225),
        ("Arka Bacak & Kalça", 275), ("Triceps", 305), ("Kaval", 335)]
CRUMB = 150   # bundan küçük kopuk kas parçası çevresine katılır


def labels(im):
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    mx, mn = im.max(-1), im.min(-1)
    v = mx
    s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    d = mx - mn + 1e-6
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    H, W = v.shape
    bg = v < 0.13
    body = (~bg) & (s < 0.28)
    colm = (~bg) & ~body
    idx = {n: MUSCLES.index(n) + 2 for n in MUSCLES}
    hd = np.stack([np.minimum(abs(h - x), 360 - abs(h - x)) for _, x in HUES], -1)
    k = np.array([idx[n] for n, _ in HUES], np.uint8)[hd.argmin(-1)]
    ys = np.where(~bg)[0]
    fy = (np.arange(H)[:, None] * np.ones((1, W)) - ys.min()) / (ys.max() - ys.min())
    # konuma göre ayırma (renkleri yakın gruplar)
    k = np.where((k == idx["Karın"]) & (fy > 0.60), idx["Kalf"], k)
    k = np.where((k == idx["Biceps"]) & (fy > 0.42), idx["İç Bacak"], k)
    k = np.where(np.isin(k, [idx["Triceps"], idx["Göğüs"]]) & (fy > 0.60), idx["Kaval"], k)
    k = np.where((k == idx["Ön Kol"]) & (fy < 0.20), idx["Boyun"], k)
    lab = np.zeros((H, W), np.uint8)
    lab[body] = 1
    lab[colm] = k[colm]
    # JPEG kırıntısı: yalnız renkli piksellerde çoğunluk (kas aralarındaki koyu çizgiler yutulmasın)
    lf = np.asarray(Image.fromarray(lab).filter(ImageFilter.ModeFilter(9)))
    lab = np.where(colm, np.where(lf >= 2, lf, 1), lab).astype(np.uint8)
    # yalnız kenara bağlı koyu alan zemin; içerideki yarıklar gövde
    cc, _ = ndimage.label(bg)
    edge = np.unique(np.concatenate([cc[0], cc[-1], cc[:, 0], cc[:, -1]]))
    bg = np.isin(cc, edge[edge > 0])
    lab[bg] = 0
    lab[(~bg) & (lab == 0)] = 1
    return lab, v


def shade_of(lab, v):
    ref = np.ones(lab.shape, np.float32)
    for i in range(1, 15):
        m = lab == i
        if m.any():
            ref[m] = np.percentile(v[m], 92)
    return np.clip(v / np.maximum(ref, 1e-3), 0, 1.15)


def drop_crumbs(lab):
    for _ in range(3):
        changed = False
        for i in range(2, 15):
            cc, n = ndimage.label(lab == i)
            if not n:
                continue
            sizes = ndimage.sum(np.ones_like(cc), cc, range(1, n + 1))
            for j in np.where(sizes < CRUMB)[0] + 1:
                part = cc == j
                ring = ndimage.binary_dilation(part, iterations=1) & ~part
                around = lab[ring]
                around = around[around >= 1]
                lab[part] = np.bincount(around).argmax() if around.size else 1
                changed = True
        if not changed:
            break
    return lab


def main():
    im = np.asarray(Image.open(SRC).convert("RGB")).astype(np.float32) / 255
    lab, v = labels(im)
    shade = shade_of(lab, v)
    ys, xs = np.where(lab > 0)
    pad = 20
    y0, y1 = max(0, ys.min() - pad), min(lab.shape[0], ys.max() + pad)
    x0, x1 = max(0, xs.min() - pad), min(lab.shape[1], xs.max() + pad)
    lab, shade = lab[y0:y1, x0:x1], shade[y0:y1, x0:x1]
    h = round(lab.shape[0] * WIDTH / lab.shape[1])
    lab = np.asarray(Image.fromarray(lab).resize((WIDTH, h), Image.NEAREST)).copy()
    lab = drop_crumbs(lab)
    sh = Image.fromarray((np.clip(shade / 1.15, 0, 1) * 255).astype(np.uint8)).resize((WIDTH, h), Image.LANCZOS)
    out = Image.fromarray(lab, "P")
    # palet: indeks i → gri (i×17); tarayıcı RGB okur, uygulama round(R / 17) ile indeksi geri bulur
    out.putpalette([i * 17 for i in range(15) for _ in range(3)] + [0] * (768 - 45))
    out.save(OUT_LAB, optimize=True)
    sh.save(OUT_SHD, "WEBP", quality=82, method=6)
    # kontrol görseli: her kas ayrı renk, ışıkla çarpılmış
    cpal = np.array([(0, 0, 0), (90, 90, 90)] + [((i * 97) % 256, (i * 57 + 80) % 256, (i * 151 + 40) % 256) for i in range(13)], np.float32)
    chk = cpal[lab] * (np.asarray(sh).astype(np.float32)[..., None] / 255 * 0.7 + 0.3)
    Image.fromarray(chk.clip(0, 255).astype(np.uint8)).save(OUT_CHK)
    print("✓", OUT_LAB, out.size, os.path.getsize(OUT_LAB), "bayt")
    print("✓", OUT_SHD, sh.size, os.path.getsize(OUT_SHD), "bayt")
    print({MUSCLES[i - 2]: int((lab == i).sum()) for i in range(2, 15)})


if __name__ == "__main__":
    main()
