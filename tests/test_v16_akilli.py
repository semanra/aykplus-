# v16 (3. paket): Kalan makroya göre tamamla (sık yenen besinlerden 2–3 seçenek), Geçmiş'te haftalık görünüm:
# 7 günlük ortalama, hedef tutturma takvimi (7/30 gün), haftalık kalori bütçesi, 7 günlük kilo ortalaması.
import os, sys
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOTS = os.path.join(os.path.dirname(__file__), "shots")
os.makedirs(SHOTS, exist_ok=True)
import subprocess, time, json
from datetime import date, timedelta, datetime
srv = subprocess.Popen(['python3', '-m', 'http.server', '8768'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
def st(pg): return pg.evaluate("JSON.parse(localStorage.getItem('ayk_plus_v5_state'))")
def ov(pg):
    w = pg.evaluate("[document.documentElement.scrollWidth, document.documentElement.clientWidth]"); return w[0] <= w[1]
def view(pg, v): pg.evaluate(f"setNutriView('{v}')"); pg.wait_for_timeout(80)
def dk(n): return (date.today() + timedelta(days=n)).isoformat()
SMALL_JS = """(sel) => [...document.querySelectorAll(sel)]
  .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.width < 44 || r.height < 44); })
  .map(e => (e.textContent || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 30) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height))"""

try:
  with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={"width": 375, "height": 812}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.getElementById('splash'); if(s) s.remove();})")
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("dialog", lambda d: d.accept())
    pg.goto("http://localhost:8768/index.html"); pg.wait_for_timeout(300)
    pg.evaluate("switchTab('nutrition')"); pg.wait_for_timeout(100)

    # ---------- 1) Kalan makroya göre tamamla
    # Akşam öğününü boşalt (bugün) → kalan protein ve kalori oluşsun
    pg.evaluate("ensureDayCopy()[3].items = []; renderAll(); goAddFood(3, 'day')"); pg.wait_for_timeout(120)
    t = pg.evaluate("getTargets()"); tot = pg.evaluate("nutritionTotals()")
    remP, remK = t["proTarget"] - tot["p"], t["calTarget"] - tot["cal"]
    check(remP > 20 and remK > 200, f"kalan var: {round(remK)} kcal, {round(remP)} g P")
    sug = pg.locator("#foodSuggest [data-suggest]")
    check(not pg.evaluate("$('foodSuggest').classList.contains('hidden')") and 2 <= sug.count() <= 3, f"2–3 seçenek gösteriliyor ({sug.count()})")
    check("KALAN HEDEFİNİ KAPATAN" in pg.inner_text("#foodSuggest"), "başlık: Kalan hedefini kapatan seçenekler")
    cache = pg.evaluate("foodSuggestCache")
    freq = pg.evaluate("frequentFoods(30)")
    check(all(pt["id"] in freq for o in cache for pt in o["parts"]), "öneriler yalnızca sık yenen/kayıtlı besinlerden")
    best = cache[0]
    check(abs(best["P"] - remP) <= max(15, remP * 0.25) and best["K"] <= remK + 80, f"en iyi seçenek proteini kapatıyor ({round(best['P'])}/{round(remP)} g), kaloriyi aşmıyor ({round(best['K'])}/{round(remK)})")
    check(all(o["K"] <= remK + 80 for o in cache), "hiçbir seçenek kalan kaloriyi 80 kcal'den fazla aşmıyor")
    check(len({"+".join(sorted(pt["id"] for pt in o["parts"])) for o in cache}) == len(cache), "seçenekler birbirinden farklı")
    caps = pg.evaluate("foodSuggestCache.every(o => o.parts.every(pt => pt.a <= maxSuggestAmt(getFoodDB()[pt.id]) + 1e-9))")
    check(caps, "hiçbir öneri porsiyonun 2,5 katını aşmıyor (gerçekçi miktarlar)")
    oil = pg.evaluate("foodSuggestCache.flatMap(o => o.parts).filter(pt => pt.id === 'zeytinyagi').map(pt => pt.a)")
    check(all(a <= 25 for a in oil), f"zeytinyağı önerisi en fazla 25 g ({oil})")
    pg.screenshot(path=SHOTS + "/v16_suggest.png")
    menu_before = st(pg)["meals"][3]["items"]
    pg.locator('#foodSuggest [data-suggest="0"]').click(); pg.wait_for_timeout(120)
    tot2 = pg.evaluate("nutritionTotals()")
    check(abs(tot2["cal"] - tot["cal"] - best["K"]) <= 2 and abs(tot2["p"] - tot["p"] - best["P"]) <= 1, "tek dokunuşla seçenekteki besinler bugüne eklendi")
    check(st(pg)["meals"][3]["items"] == menu_before, "öneri menüyü değiştirmedi (bugüne eklendi)")
    # Arama yazılınca / besin seçilince öneri kartı gizleniyor
    pg.evaluate("ensureDayCopy()[3].items = []; renderAll()"); pg.wait_for_timeout(80)
    pg.fill("#foodSearch", "yulaf"); pg.evaluate("renderFoodList()")
    check(pg.evaluate("$('foodSuggest').classList.contains('hidden')"), "arama yazılınca öneriler gizlendi")
    pg.fill("#foodSearch", ""); pg.evaluate("renderFoodList()")
    check(not pg.evaluate("$('foodSuggest').classList.contains('hidden')"), "arama silinince öneriler geri geldi")
    # Hedefe ulaşıldığında öneri yok
    pg.evaluate("state.deficit = 1000; ensureDayCopy()[3].items = [{foodId:'tavuk_gogsu', amount: 2000}]; renderAll()"); pg.wait_for_timeout(80)
    check(pg.evaluate("$('foodSuggest').classList.contains('hidden')"), "kalan yokken öneri kartı görünmüyor")
    pg.evaluate("state.deficit = 700; revertDayToMenu(); renderAll()")
    small = pg.evaluate(SMALL_JS, "#nvFoods button")
    check(not small, f"Besinler: düğmeler en az 44 px {small}")

    # ---------- 2) Haftalık görünüm
    now_ms = int(time.time() * 1000)
    logs = {}
    # Son 7 gün: 2 hedefte, 2 yakın, 1 uzak, 1 kayıt yok, 1 planlanan (tiksiz)
    logs[dk(-1)] = {"kcal": 2400, "eatenKcal": 2000, "eatenP": 180, "mealsDone": 4, "calTarget": 2000, "p": 190}
    logs[dk(-2)] = {"kcal": 2000, "eatenKcal": 2030, "eatenP": 170, "mealsDone": 4, "calTarget": 2000}
    logs[dk(-3)] = {"kcal": 2000, "eatenKcal": 2200, "eatenP": 160, "mealsDone": 3, "calTarget": 2000}
    logs[dk(-4)] = {"kcal": 2000, "eatenKcal": 1750, "eatenP": 150, "mealsDone": 3, "calTarget": 2000}
    logs[dk(-5)] = {"kcal": 2000, "eatenKcal": 2800, "eatenP": 140, "mealsDone": 4, "calTarget": 2000}
    logs[dk(-7)] = {"kcal": 2100, "p": 175, "eatenKcal": 0, "eatenP": 0, "mealsDone": 0, "calTarget": 2000}
    logs[dk(-20)] = {"kcal": 1500, "eatenKcal": 1500, "eatenP": 100, "mealsDone": 4, "calTarget": 2000}
    wl = [{"date": "x", "weight": 101.0, "ts": now_ms - 6 * 86400000}, {"date": "x", "weight": 100.0, "ts": now_ms - 3 * 86400000},
          {"date": "x", "weight": 99.0, "ts": now_ms - 1 * 86400000}, {"date": "x", "weight": 110.0, "ts": now_ms - 20 * 86400000}]
    pg.evaluate("([l, w]) => { state.dailyLogs = l; state.weightLogs = w; renderAll(); }", [logs, wl])
    view(pg, "history")
    check(pg.locator("#weekCard").count() == 1, "Geçmiş'in başında haftalık kart var")
    exp_avgK = (2000 + 2030 + 2200 + 1750 + 2800 + 2100) / 6
    exp_avgP = (180 + 170 + 160 + 150 + 140 + 175) / 6
    check(pg.inner_text("#avgKcal") == pg.evaluate(f"fmtInt({exp_avgK})") and pg.inner_text("#avgPro") == pg.evaluate(f"fmtInt({exp_avgP})"), f"7 günlük ortalama kalori {round(exp_avgK)}, protein {round(exp_avgP)} (tiksiz günde plan sayılıyor)")
    cls = {k: pg.get_attribute(f'[data-heat="{k}"]', "data-cls") for k in [dk(-1), dk(-2), dk(-3), dk(-4), dk(-5), dk(-6), dk(0)]}
    check(cls[dk(-1)] == "ok" and cls[dk(-2)] == "ok" and cls[dk(-3)] == "near" and cls[dk(-4)] == "near" and cls[dk(-5)] == "far" and cls[dk(-6)] == "none" and cls[dk(0)] == "today", f"takvim renkleri doğru: {cls}")
    check(pg.locator("[data-heat]").count() == 7, "7 günlük takvim 7 gün gösteriyor")
    pg.locator("#weekCard button", has_text="30 gün").click(); pg.wait_for_timeout(80)
    check(pg.locator("[data-heat]").count() == 30 and pg.get_attribute(f'[data-heat="{dk(-20)}"]', "data-cls") == "far" and st(pg)["nutriHistRange"] == "30", "30 günlük takvim, 20 gün önceki gün 'uzak'")
    # Haftalık bütçe
    w = pg.evaluate("weekStats()")
    ws = date.today() - timedelta(days=date.today().weekday())
    tgt = pg.evaluate("getTargets().calTarget")
    exp_total = 0; exp_taken = 0
    for i in range(7):
        d = (ws + timedelta(days=i)).isoformat()
        if d < date.today().isoformat():
            L = logs.get(d)
            intake = None
            if L:
                intake = L["eatenKcal"] if L.get("mealsDone", 0) > 0 and L.get("eatenKcal", 0) > 0 else L["kcal"]
            exp_total += L["calTarget"] if L else tgt
            exp_taken += intake or 0
        else:
            exp_total += tgt
    exp_taken += pg.evaluate("eatenTotals().cal")
    check(abs(w["total"] - exp_total) < 1 and abs(w["taken"] - exp_taken) < 1, f"haftalık bütçe: hedef {round(exp_total)}, alınan {round(exp_taken)}")
    wb = pg.inner_text("#weekBudget")
    check(pg.evaluate(f"fmtInt({exp_total})") in wb and pg.evaluate(f"fmtInt({exp_total - exp_taken})") in wb, "bütçe kartında hedef ve kalan yazıyor")
    # 7 günlük kilo ortalaması (20 gün önceki tartı hariç)
    check("son tartı 99 kg" in pg.inner_text("#weightAvgRow") and "100" in pg.inner_text("#weightAvgRow") and "3 tartı" in pg.inner_text("#weightAvgRow"), f"7 günlük kilo ortalaması 100 kg (3 tartı): {pg.inner_text('#weightAvgRow')!r}")
    pg.screenshot(path=SHOTS + "/v16_week.png")
    view(pg, "menus")
    check("7 günlük ortalama: 100 kg (3 tartı)" in pg.inner_text("#weightAvgText"), "Menülerim kilo kartında 7 günlük ortalama")
    view(pg, "history")
    small = pg.evaluate(SMALL_JS, "#nvHistory button")
    check(not small, f"Geçmiş: düğmeler en az 44 px {small}")
    for wd in (375, 320):
        pg.set_viewport_size({"width": wd, "height": 740}); pg.wait_for_timeout(60)
        check(ov(pg), f"Geçmiş {wd} px: yatay taşma yok")
    pg.set_viewport_size({"width": 375, "height": 812})
    # Gündüz teması
    pg.evaluate("toggleNutriLight()"); pg.wait_for_timeout(80)
    pg.screenshot(path=SHOTS + "/v16_week_light.png")
    pg.evaluate("toggleNutriLight()")

    # ---------- 3) Veri yokken
    pg.evaluate("state.dailyLogs = {}; state.weightLogs = []; renderAll()"); pg.wait_for_timeout(80)
    check("—" in pg.inner_text("#avgKcal") and "tartı yok" in pg.inner_text("#weightAvgRow"), "kayıt yokken boş değerler düzgün")
    # Eski veri: nutriHistRange yok / bozuk
    pg.evaluate("s => localStorage.setItem('ayk_plus_v5_state', s)", json.dumps({"activeTab": "nutrition", "nutriHistRange": 99, "dailyLogs": {"2026-10-01": {"kcal": 2400}}}))
    pg.reload(); pg.wait_for_timeout(300)
    check(st(pg)["nutriHistRange"] == "7", "bozuk takvim ayarı 7 güne döndü")
    b.close()
finally:
    srv.terminate()
print("ERRORS:", errs or "none")
print(f"{'HATA: ' + str(len(fails)) + ' kontrol başarısız' if fails else 'TÜM KONTROLLER GEÇTİ'}")
sys.exit(1 if errs or fails else 0)
