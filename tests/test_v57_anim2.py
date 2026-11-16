# v57: animasyonlar 2. tur — Beslenme + genel (27-animasyon.js "v57 ANİM" blokları).
# 4 öğün yendi (FLIP), 5 su damlası, 6 hedef tamam parıltısı, 7 besin ekleme, 11 pencereler (açılış + aşağı kaydırıp
# kapatma), 12 sekme geçişi, 13 silme ve geri al. Animasyonlar AÇIK: TEST_INIT'ten AYK_NO_ANIM çıkarılır (açılış yine
# kaldırılır); bayraklı açılışta hiçbir şey oynamaz, son hâl anında.
import os, sys, subprocess, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT, NO_ANIM_FLAG
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8814'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = "http://localhost:8814/index.html"
ANIM_INIT = TEST_INIT.replace(NO_ANIM_FLAG, "")
assert ANIM_INIT != TEST_INIT
TOUCH = """
window.__tch = (type, el, x, y) => {
  const tc = new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
  const ev = new TouchEvent(type, { bubbles: true, cancelable: true, touches: type === 'touchend' ? [] : [tc], targetTouches: type === 'touchend' ? [] : [tc], changedTouches: [tc] });
  el.dispatchEvent(ev);
};
"""
# WAAPI (el.animate) animasyonları: CSS animasyon/geçişleri sayılmaz
WA = "(sel => [...document.querySelectorAll(sel)].reduce((n, el) => n + el.getAnimations().filter(a => !(a instanceof CSSAnimation) && !(a instanceof CSSTransition)).length, 0))"
ALLWA = "document.getAnimations().filter(a => !(a instanceof CSSAnimation) && !(a instanceof CSSTransition) && a.playState === 'running').length"
def boot(pg): pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(80)
def page(b, init):
    c = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, locale="tr-TR", has_touch=True)
    c.add_init_script(init + ";" + TOUCH)
    pg = c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e))); pg.goto(URL); boot(pg)
    return c, pg
def wa(pg, sel): return pg.evaluate(WA + "(%s)" % json.dumps(sel))
def swipe(pg, sel, dy, step=10, wait=30, start_off=12):
    """Seçicinin üst kenarından (start_off px aşağıdan) dy px aşağı, yavaş adımlarla."""
    box = pg.evaluate("s => { const r = document.querySelector(s).getBoundingClientRect(); return [r.left + r.width / 2, r.top]; }", sel)
    x, y0 = box[0], box[1] + start_off
    pg.evaluate("([s, x, y]) => __tch('touchstart', document.elementFromPoint(x, y), x, y)", [sel, x, y0])
    tgt = "document.elementFromPoint(%f, %f)" % (x, y0)
    pg.evaluate("window.__swT = %s" % tgt)
    d = 0
    while d < dy:
        d = min(dy, d + step)
        pg.evaluate("([x, y]) => __tch('touchmove', window.__swT, x, y)", [x, y0 + d])
        pg.wait_for_timeout(wait)
    pg.wait_for_timeout(120)   # parmak durdu: fiske hızı yok
    pg.evaluate("([x, y]) => __tch('touchend', window.__swT, x, y)", [x, y0 + dy])
