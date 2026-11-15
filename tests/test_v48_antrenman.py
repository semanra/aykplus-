# v48 bölüm 1: Antrenman terimleri, gösterim yardımcıları, kayıtlı metin kuralları (kas adı, targetInfo, gün adı).
import os, sys, re, subprocess, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8806'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = "http://localhost:8806/index.html"
TR_CH = re.compile(r"[çğıöşüÇĞİÖŞÜ]")
def boot(pg): pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(80)

try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, locale="en-US")
    ctx.add_init_script(TEST_INIT); ctx.add_init_script("window.AYK_TEST_EN = true")
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL); boot(pg)
    def setlang(l): pg.evaluate("() => { state.settings.lang = '%s'; applyStaticI18n(); renderAll(); }" % l)
    H = """() => [muscleL('Arka Bacak & Kalça'), effortL(4), kindL('time'), kindL('weight'), libCatL(Object.keys(EXERCISE_LIBRARY)[0]),
      targetL('3x45 sn'), targetL('20 dk • 3 km'), targetL('3x8–12'), equipL('stack', false), equipL('bodyweight', true), muscleL('Başka')]"""
    # --- Türkçe: aynen
    setlang('tr')
    r = pg.evaluate(H)
    check(r[0] == "Arka Bacak & Kalça" and r[1] == "Tükeniş" and r[2] == "⏱️ Süreli" and r[3] == "🏋️ Ağırlık", "tr: yardımcılar aynı: %s" % r[:4])
    check(r[4].startswith("1. Göğüs") and r[5] == "3x45 sn" and r[6] == "20 dk • 3 km" and r[7] == "3x8–12", "tr: kategori ve targetL aynı: %s" % r[4:8])
    check(r[8] == "Ağırlık yığını (makine / kablo)" and r[9] == "Vücut ağ." and r[10] == "Başka", "tr: equipL ve bilinmeyen kas aynı")
    pg.evaluate("() => { state.activeTab = 'gym'; state.gymView = 'today'; renderAll(); }")
    d_tr = pg.evaluate("[state.workoutDays.length, (() => { void addWorkoutDay(); return 0; })()]")
    pg.wait_for_selector("#uiDialog:not(.hidden)")
    n0 = d_tr[0]
    v = pg.evaluate("$('uiDlgInput').value")
    check(v == "%d. GÜN: " % (n0 + 1), "tr: varsayılan gün adı aynı: %r" % v)
    pg.click("#uiDlgCancel")
    # --- İngilizce
    setlang('en')
    r = pg.evaluate(H)
    check(r[0] == "Hamstrings and glutes" and r[1] == "Failure", "en: kas ve zorluk: %s" % r[:2])
    check(not TR_CH.search(r[2]) and r[2].startswith("⏱️") and not TR_CH.search(r[3]), "en: kindL Türkçe harf yok: %s" % r[2:4])
    check(r[4].startswith("1.") and not TR_CH.search(r[4]), "en: libCatL: %s" % r[4])
    check(r[5] == "3x45 sec" and r[6] == "20 min • 3 km" and r[7] == "3x8–12", "en: targetL: %s" % r[5:8])
    check(r[8] == "Weight stack (machine / cable)" and r[9] == "Bodyweight" and r[10] == "Başka", "en: equipL, bilinmeyen kas aynen")
    cats = pg.evaluate("Object.keys(EXERCISE_LIBRARY).map(libCatL)")
    check(len(cats) == 11 and not any(TR_CH.search(c) or '&' in c for c in cats), "en: 11 kategori başlığı İngilizce: %s" % cats[:2])
    # --- Review Focus 1: #exMuscle
    pg.evaluate("openExerciseModal({ kind: 'weight', name: 'Test Squat' })")
    o = pg.evaluate("[...$('exMuscle').options].map(x => [x.value, x.textContent])")
    MUS = pg.evaluate("MUSCLES")
    check([x[0] for x in o[1:]] == MUS, "en: #exMuscle value'ları MUSCLES ile aynı (Türkçe)")
    check(not any(TR_CH.search(x[1]) for x in o[1:]) and o[5][1] == "Hamstrings and glutes" and o[1][1] == "Chest", "en: #exMuscle görünen metinler İngilizce: %s" % [x[1] for x in o])
    pg.evaluate("$('exMuscle').value = 'Arka Bacak & Kalça'; saveExerciseModal()")
    st = pg.evaluate("aykStoredState()")
    m = pg.evaluate("activeDay().exercises[activeDay().exercises.length - 1].muscle")
    check(m == "Arka Bacak & Kalça" and m in MUS, "en: kaydedilen ex.muscle Türkçe: %r" % m)
    pg.evaluate("selectMuscle(MUSCLES[0])")
    check(pg.evaluate("state.libMuscle") == MUS[0], "en: selectMuscle sonrası state.libMuscle Türkçe")
    st = pg.evaluate("aykStoredState()")
    check(st is not None and (st.get("libMuscle") in (None, MUS[0]) if isinstance(st, dict) else True), "en: kalıcı kayıtta libMuscle Türkçe")
    setlang('tr')
    check(pg.evaluate("state.libMuscle") == MUS[0], "tr'ye dönünce aynı kas seçili")
    setlang('en')
    # --- Review Focus 2: süreli hareket, targetInfo Türkçe kalır
    pg.evaluate("() => { state.activeTab = 'gym'; state.gymView = 'today'; renderAll(); openExerciseModal({ kind: 'time', name: 'Plank Test' }); setExModalKind('time'); $('exTimeSetCount').value = 3; $('exTimeSec').value = 45; saveExerciseModal(); }")
    ex = pg.evaluate("(() => { const e = activeDay().exercises.find(x => x.name === 'Plank Test'); return { ti: e.targetInfo, t0: e.sets[0].target, kind: e.kind, n: e.sets.length }; })()")
    check(ex["ti"] == "3x45 sn" and (ex["t0"] or "").endswith(" sn") or ex["kind"] == "time" and ex["ti"] == "3x45 sn", "en: kayıtta targetInfo Türkçe biçim: %s" % ex)
    pg.evaluate("addSetToExercise(activeDay().exercises.findIndex(x => x.name === 'Plank Test'))")
    ex2 = pg.evaluate("(() => { const e = activeDay().exercises.find(x => x.name === 'Plank Test'); return { ti: e.targetInfo, t3: e.sets[3].target }; })()")
    check(ex2["ti"].startswith("4x") and ex2["ti"].endswith(" sn") and ex2["t3"].endswith(" sn"), "en: + set sonrası '4x…': %s" % ex2)
    txt = pg.evaluate("$('gymRoot').textContent")
    pg.evaluate("setGymView('program')"); txt = pg.evaluate("$('gymRoot').textContent")
    check("4x45 sec" in txt and "x45 sn" not in txt, "en: hedef çipinde '4x45 sec', 'x45 sn' yok (kalan ' sn' metinleri Task 2-3)")
    pg.evaluate("setGymView('today')")
    # --- Review Focus 3: gün adı
    pg.evaluate("void addWorkoutDay()"); pg.wait_for_selector("#uiDialog:not(.hidden)")
    n = pg.evaluate("state.workoutDays.length")
    v = pg.evaluate("$('uiDlgInput').value")
    check(v == "DAY %d: " % (n + 1), "en: varsayılan gün adı: %r" % v)
    pg.fill("#uiDlgInput", "Day %d: Arms" % (n + 1)); pg.click("#uiDlgOk"); pg.wait_for_timeout(100)
    chips = pg.evaluate("[...document.querySelectorAll('#gymRoot nav button, #gymRoot button')].map(x => x.textContent.trim())")
    check("Day %d" % (n + 1) in chips, "en: gün çipi kısa etiketi 'Day %d'" % (n + 1))
    check(pg.evaluate("state.workoutDays[state.workoutDays.length - 1].name") == "Day %d: Arms" % (n + 1), "en: gün adı kullanıcı yazdığı gibi")
    check(errs == [], "sayfa hatası yok: " + str(errs[:3]))
    b.close()
finally:
    srv.terminate()
print("BAŞARISIZ:" if fails else "TÜMÜ GEÇTİ", fails)
sys.exit(1 if (fails or errs) else 0)
