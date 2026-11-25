# v76: ayrıntılı antrenman takvimi (düğmeyle açılır)
# 1) Geçmiş ve İlerleme → Güç'ten açılır   2) ay özeti, gün yoğunluğu (1–9 / 10–19 / 20+ set), mobilite çizgisi
# 3) güne dokununca ayrıntı (hareketler, paylaş düğmesi), boş gün mesajı   4) ay gezinme (gelecek ay kapalı)   5) İngilizce
import os, sys, subprocess, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PORT = 8832
fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)

srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT)], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
URL = f"http://localhost:{PORT}/index.html"
errs = []
# Bu ayın 1'i (en az 2 gün önce olsun diye 1, 2) ve geçen ay: üç antrenman + mobilite
SEED = """() => {
  const now = logicalNow(), y = now.getFullYear(), m = now.getMonth();
  const at = (yy, mm, d) => new Date(yy, mm, d, 18).getTime();
  state.workoutLogs = []; state.exerciseHistory = {}; state.mobilityLog = {};
  const log = (ts, id, sets, vol, name) => { state.workoutLogs.push({ id, ts, date: '', dayId: 'd', dayName: name, sets, durationMin: 50, volume: vol, cardioMin: 0, cardioKm: 0, prs: 1 });
    state.exerciseHistory[exKey('Barbell Bench Press')] = (state.exerciseHistory[exKey('Barbell Bench Press')] || []).concat([{ ts, logId: id, kind: 'weight', name: 'Barbell Bench Press', sets: [{ kg: 80, reps: 8 }, { kg: 80, reps: 7 }] }]); };
  log(at(y, m, 1), 'L1', 6, 2400, 'Göğüs Günü');
  log(at(y, m, 1) + 3600e3, 'L2', 8, 1000, 'Kol');
  const pm = m === 0 ? 11 : m - 1, py = m === 0 ? y - 1 : y;
  log(at(py, pm, 10), 'L3', 22, 5000, 'Bacak');
  state.mobilityLog[todayStr(new Date(y, m, 1, 12))] = ['a', 'b'];
  window.__k1 = todayStr(new Date(y, m, 1, 12)); window.__kp = todayStr(new Date(py, pm, 10, 12));
  window.__k2 = todayStr(new Date(y, m, 2, 12));
  state.activeTab = 'gym'; state.gymView = 'history'; renderAll(); }"""
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
    # 1) açılış
    pg.click("#gymRoot [data-open-cal]"); pg.wait_for_timeout(200)
    check(pg.is_visible("#calModal"), "1a: Geçmiş → Takvim açılır")
    k1, kp, k2 = pg.evaluate("[window.__k1, window.__kp, window.__k2]")
    # 2) ay özeti ve yoğunluk
    sm = pg.evaluate("() => [...document.querySelectorAll('[data-cal-sum] .t-display')].map(e => e.textContent)")
    check(sm == ["2", "14", "1"], f"2a: bu ay 2 antrenman, 14 set, 1 mobilite günü {sm}")
    check(pg.get_attribute(f"[data-cal-day='{k1}']", "data-lv") == "2", "2b: 14 set → orta yoğunluk")
    check(pg.locator(f"[data-cal-day='{k1}'] u").count() == 1, "2c: mobilite alt çizgisi")
    check(pg.get_attribute(f"[data-cal-day='{k1}']", "aria-label").find("2 antrenman, 14 set") > 0, "2d: VoiceOver etiketi")
    # 3) ayrıntı
    pg.click(f"[data-cal-day='{k1}']"); pg.wait_for_timeout(150)
    det = pg.inner_text("[data-cal-detail]")
    check(pg.locator("[data-cal-log]").count() == 2 and "Göğüs Günü" in det and "Kol" in det and "Barbell Bench Press" in det and "Mobilite: 2 hareket" in det, "3a: gün ayrıntısı (2 antrenman, hareket, mobilite)")
    check(pg.locator("[data-cal-log] button[aria-label='Paylaş']").count() == 2, "3b: her antrenmanda Paylaş")
    if pg.locator(f"[data-cal-day='{k2}']:not([disabled])").count():
        pg.click(f"[data-cal-day='{k2}']"); pg.wait_for_timeout(120)
        check("Bu gün antrenman kaydı yok." in pg.inner_text("[data-cal-detail]"), "3c: boş gün mesajı")
    # 4) gezinme
    check(pg.locator("button[aria-label='Sonraki ay'][disabled]").count() == 1, "4a: gelecek aya geçilmez")
    pg.click("button[aria-label='Önceki ay']"); pg.wait_for_timeout(150)
    check(pg.get_attribute(f"[data-cal-day='{kp}']", "data-lv") == "3", "4b: geçen ay 22 set → yoğun")
    check(pg.locator("button[aria-label='Önceki ay'][disabled]").count() == 1, "4c: kayıttan önceki aya geçilmez")
    pg.evaluate("closeModal('calModal')")
    # İlerleme → Güç
    pg.evaluate("() => { state.activeTab = 'progress'; state.progressView = 'guc'; renderAll(); }"); pg.wait_for_timeout(200)
    pg.locator("#pCalendar [data-open-cal]").click(); pg.wait_for_timeout(200)
    check(pg.is_visible("#calModal"), "1b: İlerleme → Tüm takvim açılır")
    c.close()
    # 5) İngilizce
    c, pg = ctx("en-US")
    pg.evaluate("setLang('en')"); pg.evaluate(SEED); pg.evaluate("openWorkoutCalendar()"); pg.wait_for_timeout(200)
    txt = pg.inner_text("#calModal")
    check("Workout calendar" in txt and "workouts" in txt and "Tap a day for details." in txt, "5a: İngilizce")
    c.close()
    b.close()
finally:
    srv.terminate()
check(errs == [], f"sayfa hatası yok: {errs}")
print(); print(f"{len(fails)} HATA" if fails else "hepsi geçti")
sys.exit(1 if fails else 0)
