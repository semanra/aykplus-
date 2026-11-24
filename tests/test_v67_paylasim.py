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

srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT)], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
URL = f"http://localhost:{PORT}/index.html"
def boot(pg): pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(80)
# Örnek antrenman: 24 Kasım 2026, İtiş Günü; Bench önceki 80×8 → bu sefer 85×8 (rekor)
SEED = """() => { const T = new Date(2026, 10, 24, 18, 0).getTime(), D = 86400000;
  state.workoutLogs = []; state.exerciseHistory = {};
  const add = (name, muscle, ts, logId, sets, kind) => { const k = exKey(name); (state.exerciseHistory[k] = state.exerciseHistory[k] || []).push(Object.assign({ ts, logId, kind: kind || 'weight', name, sets }, muscle ? { muscle } : {})); };
  const rep = (n, kg, reps) => Array.from({ length: n }, () => ({ kg, reps }));
  state.workoutLogs.push({ id: 'L0', ts: T - 7 * D, dayName: 'İtiş Günü', durationMin: 60, volume: 2560, sets: 4, prs: 0, cardioMin: 0 });
  add('Bench Press', 'Göğüs', T - 7 * D, 'L0', rep(4, 80, 8));
  state.workoutLogs.push({ id: 'L1', ts: T, dayName: 'İtiş Günü', durationMin: 72, volume: 12450, sets: 11, prs: 1, cardioMin: 0 });
  add('Bench Press', 'Göğüs', T, 'L1', rep(4, 85, 8));
  add('Lateral Raise', 'Omuz', T, 'L1', rep(4, 10, 15));
  add('Triceps Pushdown', 'Triceps', T, 'L1', rep(3, 35, 12));
  renderAll(); }"""
