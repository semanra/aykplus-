# v41: depolama temeli — IndexedDB (parçalı), localStorage "ayna" (silinmez, güncel tutulur), güvenli geçiş + "Geçiş öncesi"
# iç yedeği, dışarıdan değişen kaydın içe alınması, IndexedDB yokken eski mod, yazma hatası, bozuk parça kurtarma,
# otomatik iç yedekler (son 7 gece + 4 hafta) ve geri dönme, ayna dolunca çalışmaya devam, hız ölçümü.
import os, sys, json, subprocess, time, datetime
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8800'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = "http://localhost:8800/index.html"
KEY = "ayk_plus_v5_state"
T = datetime.datetime.fromisoformat
SPLASH = "document.addEventListener('DOMContentLoaded',()=>{const s=document.getElementById('splash'); if(s) s.remove();})"
V40 = {"activeTab": "nutrition", "today": "2026-11-13", "settings": {"splash": False}, "weight": 88, "waterLiters": 1.5,
       "dailyLogs": {"2026-11-1%d" % i: {"eatenKcal": 2000 + i, "water": 2} for i in range(3)},
       "workoutLogs": [{"id": "w1", "ts": 1763000000000, "dayName": "Bacak", "sets": 12, "volume": 5000}],
       "weightLogs": [{"ts": 1763000000000, "weight": 89}],
       "exerciseHistory": {"squat": [{"ts": 1763000000000, "name": "Squat", "kind": "weight", "sets": [{"kg": 100, "reps": 5}]}]},
       "mobilityRoutine": {"dynamic": [], "static": [], "routines": [{"id": "mr_main", "name": "Rutinim", "items": []}]}}

def stored(pg): return pg.evaluate("aykStoredState()")
def ls(pg): return pg.evaluate(f"localStorage.getItem('{KEY}')")
def snaps(pg): return pg.evaluate("aykSnapList()")

