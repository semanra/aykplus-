# AYK+ kontrol aracı: son commit ile şimdiki hâli karşılaştırır.
#   npm run kontrol            → derle, 36 ekran × 2 tema ekran görüntüsü (önce/sonra), piksel farkı, okunurluk/dokunma/taşma ölçümü, hız ölçümü
#   npm run kontrol -- --hizli → hız ölçümü olmadan
# Çıktı: build/kontrol/RAPOR.md (+ fark görselleri build/kontrol/fark/). Sorun varsa çıkış kodu 1.
# Gereksinim: pip install playwright pillow && python -m playwright install chromium
import os, sys, json, shutil, subprocess, tarfile, io
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from ortak import server, SEED, SCREENS, SCREEN_ROOT, AUDIT_JS, NO_ANIM, FIXED_TIME
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(REPO, "build", "kontrol")
HIZLI = "--hizli" in sys.argv

def sh(cmd, **kw): return subprocess.run(cmd, cwd=REPO, check=True, capture_output=True, **kw)

def head_tree():
    """Son commit'in dosyalarını (derlenmiş index.html dahil) build/kontrol/onceki-kod altına çıkarır."""
    dst = os.path.join(OUT, "onceki-kod"); shutil.rmtree(dst, ignore_errors=True); os.makedirs(dst)
    data = sh(["git", "archive", "HEAD"]).stdout
    with tarfile.open(fileobj=io.BytesIO(data)) as t: t.extractall(dst, filter="data")
    rev = sh(["git", "log", "-1", "--format=%h %s"]).stdout.decode("utf-8").strip()
    return dst, rev

def shoot(root, out_dir, scheme):
    from playwright.sync_api import sync_playwright
    os.makedirs(out_dir, exist_ok=True); res = {}; errs = []
    with server(root) as url, sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=1, is_mobile=True, has_touch=True, color_scheme=scheme)
        ctx.add_init_script(NO_ANIM)
        pg = ctx.new_page(); pg.clock.set_fixed_time(FIXED_TIME)
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(url); pg.wait_for_timeout(400); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(400)
        pg.evaluate(SEED); pg.wait_for_timeout(250)
        for name, js in SCREENS:
            try: pg.evaluate("() => { " + js + " }")
            except Exception as e: errs.append(f"{name}: {str(e)[:160]}")
            pg.wait_for_timeout(220); pg.evaluate("window.scrollTo(0,0)")
            pg.screenshot(path=os.path.join(out_dir, name + ".png"), full_page=True)
            res[name] = pg.evaluate(AUDIT_JS, SCREEN_ROOT.get(name))
        b.close()
    return res, errs

def pixdiff(a_dir, b_dir, fark_dir):
    from PIL import Image, ImageChops
    rows = []
    for name, _ in SCREENS:
        a, b = os.path.join(a_dir, name + ".png"), os.path.join(b_dir, name + ".png")
        if not (os.path.exists(a) and os.path.exists(b)): rows.append((name, "eksik", "")); continue
        ia, ib = Image.open(a).convert("RGB"), Image.open(b).convert("RGB")
        if ia.size != ib.size:
            rows.append((name, "boyut", f"{ia.size[1]} → {ib.size[1]} px yükseklik")); continue
        d = ImageChops.difference(ia, ib); box = d.getbbox()
        if not box: continue
        px = sum(1 for v in d.convert("L").get_flattened_data() if v > 8) if hasattr(Image.Image, "get_flattened_data") else sum(1 for v in d.convert("L").getdata() if v > 8)
        if px == 0: continue   # gözle görülmeyen kenar yumuşatma farkı
        os.makedirs(fark_dir, exist_ok=True)
        x0, y0, x1, y1 = box; pad = 30
        c = (max(0, x0 - pad), max(0, y0 - pad), min(ia.width, x1 + pad), min(ia.height, y1 + pad, y0 + 900))
        w, h = c[2] - c[0], c[3] - c[1]
        im = Image.new("RGB", (w * 2 + 10, h), "red"); im.paste(ia.crop(c), (0, 0)); im.paste(ib.crop(c), (w + 10, 0))
        im.save(os.path.join(fark_dir, name + ".png"))
        rows.append((name, "fark", f"{px} piksel, alan {box}"))
    return rows

PERF_SEED = r"""() => {
  const D = 864e5, now = Date.now(), key = t => todayStr(new Date(t));
  const ex = ["Barbell Bench Press","Lat Pulldown","Romanian Deadlift","Back Squat","Cable Lateral Raise","Incline Dumbbell Press","Seated Row","Leg Press","Triceps Pushdown","Preacher Curl"];
  state.workoutLogs = []; state.exerciseHistory = {};
  for (let i = 0; i < 156; i++) { const ts = now - (365 - i * 2.34) * D, logId = "l" + i;
    ex.slice((i % 2) * 5, (i % 2) * 5 + 5).forEach((name, j) => { const kg = 40 + j * 10 + i * 0.3;
      (state.exerciseHistory[exKey(name)] = state.exerciseHistory[exKey(name)] || []).push({ ts, logId, kind: "weight", name, sets: [{ kg, reps: 8 }, { kg, reps: 8 }, { kg, reps: 7 }, { kg, reps: 6 }] }); });
    state.workoutLogs.push({ id: logId, ts, date: fmtDate(ts), dayName: "Gün", volume: 9000, sets: 20, cardioMin: 0, cardioKm: 0, prs: 0, durationMin: 60 }); }
  state.weightLogs = []; for (let i = 365; i >= 1; i -= 2) state.weightLogs.push({ date: fmtDate(now - i * D), weight: 100 - (365 - i) * 0.03, ts: now - i * D });
  state.measurements = []; for (let i = 52; i >= 1; i--) state.measurements.push({ ts: now - i * 7 * D, bel: 105 - i * 0.1, kol: 40 });
  state.dailyLogs = {}; for (let i = 1; i <= 365; i++) state.dailyLogs[key(now - i * D)] = { kcal: 2400, p: 190, eatenKcal: 2300, eatenP: 180, mealsDone: 4, mealsTotal: 4, water: 3, calTarget: 2400, proTarget: 190 };
  state.mobilityLog = {}; for (let i = 1; i <= 365; i += 2) state.mobilityLog[key(now - i * D)] = ["Couch Stretch"];
  renderAll();
}"""

