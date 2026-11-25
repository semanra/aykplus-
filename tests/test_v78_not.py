# v78: hareket notu harekete bağlı (state.exNotes)
# 1) göç (dataVer 7 → 8): günlerdeki notlar harekete taşınır, "Hedef:" notları alınmaz, ex.note silinmez
# 2) antrenman kartındaki not kutusu → bütün günlerde aynı not   3) menüden Not ekle / düzenle / sil
# 4) Programım satırı ve Hareketler listesinde görünür   5) temizlik (boş, uzun, bozuk) + ad değişince taşınır   6) İngilizce
import os, sys, subprocess, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PORT = 8834
fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)

srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT)], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
URL = f"http://localhost:{PORT}/index.html"
errs = []
DAYS = """() => { const w = (name, note) => ({ name, kind: 'weight', note, targetInfo: '3x10', sets: [{ kg: 20, reps: 10, target: '10', done: false }] });
  state.workoutDays = [{ id: 'a', name: 'A', exercises: [w('Barbell Bench Press', ''), w('Seated Leg Curl', '')] }, { id: 'b', name: 'B', exercises: [w('Barbell Bench Press', '')] }];
  state.exNotes = {}; state.activeWorkoutDayIdx = 0; state.activeTab = 'gym'; state.gymView = 'program'; state.gymActive = false; renderAll(); }"""
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
    # 1) göç
    r = pg.evaluate("""() => { const s = JSON.parse(JSON.stringify(state)); s.dataVer = 7; delete s.exNotes;
      const w = (name, note) => ({ name, kind: 'weight', note, sets: [{ kg: 1, reps: 1, target: '1', done: false }] });
      s.workoutDays = [{ id: 'a', name: 'A', exercises: [w('Barbell Bench Press', ' koltuk 4 '), w('Seated Leg Curl', 'Hedef: 3 Set x 10 Tekrar'), w('Lat Pulldown (Wide Grip / Geniş Tutuş)', '')] },
                       { id: 'b', name: 'B', exercises: [w('Barbell Bench Press', 'başka not')] }];
      const n = normalizeState(s); return { notes: n.exNotes, ver: n.dataVer, kept: n.workoutDays.map(d => d.exercises.map(e => e.note)) }; }""")
    check(r["notes"] == {"barbell bench press": "koltuk 4"}, f"1a: notlar harekete taşınır, Hedef notu alınmaz, ilk not kazanır {r['notes']}")
    check(r["ver"] == 8 and r["kept"][0][0] == " koltuk 4 " and r["kept"][1][0] == "başka not", "1b: dataVer 8, günlerdeki eski notlar silinmez")
    r2 = pg.evaluate("() => { const s = JSON.parse(JSON.stringify(state)); s.dataVer = 8; s.exNotes = {}; s.workoutDays[0].exercises[0].note = 'yeni sürümde yazılmış'; return normalizeState(s).exNotes; }")
    check(r2 == {}, "1c: göç bir kez (dataVer 8 kayıtta tekrar çalışmaz)")
    # 2) antrenman kartı
    pg.evaluate(DAYS); pg.evaluate("() => { state.gymView = 'today'; state.gymActive = true; renderAll(); }"); pg.wait_for_timeout(150)
    inp = pg.locator("#exCard_0 input.t-note")
    inp.fill("koltuk 5"); inp.dispatch_event("change"); pg.wait_for_timeout(100)
    check(pg.evaluate("state.exNotes") == {"barbell bench press": "koltuk 5"}, "2a: kart kutusu harekete yazar")
    pg.evaluate("() => { state.gymActive = false; state.activeWorkoutDayIdx = 1; state.gymView = 'today'; state.gymActive = true; renderAll(); }"); pg.wait_for_timeout(150)
    check(pg.input_value("#exCard_0 input.t-note") == "koltuk 5", "2b: başka günde aynı hareket aynı notu gösterir")
    pg.evaluate("() => { state.gymActive = false; state.activeWorkoutDayIdx = 0; state.gymView = 'program'; renderAll(); }"); pg.wait_for_timeout(150)
    # 4) Programım ve Hareketler
    check(pg.locator("[data-ex-row='0'] [data-ex-note]").inner_text().strip() == "Not: koltuk 5" or "koltuk 5" in pg.locator("[data-ex-row='0'] [data-ex-note]").inner_text(), "4a: Programım satırında not")
    check(pg.locator("[data-ex-row='1'] [data-ex-note]").count() == 0, "4b: notsuz harekette satır yok")
    # 3) menüden düzenle / sil
    pg.evaluate("openExSheet(1)"); pg.wait_for_timeout(150)
    pg.click("#exSheetBody button:has-text('Not ekle')"); pg.wait_for_timeout(200)
    pg.fill("#uiDlgInput", "  makine 3. delik  "); pg.click("#uiDlgOk"); pg.wait_for_timeout(200)
    check(pg.evaluate("state.exNotes['seated leg curl']") == "makine 3. delik", "3a: menüden not eklenir (kırpılır)")
    pg.evaluate("openExSheet(1)"); pg.wait_for_timeout(150)
    check("Notu düzenle" in pg.inner_text("#exSheetBody") and "makine 3. delik" in pg.inner_text("#exSheetBody"), "3b: menü notu gösterir")
    pg.click("#exSheetBody button:has-text('Notu düzenle')"); pg.wait_for_timeout(200)
    pg.fill("#uiDlgInput", ""); pg.click("#uiDlgOk"); pg.wait_for_timeout(200)
    check("seated leg curl" not in pg.evaluate("state.exNotes"), "3c: boş bırakınca not silinir")
    pg.evaluate("() => { state.gymView = 'library'; selectMuscle('Göğüs'); }"); pg.wait_for_timeout(200)
    row = pg.locator("#libList [data-lib-row]", has_text="Barbell Bench Press").first
    check("koltuk 5" in row.inner_text(), "4c: Hareketler listesinde not")
    # HTML güvenliği
    pg.evaluate("() => { setExNote('Barbell Bench Press', '<img src=x onerror=window.__x=1>'); state.gymView = 'program'; renderAll(); }"); pg.wait_for_timeout(200)
    check(pg.evaluate("window.__x") is None and "<img" in pg.locator("[data-ex-row='0'] [data-ex-note]").inner_text(), "4d: not HTML olarak çalışmaz")
    # 5) temizlik ve ad değişimi
    r = pg.evaluate("() => { const s = JSON.parse(JSON.stringify(state)); s.exNotes = { a: '  x  ', b: '', c: 5, d: 'y'.repeat(400), '': 'z' }; return normalizeState(s).exNotes; }")
    check(r.get("a") == "x" and "b" not in r and "c" not in r and len(r.get("d", "")) == 300 and "" not in r, f"5a: temizlik {list(r)}")
    r = pg.evaluate("() => { const s = { workoutDays: [], exerciseHistory: {}, exNotes: { 'eski ad': 'not' } }; renameExerciseData(s, 'Eski Ad', 'Yeni Ad'); return s.exNotes; }")
    check(r == {"yeni ad": "not"}, f"5b: ad değişince not taşınır {r}")
    pg.evaluate("() => { setExNote('Face Pull (Rope)', 'ip kısa'); renderAll(); }"); pg.wait_for_timeout(2500)
    pg.reload(); pg.wait_for_function("window.aykBooted === true")
    check(pg.evaluate("state.exNotes['face pull (rope)']") == "ip kısa", "5c: not yeniden açılışta kalır")
    c.close()
    # 6) İngilizce
    c, pg = ctx("en-US")
    pg.evaluate("setLang('en')"); pg.evaluate(DAYS); pg.evaluate("openExSheet(0)"); pg.wait_for_timeout(150)
    check("Add note" in pg.inner_text("#exSheetBody"), "6a: İngilizce menü")
    c.close()
    b.close()
finally:
    srv.terminate()
check(errs == [], f"sayfa hatası yok: {errs}")
print(); print(f"{len(fails)} HATA" if fails else "hepsi geçti")
sys.exit(1 if fails else 0)
