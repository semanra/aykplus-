# v80: cila — yeni özelliklerin animasyonları (animasyonlar AÇIK) ve 44 px çipler
# 1) animasyon açıkken: yıldız, değiştir, süperset bağla, set ekle, liste geçişi, takvim ay geçişi, özet sayaçları hatasız
#    çalışır, animasyon gerçekten başlar (getAnimations) ve son hâl doğru (özet sayıları doğru değere ulaşır)
# 2) animasyon kapalıyken (Profil ayarı) hiçbiri oynamaz, özet sayıları anında son değer
# 3) seçici ve Hareketler çipleri en az 44×44
import os, sys, subprocess, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PORT = 8836
fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)

srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT)], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
URL = f"http://localhost:{PORT}/index.html"
errs = []
DAY = """() => { const w = (name, n) => ({ name, kind: 'weight', note: '', targetInfo: n + 'x10', rest: 60, sets: Array.from({ length: n }, () => ({ kg: 20, reps: 10, target: '10', done: false })) });
  state.workoutDays = [{ id: 'd1', name: 'A', exercises: [w('Barbell Bench Press', 3), w('One-Arm Dumbbell Row', 2)] }];
  state.activeWorkoutDayIdx = 0; state.activeTab = 'gym'; state.gymView = 'program'; state.gymActive = false;
  const now = logicalNow(), T = new Date(now.getFullYear(), now.getMonth(), 1, 18).getTime();
  state.workoutLogs = [{ id: 'L1', ts: T, date: '', dayId: 'd1', dayName: 'A', sets: 24, durationMin: 60, volume: 5000, cardioMin: 0, cardioKm: 0, prs: 3 }];
  state.exerciseHistory = {}; state.exerciseHistory[exKey('Barbell Bench Press')] = [{ ts: T, logId: 'L1', kind: 'weight', name: 'Barbell Bench Press', sets: Array.from({ length: 24 }, () => ({ kg: 50, reps: 10 })) }];
  renderAll(); }"""
