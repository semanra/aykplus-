# v75: süperset / devre (isteğe bağlı)
# 1) menüden bağla / çıkar, Programım etiketleri (SÜPERSET A, DEVRE A)   2) sıra değişince / silinince grup düzelir
# 3) normalizeState temizliği (tek kalan, kardiyo, aynı kimlik iki yerde, eski kayıt)
# 4) antrenman akışı: A1 B1 (dinlenme) A2 B2 (dinlenme) A3 → sonraki hareket; tur içinde dinlenme yok, kaydırma
# 5) bağlanmamış harekette davranış aynı   6) İngilizce
import os, sys, subprocess, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PORT = 8831
fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)

srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT)], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
URL = f"http://localhost:{PORT}/index.html"
errs = []
DAY = """() => { const w = (name, n, rest) => ({ name, kind: 'weight', note: '', targetInfo: n + 'x10', rest, sets: Array.from({ length: n }, () => ({ kg: 20, reps: 10, target: '10', done: false })) });
  state.workoutDays = [{ id: 'd1', name: 'A', exercises: [w('Barbell Bench Press', 3, 90), w('One-Arm Dumbbell Row', 2, 60), w('Dumbbell Lateral Raise', 2, 45),
    { name: 'Treadmill Run (Koşu Bandı)', kind: 'cardio', note: '', sets: [{ min: 10, km: '', lvl: '', done: false }] }] }];
  state.activeWorkoutDayIdx = 0; state.activeTab = 'gym'; state.gymView = 'program'; state.gymActive = false; stopTimer(); renderAll(); }"""
