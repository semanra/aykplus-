// ---------------------------------------------------------------------------
// MOBİLİTE (v27): bölge ızgarası + tek sıralı liste, hareket detayı, hareket ekle, nefes daireli sayaç.
// Görünüm durumu kaydedilmez (mobUI). Veri: state.mobilityRoutine.routines[].items (v39; bkz. normMobItem).
// ---------------------------------------------------------------------------
let mobUI = { view: "home", rid: null, edit: false, id: null, q: "", filter: "all" };
const MOB_REGION_LABEL = Object.fromEntries(MOB_REGIONS);
const MOB_TYPE_LABEL = Object.fromEntries(MOB_TYPES);
// v49: gösterim yardımcıları. Kayıtta Türkçe anahtar/değer kalır; yalnızca ekrana basarken çevrilir (t() çağrı anında çalışır).
function mobRegionL(key) { return MOB_REGION_LABEL[key] ? t(MOB_REGION_LABEL[key]) : ""; }
function mobTypeL(key) { return MOB_TYPE_LABEL[key] ? t(MOB_TYPE_LABEL[key]) : ""; }
function mobSideL(side) { return side ? t(side) : ""; }   // side kayıtta "Sağ" | "Sol" (karşılaştırmalar Türkçe değerle yapılır)
// v39: rutinler (state.mobilityRoutine.routines = [{ id, name, items }]); mobUI.rid = açık rutin
function mobRoutines() { return state.mobilityRoutine.routines; }
function mobAllItems() { return mobRoutines().flatMap(r => r.items); }
function mobRoutine(rid) { return mobRoutines().find(r => r.id === rid) || null; }
function mobNewRoutineId() { return "mr_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function mobItems() { const r = mobRoutine(mobUI.rid) || mobRoutines()[0]; return r ? r.items : []; }
function mobFind(id) { return mobItems().find(i => i.id === id) || null; }
function mobUpper(s) { return upperL(s); }
function mobArg(id) { return esc(JSON.stringify(String(id))); }
function mobNorm(s) { return String(s || "").toLocaleLowerCase("tr-TR").replace(/[’']/g, ""); }
// v39: nasıl yapılır (MOB_GUIDE, data.js). Anahtar karşılaştırması büyük/küçük harf ve kesme işaretinden bağımsız.
let _mobGuideIdx = null;
function mobGuide(name) {
  if (!_mobGuideIdx) { _mobGuideIdx = {}; Object.keys(MOB_GUIDE).forEach(k => { _mobGuideIdx[mobNorm(k).trim()] = MOB_GUIDE[k]; }); }
  return _mobGuideIdx[mobNorm(name).trim()] || null;
}
function mobGuideHtml(name, open = true, id = "") {
  const g = mobGuideL(name); if (!g) return "";
  return `<div ${id ? `id="${id}"` : ""} class="m-guide">
    <div class="m-guide-h">${t("Nasıl yapılır")}</div>
    ${open ? `<ol>${g.steps.map(x => `<li>${esc(x)}</li>`).join("")}</ol><p class="m-guide-w">${esc(t("Dikkat: {uyari}", { uyari: g.warn }))}</p>` : ""}
  </div>`;
}
function mobSummary(it) {
  const amt = it.mode === "time" ? t("{n} sn", { n: it.sec }) : tn(it.reps, "{n} tekrar");
  const body = t("{set} × {amt}", { set: tn(it.sets, "{n} set"), amt });
  return it.sides === 2 ? t("Sağ/sol · {x}", { x: body }) : body;
}
// v39: rutinin içi. Düzenle kapalıyken: tik, tek hareket sayacı, dokununca detay. Düzenle açıkken: tutamaç (sürükle-bırak)
// ve çöp kutusu; tik ve sayaç yok.
function mobCardHtml(it, idx) {
  const id = mobArg(it.id), ed = mobUI.edit;
  const left = ed
    ? `<span class="drag-handle m-grip" data-mobidx="${idx}" role="img" aria-label="${t("Sürükleyerek sırala")}">${svgI("grip", 18)}</span>`
    : `<button data-mob-check onclick="mobToggle(${id})" class="m-chk" aria-pressed="${it.done}" aria-label="${it.done ? t("Yapıldı işaretini kaldır") : t("Yapıldı olarak işaretle")}">${svgI("check", 20, 3)}</button>`;
  const right = ed
    ? `<button data-mob-del onclick="mobRemoveItem(${id})" class="m-del" aria-label="${esc(t("{ad} hareketini kaldır", { ad: mobNameL(it.name) }))}">${svgI("trash", 19)}</button>`
    : it.mode === "time" ? `<button data-mob-timer onclick="mobTimerStart(${id})" class="m-tbtn" aria-label="${t("{n} saniyelik sayacı başlat", { n: it.sec })}">${svgI("clock", 18, 2.2)}<span>${t("{n} sn", { n: it.sec })}</span></button>` : "";
  return `<div data-mob-row="${esc(it.id)}" class="m-card ${!ed && it.done ? "done" : ""}">
    ${left}
    <button data-mob-open onclick="mobOpen(${id})" class="flex-1 min-w-0 min-h-[44px] text-left">
      <span class="m-kind ${it.type === "dynamic" ? "" : "s"}">${mobTypeL(it.type)}</span>
      <span class="m-name block">${esc(mobNameL(it.name))}</span>
      <span class="m-rx block">${esc(mobSummary(it))}</span>
    </button>
    ${right}
  </div>`;
}
function mobRoutineHtml() {
  const r = mobRoutine(mobUI.rid), ed = mobUI.edit, items = r.items, id = mobArg(r.id);
  const head = ed
    ? `<div class="flex items-center gap-2.5">
        <input id="mobRName" data-fk="mob-rname" type="text" value="${esc(r.name)}" maxlength="40" aria-label="${t("Rutinin adı")}" placeholder="${t("Rutinin adı")}"
          onchange="mobRenameRoutine(this.value)" onkeydown="if(event.key==='Enter')this.blur()" class="m-in flex-1 min-w-0 !h-[52px] !text-[17px] font-semibold" />
        <button id="mobEditDone" onclick="mobEdit(false)" class="m-btn pri shrink-0">${t("Bitti")}</button>
      </div>
      <p class="text-[12.5px] text-[var(--t-dim)] mt-2 mb-2.5 px-0.5">${t("Sıralamak için tutamaçtan sürükle. Ayarlar için harekete dokun.")}</p>`
    : `<div class="flex items-center gap-2.5 mb-3">
        <button id="mobBackBtn" onclick="mobBack()" class="m-round" aria-label="${t("Rutinlere dön")}">${svgI("chevL", 20, 2.2)}</button>
        <h3 id="mobListTitle" class="t-display text-[28px] leading-[1.02] text-[var(--t-text)] flex-1 min-w-0 uppercase break-words">${esc(r.name)}</h3>
        <button id="mobEditBtn" onclick="mobEdit(true)" class="m-pill shrink-0 flex items-center gap-1.5 !text-[var(--t-text)] !border-[var(--t-acc-text)]">${svgI("edit", 16)}${t("Düzenle")}</button>
      </div>`;
  const list = items.map((it, i) => mobCardHtml(it, i)).join("")
    || `<div class="text-[14px] text-[var(--t-dim)] py-6 text-center">${ed ? t("Bu rutinde hareket yok. Aşağıdan hareket ekle.") : t("Bu rutinde hareket yok. Düzenle'den hareket ekle.")}</div>`;
  const foot = ed
    ? `<button id="mobAddBtn" onclick="mobAddOpen()" class="m-btn pri w-full mt-3">${svgI("plus", 20, 2.4)}${t("Hareket ekle")}</button>
      <div class="grid grid-cols-2 gap-2.5 mt-2.5">
        <button id="mobCopyRoutine" onclick="mobCopyRoutine()" class="m-btn ghost">${svgI("copy", 18)}${t("Kopyala")}</button>
        <button id="mobResetBtn" onclick="mobReset()" class="m-btn ghost">${svgI("undo", 18)}${t("Tikleri sıfırla|mobilite")}</button>
      </div>
      <button id="mobDeleteRoutine" onclick="mobDeleteRoutine()" class="m-btn del w-full mt-2.5">${svgI("trash", 18)}${t("Rutini sil")}</button>`
    : items.length ? `<div class="m-startbar"><button data-mob-start onclick="mobSesStart(${id})" class="m-btn pri w-full !min-h-[58px] !text-[17px]">${svgI("play", 18, 2.4)}${tn(items.length, "Başlat · {n} hareket · ~{min} dk", { min: mobRoutineMin(r) })}</button></div>` : "";
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
  offerUndo(t("{ad} kaldırıldı", { ad: mobNameL(it.name) }));
}
function mobCopyRoutine() {
  const r = mobRoutine(mobUI.rid); if (!r) return;
  const c = { id: mobNewRoutineId(), name: t("{ad} (kopya)", { ad: r.name }).slice(0, 40), items: r.items.map(x => ({ ...clone(x), id: mobNewId(), done: false })) };
  mobRoutines().splice(mobRoutines().indexOf(r) + 1, 0, c);
  mobUI.rid = c.id; mobUI.view = "routine"; mobUI.edit = true;
  window.scrollTo(0, 0);
  renderAll();
  toast(t("Rutin kopyalandı"));
}
async function mobDeleteRoutine() {
  const r = mobRoutine(mobUI.rid); if (!r) return;
  if (!(await askConfirm(t("Rutin silinsin mi?"), tn(r.items.length, "{ad} ve içindeki {n} hareket silinecek.", { ad: r.name }), t("Sil"), true))) return;
  const i = mobRoutines().findIndex(x => x.id === r.id); if (i < 0) return;
  snapshot();
  mobRoutines().splice(i, 1);
  mobUI.view = "home"; mobUI.rid = null; mobUI.edit = false;
  window.scrollTo(0, 0);
  renderAll();
  offerUndo(t("{ad} silindi", { ad: r.name }));
}
function renderMobility() {
  const root = $("mobRoot");
  if (!root || state.activeTab !== "mobility") return;
  if (mobUI.view !== "home" && !mobRoutine(mobUI.rid)) { mobUI.view = "home"; mobUI.rid = null; mobUI.edit = false; }
  if (mobUI.view === "detail" && !mobFind(mobUI.id)) mobUI.view = "routine";
  root.innerHTML = mobUI.view === "detail" ? mobDetailHtml() : mobUI.view === "add" ? mobAddHtml() : mobUI.view === "routine" ? mobRoutineHtml() : mobHomeHtml();
  if (mobUI.view === "add") mobRenderAddList();
  if (mobUI.view === "home" && typeof animStreakPop === "function") animStreakPop("m");   // v57 ANİM: seri
}
function mobToggle(id) { const it = mobFind(id); if (!it) return; it.done = !it.done; renderAll(); }
function mobReset() {
  if (!mobItems().some(i => i.done)) { toast(t("Tikli hareket yok")); return; }
  snapshot();
  mobItems().forEach(i => { i.done = false; });
  renderAll();
  offerUndo(t("Tikler sıfırlandı"));
}
// --- v39: ANA EKRAN (bu hafta, rutin kartları, bölgeler · son çalışma) ---
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
  const done = mobDoneDays(), todayK = mobTodayKey();
  const dow = (new Date(todayK + "T12:00:00").getDay() + 6) % 7;
  const days = dayShort().map((_, i) => done.has(mobShiftKey(todayK, i - dow)));
  let k = done.has(todayK) ? todayK : mobShiftKey(todayK, -1), streak = 0;
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
// v40: önce rutin günlüğü (mobilityRoutineLog, kimlikle); o günün rutin kaydı yoksa (v40 öncesi günler) ada göre
function mobLastDone(r) {
  if (r.items.some(i => i.done)) return 0;
  const names = new Set(r.items.map(i => mobNorm(i.name))), rl = state.mobilityRoutineLog || {}, ml = state.mobilityLog || {};
  let best = null;
  new Set([...Object.keys(ml), ...Object.keys(rl)]).forEach(k => {
    const ago = mobDaysAgo(k);
    if (ago < 0 || (best != null && ago >= best)) return;
    const hit = rl[k] ? rl[k].includes(r.id) : (ml[k] || []).some(n => names.has(mobNorm(n)));
    if (hit) best = ago;
  });
  return best;
}
function mobAgoText(ago) { return ago === 0 ? t("Bugün") : ago === 1 ? t("Dün") : tn(ago, "{n} gün önce"); }
function mobRoutineCardHtml(r) {
  const id = mobArg(r.id), n = r.items.length, last = mobLastDone(r);
  const regs = [...new Set(r.items.map(i => i.region).filter(Boolean))].slice(0, 3);
  return `<div data-mob-routine="${esc(r.id)}" class="m-rt">
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0"><h3 class="m-rt-name t-display">${esc(r.name)}</h3>
        <div class="m-rt-meta">${n ? tn(n, "{n} hareket · ~{min} dk|mobilite", { min: mobRoutineMin(r) }) : t("Henüz hareket yok")}</div></div>
      ${last == null ? "" : `<span class="m-rt-last ${last === 0 ? "on" : ""}">${last === 0 ? t("Bugün yapıldı") : last === 1 ? t("Dün yapıldı") : mobAgoText(last)}</span>`}
    </div>
    ${regs.length ? `<div class="flex flex-wrap gap-1.5 mt-2.5">${regs.map(k => `<span class="m-tag">${esc(mobRegionL(k))}</span>`).join("")}</div>` : ""}
    <div class="grid ${n ? "grid-cols-[1fr_auto]" : "grid-cols-1"} gap-2.5 mt-3.5">
      ${n ? `<button data-mob-start onclick="mobSesStart(${id})" class="m-btn pri">${svgI("play", 18, 2.4)}${t("Başlat")}</button>` : ""}
      <button data-mob-openr onclick="mobOpenRoutine(${id})" class="m-btn ghost">${n ? t("Aç") : t("Aç ve hareket ekle")}</button>
    </div>
  </div>`;
}
function mobHomeHtml() {
  const w = mobWeekStats(), last = mobRegionLast();
  const regs = MOB_REGIONS.map(([k]) => {
    const a = last[k], warn = a != null && a >= 7;
    const txt = a == null ? t("Henüz yok") : warn ? tn(a, "{n} gündür yok") : mobAgoText(a);
    return `<div data-mob-reg="${k}" class="m-rg ${a === 0 ? "ok" : ""} ${warn ? "warn" : ""}"><b class="t-display">${mobUpper(mobRegionL(k))}</b><span>${txt}</span></div>`;
  }).join("");
  return `<div id="mobHome">
    <div class="grid grid-cols-2 gap-2">
      <div class="m-wk"><b class="t-display">${w.count}</b><span>${tn(w.count, "gün bu hafta")}</span></div>
      <div class="m-wk"><b class="t-display">${w.streak}</b><span>${tn(w.streak, "gün üst üste")}</span></div>
    </div>
    <div class="m-days" aria-label="${t("Bu hafta mobilite yapılan günler")}">${dayShort().map((l, i) =>
      `<i class="${w.days[i] ? "d" : ""} ${i === w.dow ? "t" : ""}" aria-label="${w.days[i] ? t("{gun} yapıldı", { gun: l }) : l}">${l}</i>`).join("")}</div>
    <div class="m-lbl">${t("Rutinlerin")}</div>
    <div class="space-y-2.5">${mobRoutines().map(mobRoutineCardHtml).join("")}</div>
    <button id="mobNewRoutine" onclick="mobNewRoutine()" class="m-btn ghost w-full mt-2.5 !border-dashed">${svgI("plus", 18, 2.4)}${t("Yeni rutin")}</button>
    <div class="m-lbl">${t("Bölgeler · son çalışma")}</div>
    <div class="grid grid-cols-3 gap-2">${regs}</div>
  </div>`;
}
function mobOpenRoutine(rid) { if (!mobRoutine(rid)) return; mobUI.view = "routine"; mobUI.rid = rid; mobUI.edit = false; window.scrollTo(0, 0); renderMobility(); }
async function mobNewRoutine() {
  const v = await askText(t("Yeni rutin"), "", t("Örn. Sabah rutini"), "", t("Oluştur"));
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
  if (it.mode === "reps") return tn(it.reps, it.sides === 2 ? "Her sette <b>{n} tekrar</b> (her taraf). Sayaç yok; yapınca tikle." : "Her sette <b>{n} tekrar</b>. Sayaç yok; yapınca tikle.");
  const tot = tn(Math.max(1, Math.round(mobTotalSec(it) / 60)), "Toplam ≈ {n} dk.");
  return it.sides === 2
    ? tn(it.sets, "Sayaçta: <b>sağ {sn} sn → sol {sn} sn</b>, {n} tur. {toplam}", { sn: it.sec, toplam: tot })
    : t("Sayaçta: <b>{n} × {sn} sn</b>. {toplam}", { n: it.sets, sn: it.sec, toplam: tot });
}
function mobDetailHtml() {
  const it = mobFind(mobUI.id);
  const idx = mobItems().indexOf(it);
  const id = mobArg(it.id);
  const crumb = t("{bolge} · {n}. hareket", { bolge: mobRegionL(it.region) || t("Bölgesiz"), n: idx + 1 });
  const time = it.mode === "time";
  const stepper = (label, field, val, valId, minD, maxD, decL, incL) => `<div class="m-st"><div class="k">${label}</div><div class="v">
      <button class="m-pm" data-mob-step="${field}:-1" onclick="mobStep(${id}, '${field}', -1)" ${minD ? "disabled" : ""} aria-label="${esc(decL)}">${svgI("minus", 18, 2.6)}</button>
      <b id="${valId}" class="t-display">${val}</b>
      <button class="m-pm" data-mob-step="${field}:1" onclick="mobStep(${id}, '${field}', 1)" ${maxD ? "disabled" : ""} aria-label="${esc(incL)}">${svgI("plus", 18, 2.6)}</button></div></div>`;
  const seg = (attr, field, opts, cur) => `<div class="m-seg" style="grid-template-columns:repeat(${opts.length},minmax(0,1fr))">${opts.map(([k, l]) =>
    `<button data-mob-${attr}="${k}" onclick="mobSet(${id}, '${field}', '${k}')" class="${String(cur) === String(k) ? "on" : ""}" aria-pressed="${String(cur) === String(k)}">${l}</button>`).join("")}</div>`;
  const chips = (attr, field, opts, cur) => `<div class="flex flex-wrap gap-2">${opts.map(([k, l]) =>
    `<button data-mob-${attr}="${k}" onclick="mobSet(${id}, '${field}', '${k}')" class="m-chip ${cur === k ? "on" : ""}" aria-pressed="${cur === k}">${l}</button>`).join("")}</div>`;
  const vMin = time ? it.sec <= 5 : it.reps <= 1, vMax = time ? it.sec >= 600 : it.reps >= 100;
  return `<div id="mobDetail">
    <div class="flex items-center justify-between gap-2 -mx-1">
      <button id="mobDtBack" onclick="mobBack()" class="m-round" aria-label="${t("Geri")}">${svgI("chevL", 20, 2.2)}</button>
      <span id="mobDtCrumb" class="text-[15px] text-[var(--t-muted)] truncate">${esc(crumb)}</span>
      <span class="w-11 shrink-0"></span>
    </div>
    <button id="mobDtTitle" onclick="mobRename(${id})" class="t-display text-[32px] leading-[1.02] text-[var(--t-text)] text-left mt-3 min-h-[44px] w-full break-words" aria-label="${t("Adı değiştir")}">${esc(mobNameL(it.name))}</button>
    <div class="text-[13px] font-semibold ${it.type === "dynamic" ? "text-[var(--t-dim)]" : "text-[var(--t-acc-text)]"} mt-1">${mobTypeL(it.type)}</div>
    ${exImgBigHtml(it.name, "mobDtImg", "mt-3", mobNameL(it.name))}
    ${it.rxOk ? "" : `<div id="mobDtRx" class="mt-3 text-[13.5px] text-[var(--t-warn-text)] bg-[var(--t-elev)] rounded-2xl px-3.5 py-2.5">${t("Eski yazım")}: ${esc(it.rx)}<br><span class="text-[var(--t-muted)]">${t("Okunamadı; değerleri kontrol et.")}</span></div>`}
    <div class="m-lbl">${t("Uygulama")}</div>
    ${seg("mode", "mode", [["reps", t("Tekrar")], ["time", t("Süre")]], it.mode)}
    <div class="grid grid-cols-2 gap-2.5 mt-2.5">
      ${stepper(t("Set"), "sets", it.sets, "mobDtSets", it.sets <= 1, it.sets >= 10, t("Set azalt"), t("Set artır"))}
      ${stepper(time ? t("Süre (sn)") : t("Tekrar"), "val", time ? it.sec : it.reps, "mobDtVal", vMin, vMax,
        time ? t("Süre (sn) azalt") : t("Tekrar azalt"), time ? t("Süre (sn) artır") : t("Tekrar artır"))}
    </div>
    <div class="m-lbl">${t("Taraf")}</div>
    ${seg("sides", "sides", [[1, t("Tek")], [2, t("Sağ ve sol")]], it.sides)}
    <div id="mobDtPreview" class="m-preview">${mobPreviewHtml(it)}</div>
    <div class="m-lbl">${t("Tür")}</div>
    ${seg("type", "type", MOB_TYPES.map(([k]) => [k, mobTypeL(k)]), it.type)}
    <div class="m-lbl">${t("Ana bölge")}</div>
    ${chips("r1", "region", MOB_REGIONS.map(([k]) => [k, mobRegionL(k)]), it.region)}
    <div class="m-lbl">${t("İkincil bölge")} <span class="font-normal text-[var(--t-dim)]">${t("(isteğe bağlı, yarım sayılır)")}</span></div>
    ${chips("r2", "region2", [["", t("Yok")], ...MOB_REGIONS.filter(r => r[0] !== it.region).map(([k]) => [k, mobRegionL(k)])], it.region2)}
    ${mobGuideHtml(it.name, true, "mobDtGuide")}
    <div class="m-lbl">${t("Not")}</div>
    <textarea id="mobDtNote" data-fk="mob-note" rows="2" class="m-in" placeholder="${t("Not ekle…")}" onchange="mobSet(${id}, 'note', this.value)">${esc(mobNoteL(it.note))}</textarea>
    <div class="grid grid-cols-[1fr_1.6fr] gap-2.5 mt-5">
      <button id="mobDtRemove" onclick="mobRemove(${id})" class="m-btn del">${svgI("trash", 19)}${t("Kaldır")}</button>
      ${time
        ? `<button id="mobDtStart" onclick="mobTimerStart(${id})" class="m-btn pri">${svgI("clock", 20, 2.2)}${t("Sayacı başlat")}</button>`
        : `<button id="mobDtDone" onclick="mobToggle(${id})" class="m-btn ${it.done ? "ghost" : "pri"}">${svgI("check", 20, 2.6)}${it.done ? t("Yapıldı (geri al)") : t("Yapıldı")}</button>`}
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
  const shown = mobNameL(it.name);
  const v = await askText(t("Hareketin adı"), shown, t("Örn. Couch Stretch"));
  if (v == null || !String(v).trim()) return;
  const cur = mobFind(id); if (!cur) return;
  if (String(v).trim() === shown) return;   // v52: gösterilen ad değişmediyse kayıtlı ad aynen kalır
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
      <h3 class="t-display text-[30px] text-[var(--t-text)]">${t("HAREKET EKLE")}</h3>
      <button id="mobAddClose" onclick="mobBack()" class="m-round" aria-label="${t("Kapat")}">${svgI("x", 20, 2.2)}</button>
    </div>
    <label class="flex items-center gap-2.5 h-[50px] rounded-2xl bg-[var(--t-surface)] px-3.5 mt-3 text-[var(--t-dim)]">${svgI("search", 20)}
      <input id="mobSearch" type="search" value="${esc(mobUI.q)}" placeholder="${t("Hareket ara|mobilite")}" autocomplete="off" oninput="mobAddSearch(this.value)" class="t-search flex-1 min-w-0 h-full !text-[16px]" /></label>
    <div class="flex gap-2 mt-3 overflow-x-auto no-scrollbar -mx-4 px-4">${[["all", t("Tümü")], ...MOB_TYPES.map(([k]) => [k, mobTypeL(k)])].map(([k, l]) =>
      `<button data-mob-filter="${k}" onclick="mobAddFilter('${k}')" class="m-chip ${f === k ? "on" : ""}" aria-pressed="${f === k}">${l}</button>`).join("")}</div>
    <div id="mobAddList"></div>
    <button id="mobAddCustom" onclick="mobAddCustom()" class="m-btn w-full mt-4">${svgI("edit", 19)}${t("Listede yok mu? Elle ekle")}</button>
  </div>`;
}
function mobRenderAddList() {
  const box = $("mobAddList"); if (!box) return;
  const en = curLang() === "en", nz = s => en ? mobNorm(s).replace(/ı/g, "i") : mobNorm(s);   // v52: İngilizcede "Inner" → "ınner" olmasın
  const q = nz(mobUI.q).trim().split(/\s+/).filter(Boolean);
  const inRoutine = new Set(mobItems().map(i => i.name));
  const list = mobLibAll().filter(x => (mobUI.filter === "all" || x.type === mobUI.filter)
    && q.every(w => nz(x.m.name + " " + x.m.note + (en ? " " + mobNameL(x.m.name) + " " + mobNoteL(x.m.note) : "")).includes(w)));
  const order = [...MOB_REGION_KEYS, ""];
  box.innerHTML = order.map(rk => {
    const rows = list.filter(x => x.region === rk);
    if (!rows.length) return "";
    return `<div data-mob-group class="text-[13px] font-semibold text-[var(--t-muted)] mt-4 mb-2 px-0.5">${esc(mobRegionL(rk) || t("Diğer (bilek, ön kol)"))}</div>
      <div class="space-y-2">${rows.map(x => {
        const sum = mobSummary(normMobItem(mobFromLegacy({ name: x.m.name, prescription: x.m.prescription }, x.type)));
        const has = inRoutine.has(x.m.name);
        return `<div data-mob-lib="${x.key}" class="m-card">
          ${exThumbHtml(x.m.name, "w-[76px] h-[43px] ml-1")}
          <div class="flex-1 min-w-0"><span class="m-kind ${x.type === "dynamic" ? "" : "s"}">${mobTypeL(x.type)}${has ? ` · <span class="text-[var(--t-text)]">${t("Rutinde")}</span>` : ""}</span>
            <span class="m-name block">${esc(mobNameL(x.m.name))}</span><span class="m-rx block">${esc(sum)}</span></div>
          <button data-mob-add onclick="mobAddLib('${x.key}')" class="m-add mr-1.5 ${has ? "in" : ""}" aria-label="${esc(t(has ? "{ad} zaten rutinde, yine de ekle" : "{ad} ekle", { ad: mobNameL(x.m.name) }))}">${svgI(has ? "check" : "plus", 20, 2.6)}</button>
        </div>`;
      }).join("")}</div>`;
  }).join("") || `<div class="text-[14px] text-[var(--t-dim)] py-6 text-center">${t("Hareket bulunamadı. Aşağıdan elle ekleyebilirsin.")}</div>`;
}
function mobAddOpen() { mobUI.view = "add"; mobUI.q = ""; window.scrollTo(0, 0); renderMobility(); }
function mobAddSearch(v) { mobUI.q = String(v || ""); mobRenderAddList(); }
function mobAddFilter(k) { mobUI.filter = k; mobRenderAddList(); document.querySelectorAll("[data-mob-filter]").forEach(b => { const on = b.dataset.mobFilter === k; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); }); }
async function mobAddLib(key) {
  const x = mobLibAll().find(e => e.key === key); if (!x) return;
  // v28: rutinde zaten varsa yanlışlıkla ikinci kez eklenmesin
  if (mobItems().some(i => i.name === x.m.name)
    && !(await askConfirm(t("Zaten rutinde"), t("{ad} rutininde var. Bir kez daha eklensin mi?", { ad: mobNameL(x.m.name) }), t("Yine de ekle")))) return;
  const it = normMobItem(mobFromLegacy({ name: x.m.name, prescription: x.m.prescription, note: mobNoteL(x.m.note) }, x.type));   // v52 karar 2: İngilizcede yeni kaydın notu İngilizce
  mobItems().push(it);
  renderAll();
  toast(t("{ad} eklendi", { ad: mobNameL(it.name) }));
}
async function mobAddCustom() {
  const v = await askText(t("Hareketin adı"), "", t("Örn. Duvarda göğüs esnetme"));
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
// Tek hareket: tur → ses → 5 sn ara → sonraki tur; son tur bitince hareket tiklenir ve kapanır.
// v39 seans (mobT.ses): rutinin BÜTÜN hareketleri baştan sırayla (kullanıcı kararı). Süreli harekette önce 5 sn hazırlık
// (phase "prep"), sonra turlar; tekrarlı harekette sayaç yok (phase "reps"), her tur "Bitti" ile geçilir. Biten hareket o anda
// tiklenir ve kaydedilir; Atla tiklemez; kapatınca yapılanlar kalır. iOS: uygulama kapalıyken/sessizde ses yok.
let mobT = null;
function mobFmt(sec) { sec = Math.max(0, Math.ceil(sec)); return Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0"); }
function mobBeep() { if (state.settings.mobSound !== false) beep(true); }
function mobRoundsOf(it) {
  const rounds = [];
  for (let s = 1; s <= it.sets; s++) (it.sides === 2 ? ["Sağ", "Sol"] : [null]).forEach(side => rounds.push({ side, set: s }));
  return rounds;
}
function mobFindAny(id) { for (const r of mobRoutines()) { const it = r.items.find(i => i.id === id); if (it) return it; } return null; }
function mobTimerOpen() {
  const m = $("mobTimer"); m.classList.remove("hidden"); m.classList.add("flex");
  document.body.classList.add("pf-open");
  if (!mobT.iv) mobT.iv = setInterval(mobTimerTick, 250);
  mobTimerRender();
  updateWakeLock();
}
function mobTimerStart(id) {
  const it = mobFind(id);
  if (!it || it.mode !== "time") return;
  unlockAudio();
  undoSnap = null;   // v40
  if (mobT) clearInterval(mobT.iv);
  const now = Date.now();
  mobT = { ses: null, id: it.id, name: it.name, region: mobRegionL(it.region), sec: it.sec, sets: it.sets, rounds: mobRoundsOf(it), idx: 0, phase: "work", endAt: now + it.sec * 1000, t0: now, iv: 0, quiet: false };
  mobTimerOpen();
}
// Seans
function mobSesStart(rid) {
  const r = mobRoutine(rid);
  if (!r || !r.items.length) { toast(t("Rutinde hareket yok")); return; }
  mobSesStartIds(r.name, r.items.map(i => i.id), r.id);
}
// v40: seans herhangi bir hareket listesiyle (ısınma: rid = null, hareketler kendi rutinlerinde tiklenir)
function mobSesStartIds(title, ids, rid) {
  if (!ids.length) return;
  unlockAudio();
  undoSnap = null;   // v40: seanstan önce çıkmış "Geri al" seansın kaydettiği tikleri geri almasın
  if (mobT) clearInterval(mobT.iv);
  // v63: görsel hareketi gösterdiği için "Nasıl yapılır" seansta kapalı başlar (açınca adımlar; alttaki düğmeler ekranda kalsın)
  mobT = { ses: { rid, title, ids: ids.slice(), pos: 0, skipped: [], doneIds: [], t0: Date.now(), guideOpen: false }, iv: 0, t0: Date.now() };
  mobSesLoad(0);
  mobTimerOpen();
}
function mobSesLoad(pos) {
  const S = mobT.ses;
  if (typeof animMobMark === "function") animMobMark(S.pos, pos);   // v57 ANİM: seans geçişi (ileri / geri)
  S.pos = pos;
  const it = mobFindAny(S.ids[pos]);
  if (!it) { if (pos + 1 < S.ids.length) return mobSesLoad(pos + 1); return mobSesFinish(); }
  const time = it.mode === "time";
  Object.assign(mobT, { id: it.id, name: it.name, region: mobRegionL(it.region), sec: it.sec, sets: it.sets, reps: it.reps, rounds: mobRoundsOf(it), idx: 0,
    phase: time ? "prep" : "reps", endAt: time ? Date.now() + MOB_SWITCH_SEC * 1000 : 0, quiet: false, s10: -1 });
  if (!mobT.iv) mobT.iv = setInterval(mobTimerTick, 250);
  mobTimerRender();
  mobSayItem();
}
function mobSesItemDone() {
  const S = mobT.ses, it = mobFindAny(mobT.id);
  if (it) { it.done = true; saveState(); }
  if (!S.doneIds.includes(mobT.id)) S.doneIds.push(mobT.id);
  S.skipped = S.skipped.filter(x => x !== mobT.id);
  mobSesAdvance();
}
function mobSesAdvance() {
  const S = mobT.ses;
  if (S.pos + 1 >= S.ids.length) mobSesFinish(); else mobSesLoad(S.pos + 1);
}
function mobSesNext() {   // tekrarlı harekette "Bitti"
  if (!mobT || mobT.phase !== "reps") return;
  if (mobT.idx < mobT.rounds.length - 1) { mobT.idx++; mobTimerRender(); mobSayRound(); } else mobSesItemDone();
}
function mobSesPrev() { if (!mobT || !mobT.ses) return; mobSesLoad(Math.max(0, mobT.ses.pos - 1)); }
function mobSesSkip() {
  if (!mobT || !mobT.ses) return;
  const S = mobT.ses;
  if (!S.doneIds.includes(mobT.id) && !S.skipped.includes(mobT.id)) S.skipped.push(mobT.id);
  mobSesAdvance();
}
function mobSesGuide() { if (!mobT || !mobT.ses) return; mobT.ses.guideOpen = !mobT.ses.guideOpen; mobTimerRender(); }
function mobSesFinish() {
  clearInterval(mobT.iv); mobT.iv = 0;
  mobT.phase = "fin";
  mobSay(t("{ad} bitti. Tebrikler.", { ad: mobT.ses.title }));
  renderAll();
  mobTimerRender();
}
function mobSesFinishClose() {
  const rid = mobT && mobT.ses ? mobT.ses.rid : null;
  mobTimerClose();
  if (rid && mobRoutine(rid) && state.activeTab === "mobility") { mobUI.view = "routine"; mobUI.rid = rid; mobUI.edit = false; }
  renderAll();
}
function mobTimerTick() {
  if (!mobT || mobT.phase === "reps" || mobT.phase === "fin") return;
  let changed = false;
  while (mobT && mobT.phase !== "reps" && mobT.phase !== "fin" && Date.now() >= mobT.endAt) {
    const late = Date.now() - mobT.endAt;
    if (mobT.phase === "prep") { mobT.phase = "work"; mobT.endAt += mobT.sec * 1000; if (late < 2000) mobSay(t("Başla")); }
    else if (mobT.phase === "work") {
      if (!mobT.quiet && late < 2000) mobBeep();
      if (mobT.idx >= mobT.rounds.length - 1) {
        if (mobT.ses) { const at = mobT.endAt; mobSesItemDone(); if (mobT && mobT.phase === "prep") mobT.endAt = at + MOB_SWITCH_SEC * 1000; changed = false; continue; }
        mobTimerFinish(); return;
      }
      mobT.phase = "switch"; mobT.endAt += MOB_SWITCH_SEC * 1000;
      if (late < 2000) { const nx = mobT.rounds[mobT.idx + 1]; mobSay(nx && nx.side === "Sol" ? t("Sola geç") : nx && nx.side === "Sağ" ? t("Sağa geç") : t("Sıradaki set")); }
    } else {
      mobT.idx++; mobT.phase = "work"; mobT.endAt += mobT.sec * 1000;
      if (late < 2000) mobSay(t("Başla"));
    }
    mobT.quiet = false;
    changed = true;
  }
  if (!mobT) return;
  if (changed) mobTimerRender(); else mobTimerUpdate();
}
function mobTimerFinish() {
  const id = mobT.id, name = mobT.name;
  mobTimerClose();
  const it = mobFindAny(id);   // kimlikle bütün rutinlerde (açık rutin değişmiş olabilir)
  if (it) it.done = true;
  renderAll();
  toast(t("{ad} tamamlandı", { ad: mobNameL(name) }));
}
function mobTimerClose() {
  if (mobT) clearInterval(mobT.iv);
  const hadSes = !!(mobT && mobT.ses);
  mobT = null;
  try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) { /* ses yok */ }   // v40: kapatınca konuşma susar
  const m = $("mobTimer"); m.classList.add("hidden"); m.classList.remove("flex"); m.innerHTML = "";
  document.body.classList.remove("pf-open");
  updateWakeLock();
  if (hadSes) renderAll();
}
function mobTimerAdjust(d) { if (!mobT || mobT.phase === "reps") return; mobT.endAt += d * 1000; if (mobT.endAt <= Date.now()) mobT.quiet = true; mobTimerTick(); }
function mobTimerSkip() { if (!mobT) return; mobT.endAt = Date.now(); mobT.quiet = true; mobTimerTick(); }
function mobTimerSound() { state.settings.mobSound = state.settings.mobSound === false; saveState(); mobTimerRender(); }
// v40: SESLİ YÖNLENDİRME (isteğe bağlı, varsayılan kapalı). speechSynthesis yoksa ya da iOS konuşturmazsa sessizce atlanır.
function mobSay(text) {
  if (!state.settings.mobVoice) return;
  try {
    const ss = window.speechSynthesis;
    if (!ss || typeof SpeechSynthesisUtterance === "undefined") return;
    ss.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const en = curLang() === "en";   // v52: konuşma dile göre (Türkçe davranış aynen)
    u.lang = en ? "en-GB" : "tr-TR";
    const v = (ss.getVoices() || []).find(x => String(x.lang).toLowerCase().startsWith(en ? "en" : "tr"));
    if (v) u.voice = v;
    ss.speak(u);
  } catch (e) { /* ses yok */ }
}
function mobSayRound() {
  if (!mobT || !mobT.rounds) return;
  const r = mobT.rounds[mobT.idx];
  const n = String(r.set);
  if (mobT.sets > 1) mobSay(r.side ? t("Set {n}. {taraf} taraf.", { n, taraf: mobSideL(r.side) }) : t("Set {n}.", { n }));
  else if (r.side) mobSay(t("{taraf} taraf.", { taraf: mobSideL(r.side) }));
}
function mobSayItem() {
  if (!mobT || !mobT.rounds) return;
  const r = mobT.rounds[mobT.idx], time = mobT.phase !== "reps";
  const v = { ad: mobNameL(mobT.name), taraf: mobSideL(r.side), sets: String(mobT.sets), sn: String(mobT.sec), tekrar: String(mobT.reps) };
  const sd = !!r.side, many = mobT.sets > 1;
  const key = time
    ? (sd ? (many ? "{ad}. {taraf} taraf. {sets} set, {sn} saniye." : "{ad}. {taraf} taraf. {sn} saniye.") : (many ? "{ad}. {sets} set, {sn} saniye." : "{ad}. {sn} saniye."))
    : (sd ? (many ? "{ad}. {taraf} taraf. {sets} set, {tekrar} tekrar." : "{ad}. {taraf} taraf. {tekrar} tekrar.") : (many ? "{ad}. {sets} set, {tekrar} tekrar." : "{ad}. {tekrar} tekrar."));
  mobSay(t(key, v));
}
function mobTimerVoice() {
  state.settings.mobVoice = !state.settings.mobVoice;
  saveState();
  mobTimerRender();
  if (state.settings.mobVoice) mobSayItem(); else try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
}
function mobBreathLabel() { return ((Date.now() - mobT.t0) % 10000) < 4000 ? t("Nefes al") : t("Nefes ver"); }
function mobTimerUpdate() {
  if (!mobT) return;
  const left = (mobT.endAt - Date.now()) / 1000;
  if (mobT.phase === "work" && mobT.sec >= 20 && left <= 10 && left > 8 && mobT.s10 !== mobT.idx) { mobT.s10 = mobT.idx; mobSay(t("Son 10 saniye")); }
  const el = $("mobTTime"); if (el) el.textContent = mobFmt(left);
  const b = $("mobTBreath"); if (b && mobT.phase === "work") b.textContent = mobBreathLabel();
}
function mobRoundLabel(x) { return x.side ? t("{taraf} {n}", { taraf: mobSideL(x.side), n: x.set }) : t("Set {n}", { n: x.set }); }
function mobSesFinHtml() {
  const S = mobT.ses, w = mobWeekStats();
  const min = Math.max(1, Math.round((Date.now() - S.t0) / 60000));
  const rows = S.ids.map(id => { const it = mobFindAny(id); return it ? { name: it.name, ok: S.doneIds.includes(id), sk: S.skipped.includes(id) } : null; }).filter(Boolean);
  const shown = rows.slice(0, 5), more = rows.length - shown.length;
  return `<div id="mobTFin" class="w-full max-w-lg flex flex-col items-center text-center pt-14 pb-4">
    <div class="w-[110px] h-[110px] rounded-full grid place-items-center border-[3px] border-[var(--t-acc-text)] bg-[rgba(var(--t-acc-rgb),0.15)] text-[var(--t-acc-text)]">${svgI("check", 50, 2.6)}</div>
    <h3 class="t-display text-[36px] leading-[1.02] mt-5 uppercase break-words">${t("{ad} bitti", { ad: esc(S.title) })}</h3>
    <p class="text-[15px] text-[var(--t-muted)] mt-1.5">${tn(w.streak, "Bu hafta {c}. gün · {n} gün üst üste", { c: w.count })}</p>
    <div class="grid grid-cols-3 gap-2 w-full mt-5">
      <div class="m-wk"><b class="t-display" data-fin="hareket">${S.doneIds.length}</b><span>${tn(S.doneIds.length, "hareket|seans")}</span></div>
      <div class="m-wk"><b class="t-display" data-fin="dakika">${min}</b><span>${tn(min, "dakika")}</span></div>
      <div class="m-wk"><b class="t-display" data-fin="atlandi">${S.skipped.length}</b><span>${t("atlandı")}</span></div>
    </div>
    <div class="w-full mt-4 bg-[var(--t-surface)] rounded-[18px] px-3.5 py-1 text-left">${shown.map(x =>
      `<div class="flex justify-between gap-3 py-2.5 border-b border-[var(--t-line)] last:border-0 text-[14px] ${x.ok ? "text-[var(--t-text)]" : "text-[var(--t-muted)]"}"><span class="min-w-0 truncate">${esc(mobNameL(x.name))}</span><span class="shrink-0">${x.ok ? t("Yapıldı") : x.sk ? t("Atlandı") : t("Yapılmadı")}</span></div>`).join("")}
      ${more > 0 ? `<div class="py-2.5 text-[13.5px] text-[var(--t-muted)]">${tn(more, "… {n} hareket daha")}</div>` : ""}</div>
    <button id="mobTFinOk" onclick="mobSesFinishClose()" class="m-btn pri w-full mt-5">${t("Tamam")}</button>
  </div>`;
}
function mobTimerRender() {
  if (!mobT) return;
  const T = mobT, S = T.ses, snd = state.settings.mobSound !== false;
  if (T.phase === "fin") { $("mobTimer").innerHTML = mobSesFinHtml(); if (typeof animMobFin === "function") animMobFin(); return; }   // v57 ANİM: bitiş kutlaması
  const r = T.rounds[T.idx], next = T.rounds[T.idx + 1];
  const reps = T.phase === "reps", prep = T.phase === "prep", work = T.phase === "work";
  const it = mobFindAny(T.id);
  let sub;
  const sd = r.side ? mobSideL(r.side) : "", setOf = { n: r.set, sets: T.sets };
  if (reps) sub = r.side ? t("{taraf} taraf · Set {n} / {sets}", { taraf: sd, ...setOf }) : t("Set {n} / {sets}", setOf);
  else if (prep) sub = r.side ? tn(T.sets, "Hazırlan · {taraf} taraf, {n} set × {sn} sn", { taraf: sd, sn: T.sec }) : tn(T.sets, "Hazırlan · {n} set × {sn} sn", { sn: T.sec });
  else if (work) sub = r.side ? t("{taraf} taraf · {n}. tur / {sets}", { taraf: sd, ...setOf }) : t("Set {n} / {sets}", setOf);
  else sub = t(next && next.side === "Sol" ? "Sola geç · {x}" : next && next.side === "Sağ" ? "Sağa geç · {x}" : "Sıradaki set · {x}", { x: next ? mobRoundLabel(next) : "" });
  const boxes = T.rounds.map((x, i) => {
    const cls = i < T.idx || (i === T.idx && T.phase === "switch") ? "d" : i === T.idx ? "n" : "";
    return `<i class="${cls}">${mobRoundLabel(x)}</i>`;
  }).join("");
  const n = S ? S.ids.length : 0;
  const top = S
    ? `<div class="flex-1 min-w-0 flex flex-col items-center gap-1.5"><span id="mobTProg" class="text-[13px] font-semibold text-[var(--t-muted)] truncate max-w-full">${esc(S.title)} · ${S.pos + 1} / ${n}</span>
        <span class="block w-full max-w-[200px] h-1.5 rounded-full bg-[var(--t-elev)] overflow-hidden"><i class="block h-full bg-[var(--t-acc)]" style="width:${Math.round(S.pos / n * 100)}%"></i></span></div>`
    : `<span id="mobTRegion" class="text-[15px] text-[var(--t-muted)]">${esc(T.region)}</span>`;
  const g = S && it ? mobGuideL(it.name) : null;
  const guide = g
    ? `<div id="mobTGuide" class="m-guide w-full max-w-lg !mt-3 text-left">
        <button id="mobTGuideBtn" onclick="mobSesGuide()" class="w-full min-h-[44px] flex items-center justify-between m-guide-h" aria-expanded="${S.guideOpen}">${t("Nasıl yapılır")}<span class="text-[var(--t-dim)]">${svgI(S.guideOpen ? "up" : "down", 18)}</span></button>
        ${S.guideOpen ? `<ol>${g.steps.map(x => `<li>${esc(x)}</li>`).join("")}</ol><p class="m-guide-w">${esc(t("Dikkat: {uyari}", { uyari: g.warn }))}</p>` : ""}
      </div>`
    : S && it && it.note ? `<div class="m-guide w-full max-w-lg !mt-3 text-left text-[14px] text-[var(--t-text1)]">${esc(mobNoteL(it.note))}</div>` : "";
  const nextName = S && S.pos + 1 < n ? mobNameL((mobFindAny(S.ids[S.pos + 1]) || {}).name || "") : "";
  const center = reps
    ? `<div class="text-center mt-6"><b id="mobTReps" class="t-display text-[104px] leading-[0.85]">${T.reps}</b>
        <span class="block text-[16px] font-bold text-[var(--t-acc-text)] mt-2">${mobUpper(r.side ? t("Tekrar · {taraf} taraf", { taraf: mobSideL(r.side) }) : t("Tekrar"))}</span></div>`
    : `<div id="mobTCircle" class="m-breath ${S ? "ses" : ""} mt-4 ${work ? "" : "pause"}">
        <span class="o o1"></span><span class="o o2"></span>
        <div class="core" style="animation-delay:-${(Date.now() - T.t0) % 10000}ms"><b id="mobTTime" class="t-display">${mobFmt((T.endAt - Date.now()) / 1000)}</b><span id="mobTBreath">${work ? mobBreathLabel() : t("Hazırlan")}</span></div>
      </div>
      ${S ? "" : `<div class="text-[13.5px] text-[var(--t-dim)] mt-1 text-center">${work ? t("4 sn al, 6 sn ver. Her verişte biraz daha derine.") : t("Sıradaki tur birazdan kendiliğinden başlar.")}</div>`}`;
  const ctl = !S
    ? `<div class="grid grid-cols-[1fr_1fr_1.3fr] gap-2.5">
        <button id="mobTMinus" onclick="mobTimerAdjust(-15)" class="h-[60px] rounded-[18px] bg-[var(--t-elev)] text-[17px] font-bold">−15</button>
        <button id="mobTPlus" onclick="mobTimerAdjust(15)" class="h-[60px] rounded-[18px] bg-[var(--t-elev)] text-[17px] font-bold">+15</button>
        <button id="mobTSkip" onclick="mobTimerSkip()" class="h-[60px] rounded-[18px] bg-[var(--t-text)] text-[var(--t-bg)] text-[17px] font-bold">${t("Atla")}</button>
      </div>`
    : reps
    ? `<div class="grid grid-cols-[1fr_1fr_1.8fr] gap-2.5">
        <button id="mobTPrev" onclick="mobSesPrev()" ${S.pos ? "" : "disabled"} class="h-[62px] rounded-[18px] border border-[var(--t-line)] text-[16px] font-bold text-[var(--t-muted)] disabled:opacity-40" aria-label="${t("Önceki hareket")}">‹ ${t("Önceki")}</button>
        <button id="mobTSkip" onclick="mobSesSkip()" class="h-[62px] rounded-[18px] bg-[var(--t-elev)] text-[16px] font-bold" aria-label="${t("Bu hareketi atla")}">${t("Atla")}</button>
        <button id="mobTDone" onclick="mobSesNext()" class="h-[62px] rounded-[18px] bg-[var(--t-acc)] text-[var(--t-on-acc)] text-[18px] font-extrabold">${t("Bitti")}</button>
      </div>`
    : `<div class="grid grid-cols-4 gap-2">
        <button id="mobTPrev" onclick="mobSesPrev()" ${S.pos ? "" : "disabled"} class="h-[60px] rounded-[18px] border border-[var(--t-line)] text-[17px] font-bold text-[var(--t-muted)] disabled:opacity-40" aria-label="${t("Önceki hareket")}">‹</button>
        <button id="mobTMinus" onclick="mobTimerAdjust(-15)" class="h-[60px] rounded-[18px] bg-[var(--t-elev)] text-[17px] font-bold">−15</button>
        <button id="mobTPlus" onclick="mobTimerAdjust(15)" class="h-[60px] rounded-[18px] bg-[var(--t-elev)] text-[17px] font-bold">+15</button>
        <button id="mobTSkip" onclick="mobSesSkip()" class="h-[60px] rounded-[18px] bg-[var(--t-text)] text-[var(--t-bg)] text-[16px] font-bold" aria-label="${t("Bu hareketi atla")}">${t("Atla")} ›</button>
      </div>`;
  $("mobTimer").innerHTML = `
    <div class="w-full max-w-lg flex items-center justify-between gap-2 pt-3">
      <button id="mobTClose" onclick="mobTimerClose()" class="m-round" aria-label="${S ? t("Seansı bitir") : t("Sayacı kapat")}">${svgI("x", 20, 2.2)}</button>
      ${top}
      <span class="flex gap-2 shrink-0">
        <button id="mobTVoice" onclick="mobTimerVoice()" class="m-round ${state.settings.mobVoice ? "!text-[var(--t-acc-text)] !border-[var(--t-acc-text)]" : ""}" aria-pressed="${!!state.settings.mobVoice}" aria-label="${state.settings.mobVoice ? t("Sesli yönlendirmeyi kapat") : t("Sesli yönlendirmeyi aç")}">${svgI("talk", 20)}</button>
        <button id="mobTSound" onclick="mobTimerSound()" class="m-round" aria-label="${snd ? t("Bip sesini kapat") : t("Bip sesini aç")}">${svgI(snd ? "vol" : "volOff", 20)}</button>
      </span>
    </div>
    <div class="text-center mt-4 px-2 w-full max-w-lg">
      <h3 id="mobTTitle" class="t-display text-[30px] leading-[1.05] break-words">${esc(mobNameL(T.name))}</h3>
      <p id="mobTSub" class="text-[15px] ${work || reps ? "text-[var(--t-muted)]" : "text-[var(--t-acc-text)] font-semibold"} mt-1.5">${sub}</p>
    </div>
    ${exImgBigHtml(T.name, "mobTImg", reps ? "mt-3" : "mt-3 tm-c", mobNameL(T.name))}
    ${center}
    ${guide}
    <div class="w-full max-w-lg mt-auto pt-5">
      ${nextName ? `<div class="text-[13px] text-[var(--t-dim)] text-center mb-2.5 truncate">${t("Sıradaki: {ad}", { ad: `<b class="text-[var(--t-muted)] font-semibold">${esc(nextName)}</b>` })}</div>` : ""}
      ${ctl}
      <div id="mobTRounds" class="m-rounds mt-3">${boxes}</div>
    </div>`;
  if (typeof animMobApply === "function") animMobApply();   // v57 ANİM: seans geçişi
}

// --- v40: ANTRENMANDA ISINMA KARTI (isteğe bağlı: settings.warmupCard). Günün kaslarına uygun bölgelerdeki dinamik
// hareketler, yalnızca kullanıcının kendi rutinlerinden (hazır şablon yok), en fazla 4, ada göre tekil.
const MOB_WARM_REGIONS = { "Göğüs": ["chest", "shoulder"], "Sırt": ["spine", "shoulder"], "Omuz": ["shoulder"], "Biceps": ["shoulder"], "Triceps": ["shoulder"],
  "Ön Bacak": ["hip", "ankle"], "Arka Bacak & Kalça": ["hip", "hamstring"], "Kalf": ["ankle"], "Karın": ["spine"] };
function mobWarmupItems(day) {
  const regs = new Set();
  ((day && day.exercises) || []).forEach(ex => (MOB_WARM_REGIONS[muscleOf(ex)] || []).forEach(r => regs.add(r)));
  const out = [], seen = new Set();
  if (!regs.size) return out;
  for (const it of mobAllItems()) {
    if (out.length >= 4) break;
    const k = mobNorm(it.name);
    if (it.type === "dynamic" && (regs.has(it.region) || regs.has(it.region2)) && !seen.has(k)) { seen.add(k); out.push(it); }
  }
  return out;
}
function warmupCardHtml(day, inProg) {
  if (!state.settings.warmupCard || inProg) return "";
  const items = mobWarmupItems(day);
  if (!items.length) return "";
  const hide = `<button id="gymWarmupHide" onclick="mobWarmupHide()" class="m-round shrink-0 !bg-transparent" aria-label="${t("Isınma kartını gizle")}">${svgI("x", 18, 2.2)}</button>`;
  if (items.every(i => i.done)) return `<div id="gymWarmup" class="m-warm flex items-center gap-3 !py-2">
      <span class="text-[var(--d-lv)]">${svgI("check", 20, 2.6)}</span>
      <span class="flex-1 min-w-0 text-[15px] font-semibold">${t("Isınma yapıldı")} <span class="font-normal text-[var(--t-muted)]">· ${tn(items.length, "{n} hareket|ısınma")}</span></span>${hide}</div>`;
  const regs = [...new Set(items.map(i => i.region).filter(Boolean))].map(k => lowerL(mobRegionL(k)));
  const min = Math.max(1, Math.round(items.reduce((a, it) => a + mobItemSec(it), 0) / 60));
  return `<div id="gymWarmup" class="m-warm">
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0"><b class="block text-[15.5px]">${regs.length ? t("Isınma: {regs}", { regs: esc(regs.join(" + ")) }) : t("Isınma")}</b>
        <span class="block text-[13px] text-[var(--t-muted)] mt-0.5">${tn(items.length, "{n} hareket · ~{min} dk · mobilite rutinlerinden", { min })}</span></div>
      ${hide}
    </div>
    <div class="text-[12.5px] text-[var(--t-dim)] mt-2">${items.map(i => esc(mobNameL(i.name))).join(" · ")}</div>
    <button id="gymWarmupStart" onclick="mobWarmupStart()" class="m-warm-go w-full justify-center mt-3">${svgI("play", 16, 2.4)}${t("Isınmayı başlat")}</button>
  </div>`;
}
function mobWarmupStart() { const items = mobWarmupItems(activeDay()); if (items.length) mobSesStartIds(t("Isınma"), items.map(i => i.id), null); }
function mobWarmupHide() {
  snapshot();
  state.settings.warmupCard = false;
  renderAll();
  offerUndo(t("Isınma kartı gizlendi. Profil'den geri açabilirsin"));
}
