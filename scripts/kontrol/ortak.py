# Kontrol araçlarının ortak parçaları: sabit veri, ekran listesi, ölçüm betikleri, yerel sunucu.
# Kullanım: scripts/kontrol/kontrol.py içinden içe aktarılır.
import os, sys, subprocess, time, socket, contextlib, datetime

FIXED_TIME = datetime.datetime(2026, 11, 14, 10, 30, 0)   # ekranlar her çalıştırmada aynı çıksın diye sabit saat
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "tests"))
from ortak_tohum import TEST_INIT, SPLASH_OFF   # v44: açılış animasyonu kaldırma + eski varsayılan tohum (kurulum ekranı çıkmasın)
# v55: SPLASH_OFF (dolayısıyla TEST_INIT, NO_ANIM, SPLASH_ANIM, EN_INIT) window.AYK_NO_ANIM = true taşır: uygulama içi
# animasyonlar (halka, sayaç, set tiki, tema geçişi) kapalı, ekranlar son hâlde çekilir.
NO_ANIM = (TEST_INIT + ";" + "document.addEventListener('DOMContentLoaded',()=>{"
           "const st=document.createElement('style'); st.textContent='*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';"
           "document.head.appendChild(st);})")

SPLASH_ANIM = (SPLASH_OFF + ";" + "document.addEventListener('DOMContentLoaded',()=>{"
           "const st=document.createElement('style'); st.textContent='*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';"
           "document.head.appendChild(st);})")   # v44: tohumsuz (gerçek yeni kurulum) kontrol ekranları

def free_port():
    with contextlib.closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as s:
        s.bind(("127.0.0.1", 0)); return s.getsockname()[1]

