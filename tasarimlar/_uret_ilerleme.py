# İlerleme sekmesi tasarım önerileri (A/B/C), 2. tur (14 Kasım 2026).
# Çalıştır: python tasarimlar/_uret_ilerleme.py  → tasarimlar/ilerleme-A|B|C.html
#           python tasarimlar/_uret_ilerleme.py --png → ayrıca 390 ve 320 px ekran görüntüleri (Playwright)
# Renk düzeni (üçünde ortak): "Grafit + kaynak renkleri". Zemin Antrenman/Profil ile aynı siyah aile;
# dokunulan şeyler kırık beyaz (#F4F4F5, Profil v28 ile aynı); veriler geldikleri sekmenin rengini taşır.
# Grafik kuralları (ui-ux-pro-max `chart`): zaman → çizgi; kategori karşılaştırma → yatay çubuk (azalan sıra);
# hedefe göre → bullet (bant + yazı); < 4 nokta → sayı kartı; renk tek başına anlam taşımaz (simge/çizgi deseni/yazı).
import os, re, sys, math
HERE = os.path.dirname(os.path.abspath(__file__))
FONT = "".join(re.findall(r"@font-face\{[^}]*\}", open(os.path.join(HERE, "mobilite-son.html"), encoding="utf-8").read()))
assert FONT.count("@font-face") == 2, "AYKDisplay iki parça olmalı (Latin + Latin Ext.)"

# ---------------------------------------------------------------- RENKLER
ACC, ON = "#F4F4F5", "#09090B"        # dokunulan öğeler (Profil Grafit ile aynı)
TQ, GR, LV, WA = "#1FD1C1", "#22C55E", "#B3A6FF", "#4EA8DE"   # antrenman · beslenme · mobilite · su verisi
OVER = "#FB7185"
KG = "#F4F4F5"                       # kilo: hiçbir sekmeye ait değil → nötr

# ---------------------------------------------------------------- ÖRNEK VERİ (bugün 14 Kasım 2026 Cumartesi)
def tr(n, d=1): return f"{n:.{d}f}".replace(".", ",")
def th(n): return f"{n:,}".replace(",", ".")
DAILY = [98.6, 98.9, 98.4, 98.5, 98.2, 98.6, 98.1, 98.0, 98.3, 97.8, 97.9, 97.6, 97.9, 97.5, 97.4,
         97.7, 97.2, 97.3, 97.0, 97.3, 96.9, 96.8, 97.1, 96.7, 96.8, 96.5, 96.7, 96.3, 96.4, 96.2]
def mavg(v, n=7): return [sum(v[max(0, i - n + 1):i + 1]) / len(v[max(0, i - n + 1):i + 1]) for i in range(len(v))]
AVG7 = mavg(DAILY)
DXL = ["16 Eki", "", "", "", "", "", "", "23 Eki", "", "", "", "", "", "", "30 Eki", "", "", "", "", "", "", "6 Kas", "", "", "", "", "", "", "", "14 Kas"]
WEEK_AVG = [101.2, 100.4, 99.7, 99.0, 98.4, 97.7, 97.1, 96.5]   # son değer = 7 günlük ortalama (96,5)
WEEK_LBL = ["21 Eyl", "28 Eyl", "5 Eki", "12 Eki", "19 Eki", "26 Eki", "2 Kas", "9 Kas"]
TON = [18.2, 21.5, 19.8, 23.1, 24.0, 22.6, 25.3, 16.4]       # ton/hafta; sonuncu sürüyor
BENCH = [96, 97.5, 97.5, 100, 101, 101, 103, 105, 105, 107.5]
BENCH_X = ["15 Eyl", "", "", "6 Eki", "", "", "27 Eki", "", "", "13 Kas"]
MUS = sorted([("Sırt", 16), ("Göğüs", 12), ("Biceps", 9), ("Triceps", 9), ("Omuz", 11), ("Ön Bacak", 8), ("Arka Bacak & Kalça", 6), ("Kalf", 0), ("Karın", 4)], key=lambda x: -x[1])
KCAL = [2390, 2510, 2420, 2620, 2460, 2410, 1540]     # 8–14 Kas; bu hafta (9–13) ±%5: 4/5 gün
KCAL_F = ["", "", "", "over", "", "plan", "now"]           # over: hedefin %5 üstü · plan: öğün işaretlenmemiş · now: bugün
KDAY = ["Pz", "Pt", "Sa", "Ça", "Pe", "Cu", "Ct"]
KT = 2478
WATER = [3.8, 4.4, 3.1, 4.2, 4.0, 2.9, 1.5]; WT = 4.2
import datetime as _dt
TODAY_D = _dt.date(2026, 11, 14)
WORK_D = {_dt.date(2026, m, d) for m, d in [(10, 13), (10, 15), (10, 17), (10, 20), (10, 23), (10, 27), (10, 29), (10, 31), (11, 2), (11, 4), (11, 6), (11, 9), (11, 11), (11, 13)]}
MOB_D = {_dt.date(2026, m, d) for m, d in [(10, 14), (10, 16), (10, 21), (10, 22), (10, 28), (10, 30), (11, 3), (11, 5), (11, 9), (11, 10), (11, 12), (11, 13), (11, 14)]}
WORK = {d.day for d in WORK_D if d.month == 11}; MOB = {d.day for d in MOB_D if d.month == 11}; TODAY = 14
NUTRI_HIT = {9: "ok", 10: "ok", 11: "near", 12: "ok", 13: "ok"}
W7 = tr(sum(DAILY[-7:]) / 7); W7P = tr(sum(DAILY[-14:-7]) / 7); W7D = tr(sum(DAILY[-14:-7]) / 7 - sum(DAILY[-7:]) / 7)

