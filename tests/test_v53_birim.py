# v53 bölüm 1 (görev 1): birim katmanı (settings.units = metric | imperial), göç adımı 6, yeni kurulumda bölgeye göre birim,
# Profil ve kurulumda "Birim" seçicisi. Kayıt her zaman kg / cm; yalnız gösterim ve giriş çevrilir.
import os, sys, json, subprocess, time
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
    check(errs == [], "sayfa hatası yok: " + str(errs[:3]))
    b.close()
finally:
    srv.terminate()
print("BAŞARISIZ:" if fails else "TÜMÜ GEÇTİ", fails)
sys.exit(1 if (fails or errs) else 0)
