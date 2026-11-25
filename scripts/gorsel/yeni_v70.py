# v70: yeni küçük kas hareketlerinin görselleri (293–301). Kaynak: tasarimlar/hareket-yeni/aday/<no>-*.{jpg,png}
# → masaüstü "AYK+ Egzersizler/<no>..jpg" (kaynak arşivi) → img/hareket/<no>.webp (isle.py ile aynı işlem)
import os, sys, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import isle
from PIL import Image
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ADAY = os.path.join(REPO, "tasarimlar", "hareket-yeni", "aday")
SECIM = {}   # no → aday dosya adı (komut satırından: 293=293-gem-3.jpg)
for a in sys.argv[1:]:
    n, f = a.split("="); SECIM[int(n)] = f
for n, f in sorted(SECIM.items()):
    im = Image.open(os.path.join(ADAY, f)).convert("RGB")
    dst = os.path.join(isle.SRC, f"{n}..jpg"); im.save(dst, quality=95)
    out = isle.frame(isle.process(dst))
    p = os.path.join(REPO, "img", "hareket", f"{n}.webp"); out.save(p, "WEBP", quality=78, method=6)
    print(n, f, os.path.getsize(p))