def perf(root):
    from playwright.sync_api import sync_playwright
    out = {}
    with server(root) as url, sync_playwright() as p:
        b = p.chromium.launch()
        for rate in (1, 4):
            ctx = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True, color_scheme="dark")
            ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.getElementById('splash'); if(s) s.remove();})")
            pg = ctx.new_page(); cdp = ctx.new_cdp_session(pg)
            pg.goto(url); pg.wait_for_timeout(400); pg.evaluate(PERF_SEED); pg.wait_for_timeout(200)
            cdp.send("Emulation.setCPUThrottlingRate", {"rate": rate})
            loads = []
            for _ in range(3):
                pg.reload(); pg.wait_for_load_state("load")
                loads.append(pg.evaluate("Math.round(performance.getEntriesByType('navigation')[0].loadEventEnd)"))
            r = {"açılış": sorted(loads)[1]}
            for tab in ["nutrition", "gym", "mobility", "progress"]:
                pg.evaluate(f"switchTab('{tab}')"); pg.wait_for_timeout(80)
                r[tab] = pg.evaluate("(() => { const t = []; for (let i = 0; i < 12; i++) { const a = performance.now(); renderAll(); t.push(performance.now() - a); } t.sort((x, y) => x - y); return Math.round(t[6] * 10) / 10; })()")
            r["kayıt KB"] = pg.evaluate("Math.round(localStorage.getItem('ayk_plus_v5_state').length / 1024)")
            out[f"{rate}x"] = r; ctx.close()
        b.close()
    return out

def main():
    shutil.rmtree(OUT, ignore_errors=True); os.makedirs(OUT)
    print("• derleniyor…"); r = subprocess.run(["node", "scripts/build.mjs"], cwd=REPO, capture_output=True, text=True, encoding="utf-8")
    print("  " + (r.stdout.strip().splitlines() or ["?"])[-1])
    if r.returncode: print(r.stderr); sys.exit(1)
    old, rev = head_tree()
    lines = ["# AYK+ kontrol raporu", "", f"Karşılaştırma: son commit (`{rev}`) → çalışma kopyası.", ""]
    problem = False
    for scheme in ["dark", "light"]:
        tr = "koyu" if scheme == "dark" else "aydınlık"
        print(f"• {tr}: ekranlar (önce)…"); _, e0 = shoot(old, os.path.join(OUT, "onceki", scheme), scheme)
        print(f"• {tr}: ekranlar (şimdi)…"); audit, e1 = shoot(REPO, os.path.join(OUT, "simdi", scheme), scheme)
        rows = pixdiff(os.path.join(OUT, "onceki", scheme), os.path.join(OUT, "simdi", scheme), os.path.join(OUT, "fark", scheme))
        lines += [f"## Tema: {tr}", "", f"### Görsel farklar ({len(rows)} / {len(SCREENS)} ekran)", ""]
        lines += [f"- `{n}`: {k} — {d}" for n, k, d in rows] or ["- Fark yok: bütün ekranlar birebir aynı."]
        lines += ["", "### Ölçüm (şimdiki hâl)", ""]
        bad = 0
        for name, a in audit.items():
            items = []
            if a["overflow"] > 0: items.append(f"yatay taşma {a['overflow']} px")
            items += [f"okunurluk {c['r']}/{c['need']} “{c['t']}” ({c['at']})" for c in {(c['t'], c['at']): c for c in a["contrast"]}.values()]
            items += [f"küçük yazı {t['fs']} px “{t['t']}”" for t in a["tiny"][:3]]
            items += [f"dokunma alanı {s['w']}×{s['h']} “{s['t']}”" for s in a["small"] if not s["at"].endswith("polygon")][:4]
            if items: bad += 1; lines.append(f"- `{name}`: " + "; ".join(items[:6]))
        if not bad: lines.append("- Sorun yok (okunurluk, 44 px, 11 px altı yazı, yatay taşma).")
        if e1: lines += ["", "### Sayfa hataları", ""] + [f"- {e}" for e in e1]; problem = True
        problem = problem or bad > 0
        lines.append("")
    if not HIZLI:
        print("• hız ölçümü…"); p0, p1 = perf(old), perf(REPO)
        lines += ["## Hız (1 yıllık veri, her dokunuştaki yeniden çizim, ms)", "", "| | önce 1× | şimdi 1× | önce 4× | şimdi 4× |", "|---|---|---|---|---|"]
        for k in ["açılış", "nutrition", "gym", "mobility", "progress", "kayıt KB"]:
            lines.append(f"| {k} | {p0['1x'][k]} | {p1['1x'][k]} | {p0['4x'][k]} | {p1['4x'][k]} |")
        lines += ["", "4× = işlemci 4 kat yavaşlatılmış (eski telefon). 100 ms üstü gecikme hissedilir.", ""]
    open(os.path.join(OUT, "RAPOR.md"), "w", encoding="utf-8").write("\n".join(lines))
    print("\n".join(lines))
    print(f"\nRapor: build/kontrol/RAPOR.md · fark görselleri: build/kontrol/fark/")
    sys.exit(1 if problem else 0)

if __name__ == "__main__":
    main()
