# v82: dış inceleme (Gemini + Codex) düzeltmeleri — docs/DIS-INCELEME-v81.md
# 1) ex.rest sayıya çevrilir, antrenman ekranında kaçışlı yazılır (XSS yok)
# 2) AYK+ olmayan dosya yedek sayılmaz; iç yedek yazılamazsa geri yükleme açık onay ister
# 3) Bilerek boşaltılan dinlenme menüsü yeniden dolmaz; alanı olmayan eski kayıtta kopyalanır
# 4) Kalori açığı kaydırıcısı kiloyu değiştirmez
# 5) IndexedDB okunamazsa eski modda bu oturumun numarası +1e6
# 6) "constructor" / "__proto__" adlı hareket geçmişi bozmaz
# 8–10) Güvenli alt sınır: gerçek fark gösterilir; makro aşımında yağ %20; koç alt sınırda hedefi gerçekten değiştirir
# 11) Koç kalori ortalaması son tartıda kesilir · 13) tempo 6:00 · 14) plaka üst sınırı · 15) barkod kapanınca geç yanıt
# 16) ölçü penceresi düğmeleri ≥ 44 px · 20) takvim yalnız mobilite olan aya gider
import os, sys, subprocess, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PORT = 8838
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT)], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = f"http://localhost:{PORT}/index.html"
def boot(pg): pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(80)
try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    def ctx(locale="tr-TR"):
        c = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, locale=locale, service_workers="block")
        c.add_init_script(TEST_INIT)
        pg = c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e))); pg.goto(URL); boot(pg)
        return c, pg
    c, pg = ctx()

    # --- 1) rest
    r = pg.evaluate("""() => [normalizeExercise({ name: 'Plank', kind: 'time', sets: [{ sec: 30 }], rest: '<img src=x onerror=1>' }).rest,
      normalizeExercise({ name: 'Plank', kind: 'time', sets: [{ sec: 30 }], rest: '90' }).rest,
      normalizeExercise({ name: 'Plank', kind: 'time', sets: [{ sec: 30 }], rest: 99999 }).rest,
      normalizeExercise({ name: 'Plank', kind: 'time', sets: [{ sec: 30 }], rest: -5 }).rest]""")
    check(r == [None, 90, 3600, 0], f"rest sayıya çevrilir / bozuksa silinir: {r}")
    pg.evaluate("""() => { const d = activeDay(); d.exercises.unshift({ name: 'Plank', kind: 'time', sets: [{ sec: 30, done: false }], rest: '<b id=xssRest>x</b>' });
      state.activeTab = 'gym'; state.gymView = 'today'; state.gymActive = true; renderAll(); }""")
    pg.wait_for_timeout(150)
    check(pg.locator("#exRight_0").count() == 1 and pg.locator("#xssRest").count() == 0, "antrenman ekranında rest kaçışlı (HTML olarak işlenmez)")
    pg.evaluate("state.gymActive = false; activeDay().exercises.shift(); state.activeTab = 'nutrition'; renderAll()")

    # --- 2) yedek tanıma
    r = pg.evaluate("""() => [looksLikeBackup({ meals: true }), looksLikeBackup({ meals: [] }), looksLikeBackup({ workoutDays: 'x' }),
      looksLikeBackup({ meals: [{}] }), looksLikeBackup({ settings: {}, meals: [] }), looksLikeBackup(JSON.parse(JSON.stringify(state))),
      looksLikeBackup({ meals: [{}], settings: 5 })]""")
    check(r == [False, False, False, True, True, True, False], f"AYK+ yedeği denetimi: {r}")
    before = pg.evaluate("JSON.stringify(aykStoredState ? state.meals : state.meals)")
    pg.evaluate("void restoreFromText('{\"meals\": true}')"); pg.wait_for_timeout(150)
    check("tanınmadı" in pg.inner_text("#uiDlgTitle"), "'{meals:true}' → 'Yedek tanınmadı'")
    pg.click("#uiDlgOk"); pg.wait_for_timeout(100)
    # iç yedek yazılamazsa: ikinci onay, vazgeçilirse veri aynı
    pg.evaluate("window._snap = storageSnapshotNow; storageSnapshotNow = async () => false")
    bk = pg.evaluate("(() => { const s = JSON.parse(JSON.stringify(state)); s.weight = 55.5; return JSON.stringify(s); })()")
    pg.evaluate("t => { void restoreFromText(t); }", bk); pg.wait_for_timeout(150)
    pg.click("#uiDlgOk"); pg.wait_for_timeout(200)
    check("yedeklenemedi" in pg.inner_text("#uiDlgTitle"), "iç yedek yazılamayınca açık onay soruluyor")
    pg.click("#uiDlgCancel"); pg.wait_for_timeout(150)
    check(pg.evaluate("state.weight") != 55.5 and pg.evaluate("JSON.stringify(state.meals)") == before, "vazgeçilince veri değişmedi")
    pg.evaluate("storageSnapshotNow = window._snap")
    check(pg.evaluate("storageSnapshotNow()") is True, "iç yedek yazılınca true döner")

    # --- 3) dinlenme menüsü
    pg.evaluate("state.dayType = 'rest'; renderAll(); while (state.restMeals.length) deleteMeal(0); renderAll()")
    pg.wait_for_timeout(300)
    pg.reload(); boot(pg)
    check(pg.evaluate("state.restMeals.length") == 0, "bilerek boşaltılan dinlenme menüsü yeniden açılışta boş kalır")
    pg.evaluate("state.dayType = 'train'; renderAll()")
    n = pg.evaluate("""() => { const s = JSON.parse(JSON.stringify(state)); delete s.restMeals; delete s.restMealsEmptyOk; const x = normalizeState(s); return [x.restMeals.length, x.meals.length]; }""")
    check(n[0] == n[1] and n[1] > 0, f"restMeals alanı olmayan eski kayıtta antrenman menüsü kopyalanır: {n}")
    n = pg.evaluate("""() => { const s = JSON.parse(JSON.stringify(state)); s.restMeals = []; delete s.restMealsEmptyOk; return normalizeState(s).restMeals.length; }""")
    check(n > 0, "işaretsiz boş dinlenme menüsü (eski davranış) yine doldurulur")
    n = pg.evaluate("""() => { state.dayType = 'rest'; state.restMeals.push({ id: 'x1', title: 'Ara', items: [] }); renderAll(); return [state.restMealsEmptyOk, state.restMeals.length]; }""")
    check(n == [True, 1], f"öğün eklenince menü dolu: {n}")
    pg.reload(); boot(pg)
    check(pg.evaluate("state.restMealsEmptyOk === undefined && state.restMeals.length === 1"), "dolu menüde işaret temizlenir")
    pg.evaluate("state.dayType = 'train'; renderAll()")

    # --- 4) açık kaydırıcısı kiloyu değiştirmez
    pg.evaluate("state.settings.goal = 'lose'; state.weight = 70.2; state.deficit = 500; state.nutriView = 'menus'; switchTab('nutrition'); setNutriView('menus'); renderAll()")
    pg.wait_for_timeout(150)
    pg.evaluate("const d = $('deficitSlider'); d.value = 600; d.dispatchEvent(new Event('input', { bubbles: true }))")
    check(pg.evaluate("[state.weight, state.deficit]") == [70.2, 600], f"açık kaydırılınca kilo aynı: {pg.evaluate('[state.weight, state.deficit]')}")
    pg.evaluate("const s = $('weightSlider'); s.value = 71.5; s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true }))")
    check(pg.evaluate("[state.weight, state.deficit]") == [71.5, 600], "kilo kaydırılınca açık aynı")
    pg.evaluate("state.weight = 70.2; state.deficit = 500; renderAll()")

    # --- 6) prototip adları
    r = pg.evaluate("""() => { const a = historyFor('constructor'), b = historyFor('toString');
      const h = exHist('__proto__', true); h.push({ ts: 1, sets: [] });
      const ok = Object.keys(state.exerciseHistory).includes('__proto__') && Object.getPrototypeOf(state.exerciseHistory) === Object.prototype;
      const rt = JSON.parse(JSON.stringify(state.exerciseHistory));
      const back = Object.prototype.hasOwnProperty.call(rt, '__proto__');
      delete state.exerciseHistory['__proto__'];
      return [Array.isArray(a) && a.length === 0, Array.isArray(b) && b.length === 0, ok, back]; }""")
    check(r == [True, True, True, True], f"'constructor' / '__proto__' adlı hareket güvenli: {r}")

    # --- 8) alt sınır, 9) makro
    tg = pg.evaluate("""() => { Object.assign(state.settings, { sex: 'female', height: 150, age: 60, activity: 'low', goal: 'lose', bodyFat: '', calAdjust: 0, proteinHigh: false, targetWeight: 45 });
      state.weight = 50; state.deficit = 1000; state.dayType = 'rest'; renderAll(); return getTargets(); }""")
    check(tg["floored"] and tg["calTarget"] == 1400 and tg["effDelta"] == 1400 - tg["tdee"], f"alt sınır: hedef 1400, gerçek fark {tg['effDelta']} (TDEE {tg['tdee']})")
    gv = pg.inner_text("#goalVal")
    check(gv.replace(".", "") != "−1000" and str(abs(tg["effDelta"])) in gv.replace(".", ""), f"Hedef kartı gerçek açığı gösterir: {gv}")
    check("Güvenli alt sınır" in pg.inner_text("#timelineInfo"), "alt sınır notu: " + pg.inner_text("#timelineInfo")[:90])
    tg = pg.evaluate("""() => { Object.assign(state.settings, { sex: 'female', height: 150, age: 60, activity: 'low', goal: 'lose', proteinHigh: true, targetWeight: 0 });
      state.weight = 120; state.deficit = 1000; renderAll(); return getTargets(); }""")
    check(tg["fatTarget"] == round(tg["calTarget"] * 0.20 / 9) and tg["carbTarget"] == 60 and tg["macroOver"] > 0, f"makro aşımında yağ %20, karb 60 g, aşım {tg['macroOver']} kcal")
    check("aşıyor" in pg.inner_text("#timelineInfo"), "makro aşımı notu ekranda")
    tg = pg.evaluate("""() => { Object.assign(state.settings, { sex: 'male', height: 180, age: 30, activity: 'mid', goal: 'lose', proteinHigh: false, targetWeight: 75 });
      state.weight = 80; state.deficit = 500; renderAll(); return getTargets(); }""")
    check(tg["fatTarget"] == round(tg["calTarget"] * 0.25 / 9) and tg["macroOver"] == 0 and not tg["floored"] and tg["effDelta"] == -500, "normal durumda yağ %25, aşım yok, fark −500")

    # --- 10) koç alt sınırda
    r = pg.evaluate("""() => { Object.assign(state.settings, { sex: 'female', height: 150, age: 60, activity: 'low', goal: 'lose', proteinHigh: false, targetWeight: 45, calAdjust: -600 });
      state.weight = 50; state.deficit = 500; renderAll();
      const t0 = getTargets().calTarget; const orig = coachAnalysis;
      coachAnalysis = () => ({ ready: true, delta: 150, newTarget: t0 + 150 });
      applyCoach(); coachAnalysis = orig; const t1 = getTargets().calTarget;
      state.settings.calAdjust = 0; return [t0, t1]; }""")
    check(r[1] == r[0] + 150, f"koç +150 alt sınırda da hedefi artırır: {r}")

    # --- 11) koç kalori penceresi
    r = pg.evaluate("""() => { const now = Date.now(), D = 864e5;
      state.weightLogs = [-17, -14, -10, -7, -3].map((d, i) => ({ ts: now + d * D, date: '', weight: 80 - i * 0.2 }));
      state.dailyLogs = {}; for (let d = -17; d <= -1; d++) state.dailyLogs[todayStr(new Date(now + d * D))] = { kcal: 2000 };
      const a = coachAnalysis(); return [a.ready, a.intakeDays]; }""")
    check(r == [True, 14], f"koç ortalaması son tartı gününde kesilir: {r}")

    # --- 13) tempo
    r = pg.evaluate("[paceText(5.998, 1), paceText(30, 5), paceText(5.5, 1)]")
    check("6:00" in r[0] and "6:00" in r[1] and "5:30" in r[2], f"tempo: {r}")

    # --- 14) plaka
    t0 = time.time()
    r = pg.evaluate("[platesFor(10000000, 20).reason, platesFor(100, 20).ok]")
    check(r == ["heavy", True] and time.time() - t0 < 2, f"plaka üst sınırı, donma yok: {r}")

    # --- 15) barkod: arama sürerken pencere kapatılırsa etiket formu açılmaz
    pg.evaluate("""() => { window._off = fetchOFF; fetchOFF = () => new Promise(r => setTimeout(() => r(null), 300));
      navigator.mediaDevices && (navigator.mediaDevices.getUserMedia = () => new Promise(() => {})); openBarcode(); onBarcode('8690000000001'); closeBarcode(); }""")
    pg.wait_for_timeout(600)
    check(pg.evaluate("$('customFoodModal').classList.contains('hidden')"), "barkod penceresi kapanınca geç gelen yanıt etiket formunu açmaz")
    pg.evaluate("fetchOFF = window._off")

    # --- 16) ölçü penceresi düğmeleri
    pg.evaluate("state.activeTab = 'progress'; renderAll(); openMeasureModal()"); pg.wait_for_timeout(200)
    small = pg.evaluate("""[...document.querySelectorAll('#chartModal button')].filter(e => e.offsetParent && /İptal|Kaydet/.test(e.textContent)).map(e => Math.round(e.getBoundingClientRect().height))""")
    check(len(small) == 2 and min(small) >= 44, f"ölçü İptal / Kaydet ≥ 44 px: {small}")
    pg.evaluate("closeModal('chartModal')")

    # --- 20) takvim: yalnız mobilite olan geçmiş aya gidilebilir
    r = pg.evaluate("""() => { state.workoutLogs = []; const d = logicalNow(); d.setDate(1); d.setMonth(d.getMonth() - 2);
      state.mobilityLog = { [todayStr(d)]: [{ name: 'x' }] }; openWorkoutCalendar();
      return !document.querySelector('#calBody button[aria-label="Önceki ay"]').disabled; }""")
    check(r, "yalnız mobilite kaydı olan geçmiş aya geri gidilebilir")
    r = pg.evaluate("""() => { state.mobilityLog = {}; renderCalendar(); return document.querySelector('#calBody button[aria-label="Önceki ay"]').disabled; }""")
    check(r, "hiç kayıt yoksa geri düğmesi kapalı")
    pg.evaluate("closeModal('calModal')")

    # --- 5) IndexedDB okunamazsa (en sonda: depolama yeniden başlatılır)
    r = pg.evaluate("""async () => { const g = idbGet; idbGet = async () => { throw new Error('okunamadı'); };
      try { localStorage.removeItem('ayk_plus_v5_ayna_kapali'); } catch (e) {}
      await storageInit(); idbGet = g; return [storeMode, storeGen >= 1e6, storeReadOnly]; }""")
    check(r == ["ls", True, False], f"IndexedDB okunamazsa eski mod + sıra +1e6: {r}")
    c.close()

    # --- İngilizce: yeni metinler
    c, pg = ctx("en-US")
    pg.evaluate("setLang('en'); renderAll()"); pg.wait_for_timeout(200)
    r = pg.evaluate("""() => [t("Güvenli alt sınır ({n} kcal) nedeniyle hedefin bundan aşağı inmiyor.", { n: '1,400' }), t("Plaka hesabı en fazla {n} kg için yapılır.", { n: '1000' }), t("Önceki hâl yedeklenemedi")]""")
    check(all(not any(ch in x for ch in "çğıöşüİ") for x in r), "yeni metinlerin İngilizcesi var: " + str(r))
    c.close()
    check(errs == [], "sayfa hatası yok: " + str(errs[:3]))
    b.close()
finally:
    srv.terminate()
print("BAŞARISIZ:" if fails else "TÜMÜ GEÇTİ", fails)
sys.exit(1 if (fails or errs) else 0)