try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    # ================= A) bayraklı (animasyon kapalı): her şey anında, animasyon yok =================
    c0, q = page(b, TEST_INIT)
    check(q.evaluate("animOK()") is False, "bayrak: animOK false")
    q.evaluate("switchTab('nutrition'); setNutriView('today')"); q.wait_for_timeout(60)
    q.evaluate("toggleMealDone(0)")
    check(q.evaluate(ALLWA) == 0, "kapalı: öğün yendi animasyonsuz")
    check(q.locator('#todayMeals [data-today-meal="0"] button[aria-expanded="false"]').count() == 1, "kapalı: öğün anında tek satıra kapandı")
    q.evaluate("addWater(0.25)")
    check(q.locator(".ayk-wdrop").count() == 0, "kapalı: su damlası yok")
    q.evaluate("quickAdd(1, 'ceviz', 20, ensureDayCopy())")
    check(q.locator(".ayk-new").count() == 0 and q.evaluate(ALLWA) == 0, "kapalı: eklenen besinde kayma/vurgu yok")
    q.evaluate("void uiAsk({ title: 'x' })")
    check(q.evaluate(ALLWA) == 0 and q.is_visible("#uiDialog"), "kapalı: pencere anında açıldı")
    q.evaluate("uiDialogDone(false)")
    q.evaluate("switchTab('gym')")
    check(q.evaluate(ALLWA) == 0, "kapalı: sekme geçişi animasyonsuz")
    q.evaluate("switchTab('nutrition'); setNutriView('menus'); openMenuMeals.clear(); toggleMenuMeal(0)"); q.wait_for_timeout(60)
    n0 = q.evaluate("curMeals()[0].items.length")
    q.locator('#mealsContainer [data-meal-card="0"] .n-div > div').first.locator('button[onclick^="removeItem"]').click()
    check(q.evaluate("curMeals()[0].items.length") == n0 - 1, "kapalı: silme anında (bekleme yok)")
    q.evaluate("doUndo()")
    check(q.evaluate("curMeals()[0].items.length") == n0 and q.evaluate(ALLWA) == 0, "kapalı: geri al animasyonsuz")
    c0.close()

    # ================= B) animasyon açık =================
    c, pg = page(b, ANIM_INIT)
    check(pg.evaluate("animOK()") is True, "açık: animOK true")
    pg.evaluate("switchTab('nutrition'); setNutriView('today')"); pg.wait_for_timeout(400)
    # ---------- 4) öğün yendi ----------
    pg.evaluate("toggleMealDone(0)")
    n = wa(pg, "#todayMeals [data-today-meal]")
    check(n >= 1, "4) öğün yendi: satırlarda kapanma animasyonu (%d)" % n)
    check(pg.locator('#todayMeals [data-today-meal="0"] button[aria-expanded="false"]').count() == 1, "4) kart tek satır (son hâl çizimde hemen)")
    pg.wait_for_timeout(400)
    check(wa(pg, "#todayMeals [data-today-meal]") == 0, "4) animasyon bitti, stil kalmadı")
    check(pg.evaluate("document.querySelector('#todayMeals [data-today-meal=\"0\"]').getAttribute('style')") is None, "4) satırda satır içi stil yok")
    pg.evaluate("toggleMealOpen(0)")
    check(wa(pg, '#todayMeals [data-today-meal="0"]') == 1, "4) yenen öğün açılırken clip ile açılıyor")
    pg.wait_for_timeout(400)
    pg.evaluate("toggleMealDone(0)"); pg.wait_for_timeout(400)   # geri al: yenmedi
    # ---------- 5) su ----------
    pg.evaluate("addWater(0.25)")
    check(pg.locator("#waterRing ~ .ayk-wdrop, .n-wring .ayk-wdrop").count() == 1, "5) su eklenince halka ucunda damla")
    check(wa(pg, ".ayk-wdrop circle") == 2, "5) damla + dalga animasyonu")
    pg.wait_for_timeout(700)
    check(pg.locator(".ayk-wdrop").count() == 0, "5) damla ≤ 600 ms sonra DOM'dan kalktı")
    pg.evaluate("addWater(-0.25)")
    check(pg.locator(".ayk-wdrop").count() == 0, "5) su azaltınca damla yok")
    # ---------- 6) hedef tamam ----------
    pg.evaluate("state.settings.macroView = 'eaten'; dayMeals().forEach(m => m.done = false); renderAll()"); pg.wait_for_timeout(50)
    pg.evaluate("ensureDayCopy()[0].items.push({ foodId: '_est', amount: 1, est: { name: 'Büyük', cal: 9000, p: 600, c: 0, f: 0 } }); renderAll()")
    check(pg.locator(".ayk-goal-ring, .ayk-goal-bar").count() == 0, "6) hedefe ulaşılmadan parıltı yok")
    pg.evaluate("toggleMealDone(0)")
    check(pg.locator(".ayk-goal-ring").count() == 1, "6) kalori hedefine ilk ulaşınca halka parlıyor")
    check(pg.locator("#proBar .ayk-goal-bar").count() == 1, "6) protein hedefine ilk ulaşınca çubuk parlıyor")
    pg.wait_for_timeout(1400)
    check(pg.locator(".ayk-goal-ring, .ayk-goal-bar").count() == 0, "6) parıltı bitince kalktı")
    pg.evaluate("toggleMealDone(0)"); pg.wait_for_timeout(50); pg.evaluate("toggleMealDone(0)")
    check(pg.locator(".ayk-goal-ring, .ayk-goal-bar").count() == 0, "6) aynı gün ikinci kez parlamıyor")
    pg.evaluate("toggleMealDone(0); revertDayToMenu()"); pg.wait_for_timeout(450)
    # ---------- 7) besin ekleme ----------
    pg.evaluate("openEditMeals.clear(); dayMeals().forEach(m => m.done = false); renderAll()")
    pg.evaluate("quickAdd(1, 'ceviz', 20, ensureDayCopy())")
    check(pg.locator('#todayMeals [data-today-meal="1"] .n-div > .ayk-new').count() == 1, "7) eklenen kalem vurgulandı")
    check(wa(pg, '#todayMeals [data-today-meal="1"] .n-div > *') >= 1, "7) eklenen kalem kayarak geliyor")
    newtxt = pg.evaluate("document.querySelector('#todayMeals [data-today-meal=\"1\"] .n-div > .ayk-new').textContent")
    fname = pg.evaluate("foodNameL(getFoodDB()['ceviz'])")
    check(fname in newtxt, "7) vurgulanan satır eklenen besin (%s)" % fname)
    pg.wait_for_timeout(1200)
    check(pg.locator(".ayk-new").count() == 0, "7) vurgu kalktı")
    # Besinler ekranından eklenen menü kalemi Menülerim açılınca oynar
    pg.evaluate("setNutriView('foods'); quickAdd(0, 'ceviz', 20, curMeals())")
    check(pg.evaluate("animItemMarks.length") == 1, "7) gizli ekranda eklenen kalem işaretlendi")
    pg.evaluate("openMenuMeals.clear(); openMenuMeals.add(curMeals()[0].id); setNutriView('menus')")
    check(pg.locator('#mealsContainer [data-meal-card="0"] .n-div > .ayk-new').count() == 1 and pg.evaluate("animItemMarks.length") == 0, "7) Menülerim açılınca bir kez oynadı")
    pg.evaluate("renderAll()")
    pg.wait_for_timeout(1200)
    pg.evaluate("renderAll()")
    check(pg.locator(".ayk-new").count() == 0, "7) yeniden çizimde tekrar oynamıyor")
    # ---------- 13) silme ve geri al ----------
    items0 = pg.evaluate("JSON.stringify(curMeals()[0].items)")
    n0 = pg.evaluate("curMeals()[0].items.length")
    stored0 = pg.evaluate("JSON.stringify(aykStoredState().meals)")
    row = pg.locator('#mealsContainer [data-meal-card="0"] .n-div > div').first
    row.locator('button[onclick^="removeItem"]').click()
    check(pg.evaluate("curMeals()[0].items.length") == n0, "13) silmeden önce satır kayıyor (veri henüz silinmedi)")
    check(wa(pg, '#mealsContainer [data-meal-card="0"] .n-div > *') >= 1, "13) satır yana kayarak kayboluyor")
    pg.wait_for_timeout(300)
    check(pg.evaluate("curMeals()[0].items.length") == n0 - 1, "13) ~180 ms sonra mevcut silme akışı çalıştı")
    check(pg.locator("#toastWrap button").count() >= 1, "13) Geri al bildirimi")
    pg.locator("#toastWrap button").last.click()
    check(pg.evaluate("JSON.stringify(curMeals()[0].items)") == items0, "13) geri al veriyi birebir geri getirdi")
    check(wa(pg, '#mealsContainer [data-meal-card="0"] .n-div > *') >= 1, "13) geri gelen satır aynı yoldan giriyor")
    pg.wait_for_timeout(400)
    check(pg.evaluate("JSON.stringify(aykStoredState().meals)") == stored0, "13) kalıcı kayıt silmeden önceki ile aynı")
    # iki hızlı dokunuş: yalnızca bir satır silinir
    pg.evaluate("toggleMenuMeal(0); toggleMenuMeal(0)"); pg.wait_for_timeout(50)
    btns = pg.locator('#mealsContainer [data-meal-card="0"] .n-div button[onclick^="removeItem"]')
    btns.nth(0).click(); btns.nth(1).click()
    pg.wait_for_timeout(350)
    check(pg.evaluate("curMeals()[0].items.length") == n0 - 1, "13) silme sürerken ikinci dokunuş yanlış satırı silmiyor")
    pg.evaluate("doUndo()"); pg.wait_for_timeout(300)
    check(pg.evaluate("JSON.stringify(curMeals()[0].items)") == items0, "13) geri al sonrası yine birebir")
    # Bugün düzenleme: dayRemoveItem
    pg.evaluate("setNutriView('today'); openEditMeals.add(dayMeals()[1].id); renderAll()"); pg.wait_for_timeout(200)
    d0 = pg.evaluate("JSON.stringify(dayMeals()[1].items)")
    pg.locator('#todayMeals [data-today-meal="1"] button[onclick^="dayRemoveItem"]').first.click()
    pg.wait_for_timeout(300)
    check(pg.evaluate("dayMeals()[1].items.length") == len(json.loads(d0)) - 1, "13) Bugün: düzenlemede çıkarma çalıştı")
    pg.locator("#toastWrap button").last.click(); pg.wait_for_timeout(50)
    check(pg.evaluate("JSON.stringify(dayMeals()[1].items)") == d0, "13) Bugün: geri al birebir")
    pg.evaluate("openEditMeals.clear(); renderAll()")
    # ---------- 12) sekme geçişi ----------
    pg.wait_for_timeout(300)
    pg.evaluate("setNutriView('history')")
    check(wa(pg, "#nvHistory") == 1, "12) alt görünüm değişince içerik beliriyor")
    pg.wait_for_timeout(250)
    pg.evaluate("renderAll()")
    check(wa(pg, "#nvHistory") == 0, "12) aynı görünüm yeniden çizilince oynamıyor")
    pg.evaluate("switchTab('progress')")
    check(wa(pg, "#tabProgress") == 1, "12) sekme değişince içerik beliriyor")
    pg.wait_for_timeout(250)
    pg.evaluate("setProgressView(state.progressView === 'kilo' ? 'genel' : 'kilo')")
    check(wa(pg, "#progressContent > div") == 1, "12) İlerleme alt sekmesi beliriyor (gezinti çubuğu sabit)")
    pg.evaluate("switchTab('gym')"); pg.wait_for_timeout(250)
    pg.evaluate("state.gymActive = false; setGymView(state.gymView === 'program' ? 'today' : 'program')")
    check(wa(pg, "#gymRoot > *") >= 1 and wa(pg, "#gymRoot > nav") == 0, "12) Antrenman alt görünümü beliriyor (alt menü sabit)")
    pg.wait_for_timeout(250)
    # ---------- 11) pencereler ----------
    pg.evaluate("setGymView('today'); state.gymActive = true; renderAll(); openExSheet(0)")
    check(wa(pg, "#exSheet, #exSheet > .sheet") == 2, "11) alttan pencere: arka plan + yay ile kayma")
    pg.wait_for_timeout(450)
    swipe(pg, "#exSheet > .sheet", 50)
    pg.wait_for_timeout(400)
    check(pg.is_visible("#exSheet"), "11) 50 px kaydırma: pencere açık kaldı (eşik altı)")
    check(pg.evaluate("document.querySelector('#exSheet > .sheet').style.transform") == "", "11) yerine yaylandı")
    swipe(pg, "#exSheet > .sheet", 140)
    pg.wait_for_timeout(400)
    check(not pg.is_visible("#exSheet"), "11) 140 px kaydırma: pencere kapandı")
    check(pg.evaluate("document.querySelector('#exSheet > .sheet').style.transform") == "", "11) kapanınca stil temizlendi")
    # hızlı fiske (eşik altı mesafe ama hızlı)
    pg.evaluate("openExSheet(0)"); pg.wait_for_timeout(450)
    box = pg.evaluate("(() => { const r = document.querySelector('#exSheet > .sheet').getBoundingClientRect(); return [r.left + r.width / 2, r.top + 12]; })()")
    pg.evaluate("([x, y]) => { const el = document.elementFromPoint(x, y); window.__swT = el; __tch('touchstart', el, x, y); }", box)
    pg.evaluate("([x, y]) => { __tch('touchmove', window.__swT, x, y + 10); }", box)
    pg.wait_for_timeout(16)
    pg.evaluate("([x, y]) => { __tch('touchmove', window.__swT, x, y + 50); }", box)
    pg.wait_for_timeout(16)
    pg.evaluate("([x, y]) => { __tch('touchend', window.__swT, x, y + 50); }", box)
    pg.wait_for_timeout(400)
    check(not pg.is_visible("#exSheet"), "11) hızlı fiske ile kapandı")
    # temalı onay penceresi: kaydırınca vazgeç (null) ile kapanır; metin kutusundan başlayan kaydırma kapatmaz
    pg.evaluate("window.__r = 'bekliyor'; void uiAsk({ title: 'Deneme', input: { value: 'a' } }).then(v => { window.__r = v; })")
    pg.wait_for_timeout(450)
    ib = pg.evaluate("(() => { const r = $('uiDlgInput').getBoundingClientRect(); return [r.left + 20, r.top + r.height / 2]; })()")
    pg.evaluate("([x, y]) => { window.__swT = $('uiDlgInput'); __tch('touchstart', window.__swT, x, y); for (let i = 1; i <= 15; i++) __tch('touchmove', window.__swT, x, y + i * 10); __tch('touchend', window.__swT, x, y + 150); }", ib)
    pg.wait_for_timeout(350)
    check(pg.is_visible("#uiDialog") and pg.evaluate("window.__r") == "bekliyor", "11) metin kutusundan başlayan kaydırma pencereyi kapatmıyor")
    swipe(pg, "#uiDialog > .sheet", 140)
    pg.wait_for_timeout(400)
    check(not pg.is_visible("#uiDialog") and pg.evaluate("window.__r") is None, "11) onay penceresi kaydırınca vazgeç ile kapandı")
    # kapatılamayan pencere (dismissable: false) yerine döner
    pg.evaluate("window.__r = 'bekliyor'; void uiAsk({ title: 'Zorunlu', dismissable: false }).then(v => { window.__r = v; })")
    pg.wait_for_timeout(450)
    swipe(pg, "#uiDialog > .sheet", 140)
    pg.wait_for_timeout(450)
    check(pg.is_visible("#uiDialog") and pg.evaluate("window.__r") == "bekliyor" and pg.evaluate("$('uiDialog').firstElementChild.style.transform") == "", "11) kapatılamayan pencere yerine yaylandı")
    pg.evaluate("uiDialogDone(true)")
    # ortadaki kart pencere: büyüyerek belirir
    pg.evaluate("switchTab('nutrition'); setNutriView('menus'); openMealModal()")
    check(wa(pg, "#mealModal > *") == 1, "11) ortadaki kart pencere hafif büyüyerek açılıyor")
    pg.wait_for_timeout(350)
    pg.evaluate("closeModal('mealModal')")
    # ---------- hız: çizim süresi ----------
    pg.evaluate("setNutriView('today')"); pg.wait_for_timeout(300)
    ms = pg.evaluate("(() => { const t0 = performance.now(); for (let i = 0; i < 20; i++) renderAll(); return (performance.now() - t0) / 20; })()")
    print("     renderAll ortalama %.1f ms" % ms)
    check(ms < 60, "çizim süresi makul (%.1f ms)" % ms)
    check(errs == [], "sayfa hatası yok: " + str(errs[:3]))
    c.close()
    b.close()
finally:
    srv.terminate()
print("BAŞARISIZ:" if fails else "TÜMÜ GEÇTİ", fails)
sys.exit(1 if (fails or errs) else 0)
