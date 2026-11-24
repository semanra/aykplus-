# 3D kas haritası 2. tur (24 Kasım 2026): daha vurgulu turkuaz, aydınlık zemin çözümleri, az setin görünümü.
# Set yoğunluğu MUTLAK: 1 set soluk-derin turkuaz, 8+ set tam parlak + ışıma (antrenmandaki en çok sete göre değil).
# Çalıştır: python tasarimlar/_harita3d_v2.py  → tasarimlar/paylasim-3d-tur3.png, tasarimlar/paylasim-3d-setler3.png
import os, numpy as np
from PIL import Image, ImageFilter, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "_paylasim", "3d", "kaynak-3d-gemini-tam.jpg")
im = np.asarray(Image.open(SRC).convert("RGB")).astype(np.float32) / 255
r, g, b = im[..., 0], im[..., 1], im[..., 2]
mx, mn = im.max(-1), im.min(-1); v = mx; s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
d = mx - mn + 1e-6
h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
H, W = v.shape
bg = v < 0.13; body = (~bg) & (s < 0.28); colm = (~bg) & ~body
HUES = [("Göğüs", 0), ("Karın", 30), ("Omuz", 58), ("Ön Kol", 90), ("Ön Bacak", 120), ("Sırt", 185), ("Biceps", 225), ("Arka Bacak & Kalça", 275), ("Triceps", 305), ("Kaval", 335)]
names = ["bos", "govde"] + [n for n, _ in HUES] + ["Kalf", "Boyun", "İç Bacak"]
hd = np.stack([np.minimum(abs(h - x), 360 - abs(h - x)) for _, x in HUES], -1)
k = hd.argmin(-1) + 2
yy = np.arange(H)[:, None] * np.ones((1, W))
_ys = np.where(~bg)[0]; ys0, ys1 = _ys.min(), _ys.max(); fy = (yy - ys0) / (ys1 - ys0)
N = names.index
k = np.where((k == N("Karın")) & (fy > 0.60), N("Kalf"), k)
k = np.where((k == N("Biceps")) & (fy > 0.42), N("İç Bacak"), k)
k = np.where(np.isin(k, [N("Triceps"), N("Göğüs")]) & (fy > 0.60), N("Kaval"), k)
k = np.where((k == N("Ön Kol")) & (fy < 0.20), N("Boyun"), k)
lab = np.zeros((H, W), np.uint8); lab[body] = 1; lab[colm] = k[colm]
# kırıntı temizliği YALNIZ renkli piksellerde: kas aralarındaki ince koyu çizgiler (gövde/zemin) yutulmasın
_lf = np.asarray(Image.fromarray(lab).filter(ImageFilter.ModeFilter(9)))
lab = np.where(colm, np.where(_lf >= 2, _lf, 1), lab).astype(np.uint8)
# kas aralarındaki koyu yarıklar dış zemin değil: yalnız kenara bağlı koyu alan zemin (aydınlıkta beyaz çizgi olmasın)
from scipy import ndimage
_cc, _ = ndimage.label(bg); _edge = np.unique(np.concatenate([_cc[0], _cc[-1], _cc[:, 0], _cc[:, -1]]))
bg = np.isin(_cc, _edge[_edge > 0])
lab[bg] = 0; lab[(~bg) & (lab == 0)] = 1
ref = np.ones((H, W), np.float32)
for i in range(1, len(names)):
    m = lab == i
    if m.any(): ref[m] = np.percentile(v[m], 92)
SHADE = np.clip(v / np.maximum(ref, 1e-3), 0, 1.15)
X0, Y0 = np.where(~bg)[1].min() - 40, np.where(~bg)[0].min() - 40
X1, Y1 = np.where(~bg)[1].max() + 40, np.where(~bg)[0].max() + 40

def c255(*x): return np.array(x, np.float32) / 255
# Turkuaz: uygulamanın #1FD1C1'inden bir tık daha doygun ve parlak (ekranda "neon" etkisi)
TQ = dict(hi=c255(24, 236, 214), lo=c255(6, 112, 104), hl=c255(185, 255, 248), glow=c255(24, 236, 214))
LVc = dict(hi=c255(184, 168, 255), lo=c255(92, 72, 190), hl=c255(238, 232, 255), glow=c255(170, 150, 255))
TQ_LIGHT = dict(hi=c255(0, 196, 178), lo=c255(0, 110, 100), hl=c255(120, 245, 232), glow=c255(0, 196, 178))

def level(sets):   # 0 … 1 (mutlak): 1 set = 0, 8+ set = 1
    return float(np.clip((sets - 1) / 7, 0, 1))

