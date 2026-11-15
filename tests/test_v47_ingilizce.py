# v47 bölüm 1: ortak metinler (yedek bandı, uiAsk, bildirim, dinlenme sayacı, üst panel) İngilizce; Türkçe aynı.
import os, sys, re, subprocess, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8805'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = "http://localhost:8805/index.html"
TR_CH = re.compile(r"[çğıöşüÇĞİÖŞÜ]")
BK = "Son yedeğin {n} gün önce. Verilerini korumak için yedekle."
def boot(pg): pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(80)

try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, locale="en-US")
    ctx.add_init_script(TEST_INIT); ctx.add_init_script("window.AYK_TEST_EN = true")
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL); boot(pg)
    pg.evaluate("() => { window.hasMeaningfulData = () => true; state.lastBackupAt = Date.now() - 12 * DAY_MS; state.backupSnoozeUntil = 0; saveState(); }")
    def banner():
        pg.evaluate("renderBanner()")
        return pg.evaluate("""() => ({ txt: $('backupBannerText').textContent, hidden: $('backupBanner').classList.contains('hidden'),
          btns: [...document.querySelectorAll('#backupBanner button')].map(x => (x.textContent + ' ' + (x.getAttribute('aria-label') || '')).trim()) })""")
    LAST_BTN = "$('restPill').querySelector('button:last-child').textContent"
    # --- Türkçe: eskisiyle aynı ---
    tr = banner()
    check(not tr["hidden"] and tr["txt"] == "Son yedeğin 12 gün önce. Verilerini korumak için yedekle.", "tr: yedek bandı metni aynı: " + tr["txt"])
    check(tr["btns"] == ["Yedekle", "Uyarıyı 3 gün gizle"], "tr: yedek bandı düğmeleri aynı: %s" % tr["btns"])
    pg.evaluate("void manualNewDay()"); pg.wait_for_selector("#uiDialog:not(.hidden)")
    d = pg.evaluate("() => [$('uiDlgTitle').textContent, $('uiDlgMsg').textContent, $('uiDlgOk').textContent, $('uiDlgCancel').textContent]")
    check(d == ["Yeni güne geçilsin mi?", "Su, takviye, öğün ve mobilite tikleri sıfırlanır. Bugünün özeti Beslenme → Geçmiş'e kaydedilir.", "Yeni güne geç", "Vazgeç"], "tr: gün dönümü penceresi aynı")
    pg.click("#uiDlgCancel")
    check(pg.evaluate("[" + LAST_BTN + ", $('profileBtn').getAttribute('aria-label')]") == ["Atla", "Profil"], "tr: Atla / Profil aynı")
    check(pg.evaluate("[timerLabelText('Dinlenme'), timerLabelText('Dinlenme • Squat')]") == ["Dinlenme", "Dinlenme • Squat"], "tr: sayaç etiketi aynı")
    pg.evaluate("toast(t('Hata: {m}', { m: 'x' }), 'error')")
    check(pg.evaluate("$('toastWrap').lastElementChild.textContent") == "Hata: x", "tr: Hata bildirimi aynı")
    # --- İngilizce ---
    pg.evaluate("() => { state.settings.lang = 'en'; applyStaticI18n(); renderAll(); }")
    en = banner()
    check(not TR_CH.search(en["txt"]) and "12 days ago" in en["txt"], "en: yedek bandı İngilizce: " + en["txt"])
    check(en["btns"] == ["Back up", "Hide reminder for 3 days"], "en: yedek bandı düğmeleri: %s" % en["btns"])
    pg.evaluate("state.lastBackupAt = 0; state.createdAt = Date.now() - 12 * DAY_MS; renderBanner()")
    t0 = pg.evaluate("$('backupBannerText').textContent")
    check(not TR_CH.search(t0) and t0.startswith("You haven't"), "en: hiç yedek yok metni: " + t0)
    one = pg.evaluate("tn(1, '%s')" % BK); two = pg.evaluate("tn(2, '%s')" % BK)
    check(one.startswith("Your last backup was 1 day ago") and "2 days ago" in two, "en: tn tekil/çoğul")
    pg.evaluate("void manualNewDay()"); pg.wait_for_selector("#uiDialog:not(.hidden)")
    d = pg.evaluate("() => [$('uiDlgTitle').textContent, $('uiDlgMsg').textContent, $('uiDlgOk').textContent, $('uiDlgCancel').textContent]")
    check(d == ["Start a new day?", "Water, supplements, meals and mobility check-offs will be reset. Today's summary is saved in Nutrition → History.", "Start new day", "Cancel"], "en: gün dönümü uiAsk penceresi: %s" % d)
    check(not any(TR_CH.search(x) for x in d), "en: pencere Türkçe harf içermez")
    pg.click("#uiDlgCancel")
    pg.evaluate("void uiAlert(t('Fotoğraf yüklenemedi'), t('Bu fotoğraf açılamadı. Başka bir fotoğraf seçmeyi dene.'))"); pg.wait_for_selector("#uiDialog:not(.hidden)")
    d = pg.evaluate("() => [$('uiDlgTitle').textContent, $('uiDlgOk').textContent, $('uiDlgCancel').classList.contains('hidden')]")
    check(d == ["Couldn't upload photo", "OK", True], "en: uiAlert düğmesi OK: %s" % d)
    pg.click("#uiDlgOk")
    pg.evaluate("void askText(t('Fotoğraf yüklenemedi'))"); pg.wait_for_selector("#uiDialog:not(.hidden)")
    check(pg.evaluate("[$('uiDlgOk').textContent, $('uiDlgCancel').textContent]") == ["Save", "Cancel"], "en: askText varsayılan Save/Cancel")
    pg.click("#uiDlgCancel")
    check(pg.evaluate("[" + LAST_BTN + ", $('profileBtn').getAttribute('aria-label')]") == ["Skip", "Profile"], "en: Skip / Profile")
    check(pg.evaluate("[timerLabelText('Dinlenme'), timerLabelText('Dinlenme • Squat'), timerLabelText('Plank')]") == ["Rest", "Rest • Squat", "Plank"], "en: sayaç etiketi, hareket adı dokunulmaz")
    pg.evaluate("startTimer(1, 'Dinlenme • Squat')"); pg.wait_for_timeout(1600)
    tt = pg.evaluate("[$('restPillTime').textContent, $('toastWrap').textContent]")
    check(tt[0] == "DONE" and "Rest • Squat over" in tt[1], "en: sayaç bitişi ve bildirim: %s" % tt)
    check(pg.evaluate("JSON.parse(localStorage.getItem('ayk_timer') || 'null')") is None, "sayaç kaydı bitince silinir")
    pg.evaluate("toast(t('Veriler kaydedilemedi! Hemen yedek al.'), 'error')")
    tx = pg.evaluate("$('toastWrap').lastElementChild.textContent")
    check(tx == "Your data couldn't be saved. Back it up now.", "en: kayıt hatası bildirimi: " + tx)
    pg.evaluate("applyTabVisibility()")
    check(pg.evaluate("$('tabTitle').textContent") == "Nutrition", "en: sekme başlığı")
    a = pg.evaluate("$('nutriThemeBtn').getAttribute('aria-label')")
    check(not TR_CH.search(a) and a.startswith("Switch to"), "en: tema düğmesi etiketi: " + a)
    # --- Türkçeye dönüş ---
    pg.evaluate("() => { state.settings.lang = 'tr'; applyStaticI18n(); renderAll(); state.lastBackupAt = Date.now() - 12 * DAY_MS; renderBanner(); }")
    check(pg.evaluate("[" + LAST_BTN + ", $('profileBtn').getAttribute('aria-label'), $('backupBannerText').textContent]") == ["Atla", "Profil", "Son yedeğin 12 gün önce. Verilerini korumak için yedekle."], "Türkçeye dönüş: metinler geri geldi")
    # ===== bölüm 2a: Beslenme (Bugün, Menülerim tam; Besinler/Geçmiş yalnız statik işaretleme; 2. yarı genişletir)
    def txt_of(ids):
        # görünen metin + aria-label/placeholder; kapsam dışı (09/04/11 dosyaları) kutular çıkarılır; kullanıcı verisi adları silinir
        return pg.evaluate("""(ids) => {
          const names = new Set();
          const add = x => { if (x && String(x).trim()) names.add(String(x)); };
          const lists = [state.meals, state.restMeals];
          if (state.dayPlan) ['train', 'rest'].forEach(k => { if (Array.isArray(state.dayPlan[k])) lists.push(state.dayPlan[k]); });
          const db = getFoodDB();
          lists.forEach(ms => ms.forEach(m => { add(m.title); add(String(m.title).split(':')[0]); add(m.targetNote); m.items.forEach(i => { if (i.est) add(i.est.name); else if (db[i.foodId]) add(db[i.foodId].name); }); }));
          state.supplementList.forEach(x => add(x.name));
          Object.values(state.customFoods || {}).forEach(f => add(f.name));
          (state.combos || []).forEach(c => add(c.name));
          let out = '';
          ids.forEach(id => {
            const el = document.getElementById(id).cloneNode(true);
            ['suppList', 'suppCounter', 'microLine', 'coachHint', 'foodHead', 'foodMealChips', 'foodSuggest', 'foodCats', 'foodList', 'nutriHistory'].forEach(x => { const n = el.querySelector('#' + x); if (n) n.remove(); });
            out += ' ' + el.textContent;
            el.querySelectorAll('[aria-label],[placeholder]').forEach(n => { out += ' ' + (n.getAttribute('aria-label') || '') + ' ' + (n.getAttribute('placeholder') || ''); });
          });
          [...names].sort((a, b) => b.length - a.length).forEach(n => { out = out.split(n).join(' '); });
          return out;
        }""", ids)
    def view(v): pg.evaluate("setNutriView('%s')" % v); pg.wait_for_timeout(60)
    def tr_free(label, ids):
        x = txt_of(ids); m = TR_CH.findall(x)
        check(not m, label + ": Türkçe harf yok" + ("" if not m else " -> " + str(sorted(set(re.findall(r".{0,25}[çğıöşüÇĞİÖŞÜ].{0,25}", x)))[:6])))
    # --- Türkçe: temel metinler aynı
    pg.evaluate("() => { state.settings.lang = 'tr'; applyStaticI18n(); state.settings.goal = 'lose'; renderAll(); }")
    view("today")
    check(pg.evaluate("[...document.querySelectorAll('#nutriNav button')].map(b => b.textContent)") == ["Bugün", "Menülerim", "Besinler", "Geçmiş"], "tr: alt sekmeler aynı")
    check(pg.evaluate("[$('btnTrain').textContent, $('btnRest').textContent, $('mnTrain').textContent]") == ["Antrenman günü", "Dinlenme günü", "Antrenman menüsü"], "tr: gün tipi düğmeleri aynı")
    check(re.fullmatch(r"Menü · [\d.]+ kcal", pg.evaluate("$('mmPlan').textContent.replace(/\\s+/g, ' ').trim()")) is not None, "tr: halka düğmesi 'Menü · N kcal'")
    check(re.fullmatch(r"Yenen · [\d.]+ · \d+/\d+", pg.evaluate("$('mmEaten').textContent.replace(/\\s+/g, ' ').trim()")) is not None, "tr: halka düğmesi 'Yenen · N · a/b'")
    check(pg.evaluate("$('calStatus').textContent.trim()").startswith(("Kalan", "Aşım")), "tr: halka durumu Kalan/Aşım")
    check(pg.evaluate("$('waterNote').textContent").startswith("Kilona göre:"), "tr: su notu")
    check(pg.evaluate("[unitL(3, 'adet'), unitL(1, 'g'), unitL(2, 'ölçek'), t('P|makro'), t('K|makro'), t('Y|makro'), tn(2, '{n} besin')]") == ["adet", "g", "ölçek", "P", "K", "Y", "2 besin"], "tr: birim ve makro harfleri aynı")
    check(pg.evaluate("[t('{n} {unit} kaldı', { n: '5', unit: 'g' }), t('%{p}', { p: '40' }), tn(1, '{n} öğün menüye kaydedildi')]") == ["5 g kaldı", "%40", "1 öğün menüye kaydedildi"], "tr: yer tutuculu cümleler aynı")
    check(pg.evaluate("repeatLabel(todayStr((() => { const y = logicalNow(); y.setDate(y.getDate() - 1); return y; })()))") == "Dünkü gibi", "tr: 'Dünkü gibi'")
    view("menus")
    check(re.fullmatch(r"(Antrenman|Dinlenme) menüsü · hedef [\d.]+ kcal", pg.evaluate("$('planSub').textContent")) is not None, "tr: planSub Menülerim")
    mt = pg.evaluate("$('menuTotal').textContent")
    check("Menü toplamı" in mt and "kcal hedef" in mt and "protein" in mt and "karb" in mt and "yağ" in mt, "tr: menü toplamı kartı aynı")
    pg.evaluate("toggleMenuMeal(0)")
    check(re.search(r"\d+P \d+K \d+Y", pg.evaluate("$('mealsContainer').textContent")) is not None, "tr: makro hapları 'NP NK NY'")
    # --- İngilizce
    pg.evaluate("setLang('en')"); pg.wait_for_timeout(100)
    pg.evaluate("""() => {
      state.settings.goal = 'lose'; renderAll();
      const ms = dayMeals(); toggleMealEdit(0);
      if (ms.length > 1) toggleMealDone(1);
      const c = ensureDayCopy(); if (c[0].items.length) dayChangeAmount(0, 0, 1);
      if (c.length > 2) c[2].items.push({ foodId: '_est', amount: 1, est: { name: 'Pizza', cal: 800, p: 30, c: 90, f: 30 } });
      renderAll();
    }""")
    view("today")
    tr_free("en: Bugün", ["nvToday"])
    st = pg.evaluate("[$('btnTrain').textContent, $('btnRest').textContent, $('mmPlan').textContent.replace(/\\s+/g, ' ').trim(), $('mmEaten').textContent.replace(/\\s+/g, ' ').trim().slice(0, 7)]")
    check(st[:2] == ["Training day", "Rest day"] and re.fullmatch(r"Plan · [\d,]+ kcal", st[2]) is not None and st[3] == "Eaten ·", "en: gün tipi ve halka düğmeleri: %s" % st)
    check(pg.evaluate("[...document.querySelectorAll('#nutriNav button')].map(b => b.textContent)") == ["Today", "Plans", "Foods", "History"], "en: alt sekmeler")
    ct = pg.evaluate("$('todayMeals').textContent")
    check("Mark eaten" in ct or "Eaten" in ct, "en: öğün düğmeleri (Mark eaten / Eaten)")
    check("estimated" in ct and "Pizza" in ct, "en: tahmini giriş satırı")
    check("Ate half" in ct and "Ate out" in ct and "Save as combo" in ct, "en: düzenleme paneli düğmeleri")
    check(pg.evaluate("$('dayDiffBanner') ? $('dayDiffBanner').textContent.trim() : ''").startswith("You've made changes for today only"), "en: bugüne özel değişiklikler bandı")
    check(pg.evaluate("[unitL(3, 'adet'), unitL(1, 'adet'), unitL(1, 'g'), unitL(2, 'ölçek'), t('P|makro') + t('K|makro') + t('Y|makro'), tn(1, '{n} besin'), tn(2, '{n} besin')]") == ["pcs", "pc", "g", "scoops", "PCF", "1 food", "2 foods"], "en: birim çoğulu ve makro harfleri")
    check(pg.evaluate("$('calStatus').textContent.trim()").startswith(("Remaining", "Over")), "en: halka durumu")
    check(pg.evaluate("$('waterNote').textContent").startswith("Based on your weight:") and pg.evaluate("$('waterPct').textContent").endswith("%"), "en: su notu ve yüzde")
    view("menus")
    pg.evaluate("""() => { toggleMenuMeal(0); toggleWeightScale(true); state.settings.calAdjust = 150; state.deficit = 500; renderAll(); }""")
    tr_free("en: Menülerim (kayıp hedefi, gramaj açık)", ["nvMenus"])
    check(re.fullmatch(r"(Training|Rest)-day plan · target [\d,]+ kcal", pg.evaluate("$('planSub').textContent")) is not None, "en: planSub")
    check(re.search(r"\d+P \d+C \d+F", pg.evaluate("$('mealsContainer').textContent")) is not None, "en: makro hapları 'NP NC NF'")
    infos = {}
    for g in ("keep", "gain", "lose"):
        pg.evaluate("state.settings.goal = '%s'; state.settings.gainPace = 'mid'; renderAll();" % g)
        view("menus")
        infos[g] = pg.evaluate("$('timelineInfo').textContent")
        tr_free("en: Menülerim hedef=" + g, ["nvMenus"])
    check(infos["keep"].startswith("Maintaining your weight") and not TR_CH.search(infos["gain"] + infos["lose"]), "en: hedef bilgisi satırları: %s" % infos)
    check(pg.evaluate("[$('goalLose').textContent, $('goalKeep').textContent, $('goalGain').textContent, $('paceMid').textContent]") == ["Lose", "Maintain", "Gain", "Moderate"], "en: Ver/Koru/Al ve hız düğmeleri")
    sc = pg.evaluate("$('scaleCard').textContent")
    check("Portion scaling" in sc and "Make these the new base amounts" in sc and "calorie coach adjusted your target by +150 kcal" in sc, "en: gramaj kartı ve koç notu")
    # boş menü kartı
    pg.evaluate("() => { window.__sv = state.meals; state.meals = []; state.dayPlan = null; renderAll(); }")
    view("today"); tr_free("en: Bugün (boş menü)", ["nvToday", "todayMeals"])
    check("Add your first meal" in pg.evaluate("$('todayMeals').textContent"), "en: boş menü kartı")
    view("menus"); tr_free("en: Menülerim (boş menü)", ["nvMenus"])
    pg.evaluate("() => { state.meals = window.__sv; renderAll(); }")
    bal = pg.evaluate("balanceDay(-1).msg")
    check(not TR_CH.search(bal), "en: günü dengele mesajı: " + bal)
    # dışarıda yedim: ipucu ve uyarı
    pg.evaluate("() => { state.dayPlan = null; renderAll(); openFreeMeal(0); }")
    pg.evaluate("$('fmKcal').value = '4000'; updateFreeMealHint()")
    fh = pg.evaluate("$('fmHint').textContent")
    check(not TR_CH.search(fh) and "With this entry" in fh, "en: dışarıda yedim ipucu: " + fh)
    pg.evaluate("$('fmKcal').value = ''; void saveFreeMeal()"); pg.wait_for_selector("#uiDialog:not(.hidden)")
    d = pg.evaluate("() => [$('uiDlgTitle').textContent, $('uiDlgMsg').textContent]")
    check(d == ["Calories missing", "Enter the estimated calories (e.g. 850)."], "en: kalori uyarısı: %s" % d)
    pg.click("#uiDlgOk")
    pg.evaluate("closeModal('freeMealModal')")
    # Besinler ve Geçmiş: yalnız statik işaretleme (dinamik içerik 2. yarıda)
    view("foods"); tr_free("en: Besinler (statik)", ["nvFoods"])
    check(pg.evaluate("[$('foodSearch').placeholder, $('foodSearch').getAttribute('aria-label')]") == ["Search foods (chicken, lentils, oats...)", "Search foods"], "en: besin arama alanı")
    view("history"); tr_free("en: Geçmiş (statik)", ["nvHistory"])
    # --- Türkçeye dönüş
    pg.evaluate("setLang('tr')"); pg.wait_for_timeout(100); view("today")
    check(pg.evaluate("[$('btnTrain').textContent, $('mmPlan').textContent.replace(/\\s+/g, ' ').trim().slice(0, 6), $('nutriNav').firstChild.textContent]") == ["Antrenman günü", "Menü ·", "Bugün"], "Türkçeye dönüş: Beslenme metinleri geri geldi")
    check(errs == [], "sayfa hatası yok: " + str(errs[:3]))
    b.close()
finally:
    srv.terminate()
print("BAŞARISIZ:" if fails else "TÜMÜ GEÇTİ", fails)
sys.exit(1 if (fails or errs) else 0)
