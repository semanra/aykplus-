# v57: animasyonlar 2. tur — Beslenme + genel (27-animasyon.js "v57 ANİM" blokları).
# 4 öğün yendi (FLIP), 5 su damlası, 6 hedef tamam parıltısı, 7 besin ekleme, 11 pencereler (açılış + aşağı kaydırıp
# kapatma), 12 sekme geçişi, 13 silme ve geri al. Bölüm 2 (Task 2): 1 antrenman özeti penceresi, 2 hareket tamam,
# 3 kilo önerisi, 8 mobilite seansı geçişi + bitiş kutlaması, 9 İlerleme grafikleri, 10 seri "pıt". Animasyonlar AÇIK: TEST_INIT'ten AYK_NO_ANIM çıkarılır (açılış yine
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
  let tc, ev;
  try { tc = new Touch({ identifier: 1, target: el, clientX: x, clientY: y }); } catch (e) { tc = null; }
  if (tc) ev = new TouchEvent(type, { bubbles: true, cancelable: true, touches: type === 'touchend' ? [] : [tc], targetTouches: type === 'touchend' ? [] : [tc], changedTouches: [tc] });
  else {   // Playwright WebKit (Windows): Touch kurucusu yok; aynı alanlarla düz olay (iPhone gerçek dokunuş üretir)
    tc = { identifier: 1, target: el, clientX: x, clientY: y, pageX: x, pageY: y, screenX: x, screenY: y };
    ev = new Event(type, { bubbles: true, cancelable: true });
    const L = type === 'touchend' ? [] : [tc];
    Object.defineProperties(ev, { touches: { value: L }, targetTouches: { value: L }, changedTouches: { value: [tc] } });
  }
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
    # v57 inceleme M1: kayma sürerken ekran yeniden çizilirse (ör. Geri al, gün dönümü) silme yapılmaz (eski dizin)
    pg.evaluate("toggleMenuMeal(0); toggleMenuMeal(0)"); pg.wait_for_timeout(50)
    pg.locator('#mealsContainer [data-meal-card="0"] .n-div button[onclick^="removeItem"]').nth(0).click()
    pg.evaluate("renderAll()"); pg.wait_for_timeout(350)
    check(pg.evaluate("JSON.stringify(curMeals()[0].items)") == items0, "13) kayma sırasında yeniden çizim: yanlış/eski dizinle silme yapılmadı")
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
    # v57 inceleme M2: kaydedilmemiş giriş tutan tarif penceresi aşağı kaydırmayla KAPANMAZ
    pg.evaluate("switchTab('nutrition'); openRecipeModal()"); pg.wait_for_timeout(450)
    if pg.is_visible("#recipeModal"):
        swipe(pg, "#recipeModal > .sheet", 160); pg.wait_for_timeout(400)
        check(pg.is_visible("#recipeModal"), "11) tarif penceresi aşağı kaydırmayla kapanmadı (yazılanlar kaybolmasın)")
        pg.evaluate("closeModal('recipeModal')"); pg.wait_for_timeout(300)
    else:
        check(False, "11) tarif penceresi açılamadı")
    pg.evaluate("switchTab('gym')"); pg.wait_for_timeout(200)
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

    # =====================================================================================================
    # BÖLÜM 2 (Task 2): 1 antrenman özeti, 2 hareket tamam, 3 kilo önerisi, 8 mobilite seansı, 9 grafikler, 10 seri
    # =====================================================================================================
    FIN = """(prs) => { const d = activeDay(); d.exercises.splice(0);
      d.exercises.push({ name: 'Zz Fin', kind: 'weight', targetInfo: '3x8', sets: makeWeightSets(3, '8', 60, 8) });
      d.exercises.push({ name: 'Zz FinC', kind: 'cardio', targetInfo: '20 dk', sets: [{ min: 20, km: 3, lvl: '', done: false }] });
      d.exercises.forEach(e => e.sets.forEach(s => { s.done = true; }));
      d.exercises[0].sets.forEach((s, i) => { s.pr = i < prs; });
      state.workoutStartedAt = Date.now() - 45 * 60000; state.gymActive = true; state.gymView = 'today'; switchTab('gym'); void finishAndLogWorkout(); }"""
    LOGKEYS = ["cardioKm", "cardioMin", "date", "dayId", "dayName", "durationMin", "id", "prs", "sets", "summary", "ts", "volume"]
    def finish(pg, prs=2):
        pg.evaluate(FIN, prs); pg.wait_for_selector("#uiDialog:not(.hidden)"); pg.click("#uiDlgOk")
    def fin_texts(pg): return pg.evaluate("['finDur', 'finVol', 'finSets', 'finCardio', 'finPrs'].map(i => $(i) ? $(i).textContent : null)")
    def fin_want(pg): return pg.evaluate("""(() => { const l = state.workoutLogs[state.workoutLogs.length - 1];
      return [fmtMinutes(l.durationMin), Math.round(wRaw(l.volume)).toLocaleString(locale()), String(l.sets), fmtNum(l.cardioMin), String(l.prs)]; })()""")
    SLIDE = "(() => { const a = document.querySelector('#mobTTitle').parentElement.getAnimations()[0]; return a ? String(a.effect.getKeyframes()[0].transform) : ''; })()"

    # ---------- C) bayraklı: özet penceresi yine açılır, sayılar anında son hâlde; diğer animasyonlar yok ----------
    c2, q = page(b, TEST_INIT)
    n0 = q.evaluate("state.workoutLogs.length")
    finish(q); q.wait_for_timeout(120)
    check(q.is_visible("#finishModal") and q.evaluate("$('finishModal').classList.contains('tm')"), "1) kapalı: bitişte özet penceresi açıldı (.tm)")
    check(q.inner_text("#finTitle") == "Antrenman tamamlandı", "1) başlık: " + q.inner_text("#finTitle"))
    check(q.evaluate("state.workoutLogs.length") == n0 + 1, "1) kayıt eklendi")
    got, want = fin_texts(q), fin_want(q)
    check(got == want and want == ["45 dk", "1.440", "4", "20", "2"], "1) kapalı: değerler kayıtla aynı ve anında: %s / %s" % (got, want))
    check(q.evaluate(ALLWA) == 0 and not q.evaluate("$('finBody').classList.contains('ayk-fin-in')"), "1) kapalı: sayma / sıralı belirme yok")
    check(q.locator("#finPrList [data-fin-pr]").count() == 1 and "Zz Fin" in q.inner_text("#finPrList") and "★" in q.inner_text("#finPrList"), "1) rekor listesi yıldızlı: " + q.inner_text("#finPrList").replace("\n", " | "))
    check(q.locator("#toastWrap > *").count() == 0, "1) kısa bitiş bildirimi yerine pencere (bildirim yok)")
    lg = q.evaluate("state.workoutLogs[state.workoutLogs.length - 1]")
    stl = q.evaluate("aykStoredState().then(s => s.workoutLogs[s.workoutLogs.length - 1])")
    check(sorted(lg.keys()) == LOGKEYS and stl == lg, "1) kayıt alanları v56 ile aynı ve kalıcı kayıtta: %s" % sorted(lg.keys()))
    check(lg["volume"] == 1440 and lg["sets"] == 4 and lg["durationMin"] == 45 and lg["cardioMin"] == 20 and lg["cardioKm"] == 3 and lg["prs"] == 2 and lg["summary"] == "2 Hareket", "1) kayıt değerleri: %s" % lg)
    hist = q.evaluate("state.exerciseHistory[exKey('Zz Fin')].slice(-1)[0]")
    check(hist["logId"] == lg["id"] and len(hist["sets"]) == 3 and all(set(x.keys()) == {"kg", "reps"} for x in hist["sets"]), "1) hareket geçmişi v56 biçiminde: %s" % hist["sets"])
    sz = q.evaluate("['#finClose', '#finShare', '#finishModal button[aria-label]'].map(s => { const r = document.querySelector(s).getBoundingClientRect(); return Math.min(r.width, r.height); })")
    check(all(x >= 44 for x in sz), "1) düğmeler ≥ 44 px: %s" % sz)
    q.screenshot(path=os.path.join(REPO, "tests", "shots", "v57_antrenman_ozeti_tr_koyu.png"))
    q.click("#finClose"); q.wait_for_timeout(60)
    check(not q.is_visible("#finishModal"), "1) Kapat pencereyi kapattı")
    q.evaluate("openFinishSummary(state.workoutLogs.length - 1, [])"); q.wait_for_timeout(60)
    check(q.locator("#finPrList").count() == 0, "1) rekor yoksa liste yok")
    q.click("#finShare"); q.wait_for_timeout(1200)
    check(not q.is_visible("#finishModal") and q.is_visible("#chartModal") and q.inner_text("#chartTitle") == "Antrenman Özeti" and q.locator("#chartBody img").count() == 1, "1) Paylaş paylaşım kartını açtı")
    q.evaluate("closeModal('chartModal')")
    q.evaluate("""() => { const d = activeDay(); d.exercises.splice(0); d.exercises.push({ name: 'Zz Tek', kind: 'weight', targetInfo: '1x5', sets: makeWeightSets(1, '5', 50, 5) });
      d.exercises[0].sets[0].done = true; state.workoutStartedAt = 0; renderAll(); void finishAndLogWorkout(); }""")
    q.wait_for_selector("#uiDialog:not(.hidden)"); q.click("#uiDlgOk"); q.wait_for_timeout(100)
    check(fin_texts(q) == ["—", "250", "1", None, "0"], "1) süresiz / kardiyosuz: %s" % fin_texts(q))
    q.evaluate("closeModal('finishModal')")
    q.evaluate("() => { activeDay().exercises.forEach(e => e.sets.forEach(s => { s.done = false; })); void finishAndLogWorkout(); }")
    q.wait_for_timeout(80)
    check(q.is_visible("#uiDialog") and "set yok" in q.inner_text("#uiDlgTitle") and not q.is_visible("#finishModal"), "1) set yokken eski uyarı, özet yok")
    q.click("#uiDlgOk")
    q.evaluate("openFinishSummary(state.workoutLogs.length - 1, [])"); q.wait_for_timeout(40); q.mouse.click(195, 30); q.wait_for_timeout(60)
    check(not q.is_visible("#finishModal"), "1) arka plana dokununca kapandı")
    q.evaluate("state.settings.units = 'imperial'; openFinishSummary(state.workoutLogs.length - 2, [{ name: 'Zz Fin', kg: 60, reps: 8 }])"); q.wait_for_timeout(60)
    lb = q.evaluate("[$('finVol').textContent, $('finVol').nextElementSibling.textContent, $('finPrList').textContent]")
    check(lb[0] == "3.175" and lb[1] == "lb" and "lb" in lb[2] and "kg" not in lb[2], "1) imperial: tonaj ve rekor seti lb: %s" % lb)
    q.evaluate("state.settings.units = 'metric'; closeModal('finishModal')")
    q.evaluate("""() => { const d = activeDay(); d.exercises.splice(0); d.exercises.push({ name: 'Zz Two', kind: 'weight', targetInfo: '2x8', sets: makeWeightSets(2, '8', 40, 8) });
      state.gymActive = true; state.gymView = 'today'; renderAll(); toggleSetDone(0, 0); toggleSetDone(0, 1); stopTimer(); }""")
    check(q.locator("#exCard_0 [data-ex-done]").count() == 1 and q.locator(".ayk-done").count() == 0, "2) kapalı: tamamlandı yazısı var, parıltı yok")
    q.evaluate("state.gymActive = false; switchTab('progress'); setProgressView('beslenme')"); q.wait_for_timeout(60)
    check(q.locator(".ayk-chart-in").count() == 0 and q.evaluate(ALLWA) == 0, "9) kapalı: grafik animasyonu yok")
    q.evaluate("setProgressView('genel')")
    check(q.locator(".ayk-pop").count() == 0, "10) kapalı: şeritte pıt yok")
    c2.close()

    # ---------- D) animasyon açık ----------
    c3, pg = page(b, ANIM_INIT)
    # gün "boş" başlasın: mobilite tikleri yok, bugün antrenman yok → seri taban çizgisi yeniden (günün ilk çizimi gibi)
    pg.evaluate("""() => { state.mobilityRoutine.routines.forEach(r => r.items.forEach(i => { i.done = false; }));
      const k = todayStr(); state.workoutLogs = state.workoutLogs.filter(l => !l.ts || todayStr(new Date(l.ts)) !== k);
      for (let i = 1; i <= 30; i++) { const d = new Date(Date.now() - i * 86400000); state.dailyLogs[todayStr(d)] = { kcal: 2200, eatenKcal: 2000 + i * 10, p: 150, mealsDone: 3, mealsTotal: 4, water: 2.5 }; }
      animStreak.day = null; renderAll(); }""")
    finish(pg)
    pg.wait_for_timeout(330)
    mid = pg.evaluate("[$('finBody').classList.contains('ayk-fin-in'), " + WA + "('#finBody [data-fin-stat]')]")
    check(mid[0] and mid[1] >= 3, "1) açık: kutular sırayla beliriyor (%d animasyon)" % mid[1])
    pg.wait_for_timeout(250)
    mid2 = pg.evaluate("$('finVol').textContent")
    check(mid2 != "1.440", "1) açık: tonaj sayarak artıyor (ara değer %r)" % mid2)
    pg.wait_for_timeout(1700)
    check(fin_texts(pg) == fin_want(pg) == ["45 dk", "1.440", "4", "20", "2"], "1) açık: sayma sonunda değerler kayıtla birebir: %s" % fin_texts(pg))
    check(not pg.evaluate("$('finBody').classList.contains('ayk-fin-in')"), "1) açık: animasyon sınıfı kalktı")
    pg.evaluate("closeModal('finishModal')")
    # 2) hareket tamam
    pg.evaluate("""() => { const d = activeDay(); d.exercises.splice(0); d.exercises.push({ name: 'Zz Two', kind: 'weight', targetInfo: '2x8', sets: makeWeightSets(2, '8', 40, 8) });
      d.exercises.push({ name: 'Zz Three', kind: 'weight', targetInfo: '1x8', sets: makeWeightSets(1, '8', 40, 8) });
      state.gymActive = true; state.gymView = 'today'; renderAll(); toggleSetDone(0, 0); }""")
    check(pg.locator(".ayk-done").count() == 0, "2) ilk sette parıltı yok")
    pg.evaluate("toggleSetDone(0, 1); stopTimer()")
    check(pg.locator("#exCard_0 [data-ex-done].ayk-done").count() == 1 and wa(pg, "#exCard_0 [data-ex-done]") == 1, "2) son set tiklenince 'tamamlandı' parladı")
    pg.wait_for_timeout(1000)
    check(pg.locator(".ayk-done").count() == 0, "2) parıltı sınıfı kalktı")
    # 3) kilo önerisi: ilk göründüğünde bir kez
    pg.evaluate("""() => { const d = activeDay(); d.exercises.splice(0); d.exercises.push({ name: 'Zz Sugg', kind: 'weight', targetInfo: '2x8', sets: makeWeightSets(2, '8', 40, 8) });
      const now = Date.now(); state.exerciseHistory[exKey('Zz Sugg')] = [{ ts: now - 3 * 86400000, kind: 'weight', name: 'Zz Sugg', sets: [{ kg: 40, reps: 12 }, { kg: 40, reps: 12 }] }];
      state.gymActive = true; state.gymView = 'today'; renderAll(); }""")
    check(pg.evaluate("!!document.querySelector('#gymRoot [data-sugg], #gymRoot [data-hold], #gymRoot [data-deload]')"), "3) öneri kartı çizildi")
    check(pg.locator(".ayk-sugg-in").count() == 1, "3) öneri ilk göründüğünde kayarak belirdi")
    pg.wait_for_timeout(400)
    pg.evaluate("renderAll()")
    check(pg.locator(".ayk-sugg-in").count() == 0 and wa(pg, "#gymRoot [data-sugg], #gymRoot [data-hold]") == 0, "3) aynı öneri yeniden çizilince oynamadı")
    pg.evaluate("state.gymActive = false; renderAll()")
    # 8) mobilite seansı
    pg.evaluate("""() => { state.mobilityRoutine.routines.forEach(r => r.items.forEach(i => { i.done = false; }));
      state.mobilityRoutine.routines.push({ id: 'mr_t', name: 'T57', items: [
        { id: 'a1', name: 'Cat-Cow', type: 'dynamic', region: 'spine', sets: 1, mode: 'reps', reps: 10, sec: 30, sides: 1, done: false },
        { id: 'a2', name: 'Hip Circles', type: 'dynamic', region: 'hip', sets: 1, mode: 'reps', reps: 8, sec: 30, sides: 1, done: false }] });
      switchTab('mobility'); mobSesStart('mr_t'); }""")
    pg.wait_for_timeout(50)
    check(pg.locator(".ayk-slide").count() == 0, "8) seans başında kayma yok")
    pg.evaluate("mobSesNext()")
    sl = pg.evaluate(SLIDE)
    check(pg.locator(".ayk-slide").count() >= 2 and "translateX(48px)" in sl, "8) ileri: kart sağdan sola kaydı (%s)" % sl)
    pg.wait_for_timeout(450)
    pg.evaluate("mobSesPrev()")
    sl = pg.evaluate(SLIDE)
    check("translateX(-48px)" in sl, "8) geri: kart soldan sağa kaydı (%s)" % sl)
    pg.wait_for_timeout(450)
    pg.evaluate("mobSesNext(); mobSesNext()")
    pg.wait_for_timeout(60)
    check(pg.is_visible("#mobTFin") and pg.locator("#mobTFin.ayk-fin").count() == 1 and wa(pg, "#mobTFin > *") >= 3, "8) bitiş özeti kutlamayla açıldı")
    pg.wait_for_timeout(1200)
    check(pg.locator(".ayk-fin").count() == 0, "8) kutlama sınıfı kalktı")
    # 10) seri: mobilite haftası
    pg.evaluate("mobSesFinishClose(); mobUI.view = 'home'; renderAll()")
    pg.wait_for_timeout(60)
    check(pg.locator("#mobHome .m-days i.t.d.ayk-pop").count() == 1, "10) mobilite haftası: bugün ilk kez tamamlanınca kutu doldu (pıt)")
    pg.wait_for_timeout(800)
    pg.evaluate("renderAll()")
    check(pg.locator(".ayk-pop").count() == 0, "10) yeniden çizimde tekrar oynamadı")
    # 9) İlerleme grafikleri + 10) şerit
    pg.evaluate("state.progressView = 'genel'; switchTab('progress')")
    pg.wait_for_timeout(60)
    pops = pg.evaluate("[...document.querySelectorAll('#pStrip .p-sd.ayk-pop')].map(e => e.className)")
    check(len(pops) == 2 and any(" tq" in x for x in pops) and any(" lv" in x for x in pops), "10) İlerleme şeridi: bugünün antrenman ve mobilite kutusu pıt (%s)" % pops)
    pg.wait_for_timeout(800)
    pg.evaluate("setProgressView('genel')"); pg.wait_for_timeout(30)
    check(pg.locator(".ayk-pop").count() == 0, "10) şerit ikinci kez oynamadı")
    pg.evaluate("() => { const now = Date.now(); for (let i = 0; i < 8; i++) state.weightLogs.push({ date: 'x', weight: 80 - i * 0.2, ts: now - i * 2 * 86400000 }); }")
    pg.evaluate("setProgressView('kilo')"); pg.wait_for_timeout(40)
    da = pg.evaluate("(() => { const pl = document.querySelector('#pWeight svg.p-chart polyline'); return pl ? [pl.style.strokeDasharray !== '', pl.getAnimations().length] : null; })()")
    check(pg.locator("#pWeight svg.ayk-chart-in").count() == 1 and da and da[0] and da[1] == 1, "9) kilo: alt sekme değişince çizgi soldan sağa çiziliyor (%s)" % da)
    pg.wait_for_timeout(1100)
    check(pg.locator(".ayk-chart-in").count() == 0 and pg.evaluate("document.querySelector('#pWeight svg.p-chart polyline').style.strokeDasharray") == "", "9) çizim bitince stil temizlendi")
    pg.evaluate("renderAll()")
    check(pg.locator(".ayk-chart-in").count() == 0 and pg.evaluate(ALLWA) == 0, "9) dokunuşla yeniden çizim grafiği yeniden oynatmıyor")
    pg.evaluate("setProgWRange(90)"); pg.wait_for_timeout(30)
    check(pg.locator("#pWeight svg.ayk-chart-in").count() == 1, "9) aralık değişince yeniden çizildi")
    pg.wait_for_timeout(1100)
    pg.evaluate("setProgressView('beslenme')"); pg.wait_for_timeout(40)
    bars = pg.evaluate("[...document.querySelectorAll('#pKcal svg.p-chart > path')].filter(p => p.getAnimations().length).length")
    check(pg.locator("#pKcal svg.ayk-chart-in").count() == 1 and bars >= 1, "9) çubuklar alttan yükseliyor (%d çubuk)" % bars)
    pg.wait_for_timeout(1100)
    pg.evaluate("setHistRange(30)"); pg.wait_for_timeout(30)
    check(pg.locator("#pKcal svg.ayk-chart-in").count() == 1, "9) beslenme aralığı değişince yeniden")
    pg.wait_for_timeout(1100)
    pg.evaluate("switchTab('gym')"); pg.wait_for_timeout(250); pg.evaluate("switchTab('progress')"); pg.wait_for_timeout(30)
    check(pg.locator("#pKcal svg.ayk-chart-in").count() == 1, "9) sekmeye yeniden girişte çiziliyor")
    pg.wait_for_timeout(1100)
    check(errs == [], "bölüm 2 sayfa hatası yok: " + str(errs[:3]))
    c3.close()
    # EN + aydınlık özet (bayraklı)
    c4 = b.new_context(color_scheme="light", viewport={"width": 390, "height": 844}, locale="en-GB", has_touch=True)
    c4.add_init_script(TEST_INIT); c4.add_init_script("window.AYK_TEST_EN = true")
    q = c4.new_page(); q.on("pageerror", lambda e: errs.append(str(e))); q.goto(URL); boot(q)
    q.evaluate("() => { state.settings.lang = 'en'; state.settings.theme = 'light'; applyTheme(); applyStaticI18n(); renderAll(); }")
    finish(q); q.wait_for_timeout(150)
    en = q.evaluate("[$('finTitle').textContent, $('finClose').textContent, $('finShare').textContent, $('finStats').innerText, $('finPrList').innerText, document.documentElement.classList.contains('light')]")
    check(en[0] == "Workout complete" and en[1] == "Close" and en[2] == "Share" and "Sets done" in en[3] and "Volume" in en[3] and "45 min" in en[3] and "1,440" in en[3] and "New PRs" in en[4] and en[5], "1) EN aydınlık: %s" % en)
    q.screenshot(path=os.path.join(REPO, "tests", "shots", "v57_antrenman_ozeti_en_acik.png"))
    check(errs == [], "EN sayfa hatası yok: " + str(errs[:3]))
    c4.close()
    b.close()
finally:
    srv.terminate()
print("BAŞARISIZ:" if fails else "TÜMÜ GEÇTİ", fails)
sys.exit(1 if (fails or errs) else 0)