LAST = "state.workoutLogs[state.workoutLogs.length - 1]"
try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    def ctx(locale="tr-TR"):
        c = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, locale=locale, service_workers="block")
        c.add_init_script(TEST_INIT)
        pg = c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e))); pg.goto(URL); boot(pg)
        return c, pg
    c, pg = ctx()
    pg.evaluate(SEED)

    # --- 2) shareData
    d = pg.evaluate("shareData(%s)" % LAST)
    check(d["muscles"] == {"Göğüs": 4, "Omuz": 4, "Triceps": 3}, "2: kas setleri %s" % d["muscles"])
    check([s["key"] for s in d["stats"]] == ["dur", "vol", "sets", "prs", "cardio"], "2: istatistik sırası")
    st = {s["key"]: s for s in d["stats"]}
    check(st["vol"]["value"] == "12.450 kg" and st["vol"]["label"] == "Tonaj" and st["dur"]["value"] == "1 sa 12 dk", "2: tonaj/süre metni %s %s" % (st["vol"], st["dur"]))
    check(st["dur"]["has"] and st["prs"]["has"] and not st["cardio"]["has"], "2: has bayrakları")
    check(len(d["rows"]) == 3 and [r["pr"] for r in d["rows"]].count(True) == 1 and [r for r in d["rows"] if r["pr"]][0]["name"] == "Bench Press", "2: satırlar ve rekor yıldızı %s" % d["rows"])
    check(len(d["prs"]) == 1 and d["prs"][0]["name"] == "Bench Press" and d["prs"][0]["kg"] == 85 and d["prs"][0]["reps"] == 8 and d["prs"][0]["pct"] > 0, "2: rekor listesi %s" % d["prs"])
    check(d["monthNo"] == 2 and d["monthTxt"] == "Kasım ayının 2. antrenmanı", "2: ay sırası %s %s" % (d["monthNo"], d["monthTxt"]))
    d0 = pg.evaluate("shareData(state.workoutLogs[0])")
    check(d0["prs"] == [] and not any(r["pr"] for r in d0["rows"]) and d0["monthNo"] == 1, "2: önceki oturum yoksa rekor yok; ilk antrenman 1.")
    pg.evaluate("%s.prs = 0" % LAST)
    d = pg.evaluate("shareData(%s)" % LAST)
    check(d["prs"] == [] and not any(r["pr"] for r in d["rows"]), "2: log.prs 0 → yıldız yok")
    pg.evaluate("%s.prs = 1" % LAST)
    # eski kayıt: id yok, süre yok
    d = pg.evaluate("shareData({ dayName: 'Eski', ts: Date.now(), volume: 500, sets: 5 })")
    check(d["muscles"] == {} and d["rows"] == [] and not d["stats"][0]["has"] and d["stats"][1]["has"], "2: eski kayıt güvenli %s" % d["stats"][:2])
    # kardiyo
    d = pg.evaluate("""() => { const T = Date.now(); state.exerciseHistory['kosu67'] = [{ ts: T, logId: 'LC', kind: 'cardio', name: 'Koşu Bandı', sets: [{ min: 30, km: 5 }] }];
      return shareData({ id: 'LC', ts: T, dayName: 'Kardiyo', durationMin: 30, volume: 0, sets: 1, prs: 0, cardioMin: 30, cardioKm: 5 }); }""")
    check(d["muscles"] == {} and d["stats"][4]["has"] and d["prs"] == [] and len(d["rows"]) == 1, "2: yalnız kardiyo")
    # İngilizce sıra eki
    pg.evaluate("setLang('en')")
    en = pg.evaluate("[shareData(%s).monthTxt, monthOrdinalEn(1), monthOrdinalEn(2), monthOrdinalEn(3), monthOrdinalEn(11), monthOrdinalEn(12), monthOrdinalEn(13), monthOrdinalEn(21), monthOrdinalEn(22)]" % LAST)
    check(en == ["2nd workout of November", "1st", "2nd", "3rd", "11th", "12th", "13th", "21st", "22nd"], "2: İngilizce ay sırası %s" % en)
    pg.evaluate("setLang('tr')")

    # --- 3) paintMuscleMap
    PX = """async ([mus, pal]) => { const L = await loadMuscleLabels(); const cv = await paintMuscleMap(mus, pal);
      const px = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      const at = name => { const i = MAP_KEYS.findIndex(k => k.name === name); const j = L.lab.indexOf(i); return Array.from(px.slice(j * 4, j * 4 + 4)); };
      return { w: cv.width, h: cv.height, lw: L.w, chest: at('Göğüs'), sh: at('Omuz'), back: at('Sırt'), body: at('govde'), gap: at('bosluk') }; }"""
    r = pg.evaluate(PX, [{"Göğüs": 7, "Omuz": 9}, "dark"])
    check(r["w"] == r["lw"] == 900, "3: boyanan harita etiket boyutunda (%s)" % r["w"])
    check(r["chest"][1] > 120 and r["chest"][0] < 60 and r["chest"][3] == 255, "3: çalışan kas turkuaz %s" % r["chest"])
    check(r["sh"][1] > r["chest"][1], "3: çok set = daha parlak (omuz %s > göğüs %s)" % (r["sh"][1], r["chest"][1]))
    check(r["back"] == [64, 64, 72, 255] and r["body"] == [40, 40, 45, 255], "3: boş kas / gövde koyu gri %s %s" % (r["back"], r["body"]))
    check(r["gap"][3] == 0, "3: boşluk şeffaf")
    r = pg.evaluate(PX, [{"Göğüs": 3}, "clear"])
    check(r["body"][3] == 70 and r["back"][3] == 120 and r["chest"][:3] == [31, 209, 193], "3: şeffaf takım %s %s %s" % (r["body"], r["back"], r["chest"]))
    r = pg.evaluate(PX, [{"Göğüs": 3}, "light"])
    check(r["body"][:3] == [212, 212, 216] and r["chest"][:3] == [14, 124, 114], "3: aydınlık takım %s %s" % (r["body"], r["chest"]))
    c.close()
    # görsel yüklenemezse: null, sayfa hatası yok
    c2 = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, locale="tr-TR", service_workers="block")
    c2.add_init_script(TEST_INIT); c2.route("**/img/kas-harita.png", lambda rt: rt.fulfill(status=404, body="yok"))
    pg2 = c2.new_page(); pg2.on("pageerror", lambda e: errs.append(str(e))); pg2.goto(URL); boot(pg2)
    check(pg2.evaluate("paintMuscleMap({ 'Göğüs': 2 }, 'dark').then(x => x === null)"), "3: görsel yoksa null")
    c2.close()
    b.close()
finally:
    srv.terminate()

print("\n%d hata" % len(fails) + (" · sayfa hataları: %s" % errs if errs else ""))
sys.exit(1 if fails or errs else 0)
