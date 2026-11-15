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
    check(d == ["Start a new day?", "Water, supplement, meal and mobility ticks will be reset. Today's summary is saved in Nutrition → History.", "Start new day", "Cancel"], "en: gün dönümü uiAsk penceresi: %s" % d)
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
    check(tt[0] == "DONE" and "Rest • Squat: done" in tt[1], "en: sayaç bitişi ve bildirim: %s" % tt)
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
          // besin veritabanı adları/kategorileri/notları/porsiyon adları veridir (v49); yalnız Türkçe harfliler gerekir
          const addTr = x => { if (x && /[çğıöşüÇĞİÖŞÜ]/.test(String(x))) { add(x); const y = typeof stripEmoji === 'function' ? stripEmoji(String(x)) : String(x); add(y); add(y.toLocaleUpperCase('en-GB')); } };
          Object.values(db).forEach(f => { addTr(f.name); addTr(f.cat); addTr(f.note); addTr(f.kx); (f.portions || []).forEach(p => addTr(p[0])); (f.aliases || []).forEach(addTr); });
          Object.values(state.customFoods || {}).forEach(f => addTr(f.cat));
          (state.supplementList || []).forEach(x => { add(x.unit); add(x.note); add(x.timeLabel); });
          (state.combos || []).forEach(c => add(c.name));
          let out = '';
          ids.forEach(id => {
            const el = document.getElementById(id).cloneNode(true);
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

    # ===== bölüm 2b: Besinler, Geçmiş, takviye kartı, pencereler (04, 11, 09 renderSupps/coachHintText)
    pg.evaluate("""() => {
      state.settings.lang = 'tr'; applyStaticI18n();
      const db0 = getFoodDB(); const fid0 = Object.keys(db0).find(i => !isHiddenFood(db0[i]));
      state.customFoods['custom_t1'] = { name: '⭐ Test besin', cat: '⭐ Özel Eklediklerim', unit: 'adet', step: 1, def: 1, p: 5, c: 5, f: 5 };
      state.customFoods['custom_recipe_t2'] = { name: '🍲 Test tarif', cat: '🍲 Tariflerim', unit: 'g', step: 10, def: 100, p: .1, c: .1, f: .1, kcal: 1.6, recipe: { items: [{ foodId: fid0, amount: 100 }], cooked: 200 } };
      invalidateFoodDB();
      state.combos = [{ id: 'combo_t1', name: 'Test kombo', items: [{ foodId: fid0, amount: 100 }] }];
      state.recentFoods = [fid0];
      const k = n => { const d = logicalNow(); d.setDate(d.getDate() - n); return todayStr(d); };
      [1, 2, 3, 5, 9].forEach((n, i) => { state.dailyLogs[k(n)] = { eatenKcal: 2000 + i * 150, eatenP: 120, kcal: 2100, calTarget: 2200, proTarget: 150, water: 2.5, mealsDone: 3, mealsTotal: 4, supps: 2, dayType: i % 2 ? 'rest' : 'train', meals: [] }; });
      state.weightLogs.push({ date: '01 Oca', weight: 80, ts: Date.now() - 86400000 });
      state.supplementList = [
        { id: 'sa', name: 'Test A', time: 'morning', dose: 5, unit: 'g', step: 1, min: 1, max: 10 },
        { id: 'sb', name: 'Test B', time: 'pre', note: 'Not B' }, { id: 'sc', name: 'Test C', time: 'bed' },
        { id: 'sd', name: 'Test D', time: 'custom', timeLabel: 'Etiket D' }, { id: 'se', name: 'Test E' }, { id: 'sf', name: 'Test F', time: 'custom' }];
      suppEdit = false; state.settings.goal = 'lose'; renderAll();
    }""")
    YEST = "todayStr((() => { const y = logicalNow(); y.setDate(y.getDate() - 1); return y; })())"
    # --- Türkçe: aynı kalanlar
    check(pg.evaluate("labelCheck(null, 40, 40, 40, 100)[0]") == "Protein + karb + yağ (120 g), 100 g'ı aşıyor.", "tr: labelCheck cümlesi aynı")
    check(pg.evaluate("labelCheck(100, 10, 10, 10, 100)[0]") == "Yazan kalori 100, makrolardan hesaplanan 170.", "tr: labelCheck kalori cümlesi aynı")
    check(pg.evaluate("labelCheck(700, 10, 10, 10, 100)[0]").endswith("Kalori yerine kilojoule (kJ) yazılmış olabilir.") or pg.evaluate("labelCheck(700, 10, 10, 10, 100)[0]").startswith("Yazan kalori 700"), "tr: labelCheck kJ cümlesi")
    rt = pg.evaluate("foodRemainingText(0, 0)")
    check(re.search(r"kcal</strong> (kalır|aşar) · ", rt) is not None, "tr: kalan metni biçimi: " + rt)
    check(pg.evaluate("[foodRemainPrefix(null), foodRemainPrefix(1)]") == ["Bugün ", "Ekledikten sonra bugün "], "tr: kalan önekleri aynı")
    check(pg.evaluate("[tn(2, '{n} besinde lif/tuz verisi yok'), tn(3, '{n} gün kayıt'), tn(2, '{left} / {n} ürün alınacak', { left: 1 })]") == ["2 besinde lif/tuz verisi yok", "3 gün kayıt", "1 / 2 ürün alınacak"], "tr: tn cümleleri aynı")
    check(pg.evaluate("repeatedMsg({ title: '2. Öğün: Öğle', id: 'x' }, " + YEST + ")") == "2. Öğün: dünkü öğün tekrarlandı (yalnızca bugün)", "tr: dünkü öğün tekrarlandı")
    check(pg.evaluate("repeatedMsg({ title: 'Kahvaltı', id: 'x' }, '2026-01-05')") == "Kahvaltı: 5 oca günkü öğün tekrarlandı (yalnızca bugün)", "tr: tarihli tekrar mesajı (küçük harf) aynı: " + pg.evaluate("repeatedMsg({ title: 'Kahvaltı', id: 'x' }, '2026-01-05')"))
    check(pg.evaluate("shopText().split('\\n')[0]").startswith("AYK+ alışveriş listesi (7 gün: "), "tr: alışveriş metni başlığı")
    view("today")
    check(pg.evaluate("$('suppCounter').textContent") == "0 / 6 Tamamlandı", "tr: takviye sayacı: " + pg.evaluate("$('suppCounter').textContent"))
    grp_tr = pg.evaluate("[...document.querySelectorAll('[data-supp-group]')].map(x => x.dataset.suppGroup)")
    check(grp_tr == ["İlk öğünle", "Antrenman / Gün içi", "Akşam / Uyku öncesi", "Etiket D", "Özel", "Diğer"], "tr: takviye grupları aynı: %s" % grp_tr)
    check(pg.evaluate("suppTimeLabel({ time: 'pre' })") == "Antrenman öncesi", "tr: takviye zamanı aynı")
    view("history")
    wc_tr = pg.evaluate("$('weekCard').textContent.replace(/\\s+/g, ' ')")
    check("SON 7 GÜN" in wc_tr.upper() and "HEDEF TUTTURMA" in wc_tr.upper() and "Hedefte (±%5)" in wc_tr and "Haftalık hedef" in wc_tr, "tr: hafta kartı metinleri aynı")
    check("Grafikler için İlerleme sekmesine git" in pg.evaluate("$('nutriHistory').textContent"), "tr: Geçmiş düğmesi aynı")
    # --- İngilizce
    pg.evaluate("setLang('en')"); pg.wait_for_timeout(100)
    view("history"); tr_free("en: Geçmiş (hafta kartı, günler)", ["nvHistory"])
    wc = pg.evaluate("$('weekCard').textContent.replace(/\\s+/g, ' ')")
    check("LAST 7 DAYS" in wc.upper() and "DAYS ON TARGET" in wc.upper() and "On target (±5%)" in wc and "Weekly target" in wc and "weigh-in" in wc, "en: hafta kartı metinleri: " + wc[:200])
    check("See charts in Progress" in pg.evaluate("$('nutriHistory').textContent"), "en: Geçmiş düğmesi")
    view("today"); tr_free("en: Bugün (takviye kartı, sayaç)", ["nvToday"])
    check(pg.evaluate("$('suppCounter').textContent") == "0 / 6 completed", "en: takviye sayacı")
    grp = pg.evaluate("[...document.querySelectorAll('[data-supp-group]')].map(x => x.dataset.suppGroup)")
    check(grp == ["With first meal", "Workout & daytime", "Evening & bedtime", "Etiket D", "Custom", "Other"], "en: takviye grupları: %s" % grp)
    check("Pre-workout" in pg.evaluate("$('suppList').textContent") or "Not B" in pg.evaluate("$('suppList').textContent"), "en: takviye satırı alt metni")
    check("5 g" in pg.evaluate("$('suppList').textContent"), "en: doz metni")
    pg.evaluate("() => { suppEdit = true; renderAll(); }")
    tr_free("en: takviye düzenleme modu", ["nvToday"])
    sl = pg.evaluate("$('suppList').textContent.replace(/\\s+/g, ' ')")
    check("Common supplements" in sl and "+ Add" in sl and "Done" in sl and "+ Dose" in sl and "Dose: 5 g" in sl, "en: düzenleme modu: " + sl[:240])
    check("Choose time" in pg.evaluate("$('suppList').innerHTML") and "Pre-workout" in pg.evaluate("$('suppList').innerHTML"), "en: zaman seçici seçenekleri")
    pg.evaluate("() => { state.supplementList = []; addPresetSupp('magnesium'); addPresetSupp('whey'); addPresetSupp('creatine'); }")
    pl = pg.evaluate("state.supplementList.map(s => [s.name, s.unit, s.note || '', s.dose])")
    check(pl == [["Magnesium", "mg", "1 hour before bed", 200], ["Whey protein", "scoop", "Post-workout", 1], ["Creatine monohydrate", "g", "With plenty of water", 5]], "en: hazır takviye eklenirken o anki dilde yazılır: %s" % pl)
    check(pg.evaluate("[normSearch('Magnesium'), normSearch('Whey protein')].map((n, i) => SUPP_PRESETS[i === 0 ? 4 : 3].m.test(n))") == [True, True], "en: İngilizce ad hazır takviye düzenli ifadesine uyar")
    pg.evaluate("() => { state.supplementList = []; suppEdit = false; renderAll(); }")
    check("Your supplement list is empty" in pg.evaluate("$('suppList').textContent"), "en: boş takviye listesi")
    check(not TR_CH.search(pg.evaluate("(() => { state.settings.calAdjust = 0; return coachHintText(); })()")), "en: koç ipucu Türkçe harf içermez")
    # Besinler
    view("foods")
    tr_free("en: Besinler (liste, çipler, öneriler)", ["nvFoods"])
    pg.evaluate("""() => { const db = getFoodDB(); const id = Object.keys(db).find(i => !isHiddenFood(db[i]) && db[i].unit === 'g' && db[i].fib != null && !db[i].kx && Array.isArray(db[i].portions)); window.__fid = id; selectFood(id); }""")
    pg.wait_for_timeout(80)
    tr_free("en: Besinler (seçili besin kartı)", ["nvFoods"])
    fc = pg.evaluate("$('foodSelCard').textContent.replace(/\\s+/g, ' ')")
    check("kcal" in fc and re.search(r"\d g P", fc) and re.search(r"\d g C", fc) and re.search(r"\d g F", fc) and "Add to meal" in fc, "en: seçili besin kartı: " + fc[:240])
    check(pg.evaluate("[...document.querySelectorAll('#foodSelCard [aria-label]')].map(x => x.getAttribute('aria-label')).filter(a => /^(Decrease|Increase|Serving sizes)/.test(a)).length") >= 3, "en: besin kartı aria etiketleri")
    ch = pg.evaluate("$('foodCats').textContent")
    check("All" in ch and "Recent" in ch and "Your combos" in ch and "Your recipes" in ch and "Your custom foods" in ch, "en: kategori çipleri: " + ch[:120])
    pg.evaluate("selectFood('custom_t1')"); tr_free("en: özel besin kartı", ["nvFoods"])
    check(all(x in pg.evaluate("$('foodSelCard').textContent") for x in ("Edit", "Delete")), "en: özel besin Edit/Delete")
    pg.evaluate("setFoodCat('combos')"); tr_free("en: kombolar", ["nvFoods"])
    pg.evaluate("selectCombo('combo_t1')"); tr_free("en: seçili kombo", ["nvFoods"])
    check("Delete combo" in pg.evaluate("$('foodList').textContent") and re.search(r"Combo · 1 food", pg.evaluate("$('foodList').textContent")), "en: kombo kartı")
    pg.evaluate("() => { state.combos = []; foodUI.sel = null; renderAll(); foodUI.cat = 'combos'; renderFoodList(); }")
    check("No combos yet." in pg.evaluate("$('foodList').textContent"), "en: kombo yok metni")
    pg.evaluate("() => { setFoodCat('all'); $('foodSearch').value = 'zzzqqq'; renderFoodList(); }")
    tr_free("en: arama sonucu yok", ["nvFoods"])
    pg.evaluate("() => { $('foodSearch').value = ''; renderFoodList(); }")
    check(not TR_CH.search(pg.evaluate("foodRemainingText(0, 0) + foodRemainPrefix(null) + foodRemainPrefix(1)")), "en: kalan metni")
    lcs = pg.evaluate("[labelCheck(null, 40, 40, 40, 100)[0], labelCheck(900, 1, 1, 1, 100)[0], labelCheck(100, 10, 10, 10, 100)[0], labelCheck(700, 10, 10, 10, 100).join(' ')]")
    check(not any(TR_CH.search(x) for x in lcs) and lcs[0] == "Protein + carbs + fat (120 g) is more than 100 g.", "en: labelCheck cümleleri: %s" % lcs)
    msgs = pg.evaluate("() => [repeatedMsg({ title: 'Meal 2: Lunch', id: 'x' }, " + YEST + "), repeatedMsg({ title: 'Breakfast', id: 'x' }, '2026-01-05'), repeatedMsg({ title: 'Breakfast', id: 'x' }, 'x'), shopText().split('\\n')[0], fmtShopAmt({ unit: 'adet' }, 3), fmtShopAmt({ unit: 'dilim' }, 1), fmtShopAmt({ unit: 'g' }, 1500), tn(1, '{left} / {n} ürün alınacak', { left: 1 })]")
    check(not any(TR_CH.search(x) for x in msgs) and msgs[0] == "Meal 2: repeated yesterday's meal (today only)" and "5 Jan" in msgs[1] and msgs[4] == "3 pcs" and msgs[5] == "1 slice", "en: bildirim cümleleri: %s" % msgs)
    # pencereler
    def modal(js, mid, extra=None):
        pg.evaluate(js); pg.wait_for_timeout(80)
        if extra: pg.evaluate(extra); pg.wait_for_timeout(300)
        return txt_of([mid])
    def mod_free(label, x, must=()):
        m = TR_CH.findall(x)
        check(not m, label + ": Türkçe harf yok" + ("" if not m else " -> " + str(sorted(set(re.findall(r".{0,25}[çğıöşüÇĞİÖŞÜ].{0,25}", x)))[:6])))
        for w in must: check(w in x, label + ": '" + w + "' var")
    mod_free("en: özel besin penceresi", modal("openCustomFoodModal()", "customFoodModal"), ("Create your own custom food", "Food name:", "Values are per", "1 serving", "Carbs (g):", "Cancel"))
    pg.evaluate("closeModal('customFoodModal')")
    mod_free("en: etiket formu", modal("openLabelForm('8690504012345', '')", "customFoodModal"), ("Enter label values", "isn't in the database"))
    pg.evaluate("closeModal('customFoodModal')")
    pg.evaluate("(() => { window.fetch = () => Promise.reject(new Error('offline-test')); })()")
    mod_free("en: barkod penceresi (geçersiz numara)", modal("openBarcode()", "barcodeModal", "stopScan(); void onBarcode('12345')") + " " + pg.evaluate("$('bcStatus').textContent"), ("Scan barcode", "Type the barcode number", "valid barcode number"))
    pg.evaluate("closeBarcode()")
    mod_free("en: barkod penceresi (ürün bulunamadı, elle giriş)", modal("openBarcode()", "barcodeModal", "void onBarcode('8690504012345')") + " " + pg.evaluate("$('bcStatus').textContent"), ("Couldn't reach the product database", "Enter label values"))
    pg.evaluate("closeBarcode()")
    pg.evaluate("(() => { window.fetch = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ status: 1, product: { product_name: 'Test bar', brands: 'Marka', nutriments: { proteins_100g: 50, carbohydrates_100g: 50, fat_100g: 50, 'energy-kcal_100g': 100 } } }) }); })()")
    mod_free("en: barkod penceresi (tutarsız ürün)", modal("openBarcode()", "barcodeModal", "void onBarcode('8690504012346')"), ("Compare with the label", "Edit from label", "Add anyway", "50 g P"))
    pg.evaluate("closeBarcode()")
    pg.evaluate("(() => { window.fetch = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ status: 1, product: { product_name: 'Test bar 2', nutriments: { proteins_100g: 10 } } }) }); })()")
    mod_free("en: barkod penceresi (eksik değerler)", modal("openBarcode()", "barcodeModal", "void onBarcode('8690504012347')"), ("Product found, but its nutrition values are incomplete", "Add manually"))
    pg.evaluate("closeBarcode()")
    mod_free("en: dışarıda yedim penceresi", modal("openFreeMeal(0)", "freeMealModal"), ("Ate out", "What did you eat? (optional)", "Rebalance my day", "Replace the foods in this meal", "Cancel"))
    pg.evaluate("closeModal('freeMealModal')")
    mod_free("en: tarif penceresi", modal("openRecipeModal()", "recipeModal", "(() => { rcp.items.push({ foodId: window.__fid, amount: 100 }); renderRecipe(); $('rcCooked').value = '150'; updateRecipeSummary(); })()"), ("New recipe", "Recipe name", "INGREDIENTS (RAW)", "Whole recipe", "Cooked, per 100 g"))
    pg.evaluate("closeModal('recipeModal')")
    mod_free("en: alışveriş penceresi", modal("openShopList()", "shopModal"), ("Weekly shopping list", "Copy to Notes", "Clear checkmarks", "Share", "Training days"))
    pg.evaluate("closeModal('shopModal')")
    mod_free("en: öğün penceresi", modal("openMealModal()", "mealModal"), ("Meal name", "Time (optional)", "Short note", "Meal "))
    pg.evaluate("closeModal('mealModal')")
    pg.evaluate("setNutriView('today')")
    # Türkçeye dönüş
    pg.evaluate("setLang('tr')"); pg.wait_for_timeout(100)
    view("foods")
    check("Tümü" in pg.evaluate("$('foodCats').textContent") and pg.evaluate("$('foodSearch').placeholder").startswith("Besin ara"), "Türkçeye dönüş: Besinler metinleri geri geldi")
    x = modal("openCustomFoodModal()", "customFoodModal")
    check("Kendi özel besinini tanımla" in x and "Besin Adı:" in x, "Türkçeye dönüş: özel besin penceresi")
    pg.evaluate("closeModal('customFoodModal')")
    # ===== bölüm 3: Profil (Hakkında hariç), Yedekleme, iç yedekler, kurtarma kartı, otomatik kayıt bildirimi, ölçü penceresi, ortak seçici
    SHOTS = os.path.join(REPO, "tests", "shots"); os.makedirs(SHOTS, exist_ok=True)
    def pf_text():
        return pg.evaluate("""() => {
          const el = document.getElementById('profilePage').cloneNode(true);
          ['#pfAbout', '[data-miss]', '[data-lang-opt="tr"]'].forEach(q => el.querySelectorAll(q).forEach(n => n.remove()));
          let out = el.textContent;
          el.querySelectorAll('[aria-label],[placeholder]').forEach(n => { out += ' ' + (n.getAttribute('aria-label') || '') + ' ' + (n.getAttribute('placeholder') || ''); });
          return out; }""")
    def pf_free(label, x=None):
        x = pf_text() if x is None else x; m = TR_CH.findall(x)
        check(not m, label + ": Türkçe harf yok" + ("" if not m else " -> " + str(sorted(set(re.findall(r".{0,25}[çğıöşüÇĞİÖŞÜ].{0,25}", x)))[:6])))
    def dlg():
        pg.wait_for_selector("#uiDialog:not(.hidden)")
        return pg.evaluate("() => [$('uiDlgTitle').textContent, $('uiDlgMsg').textContent, $('uiDlgOk').textContent, $('uiDlgCancel').textContent]")
    pg.evaluate("""() => { state.settings.lang = 'tr'; applyStaticI18n();
      state.weightLogs = [{ weight: 82, date: 'Başlangıç' }, { weight: 80.5, ts: Date.now(), date: 'x', bf: 18.5 }];
      state.weight = 80.5; state.measurements = []; state.missSearches = [{ q: 'çorba', n: 2, ts: Date.now() }];
      state.lastBackupAt = Date.now() - 3 * DAY_MS; saveState(); renderAll(); }""")
    # --- Türkçe: temel metinler aynı
    pg.evaluate("openProfile()"); pg.wait_for_timeout(200)
    check(pg.evaluate("[$('pfTitle').textContent, $('pfH1').textContent, $('pfH6').textContent, document.querySelector('label[for=setSex]').textContent, $('setActivity').options[0].textContent, $('setProtein').options[1].textContent]") == ["Profil", "KİŞİSEL BİLGİLER", "YEDEKLEME", "Cinsiyet", "Az (masa başı)", "Yüksek"], "tr: Profil başlıkları ve seçenekleri aynı")
    check(re.fullmatch(r"Son yedek: \d{2} \S+ \d{2}:\d{2} \(3 gün önce\)", pg.evaluate("$('lastBackupText').textContent")) is not None, "tr: son yedek satırı: " + pg.evaluate("$('lastBackupText').textContent"))
    wb = re.sub(r"\s+", " ", pg.evaluate("$('pfWeightBox').textContent"))
    check("Son tartı" in wb and "2 kayıt" in wb and "· %18,5 yağ" in wb and "Başlangıç" in wb, "tr: tartı kutusu metinleri aynı: " + wb)
    check("Bugünün hedefleri:" in pg.evaluate("$('pfTargetsBox').textContent") and pg.evaluate("$('pfTargetsBox').textContent").count("Karb") == 1, "tr: hedef kutusu aynı")
    check(pg.evaluate("$('pfMeasureBox').textContent").strip().startswith("Henüz ölçü eklemedin."), "tr: ölçü boş durumu aynı")
    check(pg.evaluate("$('setWaterHint').textContent").startswith(("80,5 kg × 35 ml", "Kilo")), "tr: su ipucu: " + pg.evaluate("$('setWaterHint').textContent"))
    pg.evaluate("localStorage.setItem(RESCUE_KEY, '{}'); renderProfile()")
    check(pg.evaluate("[$('pfRescueSave').textContent, $('pfRescueRestore').textContent, $('pfRescueDelete').textContent]") == ["İndir", "Geri yükle", "Sil"], "tr: kurtarma kartı düğmeleri aynı")
    pg.evaluate("void deleteRescue()"); d = dlg()
    check(d == ["Kurtarma kopyası silinsin mi?", "Okunamayan eski verinin kopyası telefondan silinir. Önce indirdiysen dosyan güvende.", "Sil", "Vazgeç"], "tr: kurtarma silme penceresi aynı")
    pg.click("#uiDlgCancel")
    pg.evaluate("$('setAge').value = '41'; $('setAge').dispatchEvent(new Event('change'))"); pg.wait_for_timeout(120)
    check(pg.evaluate("$('toastWrap').textContent").count("Kaydedildi") >= 1, "tr: otomatik kayıt bildirimi 'Kaydedildi'")
    pg.evaluate("$('setBf').value = '99'; $('setBf').dispatchEvent(new Event('change'))"); pg.wait_for_timeout(120)
    check("Yağ oranı %3 ile %60 arasında olmalı; eski değer geri geldi." in pg.evaluate("$('toastWrap').textContent"), "tr: yağ oranı hata bildirimi aynı")
    # --- İngilizce
    pg.evaluate("setLang('en')"); pg.wait_for_timeout(200)
    check(pg.evaluate("$('pfWeight').value") == '80.5', "en: kilo kutusu yeni dile göre yenilendi (80.5)")
    pg.evaluate("$('pfScroll').scrollTop = 0"); pg.screenshot(path=os.path.join(SHOTS, "v47_profil_en_ust.png"))
    pf_free("en: Profil (boş ölçü, kurtarma kartı görünür)")
    check(pg.evaluate("[$('pfTitle').textContent, $('pfH1').textContent, $('pfH3').textContent, $('pfH6').textContent, document.querySelector('label[for=setSex]').textContent, $('setActivity').options[0].textContent, $('setActivity').options[1].textContent, $('setProtein').options[0].textContent, $('setProtein').options[1].textContent]") == ["Profile", "PERSONAL DETAILS", "TARGETS", "BACKUP", "Sex", "Low (desk job)", "Moderate", "Standard", "High"], "en: Profil başlıkları ve seçenekleri")
    check(pg.evaluate("[...document.querySelectorAll('#pfTheme [data-theme-opt]')].map(b => b.textContent)") == ["System", "Dark", "Light"], "en: Görünüm düğmeleri")
    wb = re.sub(r"\s+", " ", pg.evaluate("$('pfWeightBox').textContent"))
    check("Last weigh-in" in wb and "2 entries" in wb and "· 18.5% body fat" in wb and "Start" in wb and "to gain" in wb, "en: tartı kutusu: " + wb)
    tb = re.sub(r"\s+", " ", pg.evaluate("$('pfTargetsBox').textContent"))
    check("Calories" in tb and "Carbs" in tb and "Fat" in tb and "Today's targets are based on" in tb, "en: hedef kutusu: " + tb[:80])
    cal_ = pg.evaluate("[getTargets().calTarget, $('pfTargetsBox').querySelector('.t-display').textContent]")
    check(cal_[0] >= 1000 and cal_[1] == "{:,}".format(round(cal_[0])), "en: Profil kalori hedefi >= 1000 biçimli sayı gösterir, '—' değil: %s" % cal_)
    mb_ = pg.evaluate("$('pfMeasureBox').textContent").strip()
    check(mb_.startswith("No measurements yet.") and "+ Add measurement" in mb_, "en: ölçü boş durumu")
    lb = pg.evaluate("$('lastBackupText').textContent")
    check(re.fullmatch(r"Last backup: \d{2} \w+,? \d{2}:\d{2} \(3 days ago\)", lb) is not None, "en: son yedek satırı: " + lb)
    check(pg.evaluate("$('setWaterHint').textContent").startswith(("80.5 kg", "Calculated")), "en: su ipucu: " + pg.evaluate("$('setWaterHint').textContent"))
    pg.evaluate("$('setWaterAuto').checked = false; updateWaterAutoHint()")
    check(pg.evaluate("$('setWaterHint').textContent") == "Off: the target you entered above is used.", "en: su ipucu kapalı")
    pg.evaluate("$('setWaterAuto').checked = true; updateWaterAutoHint()")
    check(pg.evaluate("[$('pfRescueSave').textContent, $('pfRescueRestore').textContent, $('pfRescueDelete').textContent]") == ["Download", "Restore", "Delete"], "en: kurtarma kartı düğmeleri")
    pg.evaluate("state.measurements = [{ ts: Date.now() - 9 * DAY_MS, bel: 92, kol: 35.5 }, { ts: Date.now(), bel: 90, kol: 36 }]; renderProfile()")
    ms_ = re.sub(r"\s+", " ", pg.evaluate("$('pfMeasureBox').textContent"))
    check("Waist" in ms_ and "Arm (biceps)" in ms_ and "Last measurement:" in ms_ and not TR_CH.search(ms_), "en: ölçü kutusu: " + ms_)
    pg.evaluate("$('pfScroll').scrollTop = $('pfScroll').scrollHeight / 2"); pg.screenshot(path=os.path.join(SHOTS, "v47_profil_en_orta.png"))
    pg.evaluate("$('pfSnaps').closest('details').open = true"); pg.wait_for_timeout(400)
    sn0 = pg.evaluate("$('pfSnaps').textContent")
    check(not TR_CH.search(sn0), "en: iç yedek listesi: " + sn0[:90])
    pg.evaluate("storageSnapshotNow()"); pg.wait_for_timeout(300)
    pg.evaluate("renderSnapList()"); pg.wait_for_timeout(400)
    sn1 = pg.evaluate("$('pfSnaps').textContent")
    check(not TR_CH.search(sn1), "en: iç yedek satırı: " + re.sub(r"\s+", " ", sn1)[:120])
    if pg.evaluate("!!document.querySelector('[data-snap]')"):
        check("Restore this version" in sn1 and re.search(r"Before changes|Nightly backup|Weekly backup|Before import|Before upgrade", sn1) is not None, "en: iç yedek türü etiketi ve düğmesi")
        pg.evaluate("void aykSnapRestore(document.querySelector('[data-snap]').dataset.snap)"); d = dlg()
        check(d == ["Restore this version?", "All your data will go back to how it was in this backup. If you change your mind, you can undo it straight afterwards.", "Restore this version", "Cancel"], "en: iç yedeğe dönme penceresi: %s" % d)
        pg.click("#uiDlgCancel")
    else:
        print("not: iç yedek satırı oluşmadı (eski mod?): " + sn1[:80])
    pg.evaluate("$('pfScroll').scrollTop = $('pfScroll').scrollHeight"); pg.screenshot(path=os.path.join(SHOTS, "v47_profil_en_alt.png"))
    pf_free("en: Profil (ölçüler dolu, Yedekleme açık, iç yedek listesi)")
    pg.evaluate("void deleteRescue()"); d = dlg()
    check(d == ["Delete recovery copy?", "The copy of your unreadable data will be deleted from this phone. If you've already downloaded it, your file is safe.", "Delete", "Cancel"], "en: kurtarma silme penceresi: %s" % d)
    pg.click("#uiDlgCancel")
    pg.evaluate("void restoreFromText('not json')"); d = dlg()
    check(d[0] == "Invalid backup" and d[1] == "This backup isn't valid. The file or code looks corrupted." and d[2] == "OK", "en: geçersiz yedek uyarısı: %s" % d)
    pg.click("#uiDlgOk")
    pg.evaluate("void restoreFromText('{\"meals\": []}')"); d = dlg()
    check(d == ["Restore this backup?", "All your current data will be replaced with this backup. Continue?", "Restore", "Cancel"], "en: yedek geri yükleme onayı: %s" % d)
    pg.click("#uiDlgCancel")
    pg.evaluate("void resetToDefaults()"); d = dlg()
    check(d == ["Erase all data", "All your data will be erased and the app will go back to its default settings. Continue?", "Continue", "Cancel"], "en: tüm veriyi sil (1. onay): %s" % d)
    pg.click("#uiDlgOk"); pg.wait_for_timeout(150); d = dlg()
    check(d == ["Final confirmation", "This can't be undone. Back up your data first. Erase everything?", "Erase", "Cancel"], "en: tüm veriyi sil (son onay): %s" % d)
    pg.click("#uiDlgCancel")
    pg.evaluate("$('pfWeight').value = '5'; profileLogWeight()"); d = dlg()
    check(d[:3] == ["Invalid weight", "Enter a weight between 30 and 300 kg (e.g. 98.4).", "OK"], "en: geçersiz kilo uyarısı: %s" % d)
    pg.click("#uiDlgOk"); pg.evaluate("fillProfileFields()")
    pg.evaluate("$('setAge').value = '42'; $('setAge').dispatchEvent(new Event('change'))"); pg.wait_for_timeout(120)
    tt_ = pg.evaluate("$('toastWrap').textContent")
    check("Saved" in tt_ and not TR_CH.search(tt_), "en: otomatik kayıt bildirimi 'Saved': " + tt_)
    check(pg.evaluate("[...$('toastWrap').querySelectorAll('button')].map(b => b.textContent).includes('Undo')"), "en: otomatik kayıt bildirimi 'Undo' düğmesi")
    pg.evaluate("$('setBf').value = '99'; $('setBf').dispatchEvent(new Event('change'))"); pg.wait_for_timeout(120)
    check("Body fat must be between 3% and 60%; the previous value was restored." in pg.evaluate("$('toastWrap').textContent"), "en: yağ oranı hata bildirimi")
    pg.evaluate("$('pfWeight').value = '9'; $('pfWeight').dispatchEvent(new Event('change'))"); pg.wait_for_timeout(120)
    check("Weight must be between 30 and 300 kg; not saved." in pg.evaluate("$('toastWrap').textContent"), "en: kilo hata bildirimi")
    pg.evaluate("fillProfileFields()")
    pg.evaluate("renderStorageMeter()"); pg.wait_for_timeout(300)
    check(re.fullmatch(r"\d+% full( · [\d.]+ MB)?", pg.evaluate("$('pfStorageTxt').textContent")) is not None, "en: kayıt alanı göstergesi: " + pg.evaluate("$('pfStorageTxt').textContent"))
    stm = pg.evaluate("[t(\"Telefondaki kayıt alanının %{p}'i dolu. Yedek dosyası kaydet (Profil → Yedekleme).\", { p: 85 }), t('Alan dolmak üzere. Hemen yedek dosyası kaydet; kayıt dolarsa yeni bilgiler kaydedilemez.')]")
    check(stm[0] == "Storage on this phone is 85% full. Save a backup file (Profile → Backup)." and stm[1].startswith("Storage is almost full."), "en: depolama uyarıları")
    pg.evaluate("openMeasureModal()"); pg.wait_for_timeout(120)
    mod_free("en: ölçü penceresi", txt_of(["chartModal"]), ("Add measurements (cm)", "Waist", "Hips", "Thigh", "Tip: measure every week or two", "Cancel", "Save"))
    pg.evaluate("closeModal('chartModal')")
    check(pg.evaluate("$('missClear').textContent.trim()") == "Clear list", "en: listeyi temizle düğmesi")
    pg.evaluate("closeProfile()")
    pg.evaluate("openPicker(t('Malzeme ekle'), [{ label: 'Group', short: 'Grp', items: Array.from({ length: 160 }, (_, i) => ({ label: 'Item ' + i })) }], () => {})"); pg.wait_for_timeout(120)
    pg.evaluate("$('pickerExtraBtn').textContent = 'x'")   # düğme etiketini çağıran verir (kapsam dışı)
    x = txt_of(["pickerModal"]) + " " + pg.evaluate("$('pickerSearch').placeholder")
    mod_free("en: seçici", x, ("All", "Search...", "10 more results; narrow your search."))
    pg.evaluate("$('pickerSearch').value = 'zzz'; renderPickerList()")
    check(pg.evaluate("$('pickerList').textContent.trim()") == "No results found.", "en: seçici sonuç yok")
    pg.evaluate("closeModal('pickerModal')")
    # --- Türkçeye dönüş
    pg.evaluate("setLang('tr')"); pg.wait_for_timeout(100)
    pg.evaluate("openProfile()"); pg.wait_for_timeout(200)
    check(pg.evaluate("[$('pfTitle').textContent, $('pfH6').textContent, $('pfRescueDelete').textContent, $('setWaterHint').textContent.slice(0, 4), $('lastBackupText').textContent.slice(0, 10)]") == ["Profil", "YEDEKLEME", "Sil", "80,5", "Son yedek:"], "Türkçeye dönüş: Profil metinleri geri geldi")
    check("Bel" in pg.evaluate("$('pfMeasureBox').textContent") and "Son ölçüm:" in pg.evaluate("$('pfMeasureBox').textContent"), "Türkçeye dönüş: ölçü kutusu")
    pg.evaluate("openPicker('X', [{ label: 'G', items: [{ label: 'a' }] }], () => {})")
    check(pg.evaluate("[$('pickerSearch').placeholder, $('pickerChips').firstElementChild.textContent]") == ["Ara...", "Tümü"], "Türkçeye dönüş: seçici metinleri")
    pg.evaluate("closeModal('pickerModal'); closeProfile(); localStorage.removeItem(RESCUE_KEY)")
    # statik anahtar denetimi: 04/11/09/markup'taki her anahtar EN'de; yer tutucular ve etiketler tutar
    import json as _json
    keys = set()
    lit = r'"((?:[^"\\\n]|\\.)*)"'
    for fnm in ["04-besinler-barkod.js", "11-mutfak-akilli.js", "09-kas-plaka-koc-takviye.js", "08-profil-yedek.js", "05-secici-hareket.js"]:
        raw = open(os.path.join(REPO, "src", "app", fnm), encoding="utf-8").read()
        for mm in re.finditer(r"(?<![.\w])t\(\s*" + lit, raw): keys.add(mm.group(1))
        for mm in re.finditer(r"(?<![.\w])tn\(\s*[^,()]+,\s*" + lit, raw): keys.add(mm.group(1))
    keys.update(["Son yedek: {d} ({n} gün önce)", "{w} kg × 35 ml = {b} L + 0,5 L kreatin → {tot} L", "{w} kg × 35 ml = {b} L → {tot} L", "Sıfırla|tüm veri", "AYK-yedek-{d}.json", "AYK-kurtarma-{d}.json", "{n} kayıt"])
    mk = open(os.path.join(REPO, "src", "markup.html"), encoding="utf-8").read()
    for mm in re.finditer(r'data-t(?:-aria|-ph)?="([^"]*)"', mk): keys.add(mm.group(1))
    def unesc(k):
        try: return _json.loads('"' + k + '"')
        except Exception: return k
    keys = {unesc(k) for k in keys}
    res = pg.evaluate("""(keys) => { const ph = s => (String(s).match(/\\{\\w+\\}/g) || []).sort().join(); const tg = s => (String(s).match(/<\\/?\\w+/g) || []).join();
      const out = { missing: [], ph: [], tag: [], stray: [] };
      keys.forEach(k => { const e = EN[k]; if (e === undefined) { out.missing.push(k); return; }
        const vs = typeof e === 'string' ? [e] : [e.one, e.other]; const base = k.split('|')[0];
        vs.forEach(v => { if (typeof v !== 'string') { out.missing.push(k); return; }
          if (ph(base) !== ph(v)) out.ph.push(k); if (tg(base) !== tg(v)) out.tag.push(k);
          if (/[<>&]/.test(v.replace(/<[^>]*>/g, '')) && !/^(Workout & daytime|Evening & bedtime|How we calculate & sources|VITAMINS & PERFORMANCE)$/.test(v)) out.stray.push(k); }); });
      const dyn = [...SUPP_TIMES.map(x => x[1]), ...SUPP_GROUPS.map(x => x[0]), ...SUPP_PRESETS.flatMap(p => [p.name, p.unit, p.note].filter(Boolean))];
      dyn.push(...MEASURES.map(m => m[1]), ...Object.values(SNAP_KIND_LABEL), 'Yedek', 'Kalori', 'Protein', 'Karb', 'Yağ');
      dyn.forEach(k => { if (EN[k] === undefined && !['g', 'mg'].includes(k)) out.missing.push(k); });
      return out; }""", sorted(keys))
    check(len(keys) > 250 and all(not v for v in res.values()), "statik denetim (%d anahtar): EN'de eksik, yer tutucu/etiket uyuşmazlığı, başıboş < > &: %s" % (len(keys), res))
    # ===== bölüm 4: denetimler (Task 5)
    # --- 4a. Review Focus 1: kayıtta tutulan varsayılan adlar (docs/i18n-kayitli-metinler.md: yeni kayıt "dile göre üret";
    #         var olan kayıt değişmez; sayı alanları (m.balanced) hiç metin değildir)
    def stored_defaults(mi):
        pg.evaluate("() => { try { if (profileIsOpen()) closeProfile(); } catch (e) {} setNutriView('today'); }"); pg.wait_for_timeout(60)
        return pg.evaluate("""() => {
          const o = {};
          openMealModal(null); o.mealDefault = $('mmName').value; closeModal('mealModal');
          openFreeMeal(%d); $('fmKcal').value = '500'; $('fmP').value = '20'; saveFreeMeal();
          const ms = dayMeals(); const est = ms[%d].items.filter(i => i.est).pop(); o.freeName = est && est.est.name;
          if (!state.supplementList.some(x => x.id === 'sup_t47')) { state.supplementList.push({ id: 'sup_t47', name: 'Test supp' }); renderAll(); }
          return o;
        }""" % (mi, mi))
    pg.evaluate("() => { state.settings.lang = 'tr'; applyStaticI18n(); renderAll(); }")
    title0 = pg.evaluate("state.meals[0].title")
    d_tr = stored_defaults(0)
    check(re.fullmatch(r"\d+\. Öğün: ", d_tr["mealDefault"]) is not None and d_tr["freeName"] == "Dışarıda yemek", "tr: kayıtlı varsayılan adlar Türkçe: %s" % d_tr)
    pg.evaluate("setLang('en')"); pg.wait_for_timeout(100)
    d_en = stored_defaults(1)
    check(re.fullmatch(r"Meal \d+: ", d_en["mealDefault"]) is not None and d_en["freeName"] == "Eating out", "en: yeni kayıt İngilizce ad alır (belge: dile göre üret): %s" % d_en)
    check(pg.evaluate("state.meals[0].title") == title0 and pg.evaluate("dayMeals()[0].items.filter(i => i.est).map(i => i.est.name)")[-1] == "Dışarıda yemek", "en: dil değişince var olan Türkçe kayıtlar değişmez")
    idx = pg.evaluate("state.supplementList.findIndex(x => x.id === 'sup_t47')")
    pg.evaluate("void setSuppTime(%d, 'custom')" % idx); pg.wait_for_selector("#uiDialog:not(.hidden)")
    pg.fill("#uiDlgInput", ""); pg.click("#uiDlgOk"); pg.wait_for_timeout(60)
    check(pg.evaluate("state.supplementList.find(x => x.id === 'sup_t47').timeLabel") == "Custom", "en: boş özel zaman etiketi kayda 'Custom'")
    cp = pg.evaluate("""() => { state.settings.separatePlans = false; const n = curMeals().length, t0 = curMeals()[0].title; copyMeal(0); const r = { title: curMeals()[1].title, toast: document.querySelector('.toast-wrap').textContent }; deleteMeal(1); r.del = document.querySelector('.toast-wrap').textContent; r.n = curMeals().length === n; r.t0 = t0; return r; }""")
    check(cp["title"] == cp["t0"] + " (copy)" and "Meal duplicated" in cp["toast"] and "deleted" in cp["del"] and cp["n"], "en: öğün kopyala/sil bildirimleri ve kopya adı İngilizce: %s" % cp)
    pg.evaluate("setLang('tr')"); pg.wait_for_timeout(100)
    cp = pg.evaluate("""() => { const t0 = curMeals()[0].title; copyMeal(0); const r = { title: curMeals()[1].title, t0 }; deleteMeal(1); return r; }""")
    check(cp["title"] == cp["t0"] + " (kopya)", "tr: kopya öğün adı tam ' (kopya)': %s" % cp)
    pg.evaluate("setLang('en')"); pg.wait_for_timeout(100)
    check(pg.evaluate("[...state.meals, ...state.restMeals].every(m => m.balanced == null || typeof m.balanced === 'number')"), "en: m.balanced sayı kalır (metin kaydedilmez)")
    # --- 4b. M7: düğüm listeleri önbellekte; yeniden tarama yalnız setLang / bayat önbellek; Türkçe değişmediyse hiç çalışmaz
    pg.evaluate("setLang('tr')"); pg.wait_for_timeout(60)
    r = pg.evaluate("""() => {
      const calls = { n: 0 }; const orig = Element.prototype.querySelectorAll, origD = Document.prototype.querySelectorAll;
      Element.prototype.querySelectorAll = function (q) { if (typeof q === 'string' && q.indexOf('data-t') >= 0) calls.n++; return orig.apply(this, arguments); };
      Document.prototype.querySelectorAll = function (q) { if (typeof q === 'string' && q.indexOf('data-t') >= 0) calls.n++; return origD.apply(this, arguments); };
      const out = {};
      const b0 = calls.n; for (let i = 0; i < 5; i++) applyStaticI18n(); out.repeat = calls.n - b0;
      setLang('en'); const b1 = calls.n; for (let i = 0; i < 5; i++) applyStaticI18n(); out.enRepeat = calls.n - b1;
      out.enText = document.querySelector('[data-t="Yedekle"]').textContent;
      setLang('tr'); out.trText = document.querySelector('[data-t="Yedekle"]').textContent;
      Element.prototype.querySelectorAll = orig; Document.prototype.querySelectorAll = origD;
      return out; }""")
    check(r["repeat"] == 0 and r["enRepeat"] == 0, "M7: tekrarlı applyStaticI18n yeniden taramaz (tr %s, en %s)" % (r["repeat"], r["enRepeat"]))
    check(r["enText"] == "Back up" and r["trText"] == "Yedekle", "M7/I1: dil değişince statik metin güncellenir, Türkçeye dönüş geri yazar: %s" % r)
    r2 = pg.evaluate("""() => {
      const h = document.createElement('div'); h.id = 't47host'; h.innerHTML = '<span id="t47a" data-t="Yedekle">Yedekle</span>'; document.body.appendChild(h);
      setLang('en'); const a = $('t47a').textContent;
      h.innerHTML = '<span id="t47b" data-t="Yedekle">Yedekle</span>'; applyStaticI18n(h);
      const b = $('t47b').textContent; setLang('tr'); const c = $('t47b').textContent; h.remove(); return [a, b, c]; }""")
    check(r2 == ["Back up", "Back up", "Yedekle"], "M7: sonradan eklenen düğümler de çevrilir / geri yazılır: %s" % r2)
    # --- 4c. statik denetim: kaynakta Türkçe harfli metin sabiti yalnız gerekçeli izin listesinde
    from ortak_tr_tarama import tarama, markup_tarama, islev_govdesi
    A = os.path.join(REPO, "src", "app")
    def rd(f): return open(os.path.join(A, f), encoding="utf-8").read()
    HATA = "geliştirici hata iletisi (Error / console; kullanıcıya gösterilmez)"
    IZIN = {
      "00-depolama.js": {"zaman aşımı": HATA, "depolama doğrulaması": HATA, "bağlantı yok": HATA},
      "01-temel.js": {
        "AYK+ genel bilgi amaçlıdır": "HEALTH_NOTE: Hakkında gövdesi v49",
        "damla/kapsül": "SUPP_PRESETS veri (kayıt/gösterim t(p.unit), t(p.name) ile, Task 3b)", "Tok karnına": "SUPP_PRESETS notu (addPresetSupp t(note))",
        "ölçek": "SUPP_PRESETS birimi", "Antrenman sonrası": "SUPP_PRESETS notu", "Uykudan 1 saat önce": "SUPP_PRESETS notu", "Çinko": "SUPP_PRESETS adı", "Akşam": "SUPP_PRESETS notu",
        "🏋️ Ağırlık": "KIND_LABEL: Antrenman (v48)", "⏱️ Süreli": "KIND_LABEL: v48", "Tükeniş": "EFFORT_LABELS: Antrenman (v48)",
        "Adsız hareket": "normalizeState onarım yedeği (bozuk kayıt; kayıtlı-metinler a1)", "Tahmini öğün": "normalizeState onarım yedeği (a1)",
        "${}. Öğün": "normalizeState onarım yedeği (a1)", "Antrenman günü": "normalizeState onarım yedeği (a1)", "Adsız besin": "normalizeState onarım yedeği (a1)", "Özel": "normalizeState onarım yedeği (a1)",
        "Göğüs": "libMuscle kas adları: veri/anahtar (v48)", "Sırt": "kas adı veri", "Ön Bacak": "kas adı veri", "Arka Bacak & Kalça": "kas adı veri", "Karın": "kas adı veri"},
      "02-arayuz.js": {"İlerleme": "TAB_TITLES değeri, gösterimde t(TAB_TITLES[..])", "boş görsel": HATA, "okunamadı": HATA},
      "03-beslenme.js": {"Bugün": "NUTRI_VIEWS etiketleri, gösterimde t(l)", "Menülerim": "NUTRI_VIEWS", "Geçmiş": "NUTRI_VIEWS"},
      "04-besinler-barkod.js": {"Diğer": "besin kategori anahtarı (veri, v49)", "<div class=\"text-[12px] n-dim mt-0.5\">Kalori USDA": "f.kx besin verisi cümlesi (v49)", "ZXing yüklenemedi": HATA,
        "⭐ Özel Eklediklerim": "özel besin cat değeri: kayıtta Türkçe, gösterimde t(stripEmoji(cat)) (kayıtlı-metinler a2)"},
      "08-profil-yedek.js": {
        "Verilerin yalnızca bu telefonda": "PRIVACY_NOTE: Hakkında v49", "Open Food Facts verisi": "LICENSES: Hakkında v49", "USDA FoodData Central": "LICENSES v49", "Vücut haritası görseli": "LICENSES v49",
        "Katch-McArdle": "METHOD_SOURCES v49", "Iraki ve ark.": "METHOD_SOURCES v49", "AMDR": "METHOD_SOURCES v49", "<p>": "renderAbout gövdesi (Hakkında) v49", "<ul": "renderAbout v49",
        "Yağ": "pfTargetsBox etiketleri ['Kalori','Protein','Karb','Yağ'], gösterimde t(l)",
        "Gece yedeği": "SNAP_KIND_LABEL, gösterimde t(..)", "Haftalık yedek": "SNAP_KIND_LABEL", "Geçiş öncesi": "SNAP_KIND_LABEL", "İçe alma öncesi": "SNAP_KIND_LABEL", "Değişiklik öncesi": "SNAP_KIND_LABEL"},
      "11-mutfak-akilli.js": {"Diğer": "besin kategorisi yedeği (veri, v49)"},
      "12-besin-veritabani.js": {}, "13-cizim-baslat.js": {}}
    # kısmen kapsamdaki dosyalar: yalnız bu işlevlerin gövdeleri taranır (kalanı v48: Antrenman/Mobilite/İlerleme)
    KISMI = {
      "05-secici-hareket.js": ["openPicker", "pickerChoose", "pickerExtra"],
      "09-kas-plaka-koc-takviye.js": ["renderSupps", "suppTimeLabel", "addPresetSupp", "editSuppDose", "setSuppTime", "addSupp", "removeSupp", "coachHintText", "openMeasureModal", "saveMeasurement", "deleteMeasurement", "changeSuppDose", "deleteMeal", "copyMeal", "otherMeals"],
      "10-antrenman-arayuzu.js": ["openMealModal", "saveMealModal", "editCustomFood", "deleteCustomFood"]}
    bad = []; used = {}
    for f, tbl in IZIN.items():
        for (ln, txt, wr, raw) in tarama(rd(f)):
            if wr: continue
            hit = [k for k in tbl if txt.startswith(k)]
            if hit: used.setdefault(f, set()).add(hit[0]); continue
            bad.append("%s:%d %r" % (f, ln, txt[:50]))
    for f, fns in KISMI.items():
        src = rd(f)
        for fn in fns:
            body = islev_govdesi(src, fn)
            if body is None: bad.append("%s: işlev yok %s" % (f, fn)); continue
            for (ln, txt, wr, raw) in tarama(body):
                if not wr: bad.append("%s %s %r" % (f, fn, txt[:50]))
    check(not bad, "statik: kapsamdaki kaynaklarda t(/tn( dışında Türkçe harfli metin yok (%d dosya + %d kısmi): %s" % (len(IZIN), len(KISMI), bad[:8]))
    stale = [(f, k) for f, tbl in IZIN.items() for k in tbl if k not in used.get(f, set())]
    check(not stale, "statik: izin listesinde kullanılmayan (bayat) giriş yok: %s" % stale[:6])
    # tarayıcının kendi sınaması: sarılmamış bir Türkçe sabit yakalanır, sarılı olan yakalanmaz
    probe = tarama('const a = "çay"; x(t("şeker " + b), tn(n, "{n} öğün")); const r = /ç/; // ğ\nconst s = `${t("ü")} ö`;')
    check([p[1] for p in probe if not p[2]] == ["çay", "${} ö"], "statik tarayıcı kendi sınamasını geçer: %s" % [(p[1], p[2]) for p in probe])
    # --- markup: Beslenme, Profil (Hakkında hariç), pencereler, ortak panel
    MK_IZIN = {
      "nutriThemeBtn": "aria-label her renderda JS yazar", "backupBannerText": "JS her renderda yazar (renderBanner)", "suppCounter": "JS yazar (renderSupps)",
      "restPillLabel": "JS yazar (timerLabelText)", "cfTitle": "JS yazar (openCustomFood/editCustomFood)", "pickerTitle": "JS yazar (openPicker)", "pickerExtraBtn": "JS yazar (openPicker)",
      "mealModalTitle": "JS yazar (openMealModal)", "pfPhotoBtnText": "JS yazar (refreshProfilePhoto)", "lastBackupText": "JS yazar (renderProfile)", "uiDlgCancel": "JS yazar (uiDialog)",
      "pfLang": "dil adı kendi dilinde kalır ('Türkçe' / 'English')", "pfAvatar": "alt metni: görsel yalnızca süs",
      "mobTimer": "Mobilite (v48)", "exerciseModal": "Antrenman hareket penceresi (v48)", "exSheet": "Antrenman (v48)", "chartModal": "İlerleme grafik penceresi (v48; başlığı JS yazar)",
      "onboard": "ilk kurulum ekranları (ayrı sürüm)"}
    mk = open(os.path.join(REPO, "src", "markup.html"), encoding="utf-8").read(); mk = mk[mk.index("<body"):]
    mhit = markup_tarama(mk)
    mbad = [(k, x[:40], ids[-1] if ids else None) for (k, x, ids, ln) in mhit if not any(i in MK_IZIN for i in ids)]
    check(not mbad, "statik: markup'ta data-t'siz Türkçe metin yok (izin listesi hariç %d kimlik): %s" % (len(MK_IZIN), mbad[:8]))
    mstale = [i for i in MK_IZIN if not any(i in ids for (k, x, ids, ln) in mhit)]
    check(not mstale, "statik: markup izin listesinde bayat kimlik yok: %s" % mstale)
    # --- 4d. her t("…")/tn(…, "…") anahtarı: EN girişi, yer tutucular/etiketler eşit, çoğul → {one, other}
    lit = r'"((?:[^"\\\n]|\\.)*)"'
    keys = set(); tnkeys = set()
    def collect(src):
        for mm in re.finditer(r"(?<![.\w])t\(\s*" + lit, src): keys.add(mm.group(1))
        for mm in re.finditer(r"(?<![.\w])tn\(\s*[^,]+,\s*" + lit, src): keys.add(mm.group(1)); tnkeys.add(mm.group(1))
    for f in list(IZIN) + ["05-secici-hareket.js", "09-kas-plaka-koc-takviye.js"]: collect(rd(f))
    for fn in KISMI["10-antrenman-arayuzu.js"]: collect(islev_govdesi(rd("10-antrenman-arayuzu.js"), fn))
    for mm in re.finditer(r'data-t(?:-aria|-ph)?="([^"]*)"', mk): keys.add(mm.group(1))
    def unesc2(k):
        try: return _json.loads('"' + k + '"')
        except Exception: return k
    keys = {unesc2(k) for k in keys}; tnkeys = {unesc2(k) for k in tnkeys}
    res = pg.evaluate("""([keys, tnk]) => { const ph = s => (String(s).match(/\\{\\w+\\}/g) || []).sort().join(); const tg = s => (String(s).match(/<\\/?\\w+/g) || []).join();
      const out = { missing: [], ph: [], tag: [], plural: [], tnString: [] };
      keys.forEach(k => { const e = Object.prototype.hasOwnProperty.call(EN, k) ? EN[k] : undefined; if (e === undefined) { out.missing.push(k); return; }
        const vs = typeof e === 'string' ? [e] : [e.one, e.other]; const base = k.split('|')[0];
        vs.forEach(v => { if (typeof v !== 'string') { out.missing.push(k); return; } if (ph(base) !== ph(v)) out.ph.push(k); if (tg(base) !== tg(v)) out.tag.push(k); });
        if (typeof e === 'object' && !(typeof e.one === 'string' && typeof e.other === 'string')) out.plural.push(k);
        if (tnk.includes(k) && /\\{n\\}/.test(base) && typeof e === 'string') out.tnString.push(k); });
      return out; }""", [sorted(keys), sorted(tnkeys)])
    check(len(keys) > 500 and all(not v for v in res.values()), "anahtar denetimi (%d anahtar, %d tn): EN'de eksik / yer tutucu / etiket / {one,other} / tn'de tekil-çoğul eksik: %s" % (len(keys), len(tnkeys), {k: v[:6] for k, v in res.items() if v}))
    check(errs == [], "sayfa hatası yok: " + str(errs[:3]))
    b.close()
finally:
    srv.terminate()
print("BAŞARISIZ:" if fails else "TÜMÜ GEÇTİ", fails)
sys.exit(1 if (fails or errs) else 0)