@contextlib.contextmanager
def server(root):
    port = free_port()
    p = subprocess.Popen([sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1"], cwd=root,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    try: yield f"http://127.0.0.1:{port}/index.html"
    finally: p.terminate()

# Örnek veri: ~10 hafta antrenman, 40 günlük tartı, 20 günlük beslenme, mobilite günlüğü
SEED = r"""() => {
  const D = 864e5, now = Date.now(), key = t => todayStr(new Date(t));
  const ex = [["Barbell Bench Press", "Göğüs", 80], ["Lat Pulldown", "Sırt", 60], ["Romanian Deadlift", "Arka Bacak & Kalça", 90], ["Back Squat", "Ön Bacak", 100], ["Cable Lateral Raise", "Omuz", 10]];
  state.workoutLogs = []; state.exerciseHistory = {};
  for (let w = 9; w >= 0; w--) {
    [0, 2, 4].forEach((dd, j) => {
      const ts = weekStart() - w * 7 * D + dd * D + 18 * 3600e3;
      if (ts > now) return;
      const logId = "l" + w + j; let vol = 0;
      ex.forEach(([name, muscle, base]) => {
        if (name === "Back Squat" && w > 2) return;
        const kg = base + (9 - w) * 2.5, sets = [{ kg, reps: 8 }, { kg, reps: 7 }, { kg, reps: 6 }];
        vol += sets.reduce((a, s) => a + s.kg * s.reps, 0);
        (state.exerciseHistory[exKey(name)] = state.exerciseHistory[exKey(name)] || []).push({ ts, logId, kind: "weight", name, muscle, sets });
      });
      state.workoutLogs.push({ id: logId, ts, volume: vol, sets: 14, cardioMin: j === 1 ? 20 : 0, cardioKm: 0, prs: w === 0 && j === 0 ? 1 : 0 });
    });
  }
  state.weightLogs = [];
  for (let i = 40; i >= 1; i--) if (i % 3 !== 1) state.weightLogs.push({ date: fmtDate(now - i * D), weight: +(100 - (40 - i) * 0.09 + ((i * 7) % 5) * 0.12).toFixed(1), ts: now - i * D });
  state.weight = 96.8;
  state.measurements = [{ ts: now - 30 * D, bel: 104, gogus: 118, kol: 41 }, { ts: now - 3 * D, bel: 101.5, gogus: 117, kol: 41.5 }];
  state.dailyLogs = {};
  for (let i = 1; i <= 20; i++) { const k = key(now - i * D); state.dailyLogs[k] = { kcal: 2480, p: 200, eatenKcal: [2450, 2610, 2300, 2490, 2900, 2380, 2470][i % 7], eatenP: 185, mealsDone: i % 6 === 0 ? 0 : 4, mealsTotal: 4, water: [3.8, 4.4, 3.1, 4.2, 2.9][i % 5], calTarget: 2478, proTarget: 201 }; }
  state.mobilityLog = {}; [1, 2, 4, 5, 8].forEach(i => { state.mobilityLog[key(now - i * D)] = ["Couch Stretch"]; });
  state.mobilityRoutine.routines[0].items[0].done = true;
  const m = dayMeals(); if (m[0]) m[0].done = true;
  state.waterLiters = 1.5; state.lastBackupAt = Date.now(); state.backupSnoozeUntil = Date.now() + 9e9;
  state.settings.bodyFat = 24; state.settings.targetBodyFat = 15;
  renderAll();
}"""

# (ad, js) — sırayla çalışır; her adım bir öncekinin üstüne. Pencereler dahil 36 ekran.
# Profil tam ekran bir pencere; kendi içinde kayar (sayfa görüntüsüne alt kısmı girmez) — orta ve alt bölümler ayrıca çekilir
PF_SCROLL = "const sc = [...document.querySelectorAll('#profilePage *')].find(e => e.scrollHeight > e.clientHeight + 10 && getComputedStyle(e).overflowY !== 'visible'); if (sc) sc.scrollTop = (sc.scrollHeight - sc.clientHeight) * %s"
SCREENS = [
  ("n-bugun", "switchTab('nutrition'); setNutriView('today')"),
  ("n-menu", "setNutriView('menus')"),
  ("n-besin", "setNutriView('foods')"),
  ("n-gecmis", "setNutriView('history')"),
  ("n-swap-modal", "setNutriView('today'); openSwap(1, 0, 'day')"),
  ("n-ozel-besin", "closeModal('pickerModal'); openCustomFoodModal()"),
  ("n-ogun-modal", "closeModal('customFoodModal'); openMealModal(0)"),
  ("n-tarif", "closeModal('mealModal'); openRecipeModal()"),
  ("n-alisveris", "closeModal('recipeModal'); openShopList()"),
  ("n-disarida", "closeModal('shopModal'); openFreeMeal(1)"),
  ("n-dialog", "closeModal('freeMealModal'); void uiAsk({title:'Deneme', message:'Beslenme penceresi', ok:'Tamam'})"),
  ("n-toast", "uiDialogDone(false); toast('Deneme bildirimi', 'ok', { label: 'Geri al', fn: () => {} })"),
  ("g-bugun", "document.getElementById('toastWrap').innerHTML=''; switchTab('gym'); setGymView('today')"),
  ("g-program", "setGymView('program')"),
  ("g-kutuphane", "setGymView('library')"),
  ("g-gecmis", "setGymView('history')"),
  ("g-aktif", "setGymView('today'); startWorkout()"),
  ("g-sayac", "startTimer(90)"),
  ("g-hareket-modal", "openEditExercise(0)"),
  ("g-grafik-modal", "closeModal('exerciseModal'); openExerciseChart(0)"),
  ("g-plaka-modal", "closeModal('chartModal'); openPlateTool(0)"),
  ("g-kademe-modal", "closeModal('chartModal'); const e = activeDay().exercises[3]; e.equip = 'stack'; e.levels = { mode: 'step', start: 5, step: 5, addon: 0 }; e.sets[0].kg = 40; openPlateTool(3)"),
  ("g-secici", "closeModal('chartModal'); openExercisePicker()"),
  ("g-dialog", "closeModal('pickerModal'); void uiAsk({title:'Deneme', message:'Antrenman penceresi', input:{value:'12'}, ok:'Kaydet'})"),
  ("g-toast", "uiDialogDone(false); toast('Deneme bildirimi', 'ok', { label: 'Geri al', fn: () => {} })"),
  ("g-paylas", "document.getElementById('toastWrap').innerHTML=''; state.gymActive = false; stopTimer(); setGymView('history'); openShareCard(0)"),
  ("m-liste", "closeModal('chartModal'); switchTab('mobility')"),   # v39: mobilite ana ekranı
  ("m-rutin", "mobOpenRoutine(mobRoutines()[0].id)"),
  ("m-duzenle", "mobEdit(true)"),
  ("m-detay", "mobEdit(false); mobOpen(state.mobilityRoutine.routines[0].items[0].id)"),
  ("m-ekle", "mobBack(); mobEdit(true); mobAddOpen()"),
  ("m-sayac", "mobBack(); const t = state.mobilityRoutine.routines[0].items.find(i => i.mode === 'time'); mobTimerStart(t.id)"),
  ("m-seans-tekrar", "mobTimerClose(); mobSesStart(mobRoutines()[0].id)"),
  ("m-seans-sure", "const r = mobRoutines()[0]; mobSesLoad(r.items.findIndex(i => i.mode === 'time'))"),
  ("m-bitis", "mobSesFinish()"),
  ("p-genel", "mobTimerClose(); switchTab('progress'); setProgressView('genel')"),
  ("p-kilo", "setProgressView('kilo')"),
  ("p-guc", "setProgressView('guc')"),
  ("p-beslenme", "setProgressView('beslenme')"),
  ("p-olcu-modal", "setProgressView('kilo'); openMeasureModal()"),
  # v64: ölçü rehberi (ölçü penceresinden)
  ("p-olcu-rehber", "openMeasureGuide(true); document.querySelectorAll('[data-olcu-img] img').forEach(i => { i.loading = 'eager'; })"),
  ("profil", "closeModal('chartModal'); openProfile()"),
  ("profil-orta", PF_SCROLL % 0.45),
  ("profil-alt", PF_SCROLL % 1),
  # v44: Profil → Hakkında (ayrıntı bölümleri açık)
  ("profil-hakkinda", "document.querySelectorAll('#pfMethod, #pfLicenses').forEach(d => d.open = true); " + PF_SCROLL % 1),
  # v59: gerçek Profil düzeni (testlerdeki AYK_PF_FLAT kapalı): ana ekran, arama ve alt sayfalar. Listenin sonunda kalmalı.
  ("profil-ana", "window.AYK_PF_FLAT = false; closeProfile(); openProfile()"),
  ("profil-ara", "$('pfSearch').value = 'yedek'; pfSearchInput()"),
  ("profil-kisisel", "pfOpen('me')"),
  ("profil-hedef", "pfOpen('body')"),
  ("profil-gorunum", "pfOpen('app')"),
  ("profil-antrenman", "pfOpen('train')"),
  ("profil-beslenme", "pfOpen('nutri')"),
  ("profil-veri", "pfOpen('data')"),
  ("profil-hakkinda2", "pfOpen('about')"),
]
# v59: gerçek Profil düzeni ekranları yalnız görünür alan çekilir (sabit katman; arkadaki sayfa tam sayfa çekimine karışır)
PF_VIEW_ONLY = ("profil-ana", "profil-ara", "profil-kisisel", "profil-hedef", "profil-gorunum", "profil-antrenman", "profil-beslenme", "profil-veri", "profil-hakkinda2", "en-pf-")
SCREEN_ROOT = {**{k: "#profilePage" for k in ("profil-ana", "profil-ara", "profil-kisisel", "profil-hedef", "profil-gorunum", "profil-antrenman", "profil-beslenme", "profil-veri", "profil-hakkinda2")}, "profil": "#profilePage", "profil-orta": "#profilePage", "profil-alt": "#profilePage", "m-sayac": "#mobTimer",
               "m-seans-tekrar": "#mobTimer", "m-seans-sure": "#mobTimer", "m-bitis": "#mobTimer"}

# v47: İngilizce ölçüm ekranları (piksel karşılaştırması YOK, yalnız taşma / 44 px / okunurluk). setLang('en') ile açılır.
# v52: İngilizce herkese açık (EN_PUBLIC) → test bayrağı AYK_TEST_EN gerekmez; ayrıca TR_WORD_SCAN_JS ile Türkçe metin taranır.
EN_INIT = NO_ANIM
EN_SCREENS = [
  ("en-n-bugun", "setLang('en'); switchTab('nutrition'); setNutriView('today')"),
  ("en-n-menu", "setNutriView('menus')"),
  ("en-n-besin", "setNutriView('foods')"),
  ("en-n-gecmis", "setNutriView('history')"),
  ("en-n-swap-modal", "setNutriView('today'); openSwap(1, 0, 'day')"),
  ("en-n-ozel-besin", "closeModal('pickerModal'); openCustomFoodModal()"),
  ("en-n-ogun-modal", "closeModal('customFoodModal'); openMealModal(0)"),
  ("en-n-tarif", "closeModal('mealModal'); openRecipeModal()"),
  ("en-n-alisveris", "closeModal('recipeModal'); openShopList()"),
  ("en-n-disarida", "closeModal('shopModal'); openFreeMeal(1)"),
  ("en-n-dialog", "closeModal('freeMealModal'); void manualNewDay()"),
  ("en-profil", "uiDialogDone(false); openProfile()"),
  ("en-profil-orta", PF_SCROLL % 0.45),
  ("en-profil-alt", PF_SCROLL % 1),
  # v48: Antrenman (yalnız ölçüm)
  ("en-g-bugun", "void closeProfile(); document.getElementById('toastWrap').innerHTML=''; switchTab('gym'); setGymView('today')"),
  ("en-g-aktif", "startWorkout(); toggleSetDone(0, 0)"),
  ("en-g-program", "state.gymActive = false; stopTimer(); setGymView('program')"),
  ("en-g-hareketler", "setGymView('library'); selectMuscle('Arka Bacak & Kalça')"),
  ("en-g-gecmis", "selectMuscle(null); setGymView('history')"),
  ("en-g-hareket", "setGymView('today'); openEditExercise(0); const q = document.getElementById('exEquip'); q.value = 'stack'; q.dispatchEvent(new Event('change', { bubbles: true }))"),
  ("en-g-plaka", "closeModal('exerciseModal'); openPlateTool(0)"),
  # v49: Mobilite (yalnız ölçüm)
  ("en-m-ana", "closeModal('chartModal'); switchTab('mobility'); mobUI.view = 'home'; renderMobility()"),
  ("en-m-rutin", "mobOpenRoutine(mobRoutines()[0].id)"),
  ("en-m-duzenle", "mobEdit(true)"),
  ("en-m-detay", "mobEdit(false); mobOpen(state.mobilityRoutine.routines[0].items[0].id)"),
  ("en-m-ekle", "mobBack(); mobEdit(true); mobAddOpen()"),
  ("en-m-seans", "mobBack(); mobEdit(false); mobSesStart(mobRoutines()[0].id); mobSesLoad(mobRoutines()[0].items.findIndex(i => i.mode === 'time'))"),
  ("en-m-bitis", "mobSesFinish()"),
  # v50: İlerleme (yalnız ölçüm)
  ("en-p-genel", "mobTimerClose(); switchTab('progress'); setProgressView('genel')"),
  ("en-p-kilo", "setProgressView('kilo')"),
  ("en-p-guc", "setProgressView('guc')"),
  ("en-p-beslenme", "setProgressView('beslenme')"),
  ("en-p-grafik", "setProgressView('guc'); openExerciseChart(0)"),
  ("en-p-olcu-rehber", "closeModal('chartModal'); openMeasureGuide(); document.querySelectorAll('[data-olcu-img] img').forEach(i => { i.loading = 'eager'; })"),
  # v51: Besin adları (yalnız ölçüm; foods-en.js yüklenmiş olmalı, kontrol.py bekler)
  ("en-n-besin-ara", "closeModal('chartModal'); switchTab('nutrition'); setNutriView('foods'); $('foodSearch').value = 'chicken breast'; foodSearchInput(); renderFoods()"),
  ("en-n-besin-kart", "selectFood('u171474'); renderAll()"),
  # v53: imperial (lb / ft-in / in) İngilizce ekranlar (yalnız ölçüm; lb ve ft-in etiketleri daha uzun olabilir → taşma)
  ("en-u-menu", "setUnits('imperial'); setNutriView('menus')"),
  ("en-u-aktif", "switchTab('gym'); setGymView('today'); startWorkout(); toggleSetDone(0, 0)"),
  ("en-u-plaka", "openPlateTool(0)"),
  ("en-u-hareket", "closeModal('chartModal'); openEditExercise(0)"),
  ("en-u-kilo", "closeModal('exerciseModal'); state.gymActive = false; stopTimer(); switchTab('progress'); setProgressView('kilo')"),
  ("en-u-guc", "setProgressView('guc')"),
  ("en-u-olcu", "setProgressView('kilo'); openMeasureModal()"),
  ("en-u-profil", "closeModal('chartModal'); openProfile()"),
  ("en-u-profil-orta", PF_SCROLL % 0.45),
  # v59: gerçek Profil düzeni İngilizce (metrik)
  ("en-pf-ana", "closeProfile(); window.AYK_PF_FLAT = false; openProfile()"),
  ("en-pf-hedef", "pfOpen('body')"),
  ("en-pf-antrenman", "pfOpen('train')"),
  ("en-pf-veri", "pfOpen('data')"),
]
EN_ROOT = {"en-pf-ana": "#profilePage", "en-pf-hedef": "#profilePage", "en-pf-antrenman": "#profilePage", "en-pf-veri": "#profilePage", "en-profil": "#profilePage", "en-profil-orta": "#profilePage", "en-profil-alt": "#profilePage", "en-m-seans": "#mobTimer", "en-m-bitis": "#mobTimer",
           "en-u-profil": "#profilePage", "en-u-profil-orta": "#profilePage"}
# v44: kurulum ekranları. TEST_INIT OLMADAN, temiz depoda açılır (gerçek yeni kurulum yolu). Sırayla; her adım öncekinin üstüne.
ONBOARD_SCREENS = [
  ("ob-1", ""),
  ("ob-2", "obNext()"),
  ("ob-3", "obPick('sex','female'); obInput('age','29'); obInput('height','165'); obInput('weight','72'); obNext()"),
  ("ob-4", "obPick('goal','lose'); obInput('target','65'); obNext()"),
  ("ob-5", "obPick('act','mid'); obNext()"),
  ("ob-6", "obPick('exp','new'); obNext()"),
  ("ob-7", "obNext()"),
]
# v50: İngilizce kurulum 1–7 (tohumsuz, temiz depoda, dil seçilerek); ONBOARD_SCREENS adımlarıyla aynı, görünür alan çekimi
EN_ONBOARD_SCREENS = [("en-" + n, ("obPickLang('en')" if n == "ob-1" else js)) for n, js in ONBOARD_SCREENS]
# Kurulum üç örnek kutusu işaretsiz bitirilince: boş başlangıç ekranları
FRESH_SCREENS = [
  ("bos-menu", "obDraft.menu = false; obDraft.prog = false; obDraft.mob = false; finishOnboarding(); switchTab('nutrition'); setNutriView('menus')"),
  ("bos-antrenman", "switchTab('gym'); setGymView('today')"),
]
FIXED_NAMES = [n for n, _ in ONBOARD_SCREENS] + [n for n, _ in FRESH_SCREENS]

# Ölçüm: okunurluk (WCAG 4,5:1 / büyük yazı 3:1), 44 px altı dokunma alanı, 12 px altı yazı, yatay taşma
AUDIT_JS = r"""(rootSel) => {
const ROOT = rootSel ? document.querySelector(rootSel) : document.body;
const vis = e => { if (!e.checkVisibility || !e.checkVisibility({checkOpacity:true, checkVisibilityCSS:true})) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
const parse = s => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [p[0],p[1],p[2], p.length>3 ? p[3] : 1]; };
const lum = c => { const f = v => { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); }; return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2]); };
const ratio = (a,b) => { const x=lum(a), y=lum(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); };
const over = (t, b) => { const a=t[3]; return [t[0]*a+b[0]*(1-a), t[1]*a+b[1]*(1-a), t[2]*a+b[2]*(1-a), 1]; };
function bgOf(el) {
  const layers = []; let grad = null;
  for (let e = el; e; e = e.parentElement) {
    const cs = getComputedStyle(e);
    if (cs.backgroundImage && cs.backgroundImage.includes('gradient')) { const st = [...cs.backgroundImage.matchAll(/rgba?\([^)]+\)/g)].map(m => parse(m[0])).filter(c => c && c[3] > 0.5); if (st.length) { grad = st; break; } }
    const c = parse(cs.backgroundColor); if (c && c[3] > 0) { layers.push(c); if (c[3] >= 1) break; }
  }
  let bases = grad ? grad.map(g => [g[0],g[1],g[2],1]) : [parse(getComputedStyle(document.body).backgroundColor) || [0,0,0,1]];
  return bases.map(b => { let c = b; for (let i = layers.length-1; i >= 0; i--) c = over(layers[i], c); return c; });
}
const path = e => { const p=[]; for (let x=e; x && x!==document.body && p.length<3; x=x.parentElement) p.unshift(x.id ? '#'+x.id : x.tagName.toLowerCase()+(x.classList[0] ? '.'+x.classList[0] : '')); return p.join(' > '); };
const out = { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, contrast: [], small: [], tiny: [] };
for (const e of ROOT.querySelectorAll('*')) {
  if (!vis(e) || e.closest('svg') || e.closest('.t-bodymap')) continue;
  if (![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
  const cs = getComputedStyle(e), fs = parseFloat(cs.fontSize), fw = parseInt(cs.fontWeight) || 400;
  let col = parse(cs.color); if (!col) continue;
  let op = 1; for (let x = e; x; x = x.parentElement) op *= parseFloat(getComputedStyle(x).opacity);
  if (op < 0.5 || e.closest('[disabled]')) continue;
  const r = Math.min(...bgOf(e).map(b => ratio(col[3] < 1 ? over(col, b) : col, b)));
  const need = (fs >= 24 || (fs >= 18.66 && fw >= 700)) ? 3 : 4.5;
  const t = e.textContent.replace(/\s+/g,' ').trim().slice(0, 32);
  if (r < need) out.contrast.push({ t, r: +r.toFixed(2), need, at: path(e) });
  if (fs < 11) out.tiny.push({ t, fs, at: path(e) });
}
for (const e of ROOT.querySelectorAll('button, a[href], input:not([type=hidden]):not([type=range]), select, [role=button]')) {
  if (!vis(e)) continue;
  const par = e.parentElement && e.parentElement.closest('button, a[href], label');
  if (par && par !== e) { const pr = par.getBoundingClientRect(); if (pr.width >= 44 && pr.height >= 44) continue; }
  const r = e.getBoundingClientRect();
  if (r.width < 44 || r.height < 44) out.small.push({ t: ((e.getAttribute('aria-label') || e.textContent || e.getAttribute('placeholder') || e.tagName) + '').replace(/\s+/g,' ').trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height), at: path(e) });
}
return out;
}"""

# v52: İngilizce ekranlarda Türkçe metin taraması (görünen metin + aria-label/placeholder).
# Türkçe harf ya da Türkçe harfsiz Türkçe kelime ("dk", "sn", "kez", "Tumu"…) yakalanır. Kullanıcı içeriği hariç:
# kayıttaki öğün/gün/hareket/rutin/takviye/kombo/özel besin adları ve notları, Türk yemekleri (r_…) ve
# BASE_EN'de Türkçe adıyla kalan Türkiye'ye özgü ürünler, dil seçicideki "Türkçe".
TR_WORD_SCAN_JS = r"""(rootSel) => {
const TR = /[çğıöşüÇĞİÖŞÜ]/, W = /\b(dk|sn|kez|tekrar|gun|Tumu|Kaydet|Geri|Ekle|Sil|Hedef|Bugun)\b/;
const U = new Set(["Türkçe"]);
const add = s => { if (typeof s !== 'string') return; s = s.trim(); if (!s) return; U.add(s); try { U.add(upperL(s)); U.add(lowerL(s)); } catch (e) {}
  if (s.includes(':')) s.split(':').forEach(p => { p = p.trim(); if (p.length > 2) { U.add(p); try { U.add(upperL(p)); } catch (e) {} } }); };
const S = state;
const meals = [...(S.meals || []), ...(S.restMeals || []), ...(S.dayPlan ? [...(S.dayPlan.train || []), ...(S.dayPlan.rest || [])] : [])];
meals.forEach(m => { add(m.title); add(m.targetNote); (m.items || []).forEach(i => { if (i.est) add(i.est.name); }); });
(S.workoutDays || []).forEach(d => { if (d.name !== '1. Gün' && d.name !== 'Antrenman günü') add(d.name); (d.exercises || []).forEach(e => { add(e.name); add(exNameL(e.name)); add(e.note); }); });
Object.values(S.exerciseHistory || {}).forEach(l => (l || []).forEach(x => { add(x.name); add(exNameL(x.name)); }));
(S.workoutLogs || []).forEach(l => add(l.dayName));
mobRoutines().forEach(r => { add(r.name); (r.items || []).forEach(i => { add(i.name); add(mobNameL(i.name)); if (mobNoteL(i.note) === i.note) add(i.note); }); });
(S.supplementList || []).forEach(s => { add(s.name); add(s.timeLabel); add(s.note); });
(S.combos || []).forEach(c => add(c.name));
Object.values(S.customFoods || {}).forEach(f => add(f.name));
(S.missSearches || []).forEach(x => add(typeof x === 'string' ? x : x && x.q));
const db = getFoodDB();
Object.keys(db).forEach(id => { const f = db[id]; const b = baseIdOf(f);
  if (id.startsWith('r_') || id.startsWith('custom') || (b && Object.prototype.hasOwnProperty.call(BASE_EN, b))) { add(foodNameL(f)); add(f.name); } });
const US = [...U].sort((a, b) => b.length - a.length);
const strip = s => { for (const u of US) if (s.includes(u)) s = s.split(u).join(' '); return s; };
const ROOT = rootSel ? document.querySelector(rootSel) : document.body;
const vis = e => e && e.checkVisibility && e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
const hits = [], seen = new Set();
const test = (raw, where) => { const s = raw.replace(/\s+/g, ' ').trim(); if (!s || seen.has(s)) return; seen.add(s);
  const r = strip(s); const m = r.match(TR) || r.match(W); if (m) hits.push({ t: s.slice(0, 70), m: m[0], at: where }); };
const tw = document.createTreeWalker(ROOT, NodeFilter.SHOW_TEXT);
for (let n = tw.nextNode(); n; n = tw.nextNode()) { const p = n.parentElement; if (!p || p.closest('script,style,svg') || !vis(p)) continue; test(n.textContent, p.id || p.tagName.toLowerCase()); }
for (const e of ROOT.querySelectorAll('[aria-label],[placeholder]')) { if (!vis(e)) continue;
  ['aria-label', 'placeholder'].forEach(a => { const v = e.getAttribute(a); if (v) test(v, (e.id || e.tagName.toLowerCase()) + '@' + a); }); }
return hits;
}"""
