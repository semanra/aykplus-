# v51 bölüm 1 (görev 1): İngilizce besin verisi (foods-en.js) ve yükleyici.
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
  src_ok = subprocess.run(["git", "diff", "--quiet", "foods.js"], cwd=REPO).returncode == 0
  check(src_ok, "foods.js bayt bayt değişmedi (git diff --quiet)")
  sw = open(os.path.join(REPO, "sw.js"), encoding="utf-8").read()
  check("'./foods-en.js'" in sw, "sw.js FILES içinde foods-en.js")

  with sync_playwright() as p:
    b = p.chromium.launch()
    def newctx(en, block=False):
        ctx = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, locale="en-US")
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
    check(not any("foods-en.js" in u for u in reqs), "tr (bayraksız): setLang('en') sonrası da istek yok")
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
    check(pg.evaluate("typeof BASE_EN") == "object" and pg.evaluate("foodNameL(BASE_FOOD_DB[Object.keys(BASE_FOOD_DB)[0]])") == pg.evaluate("BASE_FOOD_DB[Object.keys(BASE_FOOD_DB)[0]].name"), "en: BASE_EN boşken kendi liste adı aynen")
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
    b.close()
  check(not errs, "sayfa hatası yok: %s" % errs[:3])
finally:
  srv.terminate()
print(("\nHATA: %d" % len(fails)) if fails else "\nTÜM TESTLER GEÇTİ")
sys.exit(1 if fails else 0)
