# v50 bölüm 1 (görev 1): örnek içerik üreticileri dile göre, kayıt kuralları.
import os, sys, re, subprocess, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8808'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = "http://localhost:8808/index.html"
def boot(pg): pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(80)
try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, locale="en-US")
    ctx.add_init_script(TEST_INIT); ctx.add_init_script("window.AYK_TEST_EN = true")
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL); boot(pg)
    def setlang(l): pg.evaluate("() => { state.settings.lang = '%s'; applyStaticI18n(); renderAll(); }" % l)
    # ===== Bölüm 1 (görev 1)
    PROG = """lv => samplePrograms(lv).map(d => ({ name: d.name, ex: d.exercises.map(e => ({ n: e.name, k: e.kind || 'weight', ti: e.targetInfo, note: e.note, tg: e.sets[0].target })) }))"""
    setlang('tr')
    mt = pg.evaluate("buildSampleMenu(2200).map(m => m.title)")
    check(mt == ["Kahvaltı", "Öğle yemeği", "Ara öğün", "Akşam yemeği"], "tr: öğün başlıkları: %s" % mt)
    tn_ = [d["name"] for d in pg.evaluate(PROG, "new")]
    tp = [d["name"] for d in pg.evaluate(PROG, "pro")]
    check(tn_ == ["1. Gün: Tüm Vücut A", "2. Gün: Tüm Vücut B", "3. Gün: Tüm Vücut C"] and tp == ["1. Gün: Üst Vücut A", "2. Gün: Alt Vücut A", "3. Gün: Üst Vücut B", "4. Gün: Alt Vücut B"], "tr: gün adları bayt bayt")
    trn = pg.evaluate(PROG, "new")
    check(trn[0]["ex"][0]["note"] == "Hedef: 3 Set x 8–12 Tekrar" and trn[0]["ex"][0]["ti"] == "3x8–12", "tr: hareket notu/targetInfo")
    check(pg.evaluate("sampleMobility().name") == "Günlük esneme", "tr: rutin adı")
    setlang('en')
    mt = pg.evaluate("buildSampleMenu(2200).map(m => m.title)")
    check(mt == ["Breakfast", "Lunch", "Snack", "Dinner"], "en: öğün başlıkları: %s" % mt)
    en_n = pg.evaluate(PROG, "new"); en_p = pg.evaluate(PROG, "pro")
    check([d["name"] for d in en_n] == ["Day 1: Full Body A", "Day 2: Full Body B", "Day 3: Full Body C"], "en: new gün adları")
    check([d["name"] for d in en_p] == ["Day 1: Upper Body A", "Day 2: Lower Body A", "Day 3: Upper Body B", "Day 4: Lower Body B"], "en: pro gün adları")
    check(all(":" in d["name"] for d in en_n + en_p), "en: gün adlarında ':' var")
    check(pg.evaluate("samplePrograms('new').map(d => d.name.split(':')[0])") == ["Day 1", "Day 2", "Day 3"], "en: gün çipi kısa etiketi")
    ex = en_n[0]["ex"]
    check(ex[0]["note"] == "Target: 3 sets x 8–12 reps", "en: hareket notu: %r" % ex[0]["note"])
    plank = [e for e in ex if e["k"] == "time"][0]
    check(plank["ti"] == "3x30 sn" and plank["tg"] == "30 sn" and plank["note"] == "", "en: süreli targetInfo/set.target Türkçe 'sn': %s" % plank)
    check(ex[0]["ti"] == "3x8–12", "en: ağırlık targetInfo")
    ok = pg.evaluate("() => samplePrograms('new')[0].exercises.every(e => typeof parseRepRange === 'function' ? true : true)")
    check(pg.evaluate("sampleMobility().name") == "Daily stretching", "en: rutin adı")
    # (e) normalizeState: kind'ı time'a çevrilen ve notu 'Target: ' olan hareketin notu silinir
    r = pg.evaluate("""() => { const ex = { name: 'Plank', note: 'Target: 3 sets x 8–12 reps', sets: [{}, {}, {}] }; normalizeExercise(ex); return [ex.kind, ex.note]; }""")
    check(r == ["time", ""], "en: 01 kalıbı 'Target:' notunu siler: %s" % r)
    r = pg.evaluate("""() => { const ex = { name: 'Plank', note: 'Hedef: 3 Set x 8–12 Tekrar', sets: [{}, {}, {}] }; normalizeExercise(ex); return [ex.kind, ex.note]; }""")
    check(r == ["time", ""], "tr: 01 kalıbı 'Hedef:' notunu siler: %s" % r)
    src = open(os.path.join(REPO, "src", "app", "23-en-ilerleme-kurulum.js"), encoding="utf-8").read()
    keys = [k.replace('\\"', '"') for k in re.findall(r'"((?:[^"\\]|\\.)*)":\s*(?:"|\{)', src)]
    bad = pg.evaluate(r"""ks => ks.filter(k => { const v = EN[k]; const vs = typeof v === 'string' ? [v] : v ? [v.one, v.other] : [];
      return vs.some(x => /[&<>]/.test(String(x).replace(/<\/?b>/g, ''))); })""", keys)
    check(len(keys) >= 10 and bad == [], "en: bu dosyanın değerlerinde & < > yok (%d anahtar): %s" % (len(keys), bad))
    check(errs == [], "sayfa hatası yok: %s" % errs)
    b.close()
finally:
  srv.terminate()
print("\n%d başarısız" % len(fails)); sys.exit(1 if fails else 0)
