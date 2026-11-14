// ============================================================================
// v7 — KAS GRUBU, PROGRESİF YÜKLENME, PLAKA/ISINMA, KALORİ KOÇU
// ============================================================================

const MUSCLES = ["Göğüs", "Sırt", "Omuz", "Ön Bacak", "Arka Bacak & Kalça", "Kalf", "Biceps", "Triceps", "Karın"];
const LIB_CAT_MUSCLE = [0, 1, 1, 2, 3, 4, 5, 6, 7, 8, null]; // EXERCISE_LIBRARY kategori sırası → kas grubu

// Kütüphanedeki isimlerin kas grubu haritası (tam eşleşme)
const LIB_MUSCLE_MAP = (() => {
  const m = {};
  Object.keys(EXERCISE_LIBRARY).forEach((cat, ci) => {
    const g = LIB_CAT_MUSCLE[ci];
    EXERCISE_LIBRARY[cat].forEach(n => { m[exKey(n)] = g == null ? null : MUSCLES[g]; });
  });
  return m;
})();

// Sıralama önemli: önce özel durumlar (leg curl → arka bacak, reverse pec → omuz gibi)
const MUSCLE_RULES = [
  ["Karın", /crunch|leg raise|knee raise|plank|ab wheel|rollout|sit-?up|russian twist|pallof|woodchop|deadbug|dead bug|bird-?dog|vacuum|karın|mekik/],
  ["Kalf", /calf|kalf|tibialis|baldır/],
  ["Arka Bacak & Kalça", /leg curl|hamstring|nordic|\brdl\b|romanian|stiff|hip thrust|glute|abduct|adduct|pull-?through|kalça|good morning/],
  ["Ön Bacak", /squat|leg press|lunge|leg extension|step-?up|hack|sissy|ön bacak/],
  ["Omuz", /shoulder|military|overhead press|arnold|lateral raise|front raise|rear delt|reverse pec|reverse fly|face pull|upright row|shrug|landmine (shoulder )?press|omuz/],
  ["Triceps", /tricep|overhead.*extension|pushdown|skull|jm press|close-?grip (barbell )?bench|bench dips|dip machine|kickback|diamond|arka kol/],
  ["Biceps", /curl|bicep|ön kol/],
  ["Sırt", /pull-?up|chin-?up|pulldown|row|deadlift|rack pull|pullover|hyperextension|back extension|\blat\b|barfiks|sırt/],
  ["Göğüs", /bench|chest|pec|fly|crossover|push-?up|dip|svend|şınav|göğüs|\bpress\b/]
];

function autoMuscle(name) {
  const k = exKey(name);
  if (Object.prototype.hasOwnProperty.call(LIB_MUSCLE_MAP, k)) return LIB_MUSCLE_MAP[k];
  for (const [g, re] of MUSCLE_RULES) if (re.test(k)) return g;
  return null;
}
function muscleOf(ex) {
  if (ex.kind === "cardio") return null;
  return ex.muscle && MUSCLES.includes(ex.muscle) ? ex.muscle : autoMuscle(ex.name);
}

// Varsayılan kilo artış adımı
function autoInc(name) {
  const k = exKey(name);
  if (/dumbbell|dambıl|\bdb\b/.test(k)) return 2;
  if (/squat|deadlift|leg press|hip thrust|hack|rack pull|calf|glute drive|pendulum|belt squat/.test(k)) return 5;
  return 2.5;
}
function incOf(ex) { const v = num(ex.inc, 0); return v > 0 ? v : autoInc(ex.name); }
function roundTo(x, step) { return step > 0 ? Math.round(x / step) * step : x; }

function parseRepRange(ex) {
  const src = String((ex.sets[0] && ex.sets[0].target) || ex.targetInfo || "").replace(/^\d+\s*x\s*/i, "");
  const m = src.match(/(\d+)\s*[–\-]\s*(\d+)/);
  if (m) { const lo = parseInt(m[1], 10), hi = parseInt(m[2], 10); return lo <= hi ? { lo, hi } : { lo: hi, hi: lo }; }
  const one = src.match(/(\d+)/);
  if (one) { const v = parseInt(one[1], 10); return { lo: v, hi: v }; }
  return null;
}

// ---------------------------------------------------------------------------
// PROGRESİF YÜKLENME ASİSTANI
// Son kaydedilen antrenmana bakar: tüm setlerde hedef aralığın üstüne çıktıysan
// kilo artırmayı, setlerin yarısında alt sınırın altında kaldıysan azaltmayı önerir.
// ---------------------------------------------------------------------------
function overloadSuggestion(ex) {
  if (ex.kind !== "weight") return null;
  if (ex.sets.some(s => s.done)) return null;
  const range = parseRepRange(ex);
  if (!range) return null;
  const hist = historyFor(ex.name).filter(h => h.kind === "weight");
  const last = hist[hist.length - 1];
  if (!last || !last.sets || !last.sets.length) return null;
  if (ex.sugDismiss === last.ts) return null;

  const sets = last.sets;
  const maxKg = Math.max(...sets.map(s => num(s.kg)));
  const curMax = Math.max(...ex.sets.map(s => num(s.kg)));
  const inc = incOf(ex);
  const allHit = sets.length >= ex.sets.length && sets.every(s => num(s.reps) >= range.hi);
  const misses = sets.filter(s => num(s.reps) < range.lo).length;

  // v23: set zorluğu. Tüm setler hedefe ulaştı ama son set "Tükeniş" (ya da puanlananların çoğu Zor/Tükeniş) → artırma, aynı kiloda kal.
  const rated = sets.filter(s => EFFORT_LABELS[s.e]);
  const lastE = num(sets[sets.length - 1].e, 0);
  const hardShare = rated.length ? rated.filter(s => s.e >= 3).length / rated.length : 0;
  const tooHard = lastE === 4 || (rated.length >= 2 && hardShare > 0.5);
  const allEasy = rated.length === sets.length && sets.length >= 2 && sets.every(s => s.e === 1) && misses === 0;
  if (allHit && tooHard && maxKg > 0) {
    if (curMax !== maxKg) return null;
    return {
      type: "hold", ts: last.ts, kg: maxKg, reps: range.hi,
      text: `Geçen sefer tüm setlerde ${range.hi}+ tekrar yaptın ama setler çok zor geçti${lastE === 4 ? " (son sette tükeniş)" : ""}. ${fmtKg(maxKg)} kg'da bir seans daha kal; rahatlayınca artır.`
    };
  }
  if (!allHit && allEasy && maxKg > 0 && curMax <= maxKg) {
    const next = nextLevel(ex, maxKg);
    return {
      type: "up", ts: last.ts, kg: next, reps: range.lo,
      text: `Geçen sefer tüm setleri "Kolay" işaretledin. Kiloyu ${fmtKg(maxKg)} → ${fmtKg(next)} kg'a çıkarmayı dene, ${range.lo} tekrardan başla.`
    };
  }
  if (allHit) {
    if (curMax > maxKg) return null; // zaten artırılmış
    const next = nextLevel(ex, maxKg);
    return {
      type: "up", ts: last.ts, kg: next, reps: range.lo,
      text: maxKg > 0
        ? `Geçen sefer tüm setlerde ${range.hi}+ tekrar yaptın. Kiloyu ${fmtKg(maxKg)} → ${fmtKg(next)} kg'a çıkar, ${range.lo} tekrardan başla.`
        : `Geçen sefer tüm setlerde ${range.hi}+ tekrar yaptın. ${fmtKg(next)} kg ek ağırlık dene veya daha zor bir varyasyona geç.`
    };
  }
  if (maxKg > 0 && misses * 2 >= sets.length) {
    if (curMax < maxKg) return null; // zaten düşürülmüş
    const next = prevLevel(ex, maxKg);
    return {
      type: "down", ts: last.ts, kg: next, reps: range.lo,
      text: `Geçen sefer setlerin çoğunda ${range.lo} tekrarın altında kaldın. Aynı kiloyla devam edebilir ya da ${fmtKg(next)} kg'a düşüp formu sağlamlaştırabilirsin.`
    };
  }
  return null;
}

