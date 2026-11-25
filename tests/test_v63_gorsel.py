# v63: hareket görselleri (img/hareket/<no>.webp, eşleme src/app/30-gorsel.js EX_IMG)
# 1) Kütüphanedeki her antrenman ve mobilite hareketinin görseli var, dosyalar diskte, artık dosya yok
# 2) Antrenman: kartta küçük görsel (dokununca seçenekler), seçenekler penceresinde büyük görsel; özel harekette HİÇ yer yok
# 3) Kütüphane listesi, hareket seçici, mobilite detay / seans / ekleme listesinde görsel
# 4) Görsel yüklenemezse (çevrimdışı, önbellekte yok) sessizce kaldırılır; İngilizcede alt metni İngilizce ad
# 5) Service worker: görseller ayrı önbellekte (aykplus-gorsel-1), sürüm değişince silinmez
import os, sys, subprocess, time, json, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOTS = os.path.join(REPO, "tests", "shots"); os.makedirs(SHOTS, exist_ok=True)
PORT = 8820
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT)], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = f"http://localhost:{PORT}/index.html"
def boot(pg): pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(80)
IMG_DIR = os.path.join(REPO, "img", "hareket")
# Görünür ve yüklenmiş görseller (seçiciyle)
# (ekran dışındaki "loading=lazy" görseller kendiliğinden yüklenmez → testte hemen yüklet; en fazla 8 sn bekle)
LOADED = """sel => Promise.all([...document.querySelectorAll(sel)].map(i => { if (i.complete && i.naturalWidth) return i; i.loading = 'eager';
  return new Promise(r => { const t0 = Date.now(); (function w() { if ((i.complete && i.naturalWidth) || !i.isConnected || Date.now() - t0 > 8000) r(i); else setTimeout(w, 50); })(); }); }))
  .then(a => a.map(i => ({ ok: i.isConnected && i.naturalWidth === 1024 && i.naturalHeight === 576, alt: i.alt, src: i.getAttribute('src') })))"""
