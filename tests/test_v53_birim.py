# v53 bölüm 1 (görev 1): birim katmanı (settings.units = metric | imperial), göç adımı 6, yeni kurulumda bölgeye göre birim,
# Profil ve kurulumda "Birim" seçicisi. Kayıt her zaman kg / cm; yalnız gösterim ve giriş çevrilir.
import os, sys, json, subprocess, time, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT, SPLASH_OFF, FIXTURE
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8811'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = "http://localhost:8811/index.html"
KEY = "ayk_plus_v5_state"
SHOTS = os.path.join(REPO, "tests", "shots"); os.makedirs(SHOTS, exist_ok=True)
def boot(pg): pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(80)
def st(pg): return pg.evaluate("aykStoredState()")
OWN = json.load(open(FIXTURE, encoding="utf-8"))
try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    def ctx(locale="tr-TR", init=TEST_INIT):
        c = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, locale=locale)
        c.add_init_script(init)
        q = c.new_page(); q.on("pageerror", lambda e: errs.append(str(e))); return c, q
    def seed(pg, data):
        pg.evaluate("s => { localStorage.clear(); void indexedDB.deleteDatabase('aykplus'); localStorage.setItem('%s', s); }" % KEY, json.dumps(data))
        pg.reload(); boot(pg)
    def fresh(locale):
        c, q = ctx(locale, SPLASH_OFF); q.goto(URL); boot(q)
        q.evaluate("() => { localStorage.clear(); void indexedDB.deleteDatabase('aykplus'); }"); q.reload(); boot(q); return c, q

    # ===== (a) yardımcılar
    c, pg = ctx(); pg.goto(URL); boot(pg)
    check(pg.evaluate("state.settings.units") == "metric" and pg.evaluate("isImperial()") is False, "a: sahibin kaydı metrik")
    r = pg.evaluate("""() => [wUnit(), lenUnit(), kgToDisp(61.235), dispToKg(135), bodyKgToDisp(79.8), bodyDispToKg(176), cmToDisp(42.5), dispToCm(42.5),
      fmtW(20), fmtW(82.5), fmtW(1.25) === fmtKg(1.25) + ' kg', fmtW(82.37), fmtWNum(82.5), fmtW(80.4, { body: true }), fmtW(0.45, { fine: true }), fmtHeight(170),
      plateSet(), barOptions(), wStep(), kgToDisp('7,5'), dispToKg('')]""")
    check(r == ["kg", "cm", 61.235, 135, 79.8, 176, 42.5, 42.5, "20 kg", "82,5 kg", True, "82,37 kg", "82,5", "80,4 kg", "0,45 kg", "170 cm",
                [25, 20, 15, 10, 5, 2.5, 1.25], [20, 15, 10, 0], 2.5, "7,5", ""], "a: metrikte her yardımcı girişini aynen döndürür / bugünkü biçim: %s" % r)
    pg.evaluate("setUnits('imperial')"); pg.wait_for_timeout(80)
    check(pg.evaluate("isImperial()") is True and pg.evaluate("[wUnit(), lenUnit()]") == ["lb", "in"], "a: imperial: lb / in")
    rt = pg.evaluate("[2.5, 45, 95, 135, 225, 315].map(x => [x, dispToKg(x), kgToDisp(dispToKg(x))])")
    check(all(k == x for x, _, k in rt), "a: gidiş-dönüş kgToDisp(dispToKg(x)) === x: %s" % rt)
    check(pg.evaluate("dispToKg(45)") == 20.412 and pg.evaluate("dispToKg(135)") == 61.235, "a: dispToKg(45) = 20.412, 135 = 61.235")
    check(pg.evaluate("kgToDisp(dispToKg(kgToDisp(20)))") == pg.evaluate("kgToDisp(20)") == 44 and pg.evaluate("kgToDisp(dispToKg(44))") == 44, "a: kg kaydı (20 kg → 44 lb) yeniden yazılınca kaymaz")
    r = pg.evaluate("""() => [fmtW(20.412), fmtW(61.235), fmtWNum(102.058), bodyDispToKg(176), bodyKgToDisp(79.8), bodyKgToDisp(bodyDispToKg(176)), fmtW(79.8, { body: true }),
      fmtHeight(170.18), fmtHeight(175.3), ftInToCm(5, 9), ftInToCm(6, 0), cmToDisp(42.5), dispToCm(16.7), plateSet(), barOptions(), wStep(), fmtW(0.45, { fine: true })]""")
    check(r == ["45 lb", "135 lb", "225", 79.832, 175.9, 176, "175,9 lb", "5'7\"", "5'9\"", 175.3, 182.9, 16.7, 42.42, [45, 35, 25, 10, 5, 2.5], [45, 35, 15, 0], 5, "0,99 lb"],
          "a: imperial biçimler / vücut kilosu / boy / ölçü / plakalar: %s" % r)
    rt = pg.evaluate("[120, 154, 176, 176.4, 200.5, 250].map(x => [x, bodyDispToKg(x), bodyKgToDisp(bodyDispToKg(x))])")
    check(all(k == x for x, _, k in rt), "a: vücut kilosu gidiş-dönüş bodyKgToDisp(bodyDispToKg(x)) === x: %s" % rt)
    r = pg.evaluate("[dispToKg(''), kgToDisp(''), String(bodyDispToKg(NaN)), bodyKgToDisp('abc'), cmToDisp(''), dispToCm(null), dispToKg('2,5')]")
    check(r == ["", "", "NaN", "abc", "", None, 1.134], "a: imperial'de boş / okunamayan girdi olduğu gibi döner (metrikle aynı), virgüllü sayı okunur: %s" % r)
    pg.evaluate("setLang('en')"); pg.wait_for_timeout(80)
    check(pg.evaluate("[fmtW(102.058), fmtW(79.8, { body: true })]") == ["225 lb", "175.9 lb"], "a: İngilizcede ondalık nokta")
    pg.evaluate("setLang('tr')"); pg.evaluate("setUnits('metric')"); pg.wait_for_timeout(80)
    check(pg.evaluate("aykStoredState().then(s => s.settings.units)") == "metric", "a: setUnits kayda yazar")
    # ===== (b) göç ve bozuk değer
    leg = {k: v for k, v in OWN.items()}; leg["dataVer"] = 5; leg["settings"] = dict(OWN["settings"], units="imperial")
    seed(pg, leg); s = st(pg)
    check(s["settings"]["units"] == "metric" and s["dataVer"] == 6, "b: dataVer 5 kaydı → units metric, dataVer 6 (%s, %s)" % (s["settings"].get("units"), s.get("dataVer")))
    check(s["weight"] == OWN["weight"] and s["weightLogs"] == OWN["weightLogs"] and s["settings"]["height"] == OWN["settings"]["height"], "b: göçte kilo/tartı/boy aynı")
    seed(pg, {**OWN, "dataVer": 6, "settings": dict(OWN["settings"], units="bozuk")})
    check(st(pg)["settings"]["units"] == "metric", "b: bozuk units → metric")
    seed(pg, {**OWN, "dataVer": 6, "settings": dict(OWN["settings"], units="imperial")})
    check(st(pg)["settings"]["units"] == "imperial" and pg.evaluate("isImperial()") is True, "b: dataVer 6 imperial kaydı korunur")
    r = pg.evaluate("""() => [normalizeState({ dataVer: 4, settings: { units: 'imperial' } }).settings.units, normalizeState({}).settings.units,
      normalizeState({ dataVer: 6, settings: { units: 7 } }).settings.units, normalizeState({ dataVer: 6, settings: { units: 'imperial' } }).settings.units]""")
    check(r == ["metric", "metric", "metric", "imperial"], "b: normalizeState (eski yedek dosyası geri yükleme yolu): %s" % r)
    tg = pg.evaluate("getTargets()")
    check([tg["calTarget"], tg["proTarget"], tg["fatTarget"], tg["carbTarget"]] == [2478, 180, 69, 284], "b: sahibin hedefleri imperial'de de aynı (hesap kg üzerinden): %s" % [tg["calTarget"], tg["proTarget"], tg["fatTarget"], tg["carbTarget"]])
    c.close()
    # ===== (c) yeni kurulum: bölgeye göre
    for loc, want in (("en-US", "imperial"), ("es-US", "imperial"), ("en-GB", "metric"), ("tr-TR", "metric"), ("en", "metric")):
        c, q = fresh(loc)
        s = q.evaluate("state.settings")
        check(s["units"] == want and s["onboarded"] is False and q.evaluate("state.dataVer") == 6, "c: yeni kurulum %s → %s (%s)" % (loc, want, s["units"]))
        c.close()
    # ===== (d) Profil seçici
    c, pg = ctx(); pg.goto(URL); boot(pg)
    pg.evaluate("openProfile()"); pg.wait_for_timeout(150)
    check(pg.is_visible("#pfUnits") and pg.inner_text("#pfUnits").lower().startswith("birim"), "d: Profil'de Birim satırı görünür: %r" % pg.inner_text("#pfUnits")[:40])
    bx = pg.evaluate("[...document.querySelectorAll('#pfUnits [data-units-opt]')].map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), e.getAttribute('aria-pressed'), e.classList.contains('on')]; })")
    check(len(bx) == 2 and all(w >= 44 and h >= 44 for w, h, _, _ in bx) and bx[0][2] == "true" and bx[1][2] == "false" and bx[0][3], "d: iki düğme ≥ 44 px, metrik seçili: %s" % bx)
    KEEP = ["weight", "weightLogs", "workoutDays", "exerciseHistory", "workoutLogs", "measurements", "dailyLogs"]
    before = st(pg); bset = {k: v for k, v in before["settings"].items() if k != "units"}
    pg.click("#pfUnits [data-units-opt=imperial]"); pg.wait_for_timeout(200)
    after = st(pg)
    check(after["settings"]["units"] == "imperial" and pg.evaluate("document.querySelector('#pfUnits [data-units-opt=imperial]').getAttribute('aria-pressed')") == "true", "d: imperial seçildi, kayda yazıldı, düğme işaretli")
    check(all(after.get(k) == before.get(k) for k in KEEP) and {k: v for k, v in after["settings"].items() if k != "units"} == bset, "d: kayıttaki kilo / tartı / set / geçmiş / diğer ayarlar aynı")
    pg.screenshot(path=os.path.join(SHOTS, "v53_profil_birim.png"))
    pg.click("#pfUnits [data-units-opt=metric]"); pg.wait_for_timeout(200)
    back = st(pg)
    check(back["settings"]["units"] == "metric" and all(back.get(k) == before.get(k) for k in KEEP), "d: metriğe dönünce değerler aynı")
    pg.evaluate("setLang('en')"); pg.wait_for_timeout(100)
    check(pg.inner_text("#pfUnits").lower().startswith("units"), "d: İngilizcede 'Units': %r" % pg.inner_text("#pfUnits")[:30])
    pg.evaluate("setLang('tr')")
    c.close()
    # ===== (e) kurulum: ABD telefonu → imperial; kutular lb / ft + in, kayıt kg / cm
    c, q = fresh("en-US")
    def obstep(): return q.get_attribute("#onboard", "data-step")
    check(q.evaluate("obDraft.units") == "imperial", "e: kurulum taslağı imperial ile başlar")
    q.click("#obStart")
    check(obstep() == "2" and q.is_visible("#obUnits") and q.get_attribute("#obUnits [data-units-opt=imperial]", "aria-pressed") == "true", "e: 2. adımda Birim seçici, imperial seçili")
    bx = q.evaluate("[...document.querySelectorAll('#obUnits [data-units-opt]')].map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })")
    check(len(bx) == 2 and all(w >= 44 and h >= 44 for w, h in bx), "e: kurulum birim düğmeleri ≥ 44 px: %s" % bx)
    check(q.is_visible("#obHeightFt") and q.is_visible("#obHeightIn") and not q.is_visible("#obHeight") and "lb" in q.inner_text("label[for=obWeight]"), "e: boy ft + in iki kutu, kilo lb")
    q.click("#obSexMale"); q.fill("#obAge", "30"); q.fill("#obHeightFt", "5"); q.fill("#obHeightIn", "9"); q.click("#obNext")
    check(obstep() == "2" and q.inner_text("#obErr") == "Enter your weight.", "e: imperial'de boş kilo → 'Enter your weight.': %r" % q.inner_text("#obErr"))
    q.fill("#obHeightIn", "15"); q.fill("#obWeight", "176"); q.click("#obNext")
    check(obstep() == "2" and "between 0 and 11" in q.inner_text("#obErr"), "e: in 0–11 dışında hata: %r" % q.inner_text("#obErr"))
    q.fill("#obHeightIn", "9"); q.fill("#obWeight", "700"); q.click("#obNext")
    err = q.inner_text("#obErr")
    check(obstep() == "2" and "lb" in err and "kg" not in err, "e: sınır dışı kilo hatası lb ile: %r" % err)
    q.fill("#obHeightFt", "3"); q.fill("#obHeightIn", "0"); q.fill("#obWeight", "176"); q.click("#obNext")
    err = q.inner_text("#obErr")
    check(obstep() == "2" and "4'0\"" in err and "cm" not in err, "e: sınır dışı boy hatası ft/in ile: %r" % err)
    q.fill("#obHeightFt", "5"); q.fill("#obHeightIn", "9")
    q.screenshot(path=os.path.join(SHOTS, "v53_kurulum_imperial.png"))
    q.click("#obNext")
    check(obstep() == "3", "e: 3. adım")
    q.click("#obGoalLose")
    check("lb" in q.inner_text("label[for=obTarget]"), "e: hedef kilo lb")
    q.fill("#obTarget", "200"); q.click("#obNext")
    err = q.inner_text("#obErr")
    check("(176 lb)" in err, "e: hedef > kilo hatası lb ile: %r" % err)
    q.fill("#obTarget", "154"); q.click("#obPaceMid")
    wk = q.inner_text("#obWeekly")
    check(" lb " in wk and " kg " not in wk, "e: haftalık tahmin lb: %r" % wk)
    q.click("#obNext"); q.click("#obActMid"); q.click("#obNext"); q.click("#obExpNew"); q.click("#obNext"); q.click("#obNext")
    check(obstep() == "7", "e: 7. adım")
    q.click("#obFinish"); q.wait_for_timeout(200)
    s = st(q)
    check(s["settings"]["units"] == "imperial" and s["settings"]["onboarded"] is True, "e: bitince units imperial kayıtta")
    check(s["weight"] == 79.832 and s["settings"]["height"] == 175.3 and s["settings"]["targetWeight"] == 69.853 and s["weightLogs"][0]["weight"] == 79.832,
          "e: kayda kg / cm yazıldı (kilo %s, boy %s, hedef %s, tartı %s)" % (s["weight"], s["settings"]["height"], s["settings"]["targetWeight"], s["weightLogs"][0]["weight"]))
    c.close()
    # Türkçe telefon: metrik başlar; birim değişince yazılan değerler çevrilir; imperial seçilip bitirilince kayıtta imperial
    c, q = fresh("tr-TR")
    check(q.evaluate("obDraft.units") == "metric", "e: Türkçe telefon kurulumu metrik")
    q.click("#obStart")
    check(q.is_visible("#obHeight") and not q.is_visible("#obHeightFt") and "kg" in q.inner_text("label[for=obWeight]"), "e: metrikte boy tek kutu (cm), kilo kg")
    q.click("#obSexFemale"); q.fill("#obAge", "34"); q.fill("#obHeight", "170"); q.fill("#obWeight", "70")
    q.click("#obUnits [data-units-opt=imperial]"); q.wait_for_timeout(80)
    v = q.evaluate("[document.getElementById('obWeight').value, document.getElementById('obHeightFt').value, document.getElementById('obHeightIn').value, document.getElementById('obAge').value]")
    check(v == ["154,3", "5", "7", "34"], "e: imperial'e geçince yazılanlar çevrilir: %s" % v)
    q.click("#obUnits [data-units-opt=metric]"); q.wait_for_timeout(80)
    v = q.evaluate("[document.getElementById('obWeight').value, document.getElementById('obHeight').value]")
    check(v == ["70", "170"], "e: metriğe dönünce eski değerler: %s" % v)
    q.click("#obUnits [data-units-opt=imperial]"); q.wait_for_timeout(80)
    q.click("#obNext"); q.click("#obGoalKeep"); q.click("#obNext"); q.click("#obActLow"); q.click("#obNext"); q.click("#obExpPro"); q.click("#obNext"); q.click("#obNext")
    q.click("#obFinish"); q.wait_for_timeout(200)
    s = st(q)
    check(s["settings"]["units"] == "imperial" and s["settings"]["lang"] == "tr" and s["weight"] == 69.989 and s["settings"]["height"] == 170.2 and s["settings"]["targetWeight"] == 69.989,
          "e: Türkçe + imperial: units imperial, kilo 69.989 (154,3 lb), boy 170.2, hedef = kilo (%s, %s, %s, %s)" % (s["settings"]["units"], s["weight"], s["settings"]["height"], s["settings"]["targetWeight"]))
    c.close()
    # metrik kurulum yolu değişmedi (boy tam sayı cm, kilo 1 ondalık)
    c, q = fresh("tr-TR")
    r = q.evaluate("""() => { openOnboarding(); Object.assign(obDraft, { sex: 'male', age: '30', height: '175,6', weight: '75,44', goal: 'keep', act: 'mid', exp: 'new', prog: false });
      finishOnboarding(); return [state.settings.units, state.settings.height, state.weight]; }""")
    check(r == ["metric", 176, 75.4], "e: metrik kurulum: boy Math.round, kilo round1: %s" % r)
    c.close()
    # ABD telefonu: boş kutularla metriğe geçince kutular boş kalır ("0" yazılmaz); Türkçede imperial boş kilo → "Kilonu yaz."
    c, q = fresh("en-US")
    q.click("#obStart"); q.click("#obUnits [data-units-opt=metric]"); q.wait_for_timeout(80)
    v = q.evaluate("[document.getElementById('obWeight').value, document.getElementById('obHeight').value]")
    check(v == ["", ""], "e: boş kutularla birim değişince kutular boş kalır: %s" % v)
    q.click("#obUnits [data-units-opt=imperial]"); q.wait_for_timeout(80)
    v = q.evaluate("[document.getElementById('obWeight').value, document.getElementById('obHeightFt').value, document.getElementById('obHeightIn').value]")
    check(v == ["", "", ""], "e: geri imperial'e geçince de boş: %s" % v)
    c.close()
    c, q = fresh("tr-TR")
    q.click("#obStart"); q.click("#obUnits [data-units-opt=imperial]"); q.wait_for_timeout(80)
    q.click("#obSexMale"); q.fill("#obAge", "30"); q.fill("#obHeightFt", "5"); q.fill("#obHeightIn", "9"); q.click("#obNext")
    check(q.inner_text("#obErr") == "Kilonu yaz.", "e: Türkçe + imperial boş kilo → 'Kilonu yaz.': %r" % q.inner_text("#obErr"))
    q.fill("#obWeight", "176"); q.click("#obNext"); q.click("#obGoalLose"); q.fill("#obTarget", ""); q.click("#obNext")
    check(q.inner_text("#obErr") == "Hedef kilonu yaz.", "e: imperial boş hedef → 'Hedef kilonu yaz.': %r" % q.inner_text("#obErr"))
    c.close()
    # sahip güvenliği: imperial kurulumdan "Yedeğim var" ile eski (dataVer 5) yedek → metric; fabrika ayarları bölgeye göre
    c, q = fresh("en-US")
    BK = {k: v for k, v in OWN.items()}; BK["dataVer"] = 5
    q.set_input_files("#obRestoreFile", files=[{"name": "ayk-yedek.json", "mimeType": "application/json", "buffer": json.dumps(BK).encode("utf-8")}])
    q.wait_for_function("document.getElementById('onboard').classList.contains('hidden')", timeout=5000); q.wait_for_timeout(150)
    s = st(q)
    check(s["settings"]["units"] == "metric" and s["settings"]["onboarded"] is True and s["weight"] == OWN["weight"], "e: imperial kurulumdan eski yedek geri yüklenince metric (%s)" % s["settings"]["units"])
    c.close()
    for loc, want in (("tr-TR", "metric"), ("en-US", "imperial")):
        c, q = fresh(loc); seed(q, BK)   # tohum kancası yok: fabrika ayarları gerçek freshState'e düşer
        q.evaluate("void resetToDefaults()"); q.click("#uiDlgOk"); q.wait_for_timeout(80); q.click("#uiDlgOk"); q.wait_for_timeout(300)
        check(q.evaluate("state.settings.units") == want and q.evaluate("state.settings.onboarded") is False and q.is_visible("#onboard"), "e: fabrika ayarları %s → %s, kurulum açık (%s)" % (loc, want, q.evaluate("state.settings.units")))
        c.close()
    # ===== BÖLÜM 2 (görev 2): antrenmanda lb — set kilosu, plakalar, kademeler, öneri, 1RM / tonaj, paylaşım kartı
    SETUP2 = r"""() => {
      const now = Date.now(), D = 86400000, day = state.workoutDays[0];
      const bp = day.exercises[0]; bp.sets.forEach(s => { s.kg = 60; s.reps = 6; });
      const row = day.exercises[1]; row.equip = 'stack'; row.levels = { mode: 'step', start: 5, step: 5, addon: 0 }; row.sets.forEach(s => { s.kg = 45; });
      state.exerciseHistory = {}; state.workoutLogs = [];
      const k = exKey(bp.name);
      state.exerciseHistory[k] = [20, 13, 6, 2].map((b, i) => ({ ts: now - b * D, logId: 'w' + (now - b * D), kind: 'weight', name: bp.name, sets: [0, 1, 2].map(() => ({ kg: 50 + i * 2.5, reps: 8 })) }));
      state.workoutLogs = [20, 13, 6, 2].map(b => ({ id: 'w' + (now - b * D), ts: now - b * D, date: '1 Kas', dayId: day.id, dayName: day.name, sets: 3, durationMin: 50, volume: 1500, cardioMin: 0, cardioKm: 0, prs: 0, summary: '8 Hareket' }));
      day.exercises.forEach(e => { if (e.kind !== 'cardio' && e.rest == null) e.rest = state.settings.restSec; });
      state.settings.barKg = 20; state.gymActive = true; state.activeTab = 'gym'; state.gymView = 'today';
      renderAll();
    }"""
    def set_in(pg, sel, v):   # odak olmadan değer + change (yeniden çizimde odak korumanın ikinci change'ini önler)
        pg.evaluate("([s, v]) => { const e = document.querySelector(s); e.value = v; e.dispatchEvent(new Event('change')); }", [sel, v])
    def g_text(pg):
        out = {}
        pg.evaluate("switchTab('gym'); setGymView('today'); startWorkout()"); pg.wait_for_timeout(60)
        out["active"] = re.sub(r"\d+:\d\d", "", pg.inner_text("#gymRoot"))   # geçen süre sayacı hariç
        pg.evaluate("openPlateTool(0)"); pg.wait_for_timeout(60); out["plate"] = pg.inner_text("#chartBody"); pg.evaluate("closeModal('chartModal')")
        pg.evaluate("openPlateTool(1)"); pg.wait_for_timeout(60); out["level"] = pg.inner_text("#chartBody"); pg.evaluate("closeModal('chartModal')")
        out["right"] = pg.evaluate("activeDay().exercises.slice(0, 2).map(e => exRightText(e))")
        out["sug"] = pg.evaluate("(s => s && [s.type, s.kg, s.text])(overloadSuggestion(activeDay().exercises[0]))")
        pg.evaluate("setGymView('history')"); pg.wait_for_timeout(60); out["history"] = pg.inner_text("#gymRoot")
        pg.evaluate("switchTab('progress'); setProgressView('guc')"); pg.wait_for_timeout(100); out["guc"] = pg.inner_text("#progressContent")
        pg.evaluate("switchTab('gym'); setGymView('today')"); pg.wait_for_timeout(60)
        return out
    c, pg = ctx(); pg.goto(URL); boot(pg); pg.evaluate(SETUP2); pg.wait_for_timeout(100)
    # metrik: bugünkü metinler (v52 ile aynı biçim)
    m0 = g_text(pg)
    check(m0["right"] == ["Tahmini 1RM ~72 kg · Tonaj 1.080 kg", "Tahmini 1RM ~57 kg · Tonaj 1.440 kg · Kademe: 5 kg arayla"], "2: metrik exRightText aynı biçim: %s" % m0["right"])
    msg = pg.evaluate("(() => { const ex = activeDay().exercises[0], o = ex.sets.map(s => s.kg); ex.sets.forEach(s => { s.kg = 57.5; }); const sg = overloadSuggestion(ex); ex.sets.forEach((s, i) => { s.kg = o[i]; }); return sg && [sg.type, sg.kg, sg.text]; })()")
    check(m0["sug"] is None and msg == ["up", 60, "Geçen sefer tüm setlerde 8+ tekrar yaptın. Kiloyu 57,5 → 60 kg'a çıkar, 5 tekrardan başla."], "2: metrik öneri metni ve artış 2,5 kg: %s" % (msg,))
    check("(20 kg / taraf)" in m0["plate"] and "20 kg Olimpik bar" in m0["plate"] and "Çalışma kilosu (kg)" in m0["plate"] and " lb" not in m0["plate"], "2: metrik plaka aracı kg (60 kg → 20 kg / taraf)")
    check("tahmini 1RM, kg" in m0["guc"] and "ton" in m0["guc"] and " lb" not in m0["guc"], "2: metrik Güç kg / ton")
    check(" lb" not in m0["active"] and "KG" in m0["active"], "2: metrik antrenman başlığı KG")
    s_before = st(pg)
    # --- imperial
    pg.evaluate("setUnits('imperial')"); pg.wait_for_timeout(100)
    i0 = g_text(pg)
    vals = pg.evaluate("[...document.querySelectorAll('#exCard_0 input[data-fk$=\"-kg\"]')].map(e => e.value)")
    check(vals == ["132,5", "132,5", "132,5"] and "LB" in i0["active"] and " KG" not in i0["active"], "2: set kutuları lb (60 kg → 132,5), başlık LB: %s" % vals)
    s_imp = st(pg)
    check(all(s_imp.get(k) == s_before.get(k) for k in ("workoutDays", "exerciseHistory", "workoutLogs")) and s_imp["settings"]["barKg"] == 20, "2: birim değişince kayıttaki set / geçmiş / bar aynı")
    # set kutusu: 135 yaz → 61.235 kg; aynı değeri yeniden yaz → değişmez; gösterilen 132,5'i yeniden yazmak 60 kg'ı kaydırmaz
    sel0 = "#exCard_0 input[data-fk='w-0-0-kg']"
    set_in(pg, sel0, "135"); pg.wait_for_timeout(80)
    check(pg.evaluate("activeDay().exercises[0].sets[0].kg") == 61.235 and st(pg)["workoutDays"][0]["exercises"][0]["sets"][0]["kg"] == 61.235, "2: '135' → kayıt 61.235 kg")
    pg.evaluate("renderAll()"); pg.wait_for_timeout(60)
    check(pg.input_value(sel0) == "135", "2: ekranda 135: %r" % pg.input_value(sel0))
    set_in(pg, sel0, "135"); pg.wait_for_timeout(60)
    check(pg.evaluate("activeDay().exercises[0].sets[0].kg") == 61.235, "2: aynı kutuya yeniden '135' → kayıt değişmez")
    sel1 = "#exCard_0 input[data-fk='w-0-1-kg']"
    set_in(pg, sel1, "132,5"); pg.wait_for_timeout(60)
    check(pg.evaluate("activeDay().exercises[0].sets[1].kg") == 60, "2: gösterilen 132,5 yeniden yazılınca 60 kg kalır (kayma yok)")
    set_in(pg, sel1, "225"); pg.wait_for_timeout(60)
    check(pg.evaluate("activeDay().exercises[0].sets[1].kg") == 102.058, "2: '225' → 102.058 kg")
    pg.evaluate("activeDay().exercises[0].sets.forEach(s => { s.kg = 61.235; }); renderAll()")
    # plaka aracı: 135 lb → bar 45 + her yana 45; sahibin bar ayarı (20 kg) 45 lb varsayılır, yazılmaz
    r = pg.evaluate("[JSON.stringify(platesFor(135, 45)), barDisp(), JSON.stringify(warmupSets(135, 45).map(w => [w.kg, w.reps])), JSON.stringify(warmupSets(315, 45).map(w => w.kg))]")
    check(r[0] == '{"ok":true,"list":[45],"rem":0,"perSide":45,"achieved":135}' and r[1] == 45, "2: platesFor(135, 45) = her yana 45, bar 45: %s" % r[:2])
    check(r[2] == "[[45,10],[55,8],[80,5],[110,3]]" and r[3] == "[45,125,190,250,285]", "2: ısınma setleri lb'de 5'in katları: %s %s" % (r[2], r[3]))
    pg.evaluate("openPlateTool(0)"); pg.wait_for_timeout(60)
    pt = pg.inner_text("#chartBody")
    check("Çalışma kilosu (lb)" in pt and "(45 lb / taraf)" in pt and "45 lb Olimpik bar" in pt and pg.input_value("#ptKg") == "135" and pg.input_value("#ptBar") == "45" and " kg" not in pt, "2: plaka aracı lb: 135 → 45 lb / taraf")
    chips = pg.evaluate("[...document.querySelectorAll('#ptOut span.rounded-md')].map(e => e.textContent)")
    check(chips[:1] == ["45"], "2: plaka çipi 45: %s" % chips)
    check(st(pg)["settings"]["barKg"] == 20, "2: bar ayarı açınca yazılmaz (20 kg kalır)")
    pg.select_option("#ptBar", "35"); pg.wait_for_timeout(60)
    check(pg.evaluate("state.settings.barKg") == 15.876 and "(50 lb / taraf)" in pg.inner_text("#chartBody"), "2: 35 lb bar seçilince 15.876 kg saklanır, her yana 50 lb")
    pg.select_option("#ptBar", "45"); pg.wait_for_timeout(40)
    check(pg.evaluate("state.settings.barKg") == 20.412, "2: 45 lb bar = 20.412 kg")
    pg.evaluate("closeModal('chartModal')")
    # artış adımı ve öneri: 5 lb
    r = pg.evaluate("[incDisp(2.5), incDisp(2), incDisp(5), incDisp(1.25), incDisp(dispToKg(7.5)), incDisp(dispToKg(1)), incDisp(3)]")
    check(r == [5, 5, 10, 2.5, 7.5, 1, 7.5], "2: artış adımı lb (2,5 kg → 5, 2 → 5, 5 → 10, 1,25 → 2,5; lb'de girilen aynen): %s" % r)
    r = pg.evaluate("(() => { const ex = activeDay().exercises[0]; return [nextLevel(ex, 61.235), prevLevel(ex, 61.235), kgToDisp(nextLevel(ex, 60))]; })()")
    check(r == [63.503, 58.967, 137.5], "2: nextLevel / prevLevel lb'de ±5 (135 → 140 / 130; 132,5 → 137,5): %s" % r)
    pg.evaluate("""(() => { const ex = activeDay().exercises[0]; const h = historyFor(ex.name); h[h.length - 1].sets.forEach(s => { s.kg = 61.235; s.reps = 8; }); ex.sugDismiss = 0; renderAll(); })()""")
    sg = pg.evaluate("(s => s && [s.type, s.kg, s.text])(overloadSuggestion(activeDay().exercises[0]))")
    check(sg and sg[0] == "up" and sg[1] == 63.503 and "135 → 140 lb'ye" in sg[2], "2: öneri 135 → 140 lb: %s" % (sg,))
    btn = pg.evaluate("[...document.querySelectorAll('#exCard_0 button')].map(e => e.textContent.trim()).filter(x => / lb$/.test(x))")
    check(btn == ["140 lb"], "2: öneri düğmesi '140 lb': %s" % btn)
    # kademeler: {step, start 5, step 5} kg → lb gösterimi; pencere açıp değiştirmeden kaydetmek kaydı değiştirmez
    check(pg.evaluate("levelsSummary(activeDay().exercises[1])") == "11 lb arayla" and pg.evaluate("levelListOf(activeDay().exercises[1]).slice(0, 3).map(v => kgToDisp(v))") == [11, 22, 33], "2: kademe özeti '11 lb arayla', liste 11 / 22 / 33")
    pg.evaluate("openPlateTool(1)"); pg.wait_for_timeout(60)
    lt = pg.inner_text("#chartBody")
    check("99" in lt and "99 lb" in lt and " kg" not in lt, "2: kademe aracı lb (45 kg → 99 lb)")
    pg.evaluate("closeModal('chartModal')")
    before_ex = pg.evaluate("JSON.stringify(activeDay().exercises)")
    for i in (0, 1):
        pg.evaluate("openEditExercise(%d)" % i); pg.wait_for_timeout(60)
        if i == 1:
            v = pg.evaluate("['exStartKg', 'exLvStart', 'exLvStep'].map(i => document.getElementById(i).value)")
            lbl = pg.evaluate("['exStartKg', 'exLvStart', 'exLvStep', 'exLvAddon', 'exInc'].map(i => document.querySelector('label[for=' + i + ']').textContent)")
            check(v == ["99", "11", "11"] and lbl == ["Başlangıç lb", "En düşük kademe (lb)", "Artış aralığı (lb)", "Ek ara plaka (lb, varsa)", "Kilo artış adımı (lb)"], "2: hareket penceresi lb: %s %s" % (v, lbl))
        else:
            check(pg.input_value("#exStartKg") == "135" and pg.get_attribute("#exInc", "placeholder") == "5 (otomatik)", "2: başlangıç 135, artış yer tutucu '5 (otomatik)'")
        pg.evaluate("saveExerciseModal()"); pg.wait_for_timeout(60)
    check(pg.evaluate("JSON.stringify(activeDay().exercises)") == before_ex, "2: hareket penceresi açılıp kaydedilince kg / kademeler değişmez")
    pg.evaluate("openEditExercise(1)"); pg.wait_for_timeout(40); pg.fill("#exLvStep", "10"); pg.evaluate("saveExerciseModal()"); pg.wait_for_timeout(40)
    check(pg.evaluate("JSON.stringify(activeDay().exercises[1].levels)") == '{"mode":"step","start":5,"step":4.536,"addon":0}' and pg.evaluate("levelListOf(activeDay().exercises[1]).slice(0, 3).map(v => kgToDisp(v))") == [11, 21, 31], "2: kademe adımı 10 lb → 4.536 kg (başlangıç 5 kg korunur)")
    pg.evaluate("openEditExercise(1)"); pg.wait_for_timeout(40); pg.select_option("#exEquip", "stack"); pg.evaluate("setExLevelsMode('list')"); pg.fill("#exLvList", "10; 20; 30"); pg.evaluate("saveExerciseModal()"); pg.wait_for_timeout(40)
    check(pg.evaluate("activeDay().exercises[1].levels.list") == [4.536, 9.072, 13.608] and pg.evaluate("levelListOf(activeDay().exercises[1]).map(v => kgToDisp(v))") == [10, 20, 30], "2: kademe listesi lb'de yazılır (10; 20; 30 → kg)")
    pg.evaluate("openEditExercise(1)"); pg.wait_for_timeout(40)
    check(pg.input_value("#exLvList") == "10; 20; 30", "2: liste lb'de geri gelir: %r" % pg.input_value("#exLvList"))
    pg.evaluate("saveExerciseModal()"); pg.wait_for_timeout(40)
    check(pg.evaluate("activeDay().exercises[1].levels.list") == [4.536, 9.072, 13.608], "2: liste değiştirmeden kaydedilince aynı")
    pg.evaluate("openEditExercise(0)"); pg.wait_for_timeout(40); pg.fill("#exInc", "10"); pg.evaluate("saveExerciseModal()"); pg.wait_for_timeout(40)
    check(pg.evaluate("activeDay().exercises[0].inc") == 4.536 and pg.evaluate("kgToDisp(nextLevel(activeDay().exercises[0], 61.235))") == 145, "2: artış adımı 10 lb → 4.536 kg, öneri +10 lb")
    pg.evaluate("openEditExercise(0)"); pg.wait_for_timeout(40)
    check(pg.input_value("#exInc") == "10", "2: artış adımı 10 lb geri gelir")
    pg.evaluate("saveExerciseModal()"); pg.wait_for_timeout(40)
    check(pg.evaluate("activeDay().exercises[0].inc") == 4.536, "2: artış adımı yeniden kaydedilince aynı")
    # 1RM / tonaj / Güç / paylaşım kartı
    i1 = g_text(pg)
    check(i1["right"][0] == "Tahmini 1RM ~162 lb · Tonaj 2.430 lb", "2: exRightText lb: %s" % i1["right"][0])
    check("tahmini 1RM, lb" in i1["guc"] and "bin lb" in i1["guc"] and " kg" not in i1["guc"] and "lb ×" in i1["guc"], "2: Güç: 1RM / rekor / tonaj lb")
    check("3.307 lb" in i1["history"] and "bin lb" in i1["history"], "2: Antrenman geçmişi tonaj lb (1500 kg → 3.307 lb)")
    toast = pg.evaluate("finishToastText(50, 1500, 0, 0)")
    check(toast == "Tebrikler! 50 dk, 3.307 lb tonaj kaydedildi", "2: bitiş bildirimi lb: %r" % toast)
    pr = pg.evaluate("wTxt(t('YENİ REKOR! {name}: {kg} kg × {reps} (1RM ~{rm} kg)', { kg: '135', reps: '5', rm: '158' }))")
    check(pr == "YENİ REKOR! {name}: 135 lb × 5 (1RM ~158 lb)", "2: rekor kalıbı lb, ad sonradan: %r" % pr)
    r = pg.evaluate("[wTxt(\"{a} kg'a çıkar\"), wTxt(\"{a} kg'da kal\"), wTxt(\"~{b} kg'ı geçmedi\"), wTxt(\"{c} kg'lık bar\"), wTxt('(kg) kcal kg/taraf --d-kgx')]")
    check(r == ["{a} lb'ye çıkar", "{a} lb'de kal", "~{b} lb'yi geçmedi", "{c} lb'lik bar", "(lb) kcal lb/taraf --d-kgx"], "2: wTxt Türkçe ekler: %s" % r)
    share = pg.evaluate("""async () => { const txt = []; const f = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (s, ...a) { txt.push(String(s)); return f.call(this, s, ...a); };
      try { await buildShareCanvas(state.workoutLogs[state.workoutLogs.length - 1]); } finally { CanvasRenderingContext2D.prototype.fillText = f; }
      return txt; }""")
    check("3.307 lb" in share and not any(x.endswith(" kg") for x in share), "2: paylaşım kartı tonaj lb: %s" % [x for x in share if "lb" in x or "kg" in x])
    check(pg.evaluate("logExerciseLines(state.workoutLogs[state.workoutLogs.length - 1])[0].txt") == "3 set • en iyi 135×8", "2: paylaşım kartı hareket satırı lb (61.235 kg → 135)")
    pg.evaluate("setLang('en')"); pg.wait_for_timeout(80)
    e1 = g_text(pg)
    check(e1["right"][0] == "Estimated 1RM ~162 lb · Volume 2,430 lb" and "estimated 1RM, lb" in e1["guc"] and "k lb" in e1["guc"], "2: İngilizce + lb: %s" % e1["right"][0])
    pg.evaluate("openPlateTool(0)"); pg.wait_for_timeout(60)
    check("45 lb Olympic bar" in pg.inner_text("#chartBody") and "(45 lb per side)" in pg.inner_text("#chartBody"), "2: İngilizce plaka aracı lb")
    pg.evaluate("closeModal('chartModal')")
    pg.evaluate("setLang('tr')"); pg.wait_for_timeout(60)
    pg.screenshot(path=os.path.join(SHOTS, "v53_antrenman_lb.png"))
    c.close()
    # birim değiştirip geri almak: ekran aynı, kayıt aynı (bölüm 2 metrik ↔ imperial ↔ metrik)
    c, pg = ctx(); pg.goto(URL); boot(pg); pg.evaluate(SETUP2); pg.wait_for_timeout(100)
    a0 = g_text(pg); sa = st(pg)
    pg.evaluate("setUnits('imperial')"); pg.wait_for_timeout(60); g_text(pg)
    pg.evaluate("openPlateTool(0)"); pg.wait_for_timeout(40); pg.evaluate("closeModal('chartModal')")
    pg.evaluate("openEditExercise(1); saveExerciseModal()"); pg.wait_for_timeout(40)
    pg.evaluate("setUnits('metric')"); pg.wait_for_timeout(60)
    a1 = g_text(pg); sb = st(pg)
    dif = [k for k in a0 if k != "history" and a0[k] != a1[k]]
    check(not dif, "2: metrik → imperial → metrik: ekran metinleri aynı: %s" % [(k, str(a0[k])[:200], str(a1[k])[:200]) for k in dif])
    check(all(sa.get(k) == sb.get(k) for k in ("workoutDays", "exerciseHistory", "workoutLogs")) and sb["settings"]["barKg"] == 20, "2: metrik → imperial → metrik: kayıt aynı")
    pg.evaluate("setLang('en')"); pg.wait_for_timeout(60)
    en = g_text(pg)
    check(en["right"] == ["Estimated 1RM ~72 kg · Volume 1,080 kg", "Estimated 1RM ~57 kg · Volume 1,440 kg · Weight increments: every 5 kg"] and " lb" not in en["guc"] and "(20 kg per side)" in en["plate"], "2: İngilizce + kg aynı biçim: %s" % en["right"])
    c.close()
    # ===== BÖLÜM 3 (görev 3): vücut — kilo, hedef, tartılar, boy (ft + in), ölçüler (in), hedef / koç metinleri
    SETUP3 = r"""() => {
      const now = Date.now(), D = 86400000;
      state.weightLogs = [];
      for (let i = 24; i >= 0; i -= 3) state.weightLogs.push({ date: fmtDateStore(now - i * D), weight: round1(106 - (24 - i) * 0.1), ts: now - i * D });
      state.weight = 105;
      state.measurements = [20, 12, 6, 1].map((b, i) => ({ ts: now - b * D, bel: round1(100 - i * 1.2), kol: round1(40 + i * 0.3) }));
      state.settings.scaleOn = true; state.settings.scaleBase = 106;
      renderAll();
    }"""
    def b_text(pg):
        out = {}
        pg.evaluate("switchTab('nutrition'); setNutriView('menus')"); pg.wait_for_timeout(80)
        out["menus"] = pg.evaluate("document.querySelector('#weightSlider').closest('section').innerText + '|' + scaleCard.innerText")
        pg.evaluate("setNutriView('history')"); pg.wait_for_timeout(60); out["week"] = pg.inner_text("#weightAvgRow")
        pg.evaluate("switchTab('progress'); setProgressView('genel')"); pg.wait_for_timeout(80); out["genel"] = pg.inner_text("#progressContent")
        out["coach"] = pg.evaluate("(() => { const d = document.querySelector('#pCoach details'); if (d) d.open = true; return document.querySelector('#pCoach') ? pCoach.innerText : ''; })()")
        pg.evaluate("setProgressView('kilo')"); pg.wait_for_timeout(80); out["kilo"] = pg.inner_text("#progressContent")
        out["axis"] = pg.evaluate("[...document.querySelectorAll('#pWeight .p-vl')].map(e => e.textContent)")
        pg.evaluate("openProfile()"); pg.wait_for_timeout(80)
        out["pf"] = pg.evaluate("pfWeightBox.innerText + '|' + pfMeasureBox.innerText + '|' + ['setHeight','pfWeight','setTarget'].map(i => document.getElementById(i).value).join(',')")
        pg.evaluate("closeProfile()"); pg.wait_for_timeout(60)
        return out
    def pf_set(pg, sel, v):
        pg.fill(sel, v); pg.press(sel, "Tab"); pg.wait_for_timeout(100)
    c, pg = ctx(); pg.goto(URL); boot(pg); pg.evaluate(SETUP3); pg.wait_for_timeout(100)
    m3 = b_text(pg); s3a = st(pg)
    check("kg hedefine" in m3["menus"] and "105 kg" in m3["menus"] and " lb" not in m3["menus"] + m3["kilo"] + m3["pf"] + m3["week"] + m3["genel"], "3: metrik metinler kg (değişmedi)")
    check("kg/hafta" in m3["coach"] and re.search(r"\bcm\b", m3["kilo"]) and m3["pf"].endswith("180,105,82"), "3: metrik koç kg/hafta, ölçü cm, Profil kutuları 180 / 105 / 82: %s" % m3["pf"][-20:])
    tg = pg.evaluate("getTargets()")
    pg.evaluate("setUnits('imperial')"); pg.wait_for_timeout(100)
    tg2 = pg.evaluate("getTargets()")
    check([tg2[k] for k in ("calTarget", "proTarget", "fatTarget", "carbTarget")] == [tg[k] for k in ("calTarget", "proTarget", "fatTarget", "carbTarget")], "3: imperial'de hedefler aynı (hesap kg): %s" % [tg2["calTarget"], tg2["proTarget"], tg2["fatTarget"], tg2["carbTarget"]])
    i3 = b_text(pg); s = st(pg)
    check(s["weight"] == 105 and s["weightLogs"] == s3a["weightLogs"] and s["measurements"] == s3a["measurements"] and s["settings"]["height"] == 180, "3: birim değişince kilo / tartı / ölçü / boy kaydı aynı")
    check("231,5" in i3["menus"] and "180,8 lb hedefine" in i3["menus"] and "lb kayıp" in i3["menus"] and " kg" not in i3["menus"], "3: Menülerim kilo / hedef / haftalık kayıp lb: %s" % i3["menus"][:400])
    check("233,7 lb" in i3["menus"] and "231,5 lb" in i3["menus"], "3: kiloya göre gramaj kartı lb")
    check(" lb" in i3["week"] and " kg" not in i3["week"], "3: Geçmiş haftalık kartta kilo lb: %s" % i3["week"])
    check("lb" in i3["genel"] and "lb/hafta" in i3["coach"] and "kg/hafta" not in i3["coach"], "3: Genel kutusu ve koç ayrıntısı lb/hafta: %s" % i3["coach"][-300:])
    vl = [x for x in i3["axis"] if x.endswith(" lb")]
    check(vl and float(vl[0].split(" ")[0].replace(",", ".")) > 200, "3: Kilo grafiği değerleri lb: %s" % i3["axis"])
    check(re.search(r"\bin\b", i3["kilo"]) and not re.search(r"\bcm\b", i3["kilo"]) and " kg" not in i3["kilo"] and "Hedef 180,8 lb" in i3["kilo"], "3: Kilo sekmesi ve ölçü kartı lb / in")
    check(i3["pf"].endswith("180,231,5,180,8") and " lb" in i3["pf"] and re.search(r"\bin\b", i3["pf"]) and " kg" not in i3["pf"], "3: Profil kilo kartları lb, ölçüler in, kutular lb: %s" % i3["pf"][-40:])
    # Profil: boy iki kutu, kilo / hedef lb girişi
    pg.evaluate("openProfile()"); pg.wait_for_timeout(80)
    check(pg.is_visible("#setHeightFt") and pg.is_visible("#setHeightIn") and not pg.is_visible("#setHeight") and not pg.is_visible('label[for="setHeight"]') and pg.input_value("#setHeightFt") == "5" and pg.input_value("#setHeightIn") == "11", "3: Profil boy imperial'de iki kutu (180 cm → 5 ft 11 in)")
    hb = pg.evaluate("[setHeightFt.getBoundingClientRect().height, setHeightIn.getBoundingClientRect().height, setHeightIn.getBoundingClientRect().width]")
    check(hb[0] >= 44 and hb[1] >= 44 and hb[2] >= 44, "3: boy kutuları ≥ 44 px: %s" % hb)
    check(pg.inner_text('label[for="pfWeight"]') == "Güncel kilo (lb)" and pg.inner_text('label[for="setTarget"]') == "Hedef kilo (lb)", "3: Profil kilo etiketleri lb")
    pg.screenshot(path=os.path.join(SHOTS, "v53_profil_lb.png"))
    pf_set(pg, "#pfWeight", "176")
    check(st(pg)["weight"] == 79.832 and pg.input_value("#pfWeight") == "176", "3: Profil kilo 176 lb → 79,832 kg, kutu 176 (%s)" % st(pg)["weight"])
    pf_set(pg, "#pfWeight", "176"); pf_set(pg, "#setAge", "41")
    check(st(pg)["weight"] == 79.832 and st(pg)["settings"]["height"] == 180, "3: aynı değer yeniden yazılınca / başka alan değişince kilo ve boy kaymaz")
    pf_set(pg, "#setHeightFt", "5"); pf_set(pg, "#setHeightIn", "9")
    check(st(pg)["settings"]["height"] == 175.3, "3: boy 5 ft 9 in → 175,3 cm (%s)" % st(pg)["settings"]["height"])
    pf_set(pg, "#setAge", "42"); pf_set(pg, "#setTarget", "160")
    s = st(pg)
    check(s["settings"]["height"] == 175.3 and s["settings"]["targetWeight"] == 72.575 and pg.input_value("#setTarget") == "160", "3: başka alan değişince boy 175,3 kalır (M1); hedef 160 lb → 72,575 kg (%s, %s)" % (s["settings"]["height"], s["settings"]["targetWeight"]))
    pf_set(pg, "#setHeightIn", "14")
    check(st(pg)["settings"]["height"] == 175.3 and pg.input_value("#setHeightIn") == "9" and "in 0 ile 11" in pg.inner_text(".toast-wrap"), "3: geçersiz inç (14) kaydedilmez, kutu eski değere döner, uyarı")
    pf_set(pg, "#pfWeight", "50")
    check(st(pg)["weight"] == 79.832 and "66,1 lb" in pg.inner_text(".toast-wrap"), "3: 50 lb (< 30 kg) kaydedilmez, sınır lb ile yazılır")
    pf_set(pg, "#pfWeight", "176")
    pg.evaluate("closeProfile()"); pg.wait_for_timeout(60)
    # metrikte kayıtlı 175,3 boy Profil'de başka alan değişince yuvarlanmaz
    pg.evaluate("setUnits('metric')"); pg.evaluate("openProfile()"); pg.wait_for_timeout(80)
    check(pg.is_visible("#setHeight") and pg.is_visible('label[for="setHeight"]') and not pg.is_visible("#pfHeightImp") and pg.inner_text('label[for="pfWeight"]') == "Güncel kilo (kg)", "3: metrikte tek boy kutusu, kg etiketleri geri geldi")
    pf_set(pg, "#setAge", "43")
    check(st(pg)["settings"]["height"] == 175.3 and st(pg)["weight"] == 79.832 and st(pg)["settings"]["targetWeight"] == 72.575, "3: metrikte de kutudaki 175.3 / 79,8 / 72,6 aynen kalır (lb kökenli kg yuvarlanmaz)")
    pf_set(pg, "#setHeight", "176")
    check(st(pg)["settings"]["height"] == 176, "3: metrikte yeni boy yazılınca eskisi gibi tam sayı")
    pf_set(pg, "#setHeight", "175,3")
    pg.evaluate("closeProfile()"); pg.evaluate("setUnits('imperial')"); pg.wait_for_timeout(80)
    # tartı penceresi lb
    pg.evaluate("switchTab('progress'); setProgressView('genel')"); pg.wait_for_timeout(80)
    pg.evaluate("void progLogWeight()"); pg.wait_for_timeout(100)
    dlg = pg.evaluate("[uiDlgMsg.textContent, uiDlgInput.value, uiDlgInput.placeholder]")
    check(dlg == ["Sabah, aç karnına tartıldığın kilo (lb)", "176", "lb"], "3: tartı penceresi lb: %s" % dlg)
    pg.click("#uiDlgOk"); pg.wait_for_timeout(100)
    check(st(pg)["weight"] == 79.832 and st(pg)["weightLogs"][-1]["weight"] == 79.832, "3: tartı penceresinde aynı değer → kg aynen (79,832)")
    pg.evaluate("void progLogWeight()"); pg.wait_for_timeout(100); pg.fill("#uiDlgInput", "230"); pg.click("#uiDlgOk"); pg.wait_for_timeout(100)
    check(st(pg)["weight"] == 104.326 and "230 lb kaydedildi" in pg.inner_text(".toast-wrap"), "3: tartı 230 lb → 104,326 kg, bildirim lb (%s)" % st(pg)["weight"])
    # Menülerim kaydırıcı: kalori açığı kaydırılınca kilo kaymaz; ±0,1 lb
    pg.evaluate("switchTab('nutrition'); setNutriView('menus')"); pg.wait_for_timeout(80)
    sl = pg.evaluate("[+weightSlider.min, +weightSlider.max, weightSlider.value]")
    check(140 <= sl[0] < 230 and sl[1] >= 250 and sl[2] == "230", "3: kilo kaydırıcısı lb: %s" % sl)
    pg.evaluate("deficitSlider.value = 600; updateProfile()"); pg.wait_for_timeout(60)
    check(st(pg)["weight"] == 104.326 and st(pg)["deficit"] == 600, "3: kalori açığı kaydırılınca kilo aynen")
    pg.evaluate("weightSlider.value = 220; updateProfile()"); pg.wait_for_timeout(60)
    check(st(pg)["weight"] == 99.79 and pg.inner_text("#weightVal") == "220", "3: kaydırıcı 220 lb → 99,79 kg (%s)" % st(pg)["weight"])
    pg.evaluate("adjustWeight(0.1)"); pg.wait_for_timeout(60)
    check(pg.inner_text("#weightVal") == "220,1" and pg.inner_text("#weightUnit") == "lb" and pg.get_attribute("button[onclick='adjustWeight(0.1)']", "aria-label") == "0,1 lb artır", "3: ±0,1 lb düğmesi ve etiketi")
    # ölçü penceresi in
    pg.evaluate("openMeasureModal()"); pg.wait_for_timeout(60)
    check(pg.inner_text("#chartTitle") == "Ölçü ekle (in)" and pg.input_value("#ms_bel") == "38", "3: ölçü penceresi in (96,4 cm → 38 in): %s" % pg.input_value("#ms_bel"))
    before_m = st(pg)["measurements"][-1]
    pg.evaluate("saveMeasurement()"); pg.wait_for_timeout(60)
    after_m = st(pg)["measurements"][-1]
    check(after_m["bel"] == before_m["bel"] and after_m["kol"] == before_m["kol"], "3: ölçüler değiştirilmeden kaydedilince cm aynen (%s → %s)" % (before_m, after_m))
    pg.evaluate("openMeasureModal()"); pg.wait_for_timeout(60); pg.fill("#ms_bel", "32,5"); pg.evaluate("saveMeasurement()"); pg.wait_for_timeout(60)
    check(st(pg)["measurements"][-1]["bel"] == 82.55 and st(pg)["measurements"][-1]["kol"] == before_m["kol"], "3: bel 32,5 in → 82,55 cm, dokunulmayan kol aynen")
    pg.evaluate("openMeasureModal()"); pg.wait_for_timeout(60); pg.fill("#ms_bel", "2"); pg.fill("#ms_kol", ""); pg.evaluate("saveMeasurement()"); pg.wait_for_timeout(80)
    check("3,9–98,4 in" in pg.inner_text("#uiDlgMsg"), "3: ölçü sınırı in ile: %s" % pg.inner_text("#uiDlgMsg"))
    pg.click("#uiDlgOk"); pg.evaluate("closeModal('chartModal')"); pg.wait_for_timeout(60)
    # İngilizce + lb
    pg.evaluate("setLang('en')"); pg.wait_for_timeout(80)
    e3 = b_text(pg)
    check("lb/week" in e3["coach"] and "lb" in e3["menus"] and " kg" not in e3["menus"] + e3["kilo"], "3: İngilizce + lb (lb/week): %s" % e3["coach"][-200:])
    pg.evaluate("setLang('tr')"); pg.wait_for_timeout(60)
    pg.evaluate("switchTab('progress'); setProgressView('kilo')"); pg.wait_for_timeout(80)
    pg.screenshot(path=os.path.join(SHOTS, "v53_kilo_lb.png"))
    c.close()
    # metrik → imperial → metrik: ekran aynı, kayıt aynı (Profil kaydı ve kaydırıcı dokunuşu dahil)
    c, pg = ctx(); pg.goto(URL); boot(pg); pg.evaluate(SETUP3); pg.wait_for_timeout(100)
    a0 = b_text(pg); sa = st(pg)
    pg.evaluate("setUnits('imperial')"); pg.wait_for_timeout(60); b_text(pg)
    pg.evaluate("openProfile()"); pg.wait_for_timeout(60); pg.evaluate("saveSettings(); closeProfile()"); pg.wait_for_timeout(60)
    pg.evaluate("switchTab('nutrition'); setNutriView('menus')"); pg.wait_for_timeout(60); pg.evaluate("updateProfile()"); pg.wait_for_timeout(60)
    pg.evaluate("setUnits('metric')"); pg.wait_for_timeout(60)
    a1 = b_text(pg); sb = st(pg)
    dif = [k for k in a0 if a0[k] != a1[k]]
    check(not dif, "3: metrik → imperial → metrik: ekran metinleri aynı: %s" % dif)
    check(all(sa.get(k) == sb.get(k) for k in ("weight", "weightLogs", "measurements")) and sa["settings"]["height"] == sb["settings"]["height"] and sa["settings"]["targetWeight"] == sb["settings"]["targetWeight"], "3: metrik → imperial → metrik: kilo / boy / hedef / ölçü kaydı aynı")
    c.close()
    c, pg = ctx(); pg.goto(URL); boot(pg); pg.evaluate("setUnits('imperial')"); pg.wait_for_timeout(60)
    tg = pg.evaluate("getTargets()")
    check([tg["calTarget"], tg["proTarget"], tg["fatTarget"], tg["carbTarget"]] == [2478, 180, 69, 284], "3: sahip fikstürü imperial'de hedefler 2478 / 180 / 69 / 284")
    c.close()
    check(errs == [], "sayfa hatası yok: " + str(errs[:3]))
    b.close()
finally:
    srv.terminate()
print("BAŞARISIZ:" if fails else "TÜMÜ GEÇTİ", fails)
sys.exit(1 if (fails or errs) else 0)
