// ============================================================================
// v73 — HAREKET KÜTÜPHANESİ: kas grubu bölümleri, ekipman süzgeci,
//        favoriler, son yapılanlar, gruplu arama
// (Antrenman → Hareketler ekranı ve "Kütüphaneden ekle" penceresi ortak kullanır.
//  Yalnız görünüm: kayıtlı veri değişmez; tek yeni alan state.favExercises.)
// ============================================================================

// Ekipman süzgeci (kayıttaki ex.equip'ten bağımsız; yalnız kütüphanede süzmek için)
const LIB_EQUIPS = ["bar", "dumbbell", "machine", "cable", "body"];
function libEquipL(k) {
  return k === "bar" ? t("Bar / Plaka") : k === "dumbbell" ? t("Dambıl / KB") : k === "machine" ? t("Makine") : k === "cable" ? t("Kablo") : t("Vücut ağırlığı");
}
const libEquipCache = new Map();
// Bir hareketin kullandığı ekipmanlar (birden çok olabilir: "Dumbbell / Barbell Front Raise"). Kardiyo: boş.
function libEquipsOf(name) {
  const k = exKey(name);
  if (libEquipCache.has(k)) return libEquipCache.get(k);
  const out = new Set();
  if (detectKind(name) !== "cardio") {
    if (/cable|kablo|pushdown|crossover|face pull|pull-through|woodchopper|pallof/.test(k) || (/pulldown/.test(k) && !/iso-lateral/.test(k))) out.add("cable");
    if (/machine|makine|smith|pec deck|leg press|hack squat|pendulum|belt squat|leg extension|leg curl|hammer strength|iso-lateral|chest-supported row|t-bar|calf raise|glute drive|assisted|preacher/.test(k) && !/dumbbell calf|dumbbell preacher/.test(k)) out.add("machine");
    if ((/goblet|arnold|concentration|spider|zottman|step-up|lunge|bulgarian|farmer|lateral raise|hammer curl|kickback|skullcrusher/.test(k) && !/cable|machine/.test(k)) || /dumbbell|dambıl|\bdb\b|kettlebell/.test(k)) out.add("dumbbell");
    if (/pull-?up|chin-?up|barfiks|push-?up|şinav|\bdips?\b|hanging|inverted row|nordic|sissy|hyperextension|back extension|plank|sit-up|ab wheel|deadbug|bird-dog|vacuum|dead hang|captain|glute-ham|band|tibialis raise|decline bench crunch|lunge/.test(k) && !/dip machine/.test(k)) out.add("body");
    if (/barbell|ez-bar|landmine|plate|plaka|wrist|t-bar|preacher curl \(ez/.test(k)) out.add("bar");
    if (!out.size && /deadlift|good morning|rack pull|pendlay|meadows|squat|hip thrust|glute bridge|jm press|russian twist|neck|bench press|military|upright row|shrug/.test(k)) out.add("bar");
    if (!out.size) { const e = autoEquip(name); out.add(e === "dumbbell" ? "dumbbell" : e === "bodyweight" ? "body" : e === "stack" ? "machine" : "bar"); }
  }
  const arr = LIB_EQUIPS.filter(x => out.has(x));
  libEquipCache.set(k, arr);
  return arr;
}

// Bölüm (kas grubu) — kardiyo ayrı bölüm "cardio"; tanınmayan özel hareket "other"
const LIB_SECTIONS = () => [...MUSCLES, "cardio", "other"];
function libSectionL(sec) { return sec === "cardio" ? t("Kardiyo") : sec === "other" ? t("Diğer") : muscleL(sec); }
function libSectionOf(name, muscleHint) {
  if (detectKind(name) === "cardio") return "cardio";
  if (muscleHint && MUSCLES.includes(muscleHint)) return muscleHint;
  return autoMuscle(name) || "other";
}

// Kütüphanedeki bütün hareketler (mobilite hariç), kendi sırasıyla
let libAllCache = null;
function libAllNames() {
  if (!libAllCache) {
    const seen = new Set();
    libAllCache = [];
    Object.keys(EXERCISE_LIBRARY).forEach(c => EXERCISE_LIBRARY[c].forEach(n => { n = n.trim(); const k = exKey(n); if (!seen.has(k)) { seen.add(k); libAllCache.push(n); } }));
  }
  return libAllCache;
}
// Kullanıcının programındaki / geçmişindeki özel hareketler (kütüphanede olmayanlar) + elle seçilmiş kasları
function libUserExtras() {
  const lib = new Set(libAllNames().map(exKey));
  const out = new Map();
  (state.workoutDays || []).forEach(d => (d.exercises || []).forEach(ex => {
    const k = exKey(ex.name);
    if (ex.name && !lib.has(k) && !out.has(k)) out.set(k, { name: String(ex.name).trim(), muscle: ex.kind === "cardio" ? null : ex.muscle });
  }));
  Object.keys(state.exerciseHistory || {}).forEach(k => {
    if (lib.has(k) || out.has(k)) return;
    const h = state.exerciseHistory[k], last = h[h.length - 1];
    if (last && last.name) out.set(k, { name: String(last.name).trim(), muscle: null });
  });
  return [...out.values()];
}
// Programda elle seçilmiş ana kas (varsa) — bölümü ona göre
function libMuscleHint(name) {
  const k = exKey(name);
  for (const d of state.workoutDays || []) for (const ex of d.exercises || []) if (exKey(ex.name) === k && ex.kind !== "cardio" && MUSCLES.includes(ex.muscle)) return ex.muscle;
  return null;
}

// Favoriler
function isFavExercise(name) { const k = exKey(name); return (state.favExercises || []).some(x => exKey(x) === k); }
function toggleFavExercise(name) {
  name = String(name || "").trim();
  if (!name) return;
  if (!Array.isArray(state.favExercises)) state.favExercises = [];
  const k = exKey(name), on = !isFavExercise(name);
  state.favExercises = on ? [name, ...state.favExercises].slice(0, 200) : state.favExercises.filter(x => exKey(x) !== k);
  saveState();
  toast(on ? t("Favorilere eklendi") : t("Favorilerden çıkarıldı"));
  return on;
}
// Son yapılanlar: geçmişteki son seansa göre, en yeni önce
function libRecentNames(max = 12) {
  const h = state.exerciseHistory || {};
  return Object.keys(h).map(k => { const a = h[k], l = a[a.length - 1]; return l && l.name ? { name: String(l.name).trim(), ts: num(l.ts, 0) } : null; })
    .filter(Boolean).sort((a, b) => b.ts - a.ts).slice(0, max).map(x => x.name);
}

// Süzme: arama kelimeleri (ad, İngilizce ad, kas, ekipman adı) + ekipman
function libMatch(name, sec, words, eq) {
  if (eq && eq !== "all" && !libEquipsOf(name).includes(eq)) return false;
  if (!words.length) return true;
  const hay = normSearch(name + " " + exNameL(name) + " " + libSectionL(sec) + " " + (sec !== "cardio" && sec !== "other" ? sec : ""));
  return words.every(w => hay.includes(w));
}
// Bölümlere ayrılmış liste: [{ sec, items: [ad, …] }] — kütüphane + kullanıcının özel hareketleri
function libGrouped(q, eq, onlySec) {
  const words = normSearch(q || "").split(/\s+/).filter(Boolean);
  const by = {};
  const put = (name, sec) => { if (onlySec && sec !== onlySec) return; if (libMatch(name, sec, words, eq)) (by[sec] = by[sec] || []).push(name); };
  libAllNames().forEach(n => put(n, libSectionOf(n, libMuscleHint(n))));
  libUserExtras().forEach(x => put(x.name, libSectionOf(x.name, x.muscle)));
  return LIB_SECTIONS().filter(s => by[s] && by[s].length).map(s => ({ sec: s, items: by[s] }));
}

// ---------------------------------------------------------------------------
// Antrenman → Hareketler ekranı: çipler + liste
// ---------------------------------------------------------------------------
let libCat = null;     // null (otomatik) | "fav" | "recent" | "all" | "cardio"  — kas seçimi state.libMuscle'da
let libEq = "all";

function libAutoCat() {
  if ((state.favExercises || []).length) return "fav";
  if (libRecentNames(1).length) return "recent";
  return "all";
}
function libCurCat() { return state.libMuscle ? "muscle" : libCat || libAutoCat(); }
function setLibCat(c) {
  libCat = c;
  if (state.libMuscle) { selectMuscle(null); return; }   // harita seçimi de kalkar (yeniden çizer)
  libRefresh();
}
function setLibEq(e) { libEq = LIB_EQUIPS.includes(e) ? e : "all"; libRefresh(); }
function libRefresh() { const el = $("libBrowse"); if (el) el.innerHTML = libBrowseHtml(); }
function libToggleFav(name) { toggleFavExercise(name); libRefresh(); }

function libChipsHtml() {
  const cur = libCurCat();
  const chip = (on, onclick, label, extra = "") => `<button onclick="${onclick}" aria-pressed="${on}" ${extra} class="shrink-0 min-h-[44px] px-3.5 rounded-full text-[13px] border ${on ? "bg-[var(--t-text)] text-[var(--t-bg)] border-transparent font-bold" : "bg-[var(--t-surface)] border-[var(--t-line)] text-[var(--t-text2)] font-semibold"}">${label}</button>`;
  const favN = (state.favExercises || []).length;
  let row1 = chip(cur === "fav", "setLibCat('fav')", `<span class="inline-flex items-center gap-1">${svgI("star", 14, 2.2)}${t("Favoriler")}${favN ? ` <span class="opacity-70">${favN}</span>` : ""}</span>`, "data-lib-cat=\"fav\"")
    + chip(cur === "recent", "setLibCat('recent')", t("Son yapılanlar"), "data-lib-cat=\"recent\"")
    + chip(cur === "all", "setLibCat('all')", t("Tümü"), "data-lib-cat=\"all\"")
    + MUSCLES.map(m => chip(cur === "muscle" && state.libMuscle === m, `selectMuscle(${esc(JSON.stringify(m))})`, esc(muscleL(m)), `data-lib-muscle="${esc(m)}"`)).join("")
    + chip(cur === "cardio", "setLibCat('cardio')", t("Kardiyo"), "data-lib-cat=\"cardio\"");
  const row2 = chip(libEq === "all", "setLibEq('all')", t("Tüm ekipman"), "data-lib-eq=\"all\"") + LIB_EQUIPS.map(e => chip(libEq === e, `setLibEq('${e}')`, esc(libEquipL(e)), `data-lib-eq="${e}"`)).join("");
  return `<div class="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-0.5" role="group" aria-label="${t("Bölümler")}">${row1}</div>
    <div class="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-0.5" role="group" aria-label="${t("Ekipman")}">${row2}</div>`;
}

function libRowHtml(n, inDay) {
  const h = historyFor(n);
  const last = h[h.length - 1];
  const meta = last ? t("Son: {s} · {d}", { s: sessionSummary(last), d: fmtDate(last.ts) }) : t("Henüz yapılmadı");
  const fav = isFavExercise(n), js = esc(JSON.stringify(n));
  return `<div data-lib-row class="t-card-flat rounded-2xl min-h-[72px] pl-3.5 pr-1.5 py-2 flex items-center gap-2">
      ${exThumbHtml(n, "w-[76px] h-[43px] -ml-1.5")}
      <span class="flex-1 min-w-0 flex flex-col gap-1">
        <span class="text-[15px] font-bold">${esc(exNameL(n))}</span>
        <span class="text-xs t-muted truncate">${esc(meta)}</span>
        ${exNoteLine(n)}
        ${inDay.has(exKey(n)) ? `<span class="self-start text-[11px] font-bold px-2 py-0.5 rounded-full border border-[var(--t-panel-line)] bg-[var(--t-panel)]" style="color:var(--t-acc-text)">${t("PROGRAMDA")}</span>` : ""}
      </span>
      <button onclick="libToggleFav(${js})" data-fav aria-pressed="${fav}" aria-label="${esc(fav ? t("Favorilerden çıkar") : t("Favorilere ekle"))}" class="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center ${fav ? "text-[var(--t-warn-mid)]" : "t-dim"}"><svg width="20" height="20" viewBox="0 0 24 24" fill="${fav ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="${ICON.star}"/></svg></button>
      <button onclick="openExerciseModal({ name: ${js}, kind: detectKind(${js}) })" aria-label="${t("{name} hareketini {day} gününe ekle", { name: esc(exNameL(n)), day: esc(activeDay().name) })}" class="t-btn-outline w-11 h-11 shrink-0 rounded-xl flex items-center justify-center">${svgI("plus", 20, 2.4)}</button>
    </div>`;
}
const LIB_LIST_MAX = 80;
function libListHtml() {
  const q = libSearchQ.trim();
  const cur = libCurCat();
  const inDay = new Set(activeDay().exercises.map(e => exKey(e.name)));
  const head = (label, n) => `<div class="flex items-baseline justify-between pt-2 px-1"><span class="t-label">${esc(label)}</span>${n != null ? `<span class="text-xs t-dim">${tn(n, "{n} hareket")}</span>` : ""}</div>`;
  const empty = msg => `<div class="text-sm t-muted text-center py-4">${msg}</div>`;
  const words = normSearch(q).split(/\s+/).filter(Boolean);
  // Favoriler / son yapılanlar (aramada da süzülür)
  if (!q && (cur === "fav" || cur === "recent")) {
    const names = cur === "fav" ? (state.favExercises || []) : libRecentNames();
    const items = names.filter(n => libMatch(n, libSectionOf(n, libMuscleHint(n)), words, libEq));
    if (!items.length) return empty(cur === "fav" ? (names.length ? t("Bu ekipmanla favori hareket yok.") : t("Henüz favori hareket yok. Bir hareketin yıldızına dokununca burada görünür.")) : names.length ? t("Bu ekipmanla son yapılan hareket yok.") : t("Henüz kaydedilmiş hareket yok."));
    return items.map(n => libRowHtml(n, inDay)).join("");
  }
  const onlySec = q ? null : cur === "muscle" ? state.libMuscle : cur === "cardio" ? "cardio" : null;
  const groups = libGrouped(q, libEq, onlySec);
  if (!groups.length) return empty(t("Sonuç bulunamadı."));
  let shown = 0, more = 0, html = "";
  groups.forEach(g => {
    if (shown >= LIB_LIST_MAX) { more += g.items.length; return; }
    html += head(libSectionL(g.sec), g.items.length);
    g.items.forEach(n => { if (shown >= LIB_LIST_MAX) { more++; return; } shown++; html += libRowHtml(n, inDay); });
  });
  if (more) html += `<div class="text-[12px] t-dim text-center py-2">${tn(more, "{n} sonuç daha var; aramayı daralt.")}</div>`;
  return html;
}
function libBrowseHtml() {
  return `${libChipsHtml()}<div id="libList" class="space-y-2">${libListHtml()}</div>`;
}

// ---------------------------------------------------------------------------
// "Kütüphaneden ekle" penceresi (ortak seçici + ekipman çipleri + yıldız)
// ---------------------------------------------------------------------------
function exPickerGroups() {
  const item = n => ({ id: n, label: exNameL(n), sub: detectKind(n) !== "weight" ? kindL(detectKind(n)) : "", img: n, fav: n });
  const fav = (state.favExercises || []), rec = libRecentNames(8);
  const out = [];
  if (fav.length) out.push({ key: "fav", label: t("Favoriler"), short: t("Favoriler"), pseudo: true, items: fav.map(item) });
  if (rec.length) out.push({ key: "recent", label: t("Son yapılanlar"), short: t("Son yapılanlar"), pseudo: true, items: rec.map(item) });
  libGrouped("", "all", null).forEach(g => out.push({ key: g.sec, label: libSectionL(g.sec), short: libSectionL(g.sec), items: g.items.map(item) }));
  return out;
}
function openExercisePicker() {
  openPicker(t("Hareket Kütüphanesi"), exPickerGroups(), it => openExerciseModal({ name: it.id, kind: detectKind(it.id) }),
    { label: t("Listede yok mu? Özel hareket yaz"), onClick: () => openExerciseModal({ name: "", kind: "weight" }) },
    {
      equips: LIB_EQUIPS.map(e => [e, libEquipL(e)]), allEquipLabel: t("Tüm ekipman"),
      equipTest: (it, e) => libEquipsOf(it.id).includes(e),
      fav: { has: isFavExercise, toggle: n => { toggleFavExercise(n); picker.groups = exPickerGroups(); } },
    });
}

// ============================================================================
// v74 — HAREKET DEĞİŞTİR / ALTERNATİF ÖNER
// Makine doluysa ya da bir yer ağrıyorsa: aynı kası çalıştıran benzer hareketler.
// Benzerlik: aynı hareket kalıbı (press, çekiş, curl…) + ortak yardımcı kaslar + aynı tür.
// ============================================================================
const EX_PATTERNS = [   // ilk eşleşen kalıp (sıra önemli: "reverse fly" fly değil arka omuz, "upright row" kürek değil)
  /rear delt|reverse fly|reverse pec|face pull/, /upright row/, /fly|crossover|pec deck/, /pulldown|pull-?up|chin-?up|barfiks|pullover/, /\brow\b|row \(|rows?$/, /deadlift|rdl|good morning|hyperextension|pull-through|swing/,
  /squat|leg press|lunge|step-up/, /leg extension/, /leg curl|nordic|glute-ham/, /hip thrust|glute bridge|glute drive|glute kickback/,
  /lateral raise/, /front raise/, /shrug/, /calf/,
  /crunch|sit-up|leg raise|knee raise|rollout/, /plank|vacuum|deadbug|bird-dog|pallof|woodchopper|russian twist/, /neck/, /wrist|pinch|hang|farmer/,
  /adduct|copenhagen/, /tibialis|dorsiflexion/, /pushdown|triceps extension|skull|jm press|kickback|overhead.*extension/, /curl/,
  /press|push-?up|şinav|\bdips?\b/,
];
function exPatternOf(name) {
  const k = exKey(name);
  const i = EX_PATTERNS.findIndex(re => re.test(k));
  return i;
}
function exAlternatives(name, sec) {
  const k = exKey(name), inDay = new Set(activeDay().exercises.map(e => exKey(e.name)));
  const g = libGrouped("", "all", sec)[0];
  const pool = (g ? g.items : []).filter(n => exKey(n) !== k && !inDay.has(exKey(n)));
  const pat = exPatternOf(name), kind = detectKind(name), sec2 = new Set(sec === "cardio" ? [] : secondaryMuscles(name, sec));
  const eqs = new Set(libEquipsOf(name));
  const score = n => {
    let s = 0;
    if (pat >= 0 && exPatternOf(n) === pat) s += 4;
    if (detectKind(n) === kind) s += 2;
    if (sec !== "cardio") secondaryMuscles(n, sec).forEach(m => { if (sec2.has(m)) s += 1; });
    if (!libEquipsOf(n).some(e => eqs.has(e))) s += 0.5;   // makine doluysa: farklı ekipman biraz önde
    if (isFavExercise(n)) s += 0.5;
    return s;
  };
  return pool.map((n, i) => ({ n, s: score(n), i })).sort((a, b) => b.s - a.s || a.i - b.i).map(x => x.n);
}
const EX_ALT_TOP = 6;
function openSwapExercise(exIdx) {
  const ex = activeDay().exercises[exIdx];
  if (!ex) return;
  const sec = ex.kind === "cardio" ? "cardio" : libSectionOf(ex.name, muscleOf(ex));
  const alts = exAlternatives(ex.name, sec);
  const item = n => ({ id: n, label: exNameL(n), sub: detectKind(n) !== "weight" ? kindL(detectKind(n)) : "", img: n, fav: n });
  const groups = [];
  if (alts.length) groups.push({ key: "best", label: t("En yakın alternatifler"), short: t("En yakın"), items: alts.slice(0, EX_ALT_TOP).map(item) });
  if (alts.length > EX_ALT_TOP) groups.push({ key: "rest", label: t("Diğer {kas} hareketleri", { kas: libSectionL(sec) }), short: libSectionL(sec), items: alts.slice(EX_ALT_TOP).map(item) });
  openPicker(t("{ad} yerine", { ad: exNameL(ex.name) }), groups, it => swapExercise(exIdx, it.id), null, {
    equips: LIB_EQUIPS.map(e => [e, libEquipL(e)]), allEquipLabel: t("Tüm ekipman"),
    equipTest: (it, e) => libEquipsOf(it.id).includes(e),
    fav: { has: isFavExercise, toggle: toggleFavExercise },
  });
}
// Değiştir: yapılmış set varsa (antrenman sürüyorsa) eski hareket yapılan setleriyle kalır, yenisi hemen altına kalan set sayısıyla eklenir.
function swapExercise(exIdx, newName) {
  const day = activeDay(), ex = day.exercises[exIdx];
  newName = String(newName || "").trim();
  if (!ex || !newName) return;
  snapshot();
  const kind = detectKind(newName);
  const done = ex.sets.filter(s => s.done), todo = ex.sets.filter(s => !s.done);
  const keepOld = done.length > 0 && todo.length > 0;
  const base = keepOld ? todo : ex.sets;
  const n = Math.max(1, base.length);
  const kg = kind === "weight" ? lastWorkKg(newName) : 0;
  let sets;
  if (kind === ex.kind && kind === "weight") sets = base.map(s => ({ kg, reps: num(s.reps, 10) || 10, target: s.target, done: false }));
  else if (kind === ex.kind && kind === "time") sets = base.map(s => ({ sec: num(s.sec, 30) || 30, target: s.target, done: false }));
  else if (kind === ex.kind && kind === "cardio") sets = base.map(s => ({ min: s.min, km: s.km, lvl: "", done: false }));
  else sets = kind === "weight" ? makeWeightSets(n, "", kg, 10) : kind === "time" ? makeTimeSets(n, 30) : [makeCardioRow()];
  const nx = { name: newName, kind, targetInfo: kind === ex.kind ? ex.targetInfo || "" : "", note: "", sets };
  if (kind !== "cardio") nx.rest = ex.rest != null && ex.kind !== "cardio" ? ex.rest : state.settings.restSec;
  if (keepOld) { ex.sets = done; day.exercises.splice(exIdx + 1, 0, nx); }
  else day.exercises.splice(exIdx, 1, nx);
  renderAll();
  offerUndo(t("{a} yerine {b}", { a: exNameL(ex.name), b: exNameL(newName) }));
}
