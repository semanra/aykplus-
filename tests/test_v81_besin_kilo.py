# v81: Besinler kısa liste + yeni süzgeçler; Menülerim kilo çubuğu sınırları kaçmaz
# 1) Besinler ekranı favori varsa Favoriler'le, yoksa Son kullanılanlar'la, ikisi de yoksa grup kutularıyla açılır
# 2) "Tümü" aranmıyorken uzun liste YOK: grup kutuları (sayılı), dokununca grup listesi; "Özel besin tanımla" ekranda yakın
# 3) Favoriler/Son kullanılanlar'dayken arama bütün besinlerde arar
# 4) Düşük karbonhidrat / düşük yağ süzgeçleri: kurallar, kutu sayıları süzgece uyar, İçecekler'de "Düşük yağ" ve "Yüksek protein" yok
# 5) Kilo çubuğu: uca kadar sürüklemek üst sınırı büyütmez (eskiden 600 kg'a kaçıyordu); bırakınca yeni kiloya göre kurulur; 30–300 kg
# 6) İngilizce süzgeç adları; çipler ve kutular ≥ 44 px
import os, sys, subprocess, time, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOTS = os.path.join(REPO, "tests", "shots"); os.makedirs(SHOTS, exist_ok=True)
PORT = 8837
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT)], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = f"http://localhost:{PORT}/index.html"
def boot(pg): pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(80)
SMALL = """sel => [...document.querySelectorAll(sel)].filter(e => e.offsetParent).map(e => { const r = e.getBoundingClientRect(); return [e.textContent.trim().slice(0, 20), Math.round(r.height)]; }).filter(x => x[1] < 44)"""
ROWS = "document.querySelectorAll('#foodList [data-food]').length"
TILES = "[...document.querySelectorAll('#foodTiles [data-food-tile]')].map(e => e.dataset.foodTile)"
def foods(pg):
    pg.evaluate("switchTab('nutrition'); goAddFood(0, 'day')"); pg.wait_for_timeout(200)
def search(pg, q):
    pg.fill("#foodSearch", q); pg.wait_for_timeout(400)
def drag(pg, frac):
    """Kaydırıcıyı parmakla sürüklüyormuş gibi: input olayları, sonra isteğe bağlı change."""
    return pg.evaluate("""f => { const s = $('weightSlider'); const lo = +s.min, hi = +s.max;
      s.value = lo + (hi - lo) * f; s.dispatchEvent(new Event('input', { bubbles: true }));
      return [lo, hi, +s.min, +s.max, state.weight]; }""", frac)
