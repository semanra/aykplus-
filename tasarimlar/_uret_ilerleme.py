# İlerleme sekmesi tasarım örnekleri (A/B/C) üreticisi.
# Çalıştır: python tasarimlar/_uret_ilerleme.py  → tasarimlar/ilerleme-A|B|C.html (+ --png ile .png)
# Yazı tipi (AYKDisplay, iki @font-face parçası: Latin + Latin Ext.) mobilite-son.html'den alınır.
import os, re, sys, math
HERE = os.path.dirname(os.path.abspath(__file__))
FONT = "".join(re.findall(r"@font-face\{[^}]*\}", open(os.path.join(HERE, "mobilite-son.html"), encoding="utf-8").read()))
assert FONT.count("@font-face") == 2, "AYKDisplay iki parça olmalı"

# ---------------------------------------------------------------- ÖRNEK VERİ
WEEK_AVG = [98.0, 97.4, 96.9, 96.5, 95.8, 95.3, 94.8, 94.2]
WEEK_LBL = ["21 Eyl", "28 Eyl", "5 Eki", "12 Eki", "19 Eki", "26 Eki", "2 Kas", "9 Kas"]
DAILY = [96.1, 96.3, 95.9, 95.8, 96.0, 95.6, 95.4, 95.7, 95.5, 95.2, 95.3, 95.0, 95.1, 94.9,
         95.0, 94.7, 94.8, 94.6, 94.9, 94.5, 94.4, 94.6, 94.3, 94.4, 94.1, 94.3, 94.0, 94.2]
BENCH = [104, 105, 105, 106, 107, 107, 109, 110, 110, 112]
SQUAT = [130, 132, 132, 135, 137, 137, 140, 142, 142, 145]
DEAD = [160, 160, 162, 165, 165, 167, 170, 170, 172, 175]
KCAL = [2410, 2290, 2520, 2350, 2380, 2610, 2300]
DAYS = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"]
LAST7 = ["Cu", "Ct", "Pz", "Pt", "Sa", "Ça", "Bugün"]
MUSCLE = [("Sırt", 14), ("Göğüs", 12), ("Bacak", 10), ("Kol", 9), ("Omuz", 8), ("Karın", 6)]

def tr(n, d=1):  # Türkçe ondalık
    s = f"{n:.{d}f}".replace(".", ",")
    return s
def th(n):  # binlik ayırıcı
    return f"{n:,}".replace(",", ".")

# ---------------------------------------------------------------- İKONLAR
IC = {
  "user": '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  "chevL": '<path d="M15 6l-6 6 6 6"/>', "chevR": '<path d="M9 6l6 6-6 6"/>',
  "plus": '<path d="M12 5v14M5 12h14"/>', "scale": '<path d="M5 20h14l-1.5-12h-11z"/><path d="M9.5 12.5L12 10"/><circle cx="12" cy="4.5" r="1.5"/>',
  "trophy": '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>',
  "brain": '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V4z"/><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1"/>',
  "check": '<path d="M5 12.5l4.5 4.5L19 7.5"/>', "up": '<path d="M7 14l5-5 5 5"/>', "down": '<path d="M7 10l5 5 5-5"/>',
  "ruler": '<path d="M3 17L17 3l4 4L7 21z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/>',
  "cal": '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
}
def ic(n, s=20, w=2):
    return f'<svg width="{s}" height="{s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{IC[n]}</svg>'
NAV_IC = [
  ("Beslenme", '<path d="M7 3v8M5 3v4a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 0-3.2 2.2-3.2 5.2S15 12 17 12v9"/>'),
  ("Antrenman", '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>'),
  ("Mobilite", '<circle cx="12" cy="4.5" r="2"/><path d="M4 9.5l8 2 8-2M12 11.5v4.5M8 21l4-5 4 5"/>'),
  ("İlerleme", '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>')]
def nav():
    return '<nav class="nav">' + "".join(
        f'<div class="{"on" if n == "İlerleme" else ""}"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">{p}</svg>{n}</div>'
        for n, p in NAV_IC) + "</nav>"

