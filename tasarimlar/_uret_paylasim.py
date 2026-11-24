# Paylaşım görselleri tasarım önerileri (A/B/C), 24 Kasım 2026.
# Çalıştır: python tasarimlar/_uret_paylasim.py        → tasarimlar/paylasim-A|B|C.html (+ _paylasim/ görselleri)
#           python tasarimlar/_uret_paylasim.py --png  → ayrıca paylasim-A|B|C.png (Playwright)
# Strava benzeri akış: antrenman bitince "Paylaş" → kaydırılan şablonlar. Her öneride aynı şablonlar:
#   1 Kas haritası kartı · 2 Fotoğraf üstü · 3 Şeffaf çıkartma (hikâyede / şeffaf hâli) · 4 Hareket listesi
#   + gönderi boyutu (1080×1350) + aydınlık tema. Çerçeveler gerçek piksel ölçüsünde çizilir, sayfada 1/3 küçültülür.
# Kişisel bilgi (kilo, ölçü, yaş) hiçbir şablonda yok.
import os, re, sys, math
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(HERE, "_paylasim")
os.makedirs(OUT, exist_ok=True)
FONT = "".join(re.findall(r"@font-face\{[^}]*\}", open(os.path.join(HERE, "mobilite-son.html"), encoding="utf-8").read()))
assert FONT.count("@font-face") == 2

# ---------------------------------------------------------------- ÖRNEK ANTRENMAN
DAY = "İtiş Günü"
DATE = "24 Kasım 2026"
STATS = [("Süre", "1 sa 12 dk"), ("Tonaj", "12.450 kg"), ("Set", "22"), ("Rekor", "2")]
EXS = [("Bench Press", "4 × 8 · 85 kg", True), ("Incline Dambıl Press", "3 × 10 · 30 kg", False),
       ("Shoulder Press", "3 × 10 · 50 kg", False), ("Lateral Raise", "4 × 15 · 10 kg", False),
       ("Triceps Pushdown", "3 × 12 · 35 kg", True), ("Dips", "3 × 10", False)]
WORKED = {"Göğüs": 7, "Omuz": 9, "Triceps": 6}
WORKED_TXT = "Göğüs · Omuz · Triceps"

BODY_POLYS = {
  "Göğüs": ["112,182 150,174 195,180 197,252 160,264 125,252 112,225", "200,180 245,174 284,182 284,225 270,252 236,264 200,252"],
  "Omuz": ["68,178 108,166 118,190 108,238 74,242 60,210", "288,166 328,178 336,210 322,242 288,238 278,190", "450,180 502,166 520,198 502,240 462,242 446,210", "644,166 696,180 700,210 684,242 644,240 626,198"],
  "Triceps": ["442,244 482,244 480,300 466,332 442,322 432,282", "664,244 704,244 714,282 704,322 680,332 666,300"],
}

# ---------------------------------------------------------------- HARİTA GÖRSELLERİ (PIL)
def mask_for():
    m = Image.new("L", (765, 1024), 0)
    d = ImageDraw.Draw(m)
    mx = max(WORKED.values())
    for k, polys in BODY_POLYS.items():
        a = int(255 * (0.6 + 0.4 * WORKED[k] / mx))
        for p in polys:
            d.polygon([tuple(map(int, xy.split(","))) for xy in p.split()], fill=a)
    return m.filter(ImageFilter.GaussianBlur(2))

def hexrgb(h): h = h.lstrip("#"); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

def tint_dark(acc, name):          # siyah zeminli çizim (uygulamadaki gibi)
    im = Image.open(os.path.join(ROOT, "anatomy.jpg")).convert("RGB")
    lum = im.convert("L")
    ar, ag, ab = hexrgb(acc)
    col = Image.merge("RGB", [lum.point(lambda v, c=c: min(255, int(c * v / 255 * 1.7))) for c in (ar, ag, ab)])
    Image.composite(col, im, mask_for()).save(os.path.join(OUT, name), quality=90)

def tint_alpha(acc, base, name):   # zeminsiz (fotoğraf üstü / çıkartma): çizgiler açık renk, kaslar vurgu
    im = Image.open(os.path.join(ROOT, "anatomy.jpg")).convert("L")
    alpha = im.point(lambda v: min(255, int(v * 1.5)))
    br, bg_, bb = hexrgb(base)
    out = Image.merge("RGBA", [Image.new("L", im.size, br), Image.new("L", im.size, bg_), Image.new("L", im.size, bb), alpha])
    ar, ag, ab = hexrgb(acc)
    m = mask_for()
    fill = Image.new("RGBA", im.size, (ar, ag, ab, 255))
    # kasın içi: vurgu rengi, çizimin gölgesi korunur (alfa en az %55)
    fa = Image.merge("L", [im.point(lambda v: min(255, 140 + int(v * 0.6)))])
    fill.putalpha(fa)
    out = Image.composite(fill, out, m)
    out.save(os.path.join(OUT, name))

def tint_light(acc, name):         # aydınlık tema: zeminsiz açık kopya
    im = Image.open(os.path.join(ROOT, "anatomy-light.webp")).convert("RGBA")
    r, g, b, a = im.split()
    lum = Image.merge("RGB", (r, g, b)).convert("L")
    ar, ag, ab = hexrgb(acc)
    col = Image.merge("RGBA", [lum.point(lambda v, c=c: min(255, int(c * (0.45 + 0.75 * v / 255)))) for c in (ar, ag, ab)] + [a])
    Image.composite(col, im, mask_for()).save(os.path.join(OUT, name))

