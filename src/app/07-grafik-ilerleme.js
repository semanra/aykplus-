// ---------------------------------------------------------------------------
// GRAFİK (SVG)
// ---------------------------------------------------------------------------
function lineChart(points, color, unit) {
  if (points.length < 2) {
    return `<div class="text-xs text-[var(--w-dim)] text-center py-8 bg-[var(--w-elev0)] rounded-xl border border-[var(--w-line)]">Grafik için en az 2 kayıt gerekli.${points.length === 1 ? ` (Şu an: ${fmtNum(points[0].y)} ${unit})` : ""}</div>`;
  }
  const W = 340, H = 150, pl = 34, pr = 10, pt = 14, pb = 24;
  const ys = points.map(p => p.y);
  let min = Math.min(...ys), max = Math.max(...ys);
  if (max - min < 1e-9) { min -= 1; max += 1; }
  const pad = (max - min) * 0.12;
  min -= pad; max += pad;
  const x = i => pl + (i * (W - pl - pr)) / (points.length - 1);
  const y = v => pt + (H - pt - pb) * (1 - (v - min) / (max - min));
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join(" ");
  const area = `${path} L${x(points.length - 1).toFixed(1)},${H - pb} L${pl},${H - pb} Z`;
  const grid = [0, 0.5, 1].map(f => {
    const v = min + (max - min) * (1 - f);
    const yy = pt + (H - pt - pb) * f;
    return `<line x1="${pl}" x2="${W - pr}" y1="${yy}" y2="${yy}" style="stroke:var(--w-line)" stroke-dasharray="3 3"/><text x="${pl - 4}" y="${yy + 3}" text-anchor="end" font-size="9" style="fill:var(--w-dim)">${(max - min) < 8 ? fmtNum(v) : Math.round(v)}</text>`;
  }).join("");
  const showIdx = new Set([0, points.length - 1, Math.floor((points.length - 1) / 2)]);
  const labels = points.map((p, i) => showIdx.has(i) ? `<text x="${x(i)}" y="${H - 6}" text-anchor="${i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}" font-size="9" style="fill:var(--w-dim)">${esc(p.label)}</text>` : "").join("");
  const dots = points.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.y).toFixed(1)}" r="${points.length > 30 ? 1.5 : 3}" style="fill:${color}"/>`).join("");
  const lastP = points[points.length - 1];
  return `<svg viewBox="0 0 ${W} ${H}" class="w-full h-auto" role="img">
    ${grid}
    <path d="${area}" style="fill:${color}" opacity="0.12"/>
    <path d="${path}" fill="none" style="stroke:${color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}${labels}
    <text x="${Math.min(x(points.length - 1), W - pr)}" y="${Math.max(10, y(lastP.y) - 7)}" text-anchor="end" font-size="10" font-weight="700" style="fill:${color}">${fmtNum(lastP.y)} ${esc(unit)}</text>
  </svg>`;
}

function exerciseSeries(name) {
  const hist = historyFor(name);
  if (!hist.length) return { points: [], unit: "", color: "#10b981", metric: "" };
  const kind = hist[hist.length - 1].kind;
  const sameKind = hist.filter(h => h.kind === kind);
  if (kind === "cardio") {
    const useKm = sameKind.some(h => cardioTotals(h.sets, false).km > 0);
    return {
      points: sameKind.map(h => { const t = cardioTotals(h.sets, false); return { label: fmtDate(h.ts), t: h.ts, y: useKm ? t.km : t.min }; }),
      unit: useKm ? "km" : "dk", color: "#38bdf8", metric: useKm ? "Toplam mesafe" : "Toplam süre"
    };
  }
  if (kind === "time") {
    return { points: sameKind.map(h => ({ label: fmtDate(h.ts), t: h.ts, y: Math.max(...h.sets.map(s => num(s.sec))) })), unit: "sn", color: "#38bdf8", metric: "En uzun set" };
  }
  return { points: sameKind.map(h => ({ label: fmtDate(h.ts), t: h.ts, y: round1(Math.max(...h.sets.map(s => e1rm(s.kg, s.reps)))) })), unit: "kg", color: "#f59e0b", metric: "Tahmini 1RM" };
}

function exerciseChartHtml(name, accent) {
  const ser = exerciseSeries(name);
  if (accent) ser.color = accent;
  const hist = historyFor(name);
  if (!hist.length) return `<div class="text-xs text-[var(--w-dim)] text-center py-8">Bu hareket için henüz kayıt yok. Antrenmanı bitirip kaydettikçe grafik oluşur.</div>`;
  const rows = hist.slice().reverse().slice(0, 8).map(h => `
    <div class="flex justify-between gap-2 text-xs bg-[var(--w-elev0)] border border-[var(--w-line)] rounded-lg px-2.5 py-1.5">
      <span class="text-[var(--w-muted)] shrink-0">${fmtDate(h.ts)}</span><span class="text-[var(--t-text2)] text-right truncate">${esc(sessionSummary(h))}</span>
    </div>`).join("");
  return `<div class="text-[12px] text-[var(--w-muted)] mb-1">${ser.metric}</div>${lineChart(ser.points.slice(-30), ser.color, ser.unit)}
    <div class="text-[12px] font-bold text-[var(--w-dim)] uppercase tracking-wide mt-3 mb-1.5">Son kayıtlar</div><div class="space-y-1">${rows}</div>`;
}

function openExerciseChart(exIdx) {
  const ex = activeDay().exercises[exIdx];
  $("chartTitle").textContent = ex.name;
  $("chartBody").innerHTML = exerciseChartHtml(ex.name, "var(--t-acc-text)");
  openModal("chartModal");
}

