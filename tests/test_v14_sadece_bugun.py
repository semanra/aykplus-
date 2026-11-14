# v14 (1. paket): "Sadece bugün" / "Menüye de kaydet" ayrımı, Dışarıda yedim + Günü dengele,
# barkod bulunamayınca etiket formu (100 g / porsiyon, kalori), kiloya göre gramaj ↔ kalori koçu.
import os, sys
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOTS = os.path.join(os.path.dirname(__file__), "shots")
os.makedirs(SHOTS, exist_ok=True)
import subprocess, time, json
srv = subprocess.Popen(['python3', '-m', 'http.server', '8766'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
def st(pg): return pg.evaluate("JSON.parse(localStorage.getItem('ayk_plus_v5_state'))")
def ov(pg):
    w = pg.evaluate("[document.documentElement.scrollWidth, document.documentElement.clientWidth]"); return w[0] <= w[1]
def view(pg, v): pg.evaluate(f"setNutriView('{v}')"); pg.wait_for_timeout(80)
def undo(pg): pg.locator("#toastWrap button", has_text="Geri al").last.click(); pg.wait_for_timeout(100)
SMALL_JS = """[...document.querySelectorAll('#tabNutrition button, #tabNutrition input:not([type=range]):not([type=checkbox]), #tabNutrition label, #freeMealModal button, #freeMealModal input:not([type=checkbox])')]
  .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.width < 44 || r.height < 44); })
  .map(e => (e.textContent || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 30) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height))"""

try:
  with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(color_scheme="dark", viewport={"width": 375, "height": 812}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.getElementById('splash'); if(s) s.remove();})")
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("dialog", lambda d: d.accept())
    ctx.route("**/world.openfoodfacts.org/**", lambda route: route.fulfill(status=404, content_type="application/json", body='{"status":0}', headers={"Access-Control-Allow-Origin": "*"}))
    pg.goto("http://localhost:8766/index.html"); pg.wait_for_timeout(300)
    pg.evaluate("switchTab('nutrition'); setNutriView('today')"); pg.wait_for_timeout(100)
    menu0 = st(pg)["meals"]

    # ---------- 1) Bugün'de düzenleme yalnızca bugünü etkiler
    check(st(pg).get("dayPlan") is None, "başlangıçta bugüne özel kopya yok")
    pg.locator('[data-edit-btn="1"]').click(); pg.wait_for_timeout(80)
    check(pg.locator('[data-edit-panel="1"]').count() == 1 and "yalnızca bugünü" in pg.inner_text('[data-edit-panel="1"]'), "düzenle → bugün paneli açıldı")
    a_menu = menu0[1]["items"][1]["amount"]   # pirinç 90 g
    pg.locator('#todayMeals [onclick="dayChangeAmount(1, 1, 1)"]').click(); pg.wait_for_timeout(80)
    s = st(pg)
    check(s["dayPlan"] is not None and s["dayPlan"]["train"][1]["items"][1]["amount"] > a_menu, "artırma bugünkü kopyada yapıldı")
    check(s["meals"] == menu0, "Menülerim değişmedi")
    check(pg.locator("#dayDiffBanner").count() == 1 and "BUGÜNE ÖZEL" in pg.inner_text('#todayMeals [data-today-meal="1"]'), "bant ve 'BUGÜNE ÖZEL' etiketi görünüyor")
    inp = pg.locator('#todayMeals [data-fk="damt-1-1"]')
    inp.fill("120,5"); inp.press("Enter"); pg.wait_for_timeout(80)
    check(st(pg)["dayPlan"]["train"][1]["items"][1]["amount"] == 120.5, "bugünkü miktar virgüllü yazılabiliyor")
    check(pg.evaluate("Math.round(nutritionTotals().cal)") != pg.evaluate("Math.round(nutritionTotals(curMeals()).cal)"), "halka bugünkü planı, Menülerim menüyü hesaplıyor")
    view(pg, "menus")
    check(pg.locator("#menuDayNote").count() == 1 and "bugünü değiştirmez" in pg.inner_text("#menuDayNote"), "Menülerim'de 'bugüne özel değişiklik var' notu")
    view(pg, "today")
    pg.evaluate("document.querySelector('#dayDiffBanner').scrollIntoView({block:'start'}); window.scrollBy(0,-70)"); pg.wait_for_timeout(80)
    pg.screenshot(path=SHOTS + "/v14_today_edit.png")

    # Menüye de kaydet
    pg.locator("#dayDiffBanner button", has_text="Menüye de kaydet").click(); pg.wait_for_timeout(100)
    s = st(pg)
    check(s["meals"][1]["items"][1]["amount"] == 120.5 and pg.locator("#dayDiffBanner").count() == 0, "'Menüye de kaydet' menüyü güncelledi, bant kalktı")
    undo(pg)
    check(st(pg)["meals"][1]["items"][1]["amount"] == a_menu, "Menüye kaydet Geri al ile geri alındı")

    # Besin çıkarma (yalnızca bugün) + Geri al
    n_day = len(pg.evaluate("dayMeals()[1].items"))
    pg.locator('#todayMeals [onclick="dayRemoveItem(1, 2)"]').click(); pg.wait_for_timeout(80)
    check(len(pg.evaluate("dayMeals()[1].items")) == n_day - 1 and len(st(pg)["meals"][1]["items"]) == 4, "besin bugünden çıkarıldı, menüde duruyor")
    undo(pg)
    check(len(pg.evaluate("dayMeals()[1].items")) == n_day, "çıkarma Geri al ile geri geldi")

    # Menüdeki hâline dön
    pg.locator("#dayDiffBanner button", has_text="Bugünü menüye geri döndür").click(); pg.wait_for_timeout(100)
    check(st(pg)["dayPlan"]["train"] is None and pg.locator("#dayDiffBanner").count() == 0, "'Menüdeki hâline dön' bugünkü kopyayı sildi")

    # ---------- 2) Yarısını yedim
    pg.evaluate("toggleMealEdit(0)"); pg.wait_for_timeout(50)
    pg.locator('[data-edit-panel="0"] button', has_text="Yarısını yedim").click(); pg.wait_for_timeout(100)
    d0 = pg.evaluate("dayMeals()[0]")
    check(d0["done"] is True and d0["items"][1]["amount"] == 40 and d0["items"][0]["amount"] == 1.5, f"yarısı: yulaf 80→40 g, yumurta 3→1,5 ({d0['items'][1]['amount']}, {d0['items'][0]['amount']})")
    check(st(pg)["meals"][0]["items"] == menu0[0]["items"], "yarısını yedim menüyü değiştirmedi")
    undo(pg)

    # ---------- 3) Dışarıda yedim + Günü dengele
    tg = pg.evaluate("getTargets().calTarget")
    tav_before = [i["amount"] for i in pg.evaluate("dayMeals()[1].items") if i["foodId"] == "tavuk_gogsu"]
    pg.evaluate("toggleMealEdit(0)"); pg.wait_for_timeout(50)
    pg.locator('[data-edit-panel="0"] button', has_text="Dışarıda yedim").click(); pg.wait_for_timeout(100)
    check(pg.evaluate("$('freeMealModal').classList.contains('flex')"), "'Dışarıda yedim' penceresi açıldı")
    pg.fill("#fmName", "Döner <b>dürüm</b>"); pg.fill("#fmKcal", "1800"); pg.fill("#fmP", "45"); pg.wait_for_timeout(50)
    check("aşar" in pg.inner_text("#fmHint") and not pg.is_disabled("#fmBalance"), "aşım uyarısı yazıyor, 'Günü dengele' seçilebilir")
    pg.screenshot(path=SHOTS + "/v14_free_meal.png")
    pg.locator("#fmBalance").check()
    pre_total = pg.evaluate("freeMealPreview().total")
    pg.locator("#freeMealModal button", has_text="Kaydet").click(); pg.wait_for_timeout(150)
    dm = pg.evaluate("dayMeals()")
    check(len(dm[0]["items"]) == 1 and dm[0]["items"][0]["est"]["cal"] == 1800 and dm[0]["done"] is True, "tahmini giriş öğünün yerine geçti, öğün yendi")
    check(st(pg)["meals"] == menu0, "dışarıda yemek menüyü değiştirmedi")
    tav_after = [i["amount"] for i in dm[1]["items"] if i["foodId"] == "tavuk_gogsu"]
    check(tav_after == tav_before, "dengelemede protein kaynağı (tavuk) değişmedi")
    rice = [i for i in dm[1]["items"] if i["foodId"] == "pirinc"]
    check(rice and 22.5 <= rice[0]["amount"] < 90, f"dengelemede pirinç kısıldı ama en az dörtte biri kaldı ({rice and rice[0]['amount']} g)")
    check([len(m["items"]) for m in dm[1:]] == [len(m["items"]) for m in menu0[1:]], "dengeleme hiçbir besini silmedi")
    sal = [i for i in dm[1]["items"] if i["foodId"] == "yesil_salata"]
    check(sal and sal[0]["amount"] == 1, "düşük kalorili sebzeye (salata) dokunulmadı")
    total = pg.evaluate("nutritionTotals().cal")
    check(any(num < 0 for num in [m.get("balanced", 0) for m in dm]) and pg.locator("[data-balanced]").count() >= 1, "hangi öğünün kısıldığı kartta yazıyor")
    check(total < pre_total - 100, f"gün hedefe yaklaştı (dengelemesiz {round(pre_total)} → {round(total)}, hedef {tg})")
    pg.evaluate("openDoneMeals.add(dayMeals()[0].id); renderAll()")
    check(pg.locator("#todayMeals b").count() == 0, "tahmini girişin adı HTML olarak işlenmiyor")
    pg.evaluate("document.querySelector('[data-today-meal=\"1\"]').scrollIntoView({block:'start'}); window.scrollBy(0,-70)"); pg.wait_for_timeout(80)
    pg.screenshot(path=SHOTS + "/v14_balanced.png")
    # Menüye kaydet: dışarıda yenen öğün menüye yazılmaz
    pg.locator("#dayDiffBanner button", has_text="Menüye de kaydet").click(); pg.wait_for_timeout(100)
    s = st(pg)
    check(len(s["meals"][0]["items"]) == 4 and not any("est" in i for m in s["meals"] for i in m["items"]), "dışarıda yenen öğün menüye yazılmadı")
    undo(pg); undo_ok = st(pg)["meals"] == menu0
    check(undo_ok, "menüye kaydet geri alındı")
    pg.evaluate("snapshot()")

    # Küçük aşımda gün tam hedefe iner
    pg.evaluate("revertDayToMenu()"); pg.wait_for_timeout(80)
    check(pg.evaluate("dayCopy() === null"), "'Menüdeki hâline dön' dışarıda yemeği de temizledi")
    pg.evaluate("openFreeMeal(0)"); pg.fill("#fmKcal", "1000"); pg.fill("#fmP", "40"); pg.wait_for_timeout(50)
    pg.locator("#fmBalance").check(); pg.locator("#freeMealModal button", has_text="Kaydet").click(); pg.wait_for_timeout(150)
    total2 = pg.evaluate("nutritionTotals().cal")
    check(abs(total2 - tg) <= 60, f"küçük aşımda gün hedefe indi ({round(total2)} / {tg})")
    tmsg = pg.locator("#toastWrap > div").last.inner_text()
    check("Günü dengeledim" in tmsg and len(tmsg) < 160, f"bildirim kısa ve anlaşılır: {tmsg!r}")
    pg.evaluate("snapshot()")

    # ---------- 4) Gece yarısı: bugünkü kopya arşivlenir, yeni gün menüden başlar
    day_cal = round(pg.evaluate("nutritionTotals().cal"))
    pg.evaluate("state.today = '2026-01-05'; state.dayPlan.date = '2026-01-05'; checkNewDay(); renderAll()"); pg.wait_for_timeout(100)
    s = st(pg)
    check(s["dailyLogs"]["2026-01-05"]["kcal"] == day_cal, f"gün özeti bugünkü (dışarıda yenen dahil) toplamla arşivlendi ({day_cal})")
    check(s["dayPlan"] is None and [m["items"] for m in s["meals"]] == [m["items"] for m in menu0] and not any(m["done"] for m in s["meals"]), "yeni gün: bugünkü kopya silindi, menü temiz")
    check(pg.evaluate("dayMeals() === curMeals()"), "yeni günde Bugün menüyü gösteriyor")

    # ---------- 5) Besinler: Bugüne ekle + 'Menüye de kaydet' (bildirimden)
    pg.evaluate("goAddFood(2, 'day')"); pg.wait_for_timeout(100)
    check("on" in pg.get_attribute("#fdDay", "class") and "bugün hangi" in pg.inner_text("#foodHead").lower(), "Besinler 'Bugüne ekle' seçili açıldı")
    pg.evaluate("selectFood('u170567')"); pg.wait_for_timeout(50)
    pg.locator("#foodAmt").fill("30"); pg.locator("#foodAddBtn").click(); pg.wait_for_timeout(100)
    check(any(i["foodId"] == "u170567" for i in pg.evaluate("dayMeals()[2].items")) and not any(i["foodId"] == "u170567" for i in st(pg)["meals"][2]["items"]), "badem bugüne eklendi, menüye değil")
    pg.locator("#toastWrap button", has_text="Menüye de kaydet").last.click(); pg.wait_for_timeout(100)
    check(any(i["foodId"] == "u170567" and i["amount"] == 30 for i in st(pg)["meals"][2]["items"]), "'Menüye de kaydet' bademi menüye de ekledi")
    pg.click("#fdMenu"); pg.wait_for_timeout(50)
    check("menüde hangi" in pg.inner_text("#foodHead").lower() and "menüde" in pg.inner_text("#foodRemain").lower(), "'Menüye ekle' seçilince başlık ve kalan yazısı menüye göre")
    pg.screenshot(path=SHOTS + "/v14_foods_dest.png")

    # ---------- 6) Barkod bulunamadı → etiket formu (porsiyon başına + kalori)
    pg.evaluate("openBarcode()"); pg.wait_for_timeout(300)
    pg.fill("#bcManual", "8690000000123"); pg.click("#bcSearchBtn"); pg.wait_for_timeout(400)
    check(pg.evaluate("$('customFoodModal').classList.contains('flex')") and "Etiketteki" in pg.inner_text("#cfTitle") and "8690000000123" in pg.inner_text("#cfHint"), "bulunamayan barkodda etiket formu açıldı")
    pg.fill("#cfName", "Protein Bar"); pg.select_option("#cfUnit", "serv")
    check("porsiyon" in pg.inner_text("#cfDefLabel"), "porsiyon seçilince 'kaç gram' soruluyor")
    pg.fill("#cfDef", "40"); pg.fill("#cfK", "180"); pg.fill("#cfP", "20"); pg.fill("#cfC", "15"); pg.fill("#cfF", "6")
    pg.click("#customFoodModal >> text=Kaydet"); pg.wait_for_timeout(150)
    cf = st(pg)["customFoods"].get("custom_bc_8690000000123")
    check(cf is not None and cf["unit"] == "g" and abs(cf["p"] - 0.5) < 1e-9 and abs(cf["kcal"] - 4.5) < 1e-9 and cf["def"] == 40 and cf["serv"] == 40, "porsiyon değerleri grama çevrilip barkodla kaydedildi")
    check(pg.evaluate("Math.round(kcalPerUnit(getFoodDB()['custom_bc_8690000000123']) * 40)") == 180, "etiketteki kalori (180 kcal/porsiyon) kullanılıyor")
    pg.evaluate("editCustomFood('custom_bc_8690000000123')"); pg.wait_for_timeout(80)
    check(pg.input_value("#cfUnit") == "serv" and pg.input_value("#cfDef") == "40" and pg.input_value("#cfK") == "180" and pg.input_value("#cfP") == "20", "düzenlerken porsiyon değerleri geri geliyor")
    pg.evaluate("closeModal('customFoodModal')")
    ctx.set_offline(True)
    pg.evaluate("openBarcode()"); pg.wait_for_timeout(300); pg.fill("#bcManual", "8690000000123"); pg.click("#bcSearchBtn"); pg.wait_for_timeout(200)
    check(pg.evaluate("foodUI.sel") == "custom_bc_8690000000123", "kaydedilen barkod sonra internetsiz tanındı")
    ctx.set_offline(False)

    # ---------- 7) Kiloya göre gramaj ↔ kalori koçu: aynı düzeltme iki kez uygulanmıyor
    pg.evaluate("state.weight = 100; state.settings.scaleOn = false; renderAll()")
    t_off = pg.evaluate("getTargets().calTarget")
    pg.evaluate("toggleWeightScale(true); state.weight = 90; renderAll()")
    t_on = pg.evaluate("getTargets().calTarget")
    pg.evaluate("state.settings.scaleOn = false; renderAll()")
    t_off90 = pg.evaluate("getTargets().calTarget")
    check(t_on == t_off90, f"gramaj ayarı hedef kaloriyi değiştirmiyor ({t_on} = {t_off90})")
    pg.evaluate("state.settings.scaleOn = true; renderAll()")
    e1 = pg.evaluate("effAmount(curMeals()[1].items[0])")
    pg.evaluate("state.settings.calAdjust = -250; renderAll()")
    e2 = pg.evaluate("effAmount(curMeals()[1].items[0])")
    check(e1 == e2, f"koç düzeltmesi gramajı değiştirmiyor ({e1} = {e2})")
    view(pg, "menus")
    check(pg.locator("#scaleCoachNote").count() == 1 and "iki kez" in pg.inner_text("#scaleCoachNote"), "ikisi birlikte açıkken açıklayıcı not görünüyor")
    pg.evaluate("state.settings.calAdjust = 0; renderAll()")
    check(pg.locator("#scaleCoachNote").count() == 0, "koç düzeltmesi yokken not görünmüyor")
    pg.evaluate("state.settings.scaleOn = false; renderAll()")

    # ---------- 8) Dokunma alanları ve taşma
    view(pg, "today")
    pg.evaluate("ensureDayCopy()[1].items[0].amount += 10; openEditMeals.add(dayMeals()[1].id); renderAll()")
    small = pg.evaluate(SMALL_JS)
    check(not small, f"Bugün (düzenleme + bant): tüm düğmeler en az 44 px {small}")
    for w in (375, 320):
        pg.set_viewport_size({"width": w, "height": 740}); pg.wait_for_timeout(60)
        check(ov(pg), f"Bugün {w} px: yatay taşma yok")
    pg.evaluate("openFreeMeal(2)"); pg.wait_for_timeout(80)
    small = pg.evaluate(SMALL_JS)
    check(not small and ov(pg), f"Dışarıda yedim penceresi 320 px'te düzgün {small}")
    pg.evaluate("closeModal('freeMealModal')")
    pg.set_viewport_size({"width": 375, "height": 812})

    # ---------- 9) Eski biçimli veri ve bozuk dayPlan
    legacy = {"activeTab": "nutrition", "weight": 98, "dayType": "train",
              "meals": [{"title": "Kahvaltı", "done": True, "items": [{"foodId": "yulaf", "amount": 80}]}],
              "dayPlan": "bozuk"}
    pg.evaluate("s => localStorage.setItem('ayk_plus_v5_state', s)", json.dumps(legacy)); pg.reload(); pg.wait_for_timeout(400)
    s = st(pg)
    check(s["dayPlan"] is None and s["meals"][0]["title"] == "Kahvaltı" and s["meals"][0]["done"] is True, "eski/bozuk kayıt bozulmadan yüklendi (dayPlan sıfırlandı)")
    old_day = {"activeTab": "nutrition", "weight": 98, "dayType": "train", "today": "2020-01-01",
               "meals": [{"id": "k", "title": "Kahvaltı", "done": False, "items": [{"foodId": "yulaf", "amount": 80}]}],
               "dayPlan": {"date": "2020-01-01", "train": [{"id": "k", "title": "Kahvaltı", "done": True, "items": [{"foodId": "yulaf", "amount": 40}]}], "rest": None}}
    pg.evaluate("s => localStorage.setItem('ayk_plus_v5_state', s)", json.dumps(old_day)); pg.reload(); pg.wait_for_timeout(400)
    s = st(pg)
    log = s["dailyLogs"].get("2020-01-01")
    check(log is not None and log["mealsDone"] == 1 and s["dayPlan"] is None and s["meals"][0]["items"][0]["amount"] == 80, "eski günün kopyası açılışta arşivlendi, menü temiz başladı")
    b.close()
finally:
    srv.terminate()
print("ERRORS:", errs or "none")
print(f"{'HATA: ' + str(len(fails)) + ' kontrol başarısız' if fails else 'TÜM KONTROLLER GEÇTİ'}")
sys.exit(1 if errs or fails else 0)