// v23: Dinlenme haftası (deload) notu. Son 21 günde en az 3 seans var, bu seansların en iyi tahmini 1RM'i öncekilerin en iyisini
// geçmedi ve puanlanan setlerin çoğu (en az %70, en az 3 set) Zor/Tükeniş → yalnızca not; programı değiştirmez.
const DELOAD_WINDOW_MS = 21 * 24 * 3600000;
function deloadInfo(ex) {
  if (ex.kind !== "weight") return null;
  const hist = historyFor(ex.name).filter(h => h.kind === "weight" && h.sets && h.sets.length);
  if (!hist.length) return null;
  const now = Date.now(), from = now - DELOAD_WINDOW_MS;
  const win = hist.filter(h => h.ts >= from), before = hist.filter(h => h.ts < from);
  if (win.length < 3 || !before.length) return null;
  const best = hs => Math.max(...hs.map(h => Math.max(...h.sets.map(s => e1rm(s.kg, s.reps)))));
  const bWin = best(win), bBefore = best(before);
  if (!(bBefore > 0) || bWin > bBefore + 0.01) return null;
  const rated = [].concat(...win.map(h => h.sets.filter(s => EFFORT_LABELS[s.e])));
  if (rated.length < 3 || rated.filter(s => s.e >= 3).length / rated.length < 0.7) return null;
  const lastTs = win[win.length - 1].ts;
  if (ex.deloadDismiss === lastTs) return null;
  return { ts: lastTs, best: Math.round(bBefore), sessions: win.length };
}
function deloadHtml(ex, exIdx) {
  if (ex.sets.some(s => s.done)) return "";
  const d = deloadInfo(ex);
  if (!d) return "";
  return `<div class="bg-[var(--t-warn-bg)] border border-[var(--t-warn-line)] rounded-2xl pl-3 pr-2 py-2 space-y-1.5" data-deload="${exIdx}">
      <div class="flex items-start gap-2.5"><span style="color:var(--t-warn-icon)" class="pt-0.5">${svgI("down", 20, 2.2)}</span>
        <span class="text-[13px] leading-snug text-[var(--t-warn-hi)]">Son 3 haftada ${d.sessions} seansta tahmini 1RM'in ~${d.best} kg'ı geçmedi ve setler çoğunlukla zor geçti. Bu hareket için bir hafta kiloyu ~%10 hafifletmeyi (dinlenme haftası) düşünebilirsin.</span></div>
      <div class="flex justify-end"><button onclick="dismissDeload(${exIdx})" class="text-[12px] t-muted h-11 px-3">Anladım</button></div>
    </div>`;
}
function dismissDeload(exIdx) {
  const ex = activeDay().exercises[exIdx];
  const d = ex && deloadInfo(ex);
  if (!d) return;
  ex.deloadDismiss = d.ts;
  renderAll();
}
function suggestionHtml(ex, exIdx) {
  const sg = overloadSuggestion(ex);
  if (!sg) return deloadHtml(ex, exIdx);
  if (sg.type === "hold") return `${deloadHtml(ex, exIdx)}
    <div class="t-panel rounded-2xl pl-3 pr-2 py-2 space-y-1.5" data-hold="${exIdx}">
      <div class="flex items-start gap-2.5"><span style="color:#1FD1C1" class="pt-0.5">${svgI("check", 20, 2.2)}</span><span class="text-[13px] leading-snug text-[var(--t-panel-text)]">${esc(sg.text)}</span></div>
      <div class="flex justify-end"><button onclick="dismissSuggestion(${exIdx})" class="text-[12px] t-muted h-11 px-3">Anladım</button></div>
    </div>`;
  const up = sg.type === "up";
  const noLv = usesLevels(ex) && !ex.levels && !inferLevels(ex);
  return `
    <div class="${up ? "t-panel" : "bg-[var(--t-warn-bg)] border border-[var(--t-warn-line)]"} rounded-2xl pl-3 pr-2 py-2 space-y-2">
      <div class="flex items-center justify-between gap-2.5">
        <span class="flex items-center gap-2.5 min-w-0">
          <span style="color:${up ? "var(--t-acc-text)" : "var(--t-warn-icon)"}">${svgI(up ? "up" : "down", 20, 2.2)}</span>
          <span class="text-[13px] leading-snug ${up ? "text-[var(--t-panel-text)]" : "text-[var(--t-warn-hi)]"}">${esc(sg.text)}</span>
        </span>
        <span class="flex flex-col gap-1.5 shrink-0">
          <button onclick="applySuggestion(${exIdx})" class="${up ? "t-btn" : "bg-amber-500 text-black font-extrabold"} h-11 px-3.5 rounded-xl text-[13px]">${fmtKg(sg.kg)} kg</button>
        </span>
      </div>
      <div class="flex items-center justify-between gap-2">
        ${noLv ? `<button onclick="openEditExercise(${exIdx})" class="text-[12px] text-[var(--t-warn-hi)] underline text-left">Makine kademelerini tanımla, doğru kiloyu önereyim</button>` : "<span></span>"}
        <button onclick="dismissSuggestion(${exIdx})" class="text-[12px] t-muted h-9 px-2">Şimdi değil</button>
      </div>
    </div>`;
}

function applySuggestion(exIdx) {
  const ex = activeDay().exercises[exIdx];
  const s = overloadSuggestion(ex);
  if (!s) return;
  ex.sets.forEach(x => { x.kg = s.kg; x.reps = s.reps; x.pr = false; });
  ex.sugDismiss = s.ts;
  toast(`${ex.name}: ${fmtKg(s.kg)} kg × ${s.reps}`);
  renderAll();
}
function dismissSuggestion(exIdx) {
  const ex = activeDay().exercises[exIdx];
  const s = overloadSuggestion(ex);
  if (s) ex.sugDismiss = s.ts;
  renderAll();
}

// ---------------------------------------------------------------------------
// HAFTALIK KAS GRUBU SET SAYISI
// ---------------------------------------------------------------------------
function weeklyMuscleSets(fromTs) {
  const counts = {};
  MUSCLES.forEach(m => { counts[m] = 0; });
  Object.keys(state.exerciseHistory).forEach(k => {
    state.exerciseHistory[k].forEach(sess => {
      if (sess.ts < fromTs || sess.kind === "cardio") return;
      const g = sess.muscle && MUSCLES.includes(sess.muscle) ? sess.muscle : autoMuscle(sess.name || k);
      if (g) counts[g] += (sess.sets || []).length;
    });
  });
  return counts;
}


