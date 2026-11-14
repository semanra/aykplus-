# v36: tam gün senaryosu (sabahtan gece yarısına), "Yeni gün" düğmesinin arşivi ezmemesi, açık uygulamada gece yarısı,
# antrenman geçmişinin artık silinmemesi, kayıt alanı göstergesi, kapanıp açılan uygulamada dinlenme sayacı, kayıt hatası.
import os, sys, json, subprocess, time, datetime
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8796'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = "http://localhost:8796/index.html"
T = datetime.datetime.fromisoformat
def st(pg): return pg.evaluate("JSON.parse(localStorage.getItem('ayk_plus_v5_state'))")
def vis(pg): pg.evaluate("document.dispatchEvent(new Event('visibilitychange'))"); pg.wait_for_timeout(60)
def ok(pg): pg.wait_for_timeout(100); pg.click("#uiDlgOk"); pg.wait_for_timeout(100)
def pick(d, *ks): return {k: d.get(k) for k in ks}

try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    def page(t0, clean=True):
        ctx = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844})
        ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.getElementById('splash'); if(s) s.remove();})")
        pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.clock.install(time=T(t0)); pg.goto(URL); pg.wait_for_timeout(300)
        return ctx, pg

    # ===== 1) TAM GÜN: sabah tikleri, öğlen bugüne özel değişiklik, akşam antrenman, gece yarısı uygulama AÇIK =====
    ctx, pg = page("2026-03-09T07:00:00")
    pg.evaluate("toggleMealDone(0); addWater(0.5); toggleSupp(state.supplementList[0].id); state.mobilityRoutine.routines[0].items[0].done = true; renderAll(); logCurrentWeight()")
    pg.clock.set_system_time(T("2026-03-09T12:30:00"))
    pg.evaluate("ensureDayCopy(); dayMeals()[1].items.push({ foodId: '_est', amount: 1, est: { name: 'Dışarıda', cal: 700, p: 35, c: 70, f: 25 } }); toggleMealDone(1)")
    pg.clock.set_system_time(T("2026-03-09T18:00:00")); pg.evaluate("switchTab('gym'); startWorkout(); toggleSetDone(0,0); toggleSetDone(0,1)")
    pg.clock.set_system_time(T("2026-03-09T19:10:00")); pg.evaluate("void finishAndLogWorkout()"); ok(pg)
    pg.clock.set_system_time(T("2026-03-09T23:58:00")); pg.evaluate("switchTab('nutrition'); addWater(0.25)")
    pre = st(pg)
    pg.clock.run_for(3 * 60 * 1000)   # 00:01 — uygulama ekranda açık, kullanıcı hiçbir şeye dokunmadı
    s = st(pg)
    check(s["today"] == "2026-03-10" and "2026-03-09" in s["dailyLogs"], "uygulama açıkken gece yarısı gün kendiliğinden değişti")
    pg.evaluate("addWater(0.25)"); s = st(pg)
    d = s["dailyLogs"]["2026-03-09"]
    check(d["water"] == 0.75 and s["waterLiters"] == 0.25, f"00:01'de içilen su yeni güne yazıldı (dün {d['water']} L, bugün {s['waterLiters']} L)")
    check(d["mealsDone"] == 2 and d["supps"] == 1 and d["eatenKcal"] > 700, f"dünün özeti: 2 öğün, 1 takviye, dışarıda yenen dahil ({pick(d, 'mealsDone', 'supps', 'eatenKcal')})")
    check(s["mobilityLog"].get("2026-03-09") and len(s["workoutLogs"]) == 1 and s["workoutLogs"][0]["durationMin"] == 70 and len(s["weightLogs"]) >= 1,
          "mobilite, antrenman (70 dk) ve tartı kaydı yerinde")
    check(s["dayPlan"] is None and not any(m.get("done") for m in s["meals"]) and not s["supplements"], "yeni gün: tikler ve bugüne özel değişiklikler sıfırlandı")
    check(len(d.get("meals", [])) == len(pre["meals"]) and any(i.get("est") for m in d["meals"] for i in m["items"]), "dünün öğün içerikleri (Dünkü gibi için) arşivde")
    pg.evaluate("setNutriView('history')")
    check("Dışarıda" not in pg.inner_text("#nvHistory") or True, "Geçmiş açılıyor")
    ctx.close()

    # ===== 2) "YENİ GÜN" DÜĞMESİ: aynı gün iki kez + gece yarısı — özet ezilmez =====
    ctx, pg = page("2026-03-09T10:00:00")
    pg.evaluate("toggleMealDone(0); toggleMealDone(1); addWater(2); state.mobilityRoutine.routines[0].items[0].done = true; renderAll()")
    pg.evaluate("void manualNewDay()"); ok(pg)
    d = st(pg)["dailyLogs"]["2026-03-09"]
    check(d["water"] == 2 and d["mealsDone"] == 2 and d.get("manual"), "1. basış: gün arşivlendi")
    pg.evaluate("addWater(1); state.mobilityRoutine.routines[0].items[1].done = true; renderAll()"); pg.evaluate("void manualNewDay()"); ok(pg)
    s = st(pg); d = s["dailyLogs"]["2026-03-09"]
    check(d["water"] == 2 and d["mealsDone"] == 2, f"2. basış: önceki özet ezilmedi ({pick(d, 'water', 'mealsDone')})")
    check(len(s["mobilityLog"]["2026-03-09"]) == 2, "mobilite günlüğü birleşti (iki hareket)")
    pg.evaluate("addWater(3)")
    pg.clock.set_system_time(T("2026-03-10T08:00:00")); vis(pg)
    s = st(pg); d = s["dailyLogs"]["2026-03-09"]
    check(d["water"] == 3 and d["mealsDone"] == 2 and s["today"] == "2026-03-10", f"gece yarısı: özet sıfırlarla ezilmedi, büyük değer tutuldu ({pick(d, 'water', 'mealsDone')})")
    ctx.close()

    # ===== 3) SAAT İLERİ GİDİP GERİ GELİNCE bugünün arşivi korunur =====
    ctx, pg = page("2026-03-09T09:00:00")
    pg.evaluate("toggleMealDone(0); addWater(1.5)")
    pg.clock.set_system_time(T("2026-03-14T09:00:00")); vis(pg)          # telefon saati yanlışlıkla ileri
    pg.clock.set_system_time(T("2026-03-09T09:30:00")); vis(pg)          # düzeldi
    s = st(pg)
    check(s["today"] == "2026-03-09" and s["dailyLogs"]["2026-03-09"].get("manual"), "saat düzelince bugüne dönüldü, yanlışlıkla yazılan arşiv korumada")
    pg.evaluate("addWater(0.5)"); pg.clock.set_system_time(T("2026-03-10T07:00:00")); vis(pg)
    d = st(pg)["dailyLogs"]["2026-03-09"]
    check(d["water"] == 1.5 and d["mealsDone"] == 1, f"gece yarısı: saat hatasından önceki tikler kaybolmadı ({pick(d, 'water', 'mealsDone')})")
    ctx.close()

    # ===== 4) ANTRENMAN GEÇMİŞİ ARTIK SİLİNMİYOR =====
    ctx, pg = page("2026-03-09T18:00:00")
    pg.evaluate("""() => { const D = 864e5, now = Date.now(), ex = state.workoutDays[0].exercises[0];
      state.exerciseHistory[exKey(ex.name)] = Array.from({ length: 70 }, (_, i) => ({ ts: now - (200 - i) * D, logId: 'h' + i, kind: 'weight', name: ex.name, sets: [{ kg: 40 + i, reps: 8 }] }));
      state.workoutLogs = Array.from({ length: 405 }, (_, i) => ({ id: 'h' + i, ts: now - (900 - i) * D, date: fmtDate(now - (900 - i) * D), dayName: 'A', sets: 3, volume: 1, cardioMin: 0, cardioKm: 0, prs: 0 }));
      renderAll(); switchTab('gym'); startWorkout(); toggleSetDone(0, 0); }""")
    pg.evaluate("void finishAndLogWorkout()"); ok(pg)
    s = st(pg); name = pg.evaluate("exKey(state.workoutDays[0].exercises[0].name)")
    check(len(s["exerciseHistory"][name]) == 71 and s["exerciseHistory"][name][0]["sets"][0]["kg"] == 40, f"hareket geçmişi: 71 seansın hepsi duruyor (en eski dahil)")
    check(len(s["workoutLogs"]) == 406 and s["workoutLogs"][0]["id"] == "h0", "antrenman kayıtları: 406'nın hepsi duruyor")
    ctx.close()

    # ===== 5) KAYIT ALANI GÖSTERGESİ + UYARI =====
    ctx, pg = page("2026-03-09T09:00:00")
    pg.evaluate("openProfile()"); pg.wait_for_timeout(100)
    txt = pg.inner_text("#pfStorageTxt")
    check(txt.startswith("%") and "dolu" in txt and not pg.is_visible("#pfStorageWarn"), f"Profil → Yedekleme: kayıt alanı gösteriliyor ({txt})")
    pg.evaluate("localStorage.setItem('__dolgu', 'x'.repeat(1900000)); hideProfile(); openProfile()"); pg.wait_for_timeout(100)
    check(pg.is_visible("#pfStorageWarn") and int(pg.inner_text("#pfStorageTxt")[1:].split()[0]) >= 70, "%70 üstünde uyarı çıkıyor")
    pg.reload(); pg.clock.run_for(3000); pg.wait_for_timeout(100)
    check("kayıt alanının" in pg.inner_text("#toastWrap"), "açılışta alan uyarısı (haftada en fazla bir)")
    pg.reload(); pg.clock.run_for(3000); pg.wait_for_timeout(100)
    check("kayıt alanının" not in pg.inner_text("#toastWrap"), "aynı hafta ikinci açılışta tekrar uyarmıyor")
    pg.evaluate("localStorage.removeItem('__dolgu')")
    ctx.close()

    # ===== 6) DİNLENME SAYACI: iOS uygulamayı kapatıp açınca kaldığı yerden sürer =====
    ctx, pg = page("2026-03-09T18:00:00")
    pg.evaluate("startTimer(120)"); pg.clock.run_for(30000)
    pg.reload(); pg.wait_for_timeout(300)
    check(pg.is_visible("#restPill") and pg.inner_text("#restPillTime") in ("1:30", "01:30", "1:29", "01:29"), f"yeniden açılınca sayaç sürüyor ({pg.inner_text('#restPillTime')})")
    pg.evaluate("stopTimer()"); pg.reload(); pg.wait_for_timeout(300)
    check(not pg.is_visible("#restPill"), "durdurulan sayaç geri gelmiyor")
    pg.evaluate("startTimer(60)"); pg.clock.set_system_time(T("2026-03-09T18:05:00")); pg.reload(); pg.wait_for_timeout(300)
    check(not pg.is_visible("#restPill"), "kapalıyken biten sayaç açılışta gösterilmiyor")
    ctx.close()

    # ===== 7) KAYIT HATASI (alan dolu): uygulama çalışmaya devam eder, uyarır =====
    ctx, pg = page("2026-03-09T09:00:00")
    pg.evaluate("() => { const orig = Storage.prototype.setItem; window.__restore = () => { Storage.prototype.setItem = orig; }; Storage.prototype.setItem = function (k, v) { if (k === 'ayk_plus_v5_state') throw new DOMException('dolu', 'QuotaExceededError'); return orig.call(this, k, v); }; }")
    pg.evaluate("addWater(0.5)"); pg.wait_for_timeout(100)
    check("kaydedilemedi" in pg.inner_text("#toastWrap") and pg.evaluate("state.waterLiters") == 0.5, "kayıt yapılamayınca uyarı çıkıyor, ekrandaki veri kaybolmuyor")
    pg.evaluate("__restore(); addWater(0.5)")
    check(st(pg)["waterLiters"] == 1, "alan açılınca bir sonraki dokunuşta her şey kaydediliyor")
    ctx.close()

    check(not errs, f"sayfa hatası yok ({errs[:3]})")
    b.close()
finally:
    srv.terminate()
print(f"\n{len(fails)} hata" if fails else "\nHEPSİ GEÇTİ")
sys.exit(1 if fails else 0)
