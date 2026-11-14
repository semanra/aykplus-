# Kontrol araçlarının ortak parçaları: sabit veri, ekran listesi, ölçüm betikleri, yerel sunucu.
# Kullanım: scripts/kontrol/kontrol.py içinden içe aktarılır.
import os, sys, subprocess, time, socket, contextlib, datetime

FIXED_TIME = datetime.datetime(2026, 11, 14, 10, 30, 0)   # ekranlar her çalıştırmada aynı çıksın diye sabit saat
NO_ANIM = ("document.addEventListener('DOMContentLoaded',()=>{const s=document.getElementById('splash'); if(s) s.remove();"
           "const st=document.createElement('style'); st.textContent='*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';"
           "document.head.appendChild(st);})")

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
  ("m-liste", "closeModal('chartModal'); switchTab('mobility')"),
  ("m-detay", "mobOpen(state.mobilityRoutine.routines[0].items[0].id)"),
  ("m-ekle", "mobAddOpen()"),
  ("m-sayac", "mobBack(); const t = state.mobilityRoutine.routines[0].items.find(i => i.mode === 'time'); mobTimerStart(t.id)"),
  ("p-genel", "mobTimerClose(); switchTab('progress'); setProgressView('genel')"),
  ("p-kilo", "setProgressView('kilo')"),
  ("p-guc", "setProgressView('guc')"),
  ("p-beslenme", "setProgressView('beslenme')"),
  ("p-olcu-modal", "setProgressView('kilo'); openMeasureModal()"),
  ("profil", "closeModal('chartModal'); openProfile()"),
  ("profil-orta", PF_SCROLL % 0.45),
  ("profil-alt", PF_SCROLL % 1),
]
SCREEN_ROOT = {"profil": "#profilePage", "profil-orta": "#profilePage", "profil-alt": "#profilePage", "m-sayac": "#mobTimer"}

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