// ---------------------------------------------------------------------------
// PLAKA & ISINMA HESAPLAYICI
// ---------------------------------------------------------------------------
const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
const PLATE_CLS = { 25: "bg-rose-600 text-white", 20: "bg-sky-600 text-white", 15: "bg-amber-500 text-slate-950", 10: "bg-emerald-600 text-white", 5: "bg-slate-100 text-slate-900", 2.5: "bg-slate-600 text-white", 1.25: "bg-slate-500 text-white" };
let plateCtx = { name: "" };

function platesFor(total, bar) {
  const perSide = (total - bar) / 2;
  if (perSide < -1e-9) return { ok: false, reason: "light" };
  let rem = Math.round(perSide * 100) / 100;
  const list = [];
  PLATES.forEach(p => { while (rem + 1e-9 >= p) { list.push(p); rem = Math.round((rem - p) * 100) / 100; } });
  return { ok: rem < 0.01, list, rem, perSide, achieved: bar + 2 * list.reduce((a, b) => a + b, 0) };
}

function plateChips(list) {
  if (!list.length) return `<span class="text-[var(--w-dim)]">Plaka yok (sadece bar)</span>`;
  return list.map(p => `<span class="inline-flex items-center justify-center min-w-[2.25rem] px-1.5 py-1 rounded-md text-[12px] font-bold ${PLATE_CLS[p]}">${fmtKg(p)}</span>`).join("");
}

function warmupSets(W, bar) {
  if (!(W > 0)) return [];
  const step = bar > 0 ? 2.5 : 1;
  const out = [];
  if (bar > 0 && W >= bar + 20) out.push({ kg: bar, reps: 10, label: "Boş bar" });
  const steps = [[0.4, 8], [0.6, 5], [0.8, 3]];
  if (W >= 100) steps.push([0.9, 1]);
  steps.forEach(([pct, reps]) => {
    const kg = roundTo(W * pct, step);
    const prev = out.length ? out[out.length - 1].kg : 0;
    if (kg > prev && kg < W && (bar === 0 || kg >= bar)) out.push({ kg, reps, label: `%${Math.round(pct * 100)}` });
  });
  return out;
}

function openPlateTool(exIdx) {
  const ex = activeDay().exercises[exIdx];
  const next = ex.sets.find(s => !s.done) || ex.sets[0];
  const W = num(next && next.kg) || Math.max(...ex.sets.map(s => num(s.kg)), 0);
  const lv = usesLevels(ex);
  plateCtx = { name: ex.name, exIdx, levels: lv ? levelListOf(ex) : null, lv };
  $("chartTitle").textContent = ex.name;
  const bar = num(state.settings.barKg, 20);
  if (lv && !plateCtx.levels) {
    $("chartBody").innerHTML = `<div class="text-sm text-[var(--w-muted)] space-y-3">
      <p>Bu hareket için ${equipOf(ex) === "dumbbell" ? "dambıl" : "makine"} kademeleri tanımlı değil. Kademeleri girersen ısınma setlerini ve kilo artırma önerilerini makinede gerçekten seçebileceğin kilolara göre hesaplarım.</p>
      <button onclick="closeModal('chartModal'); openEditExercise(${exIdx})" class="w-full w-btn text-sm font-semibold py-2.5 rounded-lg">Kademeleri tanımla</button></div>`;
    openModal("chartModal");
    return;
  }
  $("chartBody").innerHTML = `
    <div class="grid ${lv ? "grid-cols-1" : "grid-cols-2"} gap-2 text-xs">
      <div><label class="block text-[var(--w-muted)] mb-1">Çalışma kilosu (kg)</label>
        <input id="ptKg" type="text" inputmode="decimal" value="${esc(fmtKg(W))}" oninput="renderPlateTool()" class="w-full p-2 rounded-lg text-base text-center font-bold" /></div>
      ${lv ? "" : `<div><label class="block text-[var(--w-muted)] mb-1">Bar ağırlığı</label>
        <select id="ptBar" onchange="state.settings.barKg = num(this.value, 20); saveState(); renderPlateTool();" class="w-full p-2 rounded-lg text-sm">
          ${[[20, "20 kg Olimpik bar"], [15, "15 kg Bar"], [10, "10 kg EZ / kısa bar"], [0, "Bar yok / plakalı makine"]].map(([v, l]) => `<option value="${v}" ${v === bar ? "selected" : ""}>${l}</option>`).join("")}
        </select></div>`}
    </div>
    <div id="ptOut" class="mt-3 space-y-3"></div>`;
  renderPlateTool();
  openModal("chartModal");
}

function renderLevelTool() {
  const out = $("ptOut");
  const list = plateCtx.levels;
  const W = Math.max(0, num($("ptKg").value, 0));
  if (W <= 0) {
    out.innerHTML = `<div class="bg-[var(--w-elev0)] border border-[var(--w-line)] rounded-xl p-3">
      <div class="text-[12px] text-[var(--w-muted)] mb-1.5">Bu makinenin kademeleri:</div>
      <div class="flex flex-wrap gap-1.5">${list.slice(0, 12).map(v => `<span class="inline-flex items-center justify-center min-w-[3rem] px-2 py-1.5 rounded-lg text-[12px] font-bold bg-[var(--w-elev)] text-[var(--t-text2)]">${fmtKg(v)}</span>`).join("")}${list.length > 12 ? '<span class="text-[var(--w-dim)] text-xs self-center">…</span>' : ""}</div>
      <div class="text-[12px] text-[var(--w-dim)] mt-2">Isınma setlerini görmek için çalışma kilonu yaz.</div></div>`;
    return;
  }
  const near = nearestLevelBelow(list, W);
  const idx = list.indexOf(near);
  const around = list.slice(Math.max(0, idx - 3), idx + 4);
  const chips = around.map(v => `<span class="inline-flex items-center justify-center min-w-[3rem] px-2 py-1.5 rounded-lg text-[12px] font-bold ${Math.abs(v - W) < 0.01 ? "w-btn" : "bg-[var(--w-elev)] text-[var(--w-text2)]"}">${fmtKg(v)}</span>`).join("");
  const exact = list.some(v => Math.abs(v - W) < 0.01);
  const steps = [[0.5, 10], [0.7, 6], [0.85, 3]];
  const wu = [];
  steps.forEach(([p, r]) => {
    const kg = nearestLevelBelow(list, W * p);
    if (kg < W - 0.01 && (!wu.length || kg > wu[wu.length - 1].kg)) wu.push({ kg, reps: r, label: "%" + Math.round(p * 100) });
  });
  out.innerHTML = `
    <div class="bg-[var(--w-elev0)] border border-[var(--w-line)] rounded-xl p-3">
      <div class="text-[12px] text-[var(--w-muted)] mb-1.5">Bu kiloya yakın kademeler:</div>
      <div class="flex flex-wrap gap-1.5">${chips}</div>
      ${exact ? "" : `<div class="text-[12px] text-[var(--w-warn-text)] mt-2">${fmtKg(W)} kg bu makinede yok; en yakın alt kademe <b>${fmtKg(near)} kg</b>.</div>`}
    </div>
    <div>
      <div class="text-[12px] font-bold text-[var(--w-dim)] tracking-wide mb-1.5">ISINMA SETLERİ</div>
      ${wu.length ? `<div class="space-y-1">${wu.map(w => `<div class="flex items-center justify-between gap-2 text-xs bg-[var(--w-elev0)] border border-[var(--w-line)] rounded-lg px-2.5 py-1.5"><span class="text-[var(--w-muted)] w-14">${w.label}</span><span class="font-bold text-[var(--w-text1)]">${fmtKg(w.kg)} kg × ${w.reps}</span><span></span></div>`).join("")}
        <div class="flex items-center justify-between gap-2 text-xs bg-[var(--w-panel)] border border-[var(--w-panel-line)] rounded-lg px-2.5 py-1.5"><span class="text-[var(--w-acc)] w-14">Çalışma</span><span class="font-bold text-[var(--w-acc)]">${fmtKg(W)} kg</span><span></span></div></div>
        <p class="text-[12px] text-[var(--w-dim)] mt-1.5">Isınma kiloları makinede var olan kademelere yuvarlandı. Tonaja ve set sayısına dahil edilmez.</p>`
      : `<div class="text-xs text-[var(--w-dim)]">Bu kiloda ayrı ısınma setine gerek yok.</div>`}
    </div>`;
}