# ---------------------------------------------------------------- İKONLAR (çizgi)
IC = {
  "user": '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  "chevL": '<path d="M15 6l-6 6 6 6"/>', "chevR": '<path d="M9 6l6 6-6 6"/>', "chevD": '<path d="M6 9l6 6 6-6"/>',
  "plus": '<path d="M12 5v14M5 12h14"/>', "check": '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  "up": '<path d="M12 19V5M6 11l6-6 6 6"/>', "down": '<path d="M12 5v14M6 13l6 6 6-6"/>',
  "spark": '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-5A8 8 0 1 1 21 12z"/><path d="M9 10.5h6M9 13.5h4"/>',
  "dumb": '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
  "fork": '<path d="M7 3v8M5 3v4a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 0-3.2 2.2-3.2 5.2S15 12 17 12v9"/>',
  "body": '<circle cx="12" cy="4.5" r="2"/><path d="M4 9.5l8 2 8-2M12 11.5v4.5M8 21l4-5 4 5"/>',
  "scale": '<path d="M5 20h14l-1.5-12h-11z"/><path d="M9.5 12.5L12 10"/><circle cx="12" cy="4.5" r="1.5"/>',
  "drop": '<path d="M12 3c3 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-7 6-11z"/>',
  "ruler": '<path d="M3 17L17 3l4 4L7 21z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/>',
  "warn": '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  "tilde": '<path d="M5 13c2-3 4-3 7 0s5 3 7 0"/>',
}
def ic(n, s=20, w=2, extra=""):
    return f'<svg width="{s}" height="{s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" {extra}>{IC[n]}</svg>'
NAV = [("Beslenme", "fork"), ("Antrenman", "dumb"), ("Mobilite", "body"), ("İlerleme", None)]
TREND = '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>'
def nav():
    out = []
    for n, k in NAV:
        p = IC[k] if k else TREND
        out.append(f'<div class="{"on" if n == "İlerleme" else ""}"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{p}</svg>{n}</div>')
    return '<nav class="nav" aria-label="Sekmeler">' + "".join(out) + "</nav>"

# ---------------------------------------------------------------- GRAFİKLER
def line_chart(series, xl, w=358, h=180, unit="", lo=None, hi=None, cid="l", label=""):
    """series: [{vals, color, width, dash, dots, name}] — her çizginin sonunda doğrudan ad + değer etiketi (renk tek başına anlam taşımaz)."""
    allv = [v for s in series for v in s["vals"]]
    lo = min(allv) if lo is None else lo; hi = max(allv) if hi is None else hi
    pad = (hi - lo) * 0.15 + 0.1; lo, hi = lo - pad, hi + pad
    L, R, T, B = 38, 86, 12, 26
    n = len(series[0]["vals"])
    X = lambda i: L + (w - L - R) * i / (n - 1)
    Y = lambda v: T + (h - T - B) * (hi - v) / (hi - lo)
    o = [f'<svg class="chart" viewBox="0 0 {w} {h}" width="100%" role="img" aria-label="{label}">']
    for k in range(4):
        v = lo + (hi - lo) * k / 3; y = Y(v)
        o.append(f'<line x1="{L}" x2="{w - R + 4}" y1="{y:.1f}" y2="{y:.1f}" stroke="#232326"/>')
        o.append(f'<text x="{L - 7}" y="{y + 4:.1f}" text-anchor="end" class="ax">{tr(v, 0) if hi - lo > 12 else tr(v, 1)}</text>')
    for i, t in enumerate(xl):
        if t: o.append(f'<text x="{X(i):.1f}" y="{h - 7}" text-anchor="middle" class="ax">{t}</text>')
    for s in series:
        pts = " ".join(f"{X(i):.1f},{Y(v):.1f}" for i, v in enumerate(s["vals"]))
        if s.get("dots"):
            for i, v in enumerate(s["vals"]):
                o.append(f'<circle cx="{X(i):.1f}" cy="{Y(v):.1f}" r="2.6" fill="{s["color"]}"/>')
        else:
            o.append(f'<polyline points="{pts}" fill="none" stroke="{s["color"]}" stroke-width="{s.get("width", 2.5)}" stroke-linejoin="round" stroke-linecap="round" {"stroke-dasharray=" + chr(34) + s["dash"] + chr(34) if s.get("dash") else ""}/>')
        if s.get("name"):
            lx, ly = X(n - 1), Y(s["vals"][-1])
            if not s.get("dots"): o.append(f'<circle cx="{lx:.1f}" cy="{ly:.1f}" r="4.5" fill="{s["color"]}" stroke="#141416" stroke-width="2"/>')
            o.append(f'<text x="{lx + 10:.1f}" y="{ly - 2 + s.get("dy", 0):.1f}" class="vl">{tr(s["vals"][-1])}{unit}</text>')
            o.append(f'<text x="{lx + 10:.1f}" y="{ly + 12 + s.get("dy", 0):.1f}" class="ax">{s["name"]}</text>')
    o.append("</svg>")
    return "".join(o)

