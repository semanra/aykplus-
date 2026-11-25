// ============================================================================
// v75 — SÜPERSET / DEVRE (isteğe bağlı)
// Bir günde art arda duran hareketler aynı ex.ss kimliğiyle bağlanır: 2 hareket = süperset, 3+ = devre.
// Antrenmanda grup içinde dinlenmeden sıradaki harekete geçilir; turun sonunda dinlenme sayacı başlar.
// Bağlanmamış hareketlerde hiçbir şey değişmez. Kayıt: yalnız ex.ss (metin); geçmiş ve sayımlar etkilenmez.
// ============================================================================
function ssNewId() { return "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

// Temizlik: tek kalan, kardiyo olan, aynı kimlikle iki ayrı yerde duran grupları düzeltir (sıra değişince / silince)
function ssCleanDay(day) {
  const exs = day && Array.isArray(day.exercises) ? day.exercises : [];
  const seen = new Set();
  exs.forEach(x => { if (isObj(x) && typeof x.ss === "string" && x.ss.length > 24) x.ss = x.ss.slice(0, 24); });
  let i = 0;
  while (i < exs.length) {
    const ex = exs[i];
    if (!isObj(ex)) { i++; continue; }
    if (typeof ex.ss !== "string" || !ex.ss || ex.kind === "cardio") { delete ex.ss; i++; continue; }
    let j = i;
    while (j + 1 < exs.length && isObj(exs[j + 1]) && exs[j + 1].ss === ex.ss && exs[j + 1].kind !== "cardio") j++;
    if (j === i) delete ex.ss;
    else {
      if (seen.has(ex.ss)) { const id = ssNewId(); for (let k = i; k <= j; k++) exs[k].ss = id; }
      seen.add(exs[i].ss);
    }
    i = j + 1;
  }
}
function ssCleanAll() { (state.workoutDays || []).forEach(ssCleanDay); }

// Her hareket için grup bilgisi: { id, letter, pos, size, first, last } ya da null
function ssInfo(day) {
  const exs = day.exercises, out = exs.map(() => null);
  let letter = 0;
  for (let i = 0; i < exs.length;) {
    const id = exs[i].ss;
    if (!id) { i++; continue; }
    let j = i;
    while (j + 1 < exs.length && exs[j + 1].ss === id) j++;
    if (j > i) {
      const L = String.fromCharCode(65 + (letter++ % 26));
      for (let k = i; k <= j; k++) out[k] = { id, letter: L, pos: k - i, size: j - i + 1, first: i, last: j };
    }
    i = j + 1;
  }
  return out;
}
function ssLabel(g) { return g.size > 2 ? t("DEVRE {l}", { l: g.letter }) : t("SÜPERSET {l}", { l: g.letter }); }

// Grup içinde sıradaki set: en az set yapılmış (eşitse öndeki) hareketin ilk yapılmamış seti → A1 B1 A2 B2 …
function ssPick(day, e) {
  const g = ssInfo(day)[e];
  if (!g) return null;
  let best = null, bestDone = Infinity;
  for (let k = g.first; k <= g.last; k++) {
    const sets = day.exercises[k].sets, s = sets.findIndex(x => !x.done);
    if (s < 0) continue;
    const done = sets.filter(x => x.done).length;
    if (done < bestDone) { best = { e: k, s }; bestDone = done; }
  }
  return best;
}

function ssLinkNext(i) {
  const exs = activeDay().exercises, a = exs[i], b = exs[i + 1];
  if (!a || !b || a.kind === "cardio" || b.kind === "cardio") return;
  snapshot();
  const id = a.ss || b.ss || ssNewId();
  const old = b.ss && b.ss !== id ? b.ss : null;
  if (old) exs.forEach(x => { if (x.ss === old) x.ss = id; });
  a.ss = id; b.ss = id;
  ssCleanDay(activeDay());
  renderAll();
  if (typeof animFlashEx === "function") animFlashEx([i, i + 1]);   /* v80 ANİM: vurgu */
  offerUndo(t("Bağlandı: dinlenmeden art arda yapılır"));
}
function ssUnlink(i) {
  const ex = activeDay().exercises[i];
  if (!ex || !ex.ss) return;
  snapshot();
  delete ex.ss;
  ssCleanDay(activeDay());
  renderAll();
  offerUndo(t("Süpersetten çıkarıldı"));
}

// Hareket menüsü satırları (openExSheet içine)
function ssSheetItems(exIdx, item) {
  const exs = activeDay().exercises, ex = exs[exIdx], nx = exs[exIdx + 1];
  if (!ex || ex.kind === "cardio") return "";
  let html = "";
  if (nx && nx.kind !== "cardio" && !(ex.ss && nx.ss === ex.ss)) html += item(`ssLinkNext(${exIdx})`, "link", t("Sonrakiyle bağla (süperset)"), t("{ad} ile dinlenmeden art arda", { ad: exNameL(nx.name) }));
  if (ex.ss) html += item(`ssUnlink(${exIdx})`, "unlink", t("Süpersetten çıkar"), t("Bu hareket kendi başına yapılır"));
  return html;
}
