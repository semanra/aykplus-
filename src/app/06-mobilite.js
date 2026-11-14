// ---------------------------------------------------------------------------
// MOBİLİTE (v27): bölge ızgarası + tek sıralı liste, hareket detayı, hareket ekle, nefes daireli sayaç.
// Görünüm durumu kaydedilmez (mobUI). Veri: state.mobilityRoutine.items (bkz. normMobItem).
// ---------------------------------------------------------------------------
let mobUI = { view: "list", region: "", id: null, q: "", filter: "all" };
const MOB_REGION_LABEL = Object.fromEntries(MOB_REGIONS);
const MOB_TYPE_LABEL = Object.fromEntries(MOB_TYPES);
function mobItems() { return state.mobilityRoutine.items; }
function mobFind(id) { return mobItems().find(i => i.id === id) || null; }
function mobUpper(t) { return String(t).toLocaleUpperCase("tr-TR"); }
function mobArg(id) { return esc(JSON.stringify(String(id))); }
function mobSummary(it) {
  const amt = it.mode === "time" ? it.sec + " sn" : it.reps + " tekrar";
  return (it.sides === 2 ? "Sağ/sol · " : "") + it.sets + " set × " + amt;
}
// Ana bölge 1 puan, ikincil 0,5 puan; "x / y" sayısı yalnızca ana bölgesi o bölge olanları sayar.
function mobRegionStats() {
  const st = {};
  MOB_REGIONS.forEach(([k]) => { st[k] = { n: 0, nDone: 0, pts: 0, ptsDone: 0 }; });
  mobItems().forEach(it => {
    const a = st[it.region], b = st[it.region2];
    if (a) { a.n++; a.pts += 1; if (it.done) { a.nDone++; a.ptsDone += 1; } }
    if (b) { b.pts += 0.5; if (it.done) b.ptsDone += 0.5; }
  });
  return st;
}
function mobVisible() {
  const all = mobItems();
  if (!mobUI.region) return all.map(it => ({ it, sec: false }));
  return [...all.filter(i => i.region === mobUI.region).map(it => ({ it, sec: false })),
    ...all.filter(i => i.region2 === mobUI.region).map(it => ({ it, sec: true }))];
}
function mobCardHtml({ it, sec }, idx, drag) {
  const id = mobArg(it.id);
  const timeBtn = it.mode === "time"
    ? `<button data-mob-timer onclick="mobTimerStart(${id})" class="m-tbtn" aria-label="${it.sec} saniyelik sayacı başlat">${svgI("clock", 18, 2.2)}<span>${it.sec} sn</span></button>` : "";
  return `<div data-mob-row="${esc(it.id)}" class="m-card ${it.done ? "done" : ""}">
    <button data-mob-check onclick="mobToggle(${id})" class="m-chk" aria-pressed="${it.done}" aria-label="${it.done ? "Yapıldı işaretini kaldır" : "Yapıldı olarak işaretle"}">${svgI("check", 20, 3)}</button>
    <button data-mob-open onclick="mobOpen(${id})" class="flex-1 min-w-0 min-h-[44px] text-left">
      <span class="m-kind ${it.type === "dynamic" ? "" : "s"}">${MOB_TYPE_LABEL[it.type]}${sec ? " · ikincil" : ""}</span>
      <span class="m-name block">${esc(it.name)}</span>
      <span class="m-rx block">${esc(mobSummary(it))}</span>
    </button>
    ${timeBtn}
    ${drag ? `<span class="drag-handle m-grip" data-mobidx="${idx}" role="img" aria-label="Sürükleyerek sırala">${svgI("grip", 18)}</span>` : ""}
  </div>`;
}
function mobListHtml() {
  const stats = mobRegionStats();
  const all = mobItems();
  const regs = MOB_REGIONS.map(([k, label]) => {
    const r = stats[k];
    const pct = r.pts ? Math.round(r.ptsDone / r.pts * 100) : 0;
    const full = r.n > 0 && r.nDone === r.n;
    const txt = r.n === 0 ? "—" : full ? "Tamam" : `${r.nDone} / ${r.n}`;
    return `<button data-mob-region="${k}" onclick="mobRegion('${k}')" class="m-reg ${mobUI.region === k ? "on" : ""} ${full ? "full" : ""}" aria-pressed="${mobUI.region === k}">
      <div data-mob-lvl data-pct="${pct}" class="m-lvl ${pct ? "" : "zero"}" style="height:${pct ? `calc(30px + (100% - 30px) * ${pct / 100})` : "0"}"></div>
      <b class="t-display">${mobUpper(label)}</b><span>${txt}</span></button>`;
  }).join("");
  const vis = mobVisible();
  const drag = !mobUI.region && vis.length > 1;
  const title = mobUI.region ? MOB_REGION_LABEL[mobUI.region] : "Rutin";
  const empty = mobUI.region ? "Bu bölgede hareket yok. Aşağıdan ekleyebilirsin." : "Rutin boş. Aşağıdan hareket ekle.";
  return `<div class="m-regs">${regs}</div>
    <div class="flex items-center justify-between gap-2 mt-4 mb-2.5 px-0.5">
      <h3 id="mobListTitle" class="t-display text-[22px] text-[var(--t-text)] truncate">${mobUpper(title)}</h3>
      <button id="mobAllBtn" onclick="mobRegion('')" class="m-pill shrink-0 ${mobUI.region ? "" : "!text-[var(--t-text)] !border-[var(--t-acc-text)]"}">Tümü (${all.filter(i => i.done).length} / ${all.length})</button>
    </div>
    <div id="mobList" class="space-y-2">${vis.map((v, i) => mobCardHtml(v, i, drag)).join("") || `<div class="text-[14px] text-[var(--t-dim)] py-6 text-center">${empty}</div>`}</div>
    <div class="grid grid-cols-[1fr_auto] gap-2.5 mt-3">
      <button id="mobAddBtn" onclick="mobAddOpen()" class="m-btn pri">${svgI("plus", 20, 2.4)}Hareket ekle</button>
      <button id="mobResetBtn" onclick="mobReset()" class="m-btn ghost" aria-label="Tikleri sıfırla">${svgI("undo", 19)}Sıfırla</button>
    </div>`;
}
function renderMobility() {
  const root = $("mobRoot");
  if (!root || state.activeTab !== "mobility") return;
  if (mobUI.view === "detail" && !mobFind(mobUI.id)) mobUI.view = "list";
  root.innerHTML = mobUI.view === "detail" ? mobDetailHtml() : mobUI.view === "add" ? mobAddHtml() : mobListHtml();
  if (mobUI.view === "add") mobRenderAddList();
}
function mobRegion(k) { mobUI.region = mobUI.region === k ? "" : k; renderMobility(); }
function mobToggle(id) { const it = mobFind(id); if (!it) return; it.done = !it.done; renderAll(); }
function mobReset() {
  if (!mobItems().some(i => i.done)) { toast("Tikli hareket yok"); return; }
  snapshot();
  mobItems().forEach(i => { i.done = false; });
  renderAll();
  offerUndo("Tikler sıfırlandı");
}
// --- Hareket detayı (anında kayıt) ---
const MOB_SWITCH_SEC = 5;   // turlar arası "taraf değiştir" arası
function mobRounds(it) { return it.sets * it.sides; }
function mobTotalSec(it) { const r = mobRounds(it); return r * it.sec + (r - 1) * MOB_SWITCH_SEC; }
function mobPreviewHtml(it) {
  if (it.mode === "reps") return `Her sette <b>${it.reps} tekrar</b>${it.sides === 2 ? " (her taraf)" : ""}. Sayaç yok; yapınca tikle.`;
  const tot = `Toplam ≈ ${Math.max(1, Math.round(mobTotalSec(it) / 60))} dk.`;
  return it.sides === 2
    ? `Sayaçta: <b>sağ ${it.sec} sn → sol ${it.sec} sn</b>, ${it.sets} tur. ${tot}`
    : `Sayaçta: <b>${it.sets} × ${it.sec} sn</b>. ${tot}`;
}
function mobDetailHtml() {
  const it = mobFind(mobUI.id);
  const idx = mobItems().indexOf(it);
  const id = mobArg(it.id);
  const crumb = (MOB_REGION_LABEL[it.region] || "Bölgesiz") + " · " + (idx + 1) + ". hareket";
  const time = it.mode === "time";
  const stepper = (label, field, val, valId, minD, maxD) => `<div class="m-st"><div class="k">${label}</div><div class="v">
      <button class="m-pm" data-mob-step="${field}:-1" onclick="mobStep(${id}, '${field}', -1)" ${minD ? "disabled" : ""} aria-label="${label} azalt">${svgI("minus", 18, 2.6)}</button>
      <b id="${valId}" class="t-display">${val}</b>
      <button class="m-pm" data-mob-step="${field}:1" onclick="mobStep(${id}, '${field}', 1)" ${maxD ? "disabled" : ""} aria-label="${label} artır">${svgI("plus", 18, 2.6)}</button></div></div>`;
  const seg = (attr, field, opts, cur) => `<div class="m-seg" style="grid-template-columns:repeat(${opts.length},minmax(0,1fr))">${opts.map(([k, l]) =>
    `<button data-mob-${attr}="${k}" onclick="mobSet(${id}, '${field}', '${k}')" class="${String(cur) === String(k) ? "on" : ""}" aria-pressed="${String(cur) === String(k)}">${l}</button>`).join("")}</div>`;
  const chips = (attr, field, opts, cur) => `<div class="flex flex-wrap gap-2">${opts.map(([k, l]) =>
    `<button data-mob-${attr}="${k}" onclick="mobSet(${id}, '${field}', '${k}')" class="m-chip ${cur === k ? "on" : ""}" aria-pressed="${cur === k}">${l}</button>`).join("")}</div>`;
  const vMin = time ? it.sec <= 5 : it.reps <= 1, vMax = time ? it.sec >= 600 : it.reps >= 100;
  return `<div id="mobDetail">
    <div class="flex items-center justify-between gap-2 -mx-1">
      <button id="mobDtBack" onclick="mobBack()" class="m-round" aria-label="Geri">${svgI("chevL", 20, 2.2)}</button>
      <span id="mobDtCrumb" class="text-[15px] text-[var(--t-muted)] truncate">${esc(crumb)}</span>
      <span class="w-11 shrink-0"></span>
    </div>
    <button id="mobDtTitle" onclick="mobRename(${id})" class="t-display text-[32px] leading-[1.02] text-[var(--t-text)] text-left mt-3 min-h-[44px] w-full break-words" aria-label="Adı değiştir">${esc(it.name)}</button>
    <div class="text-[13px] font-semibold ${it.type === "dynamic" ? "text-[var(--t-dim)]" : "text-[var(--t-acc-text)]"} mt-1">${MOB_TYPE_LABEL[it.type]}</div>
    ${it.rxOk ? "" : `<div id="mobDtRx" class="mt-3 text-[13.5px] text-[var(--t-warn-text)] bg-[var(--t-elev)] rounded-2xl px-3.5 py-2.5">Eski yazım: ${esc(it.rx)}<br><span class="text-[var(--t-muted)]">Okunamadı; değerleri kontrol et.</span></div>`}
    <div class="m-lbl">Uygulama</div>
    ${seg("mode", "mode", [["reps", "Tekrar"], ["time", "Süre"]], it.mode)}
    <div class="grid grid-cols-2 gap-2.5 mt-2.5">
      ${stepper("Set", "sets", it.sets, "mobDtSets", it.sets <= 1, it.sets >= 10)}
      ${stepper(time ? "Süre (sn)" : "Tekrar", "val", time ? it.sec : it.reps, "mobDtVal", vMin, vMax)}
    </div>
    <div class="m-lbl">Taraf</div>
    ${seg("sides", "sides", [[1, "Tek"], [2, "Sağ ve sol"]], it.sides)}
    <div id="mobDtPreview" class="m-preview">${mobPreviewHtml(it)}</div>
    <div class="m-lbl">Tür</div>
    ${seg("type", "type", MOB_TYPES, it.type)}
    <div class="m-lbl">Ana bölge</div>
    ${chips("r1", "region", MOB_REGIONS, it.region)}
    <div class="m-lbl">İkincil bölge <span class="font-normal text-[var(--t-dim)]">(isteğe bağlı, yarım sayılır)</span></div>
    ${chips("r2", "region2", [["", "Yok"], ...MOB_REGIONS.filter(r => r[0] !== it.region)], it.region2)}
    <div class="m-lbl">Not</div>
    <textarea id="mobDtNote" data-fk="mob-note" rows="2" class="m-in" placeholder="Not ekle…" onchange="mobSet(${id}, 'note', this.value)">${esc(it.note)}</textarea>
    <div class="grid grid-cols-[1fr_1.6fr] gap-2.5 mt-5">
      <button id="mobDtRemove" onclick="mobRemove(${id})" class="m-btn del">${svgI("trash", 19)}Kaldır</button>
      ${time
        ? `<button id="mobDtStart" onclick="mobTimerStart(${id})" class="m-btn pri">${svgI("clock", 20, 2.2)}Sayacı başlat</button>`
        : `<button id="mobDtDone" onclick="mobToggle(${id})" class="m-btn ${it.done ? "ghost" : "pri"}">${svgI("check", 20, 2.6)}${it.done ? "Yapıldı (geri al)" : "Yapıldı"}</button>`}
    </div>
  </div>`;
}
function mobOpen(id) { if (!mobFind(id)) return; mobUI.view = "detail"; mobUI.id = id; window.scrollTo(0, 0); renderMobility(); }
function mobBack() { mobUI.view = "list"; mobUI.id = null; window.scrollTo(0, 0); renderMobility(); }
function mobStep(id, field, d) {
  const it = mobFind(id); if (!it) return;
  if (field === "sets") it.sets = Math.min(10, Math.max(1, it.sets + d));
  else if (it.mode === "time") it.sec = Math.min(600, Math.max(5, it.sec + d * 5));
  else it.reps = Math.min(100, Math.max(1, it.reps + d));
  renderAll();
}
function mobSet(id, field, val) {
  const it = mobFind(id); if (!it) return;
  if (field === "mode") it.mode = val === "reps" ? "reps" : "time";
  else if (field === "sides") it.sides = num(val, 1) === 2 ? 2 : 1;
  else if (field === "type") { if (MOB_TYPE_LABEL[val]) it.type = val; }
  else if (field === "region") { if (MOB_REGION_LABEL[val]) { it.region = val; if (it.region2 === val) it.region2 = ""; } }
  else if (field === "region2") it.region2 = MOB_REGION_LABEL[val] && val !== it.region ? val : "";
  else if (field === "note") it.note = String(val || "").slice(0, 300);
  else return;
  renderAll();
}
async function mobRename(id) {
  const it = mobFind(id); if (!it) return;
  const v = await askText("Hareketin adı", it.name, "Örn. Couch Stretch");
  if (v == null || !String(v).trim()) return;
  const cur = mobFind(id); if (!cur) return;
  cur.name = String(v).trim().slice(0, 80);
  renderAll();
}
function mobRemove(id) {
  const i = mobItems().findIndex(x => x.id === id);
  if (i < 0) return;
  if (typeof mobT !== "undefined" && mobT && mobT.id === id) mobTimerClose();
  snapshot();
  const [it] = mobItems().splice(i, 1);
  mobUI.view = "list"; mobUI.id = null;
  window.scrollTo(0, 0);
  renderAll();
  offerUndo(`${it.name} kaldırıldı`);
}
// --- Hareket ekle (kütüphane; arama yazılırken yalnızca liste kısmı yeniden çizilir, klavye kapanmaz) ---
function mobLibAll() {
  const out = [];
  Object.keys(MOBILITY_LIBRARY).forEach((cat, ci) => MOBILITY_LIBRARY[cat].forEach((m, i) => {
    const reg = MOB_LIB_REGIONS[m.name] || [];
    out.push({ key: ci + "_" + i, m, type: MOB_TYPES[Math.min(ci, 2)][0], region: reg[0] || "" });
  }));
  return out;
}
function mobNorm(t) { return String(t || "").toLocaleLowerCase("tr-TR").replace(/[’']/g, ""); }
function mobAddHtml() {
  const f = mobUI.filter;
  return `<div id="mobAdd">
    <div class="flex items-center justify-between gap-2">
      <h3 class="t-display text-[30px] text-[var(--t-text)]">HAREKET EKLE</h3>
      <button id="mobAddClose" onclick="mobBack()" class="m-round" aria-label="Kapat">${svgI("x", 20, 2.2)}</button>
    </div>
    <label class="flex items-center gap-2.5 h-[50px] rounded-2xl bg-[var(--t-surface)] px-3.5 mt-3 text-[var(--t-dim)]">${svgI("search", 20)}
      <input id="mobSearch" type="search" value="${esc(mobUI.q)}" placeholder="Hareket ara" autocomplete="off" oninput="mobAddSearch(this.value)" class="t-search flex-1 min-w-0 h-full !text-[16px]" /></label>
    <div class="flex gap-2 mt-3 overflow-x-auto no-scrollbar -mx-4 px-4">${[["all", "Tümü"], ...MOB_TYPES].map(([k, l]) =>
      `<button data-mob-filter="${k}" onclick="mobAddFilter('${k}')" class="m-chip ${f === k ? "on" : ""}" aria-pressed="${f === k}">${l}</button>`).join("")}</div>
    <div id="mobAddList"></div>
    <button id="mobAddCustom" onclick="mobAddCustom()" class="m-btn w-full mt-4">${svgI("edit", 19)}Listede yok mu? Elle ekle</button>
  </div>`;
}
function mobRenderAddList() {
  const box = $("mobAddList"); if (!box) return;
  const q = mobNorm(mobUI.q).trim().split(/\s+/).filter(Boolean);
  const inRoutine = new Set(mobItems().map(i => i.name));
  const list = mobLibAll().filter(x => (mobUI.filter === "all" || x.type === mobUI.filter)
    && q.every(w => mobNorm(x.m.name + " " + x.m.note).includes(w)));
  const order = [...(mobUI.region ? [mobUI.region] : []), ...MOB_REGION_KEYS.filter(k => k !== mobUI.region), ""];
  box.innerHTML = order.map(rk => {
    const rows = list.filter(x => x.region === rk);
    if (!rows.length) return "";
    return `<div data-mob-group class="text-[13px] font-semibold text-[var(--t-muted)] mt-4 mb-2 px-0.5">${esc(MOB_REGION_LABEL[rk] || "Bölgesiz")}</div>
      <div class="space-y-2">${rows.map(x => {
        const sum = mobSummary(normMobItem(mobFromLegacy({ name: x.m.name, prescription: x.m.prescription }, x.type)));
        const has = inRoutine.has(x.m.name);
        return `<div data-mob-lib="${x.key}" class="m-card">
          <div class="flex-1 min-w-0"><span class="m-kind ${x.type === "dynamic" ? "" : "s"}">${MOB_TYPE_LABEL[x.type]}${has ? ` · <span class="text-[var(--t-text)]">Rutinde</span>` : ""}</span>
            <span class="m-name block">${esc(x.m.name)}</span><span class="m-rx block">${esc(sum)}</span></div>
          <button data-mob-add onclick="mobAddLib('${x.key}')" class="m-add mr-1.5 ${has ? "in" : ""}" aria-label="${esc(x.m.name)} ${has ? "zaten rutinde, yine de ekle" : "ekle"}">${svgI(has ? "check" : "plus", 20, 2.6)}</button>
        </div>`;
      }).join("")}</div>`;
  }).join("") || `<div class="text-[14px] text-[var(--t-dim)] py-6 text-center">Hareket bulunamadı. Aşağıdan elle ekleyebilirsin.</div>`;
}
function mobAddOpen() { mobUI.view = "add"; mobUI.q = ""; window.scrollTo(0, 0); renderMobility(); }
function mobAddSearch(v) { mobUI.q = String(v || ""); mobRenderAddList(); }
function mobAddFilter(k) { mobUI.filter = k; mobRenderAddList(); document.querySelectorAll("[data-mob-filter]").forEach(b => { const on = b.dataset.mobFilter === k; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); }); }
async function mobAddLib(key) {
  const x = mobLibAll().find(e => e.key === key); if (!x) return;
  // v28: rutinde zaten varsa yanlışlıkla ikinci kez eklenmesin
  if (mobItems().some(i => i.name === x.m.name)
    && !(await askConfirm("Zaten rutinde", x.m.name + " rutininde var. Bir kez daha eklensin mi?", "Yine de ekle"))) return;
  const it = normMobItem(mobFromLegacy({ name: x.m.name, prescription: x.m.prescription, note: x.m.note }, x.type));
  mobItems().push(it);
  renderAll();
  toast(it.name + " eklendi");
}
async function mobAddCustom() {
  const v = await askText("Hareketin adı", "", "Örn. Duvarda göğüs esnetme");
  if (v == null || !String(v).trim()) return;
  const type = mobUI.filter === "all" ? "static" : mobUI.filter;
  const dyn = type === "dynamic";
  const it = normMobItem({ name: String(v).trim(), type, region: mobUI.region || "", sets: dyn ? 1 : 2, mode: dyn ? "reps" : "time", reps: 10, sec: 30, sides: 1 });
  mobItems().push(it);
  mobUI.view = "detail"; mobUI.id = it.id;
  window.scrollTo(0, 0);
  renderAll();
}
// --- Sayaç (tam ekran, nefes dairesi). Bitiş zamanına göre çalışır; arka plandan dönünce kaçırılan aşamalar ilerletilir.
// Akış: tur → ses → 5 sn ara → sonraki tur; son tur bitince hareket tiklenir. iOS: uygulama kapalıyken/sessizde ses yok.
let mobT = null;
function mobFmt(sec) { sec = Math.max(0, Math.ceil(sec)); return Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0"); }
function mobBeep() { if (state.settings.mobSound !== false) beep(true); }
function mobTimerStart(id) {
  const it = mobFind(id);
  if (!it || it.mode !== "time") return;
  unlockAudio();
  if (mobT) clearInterval(mobT.iv);
  const rounds = [];
  for (let s = 1; s <= it.sets; s++) (it.sides === 2 ? ["Sağ", "Sol"] : [null]).forEach(side => rounds.push({ side, set: s }));
  const now = Date.now();
  mobT = { id: it.id, name: it.name, region: MOB_REGION_LABEL[it.region] || "", sec: it.sec, sets: it.sets, rounds, idx: 0, phase: "work", endAt: now + it.sec * 1000, t0: now, iv: 0, quiet: false };
  mobT.iv = setInterval(mobTimerTick, 250);
  const m = $("mobTimer"); m.classList.remove("hidden"); m.classList.add("flex");
  document.body.classList.add("pf-open");
  mobTimerRender();
  updateWakeLock();
}
function mobTimerTick() {
  if (!mobT) return;
  let changed = false;
  while (mobT && Date.now() >= mobT.endAt) {
    const late = Date.now() - mobT.endAt;
    if (mobT.phase === "work") {
      if (!mobT.quiet && late < 2000) mobBeep();
      if (mobT.idx >= mobT.rounds.length - 1) { mobTimerFinish(); return; }
      mobT.phase = "switch"; mobT.endAt += MOB_SWITCH_SEC * 1000;
    } else {
      mobT.idx++; mobT.phase = "work"; mobT.endAt += mobT.sec * 1000;
    }
    mobT.quiet = false;
    changed = true;
  }
  if (changed) mobTimerRender(); else mobTimerUpdate();
}
function mobTimerFinish() {
  const id = mobT.id, name = mobT.name;
  mobTimerClose();
  const it = mobFind(id);
  if (it) it.done = true;
  renderAll();
  toast(name + " tamamlandı");
}
function mobTimerClose() {
  if (mobT) clearInterval(mobT.iv);
  mobT = null;
  const m = $("mobTimer"); m.classList.add("hidden"); m.classList.remove("flex"); m.innerHTML = "";
  document.body.classList.remove("pf-open");
  updateWakeLock();
}
function mobTimerAdjust(d) { if (!mobT) return; mobT.endAt += d * 1000; if (mobT.endAt <= Date.now()) mobT.quiet = true; mobTimerTick(); }
function mobTimerSkip() { if (!mobT) return; mobT.endAt = Date.now(); mobT.quiet = true; mobTimerTick(); }
function mobTimerSound() { state.settings.mobSound = state.settings.mobSound === false; saveState(); mobTimerRender(); }
function mobBreathLabel() { return ((Date.now() - mobT.t0) % 10000) < 4000 ? "Nefes al" : "Nefes ver"; }
function mobTimerUpdate() {
  if (!mobT) return;
  const t = $("mobTTime"); if (t) t.textContent = mobFmt((mobT.endAt - Date.now()) / 1000);
  const b = $("mobTBreath"); if (b && mobT.phase === "work") b.textContent = mobBreathLabel();
}
function mobTimerRender() {
  if (!mobT) return;
  const T = mobT, r = T.rounds[T.idx], work = T.phase === "work";
  const next = T.rounds[T.idx + 1];
  const sub = work
    ? (r.side ? `${r.side} taraf · ${r.set}. tur / ${T.sets}` : `Set ${r.set} / ${T.sets}`)
    : (next && next.side === "Sol" ? "Sola geç" : next && next.side === "Sağ" ? "Sağa geç" : "Sıradaki set") + ` · ${next ? (next.side ? next.side + " " + next.set : "Set " + next.set) : ""}`;
  const snd = state.settings.mobSound !== false;
  const boxes = T.rounds.map((x, i) => {
    const cls = i < T.idx || (i === T.idx && !work) ? "d" : i === T.idx ? "n" : "";
    return `<i class="${cls}">${x.side ? x.side + " " + x.set : "Set " + x.set}</i>`;
  }).join("");
  $("mobTimer").innerHTML = `
    <div class="w-full max-w-lg flex items-center justify-between pt-3">
      <button id="mobTClose" onclick="mobTimerClose()" class="m-round" aria-label="Sayacı kapat">${svgI("x", 20, 2.2)}</button>
      <span id="mobTRegion" class="text-[15px] text-[var(--t-muted)]">${esc(T.region)}</span>
      <button id="mobTSound" onclick="mobTimerSound()" class="m-round" aria-label="${snd ? "Sesi kapat" : "Sesi aç"}">${svgI(snd ? "vol" : "volOff", 20)}</button>
    </div>
    <div class="text-center mt-4 px-2 w-full max-w-lg">
      <h3 id="mobTTitle" class="t-display text-[30px] leading-[1.05]">${esc(T.name)}</h3>
      <p id="mobTSub" class="text-[15px] ${work ? "text-[var(--t-muted)]" : "text-[var(--t-acc-text)] font-semibold"} mt-1.5">${sub}</p>
    </div>
    <div id="mobTCircle" class="m-breath mt-4 ${work ? "" : "pause"}">
      <span class="o o1"></span><span class="o o2"></span>
      <div class="core" style="animation-delay:-${(Date.now() - T.t0) % 10000}ms"><b id="mobTTime" class="t-display">${mobFmt((T.endAt - Date.now()) / 1000)}</b><span id="mobTBreath">${work ? mobBreathLabel() : "Hazırlan"}</span></div>
    </div>
    <div class="text-[13.5px] text-[var(--t-dim)] mt-1 text-center">${work ? "4 sn al, 6 sn ver. Her verişte biraz daha derine." : "Sıradaki tur birazdan kendiliğinden başlar."}</div>
    <div class="w-full max-w-lg mt-auto pt-5">
      <div class="grid grid-cols-[1fr_1fr_1.3fr] gap-2.5">
        <button id="mobTMinus" onclick="mobTimerAdjust(-15)" class="h-[60px] rounded-[18px] bg-[var(--t-elev)] text-[17px] font-bold">−15</button>
        <button id="mobTPlus" onclick="mobTimerAdjust(15)" class="h-[60px] rounded-[18px] bg-[var(--t-elev)] text-[17px] font-bold">+15</button>
        <button id="mobTSkip" onclick="mobTimerSkip()" class="h-[60px] rounded-[18px] bg-[var(--t-text)] text-[var(--t-bg)] text-[17px] font-bold">Atla</button>
      </div>
      <div id="mobTRounds" class="m-rounds mt-3">${boxes}</div>
    </div>`;
}

