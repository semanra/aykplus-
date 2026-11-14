# v35: veri güvenliği — bozuk kayıtlarda toplu kayıp yok, gün geçişi sınır durumları, kurtarma kopyası arayüzü,
# yedekten geri yükleme, kullanıcı metninin HTML olarak işlenmemesi.
import os, sys, json, subprocess, time, datetime
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8795'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = "http://localhost:8795/index.html"
KEY = "ayk_plus_v5_state"; RESCUE = "ayk_plus_v5_state_kurtarma"
def st(pg): return pg.evaluate(f"JSON.parse(localStorage.getItem('{KEY}'))")
VISIT = """() => { const out = []; for (const s of ["switchTab('nutrition'); setNutriView('today')", "setNutriView('menus')", "setNutriView('foods')", "setNutriView('history')",
  "switchTab('gym'); setGymView('today')", "setGymView('program')", "setGymView('library')", "setGymView('history')", "switchTab('mobility')",
  "switchTab('progress'); setProgressView('genel')", "setProgressView('kilo')", "setProgressView('guc')", "setProgressView('beslenme')", "openProfile()", "hideProfile()"]) {
  try { new Function(s)(); } catch (e) { out.push(s + ' → ' + e.message); } } return out; }"""

def new_page(b, clock=None):
    ctx = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, accept_downloads=True)
    ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.getElementById('splash'); if(s) s.remove();})")
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    if clock: pg.clock.set_fixed_time(datetime.datetime.fromisoformat(clock))
    return ctx, pg

def seed(pg, data, raw=False):
    pg.goto(URL); pg.wait_for_timeout(200)
    pg.evaluate("([k, v]) => { localStorage.clear(); localStorage.setItem(k, v); }", [KEY, data if raw else json.dumps(data)])
    pg.reload(); pg.wait_for_timeout(350)

