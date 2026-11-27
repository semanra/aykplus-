// ============================================================================
// v85 — GEÇMİŞ GÜNE YEDİĞİNİ EKLE (dün unutulan öğün)
// Beslenme → Geçmiş'te geçmiş günün kartında "+ Yediğini ekle" → #pastFoodModal: besin seç + miktar ya da tahmini değer.
// Kayıt: dailyLogs[gün].added = [{ n, k, p, c, f, id?, a? }] (n = kayıttaki Türkçe ad; İngilizce ad yazılmaz).
// Eklenen değerler günün hem planına (kcal/p/c/f) hem yenenine (eatenKcal/eatenP) eklenir; silinince aynı miktar düşülür.
// archiveDay aynı güne yeniden yazarsa liste korunur ve toplamlara yeniden eklenir (02-arayuz.js).
// ============================================================================
let pdUI = { key: null, sel: null, amt: 0 };

function pdSum(list) {
  const s = { k: 0, p: 0, c: 0, f: 0 };
  (Array.isArray(list) ? list : []).forEach(e => { if (isObj(e)) { s.k += num(e.k, 0); s.p += num(e.p, 0); s.c += num(e.c, 0); s.f += num(e.f, 0); } });
  return s;
}
// Bir günün özetine eklenen girdinin değerlerini ekler (sign = 1) ya da düşer (sign = -1); 0'ın altına inmez
function pdApply(d, e, sign) {
  const add = (key, v, dec) => { const r = Math.max(0, num(d[key], 0) + sign * num(v, 0)); d[key] = dec ? round1(r) : Math.round(r); };
  add("kcal", e.k); add("p", e.p, true); add("c", e.c, true); add("f", e.f, true);   // gramlar 0,1 hassasiyetle (ekle/sil kaymasın)
  add("eatenKcal", e.k); add("eatenP", e.p, true);
}
function pdDayLabel(k) {
  const d = keyToDate(k);
  return d ? fmtDay(d, { weekday: "long", day: "numeric", month: "long" }) : k;
}

function openPastDay(key) {
  if (!state.dailyLogs[key] || key === (state.today || logicalToday())) return;
  pdUI = { key, sel: null, amt: 0 };
  ["pdName", "pdKcal", "pdP", "pdC", "pdF"].forEach(id => { $(id).value = ""; });
  renderPastDay();
  openModal("pastFoodModal");
}

function renderPastDay() {
  const d = state.dailyLogs[pdUI.key];
  if (!d) { closeModal("pastFoodModal"); return; }
  $("pdDay").textContent = pdDayLabel(pdUI.key);
  const db = getFoodDB();
  const list = Array.isArray(d.added) ? d.added : [];
  $("pdList").innerHTML = list.length ? `<div class="n-label mb-1">${t("BU GÜNE EKLEDİKLERİN")}</div>` + list.map((e, i) => {
    const f = e.id && db[e.id];
    const name = f ? foodNameL(f) : String(e.n || "");
    const sub = e.id && e.a ? `${fmtNum(num(e.a))} ${unitL(num(e.a), f ? f.unit : (e.u || "g"))} · ` : t("tahmini · ");
    return `<div class="flex items-center gap-2 min-h-[48px] n-bb" data-pd-item="${i}">
        <div class="flex-1 min-w-0"><div class="text-[14px] font-semibold truncate">${esc(name)}</div><div class="text-[12px] n-muted tabular-nums">${esc(sub)}${fmtInt(num(e.k))} kcal · ${esc(t("{p} g protein", { p: String(Math.round(num(e.p))) }))}</div></div>
        <button onclick="pdRemove(${i})" class="w-11 h-11 shrink-0 rounded-full flex items-center justify-center n-over" aria-label="${esc(t("{ad} çıkar", { ad: name }))}">${svgI("x", 18, 2.2)}</button>
      </div>`;
  }).join("") : "";
  const sel = pdUI.sel && db[pdUI.sel];
  if (sel) {
    const m = calcItemMacros({ foodId: pdUI.sel, amount: pdUI.amt });
    $("pdSel").innerHTML = `<div class="n-elev rounded-2xl px-3.5 py-3 space-y-2.5" data-pd-sel>
        <div class="flex items-start justify-between gap-2"><div class="text-[15px] font-bold leading-snug min-w-0 break-words">${esc(foodNameL(sel))}</div>
          <button onclick="pdPickFood()" class="n-btn-ghost h-11 px-3 rounded-full text-[13px] shrink-0">${t("Değiştir")}</button></div>
        <div class="flex items-center gap-2">
          <input id="pdAmt" type="text" inputmode="decimal" value="${esc(fmtNum(pdUI.amt))}" oninput="pdAmtInput(this.value)" class="n-amt shrink-0" aria-label="${esc(t("{ad} miktarı", { ad: foodNameL(sel) }))}" />
          <span class="text-[13px] n-muted">${esc(unitL(2, sel.unit))}</span>
          <span id="pdSelK" class="ml-auto text-[14px] font-bold tabular-nums">${fmtInt(m.cal)} kcal · ${Math.round(m.p)} g P</span>
        </div>
        <button onclick="pdAddFood()" class="n-btn w-full h-12 rounded-full text-[15px]">${t("Bu güne ekle")}</button>
      </div>`;
  } else {
    $("pdSel").innerHTML = `<button onclick="pdPickFood()" class="n-btn-outline w-full h-12 rounded-full text-[14px] flex items-center justify-center gap-1.5">${svgI("search", 18)}${t("Besin seç")}</button>`;
  }
}