function renderPlateTool() {
  const out = $("ptOut");
  if (!out) return;
  if (plateCtx.lv && plateCtx.levels) { renderLevelTool(); return; }
  const W = Math.max(0, num($("ptKg").value, 0));
  const bar = num($("ptBar").value, 20);
  let html = "";
  if (bar > 0) {
    const r = platesFor(W, bar);
    if (!r.ok && r.reason === "light") {
      html += `<div class="text-xs text-[var(--w-warn-text)] bg-[var(--w-warn-bg)] border border-[var(--w-warn-line)] rounded-lg px-3 py-2">Bu kilo ${fmtKg(bar)} kg'lık bardan hafif.</div>`;
    } else {
      html += `<div class="bg-[var(--w-elev0)] border border-[var(--w-line)] rounded-xl p-3">
        <div class="text-[12px] text-[var(--w-muted)] mb-1.5">Barın HER İKİ tarafına takılacak plakalar (${fmtKg(r.perSide)} kg / taraf):</div>
        <div class="flex flex-wrap gap-1.5">${plateChips(r.list)}</div>
        ${r.ok ? "" : `<div class="text-[12px] text-[var(--w-warn-text)] mt-2">Elindeki plakalarla tam ${fmtKg(W)} kg yapılamıyor; en yakın: <b>${fmtKg(r.achieved)} kg</b></div>`}
      </div>`;
    }
  }
  const wu = warmupSets(W, bar);
  html += `<div>
    <div class="text-[12px] font-bold text-[var(--w-dim)] tracking-wide mb-1.5">ISINMA SETLERİ</div>
    ${wu.length ? `<div class="space-y-1">${wu.map(w => {
      const pr = bar > 0 ? platesFor(w.kg, bar) : null;
      return `<div class="flex items-center justify-between gap-2 text-xs bg-[var(--w-elev0)] border border-[var(--w-line)] rounded-lg px-2.5 py-1.5">
        <span class="text-[var(--w-muted)] w-14 shrink-0">${w.label}</span>
        <span class="font-bold text-[var(--w-text1)]">${fmtKg(w.kg)} kg × ${w.reps}</span>
        <span class="text-[11px] text-[var(--w-dim)] text-right truncate">${pr && pr.ok && pr.list.length ? "taraf: " + pr.list.map(fmtKg).join("+") : ""}</span>
      </div>`;
    }).join("")}
    <div class="flex items-center justify-between gap-2 text-xs bg-[var(--w-panel)] border border-[var(--w-panel-line)] rounded-lg px-2.5 py-1.5">
      <span class="text-[var(--w-acc)] w-14 shrink-0">Çalışma</span><span class="font-bold text-[var(--w-acc)]">${fmtKg(W)} kg</span><span></span>
    </div></div>
    <p class="text-[12px] text-[var(--w-dim)] mt-1.5">Isınma setleri yorulmadan yapılır, aralarında 1–2 dk dinlen. Tonaja ve set sayısına dahil edilmez.</p>`
    : `<div class="text-xs text-[var(--w-dim)]">Isınma önerisi için çalışma kilosu gir (hafif kilolarda ayrı ısınma gerekmez).</div>`}
  </div>`;
  out.innerHTML = html;
}

// ---------------------------------------------------------------------------
// PLANLANAN / YENEN
// ---------------------------------------------------------------------------
function eatenTotals() {
  let p = 0, c = 0, f = 0, cal = 0;
  dayMeals().forEach(m => { if (!m.done) return; m.items.forEach(i => { const x = calcItemMacros(i); p += x.p; c += x.c; f += x.f; cal += x.cal; }); });
  return { p, c, f, cal };
}
function setMacroView(v) { state.settings.macroView = v === "plan" ? "plan" : "eaten"; renderAll(); }

// ---------------------------------------------------------------------------
// AKILLI KALORİ KOÇU
// Tartı trendi (doğrusal regresyon) + günlük alınan kalori ortalamasından gerçek
// enerji harcamanı (TDEE) tahmin eder ve hedef kalorine düzeltme önerir.
// ---------------------------------------------------------------------------
const COACH_WINDOW_DAYS = 28;
const COACH_MAX_STEP = 250; // tek seferde en fazla ±250 kcal (kademeli düzeltme)

function coachAnalysis() {
  const now = Date.now();
  const from = now - COACH_WINDOW_DAYS * DAY_MS;
  const pts = state.weightLogs.filter(l => l.ts && l.ts >= from && num(l.weight) > 0).map(l => ({ t: l.ts, w: num(l.weight) }));
  const res = { ready: false, n: pts.length, spanDays: 0 };
  if (pts.length >= 2) res.spanDays = (pts[pts.length - 1].t - pts[0].t) / DAY_MS;
  if (pts.length < 4 || res.spanDays < 10) return res;

  // Doğrusal regresyon: kg/gün
  const t0 = pts[0].t;
  const xs = pts.map(p => (p.t - t0) / DAY_MS), ys = pts.map(p => p.w);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let sxy = 0, sxx = 0;
  xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) * (x - mx); });
  if (sxx <= 0) return res;
  const slope = sxy / sxx;
  const weekly = slope * 7;

  // Bu aralıktaki günlük kalori ortalaması (öğün tiki varsa yenen, yoksa plan)
  const fromKey = todayStr(new Date(pts[0].t));
  const intakes = Object.keys(state.dailyLogs).filter(k => k >= fromKey).map(k => {
    const d = state.dailyLogs[k];
    return num(d.mealsDone) > 0 && num(d.eatenKcal) > 0 ? num(d.eatenKcal) : num(d.kcal);
  }).filter(v => v > 0);
  const targets = getTargets();
  const intakeAssumed = intakes.length < 5;
  const avgIntake = intakeAssumed ? targets.calTarget : intakes.reduce((a, b) => a + b, 0) / intakes.length;

  const tdeeEst = Math.round(avgIntake - (weekly * 7700) / 7);
  const female = state.settings.sex === "female";
  const floor = female ? 1400 : 1750;
  const desired = Math.max(floor, tdeeEst - state.deficit);
  const fullDelta = Math.round((desired - targets.calTarget) / 50) * 50;
  let delta = Math.max(-COACH_MAX_STEP, Math.min(COACH_MAX_STEP, fullDelta));
  const adj = num(state.settings.calAdjust, 0);
  if (adj + delta > 1000) delta = 1000 - adj;
  if (adj + delta < -1000) delta = -1000 - adj;

  const expectedWeekly = -(state.deficit * 7) / 7700;
  const pctPerWeek = (weekly / state.weight) * 100;
  return {
    ready: true, n: pts.length, spanDays: res.spanDays, weekly, expectedWeekly, pctPerWeek,
    avgIntake: Math.round(avgIntake), intakeDays: intakes.length, intakeAssumed,
    tdeeEst, tdeeFormula: targets.tdee, desired, delta, fullDelta, newTarget: targets.calTarget + delta, calTarget: targets.calTarget,
    tooFast: pctPerWeek < -1.0, gaining: weekly > 0.1 && state.deficit > 0
  };
}