# ---------------------------------------------------------------- GRAFİKLER (ince çizgi, sönük ızgara, seçici etiket)
def line_chart(vals, xl, color, w=358, h=170, target=None, tlabel="", unit="", dots=False, area=True, ypad=None, last_label=True, cid="c"):
    lo, hi = min(vals + ([target] if target else [])), max(vals + ([target] if target else []))
    pad = ypad if ypad is not None else (hi - lo) * 0.18 + 0.1
    lo, hi = lo - pad, hi + pad
    L, R, T, B = 34, 10, 12, 24
    X = lambda i: L + (w - L - R) * i / (len(vals) - 1)
    Y = lambda v: T + (h - T - B) * (hi - v) / (hi - lo)
    out = [f'<svg class="chart" viewBox="0 0 {w} {h}" width="100%" role="img" aria-label="grafik">']
    for k in range(4):
        v = lo + (hi - lo) * k / 3
        y = Y(v)
        out.append(f'<line x1="{L}" x2="{w - R}" y1="{y:.1f}" y2="{y:.1f}" stroke="#232326" stroke-width="1"/>')
        out.append(f'<text x="{L - 6}" y="{y + 3.5:.1f}" text-anchor="end" class="ax">{tr(v, 0) if hi - lo > 8 else tr(v, 1)}</text>')
    step = max(1, (len(vals) - 1) // 3)
    for i in range(0, len(vals), step):
        if i < len(xl): out.append(f'<text x="{X(i):.1f}" y="{h - 6}" text-anchor="middle" class="ax">{xl[i]}</text>')
    if target is not None:
        ty = Y(target)
        out.append(f'<line x1="{L}" x2="{w - R}" y1="{ty:.1f}" y2="{ty:.1f}" stroke="#71717A" stroke-width="1.5" stroke-dasharray="4 4"/>')
        out.append(f'<text x="{w - R}" y="{ty - 6:.1f}" text-anchor="end" class="ax2">{tlabel}</text>')
    pts = " ".join(f"{X(i):.1f},{Y(v):.1f}" for i, v in enumerate(vals))
    if area:
        out.append(f'<defs><linearGradient id="g{cid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{color}" stop-opacity=".22"/><stop offset="1" stop-color="{color}" stop-opacity="0"/></linearGradient></defs>')
        out.append(f'<polygon points="{X(0):.1f},{h - B} {pts} {X(len(vals) - 1):.1f},{h - B}" fill="url(#g{cid})"/>')
    out.append(f'<polyline points="{pts}" fill="none" stroke="{color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>')
    if dots:
        for i, v in enumerate(vals[:-1]):
            out.append(f'<circle cx="{X(i):.1f}" cy="{Y(v):.1f}" r="3" fill="{color}" stroke="#141416" stroke-width="2"/>')
    lx, ly = X(len(vals) - 1), Y(vals[-1])
    out.append(f'<circle cx="{lx:.1f}" cy="{ly:.1f}" r="5" fill="{color}" stroke="#141416" stroke-width="2.5"/>')
    if last_label:
        out.append(f'<text x="{lx - 9:.1f}" y="{ly - 10:.1f}" text-anchor="end" class="vl">{tr(vals[-1], 1) if isinstance(vals[-1], float) else vals[-1]}{unit}</text>')
    out.append("</svg>")
    return "".join(out)

def bar_chart(vals, xl, color, w=358, h=150, target=None, tlabel="", hl=None, dim="#2C2C31", cid="b"):
    hi = max(vals + ([target] if target else [])) * 1.12
    L, R, T, B = 8, 8, 14, 22
    n = len(vals); gap = 10
    bw = (w - L - R - gap * (n - 1)) / n
    Y = lambda v: T + (h - T - B) * (1 - v / hi)
    out = [f'<svg class="chart" viewBox="0 0 {w} {h}" width="100%" role="img" aria-label="grafik">']
    out.append(f'<line x1="{L}" x2="{w - R}" y1="{h - B}" y2="{h - B}" stroke="#2A2A2E" stroke-width="1"/>')
    for i, v in enumerate(vals):
        x = L + i * (bw + gap); y = Y(v); r = 4
        fill = color if (hl is None or i == hl) else dim
        out.append(f'<path d="M{x:.1f},{h - B} V{y + r:.1f} Q{x:.1f},{y:.1f} {x + r:.1f},{y:.1f} H{x + bw - r:.1f} Q{x + bw:.1f},{y:.1f} {x + bw:.1f},{y + r:.1f} V{h - B} Z" fill="{fill}"/>')
        out.append(f'<text x="{x + bw / 2:.1f}" y="{h - 6}" text-anchor="middle" class="ax{" axb" if i == hl else ""}">{xl[i]}</text>')
    if target:
        ty = Y(target)
        out.append(f'<line x1="{L}" x2="{w - R}" y1="{ty:.1f}" y2="{ty:.1f}" stroke="#A1A1AA" stroke-width="1.5" stroke-dasharray="4 4"/>')
        out.append(f'<text x="{w - R}" y="{ty - 5:.1f}" text-anchor="end" class="ax2">{tlabel}</text>')
    out.append("</svg>")
    return "".join(out)

def spark(vals, color, w=120, h=36):
    lo, hi = min(vals), max(vals)
    X = lambda i: 2 + (w - 8) * i / (len(vals) - 1)
    Y = lambda v: 4 + (h - 8) * (hi - v) / (hi - lo or 1)
    pts = " ".join(f"{X(i):.1f},{Y(v):.1f}" for i, v in enumerate(vals))
    return (f'<svg viewBox="0 0 {w} {h}" width="{w}" height="{h}" aria-hidden="true"><polyline points="{pts}" fill="none" stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
            f'<circle cx="{X(len(vals) - 1):.1f}" cy="{Y(vals[-1]):.1f}" r="3.5" fill="{color}" stroke="#141416" stroke-width="2"/></svg>')

def ring(pct, color, size=132, sw=12, track="#232326"):
    r = (size - sw) / 2; c = 2 * math.pi * r
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 {size} {size}" aria-hidden="true" style="transform:rotate(-90deg)">'
            f'<circle cx="{size / 2}" cy="{size / 2}" r="{r}" fill="none" stroke="{track}" stroke-width="{sw}"/>'
            f'<circle cx="{size / 2}" cy="{size / 2}" r="{r}" fill="none" stroke="{color}" stroke-width="{sw}" stroke-linecap="round" stroke-dasharray="{c:.1f}" stroke-dashoffset="{c * (1 - pct):.1f}"/></svg>')

def month_cal(acc, on_acc, mob=None):
    # Kasım 2026: 1 Kasım Pazar; bugün 12 Kasım
    work = {2, 4, 6, 9, 11}; mobd = mob or set(); today = 12
    cells = ['<div class="cal-h">' + d + "</div>" for d in DAYS] + ['<div></div>'] * 6
    for d in range(1, 31):
        cls = "cal-d"; style = ""
        if d in work: style = f"background:{acc};color:{on_acc};font-weight:700"
        elif d > today: cls += " fut"
        if d == today: cls += " today"
        dot = '<i class="mdot"></i>' if d in mobd else ""
        cells.append(f'<div class="{cls}" style="{style}">{d}{dot}</div>')
    return '<div class="cal">' + "".join(cells) + "</div>"