def bar_chart(vals, xl, color, w=358, h=170, target=None, tlabel="", flags=None, fmt=lambda v: str(v), cid="b", label=""):
    """Dikey çubuk; hedef kesik çizgi (değeri açıklamada yazar). flags: over (çizgili desen + ↑), plan (yalnızca çerçeve + *), now (yarı saydam + 'sürüyor')."""
    flags = flags or [""] * len(vals)
    top = max(vals + ([target] if target else [])) * 1.18
    L, R, T, B = 6, 6, 22, 26
    n = len(vals); gap = 8
    bw = (w - L - R - gap * (n - 1)) / n
    Y = lambda v: T + (h - T - B) * (1 - v / top)
    o = [f'<svg class="chart" viewBox="0 0 {w} {h}" width="100%" role="img" aria-label="{label}">',
         f'<defs><pattern id="hatch{cid}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="{color}"/><line x1="0" y1="0" x2="0" y2="6" stroke="#141416" stroke-width="2.5"/></pattern></defs>',
         f'<line x1="{L}" x2="{w - R}" y1="{h - B}" y2="{h - B}" stroke="#2A2A2E"/>']
    labels = []
    tline = f'<line x1="{L}" x2="{w - R}" y1="{Y(target):.1f}" y2="{Y(target):.1f}" stroke="#E4E4E7" stroke-width="1.5" stroke-dasharray="5 4"/>' if target else ""
    for i, v in enumerate(vals):
        x = L + i * (bw + gap); y = Y(v); r = 5; f = flags[i]
        d = f'M{x:.1f},{h - B} V{y + r:.1f} Q{x:.1f},{y:.1f} {x + r:.1f},{y:.1f} H{x + bw - r:.1f} Q{x + bw:.1f},{y:.1f} {x + bw:.1f},{y + r:.1f} V{h - B} Z'
        if f == "over": o.append(f'<path d="{d}" fill="url(#hatch{cid})"/>')
        elif f == "plan": o.append(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="1.6" stroke-dasharray="3 3"/>')
        elif f == "now": o.append(f'<path d="{d}" fill="{color}" fill-opacity=".35" stroke="{color}" stroke-width="1.4"/>')
        else: o.append(f'<path d="{d}" fill="{color}"/>')
        mark = {"over": " ↑", "plan": " *", "now": ""}.get(f, "")
        labels.append(f'<text x="{x + bw / 2:.1f}" y="{y - 6:.1f}" text-anchor="middle" class="bv">{fmt(v)}{mark}</text>')
        o.append(f'<text x="{x + bw / 2:.1f}" y="{h - 8}" text-anchor="middle" class="ax{" axb" if f == "now" else ""}">{xl[i]}</text>')
    o.append(tline)   # hedef çizgisi çubukların üstünde, değer yazıları en üstte
    o += [t for t in labels]
    o.append("</svg>")
    return "".join(o)

def spark(vals, color, w=96, h=32):
    lo, hi = min(vals), max(vals)
    X = lambda i: 2 + (w - 8) * i / (len(vals) - 1)
    Y = lambda v: 4 + (h - 8) * (hi - v) / (hi - lo or 1)
    pts = " ".join(f"{X(i):.1f},{Y(v):.1f}" for i, v in enumerate(vals))
    return (f'<svg viewBox="0 0 {w} {h}" width="{w}" height="{h}" aria-hidden="true"><polyline points="{pts}" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
            f'<circle cx="{X(len(vals) - 1):.1f}" cy="{Y(vals[-1]):.1f}" r="3.2" fill="{color}"/></svg>')

def bullets(rows, color=TQ, lo=10, hi=20, scale=22):
    """Kas başına haftalık set: yatay çubuk (azalan sıra) + 10–20 bandı (kesik çerçeve) + durum yazısı."""
    out = []
    for name, c in rows:
        pct = min(100, c / scale * 100); a, b = lo / scale * 100, hi / scale * 100
        st = "yok" if c == 0 else "az" if c < lo else "uygun" if c <= hi else "fazla"
        out.append(f'''<div class="bl"><span class="bl-n">{name}</span>
          <span class="bl-t"><i class="bl-band" style="left:{a:.1f}%;width:{b - a:.1f}%"></i><i class="bl-v" style="width:{pct:.1f}%;background:{color}"></i></span>
          <span class="bl-c"><b>{c}</b> <small class="st-{st}">{st}</small></span></div>''')
    return '<div class="bls">' + "".join(out) + "</div>"

def calendar(mob=True):
    """Son 5 hafta (13 Eki Pzt – 15 Kas Paz). Antrenman: turkuaz dolgu + kalın rakam + köşede ✓; mobilite: altta lavanta çizgi.
    Renk körü için her işaret ayrı biçimde (dolgu / ✓ / alt çizgi). Ayın 1'inde ay adı yazılır."""
    start = _dt.date(2026, 10, 13)
    cells = ['<div class="cal-h">' + d + "</div>" for d in ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"]]
    for i in range(35):
        d = start + _dt.timedelta(days=i)
        cls = ["cal-d"]
        if d in WORK_D: cls.append("w")
        if d > TODAY_D: cls.append("fut")
        if d == TODAY_D: cls.append("today")
        lab = f"{d.day}" + ('<small>Kas</small>' if d.day == 1 else "")
        inner = f"<span>{lab}</span>"
        if d in WORK_D: inner += f'<em>{ic("check", 11, 3)}</em>'
        if mob and d in MOB_D: inner += "<u></u>"
        cells.append(f'<div class="{" ".join(cls)}">{inner}</div>')
    return '<div class="cal">' + "".join(cells) + "</div>"

def legend(items):
    return '<div class="lg">' + "".join(f'<span>{sym}{txt}</span>' for sym, txt in items) + "</div>"
LG_W = (f'<i class="lg-w">{ic("check", 9, 3.2)}</i>', "Antrenman")
LG_M = ('<i class="lg-m"></i>', "Mobilite")

def stat(label, value, unit, sub="", dot=None, delta=None, good=True):
    d = ""
    if delta:
        d = f'<span class="delta {"g" if good else "b"}">{ic("down" if delta.startswith("−") else "up", 13, 2.6)}{delta}</span>'
    dt = f'<i class="sdot" style="background:{dot}"></i>' if dot else ""
    return f'''<div class="tile"><div class="t-l">{dt}{label}</div>
      <div class="t-v"><b class="disp">{value}</b><span>{unit}</span></div><div class="t-s">{sub}{d}</div></div>'''

def sec(title, color=None, right=""):
    dot = f'<i class="sdot" style="background:{color}"></i>' if color else ""
    return f'<div class="sec"><h3>{dot}{title}</h3>{right}</div>'

# ---------------------------------------------------------------- ORTAK PARÇALAR
def coach_card():
    return f'''<div class="card coach">
      <div class="row"><div class="c-ic">{ic("spark", 20)}</div><div class="c-t"><b>Kalori koçu</b><span>Son 4 haftada 0,8 kg/hafta verdin; hedef 0,64.</span></div></div>
      <div class="c-n"><span>Önerilen hedef</span><b class="disp">2.728</b><span>kcal</span><span class="delta g">{ic("up", 13, 2.6)}+250</span></div>
      <button class="btn pri">Öneriyi uygula</button>
      <p class="fine">Kademeli artış: tam düzeltme +550 kcal olurdu. Bir hafta sonra yeniden bakılır.</p></div>'''

def weight_card(big=True):
    ch = line_chart([{"vals": DAILY, "color": "#6B6B73", "dots": True},
                     {"vals": AVG7, "color": KG, "width": 3, "name": "7 gün ort.", "dy": -6}], DXL, h=196 if big else 170, unit=" kg", label="Son 30 günün tartıları ve 7 günlük ortalama")
    return f'''<div class="card">
      <div class="row"><div><div class="k">7 günlük ortalama</div><div class="big"><b class="disp">{tr(AVG7[-1])}</b><span>kg</span>
        <span class="delta g">{ic("down", 13, 2.6)}−{W7D} geçen haftaya göre</span></div></div></div>
      {ch}
      {legend([('<i class="lg-dot"></i>', "Günlük tartı"), ('<i class="lg-line"></i>', "7 gün ortalaması")])}
      <p class="fine">Hedef 82 kg (14,2 kg kaldı). Grafiği ezmemek için hedef çizgisi gösterilmiyor; kalan miktar yazıyla.</p>
      <button class="btn pri">{ic("plus", 18, 2.4)}Tartıyı kaydet · 96,2 kg</button></div>'''

def measures_card():
    rows = [("Bel", 104, 101.5, True), ("Göğüs", 118, 117, True), ("Kol", 41, 41.5, True), ("Kalça", 112, 110, True)]
    cells = "".join(f'''<div class="ms"><span class="k">{n}</span><b class="disp">{tr(b)}</b><span class="u">cm</span>
        <span class="delta {"g" if ok else "b"}">{ic("down" if b < a else "up", 12, 2.6)}{"−" if b < a else "+"}{tr(abs(b - a))}</span></div>''' for n, a, b, ok in rows)
    return f'''<div class="card">{sec("Vücut ölçüleri", None, '<button class="chip">' + ic("plus", 16, 2.4) + 'Ölçü ekle</button>')}
      <div class="ms-g">{cells}</div>
      <p class="fine">2 ölçüm var (12 Eki → 9 Kas). Grafik yerine sayı: çizgi grafiği 4 ölçümden sonra açılır.</p></div>'''

def strength_card(chart=True):
    ch = line_chart([{"vals": BENCH, "color": TQ, "width": 2.5, "name": "tahmini 1RM"}], BENCH_X, h=170, unit=" kg", label="Bench Press tahmini 1RM, son 10 seans")
    prs = [("Barbell Bench Press", "107,5", "13 Kas · 90 kg × 6", BENCH, "+11,5"),
           ("Lat Pulldown", "92", "11 Kas · 75 kg × 8", [80, 82, 82, 85, 86, 88, 90, 92], "+12"),
           ("Romanian Deadlift", "128", "9 Kas · 105 kg × 7", [110, 112, 115, 118, 120, 124, 126, 128], "+18")]
    rows = "".join(f'''<button class="pr"><span class="pr-n"><b>{n}</b><span>{s}</span></span>{spark(v, TQ)}
        <span class="pr-v"><b class="disp">{val}</b><span class="delta g">{ic("up", 12, 2.6)}{d}</span></span></button>''' for n, val, s, v, d in prs)
    low = f'''<div class="lowd"><div><b>Squat</b><span>3 seans · grafik için en az 4 gerekir</span></div>
        <div class="lowd-v"><b class="disp">132</b><span>kg</span><span class="delta g">{ic("up", 12, 2.6)}+5</span></div></div>'''
    return (f'''<div class="card">{sec("Hareket ilerlemesi", TQ)}
      <div class="sel">Barbell Bench Press {ic("chevD", 18)}</div>{ch if chart else ""}
      <p class="fine">Tahmini 1RM = tek tekrarda kaldırabileceğin kilo (en iyi setinden hesaplanır).</p></div>
      <div class="card">{sec("Hareketlerin en iyileri", TQ)}<div class="prs">{rows}</div>{low}</div>''')

def muscle_card():
    return f'''<div class="card">{sec("Bu hafta kas başına set", TQ, '<span class="dim sm">Toplam 75</span>')}
      {bullets(MUS)}
      {legend([('<i class="lg-band"></i>', "10–20 set: kas gelişimi için genel öneri")])}</div>'''

def tonnage_card():
    return f'''<div class="card">{sec("Haftalık tonaj", TQ, '<span class="dim sm">ton</span>')}
      {bar_chart(TON, ["21 Eyl", "28", "5 Eki", "12", "19", "26", "2 Kas", "Bu h."], TQ, flags=[""] * 7 + ["now"], fmt=lambda v: tr(v), cid="t", label="Son 8 haftanın tonajı")}
      <p class="fine">Bu hafta sürüyor (yarı saydam): henüz bitmemiş haftayı tam haftalarla karşılaştırmayın.</p></div>'''

def nutri_card():
    return f'''<div class="card">{sec("Kalori · son 7 gün", GR, '<span class="dim sm">ort. 2.436</span>')}
      {bar_chart(KCAL, KDAY[:-1] + ["Bugün"], GR, target=KT, tlabel="hedef 2.478", flags=KCAL_F, fmt=lambda v: tr(v / 1000, 1), cid="k", label="Son 7 günün kalorisi (bin kcal)")}
      {legend([('<i class="lg-sq" style="background:' + GR + '"></i>', "Yenen"), ('<i class="lg-tgt"></i>', "Hedef 2.478"), ('<i class="lg-hatch"></i>', "Hedefin %5 üstü (↑)"), ('<i class="lg-plan"></i>', "İşaretlenmemiş: plan (*)")])}
      <p class="fine">Çubuklar bin kcal.</p></div>'''

def water_card():
    return f'''<div class="card">{sec("Su · son 7 gün", WA, '<span class="dim sm">ort. 3,4 L</span>')}
      {bar_chart(WATER, KDAY[:-1] + ["Bugün"], WA, target=WT, tlabel="hedef 4,2 L", flags=[""] * 6 + ["now"], fmt=lambda v: tr(v), cid="w", label="Son 7 günün suyu (litre)")}{legend([('<i class="lg-tgt"></i>', "Hedef 4,2 L")])}</div>'''

def head(title="İlerleme", sub=None):
    return f'''<header class="hd"><h2 class="disp">{title}</h2><div class="round">{ic("user", 22, 1.9)}</div></header>'''

# ---------------------------------------------------------------- CSS
CSS = f"""
:root {{ --bg:#000; --surface:#141416; --elev:#1E1E21; --line:#2A2A2E; --text:#fff; --muted:#A1A1AA; --dim:#8B8B93; }}
* {{ box-sizing:border-box; margin:0; padding:0; }}
html, body {{ background:#000; }}
body {{ color:var(--text); font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,sans-serif; -webkit-font-smoothing:antialiased; font-size:15px; }}
.app {{ max-width:430px; margin:0 auto; min-height:100vh; padding-bottom:110px; }}
.disp {{ font-family:'AYKDisplay',"Arial Narrow",sans-serif; font-style:italic; font-weight:800; }}
button {{ font:inherit; color:inherit; background:none; border:0; cursor:pointer; text-align:left; }}
svg {{ display:block; }}
.hd {{ position:sticky; top:0; z-index:5; background:#000; border-bottom:1px solid #1E1E21; display:flex; align-items:center; justify-content:space-between; padding:14px 16px 12px; }}
.hd h2 {{ font-size:32px; line-height:1; text-transform:uppercase; }}
.round {{ width:44px; height:44px; border-radius:50%; background:var(--surface); border:1px solid var(--line); display:grid; place-items:center; color:#E4E4E7; flex:none; }}
.wrap {{ padding:14px 16px 0; }}
.card {{ background:var(--surface); border-radius:22px; padding:16px; margin-bottom:12px; }}
.row {{ display:flex; align-items:center; justify-content:space-between; gap:12px; }}
.sec {{ display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:12px; min-height:28px; }}
.sec h3 {{ font-size:16px; font-weight:700; display:flex; align-items:center; gap:8px; }} .sec > span {{ white-space:nowrap; }}
.sdot {{ width:10px; height:10px; border-radius:3px; display:inline-block; flex:none; }}
.k {{ font-size:13px; color:var(--muted); }}
.dim {{ color:var(--dim); }} .sm {{ font-size:13px; }}
.fine {{ font-size:12.5px; color:var(--dim); line-height:1.45; margin-top:10px; }}
.big {{ display:flex; align-items:baseline; gap:6px; flex-wrap:wrap; margin-top:2px; }}
.big b {{ font-size:44px; line-height:.95; }} .big > span {{ color:var(--muted); font-size:15px; }}
.btn {{ min-height:50px; border-radius:16px; font-size:15px; font-weight:700; display:flex; align-items:center; justify-content:center; gap:8px; background:var(--elev); padding:0 16px; width:100%; margin-top:12px; text-align:center; }}
.btn.pri {{ background:{ACC}; color:{ON}; }}
.chip {{ min-height:44px; padding:0 14px; border-radius:22px; background:var(--elev); font-size:14px; font-weight:600; display:inline-flex; align-items:center; gap:6px; flex:none; color:#E4E4E7; }}
.chip.on {{ background:{ACC}; color:{ON}; }}
.delta {{ display:inline-flex; align-items:center; gap:2px; font-size:13px; font-weight:700; white-space:nowrap; }}
.delta.g {{ color:#E4E4E7; }} .delta.b {{ color:{OVER}; }}
.ax {{ font-size:11px; fill:#8B8B93; }} .ax2 {{ font-size:11.5px; fill:#E4E4E7; font-weight:600; }} .axb {{ fill:#fff; font-weight:700; }}
.vl {{ font-size:13px; fill:#fff; font-weight:700; }} .bv {{ font-size:11px; fill:#E4E4E7; font-weight:600; paint-order:stroke; stroke:#141416; stroke-width:4px; stroke-linejoin:round; }}
.chart {{ overflow:visible; margin-top:6px; }}
.lg {{ display:flex; flex-wrap:wrap; gap:6px 14px; margin-top:10px; font-size:12.5px; color:var(--muted); }}
.lg span {{ display:inline-flex; align-items:center; gap:6px; }}
.lg-dot {{ width:7px; height:7px; border-radius:50%; background:#6B6B73; }}
.lg-line {{ width:18px; height:3px; border-radius:2px; background:{KG}; }}
.lg-sq {{ width:12px; height:12px; border-radius:3px; }}
.lg-hatch {{ width:12px; height:12px; border-radius:3px; background:repeating-linear-gradient(45deg,{GR} 0 3px,#141416 3px 5px); }}
.lg-tgt {{ width:18px; height:0; border-top:2px dashed #E4E4E7; }}
.lg-plan {{ width:12px; height:12px; border-radius:3px; border:1.5px dashed {GR}; }}
.lg-band {{ width:22px; height:10px; border-radius:3px; border:1.5px dashed #71717A; }}
.lg-w {{ width:14px; height:14px; border-radius:4px; background:{TQ}; color:#00201D; display:grid; place-items:center; }}
.lg-m {{ width:14px; height:3px; border-radius:2px; background:{LV}; }}
.nav {{ position:fixed; left:0; right:0; bottom:0; height:84px; background:rgba(14,14,16,.97); border-top:1px solid #1E1E21; display:grid; grid-template-columns:repeat(4,1fr); padding-top:8px; max-width:430px; margin:0 auto; }}
.nav div {{ display:flex; flex-direction:column; align-items:center; gap:4px; font-size:12px; color:var(--dim); min-height:44px; }}
.nav .on {{ color:{ACC}; font-weight:700; }}
/* sayı kutuları */
.tiles {{ display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px; }}
.tile {{ background:var(--surface); border-radius:20px; padding:13px 14px; min-height:108px; display:flex; flex-direction:column; justify-content:space-between; min-width:0; }}
.t-l {{ font-size:13px; color:var(--muted); display:flex; align-items:center; gap:7px; }}
.t-v {{ display:flex; align-items:baseline; gap:5px; }} .t-v b {{ font-size:34px; line-height:1; }} .t-v span {{ color:var(--muted); font-size:13px; }}
.t-s {{ font-size:12.5px; color:var(--dim); display:flex; gap:6px; flex-wrap:wrap; align-items:center; }}
/* bullet */
.bls {{ display:flex; flex-direction:column; gap:9px; }}
.bl {{ display:grid; grid-template-columns:minmax(0,96px) 1fr 62px; align-items:center; gap:10px; font-size:13px; }}
.bl-n {{ color:#D4D4D8; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }}
.bl-t {{ position:relative; height:12px; background:#0B0B0D; border-radius:6px; }}
.bl-band {{ position:absolute; top:-3px; bottom:-3px; border:1.5px dashed #71717A; border-radius:5px; }}
.bl-v {{ position:absolute; left:0; top:0; bottom:0; border-radius:6px; }}
.bl-c {{ text-align:right; white-space:nowrap; }} .bl-c b {{ font-size:14px; }} .bl-c small {{ font-size:12px; color:var(--dim); }}
.st-uygun {{ color:#E4E4E7 !important; }} .st-az, .st-yok {{ color:var(--dim) !important; }}
/* takvim */
.cal {{ display:grid; grid-template-columns:repeat(7,1fr); gap:6px; }}
.cal-h {{ font-size:12px; color:var(--dim); text-align:center; }}
.cal-d {{ position:relative; aspect-ratio:1; border-radius:10px; background:var(--elev); display:grid; place-items:center; font-size:13px; color:#A1A1AA; }}
.cal-d.w {{ background:{TQ}; color:#00201D; font-weight:800; }}
.cal-d em {{ position:absolute; top:3px; right:3px; color:#00201D; }}
.cal-d u {{ position:absolute; left:22%; right:22%; bottom:4px; height:3px; border-radius:2px; background:{LV}; }}
.cal-d.w u {{ background:#1B1446; }}
.cal-d.fut {{ background:#0B0B0D; color:#52525B; }}
.cal-d.today {{ box-shadow:inset 0 0 0 2px #fff; }}
.cal-d span {{ display:flex; flex-direction:column; align-items:center; line-height:1.05; }} .cal-d small {{ font-size:9.5px; font-weight:700; }}
/* ölçüler */
.ms-g {{ display:grid; grid-template-columns:1fr 1fr; gap:8px; }}
.ms {{ background:var(--elev); border-radius:16px; padding:10px 12px; display:grid; grid-template-columns:auto 1fr; align-items:baseline; gap:2px 6px; }}
.ms .k {{ grid-column:1 / -1; }} .ms b {{ font-size:26px; line-height:1; }} .ms .u {{ color:var(--muted); font-size:12px; }}
.ms .delta {{ grid-column:1 / -1; font-size:12.5px; }}
/* rekor listesi */
.prs {{ display:flex; flex-direction:column; }}
.pr {{ display:grid; grid-template-columns:1fr auto auto; align-items:center; gap:10px; min-height:60px; border-top:1px solid #1E1E21; width:100%; }}
.pr:first-child {{ border-top:0; }}
.pr-n {{ min-width:0; display:flex; flex-direction:column; }} .pr-n b {{ font-size:14.5px; font-weight:650; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }}
.pr-n span {{ font-size:12.5px; color:var(--dim); }}
.pr-v {{ display:flex; flex-direction:column; align-items:flex-end; }} .pr-v b {{ font-size:24px; line-height:1; }}
.lowd {{ margin-top:10px; background:var(--elev); border-radius:16px; padding:12px; display:flex; justify-content:space-between; align-items:center; gap:10px; }}
.lowd b {{ font-size:14.5px; }} .lowd > div:first-child span {{ font-size:12.5px; color:var(--dim); display:block; }} .lowd-v > span:not(.delta) {{ font-size:12.5px; color:var(--dim); }}
.lowd-v {{ display:grid; grid-template-columns:auto auto; align-items:baseline; justify-items:end; column-gap:4px; flex:none; }} .lowd-v b.disp {{ font-size:28px; line-height:1; }} .lowd-v > span:not(.delta) {{ display:inline; }} .lowd-v .delta {{ grid-column:1 / -1; }}
.sel {{ min-height:48px; border-radius:14px; background:var(--elev); display:flex; align-items:center; justify-content:space-between; padding:0 14px; font-weight:600; font-size:15px; }}
/* koç */
.coach .c-ic {{ width:44px; height:44px; border-radius:14px; background:var(--elev); display:grid; place-items:center; flex:none; }}
.coach .row {{ justify-content:flex-start; }}
.c-t {{ display:flex; flex-direction:column; gap:2px; }} .c-t b {{ font-size:15px; }} .c-t span {{ font-size:13px; color:var(--muted); }}
.c-n {{ display:flex; align-items:baseline; gap:6px; flex-wrap:wrap; margin-top:12px; }} .c-n b {{ font-size:40px; line-height:1; }} .c-n > span {{ color:var(--muted); font-size:13px; }}
@media (max-width:359px) {{
  .hd h2 {{ font-size:28px; }} .big b {{ font-size:38px; }} .t-v b {{ font-size:28px; }}
  .bl {{ grid-template-columns:minmax(0,74px) 1fr 54px; gap:8px; }}
  .pr {{ grid-template-columns:1fr auto; }} .pr > svg {{ display:none; }}
  .cal {{ gap:4px; }} .cal-d {{ font-size:12px; border-radius:8px; }}
}}
"""

def page(title, extra_css, body, script=""):
    return f"""<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title><style>{FONT}{CSS}{extra_css}</style></head>
<body><div class="app">{body}</div>{nav()}{script}</body></html>"""

# ================================================================= A · TEK AKIŞ (pano)
def build_A():
    tiles = (stat("Antrenman", "3", "seans", "hedef 4", TQ, None)
             + stat("Kilo (7 gün ort.)", W7, "kg", "", KG, "−" + W7D)
             + stat("Kalori hedefte", "4/5", "gün", "±%5 · bugün hariç", GR)
             + stat("Mobilite", "5", "gün", "bu hafta", LV))
    body = head() + f'''<div class="wrap">
      <div class="weekbar"><button class="round">{ic("chevL")}</button><div><b>Bu hafta</b><span>9–15 Kasım</span></div><button class="round off">{ic("chevR")}</button></div>
      <div class="tiles">{tiles}</div>
      {coach_card()}
      {sec("Kilo", KG)}{weight_card()}
      {sec("Antrenman", TQ)}<div class="card">{calendar()}{legend([LG_W, LG_M, ('<i class="lg-today"></i>', "Bugün")])}</div>
      {tonnage_card()}{muscle_card()}{strength_card()}
      {sec("Beslenme", GR)}{nutri_card()}{water_card()}
      {sec("Vücut", KG)}{measures_card()}
    </div>'''
    css = """.weekbar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}
.weekbar div{text-align:center;display:flex;flex-direction:column}.weekbar b{font-size:17px}.weekbar span{font-size:13px;color:var(--muted)}
.round.off{opacity:.35}.lg-today{width:14px;height:14px;border-radius:4px;box-shadow:inset 0 0 0 2px #fff}
.wrap > .sec{margin:22px 2px 10px}.wrap > .sec h3{font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}"""
    return page("İlerleme A · Tek akış", css, body)

# ================================================================= B · ALT SEKMELER
def build_B():
    tabs = [("genel", "Genel"), ("kilo", "Kilo"), ("guc", "Güç"), ("beslenme", "Beslenme")]
    tnav = '<nav class="sub" aria-label="İlerleme bölümleri">' + "".join(f'<button data-t="{k}" class="{"on" if k == "genel" else ""}">{l}</button>' for k, l in tabs) + "</nav>"
    strip_rows = []
    for name, color, days in [("Antrenman", TQ, {9, 11, 13}), ("Beslenme hedefi", GR, None), ("Mobilite", LV, {9, 10, 12, 13, 14})]:
        cells = []
        for d in range(9, 16):
            if d > TODAY: cells.append('<i class="sd fut"></i>'); continue
            if days is not None:
                on = d in days
                cells.append(f'<i class="sd {"on" if on else ""}" style="{"background:" + color + ";color:" + ("#00201D" if color == TQ else "#1B1446") if on else ""}">{ic("check", 14, 3) if on else ""}</i>')
            else:
                s = NUTRI_HIT.get(d, "")
                sym = {"ok": ic("check", 14, 3), "near": ic("tilde", 14, 2.6), "far": "!"}.get(s, "")
                bg = {"ok": f"background:{GR};color:#04130A", "near": f"background:#2B3A2F;color:{GR};box-shadow:inset 0 0 0 1.5px {GR}", "far": f"color:{OVER};box-shadow:inset 0 0 0 1.5px {OVER}"}.get(s, "")
                cells.append(f'<i class="sd" style="{bg}">{sym}</i>')
        strip_rows.append(f'<div class="sr"><span><i class="sdot" style="background:{color}"></i>{name}</span><div class="sc">{"".join(cells)}</div></div>')
    strip = ('<div class="card">' + sec("Bu hafta, gün gün") + '<div class="sr hdr"><span></span><div class="sc">' + "".join(f"<b>{d}</b>" for d in ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"]) + "</div></div>" + "".join(strip_rows)
             + legend([(f'<i class="sdx" style="background:{GR};color:#04130A">{ic("check", 10, 3.2)}</i>', "yapıldı / hedefte"), (f'<i class="sdx" style="box-shadow:inset 0 0 0 1.5px {GR};color:{GR}">{ic("tilde", 10, 3)}</i>', "yakın (±%15)"), (f'<i class="sdx" style="box-shadow:inset 0 0 0 1.5px {OVER};color:{OVER}">!</i>', "uzak")]) + "</div>")
    genel = f'''<div class="tiles">{stat("Antrenman", "3", "seans", "hedef 4", TQ)}{stat("Kilo (7 gün ort.)", W7, "kg", "", KG, "−" + W7D)}</div>
      {coach_card()}{strip}'''
    kilo = weight_card() + f'''<div class="card">{sec("Haftalık ortalama")}{line_chart([{"vals": WEEK_AVG, "color": KG, "name": "bu hafta"}], ["21 Eyl", "", "5 Eki", "", "19 Eki", "", "", "9 Kas"], h=160, unit=" kg", label="Son 8 haftanın haftalık kilo ortalaması")}
      <p class="fine">Günlük dalgalanma (su, tuz) gizlenir; asıl eğilim budur.</p></div>''' + measures_card()
    guc = f'''<div class="chips">{"".join(f'<button class="chip {"on" if i == 0 else ""}">{n}</button>' for i, n in enumerate(["Bench Press", "Lat Pulldown", "RDL", "Squat"]))}</div>''' + strength_card() + muscle_card() + tonnage_card() + f'<div class="card">{sec("Antrenman takvimi", TQ)}{calendar()}{legend([LG_W, LG_M])}</div>'
    beslenme = nutri_card() + water_card()
    panes = "".join(f'<section class="pane{" on" if k == "genel" else ""}" data-p="{k}">{c}</section>' for k, c in [("genel", genel), ("kilo", kilo), ("guc", guc), ("beslenme", beslenme)])
    css = f""".sub{{display:flex;justify-content:space-between;gap:8px;border-bottom:1px solid #2A2A2E;margin:0 0 14px}}
.sub button{{min-height:44px;min-width:44px;font-size:15px;font-weight:500;color:var(--muted);border-bottom:2.5px solid transparent;margin-bottom:-1px;text-align:center}}
.sub button.on{{color:#fff;font-weight:800;border-bottom-color:{ACC}}}
.pane{{display:none}}.pane.on{{display:block}}
.chips{{display:flex;gap:8px;overflow-x:auto;margin:0 -16px 12px;padding:0 16px;scrollbar-width:none}}
.sr{{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px;min-height:40px}}
.sr > span{{font-size:13px;color:#D4D4D8;display:flex;align-items:center;gap:7px;min-width:0}}
.sc{{display:grid;grid-template-columns:repeat(7,26px);gap:5px}}
.sr.hdr b{{font-size:11.5px;color:var(--dim);text-align:center;font-weight:600}}
.sd{{width:26px;height:26px;border-radius:8px;background:var(--elev);display:grid;place-items:center;font-style:normal;font-weight:800;font-size:14px}}
.sd.fut{{background:#0B0B0D}}
.sdx{{width:16px;height:16px;border-radius:5px;display:grid;place-items:center;font-style:normal;font-weight:800;font-size:11px}}
@media (max-width:359px){{.sr{{gap:10px}}.sc{{grid-template-columns:repeat(7,22px);gap:4px}}.sd{{width:22px;height:22px}}.sub button{{font-size:14px}}.sr > span{{font-size:12.5px}}}}"""
    script = """<script>document.querySelectorAll('.sub button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.sub button').forEach(x=>x.classList.toggle('on',x===b));document.querySelectorAll('.pane').forEach(p=>p.classList.toggle('on',p.dataset.p===b.dataset.t));window.scrollTo(0,0)});</script>"""
    body = head() + f'<div class="wrap">{tnav}{panes}</div>'
    return page("İlerleme B · Alt sekmeler", css, body, script)

# ================================================================= C · HAFTALIK RAPOR
def build_C():
    cmp_rows = [("Antrenman", TQ, "3 seans", "4 seans", "−1", False), ("Tonaj", TQ, "16,4 t", "25,3 t", "sürüyor", None),
                ("Kilo (ort.)", KG, W7 + " kg", W7P + " kg", "−" + W7D, True), ("Kalori hedefte", GR, "%80 · 4/5", "%57 · 4/7", "+23 puan", True),
                ("Su (ort.)", WA, "3,4 L", "3,9 L", "−0,5", False), ("Mobilite", LV, "5 gün", "3 gün", "+2", True)]
    def dl(d, good):
        if good is None: return f'<span class="dim sm">{d}</span>'
        up = d.startswith("+")
        return f'<span class="delta {"g" if good else "b"}">{ic("up" if up else "down", 12, 2.6)}{d}</span>'
    cmp = "".join(f'''<div class="cr"><span class="cr-n"><i class="sdot" style="background:{c}"></i>{n}</span><span class="cr-v"><b>{a}</b><small>geçen: {b}</small></span>{dl(d, g)}</div>''' for n, c, a, b, d, g in cmp_rows)
    weeks = [("2–8 Kas", "4 antrenman · " + W7P + " kg · kalori 4/7"), ("26 Eki–1 Kas", "4 antrenman · 97,9 kg · kalori 6/7"), ("19–25 Eki", "3 antrenman · 98,4 kg · kalori 5/7"), ("12–18 Eki", "4 antrenman · 99,3 kg · kalori 3/7")]
    wl = "".join(f'<button class="wk"><span><b>{w}</b><span>{s}</span></span>{ic("chevR", 18)}</button>' for w, s in weeks)
    body = head() + f'''<div class="wrap">
      <div class="weekbar"><button class="round">{ic("chevL")}</button><div><b class="disp wk-t">46. HAFTA</b><span>9–15 Kasım · sürüyor</span></div><button class="round off">{ic("chevR")}</button></div>
      <div class="card sum"><p>Bu hafta <b>3 antrenman</b> yaptın, kilo ortalaman <b>{W7D} kg</b> düştü, kalori hedefini <b>5 günün 4'ünde</b> tutturdun. Bir antrenman kaldı.</p></div>
      <div class="card">{sec("Geçen haftaya göre")}{cmp}</div>
      {coach_card()}
      <div class="card">{sec("Kasım", None, '<span class="dim sm">6 antrenman · 7 mobilite</span>')}{calendar()}{legend([LG_W, LG_M])}</div>
      <div class="card">{sec("Kilo · haftalık ortalama", KG)}{line_chart([{"vals": WEEK_AVG, "color": KG, "name": "bu hafta"}], ["21 Eyl", "", "5 Eki", "", "19 Eki", "", "", "9 Kas"], h=170, unit=" kg", label="Son 8 haftanın kilo ortalaması")}
        <button class="btn pri">{ic("plus", 18, 2.4)}Tartıyı kaydet · 96,2 kg</button></div>
      {nutri_card()}
      {sec("Uzun vade")}{strength_card()}{muscle_card()}{measures_card()}
      {sec("Önceki haftalar")}<div class="card wks">{wl}</div>
    </div>'''
    css = f""".weekbar{{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}}
.weekbar div{{text-align:center;display:flex;flex-direction:column;align-items:center}}.wk-t{{font-size:30px;line-height:1}}.weekbar span{{font-size:13px;color:var(--muted);margin-top:3px}}
.round.off{{opacity:.35}}
.sum p{{font-size:16px;line-height:1.5;color:#E4E4E7}} .sum b{{color:#fff}}
.cr{{display:grid;grid-template-columns:minmax(0,1fr) auto 64px;align-items:center;gap:10px;min-height:52px;border-top:1px solid #1E1E21}}
.cr:first-of-type{{border-top:0}} .cr-n{{display:flex;align-items:center;gap:8px;font-size:14px;color:#D4D4D8;min-width:0}}
.cr-v{{display:flex;flex-direction:column;align-items:flex-end}} .cr-v b{{font-size:15px}} .cr-v small{{font-size:12px;color:var(--dim)}}
.cr > :last-child{{justify-self:end}}
.wrap > .sec{{margin:22px 2px 10px}}.wrap > .sec h3{{font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}}
.wks{{padding:4px 16px}} .wk{{display:flex;align-items:center;justify-content:space-between;width:100%;min-height:60px;border-top:1px solid #1E1E21;color:var(--muted)}}
.wk:first-child{{border-top:0}} .wk > span{{display:flex;flex-direction:column}} .wk b{{color:#fff;font-size:15px}} .wk span span{{font-size:12.5px;color:var(--dim)}}
@media (max-width:359px){{.cr{{grid-template-columns:minmax(0,1fr) auto 56px;gap:6px}}.cr-n{{font-size:13px}}.sum p{{font-size:15px}}}}"""
    return page("İlerleme C · Haftalık rapor", css, body)

if __name__ == "__main__":
    files = {"A": build_A(), "B": build_B(), "C": build_C()}
    for k, html in files.items():
        open(os.path.join(HERE, f"ilerleme-{k}.html"), "w", encoding="utf-8").write(html)
    print("✓ ilerleme-A/B/C.html")
    if "--png" in sys.argv:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            b = p.chromium.launch()
            for W in (390, 320):
                ctx = b.new_context(viewport={"width": W, "height": 844 if W == 390 else 568}, device_scale_factor=2, is_mobile=True, has_touch=True)
                pg = ctx.new_page()
                for k in "ABC":
                    pg.goto("file:///" + os.path.join(HERE, f"ilerleme-{k}.html").replace("\\", "/")); pg.wait_for_timeout(300)
                    ov = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
                    assert ov <= 0, f"{k} {W}px yana taşıyor ({ov}px)"
                    if k == "B":
                        for t in ["genel", "kilo", "guc", "beslenme"]:
                            pg.click(f'.sub button[data-t="{t}"]'); pg.wait_for_timeout(120)
                            ov = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
                            assert ov <= 0, f"B/{t} {W}px yana taşıyor"
                            pg.screenshot(path=os.path.join(HERE, f"ilerleme-B-{t}-{W}.png"), full_page=True)
                        pg.click('.sub button[data-t="genel"]')
                    else:
                        pg.screenshot(path=os.path.join(HERE, f"ilerleme-{k}-{W}.png"), full_page=True)
                ctx.close()
            b.close()
        print("✓ ekran görüntüleri (390 / 320 px)")