// ---------------------------------------------------------------------------
// İLERLEME SEKMESİ
// ---------------------------------------------------------------------------
// ============================================================================
// v29 — İLERLEME (alt sekmeler: Genel · Kilo · Güç · Beslenme)
// Renk: "Grafit + kaynak renkleri": dokunulanlar kırık beyaz (#F4F4F5), veriler geldiği sekmenin renginde
// (antrenman turkuaz, beslenme yeşil, mobilite lavanta, su mavi, kilo beyaz). Anlam yalnızca renkle verilmez:
// ✓ ~ ! ↑ * simgeleri, çizgili/kesik desen, çizgi ucunda ad + değer. 4'ten az nokta → grafik yerine sayı.
// Yalnızca açık alt sekme çizilir. Tasarım: tasarimlar/ilerleme-B.html + ilerleme-ozet.md.
// ============================================================================
const PROG_VIEWS = [["genel", "Genel"], ["kilo", "Kilo"], ["guc", "Güç"], ["beslenme", "Beslenme"]];
const PC = { tq: "var(--d-tq)", gr: "var(--d-gr)", lv: "var(--d-lv)", wa: "var(--d-wa)", kg: "var(--d-kg)", over: "var(--d-over)", dot: "var(--d-dot)" };
const progUI = { wRange: 30 };   // kilo grafiği aralığı (gün; 0 = tümü) — kaydedilmez
const P_ICON = {
  up: "M12 19V5M6 11l6-6 6 6", down: "M12 5v14M6 13l6 6 6-6", check: "M5 12.5l4.5 4.5L19 7.5",
  tilde: "M5 13c2-3 4-3 7 0s5 3 7 0", plus: "M12 5v14M5 12h14", x: "M6 6l12 12M18 6L6 18",
  chat: "M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-5A8 8 0 1 1 21 12zM9 10.5h6M9 13.5h4",
  warn: "M12 9v4M12 17h.01M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
  chevD: "M6 9l6 6 6-6"
};
function pI(n, s = 16, w = 2.4) {
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${P_ICON[n]}"/></svg>`;
}
function setProgressView(v) {
  state.progressView = PROG_VIEWS.some(x => x[0] === v) ? v : "genel";
  window.scrollTo(0, 0);
  renderAll();
}
function progWeightGood(d) { const tgt = num(state.settings.targetWeight, 82); return state.weight > tgt ? d <= 0 : d >= 0; }
function setProgWRange(n) { progUI.wRange = n; renderProgress(); }
function progSelectEx(k) { progressSel = k; renderProgress(); const c = $("pExChart"); if (c) c.scrollIntoView({ block: "start", behavior: "smooth" }); }

// Fark: ok + işaret + değer. good: true (iyi yön, açık gri) / false (kötü yön, pembe) / null (nötr)
function pDelta(d, unit = "", good = null, digits = 1) {
  if (d == null || !isFinite(d)) return "";
  const r = digits === 0 ? Math.round(d) : round1(d);
  if (r === 0) return `<span class="p-delta">değişim yok</span>`;
  const v = (r > 0 ? "+" : "−") + (digits === 0 ? Math.abs(r) : fmtNum(Math.abs(r)));
  return `<span class="p-delta ${good === false ? "bad" : ""}">${pI(r > 0 ? "up" : "down", 13, 2.6)}${v}${unit ? " " + esc(unit) : ""}</span>`;
}
function pSec(title, color, right = "") {
  return `<div class="p-sec"><h3>${color ? `<i class="p-sdot" style="background:${color}"></i>` : ""}${title}</h3>${right}</div>`;
}
function pStat(label, value, unit, sub, color) {
  return `<div class="p-tile"><div class="p-tl">${color ? `<i class="p-sdot" style="background:${color}"></i>` : ""}${label}</div>
    <div class="p-tv"><b class="t-display">${value}</b>${unit ? `<span>${unit}</span>` : ""}</div><div class="p-ts">${sub || ""}</div></div>`;
}
function pLegend(items) { return `<div class="p-lg">${items.map(([sym, t]) => `<span>${sym}${t}</span>`).join("")}</div>`; }

// Çizgi grafik. series: [{ pts: [{t, y}], color, w, dots, name }] — x zamana göre (düzensiz tartı günleri doğru aralıklı)
function pLine(series, o = {}) {
  const W = 340, H = o.h || 176, L = 38, T = 14, B = 24, R = series.some(s => s.name) ? 78 : 12;
  const all = series.flatMap(s => s.pts);
  const ts = all.map(p => p.t), ys = all.map(p => p.y);
  let t0 = Math.min(...ts), t1 = Math.max(...ts); if (t1 === t0) t1 = t0 + 1;
  let lo = Math.min(...ys), hi = Math.max(...ys); if (hi - lo < 0.6) { lo -= 0.3; hi += 0.3; }
  const pad = (hi - lo) * 0.15; lo -= pad; hi += pad;
  const X = t => L + (W - L - R) * (t - t0) / (t1 - t0);
  const Y = v => T + (H - T - B) * (hi - v) / (hi - lo);
  let s = "";
  for (let k = 0; k < 4; k++) {
    const v = lo + (hi - lo) * k / 3, y = Y(v);
    s += `<line x1="${L}" x2="${W - R + 4}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" style="stroke:var(--t-grid)"/><text x="${L - 6}" y="${(y + 4).toFixed(1)}" text-anchor="end" class="p-ax">${hi - lo > 12 ? Math.round(v) : fmtNum(v)}</text>`;
  }
  const xf = o.xFmt || (t => fmtDate(t));
  [t0, (t0 + t1) / 2, t1].forEach((t, i) => {
    s += `<text x="${X(t).toFixed(1)}" y="${H - 7}" text-anchor="${i === 0 ? "start" : i === 2 ? "end" : "middle"}" class="p-ax">${esc(xf(t))}</text>`;
  });
  series.forEach(se => {
    if (se.dots) se.pts.forEach(p => { s += `<circle cx="${X(p.t).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="2.6" style="fill:${se.color}"/>`; });
    else s += `<polyline points="${se.pts.map(p => X(p.t).toFixed(1) + "," + Y(p.y).toFixed(1)).join(" ")}" fill="none" style="stroke:${se.color}" stroke-width="${se.w || 2.5}" stroke-linejoin="round" stroke-linecap="round"/>`;
    if (se.name) {
      const p = se.pts[se.pts.length - 1], x = X(p.t), y = Y(p.y);
      if (!se.dots) s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" style="fill:${se.color};stroke:var(--t-surface)" stroke-width="2"/>`;
      s += `<text x="${(x + 9).toFixed(1)}" y="${(y - 1).toFixed(1)}" class="p-vl">${fmtNum(p.y)}${o.unit ? " " + esc(o.unit) : ""}</text><text x="${(x + 9).toFixed(1)}" y="${(y + 13).toFixed(1)}" class="p-ax">${esc(se.name)}</text>`;
    }
  });
  return `<svg viewBox="0 0 ${W} ${H}" class="p-chart" role="img" aria-label="${esc(o.label || "")}">${s}</svg>`;
}