# ---------------------------------------------------------------- ORTAK CSS
BASE_CSS = """
:root { --bg:#000; --surface:#141416; --elev:#1E1E21; --line:#2A2A2E; --text:#fff; --muted:#A1A1AA; --dim:#8B8B93; }
* { box-sizing:border-box; margin:0; padding:0; }
body { background:#2A2A2E; color:var(--text); font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,sans-serif; -webkit-font-smoothing:antialiased; }
.disp { font-family:'AYKDisplay',"Arial Narrow",sans-serif; font-style:italic; font-weight:800; letter-spacing:.005em; }
button { font:inherit; color:inherit; background:none; border:0; cursor:pointer; }
svg { display:block; }
.doc { width:390px; margin:0 auto; padding:28px 20px 6px; }
.doc h1 { font-size:34px; line-height:1; margin-bottom:10px; }
.doc p { font-size:14px; line-height:1.55; color:#D4D4D8; margin-bottom:8px; }
.doc .sw { display:flex; gap:8px; margin:10px 0 4px; flex-wrap:wrap; }
.doc .sw span { display:inline-flex; align-items:center; gap:6px; font-size:12.5px; color:#D4D4D8; }
.doc .sw i { width:14px; height:14px; border-radius:4px; display:inline-block; }
.cap { width:390px; margin:26px auto 10px; padding:0 20px; font-size:13px; color:#D4D4D8; line-height:1.45; }
.phone { width:390px; height:844px; margin:0 auto; background:var(--bg); position:relative; overflow:hidden; }
.status { height:47px; }
.head { display:flex; align-items:center; justify-content:space-between; padding:6px 16px 12px; }
.head h2 { font-size:32px; line-height:1; text-transform:uppercase; }
.round { width:44px; height:44px; border-radius:50%; background:var(--surface); border:1px solid var(--line); display:grid; place-items:center; color:var(--muted); flex:none; }
.scroll { padding:0 16px 110px; }
.card { background:var(--surface); border-radius:20px; padding:16px; margin-bottom:10px; }
.lbl { font-size:12px; font-weight:700; letter-spacing:.08em; color:var(--muted); text-transform:uppercase; }
.muted { color:var(--muted); } .dim { color:var(--dim); }
.row { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.chip { min-height:44px; padding:0 15px; border-radius:22px; background:var(--elev); font-size:14px; font-weight:600; display:inline-flex; align-items:center; flex:none; color:#E4E4E7; }
.seg { display:grid; background:var(--surface); border-radius:14px; padding:3px; gap:3px; }
.seg span { min-height:44px; border-radius:11px; display:grid; place-items:center; font-size:14px; font-weight:600; color:var(--muted); }
.btn { min-height:52px; border-radius:16px; font-size:15px; font-weight:700; display:flex; align-items:center; justify-content:center; gap:8px; background:var(--elev); padding:0 16px; width:100%; }
.ax { font-size:10.5px; fill:#8B8B93; } .ax2 { font-size:10.5px; fill:#A1A1AA; font-weight:600; } .axb { fill:#fff; font-weight:700; }
.vl { font-size:12px; fill:#fff; font-weight:700; }
.chart { overflow:visible; }
.nav { position:absolute; left:0; right:0; bottom:0; height:86px; background:rgba(14,14,16,.97); border-top:1px solid #1E1E21; display:grid; grid-template-columns:repeat(4,1fr); padding-top:8px; }
.nav .on { color:var(--navon,#fff); font-weight:700; }
.nav div { display:flex; flex-direction:column; align-items:center; gap:4px; font-size:11.5px; color:var(--dim); }
.cal { display:grid; grid-template-columns:repeat(7,1fr); gap:6px; }
.cal-h { font-size:11px; color:var(--dim); text-align:center; padding-bottom:2px; }
.cal-d { position:relative; aspect-ratio:1; border-radius:10px; background:var(--elev); display:grid; place-items:center; font-size:13px; color:#D4D4D8; }
.cal-d.fut { background:#0C0C0E; color:#3F3F46; }
.cal-d.today { box-shadow:inset 0 0 0 2px #fff; }
.mdot { position:absolute; bottom:4px; left:50%; width:5px; height:5px; margin-left:-2.5px; border-radius:50%; background:#B3A6FF; }
.list-row { display:flex; align-items:center; justify-content:space-between; gap:10px; min-height:52px; border-top:1px solid #1E1E21; }
.list-row:first-of-type { border-top:0; }
.delta { display:inline-flex; align-items:center; gap:2px; font-size:12.5px; font-weight:700; }
"""

def page(title, desc, swatches, css, screens):
    sw = '<div class="sw">' + "".join(f'<span><i style="background:{c}"></i>{n}</span>' for n, c in swatches) + "</div>"
    body = "".join(f'<div class="cap">{cap}</div><div class="phone">{html}</div>' for cap, html in screens)
    return f"""<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title><style>{FONT}{BASE_CSS}{css}</style></head>
<body><section class="doc"><h1 class="disp">{title.upper()}</h1>{desc}{sw}</section>{body}<div style="height:40px"></div></body></html>"""

def subheader(title):
    return f'<div class="status"></div><div class="head"><div style="display:flex;align-items:center;gap:12px"><div class="round">{ic("chevL")}</div><h2 class="disp">{title}</h2></div><div class="round">{ic("user", 22, 1.9)}</div></div>'
def header(title="İlerleme", extra=""):
    return f'<div class="status"></div><div class="head"><h2 class="disp">{title}</h2>{extra}<div class="round">{ic("user", 22, 1.9)}</div></div>'

