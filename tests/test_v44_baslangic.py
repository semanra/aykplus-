# v44 bölüm 1: yeni kurulumu tanıma (settings.onboarded, veri sürümü 4), test fikstürü ve kancası.
import os, sys, json, subprocess, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT, SPLASH_OFF, FIXTURE
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8803'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = "http://localhost:8803/index.html"
KEY = "ayk_plus_v5_state"
def st(pg): return pg.evaluate("aykStoredState()")
STUB = """(() => { try { const m = sessionStorage.getItem('stub'); if (m === 'hang') indexedDB.open = () => ({}); // hiç yanıt vermez
  if (m === 'get') IDBObjectStore.prototype.get = function () { throw new Error('gecici hata'); }; } catch (e) {} })()"""
def boot(pg): pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(80)

try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    def page_fresh():   # TEST_INIT YOK: yalnızca açılış animasyonu kaldırılır
        ctx = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844})
        ctx.add_init_script(SPLASH_OFF)
        ctx.add_init_script(STUB)
        pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(URL); boot(pg)
        return pg
    def seed(pg, data):
        pg.evaluate("s => { localStorage.clear(); void indexedDB.deleteDatabase('aykplus'); localStorage.setItem('%s', s); }" % KEY, json.dumps(data))
        pg.reload(); boot(pg)

    pg = page_fresh()
    s = st(pg)
    check(s["settings"]["onboarded"] is False and s["dataVer"] == 4, "yeni kurulum: onboarded false, dataVer 4")
    pg.reload(); boot(pg)
    check(st(pg)["settings"]["onboarded"] is False, "kurulum bitmeden yeniden açılınca yine onboarded false")
    OWNER43 = json.load(open(FIXTURE, encoding="utf-8")); OWNER43["dataVer"] = 3
    seed(pg, OWNER43); check(st(pg)["settings"]["onboarded"] is True and st(pg)["dataVer"] == 4, "v43 kaydı: onboarded true")
    check(st(pg)["weight"] == OWNER43["weight"], "v43 kaydı: veri aynı")
    seed(pg, {**OWNER43, "dataVer": 2}); check(st(pg)["settings"]["onboarded"] is True, "v42 kaydı: onboarded true")
    # v4 kaydı
    pg.evaluate("s => { localStorage.clear(); void indexedDB.deleteDatabase('aykplus'); localStorage.setItem('ayk_plus_v4_state', s); }", json.dumps({"weight": 90, "meals": OWNER43["meals"]}))
    pg.reload(); boot(pg)
    check(st(pg)["settings"]["onboarded"] is True and st(pg)["weight"] == 90, "v4 kaydı: kurulum yok, kilo 90")
    # bozuk kayıt
    pg.evaluate("() => { localStorage.clear(); void indexedDB.deleteDatabase('aykplus'); localStorage.setItem('ayk_plus_v5_state', '{bozuk'); }")
    pg.reload(); boot(pg)
    check(pg.evaluate("state.settings.onboarded") is True, "bozuk kayıt: kurulum yok (kurtarma akışı)")
    # IndexedDB'de veri var, localStorage silinmiş
    seed(pg, OWNER43); pg.evaluate("() => { localStorage.removeItem('ayk_plus_v5_state'); localStorage.removeItem('ayk_plus_v5_sira'); localStorage.removeItem('ayk_plus_v5_imza'); }")
    pg.reload(); boot(pg)
    check(pg.evaluate("state.settings.onboarded") is True and pg.evaluate("state.weight") == OWNER43["weight"], "yalnızca IndexedDB: kurulum yok, veri aynı")
    # geçici IndexedDB hatası + localStorage boş: kurulum açılmaz (dataVer <= 3 sahibi hiçbir yolda görmez)
    for mode, lbl in (("hang", "IndexedDB açılışı zaman aşımı"), ("get", "IndexedDB okuma hatası")):
        seed(pg, OWNER43)
        pg.evaluate("m => { sessionStorage.setItem('stub', m); localStorage.clear(); }", mode)
        pg.reload(); pg.wait_for_function("window.aykBooted === true", timeout=20000); pg.wait_for_timeout(80)
        check(pg.evaluate("state.settings.onboarded") is True, lbl + " + boş localStorage: kurulum yok")
        pg.evaluate("sessionStorage.removeItem('stub')")
    pg.evaluate("sessionStorage.removeItem('stub')")
    seed(pg, OWNER43); pg.evaluate("() => { localStorage.removeItem('ayk_plus_v5_state'); localStorage.removeItem('ayk_plus_v5_sira'); localStorage.removeItem('ayk_plus_v5_imza'); }")
    pg.reload(); boot(pg)
    # fabrika ayarları
    pg.evaluate("void resetToDefaults()"); pg.click("#uiDlgOk"); pg.wait_for_timeout(80); pg.click("#uiDlgOk"); pg.wait_for_timeout(300)
    check(pg.evaluate("state.settings.onboarded") is False, "fabrika ayarları: kurulum yeniden açılacak")
    # kanca: aynı tarayıcıda TEST_INIT'li yeni bağlam
    ctx2 = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}); ctx2.add_init_script(TEST_INIT)
    pg2 = ctx2.new_page(); pg2.on("pageerror", lambda e: errs.append(str(e)))
    pg2.goto(URL); boot(pg2)
    check(pg2.evaluate("state.settings.onboarded") is True and pg2.evaluate("state.weight") == 105, "test kancası: eski varsayılanlarla, kurulumsuz")
    check(pg2.evaluate("freshInstall") is False, "test kancası: freshInstall false")
    check(pg2.evaluate("state.settings.onboarded") is True and st(pg2)["settings"]["onboarded"] is True, "test kancası: kayıt da onboarded true")
    # ---- Bölüm 2: genel varsayılanlar ve boş durumlar ----
    pg = page_fresh(); errs.clear()
    s = st(pg)
    check(s["meals"] == [] and s["restMeals"] == [] and s["supplementList"] == [] and s["weightLogs"] == [], "yeni kurulum: liste yok")
    check(len(s["workoutDays"]) == 1 and s["workoutDays"][0]["exercises"] == [] and s["mobilityRoutine"]["routines"] == [], "tek boş gün, rutin yok")
    check(s["weight"] == 70 and s["settings"]["height"] == 170 and s["settings"]["age"] == 30 and s["settings"]["targetWeight"] == 70 and s["settings"]["goal"] == "keep"
          and s["deficit"] == 0 and s["settings"]["waterTarget"] == 2.5 and s["settings"]["sex"] == "male", "genel değerler tabloya uygun")
    src = open(os.path.join(REPO, "src", "data.js"), encoding="utf-8").read() + open(os.path.join(REPO, "src", "app", "01-temel.js"), encoding="utf-8").read()
    check("Üst Vücut A" not in src and "Kas Onarımı" not in src and "🥬 Greens" not in src, "sahibin varsayılanları kodda yok")
    pg.evaluate("state.settings.onboarded = true; renderAll()")   # kurulum ekranı olmadan boş uygulamayı gez
    SCREENS = ["switchTab('nutrition'); setNutriView('today')", "setNutriView('menus')", "setNutriView('foods')", "setNutriView('history')", "openShopList(); closeModal('shopModal')",
               "switchTab('gym'); state.gymView='today'; renderAll()", "state.gymView='program'; renderAll()", "state.gymView='library'; renderAll()", "state.gymView='history'; renderAll()",
               "switchTab('mobility')", "switchTab('progress'); setProgressView('genel')", "setProgressView('kilo')", "setProgressView('guc')", "setProgressView('beslenme')", "openProfile()"]
    for js in SCREENS: pg.evaluate(js); pg.wait_for_timeout(60)
    check(errs == [], "boş başlangıçta bütün ekranlar hatasız: " + str(errs[:3]))
    pg.evaluate("closeProfile(); switchTab('nutrition'); setNutriView('menus')")
    check(pg.is_visible("#mealsContainer [data-empty-menu]") and "İlk öğününü ekle" in pg.inner_text("#mealsContainer [data-empty-menu]"), "Menülerim boş kartı")
    pg.evaluate("setNutriView('today')"); check(pg.is_visible("#todayMeals [data-empty-menu]"), "Bugün boş kartı")
    pg.screenshot(path=os.path.join(REPO, "tests", "shots", "v44_bos_bugun_koyu.png"))
    pg.evaluate("setNutriView('menus')"); pg.screenshot(path=os.path.join(REPO, "tests", "shots", "v44_bos_menu_koyu.png"))
    pg.evaluate("switchTab('gym'); state.gymView='today'; renderAll()")
    check(pg.is_visible("[data-empty-day]") and "İlk hareketini ekle" in pg.inner_text("[data-empty-day]"), "hareketsiz gün kartı")
    pg.screenshot(path=os.path.join(REPO, "tests", "shots", "v44_bos_gun_koyu.png"))
    pg.evaluate("setTheme('light'); switchTab('nutrition'); setNutriView('today')"); pg.wait_for_timeout(100)
    pg.screenshot(path=os.path.join(REPO, "tests", "shots", "v44_bos_bugun_acik.png"))
    pg.evaluate("setNutriView('menus')"); pg.screenshot(path=os.path.join(REPO, "tests", "shots", "v44_bos_menu_acik.png"))
    pg.evaluate("switchTab('gym'); state.gymView='today'; renderAll()"); pg.wait_for_timeout(100)
    pg.screenshot(path=os.path.join(REPO, "tests", "shots", "v44_bos_gun_acik.png"))
    for sel in ("#mealsContainer [data-empty-menu] button", "[data-empty-day] button"):
        pg.evaluate("switchTab('nutrition'); setNutriView('menus')" if "menu" in sel else "switchTab('gym'); state.gymView='today'; renderAll()")
        bb = pg.locator(sel).first.bounding_box(); check(bb and bb["height"] >= 44, "44 px düğme: " + sel)
    # eksik listeli eski kayıt (spec §6.4 doğrulaması)
    seed(pg, {"weight": 88, "dataVer": 1, "settings": {"age": 40}})
    check(st(pg)["weight"] == 88 and st(pg)["settings"]["onboarded"] is True and errs == [], "listeleri eksik eski kayıt hatasız açılır")
    # ---- Bölüm 3: örnek içerik üreticileri ----
    pg = page_fresh()
    for cal in (1600, 2400, 3200):
        menu = pg.evaluate(f"buildSampleMenu({cal})")
        kcal = pg.evaluate("m => nutritionTotals(m).cal", menu)
        check(len(menu) == 4 and abs(kcal - cal) / cal <= 0.08, f"örnek menü {cal} kcal ±%8 (çıkan {kcal})")
        check(pg.evaluate("m => m.every(x => x.items.every(i => getFoodDB()[i.foodId] && !isHiddenFood(getFoodDB()[i.foodId])))", menu), "menü besinleri var ve gizli değil")
        check(pg.evaluate("m => normMealList(JSON.parse(JSON.stringify(m))).every((x, i) => x.items.length === m[i].items.length && x.items.every(it => it.amount > 0))", menu), f"menü {cal}: normMealList biçimi, miktarlar pozitif")
    ids = pg.evaluate("() => [...buildSampleMenu(2000), ...buildSampleMenu(2000)].map(m => m.id)")
    check(len(set(ids)) == 8, "iki çağrıda öğün kimlikleri çakışmaz")
    lib = pg.evaluate("Object.values(EXERCISE_LIBRARY).flat()")
    for lvl, n in (("new", 3), ("pro", 4)):
        days = pg.evaluate(f"samplePrograms('{lvl}')")
        check(len(days) == n and all(5 <= len(d["exercises"]) <= 9 for d in days), f"{lvl}: {n} gün")
        check(all(e["name"] in lib for d in days for e in d["exercises"]), f"{lvl}: hareketler kütüphanede")
        check(all(s.get("kg", 0) == 0 for d in days for e in d["exercises"] for s in e["sets"]), f"{lvl}: kilolar 0")
        check(pg.evaluate("d => JSON.stringify(d.map(x => x.exercises.map(e => e.sets.length))) === JSON.stringify(normalizeState({workoutDays: JSON.parse(JSON.stringify(d))}).workoutDays.map(x => x.exercises.map(e => e.sets.length)))", days), f"{lvl}: normalizeState'ten aynen çıkar")
    names = pg.evaluate("() => samplePrograms('new').map(d => d.name).concat(samplePrograms('pro').map(d => d.name))")
    check(names[:3] == ["1. Gün: Tüm Vücut A", "2. Gün: Tüm Vücut B", "3. Gün: Tüm Vücut C"] and names[3] == "1. Gün: Üst Vücut A" and names[6] == "4. Gün: Alt Vücut B", "gün adları")
    r = pg.evaluate("sampleMobility()")
    check(r["name"] == "Günlük esneme" and 6 <= len(r["items"]) <= 8 and len({i["type"] for i in r["items"]}) >= 2, "mobilite rutini")
    check(pg.evaluate("r => normalizeState({mobilityRoutine:{routines:[r]}}).mobilityRoutine.routines[0].items.length", r) == len(r["items"]), "rutin normalizeState'ten sağ çıkar")
    mlib = pg.evaluate("() => Object.values(MOBILITY_LIBRARY).flat().map(x => x.name)")
    check(all(i["name"] in mlib for i in r["items"]), "rutin hareketleri kütüphanede")
    check(errs == [], "bölüm 3 sayfa hatası yok")
    b.close()
finally:
    srv.terminate()
print("sayfa hataları:", errs)
print("BAŞARISIZ:" if fails else "TÜMÜ GEÇTİ", fails)
sys.exit(1 if (fails or errs) else 0)