def render(worked, P, body_c, idle_c, glow_k=1.0, outline=None, shadow=None):
    out = np.zeros((H, W, 4), np.float32)
    sh = SHADE[..., None]
    out[..., :3] = np.array(body_c) * sh; out[..., 3] = np.where(bg, 0, 1)
    gmap = np.zeros((H, W), np.float32)
    for i, n in enumerate(names):
        if i < 2: continue
        m = lab == i
        if n in worked:
            t = level(worked[n]); c = P["lo"] + (P["hi"] - P["lo"]) * t
            L = SHADE[m][:, None]
            col = c * (0.86 + 0.24 * L)
            crev = np.clip((0.62 - L) / 0.32, 0, 1)      # kas kenarı/yarık: çizgi koyu kalsın, renk yayılmasın
            col = col * (1 - 0.75 * crev)
            spec = np.clip((L - 0.84) / 0.30, 0, 1) * (0.30 + 0.35 * t)
            out[m, :3] = (col * (1 - spec) + P["hl"] * spec).clip(0, 1)
            gmap[m] = 0.35 + 0.65 * t          # az sette ışıma zayıf, çok sette güçlü
        else:
            out[m, :3] = (np.array(idle_c) * SHADE[m][:, None]).clip(0, 1)
    img = Image.fromarray((out.clip(0, 1) * 255).astype(np.uint8), "RGBA")
    base = Image.new("RGBA", img.size, (0, 0, 0, 0))
    if shadow is not None:   # aydınlık zeminde figürün altına yumuşak gölge (beyaz üstünde kaybolmasın)
        a = Image.fromarray((~bg).astype(np.uint8) * 255).filter(ImageFilter.GaussianBlur(H / 90))
        sa = np.asarray(a).astype(np.float32) / 255 * shadow[3]
        sl = np.zeros((H, W, 4), np.float32); sl[..., :3] = shadow[:3]; sl[..., 3] = sa
        base.alpha_composite(Image.fromarray((sl * 255).astype(np.uint8), "RGBA"))
    if glow_k > 0 and gmap.any():
        gb = Image.fromarray((gmap * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(H / 60))
        ga = (np.asarray(gb).astype(np.float32) / 255 * 1.6 * glow_k).clip(0, 0.95)
        gl = np.zeros((H, W, 4), np.float32); gl[..., :3] = P["glow"]; gl[..., 3] = ga
        base.alpha_composite(Image.fromarray((gl * 255).astype(np.uint8), "RGBA"))
    if outline is not None:   # ince koyu kontur: açık figür beyaz zeminden ayrılsın
        a = Image.fromarray((~bg).astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(9))
        oa = np.asarray(a).astype(np.float32) / 255 * outline[3]
        ol = np.zeros((H, W, 4), np.float32); ol[..., :3] = outline[:3]; ol[..., 3] = oa
        base.alpha_composite(Image.fromarray((ol * 255).astype(np.uint8), "RGBA"))
    base.alpha_composite(img)
    return base.crop((X0, Y0, X1, Y1))

FONT = "C:/Windows/Fonts/segoeuib.ttf"
def font(sz): return ImageFont.truetype(FONT, sz)

def card(fig, bgc, w, h, stage=None, title="", tcol=(255, 255, 255)):
    c = Image.new("RGBA", (w, h), bgc + (255,))
    dr = ImageDraw.Draw(c)
    dr.text((24, 18), title, font=font(30), fill=tcol)
    area = (20, 70, w - 20, h - 20)
    if stage is not None:   # koyu sahne paneli (aydınlık kartta)
        dr.rounded_rectangle(area, 36, fill=stage)
        # sahnenin ortasında hafif turkuaz ışık havuzu
        sp = Image.new("L", (area[2] - area[0], area[3] - area[1]), 0)
        ImageDraw.Draw(sp).ellipse((sp.width * 0.1, sp.height * 0.2, sp.width * 0.9, sp.height * 0.85), fill=60)
        sp = sp.filter(ImageFilter.GaussianBlur(80))
        mask = Image.new("L", sp.size, 0); ImageDraw.Draw(mask).rounded_rectangle((0, 0) + sp.size, 36, fill=255)
        sp = Image.fromarray(np.minimum(np.asarray(sp), np.asarray(mask)))
        tint = Image.new("RGBA", sp.size, (24, 236, 214, 255)); tint.putalpha(sp)
        c.alpha_composite(tint, (area[0], area[1]))
    aw, ah = area[2] - area[0] - 30, area[3] - area[1] - 30
    sc = min(aw / fig.width, ah / fig.height)
    f = fig.resize((round(fig.width * sc), round(fig.height * sc)), Image.LANCZOS)
    c.alpha_composite(f, (area[0] + (area[2] - area[0] - f.width) // 2, area[1] + (area[3] - area[1] - f.height) // 2))
    return c

DARK_BODY, DARK_IDLE = (0.22, 0.22, 0.25), (0.34, 0.34, 0.38)
GRAF_BODY, GRAF_IDLE = (0.30, 0.30, 0.34), (0.44, 0.44, 0.49)
LIGHT_BODY, LIGHT_IDLE = (0.90, 0.90, 0.92), (0.72, 0.72, 0.77)

def sheet():
    # karışık antrenman: az ve çok setli kaslar bir arada
    WK = {"Göğüs": 9, "Omuz": 5, "Triceps": 3, "Karın": 1}
    figD = render(WK, TQ, DARK_BODY, DARK_IDLE)
    figG = render(WK, TQ, GRAF_BODY, GRAF_IDLE, glow_k=0.55, shadow=(0, 0, 0, 0.30))
    figL = render(WK, TQ_LIGHT, LIGHT_BODY, LIGHT_IDLE, glow_k=0.6, outline=(0.55, 0.55, 0.60, 1.0), shadow=(0, 0, 0, 0.22))
    figLV = render(WK, LVc, DARK_BODY, DARK_IDLE)
    CW, CH = 760, 1060
    cards = [card(figD, (0, 0, 0), CW, CH, title="Koyu (turkuaz)"),
             card(figD, (246, 246, 248), CW, CH, stage=(14, 14, 17, 255), title="Aydınlık 1: koyu sahne", tcol=(20, 20, 24)),
             card(figG, (246, 246, 248), CW, CH, title="Aydınlık 2: grafit figür", tcol=(20, 20, 24)),
             card(figL, (246, 246, 248), CW, CH, title="Aydınlık 3: açık figür + kontur", tcol=(20, 20, 24)),
             card(figLV, (14, 11, 30), CW, CH, title="Mobilite (lavanta)")]
    out = Image.new("RGBA", (CW * 5 + 24 * 6, CH + 48 + 60), (60, 60, 66, 255))
    ImageDraw.Draw(out).text((24, 14), "Örnek: Göğüs 9 set · Omuz 5 set · Triceps 3 set · Karın 1 set", font=font(34), fill=(255, 255, 255))
    for i, c in enumerate(cards): out.alpha_composite(c, (24 + i * (CW + 24), 84))
    out.convert("RGB").save(os.path.join(HERE, "paylasim-3d-tur3.png"))

def ramp():
    # tek kas (göğüs + omuz) farklı set sayılarında, gövde yakın planı
    SETS = [1, 2, 4, 6, 8]
    top = int(ys0 + (ys1 - ys0) * 0.08) - Y0; bot = int(ys0 + (ys1 - ys0) * 0.50) - Y0
    rows = []
    for label, kw, bgc, tcol in [("Koyu", dict(P=TQ, body_c=DARK_BODY, idle_c=DARK_IDLE), (0, 0, 0), (255, 255, 255)),
                                 ("Aydınlık 1 (koyu sahne)", dict(P=TQ, body_c=DARK_BODY, idle_c=DARK_IDLE), None, (20, 20, 24)),
                                 ("Aydınlık 2 (grafit)", dict(P=TQ, body_c=GRAF_BODY, idle_c=GRAF_IDLE, glow_k=0.55, shadow=(0, 0, 0, 0.30)), (246, 246, 248), (20, 20, 24))]:
        cells = []
        for n in SETS:
            f = render({"Göğüs": n, "Omuz": n}, **kw)
            f = f.crop((0, top, f.width // 2 + 20, bot))   # yalnız ön görünüm üst gövde
            f = f.resize((480, round(f.height * 480 / f.width)), Image.LANCZOS)
            cw, chh = 520, f.height + 90
            if bgc is None:
                c = Image.new("RGBA", (cw, chh), (246, 246, 248, 255)); ImageDraw.Draw(c).rounded_rectangle((10, 60, cw - 10, chh - 10), 28, fill=(14, 14, 17))
            else:
                c = Image.new("RGBA", (cw, chh), bgc + (255,))
            ImageDraw.Draw(c).text((20, 14), "%d set%s" % (n, "+" if n == 8 else ""), font=font(32), fill=tcol)
            c.alpha_composite(f, (20, 75)); cells.append(c)
        rows.append((label, cells))
    cw = cells[0].width; chh = cells[0].height
    out = Image.new("RGBA", (cw * 5 + 20 * 6, (chh + 70) * 3 + 20), (60, 60, 66, 255))
    dr = ImageDraw.Draw(out)
    for ri, (label, cells) in enumerate(rows):
        y = 20 + ri * (chh + 70)
        dr.text((20, y), label, font=font(36), fill=(255, 255, 255))
        for ci, c in enumerate(cells): out.alpha_composite(c, (20 + ci * (cw + 20), y + 55))
    out.convert("RGB").save(os.path.join(HERE, "paylasim-3d-setler3.png"))

sheet(); ramp(); print("tamam")