# ================================================================= A · PANO (amber)
def build_A():
    A, ON = "#F5B544", "#2A1A00"
    css = f""":root{{--navon:{A}}} .acc{{color:{A}}} .pri{{background:{A};color:{ON}}}
.hero{{background:linear-gradient(160deg,#2A2110 0%,#141416 60%);border:1px solid #3A2E14;border-radius:24px;padding:16px;margin-bottom:10px}}
.bar{{height:8px;border-radius:4px;background:#2A2A2E;overflow:hidden}} .bar i{{display:block;height:100%;border-radius:4px;background:{A}}}
.tiles{{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}}
.tile{{background:var(--surface);border-radius:20px;padding:14px;min-height:118px;display:flex;flex-direction:column;justify-content:space-between}}
.tile b{{font-size:30px;line-height:1}}
.badge{{font-size:11px;font-weight:800;color:{ON};background:{A};border-radius:6px;padding:2px 6px}}
.chips{{display:flex;gap:8px;overflow:hidden;margin:0 0 12px}} .chip.on{{background:{A};color:{ON}}}
.seg span.on{{background:#fff;color:#000;font-weight:800}}"""
    up = lambda t, good=True: f'<span class="delta" style="color:{"#4ADE80" if good else "#FB7185"}">{t}</span>'
    s1 = header() + f"""<div class="scroll">
  <div class="row" style="margin-bottom:10px"><button class="round">{ic("chevL")}</button><div style="text-align:center"><div class="lbl">Bu hafta</div><div style="font-size:15px;font-weight:650;margin-top:2px">9–15 Kasım</div></div><button class="round" style="opacity:.35">{ic("chevR")}</button></div>
  <div class="hero">
    <div class="row" style="align-items:center">
      <div style="position:relative;width:132px;height:132px;flex:none">{ring(.67, A)}<div style="position:absolute;inset:0;display:grid;place-items:center;text-align:center"><div><b class="disp" style="font-size:44px;line-height:.9">67</b><div class="dim" style="font-size:11.5px;margin-top:2px">hafta puanı</div></div></div></div>
      <div style="flex:1;min-width:0">
        {''.join(f'<div style="margin-bottom:12px"><div class="row" style="font-size:13px;margin-bottom:5px"><span class="muted">{n}</span><b>{v}</b></div><div class="bar"><i style="width:{p}%"></i></div></div>' for n, v, p in [("Antrenman", "2 / 4 plan", 50), ("Beslenme hedefi", "3 / 4 gün", 75), ("Mobilite", "3 / 4 gün", 75)])}
      </div>
    </div>
    <div style="font-size:13.5px;color:#E4E4E7;line-height:1.45;margin-top:2px">Haftanın en iyisi: <b class="acc">Bench Press'te yeni rekor</b> (112 kg tahmini).</div>
  </div>
  <div class="tiles">
    <div class="tile"><div class="row"><span class="lbl">Kilo</span>{up("▼ 0,6")}</div><div><b class="disp">94,2</b> <span class="muted" style="font-size:13px">kg</span></div>{spark(DAILY[-14:], A, 132, 30)}</div>
    <div class="tile"><div class="row"><span class="lbl">Tonaj</span>{up("▲ %8")}</div><div><b class="disp">12.300</b> <span class="muted" style="font-size:13px">kg</span></div><div class="dim" style="font-size:12px">2 antrenman · 28 set</div></div>
    <div class="tile"><div class="row"><span class="lbl">Kardiyo</span></div><div><b class="disp">45</b> <span class="muted" style="font-size:13px">dk</span></div><div class="dim" style="font-size:12px">6,2 km · 1 seans</div></div>
    <div class="tile"><div class="row"><span class="lbl">Su</span></div><div><b class="disp">3,1</b> <span class="muted" style="font-size:13px">L / gün</span></div><div class="dim" style="font-size:12px">Hedef 3,8 L</div></div>
  </div>
  <div class="card" style="display:flex;gap:12px;align-items:flex-start"><div class="acc" style="margin-top:2px">{ic("brain", 22)}</div><div style="flex:1"><div style="font-weight:700;font-size:15px">Kalori koçu: doğru yoldasın</div><div class="muted" style="font-size:13.5px;line-height:1.45;margin-top:4px">Haftada ortalama 0,5 kg veriyorsun; hedefinle uyumlu. Kalorinde değişiklik gerekmiyor.</div></div></div>
</div>""" + nav()
    s2 = subheader("Kilo") + f"""<div class="scroll">
  <div class="seg" style="grid-template-columns:repeat(4,1fr);margin-bottom:12px"><span class="on">4 hafta</span><span>3 ay</span><span>6 ay</span><span>Tümü</span></div>
  <div class="card">
    <div class="row" style="align-items:flex-end"><div><div class="lbl">Şu an</div><div><b class="disp" style="font-size:52px;line-height:.95">94,2</b> <span class="muted">kg</span></div></div><div style="text-align:right"><div class="delta" style="color:#4ADE80;font-size:15px">▼ 1,9 kg</div><div class="dim" style="font-size:12px">4 haftada</div></div></div>
    <div style="margin-top:10px">{line_chart(DAILY, ["16 Eki", "", "", "", "", "", "", "23 Eki", "", "", "", "", "", "", "30 Eki", "", "", "", "", "", "", "6 Kas", "", "", "", "", "", "12 Kas"], A, target=None, unit="", ypad=0.4, cid="a2")}</div>
    <div class="row" style="margin-top:8px;font-size:12.5px"><span class="muted">Hedefe <b style="color:#fff">12,2 kg</b> · hedef 82 kg</span><span class="muted">Bu hızla ≈ <b style="color:#fff">24 hafta</b></span></div>
  </div>
  <div class="tiles" style="grid-template-columns:repeat(3,1fr)">
    {''.join(f'<div class="tile" style="min-height:92px;padding:12px"><span class="lbl" style="font-size:10.5px">{n}</span><div><b class="disp" style="font-size:24px">{v}</b></div><span class="dim" style="font-size:11.5px">{s}</span></div>' for n, v, s in [("Yağ oranı", "%22,4", "hedef %15"), ("Yağsız", "73,1 kg", "▲ 0,2"), ("Yağ", "21,1 kg", "▼ 2,1")])}
  </div>
  <div class="card" style="padding:6px 16px">
    <div class="row" style="min-height:48px"><span class="lbl">Ölçüler</span><span class="dim" style="font-size:12px">son: 8 Kasım</span></div>
    {''.join(f'<div class="list-row"><span style="font-size:15px">{n}</span><span style="display:flex;gap:12px;align-items:center"><b style="font-size:15px">{v} cm</b>{up(d, g)}</span></div>' for n, v, d, g in [("Bel", "96", "▼ 3", True), ("Göğüs", "108", "▼ 1", True), ("Kol", "38,5", "▲ 0,5", True), ("Kalça", "104", "▼ 2", True)])}
  </div>
  <button class="btn pri">{ic("scale", 20)}Bugünün tartısını kaydet · 94,2 kg</button>
</div>""" + nav()
    s3 = subheader("Güç") + f"""<div class="scroll">
  <div class="chips"><span class="chip on">Bench Press</span><span class="chip">Squat</span><span class="chip">Deadlift</span><span class="chip">OHP</span></div>
  <div class="card">
    <div class="row" style="align-items:flex-end"><div><div class="lbl">Tahmini 1RM</div><div><b class="disp" style="font-size:52px;line-height:.95">112</b> <span class="muted">kg</span></div></div><div style="text-align:right"><div class="delta" style="color:#4ADE80;font-size:15px">▲ 8 kg</div><div class="dim" style="font-size:12px">10 seansta</div></div></div>
    <div style="margin-top:10px">{line_chart(BENCH, ["S1", "", "", "S4", "", "", "S7", "", "", "S10"], A, dots=True, area=False, unit=" kg", ypad=3, cid="a3")}</div>
  </div>
  <div class="card" style="padding:6px 16px">
    <div class="row" style="min-height:48px"><span class="lbl">Kişisel rekorlar</span><span class="acc">{ic("trophy", 20)}</span></div>
    {''.join(f'<div class="list-row"><span><span style="font-size:15px;font-weight:600">{n}</span> {"<span class=badge>YENİ</span>" if new else ""}<br><span class="dim" style="font-size:12.5px">{d} · {s}</span></span><b class="disp" style="font-size:22px">{v}</b></div>' for n, d, s, v, new in [("Bench Press", "10 Kas", "100 kg × 4", "112 kg", True), ("Squat", "6 Kas", "130 kg × 4", "145 kg", False), ("Deadlift", "4 Kas", "155 kg × 4", "175 kg", False)])}
  </div>
  <div class="card">
    <div class="row" style="margin-bottom:10px"><span class="lbl">Bu hafta kas başına set</span><span class="dim" style="font-size:12px">öneri 10–20</span></div>
    {''.join(f'<div style="display:grid;grid-template-columns:64px 1fr 28px;align-items:center;gap:10px;margin-bottom:9px;font-size:13.5px"><span class="muted">{n}</span><div class="bar" style="position:relative;height:10px"><i style="width:{v / 20 * 100}%;{"" if v >= 10 else "background:#5C4A22"}"></i><span style="position:absolute;left:50%;top:-3px;bottom:-3px;width:1.5px;background:#71717A"></span></div><b style="text-align:right">{v}</b></div>' for n, v in MUSCLE)}
  </div>
</div>""" + nav()
    s4 = subheader("Geçmiş") + f"""<div class="scroll">
  <div class="card">
    <div class="row" style="margin-bottom:12px"><span style="font-size:17px;font-weight:700">Kasım 2026</span><span class="muted" style="font-size:13px"><b style="color:#fff">5</b> antrenman bu ay</span></div>
    {month_cal(A, ON, mob={3, 5, 8, 10, 11, 12})}
    <div style="display:flex;gap:14px;margin-top:12px;font-size:12px;color:#A1A1AA"><span style="display:flex;align-items:center;gap:6px"><i style="width:12px;height:12px;border-radius:3px;background:{A}"></i>Antrenman</span><span style="display:flex;align-items:center;gap:6px"><i style="width:6px;height:6px;border-radius:50%;background:#B3A6FF"></i>Mobilite</span><span style="display:flex;align-items:center;gap:6px"><i style="width:12px;height:12px;border-radius:3px;box-shadow:inset 0 0 0 2px #fff"></i>Bugün</span></div>
  </div>
  <div class="card">
    <div class="row" style="margin-bottom:6px"><span class="lbl">Kalori · son 7 gün</span><span class="dim" style="font-size:12px">ort. 2.409 kcal</span></div>
    {bar_chart(KCAL, LAST7, A, target=2400, tlabel="Hedef 2.400", hl=None, cid="a4")}
  </div>
  <div class="card" style="padding:6px 16px">
    {''.join(f'<div class="list-row"><span class="muted" style="font-size:14px">{n}</span><b style="font-size:15px">{v}</b></div>' for n, v in [("Protein ort.", "182 g · hedef 190"), ("Su ort.", "3,1 L · hedef 3,8"), ("Hedefte geçen gün", "5 / 7")])}
  </div>
</div>""" + nav()
    desc = """<p><b>Pano:</b> açınca haftanın tamamını tek bakışta gösterir. Üstte "hafta puanı" halkası; antrenman, beslenme hedefi ve mobilite tutturma çubukları. Altında 4 kutu (kilo, tonaj, kardiyo, su) ve kalori koçu. Hafta okları ile geçmiş haftalara gidilir.</p>
<p>Vurgu rengi <b>amber</b> (rekor/altın hissi). Kilo, Güç ve Geçmiş kutuya dokununca açılan ayrıntı sayfalarıdır.</p>"""
    return page("İlerleme A · Pano", desc, [("Vurgu amber #F5B544", A), ("Üzerindeki yazı #2A1A00", ON), ("Yüzey #141416", "#141416"), ("Artış #4ADE80", "#4ADE80")], css, [
        ("1 · Ana pano: hafta puanı, üç tutturma çubuğu, 4 kutu, koç yorumu", s1),
        ("2 · Kilo ve vücut: aralık seçimi, 4 haftalık grafik, hedefe kalan, yağ oranı, ölçüler, tartı kaydı", s2),
        ("3 · Güç: hareket seçimi, tahmini 1RM grafiği, kişisel rekorlar, haftalık kas başına set (çizgi = 10 set alt sınırı)", s3),
        ("4 · Geçmiş: ay takvimi (antrenman günleri dolu, mobilite noktası), son 7 gün kalori, protein/su özeti", s4)])

