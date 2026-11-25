# v72: yardımcı (dolaylı) kaslar yarım set + v68'den kalan küçük düzeltmeler
# 1) secondaryMuscles kuralları (örnek hareketler), ana kas çıkarılır, kardiyo sayılmaz
# 2) weeklyMuscleSets / programMuscleSets yarım setleri toplar; KAS YÜKÜ listesi "4,5" yazar (EN "4.5"), açıklama metni
# 3) Harita VoiceOver etiketi çalışan kasları söyler   4) Isınma: Boyun / İç Bacak / Kaval bölgeleri
# 5) Harita görseli yüklenemezse 20 sn yeniden istenmez, "online" olunca hemen dener
import os, sys, subprocess, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PORT = 8828
fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)

CASES = {
    "Barbell Bench Press": ("Göğüs", ["Triceps", "Omuz"]),
    "Incline Dumbbell Press": ("Göğüs", ["Triceps", "Omuz"]),
    "Pec Deck Fly (Butterfly)": ("Göğüs", ["Omuz"]),
    "Weighted Dips (Göğüs Odaklı)": ("Göğüs", ["Triceps", "Omuz"]),
    "Close-Grip Barbell Bench Press": ("Triceps", ["Göğüs", "Omuz"]),
    "Machine Shoulder Press": ("Omuz", ["Triceps"]),
    "Reverse Pec Deck (Arka Omuz Makinesi)": ("Omuz", ["Sırt"]),
    "Face Pull (Rope)": ("Omuz", ["Sırt"]),
    "Lat Pulldown (Wide Grip / Geniş Tutuş)": ("Sırt", ["Biceps", "Ön Kol"]),
    "Seated Cable Row (V-Bar / Close Grip)": ("Sırt", ["Biceps", "Ön Kol"]),
    "Conventional Deadlift": ("Sırt", ["Arka Bacak & Kalça", "Ön Kol"]),
    "Romanian Deadlift (RDL - Barbell)": ("Arka Bacak & Kalça", ["Sırt", "Ön Kol"]),
    "Barbell Back Squat (High-Bar / Low-Bar)": ("Ön Bacak", ["Arka Bacak & Kalça"]),
    "Walking Lunges": ("Ön Bacak", ["Arka Bacak & Kalça"]),
    "Leg Extension (Çift Bacak)": ("Ön Bacak", []),
    "Seated Leg Curl": ("Arka Bacak & Kalça", []),
    "Preacher Curl (EZ-Bar / Makine)": ("Biceps", ["Ön Kol"]),
    "Hammer Curl (Dumbbell)": ("Biceps", ["Ön Kol"]),
    "Reverse Barbell / Cable Curl (Ön Kol)": ("Ön Kol", ["Biceps"]),
    "Wrist Curl (Bilek)": ("Ön Kol", []),
    "Triceps Rope/Bar Pushdown": ("Triceps", []),
    "Plate Neck Flexion (Boyun Öne)": ("Boyun", []),
    "Copenhagen Plank (İç Bacak)": ("İç Bacak", ["Karın"]),
    "Standing Calf Raise (Makine veya Smith)": ("Kalf", []),
    "Push-Up (Şınav) / Weighted Push-Up": ("Göğüs", ["Triceps", "Omuz"]),
}

srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT)], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
URL = f"http://localhost:{PORT}/index.html"
errs = []
try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    def ctx(locale="tr-TR", route=None):
        c = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, locale=locale, service_workers="block")
        c.add_init_script(TEST_INIT)
        if route: c.route(route[0], route[1])
        pg = c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(URL); pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(80)
        return c, pg
    c, pg = ctx()
    # 1) kurallar
    got = pg.evaluate("names => names.map(n => [autoMuscle(n), secondaryMuscles(n, autoMuscle(n))])", list(CASES))
    for (n, (pm, sec)), (gp, gs) in zip(CASES.items(), got):
        check(gp == pm and gs == sec, f"1: {n} → {pm} + {sec} ({gp} + {gs})")
    check(pg.evaluate("secondaryMuscles('Barbell Bench Press', 'Triceps')") == ["Omuz"], "1: elle seçilen ana kas yardımcı listeden çıkar")
    # 2) sayım ve gösterim
    SEED = """() => { const T = Date.now(); state.exerciseHistory = {}; state.libMuscle = null; state.libRange = 'week';
      const add = (name, n, kind) => { const k = exKey(name); (state.exerciseHistory[k] = state.exerciseHistory[k] || []).push({ ts: T, logId: 'W', kind: kind || 'weight', name, sets: Array.from({ length: n }, () => ({ kg: 20, reps: 10 })) }); };
      add('Barbell Bench Press', 3); add('Lat Pulldown (Wide Grip / Geniş Tutuş)', 4); add('Koşu Bandı', 2, 'cardio');
      state.gymView = 'library'; state.activeTab = 'gym'; renderAll(); }"""
    pg.evaluate(SEED); pg.wait_for_timeout(300)
    w = pg.evaluate("() => { const c = weeklyMuscleSets(weekStart()); return { g: c['Göğüs'], tr: c['Triceps'], o: c['Omuz'], s: c['Sırt'], b: c['Biceps'], f: c['Ön Kol'] }; }")
    check(w == {"g": 3, "tr": 1.5, "o": 1.5, "s": 4, "b": 2, "f": 2}, f"2a: haftalık sayım yarım setlerle {w}")
    txt = pg.evaluate("document.querySelector('[data-week-muscles]').innerText")
    check("1,5" in txt and "yarım set" in txt, f"2b: liste '1,5' yazar ve açıklama yarım seti anlatır")
    check("14 set" in txt, f"2c: toplam 3 + 4 + 1,5 + 1,5 + 2 + 2 = 14 set ({txt[:60]!r})")
    pg.evaluate("selectMuscle('Triceps')"); pg.wait_for_timeout(200)
    sel = pg.evaluate("document.getElementById('gymRoot').innerText")
    check("1,5 set" in sel, "2d: seçili kas satırı '1,5 set'")
    pr = pg.evaluate("() => { state.workoutDays = [{ name: 'A', exercises: [{ name: 'Barbell Bench Press', kind: 'weight', sets: [{}, {}] }] }]; const c = programMuscleSets(); return [c['Göğüs'], c['Triceps'], c['Omuz']]; }")
    check(pr == [2, 1, 1], f"2e: Programım yarım setleri sayar {pr}")
    # 3) harita etiketi
    pg.evaluate("selectMuscle(null)"); pg.wait_for_timeout(200)
    aria = pg.evaluate("document.getElementById('bodyMapCv').getAttribute('aria-label')")
    check(aria.startswith("Kas haritası. Çalışan kaslar:") and "Sırt" in aria and "Triceps" in aria, f"3a: harita etiketi çalışan kasları söyler ({aria})")
    pg.evaluate("state.exerciseHistory = {}; renderAll()"); pg.wait_for_timeout(200)
    check(pg.evaluate("document.getElementById('bodyMapCv').getAttribute('aria-label')") == "Kas haritası. Henüz çalışılan kas yok", "3b: boşken etiket")
    # 4) ısınma bölgeleri
    regs = pg.evaluate("() => ['Boyun', 'İç Bacak', 'Kaval'].map(m => MOB_WARM_REGIONS[m] || [])")
    check(regs == [["spine", "shoulder"], ["hip"], ["ankle"]], f"4: ısınma bölgeleri {regs}")
    c.close()
    # 2f) İngilizce biçim
    c, pg = ctx("en-US")
    pg.evaluate("setLang('en')"); pg.evaluate(SEED); pg.wait_for_timeout(300)
    et = pg.evaluate("document.querySelector('[data-week-muscles]').innerText")
    check("1.5" in et and "half a set" in et, f"2f: İngilizce '1.5' ve açıklama")
    c.close()
    # 5) yüklenemeyen harita: 20 sn içinde yeniden istenmez, online olunca dener
    hits = []
    def fail(rt):
        hits.append(rt.request.url); rt.fulfill(status=404, body="yok")
    c, pg = ctx(route=("**/img/kas-3d-*", fail))
    pg.evaluate("() => { state.gymView = 'library'; state.activeTab = 'gym'; renderAll(); }"); pg.wait_for_timeout(500)
    n1 = len(hits)
    for _ in range(3):
        pg.evaluate("renderAll()"); pg.wait_for_timeout(150)
    check(n1 >= 1 and len(hits) == n1, f"5a: yüklenemeyince yeniden çizimde tekrar istenmez ({n1} → {len(hits)})")
    pg.evaluate("window.dispatchEvent(new Event('online')); renderAll()"); pg.wait_for_timeout(400)
    check(len(hits) > n1, f"5b: internet gelince yeniden dener ({len(hits)})")
    c.close()
    b.close()
finally:
    srv.terminate()
check(errs == [], f"sayfa hatası yok: {errs}")
print(); print(f"{len(fails)} HATA" if fails else "hepsi geçti")
sys.exit(1 if fails else 0)
