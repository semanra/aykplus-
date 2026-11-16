# v55: uygulama içi animasyonlar (27-animasyon.js) — bölüm 1: altyapı, ayar, halka/sayı/set tiki/rekor/nabız/tema geçişi.
# Animasyonlar AÇIK denemek için TEST_INIT'ten AYK_NO_ANIM bayrağı çıkarılır; diğer testler bayrakla son hâli görür.
import os, sys, subprocess, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT, NO_ANIM_FLAG
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8813'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = "http://localhost:8813/index.html"
ANIM_INIT = TEST_INIT.replace(NO_ANIM_FLAG, "")
assert ANIM_INIT != TEST_INIT
def boot(pg): pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(80)
def st(pg): return pg.evaluate("aykStoredState()")
def page(b, init, **kw):
    c = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, locale="tr-TR", **kw); c.add_init_script(init)
    pg = c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e))); pg.goto(URL); boot(pg)
    return c, pg
SET0 = "JSON.stringify(activeDay().exercises[0].sets[0])"
try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    # ---------- 1) animOK: bayrak / Hareketi azalt / ayar ----------
    c0, q = page(b, TEST_INIT)
    check(q.evaluate("animOK()") is False and not q.evaluate("document.documentElement.classList.contains('anim-on')"), "AYK_NO_ANIM: animOK false, html.anim-on yok")
    q.evaluate("switchTab('nutrition'); setNutriView('today')"); q.wait_for_timeout(60)
    check(q.evaluate("getComputedStyle($('calRing')).transitionDuration.split(',').every(x => parseFloat(x) === 0)"), "animasyon kapalı: kalori halkasında geçiş yok (son hâl anında)")
    check(q.evaluate("getComputedStyle($('proBar')).transitionDuration.split(',').every(x => parseFloat(x) === 0)"), "animasyon kapalı: makro çubuğunda geçiş yok")
    # bayraklı: set tiki sınıf eklemez, kayıt referansı
    q.evaluate("switchTab('gym'); startWorkout()"); q.wait_for_timeout(150)
    q.evaluate("toggleSetDone(0, 0)"); q.wait_for_timeout(60)
    ref_set = q.evaluate(SET0)
    check(q.evaluate("document.querySelectorAll('.ayk-tick, .ayk-glow').length") == 0, "animasyon kapalı: set tikinde animasyon sınıfı yok")
    q.evaluate("stopTimer()")
    q.evaluate("toggleTheme()")
    check(q.evaluate("document.documentElement.classList.contains('light') === themeIsLight() && state.settings.theme === 'light'"), "animasyon kapalı: tema anında değişti (html.light)")
    c0.close()

    c1, q = page(b, ANIM_INIT, reduced_motion="reduce")
    check(q.evaluate("animOK()") is False and not q.evaluate("document.documentElement.classList.contains('anim-on')"), "Hareketi azalt: animOK false")
    c1.close()

    c, pg = page(b, ANIM_INIT)
    check(pg.evaluate("animOK()") is True and pg.evaluate("document.documentElement.classList.contains('anim-on')"), "bayraksız: animOK true, html.anim-on var")
    check(st(pg)["settings"].get("anim") is True, "varsayılan: settings.anim = true")
    # ---------- 2) Profil anahtarı ----------
    pg.evaluate("openProfile()"); pg.wait_for_timeout(150)
    pg.locator("#setAnim").scroll_into_view_if_needed()
    check(pg.is_visible("#setAnim") or pg.locator("#setAnim").evaluate("e => e.closest('label').getBoundingClientRect().height > 0"), "Profil → Ayarlar: Animasyonlar anahtarı görünür")
    hgt = pg.locator("#setAnim").evaluate("e => e.closest('label').getBoundingClientRect().height")
    check(hgt >= 44, "anahtar satırı ≥ 44 px (%s)" % hgt)
    check("Animasyonlar" in pg.locator("#setAnim").evaluate("e => e.closest('label').textContent"), "etiket: Animasyonlar")
    check(pg.is_checked("#setAnim"), "anahtar açık başlar")
    pg.locator("#setAnim").uncheck(); pg.wait_for_timeout(120)
    check(st(pg)["settings"]["anim"] is False and pg.evaluate("animOK()") is False, "anahtar kapanınca kayda yazıldı, animOK false")
    pg.evaluate("renderAll()")
    check(not pg.evaluate("document.documentElement.classList.contains('anim-on')"), "kapalıyken html.anim-on kalktı")
    pg.locator("#setAnim").check(); pg.wait_for_timeout(120)
    check(st(pg)["settings"]["anim"] is True and pg.evaluate("animOK()") is True, "yeniden açıldı ve kaydedildi")
    pg.evaluate("closeProfile()"); pg.wait_for_timeout(100)
    # ---------- 3) halka + sayı ----------
    pg.evaluate("switchTab('nutrition'); setNutriView('today')"); pg.wait_for_timeout(700)
    check(pg.evaluate("getComputedStyle($('calRing')).transitionProperty.includes('stroke-dashoffset')"), "animasyon açık: kalori halkasında geçiş var")
    check(pg.evaluate("getComputedStyle($('waterRing')).transitionProperty.includes('stroke-dashoffset')"), "animasyon açık: su halkasında geçiş var")
    before = pg.evaluate("$('calLeft').textContent")
    pg.evaluate("setMacroView(state.settings.macroView === 'plan' ? 'eaten' : 'plan')"); pg.wait_for_timeout(30)
    running = pg.evaluate("Object.values(animNums).some(x => x.raf)")
    pg.wait_for_timeout(700)
    after = pg.evaluate("$('calLeft').textContent")
    pg.evaluate("renderAll()")   # aynı değer: yeniden oynamaz, çizimin yazdığı metin
    rerender = pg.evaluate("$('calLeft').textContent")
    check(before != after, "görünüm değişince kalan kalori değişti (%s → %s)" % (before, after))
    check(running, "sayı sayarak değişiyor (rAF çalıştı)")
    check(after == rerender and not pg.evaluate("Object.values(animNums).some(x => x.raf)"), "sayaç bitince metin çizimin metniyle birebir aynı ve yeniden oynamadı")
    cons = [pg.evaluate("$('%sConsumed').textContent" % k) for k in ("cal", "pro", "carb", "fat")]
    pg.evaluate("renderAll()")
    check(cons == [pg.evaluate("$('%sConsumed').textContent" % k) for k in ("cal", "pro", "carb", "fat")], "makro sayıları son hâlde çizimle aynı")
    pg.evaluate("addWater(0.5)" if pg.evaluate("typeof addWater === 'function'") else "state.waterLiters = (state.waterLiters || 0) + 0.5; renderAll()")
    pg.wait_for_timeout(700)
    exp = pg.evaluate("String(Math.round(WATER_RING_C * (1 - Math.min(100, Math.round(state.waterLiters / waterTargetL() * 100)) / 100) * 100) / 100)")
    check(pg.evaluate("$('waterRing').style.strokeDashoffset") == exp, "su halkası son değerde (%s)" % exp)
    # ---------- 4) set tiki + rekor parıltısı ----------
    pg.evaluate("switchTab('gym'); startWorkout()"); pg.wait_for_timeout(150)
    pg.evaluate("toggleSetDone(0, 0)"); pg.wait_for_timeout(40)
    check(pg.evaluate("document.querySelectorAll('#gymRoot .ayk-tick').length") == 1 and pg.evaluate("document.querySelectorAll('#gymRoot .ayk-glow').length") == 1, "set tiki: onay pıt + satır parlaması")
    check(pg.evaluate(SET0) == ref_set, "set tiki sonrası set kaydı animasyonsuzla aynı")
    pg.wait_for_timeout(650)
    check(pg.evaluate("document.querySelectorAll('.ayk-tick, .ayk-glow').length") == 0, "set tiki sınıfları kalktı")
    pg.evaluate("animPrBurst(document.querySelector('#gymRoot button'))"); pg.wait_for_timeout(50)
    check(pg.evaluate("document.querySelectorAll('.ayk-burst i').length") == 10, "rekor parıltısı: parçacıklar")
    pg.wait_for_timeout(950)
    check(pg.evaluate("document.querySelectorAll('.ayk-burst').length") == 0, "rekor parıltısı ≤ 900 ms sonra DOM'dan kalktı")
    # ---------- 5) dinlenme nabzı ----------
    pg.evaluate("stopTimer(); startTimer(10)"); pg.wait_for_timeout(100)
    check(not pg.evaluate("$('restPillInner').classList.contains('ayk-pulse')"), "dinlenme: 10 sn'de nabız yok")
    pg.evaluate("timer.endAt = Date.now() + 2500; tickTimer()"); pg.wait_for_timeout(60)
    check(pg.evaluate("$('restPillInner').classList.contains('ayk-pulse')"), "dinlenme: son 3 sn nabız")
    pg.wait_for_timeout(2900)
    check(not pg.evaluate("$('restPillInner').classList.contains('ayk-pulse')") and not pg.evaluate("timer.running"), "dinlenme: 0'da nabız durdu")
    # ---------- 6) tema geçişi ----------
    for i in range(2):
        pg.evaluate("toggleTheme()"); pg.wait_for_timeout(650)
        check(pg.evaluate("document.documentElement.classList.contains('light') === themeIsLight()") and pg.evaluate("state.settings.theme") == ("light" if i == 0 else "dark"), "tema geçişi %d: html.light doğru" % (i + 1))
    check(pg.evaluate("$('nutriThemeBtn').dataset.icon") == "sun", "tema düğmesi simgesi son hâlde")
    # ---------- 7) İngilizce etiket ----------
    pg.evaluate("setLang('en'); openProfile()"); pg.wait_for_timeout(150)
    check("Animations" in pg.locator("#setAnim").evaluate("e => e.closest('label').textContent"), "İngilizce: Animations")
    pg.evaluate("closeProfile(); setLang('tr')")
    check(errs == [], "sayfa hatası yok: " + str(errs[:3]))
    b.close()
finally:
    srv.terminate()
print("BAŞARISIZ:" if fails else "TÜMÜ GEÇTİ", fails)
sys.exit(1 if (fails or errs) else 0)