# ================================================================= B · ALT SEKMELER (mercan)
def build_B():
    C, ON = "#FF8A65", "#2B0F05"
    css = f""":root{{--navon:{C}}} .acc{{color:{C}}} .pri{{background:{C};color:{ON}}}
.tabs{{display:flex;gap:22px;border-bottom:1px solid var(--line);margin:0 0 14px;padding:0 2px}}
.tabs span{{min-height:44px;display:flex;align-items:center;font-size:15px;font-weight:500;color:var(--muted)}}
.tabs span.on{{font-weight:700;color:#fff;box-shadow:inset 0 -2px 0 {C}}}
.big{{display:grid;grid-template-columns:1fr auto;align-items:end;gap:10px;padding:14px 0;border-top:1px solid #1E1E21}}
.big:first-child{{border-top:0}}
.big b{{font-size:44px;line-height:.9}}
.coach{{border-radius:22px;padding:16px;background:#1A120F;border:1px solid #4A2A1F;margin-bottom:14px}}
.week7{{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}}
.week7 div{{text-align:center;font-size:11.5px;color:var(--dim)}}
.week7 i{{display:grid;place-items:center;height:44px;border-radius:12px;background:var(--elev);margin-top:5px;font-style:normal;font-size:13px;color:#D4D4D8}}
.week7 i.w{{background:{C};color:{ON};font-weight:800}} .week7 i.t{{box-shadow:inset 0 0 0 2px #fff}}
.seg span.on{{background:#fff;color:#000;font-weight:800}}
.ex{{display:flex;align-items:center;gap:12px;min-height:64px;border-top:1px solid #1E1E21}}
.ex:first-child{{border-top:0}}"""
    tabs = lambda on: '<div class="tabs">' + "".join(f'<span class="{"on" if t == on else ""}">{t}</span>' for t in ["Genel", "Kilo", "Güç", "Beslenme"]) + "</div>"
    week = '<div class="week7">' + "".join(f'<div>{d}<i class="{c}">{n}</i></div>' for d, n, c in [("Pt", 9, "w"), ("Sa", 10, ""), ("Ça", 11, "w"), ("Pe", 12, "t"), ("Cu", 13, ""), ("Ct", 14, ""), ("Pz", 15, "")]) + "</div>"
    s1 = header() + f"""<div class="scroll">{tabs("Genel")}
  <div class="coach"><div class="row" style="margin-bottom:6px"><span class="lbl acc" style="display:flex;gap:6px;align-items:center">{ic("brain", 18)}Kalori koçu</span><span class="dim" style="font-size:12px">4 haftalık veri</span></div>
    <div style="font-size:19px;font-weight:700;line-height:1.3">Doğru yoldasın.</div><div class="muted" style="font-size:13.5px;line-height:1.45;margin-top:4px">Haftada 0,5 kg veriyorsun; hedefinle uyumlu, kalori değişmesin.</div></div>
  <div class="row" style="margin-bottom:10px"><span class="lbl">Bu hafta · 9–15 Kasım</span><span class="dim" style="font-size:12px">2 / 4 antrenman</span></div>
  {week}
  <div style="margin-top:12px">
    {''.join(f'<div class="big"><div><div class="muted" style="font-size:13px">{n}</div><b class="disp">{v}</b> <span class="muted" style="font-size:14px">{u}</span></div><div style="text-align:right"><span class="delta" style="color:{dc}">{d}</span><div class="dim" style="font-size:12px">{s}</div></div></div>' for n, v, u, d, dc, s in [("Kilo", "94,2", "kg", "▼ 0,6", "#4ADE80", "geçen haftaya göre"), ("Tonaj", "12.300", "kg", "▲ %8", "#4ADE80", "2 antrenman · 28 set"), ("Kardiyo", "45", "dk", "", "", "6,2 km · 1 seans"), ("Ortalama su", "3,1", "L", "", "", "hedef 3,8 L")])}
  </div>
</div>""" + nav()
    s2 = header() + f"""<div class="scroll">{tabs("Kilo")}
  <div class="seg" style="grid-template-columns:repeat(4,1fr);margin-bottom:14px"><span>4 hafta</span><span class="on">3 ay</span><span>6 ay</span><span>Tümü</span></div>
  <div class="big" style="padding-top:0"><div><div class="muted" style="font-size:13px">Haftalık ortalama</div><b class="disp" style="font-size:56px">94,2</b> <span class="muted">kg</span></div><div style="text-align:right"><span class="delta" style="color:#4ADE80;font-size:15px">▼ 3,8 kg</span><div class="dim" style="font-size:12px">8 haftada</div></div></div>
  {line_chart(WEEK_AVG, WEEK_LBL, C, target=None, ypad=0.8, area=True, dots=True, cid="b2")}
  <div class="muted" style="font-size:12.5px;margin:6px 0 14px">Hedef 82 kg · bu hızla ≈ 24 hafta. Günlük tartılar dalgalanır; ortalamaya bak.</div>
  <div class="card" style="padding:4px 16px">
    {''.join(f'<div class="list-row"><span style="font-size:15px">{n}</span><span style="display:flex;gap:12px;align-items:center"><b style="font-size:15px">{v}</b><span class="delta" style="color:#4ADE80">{d}</span></span></div>' for n, v, d in [("Yağ oranı", "%22,4", "▼ 1,6"), ("Yağsız kütle", "73,1 kg", "▲ 0,2"), ("Bel", "96 cm", "▼ 3"), ("Göğüs", "108 cm", "▼ 1"), ("Kol", "38,5 cm", "▲ 0,5")])}
  </div>
  <button class="btn pri" style="margin-top:4px">{ic("plus", 20, 2.4)}Tartı veya ölçü ekle</button>
</div>""" + nav()
    s3 = header() + f"""<div class="scroll">{tabs("Güç")}
  <div class="lbl" style="margin-bottom:6px">Ana hareketler · tahmini 1RM</div>
  <div class="card" style="padding:4px 16px">
    {''.join(f'<div class="ex"><div style="flex:1;min-width:0"><div style="font-size:15px;font-weight:650">{n}</div><div class="dim" style="font-size:12.5px">{s}</div></div>{spark(v, C, 92, 34)}<div style="width:70px;text-align:right"><b class="disp" style="font-size:24px">{v[-1]}</b> <span class="dim" style="font-size:12px">kg</span><div class="delta" style="color:#4ADE80;display:flex;justify-content:flex-end">▲ {v[-1] - v[0]} kg</div></div></div>' for n, s, v in [("Bench Press", "son: 10 Kas · 100 × 4", BENCH), ("Squat", "son: 6 Kas · 130 × 4", SQUAT), ("Deadlift", "son: 4 Kas · 155 × 4", DEAD)])}
  </div>
  <div class="card">
    <div class="row"><span style="font-size:15px;font-weight:700">Bench Press</span><span class="dim" style="font-size:12px">10 seans</span></div>
    <div style="margin-top:8px">{line_chart(BENCH, ["S1", "", "", "S4", "", "", "S7", "", "", "S10"], C, dots=True, area=False, unit=" kg", ypad=3, cid="b3")}</div>
  </div>
  <div class="card" style="padding:4px 16px">
    <div class="row" style="min-height:48px"><span class="lbl">Son rekorlar</span><span class="acc">{ic("trophy", 20)}</span></div>
    {''.join(f'<div class="list-row"><span><span style="font-size:15px;font-weight:600">{n}</span><br><span class="dim" style="font-size:12.5px">{d}</span></span><b style="font-size:15px">{v}</b></div>' for n, d, v in [("Bench Press", "10 Kas · 100 kg × 4", "112 kg"), ("Lat Pulldown", "9 Kas · 75 kg × 8", "95 kg")])}
  </div>
</div>""" + nav()
    s4 = header() + f"""<div class="scroll">{tabs("Beslenme")}
  <div class="seg" style="grid-template-columns:repeat(2,1fr);margin-bottom:14px"><span class="on">7 gün</span><span>30 gün</span></div>
  <div class="big" style="padding-top:0"><div><div class="muted" style="font-size:13px">Ortalama kalori</div><b class="disp" style="font-size:56px">2.409</b> <span class="muted">kcal</span></div><div style="text-align:right"><b style="font-size:15px">5 / 7</b><div class="dim" style="font-size:12px">gün hedefte</div></div></div>
  {bar_chart(KCAL, LAST7, C, target=2400, tlabel="Hedef 2.400", hl=None, cid="b4")}
  <div class="card" style="padding:4px 16px;margin-top:12px">
    {''.join(f'<div class="list-row"><span class="muted" style="font-size:14px">{n}</span><b style="font-size:15px">{v}</b></div>' for n, v in [("Protein ort.", "182 / 190 g"), ("Lif ort.", "31 g"), ("Su ort.", "3,1 / 3,8 L"), ("Haftalık bütçe", "−1.520 kcal açık")])}
  </div>
  <div class="card"><div class="lbl" style="margin-bottom:10px">Kasım · antrenman günleri</div>{month_cal(C, ON)}</div>
</div>""" + nav()
    desc = """<p><b>Alt sekmeler:</b> Antrenman ve Beslenme'deki gibi üstte dört alt sekme: <b>Genel · Kilo · Güç · Beslenme</b>. Her sayfa tek konulu ve sade; kartlar az, büyük sayılar ve ince ayırıcılar çok (antrenman sekmesindeki listeler gibi).</p>
<p>Vurgu rengi <b>mercan</b>. Genel sayfası kalori koçuyla açılır; haftanın 7 günü şeritte, antrenman günleri dolu.</p>"""
    return page("İlerleme B · Alt sekmeler", desc, [("Vurgu mercan #FF8A65", C), ("Üzerindeki yazı #2B0F05", ON), ("Yüzey #141416", "#141416"), ("Artış #4ADE80", "#4ADE80")], css, [
        ("1 · Genel: kalori koçu, haftanın 7 günü, büyük sayılarla kilo / tonaj / kardiyo / su", s1),
        ("2 · Kilo: haftalık ortalama grafiği (8 hafta), yağ oranı ve ölçüler tek listede, ekle düğmesi", s2),
        ("3 · Güç: ana hareketler küçük eğrilerle, seçili hareketin grafiği, son rekorlar", s3),
        ("4 · Beslenme: 7/30 gün, ortalama kalori ve hedef çizgisi, protein / lif / su / haftalık bütçe, ay takvimi", s4)])

