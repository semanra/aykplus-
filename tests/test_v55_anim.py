# v55: uygulama içi animasyonlar (27-animasyon.js) — bölüm 1: altyapı, ayar, halka/sayı/set tiki/rekor/nabız/tema geçişi.
# Bölüm 2: açılış "Portal Zoom" (#splash) ve başlık "Kinetic Slice" (#brandTag).
# Animasyonlar AÇIK denemek için TEST_INIT'ten AYK_NO_ANIM bayrağı çıkarılır; diğer testler bayrakla son hâli görür.
import os, sys, subprocess, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT, NO_ANIM_FLAG, SEED_ONLY
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
    # ========== BÖLÜM 2: açılış Portal Zoom + başlık Kinetic Slice ==========
    SHOTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots"); os.makedirs(SHOTS, exist_ok=True)
    WATCH = ("document.addEventListener('DOMContentLoaded',()=>{window.__spSeen=!!document.getElementById('splash');"
             "window.__spGone=0;const mo=new MutationObserver(()=>{if(!document.getElementById('splash')&&!window.__spGone){window.__spGone=performance.now();mo.disconnect();}});"
             "mo.observe(document.body,{childList:true});});")
    def page2(init, **kw):
        c2 = b.new_context(color_scheme=kw.pop("scheme", "dark"), viewport={"width": 390, "height": 844}, locale="tr-TR", **kw)
        c2.add_init_script(init + ";" + WATCH)
        p2 = c2.new_page(); p2.on("pageerror", lambda e: errs.append(str(e))); p2.goto(URL, wait_until="domcontentloaded")
        return c2, p2
    def brand2(p2): return p2.evaluate("(() => { const b = $('brandTag'); const cs = getComputedStyle(b); return { disp: cs.display, op: +cs.opacity, w: b.getBoundingClientRect().width }; })()")
    c2, s2 = page2(SEED_ONLY)
    check(s2.evaluate("window.__spSeen === true"), "açılış: tohumlu kayıtta (açılış kaldırılmadan) Portal Zoom katmanı görünüyor")
    check(s2.evaluate("getComputedStyle($('splash')).zIndex") == "99999" if s2.locator("#splash").count() else True, "açılış en üst katmanda (z-index 99999)")
    s2.wait_for_function("window.__spGone > 0", timeout=4000)
    gone = s2.evaluate("window.__spGone")
    check(0 < gone <= 2500, "açılış katmanı bitince DOM'dan kalktı (%d ms)" % gone)
    s2.wait_for_function("window.aykBooted === true")
    tt0 = s2.evaluate("$('tabTitle').getBoundingClientRect().left")
    check(s2.locator("#brandTag svg").count() == 2 and s2.locator("#brandTag .bt-plus").count() == 1, "başlıkta AYK+ simgesi SVG (harfler + tarama/artı)")
    bb = brand2(s2)
    check(bb["disp"] != "none" and bb["op"] > 0.9 and bb["w"] > 40, "açılıştan sonra başlıkta AYK+ görünüyor")
    try: s2.wait_for_function("(() => { const b = document.getElementById('brandTag'); return +getComputedStyle(b).opacity < 0.05 && b.getBoundingClientRect().width < 1; })()", timeout=6000)
    except Exception: pass
    bb = brand2(s2)
    check(bb["op"] < 0.05 and bb["w"] < 1, "AYK+ ~1 sn durup soldu, genişliği 0")
    check(s2.is_visible("#tabTitle") and abs(s2.evaluate("$('tabTitle').getBoundingClientRect().left") - tt0) < 0.5, "sekme adı görünür kaldı, yeri kaymadı")
    s2.screenshot(path=SHOTS + "/v55_brand_after.png", clip={"x": 0, "y": 0, "width": 390, "height": 120})
    c2.close()
    # Hareketi azalt: açılış hiç görünmez, AYK+ animasyonsuz
    c3, s3 = page2(SEED_ONLY, reduced_motion="reduce")
    s3.wait_for_function("window.aykBooted === true")
    check(s3.evaluate("window.__spSeen === false") and s3.locator("#splash").count() == 0, "Hareketi azalt: açılış katmanı hiç görünmüyor")
    check(s3.evaluate("getComputedStyle(document.querySelector('#brandTag .bt-ayk')).animationName") == "none", "Hareketi azalt: başlık taraması oynamıyor")
    c3.close()
    # Ekran görüntüleri: animasyonlar duraklatılıp belirli anlara alınır (kesin kare)
    c4, s4 = page2(SEED_ONLY)
    s4.evaluate("document.getAnimations().forEach(a => a.pause())")
    for ms in (200, 600, 1000, 1300):
        s4.evaluate("ms => document.getAnimations().forEach(a => { a.currentTime = ms; })", ms)
        s4.wait_for_timeout(60)
        s4.screenshot(path=SHOTS + "/v55_splash_%04d.png" % ms)
    s4.evaluate("() => { const s = document.getElementById('splash'); if (s) s.remove(); }")
    s4.wait_for_function("window.aykBooted === true")
    s4.evaluate("document.getAnimations().forEach(a => a.pause())")
    for ms in (1550, 2300):
        s4.evaluate("ms => document.getAnimations().forEach(a => { a.currentTime = ms; })", ms)
        s4.wait_for_timeout(60)
        s4.screenshot(path=SHOTS + "/v55_brand_%04d.png" % ms, clip={"x": 0, "y": 0, "width": 390, "height": 120})
    c4.close()
    # Aydınlık tema: harfler metin renginde (okunur), artı turkuaz kalır
    c5, s5 = page2(SEED_ONLY, scheme="light")
    s5.wait_for_function("window.aykBooted === true")
    s5.evaluate("document.getAnimations().forEach(a => { a.pause(); a.currentTime = 2300; })"); s5.wait_for_timeout(60)
    fillc = s5.evaluate("getComputedStyle(document.querySelector('#brandTag .bt-ayk path')).fill")
    col = s5.evaluate("getComputedStyle($('brandTag')).color")
    check(s5.evaluate("document.documentElement.classList.contains('light')") and fillc == col and col != "rgb(255, 255, 255)", "aydınlık: AYK harfleri metin renginde (%s)" % col)
    s5.screenshot(path=SHOTS + "/v55_brand_light.png", clip={"x": 0, "y": 0, "width": 390, "height": 120})
    c5.close()
    check(errs == [], "sayfa hatası yok: " + str(errs[:3]))
    b.close()
finally:
    srv.terminate()
print("BAŞARISIZ:" if fails else "TÜMÜ GEÇTİ", fails)
sys.exit(1 if (fails or errs) else 0)
