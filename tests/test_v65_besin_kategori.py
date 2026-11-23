# v65: Besinler — 14 grup (gösterim eşlemesi), favoriler, süzgeçler (yüksek protein / düşük kalori), gruplu arama
# 1) Her görünür besin bir gruba düşer ("Diğer" yok); kendi besinler grup dışı; çip sayısı ≤ 20
# 2) Grup seçimi listeyi süzer; eski kategori karışıklıkları düzeldi (muz → Meyveler, whey → Takviyeler)
# 3) Favoriler: yıldız (44 px), kayıt, "Favoriler" çipi, çıkarma; eski kayıtta alan yok → []; bozuk alan temizlenir;
#    özel besin silinince favoriden çıkar
# 4) Süzgeçler kategoriyle ve aramayla birlikte çalışır
# 5) "Tümü"nde arama gruplu, en iyi sonuç hâlâ en üstte; kategori seçiliyken başlık yok
# 6) İngilizce adlar; çipler ≥ 44 px
import os, sys, subprocess, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOTS = os.path.join(REPO, "tests", "shots"); os.makedirs(SHOTS, exist_ok=True)
PORT = 8822
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT)], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = f"http://localhost:{PORT}/index.html"
def boot(pg): pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(80)
SMALL = """sel => [...document.querySelectorAll(sel)].filter(e => e.offsetParent).map(e => { const r = e.getBoundingClientRect(); return [e.textContent.trim().slice(0, 20), Math.round(r.height)]; }).filter(x => x[1] < 44)"""
def foods(pg):
    pg.evaluate("switchTab('nutrition'); setNutriView('foods')"); pg.wait_for_timeout(150)
def search(pg, q):
    pg.fill("#foodSearch", q); pg.wait_for_timeout(400)
