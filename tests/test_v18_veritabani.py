# v18 (5. paket): USDA besin veritabanı (foods.js), akıllı arama, USDA porsiyonları, bulunamayan aramalar.
import os, sys, re
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOTS = os.path.join(os.path.dirname(__file__), "shots")
os.makedirs(SHOTS, exist_ok=True)
import subprocess, time, json
srv = subprocess.Popen(['python3', '-m', 'http.server', '8771'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
def st(pg): return pg.evaluate("JSON.parse(localStorage.getItem('ayk_plus_v5_state'))")
def ov(pg):
    w = pg.evaluate("[document.documentElement.scrollWidth, document.documentElement.clientWidth]"); return w[0] <= w[1]
def search(pg, q):
    pg.fill("#foodSearch", q); pg.evaluate("foodUI.limit = 0; renderFoodList()"); pg.wait_for_timeout(30)
    return pg.evaluate("[...document.querySelectorAll('#foodList [data-food]')].map(e => getFoodDB()[e.dataset.food].name)")
SMALL_JS = """(sel) => [...document.querySelectorAll(sel)]
  .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.width < 44 || r.height < 44); })
  .map(e => (e.textContent || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 30) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height))"""

try:
  with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={"width": 375, "height": 812}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.getElementById('splash'); if(s) s.remove();})")
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("dialog", lambda d: d.accept())
    pg.goto("http://localhost:8771/index.html"); pg.wait_for_timeout(400)
    pg.evaluate("switchTab('nutrition'); setNutriView('foods')"); pg.wait_for_timeout(100)

    # ---------- 1) Veri kontrolleri
    n_usda = pg.evaluate("Object.keys(USDA_DB).length"); n_all = pg.evaluate("Object.keys(getFoodDB()).length")
    check(1500 <= n_all <= 2500 and n_usda >= 1400, f"veritabanı: {n_usda} USDA/tarif + uygulama listesi = {n_all} besin (1.500–2.500)")
    n_tr = pg.evaluate("Object.values(getFoodDB()).filter(f => /Türk/.test(f.cat || '')).length")
    check(n_tr >= 140, f"Türk yemekleri ~150: {n_tr}")
    bad = pg.evaluate("""Object.entries(USDA_DB).filter(([id, f]) => {
        const calc = 4 * f.p + 4 * f.c + 9 * f.f; return !f.kx && Math.abs(calc - f.kcal) > Math.max(0.25, 0.2 * f.kcal); }).map(([id, f]) => f.name)""")
    check(not bad, f"her besinde 4P+4K+9Y ≈ kalori (toleranslı; istisnalar gerekçeli) {bad[:5]}")
    kx = pg.evaluate("Object.values(USDA_DB).filter(f => f.kx).map(f => f.kx)")
    check(len(kx) < 60 and set(kx) <= {"lif", "alkol", "tatlandırıcı"}, f"kalori istisnaları az ve gerekçeli ({len(kx)}: {sorted(set(kx))})")
    dup = pg.evaluate("""(() => { const seen = {}, d = []; Object.values(getFoodDB()).forEach(f => { const k = normSearch(stripEmoji(f.name)); if (seen[k]) d.push(f.name); seen[k] = 1; }); return d; })()""")
    check(not dup, f"yinelenen ad yok {dup[:5]}")
    src_bad = pg.evaluate("Object.entries(USDA_DB).filter(([id, f]) => !(typeof f.src === 'number' || f.src === 'tarif')).length")
    check(src_bad == 0, "her besinde kaynak alanı var (USDA fdcId ya da tarif)")
    tarif_ok = pg.evaluate("Object.entries(USDA_DB).filter(([id]) => id.startsWith('r_')).every(([id, f]) => f.src === 'tarif' && f.portions && f.portions[0][0] === '1 porsiyon')")
    check(tarif_ok, "tarifler 'tarif' kaynaklı ve porsiyonlu")
    neg = pg.evaluate("Object.values(USDA_DB).filter(f => [f.p, f.c, f.f, f.kcal].some(x => !(x >= 0) || x > 9.1)).length")
    check(neg == 0, "besin değerleri geçerli aralıkta (0–9 kcal/g)")
    cup_bad = pg.evaluate("Object.values(USDA_DB).flatMap(f => f.portions || []).filter(([n]) => /su bardağı/i.test(n)).length")
    cup_ok = pg.evaluate("Object.values(USDA_DB).flatMap(f => f.portions || []).filter(([n]) => /cup/.test(n)).every(([n]) => /cup \\(ABD/.test(n))")
    check(cup_bad == 0 and cup_ok, "USDA 'cup' su bardağı diye yazılmıyor, 'cup (ABD, 240 ml)' olarak gösteriliyor")
    cats_empty = pg.evaluate(r"""[...document.querySelectorAll('#foodCats button')].map(b => JSON.parse(b.getAttribute('onclick').replace(/^setFoodCat\(/, '').replace(/\)$/, ''))).filter(k => k.startsWith('c:')).filter(k => !Object.values(getFoodDB()).some(f => foodCatKey(f.cat) === k))""")
    check(not cats_empty, f"boş kategori yok {cats_empty}")
    pork = pg.evaluate("Object.values(USDA_DB).filter(f => /domuz|jambonlu|pork/i.test(f.name)).map(f => f.name)")
    check(not pork, f"domuz ürünü yok {pork}")
    base_same = pg.evaluate("Object.keys(BASE_FOOD_DB).every(id => getFoodDB()[id] === BASE_FOOD_DB[id])")
    check(base_same, "mevcut besin kimlikleri değişmedi (eski menüler aynı değerleri kullanıyor)")

    # ---------- 2) Arama
    r = search(pg, "tavuk gogsu")
    check(r and all("avuk" in x for x in r[:5]) and any("göğsü" in x.lower() for x in r[:3]), f"'tavuk gogsu' → {r[:3]}")
    r = search(pg, "tavuk")
    check(r and all("avuk" in x for x in r[:6]), f"'tavuk' aramasında ilk sonuçların hepsi tavuk (kategori eşleşmesi öne geçmiyor): {r[:4]}")
    r = search(pg, "yumrta")
    check(r and "umurta" in r[0], f"yazım hatası 'yumrta' → {r[:2]}")
    r = search(pg, "pismis tavuk")
    check(r and any(re.search(r"tavuk", x, re.I) and re.search(r"ızgara|fırında|haşlanmış|pişmiş|kızartılmış|tavada", x, re.I) for x in r[:5]), f"'pismis tavuk' → {r[:3]}")
    r1 = search(pg, "ıspanak"); r2 = search(pg, "ISPANAK"); r3 = search(pg, "ispanak")
    check(r1 and r1 == r2 == r3, "Türkçe karakter ve büyük/küçük harf toleransı (ıspanak = ISPANAK = ispanak)")
    r = search(pg, "gogsu tavuk")
    check(r and any("göğsü" in x.lower() for x in r[:3]), "kelime sırasından bağımsız arama")
    r = search(pg, "bonfile")
    check(r and any("bonfile" in x.lower() for x in r[:3]), f"eş anlamlı/kesim adı 'bonfile' → {r[:2]}")
    r = search(pg, "lavas")
    check(r and any("ortilla" in x for x in r[:5]), f"eş anlamlı 'lavaş' → tortilla {r[:3]}")
    r = search(pg, "pirinc")
    check(r and r[0] == pg.evaluate("getFoodDB().pirinc.name"), f"sık kullanılan (menüdeki) pirinç en üstte: {r[:2]}")
    r = search(pg, "ezogelin")
    check(r and "Ezogelin" in r[0], f"Türk yemeği aranabiliyor: {r[:2]}")
    t0 = time.time(); pg.evaluate("for (let i = 0; i < 5; i++) { $('foodSearch').value = 'tavuk'; renderFoodList(); }"); dt = (time.time() - t0) / 5
    check(dt < 0.4, f"arama hızlı ({round(dt * 1000)} ms)")

    # ---------- 3) Liste sayfalama ve USDA besin kartı
    search(pg, "")
    rows = pg.locator("#foodList [data-food]").count()
    check(rows <= 61 and pg.locator("#foodMore").count() == 1, f"'Tümü' ilk {rows} sonucu gösteriyor, 'daha fazla' düğmesi var")
    pg.click("#foodMore"); pg.wait_for_timeout(80)
    check(pg.locator("#foodList [data-food]").count() > rows, "'daha fazla' yeni sonuçlar getiriyor")
    search(pg, "elma kabuklu")
    apple = pg.evaluate("Object.keys(USDA_DB).find(id => USDA_DB[id].name === 'Elma (kabuklu), çiğ')")
    check(apple is not None, "USDA elma bulundu")
    pg.evaluate(f"selectFood('{apple}')"); pg.wait_for_timeout(80)
    chips = pg.locator("#foodSelCard [data-preset]").all_inner_texts()
    check(any("adet (orta)" in c and " g" in c for c in chips), f"USDA porsiyonları gram karşılığıyla: {chips[:3]}")
    check("USDA FoodData Central" in pg.inner_text("#foodSelCard [data-src]"), "kartta kaynak (USDA) yazıyor")
    med = pg.evaluate(f"USDA_DB['{apple}'].portions.find(x => x[0].includes('orta'))[1]")
    pg.locator("#foodSelCard [data-preset]", has_text="adet (orta)").click(); pg.wait_for_timeout(50)
    check(pg.input_value("#foodAmt") == pg.evaluate(f"fmtNum({med})"), f"porsiyon seçince miktar gram olarak geldi ({med} g)")
    exp = round(pg.evaluate(f"USDA_DB['{apple}'].kcal") * med)
    check(pg.inner_text("#foodSelKcal") == pg.evaluate(f"fmtInt({exp})"), f"kalori doğru ({exp} kcal)")
    pg.screenshot(path=SHOTS + "/v18_usda_card.png")
    before = pg.evaluate("nutritionTotals().cal")
    pg.click("#foodAddBtn"); pg.wait_for_timeout(100)
    check(abs(pg.evaluate("nutritionTotals().cal") - before - exp) <= 1, "USDA besini bugüne eklendi, kalori doğru")
    st1 = st(pg)
    check(st1["dayPlan"] is not None, "kayıt yapıldı")
    # Tarif kartı
    r = search(pg, "tavuk sote")
    check(r and r[0] == "Tavuk sote", f"veritabanındaki Türk yemeği tarifi aranabiliyor: {r[:2]}")
    rid = "r_tavuk_sote"
    pg.evaluate(f"selectFood('{rid}')"); pg.wait_for_timeout(50)
    check("Tarif hesaplaması" in pg.inner_text("#foodSelCard") and "1 porsiyon" in pg.inner_text("#foodSelCard"), "tarif kartında 'tarif hesaplaması (yaklaşık)' ve porsiyon")
    # Kalori istisnalı besinde açıklama
    kxid = pg.evaluate("Object.keys(USDA_DB).find(id => USDA_DB[id].kx === 'alkol')")
    if kxid:
        search(pg, pg.evaluate(f"USDA_DB['{kxid}'].name"))
        pg.evaluate(f"selectFood('{kxid}')"); pg.wait_for_timeout(50)
        check("USDA ölçümüdür" in pg.inner_text("#foodSelCard"), "kalori istisnalı besinde açıklama var")
    # Kalıcılık: yeniden açınca USDA besini menüde/bugünde tanınıyor
    pg.reload(); pg.wait_for_timeout(400)
    check(abs(pg.evaluate("nutritionTotals().cal") - before - exp) <= 1, "yeniden açılışta USDA besini tanınıyor (toplam aynı)")

    # ---------- 4) Bulunamadı + bulunamayan aramalar
    pg.evaluate("switchTab('nutrition'); setNutriView('foods')"); pg.wait_for_timeout(80)
    search(pg, "zqxw besini")
    check(pg.locator("#noResult button").count() == 3 and "bulunamadı" in pg.inner_text("#noResult"), "sonuç yoksa 3 seçenek (barkod, özel besin, tarif)")
    pg.wait_for_timeout(1800)
    check(any(x["q"] == "zqxw besini" for x in st(pg)["missSearches"]), "bulunamayan arama kaydedildi")
    pg.locator("#noResult button", has_text="Özel besin oluştur").click(); pg.wait_for_timeout(80)
    check(pg.input_value("#cfName") == "zqxw besini", "özel besin formunda ad aramadan doldu")
    pg.evaluate("closeModal('customFoodModal')")
    pg.locator("#noResult button", has_text="Tarif oluştur").click(); pg.wait_for_timeout(80)
    check(pg.input_value("#rcName") == "zqxw besini", "tarif formunda ad aramadan doldu")
    pg.evaluate("closeModal('recipeModal')")
    search(pg, "yu")   # kısa yazım kaydedilmez
    pg.wait_for_timeout(1700)
    check(len(st(pg)["missSearches"]) == 1, "kısa/sonuçlu aramalar kaydedilmiyor")
    small = pg.evaluate(SMALL_JS, "#nvFoods button")
    check(not small, f"Besinler (sonuç yok): düğmeler 44 px {small}")
    pg.evaluate("openProfile()"); pg.wait_for_timeout(150)
    check(pg.locator('#missList [data-miss="zqxw besini"]').count() == 1, "Profil'de 'Bulunamayan aramalar' listesi")
    pg.click("#missClear"); pg.wait_for_timeout(80)
    check(st(pg)["missSearches"] == [] and "Henüz yok" in pg.inner_text("#missList"), "liste temizlendi")
    pg.evaluate("closeProfile && closeProfile()"); pg.wait_for_timeout(100)

    # ---------- 5) Tarif malzeme seçicisi binlerce besinde sınırlı
    pg.evaluate("switchTab('nutrition'); openRecipeModal(); rcAddIngredient()"); pg.wait_for_timeout(150)
    n_pick = pg.locator("#pickerList button").count()
    check(n_pick <= 160 and "aramayı daralt" in pg.inner_text("#pickerList"), f"seçici ilk 150 sonucu gösteriyor ({n_pick})")
    pg.fill("#pickerSearch", "esmer pirinç"); pg.evaluate("renderPickerList()"); pg.wait_for_timeout(50)
    check(pg.locator("#pickerList button", has_text="Esmer pirinç").count() >= 1, "seçicide arama veritabanını buluyor")
    pg.evaluate("closeModal('pickerModal'); closeModal('recipeModal')")

    # ---------- 6) Taşma, 320 px
    pg.evaluate("setNutriView('foods')"); search(pg, "tavuk")
    for w in (375, 320):
        pg.set_viewport_size({"width": w, "height": 740}); pg.wait_for_timeout(60)
        check(ov(pg), f"Besinler {w} px: yatay taşma yok")
    pg.set_viewport_size({"width": 375, "height": 812})
    pg.screenshot(path=SHOTS + "/v18_search.png")

    # ---------- 7) Eski veri: eski menü + özel besin + bozuk missSearches
    legacy = {"activeTab": "nutrition", "weight": 98, "missSearches": "bozuk",
              "customFoods": {"custom_1": {"name": "⭐ Ev Keki", "cat": "⭐ Özel Eklediklerim", "unit": "g", "step": 10, "def": 100, "p": 0.06, "c": 0.5, "f": 0.15}},
              "meals": [{"id": "k", "title": "Kahvaltı", "items": [{"foodId": "yulaf", "amount": 80}, {"foodId": "custom_1", "amount": 50}]}]}
    pg.evaluate("s => localStorage.setItem('ayk_plus_v5_state', s)", json.dumps(legacy)); pg.reload(); pg.wait_for_timeout(400)
    s = st(pg)
    exp_old = pg.evaluate("kcalPerUnit(BASE_FOOD_DB.yulaf) * 80 + (0.06 * 4 + 0.5 * 4 + 0.15 * 9) * 50")
    check(s["missSearches"] == [] and abs(pg.evaluate("nutritionTotals(curMeals()).cal") - exp_old) < 0.01, "eski menü ve özel besin aynı değerlerle hesaplanıyor; bozuk alan sıfırlandı")

    # ---------- 8) foods.js yüklenemezse uygulama yine açılıyor (eski listeyle)
    ctx2 = b.new_context(viewport={"width": 375, "height": 812})
    ctx2.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.getElementById('splash'); if(s) s.remove();})")
    ctx2.route("**/foods.js", lambda route: route.abort())
    pg2 = ctx2.new_page(); e2 = []; pg2.on("pageerror", lambda e: e2.append(str(e)))
    pg2.goto("http://localhost:8771/index.html"); pg2.wait_for_timeout(400)
    check(not e2 and pg2.evaluate("Object.keys(USDA_DB).length") == 0 and pg2.evaluate("Object.keys(getFoodDB()).length") >= 80, f"foods.js yoksa uygulama hatasız açılıyor {e2[:1]}")
    ctx2.close()
    sw = open(os.path.join(REPO, "sw.js"), encoding="utf-8").read()
    check("'./foods.js'" in sw, "foods.js service worker önbelleğinde (internetsiz çalışır)")
    b.close()
finally:
    srv.terminate()
print("ERRORS:", errs or "none")
print(f"{'HATA: ' + str(len(fails)) + ' kontrol başarısız' if fails else 'TÜM KONTROLLER GEÇTİ'}")
sys.exit(1 if errs or fails else 0)