// Çubuk grafik. items: [{ label, v (null = kayıt yok), flag: "" | "over" (çizgili + ↑) | "plan" (kesik çerçeve + *) | "now" (yarı saydam) }]
function pBars(items, o) {
  const W = 340, H = o.h || 168, L = 4, R = 4, T = 20, B = 24, n = items.length;
  const vals = items.filter(i => i.v != null).map(i => i.v);
  const top = Math.max(o.target || 0, ...vals, 0.001) * 1.18;
  const gap = n > 14 ? 3 : n > 8 ? 5 : 8;
  const bw = (W - L - R - gap * (n - 1)) / n;
  const Y = v => T + (H - T - B) * (1 - v / top);
  const id = o.id || "b", base = H - B, step = n <= 8 ? 1 : n <= 14 ? 2 : 5;
  let bars = "", vl = "", lb = "";
  items.forEach((it, i) => {
    const x = L + i * (bw + gap), cx = (x + bw / 2).toFixed(1);
    if (it.v == null) bars += `<line x1="${x.toFixed(1)}" x2="${(x + bw).toFixed(1)}" y1="${base - 1}" y2="${base - 1}" style="stroke:var(--t-line3)" stroke-width="2"/>`;
    else {
      const y = Math.min(base - 2, Y(Math.max(0, it.v))), r = Math.min(5, bw / 3);
      const d = `M${x.toFixed(1)},${base} V${(y + r).toFixed(1)} Q${x.toFixed(1)},${y.toFixed(1)} ${(x + r).toFixed(1)},${y.toFixed(1)} H${(x + bw - r).toFixed(1)} Q${(x + bw).toFixed(1)},${y.toFixed(1)} ${(x + bw).toFixed(1)},${(y + r).toFixed(1)} V${base} Z`;
      bars += it.flag === "over" ? `<path d="${d}" style="fill:url(#ph${id})"/>`
        : it.flag === "plan" ? `<path d="${d}" fill="none" style="stroke:${o.color}" stroke-width="1.6" stroke-dasharray="3 3"/>`
        : it.flag === "now" ? `<path d="${d}" style="fill:${o.color};stroke:${o.color}" fill-opacity=".35" stroke-width="1.4"/>`
        : `<path d="${d}" style="fill:${o.color}"/>`;
      const mark = it.flag === "over" ? " ↑" : it.flag === "plan" ? " *" : "";
      if (n <= 8) vl += `<text x="${cx}" y="${(y - 6).toFixed(1)}" text-anchor="middle" class="p-bv">${esc(o.fmt ? o.fmt(it.v) : fmtNum(it.v))}${mark}</text>`;
      else if (mark) vl += `<text x="${cx}" y="${(y - 5).toFixed(1)}" text-anchor="middle" class="p-bv">${mark.trim()}</text>`;
    }
    if ((n - 1 - i) % step === 0) lb += `<text x="${cx}" y="${H - 8}" text-anchor="middle" class="p-ax${it.flag === "now" ? " p-axb" : ""}">${esc(it.label)}</text>`;
  });
  const tl = o.target > 0 ? `<line x1="${L}" x2="${W - R}" y1="${Y(o.target).toFixed(1)}" y2="${Y(o.target).toFixed(1)}" style="stroke:var(--t-text2)" stroke-width="1.5" stroke-dasharray="5 4"/>` : "";
  return `<svg viewBox="0 0 ${W} ${H}" class="p-chart" role="img" aria-label="${esc(o.label || "")}"><defs><pattern id="ph${id}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" style="fill:${o.color}"/><line x1="0" y1="0" x2="0" y2="6" style="stroke:var(--t-surface)" stroke-width="2.5"/></pattern></defs><line x1="${L}" x2="${W - R}" y1="${base}" y2="${base}" style="stroke:var(--t-line)"/>${bars}${tl}${vl}${lb}</svg>`;
}
function pSpark(vals, color) {
  if (vals.length < 2) return "";
  const w = 84, h = 30, lo = Math.min(...vals), hi = Math.max(...vals);
  const X = i => 2 + (w - 8) * i / (vals.length - 1), Y = v => 4 + (h - 8) * (hi - v) / (hi - lo || 1);
  return `<svg class="p-spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><polyline points="${vals.map((v, i) => X(i).toFixed(1) + "," + Y(v).toFixed(1)).join(" ")}" fill="none" style="stroke:${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${X(vals.length - 1).toFixed(1)}" cy="${Y(vals[vals.length - 1]).toFixed(1)}" r="3" style="fill:${color}"/></svg>`;
}

// --- Veri yardımcıları
function progWorkoutDays() {
  const m = {};
  state.workoutLogs.forEach(l => { if (l.ts) { const k = todayStr(new Date(l.ts)); m[k] = (m[k] || 0) + 1; } });
  return m;
}
function progMobDays() {
  const m = {};
  Object.keys(state.mobilityLog || {}).forEach(k => { if ((state.mobilityLog[k] || []).length) m[k] = 1; });
  if (state.mobilityRoutine.items.some(i => i.done)) m[todayStr(logicalNow())] = 1;
  return m;
}
function progWeekDays() {   // Pazartesi'den başlayan 7 gün (öğlen saatiyle; yaz saati kaymasın)
  const ws = weekStart();
  return Array.from({ length: 7 }, (_, i) => new Date(ws + i * DAY_MS + 12 * 3600000));
}
function progNutriHit(key) {   // geçmiş gün için ok | near | far | none
  const li = logIntake(state.dailyLogs[key]);
  if (!li) return "none";
  return hitClass(li.k, li.t || getTargets().calTarget);
}
function progWeekly() {
  const ws = weekStart();
  const logs = state.workoutLogs.filter(l => l.ts && l.ts >= ws);
  const tKeyN = todayStr(logicalNow());
  const days = progWeekDays();
  const past = days.map(d => todayStr(d)).filter(k => k < tKeyN);
  const hits = past.map(progNutriHit).filter(h => h !== "none");
  const mob = progMobDays();
  const prev = state.weightLogs.filter(l => l.ts && l.ts >= Date.now() - 14 * DAY_MS && l.ts < Date.now() - 7 * DAY_MS && num(l.weight) > 0).map(l => num(l.weight));
  return {
    n: logs.length, vol: logs.reduce((a, l) => a + num(l.volume), 0), min: logs.reduce((a, l) => a + num(l.cardioMin), 0),
    km: logs.reduce((a, l) => a + num(l.cardioKm), 0), prs: logs.reduce((a, l) => a + num(l.prs), 0),
    hitOk: hits.filter(h => h === "ok").length, hitN: hits.length,
    mobN: days.filter(d => mob[todayStr(d)]).length,
    w7: weightAvg7(), wPrev: prev.length ? prev.reduce((a, b) => a + b, 0) / prev.length : null
  };
}