function applyCoach() {
  const a = coachAnalysis();
  if (!a.ready || a.delta === 0) return;
  state.settings.calAdjust = num(state.settings.calAdjust, 0) + a.delta;
  state.settings.coachAppliedAt = Date.now();
  toast(`Hedef kalori ${a.delta > 0 ? "+" : ""}${a.delta} kcal ayarlandı`);
  renderAll();
}
async function resetCoachAdjust() {
  if (!(await askConfirm("Koç düzeltmesi sıfırlansın mı?", "Hedef kalorin formülün hesapladığı değere döner.", "Sıfırla"))) return;
  state.settings.calAdjust = 0;
  state.settings.coachAppliedAt = 0;
  renderAll();
}
function coachHintText() {
  const a = coachAnalysis();
  if (!a.ready || Math.abs(a.delta) < 100) return "";
  const applied = num(state.settings.coachAppliedAt, 0);
  if (applied && Date.now() - applied < 7 * DAY_MS) return "";
  return `🧠 Koç önerisi: hedef kalorini ${Math.abs(a.delta)} kcal ${a.delta > 0 ? "artır" : "azalt"} → İlerleme`;
}

// ============================================================================
// v8 — GERİ AL, SIRADAKİ GÜN, AKTİF ANTRENMAN, ÖĞÜN PLANLARI, TAKVİYELER,
//       VÜCUT ÖLÇÜLERİ, ANTRENMAN SÜRESİ, PAYLAŞILABİLİR ÖZET KARTI
// ============================================================================

// ---------------------------------------------------------------------------
// GERİ AL
// ---------------------------------------------------------------------------
let undoSnap = null;
function snapshot() { undoSnap = JSON.stringify(state); }
function offerUndo(msg) { toast(msg, "ok", { label: "Geri al", fn: doUndo }); }
function doUndo() {
  if (!undoSnap) return;
  state = normalizeState(JSON.parse(undoSnap));
  undoSnap = null;
  renderAll();
  toast("Geri alındı");
}

// ---------------------------------------------------------------------------
// SIRADAKİ ANTRENMAN GÜNÜ
// ---------------------------------------------------------------------------
function nextDayIdx() {
  const logs = state.workoutLogs;
  if (!logs.length || !state.workoutDays.length) return null;
  const last = logs[logs.length - 1];
  let i = last.dayId ? state.workoutDays.findIndex(d => d.id === last.dayId) : -1;
  if (i < 0) i = state.workoutDays.findIndex(d => d.name === last.dayName);
  if (i < 0) return null;
  return (i + 1) % state.workoutDays.length;
}
function workoutInProgress() {
  return state.workoutDays.some(d => d.exercises.some(e => e.sets.some(s => s.done)));
}
function autoSelectNextDay() {
  if (workoutInProgress()) return;
  const n = nextDayIdx();
  if (n != null) state.activeWorkoutDayIdx = n;
}

