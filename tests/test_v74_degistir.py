# v74: hareketi değiştir / alternatif öner
# 1) alternatif sıralaması (aynı kalıp önde, aynı kas, kendisi ve gündekiler yok)
# 2) hareket menüsünde "Hareketi değiştir" → seçici (En yakın + Diğer, ekipman çipleri) → değiştirir, Geri al
# 3) antrenman sürerken yapılmış set varsa eski hareket yapılanlarla kalır, yenisi altına kalan setlerle
# 4) tür değişimi (ağırlık → süreli) geçerli setler kurar; son çalışma kilosu gelir   5) İngilizce
import os, sys, subprocess, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PORT = 8830
fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)

srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT)], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
URL = f"http://localhost:{PORT}/index.html"
errs = []
DAY = """() => { state.workoutDays = [{ id: 'd1', name: 'A', exercises: [
    { name: 'Barbell Bench Press', kind: 'weight', targetInfo: '3x8', note: '', rest: 150, sets: [{ kg: 80, reps: 8, target: '8', done: false }, { kg: 80, reps: 8, target: '8', done: false }, { kg: 80, reps: 8, target: '8', done: false }] },
    { name: 'Lat Pulldown (Wide Grip / Geniş Tutuş)', kind: 'weight', note: '', sets: [{ kg: 50, reps: 10, target: '10', done: false }] } ] }];
  state.activeWorkoutDayIdx = 0; state.activeTab = 'gym'; state.gymView = 'today'; state.gymActive = false; state.exerciseHistory = {};
  state.exerciseHistory[exKey('Incline Dumbbell Press')] = [{ ts: Date.now() - 864e5, logId: 'L', kind: 'weight', name: 'Incline Dumbbell Press', sets: [{ kg: 26, reps: 10 }, { kg: 28, reps: 8 }] }];
  renderAll(); }"""
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
    # 1) sıralama
    alts = pg.evaluate("exAlternatives('Barbell Bench Press', 'Göğüs')")
    check("Barbell Bench Press" not in alts and all(pg.evaluate("n => libSectionOf(n)", a) == "Göğüs" for a in alts[:10]), "1a: kendisi yok, hepsi Göğüs")
    check(all(pg.evaluate("n => exPatternOf(n) === exPatternOf('Barbell Bench Press')", a) for a in alts[:6]), f"1b: ilk 6 alternatif press kalıbında {alts[:6]}")
    check(alts.index("Pec Deck Fly (Butterfly)") > 5, "1c: fly hareketi press'in en yakını değil")
    lat = pg.evaluate("exAlternatives('Lat Pulldown (Wide Grip / Geniş Tutuş)', 'Sırt')")
    check(lat[0] in ("Pull-up (Geniş Tutuş Barfiks)", "Neutral Grip Pull-up", "Close-Grip / V-Bar Lat Pulldown", "Reverse-Grip (Underhand) Lat Pulldown", "Chin-up (Avuç İçi Bakan Barfiks)", "Assisted Pull-up Machine", "Single-Arm Kneeling Cable Lat Pulldown", "Machine High Row / Iso-Lateral Pulldown", "Weighted Pull-up (Ağırlıklı Barfiks)"), f"1d: lat pulldown → dikey çekiş ({lat[:3]})")
    rd = pg.evaluate("exAlternatives('Reverse Pec Deck (Arka Omuz Makinesi)', 'Omuz')")[:3]
    check(all(pg.evaluate("n => exPatternOf(n) === 0", a) for a in rd), f"1e: arka omuz → arka omuz {rd}")
    pg.evaluate("() => state.workoutDays[0].exercises.push({ name: 'Incline Barbell Bench Press', kind: 'weight', note: '', sets: [{ kg: 60, reps: 8, target: '8', done: false }] })")
    check("Incline Barbell Bench Press" not in pg.evaluate("exAlternatives('Barbell Bench Press', 'Göğüs')"), "1f: günde olan hareket önerilmez")
    pg.evaluate(DAY)
    # 2) menüden değiştir
    pg.evaluate("openExSheet(0)"); pg.wait_for_timeout(200)
    check("Hareketi değiştir" in pg.inner_text("#exSheetBody"), "2a: menüde Hareketi değiştir")
    pg.click("#exSheetBody button:has-text('Hareketi değiştir')"); pg.wait_for_timeout(250)
    check(pg.is_visible("#pickerModal") and pg.inner_text("#pickerTitle") == "Barbell Bench Press yerine", "2b: seçici başlığı")
    heads = pg.evaluate("() => [...document.querySelectorAll('#pickerList > .text-\\\\[12px\\\\]')].map(e => e.textContent)")
    check(heads == ["En yakın alternatifler", "Diğer Göğüs hareketleri"], f"2c: gruplar {heads}")
    check(pg.locator("#pickerEquip button").count() == 6 and pg.is_hidden("#pickerExtraWrap"), "2d: ekipman çipleri var, özel hareket düğmesi yok")
    pg.click("#pickerEquip [data-pick-eq='dumbbell']"); pg.wait_for_timeout(120)
    labels = pg.evaluate("() => picker.flat.map(i => i.id)")
    check(len(labels) > 0 and all("umbbell" in x or "Dambıl" in x for x in labels), f"2e: dambıl süzgeci {labels[:4]}")
    pg.locator("#pickerList button[onclick^=pickerChoose]", has_text="Incline Dumbbell Press").click(); pg.wait_for_timeout(250)
    ex0 = pg.evaluate("state.workoutDays[0].exercises[0]")
    check(ex0["name"] == "Incline Dumbbell Press" and len(ex0["sets"]) == 3 and all(s["kg"] == 28 and s["reps"] == 8 and s["target"] == "8" and not s["done"] for s in ex0["sets"]), f"2f: değişti, 3 set, son çalışma kilosu 28 ({ex0['sets'][0]})")
    check(ex0.get("rest") == 150 and ex0.get("targetInfo") == "3x8", "2g: dinlenme ve hedef korunur")
    check(len(pg.evaluate("state.workoutDays[0].exercises")) == 2, "2h: hareket sayısı aynı")
    check(pg.locator(".toast-wrap button", has_text="Geri al").count() >= 1, "2i: Geri al sunulur")
    pg.locator(".toast-wrap button", has_text="Geri al").first.click(); pg.wait_for_timeout(200)
    check(pg.evaluate("state.workoutDays[0].exercises[0].name") == "Barbell Bench Press", "2j: Geri al eski hareketi getirir")
    # 3) antrenman sürerken yapılmış setler
    pg.evaluate("() => { state.gymActive = true; const ex = state.workoutDays[0].exercises[0]; ex.sets[0].done = true; renderAll(); swapExercise(0, 'Machine Chest Press (Flat)'); }"); pg.wait_for_timeout(200)
    exs = pg.evaluate("state.workoutDays[0].exercises")
    check(exs[0]["name"] == "Barbell Bench Press" and len(exs[0]["sets"]) == 1 and exs[0]["sets"][0]["done"], "3a: eski hareket yapılan setle kalır")
    check(exs[1]["name"] == "Machine Chest Press (Flat)" and len(exs[1]["sets"]) == 2 and exs[2]["name"].startswith("Lat Pulldown"), "3b: yenisi altında kalan 2 setle")
    pg.evaluate("() => { state.gymActive = false; }"); pg.evaluate(DAY)
    # 4) tür değişimi
    pg.evaluate("swapExercise(0, 'Plank / RKC Plank')"); pg.wait_for_timeout(150)
    e = pg.evaluate("state.workoutDays[0].exercises[0]")
    check(e["kind"] == "time" and len(e["sets"]) == 3 and all(s["sec"] == 30 and s["target"] == "30 sn" for s in e["sets"]), f"4a: ağırlık → süreli: 3 × 30 sn ({e['sets'][0]})")
    pg.evaluate("swapExercise(0, 'Treadmill Run (Koşu Bandı)')"); pg.wait_for_timeout(150)
    e = pg.evaluate("state.workoutDays[0].exercises[0]")
    check(e["kind"] == "cardio" and len(e["sets"]) == 1 and "rest" not in e, "4b: kardiyoya: tek bölüm, dinlenme yok")
    st = pg.evaluate("() => { const s = normalizeState(JSON.parse(JSON.stringify(state))); return s.workoutDays[0].exercises.map(x => [x.name, x.kind, x.sets.length]); }")
    check(st[0] == ["Treadmill Run (Koşu Bandı)", "cardio", 1], f"4c: kayıt doğrulamasından geçer {st[0]}")
    c.close()
    # 5) İngilizce
    c, pg = ctx("en-US")
    pg.evaluate("setLang('en')"); pg.evaluate(DAY); pg.evaluate("openSwapExercise(0)"); pg.wait_for_timeout(200)
    txt = pg.inner_text("#pickerModal")
    check("Closest alternatives" in txt and "Other Chest exercises" in txt and "Swap Barbell Bench Press" in txt, "5a: İngilizce başlıklar")
    c.close()
    b.close()
finally:
    srv.terminate()
check(errs == [], f"sayfa hatası yok: {errs}")
print(); print(f"{len(fails)} HATA" if fails else "hepsi geçti")
sys.exit(1 if fails else 0)
