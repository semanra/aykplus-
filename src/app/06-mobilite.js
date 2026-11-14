// ---------------------------------------------------------------------------
// MOBİLİTE (v27): bölge ızgarası + tek sıralı liste, hareket detayı, hareket ekle, nefes daireli sayaç.
// Görünüm durumu kaydedilmez (mobUI). Veri: state.mobilityRoutine.routines[].items (v39; bkz. normMobItem).
// ---------------------------------------------------------------------------
let mobUI = { view: "home", rid: null, edit: false, id: null, q: "", filter: "all" };
const MOB_REGION_LABEL = Object.fromEntries(MOB_REGIONS);
const MOB_TYPE_LABEL = Object.fromEntries(MOB_TYPES);
// v39: rutinler (state.mobilityRoutine.routines = [{ id, name, items }]); mobUI.rid = açık rutin
function mobRoutines() { return state.mobilityRoutine.routines; }
function mobAllItems() { return mobRoutines().flatMap(r => r.items); }
function mobRoutine(rid) { return mobRoutines().find(r => r.id === rid) || null; }
function mobNewRoutineId() { return "mr_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function mobItems() { const r = mobRoutine(mobUI.rid) || mobRoutines()[0]; return r ? r.items : []; }
function mobFind(id) { return mobItems().find(i => i.id === id) || null; }
function mobUpper(t) { return String(t).toLocaleUpperCase("tr-TR"); }
function mobArg(id) { return esc(JSON.stringify(String(id))); }
function mobNorm(t) { return String(t || "").toLocaleLowerCase("tr-TR").replace(/[’']/g, ""); }
// v39: nasıl yapılır (MOB_GUIDE, data.js). Anahtar karşılaştırması büyük/küçük harf ve kesme işaretinden bağımsız.
let _mobGuideIdx = null;
function mobGuide(name) {
  if (!_mobGuideIdx) { _mobGuideIdx = {}; Object.keys(MOB_GUIDE).forEach(k => { _mobGuideIdx[mobNorm(k).trim()] = MOB_GUIDE[k]; }); }
  return _mobGuideIdx[mobNorm(name).trim()] || null;
}
function mobGuideHtml(name, open = true, id = "") {
  const g = mobGuide(name); if (!g) return "";
  return `<div ${id ? `id="${id}"` : ""} class="m-guide">
    <div class="m-guide-h">Nasıl yapılır</div>
    ${open ? `<ol>${g.steps.map(x => `<li>${esc(x)}</li>`).join("")}</ol><p class="m-guide-w">Dikkat: ${esc(g.warn)}</p>` : ""}
  </div>`;
}
function mobSummary(it) {
  const amt = it.mode === "time" ? it.sec + " sn" : it.reps + " tekrar";
  return (it.sides === 2 ? "Sağ/sol · " : "") + it.sets + " set × " + amt;
}
// v39: rutinin içi. Düzenle kapalıyken: tik, tek hareket sayacı, dokununca detay. Düzenle açıkken: tutamaç (sürükle-bırak)
// ve çöp kutusu; tik ve sayaç yok.
function mobCardHtml(it, idx) {
  const id = mobArg(it.id), ed = mobUI.edit;
  const left = ed
    ? `<span class="drag-handle m-grip" data-mobidx="${idx}" role="img" aria-label="Sürükleyerek sırala">${svgI("grip", 18)}</span>`
    : `<button data-mob-check onclick="mobToggle(${id})" class="m-chk" aria-pressed="${it.done}" aria-label="${it.done ? "Yapıldı işaretini kaldır" : "Yapıldı olarak işaretle"}">${svgI("check", 20, 3)}</button>`;
  const right = ed
    ? `<button data-mob-del onclick="mobRemoveItem(${id})" class="m-del" aria-label="${esc(it.name)} hareketini kaldır">${svgI("trash", 19)}</button>`
    : it.mode === "time" ? `<button data-mob-timer onclick="mobTimerStart(${id})" class="m-tbtn" aria-label="${it.sec} saniyelik sayacı başlat">${svgI("clock", 18, 2.2)}<span>${it.sec} sn</span></button>` : "";
  return `<div data-mob-row="${esc(it.id)}" class="m-card ${!ed && it.done ? "done" : ""}">
    ${left}
    <button data-mob-open onclick="mobOpen(${id})" class="flex-1 min-w-0 min-h-[44px] text-left">
      <span class="m-kind ${it.type === "dynamic" ? "" : "s"}">${MOB_TYPE_LABEL[it.type]}</span>
      <span class="m-name block">${esc(it.name)}</span>
      <span class="m-rx block">${esc(mobSummary(it))}</span>
    </button>
    ${right}
  </div>`;
}
function mobRoutineHtml() {
  const r = mobRoutine(mobUI.rid), ed = mobUI.edit, items = r.items, id = mobArg(r.id);
  const head = ed
    ? `<div class="flex items-center gap-2.5">
        <input id="mobRName" data-fk="mob-rname" type="text" value="${esc(r.name)}" maxlength="40" aria-label="Rutinin adı" placeholder="Rutinin adı"
          onchange="mobRenameRoutine(this.value)" onkeydown="if(event.key==='Enter')this.blur()" class="m-in flex-1 min-w-0 !h-[52px] !text-[17px] font-semibold" />
        <button id="mobEditDone" onclick="mobEdit(false)" class="m-btn pri shrink-0">Bitti</button>
      </div>
      <p class="text-[12.5px] text-[var(--t-dim)] mt-2 mb-2.5 px-0.5">Sıralamak için tutamaçtan sürükle. Ayarlar için harekete dokun.</p>`
    : `<div class="flex items-center gap-2.5 mb-3">
        <button id="mobBackBtn" onclick="mobBack()" class="m-round" aria-label="Rutinlere dön">${svgI("chevL", 20, 2.2)}</button>
        <h3 id="mobListTitle" class="t-display text-[28px] leading-[1.02] text-[var(--t-text)] flex-1 min-w-0 uppercase break-words">${esc(r.name)}</h3>
        <button id="mobEditBtn" onclick="mobEdit(true)" class="m-pill shrink-0 flex items-center gap-1.5 !text-[var(--t-text)] !border-[var(--t-acc-text)]">${svgI("edit", 16)}Düzenle</button>
      </div>`;
  const list = items.map((it, i) => mobCardHtml(it, i)).join("")
    || `<div class="text-[14px] text-[var(--t-dim)] py-6 text-center">Bu rutinde hareket yok. ${ed ? "Aşağıdan" : "Düzenle'den"} hareket ekle.</div>`;
  const foot = ed
    ? `<button id="mobAddBtn" onclick="mobAddOpen()" class="m-btn pri w-full mt-3">${svgI("plus", 20, 2.4)}Hareket ekle</button>
      <div class="grid grid-cols-2 gap-2.5 mt-2.5">
        <button id="mobCopyRoutine" onclick="mobCopyRoutine()" class="m-btn ghost">${svgI("copy", 18)}Kopyala</button>
        <button id="mobResetBtn" onclick="mobReset()" class="m-btn ghost">${svgI("undo", 18)}Tikleri sıfırla</button>
      </div>
      <button id="mobDeleteRoutine" onclick="mobDeleteRoutine()" class="m-btn del w-full mt-2.5">${svgI("trash", 18)}Rutini sil</button>`
    : items.length ? `<div class="m-startbar"><button data-mob-start onclick="mobSesStart(${id})" class="m-btn pri w-full !min-h-[58px] !text-[17px]">${svgI("play", 18, 2.4)}Başlat · ${items.length} hareket · ~${mobRoutineMin(r)} dk</button></div>` : "";
  return `<div id="mobRoutine">${head}<div id="mobList" class="space-y-2">${list}</div>${foot}</div>`;
}
function mobEdit(on) { mobUI.edit = !!on; mobUI.view = "routine"; renderMobility(); }
function mobRenameRoutine(v) {
  const r = mobRoutine(mobUI.rid); if (!r) return;
  const n = String(v || "").trim().slice(0, 40);
  if (n && n !== r.name) { r.name = n; renderAll(); } else if (!n) renderMobility();
}
function mobRemoveItem(id) {
  const r = mobRoutine(mobUI.rid); if (!r) return;
  const i = r.items.findIndex(x => x.id === id); if (i < 0) return;
  if (mobT && mobT.id === id) mobTimerClose();
  snapshot();
  const [it] = r.items.splice(i, 1);
  mobUI.view = "routine"; mobUI.id = null;
  renderAll();
  offerUndo(`${it.name} kaldırıldı`);
}
function mobCopyRoutine() {
  const r = mobRoutine(mobUI.rid); if (!r) return;
  const c = { id: mobNewRoutineId(), name: (r.name + " (kopya)").slice(0, 40), items: r.items.map(x => ({ ...clone(x), id: mobNewId(), done: false })) };
  mobRoutines().splice(mobRoutines().indexOf(r) + 1, 0, c);
  mobUI.rid = c.id; mobUI.view = "routine"; mobUI.edit = true;
  window.scrollTo(0, 0);
  renderAll();
  toast("Rutin kopyalandı");
}
async function mobDeleteRoutine() {
  const r = mobRoutine(mobUI.rid); if (!r) return;
  if (!(await askConfirm("Rutin silinsin mi?", `${r.name} ve içindeki ${r.items.length} hareket silinecek.`, "Sil", true))) return;
  const i = mobRoutines().findIndex(x => x.id === r.id); if (i < 0) return;
  snapshot();
  mobRoutines().splice(i, 1);
  mobUI.view = "home"; mobUI.rid = null; mobUI.edit = false;
  window.scrollTo(0, 0);
  renderAll();
  offerUndo(`${r.name} silindi`);
}
function renderMobility() {
  const root = $("mobRoot");
  if (!root || state.activeTab !== "mobility") return;
  if (mobUI.view !== "home" && !mobRoutine(mobUI.rid)) { mobUI.view = "home"; mobUI.rid = null; mobUI.edit = false; }
  if (mobUI.view === "detail" && !mobFind(mobUI.id)) mobUI.view = "routine";
  root.innerHTML = mobUI.view === "detail" ? mobDetailHtml() : mobUI.view === "add" ? mobAddHtml() : mobUI.view === "routine" ? mobRoutineHtml() : mobHomeHtml();
  if (mobUI.view === "add") mobRenderAddList();
}
function mobToggle(id) { const it = mobFind(id); if (!it) return; it.done = !it.done; renderAll(); }
function mobReset() {
  if (!mobItems().some(i => i.done)) { toast("Tikli hareket yok"); return; }
  snapshot();
  mobItems().forEach(i => { i.done = false; });
  renderAll();
  offerUndo("Tikler sıfırlandı");
}
// --- v39: ANA EKRAN (bu hafta, rutin kartları, bölgeler · son çalışma) ---
const MOB_DAY_LABELS = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];
function mobTodayKey() { return todayStr(logicalNow()); }
function mobShiftKey(key, off) { const d = new Date(key + "T12:00:00"); d.setDate(d.getDate() + off); return todayStr(d); }
function mobDaysAgo(key) { return Math.round((new Date(mobTodayKey() + "T12:00:00") - new Date(key + "T12:00:00")) / DAY_MS); }
function mobItemSec(it) { return it.mode === "time" ? mobTotalSec(it) : mobRounds(it) * it.reps * 4; }
function mobRoutineMin(r) { return Math.max(1, Math.round(r.items.reduce((s, it) => s + mobItemSec(it), 0) / 60)); }
// Hareket yapılan günler: gece arşivi (mobilityLog) + bugün herhangi bir rutinde tik varsa bugün
function mobDoneDays() {
  const d = new Set();
  Object.keys(state.mobilityLog || {}).forEach(k => { if ((state.mobilityLog[k] || []).length) d.add(k); });
  if (mobAllItems().some(i => i.done)) d.add(mobTodayKey());
  return d;
}
// Bu hafta (Pt–Pz) yapılan günler, sayısı ve seri (bugün yapılmadıysa dünden geriye kesintisiz günler)
function mobWeekStats() {
  const done = mobDoneDays(), t = mobTodayKey();
  const dow = (new Date(t + "T12:00:00").getDay() + 6) % 7;
  const days = MOB_DAY_LABELS.map((_, i) => done.has(mobShiftKey(t, i - dow)));
  let k = done.has(t) ? t : mobShiftKey(t, -1), streak = 0;
  while (done.has(k)) { streak++; k = mobShiftKey(k, -1); }
  return { days, count: days.filter(Boolean).length, streak, dow };
}
// Ad → bölgeler: kütüphane, üzerine rutinlerdeki hareketler (ana + ikincil)
function mobNameRegions() {
  const m = {};
  Object.keys(MOB_LIB_REGIONS).forEach(n => { m[mobNorm(n)] = MOB_LIB_REGIONS[n]; });
  mobAllItems().forEach(it => { m[mobNorm(it.name)] = [it.region, it.region2].filter(Boolean); });
  return m;
}
// Bölge başına en son kaç gün önce çalışıldı (0 = bugün, null = hiç)
function mobRegionLast() {
  const out = {}, nr = mobNameRegions();
  MOB_REGIONS.forEach(([k]) => { out[k] = null; });
  const mark = (name, ago) => (nr[mobNorm(name)] || []).forEach(r => { if (r in out && (out[r] == null || ago < out[r])) out[r] = ago; });
  Object.keys(state.mobilityLog || {}).forEach(k => { const ago = mobDaysAgo(k); if (ago >= 0) (state.mobilityLog[k] || []).forEach(n => mark(n, ago)); });
  mobAllItems().filter(i => i.done).forEach(i => mark(i.name, 0));
  return out;
}
// Rutinin hareketlerinden biri en son kaç gün önce yapıldı (null = hiç)
function mobLastDone(r) {
  if (r.items.some(i => i.done)) return 0;
  const names = new Set(r.items.map(i => mobNorm(i.name)));
  let best = null;
  Object.keys(state.mobilityLog || {}).forEach(k => {
    const ago = mobDaysAgo(k);
    if (ago >= 0 && (best == null || ago < best) && (state.mobilityLog[k] || []).some(n => names.has(mobNorm(n)))) best = ago;
  });
  return best;
}
function mobAgoText(ago) { return ago === 0 ? "Bugün" : ago === 1 ? "Dün" : ago + " gün önce"; }
function mobRoutineCardHtml(r) {
  const id = mobArg(r.id), n = r.items.length, last = mobLastDone(r);
  const regs = [...new Set(r.items.map(i => i.region).filter(Boolean))].slice(0, 3);
  return `<div data-mob-routine="${esc(r.id)}" class="m-rt">
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0"><h3 class="m-rt-name t-display">${esc(r.name)}</h3>
        <div class="m-rt-meta">${n ? `${n} hareket · ~${mobRoutineMin(r)} dk` : "Henüz hareket yok"}</div></div>
      ${last == null ? "" : `<span class="m-rt-last ${last === 0 ? "on" : ""}">${mobAgoText(last)}${last <= 1 ? " yapıldı" : ""}</span>`}
    </div>
    ${regs.length ? `<div class="flex flex-wrap gap-1.5 mt-2.5">${regs.map(k => `<span class="m-tag">${esc(MOB_REGION_LABEL[k])}</span>`).join("")}</div>` : ""}
    <div class="grid ${n ? "grid-cols-[1fr_auto]" : "grid-cols-1"} gap-2.5 mt-3.5">
      ${n ? `<button data-mob-start onclick="mobSesStart(${id})" class="m-btn pri">${svgI("play", 18, 2.4)}Başlat</button>` : ""}
      <button data-mob-openr onclick="mobOpenRoutine(${id})" class="m-btn ghost">${n ? "Aç" : "Aç ve hareket ekle"}</button>
    </div>
  </div>`;
}
function mobHomeHtml() {
  const w = mobWeekStats(), last = mobRegionLast();
  const regs = MOB_REGIONS.map(([k, label]) => {
    const a = last[k], warn = a != null && a >= 7;
    const txt = a == null ? "Henüz yok" : warn ? a + " gündür yok" : mobAgoText(a);
    return `<div data-mob-reg="${k}" class="m-rg ${a === 0 ? "ok" : ""} ${warn ? "warn" : ""}"><b class="t-display">${mobUpper(label)}</b><span>${txt}</span></div>`;
  }).join("");
  return `<div id="mobHome">
    <div class="grid grid-cols-2 gap-2">
      <div class="m-wk"><b class="t-display">${w.count}</b><span>gün bu hafta</span></div>
      <div class="m-wk"><b class="t-display">${w.streak}</b><span>gün üst üste</span></div>
    </div>
    <div class="m-days" aria-label="Bu hafta mobilite yapılan günler">${MOB_DAY_LABELS.map((l, i) =>
      `<i class="${w.days[i] ? "d" : ""} ${i === w.dow ? "t" : ""}" aria-label="${l}${w.days[i] ? " yapıldı" : ""}">${l}</i>`).join("")}</div>
    <div class="m-lbl">Rutinlerin</div>
    <div class="space-y-2.5">${mobRoutines().map(mobRoutineCardHtml).join("")}</div>
    <button id="mobNewRoutine" onclick="mobNewRoutine()" class="m-btn ghost w-full mt-2.5 !border-dashed">${svgI("plus", 18, 2.4)}Yeni rutin</button>
    <div class="m-lbl">Bölgeler · son çalışma</div>
    <div class="grid grid-cols-3 gap-2">${regs}</div>
  </div>`;
}
function mobOpenRoutine(rid) { if (!mobRoutine(rid)) return; mobUI.view = "routine"; mobUI.rid = rid; mobUI.edit = false; window.scrollTo(0, 0); renderMobility(); }
async function mobNewRoutine() {
  const v = await askText("Yeni rutin", "", "Örn. Sabah rutini", "", "Oluştur");
  if (v == null || !String(v).trim()) return;
  const r = { id: mobNewRoutineId(), name: String(v).trim().slice(0, 40), items: [] };
  mobRoutines().push(r);
  mobUI.view = "routine"; mobUI.rid = r.id; mobUI.edit = true;
  window.scrollTo(0, 0);
  renderAll();
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
    ${mobGuideHtml(it.name, true, "mobDtGuide")}
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
function mobOpen(id) {
  const r = mobRoutines().find(x => x.items.some(i => i.id === id)); if (!r) return;
  mobUI.rid = r.id; mobUI.view = "detail"; mobUI.id = id; window.scrollTo(0, 0); renderMobility();
}
// Detay/ekle → rutinin içi; rutinin içi → ana ekran
function mobBack() {
  if (mobUI.view === "routine" && !mobUI.edit) { mobUI.view = "home"; mobUI.rid = null; }
  else mobUI.view = "routine";
  mobUI.id = null; window.scrollTo(0, 0); renderMobility();
}
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
function mobRemove(id) { mobRemoveItem(id); }
// --- Hareket ekle (kütüphane; arama yazılırken yalnızca liste kısmı yeniden çizilir, klavye kapanmaz) ---
function mobLibAll() {
  const out = [];
  Object.keys(MOBILITY_LIBRARY).forEach((cat, ci) => MOBILITY_LIBRARY[cat].forEach((m, i) => {
    const reg = MOB_LIB_REGIONS[m.name] || [];
    out.push({ key: ci + "_" + i, m, type: MOB_TYPES[Math.min(ci, 2)][0], region: reg[0] || "" });
  }));
  return out;
}

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
  const order = [...MOB_REGION_KEYS, ""];
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
  const it = normMobItem({ name: String(v).trim(), type, region: "", sets: dyn ? 1 : 2, mode: dyn ? "reps" : "time", reps: 10, sec: 30, sides: 1 });
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

