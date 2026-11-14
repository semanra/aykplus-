# v13: Beslenme yeni temada ve tasarım dosyasındaki yapıda:
# Bugün / Menülerim / Besinler / Geçmiş sekmeleri, ikame (⇄), hazır porsiyonlar, kiloya göre gramaj,
# gündüz (açık) teması, barkod okuma (Open Food Facts; testte internet yanıtı taklit edilir).
import os, sys
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOTS = os.path.join(os.path.dirname(__file__), "shots")
os.makedirs(SHOTS, exist_ok=True)
import subprocess, time, json
srv = subprocess.Popen(['python3', '-m', 'http.server', '8765'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
def st(pg): return pg.evaluate("JSON.parse(localStorage.getItem('ayk_plus_v5_state'))")
def ov(pg):
    w = pg.evaluate("[document.documentElement.scrollWidth, document.documentElement.clientWidth]"); return w[0] <= w[1]
def view(pg, v): pg.evaluate(f"setNutriView('{v}')"); pg.wait_for_timeout(80)
SMALL_JS = """[...document.querySelectorAll('#tabNutrition button, #tabNutrition input:not([type=range]):not([type=checkbox]), #tabNutrition label, #nutriThemeBtn')]
  .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.width < 44 || r.height < 44); })
  .map(e => (e.textContent || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 30) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height))"""

# Eski biçimde kaydedilmiş veri: öğünlerde id/saat yok, listede artık olmayan bir özel besin var, eski gün özetleri.
legacy = {
  "activeTab": "nutrition", "weight": 98.4, "deficit": 500, "dayType": "train", "waterLiters": 1.75,
  "weightLogs": [{"date": "Başlangıç", "weight": 100}],
  "supplements": {"creatine": True},
  "meals": [
    {"title": "Kahvaltı", "targetNote": "Eski not", "done": True, "items": [{"foodId": "yulaf", "amount": 80}, {"foodId": "custom_silinmis", "amount": 100}]},
    {"title": "Öğle <b>kalın</b>", "done": False, "items": [{"foodId": "pirinc", "amount": 150}]},
    {"title": "Akşam", "done": False, "items": []}
  ],
  "dailyLogs": {"2026-10-01": {"kcal": 2400, "p": 190, "c": 230, "f": 70, "water": 3, "mealsDone": 4, "mealsTotal": 4, "dayType": "train"}}
}
OFF_OK = {"status": 1, "product": {"product_name": "Proteinli Yoğurt", "brands": "Deneme Süt", "nutriments": {"proteins_100g": 10, "carbohydrates_100g": 4.5, "fat_100g": 1.5, "energy-kcal_100g": 72}, "serving_quantity": 200}}
OFF_NOVAL = {"status": 1, "product": {"product_name": "Değersiz Ürün", "nutriments": {}}}

try:
  with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(color_scheme="dark", viewport={"width": 375, "height": 812}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.getElementById('splash'); if(s) s.remove();})")
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("dialog", lambda d: d.accept())
    off_calls = []
    def off_route(route):
        url = route.request.url; off_calls.append(url)
        if "/8690000000017.json" in url: route.fulfill(status=200, content_type="application/json", body=json.dumps(OFF_OK), headers={"Access-Control-Allow-Origin": "*"})
        elif "/8690000000024.json" in url: route.fulfill(status=200, content_type="application/json", body=json.dumps(OFF_NOVAL), headers={"Access-Control-Allow-Origin": "*"})
        else: route.fulfill(status=404, content_type="application/json", body='{"status":0}', headers={"Access-Control-Allow-Origin": "*"})
    ctx.route("**/world.openfoodfacts.org/**", off_route)
    pg.goto("http://localhost:8765/index.html"); pg.wait_for_timeout(300)
    pg.evaluate("switchTab('nutrition')"); pg.wait_for_timeout(100)

    # ---------- Tema ve sekmeler
    check(pg.evaluate("document.body.classList.contains('theme-nutri')"), "beslenmede theme-nutri sınıfı var")
    check(pg.evaluate("getComputedStyle(document.body).backgroundColor") == "rgb(5, 7, 6)", "zemin siyah (#050706)")
    tabs = pg.locator("#nutriNav button").all_inner_texts()
    check(tabs == ["Bugün", "Menülerim", "Besinler", "Geçmiş"], f"alt sekmeler: {tabs}")
    for name, vid in [("Menülerim", "nvMenus"), ("Besinler", "nvFoods"), ("Geçmiş", "nvHistory"), ("Bugün", "nvToday")]:
        pg.locator("#nutriNav button", has_text=name).click(); pg.wait_for_timeout(80)
        vis = pg.evaluate("['nvToday','nvMenus','nvFoods','nvHistory'].filter(id => !$(id).classList.contains('hidden'))")
        check(vis == [vid], f"'{name}' sekmesi yalnızca kendi ekranını gösteriyor")
    view(pg, "menus"); pg.reload(); pg.wait_for_timeout(300)
    check(pg.evaluate("state.nutriView") == "menus" and not pg.evaluate("$('nvMenus').classList.contains('hidden')"), "açık alt sekme yeniden açılışta hatırlanıyor")
    view(pg, "today")
    pg.evaluate("switchTab('gym')"); pg.wait_for_timeout(80)
    check(pg.evaluate("!document.body.classList.contains('theme-nutri') && !$('nutriThemeBtn').classList.contains('hidden')"), "antrenmanda beslenme teması yok; v31: tema düğmesi her sekmede")
    pg.evaluate("switchTab('nutrition')"); pg.wait_for_timeout(80)

    # ---------- Kalori halkası
    t = pg.evaluate("getTargets()"); tot = pg.evaluate("nutritionTotals()")
    pg.evaluate("setMacroView('plan')"); pg.wait_for_timeout(80)
    check(pg.inner_text("#calConsumed") == pg.evaluate(f"fmtInt({tot['cal']})") and pg.inner_text("#calTarget") == pg.evaluate(f"fmtInt({t['calTarget']})"), "halka plan ve hedef kaloriyi gösteriyor")
    pg.evaluate("curMeals().forEach(m => m.done = false); renderAll(); setMacroView('eaten')"); pg.wait_for_timeout(80)
    check(pg.inner_text("#calConsumed") == "0" and "Kalan" in pg.inner_text("#calStatus"), "Yenen görünümünde 0, Kalan yazıyor")
    pg.locator('[onchange="toggleMealDone(0)"]').check(); pg.wait_for_timeout(80)
    check(pg.inner_text("#calConsumed") == pg.evaluate("fmtInt(eatenTotals().cal)") and pg.evaluate("eatenTotals().cal") > 0, "öğün yenince halka yenen kaloriyi gösteriyor")
    pg.evaluate("setMacroView('plan')")

    # ---------- BUGÜN: zaman çizelgesi
    check(pg.locator('#todayMeals [data-today-meal="0"] button[onclick^="goAddFood(0"]').count() == 0 and "yendi" in pg.inner_text('#todayMeals [data-today-meal="0"]'), "yenmiş öğün tek satıra kapandı ('yendi')")
    pg.locator('#todayMeals [onclick="toggleMealOpen(0)"]').click(); pg.wait_for_timeout(80)
    check("TAMAMLANDI" in pg.inner_text('#todayMeals [data-today-meal="0"]'), "dokununca açıldı, 'TAMAMLANDI' yazıyor")
    pg.locator('#todayMeals [data-today-meal="0"] button[onclick="toggleMealDone(0)"]').click(); pg.wait_for_timeout(80)
    check(st(pg)["meals"][0]["done"] is False, "'Yendi'ye dokununca işaret kalkıyor")
    pg.locator('#todayMeals [data-today-meal="0"] button[onclick="toggleMealDone(0)"]', has_text="Yedim").click(); pg.wait_for_timeout(80)
    check(st(pg)["meals"][0]["done"] is True, "'Yedim' öğünü işaretliyor")
    nxt = pg.evaluate("curMeals().findIndex(m => !m.done)")
    card = pg.locator(f'#todayMeals [data-today-meal="{nxt}"] .n-card')
    check("SIRADAKİ" in card.inner_text() and "n-next" in card.get_attribute("class"), "ilk yenmemiş öğün 'SIRADAKİ' ve yeşil çerçeveli")
    pg.evaluate(f"document.querySelector('[data-today-meal=\"{nxt}\"]').scrollIntoView({{block:'start'}}); window.scrollBy(0,-90)"); pg.wait_for_timeout(100)
    pg.screenshot(path=SHOTS + "/v13_today.png")

    # ---------- İkame
    before = st(pg)["meals"][1]["items"][0]
    kcal_before = pg.evaluate("calcItemMacros(curMeals()[1].items[0]).cal")
    pg.locator("#todayMeals [onclick=\"openSwap(1, 0, 'day')\"]").click(); pg.wait_for_timeout(100)
    check(pg.evaluate("$('pickerModal').classList.contains('nm')") and "yerine" in pg.inner_text("#pickerTitle"), "ikame penceresi açıldı (beslenme temasında)")
    opts = pg.locator("#pickerList button").all_inner_texts()
    check(len(opts) >= 3 and all("kcal" in o for o in opts), f"ikame seçenekleri gramaj ve kaloriyle listeleniyor ({len(opts)} seçenek)")
    pg.locator("#pickerList button", has_text="Hindi").first.click(); pg.wait_for_timeout(100)
    after = pg.evaluate("dayMeals()[1].items[0]")
    kcal_after = pg.evaluate("calcItemMacros(dayMeals()[1].items[0]).cal")
    check(after["foodId"] == "u174515" and abs(kcal_after - kcal_before) <= 15, f"tavuk → hindi, kalori korunuyor ({round(kcal_before)} → {round(kcal_after)})")
    check(st(pg)["meals"][1]["items"][0] == before, "v14: Bugün'deki ikame menüyü değiştirmiyor")
    pg.locator("#toastWrap button", has_text="Geri al").first.click(); pg.wait_for_timeout(100)
    check(pg.evaluate("dayMeals()[1].items[0]") == before and st(pg)["dayPlan"] is None, "ikame Geri al ile geri alınıyor")
    check(pg.locator('#todayMeals [data-today-meal="1"] [onclick^="openSwap(1, 2)"]').count() == 0, "grubu olmayan besinde (salata) ikame düğmesi yok")

    # ---------- Su ve takviyeler
    pg.evaluate("state.waterLiters = 0; state.settings.waterTarget = 3.5; state.settings.waterAuto = false; renderAll()")
    pg.locator("#nvToday button", has_text="+500 ml").click(); pg.locator("#nvToday button", has_text="+250 ml").click(); pg.wait_for_timeout(80)
    ring = pg.evaluate("document.getElementById('waterRing').style.strokeDashoffset")
    check(pg.inner_text("#waterVal") == "0,75" and pg.inner_text("#waterPct") == "%21" and abs(float(ring) - 364.42 * 0.79) < 0.5, f"v24: su 0,75 L, %21, halka {ring}")
    pg.locator("#suppList .n-pill-main").first.click(); pg.wait_for_timeout(80)
    check("taken" in pg.locator("#suppList .n-pill").first.get_attribute("class"), "takviye işaretleniyor")

    # ---------- MENÜLERİM
    view(pg, "menus")
    mt = pg.inner_text("#menuTotal")
    check("Menü toplamı" in mt and ("Hedefe uygun" in mt or "fazla" in mt or "eksik" in mt) and "protein" in mt, "menü toplamı kartı ve durum yazısı")
    check(pg.locator("#mealsContainer [data-meal-card]").count() == len(st(pg)["meals"]) and pg.locator("#mealsContainer .drag-handle").count() == len(st(pg)["meals"]), "her öğünde sürükleme tutamacı")
    pg.locator('#mealsContainer [onclick="toggleMenuMeal(1)"]').click(); pg.wait_for_timeout(80)
    check(pg.locator('#mealsContainer [data-meal-card="1"] [data-fk="amt-1-0"]').count() == 1, "öğün açılınca gramaj kutuları görünüyor")
    a0 = st(pg)["meals"][1]["items"][0]["amount"]
    pg.locator('#mealsContainer [onclick="changeAmount(1, 0, 1)"]').click(); pg.wait_for_timeout(80)
    check(st(pg)["meals"][1]["items"][0]["amount"] > a0, "+ düğmesi miktarı artırıyor")
    inp = pg.locator('#mealsContainer [data-fk="amt-1-0"]')
    check(inp.get_attribute("inputmode") == "decimal", "miktar kutusu ondalık klavyeli")
    inp.fill("123,5"); inp.press("Enter"); pg.wait_for_timeout(80)
    check(st(pg)["meals"][1]["items"][0]["amount"] == 123.5, "Türkçe virgüllü miktar doğru okunuyor")
    n_items = len(st(pg)["meals"][1]["items"])
    pg.locator('#mealsContainer [onclick="removeItem(1, 0)"]').click(); pg.wait_for_timeout(80)
    tb = pg.locator("#toastWrap button", has_text="Geri al").first
    check(tb.count() == 1 and "n-btn" in tb.get_attribute("class"), "besin silinince yeşil 'Geri al'")
    tb.click(); pg.wait_for_timeout(80)
    check(len(st(pg)["meals"][1]["items"]) == n_items, "Geri al besini geri getirdi")
    check(pg.locator('#mealsContainer [onclick="copyMeal(1)"]', has_text="Dinlenmeye kopyala").count() == 1, "antrenman menüsünde 'Dinlenmeye kopyala'")
    pg.click("#mnRest"); pg.wait_for_timeout(80)
    check(pg.evaluate("state.dayType") == "rest" and "on" in pg.get_attribute("#btnRest", "class"), "Menülerim'deki dinlenme seçimi Bugün ile aynı")
    pg.click("#mnTrain"); pg.wait_for_timeout(80)
    pg.screenshot(path=SHOTS + "/v13_menus.png")

    # ---------- Kiloya göre gramaj
    pg.evaluate("state.weight = 100; renderAll()")
    tav = pg.evaluate("curMeals()[1].items.findIndex(i => i.foodId === 'tavuk_gogsu')")
    raw = st(pg)["meals"][1]["items"][tav]["amount"]
    pg.locator("#scaleToggle").check(); pg.wait_for_timeout(80)
    s = st(pg)["settings"]
    check(s["scaleOn"] is True and s["scaleBase"] == 100, "ayar açılınca referans kilo şimdiki kilo oldu")
    pg.evaluate("state.weight = 110; renderAll()"); pg.wait_for_timeout(80)
    shown = pg.input_value(f'#mealsContainer [data-fk="amt-1-{tav}"]')
    check(shown == str(round(raw * 1.1)).replace(".", ",") and st(pg)["meals"][1]["items"][tav]["amount"] == raw, f"kilo %10 artınca tavuk {raw} → {shown} g görünüyor, kayıt değişmedi")
    egg = pg.evaluate("curMeals()[0].items.find(i => i.foodId === 'tam_yumurta')")
    check(egg is None or pg.evaluate("effAmount(curMeals()[0].items.find(i => i.foodId === 'tam_yumurta'))") == egg["amount"], "adetle ölçülen besin (yumurta) ölçeklenmiyor")
    check("%110" in pg.inner_text("#scaleCard"), "kartta %110 oran yazıyor")
    pg.locator(f'#mealsContainer [data-fk="amt-1-{tav}"]').fill("250"); pg.locator(f'#mealsContainer [data-fk="amt-1-{tav}"]').press("Enter"); pg.wait_for_timeout(80)
    check(pg.input_value(f'#mealsContainer [data-fk="amt-1-{tav}"]') == "250", "ölçekliyken yazılan gramaj aynen görünüyor")
    pg.locator("#scaleToggle").uncheck(); pg.wait_for_timeout(80)
    check(pg.input_value(f'#mealsContainer [data-fk="amt-1-{tav}"]') == "227,3", "ayar kapatılınca referans gramaja dönüyor (250 / 1,1 = 227,3)")
    pg.locator("#scaleToggle").check(); pg.evaluate("state.weight = 105; renderAll()"); pg.wait_for_timeout(80)
    pg.evaluate("resetScaleBase()"); pg.wait_for_timeout(80)
    check(st(pg)["settings"]["scaleBase"] == 105 and pg.evaluate("scaleK()") == 1, "'gramajları sabitle' referansı şimdiki kilo yapıyor")
    pg.locator("#scaleToggle").uncheck(); pg.evaluate("state.weight = 100; renderAll()")

    # ---------- BESİNLER
    view(pg, "today")
    pg.locator(f"#todayMeals button[onclick=\"goAddFood({nxt}, 'day')\"]").click(); pg.wait_for_timeout(100)
    check(pg.evaluate("state.nutriView") == "foods" and pg.evaluate("foodTargetIdx()") == nxt, "'+ Besin' Besinler'i doğru öğün seçili açıyor")
    cats = pg.locator("#foodCats button").all_inner_texts()
    check("Tümü" in cats and any("Türk Mutfağı" in c for c in cats) and not any("🇹🇷" in c for c in cats), "kategori düğmeleri (emojisiz)")
    pg.fill("#foodSearch", "yulaf"); pg.wait_for_timeout(300)   # v26: arama ~150 ms bekler
    check(pg.locator("#foodList [data-food]").count() >= 1 and "Yulaf" in pg.inner_text("#foodList"), "arama sonuç veriyor")
    pg.locator('#foodList [data-food="u173904"]').click(); pg.wait_for_timeout(100)
    check(pg.locator("#foodSelCard").count() == 1 and pg.input_value("#foodAmt") == pg.evaluate("fmtNum(getFoodDB().u173904.def)"), "besin seçilince varsayılan porsiyonu ile kart açılıyor")
    pg.locator("#foodSelCard [data-preset='100']").click(); pg.wait_for_timeout(50)
    check(pg.input_value("#foodAmt") == "100" and "on" in pg.locator("#foodSelCard [data-preset='100']").get_attribute("class"), "hazır porsiyon 100 g seçildi")
    pg.locator("#foodSelCard button", has_text="+50").click(); pg.wait_for_timeout(50)
    check(pg.input_value("#foodAmt") == "150", "+50 g porsiyonu ekliyor")
    pg.locator("#foodAmt").fill("65"); pg.wait_for_timeout(50)
    k65 = round(65 * pg.evaluate("kcalPerUnit(getFoodDB().u173904)"))
    check(pg.inner_text("#foodSelKcal") == pg.evaluate(f"fmtInt({k65})") and str(k65) in pg.inner_text("#foodAddBtn").replace(".", ""), "elle yazılan miktarda kalori canlı güncelleniyor")
    check(pg.evaluate("document.activeElement && document.activeElement.id") == "foodAmt", "yazarken kutu odakta kalıyor (klavye kapanmıyor)")
    check("Ekledikten sonra" in pg.inner_text("#foodRemain"), "canlı 'ekledikten sonra kalan' yazısı")
    menu_before = st(pg)["meals"][nxt]["items"]
    y0 = sum(i["amount"] for i in pg.evaluate(f"dayMeals()[{nxt}].items") if i["foodId"] == "u173904")
    pg.locator("#foodAddBtn").click(); pg.wait_for_timeout(100)
    y1 = sum(i["amount"] for i in pg.evaluate(f"dayMeals()[{nxt}].items") if i["foodId"] == "u173904")
    check(y1 - y0 == 65, f"65 g yulaf seçili öğüne (bugün) eklendi ({y0} → {y1})")
    check(st(pg)["meals"][nxt]["items"] == menu_before, "v14: Bugün'den eklenen besin menüyü değiştirmiyor")
    pg.locator("#foodMealChips button").nth(0).click(); pg.wait_for_timeout(50)
    check(pg.evaluate("foodTargetIdx()") == 0, "öğün düğmesiyle hedef öğün değişiyor")
    pg.fill("#foodSearch", ""); pg.evaluate("renderFoodList()")
    pg.screenshot(path=SHOTS + "/v13_foods.png")

    # ---------- BARKOD
    pg.locator('#nvFoods button[aria-label="Barkod okut"]').click(); pg.wait_for_timeout(1200)
    check(pg.evaluate("$('barcodeModal').classList.contains('flex')"), "barkod penceresi açıldı")
    check(len(pg.inner_text("#bcStatus")) > 0 and pg.is_visible("#bcManual"), f"kamera durumu yazıyor, elle giriş var: {pg.inner_text('#bcStatus')!r}")
    check(pg.evaluate("typeof window.ZXing") == "object", "barkod okuyucu (ZXing) uygulamanın içinden yüklendi")
    pg.fill("#bcManual", "123"); pg.click("#bcSearchBtn"); pg.wait_for_timeout(100)
    check("Geçerli bir barkod" in pg.inner_text("#bcStatus"), "kısa numarada uyarı")
    pg.fill("#bcManual", "8690000000017"); pg.click("#bcSearchBtn"); pg.wait_for_timeout(500)
    check("Proteinli Yoğurt" in pg.inner_text("#bcResult") and "72 kcal" in pg.inner_text("#bcResult"), "ürün bulundu, 100 g değerleri gösteriliyor")
    pg.locator("#bcResult button", has_text="Listeme ekle").click(); pg.wait_for_timeout(200)
    cf = st(pg)["customFoods"].get("custom_bc_8690000000017")
    check(cf is not None and cf["barcode"] == "8690000000017" and abs(cf["p"] - 0.10) < 1e-9 and cf["def"] == 200, "ürün barkoduyla listeye eklendi (porsiyon 200 g)")
    check(pg.evaluate("foodUI.sel") == "custom_bc_8690000000017" and pg.input_value("#foodAmt") == "200", "eklenen ürün Besinler'de seçili açıldı")
    ctx.set_offline(True)
    n_calls = len(off_calls)
    pg.evaluate("openBarcode()"); pg.wait_for_timeout(300); pg.fill("#bcManual", "8690000000017"); pg.click("#bcSearchBtn"); pg.wait_for_timeout(200)
    check(len(off_calls) == n_calls and pg.evaluate("foodUI.sel") == "custom_bc_8690000000017" and not pg.evaluate("$('barcodeModal').classList.contains('flex')"), "daha önce eklenen barkod internetsiz tanındı")
    pg.evaluate("openBarcode()"); pg.wait_for_timeout(300); pg.fill("#bcManual", "8690000000099"); pg.click("#bcSearchBtn"); pg.wait_for_timeout(200)
    check("internet gerekli" in pg.inner_text("#bcStatus") and len(off_calls) == n_calls, "internetsizken yeni barkodda 'internet gerekli' uyarısı")
    ctx.set_offline(False)
    pg.fill("#bcManual", "8690000000099"); pg.click("#bcSearchBtn"); pg.wait_for_timeout(400)
    check(pg.evaluate("$('customFoodModal').classList.contains('flex') && $('customFoodModal').classList.contains('nm')") and "Etiketteki" in pg.inner_text("#cfTitle"), "v14: veritabanında olmayan üründe etiket formu doğrudan açıldı")
    pg.fill("#cfName", "Ev Yapımı Bar"); pg.fill("#cfP", "20"); pg.click("#customFoodModal >> text=Kaydet"); pg.wait_for_timeout(150)
    cf2 = st(pg)["customFoods"].get("custom_bc_8690000000099")
    check(cf2 is not None and cf2["barcode"] == "8690000000099", "elle eklenen besin barkodla kaydedildi")
    pg.evaluate("openBarcode()"); pg.wait_for_timeout(300); pg.fill("#bcManual", "8690000000024"); pg.click("#bcSearchBtn"); pg.wait_for_timeout(400)
    check("eksik" in pg.inner_text("#bcStatus") and pg.locator("#bcResult button", has_text="Elle ekle").count() == 1, "besin değeri eksik üründe 'Elle ekle'")
    pg.evaluate("closeBarcode()"); pg.wait_for_timeout(80)
    check(pg.evaluate("!$('bcVideo').srcObject"), "pencere kapanınca kamera kapanıyor")
    # Barkodlu besini düzenleyince barkod kaybolmamalı
    pg.evaluate("editCustomFood('custom_bc_8690000000017')"); pg.wait_for_timeout(80); pg.fill("#cfP", "11"); pg.click("#customFoodModal >> text=Kaydet"); pg.wait_for_timeout(100)
    check(st(pg)["customFoods"]["custom_bc_8690000000017"].get("barcode") == "8690000000017", "düzenlenen barkodlu besin barkodunu koruyor")

    # ---------- GEÇMİŞ
    pg.evaluate("state.dailyLogs['2026-10-02'] = {kcal: 2500, eatenKcal: 2300, eatenP: 180, calTarget: 2478, proTarget: 201, water: 3.25, mealsDone: 3, mealsTotal: 4, supps: 2, dayType: 'rest'}; renderAll()")
    view(pg, "history")
    h = pg.inner_text("#nutriHistory")
    check("Bugün" in h and "devam ediyor" in h, "geçmişte bugün (devam ediyor) var")
    d2 = pg.inner_text('[data-history-day="2026-10-02"]')
    check("2.300" in d2 and "Dinlenme" in d2 and "3,3" in d2 and "3/4" in d2, f"gün özeti doğru: {d2!r}")
    pg.screenshot(path=SHOTS + "/v13_history.png")

    # ---------- Gündüz teması
    view(pg, "today")
    pg.click("#nutriThemeBtn"); pg.wait_for_timeout(100)
    check(pg.evaluate("document.body.classList.contains('nutri-light')") and pg.evaluate("getComputedStyle(document.body).backgroundColor") == "rgb(243, 245, 242)" and st(pg)["settings"]["theme"] == "light", "güneş düğmesi gündüz temasını açıyor ve kaydediyor")
    check(pg.evaluate("getComputedStyle(document.querySelector('.n-hero')).color") == "rgb(255, 255, 255)", "gündüzde özet kartı koyu kalıyor")
    check(pg.get_attribute("#nutriThemeBtn", "aria-label") == "Koyu temaya geç", "düğme 'Koyu temaya geç' oldu")
    pg.screenshot(path=SHOTS + "/v13_light.png")
    pg.evaluate("switchTab('gym')"); pg.wait_for_timeout(80)
    check(not pg.evaluate("document.body.classList.contains('nutri-light')") and pg.evaluate("document.documentElement.classList.contains('light')"), "v31: aydınlık tema tüm uygulamada (antrenmanda html.light, nutri-light yalnız beslenmede)")
    pg.evaluate("switchTab('nutrition')"); pg.click("#nutriThemeBtn"); pg.wait_for_timeout(80)
    check(not pg.evaluate("document.body.classList.contains('nutri-light')"), "tekrar basınca gece temasına dönüyor")

    # ---------- Dokunma alanları ve taşma (tüm alt sekmelerde)
    for v in ["today", "menus", "foods", "history"]:
        view(pg, v)
        if v == "menus": pg.evaluate("toggleMenuMeal(0)")
        if v == "foods": pg.evaluate("selectFood('tavuk_gogsu')")
        small = pg.evaluate(SMALL_JS)
        check(not small, f"{v}: tüm düğmeler en az 44 px {small}")
        for w in (375, 320):
            pg.set_viewport_size({"width": w, "height": 740}); pg.wait_for_timeout(60)
            check(ov(pg), f"{v} {w} px: yatay taşma yok")
        pg.set_viewport_size({"width": 375, "height": 812})

    # ---------- Antrenmandan açılan pencere antrenman temasında kalıyor
    pg.evaluate("switchTab('gym'); openPicker('Test', [{label:'A', items:[{label:'x'}]}], () => {})"); pg.wait_for_timeout(80)
    check(pg.evaluate("$('pickerModal').classList.contains('tm') && !$('pickerModal').classList.contains('nm')"), "antrenmandan açılan seçici antrenman temasında")
    pg.evaluate("closeModal('pickerModal'); switchTab('nutrition')")

    # ---------- Eski biçimli veri
    pg.evaluate("s => localStorage.setItem('ayk_plus_v5_state', s)", json.dumps(legacy))
    pg.reload(); pg.wait_for_timeout(400)
    s2 = st(pg)
    check(s2["meals"][0]["title"] == "Kahvaltı" and s2["meals"][0]["done"] is True and s2["weight"] == 98.4 and s2["waterLiters"] == 1.75, "eski kayıt bozulmadan yüklendi")
    check(s2["nutriView"] == "today" and s2["settings"]["scaleOn"] is False and s2["settings"]["nutriLight"] is False and s2["settings"]["theme"] == "system", "yeni alanlar varsayılan değerle eklendi")
    check(pg.locator('#todayMeals [data-today-meal]').count() == 3, "eski kayıttaki 3 öğün Bugün'de görünüyor")
    check(pg.locator("#todayMeals b").count() == 0 and "<b>" in pg.inner_text('#todayMeals [data-today-meal="1"]'), "öğün adındaki HTML metin olarak gösteriliyor")
    view(pg, "history")
    check("2.400" in pg.inner_text('[data-history-day="2026-10-01"]') and "planlanan" in pg.inner_text('[data-history-day="2026-10-01"]'), "eski gün özeti (yenen bilgisi yok) 'planlanan' olarak gösteriliyor")
    b.close()
finally:
    srv.terminate()
print("ERRORS:", errs or "none")
print(f"{'HATA: ' + str(len(fails)) + ' kontrol başarısız' if fails else 'TÜM KONTROLLER GEÇTİ'}")
sys.exit(1 if errs or fails else 0)
