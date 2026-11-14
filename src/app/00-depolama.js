// ---------------------------------------------------------------------------
// DEPOLAMA (v41, App Store Aşama 1). Bütün kalıcı kayıt bu katmandan geçer.
// - IndexedDB "aykplus": veri parçalara bölünür (STORE_PARTS + "core"); dokunuşta yalnızca değişen parça yazılır (tek işlem).
// - localStorage "ayk_plus_v5_state" SİLİNMEZ: "ayna" olarak, dokunuşlar durunca (2 sn) ve arka plana geçerken güncellenir.
//   Önbellekteki eski sürümler ve dışarıdan yazılan kayıt (eski sürüm, test) böylece çalışır; dolarsa ayna durur.
// - Açılışta localStorage'ın imzası son aynayla aynı değilse kayıt dışarıdan değişmiştir → içe alınır (önceki hâl iç yedek).
// - IndexedDB açılamazsa "ls" (eski) modu: davranış v40 ile birebir.
// - İç yedekler (snaps): her gün ilk açılışta günün kopyası; son 7 gece + son 4 haftanın birer kopyası, "Geçiş öncesi" kalıcı.
// Bu dosya yalnızca tanımlar içerir; başlatma 13-cizim-baslat.js → storageInit().then(bootApp).
// ---------------------------------------------------------------------------
const IDB_NAME = "aykplus";
const STORE_PARTS = ["dailyLogs", "exerciseHistory", "workoutLogs", "weightLogs", "mobilityLog", "mobilityRoutineLog", "measurements", "foodSnap"];
const MIRROR_DELAY_MS = 2000;
const MIRROR_SIG_KEY = "ayk_plus_v5_imza";   // aynanın imzası, aynayla aynı anda (eşzamanlı) yazılır
var storeMode = "boot";          // boot | idb | ls
var storeReady = false;          // açılış bitmeden hiçbir şey yazılmaz
var aykDB = null;
var storeLast = {};              // parça → son yazılan JSON metni
var storeMeta = { migratedAt: 0, mirrorSig: "", mirrorOff: false };
var storeLoadNote = "";          // açılışta kullanıcıya gösterilecek kurtarma notu
let saveQueued = false, mirrorTimer = 0, mirrorDirty = false;