// --- Ortak kartlar
async function progLogWeight() {
  const v = await askText("Bugünkü tartı", fmtNum(state.weight), "kg", "Sabah, aç karnına tartıldığın kilo (kg)", "Kaydet");
  if (v == null || String(v).trim() === "") return;
  const n = num(v, NaN);
  if (!(n >= 30 && n <= 300)) { sayAlert("Geçersiz kilo", "30 ile 300 kg arasında bir değer yaz (örn. 96,4)."); return; }
  state.weight = round1(n);
  logCurrentWeight();
}
function progWeighBtn(cls = "") {
  return `<button id="pWeighBtn" onclick="progLogWeight()" class="p-btn pri ${cls}">${pI("plus", 18)}Tartıyı kaydet</button>`;
}
function progCoachHtml() {
  const a = coachAnalysis();
  const adj = num(state.settings.calAdjust, 0);
  const adjLine = adj !== 0 ? `<div class="p-adj"><span>Uygulanan koç düzeltmesi: <b>${adj > 0 ? "+" : ""}${adj} kcal</b>${state.settings.coachAppliedAt ? ` <span class="p-dim">(${fmtDate(state.settings.coachAppliedAt)})</span>` : ""}</span>
      <button onclick="resetCoachAdjust()" class="p-link">Sıfırla</button></div>` : "";
  const head = (t, sub) => `<div class="p-coach-h"><div class="p-cic">${pI("chat", 20, 2)}</div><div><b>${t}</b><span>${sub}</span></div></div>`;
  if (!a.ready) {
    return `<div class="p-card" id="pCoach">${head("Kalori koçu", "Henüz hesap için veri yok")}
      <p class="p-fine">Koçun gerçek harcamanı hesaplayabilmesi için son 4 haftada <b>en az 4 tartı</b> ve ilk ile son tartı arasında <b>en az 10 gün</b> olmalı. Şu an: ${a.n} tartı${a.n >= 2 ? `, ${Math.floor(a.spanDays)} gün aralık` : ""}.</p>${adjLine}</div>`;
  }
  const fmtW = v => (v > 0 ? "+" : "") + v.toFixed(2).replace(".", ",");
  const rows = [["Gerçek kilo değişimi", fmtW(a.weekly) + " kg/hafta"], ["Hedeflenen değişim", fmtW(a.expectedWeekly) + " kg/hafta"],
    ["Ortalama kalori alımı", a.avgIntake + " kcal" + (a.intakeAssumed ? " *" : ` (${a.intakeDays} gün)`)], ["Tahmini gerçek harcaman (TDEE)", a.tdeeEst + " kcal"], ["Formülün tahmini", a.tdeeFormula + " kcal"]]
    .map(([l, v]) => `<div class="p-kv"><span>${l}</span><b>${v}</b></div>`).join("");
  const details = `<details class="p-det"><summary>Hesap ayrıntıları · ${a.n} tartı, ${Math.floor(a.spanDays)} gün</summary>${rows}
    <p class="p-fine">${a.intakeAssumed ? "* Yeterli günlük kayıt olmadığı için planladığın kaloriyi yediğin varsayıldı. " : ""}İlk 1–2 hafta su kaybı nedeniyle kilo hızlı düşebilir; öneriler 3–4 hafta veriyle en isabetli hâle gelir.</p></details>`;
  const warns = (a.tooFast ? `<p class="p-warn">${pI("warn", 16, 2)}Haftada vücut ağırlığının %${fmtNum(Math.abs(a.pctPerWeek))}'ini kaybediyorsun; %1'in üstü kas kaybı riskini artırır.</p>` : "")
    + (a.gaining ? `<p class="p-warn">${pI("warn", 16, 2)}Açık verdiğin hâlde kilo alıyorsun. Porsiyonları tartarak girmeyi ve öğün tiklerini kontrol etmeyi öneririm.</p>` : "");
  if (Math.abs(a.delta) < 100) {
    return `<div class="p-card" id="pCoach">${head("Kalori koçu", "Doğru yoldasın; kalorinde değişiklik gerekmiyor.")}${warns}${details}${adjLine}</div>`;
  }
  const sinceApply = state.settings.coachAppliedAt ? Math.floor((Date.now() - state.settings.coachAppliedAt) / DAY_MS) : null;
  const fresh = sinceApply != null && sinceApply < 7;
  const why = a.delta < 0 ? "Beklediğinden yavaş ilerliyorsun." : "Beklediğinden hızlı veriyorsun; kas kaybını önlemek için.";
  const step = Math.abs(a.fullDelta) > Math.abs(a.delta) ? `<p class="p-fine">Tam düzeltme ${a.fullDelta > 0 ? "+" : ""}${a.fullDelta} kcal olurdu; enerjin düşmesin diye kademeli. Bir hafta sonra koç kalanını yeniden değerlendirir.</p>` : "";
  return `<div class="p-card" id="pCoach">${head("Kalori koçu", why)}
    <div class="p-cn"><span>Önerilen hedef</span><b class="t-display">${a.newTarget.toLocaleString("tr-TR")}</b><span>kcal</span>${pDelta(a.delta, "", null, 0)}</div>
    ${fresh ? `<p class="p-fine">Son ayardan bu yana ${sinceApply} gün geçti. Vücudun uyum sağlasın diye bir sonraki düzeltme için en az 7 gün beklemeni öneririm.</p>
      <button onclick="applyCoach()" class="p-btn">Yine de uygula (${a.delta > 0 ? "+" : ""}${a.delta} kcal)</button>`
      : `<button onclick="applyCoach()" class="p-btn pri">Öneriyi uygula</button>`}
    ${step}${warns}${details}${adjLine}</div>`;
}