def sample_photo():                # örnek fotoğraf (kullanıcının kendi fotoğrafının yerine)
    W, H = 1080, 1920
    im = Image.new("RGB", (W, H))
    px = im.load()
    for y in range(H):
        for x in range(0, W, 4):
            t_ = y / H
            c = (int(52 - 30 * t_ + 10 * math.sin(x / 210)), int(44 - 26 * t_), int(40 - 20 * t_ + 6 * math.cos(y / 300)))
            for k in range(4):
                if x + k < W: px[x + k, y] = c
    d = ImageDraw.Draw(im)
    for (cx, cy, r, c) in [(220, 260, 150, (255, 214, 160)), (860, 200, 120, (255, 226, 190)), (540, 120, 90, (255, 240, 210)),
                           (300, 1100, 380, (90, 80, 72)), (820, 1300, 300, (70, 64, 60))]:
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c)
    d.rectangle([120, 780, 960, 820], fill=(110, 110, 116)); d.rectangle([150, 700, 210, 900], fill=(36, 36, 38)); d.rectangle([870, 700, 930, 900], fill=(36, 36, 38))
    im = im.filter(ImageFilter.GaussianBlur(28))
    im.save(os.path.join(OUT, "ornek-foto.jpg"), quality=86)

def build_assets():
    tint_dark("#1FD1C1", "harita-koyu.jpg")
    tint_alpha("#1FD1C1", "#E4E4E7", "harita-seffaf.png")
    tint_alpha("#1FD1C1", "#FFFFFF", "harita-seffaf-beyaz.png")
    tint_light("#0E7C72", "harita-acik.png")
    sample_photo()

# ---------------------------------------------------------------- ORTAK
SANS = '-apple-system, "SF Pro Display", "Segoe UI", Roboto, sans-serif'
P = "_paylasim/"
LOGO = '<img src="../icon.png" style="width:{s}px;height:{s}px;border-radius:{r}px">'
def logo(s): return LOGO.format(s=s, r=int(s * 0.25))
def wordmark(size, col="#FFFFFF", acc="#1FD1C1"):
    return f'<span class="disp" style="font-size:{size}px;color:{col}">AYK<span style="color:{acc}">+</span></span>'
STAR = '<svg width="{s}" height="{s}" viewBox="0 0 24 24" style="vertical-align:-0.12em"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.2 1.3-6.6L2.5 9.3l6.6-.8z" fill="{c}"/></svg>'
def star(s, c): return STAR.format(s=s, c=c)
CHECKER = "background:repeating-conic-gradient(#3a3a3f 0 25%, #2a2a2e 0 50%) 0 0/60px 60px"

def frame(inner, w=1080, h=1920, bg="#000", extra=""):
    return f'<div class="fr" style="width:{w}px;height:{h}px;background:{bg};{extra}">{inner}</div>'

def cell(title, sub, fr, w=1080, h=1920):
    z = 1 / 3
    return f'''<figure class="cell"><div class="zoom" style="width:{w*z:.0f}px;height:{h*z:.0f}px"><div style="zoom:{z}">{fr}</div></div>
      <figcaption><b>{title}</b><span>{sub}</span></figcaption></figure>'''

def page(code, name, idea, cells, notes):
    return f'''<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Paylaşım {code}</title><style>{FONT}
*{{box-sizing:border-box;margin:0;padding:0}}
body{{background:#18181B;color:#F4F4F5;font-family:{SANS};padding:40px 40px 60px}}
.disp{{font-family:AYKDisplay,"Barlow Condensed",{SANS};font-style:italic;font-weight:800;letter-spacing:-0.01em;line-height:.9}}
h1{{font-size:34px}} h1 .disp{{font-size:46px}} .idea{{color:#A1A1AA;font-size:17px;margin:8px 0 6px;max-width:1300px;line-height:1.5}}
ul.notes{{color:#D4D4D8;font-size:15px;margin:6px 0 26px 20px;line-height:1.6;max-width:1300px}}
.grid{{display:flex;flex-wrap:wrap;gap:30px 26px;align-items:flex-start}}
.cell{{display:flex;flex-direction:column;gap:10px}} .zoom{{overflow:hidden;border-radius:18px;box-shadow:0 0 0 1px #3F3F46}}
figcaption{{display:flex;flex-direction:column;gap:2px;max-width:360px}} figcaption b{{font-size:16px}} figcaption span{{color:#A1A1AA;font-size:13.5px;line-height:1.4}}
.fr{{position:relative;overflow:hidden;font-family:{SANS};color:#fff}}
.abs{{position:absolute}}
</style></head><body>
<h1><span class="disp">{code}</span> &nbsp;{name}</h1><p class="idea">{idea}</p><ul class="notes">{"".join(f"<li>{n}</li>" for n in notes)}</ul>
<div class="grid">{"".join(cells)}</div></body></html>'''

MAPS = {"koyu": "harita-koyu.jpg", "acik": "harita-acik.png", "seffaf": "harita-seffaf.png", "ratio": 765 / 1024, "blend": True}
# ================================================================ A — "UYGULAMA" (uygulamanın Antrenman ekranıyla aynı dil)
def A_map(post=False, light=False):
    H = 1350 if post else 1920
    bg, tx, mu, card, line, acc = ("#F4F4F5", "#09090B", "#52525B", "#FFFFFF", "#E4E4E7", "#0E7C72") if light else ("#000", "#FFF", "#A1A1AA", "#141416", "#2A2A2E", "#1FD1C1")
    mp = P + (MAPS["acik"] if light else MAPS["koyu"])
    blend = "" if light or not MAPS["blend"] else "mix-blend-mode:screen"
    glow = "" if light else '<div class="abs" style="right:-260px;top:-260px;width:900px;height:900px;background:radial-gradient(circle,rgba(31,209,193,.24),rgba(31,209,193,0) 65%)"></div>'
    top = 72 if post else 110
    mapH = 600 if post else 720
    mapW = int(mapH * MAPS["ratio"])
    stats = "".join(f'''<div style="background:{card};border:2px solid {line};border-radius:36px;padding:{'22px 30px' if post else '30px 34px'};{'' if post else 'height:170px'}">
        <div style="color:{mu};font-weight:600;font-size:30px">{k}</div>
        <div class="disp" style="font-size:{60 if post else 78}px;margin-top:{8 if post else 14}px;color:{acc if k=='Rekor' else tx}">{v}</div></div>''' for k, v in STATS)
    if post:
        body = f'''<div class="abs" style="left:56px;top:420px;width:{mapW}px;height:{mapH}px"><img src="{mp}" style="width:100%;height:100%;{blend}"></div>
          <div class="abs" style="left:{72+mapW+30}px;right:72px;top:420px;display:grid;gap:18px">{stats}</div>'''
    else:
        body = f'''<div class="abs" style="left:0;right:0;top:480px;display:flex;justify-content:center"><img src="{mp}" style="width:{mapW}px;height:{mapH}px;{blend}"></div>
          <div class="abs" style="left:72px;right:72px;top:1236px;color:{mu};font-size:32px;font-weight:600;text-align:center">Çalışan kaslar: <b style="color:{tx}">{WORKED_TXT}</b></div>
          <div class="abs" style="left:72px;right:72px;top:1340px;display:grid;grid-template-columns:1fr 1fr;gap:24px">{stats}</div>'''
    inner = f'''{glow}
      <div class="abs" style="left:72px;right:72px;top:{top}px;display:flex;align-items:center;gap:24px">{logo(96)}{wordmark(64, tx, acc)}
        <span style="margin-left:auto;color:{mu};font-size:30px;font-weight:500">{DATE}</span></div>
      <div class="abs" style="left:72px;top:{top+150}px;color:{acc};font-weight:700;font-size:32px">Antrenman tamamlandı</div>
      <div class="abs disp" style="left:68px;top:{top+200}px;font-size:{96 if post else 120}px;color:{tx}">{DAY.upper()}</div>
      {body}
      <div class="abs" style="left:0;right:0;bottom:{50 if post else 80}px;text-align:center;color:{'#71717A' if light else '#52525B'};font-size:26px;font-weight:500">AYK+ ile kaydedildi</div>'''
    return frame(inner, 1080, H, bg)