function strSig(s) {   // uzunluk + FNV-1a (32 bit): aynanın dışarıdan değişip değişmediğini anlamak için
  s = String(s || "");
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return s.length + ":" + (h >>> 0).toString(36);
}
// Anahtar sırasından bağımsız JSON (geçiş doğrulaması için)
function stableStr(v) {
  if (Array.isArray(v)) return "[" + v.map(stableStr).join(",") + "]";
  if (v && typeof v === "object") return "{" + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ":" + stableStr(v[k])).join(",") + "}";
  return JSON.stringify(v === undefined ? null : v);
}
function idbReq(r) { return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
function idbOpen() {
  return new Promise((res, rej) => {
    let done = false;
    const to = setTimeout(() => { if (!done) { done = true; rej(new Error("zaman aşımı")); } }, 3000);
    try {
      if (!window.indexedDB) throw new Error("IndexedDB yok");
      const r = indexedDB.open(IDB_NAME, 1);
      r.onupgradeneeded = () => { const db = r.result; ["parts", "meta", "snaps"].forEach(n => { if (!db.objectStoreNames.contains(n)) db.createObjectStore(n); }); };
      r.onsuccess = () => {
        const db = r.result;
        db.onversionchange = () => { try { db.close(); } catch (e) {} aykDB = null; };
        if (done) { db.close(); return; }
        done = true; clearTimeout(to); res(db);
      };
      r.onerror = () => { if (!done) { done = true; clearTimeout(to); rej(r.error); } };
      r.onblocked = () => {};
    } catch (e) { if (!done) { done = true; clearTimeout(to); rej(e); } }
  });
}
function idbGet(store, key) { return idbReq(aykDB.transaction(store).objectStore(store).get(key)); }
function idbGetAll(store) {
  return new Promise((res, rej) => {
    const out = {}, tx = aykDB.transaction(store), c = tx.objectStore(store).openCursor();
    c.onsuccess = () => { const cur = c.result; if (cur) { out[cur.key] = cur.value; cur.continue(); } };
    tx.oncomplete = () => res(out); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error);
  });
}
// Birden çok mağazaya tek işlemde yazar: puts = [[store, key, value]], dels = [[store, key]]
function idbWrite(puts, dels = []) {
  return new Promise((res, rej) => {
    try {
      const stores = [...new Set([...puts, ...dels].map(x => x[0]))];
      const tx = aykDB.transaction(stores, "readwrite");
      tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error || new Error("iptal"));
      puts.forEach(([s, k, v]) => tx.objectStore(s).put(v, k));
      dels.forEach(([s, k]) => tx.objectStore(s).delete(k));
    } catch (e) { rej(e); }
  });
}
function stateParts(st) {   // state → { core, dailyLogs, … } (JSON metinleri)
  const core = { ...st }, out = {};
  STORE_PARTS.forEach(k => { out[k] = JSON.stringify(st[k] === undefined ? null : st[k]); delete core[k]; });
  out.core = JSON.stringify(core);
  return out;
}
function partsToRaw(parts) {   // { core, … } metinleri → ham nesne; okunamayan parçaların adlarını döndürür
  const bad = [];
  let raw = {};
  try { raw = JSON.parse(parts.core); if (!isObj(raw)) throw new Error("core"); } catch (e) { bad.push("core"); raw = {}; }
  STORE_PARTS.forEach(k => {
    if (parts[k] == null) return;
    try { const v = JSON.parse(parts[k]); if (v !== null) raw[k] = v; } catch (e) { bad.push(k); }
  });
  return { raw, bad };
}
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

