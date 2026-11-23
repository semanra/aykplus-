# v66: İçecekler ayrı bölüm + markalı içecekler (yalnız üreticinin Türkiye sitesindeki değerler)
# 1) DRINK_DB: 30 ürün, her birinde kaynak/tarih, ml, etiket kalorisi makrolarla tutarlı, kimlikler benzersiz
# 2) Besinler | İçecekler: listeler karışmaz; aramada karşı taraf ipucu; "Markalı" çipi; içecekte gruplu arama yok
# 3) Seçili içecek kartı: kaynak metni, 330 ml kcal; başka taraftaki besin seçilince taraf değişir
# 4) Süzgeç: içecekte Düşük kalori = ≤ 20 kcal / 100 ml; Yüksek protein gizli
# 5) Kendi içeceğin: form Besin/İçecek, ml, drink: true; düzenlemede tür korunur; normalizeState drink alanını temizler
# 6) Barkod: ml ürün (veya İçecekler'de okutulan) içecek olur, etiket kalorisi saklanır; g ürün besin kalır
# 7) İngilizce: adlar, düğmeler, kaynak metni, İngilizce adla arama; 44 px
import os, sys, subprocess, time, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOTS = os.path.join(REPO, "tests", "shots"); os.makedirs(SHOTS, exist_ok=True)
PORT = 8823
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT)], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = f"http://localhost:{PORT}/index.html"
def boot(pg): pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(80)
SMALL = """sel => [...document.querySelectorAll(sel)].filter(e => e.offsetParent).map(e => { const r = e.getBoundingClientRect(); return [e.textContent.trim().slice(0, 20), Math.round(r.height)]; }).filter(x => x[1] < 44)"""
LIST = "[...document.querySelectorAll('#foodList [data-food]')].map(e => e.dataset.food)"
def search(pg, q): pg.fill("#foodSearch", q); pg.wait_for_timeout(400)
try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    def ctx(locale="tr-TR"):
        c = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, locale=locale, service_workers="block")
        c.add_init_script(TEST_INIT)
        pg = c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e))); pg.goto(URL); boot(pg)
        pg.wait_for_function("Object.keys(USDA_DB).length > 1000", timeout=8000)
        return c, pg
    c, pg = ctx()

    # --- 1) Veri
    d = pg.evaluate("""() => { const ids = Object.keys(DRINK_DB); return { n: ids.length,
      bad: ids.filter(id => { const f = DRINK_DB[id]; return !(f.brand && f.srcSite && /^2026-\\d\\d$/.test(f.srcDate) && f.unit === 'ml' && f.drink === true && f.cat === 'İçecekler' && f.kcal >= 0 && f.def > 0); }),
      clash: ids.filter(id => USDA_DB[id] || BASE_FOOD_DB[id] || !id.startsWith('d_')),
      label: ids.filter(id => { const f = DRINK_DB[id]; return f.kcal * 100 >= 5 && labelCheck(f.kcal * 100, f.p * 100, f.c * 100, f.f * 100, 100).length; }),
      en: ids.filter(id => !DRINK_EN[id]) }; }""")
    check(d["n"] == 30, f"30 markalı içecek ({d['n']})")
    check(d["bad"] == [], "her içecekte marka, kaynak sitesi, tarih, ml, drink: " + str(d["bad"]))
    check(d["clash"] == [], "kimlikler d_ ile başlar, USDA/kendi listeyle çakışmaz: " + str(d["clash"]))
    check(d["label"] == [], "etiket kalorisi makrolarla tutarlı (labelCheck): " + str(d["label"]))
    check(d["en"] == [], "her içeceğin İngilizce adı var: " + str(d["en"]))
    check(pg.evaluate("Math.round(DRINK_DB.d_cocacola.kcal * 100) === 42 && DRINK_DB.d_sutas_ayran.p * 100 === 2"), "örnek değerler: Coca-Cola 42 kcal, Sütaş Ayran 2 g protein / 100 ml")

    # --- 2) Ayrım
    pg.evaluate("switchTab('nutrition'); setNutriView('foods')"); pg.wait_for_timeout(150)
    check(pg.locator("#foodKind [data-food-kind='food']").get_attribute("aria-pressed") == "true", "varsayılan Besinler")
    food_ids = pg.evaluate(LIST)
    check(not pg.evaluate("ids => ids.some(id => isDrinkFood(id, getFoodDB()[id]))", food_ids), "Besinler listesinde içecek yok")
    check(pg.locator("[data-food-cat='g:icecek']").count() == 0 and pg.locator("[data-food-cat='brand']").count() == 0, "Besinler'de İçecekler grubu ve Markalı çipi yok")
    search(pg, "fanta")   # ("kola" çikolatayı da bulur)
    check(not pg.evaluate("ids => ids.some(id => isDrinkFood(id, getFoodDB()[id]))", pg.evaluate(LIST)) and pg.locator("[data-food-other]").count() == 1,
          "Besinler'de 'fanta': içecek listelenmez, üstte 'İçeceklerde … sonuç var' düğmesi")
    check("İçeceklerde" in pg.inner_text("[data-food-other]"), "ipucu metni: " + pg.inner_text("[data-food-other]"))
    pg.click("[data-food-other]"); pg.wait_for_timeout(300)
    check(pg.locator("[data-food-other]").count() == 0, "İçecekler'de 'fanta' için Besinler düğmesi yok (orada tam eşleşme yok)")
    ids = pg.evaluate(LIST)
    check(pg.evaluate("foodUI.kind") == "drink" and "d_fanta_portakal" in ids[:5], f"düğme İçecekler'e geçer, Fanta ilk sıralarda: {ids[:4]}")
    check(pg.evaluate("ids => ids.every(id => isDrinkFood(id, getFoodDB()[id]))", ids), "İçecekler listesinde yalnız içecek")
    check(pg.locator("#foodList [data-food-group]").count() == 0, "içecek aramasında grup başlığı yok")
    check(pg.get_attribute("#foodSearch", "placeholder").startswith("İçecek ara"), "arama kutusu: İçecek ara")
    pg.screenshot(path=os.path.join(SHOTS, "v66_icecek_arama.png"))
    search(pg, "")
    pg.click("[data-food-cat='brand']"); pg.wait_for_timeout(150)
    check(sorted(pg.evaluate(LIST)) == sorted(pg.evaluate("Object.keys(DRINK_DB)")), "Markalı çipi 30 içeceği listeler")
    check(pg.locator("#recipeOpenBtn").is_hidden() and pg.inner_text("#cfOpenBtn") == "Özel içecek tanımla", "İçecekler'de: Özel içecek tanımla, Tarif gizli")
    small = pg.evaluate(SMALL, "#foodKind button, #foodCats button, #foodFilters button")
    check(small == [], "düğmeler ≥ 44 px: " + str(small))
    pg.screenshot(path=os.path.join(SHOTS, "v66_icecekler.png"))

    # --- 3) Kart
    pg.evaluate("selectFood('d_cocacola')"); pg.wait_for_timeout(150)
    card = pg.inner_text("#foodSelCard")
    check("Coca-Cola Türkiye" in card and "coca-cola.com/tr" in card and "11.2026" in card, "kartta kaynak ve tarih")
    check(pg.inner_text("#foodSelKcal") == "139", f"330 ml Coca-Cola = 139 kcal ({pg.inner_text('#foodSelKcal')})")
    pg.locator("#foodSelCard").screenshot(path=os.path.join(SHOTS, "v66_kart.png"))
    pg.evaluate("setFoodKind('food')"); pg.wait_for_timeout(100)
    pg.evaluate("selectFood('d_sprite')"); pg.wait_for_timeout(150)
    check(pg.evaluate("foodUI.kind") == "drink" and pg.locator("#foodSelCard[data-food='d_sprite']").count() == 1, "Besinler'deyken içecek seçilirse İçecekler'e geçer")
    pg.evaluate("selectFood('u171077')"); pg.wait_for_timeout(150)
    check(pg.evaluate("foodUI.kind") == "food", "besin seçilince Besinler'e döner")

    # --- 4) Süzgeç
    pg.evaluate("setFoodKind('drink')"); pg.wait_for_timeout(100)
    check(pg.locator("[data-food-filter='hp']").count() == 0, "İçecekler'de Yüksek protein süzgeci yok")
    pg.click("[data-food-filter='lc']"); pg.wait_for_timeout(150)
    lc = pg.evaluate(LIST)
    check("d_cocacola_zero" in lc and "d_doganay_salgam" in lc and "d_cocacola" not in lc and "d_sutas_ayran" not in lc, "Düşük kalori (≤ 20 kcal/100 ml): Zero ve şalgam var, kola ve ayran yok")
    check(pg.evaluate("ids => ids.every(id => kcalPerUnit(getFoodDB()[id]) * 100 <= 20)", lc), "süzülenlerin hepsi ≤ 20 kcal / 100 ml")
    pg.click("[data-food-filter='lc']")

    # --- 5) Kendi içeceğin
    pg.evaluate("openCustomFoodModal()"); pg.wait_for_timeout(150)
    check(pg.locator("#cfKind [data-cf-kind='drink']").get_attribute("aria-pressed") == "true", "İçecekler'den açılınca form İçecek seçili")
    check(pg.inner_text("#cfTitle") == "Kendi içeceğini tanımla" and pg.inner_text("#cfNameLabel") == "İçecek adı:", "form başlığı ve etiket içecek")
    check(pg.evaluate("$('cfUnit').querySelector('option[value=\"1adet\"]').hidden") is True, "içecekte '1 adet' seçeneği gizli")
    small = pg.evaluate(SMALL, "#cfKind button")
    check(small == [], "Besin/İçecek düğmeleri ≥ 44 px: " + str(small))
    pg.screenshot(path=os.path.join(SHOTS, "v66_ozel_icecek.png"))
    pg.fill("#cfName", "Ev limonatası"); pg.fill("#cfK", "40"); pg.fill("#cfP", "0"); pg.fill("#cfC", "10"); pg.fill("#cfF", "0")
    pg.evaluate("void saveCustomFood()"); pg.wait_for_timeout(300)
    cid = pg.evaluate("Object.keys(state.customFoods).find(id => state.customFoods[id].name === '⭐ Ev limonatası')")
    cf = pg.evaluate("id => state.customFoods[id]", cid)
    check(cf and cf.get("drink") is True and cf["unit"] == "ml" and abs(cf["kcal"] - 0.4) < 1e-9, f"özel içecek: drink, ml, kcal ({cf})")
    check(pg.evaluate("aykStoredState().then(s => s.customFoods[%r].drink)" % cid) is True, "kalıcı kayıtta drink: true")
    pg.evaluate("setFoodCat('custom')"); pg.wait_for_timeout(100)
    check(cid in pg.evaluate(LIST), "İçecekler → Özel eklediklerim'de")
    pg.evaluate("setFoodKind('food')"); pg.wait_for_timeout(100)
    check(cid not in pg.evaluate(LIST) and not pg.evaluate("[...document.querySelectorAll('#foodCats [data-food-cat]')].some(b => b.dataset.foodCat === 'custom')"),
          "Besinler'de özel içecek görünmez (yalnız özel içecek varken Özel eklediklerim çipi yok)")
    pg.evaluate("openCustomFoodModal()"); pg.wait_for_timeout(100)
    check(pg.locator("#cfKind [data-cf-kind='food']").get_attribute("aria-pressed") == "true" and pg.inner_text("#cfTitle") == "Kendi özel besinini tanımla", "Besinler'den açılınca form Besin seçili")
    pg.fill("#cfName", "Ev köftesi"); pg.evaluate("void saveCustomFood()"); pg.wait_for_timeout(300)
    fid = pg.evaluate("Object.keys(state.customFoods).find(id => state.customFoods[id].name === '⭐ Ev köftesi')")
    check(fid and pg.evaluate("id => state.customFoods[id].drink === undefined && state.customFoods[id].unit === 'g'", fid), "özel besin: drink alanı yok, g")
    pg.evaluate("id => editCustomFood(id)", cid); pg.wait_for_timeout(100)
    check(pg.locator("#cfKind [data-cf-kind='drink']").get_attribute("aria-pressed") == "true", "özel içeceği düzenlerken İçecek seçili")
    pg.evaluate("closeModal('customFoodModal')")
    out = pg.evaluate("""() => { const s = JSON.parse(JSON.stringify(state)); s.customFoods.x1 = { name: 'a', unit: 'ml', p: 0, c: 0, f: 0, drink: 'evet' };
      s.customFoods.x2 = { name: 'b', unit: 'ml', p: 0, c: 0, f: 0, drink: true }; const n = normalizeState(s); return [n.customFoods.x1.drink, n.customFoods.x2.drink]; }""")
    check(out == [None, True], "normalizeState: drink yalnız true kalır: " + str(out))

    # --- 6) Barkod
    pg.evaluate("setFoodKind('food'); bc.found = { code: '8690000000001', name: 'Test Gazoz', brand: '', unit: 'ml', p: 0, c: 5, f: 0, kcal: 20, def: 330 }; addBarcodeFood()"); pg.wait_for_timeout(300)
    bf = pg.evaluate("state.customFoods.custom_bc_8690000000001")
    check(bf and bf.get("drink") is True and bf["unit"] == "ml" and abs(bf["kcal"] - 0.2) < 1e-9 and pg.evaluate("foodUI.kind") == "drink", f"ml barkod ürünü içecek olur, kalorisi saklanır, İçecekler açılır ({bf})")
    pg.evaluate("setFoodKind('food'); bc.found = { code: '8690000000002', name: 'Test Bisküvi', brand: '', unit: 'g', p: 6, c: 70, f: 15, kcal: 440, def: 30 }; addBarcodeFood()"); pg.wait_for_timeout(300)
    bf = pg.evaluate("state.customFoods.custom_bc_8690000000002")
    check(bf and "drink" not in bf and bf["unit"] == "g" and pg.evaluate("foodUI.kind") == "food", "g barkod ürünü besin kalır")
    pg.evaluate("setFoodKind('drink'); bc.found = { code: '8690000000003', name: 'Test Su', brand: '', unit: 'g', p: 0, c: 0, f: 0, kcal: 0, def: 500 }; addBarcodeFood()"); pg.wait_for_timeout(300)
    check(pg.evaluate("state.customFoods.custom_bc_8690000000003.drink") is True, "İçecekler'deyken okutulan ürün içecek olur")
    c.close()

    # --- 7) İngilizce
    c, pg = ctx(locale="en-US")
    pg.evaluate("setLang('en')"); pg.wait_for_timeout(300)
    pg.evaluate("switchTab('nutrition'); setNutriView('foods')"); pg.wait_for_timeout(200)
    check(pg.inner_text("#foodKind [data-food-kind='food']") == "Foods" and pg.inner_text("#foodKind [data-food-kind='drink']") == "Drinks", "İngilizce: Foods / Drinks")
    pg.evaluate("setFoodKind('drink')"); search(pg, "peach")
    ids = pg.evaluate(LIST)
    check("d_fusetea_seftali" in ids, f"İngilizce adla arama ('peach'): {ids[:5]}")
    pg.evaluate("selectFood('d_fusetea_seftali')"); pg.wait_for_timeout(150)
    card = pg.inner_text("#foodSelCard")
    check("Fuse Tea Peach" in card and "Source: Coca-Cola Türkiye" in card, "İngilizce kart adı ve kaynak")
    tr = [w for w in re.findall(r"\S*[çğıöşüÇĞİÖŞÜ]\S*", card) if "Türkiye" not in w]
    check(not tr, "İngilizce kartta (marka adı dışında) Türkçe yok: " + str(tr))
    c.close()
    check(errs == [], "sayfa hatası yok: " + str(errs[:3]))
    b.close()
finally:
    srv.terminate()
print("BAŞARISIZ:" if fails else "TÜMÜ GEÇTİ", fails)
sys.exit(1 if (fails or errs) else 0)