def A_photo():
    inner = f'''<img class="abs" src="{P}ornek-foto.jpg" style="inset:0;width:100%;height:100%;object-fit:cover">
      <div class="abs" style="left:0;right:0;bottom:0;height:1100px;background:linear-gradient(rgba(0,0,0,0),rgba(0,0,0,.88) 55%)"></div>
      <div class="abs" style="left:72px;top:110px;display:flex;align-items:center;gap:20px">{logo(80)}{wordmark(56)}</div>
      <img class="abs" src="{P}{MAPS['seffaf']}" style="right:40px;bottom:640px;width:330px;height:{int(330/MAPS['ratio'])}px">
      <div class="abs" style="left:72px;bottom:780px;color:#1FD1C1;font-weight:700;font-size:32px">Antrenman tamamlandı</div>
      <div class="abs disp" style="left:68px;bottom:640px;font-size:120px">{DAY.upper()}</div>
      <div class="abs" style="left:72px;right:72px;bottom:300px;display:grid;grid-template-columns:1fr 1fr;gap:44px 30px">
        {"".join(f'<div><div style="color:#D4D4D8;font-size:30px;font-weight:600">{k}</div><div class="disp" style="font-size:96px;margin-top:10px;color:{"#1FD1C1" if k=="Rekor" else "#fff"}">{v}</div></div>' for k, v in STATS)}</div>
      <div class="abs" style="left:72px;bottom:150px;color:#D4D4D8;font-size:30px">{DATE} · {WORKED_TXT}</div>'''
    return frame(inner)

def A_sticker_block():
    return f'''<div style="display:flex;flex-direction:column;align-items:center;gap:6px;filter:drop-shadow(0 4px 18px rgba(0,0,0,.55))">
      <div style="display:flex;align-items:center;gap:16px">{logo(64)}{wordmark(54)}</div>
      <div class="disp" style="font-size:92px;margin-top:20px">{DAY.upper()}</div>
      <div style="display:flex;gap:56px;margin-top:30px">
        {"".join(f'<div style="text-align:center"><div style="color:#E4E4E7;font-size:28px;font-weight:600">{k}</div><div class="disp" style="font-size:80px;margin-top:8px;color:{"#1FD1C1" if k=="Rekor" else "#fff"}">{v}</div></div>' for k, v in STATS[:3])}
      </div>
      <img src="{P}{MAPS['seffaf']}" style="width:300px;height:{int(300/MAPS['ratio'])}px;margin-top:26px"></div>'''

def A_sticker(on_photo):
    bgl = f'<img class="abs" src="{P}ornek-foto.jpg" style="inset:0;width:100%;height:100%;object-fit:cover">' if on_photo else ""
    return frame(bgl + f'<div class="abs" style="left:0;right:0;top:560px;display:flex;justify-content:center">{A_sticker_block()}</div>',
                 bg="#000" if on_photo else "transparent", extra="" if on_photo else CHECKER)

def A_list():
    rows = "".join(f'''<div style="display:flex;align-items:center;gap:20px;padding:30px 0;border-bottom:2px solid #1E1E21">
        <span style="font-size:38px;font-weight:600;color:#E4E4E7">{n}</span>{star(34, "#1FD1C1") if pr else ""}
        <span style="margin-left:auto;font-size:34px;font-weight:600;color:{"#1FD1C1" if pr else "#A1A1AA"}">{s}</span></div>''' for n, s, pr in EXS)
    inner = f'''<div class="abs" style="right:-260px;top:-260px;width:900px;height:900px;background:radial-gradient(circle,rgba(31,209,193,.2),rgba(31,209,193,0) 65%)"></div>
      <div class="abs" style="left:72px;right:72px;top:110px;display:flex;align-items:center;gap:24px">{logo(96)}{wordmark(64)}<span style="margin-left:auto;color:#A1A1AA;font-size:30px">{DATE}</span></div>
      <img class="abs" src="{P}{MAPS['koyu']}" style="right:60px;top:270px;width:300px;height:{int(300/MAPS['ratio'])}px;{'mix-blend-mode:screen' if MAPS['blend'] else ''}">
      <div class="abs" style="left:72px;top:300px;color:#1FD1C1;font-weight:700;font-size:32px">Antrenman tamamlandı</div>
      <div class="abs disp" style="left:68px;top:350px;font-size:112px;width:640px">{DAY.upper()}</div>
      <div class="abs" style="left:72px;top:520px;display:flex;flex-direction:column;gap:18px;font-size:32px;color:#A1A1AA">
        {"".join(f'<div>{k} <b class="disp" style="font-size:52px;color:{"#1FD1C1" if k=="Rekor" else "#fff"};margin-left:10px">{v}</b></div>' for k, v in STATS)}</div>
      <div class="abs" style="left:72px;right:72px;top:820px"><div style="color:#8B8B93;font-weight:700;font-size:28px;letter-spacing:.08em;margin-bottom:6px">HAREKETLER</div>{rows}</div>
      <div class="abs" style="left:0;right:0;bottom:80px;text-align:center;color:#52525B;font-size:26px">AYK+ ile kaydedildi</div>'''
    return frame(inner)