try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    def page(t0="2026-11-13T10:00:00", init=None):
        ctx = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844})
        ctx.add_init_script(SPLASH)
        if init: ctx.add_init_script(init)
        pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.clock.install(time=T(t0))
        return ctx, pg
    def go(pg): pg.goto(URL); pg.wait_for_function("window.aykBooted === true", timeout=10000); pg.wait_for_timeout(50)
    def reload(pg): pg.reload(); pg.wait_for_function("window.aykBooted === true", timeout=10000); pg.wait_for_timeout(50)

    # ===== 1) Yeni kurulum: IndexedDB; ayna 2 sn sonra =====
    ctx, pg = page(); go(pg)
    check(pg.evaluate("storeMode") == "idb", f"yeni kurulum IndexedDB'de ({pg.evaluate('storeMode')})")
    pg.evaluate("addWater(0.5)")
    check(stored(pg)["waterLiters"] == 0.5, "dokunuş IndexedDB'ye yazıldı")
    pg.clock.run_for(2600); pg.wait_for_timeout(50)
    m = json.loads(ls(pg) or "{}")
    check(m.get("waterLiters") == 0.5, "localStorage aynası 2 sn sonra güncel")
    ctx.close()

    # ===== 2) v40 kaydının geçişi =====
    S = json.dumps(V40)
    ctx, pg = page(init=f"if (!sessionStorage.getItem('t')) {{ sessionStorage.setItem('t', '1'); localStorage.setItem('{KEY}', {json.dumps(S)}); }}")
    go(pg)
    s = stored(pg)
    check(pg.evaluate("storeMode") == "idb" and s["weight"] == 88 and s["waterLiters"] == 1.5 and len(s["dailyLogs"]) == 3
          and s["workoutLogs"][0]["volume"] == 5000 and s["exerciseHistory"]["squat"][0]["sets"][0]["kg"] == 100, "v40 kaydı birebir taşındı")
    sn = snaps(pg)
    pre = [x for x in sn if x["kind"] == "pre"]
    check(len(pre) == 1 and pg.evaluate("aykSnapJson(%s)" % json.dumps(pre[0]["key"])) == S, "'Geçiş öncesi' iç yedeği ham kaydın birebir aynısı")
    check(ls(pg) == S, "localStorage kaydı silinmedi, dokunulmadı (değişiklik olana dek)")
    n0 = len(sn); reload(pg)
    check(pg.evaluate("storeMode") == "idb" and len(snaps(pg)) == n0 and stored(pg)["weight"] == 88, "ikinci açılışta tekrar geçiş yok")
    # ===== 3) localStorage dışarıdan değişti (eski sürüm / yedek aracı) → içe alınır, önceki hâl yedeklenir =====
    V2 = dict(V40, weight=77)
    pg.evaluate("s => localStorage.setItem('%s', s)" % KEY, json.dumps(V2)); reload(pg)
    check(stored(pg)["weight"] == 77, "dışarıdan değişen kayıt içe alındı")
    imp = [x for x in snaps(pg) if x["kind"] == "import"]
    check(len(imp) == 1 and json.loads(pg.evaluate("aykSnapJson(%s)" % json.dumps(imp[0]["key"])))["weight"] == 88, "içe almadan önceki hâl iç yedekte")
    # ===== 4) Yazma hatası =====
    pg.evaluate("() => { window.__put = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function () { throw new DOMException('dolu', 'QuotaExceededError'); }; }")
    pg.evaluate("addWater(0.5)"); pg.wait_for_timeout(150)
    m = json.loads(ls(pg))
    g = pg.evaluate("aykDB ? idbGet('meta', 'main').then(m => [m.gen, +localStorage.getItem('ayk_plus_v5_sira')]) : [0, +localStorage.getItem('ayk_plus_v5_sira')]")
    check(pg.evaluate("state.waterLiters") == 2 and m["waterLiters"] == 2 and g[1] > g[0],
          f"IndexedDB yazamayınca veri hemen localStorage'a, daha büyük sıra numarasıyla ({g})")
    pg.evaluate("() => { IDBObjectStore.prototype.put = window.__put; addWater(0.5); }"); pg.wait_for_timeout(300)
    check(stored(pg)["waterLiters"] == 2.5, "hata geçince yeniden bağlanıp her şeyi yazıyor")
    pg.clock.run_for(2600); pg.wait_for_timeout(80)
    g = pg.evaluate("idbGet('meta', 'main').then(m => [m.gen, +localStorage.getItem('ayk_plus_v5_sira')])")
    check(g[0] == g[1], f"IndexedDB yeniden yazınca numaralar eşitlendi ({g})")
    # ===== 5) Bozuk parça → en yeni iç yedek + kurtarma kopyası =====
    pg.evaluate("aykRawPut('parts', 'dailyLogs', '{bozuk')"); reload(pg)
    s = stored(pg)
    check(pg.evaluate("storeMode") == "idb" and s["weight"] == 77 and isinstance(s["dailyLogs"], dict), "bozuk parçada en yeni iç yedekten açıldı")
    pg.clock.run_for(600); pg.wait_for_timeout(80)
    resc = pg.evaluate("localStorage.getItem('ayk_plus_v5_state_kurtarma')") or ""
    check("_okunamayanBolumler" in resc and "{bozuk" in resc and "okunamad" in pg.inner_text("#toastWrap"), "kurtarma kopyası (bozuk bölümün ham hâliyle) + uyarı")
    reload(pg)
    check(isinstance(stored(pg)["dailyLogs"], dict), "kurtarılan bölüm yeniden yazıldı, sonraki açılışta sağlam")
    ctx.close()

    # ===== 6) IndexedDB yokken eski mod =====
    ctx, pg = page(init="try { Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true }); } catch (e) {}")
    go(pg)
    check(pg.evaluate("storeMode") == "ls", "IndexedDB yokken eski mod")
    pg.evaluate("addWater(0.25)")
    check(json.loads(ls(pg))["waterLiters"] == 0.25 and stored(pg)["waterLiters"] == 0.25, "eski modda kayıt anında localStorage'a")
    ctx.close()

    # ===== 7) İç yedekler: son 7 gece + 4 hafta; geri dönme + Geri al =====
    ctx, pg = page(t0="2026-09-01T09:00:00"); go(pg)
    for d in range(1, 61):
        pg.evaluate("w => { state.weight = w; renderAll(); }", 60 + d)
        pg.clock.set_system_time(T("2026-09-01T09:00:00") + datetime.timedelta(days=d))
        pg.evaluate("document.dispatchEvent(new Event('visibilitychange'))"); pg.wait_for_timeout(25)
    pg.wait_for_timeout(150)
    sn = snaps(pg)
    kinds = {k: len([x for x in sn if x["kind"] == k]) for k in ("day", "week", "pre", "import")}
    check(kinds["day"] == 7 and kinds["week"] == 4 and kinds["import"] == 0, f"iç yedek: 7 gece + 4 hafta ({kinds})")
    days = sorted(x["date"] for x in sn if x["kind"] == "day")
    check(days[-1] == "2026-10-31" and days[0] == "2026-10-25", f"gece yedekleri son 7 gün ({days[0]}…{days[-1]})")
    pg.evaluate("openProfile()"); pg.wait_for_timeout(200)
    pg.evaluate("document.getElementById('pfSnaps').closest('details').open = true"); pg.wait_for_timeout(100)
    rows = pg.locator("#pfSnaps [data-snap]")
    check(rows.count() == 11, f"Profil'de 11 iç yedek listeleniyor ({rows.count()})")
    oldest = sorted([x for x in sn if x["kind"] == "week"], key=lambda x: x["date"])[0]
    pg.locator(f'#pfSnaps [data-snap="{oldest["key"]}"] [data-snap-restore]').click(); pg.wait_for_timeout(150)
    pg.click("#uiDlgOk"); pg.wait_for_timeout(250)
    w_old = json.loads(pg.evaluate("aykSnapJson(%s)" % json.dumps(oldest["key"])))["weight"]
    check(stored(pg)["weight"] == w_old and w_old < 120, f"iç yedeğe dönüldü (kilo {w_old})")
    pg.locator("#toastWrap button", has_text="Geri al").click(); pg.wait_for_timeout(150)
    check(stored(pg)["weight"] == 120, "Geri al → son hâl")
    ctx.close()

    # ===== 8) Ayna dolunca: uygulama IndexedDB ile devam =====
    ctx, pg = page(); go(pg)
    pg.evaluate("localStorage.setItem('__dolgu', 'x'.repeat(4900000))")
    pg.evaluate("for (let i = 0; i < 5; i++) state.dailyLogs['2025-01-0' + (i + 1)] = { eatenKcal: 1, pad: 'y'.repeat(60000) }; renderAll()")
    pg.clock.run_for(2600); pg.wait_for_timeout(80)
    pg.evaluate("addWater(1)"); pg.wait_for_timeout(50)
    check(stored(pg)["waterLiters"] == 1 and not errs, "localStorage dolu: kayıt IndexedDB'de sürüyor, hata yok")
    pg.evaluate("localStorage.removeItem('__dolgu')")
    ctx.close()

    # ===== 9) Hız: 5 yıllık yoğun veri, dokunuş başı kayıt =====
    ctx, pg = page(); go(pg)
    r = pg.evaluate("""() => {
      const D = 864e5, t0 = Date.now() - 5 * 365 * D;
      for (let i = 0; i < 1825; i++) state.dailyLogs[todayStr(new Date(t0 + i * D))] = { eatenKcal: 2100, p: 180, c: 220, f: 70, water: 3, mealsDone: 5, supps: 3, planKcal: 2200, train: true };
      for (let e = 0; e < 25; e++) state.exerciseHistory['h' + e] = Array.from({ length: 260 }, (_, j) => ({ ts: t0 + j * 7 * D, name: 'H' + e, kind: 'weight', logId: 'l' + j, sets: [1, 2, 3, 4].map(k => ({ kg: 60 + k, reps: 8, e: 2 })) }));
      for (let j = 0; j < 1040; j++) state.workoutLogs.push({ id: 'w' + j, ts: t0 + j * 1.7 * D, date: '1 Oca', dayName: 'Gün', sets: 20, volume: 9000, durationMin: 70 });
      renderAll(); flushSave();
      const time = f => { const a = performance.now(); for (let i = 0; i < 20; i++) f(); return (performance.now() - a) / 20; };
      const legacy = time(() => localStorage.setItem('__olcum', JSON.stringify(state)));
      localStorage.removeItem('__olcum');
      const idb = time(() => { state.waterLiters += 0.01; flushSave(); });
      return { legacy, idb, chars: JSON.stringify(state).length };
    }""")
    print(f"     ölçüm: {r['chars']} karakter, eski kayıt {r['legacy']:.1f} ms, yeni kayıt {r['idb']:.1f} ms")
    check(r["chars"] > 1400000 and r["idb"] < r["legacy"], f"5 yıllık veride dokunuş kaydı eskisinden hızlı ({r['idb']:.1f} < {r['legacy']:.1f} ms)")
    ctx.close()


    # ===== 10) İnceleme senaryoları: veri hiçbir yolda eskiye dönmemeli =====
    ctx, pg = page(); go(pg)
    # C1: IndexedDB yazamıyor → ayna arka planda yazılıyor → yeniden açılış en yeni veriyi göstermeli
    pg.evaluate("() => { window.__put = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function () { throw new DOMException('kayıp', 'UnknownError'); }; }")
    pg.evaluate("state.weight = 111; renderAll()"); pg.wait_for_timeout(50)
    pg.evaluate("() => { writeMirror(); }")
    pg.evaluate("() => { IDBObjectStore.prototype.put = window.__put; }"); reload(pg)
    check(pg.evaluate("state.weight") == 111, f"C1: yazma hatasından sonra yeniden açılış en yeni veri ({pg.evaluate('state.weight')})")
    # I1: bağlantı kapandı (onversionchange) → sonraki değişiklikler kaybolmamalı
    pg.evaluate("() => { aykDB.close(); aykDB = null; }")
    pg.evaluate("state.weight = 99; renderAll()"); pg.wait_for_timeout(400)
    reload(pg)
    check(pg.evaluate("state.weight") == 99, f"I1: bağlantı kopunca değişiklik kaybolmuyor ({pg.evaluate('state.weight')})")
    # I2: geciken yazma + geri dönüş → son hâl kalmalı
    pg.evaluate("""() => { const orig = idbWrite; window.__iw = orig; idbWrite = (p, d) => new Promise(r => setTimeout(() => orig(p, d).then(r), 100)); }""")
    pg.evaluate("state.weight = 71; renderAll()"); pg.evaluate("state.weight = 99; renderAll()")
    pg.clock.run_for(300); pg.wait_for_timeout(200)
    pg.evaluate("() => { idbWrite = window.__iw; }"); pg.clock.run_for(2600); pg.wait_for_timeout(100)
    reload(pg)
    check(pg.evaluate("state.weight") == 99, f"I2: geciken yazma son hâli ezmiyor ({pg.evaluate('state.weight')})")
    # I3: çekirdek bozuk, iç yedek yok → imzalı aynadan (en yeni) kurtarılmalı
    pg.evaluate("state.weight = 95; renderAll()"); pg.clock.run_for(2600); pg.wait_for_timeout(100)
    pg.evaluate("aykRawPut('parts', 'core', '{bozuk')")
    pg.evaluate("() => new Promise(r => { const tx = aykDB.transaction('snaps', 'readwrite'); tx.objectStore('snaps').clear(); tx.oncomplete = r; })")
    reload(pg)
    check(pg.evaluate("state.weight") == 95 and len(pg.evaluate("state.meals")) > 0, f"I3: bozuk çekirdek aynadan geri geldi ({pg.evaluate('state.weight')})")
    # I6: kurtarma kopyasını geri yükleyince ham metin kayda taşınmıyor
    pg.evaluate("state._okunamayanBolumler = { core: 'x'.repeat(1000) }; state = normalizeState(JSON.parse(JSON.stringify(state))); renderAll()")
    check(pg.evaluate("'_okunamayanBolumler' in state") is False, "I6: kurtarma alanı kayıttan ayıklanıyor")
    # M1: fabrika ayarlarından önce iç yedek
    n = len([x for x in snaps(pg) if x["kind"] == "safe"])
    pg.evaluate("openProfile(); void resetToDefaults()"); pg.wait_for_timeout(150); pg.click("#uiDlgOk"); pg.wait_for_timeout(150); pg.click("#uiDlgOk"); pg.wait_for_timeout(250)
    imp = [x for x in snaps(pg) if x["kind"] == "safe"]
    check(len(imp) == n + 1 and json.loads(pg.evaluate("aykSnapJson(%s)" % json.dumps(sorted(imp, key=lambda x: -x["ts"])[0]["key"])))["weight"] == 95, "M1: sıfırlamadan önceki hâl iç yedekte")
    ctx.close()

    # ===== 11) İkinci inceleme senaryoları =====
    ctx, pg = page(); go(pg)
    # R2-C1: localStorage dolu (ayna eski kalır) + tek IndexedDB hatası + yeniden bağlanma → yeniden açılış en yeni (IndexedDB)
    pg.evaluate("state.weight = 70; renderAll()"); pg.clock.run_for(2600); pg.wait_for_timeout(80)
    pg.evaluate("localStorage.setItem('__dolgu', 'x'.repeat(4500000))")
    pg.evaluate("for (let i = 0; i < 4; i++) state.dailyLogs['2025-02-0' + (i + 1)] = { eatenKcal: 1, pad: 'y'.repeat(250000) }; renderAll()")
    pg.clock.run_for(2600); pg.wait_for_timeout(80)
    check(pg.evaluate("localStorage.getItem('ayk_plus_v5_ayna_kapali')") == "1", "localStorage doldu: ayna kapalı işaretlendi")
    pg.evaluate("() => { window.__put = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function () { throw new DOMException('kayıp', 'UnknownError'); }; }")
    pg.evaluate("state.weight = 80; renderAll()"); pg.wait_for_timeout(50)
    pg.evaluate("() => { IDBObjectStore.prototype.put = window.__put; }")
    pg.clock.run_for(11000); pg.evaluate("state.weight = 95; renderAll()"); pg.wait_for_timeout(400)
    pg.evaluate("() => { writeMirror(); }"); pg.wait_for_timeout(50)
    reload(pg)
    check(pg.evaluate("state.weight") == 95, f"R2-C1: ayna dolu + yazma hatası sonrası en yeni veri açıldı ({pg.evaluate('state.weight')})")
    pg.evaluate("localStorage.removeItem('__dolgu')")
    ctx.close()
    # R2-I1: hızlı dokunuş + hemen arka plan → sonraki açılış içe alma yapmaz, veri doğru
    ctx, pg = page(); go(pg)
    for i in range(3):
        pg.evaluate("w => { state.weight = w; renderAll(); document.dispatchEvent(new Event('visibilitychange')); writeMirror(); }", 81 + i)
        reload(pg)
        check(pg.evaluate("state.weight") == 81 + i, f"R2-I1: açılış {i + 1}: veri doğru")
    check(len([x for x in snaps(pg) if x["kind"] == "import"]) == 0, "R2-I1: hızlı dokunuş + arka plan içe almaya yol açmıyor")
    # I3: içe alma iki kez tutmadıysa eski modda kalır
    pg.evaluate("localStorage.setItem('ayk_plus_v5_idb_hata', '2:' + Date.now())"); reload(pg)
    check(pg.evaluate("storeMode") == "ls" and pg.evaluate("state.weight") == 83, "I3: doğrulama tutmayan cihazda eski modda kalıyor, veri yerinde")
    pg.evaluate("localStorage.removeItem('ayk_plus_v5_idb_hata')")
    # M1: Profil'de yazarken ana ekrana geçilirse değer kaydedilir
    reload(pg); pg.evaluate("openProfile()"); pg.wait_for_timeout(100)
    pg.fill("#setAge", "52")
    pg.evaluate("Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange'))"); pg.wait_for_timeout(100)
    check(stored(pg)["settings"]["age"] == 52, "M1: yazarken arka plana geçince Profil değeri kaydedildi")
    ctx.close()
    # R3-I1: localStorage kopyası okunamaz hâle geldi → sağlam IndexedDB verisi açılır, varsayılana dönülmez
    ctx, pg = page(); go(pg)
    pg.evaluate("state.weight = 77; state.customFoods['custom_x'] = { name: 'Ev yoğurdu', p: 0.04, c: 0.05, f: 0.03, unit: 'g' }; renderAll()")
    pg.clock.run_for(2600); pg.wait_for_timeout(80)
    pg.evaluate("localStorage.setItem('ayk_plus_v5_state', '{bozuk')"); reload(pg)
    s = stored(pg)
    check(pg.evaluate("state.weight") == 77 and "custom_x" in s["customFoods"] and s["weight"] == 77, f"R3-I1: okunamayan localStorage sağlam veriyi ezmedi ({pg.evaluate('state.weight')})")
    check("{bozuk" in (pg.evaluate("localStorage.getItem('ayk_plus_v5_state_kurtarma')") or ""), "okunamayan kopya kurtarma kopyasına alındı")
    pg.clock.run_for(2600); pg.evaluate("addWater(0.25)"); pg.evaluate("() => { writeMirror(true); }")
    check(json.loads(ls(pg))["weight"] == 77, "ayna sağlam veriyle yeniden yazıldı")
    ctx.close()
    # R2-I2: depo açılamıyor + ayna kapalı → salt okunur, "Bu verilerle devam" ile yazma açılır
    ctx, pg = page(init="localStorage.setItem('ayk_plus_v5_ayna_kapali', '1'); try { Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true }); } catch (e) {}")
    pg.goto(URL); pg.wait_for_function("window.aykBooted === true", timeout=15000)
    pg.clock.run_for(500); pg.wait_for_timeout(80)
    check(pg.evaluate("storeReadOnly") is True and "açılamadı" in pg.inner_text("#toastWrap"), "R2-I2: salt okunur açılış + uyarı")
    pg.evaluate("addWater(1)")
    check((json.loads(ls(pg) or "{}").get("waterLiters") or 0) != 1, "salt okunurken yazılmıyor")
    pg.locator("#toastWrap button", has_text="Bu verilerle devam").click(); pg.wait_for_timeout(100)
    pg.evaluate("addWater(1)")
    check(pg.evaluate("storeReadOnly") is False and json.loads(ls(pg))["waterLiters"] == 2, "R2-I2: 'Bu verilerle devam' sonrası kayıt yapılıyor")
    ctx.close()
    check(not errs, f"sayfa hatası yok ({errs[:3]})")
    b.close()
finally:
    srv.terminate()
print(f"\n{len(fails)} hata" if fails else "\nHEPSİ GEÇTİ")
sys.exit(1 if fails else 0)