// --- Açılış ---
async function storageInit() {
  try { aykDB = await idbOpen(); } catch (e) { aykDB = null; }
  if (!aykDB) return storageUseLegacy();
  try {
    storeMeta = { ...storeMeta, ...((await idbGet("meta", "main")) || {}) };
    const lsStr = lsGet(STORAGE_KEY);
    const lastSig = lsGet(MIRROR_SIG_KEY) || storeMeta.mirrorSig;
    if (lsGet(MIRROR_SIG_KEY)) storeMeta.mirrorSig = lsGet(MIRROR_SIG_KEY);
    const outside = lsStr != null && strSig(lsStr) !== lastSig;
    if (storeMeta.migratedAt && !outside) {
      const parts = await idbGetAll("parts");
      const { raw, bad } = partsToRaw(parts);
      if (bad.length) await storageRecoverParts(raw, bad, parts);
      state = normalizeState(raw);
      hadV5State = true;
      storeMode = "idb";
      storeLast = stateParts(state);
      bad.forEach(k => { delete storeLast[k]; });   // kurtarılan parçalar ilk kayıtta yeniden yazılır
    } else {
      await storageImportFromLocal(lsStr);
      if (storeMode !== "idb") return;
      storeLast = stateParts(state);
    }
    storeReady = true;
  } catch (e) {
    console.error(e);
    return storageUseLegacy();
  }
}
function storageUseLegacy() {
  aykDB = null;
  state = loadState();
  storeMode = "ls";
  storeReady = true;
}
// İlk geçiş ya da localStorage dışarıdan değişti: ham kayıt (v4/kurtarma mantığıyla) okunur, parçalar yazılır, geri okunup doğrulanır.
async function storageImportFromLocal(lsStr) {
  const now = Date.now(), puts = [];
  if (storeMeta.migratedAt) {   // mevcut IndexedDB hâli kaybolmasın
    const cur = await idbGetAll("parts");
    const { raw, bad } = partsToRaw(cur);
    if (!bad.length && Object.keys(cur).length) puts.push(["snaps", "import-" + now, { kind: "import", date: todayStr(), ts: now, json: JSON.stringify(raw) }]);
  } else if (lsStr != null) {
    puts.push(["snaps", "pre", { kind: "pre", date: todayStr(), ts: now, json: lsStr }]);
  }
  state = loadState();
  const parts = stateParts(state);
  Object.keys(parts).forEach(k => puts.push(["parts", k, parts[k]]));
  await idbWrite(puts);
  const back = partsToRaw(await idbGetAll("parts"));
  if (back.bad.length || stableStr(normalizeState(back.raw)) !== stableStr(normalizeState(JSON.parse(JSON.stringify(state))))) {
    console.error("depolama doğrulaması tutmadı; eski moda geçiliyor");
    return storageUseLegacy();
  }
  storeMeta = { migratedAt: storeMeta.migratedAt || now, mirrorSig: lsStr != null ? strSig(lsStr) : "", mirrorOff: false };
  try { localStorage.setItem(MIRROR_SIG_KEY, storeMeta.mirrorSig); } catch (e) {}
  await idbWrite([["meta", "main", storeMeta]]);
  await storagePruneImports();
  storeMode = "idb";
}
// Okunamayan parça: ham hâli kurtarma kopyasına (yoksa), yerine en yeni iç yedekteki aynı parça (yoksa boş).
async function storageRecoverParts(raw, bad, parts) {
  try {   // okunabilen bölümler + okunamayanların ham metni; çekirdek okunabildiyse Profil'den geri yüklenebilir
    if (!localStorage.getItem(RESCUE_KEY)) {
      const keep = { ...raw, _okunamayanBolumler: {} };
      bad.forEach(k => { keep._okunamayanBolumler[k] = String(parts[k] == null ? "" : parts[k]).slice(0, 2000000); });
      localStorage.setItem(RESCUE_KEY, JSON.stringify(keep));
    }
  } catch (e) {}
  const snaps = Object.values(await idbGetAll("snaps")).sort((a, b) => b.ts - a.ts);
  let src = null;
  for (const s of snaps) { try { src = JSON.parse(s.json); if (isObj(src)) break; } catch (e) { src = null; } }
  bad.forEach(k => {
    if (k === "core") { Object.keys(src || {}).forEach(f => { if (!STORE_PARTS.includes(f)) raw[f] = src[f]; }); }
    else if (src && src[k] !== undefined) raw[k] = src[k];
  });
  loadFailed = true;
  storeLoadNote = src ? "Kaydın bir bölümü okunamadı; o bölüm son iç yedekten geri getirildi." : "Kaydın bir bölümü okunamadı.";
}

// --- Kayıt ---
function saveState() {
  if (!storeReady) return;
  if (storeMode !== "idb") return saveStateLegacy();
  if (saveQueued) return;
  saveQueued = true;
  Promise.resolve().then(flushSave);
}
function saveStateLegacy() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    saveFailNotified = false;
  } catch (e) {
    console.error(e);
    if (!saveFailNotified) { toast("Veriler kaydedilemedi! Hemen yedek al.", "error"); saveFailNotified = true; }
  }
}
function flushSave() {
  saveQueued = false;
  if (storeMode !== "idb" || !storeReady) return;
  const parts = stateParts(state), puts = [];
  Object.keys(parts).forEach(k => { if (parts[k] !== storeLast[k]) puts.push(["parts", k, parts[k]]); });
  if (!puts.length) return;
  mirrorDirty = true;
  const onFail = e => {
    console.error(e);
    if (!saveFailNotified) { toast("Veriler kaydedilemedi! Hemen yedek al.", "error"); saveFailNotified = true; }
  };
  try {
    if (!aykDB) throw new Error("bağlantı yok");
    idbWrite(puts).then(() => { puts.forEach(([, k, v]) => { storeLast[k] = v; }); saveFailNotified = false; }, onFail);
  } catch (e) { onFail(e); }
  scheduleMirror();
}
function scheduleMirror() {
  if (storeMeta.mirrorOff) return;
  clearTimeout(mirrorTimer);
  mirrorTimer = setTimeout(writeMirror, MIRROR_DELAY_MS);
}
function writeMirror() {
  clearTimeout(mirrorTimer); mirrorTimer = 0;
  if (storeMode !== "idb" || !storeReady || storeMeta.mirrorOff || !aykDB) return;
  // localStorage'daki kayıt bizim son yazdığımız değilse (eski sürüm / yedek aracı yazdı) ezilmez; sonraki açılışta içe alınır.
  const cur = lsGet(STORAGE_KEY);
  if (cur != null && strSig(cur) !== storeMeta.mirrorSig) return;
  if (!mirrorDirty && cur != null) return;
  const s = JSON.stringify(state);
  try {
    localStorage.setItem(STORAGE_KEY, s);
    storeMeta.mirrorSig = strSig(s);
    localStorage.setItem(MIRROR_SIG_KEY, storeMeta.mirrorSig);
    mirrorDirty = false;
  } catch (e) { storeMeta.mirrorOff = true; storeMeta.mirrorSig = strSig(lsGet(STORAGE_KEY)); try { localStorage.setItem(MIRROR_SIG_KEY, storeMeta.mirrorSig); } catch (e2) {} }
  idbWrite([["meta", "main", { ...storeMeta }]]).catch(e => console.error(e));
}