# ================================================================ B — "SADE" (Strava'ya en yakın: ince, beyaz, fotoğraf öne çıkar)
def B_stats(col="#fff", mu="rgba(255,255,255,.78)", size=104, gap=54, acc="#1FD1C1", items=STATS, align="center"):
    return f'''<div style="display:flex;flex-direction:column;gap:{gap}px;align-items:{align};text-align:{align}">
      {"".join(f'<div><div style="color:{mu};font-size:30px;font-weight:500;letter-spacing:.02em">{k}</div><div style="font-size:{size}px;font-weight:700;letter-spacing:-0.02em;line-height:1.05;margin-top:6px;color:{acc if k=="Rekor" else col}">{v}</div></div>' for k, v in items)}</div>'''

def B_map(post=False, light=False):
    H = 1350 if post else 1920
    bg, tx, mu, acc = ("#FAFAFA", "#09090B", "#71717A", "#0E7C72") if light else ("#0B0B0C", "#FFFFFF", "#A1A1AA", "#1FD1C1")
    mp = P + ("harita-acik.png" if light else "harita-seffaf.png")
    if post:
        inner = f'''<div class="abs" style="left:80px;top:96px;color:{mu};font-size:30px">{DATE}</div>
          <div class="abs" style="left:80px;top:150px;font-size:76px;font-weight:700;color:{tx};letter-spacing:-0.02em">{DAY}</div>
          <div class="abs" style="left:80px;top:330px">{B_stats(tx, mu, 84, 40, acc, align="flex-start")}</div>
          <img class="abs" src="{mp}" style="right:60px;top:300px;width:520px;height:696px">
          <div class="abs" style="left:0;right:0;bottom:56px;text-align:center">{wordmark(44, tx, acc)}</div>'''
    else:
        inner = f'''<div class="abs" style="left:0;right:0;top:150px;text-align:center;color:{mu};font-size:32px">{DATE}</div>
          <div class="abs" style="left:0;right:0;top:206px;text-align:center;font-size:88px;font-weight:700;color:{tx};letter-spacing:-0.02em">{DAY}</div>
          <img class="abs" src="{mp}" style="left:220px;top:380px;width:640px;height:857px">
          <div class="abs" style="left:0;right:0;top:1290px;display:flex;justify-content:center;gap:90px">
            {"".join(f'<div style="text-align:center"><div style="color:{mu};font-size:30px">{k}</div><div style="font-size:76px;font-weight:700;color:{acc if k=="Rekor" else tx};margin-top:8px;letter-spacing:-0.02em">{v}</div></div>' for k, v in STATS[:2])}</div>
          <div class="abs" style="left:0;right:0;top:1500px;display:flex;justify-content:center;gap:150px">
            {"".join(f'<div style="text-align:center"><div style="color:{mu};font-size:30px">{k}</div><div style="font-size:76px;font-weight:700;color:{acc if k=="Rekor" else tx};margin-top:8px">{v}</div></div>' for k, v in STATS[2:])}</div>
          <div class="abs" style="left:0;right:0;bottom:90px;text-align:center">{wordmark(48, tx, acc)}</div>'''
    return frame(inner, 1080, H, bg)

def B_sticker_block():
    return f'''<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 2px 10px rgba(0,0,0,.6))">
      {B_stats(size=96, gap=44, items=STATS[:3])}
      <img src="{P}harita-seffaf-beyaz.png" style="width:250px;height:335px;margin-top:50px">
      <div style="margin-top:30px">{wordmark(48)}</div></div>'''

def B_photo():
    inner = f'''<img class="abs" src="{P}ornek-foto.jpg" style="inset:0;width:100%;height:100%;object-fit:cover">
      <div class="abs" style="inset:0;background:rgba(0,0,0,.22)"></div>
      <div class="abs" style="left:0;right:0;top:420px;display:flex;justify-content:center">{B_sticker_block()}</div>'''
    return frame(inner)

def B_sticker(on_photo):
    bgl = f'<img class="abs" src="{P}ornek-foto.jpg" style="inset:0;width:100%;height:100%;object-fit:cover">' if on_photo else ""
    blk = f'''<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 2px 10px rgba(0,0,0,.6))">
      <div style="font-size:60px;font-weight:700;letter-spacing:-0.02em">{DAY}</div>
      <div style="display:flex;gap:64px;margin-top:40px">{"".join(f'<div style="text-align:center"><div style="font-size:28px;color:rgba(255,255,255,.8)">{k}</div><div style="font-size:72px;font-weight:700;margin-top:4px">{v}</div></div>' for k, v in STATS[:3])}</div>
      <img src="{P}harita-seffaf-beyaz.png" style="width:200px;height:268px;margin-top:36px">
      <div style="margin-top:30px">{wordmark(44)}</div></div>'''
    return frame(bgl + f'<div class="abs" style="left:0;right:0;top:700px;display:flex;justify-content:center">{blk}</div>',
                 bg="#000" if on_photo else "transparent", extra="" if on_photo else CHECKER)