// --- GENEL
function progGenelHtml() {
  const w = progWeekly();
  const wTile = w.w7
    ? pStat("Kilo (7 gün ort.)", fmtNum(w.w7.avg), "kg", w.wPrev != null ? pDelta(w.w7.avg - w.wPrev, "", progWeightGood(w.w7.avg - w.wPrev)) : `${w.w7.n} tartı`, PC.kg)
    : pStat("Kilo", fmtNum(state.weight), "kg", "son 7 günde tartı yok", PC.kg);
  const tiles = pStat("Antrenman", w.n, "seans", w.prs ? `${w.prs} rekor` : `programda ${state.workoutDays.length} gün`, PC.tq)
    + wTile
    + pStat("Kalori hedefte", w.hitN ? `${w.hitOk}/${w.hitN}` : "—", w.hitN ? "gün" : "", w.hitN ? "±%5 · bugün hariç" : "bu hafta kayıt yok", PC.gr)
    + pStat("Mobilite", w.mobN, "gün", "bu hafta", PC.lv);
  // Bu hafta, gün gün
  const days = progWeekDays(), wd = progWorkoutDays(), mob = progMobDays();
  const tKey = todayStr(logicalNow()), tKeyCal = todayStr();
  const cell = (on, cls, sym, aria) => `<i class="p-sd ${cls}" role="img" aria-label="${aria}">${on ? sym : ""}</i>`;
  const row = (name, color, fn) => `<div class="p-sr"><span><i class="p-sdot" style="background:${color}"></i>${name}</span><div class="p-sc">${days.map(fn).join("")}</div></div>`;
  const DN = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];
  const strip = `<div class="p-card" id="pStrip">${pSec("Bu hafta, gün gün")}
    <div class="p-sr hdr"><span></span><div class="p-sc">${DN.map(d => `<b>${d}</b>`).join("")}</div></div>
    ${row("Antrenman", PC.tq, (d, i) => { const k = todayStr(d); const fut = k > tKeyCal; const on = !!wd[k]; return cell(on, fut ? "fut" : on ? "tq" : "", pI("check", 14, 3), `${DN[i]}: ${on ? "antrenman yapıldı" : fut ? "henüz gelmedi" : "antrenman yok"}`); })}
    ${row("Beslenme hedefi", PC.gr, (d, i) => {
      const k = todayStr(d);
      if (k > tKey) return cell(false, "fut", "", `${DN[i]}: henüz gelmedi`);
      if (k === tKey) return cell(false, "today", "", `${DN[i]}: bugün, sürüyor`);
      const h = progNutriHit(k);
      const map = { ok: ["gr", pI("check", 14, 3), "hedefte"], near: ["near", pI("tilde", 14, 2.6), "hedefe yakın"], far: ["far", "!", "hedeften uzak"], none: ["", "", "kayıt yok"] }[h];
      return cell(h !== "none", map[0], map[1], `${DN[i]}: ${map[2]}`);
    })}
    ${row("Mobilite", PC.lv, (d, i) => { const k = todayStr(d); const fut = k > tKey; const on = !!mob[k]; return cell(on, fut ? "fut" : on ? "lv" : "", pI("check", 14, 3), `${DN[i]}: ${on ? "mobilite yapıldı" : fut ? "henüz gelmedi" : "mobilite yok"}`); })}
    ${pLegend([[`<i class="p-sdx gr">${pI("check", 10, 3.2)}</i>`, "yapıldı / hedefte"], [`<i class="p-sdx near">${pI("tilde", 10, 3)}</i>`, "yakın (±%15)"], [`<i class="p-sdx far">!</i>`, "uzak"]])}</div>`;
  return `<div class="p-tiles">${tiles}</div>${progWeighBtn("mb")}${progCoachHtml()}${strip}`;
}

// --- KİLO
function progKiloHtml() {
  const wl = state.weightLogs.filter(l => num(l.weight) > 0);
  const timed = wl.filter(l => l.ts).map(l => ({ t: l.ts, y: num(l.weight) }));
  const rng = progUI.wRange;
  const pts = rng ? timed.filter(p => p.t >= Date.now() - rng * DAY_MS) : timed;
  const avg = pts.map(p => { const a = pts.filter(q => q.t > p.t - 7 * DAY_MS && q.t <= p.t); return { t: p.t, y: a.reduce((s, q) => s + q.y, 0) / a.length }; });
  const w7 = weightAvg7();
  const prevArr = timed.filter(p => p.t >= Date.now() - 14 * DAY_MS && p.t < Date.now() - 7 * DAY_MS);
  const prev = prevArr.length ? prevArr.reduce((s, p) => s + p.y, 0) / prevArr.length : null;
  const tgt = num(state.settings.targetWeight, 82);
  const chips = [[30, "30 gün"], [90, "90 gün"], [0, "Tümü"]].map(([n, l]) => `<button onclick="setProgWRange(${n})" class="p-chip ${rng === n ? "on" : ""}" aria-pressed="${rng === n}">${l}</button>`).join("");
  const chart = pts.length >= 4
    ? pLine([{ pts, color: PC.dot, dots: true }, { pts: avg, color: PC.kg, w: 3, name: "7 gün ort." }], { unit: "kg", label: "Tartılar ve 7 günlük ortalama" })
      + pLegend([[`<i class="p-lg-dot"></i>`, "Günlük tartı"], [`<i class="p-lg-line"></i>`, "7 gün ortalaması"]])
    : `<div class="p-low">Bu aralıkta ${pts.length} tartı var. Grafik için en az 4 tartı gerekir; o zamana kadar değerler aşağıdaki listede.</div>`;
  const big = w7 ? `<div class="p-k">7 günlük ortalama</div><div class="p-big"><b class="t-display">${fmtNum(w7.avg)}</b><span>kg</span>${prev != null ? pDelta(w7.avg - prev, "geçen haftaya göre", progWeightGood(w7.avg - prev)) : ""}</div>`
    : `<div class="p-k">Şu anki kilo</div><div class="p-big"><b class="t-display">${fmtNum(state.weight)}</b><span>kg</span></div>`;
  const first = wl[0];
  const change = first ? state.weight - num(first.weight) : 0;
  const comp = bodyComp(state.weight, validBf(state.settings.bodyFat));
  const tbf = validBf(state.settings.targetBodyFat);
  const stats = `<div class="p-mini3">
      <div><span>Şu an</span><b>${fmtNum(state.weight)} kg</b></div>
      <div><span>İlk kayıttan</span><b>${(change > 0 ? "+" : "") + fmtNum(change)} kg</b></div>
      <div><span>Hedefe</span><b>${fmtNum(Math.max(0, state.weight - tgt))} kg</b></div></div>
    ${comp ? `<div class="p-mini3"><div><span>Yağ oranı</span><b>%${fmtNum(comp.bf)}</b>${tbf ? `<small>hedef %${fmtNum(tbf)}</small>` : ""}</div><div><span>Yağsız kütle</span><b>${fmtNum(comp.leanKg)} kg</b></div><div><span>Yağ kütlesi</span><b>${fmtNum(comp.fatKg)} kg</b></div></div>`
      : `<button onclick="openSettings()" class="p-btn ghost">Yağ oranını Profil'den gir; yağsız kütlen burada görünür</button>`}`;
  // Haftalık ortalama (en az 4 hafta)
  const wk = {};
  timed.forEach(p => { const k = weekStart(new Date(p.t)); (wk[k] = wk[k] || []).push(p.y); });
  const wkPts = Object.keys(wk).map(Number).sort((a, b) => a - b).map(k => ({ t: k, y: wk[k].reduce((a, b) => a + b, 0) / wk[k].length }));
  const weekly = wkPts.length >= 4 ? `<div class="p-card">${pSec("Haftalık ortalama", PC.kg)}${pLine([{ pts: wkPts.slice(-12), color: PC.kg, name: "son hafta" }], { unit: "kg", h: 160, label: "Haftalık kilo ortalaması" })}
      <p class="p-fine">Günlük dalgalanma (su, tuz) gizlenir; asıl eğilim budur.</p></div>` : "";
  const rows = wl.map((l, i) => ({ l, i })).reverse().slice(0, 6).map(({ l }) => `<div class="p-row">
      <span class="p-dim">${esc(l.ts ? fmtDate(l.ts) : l.date)}</span><span class="p-row-r">${l.bf ? `<span class="p-dim">%${fmtNum(num(l.bf))} yağ</span>` : ""}<b>${fmtNum(num(l.weight))} kg</b>
      <button onclick="deleteWeightLog(${state.weightLogs.indexOf(l)})" aria-label="Tartıyı sil" class="p-x">${pI("x", 18, 2.2)}</button></span></div>`).join("");
  return `<div class="p-card" id="pWeight">${big}<div class="p-chips">${chips}</div>${chart}
      <p class="p-fine">Hedef ${fmtNum(tgt)} kg${state.weight > tgt ? ` · ${fmtNum(state.weight - tgt)} kg kaldı` : " · hedefe ulaştın"}. Grafiği ezmemek için hedef çizgisi gösterilmiyor.</p>
      ${progWeighBtn()}</div>
    <div class="p-card">${stats}</div>
    ${weekly}
    ${rows ? `<div class="p-card">${pSec("Son tartılar")}<div class="p-rows">${rows}</div></div>` : ""}
    ${progMeasureHtml()}`;
}
function progMeasureHtml() {
  const ms = state.measurements;
  const add = `<button onclick="openMeasureModal()" class="p-chip">${pI("plus", 16)}Ölçü ekle</button>`;
  if (!ms.length) return `<div class="p-card" id="pMeasure">${pSec("Vücut ölçüleri", null, add)}<p class="p-fine">Kilo yerinde sayarken belin inceliyorsa yağ yakıp kas kazanıyorsun demektir. İlk ölçünü ekle, değişimi burada takip et.</p></div>`;
  const firstOf = k => ms.find(m => m[k] != null);
  const lastOf = k => { for (let i = ms.length - 1; i >= 0; i--) if (ms[i][k] != null) return ms[i]; return null; };
  if (!MEASURES.some(([k]) => k === measureSel && lastOf(k))) { const f = MEASURES.find(([k]) => lastOf(k)); if (f) measureSel = f[0]; }
  const cells = MEASURES.map(([k, n, lowerBetter]) => {
    const l = lastOf(k); if (!l) return "";
    const d = round1(l[k] - firstOf(k)[k]);
    return `<button onclick="measureSel='${k}'; renderProgress();" class="p-ms ${measureSel === k ? "on" : ""}" aria-pressed="${measureSel === k}">
      <span class="p-k">${n}</span><b class="t-display">${fmtNum(l[k])}</b><span class="p-u">cm</span>${pDelta(d, "", d === 0 ? null : (lowerBetter ? d < 0 : d > 0))}</button>`;
  }).join("");
  const selName = (MEASURES.find(([k]) => k === measureSel) || ["", ""])[1];
  const pts = ms.filter(m => m[measureSel] != null && m.ts).slice(-30).map(m => ({ t: m.ts, y: m[measureSel] }));
  const chart = pts.length >= 4 ? pLine([{ pts, color: PC.kg, name: selName.split(" ")[0] }], { unit: "cm", h: 160, label: selName + " ölçüsü" })
    : `<p class="p-fine">${esc(selName)}: ${pts.length} ölçüm. Çizgi grafiği 4 ölçümden sonra açılır; o zamana kadar sayılar ve değişim yeterli.</p>`;
  const rows = ms.map((m, i) => ({ m, i })).reverse().slice(0, 4).map(({ m, i }) => `<div class="p-row">
      <span class="p-dim">${fmtDate(m.ts)}</span><span class="p-row-r p-trunc">${MEASURES.filter(([k]) => m[k] != null).map(([k, n]) => `${n.split(" ")[0]} ${fmtNum(m[k])}`).join(" · ")}</span>
      <button onclick="deleteMeasurement(${i})" aria-label="Ölçüyü sil" class="p-x">${pI("x", 18, 2.2)}</button></div>`).join("");
  return `<div class="p-card" id="pMeasure">${pSec("Vücut ölçüleri", null, add)}<div class="p-ms-g">${cells}</div>${chart}<div class="p-rows mt">${rows}</div></div>`;
}

