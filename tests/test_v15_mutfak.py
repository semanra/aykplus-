# v15 (2. paket): Kombo (Favori Kase), Tarif (pişmiş ağırlıktan 100 g makrosu), Dünkü öğünü tekrarla,
# Haftalık alışveriş listesi (antrenman × gün + dinlenme × kalan gün, tarifler malzemelerine açılır).
import os, sys
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOTS = os.path.join(os.path.dirname(__file__), "shots")
os.makedirs(SHOTS, exist_ok=True)
import subprocess, time, json
srv = subprocess.Popen(['python3', '-m', 'http.server', '8767'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
def st(pg): return pg.evaluate("JSON.parse(localStorage.getItem('ayk_plus_v5_state'))")
def ov(pg):
    w = pg.evaluate("[document.documentElement.scrollWidth, document.documentElement.clientWidth]"); return w[0] <= w[1]
def view(pg, v): pg.evaluate(f"setNutriView('{v}')"); pg.wait_for_timeout(80)
SMALL_JS = """(sel) => [...document.querySelectorAll(sel)]
  .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.width < 44 || r.height < 44); })
  .map(e => (e.textContent || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 30) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height))"""
dialog_answers = []
def on_dialog(d):
    if d.type == "prompt" and dialog_answers: d.accept(dialog_answers.pop(0))
    else: d.accept()

try:
  with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(color_scheme="dark", viewport={"width": 375, "height": 812}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.getElementById('splash'); if(s) s.remove();})")
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("dialog", on_dialog)
    pg.goto("http://localhost:8767/index.html"); pg.wait_for_timeout(300)
    pg.evaluate("switchTab('nutrition'); setNutriView('menus')"); pg.wait_for_timeout(100)
    menu0 = st(pg)["meals"]

    # ---------- 1) KOMBO: Menülerim'deki öğünden kaydet
    pg.evaluate("toggleMenuMeal(0)"); pg.wait_for_timeout(50)
    dialog_answers.append("Favori <b>Kase</b>")
    pg.locator('#mealsContainer [onclick="saveMealAsCombo(0, \'menu\')"]').click(); pg.wait_for_timeout(100)
    pg.fill("#uiDlgInput", dialog_answers.pop(0)); pg.click("#uiDlgOk"); pg.wait_for_timeout(100)   # v21: temalı metin penceresi
    s = st(pg)
    check(len(s["combos"]) == 1 and s["combos"][0]["name"] == "Favori <b>Kase</b>" and len(s["combos"][0]["items"]) == 4, "öğün kombo olarak kaydedildi (4 besin)")
    check(ov(pg), "Menülerim öğün düğme satırı taşmıyor (375 px)")
    cid = s["combos"][0]["id"]
    view(pg, "foods")
    pg.evaluate("goAddFood(2, 'day')"); pg.wait_for_timeout(80)
    cats = pg.locator("#foodCats button").all_inner_texts()
    check("Komboların" in cats, f"'Komboların' kategorisi var: {cats[:5]}")
    pg.locator("#foodCats button", has_text="Komboların").click(); pg.wait_for_timeout(80)
    check(pg.locator(f'#foodList [data-combo="{cid}"]').count() == 1 and pg.locator("#foodList b").count() == 0, "kombo listede, adı HTML olarak işlenmiyor")
    pg.locator(f'#foodList [data-combo="{cid}"]').click(); pg.wait_for_timeout(80)
    combo_cal = pg.evaluate(f"Math.round(itemsTotals(state.combos[0].items).cal)")
    check(pg.locator("#comboSelCard").count() == 1 and pg.evaluate(f"fmtInt({combo_cal})") in pg.inner_text("#comboAddBtn"), "kombo kartı açıldı, toplam kalori yazıyor")
    check("Ekledikten sonra" in pg.inner_text("#foodRemain"), "kombo seçiliyken 'ekledikten sonra kalan' yazısı")
    pg.screenshot(path=SHOTS + "/v15_combo.png")
    before_cal = pg.evaluate("nutritionTotals().cal")
    pg.click("#comboAddBtn"); pg.wait_for_timeout(100)
    after_cal = pg.evaluate("nutritionTotals().cal")
    check(abs((after_cal - before_cal) - combo_cal) <= 1, f"kombo tek dokunuşla bugüne eklendi (+{round(after_cal - before_cal)} kcal)")
    check(st(pg)["meals"][2]["items"] == menu0[2]["items"], "kombo menüyü değiştirmedi (bugüne eklendi)")
    pg.locator("#toastWrap button", has_text="Menüye de kaydet").last.click(); pg.wait_for_timeout(100)
    check(len(st(pg)["meals"][2]["items"]) > len(menu0[2]["items"]), "'Menüye de kaydet' komboyu menüye de ekledi")
    # Arama kombo adını buluyor
    pg.locator("#foodCats button", has_text="Tümü").click(); pg.fill("#foodSearch", "favori"); pg.evaluate("renderFoodList()"); pg.wait_for_timeout(80)
    check(pg.locator(f'#foodList [data-combo="{cid}"]').count() == 1, "aramada kombo adı bulunuyor")
    pg.fill("#foodSearch", ""); pg.evaluate("renderFoodList()")
    # Silme + Geri al
    pg.evaluate(f"setFoodCat('combos'); selectCombo('{cid}')"); pg.wait_for_timeout(50)
    pg.locator("#comboSelCard button", has_text="Komboyu sil").click(); pg.wait_for_timeout(80)
    check(len(st(pg)["combos"]) == 0, "kombo silindi")
    pg.locator("#toastWrap button", has_text="Geri al").last.click(); pg.wait_for_timeout(80)
    check(len(st(pg)["combos"]) == 1, "kombo silme Geri al ile geri geldi")

    # ---------- 2) TARİF
    pg.evaluate("openRecipeModal()"); pg.wait_for_timeout(80)
    check(pg.evaluate("$('recipeModal').classList.contains('flex')"), "tarif penceresi açıldı")
    pg.fill("#rcName", "Mercimek Çorbası")
    pg.click("#recipeModal >> text=+ Malzeme ekle"); pg.wait_for_timeout(100)
    check(pg.evaluate("$('pickerModal').classList.contains('flex')") and pg.evaluate("getComputedStyle($('pickerModal')).zIndex") > pg.evaluate("getComputedStyle($('recipeModal')).zIndex"), "malzeme seçici tarif penceresinin üstünde açıldı")
    pg.fill("#pickerSearch", "pirinç"); pg.evaluate("renderPickerList()"); pg.wait_for_timeout(50)
    pg.locator("#pickerList button", has_text="Baldo").first.click(); pg.wait_for_timeout(80)
    check(pg.evaluate("$('recipeModal').classList.contains('flex')") and pg.locator("#rcItems [data-rc-item]").count() == 1, "seçilen malzeme eklendi, tarif penceresi açık kaldı")
    pg.evaluate("rcp.items.push({foodId:'zeytinyagi', amount: 20}); renderRecipe()")
    pg.locator('#rcItems [data-fk="rc-0"]').fill("200"); pg.wait_for_timeout(50)
    check(pg.evaluate("document.activeElement && document.activeElement.dataset.fk") == "rc-0", "malzeme miktarı yazarken kutu odakta kalıyor")
    pg.fill("#rcCooked", "600"); pg.evaluate("updateRecipeSummary()"); pg.wait_for_timeout(50)
    exp = pg.evaluate("(() => { const db = getFoodDB(); return (kcalPerUnit(db.pirinc) * 200 + kcalPerUnit(db.zeytinyagi) * 20) / 600 * 100; })()")
    check(pg.evaluate(f"fmtInt({exp})") in pg.inner_text("#rcSum") and "Pişmiş 100 g" in pg.inner_text("#rcSum"), f"100 g kalorisi doğru hesaplandı (~{round(exp)} kcal)")
    pg.screenshot(path=SHOTS + "/v15_recipe.png")
    pg.click("#recipeModal >> text=Kaydet"); pg.wait_for_timeout(150)
    cf = st(pg)["customFoods"]
    rid = [k for k in cf if k.startswith("custom_recipe_")]
    check(len(rid) == 1, "tarif besin olarak kaydedildi")
    rid = rid[0]; rf = cf[rid]
    check(rf["unit"] == "g" and abs(rf["kcal"] * 100 - exp) < 0.01 and rf["recipe"]["cooked"] == 600 and len(rf["recipe"]["items"]) == 2, "tarif: gram birimi, 100 g kalorisi ve malzemeleri saklandı")
    check(pg.evaluate("foodUI.cat") == "recipes" and pg.evaluate("foodUI.sel") == rid, "kaydedince Tariflerim'de seçili açıldı")
    check("Tariflerim" in pg.locator("#foodCats button").all_inner_texts(), "'Tariflerim' kategorisi var")
    # Tarifi düzenle → pişmiş ağırlık değişince değerler güncellenir
    pg.evaluate(f"editCustomFood('{rid}')"); pg.wait_for_timeout(80)
    check(pg.input_value("#rcName") == "Mercimek Çorbası" and pg.input_value("#rcCooked") == "600" and pg.locator("#rcItems [data-rc-item]").count() == 2, "düzenle: tarif penceresi değerlerle açıldı")
    pg.fill("#rcCooked", "800"); pg.click("#recipeModal >> text=Kaydet"); pg.wait_for_timeout(100)
    check(abs(st(pg)["customFoods"][rid]["kcal"] * 800 - exp * 6) < 0.5, "pişmiş ağırlık değişince 100 g değeri güncellendi")
    # Tarifi menüye ekle (alışveriş listesi testi için)
    pg.evaluate(f"quickAdd(3, '{rid}', 200, curMeals())"); pg.wait_for_timeout(50)

    # ---------- 3) DÜNKÜ ÖĞÜNÜ TEKRARLA
    view(pg, "today")
    pg.evaluate("halfMeal(1)"); pg.wait_for_timeout(50)
    half_items = pg.evaluate("dayMeals()[1].items")
    from datetime import date, timedelta
    yday = (date.today() - timedelta(days=1)).isoformat()
    pg.evaluate(f"state.today = '{yday}'; state.dayPlan.date = '{yday}'; checkNewDay(); renderAll()"); pg.wait_for_timeout(100)
    s = st(pg)
    check(s["dailyLogs"][yday]["meals"][1]["items"] == half_items, "gün sonu öğün içerikleri arşive yazıldı")
    check(pg.evaluate("dayMeals()[1].items[0].amount") == menu0[1]["items"][0]["amount"], "yeni gün menüden başladı")
    pg.evaluate("toggleMealEdit(1)"); pg.wait_for_timeout(50)
    rb = pg.locator('[data-repeat="1"]')
    check(rb.count() == 1 and "Dünkü gibi" in rb.inner_text(), "düzenleme panelinde 'Dünkü gibi' düğmesi")
    rb.click(); pg.wait_for_timeout(100)
    check(pg.evaluate("dayMeals()[1].items") == half_items and st(pg)["meals"][1]["items"] == menu0[1]["items"], "dünkü öğün bugüne kopyalandı, menü aynı kaldı")
    pg.locator("#toastWrap button", has_text="Geri al").last.click(); pg.wait_for_timeout(80)
    check(pg.evaluate("dayMeals()[1].items[0].amount") == menu0[1]["items"][0]["amount"], "tekrarla Geri al ile geri alındı")
    # 7 günden eski arşivlerde öğün içeriği tutulmuyor (depolama dolmasın)
    pg.evaluate("for (let i = 1; i <= 10; i++) state.dailyLogs['2025-01-' + String(i).padStart(2,'0')] = {kcal: 2000, meals: [{id:'x', title:'x', items:[]}]}; archiveDay('2025-01-11'); renderAll()")
    s = st(pg)
    with_meals = [k for k, v in s["dailyLogs"].items() if "meals" in v]
    check(len(with_meals) <= 7 and "2025-01-01" not in with_meals, f"öğün içerikleri yalnızca son 7 günde saklanıyor ({len(with_meals)})")
    # Bugün kartında "Kombo kaydet" (bugünden)
    pg.evaluate("openEditMeals.add(dayMeals()[1].id); renderAll()"); pg.wait_for_timeout(50)
    dialog_answers.append("Bugünkü kase")
    pg.locator('[data-edit-panel="1"] button', has_text="Kombo kaydet").click(); pg.wait_for_timeout(80)
    pg.fill("#uiDlgInput", dialog_answers.pop(0)); pg.click("#uiDlgOk"); pg.wait_for_timeout(80)
    check(len(st(pg)["combos"]) == 2 and st(pg)["combos"][1]["name"] == "Bugünkü kase", "Bugün'den de kombo kaydediliyor")
    small = pg.evaluate(SMALL_JS, "#todayMeals button, #todayMeals input:not([type=checkbox])")
    check(not small, f"Bugün düzenleme paneli: düğmeler en az 44 px {small}")

    # ---------- 4) HAFTALIK ALIŞVERİŞ LİSTESİ
    view(pg, "menus")
    pg.evaluate("state.shopTrainDays = 4; state.settings.scaleOn = false; renderAll()")
    pg.click("#shopBtn"); pg.wait_for_timeout(100)
    check(pg.evaluate("$('shopModal').classList.contains('flex')"), "alışveriş listesi açıldı")
    exp_oat = pg.evaluate("(() => { let a = 0; state.meals.forEach(m => m.items.forEach(i => { if (i.foodId === 'yulaf') a += i.amount * 4; })); state.restMeals.forEach(m => m.items.forEach(i => { if (i.foodId === 'yulaf') a += i.amount * 3; })); return a; })()")
    got_oat = pg.evaluate("(shopList().find(r => r.id === 'yulaf') || {}).amt")
    check(abs(got_oat - exp_oat) < 0.01, f"yulaf = antrenman × 4 + dinlenme × 3 ({exp_oat} g)")
    rec_rows = pg.evaluate(f"shopList().filter(r => r.id === '{rid}').length")
    exp_rice = pg.evaluate(f"""(() => {{ let a = 0;
      const add = (ms, n) => ms.forEach(m => m.items.forEach(i => {{ if (i.foodId === 'pirinc') a += i.amount * n; if (i.foodId === '{rid}') a += i.amount * n * 200 / 800; }}));
      add(state.meals, 4); add(state.restMeals, 3); return a; }})()""")
    got_rice = pg.evaluate("(shopList().find(r => r.id === 'pirinc') || {}).amt")
    check(rec_rows == 0 and abs(got_rice - exp_rice) < 0.01, f"tarif malzemelerine açıldı (pirinç {round(exp_rice)} g, tarif satırı yok)")
    egg = pg.evaluate("shopList().find(r => r.id === 'tam_yumurta')")
    check(egg is None or pg.evaluate(f"fmtShopAmt(getFoodDB().tam_yumurta, {egg['amt']})").endswith(" adet"), "adetli besin adet olarak yazıyor")
    check(pg.evaluate("fmtShopAmt({unit:'g'}, 1250)") == "1,25 kg" and pg.evaluate("fmtShopAmt({unit:'g'}, 333)") == "340 g" and pg.evaluate("fmtShopAmt({unit:'adet'}, 10.5)") == "11 adet" and pg.evaluate("fmtShopAmt({unit:'ml'}, 1500)") == "1,5 L", "birimler doğru (kg, g, adet, L)")
    n_rows = pg.locator("#shopItems [data-shop]").count()
    check(n_rows == pg.evaluate("shopList().length") and n_rows > 5, f"listede {n_rows} ürün")
    pg.locator('#shopItems [data-shop="yulaf"]').click(); pg.wait_for_timeout(80)
    check(st(pg)["shopChecked"].get("yulaf") is True and "line-through" in pg.locator('#shopItems [data-shop="yulaf"] span').first.get_attribute("class"), "dokununca üstü çiziliyor ve kaydediliyor")
    check(f"{n_rows - 1} / {n_rows}" in pg.inner_text("#shopCount"), "kalan ürün sayısı yazıyor")
    txt = pg.evaluate("shopText()")
    check("Yulaf" not in txt and "• " in txt and "4 antrenman, 3 dinlenme" in txt, "kopyalanan metinde alınanlar yok, gün bilgisi var")
    pg.locator("#shopDays button[aria-label='Antrenman gününü artır']").click(); pg.wait_for_timeout(80)
    check(pg.inner_text("#shopDaysVal") == "5" and st(pg)["shopTrainDays"] == 5, "antrenman günü sayısı değiştirilebiliyor")
    ctx.grant_permissions(["clipboard-read", "clipboard-write"])
    pg.locator("#shopModal button", has_text="Notlar'a kopyala").click(); pg.wait_for_timeout(150)
    clip = pg.evaluate("navigator.clipboard.readText()")
    check(clip.startswith("AYK+ alışveriş listesi") and "5 antrenman" in clip, "liste panoya kopyalandı")
    small = pg.evaluate(SMALL_JS, "#shopModal button, #shopModal label")
    check(not small, f"alışveriş listesi düğmeleri en az 44 px {small}")
    pg.screenshot(path=SHOTS + "/v15_shop.png")
    pg.click("#shopModal >> text=İşaretleri temizle"); pg.wait_for_timeout(50)
    check(st(pg)["shopChecked"] == {}, "işaretler temizlendi")
    pg.evaluate("closeModal('shopModal')")
    for w in (375, 320):
        pg.set_viewport_size({"width": w, "height": 740}); pg.wait_for_timeout(60)
        for v in ("menus", "foods"):
            view(pg, v)
            check(ov(pg), f"{v} {w} px: yatay taşma yok")
    pg.set_viewport_size({"width": 375, "height": 812})

    # ---------- 5) Tarifin malzemesi silinse de tarif bozulmuyor; tarif silinince menüden çıkıyor
    pg.evaluate(f"void deleteCustomFood('{rid}')"); pg.wait_for_timeout(80)
    if pg.is_visible("#uiDialog"): pg.click("#uiDlgOk"); pg.wait_for_timeout(80)   # v21: temalı onay
    s = st(pg)
    check(rid not in s["customFoods"] and not any(i["foodId"] == rid for m in s["meals"] for i in m["items"]), "tarif silinince menüden de çıktı")

    # ---------- 6) Eski biçimli veri
    legacy = {"activeTab": "nutrition", "weight": 98, "meals": [{"title": "K", "items": [{"foodId": "yulaf", "amount": 80}]}],
              "combos": [{"name": "Bozuk", "items": [{"foodId": "yulaf", "amount": 0}, {"amount": 5}, {"foodId": "muz", "amount": 1}]}, "çöp"],
              "shopTrainDays": 12, "shopChecked": [1, 2],
              "dailyLogs": {"2026-10-01": {"kcal": 2400}}}
    pg.evaluate("s => localStorage.setItem('ayk_plus_v5_state', s)", json.dumps(legacy)); pg.reload(); pg.wait_for_timeout(400)
    s = st(pg)
    check(len(s["combos"]) == 1 and s["combos"][0]["items"] == [{"foodId": "muz", "amount": 1}] and s["combos"][0]["id"], "bozuk kombolar temizlendi, geçerli olan korundu")
    check(s["shopTrainDays"] is None and s["shopChecked"] == {} and s["meals"][0]["items"][0]["amount"] == 80, "geçersiz alışveriş ayarları sıfırlandı, menü bozulmadı")
    pg.evaluate("toggleMealEdit(0)"); pg.wait_for_timeout(50)
    check(pg.locator('[data-repeat="0"]').count() == 0, "öğün içeriği olmayan eski arşivde 'Dünkü gibi' görünmüyor")
    b.close()
finally:
    srv.terminate()
print("ERRORS:", errs or "none")
print(f"{'HATA: ' + str(len(fails)) + ' kontrol başarısız' if fails else 'TÜM KONTROLLER GEÇTİ'}")
sys.exit(1 if errs or fails else 0)