def B_list():
    rows = "".join(f'''<div style="display:flex;align-items:baseline;gap:16px;padding:28px 0;border-bottom:2px solid #1C1C1F">
        <span style="font-size:38px;font-weight:600">{n}</span>{star(30, "#1FD1C1") if pr else ""}
        <span style="margin-left:auto;font-size:34px;color:#A1A1AA">{s}</span></div>''' for n, s, pr in EXS)
    inner = f'''<div class="abs" style="left:80px;top:150px;color:#A1A1AA;font-size:32px">{DATE}</div>
      <div class="abs" style="left:80px;top:205px;font-size:88px;font-weight:700;letter-spacing:-0.02em">{DAY}</div>
      <div class="abs" style="left:80px;right:80px;top:380px;display:flex;justify-content:space-between">
        {"".join(f'<div><div style="color:#A1A1AA;font-size:28px">{k}</div><div style="font-size:58px;font-weight:700;margin-top:6px;color:{"#1FD1C1" if k=="Rekor" else "#fff"}">{v}</div></div>' for k, v in STATS)}</div>
      <div class="abs" style="left:80px;right:80px;top:640px">{rows}</div>
      <img class="abs" src="{P}harita-seffaf.png" style="left:390px;top:1300px;width:300px;height:402px">
      <div class="abs" style="left:0;right:0;bottom:90px;text-align:center">{wordmark(44)}</div>'''
    return frame(inner, bg="#0B0B0C")

# ================================================================ C — "AFİŞ" (açılıştaki eğik kesik çizgi, iri yazı, harita sahnede)
def band(top, h, fs, bgc, txc):    # eğik bant ve gün adı birlikte döner
    return (f'<div class="abs" style="left:-200px;right:-200px;top:{top}px;height:{h}px;background:{bgc};transform:rotate(-7deg);'
            f'display:flex;align-items:center;padding:14px 0 0 256px"><span class="disp" style="font-size:{fs}px;color:{txc};white-space:nowrap">{DAY.upper()}</span></div>')
def C_map(post=False, light=False):
    H = 1350 if post else 1920
    bg, tx, mu, acc = ("#F4F4F5", "#09090B", "#52525B", "#0E7C72") if light else ("#000", "#FFFFFF", "#A1A1AA", "#1FD1C1")
    mp = P + ("harita-acik.png" if light else "harita-koyu.jpg")
    blend = "" if light else "mix-blend-mode:screen"
    bnd = band(190 if post else 270, 160 if post else 200, 140 if post else 180, acc, "#F4F4F5" if light else "#00201D")
    mapH = 640 if post else 900
    mapW = int(mapH * 765 / 1024)
    nums = "".join(f'<div style="text-align:right"><div class="disp" style="font-size:{96 if post else 132}px;color:{acc if k=="Rekor" else tx}">{v.split(" ")[0]}</div><div class="disp" style="font-size:{34 if post else 44}px;color:{mu};margin-top:6px">{(" ".join(v.split(" ")[1:]) + " " if len(v.split(" "))>1 else "")}{k.upper()}</div></div>' for k, v in STATS if k != "Süre")
    if post:
        rest = f'''<img class="abs" src="{mp}" style="left:0;bottom:40px;width:{mapW}px;height:{mapH}px;{blend}">
          <div class="abs" style="right:72px;bottom:90px;display:flex;flex-direction:column;gap:24px;align-items:flex-end">{nums}</div>'''
    else:
        rest = f'''<img class="abs" src="{mp}" style="left:0;top:620px;width:{mapW}px;height:{mapH}px;{blend}">
          <div class="abs" style="right:72px;top:640px;display:flex;flex-direction:column;gap:40px;align-items:flex-end">{nums}
            <div style="text-align:right"><div class="disp" style="font-size:96px;color:{tx}">1:12</div><div class="disp" style="font-size:44px;color:{mu};margin-top:6px">SA:DK SÜRE</div></div></div>
          <div class="abs" style="left:72px;right:72px;top:1680px;display:flex;justify-content:space-between;color:{mu};font-size:30px"><span>{DATE}</span><span>{WORKED_TXT}</span></div>'''
    inner = f'''{bnd}
      <div class="abs" style="left:72px;right:72px;top:{60 if post else 110}px;display:flex;align-items:center;gap:20px">{logo(72)}{wordmark(54, tx, acc)}
        <span class="disp" style="margin-left:auto;font-size:40px;color:{mu}">{DATE.upper()}</span></div>
      {rest}'''
    return frame(inner, 1080, H, bg)

def C_photo():
    inner = f'''<img class="abs" src="{P}ornek-foto.jpg" style="inset:0;width:100%;height:100%;object-fit:cover">
      <div class="abs" style="left:0;right:0;bottom:0;height:900px;background:linear-gradient(rgba(0,0,0,0),rgba(0,0,0,.85) 60%)"></div>
      <div class="abs" style="left:72px;top:110px;display:flex;align-items:center;gap:18px">{logo(72)}{wordmark(54)}</div>
      {band(1150, 190, 170, "#1FD1C1", "#00201D")}
      <div class="abs" style="left:72px;right:72px;bottom:150px;display:flex;justify-content:space-between;align-items:flex-end">
        {"".join(f'<div><div class="disp" style="font-size:104px;color:{"#1FD1C1" if k=="Rekor" else "#fff"}">{v.split(" ")[0]}</div><div class="disp" style="font-size:40px;color:#D4D4D8;margin-top:8px">{(" ".join(v.split(" ")[1:]) + " ") if len(v.split(" "))>1 else ""}{k.upper()}</div></div>' for k, v in STATS if k != "Süre")}
        <img src="{P}harita-seffaf.png" style="width:220px;height:295px"></div>'''
    return frame(inner)