// --- GÜÇ
function progGucHtml() {
  const keys = Object.keys(state.exerciseHistory).filter(k => state.exerciseHistory[k].length)
    .sort((a, b) => state.exerciseHistory[b].slice(-1)[0].ts - state.exerciseHistory[a].slice(-1)[0].ts);
  if (!progressSel || !state.exerciseHistory[progressSel]) progressSel = keys[0] || "";
  const nm = k => { const h = state.exerciseHistory[k]; return h[h.length - 1].name || k; };
  let exCard;
  if (!keys.length) {
    exCard = `<div class="p-card" id="pExChart">${pSec("Hareket ilerlemesi", PC.tq)}<p class="p-fine">Antrenmanlarını kaydettikçe her hareketin ilerlemesi burada oluşur.</p></div>`;
  } else {
    const recent = keys.slice(0, 4);
    const chips = recent.map(k => `<button onclick="progSelectEx(${esc(JSON.stringify(k))})" class="p-chip ${k === progressSel ? "on" : ""}" aria-pressed="${k === progressSel}">${esc(nm(k))}</button>`).join("");
    const sel = keys.length > 4 ? `<select aria-label="Hareket seç" onchange="progSelectEx(this.value)" class="p-select">${keys.map(k => `<option value="${esc(k)}" ${k === progressSel ? "selected" : ""}>${esc(nm(k))} (${state.exerciseHistory[k].length})</option>`).join("")}</select>` : "";
    const name = nm(progressSel);
    const ser = exerciseSeries(name);
    const hist = historyFor(name);
    const pts = ser.points.filter(p => p.t).slice(-30);
    const best = pts.length ? Math.max(...pts.map(p => p.y)) : 0;
    const chart = pts.length >= 4
      ? pLine([{ pts, color: PC.tq, name: ser.metric === "Tahmini 1RM" ? "tahmini 1RM" : ser.metric.toLocaleLowerCase("tr-TR") }], { unit: ser.unit, h: 170, label: name + " " + ser.metric })
      : `<div class="p-lowd"><div><b>${esc(name)}</b><span>${pts.length} seans · grafik için en az 4 gerekir</span></div>
          <div class="p-lowd-v"><b class="t-display">${fmtNum(best)}</b><span>${esc(ser.unit)}</span>${pts.length >= 2 ? pDelta(pts[pts.length - 1].y - pts[0].y, "", pts[pts.length - 1].y >= pts[0].y) : ""}</div></div>`;
    const recentRows = hist.slice().reverse().slice(0, 5).map(h => `<div class="p-row"><span class="p-dim">${fmtDate(h.ts)}</span><span class="p-row-r p-trunc">${esc(sessionSummary(h))}</span></div>`).join("");
    exCard = `<div class="p-card" id="pExChart">${pSec("Hareket ilerlemesi", PC.tq)}<div class="p-chips">${chips}</div>${sel}
      ${chart}${ser.metric === "Tahmini 1RM" ? `<p class="p-fine">Tahmini 1RM = tek tekrarda kaldırabileceğin kilo (en iyi setinden hesaplanır).</p>` : ""}
      <details class="p-det"><summary>Son kayıtlar</summary><div class="p-rows">${recentRows}</div></details></div>`;
  }
  // En iyiler (ağırlık hareketleri, tahmini 1RM)
  const prs = [];
  keys.forEach(k => {
    const h = state.exerciseHistory[k];
    if (h[h.length - 1].kind !== "weight") return;
    let best = null; const perSess = [];
    h.forEach(sess => {
      let sb = 0;
      (sess.sets || []).forEach(s => { const v = e1rm(s.kg, s.reps); if (v > sb) sb = v; if (v > 0 && (!best || v > best.v)) best = { v, kg: num(s.kg), reps: num(s.reps), ts: sess.ts }; });
      if (sb > 0) perSess.push(sb);
    });
    if (best) prs.push({ k, name: nm(k), ...best, spark: perSess.slice(-10), d: perSess.length >= 2 ? best.v - perSess[0] : null });
  });
  prs.sort((a, b) => b.ts - a.ts);
  const prRows = prs.slice(0, 12).map(p => `<button onclick="progSelectEx(${esc(JSON.stringify(p.k))})" class="p-pr">
      <span class="p-pr-n"><b>${esc(p.name)}</b><span>${fmtDate(p.ts)} · ${fmtNum(p.kg)} kg × ${p.reps}</span></span>${pSpark(p.spark, PC.tq)}
      <span class="p-pr-v"><b class="t-display">${fmtNum(round1(p.v))}</b>${p.d != null ? pDelta(p.d, "", true) : ""}</span></button>`).join("");
  const prCard = `<div class="p-card" id="pPrs">${pSec("Hareketlerin en iyileri", PC.tq, `<span class="p-dim p-sm">tahmini 1RM, kg</span>`)}
    ${prRows ? `<div class="p-prs">${prRows}</div>` : `<p class="p-fine">Henüz kayıt yok. Antrenman kaydettikçe her hareketin en iyi seti (tahmini 1RM) burada listelenir.</p>`}</div>`;
  // Kas başına set (bullet, azalan sıra)
  const counts = weeklyMuscleSets(weekStart());
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const scale = Math.max(22, ...Object.values(counts));
  const mus = MUSCLES.map(m => [m, counts[m] || 0]).sort((a, b) => b[1] - a[1]).map(([m, c]) => {
    const st = c === 0 ? "yok" : c < 10 ? "az" : c <= 20 ? "uygun" : "fazla";
    return `<div class="p-bl"><span class="p-bl-n">${esc(m)}</span><span class="p-bl-t"><i class="p-bl-band" style="left:${(10 / scale * 100).toFixed(1)}%;width:${(10 / scale * 100).toFixed(1)}%"></i><i class="p-bl-v" style="width:${Math.min(100, c / scale * 100).toFixed(1)}%"></i></span><span class="p-bl-c"><b>${c}</b> <small class="${st === "uygun" ? "ok" : ""}">${st}</small></span></div>`;
  }).join("");
  const musCard = `<div class="p-card" id="pMuscles">${pSec("Bu hafta kas başına set", PC.tq, `<span class="p-dim p-sm">toplam ${total}</span>`)}
    ${total ? `<div class="p-bls">${mus}</div>${pLegend([[`<i class="p-lg-band"></i>`, "10–20 set: kas gelişimi için genel öneri"]])}<p class="p-fine">Her set hareketin ana kas grubuna sayılır; kas grubunu hareketi düzenlerken değiştirebilirsin.</p>`
      : `<p class="p-fine">Bu hafta kaydedilmiş antrenman yok. Antrenmanı bitirip kaydettikçe her kas grubunun set sayısı burada birikir.</p>`}</div>`;
  // Haftalık tonaj (8 hafta) + bu haftanın kardiyo / rekor sayısı
  const ws = weekStart(), w = progWeekly();
  const ton = Array.from({ length: 8 }, (_, i) => {
    const a = ws - (7 - i) * 7 * DAY_MS, b = a + 7 * DAY_MS;
    const v = state.workoutLogs.filter(l => l.ts && l.ts >= a && l.ts < b).reduce((s, l) => s + num(l.volume), 0) / 1000;
    return { label: i === 7 ? "Bu h." : i === 0 ? new Date(a).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) : String(new Date(a).getDate()), v: round1(v), flag: i === 7 ? "now" : "" };
  });
  const hasTon = ton.some(t => t.v > 0);
  const tonCard = `<div class="p-card" id="pTonnage">${pSec("Haftalık tonaj", PC.tq, `<span class="p-dim p-sm">ton</span>`)}
    ${hasTon ? pBars(ton, { color: PC.tq, id: "ton", fmt: v => fmtNum(v), label: "Son 8 haftanın tonajı (ton)" }) + `<p class="p-fine">Bu hafta sürüyor (yarı saydam); bitmemiş haftayı tam haftalarla karşılaştırma.</p>` : `<p class="p-fine">Henüz tonaj yok.</p>`}
    <div class="p-mini3"><div><span>Bu hafta</span><b>${w.n} seans</b></div><div><span>Kardiyo</span><b>${fmtNum(w.min)} dk${w.km > 0 ? ` · ${fmtNum(w.km)} km` : ""}</b></div><div><span>Rekor</span><b>${w.prs}</b></div></div></div>`;
  // Takvim: son 5 hafta (antrenman dolgu + ✓, mobilite alt çizgi, bugün çerçeve)
  const wd = progWorkoutDays(), mob = progMobDays();
  const calStart = ws - 4 * 7 * DAY_MS, tKey = todayStr();
  let cal = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"].map(d => `<div class="p-cal-h">${d}</div>`).join("");
  for (let i = 0; i < 35; i++) {
    const d = new Date(calStart + i * DAY_MS + 12 * 3600000), k = todayStr(d);
    const on = !!wd[k], fut = k > tKey;
    cal += `<div class="p-cal-d ${on ? "w" : ""} ${fut ? "fut" : ""} ${k === tKey ? "today" : ""}" role="img" aria-label="${d.getDate()} ${d.toLocaleDateString("tr-TR", { month: "long" })}${on ? ", antrenman" : ""}${mob[k] ? ", mobilite" : ""}">
      <span>${d.getDate()}${d.getDate() === 1 ? `<small>${d.toLocaleDateString("tr-TR", { month: "short" })}</small>` : ""}</span>${on ? `<em>${pI("check", 11, 3)}</em>` : ""}${mob[k] ? "<u></u>" : ""}</div>`;
  }
  const n28 = Object.keys(wd).filter(k => new Date(k + "T12:00:00").getTime() >= Date.now() - 28 * DAY_MS).length;
  const calCard = `<div class="p-card" id="pCalendar">${pSec("Antrenman takvimi", PC.tq, `<span class="p-dim p-sm">son 4 hafta: ${n28} gün</span>`)}<div class="p-cal">${cal}</div>
    ${pLegend([[`<i class="p-lg-w">${pI("check", 9, 3.2)}</i>`, "Antrenman"], [`<i class="p-lg-m"></i>`, "Mobilite"], [`<i class="p-lg-today"></i>`, "Bugün"]])}</div>`;
  return exCard + prCard + musCard + tonCard + calCard;
}

