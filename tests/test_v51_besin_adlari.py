# v51 bölüm 1 (görev 1): İngilizce besin verisi (foods-en.js) ve yükleyici.
# service_workers="block": ağ taklidi (route) WebKit'te service worker'ın gönderdiği istekleri görmez; bu testte SW denenmiyor (bkz. test_v25_sw.py)
import os, sys, re, json, subprocess, time, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8809'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = "http://localhost:8809/index.html"
def boot(pg): pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(80)
def load_js(path, prefix):
    t = open(os.path.join(REPO, path), encoding="utf-8").read()
    return json.loads(t[t.index(prefix) + len(prefix):t.rindex(";")])
try:
  # ===== Veri dosyası
  FOODS = load_js("foods.js", "const USDA_FOODS = ")
  EN = load_js("foods-en.js", "const USDA_EN = ")
  usda = [k for k in FOODS if k.startswith("u")]
  check(set(EN) == set(usda), "foods-en.js: kimlikler foods.js'teki USDA besinleriyle aynı (%d)" % len(EN))
  check(not any(k.startswith("r_") for k in EN), "foods-en.js: tarif (r_) yok")
  check(all(len(EN[k][1]) == len(FOODS[k].get("o", [])) for k in EN), "foods-en.js: her besinde porsiyon sayısı foods.js 'o' ile eşit")
  check(all(isinstance(EN[k][0], str) and EN[k][0] and EN[k][0] == EN[k][0].strip() and ",," not in EN[k][0] for k in EN), "foods-en.js: adlar boş değil, temiz")
  check(EN["u168652"][0] == "Beef, ground, 70% lean meat / 30% fat, raw", "u168652 kıyma: %r" % EN["u168652"][0])
  check(EN["u175139"][1][1] == "1 can (3.75 oz)" and FOODS["u175139"]["o"][1][0].endswith("kutu/şişe"), "sardalya porsiyon sırası: %s | %s" % (EN["u175139"][1], FOODS["u175139"]["o"]))
  # Rastgele 20 besin: İngilizce etiketin birimi Türkçe etiketle uyumlu (cup / kaşık)
  random.seed(51)
  withp = [k for k in EN if EN[k][1]]
  bad = []
  for k in random.sample(withp, 20):
    for i, lab in enumerate(EN[k][1]):
      tr = FOODS[k]["o"][i][0].lower()
      l = lab.lower()
      ok = (("cup" in tr) == bool(re.search(r"\bcups?\b", l))) or "cup" not in tr
      ok = ok and (("kaşığı" in tr) == bool(re.search(r"\b(tbsp|tsp|tablespoon|teaspoon)", l)))
      if not ok: bad.append((k, lab, tr))
  check(not bad, "rastgele 20 besin: İngilizce etiket Türkçe etiketle birimce uyumlu %s" % bad[:3])
  # Güçlendirme: HER etiketin baştaki sayısı Türkçe etiketle aynı (0,5 / 0.5 ondalık virgül/nokta farkı hariç)
  def lead(x):
    m = re.match(r"\s*(\d+(?:[.,]\d+)?(?:/\d+)?)", x); return m and m.group(1).replace(",", ".")
  badn = [(k, FOODS[k]["o"][i][0], lab) for k in withp for i, lab in enumerate(EN[k][1]) if lead(lab) != lead(FOODS[k]["o"][i][0])]
  check(not badn, "tüm besinlerde İngilizce porsiyon etiketinin baştaki sayısı Türkçeyle aynı %s" % badn[:3])
  src_ok = subprocess.run(["git", "diff", "--quiet", "foods.js"], cwd=REPO).returncode == 0
  check(src_ok, "foods.js bayt bayt değişmedi (git diff --quiet)")
  sw = open(os.path.join(REPO, "sw.js"), encoding="utf-8").read()
  check("./foods-en.js" not in re.search(r"const FILES = \[[^\]]*\]", sw).group(0), "sw.js FILES içinde foods-en.js YOK (Türkçe telefon indirmez; çalışma anında önbelleğe girer)")

  with sync_playwright() as p:
    b = p.chromium.launch()
    def newctx(en, block=False):
        ctx = b.new_context(service_workers="block", color_scheme="dark", viewport={"width": 390, "height": 844}, locale="en-US")
        ctx.add_init_script(TEST_INIT)
        if en: ctx.add_init_script("window.AYK_TEST_EN = true")
        reqs = []
        def on_req(r):
            try: r.frame      # service worker'ın önbellekleme (precache) istekleri sayfa isteği değildir: atlanır
            except Exception: return
            reqs.append(r.url)
        ctx.on("request", on_req)
        if block: ctx.route("**/foods-en.js", lambda route: route.abort())
        pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        return ctx, pg, reqs
    NAME = "() => foodNameL(getFoodDB()['u168652'])"
    TR_NAME = "Dana kıyma (%70 yağsız), çiğ"
    # ===== Türkçe açılış: istek yok, adlar Türkçe
    ctx, pg, reqs = newctx(False)
    pg.goto(URL); boot(pg); pg.wait_for_timeout(500)
    check(not any("foods-en.js" in u for u in reqs), "tr: foods-en.js isteği yok")
    check(pg.evaluate("typeof USDA_EN") == "undefined", "tr: USDA_EN tanımsız")
    check(pg.evaluate(NAME) == TR_NAME, "tr: foodNameL Türkçe: %r" % pg.evaluate(NAME))
    check(pg.evaluate("portionL(getFoodDB()['u175139'], 1, 'X')") == "X", "tr: portionL etiketi aynen")
    pg.evaluate("setLang('en')"); pg.wait_for_timeout(300)
    # v52: İngilizce herkese açık → bayraksız da setLang('en') foods-en.js'i yükler (eskiden İngilizce gizliyken istek yoktu)
    check(any("foods-en.js" in u for u in reqs), "v52 bayraksız: setLang('en') sonrası foods-en.js yüklenir")
    ctx.close()
    # ===== İngilizce açılış (kayıtlı dil en): yüklenir
    ctx, pg, reqs = newctx(True)
    pg.goto(URL); boot(pg); pg.evaluate("setLang('en')"); pg.wait_for_function("typeof USDA_EN !== 'undefined'", timeout=5000); pg.wait_for_timeout(300)
    reqs.clear(); pg.reload(); boot(pg)
    pg.wait_for_function("typeof USDA_EN !== 'undefined'", timeout=5000); pg.wait_for_timeout(200)
    check(sum("foods-en.js" in u for u in reqs) == 1, "en açılış: foods-en.js tam bir kez istendi")
    check(pg.evaluate("curLang()") == "en", "en açılış: dil en")
    n = pg.evaluate(NAME)
    check(n == "Beef, ground, 70% lean meat / 30% fat, raw", "en: foodNameL(getFoodDB()['u168652']) = %r" % n)
    check(pg.evaluate("getFoodDB()['u168652'].name") == TR_NAME, "en: besin nesnesi (f.name) Türkçe kaldı")
    check(pg.evaluate("portionL(getFoodDB()['u175139'], 1, 'X')") == "1 can (3.75 oz)", "en: portionL USDA etiketi")
    check(pg.evaluate("portionL(getFoodDB()['u175139'], 99, 'X')") == "X", "en: portionL dizin yoksa verilen etiket")
    RCP = "(Object.values(getFoodDB()).find(f => f.src === 'tarif'))"
    check(pg.evaluate("foodNameL(%s)" % RCP) == pg.evaluate("%s.name" % RCP), "en: tarif adı Türkçe")
    check(pg.evaluate("foodNameL({ name: '⚠ Eski besin', _lost: 1, src: 168652 })") == "⚠ Eski besin", "en: _lost besinde ⚠ adı korunur")
    check(pg.evaluate("typeof BASE_EN") == "object" and pg.evaluate("foodNameL({ name: 'Özel besin', cat: 'x' })") == "Özel besin", "en: listede olmayan besin adı aynen")
    check(pg.evaluate("loadFoodsEn()") is True and sum("foods-en.js" in u for u in reqs) == 1, "loadFoodsEn ikinci çağrı: true, yeni istek yok")
    ctx.close()
    # ===== setLang('en'): sonra yeniden çizim
    ctx, pg, reqs = newctx(True)
    pg.goto(URL); boot(pg); pg.wait_for_timeout(300)
    check(pg.evaluate("curLang()") == "tr" and not any("foods-en.js" in u for u in reqs), "setLang öncesi: tr, istek yok")
    pg.evaluate("() => { window._ra = 0; window._o = renderAll; renderAll = function () { window._ra++; return window._o.apply(this, arguments); }; }")
    pg.evaluate("setLang('en')")
    pg.wait_for_function("typeof USDA_EN !== 'undefined'", timeout=5000); pg.wait_for_timeout(200)
    ra = pg.evaluate("window._ra")
    check(ra >= 2, "setLang('en'): çizim + yükleme sonrası yeniden çizim (renderAll sayısı %d)" % ra)
    pg.evaluate("() => { renderAll = window._o; }")
    check(pg.evaluate(NAME) == "Beef, ground, 70% lean meat / 30% fat, raw", "setLang('en') sonrası foodNameL İngilizce")
    pg.evaluate("setLang('tr')"); pg.wait_for_timeout(150)
    check(pg.evaluate(NAME) == TR_NAME, "tr'ye dönüş: Türkçe ad")
    ctx.close()
    # ===== İstek engellenirse: Türkçe adlar, hata yok
    ctx, pg, reqs = newctx(True, block=True)
    pg.goto(URL); boot(pg); pg.wait_for_timeout(200)
    pg.evaluate("setLang('en')"); pg.wait_for_timeout(600)
    check(pg.evaluate("curLang()") == "en" and pg.evaluate("typeof USDA_EN") == "undefined", "engelli: dosya yüklenmedi")
    check(pg.evaluate(NAME) == TR_NAME, "engelli: İngilizcede Türkçe ad")
    check(pg.evaluate("loadFoodsEn()") is False, "engelli: loadFoodsEn false döner")
    ctx.close()
    # ===== Bölüm 2 (görev 2): gösterim yerleri + İngilizce arama + kayda sızmama
    EN_BEEF = "Beef, ground, 70% lean meat / 30% fat, raw"; EN_SARD = "Fish, sardine, Atlantic, canned in oil, drained solids with bone"
    ctx, pg, reqs = newctx(True)
    pg.goto(URL); boot(pg); pg.evaluate("setLang('en')"); pg.wait_for_function("typeof USDA_EN !== 'undefined'", timeout=5000); pg.wait_for_timeout(300)
    TR_SARD_FULL = pg.evaluate("getFoodDB()['u175139'].name")
    # Sahte İngilizce (BASE_EN, görev 3'te dolacak): gösterim bağlantısı denetlenir
    pg.evaluate("() => { BASE_EN.tavuk_gogsu = 'Chicken breast (raw)'; BASE_EN.dana_kiyma = 'Lean beef mince (raw)'; BASE_EN.hindi_gogsu = 'Turkey breast (raw)'; renderAll(); }")
    pg.evaluate("""() => {
      const m = curMeals(); m[1].items.push({ foodId: 'u168652', amount: 120 }, { foodId: 'u175139', amount: 80 });
      const c = ensureDayCopy(); openEditMeals.add(c[1].id); openMenuMeals.add(m[1].id); openDoneMeals.add(c[1].id); renderAll();
    }""")
    # Menülerim
    pg.evaluate("setNutriView('menus')"); pg.wait_for_timeout(150)
    h = pg.inner_text("#mealsContainer")
    check(EN_BEEF in h and EN_SARD in h and "Chicken breast (raw)" in h, "en Menülerim: kalem adları İngilizce")
    check(TR_SARD_FULL not in h and "Dana kıyma (%70" not in h, "en Menülerim: Türkçe USDA adı görünmüyor")
    # Bugün (düzenleme modu)
    pg.evaluate("setNutriView('today')"); pg.wait_for_timeout(150)
    h = pg.inner_text("#todayMeals")
    check(EN_BEEF in h and EN_SARD in h, "en Bugün: kalem adları İngilizce")
    check(pg.evaluate("document.querySelector('#todayMeals [aria-label*=\"Beef\"]') ? 1 : 0") == 1, "en Bugün: erişilebilirlik etiketi İngilizce besin adıyla")
    # Besinler: arama, kart, porsiyon
    pg.evaluate("setNutriView('foods')"); pg.wait_for_timeout(150)
    pg.fill("#foodSearch", "sardine"); pg.wait_for_timeout(400)
    h = pg.inner_text("#foodList")
    check(EN_SARD in h and TR_SARD_FULL not in h, "en Besinler: arama listesinde İngilizce ad")
    pg.evaluate("selectFood('u175139')"); pg.wait_for_timeout(150)
    card = pg.inner_text("#foodSelCard")
    check(EN_SARD in card, "en Besinler: seçili kart başlığı İngilizce")
    chips = pg.evaluate("[...document.querySelectorAll('#foodSelCard [data-preset]')].map(b => b.textContent)")
    check(any(c.startswith("1 can (3.75 oz) · ") for c in chips) and not any("kutu" in c for c in chips), "en Besinler: hazır porsiyonlar USDA İngilizce etiketiyle %s" % chips)
    check(pg.evaluate("document.querySelector('#foodSelCard input').getAttribute('aria-label')").startswith(EN_SARD), "en Besinler: miktar kutusu etiketi İngilizce ad")
    # doğal birim satırı (adet / dilim)
    nat = pg.evaluate("""() => { const db = getFoodDB(); const id = Object.keys(db).find(i => typeof db[i].src === 'number' && naturalUnit(db[i])); return id ? [id, naturalUnit(db[id]).label] : null; }""")
    check(nat is not None and not re.search(r"adet|dilim|parça|göğüs", nat[1]), "en naturalUnit: etiket İngilizce %s" % (nat,))
    # Kombo seçimi kartı: malzeme adları İngilizce
    pg.evaluate("state.combos = [{ id: 'kx', name: 'Kombom', items: [{ foodId: 'u168652', amount: 50 }, { foodId: 'u175139', amount: 30 }] }]; foodUI.sel = null; foodUI.cat = 'combos'; $('foodSearch').value = ''; renderAll();")
    pg.evaluate("selectCombo('kx')"); pg.wait_for_timeout(150)
    ch = pg.inner_text("#foodList")
    check(EN_BEEF in ch and EN_SARD in ch and "Kombom" in ch, "en kombo kartı: malzemeler İngilizce, kombo adı olduğu gibi")
    pg.evaluate("foodUI.sel = null; foodUI.cat = 'all'; $('foodSearch').value = ''; renderAll();")
    # Öneriler
    sug = pg.evaluate("() => { renderFoodSuggest(); const el = $('foodSuggest'); return el ? el.textContent : ''; }")
    check(TR_SARD_FULL not in sug and "Dana kıyma (%70" not in sug, "en öneriler: Türkçe USDA adı yok")
    # İkame penceresi (BASE_EN ile)
    pg.evaluate("() => { const m = curMeals(); m[1].items.push({ foodId: 'tavuk_gogsu', amount: 150 }); }")
    pg.evaluate("setNutriView('menus')")
    pg.evaluate("() => { const m = curMeals(); openSwap(1, m[1].items.length - 1); }"); pg.wait_for_timeout(200)
    sw_txt = pg.inner_text("#pickerModal")
    check("Chicken breast (raw)" in sw_txt and ("Turkey breast (raw)" in sw_txt or "Lean beef mince (raw)" in sw_txt), "en ikame penceresi: başlık/alternatifler İngilizce")
    pg.evaluate("closeModal('pickerModal')")
    # Alışveriş listesi
    pg.evaluate("openShopList()"); pg.wait_for_timeout(150)
    shop = pg.inner_text("#shopItems")
    check(EN_BEEF in shop and EN_SARD in shop, "en alışveriş listesi: İngilizce adlar")
    check(EN_BEEF in pg.evaluate("shopText()"), "en alışveriş metni (kopya): İngilizce")
    pg.evaluate("closeModal('shopModal')")
    # Tarif malzeme listesi
    pg.evaluate("openRecipeModal(); rcp.items = [{ foodId: 'u168652', amount: 200 }, { foodId: 'u175139', amount: 100 }]; renderRecipe();")
    check(EN_BEEF in pg.inner_text("#rcItems"), "en tarif malzemeleri: İngilizce ad")
    pg.evaluate("$('rcName').value = 'Benim tarifim'; $('rcCooked').value = '250'; saveRecipe();"); pg.wait_for_timeout(200)
    # Kombo kaydet (menü öğününden)
    pg.evaluate("void saveMealAsCombo(1, 'menu')"); pg.wait_for_selector("#uiDlgInput", timeout=3000)
    pg.fill("#uiDlgInput", "Kaydedilen kombo"); pg.click("#uiDlgOk"); pg.wait_for_timeout(250)
    # Kayda sızma denetimi (Review Focus 1)
    pg.evaluate("renderAll()"); pg.wait_for_timeout(100)
    leak = pg.evaluate("""() => { const j = JSON.stringify(state); return ['Beef, ground', 'sardine', 'Chicken breast (raw)', 'Lean beef mince'].filter(s => j.includes(s)); }""")
    check(not leak, "kayıtta İngilizce besin adı yok (state): %s" % leak)
    snap = pg.evaluate("[state.foodSnap.u168652 && state.foodSnap.u168652.n, state.foodSnap.u175139 && state.foodSnap.u175139.n, state.foodSnap.tavuk_gogsu && state.foodSnap.tavuk_gogsu.n]")
    check(snap[0] == "Dana kıyma (%70 yağsız), çiğ" and snap[1] == TR_SARD_FULL and snap[2] == "Tavuk Göğsü (Çiğ)", "foodSnap.n Türkçe: %s" % snap)
    cb = pg.evaluate("state.combos.find(c => c.name === 'Kaydedilen kombo')")
    check(cb and all(set(i.keys()) == {"foodId", "amount"} for i in cb["items"]) and {i["foodId"] for i in cb["items"]} >= {"u168652", "u175139"}, "kaydedilen kombo: yalnız kimlik + miktar %s" % (cb,))
    rc = pg.evaluate("Object.values(state.customFoods).find(f => f.recipe)")
    check(rc and rc["name"] == "🍲 Benim tarifim" and all(set(i.keys()) == {"foodId", "amount"} for i in rc["recipe"]["items"]), "kaydedilen tarif: ad yazılan, malzeme kimlik + miktar")
    if pg.evaluate("typeof aykStoredState") == "function":
        pg.wait_for_timeout(300)
        sj = json.dumps(pg.evaluate("aykStoredState()"), ensure_ascii=False)
        check("Beef, ground" not in sj and "sardine" not in sj, "kalıcı kayıtta İngilizce besin adı yok")
    # Arama (Review Focus 4)
    IDS = "Object.keys(getFoodDB()).filter(id => !isHiddenFood(getFoodDB()[id]))"
    def srch(w): return pg.evaluate("searchFoods(%s, normSearch(%s))" % (IDS, json.dumps(w)))
    def nm(i): return pg.evaluate("foodNameL(getFoodDB()[%s])" % json.dumps(i))
    gb, ky = srch("ground beef"), srch("kıyma")
    check("u168652" in gb and "u168652" in ky, "en arama: 'ground beef' ve 'kıyma' aynı besini (u168652) bulur (%d / %d sonuç)" % (len(gb), len(ky)))
    check(len(gb) > 0 and nm(gb[0]).lower().startswith("beef, ground"), "en arama: 'ground beef' ilk sonuç İngilizce beef, ground")
    kn = srch("karnıyarık")
    check("tr_karniyarik" in kn, "en arama: 'karnıyarık' Türkçe yemek bulunur %s" % kn[:3])
    ch = srch("chiken breast")
    check(len(ch) >= 1 and "chicken" in nm(ch[0]).lower(), "en arama: yazım hatalı 'chiken breast' sonuç döner (%d)" % len(ch))
    check("u175139" in srch("sardine"), "en arama: 'sardine' sardalyayı bulur")
    check("u175139" in srch("sardalya"), "en arama: Türkçe ad ('sardalya') hâlâ bulur")
    # dil değişince arama dizini yenilenir
    pg.evaluate("setLang('tr')"); pg.wait_for_timeout(200)
    check("u168652" not in pg.evaluate("searchFoods(%s, normSearch('ground beef'))" % IDS), "tr'ye dönünce 'ground beef' İngilizce adla bulmaz")
    check("u168652" in pg.evaluate("searchFoods(%s, normSearch('kıyma'))" % IDS), "tr: 'kıyma' hâlâ bulur")
    pg.evaluate("setLang('en')"); pg.wait_for_timeout(200)
    check("u168652" in srch("ground beef"), "yeniden en: İngilizce arama geri gelir")
    ctx.close()
    # ===== Türkçe: gösterimler Türkçe (foods-en.js hiç yüklenmeden)
    ctx, pg, reqs = newctx(False)
    pg.goto(URL); boot(pg)
    pg.evaluate("() => { const m = curMeals(); m[1].items.push({ foodId: 'u168652', amount: 120 }); openMenuMeals.add(m[1].id); setNutriView('menus'); renderAll(); }"); pg.wait_for_timeout(200)
    h = pg.inner_text("#mealsContainer")
    check("Dana kıyma (%70 yağsız), çiğ" in h and "Beef" not in h, "tr Menülerim: Türkçe USDA adı")
    pg.evaluate("setNutriView('foods'); $('foodSearch').value = 'sardalya'; renderFoodList(); selectFood('u175139')"); pg.wait_for_timeout(200)
    chips = pg.evaluate("[...document.querySelectorAll('#foodSelCard [data-preset]')].map(b => b.textContent)")
    check(any("kutu" in c for c in chips) and not any("can (" in c for c in chips), "tr Besinler: porsiyonlar Türkçe %s" % chips)
    check(not any("foods-en.js" in u for u in reqs), "tr: bölüm 2 boyunca foods-en.js isteği yok")
    ctx.close()

    # ===== Bölüm 3: kendi besin listesi, kategoriler, notlar, hareket adları
    TRL = re.compile(r"[çğıöşüÇĞİÖŞÜ]")
    def tr_pg():
        c, g, r = newctx(False); g.goto(URL); boot(g); return c, g
    ctx, pg, reqs = newctx(True)
    pg.goto(URL); boot(pg); pg.evaluate("setLang('en')"); pg.wait_for_function("typeof USDA_EN !== 'undefined'", timeout=5000); pg.wait_for_timeout(300)
    DB = "BASE_FOOD_DB"
    want = {"yulaf": "Oats", "muz": "Banana (medium)", "tavuk_gogsu": "Chicken breast (raw)", "tr_beyaz_peynir": "Beyaz peynir (white cheese, full-fat)", "tr_ayran": "Ayran (yogurt drink)", "kefir": "Plain kefir"}
    for k, v in want.items():
        got = pg.evaluate("foodNameL(BASE_FOOD_DB[%s])" % json.dumps(k))
        check(got == v, "en BASE_FOOD_DB %s -> %r" % (k, got))
    check(pg.evaluate("Object.keys(BASE_FOOD_DB).every(k => Object.prototype.hasOwnProperty.call(BASE_EN, k))"), "BASE_EN: BASE_FOOD_DB'nin her kimliği için ad var")
    check(pg.evaluate("BASE_FOOD_DB.yulaf.name") == "Yulaf Ezmesi", "en: besin nesnesi adı Türkçe kaldı")
    # Kategori başlıkları: bütün kategoriler Türkçe harfsiz
    cats = pg.evaluate("[...new Set(Object.values(getFoodDB()).map(f => f.cat).filter(Boolean))].map(c => t(stripEmoji(c)))")
    check(len(cats) >= 30 and not [c for c in cats if TRL.search(c)], "en: bütün kategori başlıkları Türkçe harfsiz %s" % [c for c in cats if TRL.search(c)])
    pg.evaluate("setNutriView('foods'); renderAll()"); pg.wait_for_timeout(200)
    chips = pg.evaluate("[...document.querySelectorAll('#foodCats button')].map(b => b.textContent)")
    check(chips and not [c for c in chips if TRL.search(c)] and "Meat, poultry and fish" in chips and "Turkish cuisine" in chips, "en: kategori çipleri İngilizce %s" % chips[:6])
    # kx besini: not İngilizce
    kx = pg.evaluate("Object.keys(getFoodDB()).find(i => getFoodDB()[i].kx && !isHiddenFood(getFoodDB()[i]))")
    pg.evaluate("selectFood(%s)" % json.dumps(kx)); pg.wait_for_timeout(200)
    card = pg.inner_text("#foodSelCard")
    check("Calories are USDA-measured" in card and "ölçümüdür" not in card, "en kx besini (%s): not İngilizce" % kx)
    # tarif notu + porsiyon
    rn = pg.evaluate("Object.keys(getFoodDB()).filter(i => getFoodDB()[i].src === 'tarif' && getFoodDB()[i].note)")
    bad = pg.evaluate("ids => ids.filter(i => /[çğıöşüÇĞİÖŞÜ]/.test(foodNoteL(getFoodDB()[i]).replace('çeçil', '')))", rn)
    check(len(rn) >= 20 and not bad, "en: %d yerleşik tarif notunun hiçbirinde Türkçe harf yok %s" % (len(rn), bad[:2]))
    pg.evaluate("selectFood(%s)" % json.dumps(rn[0])); pg.wait_for_timeout(150)
    card = pg.inner_text("#foodSelCard")
    note = pg.evaluate("foodNoteL(getFoodDB()[%s])" % json.dumps(rn[0]))
    check(bool(note) and note in card and not TRL.search(note), "en: seçili tarif kartında not İngilizce görünür %r" % note)
    rp = pg.evaluate("(() => { const f = Object.values(getFoodDB()).find(f => f.src === 'tarif' && f.portions && f.portions[0] && f.portions[0][0] === '1 porsiyon'); return f ? portionL(f, 0, '1 porsiyon') : null; })()")
    check(rp == "1 serving", "en: tarif porsiyonu %r" % rp)
    # Hareket adları
    names = pg.evaluate("Object.values(EXERCISE_LIBRARY).flat().map(n => exNameL(n))")
    check(len(names) > 100 and not [n for n in names if TRL.search(n)], "en: kütüphane adlarının hiçbirinde Türkçe harf yok %s" % [n for n in names if TRL.search(n)][:3])
    NM = "Pull-up (Geniş Tutuş Barfiks)"
    check(pg.evaluate("exNameL(%s)" % json.dumps(NM)) == "Pull-up (Wide Grip)", "en: exNameL parantez İngilizce")
    check(pg.evaluate("exNameL('Benim Hareketim (Özel)')") == "Benim Hareketim (Özel)", "en: kullanıcının kendi adına dokunulmaz")
    pg.evaluate("""nm => { const d = state.workoutDays[0]; d.exercises.push({ name: nm, kind: 'weight', sets: [{ kg: 40, reps: 8, done: false }] });
      state.exerciseHistory[exKey(nm)] = [{ ts: Date.now() - 86400000, name: nm, kind: 'weight', sets: [{ kg: 40, reps: 8, done: true }] }]; state.activeTab = 'gym'; state.gymView = 'program'; state.active = 0; renderAll(); }""", NM)
    pg.wait_for_timeout(300)
    gh = pg.inner_text("#gymRoot")
    check("Pull-up (Wide Grip)" in gh and "Barfiks" not in gh, "en Programım: hareket adı İngilizce")
    exn = pg.evaluate("state.workoutDays[0].exercises.slice(-1)[0].name")
    hk = pg.evaluate("Object.keys(state.exerciseHistory).filter(k => k.includes('barfiks'))")
    check(exn == NM and len(hk) == 1 and pg.evaluate("exKey(%s)" % json.dumps(NM)) == hk[0], "en: ex.name ve exerciseHistory anahtarı Türkçe/değişmedi %s" % hk)
    ctx.close()
    # Türkçe: hepsi aynı
    ctx, pg = tr_pg()
    check(pg.evaluate("foodNameL(BASE_FOOD_DB.yulaf)") == "Yulaf Ezmesi" and pg.evaluate("exNameL(%s)" % json.dumps(NM)) == NM, "tr: BASE_FOOD_DB adı ve hareket adı aynen")
    pg.evaluate("setNutriView('foods'); renderAll()"); pg.wait_for_timeout(200)
    chips = pg.evaluate("[...document.querySelectorAll('#foodCats button')].map(b => b.textContent)")
    check("Et, tavuk ve balık" in chips and "Türk mutfağı" in chips  # v65: gruplar
         , "tr: kategori çipleri Türkçe %s" % chips[:6])
    kx = pg.evaluate("Object.keys(getFoodDB()).find(i => getFoodDB()[i].kx && !isHiddenFood(getFoodDB()[i]))")
    pg.evaluate("selectFood(%s)" % json.dumps(kx)); pg.wait_for_timeout(150)
    check("Kalori USDA ölçümüdür (" in pg.inner_text("#foodSelCard"), "tr: kx notu Türkçe")
    ctx.close()
    b.close()
  check(not errs, "sayfa hatası yok: %s" % errs[:3])
finally:
  srv.terminate()
print(("\nHATA: %d" % len(fails)) if fails else "\nTÜM TESTLER GEÇTİ")
sys.exit(1 if fails else 0)
