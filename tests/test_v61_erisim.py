# v61: A grubu (App Store öncesi)
# 1) Yazı boyutu: settings.textSize (system | normal | large | xlarge), --fs çarpanı, derlemede font-size/line-height calc,
#    eski kayıtta varsayılan "system", bozuk değer "system", ayna ayk_fs, büyük yazıda yatay taşma yok
# 2) VoiceOver: adsız düğme / giriş yok, anahtarlar role=switch, alt menüde aria-current, bildirimler aria-live
# 3) Tabloya aktar (CSV): antrenman / kilo-ölçü / beslenme; Türkçe ";" + ondalık virgül, İngilizce "," + nokta,
#    imperial'de lb, formül enjeksiyonu engellenir, boşsa dosya yok
# 4) Gizlilik ve destek sayfaları: depoda, iki dilde, Hakkında'dan bağlantı
import os, sys, subprocess, time, json, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOTS = os.path.join(REPO, "tests", "shots"); os.makedirs(SHOTS, exist_ok=True)
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8818'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = "http://localhost:8818/index.html"
def st(pg): return pg.evaluate("aykStoredState()")
def boot(pg): pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(80)

# Dosya kaydını yakala: navigator.share yok → indirme; Blob metni window.__csv'ye
CAPTURE = """() => { window.__csv = []; const O = URL.createObjectURL; URL.createObjectURL = b => { b.arrayBuffer().then(a => { const u = new Uint8Array(a); window.__csv.push({ t: new TextDecoder().decode(u), bom: u[0] === 0xEF && u[1] === 0xBB && u[2] === 0xBF, type: b.type }); }); return O(b); }; }"""
NAME_JS = r"""() => {
const vis = e => e.checkVisibility && e.checkVisibility({checkOpacity:true, checkVisibilityCSS:true}) && e.getBoundingClientRect().width > 0;
const out = [];
for (const e of document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, [role=button]')) {
  if (!vis(e) || e.closest('[aria-hidden="true"]')) continue;
  let ok = e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') || e.title || (e.innerText || '').trim() || e.querySelector('img[alt]:not([alt=""])');
  if (!ok && /^(INPUT|SELECT|TEXTAREA)$/.test(e.tagName)) ok = e.placeholder || (e.labels && e.labels.length && e.labels[0].innerText.trim());
  if (!ok) out.push((e.id ? '#' + e.id : e.tagName) + ' ' + String(e.getAttribute('onclick') || e.className).slice(0, 50));
}
return out; }"""
try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    def ctx(init=TEST_INIT, locale="tr-TR"):
        c = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, locale=locale, accept_downloads=True)
        c.add_init_script(init)
        pg = c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e))); pg.goto(URL); boot(pg)
        return c, pg
    c, pg = ctx()

    # --- 1) Yazı boyutu
    check(pg.evaluate("state.settings.textSize") == "system", "eski kayıtta yazı boyutu varsayılanı: Sistem")
    check(pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--fs').trim()") == "1", "Sistem (Chromium, iPhone ayarı yok) → çarpan 1")
    html = open(os.path.join(REPO, "index.html"), encoding="utf8").read()
    check("font-size: calc(13px * var(--fs, 1))" in html and "font-size:calc(1.5rem * var(--fs-d, 1))" in html, "derleme: font-size değerleri --fs / --fs-d ile çarpılıyor")
    base = pg.evaluate("parseFloat(getComputedStyle(document.querySelector('#tabTitle')).fontSize)")
    body = pg.evaluate("() => { const e = [...document.querySelectorAll('#tabNutrition p, #tabNutrition span')].find(x => Math.round(parseFloat(getComputedStyle(x).fontSize)) === 13 && x.offsetParent); e && e.setAttribute('data-probe', '1'); return !!e; }")
    pg.evaluate("setTextSize('xlarge')"); pg.wait_for_timeout(100)
    check(pg.evaluate("state.settings.textSize") == "xlarge" and st(pg)["settings"]["textSize"] == "xlarge", "En büyük seçildi ve kaydedildi")
    fs13 = pg.evaluate("parseFloat(getComputedStyle(document.querySelector('[data-probe]')).fontSize)") if body else 0
    check(abs(fs13 - 13 * 1.24) < 0.1, "13 px yazı En büyük'te 16,1 px (%.2f)" % fs13)
    big = pg.evaluate("parseFloat(getComputedStyle(document.querySelector('#tabTitle')).fontSize)")
    check(big >= base and big <= base * 1.13, "büyük başlık yarı oranda büyür (%.1f → %.1f)" % (base, big))
    check(pg.evaluate("localStorage.getItem('ayk_fs')") == "1.24", "ayna ayk_fs = 1.24 (açılışta yanıp sönmesin)")
    for tab in ["nutrition", "gym", "mobility", "progress"]:
        pg.evaluate(f"switchTab('{tab}')"); pg.wait_for_timeout(120)
        ov = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        check(ov <= 0, f"En büyük yazıda {tab} sekmesinde yatay taşma yok ({ov})")
    pg.screenshot(path=os.path.join(SHOTS, "v61_buyuk_yazi_ilerleme.png"))
    pg.evaluate("openProfile('app')"); pg.wait_for_timeout(150)
    check(pg.evaluate("document.querySelector('[data-fs-opt=\"xlarge\"]').getAttribute('aria-pressed')") == "true", "Profil seçicisinde En büyük işaretli")
    pg.screenshot(path=os.path.join(SHOTS, "v61_profil_yazi_boyutu.png"))
    pg.evaluate("closeProfile()")
    pg.reload(); boot(pg)
    check(pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--fs').trim()") == "1.24", "yeniden açılışta En büyük korunur")
    pg.evaluate("setTextSize('bozuk')")
    check(pg.evaluate("state.settings.textSize") == "system", "geçersiz seçim → Sistem")
    pg.evaluate("setTextSize('large')")
    check(pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--fs').trim()") == "1.12", "Büyük → 1.12")
    pg.evaluate("setTextSize('normal')")
    check(pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--fs').trim()") == "1", "Normal → 1")
    check(pg.evaluate("(() => { const s = clone(state); s.settings.textSize = 42; return normalizeState(s).settings.textSize; })()") == "system", "normalizeState: bozuk textSize → system")

    # --- 2) VoiceOver
    pg.evaluate("switchTab('gym')"); pg.wait_for_timeout(80)
    check(pg.evaluate("document.getElementById('navBtnGym').getAttribute('aria-current')") == "page" and pg.evaluate("document.getElementById('navBtnNutrition').getAttribute('aria-current')") is None, "alt menü: seçili sekme aria-current=page")
    check(pg.evaluate("document.getElementById('toastWrap').getAttribute('aria-live')") == "polite", "bildirimler VoiceOver'a okunur (aria-live)")
    check(pg.evaluate("[...document.querySelectorAll('input.t-sw, input.n-sw')].every(e => e.getAttribute('role') === 'switch')"), "bütün anahtarlar role=switch")
    noname = {}
    for js in ["switchTab('nutrition'); setNutriView('today')", "setNutriView('menus')", "openCustomFoodModal()", "closeModal('customFoodModal'); switchTab('gym'); setGymView('today')",
               "setGymView('library')", "setGymView('today'); startWorkout()", "openPlateTool(0)", "closeModal('chartModal'); void uiAsk({title:'Ad', message:'Yeni ad', input:{value:'x'}, ok:'Kaydet'})",
               "uiDialogDone(false); switchTab('mobility')", "switchTab('progress')", "openProfile()"]:
        pg.evaluate("() => { " + js + " }"); pg.wait_for_timeout(120)
        for x in pg.evaluate(NAME_JS): noname.setdefault(x, js[:30])
    check(not noname, "adı olmayan düğme / giriş yok: %s" % list(noname.items())[:5])
    pg.evaluate("closeProfile(); state.gymActive = false; stopTimer(); switchTab('gym'); setGymView('library')"); pg.wait_for_timeout(80)
    check(pg.evaluate("document.querySelectorAll('#gymRoot [data-muscle-btn]').length") == pg.evaluate("MUSCLES.length"), "vücut haritası: her kas bir kez okunur (v68: gizli kas düğmeleri)")

    # --- 3) CSV
    pg.evaluate("""() => { const now = Date.now(), D = DAY_MS;
      state.workoutLogs = [{ id: 'w1', ts: now - 2 * D, dayName: '=Bacak; günü', sets: 3 }];
      state.exerciseHistory = { [exKey('Back Squat')]: [{ ts: now - 2 * D, logId: 'w1', kind: 'weight', name: 'Back Squat', muscle: 'Ön Bacak', sets: [{ kg: 102.5, reps: 5, e: 3 }, { kg: 100, reps: 6 }] }],
        [exKey('Koşu Bandı')]: [{ ts: now - 2 * D, logId: 'w1', kind: 'cardio', name: 'Koşu Bandı', sets: [{ min: 20, km: 3.5, lvl: '' }] }] };
      state.weightLogs = [{ date: 'x', weight: 90.4, ts: now - 3 * D }, { date: 'y', weight: 89.9, ts: now - D }];
      state.measurements = [{ ts: now - D, bel: 95.5, kol: 40 }];
      state.dailyLogs = { '2026-11-01': { eatenKcal: 2400, eatenP: 180, calTarget: 2500, proTarget: 190, water: 3.5, mealsDone: 4, mealsTotal: 4, supps: 2, dayType: 'train' } };
      renderAll(); }""")
    pg.evaluate(CAPTURE)
    pg.evaluate("exportCsv('workouts')"); pg.wait_for_timeout(300)
    f = pg.evaluate("window.__csv[0]")
    lines = f["t"].lstrip("﻿").strip().split("\r\n")
    check(f["bom"] and f["type"] == "text/csv", "CSV: BOM ve text/csv türü")
    check(lines[0].startswith("Tarih;Saat;Antrenman günü;Hareket;Kas grubu;Set;Kilo (kg);Tekrar;Zorluk"), "antrenman başlığı Türkçe, ';' ayırıcı: " + lines[0][:60])
    check(len(lines) == 4, "antrenman: 3 set satırı (2 ağırlık + 1 kardiyo): %d" % (len(lines) - 1))
    sq = [l for l in lines if "Back Squat" in l]
    check(sq and "102,5" in sq[0] and ";5;Zor;" in sq[0], "ağırlık seti: 102,5 kg (virgül), 5 tekrar, zorluk Zor: " + (sq[0] if sq else ""))
    check(sq and "\"'=Bacak; günü\"" in sq[0], "formül engeli: '=' ile başlayan gün adı ' ile başlar ve tırnaklı: " + (sq[0][:60] if sq else ""))
    cd = [l for l in lines if "Koşu" in l]
    check(cd and cd[0].endswith(";20;3,5;"), "kardiyo satırı: 20 dk, 3,5 km: " + (cd[0] if cd else ""))
    pg.evaluate(CAPTURE); pg.evaluate("exportCsv('body')"); pg.wait_for_timeout(300)
    bl = pg.evaluate("window.__csv[0].t").lstrip("﻿").strip().split("\r\n")
    check(bl[0].startswith("Tarih;Kilo (kg);Bel (cm)") and len(bl) == 3, "kilo-ölçü: başlık + 2 gün: " + bl[0][:40])
    check(bl[2].split(";")[1:3] == ["89,9", "95,5"], "aynı gün tartı ve bel tek satırda: " + bl[2])
    pg.evaluate(CAPTURE); pg.evaluate("exportCsv('nutrition')"); pg.wait_for_timeout(300)
    nl = pg.evaluate("window.__csv[0].t").lstrip("﻿").strip().split("\r\n")
    check(nl[1] == "2026-11-01;Antrenman günü;2400;180;2500;190;3,5;4;4;2", "beslenme satırı: " + nl[1])
    # İngilizce + imperial
    pg.evaluate("setLang('en'); setUnits('imperial')"); pg.wait_for_timeout(150)
    pg.evaluate(CAPTURE); pg.evaluate("exportCsv('workouts')"); pg.wait_for_timeout(300)
    el = pg.evaluate("window.__csv[0].t").lstrip("﻿").strip().split("\r\n")
    check(el[0].startswith("Date,Time,Workout day,Exercise,Muscle group,Set,Weight (lb),Reps,Effort"), "EN: ',' ayırıcı, lb başlığı: " + el[0][:70])
    sq = [l for l in el if "Squat" in l]
    check(sq and ",226," in sq[0] and ",Hard," in sq[0], "EN: 102,5 kg → 226 lb, zorluk Hard: " + (sq[0] if sq else ""))
    pg.evaluate(CAPTURE); pg.evaluate("exportCsv('body')"); pg.wait_for_timeout(300)
    eb = pg.evaluate("window.__csv[0].t").lstrip("﻿").strip().split("\r\n")
    check(eb[0].startswith("Date,Weight (lb),Waist (in)") and eb[2].split(",")[1] == "198.2", "EN imperial kilo: 89,9 kg → 198.2 lb, ölçü inç: " + eb[2])
    check(st(pg)["weightLogs"][1]["weight"] == 89.9, "dışa aktarma kaydı değiştirmez")
    pg.evaluate("setLang('tr'); setUnits('metric')")
    pg.evaluate("state.dailyLogs = {}; renderAll()"); pg.evaluate(CAPTURE); pg.evaluate("exportCsv('nutrition')"); pg.wait_for_timeout(300)
    check(pg.evaluate("window.__csv.length") == 0 and "henüz kayıt yok" in pg.inner_text("#toastWrap"), "boş bölümde dosya oluşturulmaz, bilgi verilir")
    pg.evaluate("openProfile('data')"); pg.wait_for_timeout(120)
    check(pg.evaluate("[...document.querySelectorAll('[data-csv]')].every(e => e.getBoundingClientRect().height >= 44)"), "CSV düğmeleri en az 44 px")

    # --- 4) Gizlilik / destek
    for f_ in ["privacy.html", "support.html"]:
        s = open(os.path.join(REPO, f_), encoding="utf8").read()
        check('id="tr"' in s and 'id="en"' in s, f_ + ": Türkçe ve İngilizce bölüm var")
    pv = open(os.path.join(REPO, "privacy.html"), encoding="utf8").read()
    check("Open Food Facts" in pv and "barkod numarası" in pv and "barcode number" in pv, "gizlilik: barkodun Open Food Facts'e gittiği yazıyor")
    srcs = " ".join(open(os.path.join(REPO, "src", "app", f_), encoding="utf8").read() for f_ in os.listdir(os.path.join(REPO, "src", "app")))
    hosts = set(re.findall(r"fetch\(\s*[`'\"]https?://([^/`'\"]+)", srcs))
    check(hosts == {"world.openfoodfacts.org"}, "uygulamanın veri gönderdiği tek adres Open Food Facts (gizlilik metniyle tutarlı): %s" % hosts)
    pg.evaluate("openProfile('about')"); pg.wait_for_timeout(120)
    check(pg.get_attribute("#pfPrivacyLink", "href") == "privacy.html" and pg.get_attribute("#pfSupportLink", "href") == "support.html", "Hakkında: gizlilik ve destek bağlantıları")
    pg.evaluate("setLang('en')"); pg.wait_for_timeout(100)
    check(pg.get_attribute("#pfPrivacyLink", "href") == "privacy.html#en" and pg.inner_text("#pfPrivacyLink") == "Privacy policy", "EN: bağlantı İngilizce bölüme")
    pg.evaluate("setLang('tr')")
    for f_ in ["privacy.html", "support.html"]:
        pg2 = c.new_page(); pg2.goto("http://localhost:8818/" + f_); pg2.wait_for_timeout(150)
        ov = pg2.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        check(ov <= 0, f_ + " telefonda yatay taşma yok")
        pg2.screenshot(path=os.path.join(SHOTS, "v61_" + f_.replace(".html", "") + ".png")); pg2.close()
    c.close()
    check(errs == [], "sayfa hatası yok: " + str(errs[:3]))
    b.close()
finally:
    srv.terminate()
print("BAŞARISIZ:" if fails else "TÜMÜ GEÇTİ", fails)
sys.exit(1 if (fails or errs) else 0)