def C_sticker(on_photo):
    bgl = f'<img class="abs" src="{P}ornek-foto.jpg" style="inset:0;width:100%;height:100%;object-fit:cover">' if on_photo else ""
    blk = f'''<div class="abs" style="left:0;right:0;top:640px;height:560px">
      <div class="abs" style="left:110px;right:110px;top:40px;height:180px;background:#1FD1C1;transform:rotate(-7deg);border-radius:12px;display:flex;align-items:center;justify-content:center;padding-top:14px"><span class="disp" style="font-size:150px;color:#00201D;white-space:nowrap">{DAY.upper()}</span></div>
      <div class="abs" style="left:150px;right:150px;top:300px;display:flex;justify-content:space-between;filter:drop-shadow(0 3px 12px rgba(0,0,0,.6))">
        {"".join(f'<div><div class="disp" style="font-size:96px;color:{"#1FD1C1" if k=="Rekor" else "#fff"}">{v.split(" ")[0]}</div><div class="disp" style="font-size:36px;color:#fff;margin-top:6px">{(" ".join(v.split(" ")[1:]) + " ") if len(v.split(" "))>1 else ""}{k.upper()}</div></div>' for k, v in STATS if k != "Süre")}</div>
      <div class="abs" style="left:0;right:0;top:500px;text-align:center;filter:drop-shadow(0 2px 8px rgba(0,0,0,.6))">{wordmark(48)}</div></div>'''
    return frame(bgl + blk, bg="#000" if on_photo else "transparent", extra="" if on_photo else CHECKER)

def C_list():
    rows = "".join(f'''<div style="display:flex;align-items:center;gap:22px;padding:24px 0">
        <span class="disp" style="font-size:64px;color:{"#1FD1C1" if pr else "#3F3F46"};width:70px">{i+1}</span>
        <span style="font-size:38px;font-weight:700">{n.upper()}</span>{star(32, "#1FD1C1") if pr else ""}
        <span class="disp" style="margin-left:auto;font-size:46px;color:{"#1FD1C1" if pr else "#D4D4D8"}">{s}</span></div>''' for i, (n, s, pr) in enumerate(EXS))
    inner = f'''{band(270, 200, 180, "#1FD1C1", "#00201D")}
      <div class="abs" style="left:72px;right:72px;top:110px;display:flex;align-items:center;gap:20px">{logo(72)}{wordmark(54)}<span class="disp" style="margin-left:auto;font-size:40px;color:#A1A1AA">{DATE.upper()}</span></div>
      <div class="abs" style="left:72px;right:72px;top:620px">{rows}</div>
      <div class="abs" style="left:72px;right:72px;bottom:110px;display:flex;justify-content:space-between">
        {"".join(f'<div><div class="disp" style="font-size:72px;color:{"#1FD1C1" if k=="Rekor" else "#fff"}">{v}</div><div class="disp" style="font-size:32px;color:#A1A1AA;margin-top:4px">{k.upper()}</div></div>' for k, v in STATS)}</div>'''
    return frame(inner)

# ---------------------------------------------------------------- SAYFALAR
def cells_for(mp, ph, st, ls):
    return [
        cell("1 · Kas haritası", "Hikâye 1080×1920. Çalışan kaslar boyalı; ne kadar çok set, o kadar parlak.", mp()),
        cell("2 · Fotoğraf üstü", "Kendi fotoğrafını seçersin; fotoğraf uygulamada saklanmaz. (Burada örnek bulanık fotoğraf.)", ph()),
        cell("3a · Şeffaf çıkartma — hikâyende", "Instagram hikâyende kendi fotoğrafının/videonun üstüne yapıştırırsın.", st(True)),
        cell("3b · Şeffaf çıkartma — dosyanın kendisi", "Damalı zemin = şeffaf. Paylaşılan görselin arkası boştur.", st(False)),
        cell("4 · Hareket listesi", "Hareketler, set × tekrar · kilo; rekorlar yıldızlı.", ls()),
        cell("Gönderi boyutu (1080×1350)", "1 numaralı kartın Instagram gönderisi hâli. Her şablonun gönderi hâli olur.", mp(post=True), 1080, 1350),
        cell("Aydınlık tema", "Aynı kart, açık renkte. Seçim paylaşım ekranında: Koyu / Aydınlık.", mp(light=True)),
    ]

PAGES = [
    ("A", "Uygulama", "Uygulamanın Antrenman ekranıyla aynı dil: siyah zemin, turkuaz vurgu, eğik kalın AYK yazı tipi, yuvarlak köşeli kutular. Bugünkü paylaşım kartının geliştirilmiş hâli.",
     ["Artı: uygulamayı tanıyan biri hemen AYK+ olduğunu anlar; en tanıdık, en düzenli.",
      "Eksi: kutulu yapı fotoğraf üstünde ağır durabilir; Strava'dan çok 'uygulama ekran görüntüsü' gibi."],
     cells_for(A_map, A_photo, A_sticker, A_list)),
    ("B", "Sade", "Strava'ya en yakın tarz: kutu yok, ince ve beyaz yazılar, sayılar üst üste. Fotoğraf öne çıkar, yazı geri planda kalır.",
     ["Artı: her fotoğrafa uyar, en 'temiz' görünüm; çıkartma çok küçük ve şık.",
      "Eksi: AYK+ kimliği daha zayıf (logo yalnızca altta); kartlar biraz sade/boş görünebilir."],
     cells_for(B_map, B_photo, B_sticker, B_list)),
    ("C", "Afiş", "Açılış animasyonundaki eğik kesik çizgiden esinlenen, spor afişi gibi iddialı tarz: turkuaz eğik bant üstünde iri gün adı, kocaman sayılar, harita sahnede.",
     ["Artı: en dikkat çekici ve en 'paylaşılası'; AYK+ kimliği güçlü.",
      "Eksi: uzun gün adları bantta küçülmek zorunda kalır; aydınlık temada bant daha az etkili."],
     cells_for(C_map, C_photo, C_sticker, C_list)),
]

# ================================================================ A3 — A2 + yapay zekâ geri bildirimleri
M3 = {"koyu": "harita2-koyu-gemini.png", "acik": "harita2-acik-gemini.png", "seffaf": "harita2-seffaf-gemini.png", "ratio": 900 / 1166}
def A3_pal(light):
    return dict(bg="#F4F4F5", tx="#09090B", mu="#52525B", acc="#0E7C72", accrgb="14,124,114", panel="rgba(255,255,255,.92)", foot="#71717A", mp=M3["acik"]) if light else \
           dict(bg="#000", tx="#FFFFFF", mu="#A1A1AA", acc="#1FD1C1", accrgb="31,209,193", panel="rgba(20,20,22,.88)", foot="#52525B", mp=M3["koyu"])

