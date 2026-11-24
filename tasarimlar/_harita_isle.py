# Paylaşım kartı kas haritası (24 Kasım 2026): Gemini'nin renk anahtarlı görselinden (her kas grubu ayrı düz renk)
# kas grubu etiket haritası çıkarır ve paylaşım önerileri için boyanmış hâllerini üretir.
# Kaynak: _paylasim/kaynak-<ad>.jpg  →  _paylasim/etiket-<ad>.png (her piksel = grup numarası) + harita2-*-<ad>.png
# Çalıştır: python tasarimlar/_harita_isle.py gemini
import os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "_paylasim")
AD = sys.argv[1] if len(sys.argv) > 1 else "gemini"

# 0 zemin/boşluk · 1 gövde (gri) · 2+ kas grupları (uygulamadaki MUSCLES adlarıyla)
KEYS = [("zemin", (0, 0, 0)), ("govde", (128, 128, 128)),
        ("Göğüs", (255, 0, 0)), ("Omuz", (255, 255, 0)), ("Biceps", (0, 0, 255)), ("Triceps", (255, 0, 255)),
        ("Karın", (255, 128, 0)), ("Ön Bacak", (0, 255, 0)), ("Sırt", (0, 255, 255)),
        ("Arka Bacak & Kalça", (128, 0, 255)), ("Kalf", (128, 64, 0))]
NAMES = [k for k, _ in KEYS]

def labels():
    im = np.asarray(Image.open(os.path.join(OUT, f"kaynak-{AD}.jpg")).convert("RGB")).astype(np.int32)
    cols = np.array([c for _, c in KEYS], dtype=np.int32)
    d = ((im[:, :, None, :] - cols[None, None, :, :]) ** 2).sum(-1)
    lab = d.argmin(-1).astype(np.uint8)
    # içeriğe göre kırp (%3 boşluk)
    ys, xs = np.where(lab > 0)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    p = int(0.03 * (y1 - y0))
    lab = lab[max(0, y0 - p):y1 + p, max(0, x0 - p):x1 + p]
    Image.fromarray(lab).save(os.path.join(OUT, f"etiket-{AD}.png"))
    return lab

# Örnek antrenman: Göğüs 7, Omuz 9, Triceps 6 set → en çok çalışan en parlak
WORKED = {"Göğüs": 7, "Omuz": 9, "Triceps": 6}

def render(lab, body, idle, act, act_dim, name, width=900):
    h, w = lab.shape
    out = np.zeros((h, w, 4), dtype=np.uint8)              # boşluklar ve zemin şeffaf
    out[lab == 1] = body
    mx = max(WORKED.values())
    for i, n in enumerate(NAMES):
        if i < 2: continue
        if n in WORKED:
            t = WORKED[n] / mx                                # 0..1 → koyu turkuazdan parlak turkuaza
            c = [int(act_dim[k] + (act[k] - act_dim[k]) * t) for k in range(4)]
        else:
            c = idle
        out[lab == i] = c
    img = Image.fromarray(out, "RGBA")
    img = img.resize((width, int(h * width / w)), Image.LANCZOS)
    img.save(os.path.join(OUT, f"harita2-{name}-{AD}.png"))
    return img.size

if __name__ == "__main__":
    lab = labels()
    print("etiket", lab.shape, {NAMES[i]: int((lab == i).sum()) for i in range(len(NAMES))})
    print(render(lab, (40, 40, 45, 255), (64, 64, 72, 255), (31, 209, 193, 255), (24, 140, 130, 255), "koyu"))
    print(render(lab, (212, 212, 216, 255), (186, 186, 194, 255), (14, 124, 114, 255), (70, 160, 150, 255), "acik"))
    print(render(lab, (255, 255, 255, 70), (255, 255, 255, 120), (31, 209, 193, 255), (31, 209, 193, 200), "seffaf"))