// Aktif antrenman: sıradaki yapılmamış set
function nextSetPtr(day) {
  for (let e = 0; e < day.exercises.length; e++) {
    const s = day.exercises[e].sets.findIndex(x => !x.done);
    if (s >= 0) return { e, s };
  }
  return null;
}
function scrollToExercise(idx) {
  requestAnimationFrame(() => {
    const el = $("exCard_" + idx);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

// ---------------------------------------------------------------------------
// ANTRENMAN SÜRESİ
// ---------------------------------------------------------------------------
const MAX_WORKOUT_MIN = 300; // 5 saati aşan süre "unutulmuş" sayılır, kaydedilmez
function fmtDuration(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600), m = Math.floor((totalSec % 3600) / 60), s = totalSec % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
function fmtMinutes(min) {
  min = Math.round(min);
  return min >= 60 ? `${Math.floor(min / 60)} sa ${min % 60} dk` : `${min} dk`;
}

// ---------------------------------------------------------------------------
// ÖĞÜN PLANLARI (Antrenman / Dinlenme günü ayrı menü)
// ---------------------------------------------------------------------------
function curMeals() {
  return state.settings.separatePlans && state.dayType === "rest" ? state.restMeals : state.meals;
}
function otherMeals() {
  return curMeals() === state.meals ? state.restMeals : state.meals;
}
function deleteMeal(mIdx) {
  const meals = curMeals();
  snapshot();
  const t = meals[mIdx].title;
  meals.splice(mIdx, 1);
  renderAll();
  offerUndo(`"${t}" silindi`);
}
function copyMeal(mIdx) {
  const src = curMeals()[mIdx];
  const copy = { ...clone(src), id: "meal_" + Date.now(), done: false };
  if (state.settings.separatePlans) {
    otherMeals().push(copy);
    toast(`⧉ "${src.title}" ${curMeals() === state.meals ? "dinlenme" : "antrenman"} günü menüsüne kopyalandı`);
  } else {
    copy.title = src.title + " (kopya)";
    curMeals().splice(mIdx + 1, 0, copy);
    toast("⧉ Öğün kopyalandı");
  }
  renderAll();
}

// ---------------------------------------------------------------------------
// TAKVİYELER (düzenlenebilir liste)
// ---------------------------------------------------------------------------
let suppEdit = false;
// v17: takviye zamanlama etiketleri
const SUPP_TIMES = [["morning", "Sabah tok"], ["pre", "Antrenman öncesi"], ["post", "Antrenman sonrası"], ["bed", "Yatmadan önce"], ["custom", "Özel"]];
// v24: Bugün'de 3 ana grup (zaman → grup); özel etiketler kendi başlığıyla, zamansızlar "Diğer"
const SUPP_GROUPS = [["İlk öğünle", "sun", ["morning"]], ["Antrenman / Gün içi", "zap", ["pre", "post"]], ["Akşam / Uyku öncesi", "moon", ["bed"]]];
function normalizeSuppDose(x) {
  if (x.note !== undefined) { x.note = String(x.note || "").slice(0, 40); if (!x.note) delete x.note; }
  if (x.preset !== undefined && !SUPP_PRESETS.some(p => p.key === x.preset)) delete x.preset;
  const d = num(x.dose, 0);
  if (!(d > 0)) { SUPP_DOSE_KEYS.forEach(k => delete x[k]); return; }
  x.dose = r2(d);
  x.unit = String(x.unit || "").slice(0, 16);
  x.step = num(x.step, 0) > 0 ? r2(num(x.step)) : 1;
  x.min = num(x.min, 0) > 0 ? Math.min(r2(num(x.min)), x.dose) : Math.min(x.step, x.dose);
  x.max = num(x.max, 0) >= x.dose ? r2(num(x.max)) : Math.max(x.dose, x.step * 10);
}
// Elle yazılan doz için mantıklı adım ve sınırlar
function suppDoseDefaults(dose, unit) {
  const u = normSearch(unit);
  let step = /olcek|scoop/.test(u) ? 0.5 : /^(mcg|µg|ug|iu)$/.test(u) ? (dose >= 1000 ? 500 : dose >= 100 ? 50 : 5)
    : u === "mg" ? (dose >= 100 ? 50 : 5) : dose >= 100 ? 50 : dose >= 20 ? 5 : dose % 1 ? 0.5 : 1;
  step = Math.min(step, dose);
  return { step, min: step, max: r2(Math.max(dose * 4, step * 10)) };
}
function suppTimeLabel(s) {
  if (s.time === "custom") return s.timeLabel || "Özel";
  const t = SUPP_TIMES.find(x => x[0] === s.time);
  return t ? t[1] : "";
}
function suppDoseText(s) { return s.dose ? `${fmtDose(s.dose)} ${s.unit || ""}`.trim() : ""; }
function suppPillHtml(s) {
  const on = !!state.supplements[s.id], sid = esc(JSON.stringify(s.id));
  const sub = [s.dose ? `<b>${esc(suppDoseText(s))}</b>` : "", esc(s.note || (s.time === "pre" || s.time === "post" ? suppTimeLabel(s) : ""))].filter(Boolean).join(" · ");
  const stepper = s.dose ? `<div class="n-step">
      <button onclick="changeSuppDose(${sid}, -1)" ${s.dose - s.step < s.min - 1e-9 ? "disabled" : ""} aria-label="${esc(s.name)} dozunu azalt">${svgI("minus", 18, 2.5)}</button>
      <button onclick="changeSuppDose(${sid}, 1)" ${s.dose + s.step > s.max + 1e-9 ? "disabled" : ""} aria-label="${esc(s.name)} dozunu artır">${svgI("plus", 18, 2.5)}</button>
    </div>` : "";
  return `<div class="n-pill ${on ? "taken" : ""}" data-supp-pill="${esc(s.id)}">
    <button onclick="toggleSupp(${sid})" class="n-pill-main" aria-pressed="${on ? "true" : "false"}">
      <span class="n-pill-check">${svgI("check", 14, 3)}</span>
      <span class="min-w-0"><span class="n-pill-name">${esc(s.name)}</span>${sub ? `<span class="n-pill-dose">${sub}</span>` : ""}</span>
    </button>${stepper}
  </div>`;
}
function renderSupps() {
  const list = state.supplementList;
  const done = list.filter(s => state.supplements[s.id]).length;
  $("suppCounter").textContent = `${done} / ${list.length} Tamamlandı`;
  $("suppCounter").classList.toggle("hidden", !list.length);
  $("suppBarWrap").classList.toggle("hidden", !list.length);
  $("suppBar").style.width = (list.length ? Math.round(done / list.length * 100) : 0) + "%";
  $("suppCard").classList.toggle("all-done", list.length > 0 && done === list.length);
  let html;
  if (suppEdit) {
    html = `<div class="w-full space-y-2" id="suppEditList">${list.map((s, i) => `<div class="n-pill-edit space-y-1.5" data-supp-row="${i}">
        <div class="flex items-center gap-2 min-h-[44px]">
          <span class="flex-1 min-w-0 text-[14px] font-semibold pl-1 n-text" style="overflow-wrap:anywhere">${esc(s.name)}</span>
          <button onclick="removeSupp(${i})" class="w-11 h-11 shrink-0 rounded-full flex items-center justify-center n-over" aria-label="${esc(s.name)} sil">${svgI("trash", 18)}</button>
        </div>
        <div class="flex items-center gap-2">
          <select onchange="setSuppTime(${i}, this.value)" class="n-in h-11 flex-1 min-w-0" aria-label="${esc(s.name)} ne zaman alınır?">
            <option value="" ${!s.time ? "selected" : ""}>Zaman seç</option>
            ${SUPP_TIMES.map(([k, l]) => `<option value="${k}" ${s.time === k ? "selected" : ""}>${k === "custom" && s.time === "custom" ? esc(suppTimeLabel(s)) : l}</option>`).join("")}
          </select>
          <button onclick="editSuppDose(${i})" class="n-chip shrink-0" data-supp-dose="${i}" aria-label="${esc(s.name)} dozu">${s.dose ? "Doz: " + esc(suppDoseText(s)) : "+ Doz"}</button>
        </div>
      </div>`).join("")}</div>`;
    const presets = SUPP_PRESETS.filter(p => !list.some(s => s.preset === p.key || p.m.test(normSearch(s.name))));
    if (presets.length) html += `<div class="n-sgroup">Hazır takviyeler</div><div class="flex flex-wrap gap-2" id="suppPresets">${presets.map(p =>
      `<button onclick="addPresetSupp('${p.key}')" class="n-chip add">+ ${esc(p.name)}</button>`).join("")}</div>`;
    html += `<div class="flex flex-wrap gap-2 pt-1"><button onclick="addSupp()" class="n-chip add">+ Ekle</button>
      <button onclick="suppEdit = false; renderAll();" class="n-chip on">${svgI("check", 14, 3)}Bitti</button></div>`;
  } else {
    const groups = SUPP_GROUPS.map(([l, ic, times]) => [l, ic, times.flatMap(t => list.filter(s => s.time === t))]);
    [...new Set(list.filter(s => s.time === "custom").map(suppTimeLabel))]
      .forEach(l => groups.push([l, "clock", list.filter(s => s.time === "custom" && suppTimeLabel(s) === l)]));
    const untimed = list.filter(s => !suppTimeLabel(s));
    const anyTimed = groups.some(g => g[2].length);
    if (untimed.length) groups.push([anyTimed ? "Diğer" : "", "", untimed]);
    html = groups.filter(g => g[2].length).map(([l, ic, ss]) =>
      (l ? `<div class="n-sgroup" data-supp-group="${esc(l)}">${ic ? svgI(ic, 15) : ""}${esc(l)}</div>` : "")
      + `<div class="n-pills">${ss.map(suppPillHtml).join("")}</div>`).join("");
    if (!list.length) html = `<p class="text-[13px] n-dim">Takviye listen boş. Düzenle'den ekleyebilirsin.</p>`;
    html += `<div class="pt-1"><button onclick="suppEdit = true; renderAll();" class="n-chip" aria-label="Takviyeleri düzenle">${svgI("edit", 14)}Düzenle</button></div>`;
  }
  $("suppList").innerHTML = html;
}
function changeSuppDose(id, dir) {
  const s = state.supplementList.find(x => x.id === id);
  if (!s || !s.dose) return;
  const nd = r2(s.dose + dir * s.step);
  if (nd < s.min - 1e-9 || nd > s.max + 1e-9) return;
  s.dose = nd;
  renderAll();
}
async function editSuppDose(i) {
  const s = state.supplementList[i];
  if (!s) return;
  const v = await askText("Doz ve birim", suppDoseText(s), "örn: 5 g · 2 softjel · 1 ölçek", "Boş bırakırsan doz gösterilmez.", "Kaydet");
  if (v === null) return;
  const t = String(v).trim();
  if (!t) {   // v26: doz silme Geri al'lı
    if (!SUPP_DOSE_KEYS.some(k => s[k] != null)) return;
    snapshot(); SUPP_DOSE_KEYS.forEach(k => delete s[k]); renderAll(); offerUndo(`${s.name}: doz kaldırıldı`); return;
  }
  const m = t.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  const d = m ? r2(num(m[1], 0)) : 0;
  if (!(d > 0) || d > 100000) { sayAlert("Doz anlaşılamadı", "Önce sayı, sonra birim yaz (örn: 5 g veya 2 softjel)."); return; }
  const unit = m[2].trim().slice(0, 16);
  if (s.dose && d >= s.min && d <= s.max && normSearch(unit) === normSearch(s.unit)) s.dose = d;   // aynı birim: adım/sınır korunur
  else Object.assign(s, { dose: d, unit }, suppDoseDefaults(d, unit));
  renderAll();
}
function addPresetSupp(key) {
  const p = SUPP_PRESETS.find(x => x.key === key);
  if (!p) return;
  const { m, key: k, ...rest } = p;
  state.supplementList.push({ id: "sup_" + k + "_" + Date.now(), preset: k, ...clone(rest) });
  renderAll();
}
async function setSuppTime(i, v) {
  const s = state.supplementList[i];
  if (!s) return;
  if (v === "custom") {
    const l = await askText("Özel zaman etiketi", s.time === "custom" ? s.timeLabel || "" : "", "örn: Öğle yemeğiyle");
    if (l === null) { renderAll(); return; }
    s.time = "custom";
    s.timeLabel = l.trim().slice(0, 24) || "Özel";
  } else if (SUPP_TIMES.some(x => x[0] === v)) { s.time = v; delete s.timeLabel; }
  else { delete s.time; delete s.timeLabel; }
  renderAll();
}
async function addSupp() {
  const n = await askText("Takviye adı", "", "örn: D3 Vitamini", "", "Ekle");
  if (!n || !n.trim()) return;
  state.supplementList.push({ id: "sup_" + Date.now(), name: n.trim().slice(0, 40) });
  renderAll();
}
function removeSupp(i) {
  snapshot();
  const s = state.supplementList.splice(i, 1)[0];
  if (s) delete state.supplements[s.id];
  renderAll();
  offerUndo(`${s ? s.name : "Takviye"} kaldırıldı`);
}

// ---------------------------------------------------------------------------
// VÜCUT ÖLÇÜLERİ
// ---------------------------------------------------------------------------
// [anahtar, ad, azalması mı iyi]
const MEASURES = [["bel", "Bel", true], ["kalca", "Kalça", true], ["gogus", "Göğüs", false], ["kol", "Kol (pazı)", false], ["bacak", "Bacak (üst)", false], ["boyun", "Boyun", true]];
let measureSel = "bel";

function openMeasureModal() {
  const last = state.measurements[state.measurements.length - 1] || {};
  $("chartTitle").textContent = "Ölçü ekle (cm)";
  $("chartBody").innerHTML = `
    <div class="grid grid-cols-2 gap-2 text-xs">
      ${MEASURES.map(([k, n]) => `<div><label class="block text-[var(--w-muted)] mb-1">${n}</label>
        <input id="ms_${k}" type="text" inputmode="decimal" placeholder="—" value="${last[k] ? esc(fmtNum(last[k])) : ""}" class="w-full p-2 rounded-lg text-base text-center" /></div>`).join("")}
    </div>
    <p class="text-[12px] text-[var(--w-dim)] mt-2">İpucu: Haftada veya iki haftada bir, sabah aç karnına ve mezurayı sıkmadan ölç. Bel: göbek deliği hizası. Kol ve bacak: hep aynı tarafı, en kalın yerinden. Ölçmediğin alanı boş bırakabilirsin.</p>
    <div class="flex justify-end gap-2 mt-3">
      <button onclick="closeModal('chartModal')" class="bg-[var(--w-elev)] text-[var(--w-muted)] text-xs px-3 py-2 rounded-lg">İptal</button>
      <button onclick="saveMeasurement()" class="w-btn text-xs px-4 py-2 rounded-lg font-semibold">Kaydet</button>
    </div>`;
  openModal("chartModal");
}
function saveMeasurement() {
  const now = Date.now();
  const entry = { ts: now };
  let any = false;
  MEASURES.forEach(([k]) => {
    const raw = $("ms_" + k).value.trim();
    if (!raw) return;
    const v = num(raw, 0);
    if (v >= 10 && v <= 250) { entry[k] = round1(v); any = true; }
  });
  if (!any) { sayAlert("Ölçü girilmedi", "En az bir ölçüyü 10–250 cm arasında gir."); return; }
  const last = state.measurements[state.measurements.length - 1];
  if (last && todayStr(new Date(last.ts)) === todayStr()) state.measurements[state.measurements.length - 1] = entry;
  else state.measurements.push(entry);
  closeModal("chartModal");
  toast("Ölçüler kaydedildi");
  renderAll();
}
function deleteMeasurement(i) {
  snapshot();
  state.measurements.splice(i, 1);
  renderAll();
  offerUndo("Ölçü kaydı silindi");
}


// ---------------------------------------------------------------------------
// PAYLAŞILABİLİR ANTRENMAN ÖZET KARTI (1080×1350 PNG)
// ---------------------------------------------------------------------------
let shareFile = null;

function logExerciseLines(log) {
  if (!log.id) return [];
  const out = [];
  Object.keys(state.exerciseHistory).forEach(k => state.exerciseHistory[k].forEach(sess => {
    if (sess.logId !== log.id) return;
    let txt;
    if (sess.kind === "cardio") { const t = cardioTotals(sess.sets, false); txt = `${fmtNum(t.min)} dk` + (t.km > 0 ? ` • ${fmtNum(t.km)} km` : ""); }
    else if (sess.kind === "time") txt = `${sess.sets.length} × ${Math.max(...sess.sets.map(s => num(s.sec)))} sn`;
    else {
      const best = sess.sets.reduce((b, s) => (e1rm(s.kg, s.reps) > e1rm(b.kg, b.reps) ? s : b), sess.sets[0]);
      txt = num(best.kg) > 0 ? `${sess.sets.length} set • en iyi ${fmtKg(num(best.kg))}×${num(best.reps)}` : `${sess.sets.length} set • ${num(best.reps)} tekrar`;
    }
    out.push({ name: sess.name || k, txt, order: out.length });
  }));
  return out;
}

function fitText(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
  return t + "…";
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

async function buildShareCanvas(log) {
  // v33: uygulamanın Antrenman temasıyla aynı dil (siyah zemin, turkuaz vurgu, AYKDisplay başlık, emojisiz). Paylaşılan görsel her zaman koyu.
  const W = 1080, H = 1350, ACC = "#1FD1C1";
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  const F = '-apple-system, "SF Pro Display", "Segoe UI", Roboto, sans-serif';
  const D = 'italic 800 {s}px AYKDisplay, "Barlow Condensed", ' + F;
  const disp = s => D.replace("{s}", s);
  try { await document.fonts.load(disp(64)); } catch (e) { /* yazı tipi yüklenemezse yedek yazı tipi */ }

  ctx.fillStyle = "#000000"; ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W - 140, 140, 10, W - 140, 140, 560);
  glow.addColorStop(0, "rgba(31,209,193,0.22)"); glow.addColorStop(1, "rgba(31,209,193,0)");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

  try {
    const img = new Image();
    img.src = "icon.png";
    await img.decode();
    ctx.save(); roundRect(ctx, 72, 72, 112, 112, 28); ctx.clip(); ctx.drawImage(img, 72, 72, 112, 112); ctx.restore();
  } catch (e) { /* logo yüklenemezse atla */ }
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#FFFFFF"; ctx.font = disp(72); ctx.fillText("AYK", 212, 130);
  const aw = ctx.measureText("AYK").width;
  ctx.fillStyle = ACC; ctx.fillText("+", 212 + aw + 2, 130);
  ctx.fillStyle = "#A1A1AA"; ctx.font = `500 32px ${F}`; ctx.textAlign = "right";
  ctx.fillText(log.ts ? new Date(log.ts).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }) : (log.date || ""), W - 72, 130);
  ctx.textAlign = "left";

  ctx.fillStyle = ACC; ctx.font = `700 32px ${F}`; ctx.fillText("Antrenman tamamlandı", 72, 286);
  ctx.fillStyle = "#FFFFFF"; ctx.font = disp(104); ctx.fillText(fitText(ctx, (log.dayName || "Antrenman").toLocaleUpperCase("tr-TR"), W - 144), 68, 372);

  const stats = [];
  if (num(log.durationMin) > 0) stats.push(["Süre", fmtMinutes(num(log.durationMin)), "#FFFFFF"]);
  stats.push(["Tonaj", Math.round(num(log.volume)).toLocaleString("tr-TR") + " kg", "#FFFFFF"]);
  if (num(log.prs) > 0) stats.push(["Rekor", String(num(log.prs)), ACC]);
  if (num(log.cardioMin) > 0) stats.push(["Kardiyo", fmtNum(num(log.cardioMin)) + " dk" + (num(log.cardioKm) > 0 ? " · " + fmtNum(num(log.cardioKm)) + " km" : ""), "#FFFFFF"]);
  stats.push(["Set", String(num(log.sets)), "#FFFFFF"]);
  const exLines = logExerciseLines(log);
  if (exLines.length) stats.push(["Hareket", String(exLines.length), "#FFFFFF"]);
  const shown = stats.slice(0, 4);
  const cardW = (W - 144 - 24) / 2, cardH = 184;
  shown.forEach((s, i) => {
    const x = 72 + (i % 2) * (cardW + 24), y = 452 + Math.floor(i / 2) * (cardH + 24);
    const w = (i === shown.length - 1 && shown.length % 2 === 1) ? W - 144 : cardW;
    ctx.fillStyle = "#141416"; roundRect(ctx, x, y, w, cardH, 36); ctx.fill();
    ctx.strokeStyle = "#2A2A2E"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "#A1A1AA"; ctx.font = `600 30px ${F}`; ctx.fillText(s[0], x + 36, y + 54);
    ctx.fillStyle = s[2]; ctx.font = disp(76); ctx.fillText(fitText(ctx, s[1], w - 72), x + 32, y + 126);
  });

  const lines = exLines.slice(0, 7);
  let y = 452 + Math.ceil(shown.length / 2) * (cardH + 24) + 44;
  if (lines.length) {
    ctx.fillStyle = "#8B8B93"; ctx.font = `700 28px ${F}`; ctx.fillText("Hareketler", 72, y); y += 56;
    lines.forEach(l => {
      ctx.fillStyle = "#E4E4E7"; ctx.font = `600 32px ${F}`;
      ctx.fillText(fitText(ctx, l.name, 560), 72, y);
      ctx.fillStyle = ACC; ctx.font = `600 28px ${F}`; ctx.textAlign = "right";
      ctx.fillText(fitText(ctx, l.txt, 380), W - 72, y);
      ctx.textAlign = "left";
      y += 52;
    });
  }
  ctx.fillStyle = "#52525B"; ctx.font = `500 26px ${F}`; ctx.textAlign = "center";
  ctx.fillText("AYK+ ile kaydedildi", W / 2, H - 56);
  ctx.textAlign = "left";
  return cv;
}

async function openShareCard(logIdx) {
  const log = state.workoutLogs[logIdx];
  if (!log) return;
  $("chartTitle").textContent = "Antrenman Özeti";
  $("chartBody").innerHTML = `<div class="text-xs text-[var(--w-muted)] text-center py-10">Kart hazırlanıyor...</div>`;
  openModal("chartModal");
  try {
    const cv = await buildShareCanvas(log);
    const blob = await new Promise(res => cv.toBlob(res, "image/png"));
    if (!blob) throw new Error("blob");
    const name = `AYK-antrenman-${log.ts ? todayStr(new Date(log.ts)) : "ozet"}.png`;
    try { shareFile = new File([blob], name, { type: "image/png" }); } catch (e) { shareFile = blob; shareFile.name = name; }
    const url = URL.createObjectURL(blob);
    $("chartBody").innerHTML = `
      <img src="${url}" alt="Antrenman özeti" class="w-full rounded-xl border border-[var(--w-line)]" />
      <button onclick="shareWorkoutCard()" class="w-full mt-3 w-btn text-sm font-semibold py-2.5 rounded-lg">Paylaş / Fotoğraflara Kaydet</button>
      <p class="text-[12px] text-[var(--w-dim)] mt-2 text-center">Paylaş menüsünden Instagram, WhatsApp veya "Görüntüyü Kaydet"i seçebilirsin.</p>`;
  } catch (e) {
    $("chartBody").innerHTML = `<div class="text-xs text-[var(--w-over)] text-center py-8">Kart oluşturulamadı.</div>`;
  }
}

async function shareWorkoutCard() {
  if (!shareFile) return;
  const file = shareFile;
  if (navigator.canShare && file instanceof File && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: "AYK+ Antrenman" }); return; }
    catch (e) { if (e && e.name === "AbortError") return; }
  }
  try {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url; a.download = file.name || "AYK-antrenman.png";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast("Görsel indirildi");
  } catch (e) { toast("Paylaşılamadı. Görsele basılı tutup kaydedebilirsin.", "error"); }
}

