# v67: Antrenman paylaşım görselleri (Strava benzeri)
# 1) img/kas-harita.png: yalnız 11 anahtar renk, her kas grubu var, 900 px, < 150 KB, sw.js önbelleğinde
# 2) shareData: kas setleri, istatistikler, rekorlar, ay sırası, eski kayıt, kardiyo
# 3) paintMuscleMap: çalışan kas turkuaz, boş kas gri, boşluk şeffaf; görsel yoksa null
# 4) buildShareCanvas: 5 şablon × 2 boyut, şeffaf çıkartma, kişisel bilgi yok, istatistik kapatma, rekor kartı, uzun ad, İngilizce
# 5) Paylaşım penceresi: açılış, seçimlerin hatırlanması, bozuk ayar, fotoğraf saklanmaz, paylaş/kopyala yedekleri, 44 px
import os, sys, subprocess, time, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOTS = os.path.join(REPO, "tests", "shots"); os.makedirs(SHOTS, exist_ok=True)
PORT = 8824
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)

# --- 1) Kas haritası etiket görseli (sayfa açmadan)
KEYS = {(0, 0, 0): "boşluk", (128, 128, 128): "gövde", (255, 0, 0): "Göğüs", (255, 255, 0): "Omuz", (0, 0, 255): "Biceps",
        (255, 0, 255): "Triceps", (255, 128, 0): "Karın", (0, 255, 0): "Ön Bacak", (0, 255, 255): "Sırt",
        (128, 0, 255): "Arka Bacak & Kalça", (128, 64, 0): "Kalf"}
MAP = os.path.join(REPO, "img", "kas-harita.png")
if not os.path.exists(MAP):
    check(False, "1: img/kas-harita.png var")
else:
    from PIL import Image
    im = Image.open(MAP).convert("RGB")
    cols = dict((c, n) for n, c in im.getcolors(maxcolors=1 << 20) or [])
    check(set(cols) <= set(KEYS), "1: yalnız 11 anahtar renk: fazlası %s" % [c for c in cols if c not in KEYS][:5])
    small = [KEYS[c] for c in KEYS if c not in [(0, 0, 0), (128, 128, 128)] and cols.get(c, 0) < 5000]
    check(small == [], "1: her kas grubu ≥ 5000 piksel: eksik %s" % small)
    check(im.width == 900, "1: genişlik 900 (%d)" % im.width)
    check(os.path.getsize(MAP) < 150_000, "1: dosya < 150 KB (%d)" % os.path.getsize(MAP))
sw = open(os.path.join(REPO, "sw.js"), encoding="utf-8").read()
check("'./img/kas-harita.png'" in sw, "1: sw.js FILES içinde kas-harita.png")

print("\n%d hata" % len(fails) + (" · sayfa hataları: %s" % errs if errs else ""))
sys.exit(1 if fails or errs else 0)
