# v29: İlerleme yeniden tasarım (alt sekmeler Genel · Kilo · Güç · Beslenme, "Grafit + kaynak renkleri").
import os, sys, json, subprocess, time, datetime
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOTS = os.path.join(os.path.dirname(__file__), "shots")
os.makedirs(SHOTS, exist_ok=True)
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8779'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = "http://localhost:8779/index.html"
def st(pg): return pg.evaluate("JSON.parse(localStorage.getItem('ayk_plus_v5_state'))")
def ov(pg):
    w = pg.evaluate("[document.documentElement.scrollWidth, document.documentElement.clientWidth]"); return w[0] <= w[1]
SMALL_JS = """() => [...document.querySelectorAll('#progressContent button, #progressContent select, #progressContent summary')]
  .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.width < 44 || r.height < 44); })
  .map(e => (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 24) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height))"""
TODAY = datetime.date.today()
def dkey(n): return (TODAY - datetime.timedelta(days=n)).isoformat()
NOW_MS = int(time.time() * 1000); DAY = 86400000

def seed(pg, data):
    pg.goto(URL); pg.wait_for_timeout(200)
    pg.evaluate("s => localStorage.setItem('ayk_plus_v5_state', s)", json.dumps(data)); pg.reload(); pg.wait_for_timeout(350)

# Bu haftanın Pazartesi'si (uygulamadaki weekStart ile aynı)
MON = TODAY - datetime.timedelta(days=TODAY.weekday())
def ts_of(d, h=18): return int(datetime.datetime(d.year, d.month, d.day, h).timestamp() * 1000)

def history(name, muscle, n, base, last_days_ago=1):
    out = []
    for i in range(n):
        d = TODAY - datetime.timedelta(days=last_days_ago + (n - 1 - i) * 7)
        out.append({"ts": ts_of(d), "logId": f"{name}{i}", "kind": "weight", "name": name, "muscle": muscle,
                    "sets": [{"kg": base + i * 2.5, "reps": 8}, {"kg": base + i * 2.5, "reps": 6}]})
    return out