// ============================================================================
// v9 — SU & BESLENME GEÇMİŞİ GRAFİKLERİ
// ============================================================================
let histRange = 14;

// Arşivlenmiş bir günün alınan kalori/proteini: öğün tiki varsa "yenen", yoksa "plan"
function dayIntake(d) {
  if (num(d.mealsDone) > 0 && d.eatenKcal != null && num(d.eatenKcal) > 0) return { kcal: num(d.eatenKcal), p: num(d.eatenP), eaten: true };
  return { kcal: num(d.kcal), p: num(d.p), eaten: false };
}

function historySeries(n) {
  const out = [];
  const today = logicalNow();
  const tKey = todayStr(today);
  const tg = getTargets();
  for (let i = n - 1; i >= 0; i--) {
    const dt = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i, 12);
    const key = todayStr(dt);
    const label = dt.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
    if (key === tKey) {
      const e = eatenTotals();
      out.push({ key, label, live: true, water: state.waterLiters || 0, kcal: Math.round(e.cal), p: Math.round(e.p), eaten: true, calT: tg.calTarget, proT: tg.proTarget });
      continue;
    }
    const d = state.dailyLogs[key];
    if (!d) { out.push({ key, label, empty: true }); continue; }
    const it = dayIntake(d);
    out.push({ key, label, water: num(d.water), kcal: it.kcal, p: it.p, eaten: it.eaten, calT: num(d.calTarget) || tg.calTarget, proT: num(d.proTarget) || tg.proTarget, raw: d });
  }
  return out;
}


function setHistRange(n) { histRange = n; renderProgress(); }