RUNNING = "sel => [...document.querySelectorAll(sel)].some(el => el.getAnimations().some(a => a.playState === 'running'))"
try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    def ctx(anim=True):
        c = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, locale="tr-TR", service_workers="block", reduced_motion="no-preference")
        c.add_init_script(TEST_INIT)
        pg = c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(URL); pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(80)
        pg.evaluate(f"() => {{ window.AYK_NO_ANIM = {'false' if anim else 'true'}; state.settings.anim = {'true' if anim else 'false'}; }}")
        pg.evaluate(DAY); pg.wait_for_timeout(100)
        return c, pg
    c, pg = ctx(True)
    check(pg.evaluate("animOK()") is True, "0: animasyon açık")
    # yıldız
    pg.evaluate("() => { state.gymView = 'library'; selectMuscle('Göğüs'); }"); pg.wait_for_timeout(200)
    pg.locator("#libList button[data-fav]").first.click(); pg.wait_for_timeout(40)
    check(pg.evaluate(RUNNING, "#libList button[data-fav-key]"), "1a: yıldız animasyonu başlar")
    check(pg.evaluate("state.favExercises.length") == 1, "1b: favori eklendi")
    # liste geçişi
    pg.evaluate("setLibEq('cable')"); pg.wait_for_timeout(30)
    check(pg.evaluate(RUNNING, "#libList"), "1c: ekipman değişince liste geçişi")
    pg.evaluate("() => { setLibEq('all'); selectMuscle(null); state.gymView = 'program'; renderAll(); }"); pg.wait_for_timeout(300)
    # değiştir
    pg.evaluate("swapExercise(0, 'Incline Dumbbell Press')"); pg.wait_for_timeout(40)
    check(pg.evaluate(RUNNING, "[data-ex-row='0']"), "1d: değiştirilen hareket vurgulanır")
    pg.wait_for_timeout(500)
    # süperset
    pg.evaluate("ssLinkNext(0)"); pg.wait_for_timeout(40)
    check(pg.evaluate(RUNNING, "[data-ex-row='0']") and pg.evaluate(RUNNING, "[data-ex-row='1']"), "1e: bağlanan iki hareket vurgulanır")
    pg.wait_for_timeout(500)
    # set ekle (antrenman)
    pg.evaluate("() => { state.gymView = 'today'; state.gymActive = true; renderAll(); }"); pg.wait_for_timeout(300)
    pg.evaluate("addSetToExercise(0)"); pg.wait_for_timeout(40)
    check(pg.evaluate(RUNNING, "#exCard_0 .rounded-2xl"), "1f: yeni set satırı kayarak gelir")
    check(pg.evaluate("activeDay().exercises[0].sets.length") == 4, "1g: set eklendi")
    pg.evaluate("() => { state.gymActive = false; renderAll(); }")
    # takvim
    pg.evaluate("openWorkoutCalendar()"); pg.wait_for_timeout(400)
    pg.evaluate("calMove(-1)"); pg.wait_for_timeout(30)
    check(pg.evaluate(RUNNING, "#calBody .cal-grid"), "1h: takvim ay geçişi")
    pg.evaluate("closeModal('calModal')"); pg.wait_for_timeout(300)
    # özet sayaç
    pg.evaluate("openRecap('month')"); pg.wait_for_timeout(60)
    mid = pg.inner_text("[data-recap-sets] .t-display")
    pg.wait_for_timeout(900)
    end = pg.inner_text("[data-recap-sets] .t-display")
    check(mid != "24" and end == "24", f"1i: özet sayısı sayarak 24'e ulaşır ({mid} → {end})")
    check(pg.inner_text("[data-recap-prs] .t-display") == "3" and pg.inner_text("[data-recap-vol] .t-display") == "5", "1j: diğer sayılar doğru son değerde")
    pg.evaluate("setRecapPeriod('year')"); pg.wait_for_timeout(900)
    check(pg.inner_text("[data-recap-sets] .t-display") == "24", "1k: dönem değişince de doğru son değer")
    pg.evaluate("closeModal('recapModal')")
    # 1l) hareket kartı geçişi: hareket bitince sıradaki kart öne çıkar
    pg.evaluate("() => { state.gymView = 'today'; state.gymActive = true; ssUnlink(0); renderAll(); }"); pg.wait_for_timeout(300)
    pg.evaluate("() => { const ex = activeDay().exercises[0]; for (let i = 0; i < ex.sets.length - 1; i++) ex.sets[i].done = true; renderAll(); toggleSetDone(0, ex.sets.length - 1); }")
    pg.wait_for_timeout(450)
    check(pg.evaluate(RUNNING, "#exCard_1"), "1l: sıradaki hareket kartı öne çıkar")
    pg.evaluate("() => { stopTimer(); state.gymActive = false; activeDay().exercises.forEach(e => e.sets.forEach(s => s.done = false)); renderAll(); }"); pg.wait_for_timeout(300)
    # 1m) kas haritası: Hareketler görünümüne girince sırayla yanar (animFinishMap çağrılır)
    pg.evaluate("() => { window.__fm = 0; const o = animFinishMap; window.animFinishMap = async (...a) => { window.__fm++; return o(...a); }; }")
    pg.evaluate("() => { state.gymView = 'today'; renderAll(); setGymView('library'); }"); pg.wait_for_timeout(1200)
    check(pg.evaluate("window.__fm") >= 1, f"1m: Hareketler haritası sırayla yanar ({pg.evaluate('window.__fm')})")
    pg.evaluate("() => { window.__fm = 0; renderAll(); }"); pg.wait_for_timeout(600)
    check(pg.evaluate("window.__fm") == 0, "1n: sıradan yeniden çizimde harita animasyonu tekrar oynamaz")
    # 1o) makro çubuğu: değer artınca nabız
    pg.evaluate("() => { animMacroPrev.pro = 10; const bar = document.getElementById('proBar'); window.__mb = !!bar; animMacroBar('pro', 40, 150); }"); pg.wait_for_timeout(200)
    check(pg.evaluate(RUNNING, "#proBar") or not pg.evaluate("window.__mb"), "1o: protein artınca çubuk nabız atar")
    pg.evaluate("() => { state.activeTab = 'nutrition'; renderAll(); animMacroPrev.pro = 10; animMacroBar('pro', 40, 150); }"); pg.wait_for_timeout(200)
    check(pg.evaluate(RUNNING, "#proBar"), "1p: Beslenme ekranında protein çubuğu nabız")
    pg.wait_for_timeout(900)
    pg.evaluate("() => { animMacroPrev.pro = 40; animMacroBar('pro', 30, 150); }"); pg.wait_for_timeout(300)
    check(not pg.evaluate(RUNNING, "#proBar"), "1q: azalırken oynamaz")
    # 1r) seri büyüdüğünde sayar
    pg.evaluate("() => { localStorage.setItem('ayk_anim_seri', JSON.stringify({ 'mob-seri': 0, 'mob-hafta': 0 })); state.mobilityLog = {}; state.mobilityLog[todayStr(logicalNow())] = ['x']; state.activeTab = 'mobility'; renderAll(); }")
    pg.wait_for_timeout(60)
    check(pg.evaluate(RUNNING, "[data-seri]"), "1r: mobilite serisi artınca sayı pıt yapar")
    pg.wait_for_timeout(1000)
    seri = pg.evaluate("() => [...document.querySelectorAll('[data-seri]')].map(e => e.textContent)")
    check(all(x.strip() and x.strip() != '0' for x in seri), f"1s: seri son değerde ({seri})")
    pg.evaluate("renderAll()"); pg.wait_for_timeout(60)
    check(not pg.evaluate(RUNNING, "[data-seri]"), "1t: aynı değerde tekrar oynamaz")
    # 1u) boş ekran kartı
    pg.evaluate("() => { state.activeTab = 'gym'; state.gymView = 'today'; state.workoutDays.push({ id: 'd2', name: 'Boş', exercises: [] }); renderAll(); }"); pg.wait_for_timeout(200)
    pg.evaluate("selectWorkoutDay(1)"); pg.wait_for_timeout(60)
    check(pg.evaluate(RUNNING, "[data-empty-day]"), "1u: boş gün kartı belirir")
    pg.wait_for_timeout(1700); pg.evaluate("renderAll()"); pg.wait_for_timeout(60)
    check(not pg.evaluate(RUNNING, "[data-empty-day]"), "1v: aynı kart sıradan çizimde tekrar oynamaz")
    # 1w) pencereyi aşağı çekerken arka plan açılır, bırakınca geri koyulaşır
    pg.evaluate("openExSheet && (selectWorkoutDay(0), openExSheet(0))"); pg.wait_for_timeout(500)
    bg = pg.evaluate("""() => { const ov = document.getElementById('exSheet'), sh = ov.querySelector('.sheet'), r = sh.getBoundingClientRect(), x = r.left + 30, y = r.top + 20;
      const tg = sh.querySelector('.text-xl') || sh;
      const T = (yy) => ({ touches: [{ clientX: x, clientY: yy }], target: tg, cancelable: true, preventDefault() {} });
      sheetTouchStart(T(y)); sheetTouchMove(T(y + 20)); sheetTouchMove(T(y + 70));
      const mid = ov.style.backgroundColor; sheetTouchEnd(); return [mid, ov.style.backgroundColor]; }""")
    check(bg[0].startswith("rgba(0, 0, 0, 0.") and bg[0] != "rgba(0, 0, 0, 0.8)", f"1w: çekerken arka plan açılır ({bg[0]})")
    pg.wait_for_timeout(400)
    check(pg.evaluate("document.getElementById('exSheet').style.backgroundColor") == "", "1x: bırakınca arka plan eski hâline döner")
    pg.evaluate("closeModal('exSheet')"); pg.wait_for_timeout(300)
    # 3) çipler
    pg.evaluate("() => { state.gymView = 'today'; renderAll(); openExercisePicker(); }"); pg.wait_for_timeout(400)
    small = pg.evaluate("() => [...document.querySelectorAll('#pickerChips button, #pickerEquip button')].map(b => b.getBoundingClientRect()).filter(r => r.width < 44 || r.height < 44).length")
    check(small == 0, f"3a: seçici çipleri en az 44×44 ({small} küçük)")
    pg.evaluate("() => { closeModal('pickerModal'); state.gymView = 'library'; renderAll(); }"); pg.wait_for_timeout(300)
    small = pg.evaluate("() => [...document.querySelectorAll('#libBrowse [data-lib-cat], #libBrowse [data-lib-muscle], #libBrowse [data-lib-eq]')].map(b => b.getBoundingClientRect()).filter(r => r.width < 44 || r.height < 44).length")
    check(small == 0, f"3b: Hareketler çipleri en az 44×44 ({small} küçük)")
    c.close()
    # 2) animasyon kapalı
    c, pg = ctx(False)
    check(pg.evaluate("animOK()") is False, "2a: animasyon kapalı")
    pg.evaluate("swapExercise(0, 'Incline Dumbbell Press')"); pg.wait_for_timeout(40)
    check(not pg.evaluate(RUNNING, "[data-ex-row='0']"), "2b: kapalıyken vurgu oynamaz")
    pg.evaluate("openRecap('month')"); pg.wait_for_timeout(60)
    check(pg.inner_text("[data-recap-sets] .t-display") == "24", "2c: kapalıyken özet sayısı anında son değer")
    c.close()
    b.close()
finally:
    srv.terminate()
check(errs == [], f"sayfa hatası yok: {errs}")
print(); print(f"{len(fails)} HATA" if fails else "hepsi geçti")
sys.exit(1 if fails else 0)