# ================================================================= C · HAFTALIK RAPOR (çok renkli)
def build_C():
    T, G, L = "#1FD1C1", "#22C55E", "#B3A6FF"          # sekme renkleri (yazı/vurgu)
    cT, cG, cL = "#12A396", "#23A34E", "#8A77EC"        # grafik tonları (renk körlüğü kontrolünden geçti)
    css = f""".sec{{border-radius:22px;background:var(--surface);padding:16px;margin-bottom:10px;position:relative;overflow:hidden}}
.sec::before{{content:"";position:absolute;left:0;top:16px;bottom:16px;width:4px;border-radius:0 4px 4px 0;background:var(--c)}}
.sec h4{{font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--c);margin-bottom:8px}}
.stats{{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}}
.stats b{{font-size:26px;line-height:1}} .stats span{{display:block;font-size:11.5px;color:var(--dim);margin-top:4px}}
.matrix{{display:grid;grid-template-columns:78px repeat(7,1fr);gap:5px;align-items:center}}
.matrix .h{{font-size:11px;color:var(--dim);text-align:center}} .matrix .n{{font-size:12.5px;color:#D4D4D8}}
.matrix i{{height:26px;border-radius:7px;background:#1E1E21;display:block}}
.wk{{display:flex;align-items:center;gap:12px;min-height:72px;border-top:1px solid #1E1E21}} .wk:first-child{{border-top:0}}
.mini{{display:flex;gap:4px;align-items:flex-end;height:30px}} .mini i{{width:10px;border-radius:3px 3px 0 0;display:block}}
.pr{{display:flex;gap:12px;align-items:center;padding:12px;border-radius:16px;background:#0E2422;margin-bottom:8px}}
.lift{{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}} .lift>div{{background:var(--surface);border-radius:18px;padding:12px 10px}}"""
    wkhead = f"""<div class="row" style="margin-bottom:12px"><button class="round">{ic("chevL")}</button><div style="text-align:center"><div class="disp" style="font-size:24px;line-height:1">HAFTA 46</div><div class="muted" style="font-size:13px;margin-top:3px">9–15 Kasım · devam ediyor</div></div><button class="round" style="opacity:.35">{ic("chevR")}</button></div>"""
    def mrow(name, color, on):
        return f'<span class="n">{name}</span>' + "".join(f'<i style="{"background:" + color if d in on else ("background:#0C0C0E" if d > 3 else "")}"></i>' for d in range(7))
    matrix = '<div class="matrix"><span></span>' + "".join(f'<span class="h" style="{"color:#fff;font-weight:800" if i == 3 else ""}">{"Bugün" if i == 3 else d}</span>' for i, d in enumerate(DAYS)) + mrow("Antrenman", cT, {0, 2}) + mrow("Beslenme", cG, {0, 1, 2}) + mrow("Mobilite", cL, {1, 2, 3}) + "</div>"
    s1 = header() + f"""<div class="scroll">{wkhead}
  <div style="font-size:17px;line-height:1.45;color:#E4E4E7;margin:0 2px 14px">Bu hafta <b style="color:#fff">2 antrenman</b>, <b style="color:#fff">1 rekor</b> ve <b style="color:#fff">0,6 kg</b> düşüş. Mobilitede en çok <b style="color:#fff">kalça</b> çalıştı.</div>
  <div class="card">{matrix}</div>
  <div class="sec" style="--c:{T}"><h4>Antrenman</h4><div class="stats"><div><b class="disp">2</b><span>antrenman</span></div><div><b class="disp">12,3</b><span>ton tonaj</span></div><div><b class="disp">1</b><span>rekor</span></div></div></div>
  <div class="sec" style="--c:{G}"><h4>Beslenme</h4><div class="stats"><div><b class="disp">3/4</b><span>gün hedefte</span></div><div><b class="disp">2.410</b><span>ort. kcal</span></div><div><b class="disp">184</b><span>ort. protein g</span></div></div></div>
  <div class="sec" style="--c:{L}"><h4>Mobilite</h4><div class="stats"><div><b class="disp">3/4</b><span>gün yapıldı</span></div><div><b class="disp">21</b><span>hareket</span></div><div><b class="disp" style="font-size:20px">Kalça</b><span>en çok bölge</span></div></div></div>
</div>""" + nav()
    s2 = header() + f"""<div class="scroll">{wkhead}
  <div class="sec" style="--c:#fff">
    <h4 style="color:#A1A1AA">Kilo eğilimi</h4>
    <div class="row" style="align-items:flex-end"><div><b class="disp" style="font-size:52px;line-height:.95">94,2</b> <span class="muted">kg · haftalık ort.</span></div><span class="delta" style="color:#4ADE80;font-size:15px">▼ 0,6</span></div>
    <div style="margin-top:10px">{line_chart(WEEK_AVG, ["H39", "H40", "H41", "H42", "H43", "H44", "H45", "H46"], "#E4E4E7", ypad=0.8, dots=True, area=False, cid="c2")}</div>
  </div>
  <div class="sec" style="--c:{G}"><h4>Koçun yorumu</h4><div style="font-size:15.5px;line-height:1.5;color:#E4E4E7">Haftada ortalama <b style="color:#fff">0,5 kg</b> veriyorsun; hedeflediğin hız bu. Kalorinde değişiklik gerekmiyor. Proteini bu hafta 6 g artırırsan hedefi tam tutturursun.</div></div>
  <div class="sec" style="--c:#fff"><h4 style="color:#A1A1AA">Vücut</h4>
    {''.join(f'<div class="list-row"><span style="font-size:15px">{n}</span><span style="display:flex;gap:12px;align-items:center"><b style="font-size:15px">{v}</b><span class="delta" style="color:#4ADE80">{d}</span></span></div>' for n, v, d in [("Yağ oranı", "%22,4", "▼ 0,3"), ("Bel", "96 cm", "▼ 1"), ("Kol", "38,5 cm", "▲ 0,5")])}
  </div>
  <button class="btn" style="background:#fff;color:#000">{ic("scale", 20)}Tartı / ölçü ekle</button>
</div>""" + nav()
    s3 = header() + f"""<div class="scroll">{wkhead}
  <div class="lbl" style="margin:0 2px 8px;color:{T}">Bu haftanın rekorları</div>
  <div class="pr"><div style="width:44px;height:44px;border-radius:14px;background:{T};color:#00201D;display:grid;place-items:center;flex:none">{ic("trophy", 22)}</div><div style="flex:1"><div style="font-size:15.5px;font-weight:700">Bench Press · 112 kg</div><div class="muted" style="font-size:13px">10 Kas · 100 kg × 4 · öncekinden +2 kg</div></div></div>
  <div class="lbl" style="margin:16px 2px 8px">Ana hareketler · tahmini 1RM</div>
  <div class="lift">
    {''.join(f'<div><div class="muted" style="font-size:12px">{n}</div><b class="disp" style="font-size:26px">{v[-1]}</b><div style="margin-top:6px">{spark(v, cT, 92, 34)}</div><div class="delta" style="color:#4ADE80;margin-top:4px">▲ {v[-1] - v[0]} kg</div></div>' for n, v in [("Bench", BENCH), ("Squat", SQUAT), ("Deadlift", DEAD)])}
  </div>
  <div class="sec" style="--c:{T};margin-top:10px"><h4>Kas başına set · bu hafta</h4>
    {bar_chart([v for _, v in MUSCLE], [n for n, _ in MUSCLE], cT, h=140, target=10, tlabel="10 set", hl=None, cid="c3")}
  </div>
</div>""" + nav()
    weeks = [("Hafta 46", "9–15 Kas", "▼ 0,6", [2, 3, 3]), ("Hafta 45", "2–8 Kas", "▼ 0,5", [4, 6, 5]), ("Hafta 44", "26 Eki – 1 Kas", "▼ 0,5", [3, 5, 6]), ("Hafta 43", "19–25 Eki", "▼ 0,7", [4, 7, 4]), ("Hafta 42", "12–18 Eki", "▼ 0,4", [3, 4, 2])]
    s4 = header() + f"""<div class="scroll">
  <div class="row" style="margin:0 2px 10px"><span class="lbl">Geçmiş haftalar</span><span style="display:flex;gap:10px;font-size:11.5px;color:#A1A1AA"><span style="display:flex;gap:4px;align-items:center"><i style="width:8px;height:8px;border-radius:2px;background:{cT}"></i>Antr.</span><span style="display:flex;gap:4px;align-items:center"><i style="width:8px;height:8px;border-radius:2px;background:{cG}"></i>Besl.</span><span style="display:flex;gap:4px;align-items:center"><i style="width:8px;height:8px;border-radius:2px;background:{cL}"></i>Mob.</span></span></div>
  <div class="card" style="padding:2px 16px">
    {''.join(f'<div class="wk"><div style="flex:1;min-width:0"><div style="font-size:15.5px;font-weight:650">{n}</div><div class="dim" style="font-size:12.5px">{d} · {a[0]} antr. · {a[1]}/7 hedef · {a[2]}/7 mob.</div></div><div class="mini" aria-hidden="true"><i style="height:{a[0] / 7 * 100}%;background:{cT}"></i><i style="height:{a[1] / 7 * 100}%;background:{cG}"></i><i style="height:{a[2] / 7 * 100}%;background:{cL}"></i></div><div style="width:52px;text-align:right"><span class="delta" style="color:#4ADE80">{w}</span><div class="dim" style="font-size:11px">kg</div></div><span class="dim">{ic("chevR", 18)}</span></div>' for n, d, w, a in weeks)}
  </div>
  <div class="card"><div class="row" style="margin-bottom:10px"><span class="lbl">Kasım takvimi</span><span class="dim" style="font-size:12px">dolu = antrenman · nokta = mobilite</span></div>{month_cal(cT, "#fff", mob={3, 5, 8, 10, 11, 12})}</div>
</div>""" + nav()
    desc = """<p><b>Haftalık rapor:</b> İlerleme bir "hafta raporu" gibi okunur. Üstte hafta numarası ve oklarla önceki haftalar; ilk cümle haftayı özetler. Altında 7 günlük şerit (antrenman / beslenme / mobilite yapılan günler) ve üç bölüm.</p>
<p>Ayrı bir vurgu rengi yok: <b>her bölüm kendi sekmesinin rengini</b> taşır (antrenman turkuaz, beslenme yeşil, mobilite lavanta); böylece İlerleme diğer üç sekmeyi bir araya getiren yer olur. Grafiklerde bu renklerin renk körlüğü testinden geçen biraz koyu tonları kullanılır.</p>"""
    return page("İlerleme C · Haftalık rapor", desc, [("Antrenman #1FD1C1", T), ("Beslenme #22C55E", G), ("Mobilite #B3A6FF", L), ("Grafik tonları #12A396 / #23A34E / #8A77EC", cT)], css, [
        ("1 · Bu hafta: özet cümlesi, 7 günlük şerit, antrenman / beslenme / mobilite bölümleri", s1),
        ("2 · Kilo ve vücut: haftalık ortalama eğrisi (8 hafta), koçun yorumu, vücut değişimleri", s2),
        ("3 · Güç: haftanın rekorları, üç ana hareketin küçük eğrileri, kas başına set (çizgi = 10 set)", s3),
        ("4 · Geçmiş haftalar: her hafta tek satır (antrenman / hedef / mobilite çubukları + kilo değişimi), ay takvimi", s4)])

for key, fn in [("A", build_A), ("B", build_B), ("C", build_C)]:
    open(os.path.join(HERE, f"ilerleme-{key}.html"), "w", encoding="utf-8").write(fn())
print("html ok")

if "--png" in sys.argv:
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        for key in "ABC":
            pg.goto("file:///" + os.path.join(HERE, f"ilerleme-{key}.html").replace("\\", "/")); pg.wait_for_timeout(400)
            w = pg.evaluate("[document.documentElement.scrollWidth, document.documentElement.clientWidth]")
            print(key, "taşma yok" if w[0] <= w[1] else f"TAŞMA {w}")
            pg.screenshot(path=os.path.join(HERE, f"ilerleme-{key}.png"), full_page=True)
        b.close()
    print("png ok")