def A3_label(c, size=32):
    return f'''<div style="display:flex;align-items:center;gap:16px"><span style="width:12px;height:{int(size*1.2)}px;background:{c["acc"]};transform:skewX(-14deg);border-radius:2px"></span>
      <span style="color:{c["acc"]};font-weight:700;font-style:italic;font-size:{size}px">Antrenman tamamlandı</span></div>'''

def A3_title(c, size=128, w=600):
    return f'''<div class="disp" style="font-size:{size}px;color:{c["tx"]}">{DAY.upper()}</div>
      <div style="height:6px;width:{w}px;margin-top:18px;border-radius:3px;background:linear-gradient(90deg,{c["acc"]},rgba({c["accrgb"]},0))"></div>'''

def A3_panel(c, items=STATS, cols=2, vsize=72, pad="34px 44px", rowgap=26):
    cells = ""
    for i, (k, v) in enumerate(items):
        div = f'border-left:3px solid rgba({c["accrgb"]},.35);padding-left:34px' if i % cols else ""
        cells += f'''<div style="{div}"><div style="color:{c["mu"]};font-size:28px;font-weight:600;font-style:italic">{k}</div>
          <div class="disp" style="font-size:{vsize}px;margin-top:10px;white-space:nowrap;color:{c["acc"] if k=="Rekor" else c["tx"]}">{v}</div></div>'''
    return f'''<div style="transform:skewX(-8deg);border:3px solid rgba({c["accrgb"]},.75);border-radius:34px;background:{c["panel"]};
        box-shadow:0 0 46px rgba({c["accrgb"]},.22), inset 0 0 30px rgba({c["accrgb"]},.06);padding:{pad}">
      <div style="transform:skewX(8deg);display:grid;grid-template-columns:repeat({cols},1fr);row-gap:{rowgap}px">{cells}</div></div>'''

def A3_stage(c, w, h):   # haritanın arkasında ışık + yay
    return f'''<div class="abs" style="left:50%;top:50%;width:{int(w*1.25)}px;height:{int(w*1.25)}px;transform:translate(-50%,-48%);border-radius:50%;
        background:radial-gradient(circle,rgba({c["accrgb"]},.16) 0,rgba({c["accrgb"]},0) 62%)"></div>
      <div class="abs" style="left:50%;top:50%;width:{int(w*1.12)}px;height:{int(w*1.12)}px;transform:translate(-50%,-50%);border-radius:50%;
        border:3px solid rgba({c["accrgb"]},.45);-webkit-mask-image:linear-gradient(200deg,#000 0,rgba(0,0,0,.6) 35%,transparent 70%)"></div>'''

def A3_map(post=False, light=False):
    c = A3_pal(light)
    H = 1350 if post else 1920
    worked = f'<span style="color:{c["mu"]}">Çalışan kaslar:</span> ' + f' <span style="color:{c["acc"]}">•</span> '.join(f'<b style="color:{c["tx"]}">{m}</b>' for m in WORKED_TXT.split(" · "))
    head = f'''<div class="abs" style="left:72px;right:72px;top:{64 if post else 100}px;display:flex;align-items:center">{wordmark(60, c["tx"], c["acc"])}
        <span style="margin-left:auto;color:{c["mu"]};font-size:30px;font-weight:500">{DATE}</span></div>'''
    foot = f'''<div class="abs" style="left:0;right:0;bottom:{46 if post else 76}px;display:flex;align-items:center;justify-content:center;gap:24px;color:{c["foot"]};font-size:26px;font-style:italic">
        <span style="width:140px;height:2px;background:linear-gradient(90deg,transparent,{c["foot"]})"></span>AYK+ ile kaydedildi<span style="width:140px;height:2px;background:linear-gradient(90deg,{c["foot"]},transparent)"></span></div>'''
    if post:
        mh = 720; mw = int(mh * M3["ratio"])
        body = f'''<div class="abs" style="left:72px;top:{150}px">{A3_label(c, 30)}<div style="margin-top:14px">{A3_title(c, 104, 460)}</div></div>
          <div class="abs" style="left:30px;top:450px;width:{mw}px;height:{mh}px">{A3_stage(c, mw, mh)}<img src="{P}{c["mp"]}" class="abs" style="inset:0;width:100%;height:100%"></div>
          <div class="abs" style="left:{30+mw+30}px;right:72px;top:540px">{A3_panel(c, cols=1, vsize=64, pad="30px 40px", rowgap=20)}</div>'''
    else:
        mh = 760; mw = int(mh * M3["ratio"])
        body = f'''<div class="abs" style="left:72px;top:230px">{A3_label(c)}<div style="margin-top:14px">{A3_title(c)}</div></div>
          <div class="abs" style="left:{(1080-mw)//2}px;top:520px;width:{mw}px;height:{mh}px">{A3_stage(c, mw, mh)}<img src="{P}{c["mp"]}" class="abs" style="inset:0;width:100%;height:100%"></div>
          <div class="abs" style="left:0;right:0;top:1316px;text-align:center;font-size:32px;font-style:italic">{worked}</div>
          <div class="abs" style="left:96px;right:96px;top:1410px">{A3_panel(c)}</div>'''
    return frame(head + body + foot, 1080, H, c["bg"])

def A3_photo():
    c = A3_pal(False); c["panel"] = "rgba(0,0,0,.55)"
    inner = f'''<img class="abs" src="{P}ornek-foto.jpg" style="inset:0;width:100%;height:100%;object-fit:cover">
      <div class="abs" style="left:0;right:0;bottom:0;height:1150px;background:linear-gradient(rgba(0,0,0,0),rgba(0,0,0,.85) 55%)"></div>
      <div class="abs" style="left:72px;top:100px">{wordmark(60)}</div>
      <img class="abs" src="{P}{M3["seffaf"]}" style="right:56px;bottom:760px;width:300px;height:{int(300/M3["ratio"])}px">
      <div class="abs" style="left:72px;bottom:780px">{A3_label(c)}</div>
      <div class="abs" style="left:72px;bottom:610px">{A3_title(c, 124, 520)}</div>
      <div class="abs" style="left:96px;right:96px;bottom:170px">{A3_panel(c)}</div>
      <div class="abs" style="left:0;right:0;bottom:90px;text-align:center;color:#D4D4D8;font-size:28px;font-style:italic">{DATE} · {WORKED_TXT}</div>'''
    return frame(inner)

