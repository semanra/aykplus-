# v48 bölüm 1-3 (3: hareket penceresi, plaka/kademe aracı, öneriler, program işlemleri, bitiş bildirimi): Antrenman terimleri, Antrenman ekranları, gösterim yardımcıları, kayıtlı metin kuralları (kas adı, targetInfo, gün adı).
import os, sys, re, subprocess, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8806'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = "http://localhost:8806/index.html"
TR_CH = re.compile(r"[çğıöşüÇĞİÖŞÜ]")
def boot(pg): pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(80)

try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, locale="en-US")
    ctx.add_init_script(TEST_INIT); ctx.add_init_script("window.AYK_TEST_EN = true")
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL); boot(pg)
    def setlang(l): pg.evaluate("() => { state.settings.lang = '%s'; applyStaticI18n(); renderAll(); }" % l)
    H = """() => [muscleL('Arka Bacak & Kalça'), effortL(4), kindL('time'), kindL('weight'), libCatL(Object.keys(EXERCISE_LIBRARY)[0]),
      targetL('3x45 sn'), targetL('20 dk • 3 km'), targetL('3x8–12'), equipL('stack', false), equipL('bodyweight', true), muscleL('Başka')]"""
    # --- Türkçe: aynen
    setlang('tr')
    r = pg.evaluate(H)
    check(r[0] == "Arka Bacak & Kalça" and r[1] == "Tükeniş" and r[2] == "⏱️ Süreli" and r[3] == "🏋️ Ağırlık", "tr: yardımcılar aynı: %s" % r[:4])
    check(r[4].startswith("1. Göğüs") and r[5] == "3x45 sn" and r[6] == "20 dk • 3 km" and r[7] == "3x8–12", "tr: kategori ve targetL aynı: %s" % r[4:8])
    check(r[8] == "Ağırlık yığını (makine / kablo)" and r[9] == "Vücut ağ." and r[10] == "Başka", "tr: equipL ve bilinmeyen kas aynı")
    pg.evaluate("() => { state.activeTab = 'gym'; state.gymView = 'today'; renderAll(); }")
    d_tr = pg.evaluate("[state.workoutDays.length, (() => { void addWorkoutDay(); return 0; })()]")
    pg.wait_for_selector("#uiDialog:not(.hidden)")
    n0 = d_tr[0]
    v = pg.evaluate("$('uiDlgInput').value")
    check(v == "%d. GÜN: " % (n0 + 1), "tr: varsayılan gün adı aynı: %r" % v)
    pg.click("#uiDlgCancel")
    # --- İngilizce
    setlang('en')
    r = pg.evaluate(H)
    check(r[0] == "Hamstrings and glutes" and r[1] == "Failure", "en: kas ve zorluk: %s" % r[:2])
    check(not TR_CH.search(r[2]) and r[2].startswith("⏱️") and not TR_CH.search(r[3]), "en: kindL Türkçe harf yok: %s" % r[2:4])
    check(r[4].startswith("1.") and not TR_CH.search(r[4]), "en: libCatL: %s" % r[4])
    check(r[5] == "3x45 sec" and r[6] == "20 min • 3 km" and r[7] == "3x8–12", "en: targetL: %s" % r[5:8])
    check(r[8] == "Weight stack (machine / cable)" and r[9] == "Bodyweight" and r[10] == "Başka", "en: equipL, bilinmeyen kas aynen")
    cats = pg.evaluate("Object.keys(EXERCISE_LIBRARY).map(libCatL)")
    check(len(cats) == 11 and not any(TR_CH.search(c) or '&' in c for c in cats), "en: 11 kategori başlığı İngilizce: %s" % cats[:2])
    # --- Review Focus 1: #exMuscle
    pg.evaluate("openExerciseModal({ kind: 'weight', name: 'Test Squat' })")
    o = pg.evaluate("[...$('exMuscle').options].map(x => [x.value, x.textContent])")
    MUS = pg.evaluate("MUSCLES")
    check([x[0] for x in o[1:]] == MUS, "en: #exMuscle value'ları MUSCLES ile aynı (Türkçe)")
    check(not any(TR_CH.search(x[1]) for x in o[1:]) and o[5][1] == "Hamstrings and glutes" and o[1][1] == "Chest", "en: #exMuscle görünen metinler İngilizce: %s" % [x[1] for x in o])
    pg.evaluate("$('exMuscle').value = 'Arka Bacak & Kalça'; saveExerciseModal()")
    st = pg.evaluate("aykStoredState()")
    m = pg.evaluate("activeDay().exercises[activeDay().exercises.length - 1].muscle")
    check(m == "Arka Bacak & Kalça" and m in MUS, "en: kaydedilen ex.muscle Türkçe: %r" % m)
    pg.evaluate("selectMuscle(MUSCLES[0])")
    check(pg.evaluate("state.libMuscle") == MUS[0], "en: selectMuscle sonrası state.libMuscle Türkçe")
    st = pg.evaluate("aykStoredState()")
    check(isinstance(st, dict) and st.get("libMuscle") == MUS[0], "en: kalıcı kayıtta libMuscle Türkçe: %r" % (st.get("libMuscle") if isinstance(st, dict) else st))
    setlang('tr')
    check(pg.evaluate("state.libMuscle") == MUS[0], "tr'ye dönünce aynı kas seçili")
    setlang('en')
    # --- Review Focus 2: süreli hareket, targetInfo Türkçe kalır
    pg.evaluate("() => { state.activeTab = 'gym'; state.gymView = 'today'; renderAll(); openExerciseModal({ kind: 'time', name: 'Plank Test' }); setExModalKind('time'); $('exTimeSetCount').value = 3; $('exTimeSec').value = 45; saveExerciseModal(); }")
    ex = pg.evaluate("(() => { const e = activeDay().exercises.find(x => x.name === 'Plank Test'); return { ti: e.targetInfo, t0: e.sets[0].target, kind: e.kind, n: e.sets.length }; })()")
    check(ex["kind"] == "time" and ex["ti"] == "3x45 sn" and (ex["t0"] or "").endswith(" sn"), "en: kayıtta targetInfo Türkçe biçim: %s" % ex)
    pg.evaluate("addSetToExercise(activeDay().exercises.findIndex(x => x.name === 'Plank Test'))")
    ex2 = pg.evaluate("(() => { const e = activeDay().exercises.find(x => x.name === 'Plank Test'); return { ti: e.targetInfo, t3: e.sets[3].target }; })()")
    check(ex2["ti"].startswith("4x") and ex2["ti"].endswith(" sn") and ex2["t3"].endswith(" sn"), "en: + set sonrası '4x…': %s" % ex2)
    txt = pg.evaluate("$('gymRoot').textContent")
    pg.evaluate("setGymView('program')"); txt = pg.evaluate("$('gymRoot').textContent")
    check("4x45 sec" in txt and "x45 sn" not in txt, "en: hedef çipinde '4x45 sec', 'x45 sn' yok (kalan ' sn' metinleri Task 2-3)")
    pg.evaluate("setGymView('today')")
    # --- Review Focus 3: gün adı
    pg.evaluate("void addWorkoutDay()"); pg.wait_for_selector("#uiDialog:not(.hidden)")
    n = pg.evaluate("state.workoutDays.length")
    v = pg.evaluate("$('uiDlgInput').value")
    check(v == "DAY %d: " % (n + 1), "en: varsayılan gün adı: %r" % v)
    pg.fill("#uiDlgInput", "Day %d: Arms" % (n + 1)); pg.click("#uiDlgOk"); pg.wait_for_timeout(100)
    chips = pg.evaluate("[...document.querySelectorAll('#gymRoot nav button, #gymRoot button')].map(x => x.textContent.trim())")
    check("Day %d" % (n + 1) in chips, "en: gün çipi kısa etiketi 'Day %d'" % (n + 1))
    check(pg.evaluate("state.workoutDays[state.workoutDays.length - 1].name") == "Day %d: Arms" % (n + 1), "en: gün adı kullanıcı yazdığı gibi")
    # ===== Bölüm 2: Antrenman ekranları (Bugün, aktif antrenman, Programım, Hareketler, Geçmiş, hareket menüsü, ısınma kartı) =====
    SETUP2 = """() => {
      state.activeTab = 'gym'; state.gymView = 'today'; state.gymActive = false; state.workoutStartedAt = null;
      const d = state.workoutDays[0];
      d.exercises.push({ name: 'Koşu Bandı', kind: 'cardio', sets: [{ min: 20, km: 3, lvl: '2', done: false }, { min: 10, km: 1.5, lvl: '', done: false }], targetInfo: '20 dk • 3 km' });
      d.exercises.push({ name: 'Plank', kind: 'time', rest: 45, targetInfo: '3x45 sn', sets: [{ sec: 45, done: false, target: '45 sn' }, { sec: 45, done: false, target: '45 sn' }] });
      d.exercises[0].sets[0].kg = 60; d.exercises[0].sets[0].reps = 8;
      state.exerciseHistory[exKey('Plank')] = [{ ts: Date.now() - 86400000 * 3, kind: 'time', sets: [{ sec: 40 }, { sec: 42 }] }];
      state.exerciseHistory[exKey('Koşu Bandı')] = [{ ts: Date.now() - 86400000 * 3, kind: 'cardio', sets: [{ min: 20, km: 3 }] }];
      state.exerciseHistory[exKey('Lat Pulldown')] = [{ ts: Date.now() - 60000, kind: 'weight', sets: [{ kg: 30, reps: 10 }, { kg: 35, reps: 10 }, { kg: 40, reps: 10 }, { kg: 45, reps: 8 }] }];
      d.exercises[4].levels = { mode: 'step', start: 5, step: 5, addon: 2.5 };
      state.exerciseHistory[exKey('Hip Test')] = [{ ts: Date.now() - 60000, kind: 'weight', name: 'Hip Test', muscle: 'Arka Bacak & Kalça', sets: [{ kg: 50, reps: 8 }, { kg: 50, reps: 8 }, { kg: 50, reps: 8 }] }];
      state.workoutLogs.push({ ts: Date.now() - 86400000, date: '15 Kas', dayName: '1. GÜN: Üst Vücut A', sets: 12, volume: 5400, durationMin: 75, cardioMin: 20, prs: 2 });
      state.workoutLogs.push({ ts: Date.now() - 86400000 * 2, date: '14 Kas', dayName: '2. GÜN: Alt Vücut A', sets: 1, volume: 600, durationMin: 40, prs: 1 });
      state.settings.warmupCard = true;
      renderAll();
    }"""
    pg.evaluate("() => { state.settings.lang = 'tr'; applyStaticI18n(); }")
    pg.evaluate("() => { closeModal('exerciseModal'); selectWorkoutDay(0); }")
    pg.evaluate(SETUP2)
    USERS = pg.evaluate("""() => { const u = new Set();
      state.workoutDays.forEach(d => { u.add(d.name); u.add(d.name.split(':')[0]); d.exercises.forEach(e => { u.add(e.name); }); });
      state.workoutLogs.forEach(l => u.add(l.dayName));
      Object.keys(EXERCISE_LIBRARY).forEach(c => EXERCISE_LIBRARY[c].forEach(n => u.add(n)));
      mobAllItems().forEach(i => u.add(i.name));
      return [...u].filter(x => x && x.length > 1).sort((a, b) => b.length - a.length); }""")
    GRAB = """(ids) => { let txt = ''; ids.forEach(id => { const r = document.getElementById(id); if (!r) return; txt += ' ' + r.textContent;
      r.querySelectorAll('[aria-label],[placeholder],[alt],[title]').forEach(e => { txt += ' ' + (e.getAttribute('aria-label') || '') + ' ' + (e.getAttribute('placeholder') || '') + ' ' + (e.getAttribute('alt') || '') + ' ' + (e.getAttribute('title') || ''); }); });
      return txt; }"""
    def grab(ids=("gymRoot",)):
        x = pg.evaluate(GRAB, list(ids))
        for u in USERS: x = x.replace(u, " ")
        return re.sub(r"\s+", " ", x)
    def tr_free2(label, ids=("gymRoot",), must=()):
        x = grab(ids); m = TR_CH.findall(x)
        check(not m, "en: %s: Türkçe harf yok%s" % (label, (" -> " + str(sorted(set(m))) + " | " + x[:300]) if m else ""))
        for w in must: check(w in x, "en: %s: '%s' var" % (label, w))
        return x
    def gym(js): pg.evaluate(js); pg.wait_for_timeout(40)
    # --- Türkçe: beklenen metinler aynı (piksel/HTML karşılaştırması: değişiklik öncesi sürümle eşit çıktı, görev raporunda)
    setlang('tr')
    x = grab()
    check("Antrenmanı Başlat" in x and ("SIRADAKİ ANTRENMAN" in x or "SEÇİLİ ANTRENMAN" in x) and "Antrenman bölümleri" in x and "hareket" in x, "tr: Bugün metinleri aynı")
    gym("setGymView('program')"); x = grab()
    check("· Kardiyo" in x and "Bu antrenmanı başlat" in x and "Kademe: 5 kg arayla (+2,5 ek plaka)" in x and "hareket · ~" in x, "tr: Programım metinleri aynı")
    gym("setGymView('history')"); x = grab()
    check("12 set" in x and "2 rekor" in x and "20 dk kardiyo" in x and "1 sa 15 dk" in x, "tr: Geçmiş metinleri aynı")
    # --- İngilizce
    setlang('en'); gym("setGymView('today')")
    x = tr_free2("Bugün", must=("Start workout", "exercises", "Workouts", "Volume", "Last workout ·", "Warm-up"))
    check("MON" in x and "TUE" in x and "SUN" in x and ("UP NEXT" in x or "SELECTED WORKOUT" in x), "en: hafta şeridi ve sıradaki etiketi")
    check(pg.evaluate("[tn(1, '{n} set'), tn(2, '{n} set'), tn(1, 'hareket|antrenman'), tn(3, 'hareket|antrenman')].join('|')") == "1 set|2 sets|exercise|exercises", "en: tekil/çoğul")
    check(pg.evaluate("[fmtMinutes(30), fmtMinutes(75), paceText(30, 5)].join('|')").startswith("30 min|1 h 15 min|10 km/h"), "en: süre/tempo biçimi")
    x = pg.evaluate("$('gymWarmup') ? $('gymWarmup').textContent : ''")
    check(x.strip().startswith("Warm-up") and "min · from your mobility routines" in x and not TR_CH.search(re.sub("|".join(re.escape(u) for u in USERS), " ", x)), "en: ısınma kartı: " + re.sub(r"\s+", " ", x)[:160])
    check(pg.evaluate("(() => { const h = warmupCardHtml(activeDay(), false); return /aria-label=\"Hide warm-up card\"/.test(h) && /Start warm-up/.test(h); })()"), "en: ısınma kartı düğmeleri")
    # aktif antrenman: set tamamla -> zorluk satırı
    gym("startWorkout()"); gym("toggleSetDone(0, 0)")
    x = tr_free2("aktif antrenman", must=("PREVIOUS", "REPS", "How did set 1 go?", "(optional)", "Easy", "Moderate", "Hard", "Failure", "Complete set", "Finish and save workout", "Uncheck all sets", "EXERCISE 1 /", "Weight increments:"))
    check(pg.evaluate("!!document.querySelector('[data-effort-row]')"), "en: zorluk satırı görünür")
    check("Do the weights on this machine go up in 5 kg increments?" in x or "increments?" in x, "en: kademe sorusu: " + x[x.find("Do the"):x.find("Do the") + 90])
    check(pg.evaluate("document.querySelector('[data-effort-row] [role=group]').getAttribute('aria-label')") == "Set 1 effort", "en: zorluk grubu aria-label")
    gym("setEffort(0, 0, 2)"); x = grab()
    check("Moderate" in x and "Total" in x and "min" in x and "sec" in x, "en: set zorluğu seçilince etiket; süre/kardiyo toplamı")
    check(re.search(r"\d+/\d+ sets", pg.evaluate("$('gymProgText').textContent")) is not None, "en: ilerleme metni: " + pg.evaluate("$('gymProgText').textContent"))
    gym("openExSheet(0)"); x = tr_free2("hareket menüsü (plakalı)", ids=("exSheetBody",), must=("Progress chart", "Plates and warm-up", "Edit exercise", "Move up", "Remove exercise", "on each side", "Rest 90 sec"))
    gym("closeModal('exSheet')")
    gym("openExSheet(3)"); tr_free2("hareket menüsü (makine)", ids=("exSheetBody",), must=("Increments and warm-up",)); gym("closeModal('exSheet')")
    gym("openExSheet(activeDay().exercises.length - 2)"); tr_free2("hareket menüsü (kardiyo)", ids=("exSheetBody",), must=("Delete last part",)); gym("closeModal('exSheet')")
    gym("openExSheet(activeDay().exercises.length - 1)"); tr_free2("hareket menüsü (süreli)", ids=("exSheetBody",), must=("Rest 45 sec",)); gym("closeModal('exSheet')")
    gym("exitActiveWorkout()")
    gym("setGymView('program')")
    x = tr_free2("Programım", must=("No weight increments set", "Weight increments: every 5 kg (+2.5 kg extra plate)", "Timed", "Cardio", "+ New day", "Rename", "Delete day", "EXERCISES", "+ Add from library", "Custom exercise", "Start this workout", "Press and hold the handle", "20 min • 3 km"))
    check(re.search(r"\d+ exercises · ~\d+ min", x) is not None, "en: Programım hareket sayısı")
    gym("() => { const e = activeDay().exercises.splice(0); window.__keepEx = e; renderAll(); }")
    tr_free2("Programım (boş gün)", must=("No exercises on this day yet.",))
    gym("() => { activeDay().exercises.push(...window.__keepEx); renderAll(); }")
    gym("setGymView('library')"); gym("selectMuscle(null)")
    tr_free2("Hareketler (kas seçisiz)", must=("MUSCLE MAP", "This week", "Program", "Tap a muscle on the map", "FRONT", "BACK", "Search 135+ exercises"))
    gym("selectMuscle('Göğüs')")
    x = tr_free2("Hareketler (hafta, Chest)", must=("WEEKLY SETS PER MUSCLE", "Chest", "Hamstrings and glutes", "IN PROGRAM", "Not done yet"))
    check("Based on this week's sets" in x and re.search(r"This week \d+ sets? · ", x) is not None, "en: Hareketler hafta satırı")
    gym("setLibRange('today')"); tr_free2("Hareketler (bugün)", must=("Based on today's sets",))
    gym("setLibRange('program')"); x = tr_free2("Hareketler (programım)", must=("YOUR PROGRAM'S WEEKLY IMPACT", "Weekly in your program"))
    gym("selectMuscle('Karın')"); tr_free2("Hareketler (programım, Abs)")
    gym("() => { setLibRange('week'); selectMuscle(null); onLibSearch('press'); }")
    tr_free2("Hareketler (arama)", ids=("libList",))
    gym("onLibSearch('zzzzqq')"); tr_free2("Hareketler (boş arama)", ids=("libList",), must=("No results found.",))
    gym("setGymView('history')")
    x = tr_free2("Geçmiş", must=("This week", "Volume", "Total", "workouts", "1 h 15 min", "20 min cardio", "2 PRs", "1 PR", "Delete entry"))
    check("1 sets" not in x and "1 exercises" not in x and "1 PRs" not in x, "en: Geçmişte '1 sets' yok")
    gym("() => { window.__keepL = state.workoutLogs.splice(0); renderAll(); }")
    tr_free2("Geçmiş (boş)", must=("No workouts saved yet.", "Go to today's workout"))
    gym("() => { state.workoutLogs.push(...window.__keepL); renderAll(); }")
    gym("() => { state.gymActive = false; state.gymView = 'today'; const e = activeDay().exercises.splice(0); window.__keepEx = e; renderAll(); }")
    tr_free2("Bugün (boş gün)", must=("Add your first exercise",))
    gym("() => { state.gymActive = true; renderAll(); }")
    tr_free2("aktif antrenman (boş gün)", must=("No exercises on this day. Add some from the", "Program"))
    gym("() => { state.gymActive = false; activeDay().exercises.push(...window.__keepEx); renderAll(); }")
    # düzenle penceresinden: kademe ve ekipman metinleri
    gym("openEditExercise(3)")
    x = pg.evaluate("[$('exEquip').options[0].textContent, $('exLvTitle').textContent].join('|')")
    check(not TR_CH.search(x) and x.startswith("Auto (") and "Machine weight increments" in x, "en: ekipman/kademe başlıkları: " + x)
    gym("closeModal('exerciseModal')") if pg.evaluate("!!document.getElementById('exerciseModal')") else None
    gym("() => { state.gymView = 'today'; renderAll(); }")
    # kademe özetleri
    lv = pg.evaluate("[levelsSummary({levels:{mode:'step',start:5,step:5,addon:2.5}}), levelsSummary({levels:{mode:'list',list:[1,2,3],addon:0}}), levelsSummary({levels:{mode:'list',list:[1],addon:0}})].join('|')")
    check(lv == "every 5 kg (+2.5 kg extra plate)|3 weights|1 weight", "en: levelsSummary: " + lv)
    setlang('tr')
    lv = pg.evaluate("[levelsSummary({levels:{mode:'step',start:5,step:5,addon:2.5}}), levelsSummary({levels:{mode:'list',list:[1,2,3],addon:0}})].join('|')")
    check(lv == "5 kg arayla (+2,5 ek plaka)|3 kademe", "tr: levelsSummary aynı: " + lv)
    # ===== Bölüm 3: hareket penceresi (3 tür + kademe), plaka/kademe aracı, öneri/deload, program işlemleri, bitiş bildirimi =====
    MON_TR = r"(Oca|Şub|Mar|Nis|May|Haz|Tem|Ağu|Eyl|Eki|Kas|Ara)"
    setlang('en')
    pg.evaluate("() => { closeModal('exerciseModal'); state.activeTab = 'gym'; state.gymView = 'today'; state.gymActive = false; renderAll(); }")
    # hareket penceresi: ağırlık / süreli / kardiyo ve kademe bölümü açıkken
    pg.evaluate("openExerciseModal({ kind: 'weight', name: 'Zz Machine Row' })")
    x = tr_free2("hareket penceresi (ağırlık)", ids=("exerciseModal",), must=("Add exercise", "Exercise name", "Exercise type", "Weights", "Cardio", "Timed", "Number of sets", "Target reps", "Starting weight (kg)", "Muscle group", "Equipment", "Weight step (kg)", "Rest between sets (seconds)", "Cancel", "Save", "Barbell and plates", "Dumbbell", "Bodyweight"))
    check(pg.evaluate("$('exName').placeholder") == "E.g. Incline Bench Press" and pg.evaluate("$('exInc').placeholder").endswith("(auto)"), "en: hareket penceresi placeholder'ları")
    check(pg.evaluate("$('exerciseModal').querySelector('[aria-label]').getAttribute('aria-label')") == "Close", "en: Kapat aria-label")
    pg.evaluate("() => { setExModalKind('time'); }")
    tr_free2("hareket penceresi (süreli)", ids=("exerciseModal",), must=("Time (seconds)",))
    pg.evaluate("() => { setExModalKind('cardio'); }")
    tr_free2("hareket penceresi (kardiyo)", ids=("exerciseModal",), must=("Time (min)", "Distance (km)", "Incline / level"))
    pg.evaluate("() => { setExModalKind('weight'); $('exEquip').value = 'stack'; updateExEquipUI(); }")
    tr_free2("hareket penceresi (kademe bölümü, düzenli artış)", ids=("exerciseModal",), must=("Machine weight increments", "Regular steps", "My own list", "Lowest weight (kg)", "Step size (kg)", "Extra small plate (kg, if any)", "Progression suggestions will only use"))
    check(pg.evaluate("[$('exLvStart').placeholder, $('exLvStep').placeholder, $('exLvAddon').placeholder, $('exLvList').placeholder].join('|')") == "e.g. 5|e.g. 7.5|e.g. 2.5 — leave empty if none|20; 27.5; 35; 40; 47.5", "en: kademe placeholder'ları")
    pg.evaluate("() => { setExLevelsMode('list'); }")
    tr_free2("hareket penceresi (kademe, kendi listem)", ids=("exerciseModal",), must=("Weights (separate with semicolons or spaces)",))
    pg.evaluate("() => { $('exEquip').value = 'dumbbell'; updateExEquipUI(); }")
    check(pg.evaluate("$('exLvTitle').textContent") == "Dumbbell weights at your gym", "en: dambıl kademe başlığı")
    pg.evaluate("closeModal('exerciseModal')")
    # düzenle: ipucu metni
    pg.evaluate("() => { const d = activeDay(); d.exercises.push({ name: 'Zz Edit', kind: 'weight', targetInfo: '3x8–12', sets: makeWeightSets(3, '8–12', 20, 8) }); renderAll(); openEditExercise(d.exercises.length - 1); setExModalKind('cardio'); }")
    tr_free2("hareket penceresi (düzenle)", ids=("exerciseModal",), must=("Edit exercise", "If you change the type"))
    pg.evaluate("closeModal('exerciseModal')")
    # hareket kütüphanesi seçicisi
    pg.evaluate("openExercisePicker()")
    x = tr_free2("hareket kütüphanesi seçici", ids=("pickerModal",), must=("Exercise library", "Core and abs", "Back: vertical pulls", "Not in the list? Add a custom exercise"))
    chips = pg.evaluate("[...document.querySelectorAll('#pickerChips button')].map(b => b.textContent)")
    check(len(chips) == 12 and chips[0] == "All" and chips[1] == "Chest", "en: seçici çipleri: %s" % chips)
    pg.evaluate("closeModal('pickerModal')")
    # plaka aracı
    SETUP3 = """() => { const d = activeDay();
      d.exercises.push({ name: 'Zz Bar', kind: 'weight', equip: 'plates', targetInfo: '3x8–12', sets: makeWeightSets(3, '8–12', 100, 8) });
      d.exercises.push({ name: 'Zz Lv', kind: 'weight', equip: 'stack', levels: { mode: 'step', start: 5, step: 5, addon: 2.5 }, targetInfo: '3x8–12', sets: makeWeightSets(3, '8–12', 40, 8) });
      d.exercises.push({ name: 'Zz NoLv', kind: 'weight', equip: 'stack', targetInfo: '3x8–12', sets: makeWeightSets(3, '8–12', 40, 8) });
      d.exercises.push({ name: 'Zz DbNoLv', kind: 'weight', equip: 'dumbbell', targetInfo: '3x8–12', sets: makeWeightSets(3, '8–12', 12, 8) });
      renderAll(); return d.exercises.length; }"""
    nEx = pg.evaluate(SETUP3)
    iBar, iLv, iNo, iDb = nEx - 4, nEx - 3, nEx - 2, nEx - 1
    pg.evaluate("openPlateTool(%d)" % iBar)
    tr_free2("plaka aracı (100 kg)", ids=("chartModal",), must=("Working weight (kg)", "Bar weight", "Plates for EACH side of the bar", "WARM-UP SETS", "Empty bar", "Working", "per side:", "Warm-up sets should not tire you out"))
    check(pg.evaluate("[...$('ptBar').options].map(o => o.textContent).join('|')") == "20 kg Olympic bar|15 kg bar|10 kg EZ / short bar|No bar / plate-loaded machine", "en: bar seçenekleri")
    for w, must in (("10", ("lighter than the 20 kg bar",)), ("61", ("exactly 61 kg",)), ("0", ("Enter a working weight",))):
        pg.fill("#ptKg", w); pg.wait_for_timeout(30)
        tr_free2("plaka aracı (%s kg)" % w, ids=("chartModal",), must=must)
    pg.fill("#ptKg", "100"); pg.select_option("#ptBar", "0"); pg.wait_for_timeout(30)
    tr_free2("plaka aracı (barsız)", ids=("chartModal",))
    pg.evaluate("closeModal('chartModal')")
    pg.evaluate("openPlateTool(%d)" % iLv)
    tr_free2("kademe aracı (kilo yok)", ids=("chartModal",))
    pg.fill("#ptKg", "0"); pg.wait_for_timeout(30)
    tr_free2("kademe aracı (0 kg)", ids=("chartModal",), must=("This machine's weight increments:", "Enter your working weight to see warm-up sets."))
    pg.fill("#ptKg", "47"); pg.wait_for_timeout(30)
    tr_free2("kademe aracı (47 kg)", ids=("chartModal",), must=("Weight increments near this weight:", "isn't available on this machine", "WARM-UP SETS", "Working", "rounded to the increments"))
    pg.fill("#ptKg", "40"); pg.wait_for_timeout(30)
    tr_free2("kademe aracı (40 kg)", ids=("chartModal",))
    pg.fill("#ptKg", "5"); pg.wait_for_timeout(30)
    tr_free2("kademe aracı (5 kg)", ids=("chartModal",), must=("No separate warm-up sets needed",))
    pg.evaluate("closeModal('chartModal')")
    pg.evaluate("openPlateTool(%d)" % iNo)
    tr_free2("kademe aracı (kademe yok, makine)", ids=("chartModal",), must=("machine", "Set weight increments"))
    pg.evaluate("closeModal('chartModal')")
    pg.evaluate("openPlateTool(%d)" % iDb)
    tr_free2("kademe aracı (kademe yok, dambıl)", ids=("chartModal",), must=("dumbbells", "Set weight increments"))
    pg.evaluate("closeModal('chartModal')")
    # öneriler ve dinlenme haftası
    SUG = """() => { const now = Date.now(); const d = activeDay();
      const mk = (name, hist) => { d.exercises.push({ name, kind: 'weight', targetInfo: '3x8–12', sets: makeWeightSets(3, '8–12', 50, 8) });
        state.exerciseHistory[exKey(name)] = hist; return d.exercises.length - 1; };
      const S = (reps, e) => ({ kg: 50, reps, e });
      const o = {};
      o.up = mk('Zz Up', [{ ts: now - 86400000, kind: 'weight', sets: [S(12), S(12), S(12)] }]);
      o.upBw = mk('Zz UpBw', [{ ts: now - 86400000, kind: 'weight', sets: [{ kg: 0, reps: 12 }, { kg: 0, reps: 12 }, { kg: 0, reps: 12 }] }]);
      d.exercises[o.upBw].sets.forEach(x => { x.kg = 0; });
      o.hold = mk('Zz Hold', [{ ts: now - 86400000, kind: 'weight', sets: [S(12, 3), S(12, 3), S(12, 4)] }]);
      o.hold2 = mk('Zz Hold2', [{ ts: now - 86400000, kind: 'weight', sets: [S(12, 3), S(12, 4), S(12, 3)] }]);
      o.easy = mk('Zz Easy', [{ ts: now - 86400000, kind: 'weight', sets: [S(9, 1), S(9, 1), S(9, 1)] }]);
      o.down = mk('Zz Down', [{ ts: now - 86400000, kind: 'weight', sets: [S(5), S(5), S(5)] }]);
      const dl = [{ ts: now - 30 * 86400000, kind: 'weight', sets: [{ kg: 100, reps: 10, e: 2 }] }];
      for (let i = 1; i <= 3; i++) dl.push({ ts: now - i * 86400000 * 3, kind: 'weight', sets: [{ kg: 60, reps: 8, e: 3 }, { kg: 60, reps: 8, e: 4 }, { kg: 60, reps: 8, e: 3 }] });
      o.dl = mk('Zz Deload', dl.reverse());
      renderAll(); return o; }"""
    O = pg.evaluate(SUG)
    texts = {}
    for k in ("up", "upBw", "hold", "hold2", "easy", "down", "dl"):
        h = pg.evaluate("(i => { const ex = activeDay().exercises[i]; const div = document.createElement('div'); div.innerHTML = suggestionHtml(ex, i); return div.textContent; })(%d)" % O[k])
        texts[k] = re.sub(r"\s+", " ", h).strip()
        check(texts[k] and not TR_CH.search(texts[k]), "en: öneri '%s': %s" % (k, texts[k][:110]))
    check("Increase the weight from 50 to" in texts["up"] and "Got it" not in texts["up"] and "Not now" in texts["up"], "en: artırma önerisi metni")
    check("Try adding" in texts["upBw"] or "harder variation" in texts["upBw"], "en: vücut ağırlığı önerisi")
    check("Stay at 50 kg" in texts["hold"] and "reached failure" in texts["hold"] and "Got it" in texts["hold"], "en: aynı kiloda kal (tükeniş)")
    check("reached failure" not in texts["hold2"] and "Stay at 50 kg" in texts["hold2"], "en: aynı kiloda kal (tükenişsiz)")
    check('rated every set "Easy"' in texts["easy"], "en: hepsi Kolay önerisi")
    check("fell short of 8 reps" in texts["down"], "en: azaltma önerisi")
    check("deload week" in texts["dl"] and "a lighter week to recover" in texts["dl"] and "Got it" in texts["dl"], "en: dinlenme haftası notu")
    # Türkçe aynılık (öneri ve plaka aracı metinleri)
    setlang('tr')
    ttr = pg.evaluate("(o => ['up', 'hold', 'hold2', 'easy', 'down'].map(k => overloadSuggestion(activeDay().exercises[o[k]]).text))(%s)" % __import__('json').dumps(O))
    check(ttr[0] == "Geçen sefer tüm setlerde 12+ tekrar yaptın. Kiloyu 50 → 52,5 kg'a çıkar, 8 tekrardan başla." or ttr[0].startswith("Geçen sefer tüm setlerde 12+ tekrar yaptın. Kiloyu 50 →"), "tr: artırma metni aynı: " + ttr[0])
    check(ttr[1] == "Geçen sefer tüm setlerde 12+ tekrar yaptın ama setler çok zor geçti (son sette tükeniş). 50 kg'da bir seans daha kal; rahatlayınca artır.", "tr: aynı kiloda kal (tükeniş) aynı")
    check(ttr[2] == "Geçen sefer tüm setlerde 12+ tekrar yaptın ama setler çok zor geçti. 50 kg'da bir seans daha kal; rahatlayınca artır.", "tr: aynı kiloda kal aynı")
    check(ttr[3].startswith('Geçen sefer tüm setleri "Kolay" işaretledin. Kiloyu 50 → ') and ttr[3].endswith("tekrardan başla."), "tr: Kolay metni aynı: " + ttr[3])
    check(ttr[4].startswith("Geçen sefer setlerin çoğunda 8 tekrarın altında kaldın. Aynı kiloyla devam edebilir ya da "), "tr: azaltma metni aynı")
    dtr = pg.evaluate("(i => { const div = document.createElement('div'); div.innerHTML = deloadHtml(activeDay().exercises[i], i); return div.textContent.replace(/\\s+/g, ' ').trim(); })(%d)" % O["dl"])
    check(dtr.startswith("Son 3 haftada 3 seansta tahmini 1RM'in ~133 kg'ı geçmedi ve setler çoğunlukla zor geçti.") and dtr.endswith("Anladım"), "tr: deload metni aynı: " + dtr[:90])
    pg.evaluate("state.settings.barKg = 20")
    pg.evaluate("openPlateTool(%d)" % iBar)
    x = pg.evaluate("$('chartBody').textContent.replace(/\\s+/g, ' ')")
    check("Çalışma kilosu (kg)" in x and "taraf" in x and "ISINMA SETLERİ" in x and "Boş bar" in x and "Çalışma" in x and "Barın HER İKİ tarafına takılacak plakalar (40 kg / taraf):" in x, "tr: plaka aracı metinleri aynı")
    pg.evaluate("closeModal('chartModal')")
    pg.evaluate("openExercisePicker()")
    chips = pg.evaluate("[...document.querySelectorAll('#pickerChips button')].map(b => b.textContent)")
    check(chips[0] == "Tümü" and chips[2] == "Sırt - Dikey Çekiş" and chips[5] == "Bacak - Ön Bacak" and chips[9] == "Kol - Triceps", "tr: seçici çipleri aynı: %s" % chips)
    pg.evaluate("closeModal('pickerModal')")
    # program işlemleri: onay pencereleri ve geri al bildirimleri
    setlang('en')
    pg.evaluate("void addWorkoutDay()"); pg.wait_for_selector("#uiDialog:not(.hidden)")
    x = pg.evaluate("[$('uiDlgTitle').textContent, $('uiDlgMsg').textContent, $('uiDlgOk').textContent, $('uiDlgInput').placeholder].join('|')")
    check(x == "New workout day|Enter a name for the day.|Add|E.g. DAY 5: Arms", "en: Yeni gün penceresi: " + x)
    pg.click("#uiDlgCancel")
    pg.evaluate("void renameWorkoutDay()"); pg.wait_for_selector("#uiDialog:not(.hidden)")
    x = pg.evaluate("[$('uiDlgTitle').textContent, $('uiDlgMsg').textContent, $('uiDlgOk').textContent].join('|')")
    check(x == "Rename day|Enter a new name for this day.|Save", "en: Günü adlandır penceresi: " + x)
    pg.click("#uiDlgCancel")
    pg.evaluate("void deleteWorkoutDay()"); pg.wait_for_selector("#uiDialog:not(.hidden)")
    x = pg.evaluate("[$('uiDlgTitle').textContent, $('uiDlgMsg').textContent, $('uiDlgOk').textContent].join('|')")
    check(x.startswith("Delete this day?|") and "and all its exercises will be deleted. You can undo this within 6 seconds." in x and x.endswith("|Delete"), "en: Günü sil penceresi: " + x)
    pg.click("#uiDlgOk"); pg.wait_for_timeout(120)
    x = pg.evaluate("$('toastWrap').textContent")
    check(x.rstrip().endswith("Undo") and "deleted" in x and not TR_CH.search(re.sub("|".join(re.escape(u) for u in USERS), " ", x)), "en: gün silindi bildirimi: " + x)
    pg.click("#toastWrap button"); pg.wait_for_timeout(120)
    pg.evaluate("() => { const d = activeDay(); d.exercises.push({ name: 'Zz Del', kind: 'weight', targetInfo: '3x8', sets: makeWeightSets(3, '8', 10, 8) }); renderAll(); removeExercise(d.exercises.length - 1); }")
    x = pg.evaluate("$('toastWrap').textContent")
    check('"Zz Del" removed' in x and x.rstrip().endswith("Undo"), "en: hareket kaldırıldı bildirimi: " + x)
    pg.evaluate("() => { state.workoutLogs.push({ ts: Date.now(), date: '1 Kas', dayName: 'X', sets: 1, volume: 1, prs: 0 }); deleteWorkoutLog(state.workoutLogs.length - 1); }")
    x = pg.evaluate("$('toastWrap').textContent")
    check("Workout entry deleted" in x, "en: antrenman kaydı silindi bildirimi: " + x)
    pg.evaluate("() => { try { doUndo(); } catch (e) {} }")
    # rekor bildirimi (set tamamlayınca) ve eklenti/güncelleme bildirimleri
    pg.evaluate("() => { const d = activeDay(); d.exercises.push({ name: 'Zz Pr', kind: 'weight', targetInfo: '3x8', sets: makeWeightSets(3, '8', 100, 8) }); state.exerciseHistory[exKey('Zz Pr')] = [{ ts: Date.now() - 86400000, kind: 'weight', sets: [{ kg: 50, reps: 8 }] }]; renderAll(); toggleSetDone(d.exercises.length - 1, 0); }")
    x = pg.evaluate("$('toastWrap').textContent")
    check("NEW PR! Zz Pr: 100 kg × 8 (estimated 1RM ~127 kg)" in x, "en: yeni rekor bildirimi: " + x)
    pg.evaluate("() => { const d = activeDay(); d.exercises.pop(); state.workoutStartedAt = 0; renderAll(); }")
    pg.evaluate("openExerciseModal({ kind: 'weight', name: 'Zz Added' }); saveExerciseModal();")
    x = pg.evaluate("$('toastWrap').textContent")
    check("Zz Added added" in x, "en: hareket eklendi bildirimi: " + x)
    pg.evaluate("() => { const d = activeDay(); openEditExercise(d.exercises.length - 1); saveExerciseModal(); }")
    check("Exercise updated" in pg.evaluate("$('toastWrap').textContent"), "en: hareket güncellendi bildirimi")
    pg.evaluate("openExerciseModal({ kind: 'weight', name: '' }); void 0; saveExerciseModal();")
    pg.wait_for_selector("#uiDialog:not(.hidden)")
    check(pg.evaluate("[$('uiDlgTitle').textContent, $('uiDlgMsg').textContent].join('|')") == "Exercise name missing|Please enter an exercise name.", "en: hareket adı eksik penceresi")
    pg.evaluate("uiDialogDone(true); closeModal('exerciseModal')")
    # antrenmanı bitirme: onay + bildirim + kayıtlı tarih Türkçe aylı
    FIN = """(prs) => { const d = activeDay(); d.exercises.splice(0);
      d.exercises.push({ name: 'Zz Fin', kind: 'weight', targetInfo: '3x8', sets: makeWeightSets(3, '8', 60, 8) });
      d.exercises.push({ name: 'Zz FinC', kind: 'cardio', targetInfo: '20 dk', sets: [{ min: 20, km: 3, lvl: '', done: false }] });
      d.exercises.forEach(e => e.sets.forEach(s => { s.done = true; }));
      d.exercises[0].sets.forEach((s, i) => { s.pr = i < prs; });
      state.workoutStartedAt = Date.now() - 45 * 60000; renderAll(); void finishAndLogWorkout(); }"""
    for lang, prs in (('en', 2), ('en', 1), ('en', 0), ('tr', 2)):
        setlang(lang)
        pg.evaluate("() => { document.querySelectorAll('#toastWrap > *').forEach(e => e.remove()); }")
        pg.evaluate(FIN, prs)
        pg.wait_for_selector("#uiDialog:not(.hidden)")
        m = pg.evaluate("[$('uiDlgTitle').textContent, $('uiDlgMsg').textContent, $('uiDlgOk').textContent].join('|')")
        if lang == 'en': check(m.endswith(" · 4 sets completed|Save") and m.startswith("Save this workout?|"), "en: bitir onayı: " + m)
        else: check(m.endswith(" · 4 set tamamlandı|Kaydet") and m.startswith("Antrenman kaydedilsin mi?|"), "tr: bitir onayı: " + m)
        pg.click("#uiDlgOk"); pg.wait_for_timeout(150)
        x = re.sub(r"\s+", " ", pg.evaluate("$('toastWrap').textContent")).strip()
        if lang == 'en':
            want = {2: "Well done! Workout saved: 45 min, 1,440 kg volume, 20 min cardio, 2 PRs", 1: "Well done! Workout saved: 45 min, 1,440 kg volume, 20 min cardio, 1 PR", 0: "Well done! Workout saved: 45 min, 1,440 kg volume, 20 min cardio"}[prs]
            check(x == want + "Share" and "1 PRs" not in x, "en: bitiş bildirimi (%d rekor): %s" % (prs, x))
        else:
            check(x.startswith("Tebrikler! 45 dk, 1.440 kg tonaj, 20 dk kardiyo, 2 rekor kaydedildi") and x.endswith("Paylaş"), "tr: bitiş bildirimi aynı: " + x)
        dt = pg.evaluate("state.workoutLogs[state.workoutLogs.length - 1].date")
        check(re.match(r"^\d{1,2} " + MON_TR, dt) is not None, "%s: kayıtlı workoutLogs.date Türkçe ay kısaltmalı: %r" % (lang, dt))
        if lang == 'en':
            r = pg.evaluate("[finishToastText(0, 5400, 0, 0), finishToastText(0, 5400, 12.5, 1), finishToastText(75, 5400, 0, 3)].join('|')")
            check(r == "Well done! Workout saved: 5,400 kg volume|Well done! Workout saved: 5,400 kg volume, 12.5 min cardio, 1 PR|Well done! Workout saved: 1 h 15 min, 5,400 kg volume, 3 PRs", "en: bitiş bildirimi kalıpları: " + r)
        else:
            r = pg.evaluate("[finishToastText(0, 5400, 0, 0), finishToastText(0, 5400, 12.5, 1), finishToastText(75, 5400, 0, 3)].join('|')")
            check(r == "Tebrikler! 5.400 kg tonaj kaydedildi|Tebrikler! 5.400 kg tonaj, 12,5 dk kardiyo, 1 rekor kaydedildi|Tebrikler! 1 sa 15 dk, 5.400 kg tonaj, 3 rekor kaydedildi", "tr: bitiş bildirimi kalıpları aynı: " + r)
    # ısınma oturumu başlığı
    setlang('en')
    pg.evaluate("() => { state.gymActive = false; state.gymView = 'today'; renderAll(); }")
    ok = pg.evaluate("(() => { if (!mobWarmupItems(activeDay()).length) return 'yok'; mobWarmupStart(); const ti = mobT && mobT.ses ? mobT.ses.title : null; mobTimerClose(); return ti; })()")
    check(ok in ("Warm-up", "yok"), "en: ısınma oturumu başlığı: %s" % ok)
    setlang('tr')
    ok = pg.evaluate("(() => { if (!mobWarmupItems(activeDay()).length) return 'yok'; mobWarmupStart(); const ti = mobT && mobT.ses ? mobT.ses.title : null; mobTimerClose(); return ti; })()")
    check(ok in ("Isınma", "yok"), "tr: ısınma oturumu başlığı: %s" % ok)
    check(errs == [], "sayfa hatası yok: " + str(errs[:3]))
    b.close()
finally:
    srv.terminate()
print("BAŞARISIZ:" if fails else "TÜMÜ GEÇTİ", fails)
sys.exit(1 if (fails or errs) else 0)
