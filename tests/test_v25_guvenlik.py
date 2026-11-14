# v25: veri güvenliği. Bozuk kayıt/yedek uygulamayı bozmaz ve gerçek verinin üzerine yazmaz (kurtarma kopyası),
# günlük özetler 180 günden sonra silinmez, Menülerim'de 0 gram silmesi Geri al ile, boş giriş besini silmez,
# "Karbı dengele" kaldırıldı, "Dünkü" etiketi gün geçiş saatine göre, yeni gün metni Beslenme → Geçmiş.
import os, sys, json, subprocess, time
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOTS = os.path.join(os.path.dirname(__file__), "shots")
os.makedirs(SHOTS, exist_ok=True)
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8781'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
fails = []
URL = "http://localhost:8781/index.html"
KEY = "ayk_plus_v5_state"
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
def st(pg): return pg.evaluate(f"JSON.parse(localStorage.getItem('{KEY}'))")
def undo(pg): pg.locator("#toastWrap button", has_text="Geri al").last.click(); pg.wait_for_timeout(100)
SPLASH = "document.addEventListener('DOMContentLoaded',()=>{const s=document.getElementById('splash'); if(s) s.remove();})"
def new_page(b, clock=None, raw=None):
    ctx = b.new_context(color_scheme="dark", viewport={"width": 375, "height": 812}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.add_init_script(SPLASH)
    pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    native = []; pg.on("dialog", lambda d: (native.append(d.message), d.accept()))
    if clock: pg.clock.set_fixed_time(clock)
    pg.goto(URL); pg.wait_for_timeout(300)
    if raw is not None:
        pg.evaluate(f"r => {{ localStorage.clear(); localStorage.setItem('{KEY}', r); }}", raw if isinstance(raw, str) else json.dumps(raw))
        pg.reload(); pg.wait_for_timeout(500)
    return ctx, pg, errs, native

# Bozuk ama kurtarılabilir eski kayıt: boş öğün/kalem, metin miktar, boş özel besin, bozuk tarif, boş günlük kayıt,
# bugünkü kopyada boş öğün ve tahmini giriş, barkodlu özel besin.
BROKEN = {
  "activeTab": "nutrition", "weight": 90, "deficit": 500, "dayType": "train",
  "meals": [
    None,
    {"id": "m1", "title": "Kahvaltı", "items": [None, {"foodId": "pirinc", "amount": "80,5"}, {"amount": 10}, {"foodId": "custom_bc_869", "amount": "abc"}]},
    {"id": "m2", "title": "Öğle", "items": None},
    "bozuk",
  ],
  "restMeals": [None, {"id": "r1", "title": "Dinlenme", "items": [{"foodId": "pirinc", "amount": 60}]}],
  "customFoods": {
    "custom_bos": None,
    "custom_bc_869": {"name": "Barkodlu Yoğurt", "unit": "g", "p": "0,1", "c": 0.04, "f": 0.015, "kcal": "0,72", "barcode": "869", "def": "150"},
    "custom_recipe_x": {"name": "Ev Mercimeği", "unit": "g", "p": 0.05, "c": 0.12, "f": 0.02, "kcal": 0.9, "recipe": {"items": [None, {"foodId": "pirinc", "amount": "100"}], "cooked": "450"}},
    "custom_tarif_bozuk": {"name": "Bozuk Tarif", "unit": "g", "p": 0.1, "c": 0.1, "f": 0.1, "recipe": "olmaz"},
  },
  "dailyLogs": {
    "2026-01-01": None,
    "2026-01-02": {"kcal": 2400, "p": 180, "meals": [None, {"id": "m1", "title": "Kahvaltı", "items": [None, {"foodId": "pirinc", "amount": "70"}]}]},
    "2026-01-03": {"kcal": 2300, "meals": "bozuk"},
  },
  "dayPlan": {"date": "2000-01-01", "train": [None, {"id": "m1", "title": "Kahvaltı", "items": [{"foodId": "_est", "amount": 1, "est": {"name": "Dışarıda", "cal": "650", "p": "30"}}]}], "rest": None},
  "workoutDays": [None, {"name": "A", "exercises": []}],
}

try:
  with sync_playwright() as p:
    b = p.chromium.launch()

    # 1) Bozuk kayıtla açılış: uygulama açılır, sağlam veri korunur, değerler sayıya çevrilir
    ctx, pg, errs, _ = new_page(b, raw=BROKEN)
    s = st(pg)
    check(pg.is_visible("#tabNutrition"), "bozuk kayıtla uygulama açıldı")
    check(len(s["meals"]) == 2 and [m["title"] for m in s["meals"]] == ["Kahvaltı", "Öğle"], f"boş/bozuk öğünler atıldı, sağlam öğünler kaldı ({[m.get('title') for m in s['meals']]})")
    it = s["meals"][0]["items"]
    check(len(it) == 2 and it[0] == {"foodId": "pirinc", "amount": 80.5}, f"boş kalem ve besinsiz kalem atıldı, '80,5' sayıya çevrildi ({it})")
    check(it[1]["foodId"] == "custom_bc_869" and it[1]["amount"] == 0, "okunamayan miktar 0 oldu, besin silinmedi")
    check(s["meals"][1]["items"] == [], "items: null → boş liste")
    check(len(s["restMeals"]) == 1 and s["restMeals"][0]["id"] == "r1", "dinlenme menüsünde boş öğün atıldı")
    cf = s["customFoods"]
    check("custom_bos" not in cf, "boş özel besin kaydı atıldı")
    check(cf["custom_bc_869"]["p"] == 0.1 and cf["custom_bc_869"]["kcal"] == 0.72 and cf["custom_bc_869"]["def"] == 150 and cf["custom_bc_869"]["barcode"] == "869", "barkodlu özel besin: değerler sayıya çevrildi, barkod korundu")
    rc = cf["custom_recipe_x"]["recipe"]
    check(rc["items"] == [{"foodId": "pirinc", "amount": 100}] and rc["cooked"] == 450, f"tarif malzemeleri temizlendi ({rc})")
    check("recipe" not in cf["custom_tarif_bozuk"] and cf["custom_tarif_bozuk"]["name"] == "Bozuk Tarif", "bozuk tarif alanı atıldı, besin kaldı")
    dl = s["dailyLogs"]
    check("2026-01-01" not in dl and dl["2026-01-02"]["kcal"] == 2400, "boş günlük kayıt atıldı, sağlam olan kaldı")
    check(dl["2026-01-02"]["meals"] == [{"id": "m1", "title": "Kahvaltı", "items": [{"foodId": "pirinc", "amount": 70}]}], "arşivdeki öğünler temizlendi")
    check("meals" not in dl["2026-01-03"] and dl["2026-01-03"]["kcal"] == 2300, "bozuk arşiv öğünleri atıldı, özet kaldı")
    check(len(s["workoutDays"]) == 1 and s["workoutDays"][0]["name"] == "A", "boş antrenman günü atıldı")
    tot = pg.evaluate("nutritionTotals(curMeals()).cal")
    check(isinstance(tot, (int, float)) and tot == tot and tot > 0, f"menü kalorisi sayı (NaN değil): {tot}")
    check(pg.evaluate(f"localStorage.getItem('{KEY}_kurtarma')") is None, "kurtarılabilen kayıtta kurtarma kopyası gerekmedi")
    check(not errs, f"bozuk kayıtla hata yok {errs[:1]}")
    ctx.close()

    # 2) Bugünkü kopyadaki tahmini giriş temizliği (bugünün tarihiyle)
    today = "2026-03-10"
    b2 = dict(BROKEN, dayPlan={"date": today, "train": [None, {"id": "m1", "title": "Kahvaltı", "items": [None, {"foodId": "_est", "amount": "1", "est": {"name": "Dışarıda", "cal": "650", "p": "30,5"}}]}], "rest": None}, today=today)
    ctx, pg, errs, _ = new_page(b, clock=today + "T12:00:00", raw=b2)
    s = st(pg)
    dp = s["dayPlan"]
    check(dp and dp["date"] == today and len(dp["train"]) == 1, f"bugünkü kopya: boş öğün atıldı ({dp and len(dp['train'])})")
    e = dp["train"][0]["items"]
    check(len(e) == 1 and e[0]["est"]["cal"] == 650 and e[0]["est"]["p"] == 30.5 and e[0]["est"]["c"] == 0 and e[0]["amount"] == 1, f"tahmini giriş sayıya çevrildi ({e})")
    check(not errs, f"hata yok {errs[:1]}")
    ctx.close()

    # 3) Okunamayan kayıt (bozuk JSON): ham veri kurtarma anahtarına kopyalanır, uyarı çıkar
    bad = '{"meals": [ {"title": "Kahvaltı", '
    ctx, pg, errs, _ = new_page(b, raw=bad)
    check(pg.evaluate(f"localStorage.getItem('{KEY}_kurtarma')") == bad, "okunamayan kayıt kurtarma anahtarına kopyalandı")
    pg.wait_for_timeout(400)
    check("Kayıtlı veriler okunamadı" in pg.inner_text("#toastWrap"), "okunamayan kayıt için uyarı gösterildi")
    check(pg.is_visible("#tabNutrition"), "uygulama yine de açıldı")
    # İkinci açılışta kurtarma kopyası (ilk bozuk veri) korunur, üzerine yazılmaz
    pg.evaluate(f"localStorage.setItem('{KEY}', '{{bozuk2')"); pg.reload(); pg.wait_for_timeout(400)
    check(pg.evaluate(f"localStorage.getItem('{KEY}_kurtarma')") == bad, "var olan kurtarma kopyasının üzerine yazılmadı")
    ctx.close()

    # 4) Bozuk yedek geri yükleme: mevcut veri değişmez; kurtarılabilir yedek temizlenerek yüklenir
    ctx, pg, errs, native = new_page(b)
    pg.evaluate("state.weight = 77; renderAll()")
    pg.evaluate("void restoreFromText(JSON.stringify({meals: [null, {title: 'Yedek', items: [null, {foodId: 'pirinc', amount: '55,5'}]}], customFoods: {x: null}, dailyLogs: {a: null}}))")
    pg.wait_for_timeout(150); pg.click("#uiDlgOk"); pg.wait_for_timeout(300)
    s = st(pg)
    check(s["meals"][0]["title"] == "Yedek" and s["meals"][0]["items"] == [{"foodId": "pirinc", "amount": 55.5}] and s["customFoods"] == {} and s["dailyLogs"] == {}, "bozuk yedek temizlenerek geri yüklendi")
    check(not errs and not native, f"yedek geri yüklemede hata/sistem kutusu yok {errs[:1]}")
    ctx.close()

    # 5) 180 gün sınırı kaldırıldı: 400 günlük özet gün geçişinde silinmez
    ctx, pg, errs, _ = new_page(b, clock="2026-03-10T12:00:00")
    pg.evaluate("""(() => { for (let i = 1; i <= 400; i++) { const d = new Date(2026, 2, 10 - i); state.dailyLogs[todayStr(d)] = {kcal: 2000 + i, meals: [{id: 'x', title: 'X', items: []}]}; } renderAll(); })()""")
    pg.evaluate("archiveDay('2026-03-10'); renderAll()")
    s = st(pg)
    n = len(s["dailyLogs"]); oldest = sorted(s["dailyLogs"])[0]
    check(n == 401, f"400 günlük özetin hiçbiri silinmedi ({n} gün, en eski {oldest})")
    with_meals = sum(1 for v in s["dailyLogs"].values() if "meals" in v)
    check(with_meals <= 7, f"öğün içerikleri yine yalnızca son 7 günde ({with_meals})")
    ctx.close()

    # 6) Menülerim'de 0 gram: Geri al ile silme; boş giriş besini silmez
    ctx, pg, errs, native = new_page(b)
    pg.evaluate("switchTab('nutrition'); setNutriView('menus')"); pg.wait_for_timeout(100)
    m0 = st(pg)["meals"][0]["items"]
    first = m0[0]
    pg.evaluate("setAmount(0, 0, '')"); pg.wait_for_timeout(80)
    check(st(pg)["meals"][0]["items"][0] == first, "boş giriş: besin silinmedi, eski gram kaldı")
    pg.evaluate("setAmount(0, 0, 'abc')"); pg.wait_for_timeout(80)
    check(st(pg)["meals"][0]["items"][0] == first, "geçersiz giriş: besin silinmedi")
    pg.evaluate("setAmount(0, 0, '0')"); pg.wait_for_timeout(120)
    check(len(st(pg)["meals"][0]["items"]) == len(m0) - 1, "0 yazınca besin çıkarıldı")
    check(pg.locator("#toastWrap button", has_text="Geri al").count() >= 1, "0 gram silmesinde Geri al çıktı")
    undo(pg)
    check(st(pg)["meals"][0]["items"] == m0, "Geri al ile besin geri geldi")
    # − ile 0'a inme
    pg.evaluate("curMeals()[0].items[0].amount = getFoodDB()[curMeals()[0].items[0].foodId].step || 1; renderAll()")
    pg.evaluate("changeAmount(0, 0, -1)"); pg.wait_for_timeout(120)
    check(len(st(pg)["meals"][0]["items"]) == len(m0) - 1, "− ile 0'a inince besin çıkarıldı")
    undo(pg)
    check(len(st(pg)["meals"][0]["items"]) == len(m0), "− silmesi Geri al ile geri alındı")

    # 7) "Karbı dengele" kaldırıldı; alışveriş düğmesi tam genişlik
    check(pg.evaluate("typeof autoBalanceCarbs") == "undefined", "autoBalanceCarbs kodu kaldırıldı")
    check(pg.locator("[onclick='autoBalanceCarbs()']").count() == 0 and "Karbı dengele" not in pg.inner_text("#nvMenus"), "Karbı dengele düğmesi yok")
    w = pg.evaluate("[document.getElementById('shopBtn').getBoundingClientRect().width, document.getElementById('shopBtn').parentElement.getBoundingClientRect().width]")
    check(abs(w[0] - w[1]) < 2, f"Alışveriş listesi düğmesi tam genişlikte ({w})")
    pg.locator("#shopBtn").scroll_into_view_if_needed(); pg.screenshot(path=os.path.join(SHOTS, "v25_menulerim_dugmeler.png"))
    # 8) Yeni gün metni
    pg.evaluate("void manualNewDay()"); pg.wait_for_timeout(150)
    msg = pg.inner_text("#uiDialog")
    check("Beslenme → Geçmiş" in msg and "İlerleme sekmesine" not in msg, "yeni gün onayı Beslenme → Geçmiş diyor")
    pg.click("#uiDlgCancel") if pg.locator("#uiDlgCancel").count() else None
    check(not errs and not native, f"hata/sistem kutusu yok {errs[:1]}")
    ctx.close()

    # 9) "Dünkü" etiketi gün geçiş saatine göre: 03:00 ayarında saat 02:00 iken mantıksal gün 9 Mart, dün 8 Mart
    base = {"activeTab": "nutrition", "settings": {"dayStartHour": 3}, "today": "2026-03-09"}
    ctx, pg, errs, _ = new_page(b, clock="2026-03-10T02:00:00", raw=base)
    check(pg.evaluate("dayLabelShort('2026-03-08')") == "Dünkü", "02:00'de (gün geçişi 03:00) 8 Mart 'Dünkü'")
    check(pg.evaluate("dayLabelShort('2026-03-09')") != "Dünkü", "02:00'de 9 Mart 'Dünkü' sayılmıyor (o hâlâ bugün)")
    ctx.close()
    ctx, pg, errs2, _ = new_page(b, clock="2026-03-10T12:00:00", raw={"activeTab": "nutrition"})
    check(pg.evaluate("dayLabelShort('2026-03-09')") == "Dünkü", "gün geçişi 00:00'da 9 Mart 'Dünkü'")
    check(not (errs or errs2), f"hata yok {(errs + errs2)[:1]}")
    ctx.close()
    b.close()
finally:
    srv.terminate()
print(f"{'HATA: ' + str(len(fails)) + ' kontrol başarısız' if fails else 'TÜM KONTROLLER GEÇTİ'}")
sys.exit(1 if fails else 0)