try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    def ctx(locale="tr-TR", sw="block"):
        c = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, locale=locale, service_workers=sw)
        c.add_init_script(TEST_INIT)
        pg = c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e))); pg.goto(URL); boot(pg)
        return c, pg
    c, pg = ctx()

    # --- 1) Eşleme ve dosyalar
    info = pg.evaluate("""() => {
      const ex = Object.values(EXERCISE_LIBRARY).flat().map(n => n.trim());
      const mob = [...Object.values(MOBILITY_LIBRARY).flat().map(o => o.name), ...MOB_LIB_V39.map(o => o.name)];
      return { exMiss: ex.filter(n => !exImgNo(n)), mobMiss: mob.filter(n => !exImgNo(n)), nums: [...new Set(Object.values(EX_IMG))],
               names: Object.keys(EX_IMG).length, ownKeys: activeDay().exercises.map(e => [e.name, exImgNo(e.name)]) };
    }""")
    check(info["exMiss"] == [], "kütüphanedeki her antrenman hareketinin görseli var: " + str(info["exMiss"][:5]))
    check(info["mobMiss"] == [], "kütüphanedeki her mobilite hareketinin görseli var: " + str(info["mobMiss"][:5]))
    files = {int(f[:-5]) for f in os.listdir(IMG_DIR) if f.endswith(".webp")}
    nums = set(info["nums"])
    check(nums <= files, "eşlemedeki her görsel dosyası diskte var: " + str(sorted(nums - files)[:5]))
    check(files <= nums, "kullanılmayan (artık) görsel dosyası yok: " + str(sorted(files - nums)[:5]))
    check(len(files) == 285 and info["names"] == 301, f"285 görsel, 301 ad (v70: +9 küçük kas hareketi) ({len(files)}, {info['names']})")
    big = [f for f in os.listdir(IMG_DIR) if os.path.getsize(os.path.join(IMG_DIR, f)) > 200_000]
    check(not big, "her görsel 200 KB'tan küçük: " + str(big[:3]))
    check(all(n for _, n in info["ownKeys"]), "sahibin programındaki bütün hareketlerin görseli var: " + str([x for x in info["ownKeys"] if not x[1]]))
    check(pg.evaluate("exImgNo('  pull-UP ') === exImgNo('Pull-up') && exImgNo('Worlds Greatest Stretch') === exImgNo('World’s Greatest Stretch') && exImgNo('Benim hareketim') === 0"),
          "ad eşlemesi büyük/küçük harf, boşluk ve kesme işaretinden bağımsız; bilinmeyen ad → 0")

    # --- 2) Antrenman: aktif kart + seçenekler penceresi; özel harekette yer yok
    pg.evaluate("""() => { activeDay().exercises.push({ name: 'Benim hareketim', kind: 'weight', sets: [{ kg: 10, reps: 10, done: false }] }); switchTab('gym'); startWorkout(); }""")
    pg.wait_for_timeout(200)
    n_ex = pg.evaluate("activeDay().exercises.length")
    thumbs = pg.evaluate(LOADED, "[data-ex-thumb] img")
    check(len(thumbs) == n_ex - 1 and all(x["ok"] for x in thumbs), f"aktif antrenman: görseli olan {n_ex - 1} kartta küçük görsel yüklendi ({len(thumbs)})")
    check(pg.evaluate(f"!document.querySelector('#exCard_{n_ex - 1} [data-ex-img]')"), "özel harekette görsel yeri hiç yok (boş kutu yok)")
    hb = pg.evaluate("document.querySelector('[data-ex-thumb]').getBoundingClientRect().height")
    check(hb >= 44, f"küçük görsel düğmesi en az 44 px ({hb})")
    check(pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth") <= 0, "aktif antrenmanda yatay taşma yok")
    pg.screenshot(path=os.path.join(SHOTS, "v63_aktif_antrenman.png"))
    pg.click("[data-ex-thumb='0']"); pg.wait_for_timeout(250)
    big0 = pg.evaluate(LOADED, "#exSheetImg img")
    check(len(big0) == 1 and big0[0]["ok"] and big0[0]["alt"] == pg.evaluate("activeDay().exercises[0].name"), "küçük görsele dokununca seçenekler penceresi büyük görselle açılır (alt = hareket adı)")
    pg.screenshot(path=os.path.join(SHOTS, "v63_secenekler.png"))
    pg.evaluate("closeModal('exSheet')"); pg.wait_for_timeout(150)
    pg.evaluate(f"openExSheet({n_ex - 1})"); pg.wait_for_timeout(150)
    check(pg.evaluate("!document.querySelector('#exSheetImg')"), "özel hareketin seçenekler penceresinde görsel yok")
    pg.evaluate("closeModal('exSheet')"); pg.evaluate("exitActiveWorkout()"); pg.wait_for_timeout(100)

    # --- 3) Kütüphane, seçici, mobilite
    pg.evaluate("setGymView('library'); selectMuscle('Göğüs')"); pg.wait_for_timeout(200)
    lib = pg.evaluate(LOADED, "#libList [data-ex-img] img")
    nlib = pg.evaluate("libExerciseItems('Göğüs', '').length")
    check(len(lib) == nlib and nlib > 5 and all(x["ok"] for x in lib) and all(x["alt"] == "" for x in lib), f"kütüphane listesi: {nlib} harekette küçük görsel (süs, alt boş)")
    pg.screenshot(path=os.path.join(SHOTS, "v63_kutuphane.png"))
    pg.evaluate("openExercisePicker()"); pg.wait_for_timeout(250)
    pk = pg.evaluate(LOADED, "#pickerList [data-ex-img] img")
    check(len(pk) >= 100 and all(x["ok"] for x in pk), f"hareket seçicide küçük görseller ({len(pk)})")
    pg.screenshot(path=os.path.join(SHOTS, "v63_secici.png"))
    pg.evaluate("closeModal('pickerModal')")
    pg.evaluate("switchTab('mobility')"); pg.wait_for_timeout(150)
    pg.evaluate("() => { const r = mobRoutines()[0]; mobUI.rid = r.id; mobUI.edit = false; mobOpen(r.items[0].id); }"); pg.wait_for_timeout(200)
    md = pg.evaluate(LOADED, "#mobDtImg img")
    check(len(md) == 1 and md[0]["ok"], "mobilite detay ekranında büyük görsel")
    pg.screenshot(path=os.path.join(SHOTS, "v63_mobilite_detay.png"), full_page=True)
    pg.evaluate("() => { mobAddOpen(); }"); pg.wait_for_timeout(200)
    ma = pg.evaluate(LOADED, "#mobAddList [data-ex-img] img")
    check(len(ma) == pg.evaluate("mobLibAll().length") and all(x["ok"] for x in ma), f"mobilite ekleme listesinde küçük görseller ({len(ma)})")
    pg.evaluate("() => mobSesStart(mobRoutines()[0].id)"); pg.wait_for_timeout(250)
    ms = pg.evaluate(LOADED, "#mobTImg img")
    check(len(ms) == 1 and ms[0]["ok"], "mobilite seansında görsel")
    ov = pg.evaluate("(() => { const e = document.getElementById('mobTimer'); return e.scrollHeight - e.clientHeight; })()")
    pg.screenshot(path=os.path.join(SHOTS, "v63_mobilite_seans.png"))
    check(pg.evaluate("(() => { const r = document.querySelector('#mobTRounds').getBoundingClientRect(); return r.bottom <= innerHeight + 1; })()"), f"mobilite seansında alt düğmeler ekranda (taşma {ov})")
    # v63: seansta "Nasıl yapılır" kapalı başlar; görsel ekran yüksekliğine göre küçülür → iPhone SE'de de düğmeler ekranda
    check(pg.evaluate("mobT.ses.guideOpen") is False, "seansta Nasıl yapılır kapalı başlar (görsel hareketi gösterir)")
    OVF = "(() => { const e = document.getElementById('mobTimer'); return e.scrollHeight - e.clientHeight; })()"
    for (w, h) in [(390, 844), (390, 740), (375, 667)]:
        pg.set_viewport_size({"width": w, "height": h}); pg.evaluate("mobTimerRender()"); pg.wait_for_timeout(150)
        o1 = pg.evaluate(OVF)
        pg.evaluate("(() => { const r = mobRoutines()[0]; const it = r.items.find(i => i.mode === 'time') || r.items[0]; mobTimerClose(); mobSesStartIds('x', [it.id], r.id); })()"); pg.wait_for_timeout(150)
        o2 = pg.evaluate(OVF)
        check(o1 <= 0 and o2 <= 0, f"mobilite seansı {w}×{h}: tekrarlı ve süreli harekette dikey taşma yok ({o1}, {o2})")
        pg.evaluate("mobTimerClose(); mobSesStart(mobRoutines()[0].id)"); pg.wait_for_timeout(150)
    pg.set_viewport_size({"width": 390, "height": 844})
    pg.evaluate("mobTimerClose()"); pg.wait_for_timeout(100)

    # --- 4) İngilizce alt metni; yüklenemeyen görsel kaldırılır
    pg.evaluate("setLang('en'); switchTab('gym'); startWorkout()"); pg.wait_for_timeout(200)
    pg.evaluate("openExSheet(0)"); pg.wait_for_timeout(150)
    alt_en = pg.evaluate("document.querySelector('#exSheetImg img').alt")
    check(alt_en == pg.evaluate("exNameL(activeDay().exercises[0].name)"), f"İngilizcede alt metni İngilizce ad ({alt_en})")
    check(pg.evaluate("document.querySelector('[data-ex-thumb]').getAttribute('aria-label')").endswith(" image"), "küçük görsel düğmesinin İngilizce adı")
    pg.evaluate("closeModal('exSheet'); setLang('tr')")
    c.close()
    c, pg = ctx()
    pg.route("**/img/hareket/**", lambda r: r.fulfill(status=404, body="yok"))
    pg.evaluate("switchTab('gym'); startWorkout()"); pg.wait_for_timeout(100)
    pg.evaluate("document.querySelectorAll('[data-ex-img] img').forEach(i => { i.loading = 'eager'; })"); pg.wait_for_timeout(800)
    check(pg.evaluate("document.querySelectorAll('[data-ex-img]').length") == 0, "görsel yüklenemezse (404 / çevrimdışı) kutusuyla birlikte kaldırılır, kırık simge yok")
    check(pg.evaluate("document.querySelectorAll('#exCard_0 button').length") > 0, "görsel kalkınca kart çalışmaya devam eder")
    c.close()

    # --- 5) Service worker: ayrı, kalıcı görsel önbelleği
    swsrc = open(os.path.join(REPO, "sw.js"), encoding="utf8").read()
    check("IMG_CACHE = 'aykplus-gorsel-1'" in swsrc and "k !== CACHE && k !== IMG_CACHE" in swsrc, "sw.js: görsel önbelleği sürüm değişince silinmez")
    check("img/hareket" not in re.search(r"const FILES = \[(.*?)\];", swsrc).group(1), "görseller kurulumda topluca indirilmez (FILES listesinde yok)")
    c, pg = ctx(sw="allow")
    pg.evaluate("navigator.serviceWorker.ready.then(() => true)")
    pg.reload(); boot(pg)
    pg.wait_for_function("!!navigator.serviceWorker.controller", timeout=5000)
    pg.evaluate("fetch('img/hareket/1.webp').then(r => r.blob())"); pg.wait_for_timeout(300)
    check(pg.evaluate("caches.open('aykplus-gorsel-1').then(c => c.match('img/hareket/1.webp')).then(r => !!r)"), "görülen görsel ayrı önbelleğe girdi (aykplus-gorsel-1)")
    ver = re.search(r"const CACHE = '([^']+)'", swsrc).group(1)   # v64: sürüm adı sw.js'ten
    check(not pg.evaluate(f"caches.open('{ver}').then(c => c.match('img/hareket/1.webp')).then(r => !!r)"), "görsel sürüm önbelleğine girmedi")
    c.close()
    check(errs == [], "sayfa hatası yok: " + str(errs[:3]))
    b.close()
finally:
    srv.terminate()
print("BAŞARISIZ:" if fails else "TÜMÜ GEÇTİ", fails)
sys.exit(1 if (fails or errs) else 0)