// --- BESLENME (su ve kalori geçmişi)
function progBeslenmeHtml() {
  const chips = [7, 14, 30].map(n => `<button onclick="setHistRange(${n})" class="p-chip ${histRange === n ? "on" : ""}" aria-pressed="${histRange === n}">${n} gün</button>`).join("");
  const head = `<div class="p-chips">${chips}</div>`;
  if (!Object.keys(state.dailyLogs).length) {
    return `${head}<div class="p-card" id="pNutriHist">${pSec("Su ve beslenme geçmişi", PC.gr)}<p class="p-fine">Uygulama her gece yarısı o günün su ve beslenme özetini kaydeder. İlk günün yarın burada görünecek; günler biriktikçe grafikler dolar.</p></div>`;
  }
  const ser = historySeries(histRange);
  const waterT = waterTargetL(), calT = getTargets().calTarget;
  const past = ser.filter(s => !s.empty && !s.live);
  const avgWater = past.length ? past.reduce((a, s) => a + s.water, 0) / past.length : 0;
  const waterHit = past.filter(s => s.water >= waterT).length;
  const proHit = past.filter(s => s.p >= s.proT * 0.95).length;
  const calHit = past.filter(s => s.eaten && hitClass(s.kcal, s.calT) === "ok").length;
  const eatenDays = past.filter(s => s.eaten);
  const avgKcal = eatenDays.length ? Math.round(eatenDays.reduce((a, s) => a + s.kcal, 0) / eatenDays.length) : null;
  const lbl = s => s.live ? "Bugün" : histRange <= 7 ? ["Pz", "Pt", "Sa", "Ça", "Pe", "Cu", "Ct"][new Date(s.key + "T12:00:00").getDay()] : String(new Date(s.key + "T12:00:00").getDate());
  const kItems = ser.map(s => ({ label: lbl(s), v: s.empty ? null : s.kcal, flag: s.live ? "now" : s.empty ? "" : !s.eaten ? "plan" : s.calT > 0 && s.kcal > s.calT * 1.05 ? "over" : "" }));
  const wItems = ser.map(s => ({ label: lbl(s), v: s.empty ? null : s.water, flag: s.live ? "now" : "" }));
  const tile = (l, v, sub) => `<div class="p-mt"><span>${l}</span><b>${v}</b><small>${sub}</small></div>`;
  const rows = past.slice().reverse().map(s => `<div class="p-row p-row4"><span class="p-dim">${esc(s.label)}</span><b>${s.kcal.toLocaleString("tr-TR")} kcal${s.eaten ? "" : " *"}</b><span>${fmtNum(s.water)} L</span><span class="p-dim">${num(s.raw.mealsDone)}/${num(s.raw.mealsTotal)} öğün</span></div>`).join("");
  return `${head}
    <div class="p-card" id="pNutriHist">${pSec("Su ve beslenme geçmişi", PC.gr)}
      <div class="p-mt-g">${tile("Kalori hedefte", `${calHit}/${eatenDays.length} gün`, "±%5 · öğünü işaretli günler")}${tile("Protein hedefte", `${proHit}/${past.length} gün`, "hedefin %95'i ve üstü")}${tile("Su hedefte", `${waterHit}/${past.length} gün`, "ort. " + fmtNum(avgWater) + " L")}</div></div>
    <div class="p-card" id="pKcal">${pSec("Kalori", PC.gr, avgKcal != null ? `<span class="p-dim p-sm">ort. ${avgKcal.toLocaleString("tr-TR")}</span>` : "")}
      ${pBars(kItems, { color: PC.gr, target: calT, id: "kc", fmt: v => fmtNum(v / 1000), label: `Son ${histRange} günün kalorisi` })}
      ${pLegend([[`<i class="p-lg-sq" style="background:${PC.gr}"></i>`, "Yenen"], [`<i class="p-lg-tgt"></i>`, "Hedef " + calT.toLocaleString("tr-TR")], [`<i class="p-lg-hatch"></i>`, "Hedefin %5 üstü (↑)"], [`<i class="p-lg-plan"></i>`, "İşaretlenmemiş: plan (*)"]])}
      ${histRange <= 7 ? `<p class="p-fine">Çubuklardaki sayılar bin kcal.</p>` : ""}</div>
    <div class="p-card" id="pWater">${pSec("Su", PC.wa, `<span class="p-dim p-sm">ort. ${fmtNum(avgWater)} L</span>`)}
      ${pBars(wItems, { color: PC.wa, target: waterT, id: "wa", fmt: v => fmtNum(v), label: `Son ${histRange} günün suyu (litre)` })}
      ${pLegend([[`<i class="p-lg-tgt"></i>`, "Hedef " + fmtNum(waterT) + " L"]])}</div>
    ${rows ? `<details class="p-card p-det" id="pDayList"><summary>Gün gün liste</summary><div class="p-rows">${rows}</div><p class="p-fine">* Öğün işaretlenmemiş gün: planlanan kalori gösterilir.</p></details>` : ""}`;
}

function renderProgress() {
  const v = PROG_VIEWS.some(x => x[0] === state.progressView) ? state.progressView : "genel";
  const nav = `<nav id="progNav" class="p-subnav" aria-label="İlerleme bölümleri">${PROG_VIEWS.map(([k, l]) => `<button onclick="setProgressView('${k}')" data-pv="${k}" class="${v === k ? "on" : ""}" ${v === k ? 'aria-current="page"' : ""}>${l}</button>`).join("")}</nav>`;
  const body = v === "kilo" ? progKiloHtml() : v === "guc" ? progGucHtml() : v === "beslenme" ? progBeslenmeHtml() : progGenelHtml();
  $("progressContent").innerHTML = nav + `<div id="pv_${v}">${body}</div>`;
}