SS = "() => state.workoutDays[0].exercises.map(e => e.ss || null)"
try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    def ctx(locale="tr-TR"):
        c = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, locale=locale, service_workers="block")
        c.add_init_script(TEST_INIT)
        pg = c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(URL); pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(80)
        return c, pg
    c, pg = ctx()
    pg.evaluate(DAY)
    # 1) bağla
    pg.evaluate("openExSheet(0)"); pg.wait_for_timeout(150)
    txt = pg.inner_text("#exSheetBody")
    check("Sonrakiyle bağla (süperset)" in txt and "One-Arm Dumbbell Row ile dinlenmeden art arda" in txt and "Süpersetten çıkar" not in txt, "1a: menüde bağla, çıkar yok")
    pg.click("#exSheetBody button:has-text('Sonrakiyle bağla')"); pg.wait_for_timeout(200)
    ss = pg.evaluate(SS)
    check(ss[0] and ss[0] == ss[1] and ss[2] is None, f"1b: ilk iki hareket bağlandı {ss}")
    labels = pg.evaluate("() => [...document.querySelectorAll('#gymRoot [data-ss-label]')].map(e => e.textContent)")
    check(labels == ["SÜPERSET A · 1/2", "SÜPERSET A · 2/2"], f"1c: Programım etiketleri {labels}")
    check(pg.locator(".toast-wrap button", has_text="Geri al").count() >= 1, "1d: Geri al sunulur")
    pg.evaluate("openExSheet(1)"); pg.wait_for_timeout(150)
    check("Süpersetten çıkar" in pg.inner_text("#exSheetBody"), "1e: grupta olan harekette çıkar seçeneği")
    pg.click("#exSheetBody button:has-text('Sonrakiyle bağla')"); pg.wait_for_timeout(200)
    labels = pg.evaluate("() => [...document.querySelectorAll('#gymRoot [data-ss-label]')].map(e => e.textContent)")
    check(labels == ["DEVRE A · 1/3", "DEVRE A · 2/3", "DEVRE A · 3/3"], f"1f: 3 hareket devre {labels}")
    pg.evaluate("openExSheet(2)"); pg.wait_for_timeout(150)
    check("Sonrakiyle bağla" not in pg.inner_text("#exSheetBody"), "1g: sonraki kardiyoysa bağlanamaz")
    pg.evaluate("closeModal('exSheet'); ssUnlink(1)"); pg.wait_for_timeout(150)
    check(pg.evaluate(SS) == [None, None, None, None], "1h: ortadaki çıkınca gruplar dağılır (yan yana kalmayan tek hareket bağlı kalmaz)")
    # 2) sıra değişimi / silme
    pg.evaluate("() => { ssLinkNext(0); }"); pg.wait_for_timeout(100)
    pg.evaluate("moveExercise(1, 1)"); pg.wait_for_timeout(150)
    check(pg.evaluate(SS)[:3] == [None, None, None], "2a: araya hareket girince süperset çözülür")
    pg.evaluate("() => { ssLinkNext(0); }"); pg.evaluate("removeExercise(1)"); pg.wait_for_timeout(150)
    check(all(x is None for x in pg.evaluate(SS)), "2b: bir üyesi silinince tek kalan bağsız")
    # 3) normalizeState
    r = pg.evaluate("""() => { const w = (n, ss, kind) => ({ name: n, kind: kind || 'weight', ss, sets: [{ kg: 1, reps: 1, target: '1', done: false }] });
      const s = JSON.parse(JSON.stringify(state)); s.workoutDays = [{ id: 'x', name: 'X', exercises: [w('A', 'g1'), w('B', 'g1'), w('C', 'g2'), w('D', 'g1'), w('E', 'g1'), w('F', 'g3'), w('G', 'g3', 'cardio'), w('H', 5), w('I', 'x'.repeat(40)), w('J', 'x'.repeat(40))] }];
      const n = normalizeState(s).workoutDays[0].exercises; return n.map(e => e.ss || null); }""")
    check(r[0] == r[1] == "g1" and r[2] is None and r[3] == r[4] and r[3] not in (None, "g1"), f"3a: aynı kimlik iki yerde → ikinci grup yeni kimlik; tek kalan bağsız {r[:5]}")
    check(r[5] is None and r[6] is None and r[7] is None and r[8] == r[9] and len(r[8]) == 24, f"3b: kardiyo ve bozuk kimlik temizlenir, uzun kimlik kısalır {r[5:]}")
    old = pg.evaluate("() => { const s = JSON.parse(JSON.stringify(state)); s.workoutDays[0].exercises.forEach(e => delete e.ss); return normalizeState(s).workoutDays[0].exercises.every(e => !('ss' in e)); }")
    check(old, "3c: süpersetsiz eski kayıt değişmeden açılır")
    # 4) antrenman akışı
    pg.evaluate(DAY); pg.evaluate("() => { ssLinkNext(0); state.gymView = 'today'; state.gymActive = true; renderAll(); }"); pg.wait_for_timeout(150)
    lab = pg.evaluate("() => [...document.querySelectorAll('#gymRoot [data-ss-next]')].map(e => e.textContent)")
    check(len(lab) == 2 and "Sonra dinlenmeden: One-Arm Dumbbell Row" in lab[0] and lab[1] == "Sonra dinlen", f"4a: antrenman kartı etiketleri {lab}")
    steps = []
    def step(e, s):
        pg.evaluate(f"toggleSetDone({e}, {s})"); pg.wait_for_timeout(60)
        st = pg.evaluate("() => { const p = nextSetPtr(activeDay()); return { run: !!timer.running, ptr: p ? [p.e, p.s] : null, sec: timer.running ? Math.round((timer.endAt - Date.now()) / 1000) : 0 }; }")
        pg.evaluate("stopTimer()")
        steps.append(st); return st
    s1 = step(0, 0); check(not s1["run"] and s1["ptr"] == [1, 0], f"4b: A1 sonrası dinlenme yok, sıradaki B1 {s1}")
    s2 = step(1, 0); check(s2["run"] and s2["ptr"] == [0, 1] and 55 <= s2["sec"] <= 60, f"4c: B1 sonrası dinlenme (grubun son hareketinin 60 sn), sıradaki A2 {s2}")
    s3 = step(0, 1); check(not s3["run"] and s3["ptr"] == [1, 1], f"4d: A2 → B2 {s3}")
    s4 = step(1, 1); check(s4["run"] and s4["ptr"] == [0, 2], f"4e: B2 sonrası dinlenme, sıradaki A3 {s4}")
    s5 = step(0, 2); check(s5["run"] and s5["ptr"] == [2, 0], f"4f: A3 (grup bitti) → dinlenme, sıradaki bağsız hareket {s5}")
    s6 = step(2, 0); check(s6["run"] and 40 <= s6["sec"] <= 45, f"5a: bağsız harekette eski davranış (kendi 45 sn dinlenmesi) {s6}")
    pg.evaluate("toggleSetDone(2, 0)"); pg.evaluate("stopTimer()")
    check(pg.evaluate("activeDay().exercises[2].sets[0].done") is False, "5b: set geri alınabilir")
    c.close()
    # 6) İngilizce
    c, pg = ctx("en-US")
    pg.evaluate("setLang('en')"); pg.evaluate(DAY); pg.evaluate("ssLinkNext(0)"); pg.wait_for_timeout(150)
    labels = pg.evaluate("() => [...document.querySelectorAll('#gymRoot [data-ss-label]')].map(e => e.textContent)")
    check(labels == ["SUPERSET A · 1/2", "SUPERSET A · 2/2"], f"6a: İngilizce etiket {labels}")
    pg.evaluate("openExSheet(0)"); pg.wait_for_timeout(150)
    check("Remove from superset" in pg.inner_text("#exSheetBody"), "6b: İngilizce menü")
    c.close()
    b.close()
finally:
    srv.terminate()
check(errs == [], f"sayfa hatası yok: {errs}")
print(); print(f"{len(fails)} HATA" if fails else "hepsi geçti")
sys.exit(1 if fails else 0)
