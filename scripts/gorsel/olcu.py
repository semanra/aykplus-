# v64 ölçü rehberi görselleri: masaüstü "AYK+ Ölçü Görselleri/olcu-<k>.png" → img/olcu/<k>.webp (şeffaf, 720×720)
# Çalıştır: python scripts/gorsel/olcu.py
import os, sys
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import isle
SRC = os.path.join(os.path.expanduser("~"), "Desktop", "AYK+ Ölçü Görselleri")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "img", "olcu")
# kol: gövde sağda düz çizgiyle kesik → o kenardan kırp. bel/kalça/göğüs: figür dizde biter; yer gölgesi alttan kırpılır
KIRP = {"kol": (0, 0, 1006, 1254), "bel": (0, 0, 1254, 1195), "kalca": (0, 0, 1254, 1195), "gogus": (0, 0, 1254, 1195)}
# bel/kalça/göğüs: açık renkli uyluk kasları varsayılan ayarla zeminle birlikte siliniyordu → sıkı ayar, gölge birleştirme kapalı
SIKI = {"bel", "kalca", "gogus"}
if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    tmp = os.path.join(OUT, "_tmp.png")
    G0, S0 = isle.GRAD, isle.SHADOW_LUM
    for k in ["bel", "kalca", "gogus", "kol", "bacak", "boyun"]:
        isle.GRAD, isle.SHADOW_LUM = (2.0, 256) if k in SIKI else (G0, S0)
        im = Image.open(os.path.join(SRC, f"olcu-{k}.png")).convert("RGB")
        if k in KIRP: im = im.crop(KIRP[k])
        im.save(tmp)
        img = isle.frame(isle.process(tmp), 720, 720, 0.03)
        p = os.path.join(OUT, f"{k}.webp"); img.save(p, "WEBP", quality=78, method=6)
        print(k, os.path.getsize(p) // 1024, "KB")
    os.remove(tmp)
