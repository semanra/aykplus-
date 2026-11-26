# v77: aylık / yıllık özet (düğmeyle açılır)
# 1) İlerleme → Genel ve takvimden açılır   2) bu ay sayıları (antrenman, saat, set, ton, rekor, haftalık seri)
# 3) en çok yapılan hareketler, kaslar (yardımcı yarım), mobilite, beslenme (±%5), kilo   4) dönem çipleri, boş dönem   5) İngilizce
import os, sys, subprocess, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PORT = 8833
fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)

srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT)], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
URL = f"http://localhost:{PORT}/index.html"
errs = []
# Bu ayın 1., 2. ve 9. günleri (iki ardışık hafta olabilir; seri ayrıca hesaplanır) + geçen yıl bir antrenman
SEED = """() => {
  const now = logicalNow(), y = now.getFullYear(), m = now.getMonth();
  const at = d => new Date(y, m, d, 18).getTime();
  state.workoutLogs = []; state.exerciseHistory = {}; state.mobilityLog = {}; state.dailyLogs = {}; state.weightLogs = [];
  const sess = (name, ts, id, n) => { const k = exKey(name); (state.exerciseHistory[k] = state.exerciseHistory[k] || []).push({ ts, logId: id, kind: 'weight', name, sets: Array.from({ length: n }, () => ({ kg: 50, reps: 10 })) }); };
  const log = (ts, id, sets, vol, min, prs) => state.workoutLogs.push({ id, ts, date: '', dayId: 'd', dayName: 'Gün', sets, durationMin: min, volume: vol, cardioMin: 0, cardioKm: 0, prs });
  log(at(1), 'A', 6, 3000, 60, 1); sess('Barbell Bench Press', at(1), 'A', 3); sess('Lat Pulldown (Wide Grip / Geniş Tutuş)', at(1), 'A', 3);
  log(at(2), 'B', 3, 1500, 30, 0); sess('Barbell Bench Press', at(2), 'B', 3);
  log(at(9), 'C', 4, 2000, 45, 2); sess('Barbell Back Squat (High-Bar / Low-Bar)', at(9), 'C', 4);
  log(new Date(y - 1, 5, 5, 18).getTime(), 'Z', 5, 999, 40, 0);
  const dk = d => todayStr(new Date(y, m, d, 12));
  state.mobilityLog[dk(2)] = ['x']; state.mobilityLog[dk(3)] = ['y', 'z'];
  state.dailyLogs[dk(1)] = { eatenKcal: 2000, calTarget: 2050, eatenP: 154, proTarget: 160 };   // v82: protein eşiği %95 (İlerleme ile aynı)
  state.dailyLogs[dk(2)] = { eatenKcal: 2500, calTarget: 2050, eatenP: 120, proTarget: 160 };
  state.weightLogs = [{ ts: at(1), weight: 80, date: '' }, { ts: at(9), weight: 79.2, date: '' }];
  const wk = ts => { const d = new Date(ts); const dow = (d.getDay() + 6) % 7; return Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow, 12)).getTime() / (7 * 864e5)); };
  window.__streak = (() => { const w = [...new Set([at(1), at(2), at(9)].map(wk))].sort((a, b) => a - b); let r = 0, b = 0, p = null; w.forEach(x => { r = p != null && x === p + 1 ? r + 1 : 1; p = x; b = Math.max(b, r); }); return b; })();
  state.activeTab = 'progress'; state.progressView = 'genel'; renderAll(); }"""
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
    pg.evaluate(SEED); pg.wait_for_timeout(150)
    pg.click("[data-open-recap]"); pg.wait_for_timeout(300)
    check(pg.is_visible("#recapModal") and pg.get_attribute("[data-recap-p='month']", "aria-pressed") == "true", "1a: İlerleme → Genel'den açılır, Bu ay seçili")
    v = lambda k: pg.inner_text(f"[data-recap-{k}] .t-display")
    check(v("n") == "3" and v("h") == "2,3" and v("sets") == "13" and v("vol") == "6,5" and v("prs") == "3", f"2a: 3 antrenman, 2,3 saat, 13 set, 6,5 ton, 3 rekor ({v('n')}, {v('h')}, {v('sets')}, {v('vol')}, {v('prs')})")
    check(v("streak") == str(pg.evaluate("window.__streak")), f"2b: en uzun haftalık seri ({v('streak')})")
    ex = pg.inner_text("[data-recap-ex]")
    check(ex.find("Barbell Bench Press") < ex.find("Lat Pulldown") and "2 kez" in ex, "3a: en çok yapılan hareket önde (2 kez)")
    mus = pg.inner_text("[data-recap-mus]")
    check("Göğüs" in mus and "Triceps" in mus and "3" in mus, "3b: kaslar (yardımcılar dahil)")
    check(pg.evaluate("() => { const r = recapData('month'); return [r.mus['Göğüs'], r.mus['Triceps'], r.mus['Sırt'], r.mus['Biceps']]; }") == [6, 3, 3, 1.5], "3c: kas setleri yardımcı yarım")
    pg.wait_for_timeout(400)
    check(pg.evaluate("() => { const c = document.getElementById('recapMap'); return !c || c.width > 0; }"), "3d: kas haritası çizilir (ya da sessizce kalkar)")
    check("2 gün esneme / mobilite" in pg.inner_text("[data-recap-mob]"), "3e: mobilite 2 gün")
    nut = pg.inner_text("[data-recap-nut]")
    check("Ortalama 2.250 kcal · 137 g protein" in nut and "Kayıtlı 2 günün 1 gününde kalori hedefine (±%5), 1 gününde protein" in nut, f"3f: beslenme ({nut!r})")
    check("80 kg → 79,2 kg" in pg.inner_text("[data-recap-w]") and "-0,8" in pg.inner_text("[data-recap-w]"), f"3g: kilo değişimi {pg.inner_text('[data-recap-w]')!r}")
    # 4) dönemler
    chips = pg.evaluate("() => [...document.querySelectorAll('[data-recap-p]')].map(b => b.dataset.recapP)")
    check(chips == ["month", "lastMonth", "year", "lastYear"], f"4a: dönem çipleri (geçen yıl kaydı var) {chips}")
    pg.click("[data-recap-p='lastYear']"); pg.wait_for_timeout(150)
    check(v("n") == "1", "4b: geçen yıl 1 antrenman")
    pg.click("[data-recap-p='lastMonth']"); pg.wait_for_timeout(150)
    check("Bu dönemde kayıt yok." in pg.inner_text("#recapBody"), "4c: boş dönem mesajı")
    pg.evaluate("closeModal('recapModal'); openWorkoutCalendar()"); pg.wait_for_timeout(200)
    pg.click("#calModal [data-open-recap]"); pg.wait_for_timeout(200)
    check(pg.is_visible("#recapModal") and pg.is_hidden("#calModal"), "1b: takvimden açılır")
    c.close()
    # 5) İngilizce
    c, pg = ctx("en-US")
    pg.evaluate("setLang('en')"); pg.evaluate(SEED); pg.evaluate("openRecap()"); pg.wait_for_timeout(300)
    txt = pg.inner_text("#recapModal")
    check("Recap" in txt and "This month" in txt and "your top exercises" in txt.lower() and "2 times" in txt and "2.3" in txt, "5a: İngilizce")
    c.close()
    b.close()
finally:
    srv.terminate()
check(errs == [], f"sayfa hatası yok: {errs}")
print(); print(f"{len(fails)} HATA" if fails else "hepsi geçti")
sys.exit(1 if fails else 0)
