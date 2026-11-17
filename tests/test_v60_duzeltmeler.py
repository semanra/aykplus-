# v60: dış inceleme (Gemini) düzeltmeleri.
# 1) Plaka aracı: setlerde kilo yoksa geçmişteki son çalışma kilosu (eskiden 0 → "bardan hafif")
# 2) Hareket ekle: daha önce yapılmış harekette "Başlangıç kg" geçmişteki son kiloyla dolar (imperial'de kayıt kaymaz)
# 3) Makine kademesi sorusu yalnızca sıradaki (ya da başlanmış) harekette
# 4) Koç: aynı güne düşen birden fazla tartı tek nokta sayılır
# 5) Beslenme: birim yazısı ("porsiyon") dar kutuda kesilmez
# 6) Profil → Kilom: son 4 tartı listesi yerine "Tüm tartı geçmişi" → İlerleme / Kilo
# 7) Ayar arama vurgusu: sert çizgi yok, yumuşak zemin
# 8) Hakkında → kaynaklar tıklanabilir bağlantı; Whittaker ve Wu konusu düzeltildi
# 9) Depolama: profil fotoğrafı ayrı parça; eski depo (fotoğraf core içinde) kayıpsız geçer; dokunuşta fotoğraf yeniden yazılmaz
import os, sys, subprocess, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOTS = os.path.join(REPO, "tests", "shots"); os.makedirs(SHOTS, exist_ok=True)
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8817'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = "http://localhost:8817/index.html"
DAY = 86400000
def st(pg): return pg.evaluate("aykStoredState()")
def boot(pg): pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(80)
PHOTO = "data:image/jpeg;base64," + "QUJD" * 20000   # ~80 bin karakter
try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    def ctx(pf_flat=True):
        c = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, locale="tr-TR")
        c.add_init_script(TEST_INIT)
        if not pf_flat: c.add_init_script("window.AYK_PF_FLAT = false;")
        pg = c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e))); pg.goto(URL); boot(pg)
        return c, pg
    c, pg = ctx()

    # --- 1) Plaka aracı
    pg.evaluate("""() => { const now = Date.now();
      state.exerciseHistory[exKey('Bench Press')] = [
        {ts: now - 9 * DAY_MS, logId: 'x1', kind: 'weight', name: 'Bench Press', sets: [{kg: 90, reps: 8}]},
        {ts: now - 3 * DAY_MS, logId: 'x2', kind: 'weight', name: 'Bench Press', sets: [{kg: 100, reps: 8}, {kg: 102.5, reps: 6}]}];
      const d = activeDay(); d.exercises.unshift({name: 'Bench Press', kind: 'weight', targetInfo: '3x8–12', note: '', sets: makeWeightSets(3, '8–12', 0, 10)});
      state.activeTab = 'gym'; renderAll(); }""")
    check(pg.evaluate("lastWorkKg('Bench Press')") == 102.5, "lastWorkKg: en son seansın en büyük kilosu (102,5)")
    check(pg.evaluate("lastWorkKg('Yok Böyle Hareket')") == 0, "lastWorkKg: geçmiş yoksa 0")
    pg.evaluate("openPlateTool(0)"); pg.wait_for_timeout(120)
    check(pg.input_value("#ptKg") == "102,5" and "hafif" not in pg.inner_text("#ptOut"), "plaka aracı 0 yerine geçmişteki 102,5 kg ile açılır: " + pg.input_value("#ptKg"))
    pg.evaluate("closeModal('chartModal')")
    pg.evaluate("activeDay().exercises[0].sets[0].kg = 60; renderAll(); openPlateTool(0)"); pg.wait_for_timeout(100)
    check(pg.input_value("#ptKg") == "60", "sette kilo varsa o kullanılır (60)")
    pg.evaluate("closeModal('chartModal')")

    # --- 2) Hareket ekle: başlangıç kilosu geçmişten
    pg.evaluate("openExerciseModal({name: 'Bench Press', kind: 'weight'})"); pg.wait_for_timeout(100)
    check(pg.input_value("#exStartKg") == "102,5", "Hareket Ekle: Başlangıç kg geçmişteki son kilo (102,5)")
    pg.click("#exerciseModal >> text=Kaydet"); pg.wait_for_timeout(150)
    ex = st(pg)["workoutDays"][0]["exercises"][-1]
    check(ex["name"] == "Bench Press" and all(s["kg"] == 102.5 for s in ex["sets"]), "eklenen hareketin setleri 102,5 kg")
    pg.evaluate("openExerciseModal({name: 'Hiç Yapılmamış Hareket', kind: 'weight'})"); pg.wait_for_timeout(80)
    check(pg.input_value("#exStartKg") == "0", "geçmiş yoksa Başlangıç kg 0 kalır")
    pg.evaluate("closeModal('exerciseModal')")
    pg.evaluate("setUnits('imperial')"); pg.wait_for_timeout(80)
    pg.evaluate("openExerciseModal({name: 'Bench Press', kind: 'weight'})"); pg.wait_for_timeout(80)
    shown = pg.input_value("#exStartKg")
    pg.click("#exerciseModal >> text=Kaydet"); pg.wait_for_timeout(150)
    ex = st(pg)["workoutDays"][0]["exercises"][-1]
    check(all(s["kg"] == 102.5 for s in ex["sets"]), "imperial: gösterilen lb (%s) aynen kaydedilince kayıt 102,5 kg kalır: %s" % (shown, [s["kg"] for s in ex["sets"]]))
    pg.evaluate("setUnits('metric')"); pg.wait_for_timeout(80)

    # --- 3) Makine kademesi sorusu yalnızca sıradaki harekette
    pg.evaluate("""() => { const now = Date.now();
      state.exerciseHistory[exKey('Lat Pulldown')] = [
        {ts: now - 9 * DAY_MS, logId: 'l1', kind: 'weight', name: 'Lat Pulldown', sets: [{kg: 20, reps: 12}]},
        {ts: now - 6 * DAY_MS, logId: 'l2', kind: 'weight', name: 'Lat Pulldown', sets: [{kg: 27.5, reps: 10}]},
        {ts: now - 3 * DAY_MS, logId: 'l3', kind: 'weight', name: 'Lat Pulldown', sets: [{kg: 35, reps: 8}]}];
      const d = activeDay();
      d.exercises = [{name: 'Bench Press', kind: 'weight', targetInfo: '2x8', note: '', sets: makeWeightSets(2, '8', 60, 8)},
                     {name: 'Lat Pulldown', kind: 'weight', equip: 'stack', targetInfo: '2x8', note: '', sets: makeWeightSets(2, '8', 35, 8)}];
      state.gymActive = true; renderAll(); }""")
    check(pg.evaluate("!!inferLevels(activeDay().exercises[1])"), "Lat Pulldown kademesi geçmişten çıkarılabiliyor")
    check(pg.locator("#exCard_1", has_text="arayla mı gidiyor").count() == 0, "sıradaki hareket değilken kademe sorusu görünmez")
    pg.evaluate("activeDay().exercises[0].sets.forEach(s => s.done = true); renderAll()")
    check(pg.locator("#exCard_1", has_text="arayla mı gidiyor").count() == 1, "sırası gelince kademe sorusu görünür")
    pg.evaluate("activeDay().exercises[0].sets[0].done = false; activeDay().exercises[1].sets[0].done = true; renderAll()")
    check(pg.locator("#exCard_1", has_text="arayla mı gidiyor").count() == 1, "başlanmış harekette (bir seti tamam) soru görünmeye devam eder")
    pg.evaluate("state.gymActive = false; state.activeTab = 'nutrition'; renderAll()")

    # --- 4) Koç: aynı gün çift tartı tek nokta
    res = pg.evaluate("""() => { const now = Date.now(), keep = state.weightLogs;
      const L = []; for (let i = 0; i < 4; i++) { const ts = now - (20 - i * 6) * DAY_MS; L.push({date: '', weight: 90 - i, ts}); L.push({date: '', weight: 95, ts: ts - 3600000}); }
      state.weightLogs = L; const r = coachAnalysis(); state.weightLogs = keep; return r; }""")
    check(res["n"] == 4 and res.get("ready"), "koç: 8 tartı / 4 gün → 4 nokta (n=%s, ready=%s)" % (res["n"], res.get("ready")))
    check(abs(res.get("weekly", 0) - (-7 / 6)) < 0.01, "koç: eğim yalnız günün son tartılarından (haftalık %.3f, beklenen -1,167)" % res.get("weekly", 0))

    # --- 5) Birim yazısı kesilmez
    pg.evaluate("""() => { setNutriView('menus'); curMeals()[0].items.push({foodId: 'tr_kuru_fasulye', amount: 1}); renderAll(); }""")
    def unit_spans():
        return pg.evaluate("""[...document.querySelectorAll('span.max-w-\\\\[76px\\\\]')].filter(e => e.offsetParent && e.textContent.trim() === 'porsiyon').map(e => [e.scrollWidth, e.clientWidth])""")
    sp = unit_spans()
    if not sp: pg.evaluate("toggleMenuMeal(0)"); pg.wait_for_timeout(80); sp = unit_spans()
    check(len(sp) >= 1 and all(a <= b for a, b in sp), "Menülerim: 'porsiyon' yazısı kesilmeden sığar: %s" % sp)
    pg.evaluate("[...document.querySelectorAll('span')].find(e => e.offsetParent && e.textContent.trim() === 'porsiyon').scrollIntoView({block: 'center'})"); pg.wait_for_timeout(80)
    pg.screenshot(path=os.path.join(SHOTS, "v60_birim_porsiyon.png"))
    check(pg.evaluate("document.documentElement.scrollWidth <= innerWidth"), "Menülerim: yatay taşma yok")
    c.close()

    # --- 6) ve 7) Profil (gerçek düzen)
    c, pg = ctx(pf_flat=False)
    pg.evaluate("openProfile('body')"); pg.wait_for_timeout(150)
    box = pg.inner_text("#pfWeightBox")
    check(pg.is_visible("[data-pf-weight-hist]") and "Tüm tartı geçmişi" in box, "Kilom: 'Tüm tartı geçmişi' bağlantısı")
    h = pg.evaluate("$('pfWeightBox').querySelector('[data-pf-weight-hist]').getBoundingClientRect().height")
    check(h >= 44, "bağlantı dokunma alanı ≥ 44 px (%s)" % h)
    pg.screenshot(path=os.path.join(SHOTS, "v60_kilom.png"))
    pg.click("[data-pf-weight-hist]"); pg.wait_for_timeout(200)
    check(not pg.is_visible("#profilePage") and pg.evaluate("state.activeTab") == "progress" and pg.evaluate("state.progressView") == "kilo", "bağlantı: Profil kapanır, İlerleme → Kilo açılır")
    pg.evaluate("openProfile()"); pg.wait_for_timeout(150)
    pg.fill("#pfSearch", "güncel kilo"); pg.wait_for_timeout(150)
    pg.locator("[data-pf-hit]").first.click(); pg.wait_for_timeout(250)
    fl = pg.evaluate("""() => { const e = document.querySelector('.pf-flash'); if (!e) return null; const cs = getComputedStyle(e); return [cs.animationName, cs.borderRadius]; }""")
    check(fl is not None and fl[0] == "pfFlash", "arama sonucu satırı vurgulanıyor: %s" % fl)
    css = pg.evaluate("[...document.styleSheets].flatMap(s => { try { return [...s.cssRules]; } catch (e) { return []; } }).filter(r => r.name === 'pfFlash').map(r => r.cssText).join(' ')")
    check("2px" not in css and "rgba" in css, "vurgu sert 2 px çizgi değil, yumuşak zemin: " + css[:160])
    pg.wait_for_timeout(500); pg.screenshot(path=os.path.join(SHOTS, "v60_arama_vurgu.png"))

    # --- 8) Kaynak bağlantıları
    pg.evaluate("pfOpen('about')"); pg.wait_for_timeout(150)
    links = pg.evaluate("[...document.querySelectorAll('#pfMethodBody a[data-method-link]')].map(a => [a.textContent, a.getAttribute('href'), a.target, a.rel])")
    check(len(links) == 9 and all(l[1].startswith("https://") and l[2] == "_blank" and "noopener" in l[3] for l in links), "Hakkında: 9 kaynak tıklanabilir, yeni sekmede: %d" % len(links))
    check(any("pubmed.ncbi.nlm.nih.gov/2305711" in l[1] and "Mifflin" in l[0] for l in links), "Mifflin → PubMed 2305711")
    check(any("Whittaker ve Wu 2021 (az yağlı beslenme ve testosteron)" == l[0] for l in links), "Whittaker ve Wu konusu düzeltildi")
    check(pg.evaluate("[...document.querySelectorAll('#pfMethodBody li')].some(li => li.textContent.startsWith('Katch-McArdle') && !li.querySelector('a'))"), "Katch-McArdle bağlantısız kalır (tek makale yok)")
    pg.evaluate("setLang('en')"); pg.wait_for_timeout(150); pg.evaluate("openProfile('about')"); pg.wait_for_timeout(150)
    en = pg.evaluate("[...document.querySelectorAll('#pfMethodBody a[data-method-link]')].map(a => a.textContent)")
    check("Whittaker and Wu 2021 (low-fat diets and testosterone)" in en and len(en) == 9, "İngilizce: kaynaklar çevrilmiş ve bağlantılı")
    c.close()

    # --- 9) Depolama: fotoğraf ayrı parça
    c, pg = ctx()
    pg.evaluate(f"state.customIconDataUrl = {PHOTO!r}; renderAll()"); pg.wait_for_timeout(200)
    parts = pg.evaluate("idbGetAll('parts')")
    check("customIconDataUrl" in parts and "customIconDataUrl" not in __import__("json").loads(parts["core"]), "fotoğraf ayrı parçada, core'da değil")
    check(len(parts["core"]) < 60000, "core küçük kaldı (%d karakter)" % len(parts["core"]))
    pg.evaluate("() => { window.__puts = []; const o = idbWrite; window.idbWrite = (puts, dels) => { window.__puts.push(puts.map(x => x[1])); return o(puts, dels); }; }")
    pg.evaluate("state.settings.restSec = 95; renderAll()"); pg.wait_for_timeout(200)
    keys = pg.evaluate("window.__puts")
    check(keys and all("customIconDataUrl" not in k for k in keys) and any("core" in k for k in keys), "ayar değişince yalnız core yazılır, fotoğraf yazılmaz: %s" % keys)
    # Eski depo: fotoğraf core içinde, ayrı parça yok
    pg.evaluate("""async () => { writeMirror(true); const p = await idbGetAll('parts'); const core = JSON.parse(p.core);
      core.customIconDataUrl = JSON.parse(p.customIconDataUrl);
      await idbWrite([['parts', 'core', JSON.stringify(core)]], [['parts', 'customIconDataUrl']]); }""")
    pg.reload(); boot(pg)
    check(pg.evaluate("state.customIconDataUrl") == PHOTO, "eski depo: fotoğraf core'dan okunur")
    check(pg.evaluate("storeMode") == "idb", "eski depo IndexedDB modunda açıldı")
    pg.evaluate("state.settings.restSec = 100; renderAll()"); pg.wait_for_timeout(250)
    parts = pg.evaluate("idbGetAll('parts')")
    import json as _j
    check(_j.loads(parts.get("customIconDataUrl") or "null") == PHOTO and "customIconDataUrl" not in _j.loads(parts["core"]), "ilk kayıtta fotoğraf parçası ve core birlikte yazıldı")
    pg.reload(); boot(pg)
    check(pg.evaluate("state.customIconDataUrl") == PHOTO and pg.evaluate("state.settings.restSec") == 100, "yeniden açılışta fotoğraf ve ayar yerinde (kayıp yok)")
    check(st(pg)["customIconDataUrl"] == PHOTO, "aykStoredState fotoğrafı içeriyor")
    # Fotoğraf silinince parça null olur, açılışta boş
    pg.evaluate("state.customIconDataUrl = ''; renderAll()"); pg.wait_for_timeout(200)
    pg.reload(); boot(pg)
    check(pg.evaluate("state.customIconDataUrl") == "", "fotoğraf kaldırılınca açılışta boş")
    c.close()
    check(errs == [], "sayfa hatası yok: " + str(errs[:3]))
    b.close()
finally:
    srv.terminate()
print("BAŞARISIZ:" if fails else "TÜMÜ GEÇTİ", fails)
sys.exit(1 if (fails or errs) else 0)
