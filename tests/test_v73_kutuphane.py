# v73: hareket kütüphanesi — kas grubu bölümleri, ekipman süzgeci, favoriler, son yapılanlar, gruplu arama
# 1) ekipman sınıflaması (örnekler)   2) Hareketler ekranı: çipler, bölümler, süzgeç, yıldız, son yapılanlar, özel hareket
# 3) "Kütüphaneden ekle" penceresi: favori/son grupları, ekipman çipleri, yıldız, aramada tekrar yok
# 4) kayıt: favExercises temizliği, yeniden açılışta kalır, ad değişikliğinde taşınır   5) İngilizce
import os, sys, subprocess, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PORT = 8829
fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)

EQ = {
    "Barbell Bench Press": ["bar"], "Flat Dumbbell Bench Press": ["dumbbell"], "Machine Chest Press (Flat)": ["machine"],
    "Cable Fly (Mid-Pulley)": ["cable"], "Pull-up (Geniş Tutuş Barfiks)": ["body"], "Smith Machine Squat": ["machine"],
    "Dumbbell / Cable Lat Pullover": ["dumbbell", "cable"], "Kettlebell Swing": ["dumbbell"], "Plank / RKC Plank": ["body"],
    "Leg Press (45 Derece)": ["machine"], "Lat Pulldown (Wide Grip / Geniş Tutuş)": ["cable"], "Treadmill Run (Koşu Bandı)": [],
    "Preacher Curl (EZ-Bar / Makine)": ["bar", "machine"], "Banded Dorsiflexion (Kaval)": ["body"], "Cable Hip Adduction (İç Bacak)": ["cable"],
}

srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT)], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
URL = f"http://localhost:{PORT}/index.html"
errs = []
LIB = "() => { state.activeTab = 'gym'; state.gymView = 'library'; state.libMuscle = null; renderAll(); }"
ROWS = "() => [...document.querySelectorAll('#libList [data-lib-row] .text-\\\\[15px\\\\]')].map(e => e.textContent)"
HEADS = "() => [...document.querySelectorAll('#libList .t-label')].map(e => e.textContent)"
try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    def ctx(locale="tr-TR"):
        c = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, locale=locale, service_workers="block")
        c.add_init_script(TEST_INIT)
        pg = c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(URL); pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(80)
        return c, pg
    c, pg = ctx()
    # 1) ekipman
    got = pg.evaluate("names => names.map(n => libEquipsOf(n))", list(EQ))
    for (n, exp), g in zip(EQ.items(), got):
        check(g == exp, f"1: {n} → {exp} ({g})")
    every = pg.evaluate("() => libAllNames().filter(n => detectKind(n) !== 'cardio' && !libEquipsOf(n).length)")
    check(every == [], f"1: kardiyo dışı her hareketin en az bir ekipmanı var {every}")
    # 2) Hareketler ekranı
    pg.evaluate("() => { state.exerciseHistory = {}; state.favExercises = []; }"); pg.evaluate(LIB); pg.wait_for_timeout(200)
    check(pg.locator("[data-lib-cat='all'][aria-pressed='true']").count() == 1, "2a: favori ve geçmiş yokken Tümü açık")
    heads = pg.evaluate(HEADS)
    check(heads[:3] == ["Göğüs", "Sırt", "Omuz"], f"2b: Tümü kas grubu bölümleriyle {heads}")
    n_all = pg.evaluate("libAllNames().length")
    check(pg.get_attribute("#gymRoot input.t-search", "placeholder") == f"{n_all} hareket içinde ara", f"2c: arama kutusu gerçek sayıyı yazar ({n_all})")
    pg.evaluate("selectMuscle('Boyun')"); pg.wait_for_timeout(200)
    rows = pg.evaluate(ROWS)
    check(len(rows) == 3 and all("Neck" in r for r in rows), f"2d: Boyun bölümü 3 hareket {rows}")
    check(pg.locator("[data-lib-muscle='Boyun'][aria-pressed='true']").count() == 1, "2e: kas çipi seçili")
    pg.evaluate("setLibCat('cardio')"); pg.wait_for_timeout(200)
    rows = pg.evaluate(ROWS)
    check(len(rows) == 12 and pg.evaluate("state.libMuscle") is None, f"2f: Kardiyo çipi 12 hareket, kas seçimi kalkar ({len(rows)})")
    pg.evaluate("setLibCat('all')"); pg.evaluate("setLibEq('cable')"); pg.wait_for_timeout(150)
    names = pg.evaluate("() => [...document.querySelectorAll('#libList [data-lib-row] button[data-fav]')].map(b => b.getAttribute('onclick'))")
    ok = pg.evaluate("() => [...document.querySelectorAll('#libList [data-lib-row]')].every(r => { const m = r.querySelector('button[data-fav]').getAttribute('onclick').match(/libToggleFav\\((.*)\\)$/); return libEquipsOf(JSON.parse(m[1])).includes('cable'); })")
    check(ok and len(names) > 20, f"2g: Kablo süzgecinde yalnız kablolu hareketler ({len(names)})")
    pg.evaluate("setLibEq('all')")
    pg.evaluate("onLibSearch('curl')"); pg.wait_for_timeout(150)
    heads = pg.evaluate(HEADS)
    check("Biceps" in heads and "Ön Kol" in heads and "Arka Bacak & Kalça" in heads, f"2h: aramada sonuçlar kas başlıklarıyla {heads}")
    pg.evaluate("onLibSearch('boyun')"); pg.wait_for_timeout(150)
    check(len(pg.evaluate(ROWS)) == 3, "2i: kas adıyla arama (boyun)")
    pg.evaluate("onLibSearch('')")
    # yıldız
    pg.evaluate("() => { libSearchQ = ''; selectMuscle('Göğüs'); }"); pg.wait_for_timeout(200)
    pg.locator("#libList [data-lib-row] button[data-fav]").first.click(); pg.wait_for_timeout(150)
    fav = pg.evaluate("state.favExercises")
    check(fav == ["Barbell Bench Press"], f"2j: yıldız favoriye ekler {fav}")
    check(pg.locator("#libList [data-lib-row] button[data-fav]").first.get_attribute("aria-pressed") == "true", "2k: yıldız dolu (aria-pressed)")
    pg.evaluate("selectMuscle(null)"); pg.evaluate("() => { libCat = null; libRefresh(); }"); pg.wait_for_timeout(150)
    check(pg.locator("[data-lib-cat='fav'][aria-pressed='true']").count() == 1 and pg.evaluate(ROWS) == ["Barbell Bench Press"], "2l: favori varken açılışta Favoriler")
    pg.evaluate("setLibEq('cable')"); pg.wait_for_timeout(100)
    check("Bu ekipmanla favori hareket yok." in pg.inner_text("#libList"), "2m: favoride ekipman süzgeci boş mesajı")
    pg.evaluate("setLibEq('all')")
    # son yapılanlar + özel hareket
    pg.evaluate("""() => { const T = Date.now(); const add = (name, ago) => { state.exerciseHistory[exKey(name)] = [{ ts: T - ago * 864e5, logId: 'X', kind: 'weight', name, sets: [{ kg: 20, reps: 10 }] }]; };
      add('Seated Leg Curl', 3); add('Face Pull (Rope)', 1); add('Benim Özel Hareketim', 2);
      state.workoutDays[0].exercises.push({ name: 'Benim Özel Hareketim', kind: 'weight', muscle: 'Triceps', sets: [{ kg: 10, reps: 10, done: false }] });
      state.favExercises = []; libCat = null; renderAll(); }"""); pg.wait_for_timeout(200)
    check(pg.locator("[data-lib-cat='recent'][aria-pressed='true']").count() == 1, "2n: favori yok, geçmiş varken Son yapılanlar açık")
    check(pg.evaluate(ROWS) == ["Face Pull (Rope)", "Benim Özel Hareketim", "Seated Leg Curl"], f"2o: son yapılanlar en yeni önce {pg.evaluate(ROWS)}")
    pg.evaluate("selectMuscle('Triceps')"); pg.wait_for_timeout(200)
    check("Benim Özel Hareketim" in pg.evaluate(ROWS), "2p: özel hareket elle seçilen kasın bölümünde")
    pg.evaluate("selectMuscle(null)")
    # 3) seçici penceresi
    pg.evaluate("() => { state.favExercises = ['Hammer Curl (Dumbbell)']; state.gymView = 'today'; renderAll(); openExercisePicker(); }"); pg.wait_for_timeout(250)
    chips = pg.evaluate("() => [...document.querySelectorAll('#pickerChips button')].map(b => b.textContent)")
    check(chips[:4] == ["Tümü", "Favoriler", "Son yapılanlar", "Göğüs"], f"3a: seçici çipleri {chips[:6]}")
    check(pg.locator("#pickerEquip").is_visible() and pg.locator("#pickerEquip button").count() == 6, "3b: ekipman çipleri görünür (6)")
    heads = pg.evaluate("() => [...document.querySelectorAll('#pickerList > .text-\\\\[12px\\\\]')].map(e => e.textContent)")
    check(heads[:3] == ["Favoriler", "Son yapılanlar", "Göğüs"], f"3c: liste favori ve son grupları üstte {heads[:4]}")
    pg.fill("#pickerSearch", "hammer curl"); pg.wait_for_timeout(150)
    labels = pg.evaluate("() => [...document.querySelectorAll('#pickerList button[onclick^=pickerChoose] .text-sm')].map(e => e.textContent)")
    check(labels.count("Hammer Curl (Dumbbell)") == 1, f"3d: aramada favori grubu tekrar etmez {labels}")
    pg.fill("#pickerSearch", ""); pg.evaluate("renderPickerList()")
    pg.click("#pickerEquip [data-pick-eq='machine']"); pg.wait_for_timeout(150)
    ok = pg.evaluate("() => picker.flat.every(it => libEquipsOf(it.id).includes('machine')) && picker.flat.length > 20")
    check(ok, "3e: Makine süzgeci yalnız makine hareketleri")
    pg.click("#pickerEquip [data-pick-eq='all']")
    pg.evaluate("setPickerCat('k:fav')"); pg.wait_for_timeout(100)
    pg.locator("#pickerList button[data-fav]").first.click(); pg.wait_for_timeout(150)
    check(pg.evaluate("state.favExercises") == [] and pg.evaluate("picker.cat") == "all", "3f: favoriden çıkarınca grup kalkar, Tümü'ye döner")
    pg.locator("#pickerList button[data-fav]").first.click(); pg.wait_for_timeout(150)
    check(len(pg.evaluate("state.favExercises")) == 1 and pg.is_visible("#pickerModal"), "3g: seçicide yıldız favoriye ekler, pencere açık kalır")
    pg.locator("#pickerList button[onclick^=pickerChoose]").nth(2).click(); pg.wait_for_timeout(250)
    check(pg.is_visible("#exerciseModal"), "3h: hareket seçilince ekleme penceresi açılır")
    pg.evaluate("closeModal('exerciseModal')")
    # 4) kayıt
    pg.evaluate("() => { state.favExercises = ['Face Pull (Rope)', 'face pull (rope)', 5, '', null, '  Lat Pulldown (Wide Grip / Geniş Tutuş) ']; const s = normalizeState(JSON.parse(JSON.stringify(state))); window.__fx = s.favExercises; }")
    check(pg.evaluate("window.__fx") == ["Face Pull (Rope)", "Lat Pulldown (Wide Grip / Geniş Tutuş)"], f"4a: favExercises temizlenir {pg.evaluate('window.__fx')}")
    pg.evaluate("() => { state.favExercises = ['Face Pull (Rope)']; renderAll(); }"); pg.wait_for_timeout(2500)
    pg.reload(); pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(100)
    check(pg.evaluate("state.favExercises") == ["Face Pull (Rope)"], "4b: favoriler yeniden açılışta kalır")
    pg.evaluate("() => { const s = { workoutDays: [], exerciseHistory: {}, favExercises: ['Eski Ad'] }; renameExerciseData(s, 'Eski Ad', 'Yeni Ad'); window.__r = s.favExercises; }")
    check(pg.evaluate("window.__r") == ["Yeni Ad"], "4c: ad değişince favori taşınır")
    old = pg.evaluate("() => { const s = normalizeState(JSON.parse(JSON.stringify(state))); delete s.favExercises; return Array.isArray(normalizeState(s).favExercises); }")
    check(old, "4d: favExercises olmayan eski kayıt boş listeyle açılır")
    c.close()
    # 5) İngilizce
    c, pg = ctx("en-US")
    pg.evaluate("setLang('en')"); pg.evaluate(LIB); pg.wait_for_timeout(200)
    check(pg.get_attribute("#gymRoot input.t-search", "placeholder") == f"Search {n_all} exercises", "5a: İngilizce arama kutusu")
    txt = pg.inner_text("#libBrowse")
    check(all(w in txt for w in ("Favourites", "Recently done", "All equipment", "Barbell / Plates", "Cable", "Chest")), f"5b: İngilizce çipler ve başlıklar")
    c.close()
    b.close()
finally:
    srv.terminate()
check(errs == [], f"sayfa hatası yok: {errs}")
print(); print(f"{len(fails)} HATA" if fails else "hepsi geçti")
sys.exit(1 if fails else 0)
