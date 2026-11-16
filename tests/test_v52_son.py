# v52 bölüm 1 (görev 1): Mobilite rehberleri ("Nasıl yapılır"), kütüphane notları ve Türkçe parantezli hareket adları İngilizce.
# Kayıtlı değerler (it.name, rehber anahtarı, mobilityLog) Türkçe/ham kalır; yalnız İngilizcede yeni eklenen kütüphane notu İngilizce (karar 2).
import os, sys, re, subprocess, time
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
    check(errs == [], "sayfa hatası yok: " + str(errs[:3]))
    b.close()
finally:
    srv.terminate()
print("BAŞARISIZ:" if fails else "TÜMÜ GEÇTİ", fails)
sys.exit(1 if (fails or errs) else 0)