try:
  with sync_playwright() as p:
    b = p.chromium.launch()

    # ================= 1) BOZUK KAYITLAR: TOPLU KAYIP YOK =================
    ctx, pg = new_page(b)
    wl = [{"date": "x", "weight": 90 + i, "ts": 1700000000000 + i * 86400000} for i in range(5)]
    cases = [
        ("hareket kaydı null", {"workoutDays": [{"id": "d1", "name": "1. GÜN", "exercises": [None, {"name": "Bench", "sets": [{"kg": 50, "reps": 8}]}]}]}),
        ("set kaydı null", {"workoutDays": [{"id": "d1", "name": "1. GÜN", "exercises": [{"name": "Bench", "sets": [None, {"kg": 50, "reps": 8}, "x"]}]}]}),
        ("hareket adı sayı", {"workoutDays": [{"id": "d1", "name": 0, "exercises": [{"name": 5, "sets": [{"kg": 50, "reps": 8}]}]}]}),
        ("geçmiş oturumu null / set listesi bozuk", {"exerciseHistory": {"bench": [None, {"ts": 1700000000000, "name": "Bench", "kind": "weight", "sets": {}}, {"ts": 1700000500000, "name": "Bench", "kind": "weight", "sets": [None, {"kg": 60, "reps": 5}]}]}}),
        ("öğün adı sayı, saat bozuk", {"meals": [{"id": "m1", "title": 0, "time": 99, "targetNote": {"x": 1}, "items": [{"foodId": "yulaf", "amount": "80,5"}]}]}),
        ("takviye adı nesne", {"supplementList": [{"id": "a", "name": {"x": 1}}, {"id": "b", "name": "Kreatin"}]}),
        ("antrenman kaydı adı sayı + null kayıt", {"workoutLogs": [None, {"id": "w1", "ts": 1700000000000, "dayName": 7, "volume": 100, "sets": 3}]}),
        ("tartı/ölçü listelerinde null", {"measurements": [None, {"ts": 1700000000000, "bel": 90}], "recentFoods": [None, 5, "yulaf"]}),
    ]
    for label, extra in cases:
        data = {"weightLogs": wl, **extra}
        seed(pg, data)
        rescue = pg.evaluate(f"!!localStorage.getItem('{RESCUE}')")
        bad = pg.evaluate(VISIT)
        s = st(pg)
        check(not rescue and not bad and len(s["weightLogs"]) == 5, f"{label}: açılıyor, diğer veri korunuyor, bütün ekranlar hatasız ({bad[:1]})")
    s = st(pg)
    seed(pg, cases[1][1] | {"weightLogs": wl}); s = st(pg)
    check(len(s["workoutDays"][0]["exercises"][0]["sets"]) == 1 and s["workoutDays"][0]["exercises"][0]["sets"][0]["kg"] == 50, "bozuk setler atıldı, geçerli set değişmeden kaldı")
    seed(pg, cases[2][1] | {"weightLogs": wl}); s = st(pg)
    check(s["workoutDays"][0]["exercises"][0]["name"] == "5" and s["workoutDays"][0]["name"] == "0", "sayı olan adlar metne çevrildi (silinmedi)")
    seed(pg, cases[4][1] | {"weightLogs": wl}); s = st(pg)
    check(s["meals"][0]["title"] == "0" and "time" not in s["meals"][0] and s["meals"][0]["items"][0]["amount"] == 80.5, "öğün: ad metin, bozuk saat kaldırıldı, virgüllü miktar sayı")
    ctx.close()

    # ================= 2) GÜN GEÇİŞİ =================
    ctx, pg = new_page(b, "2026-03-10T12:00:00")
    seed(pg, {"today": 12345, "meals": [{"id": "m1", "title": "K", "done": True, "items": []}]})
    s = st(pg)
    check(s["today"] == "2026-03-10", f"bozuk tarih bugünle değişti ({s.get('today')})")
    seed(pg, {"today": "2026-03-20", "meals": [{"id": "m1", "title": "K", "done": True, "items": []}], "waterLiters": 2})
    s = st(pg)
    check(s["today"] == "2026-03-10" and s["meals"][0]["done"] is True and s["waterLiters"] == 2 and "2026-03-20" not in s["dailyLogs"],
          "saat ileri alınmışken yazılan tarih (10 gün ileri) bugüne çekildi; tikler ve su korunuyor, arşiv uydurulmadı")
    ctx.close()
    # Gün geçişi saati ileri alınınca (mantıksal gün 1 gün geri) dünün arşivi ezilmemeli
    ctx, pg = new_page(b, "2026-03-10T01:30:00")
    yest = {"kcal": 2222, "p": 150, "eatenKcal": 2100, "mealsDone": 4, "mealsTotal": 4, "water": 3, "calTarget": 2400, "proTarget": 190}
    seed(pg, {"today": "2026-03-10", "dailyLogs": {"2026-03-09": yest}, "settings": {"dayStartHour": 3},
              "meals": [{"id": "m1", "title": "K", "done": True, "items": [{"foodId": "yulaf", "amount": 80}]}]})
    s = st(pg)
    check(s["today"] == "2026-03-10" and s["dailyLogs"]["2026-03-09"]["kcal"] == 2222, "gün geçişi 03:00'e alınınca (01:30) tarih geri çekilmiyor, dünün arşivi korunuyor")
    pg.clock.set_fixed_time(datetime.datetime.fromisoformat("2026-03-10T04:00:00")); pg.evaluate("checkNewDay(); renderAll()")
    s = st(pg)
    check(s["dailyLogs"]["2026-03-09"]["kcal"] == 2222 and s["today"] == "2026-03-10", "03:00 geçince de dünün arşivi bugünün verisiyle ezilmedi")
    ctx.close()

    # ================= 3) KURTARMA KOPYASI =================
    ctx, pg = new_page(b)
    seed(pg, '{"meals": [ bozuk json', raw=True)
    check(pg.evaluate(f"localStorage.getItem('{RESCUE}')") == '{"meals": [ bozuk json', "okunamayan kayıt kurtarma kopyasına alındı")
    check("Profil" in pg.inner_text("#toastWrap") and "Yedekleme" in pg.inner_text("#toastWrap"), "açılış uyarısı kurtarma kopyasının yerini söylüyor")
    pg.evaluate("openProfile()"); pg.wait_for_timeout(150)
    check(pg.is_visible("#pfRescue"), "Profil → Yedekleme'de kurtarma kartı görünüyor")
    with pg.expect_download() as dl:
        pg.click("#pfRescueSave")
    d = dl.value
    path = d.path(); content = open(path, encoding="utf-8").read()
    check(d.suggested_filename.startswith("AYK-kurtarma-") and content == '{"meals": [ bozuk json', f"kurtarma kopyası dosya olarak indi ({d.suggested_filename})")
    before = pg.evaluate(f"localStorage.getItem('{KEY}')")
    pg.click("#pfRescueRestore"); pg.wait_for_timeout(150)
    check(pg.is_visible("#uiDlgOk") and "Geçersiz" in pg.inner_text("#uiDlgTitle"), "bozuk kopyayı geri yükleme açıkça reddediliyor")
    pg.click("#uiDlgOk"); pg.wait_for_timeout(100)
    check(pg.evaluate(f"localStorage.getItem('{KEY}')") == before, "reddedilince mevcut veri değişmedi")
    # Geçerli bir kurtarma kopyası geri yüklenebilir
    good = json.dumps({"meals": [{"id": "m1", "title": "Kurtarılan öğün", "items": []}], "weight": 88})
    pg.evaluate(f"v => localStorage.setItem('{RESCUE}', v)", good)
    pg.click("#pfRescueRestore"); pg.wait_for_timeout(150); pg.click("#uiDlgOk"); pg.wait_for_timeout(250)
    s = st(pg)
    check(s["meals"][0]["title"] == "Kurtarılan öğün" and s["weight"] == 88, "geçerli kurtarma kopyası onayla geri yüklendi")
    pg.evaluate("openProfile()"); pg.wait_for_timeout(100)
    pg.click("#pfRescueDelete"); pg.wait_for_timeout(120)
    check(pg.is_visible("#uiDlgOk"), "silme onay istiyor")
    pg.click("#uiDlgOk"); pg.wait_for_timeout(150)
    check(not pg.evaluate(f"localStorage.getItem('{RESCUE}')") and not pg.is_visible("#pfRescue"), "kurtarma kopyası silindi, kart kalktı")
    small = pg.evaluate("[...document.querySelectorAll('#pfRescue button')].filter(e => e.getBoundingClientRect().height && e.getBoundingClientRect().height < 44).length")
    check(small == 0, "kurtarma düğmeleri ≥ 44 px")
    ctx.close()

    # ================= 4) YEDEKTEN GERİ YÜKLEME =================
    ctx, pg = new_page(b, "2026-03-10T12:00:00")
    seed(pg, {"weight": 95, "today": "2026-03-10"})
    backup = {"meals": [{"id": "b1", "title": "Yedek öğün", "done": True, "items": [{"foodId": "yulaf", "amount": 70}]}], "weight": 91, "today": "2026-03-08",
              "weightLogs": wl, "workoutDays": [{"id": "d", "name": "A", "exercises": [None, {"name": "Squat", "sets": [{"kg": 80, "reps": 5}]}]}]}
    pg.evaluate("openProfile()"); pg.wait_for_timeout(100)
    pg.evaluate("t => { document.getElementById('backupText').value = t; restoreBackupFromText(); }", json.dumps(backup)); pg.wait_for_timeout(150)
    pg.click("#uiDlgOk"); pg.wait_for_timeout(300)
    s = st(pg)
    check(s["weight"] == 91 and s["meals"][0]["title"] == "Yedek öğün" and len(s["weightLogs"]) == 5 and s["workoutDays"][0]["exercises"][0]["name"] == "Squat",
          "yedek (içinde bozuk hareket kaydı olan) geri yüklendi; bozuk kayıt atıldı, gerisi tam")
    check(s["today"] == "2026-03-10" and s["dailyLogs"].get("2026-03-08", {}).get("mealsDone") == 1, "eski tarihli yedeğin günü arşivlendi, bugüne geçildi")
    pg.evaluate("t => { document.getElementById('backupText').value = t; restoreBackupFromText(); }", '{"foo": 1}'); pg.wait_for_timeout(150)
    check("tanınmadı" in pg.inner_text("#uiDlgTitle"), "AYK+ yedeği olmayan dosya reddedildi")
    pg.click("#uiDlgOk"); pg.wait_for_timeout(80)
    check(st(pg)["weight"] == 91, "reddedilen yedek veriyi değiştirmedi")
    ctx.close()

    # ================= 5) KULLANICI METNİ HTML OLARAK İŞLENMEZ =================
    ctx, pg = new_page(b)
    pg.goto(URL); pg.wait_for_timeout(300)
    X = lambda t: f'<img id="xss_{t}" src=x onerror="window.__xss=1"><b id="xssb_{t}">x</b>'
    pg.evaluate("""(P) => { const X = t => P.replace(/TAG/g, t);
      state.customFoods.custom_x = { name: X('f'), cat: X('c'), unit: 'g', step: 10, def: 100, p: .2, c: .1, f: .05 };
      state.meals[0].title = X('m'); state.meals[0].items.push({ foodId: 'custom_x', amount: 100 }); state.workoutDays[0].name = X('d');
      state.workoutDays[0].exercises[0].name = X('e'); state.supplementList.push({ id: 's', name: X('s') });
      state.mobilityRoutine.routines[0].items.unshift(normMobItem({ name: X('mo'), type: 'static', mode: 'time', sec: 30 }));
      state.combos = [{ id: 'c', name: X('k'), items: [{ foodId: 'custom_x', amount: 1 }] }]; renderAll(); }""", X("TAG"))
    pg.reload(); pg.wait_for_timeout(300)
    bad = pg.evaluate(VISIT)
    pg.evaluate("switchTab('nutrition'); setNutriView('foods'); selectFood('custom_x')"); pg.wait_for_timeout(100)
    hit = pg.evaluate("document.querySelectorAll('[id^=\"xss_\"], [id^=\"xssb_\"]').length + (window.__xss ? 100 : 0)")
    check(hit == 0 and not bad, f"7 alandaki HTML/kod parçası hiçbir ekranda işlenmedi ({hit}, {bad[:1]})")
    txt = pg.evaluate("switchTab('nutrition'); setNutriView('menus'); document.body.innerText")
    check('<b id="xssb_m">' in txt, "öğün adı düz yazı olarak görünüyor")
    ctx.close()

    check(not errs, f"sayfa hatası yok ({errs[:3]})")
    b.close()
finally:
    srv.terminate()
print(f"\n{len(fails)} hata" if fails else "\nHEPSİ GEÇTİ")
sys.exit(1 if fails else 0)
