# v21: lor adı düzeltildi, etiket/barkod tutarlılık kontrolü, makul başlangıç gramları, Türkiye'de bulunmayan ABD ürünleri
# gizlendi, beslenmede temalı onay/metin pencereleri (koyu + gündüz), Profil → Gün geçişi (varsayılan 00:00).
import os, sys, json, subprocess, time
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOTS = os.path.join(os.path.dirname(__file__), "shots")
os.makedirs(SHOTS, exist_ok=True)
srv = subprocess.Popen(['python3', '-m', 'http.server', '8774'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
fails = []
URL = "http://localhost:8774/index.html"
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
def st(pg): return pg.evaluate("JSON.parse(localStorage.getItem('ayk_plus_v5_state'))")
SPLASH = "document.addEventListener('DOMContentLoaded',()=>{const s=document.getElementById('splash'); if(s) s.remove();})"
def new_page(b, clock=None, state=None):
    ctx = b.new_context(color_scheme="dark", viewport={"width": 375, "height": 812}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.add_init_script(SPLASH)
    pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    native = []; pg.on("dialog", lambda d: (native.append(d.message), d.accept()))
    if clock: pg.clock.set_fixed_time(clock)
    pg.goto(URL); pg.wait_for_timeout(300)
    if state is not None:
        pg.evaluate("s => localStorage.setItem('ayk_plus_v5_state', JSON.stringify(s))", state)
        pg.reload(); pg.wait_for_timeout(400)
    return ctx, pg, errs, native

try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    ctx, pg, errs, native = new_page(b)
    pg.evaluate("switchTab('nutrition'); setNutriView('today')"); pg.wait_for_timeout(100)

    # 1) Lor kaydının adı
    check(pg.evaluate("getFoodDB().lor_peyniri.name") == "Lor Peyniri", "lor kaydı yalnızca 'Lor Peyniri' (az yağlı beyaz peynirle karışmıyor)")

    # 2) Tutarlılık kontrolü
    check(pg.evaluate("labelCheck(63, 3.5, 4.7, 3.3, 100)") == [], "tutarlı etiket: uyarı yok")
    kj = pg.evaluate("labelCheck(262, 3.5, 4.7, 3.3, 100)")
    check(len(kj) == 1 and "kilojoule" in kj[0], f"kJ/kcal karışıklığı yakalanıyor ({kj})")
    over = pg.evaluate("labelCheck(null, 50, 50, 20, 100)")
    check(over and "aşıyor" in over[0], "100 g'ı aşan makrolar yakalanıyor")
    check(pg.evaluate("labelCheck(500, 10, 10, 1, 100)") != [], "makrolarla tutmayan kalori yakalanıyor")
    check(pg.evaluate("labelCheck(120, 6, 1, 10, 0)") == [], "adet modunda yalnızca kalori sağlaması (tutarlı)")

    # 3) Başlangıç gramları ve gizlenen ABD ürünleri
    d = pg.evaluate("(() => { const db = getFoodDB(); return [db.u173904.def, db.u171287.def, db.u171413.def, db.u171077.def, db.u170567.def]; })()")
    check(d == [80, 50, 10, 150, 30], f"makul başlangıç: yulaf 80 g, yumurta 50 g, zeytinyağı 10 g, tavuk 150 g, badem 30 g ({d})")
    h = pg.evaluate("(() => { const db = getFoodDB(); return { chili: !!db.u172097.hidden, corned: !!db.u170602.hidden, shake: !!db.u170883.hidden, cips: !!db.u169677.hidden }; })()")
    check(h["chili"] and h["corned"], "chili con carne ve corned beef gizli")
    check(not h["shake"] and not h["cips"], "Türkiye'de de bulunan milkshake ve cips görünür")
    pg.evaluate("setNutriView('foods')"); pg.wait_for_timeout(80)
    pg.fill("#foodSearch", "milkshake"); pg.evaluate("foodUI.limit = 0; renderFoodList()"); pg.wait_for_timeout(40)
    check(pg.locator("#foodList [data-food]").count() >= 2, "milkshake aramada bulunuyor")
    pg.fill("#foodSearch", ""); pg.evaluate("renderFoodList()")

    # 4) Temalı pencere (beslenme, koyu)
    pg.evaluate("setNutriView('today'); void addSupp()"); pg.wait_for_timeout(120)
    cls = pg.get_attribute("#uiDialog", "class")
    check(pg.is_visible("#uiDialog") and "nd" in cls and "n-in" in pg.get_attribute("#uiDlgInput", "class"), "Takviye ekle: beslenme temalı metin penceresi")
    bg = pg.evaluate("getComputedStyle(document.querySelector('#uiDialog [role=dialog]')).backgroundColor")
    check(bg == "rgb(14, 18, 16)", f"koyu temada kart rengi (#0E1210) ({bg})")
    pg.screenshot(path=os.path.join(SHOTS, "v21_dialog_koyu.png"))
    pg.fill("#uiDlgInput", "Magnezyum"); pg.click("#uiDlgOk"); pg.wait_for_timeout(100)
    check(any(x["name"] == "Magnezyum" for x in st(pg)["supplementList"]), "takviye temalı pencereden eklendi")
    # gündüz teması
    pg.evaluate("state.settings.theme = 'light'; renderAll(); void askText('Yeni öğünün adı', '')"); pg.wait_for_timeout(120)
    bg = pg.evaluate("getComputedStyle(document.querySelector('#uiDialog [role=dialog]')).backgroundColor")
    col = pg.evaluate("getComputedStyle(document.querySelector('#uiDlgTitle')).color")
    check(bg == "rgb(255, 255, 255)" and col == "rgb(15, 23, 42)", f"gündüz temasında beyaz kart, koyu yazı ({bg}, {col})")
    pg.screenshot(path=os.path.join(SHOTS, "v21_dialog_gunduz.png"))
    pg.click("#uiDlgCancel"); pg.wait_for_timeout(80)
    check(not pg.is_visible("#uiDialog"), "Vazgeç pencereyi kapatıyor")
    pg.evaluate("state.settings.theme = 'dark'; renderAll()")

    # 5) Elle girilen tutarsız etiket: uyarı → Vazgeç kaydetmez, Yine de kaydet kaydeder
    pg.evaluate("setNutriView('foods'); openCustomFoodModal()"); pg.wait_for_timeout(100)
    pg.fill("#cfName", "Deneme Bar"); pg.fill("#cfK", "500"); pg.fill("#cfP", "10"); pg.fill("#cfC", "10"); pg.fill("#cfF", "1")
    pg.click("#customFoodModal >> text=Kaydet"); pg.wait_for_timeout(120)
    check(pg.is_visible("#uiDialog") and "tutarsız" in pg.inner_text("#uiDlgTitle"), "tutarsız elle girişte uyarı penceresi")
    pg.click("#uiDlgCancel"); pg.wait_for_timeout(80)
    check(not any("Deneme Bar" in f["name"] for f in st(pg)["customFoods"].values()) and pg.is_visible("#customFoodModal"), "Vazgeç: kaydedilmedi, form açık kaldı")
    pg.click("#customFoodModal >> text=Kaydet"); pg.wait_for_timeout(120); pg.click("#uiDlgOk"); pg.wait_for_timeout(120)
    cf = [k for k, f in st(pg)["customFoods"].items() if "Deneme Bar" in f["name"]]
    check(len(cf) == 1, "Yine de kaydet: kaydedildi")
    # silme onayı: tehlike düğmesi kırmızı
    pg.evaluate(f"state.meals[0].items.push({{foodId: '{cf[0]}', amount: 50}}); renderAll(); void deleteCustomFood('{cf[0]}')"); pg.wait_for_timeout(120)
    check("n-danger-btn" in pg.get_attribute("#uiDlgOk", "class") and "silinsin mi" in pg.inner_text("#uiDlgTitle"), "silme onayı temalı ve kırmızı düğmeli")
    pg.click("#uiDlgOk"); pg.wait_for_timeout(120)
    check(cf[0] not in st(pg)["customFoods"], "onaylanınca silindi")

    # 6) Barkod: tutarsız ürün uyarısı ve düzeltme formu (Open Food Facts yanıtı taklit edilir)
    def off(route):
        code = route.request.url.split("/product/")[1].split(".json")[0]
        prod = {"product_name": "Test Bar", "brands": "Marka", "nutriments": {"energy-kcal_100g": 690, "proteins_100g": 10, "carbohydrates_100g": 20, "fat_100g": 5}} if code == "8690000000111" \
          else {"product_name": "İyi Yoğurt", "brands": "Marka", "nutriments": {"energy-kcal_100g": 63, "proteins_100g": 3.5, "carbohydrates_100g": 4.7, "fat_100g": 3.3}}
        route.fulfill(status=200, content_type="application/json", body=json.dumps({"status": 1, "product": prod}))
    pg.route("**/api/v2/product/**", off)
    pg.evaluate("openBarcode()"); pg.wait_for_timeout(150)
    pg.fill("#bcManual", "8690000000111"); pg.evaluate("barcodeManual()"); pg.wait_for_timeout(400)
    check(pg.is_visible("#bcWarn") and "kilojoule" in pg.inner_text("#bcWarn"), f"tutarsız barkod ürününde uyarı ({pg.inner_text('#bcResult')[:80]!r})")
    check(pg.locator("#bcResult button", has_text="Yine de ekle").count() == 1, "'Yine de ekle' seçeneği var")
    pg.screenshot(path=os.path.join(SHOTS, "v21_barkod_uyari.png"))
    pg.locator("#bcResult button", has_text="Etikete bakıp düzelt").click(); pg.wait_for_timeout(150)
    check(pg.is_visible("#customFoodModal") and pg.input_value("#cfK") == "690" and pg.input_value("#cfP") == "10", "düzeltme formu bulunan değerlerle dolu açıldı")
    pg.evaluate("closeModal('customFoodModal')")
    pg.evaluate("openBarcode()"); pg.wait_for_timeout(150)
    pg.fill("#bcManual", "8690000000222"); pg.evaluate("barcodeManual()"); pg.wait_for_timeout(400)
    check(not pg.is_visible("#bcWarn") and pg.locator("#bcResult button", has_text="Listeme ekle").count() == 1, "tutarlı barkod ürününde uyarı yok")
    pg.evaluate("closeBarcode()")
    check(not native, f"beslenmede sistem kutusu açılmadı {native[:2]}")
    check(not errs, f"hata yok {errs[:1]}")
    ctx.close()

    # 7) Gün geçişi
    base = {"weight": 90, "today": "2026-03-09", "waterLiters": 2, "meals": [{"id": "m1", "title": "K", "done": True, "items": []}]}
    ctx, pg, e7, _ = new_page(b, clock="2026-03-10T02:30:00", state=dict(base, settings={"dayStartHour": 3}))
    s = st(pg)
    check(s["today"] == "2026-03-09" and s["waterLiters"] == 2 and "2026-03-09" not in s.get("dailyLogs", {}), "03:00 seçiliyken 02:30'da hâlâ önceki gün (sıfırlanmadı)")
    check(pg.evaluate("logicalToday()") == "2026-03-09" and pg.evaluate("dayKey()") == "2026-03-09", "beslenme günü önceki gün")
    ctx.close()
    ctx, pg, e8, _ = new_page(b, clock="2026-03-10T02:30:00", state=dict(base, settings={}))
    s = st(pg)
    check(s["settings"]["dayStartHour"] == 0, "varsayılan gün geçişi 00:00")
    check(s["today"] == "2026-03-10" and s["waterLiters"] == 0 and "2026-03-09" in s["dailyLogs"], "00:00'da gün geçti ve önceki gün arşivlendi")
    # saat ileri alınınca aynı gün tekrar arşivlenmez / geri dönmez
    pg.evaluate("state.settings.dayStartHour = 3; state.waterLiters = 1; renderAll(); checkNewDay() && renderAll()")
    s = st(pg)
    check(s["today"] == "2026-03-10" and s["waterLiters"] == 1, "gün geçişi sonradan ileri alınınca bugünkü veriler silinmedi")
    # Profil'den ayar
    pg.evaluate("openProfile()"); pg.wait_for_timeout(150)
    check(pg.input_value("#setDayStart") == "3", "Profil'de mevcut ayar görünüyor")
    pg.select_option("#setDayStart", "4"); pg.evaluate("saveSettings()"); pg.wait_for_timeout(150)
    check(st(pg)["settings"]["dayStartHour"] == 4, "Profil'den gün geçişi kaydedildi (04:00)")
    pg.evaluate("openProfile()"); pg.wait_for_timeout(150)
    pg.locator("#setDayStart").scroll_into_view_if_needed(); pg.screenshot(path=os.path.join(SHOTS, "v21_gun_gecisi.png"))
    r = pg.evaluate("document.querySelector('#setDayStart').getBoundingClientRect().height")
    check(r >= 44, f"seçim kutusu en az 44 px ({r})")
    ctx.close()
    ctx, pg, e9, _ = new_page(b, state=dict(base, settings={"dayStartHour": 9}))
    check(st(pg)["settings"]["dayStartHour"] == 0, "geçersiz ayar 00:00'a döndü")
    check(not (e7 or e8 or e9), f"hata yok {(e7 + e8 + e9)[:1]}")
    ctx.close()
    b.close()
finally:
    srv.terminate()
print(f"{'HATA: ' + str(len(fails)) + ' kontrol başarısız' if fails else 'TÜM KONTROLLER GEÇTİ'}")
sys.exit(1 if fails else 0)
