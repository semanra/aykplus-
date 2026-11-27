# v85: öneri turu — bitmiş antrenmanı düzelt, günü kopyala, kendi makro hedefim, "Dışarıda yedim" tek dokunuş,
# antrenman geçmişinde "Daha fazla göster", geçmiş güne yediğini ekle, tarifte yenen miktar, hızlı kayıt (güvenlik ağıyla)
import os, sys, subprocess, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PORT = 8841
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT)], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = f"http://localhost:{PORT}/index.html"
def boot(pg): pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(80)
def answer(pg, text=None):
    pg.wait_for_selector("#uiDlgOk", state="visible")
    if text is not None: pg.fill("#uiDlgInput", text)
    pg.click("#uiDlgOk"); pg.wait_for_timeout(80)
def stored(pg): return pg.evaluate("aykStoredState()")
D = 864e5
try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    c = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, locale="tr-TR", service_workers="block")
    c.add_init_script(TEST_INIT)
    pg = c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e))); pg.goto(URL); boot(pg)

    # ===== 2) Günü kopyala =====
    pg.evaluate("""() => { state.activeTab = 'gym'; state.gymView = 'program'; state.activeWorkoutDayIdx = 0;
      const d = state.workoutDays[0]; d.exercises[0].sets[0].done = true; d.exercises[0].sets[0].pr = true;
      if (d.exercises.length > 1) { d.exercises[0].ss = 'sA'; d.exercises[1].ss = 'sA'; } renderAll(); }""")
    n0 = pg.evaluate("state.workoutDays.length")
    src = pg.evaluate("JSON.parse(JSON.stringify(state.workoutDays[0]))")
    pg.click("[data-copy-day]")
    answer(pg, "Kopya gün")
    cp = pg.evaluate("state.workoutDays[state.workoutDays.length - 1]")
    check(pg.evaluate("state.workoutDays.length") == n0 + 1 and cp["name"] == "Kopya gün", "Günü kopyala: yeni gün eklendi, adıyla")
    check([e["name"] for e in cp["exercises"]] == [e["name"] for e in src["exercises"]], "kopyada hareketler aynı sırada")
    check(all(not s.get("done") and not s.get("pr") for e in cp["exercises"] for s in e["sets"]), "kopyada set işaretleri temiz")
    if len(src["exercises"]) > 1:
        check(cp["exercises"][0].get("ss") and cp["exercises"][0]["ss"] == cp["exercises"][1]["ss"] and cp["exercises"][0]["ss"] != "sA", "süperset grubu yeni kimlikle korunuyor")
    check(pg.evaluate("state.activeWorkoutDayIdx") == n0, "kopya gün seçili")
    check(pg.evaluate("state.workoutDays[0].exercises[0].sets[0].done") is True, "asıl gün değişmedi")
    pg.evaluate("state.workoutDays[0].exercises[0].sets[0].done = false; state.workoutDays.pop(); state.activeWorkoutDayIdx = 0; renderAll()")

    # ===== 6) Geçmiş: daha fazla göster =====
    pg.evaluate("""() => { const t0 = Date.now() - 200 * 864e5;
      for (let j = 0; j < 75; j++) state.workoutLogs.push({ id: 'z' + j, ts: t0 + j * 864e5, date: '1 Oca', dayName: 'Gün ' + j, sets: 10, volume: 1000, durationMin: 50 });
      state.gymView = 'history'; renderAll(); }""")
    total = pg.evaluate("state.workoutLogs.length")
    check(pg.locator("#workoutHistoryList [data-edit-log]").count() == 30, "geçmiş ilk 30 kayıt")
    check(pg.locator("[data-hist-more]").is_visible(), "Daha fazla göster düğmesi var")
    pg.click("[data-hist-more]"); pg.wait_for_timeout(60)
    check(pg.locator("#workoutHistoryList [data-edit-log]").count() == min(60, total), "bir dokunuşla +30")
    while pg.locator("[data-hist-more]").count(): pg.click("[data-hist-more]"); pg.wait_for_timeout(40)
    check(pg.locator("#workoutHistoryList [data-edit-log]").count() == total, "hepsi açılınca düğme kalkıyor")
    pg.evaluate("state.workoutLogs = state.workoutLogs.filter(l => !/^z/.test(l.id)); gymHistLimit = 30; renderAll()")

    # ===== 1) Bitmiş antrenmanı düzelt =====
    pg.evaluate("""() => { const t1 = Date.now() - 10 * 864e5, t2 = Date.now() - 3 * 864e5;
      state.exerciseHistory['deneme pres'] = [
        { ts: t1, logId: 'wA', kind: 'weight', name: 'Deneme Pres', sets: [{ kg: 60, reps: 8 }] },
        { ts: t2, logId: 'wB', kind: 'weight', name: 'Deneme Pres', sets: [{ kg: 70, reps: 8 }, { kg: 72.5, reps: 6, e: 3 }] } ];
      state.exerciseHistory['deneme koşu'] = [{ ts: t2, logId: 'wB', kind: 'cardio', name: 'Deneme Koşu', sets: [{ min: 20, km: 3, lvl: '' }] }];
      state.workoutLogs.push({ id: 'wA', ts: t1, date: 'x', dayName: 'A', sets: 1, volume: 480, prs: 0 });
      state.workoutLogs.push({ id: 'wB', ts: t2, date: 'x', dayName: 'B', sets: 3, volume: 995, cardioMin: 20, cardioKm: 3, prs: 2 });
      state.workoutLogs.push({ date: 'eski', dayName: 'Eski kayıt', sets: 5, volume: 100 });
      state.gymView = 'history'; renderAll(); }""")
    li = pg.evaluate("state.workoutLogs.findIndex(l => l.id === 'wB')")
    pg.evaluate(f"openEditLog({li})"); pg.wait_for_timeout(60)
    check(pg.locator("#editLogModal").is_visible() and pg.locator("#editLogModal [data-el-set]").count() == 3, "düzelt penceresi 3 setle açıldı (2 ağırlık + 1 kardiyo)")
    pg.fill("[data-el-in='0-0-kg']", "50"); pg.fill("[data-el-in='0-0-reps']", "10")
    pg.click("#elSave"); pg.wait_for_timeout(80)
    h = pg.evaluate("state.exerciseHistory['deneme pres'][1].sets")
    lg = pg.evaluate("state.workoutLogs.find(l => l.id === 'wB')")
    check(h[0] == {"kg": 50, "reps": 10} and h[1].get("e") == 3, "seans güncellendi, zorluk korundu")
    check(lg["volume"] == round(50 * 10 + 72.5 * 6) and lg["sets"] == 3 and lg["cardioMin"] == 20, f"tonaj/set yeniden hesaplandı ({lg['volume']})")
    check(lg["prs"] == 1, f"rekor yeniden: 50×10 rekor değil, 72,5×6 rekor ({lg['prs']})")
    check(pg.evaluate("state.workoutLogs.find(l => l.id === 'wA').prs") == 0, "başka kayıt etkilenmedi")
    # Geri al
    pg.locator(".toast-wrap button", has_text="Geri al").first.click(); pg.wait_for_timeout(80)
    check(pg.evaluate("state.exerciseHistory['deneme pres'][1].sets[0].kg") == 70, "Geri al eski değere döndü")
    # set sil + kardiyo düzelt
    pg.evaluate(f"openEditLog({li})"); pg.wait_for_timeout(50)
    pg.fill("[data-el-in='1-0-min']", "25")
    pg.evaluate("elRemoveSet(0, 1)"); pg.wait_for_timeout(40)
    check(pg.locator("#editLogModal [data-el-set]").count() == 2, "set silindi (taslakta)")
    check(pg.input_value("[data-el-in='1-0-min']") == "25", "silme sırasında yazılan değer kaybolmadı")
    pg.click("#elSave"); pg.wait_for_timeout(80)
    lg = pg.evaluate("state.workoutLogs.find(l => l.id === 'wB')")
    check(lg["sets"] == 2 and lg["cardioMin"] == 25 and lg["volume"] == 560, f"set silme ve kardiyo düzeltme kaydedildi ({lg['sets']}, {lg['cardioMin']}, {lg['volume']})")
    # geçersiz değer
    pg.evaluate(f"openEditLog({li})"); pg.wait_for_timeout(50)
    pg.fill("[data-el-in='0-0-kg']", "abc"); pg.click("#elSave"); pg.wait_for_timeout(80)
    check(pg.locator("#uiDlgOk").is_visible() and pg.evaluate("state.exerciseHistory['deneme pres'][1].sets[0].kg") == 70, "geçersiz kilo kaydedilmez, uyarı")
    answer(pg); pg.evaluate("closeModal('editLogModal')")
    # eski kayıt (logId yok)
    oi = pg.evaluate("state.workoutLogs.findIndex(l => l.dayName === 'Eski kayıt')")
    pg.evaluate(f"openEditLog({oi})"); pg.wait_for_timeout(50)
    check(pg.locator("#elSave").is_disabled(), "ayrıntısız eski kayıtta Kaydet kapalı")
    pg.evaluate("closeModal('editLogModal')")
    r = pg.evaluate("() => { flushSave(); const p = stateParts(state); return FAST_PARTS.filter(k => p[k] !== storeLast[k]); }")
    check(r == [], f"düzeltme sonrası işaretsiz kalan büyük parça yok ({r})")
    pg.wait_for_timeout(2600)
    st = stored(pg)
    check(st["exerciseHistory"]["deneme pres"][1]["sets"] == [{"kg": 70, "reps": 8}] and [l for l in st["workoutLogs"] if l.get("id") == "wB"][0]["sets"] == 2, "düzeltme kalıcı kayıtta")

    # ===== 3) Kendi makro hedefim =====
    pg.evaluate("openProfile()"); pg.wait_for_timeout(80)
    calc = pg.evaluate("getTargets().calTarget")
    pg.check("#manOn"); pg.wait_for_timeout(50)
    check(pg.locator("#manBox").is_visible() and pg.evaluate("getTargets().calTarget") == calc, "anahtar açık, değer yokken hesaplanan hedef sürer")
    pg.fill("#manKcal", "2000"); pg.locator("#manKcal").dispatch_event("change")
    pg.fill("#manP", "150"); pg.locator("#manP").dispatch_event("change"); pg.wait_for_timeout(50)
    tg = pg.evaluate("getTargets()")
    check(tg["manual"] and tg["calTarget"] == 2000 and tg["proTarget"] == 150, "elle hedef uygulandı (2000 kcal, 150 g)")
    check(tg["fatTarget"] == round(2000 * .25 / 9) and tg["carbTarget"] == round((2000 - 600 - tg["fatTarget"] * 9) / 4), "karb/yağ boşken otomatik")
    pg.evaluate("state.dayType = state.dayType === 'train' ? 'rest' : 'train'")
    check(pg.evaluate("getTargets().calTarget") == 2000, "iki gün tipinde aynı")
    pg.fill("#manC", "200"); pg.locator("#manC").dispatch_event("change"); pg.fill("#manF", "70"); pg.locator("#manF").dispatch_event("change"); pg.wait_for_timeout(50)
    tg = pg.evaluate("getTargets()")
    check(tg["carbTarget"] == 200 and tg["fatTarget"] == 70, "karb/yağ elle")
    check("2.000" in pg.inner_text("#manNote") and "2.000" in pg.inner_text("#pfTargetsBox"), "not ve hedef kutusu yeni hedefi gösteriyor")
    pg.fill("#manKcal", "100"); pg.locator("#manKcal").dispatch_event("change"); pg.wait_for_timeout(50)
    check(pg.evaluate("state.settings.manualTarget.kcal") == 2000, "aralık dışı kalori yazılmaz")
    pg.evaluate("state.settings.calAdjust = 150; renderAll()")
    check(pg.evaluate("getTargets().calTarget") == 2000, "koç düzeltmesi elle hedefi değiştirmez")
    pg.evaluate("closeProfile()")
    pg.wait_for_timeout(2600); pg.reload(); boot(pg)
    check(pg.evaluate("state.settings.manualTarget") == {"on": True, "kcal": 2000, "p": 150, "c": 200, "f": 70}, "elle hedef kalıcı")
    pg.evaluate("openProfile()"); pg.wait_for_timeout(50)
    check(pg.is_checked("#manOn") and pg.input_value("#manKcal") == "2000", "Profil yeniden açılınca alanlar dolu")
    pg.uncheck("#manOn"); pg.wait_for_timeout(50)
    check(not pg.evaluate("getTargets().manual") and pg.evaluate("state.settings.manualTarget.kcal") == 2000, "kapatınca hesaplanan hedefe dönülür, değerler saklı")
    pg.evaluate("closeProfile(); state.settings.calAdjust = 0")
    # bozuk / eski kayıt
    r = pg.evaluate("[normManualTarget(undefined), normManualTarget('x'), normManualTarget({ on: true, kcal: '1800', p: -5, c: 'a', f: 9999 })]")
    check(r[0] == {"on": False, "kcal": 0, "p": 0, "c": 0, "f": 0} and r[1]["on"] is False, "eski/bozuk kayıt: kapalı")
    check(r[2] == {"on": True, "kcal": 1800, "p": 0, "c": 0, "f": 0}, "aralık dışı alanlar 0 (uydurulmaz)")
    check(pg.evaluate("state.settings.manualTarget = normManualTarget({ on: true, kcal: 1800 }); !!getTargets().manual") is False, "protein yokken elle hedef uygulanmaz")

    # ===== 5) Dışarıda yedim tek dokunuş =====
    pg.evaluate("state.settings.manualTarget = normManualTarget(null); state.activeTab = 'nutrition'; state.nutriView = 'today'; renderAll()")
    meals = pg.evaluate("dayMeals().map(m => m.done)")
    check(len(meals) > 1 and pg.locator("[data-quick-free]").is_visible(), "Bugün'de Dışarıda yedim düğmesi")
    pg.click("[data-quick-free]"); pg.wait_for_timeout(60)
    nxt = meals.index(False) if False in meals else len(meals) - 1
    check(pg.locator("#freeMealModal").is_visible() and pg.input_value("#fmMealSel") == str(nxt), "pencere sıradaki öğünle açıldı")
    pg.select_option("#fmMealSel", str(len(meals) - 1)); pg.wait_for_timeout(30)
    pg.fill("#fmKcal", "700"); pg.fill("#fmP", "35"); pg.evaluate("saveFreeMeal()"); pg.wait_for_timeout(80)
    last = pg.evaluate("dayMeals()[dayMeals().length - 1]")
    check(last["done"] and any(i.get("est", {}).get("cal") == 700 for i in last["items"]), "seçilen öğüne tahmini girildi")
    check(pg.evaluate("curMeals()[curMeals().length - 1].items.some(i => i.est)") is False, "menü değişmedi")
    pg.locator(".toast-wrap button", has_text="Geri al").first.click(); pg.wait_for_timeout(60)

    # ===== 9) Tarif: tamamı / yarısı / yediğim miktar =====
    pg.evaluate("""() => { state.customFoods['custom_recipe_t85'] = { name: '🍲 Deneme yemeği', cat: '🍲 Tariflerim', unit: 'g', step: 10, def: 250,
      p: 0.1, c: 0.2, f: 0.05, kcal: 1.6, recipe: { items: [], cooked: 640 } }; invalidateFoodDB(); state.nutriView = 'foods'; renderAll(); selectFood('custom_recipe_t85'); }""")
    pr = pg.evaluate("foodPresets(getFoodDB()['custom_recipe_t85']).list.map(x => x.v)")
    check(pr[:3] == [640, 320, 160] and 250 in pr and 100 in pr, f"tarifte Tamamı/Yarısı/Çeyreği ({pr})")
    check(pg.locator("[data-recipe-hint]").is_visible() and "640" in pg.inner_text("[data-recipe-hint]"), "kartta tencerenin tamamı yazıyor")
    pg.click("[data-preset='320']"); pg.wait_for_timeout(40)
    check(pg.evaluate("foodUI.amt") == 320, "Yarısı seçilince 320 g")
    pg.evaluate("openRecipeModal()"); pg.wait_for_timeout(50)
    pg.evaluate("rcp.items = [{ foodId: Object.keys(getFoodDB()).find(id => getFoodDB()[id].unit === 'g' && kcalPerUnit(getFoodDB()[id]) > 1), amount: 500 }]; renderRecipe()")
    check(not pg.locator("#rcEatBox").is_visible(), "pişmiş ağırlık yokken hesaplayıcı gizli")
    pg.fill("#rcCooked", "640"); pg.wait_for_timeout(30)
    check(pg.locator("#rcEatBox").is_visible(), "pişmiş ağırlık girilince 'Ben ne kadar yedim?' görünür")
    pg.fill("#rcEat", "160"); pg.wait_for_timeout(30)
    want = pg.evaluate("Math.round(recipeTotals().cal * 160 / 640)")
    out = pg.inner_text("#rcEatOut")
    check("%25" in out and f"{want:,}".replace(",", ".") in out, f"yenen miktarın kalorisi ({want} kcal, %25)")
    pg.evaluate("closeModal('recipeModal'); delete state.customFoods['custom_recipe_t85']; invalidateFoodDB(); foodUI.sel = null")

    # ===== 7) Geçmiş güne yediğini ekle =====
    y = pg.evaluate("dateKeyOffset(-1)")
    pg.evaluate("""k => { state.dailyLogs[k] = { kcal: 2000, p: 150, c: 200, f: 60, eatenKcal: 1800, eatenP: 140, mealsDone: 3, mealsTotal: 4, calTarget: 2200, proTarget: 160, dayType: 'train' };
      state.nutriView = 'history'; renderAll(); }""", y)
    check(pg.locator(f"[data-pd-open='{y}']").is_visible(), "Geçmiş kartında 'Yediğini ekle'")
    check(pg.locator("[data-history-day]").first.locator("[data-pd-open]").count() == 0, "bugünün kartında yok")
    pg.click(f"[data-pd-open='{y}']"); pg.wait_for_timeout(60)
    check(pg.locator("#pastFoodModal").is_visible(), "pencere açıldı")
    pg.fill("#pdName", "Lahmacun"); pg.fill("#pdKcal", "500"); pg.fill("#pdP", "20"); pg.fill("#pdC", "60")
    pg.evaluate("pdAddEst()"); pg.wait_for_timeout(60)
    d = pg.evaluate("k => state.dailyLogs[k]", y)
    check(d["kcal"] == 2500 and d["eatenKcal"] == 2300 and d["eatenP"] == 160 and d["p"] == 170 and d["c"] == 260, "tahmini giriş plana ve yenene eklendi")
    check(d["added"] == [{"n": "Lahmacun", "k": 500, "p": 20, "c": 60, "f": 0}], "girdi kaydedildi")
    check(pg.evaluate("k => logIntake(state.dailyLogs[k]).k", y) == 2300, "haftalık hesap (logIntake) yeni değeri görüyor")
    fid = pg.evaluate("Object.keys(getFoodDB()).find(id => { const f = getFoodDB()[id]; return f.unit === 'g' && !isHiddenFood(f) && kcalPerUnit(f) > 0.5; })")
    pg.evaluate("id => { pdUI.sel = id; pdUI.amt = 150; renderPastDay(); }", fid)
    exp = pg.evaluate("id => calcItemMacros({ foodId: id, amount: 150 })", fid)
    pg.evaluate("pdAddFood()"); pg.wait_for_timeout(60)
    d = pg.evaluate("k => state.dailyLogs[k]", y)
    check(len(d["added"]) == 2 and d["added"][1]["id"] == fid and d["added"][1]["a"] == 150 and d["eatenKcal"] == 2300 + round(exp["cal"]), "besin + miktar eklendi")
    check(pg.locator("#pdList [data-pd-item]").count() == 2 and "2 kayıt" in pg.inner_text(f"[data-history-day='{y}'] [data-pd-note]"), "pencerede ve kartta listeleniyor")
    pg.click("#pdList [data-pd-item='0'] button"); pg.wait_for_timeout(60)
    d = pg.evaluate("k => state.dailyLogs[k]", y)
    check(len(d["added"]) == 1 and d["eatenKcal"] == 1800 + round(exp["cal"]) and d["kcal"] == 2000 + round(exp["cal"]), "silinince aynı miktar düşüldü")
    pg.locator(".toast-wrap button", has_text="Geri al").first.click(); pg.wait_for_timeout(80)
    check(pg.evaluate("k => state.dailyLogs[k].added.length", y) == 2 and pg.locator("#pdList [data-pd-item]").count() == 2, "Geri al: kayıt ve pencere geri geldi")
    r = pg.evaluate("""k => { const d = state.dailyLogs[k], b = { p: d.p, e: d.eatenP }; pdPush({ n: 'x', k: 10, p: 12.5, c: 0.3, f: 0.1 }); pdRemove(d.added.length - 1); return [b.p, d.p, b.e, d.eatenP]; }""", y)
    check(r[0] == r[1] and r[2] == r[3], f"ekle-sil sonrası gramlar kaymıyor ({r})")
    # imza denetimi: arayüz akışlarından sonra normal kayıt, tam karşılaştırmanın bulacağı farkı bırakmıyor
    r = pg.evaluate("() => { flushSave(); const p = stateParts(state); return FAST_PARTS.filter(k => p[k] !== storeLast[k]); }")
    check(r == [], f"işaretsiz kalan büyük parça yok ({r})")
    pg.evaluate("closeModal('pastFoodModal')")
    # archiveDay aynı güne yeniden yazarsa eklenenler korunur (manual birleştirme dahil)
    r = pg.evaluate("""k => { const saveToday = state.today; state.dailyLogs[k].manual = true; const add = pdSum(state.dailyLogs[k].added);
      const before = { e: state.dailyLogs[k].eatenKcal };
      state.today = k; archiveDay(k); state.today = saveToday;
      const d = state.dailyLogs[k]; return { added: d.added.length, e: d.eatenKcal, kcal: d.kcal, addK: add.k, before: before.e, fresh: Math.round(nutritionTotals().cal) }; }""", y)
    check(r["added"] == 2 and r["e"] == r["before"] and r["kcal"] == r["fresh"] + r["addK"], f"arşiv yeniden yazınca eklenenler korunur, çift sayılmaz ({r})")
    pg.wait_for_timeout(2600); pg.reload(); boot(pg)
    check(pg.evaluate("k => state.dailyLogs[k].added.length", y) == 2, "eklenenler kalıcı")
    r = pg.evaluate("""() => normalizeState({ dailyLogs: { '2026-01-01': { kcal: 1, added: [null, 5, { n: 7, k: '300', p: 'x', id: 'u1', a: '50' }] }, '2026-01-02': { kcal: 1, added: 'bozuk' } } }).dailyLogs""")
    check(r["2026-01-01"]["added"] == [{"n": "7", "k": 300, "p": 0, "c": 0, "f": 0, "id": "u1", "a": 50}] and "added" not in r["2026-01-02"], "bozuk 'added' temizlenir")

    # ===== 11) Hızlı kayıt: imza + güvenlik ağı =====
    r = pg.evaluate("""() => {
      const D = 864e5, t0 = Date.now() - 5 * 365 * D;
      for (let i = 0; i < 1825; i++) state.dailyLogs[todayStr(new Date(t0 + i * D))] = { kcal: 2200, eatenKcal: 2100, p: 180, eatenP: 170, mealsDone: 5, mealsTotal: 5 };
      for (let e = 0; e < 25; e++) state.exerciseHistory['h' + e] = Array.from({ length: 260 }, (_, j) => ({ ts: t0 + j * 7 * D, name: 'H' + e, kind: 'weight', logId: 'l' + j, sets: [1, 2, 3, 4].map(k => ({ kg: 60 + k, reps: 8 })) }));
      for (let j = 0; j < 1040; j++) state.workoutLogs.push({ id: 'q' + j, ts: t0 + j * 1.7 * D, date: '1 Oca', dayName: 'Gün', sets: 20, volume: 9000 });
      renderAll(); flushSave(true);
      const time = f => { const a = performance.now(); for (let i = 0; i < 20; i++) f(); return (performance.now() - a) / 20; };
      const fast = time(() => { state.waterLiters += 0.01; flushSave(); });
      const full = time(() => { state.waterLiters += 0.01; flushSave(true); });
      return { fast, full };
    }""")
    print(f"     ölçüm: dokunuş kaydı {r['fast']:.2f} ms (tam karşılaştırma {r['full']:.2f} ms)")
    check(r["fast"] < r["full"] * 0.6, f"dokunuş kaydı hızlandı ({r['fast']:.2f} < {r['full']:.2f} ms)")
    pg.wait_for_timeout(2600)
    # imzanın göremediği değişiklik: eski bir seansın içi (işaret yok) → önce atlanır, 2 sn içinde yazılır
    pg.evaluate("state.exerciseHistory.h3[5].sets[0].kg = 999; state.waterLiters += 0.5; flushSave()")
    pg.wait_for_timeout(300)
    check(stored(pg)["exerciseHistory"]["h3"][5]["sets"][0]["kg"] == 61 and stored(pg)["waterLiters"] == pg.evaluate("state.waterLiters"), "dokunuşta küçük parça yazıldı, büyük parça atlandı")
    pg.wait_for_timeout(2300)
    check(stored(pg)["exerciseHistory"]["h3"][5]["sets"][0]["kg"] == 999, "güvenlik ağı: 2 sn içinde tam karşılaştırma yazdı")
    # arka plana geçerken (writeMirror) beklemeden yazılır
    pg.evaluate("state.dailyLogs[Object.keys(state.dailyLogs)[10]].kcal = 1234; state.waterLiters += 0.5; flushSave(); writeMirror()")
    pg.wait_for_timeout(150)
    k10 = pg.evaluate("Object.keys(state.dailyLogs)[10]")
    check(stored(pg)["dailyLogs"][k10]["kcal"] == 1234, "arka plana geçerken hemen tam yazıldı")
    check(json.loads(pg.evaluate("localStorage.getItem('ayk_plus_v5_state')"))["dailyLogs"][k10]["kcal"] == 1234, "ayna da güncel")
    # işaretli değişiklik beklemeden yazılır
    pg.evaluate("state.workoutLogs[3].volume = 4321; markPartDirty('workoutLogs'); flushSave()")
    pg.wait_for_timeout(150)
    check(stored(pg)["workoutLogs"][3]["volume"] == 4321, "markPartDirty: hemen yazıldı")
    # Geri al (state yeni nesne) hemen yazılır
    pg.evaluate("snapshot(); state.exerciseHistory.h1[2].sets[0].reps = 77; markPartDirty('exerciseHistory'); renderAll()")
    pg.wait_for_timeout(100)
    pg.evaluate("doUndo()"); pg.wait_for_timeout(150)
    check(stored(pg)["exerciseHistory"]["h1"][2]["sets"][0]["reps"] == 8, "Geri al sonrası eski hâl hemen yazıldı")
    pg.wait_for_timeout(2600); pg.reload(); boot(pg)
    check(pg.evaluate("state.exerciseHistory.h3[5].sets[0].kg") == 999 and pg.evaluate("state.workoutLogs[3].volume") == 4321, "yeniden açılışta hepsi yerinde")

    # İngilizce: yeni ekranlarda Türkçe kalmasın
    c2 = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, locale="en-US", service_workers="block")
    c2.add_init_script(TEST_INIT)
    p2 = c2.new_page(); p2.on("pageerror", lambda e: errs.append(str(e))); p2.goto(URL); boot(p2)
    p2.evaluate("setLang && setLang('en')"); p2.wait_for_timeout(60)
    p2.evaluate("""() => { state.exerciseHistory['x'] = [{ ts: Date.now() - 864e5, logId: 'wE', kind: 'weight', name: 'Bench Press', sets: [{ kg: 50, reps: 5 }] }];
      state.workoutLogs.push({ id: 'wE', ts: Date.now() - 864e5, date: 'x', dayName: 'Day', sets: 1, volume: 250 });
      state.activeTab = 'gym'; state.gymView = 'history'; renderAll(); openEditLog(state.workoutLogs.length - 1); }""")
    p2.wait_for_timeout(60)
    txt = p2.inner_text("#editLogModal")
    check("Fix workout" in txt and "düzelt" not in txt.lower(), "İngilizce: düzelt penceresi")
    p2.evaluate("closeModal('editLogModal'); state.dailyLogs[dateKeyOffset(-1)] = { kcal: 1500, eatenKcal: 1500, eatenP: 90, mealsDone: 2 }; state.activeTab = 'nutrition'; state.nutriView = 'history'; renderAll(); openPastDay(dateKeyOffset(-1))")
    p2.wait_for_timeout(60)
    txt = p2.inner_text("#pastFoodModal")
    check("Add what you ate" in txt and "Yediğini" not in txt and "TAHMİNİ" not in txt, "İngilizce: geçmiş güne ekle penceresi")
    c2.close()
    c.close(); b.close()
finally:
  srv.terminate()
if errs: print("SAYFA HATALARI:", errs[:5])
print(f"\n{'BAŞARISIZ: ' + str(len(fails)) if fails or errs else 'HEPSİ GEÇTİ'}")
sys.exit(1 if fails or errs else 0)