def A3_sticker(on_photo):
    c = A3_pal(False); c["panel"] = "rgba(0,0,0,.5)"
    bgl = f'<img class="abs" src="{P}ornek-foto.jpg" style="inset:0;width:100%;height:100%;object-fit:cover">' if on_photo else ""
    blk = f'''<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 4px 18px rgba(0,0,0,.5))">
      {wordmark(54)}
      <div class="disp" style="font-size:96px;margin-top:22px">{DAY.upper()}</div>
      <div style="width:900px;margin-top:34px">{A3_panel(c, STATS[:3], cols=3, vsize=60, pad="26px 34px")}</div>
      <img src="{P}{M3["seffaf"]}" style="width:280px;height:{int(280/M3["ratio"])}px;margin-top:36px"></div>'''
    return frame(bgl + f'<div class="abs" style="left:0;right:0;top:520px;display:flex;justify-content:center">{blk}</div>',
                 bg="#000" if on_photo else "transparent", extra="" if on_photo else CHECKER)

def A3_list():
    c = A3_pal(False)
    rows = "".join(f'''<div style="display:flex;align-items:center;gap:20px;padding:28px 0;border-bottom:2px solid #1E1E21">
        <span style="font-size:38px;font-weight:600;color:#E4E4E7">{n}</span>{star(34, "#1FD1C1") if pr else ""}
        <span style="margin-left:auto;font-size:34px;font-weight:600;color:{"#1FD1C1" if pr else "#A1A1AA"}">{s}</span></div>''' for n, s, pr in EXS)
    inner = f'''<div class="abs" style="left:72px;right:72px;top:100px;display:flex;align-items:center">{wordmark(60)}<span style="margin-left:auto;color:#A1A1AA;font-size:30px">{DATE}</span></div>
      <div class="abs" style="right:40px;top:200px;width:300px;height:{int(300/M3["ratio"])}px">{A3_stage(c, 300, 390)}<img src="{P}{M3["koyu"]}" class="abs" style="inset:0;width:100%;height:100%"></div>
      <div class="abs" style="left:72px;top:250px">{A3_label(c)}<div style="margin-top:14px">{A3_title(c, 112, 500)}</div></div>
      <div class="abs" style="left:96px;right:96px;top:640px">{A3_panel(c, STATS, cols=4, vsize=50, pad="26px 30px")}</div>
      <div class="abs" style="left:72px;right:72px;top:880px"><div style="color:#8B8B93;font-weight:700;font-size:28px;letter-spacing:.08em;margin-bottom:6px">HAREKETLER</div>{rows}</div>
      <div class="abs" style="left:0;right:0;bottom:76px;text-align:center;color:#52525B;font-size:26px;font-style:italic">AYK+ ile kaydedildi</div>'''
    return frame(inner)

def main():
    build_assets()
    paths = []
    for code, name, idea, notes, cells in PAGES:
        p = os.path.join(HERE, f"paylasim-{code}.html")
        open(p, "w", encoding="utf-8").write(page(code, name, idea, cells, notes))
        paths.append((code, p))
        print("✓", p)
    # A2: A tarzı + Gemini'nin sade kas haritası (_harita_isle.py)
    global MAPS
    MAPS = {"koyu": "harita2-koyu-gemini.png", "acik": "harita2-acik-gemini.png", "seffaf": "harita2-seffaf-gemini.png", "ratio": 900 / 1166, "blend": False}
    p = os.path.join(HERE, "paylasim-A2.html")
    open(p, "w", encoding="utf-8").write(page("A2", "Uygulama + sade kas haritası", "A tarzı; vücut şeması Gemini ile üretilen sade, düz renkli harita. Çalışan kaslar turkuaz (çok set = parlak), diğerleri koyu gri.", cells_for(A_map, A_photo, A_sticker, A_list), ["Kas haritası tek görsel; her antrenmanda uygulama yeniden boyar."]))
    paths.append(("A2", p))
    p = os.path.join(HERE, "paylasim-A3.html")
    open(p, "w", encoding="utf-8").write(page("A3", "Uygulama · geliştirilmiş", "A2 + Gemini ve ChatGPT'nin geri bildirimlerinden seçilenler: tek AYK+ yazısı (logo tekrarı yok), eğik turkuaz çizgili üst etiket, başlık altı turkuaz çizgi, haritanın arkasında hafif turkuaz ışık ve yay, istatistikler tek eğik panelde (dört ayrı kutu yerine).",
        cells_for(A3_map, A3_photo, A3_sticker, A3_list),
        ["Alınmadı: bütün vücudun parlaması (hangi kasın çalıştığı okunmuyor), radar ızgarası ve oyun arayüzü köşeleri (kalabalık), hız çizgileri (fotoğraf/çıkartmada kirli durur).",
         "Kaynak öneriler: tasarimlar/_paylasim/oneriler/ (gemini-temalar.jpg, chatgpt-tema-1.png)."]))
    paths.append(("A3", p))
    if "--png" in sys.argv:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as pw:
            b = pw.chromium.launch()
            pg = b.new_page(viewport={"width": 1600, "height": 1000}, locale="tr-TR")
            for code, p in paths:
                pg.goto("file:///" + p.replace("\\", "/"))
                pg.wait_for_timeout(600)
                try:
                    pg.screenshot(path=os.path.join(HERE, f"paylasim-{code}.png"), full_page=True)
                    print("✓", f"paylasim-{code}.png")
                except OSError:
                    print("! atlandı (dosya açık):", f"paylasim-{code}.png")
            b.close()

if __name__ == "__main__":
    main()