// --- İç yedekler ---
async function autoSnapshot() {
  if (storeMode !== "idb" || !aykDB) return;
  try {
    const day = logicalToday(), key = "day-" + day;
    if (await idbGet("snaps", key)) return;
    await idbWrite([["snaps", key, { kind: "day", date: day, ts: Date.now(), json: JSON.stringify(state) }]]);
    await storagePruneSnaps();
  } catch (e) { console.error(e); }
}
function isoWeekKey(d) { const t = new Date(d + "T12:00:00"); t.setDate(t.getDate() - ((t.getDay() + 6) % 7)); return todayStr(t); }
// Son 7 gece "day"; daha eskiler arasında en yeni 4 haftanın her birinden en yeni kopya "week"; gerisi silinir.
async function storagePruneSnaps() {
  const all = await idbGetAll("snaps");
  const dayKeys = Object.keys(all).filter(k => all[k].kind === "day" || all[k].kind === "week").sort((a, b) => all[b].date.localeCompare(all[a].date));
  const puts = [], dels = [], weeks = new Set();
  dayKeys.forEach((k, i) => {
    const s = all[k];
    if (i < 7) { if (s.kind !== "day") puts.push(["snaps", k, { ...s, kind: "day" }]); return; }
    const w = isoWeekKey(s.date);
    if (!weeks.has(w) && weeks.size < 4) { weeks.add(w); if (s.kind !== "week") puts.push(["snaps", k, { ...s, kind: "week" }]); }
    else dels.push(["snaps", k]);
  });
  if (puts.length || dels.length) await idbWrite(puts, dels);
}
async function storagePruneImports() {
  const all = await idbGetAll("snaps");
  const imp = Object.keys(all).filter(k => all[k].kind === "import").sort((a, b) => all[b].ts - all[a].ts);
  if (imp.length > 2) await idbWrite([], imp.slice(2).map(k => ["snaps", k]));
}
async function aykSnapList() {
  if (storeMode !== "idb" || !aykDB) return [];
  const all = await idbGetAll("snaps");
  return Object.keys(all).map(k => ({ key: k, kind: all[k].kind, date: all[k].date, ts: all[k].ts, size: (all[k].json || "").length }))
    .sort((a, b) => b.ts - a.ts);
}
async function aykSnapJson(key) { if (!aykDB) return null; const s = await idbGet("snaps", key); return s ? s.json : null; }

// --- Okuma yardımcıları (Profil göstergesi, testler, kurtarma) ---
async function aykStoredState() {
  if (storeMode === "idb" && aykDB) { const { raw } = partsToRaw(await idbGetAll("parts")); return raw; }
  try { return JSON.parse(lsGet(STORAGE_KEY)); } catch (e) { return null; }
}
async function aykRawPut(store, key, value) { await idbWrite([[store, key, value]]); }
