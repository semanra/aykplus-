# v19: Bulunamayan besin sessizce 0 kcal sayılmaz. Kullanılan besinlerin değerleri state.foodSnap'te yedeklenir;
# foods.js yüklenemezse veya besin kaldırılırsa "⚠" işaretiyle son kayıtlı değerleriyle hesaplanır ve uyarı çıkar.
import os, sys, json, subprocess, time
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOTS = os.path.join(os.path.dirname(__file__), "shots")
os.makedirs(SHOTS, exist_ok=True)
srv = subprocess.Popen(['python3', '-m', 'http.server', '8772'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
URL = "http://localhost:8772/index.html"
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
def st(pg): return pg.evaluate("JSON.parse(localStorage.getItem('ayk_plus_v5_state'))")
def toasts(pg): return pg.evaluate("[...document.querySelectorAll('#toastWrap > div')].map(e => e.textContent).join(' | ')")
SPLASH = "document.addEventListener('DOMContentLoaded',()=>{const s=document.getElementById('splash'); if(s) s.remove();})"

# Eski (v18) biçimde kayıt: foodSnap yok; menüde USDA besini (u171477, fırında tavuk göğsü 1,65 kcal/g) + uygulama besini
LEGACY = {
    "weight": 90, "deficit": 500, "dayType": "train",
    "meals": [{"id": "m1", "title": "Öğle", "items": [{"foodId": "u171477", "amount": 200}, {"foodId": "tavuk_gogsu", "amount": 100}]}],
    "restMeals": [{"id": "r1", "title": "Akşam", "items": [{"foodId": "u171477", "amount": 100}]}],
    "combos": [{"id": "combo_a", "name": "Tavuk kombo", "items": [{"foodId": "u171477", "amount": 150}]}],
}

def new_ctx(b, block=False):
    ctx = b.new_context(color_scheme="dark", viewport={"width": 375, "height": 812}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.add_init_script(SPLASH)
    if block: ctx.route("**/foods.js", lambda route: route.abort())
    return ctx

def open_with(ctx, state_obj):
    pg = ctx.new_page(); e = []; pg.on("pageerror", lambda x: e.append(str(x))); pg.on("dialog", lambda d: d.accept())
    pg.goto(URL); pg.wait_for_timeout(300)
    pg.evaluate("s => localStorage.setItem('ayk_plus_v5_state', JSON.stringify(s))", state_obj)
    pg.reload(); pg.wait_for_timeout(1900)   # checkFoodHealth 1,5 sn sonra çalışır
    return pg, e

try:
  with sync_playwright() as p:
    b = p.chromium.launch()

    # 1) Normal açılış: eski kayıt göç eder, kullanılan besinlerin değerleri yedeklenir, uyarı çıkmaz
    ctx = new_ctx(b)
    pg, e1 = open_with(ctx, LEGACY)
    s = st(pg)
    snap = s.get("foodSnap") or {}
    check("u171477" in snap and "tavuk_gogsu" in snap, f"kullanılan besinler yedeklendi ({sorted(snap)[:4]})")
    check(abs(snap.get("u171477", {}).get("k", 0) - 1.65) < 1e-6 and snap["u171477"]["u"] == "g", "yedekte kcal/birim doğru (1,65 kcal/g)")
    check(s["meals"][0]["items"][0]["foodId"] == "u171477" and s["meals"][0]["items"][0]["amount"] == 200, "menü verisi değişmedi")
    check("bulunamadı" not in toasts(pg) and "yüklenemedi" not in toasts(pg), "normal açılışta uyarı yok")
    normal_cal = pg.evaluate("Math.round(calcItemMacros({foodId:'u171477', amount:200}).cal)")
    check(normal_cal == 330, f"normal hesap 200 g = 330 kcal ({normal_cal})")
    saved = s
    check(not e1, f"hata yok {e1[:1]}")
    ctx.close()

    # 2) foods.js yüklenemedi: besin "⚠" ile son kayıtlı değerinden hesaplanır (0 değil), uyarı çıkar, listelerde görünmez
    ctx = new_ctx(b, block=True)
    pg, e2 = open_with(ctx, saved)
    check(pg.evaluate("Object.keys(USDA_DB).length") == 0, "foods.js gerçekten yüklenmedi (benzetim)")
    f = pg.evaluate("getFoodDB()['u171477']")
    check(bool(f) and f["name"].startswith("⚠") and "Tavuk göğsü" in f["name"], f"besin ⚠ ile adıyla duruyor ({f and f['name']})")
    lost_cal = pg.evaluate("Math.round(calcItemMacros({foodId:'u171477', amount:200}).cal)")
    check(lost_cal == 330, f"yedek değerle aynı kalori: 330 kcal ({lost_cal}) — 0 değil")
    check(pg.evaluate("Math.round(nutritionTotals(curMeals()).cal)") > 330, "menü toplamı yedek değeri içeriyor")
    t = toasts(pg)
    check("yüklenemedi" in t, f"uyarı gösterildi: {t[:90]}")
    pg.evaluate("switchTab('nutrition'); setNutriView('today')"); pg.wait_for_timeout(150)
    check("⚠ Tavuk göğsü" in pg.inner_text("#todayMeals"), "Bugün ekranında ⚠ işaretli besin görünüyor")
    pg.screenshot(path=os.path.join(SHOTS, "v19_kayip_bugun.png"))
    pg.evaluate("setNutriView('foods')"); pg.wait_for_timeout(100)
    pg.fill("#foodSearch", "tavuk"); pg.evaluate("foodUI.limit = 0; renderFoodList()"); pg.wait_for_timeout(50)
    names = pg.evaluate("[...document.querySelectorAll('#foodList [data-food]')].map(e => e.dataset.food)")
    check("u171477" not in names and len(names) > 0, "bulunamayan besin aramada/listede çıkmıyor")
    check("u171477" not in pg.evaluate("frequentFoods(40)"), "bulunamayan besin önerilerde yok")
    # düzenleme çalışır (çökme yok), değer kaydı korunur
    pg.evaluate("setNutriView('menus')"); pg.wait_for_timeout(100)
    pg.evaluate("changeAmount(0, 0, 1)"); pg.wait_for_timeout(100)
    s2 = st(pg)
    check(s2["meals"][0]["items"][0]["amount"] > 200, "bulunamayan besinin miktarı değiştirilebiliyor")
    check(s2["foodSnap"]["u171477"]["n"].startswith("Tavuk göğsü"), "yedek değer foods.js yokken silinmedi/bozulmadı")
    check(not e2, f"hata yok {e2[:1]}")
    ctx.close()

    # 3) Hiç yedeği olmayan bulunamayan besin: görünür uyarı ("⚠ Bulunamayan besin"), sayıyla bildirilir
    ctx = new_ctx(b)
    bad = json.loads(json.dumps(LEGACY)); bad["meals"][0]["items"].append({"foodId": "u999999999", "amount": 50})
    pg, e3 = open_with(ctx, bad)
    f = pg.evaluate("getFoodDB()['u999999999']")
    check(bool(f) and f["name"] == "⚠ Bulunamayan besin", "yedeksiz besin '⚠ Bulunamayan besin' olarak görünüyor")
    t = toasts(pg)
    check("1 besin veritabanında bulunamadı" in t, f"sayılı uyarı: {t[:90]}")
    pg.evaluate("switchTab('nutrition'); setNutriView('menus')"); pg.wait_for_timeout(150)
    check(not e3, f"hata yok {e3[:1]}")

    # 4) Özel besin silinince kombodan da çıkar (sessiz 0 kcal kombo kalmaz); geri alınabilir
    pg.evaluate("""() => { state.customFoods['custom_x'] = {name:'Ev yoğurdu', cat:'Özel', unit:'g', step:10, def:100, p:0.035, c:0.047, f:0.033};
                 state.combos.push({id:'combo_b', name:'Yoğurtlu', items:[{foodId:'custom_x', amount:200}, {foodId:'u171477', amount:100}]});
                 state.combos.push({id:'combo_c', name:'Sadece yoğurt', items:[{foodId:'custom_x', amount:150}]}); renderAll(); }""")
    check("custom_x" in st(pg)["foodSnap"], "özel besin kombodayken yedeklendi")
    pg.evaluate("void deleteCustomFood('custom_x')"); pg.wait_for_timeout(150)
    if pg.is_visible("#uiDialog"): pg.click("#uiDlgOk"); pg.wait_for_timeout(150)   # v21: temalı onay
    s4 = st(pg)
    cb = [c for c in s4["combos"] if c["id"] == "combo_b"]
    check(cb and all(i["foodId"] != "custom_x" for i in cb[0]["items"]), "silinen özel besin kombodan çıkarıldı")
    check(not any(c["id"] == "combo_c" for c in s4["combos"]), "boş kalan kombo kaldırıldı")
    check("custom_x" not in s4["foodSnap"], "silinen besinin yedeği temizlendi")
    check(not e3, f"hata yok {e3[:1]}")
    ctx.close()
    b.close()
finally:
    srv.terminate()
print("ERRORS:", errs or "none")
print(f"{'HATA: ' + str(len(fails)) + ' kontrol başarısız' if fails else 'TÜM KONTROLLER GEÇTİ'}")
sys.exit(1 if errs or fails else 0)