function pdPickFood() {
  const db = getFoodDB();
  const cats = {};
  Object.keys(db).forEach(id => {
    const f = db[id];
    if (isHiddenFood(f)) return;
    const cat = t(stripEmoji(f.cat || "Diğer"));
    (cats[cat] = cats[cat] || []).push({ id, label: foodNameL(f), sub: t("{n} {u} · {k} kcal", { n: fmtNum(f.def), u: unitL(f.def, f.unit), k: String(Math.round(kcalPerUnit(f) * num(f.def, 1))) }) });
  });
  const groups = Object.keys(cats).map(c => ({ label: c, short: c.replace(/\s*[&/].*$/, ""), items: cats[c] }));
  openPicker(t("Besin seç"), groups, it => {
    const f = getFoodDB()[it.id];
    if (!f) return;
    const last = state.foodAmts && Object.prototype.hasOwnProperty.call(state.foodAmts, it.id) ? num(state.foodAmts[it.id], 0) : 0;
    pdUI.sel = it.id;
    pdUI.amt = last > 0 ? last : round1(num(f.def, 1));
    renderPastDay();
  });
}
function pdAmtInput(v) {
  pdUI.amt = Math.max(0, num(v, 0));
  const m = calcItemMacros({ foodId: pdUI.sel, amount: pdUI.amt });
  if ($("pdSelK")) $("pdSelK").textContent = `${fmtInt(m.cal)} kcal · ${Math.round(m.p)} g P`;
}
function pdPush(e) {
  const d = state.dailyLogs[pdUI.key];
  if (!d) return;
  snapshot();
  if (!Array.isArray(d.added)) d.added = [];
  d.added.push(e);
  pdApply(d, e, 1);
  markPartDirty("dailyLogs");
  renderAll();
  renderPastDay();
  offerUndo(t("{ad}: {k} kcal eklendi ({gun})", { ad: e.id && getFoodDB()[e.id] ? foodNameL(getFoodDB()[e.id]) : e.n, k: fmtInt(e.k), gun: pdDayLabel(pdUI.key) }));
}
function pdAddFood() {
  const f = pdUI.sel && getFoodDB()[pdUI.sel];
  if (!f) return;
  const a = num(pdUI.amt, 0);
  if (!(a > 0) || a > 5000) { sayAlert(t("Miktar eksik"), t("Lütfen yediğin miktarı yaz.")); return; }
  const m = calcItemMacros({ foodId: pdUI.sel, amount: a });
  pdPush({ n: String(f.name || "").slice(0, 80), id: pdUI.sel, a: round1(a), k: Math.round(m.cal), p: round1(m.p), c: round1(m.c), f: round1(m.f) });
  pdUI.sel = null;
  renderPastDay();
}
function pdAddEst() {
  const kcal = num($("pdKcal").value, NaN), p = num($("pdP").value, NaN);
  if (!(kcal > 0) || kcal > 6000) { sayAlert(t("Kalori eksik"), t("Lütfen tahmini kaloriyi yaz (örn: 850).")); return; }
  if (!isFinite(p) || p < 0 || p * 4 > kcal * 1.2) { sayAlert(t("Protein eksik"), t("Lütfen tahmini proteini gram olarak yaz (bilmiyorsan 0 yazabilirsin). Protein, kaloriden fazla olamaz.")); return; }
  const cv = num($("pdC").value, NaN), fv = num($("pdF").value, NaN);
  if ((isFinite(cv) && cv < 0) || (isFinite(fv) && fv < 0)) { sayAlert(t("Değer hatalı"), t("Karb ve yağ negatif olamaz.")); return; }
  pdPush({ n: $("pdName").value.trim().slice(0, 50) || t("Tahmini öğün"), k: Math.round(kcal), p: round1(p), c: isFinite(cv) ? round1(cv) : 0, f: isFinite(fv) ? round1(fv) : 0 });
  ["pdName", "pdKcal", "pdP", "pdC", "pdF"].forEach(id => { $(id).value = ""; });
}
function pdRemove(i) {
  const d = state.dailyLogs[pdUI.key];
  if (!d || !Array.isArray(d.added) || !d.added[i]) return;
  snapshot();
  const e = d.added.splice(i, 1)[0];
  pdApply(d, e, -1);
  if (!d.added.length) delete d.added;
  markPartDirty("dailyLogs");
  renderAll();
  renderPastDay();
  offerUndo(t("Eklenen kayıt çıkarıldı"));
}
// Geçmiş kartındaki satır + düğme
function pdCardHtml(r) {
  if (r.live) return "";
  const list = Array.isArray(r.added) ? r.added : [];
  const s = pdSum(list);
  return `${list.length ? `<div class="text-[12px] n-muted" data-pd-note>${esc(tn(list.length, "Sonradan eklenen {n} kayıt · {k} kcal", { k: fmtInt(s.k) }))}</div>` : ""}
    <button onclick='openPastDay(${esc(JSON.stringify(r.key))})' data-pd-open="${esc(r.key)}" class="n-btn-ghost w-full h-11 rounded-full text-[13px] flex items-center justify-center gap-1.5">${svgI("plus", 16, 2.4)}${t("Yediğini ekle")}</button>`;
}
