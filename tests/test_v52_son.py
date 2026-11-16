# v52 bölüm 1 (görev 1): Mobilite rehberleri ("Nasıl yapılır"), kütüphane notları ve Türkçe parantezli hareket adları İngilizce.
# Kayıtlı değerler (it.name, rehber anahtarı, mobilityLog) Türkçe/ham kalır; yalnız İngilizcede yeni eklenen kütüphane notu İngilizce (karar 2).
# Bölüm 2 (görev 2): Hakkında, paylaşım kartı, ses. Bölüm 3 (görev 3): İngilizce bayraksız açık, Türkçe kelime taraması, göç adı "Rutinim", sahibin hedefleri.
import os, sys, re, json, subprocess, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8810'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = "http://localhost:8810/index.html"
TR_CH = re.compile(r"[çğıöşüÇĞİÖŞÜ]")
def boot(pg): pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(80)
# Parantezi zaten İngilizce olan kütüphane adları (MOB_NAME_EN'e girmez)
EN_PAREN = {"Quadruped Thoracic Rotation (T-Spine)", "Quadruped Hip CARs (Controlled Articular Rotations)", "Wide-Leg Seated Straddle (Pancake)"}
ARM = "Arm Circles (Kol Çevirme)"
ARM_NOTE_TR = "Omuz ısınması"
try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, locale="en-US")
    ctx.add_init_script(TEST_INIT); ctx.add_init_script("window.AYK_TEST_EN = true")
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL); boot(pg)
    # ===== (a) rehberler: her MOB_GUIDE anahtarı (MOB_LIB_V39 dahil) için İngilizce rehber, adım sayısı eşit, temiz metin
    r = pg.evaluate("""() => {
      const bad = s => typeof s !== 'string' || !s.trim() || /[çğıöşüÇĞİÖŞÜ&<>]/.test(s);
      const out = { n: Object.keys(MOB_GUIDE).length, missing: [], steps: [], dirty: [], stale: [] };
      Object.keys(MOB_GUIDE).forEach(k => {
        const e = Object.prototype.hasOwnProperty.call(MOB_GUIDE_EN, k) ? MOB_GUIDE_EN[k] : null;
        if (!e) { out.missing.push(k); return; }
        if (!Array.isArray(e.steps) || e.steps.length !== MOB_GUIDE[k].steps.length) out.steps.push(k);
        if ((e.steps || []).some(bad) || bad(e.warn)) out.dirty.push(k);
      });
      Object.keys(MOB_GUIDE_EN).forEach(k => { if (!Object.prototype.hasOwnProperty.call(MOB_GUIDE, k)) out.stale.push(k); });
      return out; }""")
    check(r["n"] >= 104 and not r["missing"] and not r["steps"] and not r["dirty"] and not r["stale"],
          "rehber: %d anahtarın hepsinde İngilizce, adım sayısı eşit, Türkçe harf/&<> yok, fazlalık yok: %s" % (r["n"], {k: v[:4] for k, v in r.items() if k != "n" and v}))
    # ===== (b) kütüphane notları, (c) Türkçe parantezli adlar
    r = pg.evaluate("""(enParen) => {
      const bad = s => typeof s !== 'string' || !s.trim() || /[çğıöşüÇĞİÖŞÜ&<>]/.test(s);
      const lib = Object.values(MOBILITY_LIBRARY).flat();
      const notes = [...new Set(lib.map(m => m.note))], names = lib.map(m => m.name);
      const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
      return { nNotes: notes.length, nNames: names.length,
        noteMissing: notes.filter(n => !has(MOB_NOTE_EN, n)), noteDirty: Object.values(MOB_NOTE_EN).filter(bad),
        noteStale: Object.keys(MOB_NOTE_EN).filter(k => !notes.includes(k)),
        nameMissing: names.filter(n => (n.includes('(') && !enParen.includes(n)) || /[çğıöşüÇĞİÖŞÜ]/.test(n)).filter(n => !has(MOB_NAME_EN, n)),
        nameDirty: Object.values(MOB_NAME_EN).filter(v => bad(v) || /\\(\\s*\\)/.test(v)), nameStale: Object.keys(MOB_NAME_EN).filter(k => !names.includes(k)) }; }""", sorted(EN_PAREN))
    check(r["nNotes"] >= 104 and not r["noteMissing"] and not r["noteDirty"] and not r["noteStale"], "notlar: %d notun hepsi MOB_NOTE_EN'de, temiz: %s" % (r["nNotes"], {k: r[k][:4] for k in ("noteMissing", "noteDirty", "noteStale") if r[k]}))
    check(not r["nameMissing"] and not r["nameDirty"] and not r["nameStale"], "adlar: Türkçe parantezli her ad MOB_NAME_EN'de, temiz: %s" % {k: r[k][:4] for k in ("nameMissing", "nameDirty", "nameStale") if r[k]})
    # ===== Türkçede yardımcılar girdiyi aynen döndürür
    H = "[mobNameL(%r), mobNoteL(%r), mobNoteL('Kendi notum'), mobNameL('Kendi hareketim'), mobGuideL(%r) === mobGuide(%r)]" % (ARM, ARM_NOTE_TR, ARM, ARM)
    pg.evaluate("setLang('tr')")
    check(pg.evaluate(H) == [ARM, ARM_NOTE_TR, "Kendi notum", "Kendi hareketim", True], "tr: yardımcılar girdiyi aynen döndürür: %s" % pg.evaluate(H))
    # ===== İngilizce
    pg.evaluate("setLang('en')"); pg.wait_for_timeout(100)
    r = pg.evaluate(H)
    check(r == ["Arm Circles", "Shoulder warm-up", "Kendi notum", "Kendi hareketim", False], "en: yardımcılar: %s" % r)
    check(pg.evaluate("mobGuideL('arm circles (kol çevirme)').steps[0]") == pg.evaluate("MOB_GUIDE_EN[%r].steps[0]" % ARM), "en: rehber araması büyük/küçük harften bağımsız")
    check(pg.evaluate("mobGuideL('Benim hareketim')") is None, "en: rehberi olmayan harekette null")
    SETUP = """() => { const rs = mobRoutines(); const i = rs.findIndex(r => r.id === 'mr_t52'); if (i >= 0) rs.splice(i, 1);
      rs.push({ id: 'mr_t52', name: 'T52', items: [] }); mobUI.rid = 'mr_t52'; mobUI.view = 'routine'; mobUI.edit = false;
      state.activeTab = 'mobility'; switchTab('mobility'); mobUI.rid = 'mr_t52'; mobUI.view = 'routine'; renderAll(); }"""
    def add_lib(name):
        pg.evaluate("(n) => mobAddLib(mobLibAll().find(x => x.m.name === n).key)", name); pg.wait_for_timeout(80)
    pg.evaluate(SETUP)
    # (e) İngilizcede kütüphaneden ekleme: ad ham Türkçe-parantezli, not İngilizce
    add_lib(ARM)
    it = pg.evaluate("mobRoutine('mr_t52').items[0]")
    check(it["name"] == ARM and it["note"] == "Shoulder warm-up", "en: eklenen hareket name ham (%r), note İngilizce (%r)" % (it["name"], it["note"]))
    tw = pg.inner_text("#toastWrap")
    check("Arm Circles added" in tw and "Kol" not in tw, "en: eklendi bildirimi parantezsiz ad: %r" % tw[:60])
    # Rutin listesi
    pg.evaluate("() => { mobUI.view = 'routine'; renderAll(); }")
    h = pg.inner_text("#mobList")
    check("Arm Circles" in h and "Kol" not in h, "en: rutin listesinde ad parantezsiz: %r" % h[:80])
    # (d) detay: İngilizce rehber, ad, not
    pg.evaluate("() => mobOpen(mobRoutine('mr_t52').items[0].id)"); pg.wait_for_timeout(80)
    g = pg.inner_text("#mobDtGuide")
    step0 = pg.evaluate("MOB_GUIDE_EN[%r].steps[0]" % ARM)
    check(step0 in g and "Watch out:" in g and not TR_CH.search(g), "en: #mobDtGuide İngilizce: %r" % g[:90])
    check(pg.inner_text("#mobDtTitle").strip() == "Arm Circles", "en: detay başlığı parantezsiz: %r" % pg.inner_text("#mobDtTitle"))
    check(pg.input_value("#mobDtNote") == "Shoulder warm-up", "en: detay notu İngilizce")
    # Türkçe notlu eski kayıt İngilizcede çevrilerek gösterilir, kayıt değişmez
    pg.evaluate("(n) => { const it = mobRoutine('mr_t52').items[0]; it.note = n; renderAll(); }", ARM_NOTE_TR)
    check(pg.input_value("#mobDtNote") == "Shoulder warm-up" and pg.evaluate("mobRoutine('mr_t52').items[0].note") == ARM_NOTE_TR, "en: eski Türkçe not gösterimde İngilizce, kayıtta Türkçe")
    # (d) seans: İngilizce rehber ve başlık
    add_lib("Hip Circles (Kalça Çevirme)")
    pg.evaluate("() => { mobSesStart('mr_t52'); if (!mobT.ses.guideOpen) mobSesGuide(); }"); pg.wait_for_timeout(100)
    g = pg.inner_text("#mobTGuide")
    check(step0 in g and not TR_CH.search(g), "en: seans #mobTGuide İngilizce: %r" % g[:90])
    check(pg.inner_text("#mobTTitle").strip() == "Arm Circles", "en: seans başlığı parantezsiz: %r" % pg.inner_text("#mobTTitle"))
    tm = pg.inner_text("#mobTimer")
    check("Hip Circles" in tm and "Kalça" not in tm, "en: sıradaki hareket adı parantezsiz")
    check(pg.evaluate("mobT.name") == ARM, "en: seans durumu ham adı saklar (ses görev 2)")
    pg.evaluate("mobSesFinish()"); pg.wait_for_timeout(80)
    tm = pg.inner_text("#mobTimer")
    check("Arm Circles" in tm and "Kol" not in tm, "en: bitiş özetinde ad parantezsiz")
    pg.evaluate("mobTimerClose()")
    # (d) ekle listesi: ad parantezsiz; arama İngilizce ad/not ve Türkçe adla bulur
    pg.evaluate("() => { mobUI.rid = 'mr_t52'; mobUI.view = 'routine'; mobAddOpen(); }"); pg.wait_for_timeout(80)
    h = pg.inner_text("#mobAddList")
    check("Arm Circles" in h and "(Kol Çevirme)" not in h and "Pigeon Pose" in h and "Güvercin" not in h, "en: ekle listesinde adlar parantezsiz")
    check(pg.evaluate("document.querySelector('#mobAddList [aria-label=\"Arm Circles is already in the routine, add anyway\"]') ? 1 : 0") == 1, "en: ekle düğmesinin etiketi parantezsiz ad")
    def search(q):
        pg.evaluate("(q) => mobAddSearch(q)", q); pg.wait_for_timeout(40); return pg.inner_text("#mobAddList")
    check("Arm Circles" in search("shoulder warm-up"), "en: arama İngilizce notla bulur")
    check("Superman" in search("superman"), "en: arama İngilizce parantezle bulur (Prone Back Extension (Superman))")
    check("Arm Circles" in search("kol çevirme"), "en: arama Türkçe adla da bulur")
    pg.evaluate("() => mobAddSearch('')")
    # Isınma kartı: ad parantezsiz
    wh = pg.evaluate("""() => { const it = mobRoutine('mr_t52').items[0]; it.type = 'dynamic'; it.region = 'shoulder'; it.done = false;
      return warmupCardHtml({ exercises: [{ name: 'Bench Press', muscle: 'Göğüs', kind: 'weight', sets: [] }] }, false); }""")
    check("Arm Circles" in wh and "Kol" not in wh, "en: ısınma kartında ad parantezsiz")
    # ===== (f) Türkçe: aynı ekranlar eski metin
    pg.evaluate("setLang('tr')"); pg.wait_for_timeout(100)
    pg.evaluate("() => { mobUI.rid = 'mr_t52'; mobUI.view = 'routine'; renderAll(); mobOpen(mobRoutine('mr_t52').items[0].id); }"); pg.wait_for_timeout(80)
    g = pg.inner_text("#mobDtGuide"); tr0 = pg.evaluate("MOB_GUIDE[%r].steps[0]" % ARM)
    check(tr0 in g and "Dikkat:" in g, "tr: #mobDtGuide Türkçe: %r" % g[:80])
    check(pg.inner_text("#mobDtTitle").strip() == ARM and pg.input_value("#mobDtNote") == ARM_NOTE_TR, "tr: detay başlığı ve notu ham")
    pg.evaluate("() => { mobSesStart('mr_t52'); if (!mobT.ses.guideOpen) mobSesGuide(); }"); pg.wait_for_timeout(100)
    check(tr0 in pg.inner_text("#mobTGuide") and pg.inner_text("#mobTTitle").strip() == ARM, "tr: seans rehberi ve başlığı Türkçe")
    pg.evaluate("mobTimerClose()")
    pg.evaluate("() => { mobUI.rid = 'mr_t52'; mobUI.view = 'routine'; mobAddOpen(); }"); pg.wait_for_timeout(80)
    h = pg.inner_text("#mobAddList")
    check(ARM in h and "Pigeon Pose (Güvercin Pozu)" in h, "tr: ekle listesinde adlar Türkçe parantezli")
    check("Arm Circles" not in search("shoulder warm-up"), "tr: arama İngilizce notu kullanmaz")
    pg.evaluate("() => mobAddSearch('')")
    pg.evaluate("() => { mobRoutine('mr_t52').items = []; }")
    add_lib(ARM)
    check(pg.evaluate("mobRoutine('mr_t52').items[0].note") == ARM_NOTE_TR, "tr: kütüphaneden eklenen hareketin notu Türkçe")
    # ================= BÖLÜM 2 (görev 2): Hakkında, paylaşım kartı, sesli yönlendirme
    ABOUT_TR = {"pfAboutHealth": None, "pfAboutPrivacy": None, "pfMethodBody": None, "pfLicList": None}
    pg.evaluate("setLang('en')"); pg.wait_for_timeout(100); pg.evaluate("openProfile()"); pg.wait_for_timeout(150)
    for i in ABOUT_TR:
        tx = pg.evaluate("document.getElementById('%s').textContent" % i)
        ABOUT_TR[i] = tx
        check(tx.strip() != "" and not TR_CH.search(tx) and "{" not in tx, "en: #%s Türkçe harfsiz, yer tutucu kalmadı: %r" % (i, tx[:60]))
    mb = ABOUT_TR["pfMethodBody"]
    check("1.55" in mb and "1.43" in mb and "1.70" in mb and "1,55" not in mb and "1,400" in mb and "1,750" in mb and "2.5 g" in mb and "2.2 times" in mb, "en: çarpanlar 1.55 biçiminde, 1,400/1,750, ondalık nokta")
    check("Open Food Facts data" in ABOUT_TR["pfLicList"] and "Barlow Condensed (SIL OFL 1.1)" in ABOUT_TR["pfLicList"] and "Mifflin et al." in mb, "en: kaynak/lisans adları özel ad olarak kalır, açıklama çevrilir")
    pg.evaluate("closeProfile()")
    pg.evaluate("setLang('tr')"); pg.wait_for_timeout(100); pg.evaluate("openProfile()"); pg.wait_for_timeout(150)
    mb = pg.evaluate("document.getElementById('pfMethodBody').textContent")
    check("1,55" in mb and "1.400" in mb and "1.750" in mb and "Kilo korurken: 1,6 g." in mb and "Toplam, mevcut kilonun 2,2 katını geçmez." in mb and "Mifflin ve ark. (1990)" in mb, "tr: Hesap yöntemi metni eski haliyle aynı")
    pg.evaluate("closeProfile()")
    # --- paylaşım kartı
    pg.evaluate("""() => { state.workoutLogs.push({ id: 'l52', ts: Date.now(), dayName: 'Push', durationMin: 50, volume: 1234, prs: 1, sets: 10, cardioMin: 0 });
      state.exerciseHistory['bench52'] = [{ logId: 'l52', name: 'Bench Press', kind: 'weight', sets: [{ kg: 60, reps: 8 }] }]; }""")
    def card(lang):
        pg.evaluate("setLang('%s')" % lang); pg.wait_for_timeout(100)
        pg.evaluate("void openShareCard(state.workoutLogs.length - 1)"); pg.wait_for_selector("#chartBody img", timeout=8000)
        r = {"title": pg.inner_text("#chartTitle"), "alt": pg.get_attribute("#chartBody img", "alt"), "body": pg.inner_text("#chartBody"),
             "ex": pg.evaluate("logExerciseLines(state.workoutLogs[state.workoutLogs.length - 1])[0].txt")}
        pg.evaluate("closeModal('chartModal')") if pg.evaluate("typeof closeModal === 'function'") else None
        return r
    r = card("en")
    check(r["title"] == "Workout summary" and r["alt"] == "Workout summary" and not TR_CH.search(r["body"]) and "Share / Save to Photos" in r["body"], "en: paylaşım kartı penceresi İngilizce: %r %r" % (r["title"], r["body"][:60]))
    check(r["ex"] == "1 set • best 60×8", "en: kart hareket satırı: %r" % r["ex"])
    r = card("tr")
    check(r["title"] == "Antrenman Özeti" and r["alt"] == "Antrenman özeti" and "Paylaş / Fotoğraflara Kaydet" in r["body"] and r["ex"] == "1 set • en iyi 60×8", "tr: paylaşım kartı penceresi eski metinle: %r" % r)
    # tuval metinleri: fillText çağrılarını yakala
    def canvas_texts(lang):
        pg.evaluate("setLang('%s')" % lang); pg.wait_for_timeout(100)
        return pg.evaluate("""async () => { const out = []; const o = CanvasRenderingContext2D.prototype.fillText;
          CanvasRenderingContext2D.prototype.fillText = function (tx) { out.push(String(tx)); return o.apply(this, arguments); };
          try { await buildShareCanvas(state.workoutLogs[state.workoutLogs.length - 1]); } finally { CanvasRenderingContext2D.prototype.fillText = o; }
          return out; }""")
    ce = canvas_texts("en"); ct = canvas_texts("tr")
    check("Workout complete" in ce and "Logged with AYK+" in ce and "Time" in ce and "Volume" in ce and "Exercises" in ce and not [x for x in ce if TR_CH.search(x)], "en: tuval metinleri İngilizce: %s" % ce)
    check("Antrenman tamamlandı" in ct and "AYK+ ile kaydedildi" in ct and "Süre" in ct and "Tonaj" in ct and "Hareketler" in ct and "Set" in ct, "tr: tuval metinleri eski: %s" % ct)
    # --- sesli yönlendirme
    STUB = """() => { window.__sp = []; Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { cancel() {}, getVoices() { return [{ lang: 'tr-TR' }, { lang: 'en-GB' }]; },
        speak(u) { window.__sp.push([u.text, u.lang, u.voice ? u.voice.lang : null]); } } }); window.SpeechSynthesisUtterance = function (tx) { this.text = tx; };
      state.settings.mobVoice = true;
      const r = mobRoutine('mr_t52'); const it = r.items[0]; Object.assign(it, { sets: 2, mode: 'time', sec: 30, sides: 2, done: false }); r.name = 'T52'; r.items = [it]; renderAll(); }"""
    pg.evaluate(STUB)
    def speak(lang):
        pg.evaluate("setLang('%s')" % lang); pg.wait_for_timeout(100)
        pg.evaluate("window.__sp = []; mobSesStart('mr_t52')"); pg.wait_for_timeout(60)
        a = pg.evaluate("window.__sp.slice()")
        side0 = pg.evaluate("mobT.rounds[0].side"); nxt = pg.evaluate("mobT.rounds[1].side")
        pg.evaluate("window.__sp = []; mobT.phase = 'work'; mobT.endAt = Date.now() - 50; mobTimerTick()"); pg.wait_for_timeout(20)
        b2 = pg.evaluate("window.__sp.slice()")
        pg.evaluate("window.__sp = []; mobTimerClose(); mobSesStart('mr_t52'); window.__sp = []; mobSesFinish()"); pg.wait_for_timeout(20)
        c = pg.evaluate("window.__sp.slice()")
        pg.evaluate("mobTimerClose()")
        return a, side0, nxt, b2, c
    a, side0, nxt, b2, c = speak("tr")
    check(a and a[0] == [ARM + ". " + side0 + " taraf. 2 set, 30 saniye.", "tr-TR", "tr-TR"], "tr: ilk hareket cümlesi eskisiyle aynı, tr-TR: %s" % a)
    check(b2 and b2[0][0] == ("Sola geç" if nxt == "Sol" else "Sağa geç" if nxt == "Sağ" else "Sıradaki set") and b2[0][1] == "tr-TR", "tr: geçiş cümlesi: %s" % b2)
    check(c and c[0][0] == "T52 bitti. Tebrikler." and c[0][1] == "tr-TR", "tr: bitiş cümlesi: %s" % c)
    a, side0, nxt, b2, c = speak("en")
    sd = {"Sağ": "Right", "Sol": "Left"}[side0]
    check(a and a[0] == ["Arm Circles. " + sd + " side. 2 sets, 30 seconds.", "en-GB", "en-GB"], "en: ilk hareket cümlesi İngilizce, en-GB sesi: %s" % a)
    check(b2 and b2[0][0] == ("Switch to left" if nxt == "Sol" else "Switch to right") and b2[0][1] == "en-GB", "en: geçiş cümlesi: %s" % b2)
    check(c and c[0][0] == "T52 finished. Well done." and c[0][1] == "en-GB" and not TR_CH.search(c[0][0]), "en: bitiş cümlesi: %s" % c)
    # ================= BÖLÜM 3 (görev 3): İngilizce herkese açık (bayraksız), Türkçe kelime taraması, göç adı, sahibin hedefleri
    sys.path.insert(0, os.path.join(REPO, "scripts", "kontrol"))
    from ortak import SEED as K_SEED, EN_SCREENS, EN_ROOT, EN_ONBOARD_SCREENS, NO_ANIM, SPLASH_ANIM, FIXED_TIME, TR_WORD_SCAN_JS
    from ortak_tohum import SPLASH_OFF
    def ctx3(locale="en-US", init=TEST_INIT):
        c = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, locale=locale)
        c.add_init_script(init)   # AYK_TEST_EN bayrağı YOK
        q = c.new_page(); q.on("pageerror", lambda e: errs.append(str(e))); return c, q
    # (a) bayraksız: dil seçici görünür, İngilizce ve geri Türkçe
    c3, q = ctx3(); q.goto(URL); boot(q)
    check(q.evaluate("langAvailable()") is True and q.evaluate("window.AYK_TEST_EN") is None and q.evaluate("curLang()") == "tr", "a: bayraksız langAvailable true, sahibin kaydı Türkçe")
    q.evaluate("openProfile()"); q.wait_for_timeout(150)
    check(q.is_visible("#pfLang") and q.is_visible("#pfLang [data-lang-opt=en]"), "a: Profil'de dil satırı görünür")
    bx = q.evaluate("[...document.querySelectorAll('#pfLang [data-lang-opt]')].map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })")
    check(len(bx) == 2 and all(w >= 44 and h >= 44 for w, h in bx), "a: dil düğmeleri ≥ 44 px: %s" % bx)
    q.click("#pfLang [data-lang-opt=en]"); q.wait_for_timeout(200)
    check(q.evaluate("curLang()") == "en" and q.evaluate("aykStoredState().then(s => s.settings.lang)") == "en", "a: English seçilince dil en, kayda yazıldı")
    q.evaluate("void closeProfile()"); q.wait_for_timeout(100); q.evaluate("switchTab('nutrition')"); q.wait_for_timeout(100)
    nav = q.inner_text(".bottom-nav")
    check("Nutrition" in nav and "Beslenme" not in nav and q.evaluate("document.documentElement.lang") == "en", "a: arayüz İngilizce: %r" % nav.replace("\n", " "))
    q.reload(); boot(q)
    check(q.evaluate("curLang()") == "en", "a: yeniden açılışta İngilizce kalır (bayraksız)")
    q.evaluate("openProfile()"); q.wait_for_timeout(150); q.click("#pfLang [data-lang-opt=tr]"); q.wait_for_timeout(200)
    q.evaluate("void closeProfile()"); q.wait_for_timeout(100)
    nav = q.inner_text(".bottom-nav")
    check(q.evaluate("curLang()") == "tr" and "Beslenme" in nav and q.evaluate("document.documentElement.lang") == "tr", "a: Türkçeye dönünce Türkçe: %r" % nav.replace("\n", " "))
    # (d) sahibin kaydı Türkçede aynı hedefler
    tg = q.evaluate("getTargets()")
    check([tg["calTarget"], tg["proTarget"], tg["fatTarget"], tg["carbTarget"]] == [2478, 180, 69, 284], "d: sahibin hedefleri Türkçede 2478/180/69/284: %s" % [tg["calTarget"], tg["proTarget"], tg["fatTarget"], tg["carbTarget"]])
    # (c) v39 öncesi kayıt İngilizce açıkken (ör. eski yedeğin geri yüklenmesi) göç edilince rutin adı "Rutinim"
    OWN = json.load(open(os.path.join(REPO, "tests", "fixtures", "eski_varsayilan.json"), encoding="utf-8"))
    legacy = {k: v for k, v in OWN.items() if k != "dataVer"}
    legacy["mobilityRoutine"] = {"dynamic": OWN["mobilityRoutine"]["dynamic"], "static": OWN["mobilityRoutine"]["static"]}
    legacy["settings"] = dict(OWN["settings"], lang="en")
    q.evaluate("setLang('en')"); q.wait_for_timeout(100)
    r = q.evaluate("(raw) => { const s = normalizeState(raw); return { cur: curLang(), names: s.mobilityRoutine.routines.map(x => x.name), n: s.mobilityRoutine.routines[0].items.length }; }", legacy)
    check(r["cur"] == "en" and r["names"] == ["Rutinim"] and r["n"] == 10, "c: v39 öncesi kayıt İngilizcede göç: rutin adı 'Rutinim' (%s)" % r)
    q.evaluate("setLang('tr')")
    c3.close()
    # yeni kurulum: İngilizce telefonda kurulum İngilizce açılır ve dil seçici görünür; Türkçe telefonda Türkçe
    def fresh(locale):
        c, q = ctx3(locale, SPLASH_OFF); q.goto(URL); boot(q)
        q.evaluate("() => { localStorage.clear(); void indexedDB.deleteDatabase('aykplus'); }"); q.reload(); boot(q); return c, q
    c, q = fresh("en-US")
    check(q.evaluate("state.settings.lang") == "en" and q.is_visible("#obLang") and "Welcome" in q.inner_text("#onboard"), "a: İngilizce telefonda yeni kurulum İngilizce, #obLang görünür")
    c.close()
    c, q = fresh("tr-TR")
    check(q.evaluate("state.settings.lang") == "tr" and q.is_visible("#obLang") and "Hoş geldin" in q.inner_text("#onboard"), "a: Türkçe telefonda yeni kurulum Türkçe, #obLang görünür")
    c.close()
    # (b) Türkçe kelime taraması: kontrol aracının bütün İngilizce ekranları (bayraksız)
    c, q = ctx3("en-GB", NO_ANIM); q.clock.set_fixed_time(FIXED_TIME); q.goto(URL); boot(q)
    q.evaluate("(localStorage.clear(), void indexedDB.deleteDatabase('aykplus'))"); q.reload(); boot(q)
    q.evaluate(K_SEED); q.wait_for_timeout(250)
    hits = []
    for name, js in EN_SCREENS:
        if name == "en-n-bugun":
            q.evaluate("setLang('en')"); q.evaluate("loadFoodsEn()"); q.wait_for_function("typeof USDA_EN !== 'undefined'"); q.wait_for_timeout(300)
            # tarayıcının kendi sınaması: harfsiz Türkçe kelime ve Türkçe harf yakalanır, kullanıcı içeriği yakalanmaz
            pr = q.evaluate("""(js) => { const box = document.createElement('div'); box.id = 't52probe'; box.style.cssText = 'position:fixed;top:0;left:0;z-index:99999';
              box.innerHTML = '<p>Show Tumu</p><p>10 dk rest</p><p>yeni çay</p><p>1. GÜN: Üst Vücut A</p><p>Sushi Kaydet Rutinim</p>'; document.body.appendChild(box);
              const h = eval(js)('#t52probe'); box.remove(); return h.map(x => x.m); }""", TR_WORD_SCAN_JS)
            check(pr == ["Tumu", "dk", "ç", "Kaydet"], "b: tarayıcı öz-sınaması (Tumu, dk, ç, Kaydet yakalanır; fikstür gün adı ve rutin adı hariç): %s" % pr)
        q.evaluate("() => { " + js + " }"); q.wait_for_timeout(200)
        if name in ("en-n-bugun", "en-p-genel"): check(q.evaluate("curLang()") == "en", "b: %s İngilizce" % name)
        hits += [(name, h["t"], h["m"]) for h in q.evaluate(TR_WORD_SCAN_JS, EN_ROOT.get(name))]
    check(not hits, "b: %d İngilizce ekranda Türkçe harf/kelime yok: %s" % (len(EN_SCREENS), hits[:8]))
    c.close()
    c, q = ctx3("en-GB", SPLASH_ANIM); q.clock.set_fixed_time(FIXED_TIME); q.goto(URL); boot(q)
    q.evaluate("(localStorage.clear(), void indexedDB.deleteDatabase('aykplus'))"); q.reload(); boot(q)
    hits = []
    for name, js in EN_ONBOARD_SCREENS:
        if js: q.evaluate("() => { " + js + " }")
        q.wait_for_timeout(150)
        hits += [(name, h["t"], h["m"]) for h in q.evaluate(TR_WORD_SCAN_JS, "#onboard")]
    check(not hits and q.get_attribute("#onboard", "data-step") == "7", "b: İngilizce kurulum 1–7'de Türkçe harf/kelime yok (dil seçicideki 'Türkçe' hariç): %s" % hits[:8])
    c.close()
    # I1: örnek programsız kurulumda varsayılan gün adı o anki dilde (en: "Day 1", tr: "1. Gün")
    for lang, loc, want in (("en", "en-GB", "Day 1"), ("tr", "tr-TR", "1. Gün")):
        c, q = ctx3(loc, SPLASH_ANIM); q.goto(URL); boot(q)
        q.evaluate("(localStorage.clear(), void indexedDB.deleteDatabase('aykplus'))"); q.reload(); boot(q)
        nm = q.evaluate("""(lang) => { openOnboarding(); Object.assign(obDraft, { sex: 'male', age: '30', height: '175', weight: '75', goal: 'keep', act: 'mid', exp: 'new', prog: false, lang });
          finishOnboarding(); return state.workoutDays.map(d => d.name); }""", lang)
        check(nm == [want], "I1: %s kurulum, örnek programsız gün adı %r: %s" % (lang, want, nm))
        c.close()
    check(errs == [], "sayfa hatası yok: " + str(errs[:3]))
    b.close()
finally:
    srv.terminate()
print("BAŞARISIZ:" if fails else "TÜMÜ GEÇTİ", fails)
sys.exit(1 if (fails or errs) else 0)