try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    def ctx(locale="tr-TR"):
        c = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, locale=locale, service_workers="block")
        c.add_init_script(TEST_INIT)
        pg = c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e))); pg.goto(URL); boot(pg)
        return c, pg
    c, pg = ctx()
    pg.wait_for_function("Object.keys(USDA_DB).length > 1000", timeout=8000)

    # --- 1–2) Açılış: favori/son yoksa grup kutuları
    pg.evaluate("state.favFoods = []; state.recentFoods = []; renderAll()")
    foods(pg)
    check(pg.evaluate("foodUI.cat") == "all", "favori/son yokken 'Tümü' seçili")
    tiles = pg.evaluate(TILES)
    check(pg.evaluate(ROWS) == 0 and len(tiles) >= 12, f"'Tümü' uzun liste değil, grup kutuları: {len(tiles)} kutu, {pg.evaluate(ROWS)} satır")
    check(pg.locator("#foodMore").count() == 0, "'… sonuç daha göster' düğmesi yok")
    cnt = pg.evaluate("document.querySelector('[data-food-tile=\"meyve\"]').textContent")
    real = pg.evaluate("(() => { const db = getFoodDB(); return Object.keys(db).filter(id => !isHiddenFood(db[id]) && foodKindOk(id, db[id]) && foodGroupOf(id, db[id]) === 'meyve').length; })()")
    check(re.sub(r"\D", "", cnt.split("besin")[0].split("Meyveler")[-1]) == str(real), f"kutudaki sayı doğru: {cnt!r} / {real}")
    cf = pg.evaluate("$('cfOpenBtn').getBoundingClientRect().top + scrollY")
    check(cf < 1800, f"'Özel besin tanımla' sayfanın başına yakın: {round(cf)} px (eskiden on binlerce px)")
    pg.screenshot(path=os.path.join(SHOTS, "v81_besin_kutular.png"), full_page=True)
    small = pg.evaluate(SMALL, "#foodTiles button, #foodCats button, #foodFilters button")
    check(small == [], "kutular ve çipler ≥ 44 px: " + str(small))
    pg.click("[data-food-tile='meyve']"); pg.wait_for_timeout(150)
    ids = pg.evaluate("[...document.querySelectorAll('#foodList [data-food]')].map(e => e.dataset.food)")
    check(pg.evaluate("foodUI.cat") == "g:meyve" and len(ids) > 0 and pg.evaluate("[...document.querySelectorAll('#foodList [data-food]')].every(e => foodGroupOf(e.dataset.food, getFoodDB()[e.dataset.food]) === 'meyve')"),
          f"kutuya dokununca grubun listesi ({len(ids)} satır)")
    check(pg.evaluate("document.querySelector('[data-food-cat=\"g:meyve\"]').getAttribute('aria-pressed')") == "true", "grup çipi seçili görünür")
    # arama 'Tümü'nde liste verir (kutu yok)
    pg.click("[data-food-cat='all']"); pg.wait_for_timeout(100)
    search(pg, "tavuk")
    check(pg.evaluate(ROWS) > 5 and pg.locator("#foodTiles").count() == 0, "aramada sonuç listesi (kutu yok)")
    search(pg, "")
    check(pg.locator("#foodTiles").count() == 1, "arama silinince kutular geri gelir")

    # --- 1) Favori varsa Favoriler'le, yoksa son kullanılanlarla açılır
    pg.evaluate("state.recentFoods = ['u171077', 'u173904']; renderAll()")
    foods(pg)
    check(pg.evaluate("foodUI.cat") == "recent" and pg.evaluate(ROWS) == 2, "favori yok, son kullanılan var → Son kullanılanlar (2 satır)")
    pg.evaluate("state.favFoods = ['u171077']; renderAll()")
    foods(pg)
    check(pg.evaluate("foodUI.cat") == "fav" and pg.evaluate(ROWS) == 1, "favori var → Favoriler")
    # --- 3) Favoriler'deyken arama her yerde arar
    search(pg, "mercimek")
    check(pg.evaluate(ROWS) > 0, f"Favoriler'deyken 'mercimek' bütün besinlerde bulunur ({pg.evaluate(ROWS)} sonuç)")
    search(pg, "")
    check(pg.evaluate(ROWS) == 1, "arama silinince yine favoriler")
    # elle seçilen kategori ekran içinde korunur, ekran yeniden açılınca kısa listeye döner
    pg.click("[data-food-cat='all']"); pg.wait_for_timeout(100)
    pg.evaluate("renderAll()"); pg.wait_for_timeout(100)
    check(pg.evaluate("foodUI.cat") == "all", "elle seçilen 'Tümü' yeniden çizimde korunur")
    foods(pg)
    check(pg.evaluate("foodUI.cat") == "fav", "Besinler yeniden açılınca yine Favoriler")
    # Menülerim'den besin seçince (pickFoodInFoods) seçili kart kutuların üstünde görünür
    pg.evaluate("pickFoodInFoods('u173904')"); pg.wait_for_timeout(150)
    check(pg.locator("#foodSelCard[data-food='u173904']").count() == 1 and pg.locator("#foodTiles").count() == 1, "seçili besin kartı kutuların üstünde")
    pg.evaluate("foodUI.sel = null; state.favFoods = []; state.recentFoods = []; renderAll()")

    # --- 4) Süzgeçler
    rules = pg.evaluate("""() => { const db = getFoodDB();
      const pick = id => db[id];
      return { tavukLF: foodLowFat({ unit: 'g', p: .31, c: 0, f: .036 }), yagLF: foodLowFat({ unit: 'g', p: 0, c: 0, f: 1 }),
               sutLF: foodLowFat({ unit: 'ml', p: .033, c: .048, f: .01 }), yumurtaLCarb: foodLowCarb({ unit: 'adet', p: 6.3, c: .4, f: 5 }),
               ekmekLCarb: foodLowCarb({ unit: 'g', p: .09, c: .49, f: .03 }), peynirLCarb: foodLowCarb({ unit: 'g', p: .25, c: .02, f: .27 }) }; }""")
    check(rules == {"tavukLF": False, "yagLF": False, "sutLF": True, "yumurtaLCarb": True, "ekmekLCarb": False, "peynirLCarb": True}, "süzgeç kuralları: " + str(rules))
    foods(pg)
    base = pg.evaluate("Object.fromEntries([...document.querySelectorAll('#foodTiles [data-food-tile]')].map(e => [e.dataset.foodTile, +e.textContent.replace(/\\D/g, '')]))")
    pg.click("[data-food-filter='lcarb']"); pg.wait_for_timeout(150)
    lc = pg.evaluate("Object.fromEntries([...document.querySelectorAll('#foodTiles [data-food-tile]')].map(e => [e.dataset.foodTile, +e.textContent.replace(/\\D/g, '')]))")
    check(sum(lc.values()) < sum(base.values()) and lc.get("et", 0) > 0 and lc.get("tahil", 0) < base.get("tahil", 0), f"düşük karbonhidrat kutu sayılarını azaltır (et {lc.get('et')}, tahıl {base.get('tahil')}→{lc.get('tahil', 0)})")
    pg.click("[data-food-filter='lf']"); pg.wait_for_timeout(150)
    pg.click("[data-food-tile='et']"); pg.wait_for_timeout(150)
    ok_all = pg.evaluate("[...document.querySelectorAll('#foodList [data-food]')].every(e => { const f = getFoodDB()[e.dataset.food]; return foodLowCarb(f) && foodLowFat(f); })")
    check(ok_all and pg.evaluate(ROWS) > 0, f"iki süzgeç birlikte (VE): {pg.evaluate(ROWS)} satır, hepsi uygun")
    pg.screenshot(path=os.path.join(SHOTS, "v81_besin_suzgec.png"))
    pg.evaluate("setFoodKind('drink')"); pg.wait_for_timeout(150)
    fl = pg.evaluate("[...document.querySelectorAll('#foodFilters [data-food-filter]')].map(e => e.dataset.foodFilter)")
    check(fl == ["lc", "lcarb"], "İçecekler'de yalnız düşük kalori + düşük karbonhidrat: " + str(fl))
    check(pg.evaluate(ROWS) > 0 and pg.locator("#foodTiles").count() == 0, "İçecekler'de kutu yok, liste")
    pg.evaluate("setFoodKind('food'); foodUI.fLCarb = false; foodUI.fLF = false; renderAll()")

    # --- 5) Kilo çubuğu
    pg.evaluate("state.weight = 80; state.weightLogs = []; state.settings.targetWeight = 75; state.nutriView = 'menus'; renderAll()"); pg.wait_for_timeout(150)
    lo, hi, _, _, _ = drag(pg, 0)
    check((lo, hi) == (70, 90), f"başlangıç aralığı hedef/kiloya göre: {lo}–{hi}")
    maxes = []
    for _ in range(8):
        r = drag(pg, 1.0); maxes.append(r[3])
    check(set(maxes) == {90} and pg.evaluate("state.weight") == 90, f"uca sürüklemek üst sınırı büyütmez: {maxes}, kilo {pg.evaluate('state.weight')}")
    pg.evaluate("$('weightSlider').dispatchEvent(new Event('change', { bubbles: true }))"); pg.wait_for_timeout(100)
    check(pg.evaluate("+$('weightSlider').max") == 100 and pg.evaluate("+$('weightSlider').value") == 90, "bırakınca aralık yeni kiloya göre (üst 100)")
    check(pg.evaluate("$('weightVal').textContent") in ("90", "90,0"), "kilo yazısı: " + pg.evaluate("$('weightVal').textContent"))
    # aşırı uçlar: 300 kg üstü yok
    pg.evaluate("state.weight = 295; renderAll()"); pg.wait_for_timeout(100)
    check(pg.evaluate("+$('weightSlider').max") == 300, "üst sınır en fazla 300 kg")
    # change gelmese de 2 sn sonra kendini toparlar
    pg.evaluate("state.weight = 80; renderAll()"); drag(pg, 1.0)
    pg.wait_for_timeout(2300)
    check(pg.evaluate("weightSliding") is False and pg.evaluate("+$('weightSlider').max") == 100, "change olmasa da 2 sn sonra sürükleme biter")
    # imperial: aynı kural lb'de
    pg.evaluate("setUnits('imperial'); state.weight = 80; renderAll()"); pg.wait_for_timeout(150)
    hi0 = pg.evaluate("+$('weightSlider').max")
    m2 = [drag(pg, 1.0)[3] for _ in range(5)]
    check(set(m2) == {hi0}, f"lb'de de üst sınır sabit: {hi0} → {m2}")
    pg.evaluate("$('weightSlider').dispatchEvent(new Event('change', { bubbles: true })); setUnits('metric')")
    c.close()

    # --- 6) İngilizce
    c, pg = ctx("en-US")
    pg.evaluate("setLang('en'); state.favFoods = []; state.recentFoods = []; renderAll()"); pg.wait_for_timeout(300)
    foods(pg)
    labels = pg.evaluate("[...document.querySelectorAll('#foodFilters button, #foodTiles button')].map(b => b.textContent.trim())")
    check("Low carb" in labels and "Low fat" in labels, "İngilizce süzgeç adları: " + str(labels[:4]))
    tr = [l for l in labels if re.search("[çğıöşüÇĞİÖŞÜ]", l)]
    check(not tr, "İngilizce kutularda Türkçe yok: " + str(tr[:3]))
    check(any(re.search(r"\d+ foods?$", l) for l in labels), "kutu sayısı İngilizce ('N foods')")
    c.close()
    check(errs == [], "sayfa hatası yok: " + str(errs[:3]))
    b.close()
finally:
    srv.terminate()
print("BAŞARISIZ:" if fails else "TÜMÜ GEÇTİ", fails)
sys.exit(1 if (fails or errs) else 0)