try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.getElementById('splash'); if(s) s.remove();})")
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))

    # ================= 1) ESKİ KAYIT, VARSAYILAN ALT SEKME, TEMA =================
    seed(pg, {"activeTab": "progress", "weight": 90, "today": TODAY.isoformat()})
    s = st(pg)
    check(s["progressView"] == "genel", "eski kayıt: progressView yok → Genel")
    check(pg.locator("#progNav button").all_inner_texts() == ["Genel", "Kilo", "Güç", "Beslenme"], "dört alt sekme")
    check(pg.get_attribute('#progNav [data-pv="genel"]', "aria-current") == "page", "açık alt sekme işaretli")
    check(pg.evaluate("document.body.classList.contains('theme-prog')"), "İlerleme teması (theme-prog)")
    check(pg.evaluate("getComputedStyle(document.body).backgroundColor") == "rgb(0, 0, 0)", "zemin siyah")
    check(pg.evaluate("getComputedStyle(document.getElementById('navBtnProgress')).color") == "rgb(244, 244, 245)", "alt menüde İlerleme kırık beyaz")
    check(pg.locator("#progressHeaderBar").inner_text().strip() == "", "eski emojili açıklama satırı kaldırıldı")
    check("en az 4 tartı" in pg.inner_text("#pCoach"), "koç: veri yokken ne gerektiğini söylüyor")
    seed(pg, {"activeTab": "progress", "progressView": "bozuk"})
    check(st(pg)["progressView"] == "genel", "geçersiz alt sekme → Genel")
    pg.click('#progNav [data-pv="kilo"]'); pg.wait_for_timeout(150)
    check(st(pg)["progressView"] == "kilo" and pg.locator("#pv_kilo").count() == 1, "alt sekme değişiyor ve kaydediliyor")
    pg.reload(); pg.wait_for_timeout(300)
    check(pg.locator("#pv_kilo").count() == 1, "yeniden açınca son alt sekme hatırlanıyor")
    check(pg.locator("#pv_genel").count() == 0, "yalnızca açık alt sekme çiziliyor")
    pg.evaluate("switchTab('gym')"); pg.wait_for_timeout(100)
    check(not pg.evaluate("document.body.classList.contains('theme-prog')"), "başka sekmede İlerleme teması kalkıyor")

    # ================= 2) ZENGİN VERİ =================
    wl = [{"date": "x", "weight": round(100 - i * 0.1, 1), "ts": NOW_MS - (30 - i) * DAY} for i in range(0, 30, 2)]   # 15 tartı
    wl.insert(0, {"date": "Başlangıç", "weight": 101})   # zamansız eski kayıt
    hist = {"barbell bench press": history("Barbell Bench Press", "Göğüs", 6, 80),
            "back squat": history("Back Squat", "Ön Bacak", 2, 100)}
    work_days = [MON + datetime.timedelta(days=i) for i in (0, 2) if MON + datetime.timedelta(days=i) <= TODAY]
    wlogs = [{"id": f"w{i}", "ts": ts_of(d), "volume": 5000 + i * 100, "cardioMin": 15, "cardioKm": 2, "prs": 1} for i, d in enumerate(work_days)]
    wlogs.append({"id": "old", "ts": NOW_MS - 20 * DAY, "volume": 8000, "cardioMin": 0, "cardioKm": 0, "prs": 0})
    dl = {}
    for i in range(1, 15):
        dl[dkey(i)] = {"kcal": 2400, "p": 180, "eatenKcal": 2900 if i == 2 else 2400, "eatenP": 190, "mealsDone": 0 if i == 3 else 4, "mealsTotal": 4,
                       "water": 3, "calTarget": 2400, "proTarget": 180}
    mlog = {dkey(1): ["Couch Stretch"], dkey(2): ["Couch Stretch"]}
    rich = {"activeTab": "progress", "progressView": "genel", "weight": 97.2, "weightLogs": wl, "exerciseHistory": hist, "workoutLogs": wlogs,
            "dailyLogs": dl, "mobilityLog": mlog, "measurements": [{"ts": NOW_MS - 20 * DAY, "bel": 100, "kol": 40}, {"ts": NOW_MS - 2 * DAY, "bel": 98.5, "kol": 40.5}],
            "settings": {"targetWeight": 85, "bodyFat": 22}, "today": TODAY.isoformat()}
    seed(pg, rich)
    before = {k: st(pg)[k] for k in ["weightLogs", "exerciseHistory", "workoutLogs", "dailyLogs", "measurements", "mobilityLog"]}

    # --- Genel
    tiles = pg.locator("#pv_genel .p-tile").all_inner_texts()
    check(len(tiles) == 4, f"Genel: 4 sayı kutusu ({len(tiles)})")
    check(f"{len(work_days)}\nseans" in tiles[0].replace("  ", " ") or tiles[0].split("\n")[1].strip() == str(len(work_days)), f"antrenman sayısı bu hafta ({tiles[0]!r})")
    check("Kilo (7 gün ort.)" in tiles[1], "kilo kutusu 7 günlük ortalama")
    exp_mob = sum(1 for k in mlog if datetime.date.fromisoformat(k) >= MON)
    check(tiles[3].split("\n")[1].strip() == str(exp_mob), f"mobilite günü bu hafta = {exp_mob} ({tiles[3]!r})")
    cells = pg.locator("#pStrip .p-sd").count()
    check(cells == 21, f"gün gün şeridi: 3 satır × 7 gün ({cells})")
    labels = pg.eval_on_selector_all("#pStrip .p-sd", "els => els.map(e => e.getAttribute('aria-label'))")
    check(all(l and ":" in l for l in labels), "şeritteki her hücrenin sesli açıklaması var (renk tek başına değil)")
    check(sum(1 for l in labels if "antrenman yapıldı" in l) == len(work_days), "antrenman günleri şeritte ✓")
    check(pg.locator("#pStrip .p-sd.tq svg").count() == len(work_days), "antrenman hücrelerinde ✓ simgesi")
    check(not pg.evaluate(SMALL_JS), "Genel: düğmeler ≥ 44 px")
    pg.screenshot(path=SHOTS + "/v29_genel.png", full_page=True)

    # Tartı kaydet (temalı pencere, Türkçe ondalık)
    pg.click("#pWeighBtn"); pg.wait_for_timeout(120)
    check(pg.is_visible("#uiDlgInput"), "Tartıyı kaydet → temalı pencere")
    pg.fill("#uiDlgInput", "96,4"); pg.click("#uiDlgOk"); pg.wait_for_timeout(200)
    s = st(pg)
    check(s["weightLogs"][-1]["weight"] == 96.4 and s["weight"] == 96.4, "virgüllü kilo kaydedildi (96,4)")
    n = len(s["weightLogs"])
    pg.click("#pWeighBtn"); pg.wait_for_timeout(120); pg.fill("#uiDlgInput", "abc"); pg.click("#uiDlgOk"); pg.wait_for_timeout(150)
    check(pg.is_visible("#uiDlgOk") and "Geçersiz" in pg.inner_text("#uiDlgTitle"), "geçersiz kiloda uyarı")
    pg.click("#uiDlgOk"); pg.wait_for_timeout(100)
    check(len(st(pg)["weightLogs"]) == n, "geçersiz kilo kaydedilmedi")
    pg.click("#pWeighBtn"); pg.wait_for_timeout(120); pg.click("#uiDlgCancel"); pg.wait_for_timeout(100)
    check(len(st(pg)["weightLogs"]) == n, "Vazgeç → kayıt yok")

    # --- Kilo
    pg.click('#progNav [data-pv="kilo"]'); pg.wait_for_timeout(150)
    check(pg.locator("#pWeight svg.p-chart").count() == 1 and "7 gün ort." in pg.inner_text("#pWeight"), "kilo grafiği: günlük nokta + 7 günlük ortalama")
    check(pg.locator("#pWeight .p-lg").count() == 1, "grafik açıklaması var")
    check("Yağsız kütle" in pg.inner_text("#pv_kilo"), "yağ oranı varken yağsız kütle görünüyor")
    pg.click("#pWeight >> text=Tümü"); pg.wait_for_timeout(100)
    check(pg.evaluate("progUI.wRange") == 0, "aralık seçimi (Tümü)")
    rows = pg.locator("#pv_kilo button[aria-label='Tartıyı sil']").count()
    check(rows == 6, f"son 6 tartı listesi, silinebilir ({rows})")
    n = len(st(pg)["weightLogs"])
    pg.locator("#pv_kilo button[aria-label='Tartıyı sil']").first.click(); pg.wait_for_timeout(150)
    check(len(st(pg)["weightLogs"]) == n - 1, "tartı silindi")
    pg.locator("#toastWrap button", has_text="Geri al").first.click(); pg.wait_for_timeout(150)
    check(len(st(pg)["weightLogs"]) == n, "Geri al tartıyı geri getirdi")
    mt = pg.inner_text("#pMeasure")
    check("4 ölçümden sonra" in mt and pg.locator("#pMeasure svg.p-chart").count() == 0, "2 ölçüm: grafik yok, sayı + açıklama")
    check("98,5" in mt and "−1,5" in mt, "bel son değer ve değişim")
    pg.evaluate("state.measurements.push({ts: Date.now()-DAY_MS, bel: 98}, {ts: Date.now(), bel: 97.5}); renderAll()"); pg.wait_for_timeout(150)
    check(pg.locator("#pMeasure svg.p-chart").count() == 1, "4 ölçümde çizgi grafiği açılıyor")
    pg.click("#pMeasure >> text=Ölçü ekle"); pg.wait_for_timeout(150)
    check(pg.evaluate("document.getElementById('chartModal').classList.contains('tm')"), "Ölçü ekle penceresi koyu temada (.tm)")
    pg.evaluate("closeModal('chartModal')"); pg.wait_for_timeout(100)
    check(not pg.evaluate(SMALL_JS), "Kilo: düğmeler ≥ 44 px")
    pg.screenshot(path=SHOTS + "/v29_kilo.png", full_page=True)

    # --- Güç
    pg.click('#progNav [data-pv="guc"]'); pg.wait_for_timeout(150)
    check(pg.locator("#pExChart svg.p-chart").count() == 1 and "tahmini 1RM" in pg.inner_text("#pExChart"), "6 seanslı hareket: 1RM çizgi grafiği")
    pg.locator("#pExChart .p-chip", has_text="Back Squat").click(); pg.wait_for_timeout(150)
    check(pg.locator("#pExChart svg.p-chart").count() == 0 and "en az 4 gerekir" in pg.inner_text("#pExChart"), "2 seanslı hareket: grafik yerine sayı kartı")
    prs = pg.locator("#pPrs .p-pr").all_inner_texts()
    check(len(prs) == 2, f"en iyiler listesi ({len(prs)})")
    pg.locator("#pPrs .p-pr", has_text="Barbell Bench Press").click(); pg.wait_for_timeout(200)
    check(pg.evaluate("progressSel") == "barbell bench press" or "Barbell" in pg.inner_text("#pExChart .p-chip.on"), "en iyilerden dokununca hareket seçiliyor")
    vals = pg.eval_on_selector_all("#pMuscles .p-bl-c b", "els => els.map(e => +e.textContent)")
    check(vals == sorted(vals, reverse=True), f"kas setleri azalan sırada ({vals})")
    check("uygun" in pg.inner_text("#pMuscles") or "az" in pg.inner_text("#pMuscles"), "kas setlerinde durum yazıyla")
    check(pg.locator("#pCalendar .p-cal-d").count() == 35, "takvim 5 hafta")
    check(pg.locator("#pCalendar .p-cal-d.w em").count() >= len(work_days), "antrenman günü: dolgu + ✓")
    check(pg.locator("#pCalendar .p-cal-d u").count() >= 1, "mobilite günü: alt çizgi")
    check(pg.locator("#pTonnage svg.p-chart").count() == 1 and "Bu h." in pg.inner_text("#pTonnage"), "haftalık tonaj, bu hafta ayrı işaretli")
    check("Kardiyo" in pg.inner_text("#pTonnage") and f"{15 * len(work_days)} dk" in pg.inner_text("#pTonnage"), "kardiyo dakikası korunuyor")
    check(not pg.evaluate(SMALL_JS), "Güç: düğmeler ≥ 44 px")
    pg.screenshot(path=SHOTS + "/v29_guc.png", full_page=True)

    # --- Beslenme
    pg.click('#progNav [data-pv="beslenme"]'); pg.wait_for_timeout(150)
    check(pg.locator("#pKcal svg.p-chart").count() == 1 and pg.locator("#pWater svg.p-chart").count() == 1, "kalori ve su grafikleri")
    check(pg.locator("#pKcal path[fill^='url(#phkc']").count() >= 1, "hedef üstü gün çizgili desenle (renk dışı işaret)")
    check(pg.locator("#pKcal path[stroke-dasharray]").count() >= 1, "işaretlenmemiş gün kesik çerçeveyle")
    check("Hedef" in pg.inner_text("#pKcal .p-lg"), "hedef çizgisi açıklamada")
    pg.click("#pv_beslenme >> text=30 gün"); pg.wait_for_timeout(150)
    check(pg.evaluate("histRange") == 30, "30 gün seçimi")
    check(pg.locator("#pDayList").count() == 1, "gün gün liste korunuyor")
    check(not pg.evaluate(SMALL_JS), "Beslenme: düğmeler ≥ 44 px")
    pg.screenshot(path=SHOTS + "/v29_beslenme.png", full_page=True)

    # Görüntülemek veriyi değiştirmez
    after = {k: st(pg)[k] for k in before}
    after["weightLogs"] = after["weightLogs"][:len(before["weightLogs"])]
    check(after["exerciseHistory"] == before["exerciseHistory"] and after["workoutLogs"] == before["workoutLogs"]
          and after["dailyLogs"] == before["dailyLogs"] and after["mobilityLog"] == before["mobilityLog"], "sekmeleri gezmek kayıtlı veriyi değiştirmiyor")
    check(st(pg)["weightLogs"][0].get("date") == "Başlangıç", "zamansız eski tartı kaydı korunuyor")

    # ================= 3) BOŞ VERİ =================
    seed(pg, {"activeTab": "progress", "progressView": "guc"})
    check("kaydettikçe" in pg.inner_text("#pv_guc"), "Güç: boşken yönlendiren açıklama")
    pg.click('#progNav [data-pv="beslenme"]'); pg.wait_for_timeout(150)
    check("İlk günün yarın" in pg.inner_text("#pv_beslenme"), "Beslenme: boşken açıklama")
    pg.click('#progNav [data-pv="kilo"]'); pg.wait_for_timeout(150)
    check("en az 4 tartı" in pg.inner_text("#pWeight"), "Kilo: az tartıda grafik yerine açıklama")

    # ================= 4) 320 px =================
    ctx2 = b.new_context(color_scheme="dark", viewport={"width": 320, "height": 568}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx2.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.getElementById('splash'); if(s) s.remove();})")
    p2 = ctx2.new_page(); p2.on("pageerror", lambda e: errs.append(str(e)))
    seed(p2, rich)
    for v in ["genel", "kilo", "guc", "beslenme"]:
        p2.evaluate(f"setProgressView('{v}')"); p2.wait_for_timeout(150)
        check(ov(p2), f"320 px {v}: yatay taşma yok")
        check(not p2.evaluate(SMALL_JS), f"320 px {v}: düğmeler ≥ 44 px")
    fits = p2.evaluate("(() => { const n = document.getElementById('progNav'); return n.scrollWidth <= n.clientWidth + 1; })()")
    check(fits, "320 px: dört alt sekme kaydırmadan sığıyor")
    p2.screenshot(path=SHOTS + "/v29_320.png")

    check(not errs, f"sayfa hatası yok ({errs[:3]})")
    b.close()
finally:
    srv.terminate()
print(f"\n{len(fails)} hata" if fails else "\nHEPSİ GEÇTİ")
sys.exit(1 if fails else 0)
