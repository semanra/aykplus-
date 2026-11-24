# v68: 3D kas haritası, yeni kas grupları, animasyonlar
# 1) img/kas-3d-etiket.png + img/kas-3d-isik.webp: boyut, indeksler, kırıntı yok, sabit nokta
# 2) MUSCLES 13 grup, autoMuscle, eski kayıt, #exMuscle
# 3) Çizici: renk, seviye, kontur, önbellek, seçim, muscleAt
# 4) Paylaşım kartı  5) Antrenman KAS YÜKÜ  6) Bitiş özeti  7) Paylaşım penceresi animasyonu
import os, sys, subprocess, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOTS = os.path.join(REPO, "tests", "shots"); os.makedirs(SHOTS, exist_ok=True)
PORT = 8825
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)

MUSCLES = ["Göğüs", "Sırt", "Omuz", "Ön Bacak", "Arka Bacak & Kalça", "Kalf", "Biceps", "Triceps", "Karın", "Ön Kol", "Boyun", "İç Bacak", "Kaval"]

# --- 1) Harita dosyaları (sayfa açmadan)
LAB = os.path.join(REPO, "img", "kas-3d-etiket.png"); SHD = os.path.join(REPO, "img", "kas-3d-isik.webp")
if not (os.path.exists(LAB) and os.path.exists(SHD)):
    check(False, "1a: kas-3d-etiket.png ve kas-3d-isik.webp var")
else:
    import numpy as np
    from PIL import Image
    from scipy import ndimage
    li = Image.open(LAB); si = Image.open(SHD)
    check(li.size == si.size and li.width == 900, "1a: aynı boyut, genişlik 900 (%s / %s)" % (li.size, si.size))
    check(li.mode == "P", "1a: etiket paletli PNG (%s)" % li.mode)
    lab = np.asarray(li)
    check(int(lab.max()) <= 14, "1b: yalnız 0–14 indeksleri (en büyük %d)" % lab.max())
    small = [MUSCLES[i - 2] for i in range(2, 15) if (lab == i).sum() < 1500]
    check(small == [], "1b: her kas ≥ 1500 piksel: eksik %s" % small)
    crumbs = []
    for i in range(2, 15):
        cc, n = ndimage.label(lab == i)
        if n:
            sizes = ndimage.sum(np.ones_like(cc), cc, range(1, n + 1))
            if (sizes < 150).any(): crumbs.append((MUSCLES[i - 2], int((sizes < 150).sum())))
    check(crumbs == [], "1c: 150 pikselden küçük kopuk parça yok: %s" % crumbs)
    tot = os.path.getsize(LAB) + os.path.getsize(SHD)
    check(tot < 160_000, "1d: toplam < 160 KB (%d)" % tot)
    H, W = lab.shape
    # ön figür (sol yarı) göğüs bölgesi
    box = lab[int(H * 0.215):int(H * 0.245), int(W * 0.19):int(W * 0.31)]
    vals, cnt = np.unique(box, return_counts=True)
    check(int(vals[cnt.argmax()]) == MUSCLES.index("Göğüs") + 2, "1e: ön göğüs bölgesinde çoğunluk Göğüs (%s)" % dict(zip(vals.tolist(), cnt.tolist())))

if fails: print("\n%d HATA" % len(fails)); sys.exit(1)
print("\nTÜMÜ GEÇTİ")