try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    def ctx(locale="tr-TR", init=TEST_INIT):
        c = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, locale=locale, service_workers="block")
        c.add_init_script(init)
        pg = c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e))); pg.goto(URL); boot(pg)
        return c, pg
    c, pg = ctx()
    pg.wait_for_function("Object.keys(USDA_DB).length > 1000", timeout=8000)

    # --- 1) Eşleme
    info = pg.evaluate("""() => { const db = getFoodDB(); const vis = Object.keys(db).filter(id => !isHiddenFood(db[id]) && !id.startsWith('custom_'));
      const by = {}; vis.forEach(id => { const g = foodGroupOf(id, db[id]); by[g] = (by[g] || 0) + 1; });
      return { other: vis.filter(id => foodGroupOf(id, db[id]) === 'diger').map(id => db[id].cat).slice(0, 5), by, n: vis.length,
               ids: Object.keys(FOOD_ID_GROUP).filter(id => !BASE_FOOD_DB[id]) }; }""")
    check(info["other"] == [], "her görünür besin bir gruba düşer (Diğer'de kalan yok): " + str(info["other"]))
    check(len(info["by"]) == 14, f"14 grubun hepsinde besin var: {sorted(info['by'])}")
    check(info["ids"] == [], "FOOD_ID_GROUP'taki her kimlik uygulamanın listesinde var: " + str(info["ids"]))
    foods(pg)
    chips = pg.locator("#foodCats [data-food-cat]").count()
    check(chips <= 20, f"kategori çipi en fazla 20 (önce ~36): {chips}")
    check(pg.evaluate("[...document.querySelectorAll('#foodCats [data-food-cat]')].map(b => b.textContent).filter(x => /Karbonhidratlar|Kırmızı et|Esnek Diyet/.test(x)).length") == 0,
          "eski kategori adları çipte yok")
    small = pg.evaluate(SMALL, "#foodCats button, #foodFilters button")
    check(small == [], "çipler ≥ 44 px: " + str(small))
    pg.screenshot(path=os.path.join(SHOTS, "v65_besinler.png"))

    # --- 2) Grup süzme
    pg.click("[data-food-cat='g:meyve']"); pg.wait_for_timeout(150)
    ids = pg.evaluate("[...document.querySelectorAll('#foodList [data-food]')].map(e => e.dataset.food)")
    check("muz" in ids or pg.evaluate("isHiddenFood(getFoodDB().muz)"), "Meyveler grubunda muz (eski 'Karbonhidratlar'dan)")
    check(pg.evaluate("ids => ids.every(id => foodGroupOf(id, getFoodDB()[id]) === 'meyve')", ids) and len(ids) > 20, f"grup seçimi yalnız o grubu listeler ({len(ids)})")
    check(pg.evaluate("foodGroupOf('whey_shake', getFoodDB().whey_shake)") == "takviye", "whey shake Takviyeler grubunda")
    check(pg.locator("#foodList [data-food-group]").count() == 0, "kategori seçiliyken grup başlığı yok")

    # --- 3) Favoriler
    pg.click("[data-food-cat='all']"); pg.wait_for_timeout(100)
    pg.evaluate("selectFood('u171077')"); pg.wait_for_timeout(150)
    star = pg.locator("#foodSelCard [data-fav]")
    check(star.count() == 1 and star.get_attribute("aria-pressed") == "false", "seçili besin kartında yıldız (kapalı)")
    bb = star.bounding_box(); check(bb and bb["height"] >= 44 and bb["width"] >= 44, f"yıldız ≥ 44 px ({bb})")
    star.click(); pg.wait_for_timeout(150)
    check(pg.evaluate("state.favFoods") == ["u171077"], "favori kaydedildi: " + str(pg.evaluate("state.favFoods")))
    check(pg.locator("#foodSelCard [data-fav]").get_attribute("aria-pressed") == "true", "yıldız dolu")
    check(pg.evaluate("aykStoredState().then(s => s.favFoods)") == ["u171077"], "favori kalıcı kayıtta")
    check(pg.locator("[data-food-cat='fav']").count() == 1, "\"Favoriler\" çipi çıktı")
    check(pg.evaluate("document.querySelector('#foodCats [data-food-cat]:nth-child(2)').dataset.foodCat") == "fav", "Favoriler, Tümü'nden hemen sonra")
    pg.click("[data-food-cat='fav']"); pg.wait_for_timeout(150)
    check(pg.evaluate("[...document.querySelectorAll('#foodList [data-food]')].map(e => e.dataset.food)") == ["u171077"], "Favoriler yalnız favoriyi listeler")
    pg.screenshot(path=os.path.join(SHOTS, "v65_favori.png"))
    pg.evaluate("selectFood('u171077')"); pg.wait_for_timeout(100)
    pg.click("#foodSelCard [data-fav]"); pg.wait_for_timeout(150)
    check(pg.evaluate("state.favFoods") == [] and pg.locator("[data-food-cat='fav']").count() == 0, "favoriden çıkarınca çip kalkar")
    # özel besin silinince favoriden çıkar
    pg.evaluate("""() => { state.customFoods.custom_test = { name: '⭐ Test', cat: '⭐ Özel Eklediklerim', unit: 'g', step: 10, def: 100, p: 0.2, c: 0.1, f: 0.05 }; invalidateFoodDB(); state.favFoods = ['custom_test', 'u171077']; renderAll(); }""")
    check(pg.evaluate("foodGroupOf('custom_test', getFoodDB().custom_test)") == "", "kendi besin hiçbir gruba girmez (kendi çipinde)")
    pg.evaluate("void deleteCustomFood('custom_test')"); pg.wait_for_timeout(200)
    check(pg.evaluate("state.favFoods") == ["u171077"], "özel besin silinince favoriden de çıkar")
    pg.evaluate("doUndo()"); pg.wait_for_timeout(150)
    check(pg.evaluate("state.favFoods") == ["custom_test", "u171077"], "Geri al favoriyi de geri getirir")

    # --- 4) Süzgeçler
    pg.evaluate("state.favFoods = []; renderAll(); setFoodCat('g:et')"); pg.wait_for_timeout(150)
    n_et = pg.evaluate("document.querySelectorAll('#foodList [data-food]').length")
    pg.click("[data-food-filter='hp']"); pg.wait_for_timeout(150)
    hp = pg.evaluate("[...document.querySelectorAll('#foodList [data-food]')].map(e => e.dataset.food)")
    check(pg.locator("[data-food-filter='hp']").get_attribute("aria-pressed") == "true", "Yüksek protein açık")
    check(len(hp) > 10 and pg.evaluate("ids => ids.every(id => foodHighProtein(getFoodDB()[id]) && foodGroupOf(id, getFoodDB()[id]) === 'et')", hp), f"yüksek protein + grup birlikte ({len(hp)})")
    pg.click("[data-food-filter='lc']"); pg.wait_for_timeout(150)
    both = pg.evaluate("[...document.querySelectorAll('#foodList [data-food]')].map(e => e.dataset.food)")
    check(pg.evaluate("ids => ids.every(id => foodLowCal(getFoodDB()[id]) && foodHighProtein(getFoodDB()[id]))", both) and len(both) < len(hp), f"iki süzgeç birlikte ({len(both)})")
    check(pg.evaluate("foodLowCal(getFoodDB().u171077) === false && foodHighProtein(getFoodDB().u171077) === true"), "tavuk göğsü örneği: yüksek protein, düşük kalori değil (u171077)")
    pg.click("[data-food-filter='lc']"); pg.click("[data-food-filter='hp']"); pg.wait_for_timeout(150)
    check(pg.evaluate("document.querySelectorAll('#foodList [data-food]').length") == n_et, "süzgeçler kapanınca liste eski hâline döner")

    # --- 5) Gruplu arama
    pg.evaluate("setFoodCat('all')"); search(pg, "tavuk")
    heads = pg.evaluate("[...document.querySelectorAll('#foodList [data-food-group]')].map(e => e.dataset.foodGroup)")
    first = pg.evaluate("document.querySelector('#foodList [data-food]').dataset.food")
    plain = pg.evaluate("searchFoods(Object.keys(getFoodDB()).filter(id => !isHiddenFood(getFoodDB()[id])), normSearch('tavuk'))[0]")
    check(len(heads) >= 3 and heads[0] == "_top" and len(set(heads)) == len(heads), f"arama: önce En iyi eşleşmeler, sonra gruplar (her biri bir kez): {heads}")
    top5 = pg.evaluate("[...document.querySelectorAll('#foodList [data-food]')].slice(0, 5).map(e => e.dataset.food)")
    plain5 = pg.evaluate("searchFoods(Object.keys(getFoodDB()).filter(id => !isHiddenFood(getFoodDB()[id])), normSearch('tavuk')).slice(0, 5)")
    check(first == plain and top5 == plain5, f"ilk 5 sonuç arama sırasıyla aynen ({top5[:2]} = {plain5[:2]})")
    search(pg, "brokoli")
    n_res = pg.evaluate("document.querySelectorAll('#foodList [data-food]').length")
    check(n_res > 5 or pg.locator("#foodList [data-food-group]").count() == 0, "az sonuçta (≤ 5) başlık yok")
    search(pg, "tavuk")
    pg.screenshot(path=os.path.join(SHOTS, "v65_arama.png"))
    pg.evaluate("setFoodCat('g:et')"); pg.wait_for_timeout(200)
    check(pg.locator("#foodList [data-food-group]").count() == 0, "kategori seçiliyken aramada başlık yok")
    search(pg, ""); c.close()

    # --- 3b) Eski / bozuk kayıt
    c, pg = ctx()   # tohum (sahibin eski kaydı, tests/fixtures/eski_varsayilan.json) favFoods içermez
    check(pg.evaluate("Array.isArray(state.favFoods) && state.favFoods.length === 0"), "favFoods olmayan kayıt → boş liste")
    out = pg.evaluate("""() => { const s = JSON.parse(JSON.stringify(state)); s.favFoods = ['u171077', 5, null, '', 'u171077', {a: 1}, 'yok_boyle']; return normalizeState(s).favFoods; }""")
    check(out == ["u171077", "yok_boyle"], "bozuk favFoods temizlenir, bulunamayan kimlik silinmez: " + str(out))
    out = pg.evaluate("() => { const s = JSON.parse(JSON.stringify(state)); s.favFoods = 'bozuk'; return normalizeState(s).favFoods; }")
    check(out == [], "dizi olmayan favFoods → []")
    pg.evaluate("state.favFoods = ['yok_boyle']; switchTab('nutrition'); setNutriView('foods')"); pg.wait_for_timeout(150)
    check(pg.locator("[data-food-cat='fav']").count() == 0, "yalnız bulunamayan favori varsa çip çıkmaz")
    c.close()

    # --- 6) İngilizce
    c, pg = ctx(locale="en-US")
    pg.evaluate("setLang('en')"); pg.wait_for_timeout(300); foods(pg)
    labels = pg.evaluate("[...document.querySelectorAll('#foodCats [data-food-cat], #foodFilters button')].map(b => b.textContent.trim())")
    check("Meat, poultry and fish" in labels and "High protein" in labels and "Low calorie" in labels, "İngilizce çip adları: " + str(labels[:6]))
    import re
    tr = [l for l in labels if re.search("[çğıöşüÇĞİÖŞÜ]", l)]
    check(not tr, "İngilizce çiplerde Türkçe yok: " + str(tr))
    small = pg.evaluate(SMALL, "#foodCats button, #foodFilters button")
    check(small == [], "İngilizce çipler ≥ 44 px: " + str(small))
    c.close()
    check(errs == [], "sayfa hatası yok: " + str(errs[:3]))
    b.close()
finally:
    srv.terminate()
print("BAŞARISIZ:" if fails else "TÜMÜ GEÇTİ", fails)
sys.exit(1 if (fails or errs) else 0)
