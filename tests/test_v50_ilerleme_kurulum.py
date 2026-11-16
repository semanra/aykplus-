# v50 bölüm 1 (görev 1): örnek içerik üreticileri dile göre, kayıt kuralları.
# v50 bölüm 2 (görev 2): İlerleme (4 alt sekme, grafik penceresi) ve kalori koçu İngilizce.
import os, sys, re, subprocess, time, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8808'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = "http://localhost:8808/index.html"
def boot(pg): pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(80)
try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, locale="en-US")
    ctx.add_init_script(TEST_INIT); ctx.add_init_script("window.AYK_TEST_EN = true")
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL); boot(pg)
    def setlang(l): pg.evaluate("() => { state.settings.lang = '%s'; applyStaticI18n(); renderAll(); }" % l)
    # ===== Bölüm 1 (görev 1)
    PROG = """lv => samplePrograms(lv).map(d => ({ name: d.name, ex: d.exercises.map(e => ({ n: e.name, k: e.kind || 'weight', ti: e.targetInfo, note: e.note, tg: e.sets[0].target })) }))"""
    setlang('tr')
    mt = pg.evaluate("buildSampleMenu(2200).map(m => m.title)")
    check(mt == ["Kahvaltı", "Öğle yemeği", "Ara öğün", "Akşam yemeği"], "tr: öğün başlıkları: %s" % mt)
    tn_ = [d["name"] for d in pg.evaluate(PROG, "new")]
    tp = [d["name"] for d in pg.evaluate(PROG, "pro")]
    check(tn_ == ["1. Gün: Tüm Vücut A", "2. Gün: Tüm Vücut B", "3. Gün: Tüm Vücut C"] and tp == ["1. Gün: Üst Vücut A", "2. Gün: Alt Vücut A", "3. Gün: Üst Vücut B", "4. Gün: Alt Vücut B"], "tr: gün adları bayt bayt")
    trn = pg.evaluate(PROG, "new")
    check(trn[0]["ex"][0]["note"] == "Hedef: 3 Set x 8–12 Tekrar" and trn[0]["ex"][0]["ti"] == "3x8–12", "tr: hareket notu/targetInfo")
    check(pg.evaluate("sampleMobility().name") == "Günlük esneme", "tr: rutin adı")
    setlang('en')
    mt = pg.evaluate("buildSampleMenu(2200).map(m => m.title)")
    check(mt == ["Breakfast", "Lunch", "Snack", "Dinner"], "en: öğün başlıkları: %s" % mt)
    en_n = pg.evaluate(PROG, "new"); en_p = pg.evaluate(PROG, "pro")
    check([d["name"] for d in en_n] == ["Day 1: Full Body A", "Day 2: Full Body B", "Day 3: Full Body C"], "en: new gün adları")
    check([d["name"] for d in en_p] == ["Day 1: Upper Body A", "Day 2: Lower Body A", "Day 3: Upper Body B", "Day 4: Lower Body B"], "en: pro gün adları")
    check(all(":" in d["name"] for d in en_n + en_p), "en: gün adlarında ':' var")
    check(pg.evaluate("samplePrograms('new').map(d => d.name.split(':')[0])") == ["Day 1", "Day 2", "Day 3"], "en: gün çipi kısa etiketi")
    ex = en_n[0]["ex"]
    check(ex[0]["note"] == "Target: 3 sets x 8–12 reps", "en: hareket notu: %r" % ex[0]["note"])
    plank = [e for e in ex if e["k"] == "time"][0]
    check(plank["ti"] == "3x30 sn" and plank["tg"] == "30 sn" and plank["note"] == "", "en: süreli targetInfo/set.target Türkçe 'sn': %s" % plank)
    check(ex[0]["ti"] == "3x8–12", "en: ağırlık targetInfo")
    check(pg.evaluate("sampleMobility().name") == "Daily stretching", "en: rutin adı")
    # (e) normalizeState: kind'ı time'a çevrilen ve notu 'Target: ' olan hareketin notu silinir
    r = pg.evaluate("""() => { const ex = { name: 'Plank', note: 'Target: 3 sets x 8–12 reps', sets: [{}, {}, {}] }; normalizeExercise(ex); return [ex.kind, ex.note]; }""")
    check(r == ["time", ""], "en: 01 kalıbı 'Target:' notunu siler: %s" % r)
    r = pg.evaluate("""() => { const ex = { name: 'Plank', note: 'Hedef: 3 Set x 8–12 Tekrar', sets: [{}, {}, {}] }; normalizeExercise(ex); return [ex.kind, ex.note]; }""")
    check(r == ["time", ""], "tr: 01 kalıbı 'Hedef:' notunu siler: %s" % r)
    # ===== Bölüm 2 (görev 2): İlerleme + koç
    TODAY = datetime.date.today(); NOW_MS = int(time.time() * 1000); DAY = 86400000
    def dkey(n): return (TODAY - datetime.timedelta(days=n)).isoformat()
    def ts_of(d, h=18):
        ms = int(datetime.datetime(d.year, d.month, d.day, h).timestamp() * 1000)
        if d == TODAY and ms > NOW_MS - 60000:
            midnight = int(datetime.datetime(d.year, d.month, d.day).timestamp() * 1000); ms = max(midnight + 1000, NOW_MS - 60000)
        return ms
    def hist(name, kind, muscle, n, base):
        out = []
        for i in range(n):
            d = TODAY - datetime.timedelta(days=(n - 1 - i) * 3 + 1)
            if kind == "weight": sets = [{"kg": base + i * 2.5, "reps": 8}, {"kg": base + i * 2.5, "reps": 6}]
            elif kind == "time": sets = [{"sec": 30 + i * 5}, {"sec": 40 + i}]
            else: sets = [{"min": 20 + i, "km": 3 + i * 0.2}]
            out.append({"ts": ts_of(d), "logId": name + str(i), "kind": kind, "name": name, "muscle": muscle, "sets": sets})
        return out
    MON = TODAY - datetime.timedelta(days=TODAY.weekday())
    def lg(n, per_week, w0=100): return [{"date": "x", "weight": round(w0 + per_week * (i * 3.0 / 7), 2), "ts": NOW_MS - (n - 1 - i) * 3 * DAY} for i in range(n)]
    wl = lg(10, -0.3)
    wl[4]["bf"] = 22
    H = {"barbell bench press": hist("Barbell Bench Press", "weight", "Göğüs", 6, 80), "back squat": hist("Back Squat", "weight", "Ön Bacak", 5, 100),
         pg.evaluate("exKey('Şınav')"): hist("Şınav", "weight", "Göğüs", 4, 10), "plank": hist("Plank", "time", "Karın", 5, 0), "bike": hist("Bike", "cardio", "", 5, 0), "row": hist("Row", "weight", "Sırt", 4, 60)}
    wd = [MON + datetime.timedelta(days=i) for i in (0, 2) if MON + datetime.timedelta(days=i) <= TODAY]
    wlogs = [{"id": "w%d" % i, "ts": ts_of(d), "volume": 5000 + i * 100, "cardioMin": 15, "cardioKm": 2, "prs": 1} for i, d in enumerate(wd)]
    dl = {dkey(i): {"kcal": 2400, "p": 180, "eatenKcal": 2900 if i == 2 else 2400, "eatenP": 190, "mealsDone": 0 if i == 3 else 4, "mealsTotal": 4, "water": 3, "calTarget": 2400, "proTarget": 180} for i in range(1, 25)}
    meas = [{"ts": NOW_MS - 20 * DAY, "bel": 100, "kol": 40}, {"ts": NOW_MS - 10 * DAY, "bel": 99, "kol": 40.2}, {"ts": NOW_MS - 5 * DAY, "bel": 98.8, "kol": 40.3}, {"ts": NOW_MS - 2 * DAY, "bel": 98.5, "kol": 40.5}]
    pg.evaluate("""d => { Object.assign(state, d.top); Object.assign(state.settings, d.set); state.activeTab = 'progress'; renderAll(); }""",
                {"top": {"weightLogs": wl, "weight": wl[-1]["weight"], "exerciseHistory": H, "workoutLogs": wlogs, "dailyLogs": dl, "measurements": meas, "mobilityLog": {dkey(1): ["Couch Stretch"]}}, "set": {"targetWeight": 85, "bodyFat": 22, "targetBodyFat": 15}})
    USER = ["Şınav"]
    TRL = re.compile("[çğıöşüÇĞİÖŞÜ]")
    def vis(sel):   # görünen metin + aria-label'lar, kullanıcı verisi ayıklanmış
        t_ = pg.evaluate("""s => { const e = document.querySelector(s); if (!e) return ''; const a = [...e.querySelectorAll('[aria-label]')].map(x => x.getAttribute('aria-label')); return e.innerText + ' ' + a.join(' ') + ' ' + (e.getAttribute('aria-label') || ''); }""", sel)
        for u in USER: t_ = t_.replace(u, "")
        return t_
    def plain(h): return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", h))
    pg.evaluate("switchTab('progress')")
    setlang('en')
    nav = pg.evaluate("[...document.querySelectorAll('#progNav button')].map(b => b.textContent.trim())")
    check(nav == ["Overview", "Weight", "Strength", "Nutrition"], "en: dört alt sekme adı: %s" % nav)
    check(pg.evaluate("document.getElementById('progNav').getAttribute('aria-label')") == "Progress sections", "en: alt sekme çubuğu aria-label")
    for v, must in (("genel", ["Workouts", "Calories on target", "Mobility", "Log weigh-in", "Calorie coach", "This week, day by day", "Mo: ", "done / on target", "off target"]),
                    ("kilo", ["7-day average", "Daily weigh-in", "Recent weigh-ins", "Measurements", "Add measurement", "To goal", "Body fat", "Lean body mass", "Delete weigh-in", "Waist"]),
                    ("guc", ["Exercise progress", "Choose exercise", "Personal records", "Sets per muscle this week", "Weekly volume", "Workout calendar", "Recent entries", "e1RM"]),
                    ("beslenme", ["7 days", "14 days", "30 days", "Water and nutrition history", "Calories on target", "Protein on target", "Water on target", "Day-by-day list", "Eaten"])):
        pg.evaluate("v => setProgressView(v)", v); pg.wait_for_timeout(120)
        txt = vis("#progressContent")
        miss = [m for m in must if m not in txt]
        check(not miss, "en: %s sekmesi beklenen metinler (eksik: %s)" % (v, miss))
        check(not TRL.search(txt), "en: %s sekmesinde Türkçe harf yok: %s" % (v, re.findall(r".{0,25}[çğıöşüÇĞİÖŞÜ].{0,25}", txt)[:3]))
        check(pg.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth"), "en: %s yatay taşma yok" % v)
        small = pg.evaluate("""() => [...document.querySelectorAll('#progressContent button, #progressContent select, #progressContent summary')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.width < 44 || r.height < 44); }).map(e => (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 24))""")
        check(small == [], "en: %s dokunma alanı >= 44 px: %s" % (v, small))
    # Güç: farklı hareket türleri (süreli, kardiyo) ve Beslenme aralıkları
    for k in ("plank", "bike", pg.evaluate("exKey('Şınav')")):
        pg.evaluate("k => { progressSel = k; setProgressView('guc'); }", k); pg.wait_for_timeout(80)
        txt = vis("#pExChart")
        check(not TRL.search(txt) and ("longest set" in txt or "Total distance" in txt or "e1RM" in txt), "en: Güç grafiği (%s): %s" % (k, txt[:400].replace("\n", " ")))
    pg.evaluate("histRange = 30; setProgressView('beslenme')")
    check(not TRL.search(vis("#progressContent")), "en: Beslenme 30 gün Türkçe harf yok")
    pg.evaluate("histRange = 14")
    # eski grafik penceresi (openExerciseChart) + başlık/kapat düğmesi
    pg.evaluate("switchTab('gym'); const ex = activeDay().exercises[0]; ex.name = 'Barbell Bench Press'; openExerciseChart(0)"); pg.wait_for_timeout(120)
    txt = vis("#chartModal")
    check("recent entries" in txt.lower() and "Estimated 1RM" in txt and "Close" in txt, "en: grafik penceresi metinleri: %s" % txt[:80].replace("\n", " "))
    check(not TRL.search(txt.replace("Barbell Bench Press", "")), "en: grafik penceresi Türkçe harf yok")
    pg.evaluate("closeModal('chartModal')")
    check("No entries for this exercise yet" in pg.evaluate("exerciseChartHtml('Yok Hareket')"), "en: grafik penceresi boş durum")
    one = pg.evaluate("lineChart([{y: 5, label: 'a'}], 'red', 'dk')")
    check("Currently: 5 min" in one and not TRL.search(plain(one)), "en: lineChart tek nokta, birim dk -> min: %s" % plain(one))
    # Tartı penceresi
    pg.evaluate("switchTab('progress'); setProgressView('genel')")
    pg.evaluate("void progLogWeight()"); pg.wait_for_timeout(150)
    dlg = pg.inner_text("#uiDialog")
    check("Today's weigh-in" in dlg and "before eating" in dlg and not TRL.search(dlg), "en: tartı penceresi: %s" % dlg.replace("\n", " ")[:90])
    pg.fill("#uiDlgInput", "5"); pg.click("#uiDlgOk"); pg.wait_for_timeout(150)
    dlg = pg.inner_text("#uiDialog")
    check("Invalid weight" in dlg and "96.4" in dlg and not TRL.search(dlg), "en: geçersiz kilo uyarısı: %s" % dlg.replace("\n", " ")[:90])
    pg.click("#uiDlgOk"); pg.wait_for_timeout(100)
    # Koç: üç durum + veri yok (çoğul)
    SC = {"fast": ("lose", lg(10, -1.6)), "notgain": ("gain", lg(10, 0.0)), "drift": ("keep", lg(10, 0.5)), "ready0": ("lose", lg(2, -0.5)), "ready1": ("lose", lg(1, 0))}
    OUT = {}
    for nm, (goal, logs) in SC.items():
        OUT[nm] = pg.evaluate("""([goal, logs]) => { state.settings.goal = goal; state.weightLogs = logs; state.weight = logs[logs.length - 1].weight; state.settings.coachAppliedAt = 0; state.settings.calAdjust = 0;
          const a = coachAnalysis(); return { html: progCoachHtml(), hint: coachHintText(), a: { ready: a.ready, tooFast: a.tooFast, notGaining: a.notGaining, keepDrift: a.keepDrift, delta: a.delta } }; }""", [goal, logs])
        txt = plain(OUT[nm]["html"])
        check(not TRL.search(txt) and not TRL.search(OUT[nm]["hint"]), "en: koç (%s) Türkçe harf yok" % nm)
        check(not re.search(r"\b1 (weeks|days|weigh-ins|workouts|measurements)\b", txt) and "+-" not in txt and "undefined" not in txt and "NaN" not in txt, "en: koç (%s) çoğul/işaret hatası yok" % nm)
    t_ = plain(OUT["fast"]["html"])
    check(OUT["fast"]["a"]["tooFast"] and "You're losing" in t_ and "% of your body weight per week" in t_ and "Suggested target" in t_ and "Apply suggestion" in t_, "en: koç hızlı kilo kaybı: %s" % t_[:200])
    t_ = plain(OUT["notgain"]["html"])
    check(OUT["notgain"]["a"]["notGaining"] and "not gaining weight even though you're in a calorie surplus" in t_ and "Calorie coach" in t_ and "than expected" in t_, "en: koç kilo almıyor: %s" % t_[:200])
    t_ = plain(OUT["drift"]["html"])
    check(OUT["drift"]["a"]["keepDrift"] and "changing by 0.5% per week" in t_ and "You're gaining weight." in t_, "en: koç koruma sapması: %s" % t_[:200])
    check("calorie target by" in OUT["fast"]["hint"], "en: koç ipucu (Beslenme) aynı anahtarlar: %s" % OUT["fast"]["hint"])
    t0 = plain(OUT["ready0"]["html"]); t1 = plain(OUT["ready1"]["html"])
    check("So far: 2 weigh-ins over 3 days." in t0 and "So far: 1 weigh-in." in t1, "en: koç veri yok (çoğul): %s | %s" % (t0[-60:], t1[-40:]))
    # Türkçe: İngilizceye geçip dönmek İlerleme çıktısını değiştirmez; bilinen Türkçe metinler yerinde
    setlang('tr')
    tr1 = pg.evaluate("progGenelHtml() + progKiloHtml() + progGucHtml() + progBeslenmeHtml()")
    setlang('en'); setlang('tr')
    tr2 = pg.evaluate("progGenelHtml() + progKiloHtml() + progGucHtml() + progBeslenmeHtml()")
    check(tr1 == tr2, "tr: İngilizceye geçip dönünce İlerleme çıktısı aynı")
    trt = plain(tr1)
    check(all(x in trt for x in ["Bu hafta, gün gün", "Kalori koçu", "Hareket ilerlemesi", "Haftalık tonaj", "Su ve beslenme geçmişi", "Son tartılar"]) and "Workouts" not in trt and "Weekly" not in trt, "tr: İlerleme Türkçe metinler")
    src = open(os.path.join(REPO, "src", "app", "23-en-ilerleme-kurulum.js"), encoding="utf-8").read()
    keys = [k.replace('\\"', '"') for k in re.findall(r'"((?:[^"\\]|\\.)*)":\s*(?:"|\{)', src)]
    bad = pg.evaluate(r"""ks => ks.filter(k => { const v = EN[k]; const vs = typeof v === 'string' ? [v] : v ? [v.one, v.other] : [];
      return vs.some(x => /[&<>]/.test(String(x).replace(/<\/?b>/g, ''))); })""", keys)
    check(len(keys) >= 10 and bad == [], "en: bu dosyanın değerlerinde & < > yok (%d anahtar): %s" % (len(keys), bad))
    check(errs == [], "sayfa hatası yok: %s" % errs)
    b.close()
finally:
  srv.terminate()
print("\n%d başarısız" % len(fails)); sys.exit(1 if fails else 0)
