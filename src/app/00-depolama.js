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
const MIRROR_SIG_KEY = "ayk_plus_v5_imza";   // aynanın imzası: yalnızca IndexedDB onaylıyken (eşzamanlı) yazılır
const MIRROR_OFF_KEY = "ayk_plus_v5_ayna_kapali";   // localStorage doldu, ayna eski kalmış olabilir
var storeMode = "boot";          // boot | idb | ls
var storeReady = false;          // açılış bitmeden hiçbir şey yazılmaz
var aykDB = null;
var storeLast = {};              // parça → son yazılan JSON metni
var storeMeta = { migratedAt: 0, mirrorSig: "", mirrorOff: false };
var storeLoadNote = "";          // açılışta kullanıcıya gösterilecek kurtarma notu
let saveQueued = false, mirrorTimer = 0, mirrorDirty = false;
let idbPending = 0, idbBroken = false, idbReconnecting = false, lastWrittenSig = "";
var storeReadOnly = false;      // depo açılamadı ve localStorage eski olabilir: bu açılışta yazma yok

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
function idbOpen(timeoutMs = 3000) {
  return new Promise((res, rej) => {
    let done = false;
    const to = setTimeout(() => { if (!done) { done = true; rej(new Error("zaman aşımı")); } }, timeoutMs);
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
// Aynanın imzası (ayk_plus_v5_imza) YALNIZCA IndexedDB her şeyi onayladığında yazılır. İmza yoksa ya da tutmuyorsa
// localStorage'daki kayıt en yenisidir (IndexedDB yazamadı, uygulama yazma bitmeden kapandı, eski sürüm/yedek aracı yazdı)
// ve açılışta içe alınır. Ayna dolduysa (mirrorOff) imza eski aynayı gösterir ve "ayna kapalı" işareti tutulur.
async function storageInit() {
  try { aykDB = await idbOpen(); } catch (e) { aykDB = null; }
  if (!aykDB && lsGet(MIRROR_OFF_KEY) === "1") {   // localStorage eski kalmış olabilir: bir kez daha, daha uzun dene
    try { aykDB = await idbOpen(10000); } catch (e) { aykDB = null; }
    if (!aykDB) { storageUseLegacy(); storeReadOnly = true; return; }
  }
  if (!aykDB) return storageUseLegacy();
  try {
    storeMeta = { ...storeMeta, ...((await idbGet("meta", "main")) || {}) };
    const lsStr = lsGet(STORAGE_KEY), sig = lsGet(MIRROR_SIG_KEY);
    lastWrittenSig = lsStr != null ? strSig(lsStr) : "";
    const outside = lsStr != null && strSig(lsStr) !== sig;
    if (storeMeta.migratedAt && !outside) {
      const parts = await idbGetAll("parts");
      if (parts.core == null) parts.core = "";   // çekirdek hiç yoksa okunamamış say
      const { raw, bad } = partsToRaw(parts);
      if (bad.length) await storageRecoverParts(raw, bad, parts, lsStr);
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
    if (storeMeta.mirrorOff) writeMirror(true);   // yer açıldıysa ayna yeniden çalışsın
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
// İlk geçiş ya da localStorage daha yeni: ham kayıt (v4/kurtarma mantığıyla) okunur, parçalar yazılır, geri okunup doğrulanır.
async function storageImportFromLocal(lsStr) {
  const now = Date.now(), puts = [];
  if (storeMeta.migratedAt) {   // mevcut IndexedDB hâli kaybolmasın (aynı içerik zaten yedekliyse tekrar eklenmez)
    const cur = await idbGetAll("parts");
    const { raw, bad } = partsToRaw(cur);
    if (!bad.length && cur.core) {
      const json = JSON.stringify(raw), jsig = strSig(json);
      const snaps = await idbGetAll("snaps");
      if (!Object.values(snaps).some(x => x.kind === "import" && x.sig === jsig))
        puts.push(["snaps", "import-" + now, { kind: "import", date: todayStr(), ts: now, sig: jsig, json }]);
    }
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
  storeMeta = { ...storeMeta, migratedAt: storeMeta.migratedAt || now, mirrorOff: false };
  await idbWrite([["meta", "main", storeMeta]]);
  // IndexedDB artık localStorage ile aynı: imzala
  try { if (lsStr != null) localStorage.setItem(MIRROR_SIG_KEY, strSig(lsStr)); localStorage.removeItem(MIRROR_OFF_KEY); } catch (e) {}
  await storagePruneImports();
  storeMode = "idb";
}
// Okunamayan parça. Kaynak sırası: (1) imzalı localStorage aynası (IndexedDB'nin son onaylı hâlinin birebir kopyası),
// (2) en yeni iç yedek, (3) boş. Ham metin kurtarma kopyasına (yoksa) yazılır.
async function storageRecoverParts(raw, bad, parts, lsStr) {
  try {
    if (!localStorage.getItem(RESCUE_KEY)) {
      const keep = { ...raw, _okunamayanBolumler: {} };
      bad.forEach(k => { keep._okunamayanBolumler[k] = String(parts[k] == null ? "" : parts[k]).slice(0, 2000000); });
      localStorage.setItem(RESCUE_KEY, JSON.stringify(keep));
    }
  } catch (e) {}
  let src = null, from = "";
  try { const o = lsStr ? JSON.parse(lsStr) : null; if (isObj(o)) { src = o; from = "ayna"; } } catch (e) {}
  if (!src) {
    const snaps = Object.values(await idbGetAll("snaps")).sort((a, b) => b.ts - a.ts);
    for (const s of snaps) { try { const o = JSON.parse(s.json); if (isObj(o)) { src = o; from = "yedek"; break; } } catch (e) {} }
  }
  bad.forEach(k => {
    if (k === "core") { Object.keys(src || {}).forEach(f => { if (!STORE_PARTS.includes(f)) raw[f] = src[f]; }); }
    else if (src && src[k] !== undefined) raw[k] = src[k];
  });
  loadFailed = true;
  storeLoadNote = from;
}

// --- Kayıt ---
function saveState() {
  if (!storeReady || storeReadOnly) return;
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
function storageSaveFailed(e) {
  console.error(e);
  idbBroken = true;
  storeLast = {};   // bağlantı geri gelince her şey baştan yazılır
  try { localStorage.removeItem(MIRROR_SIG_KEY); } catch (e2) {}
  writeMirror(true);   // veri hemen localStorage'a (imzasız → sonraki açılış buradan açar)
  // localStorage da yazamadıysa veri hiçbir yere kaydedilemedi: uyar. Ayna tuttuysa veri güvende (sonraki açılış oradan açar).
  if (lsGet(STORAGE_KEY) !== JSON.stringify(state) && !saveFailNotified) { toast("Veriler kaydedilemedi! Hemen yedek al.", "error"); saveFailNotified = true; }
  if (!idbReconnecting) {
    idbReconnecting = true;
    aykDB = null;
    idbOpen().then(db => { aykDB = db; idbReconnecting = false; flushSave(); }, () => { idbReconnecting = false; });
  }
}
function flushSave() {
  saveQueued = false;
  if (storeMode !== "idb" || !storeReady || storeReadOnly) return;
  const parts = stateParts(state), puts = [];
  Object.keys(parts).forEach(k => { if (parts[k] !== storeLast[k]) puts.push(["parts", k, parts[k]]); });
  if (!puts.length) return;
  const full = puts.length === Object.keys(parts).length;
  puts.forEach(([, k, v]) => { storeLast[k] = v; });   // gönderildiği anda (sıradaki yazma bununla karşılaştırır)
  mirrorDirty = true;
  if (!aykDB) { storageSaveFailed(new Error("bağlantı yok")); return; }
  idbPending++;
  try {
    idbWrite(puts).then(() => {
      idbPending--;
      if (full) idbBroken = false;
      saveFailNotified = false;
    }, e => { idbPending--; storageSaveFailed(e); });
  } catch (e) { idbPending--; storageSaveFailed(e); }
  scheduleMirror();
}
function scheduleMirror() {
  clearTimeout(mirrorTimer);
  mirrorTimer = setTimeout(() => writeMirror(), MIRROR_DELAY_MS);
}
// force: değişiklik olmasa da yaz (hata anında, ayna yeniden açılırken)
function writeMirror(force) {
  clearTimeout(mirrorTimer); mirrorTimer = 0;
  if (storeMode !== "idb" || !storeReady || storeReadOnly) return;
  if (saveQueued) flushSave();
  // localStorage'daki kayıt bizim son yazdığımız değilse (eski sürüm / yedek aracı yazdı) ezilmez; sonraki açılışta içe alınır.
  const cur = lsGet(STORAGE_KEY);
  if (cur != null && strSig(cur) !== lastWrittenSig) return;
  if (cur == null && lastWrittenSig) return;   // biz yazdıktan sonra dışarıdan silindi: yeniden oluşturma
  if (!force && !mirrorDirty && cur != null && !storeMeta.mirrorOff) return;
  const s = JSON.stringify(state), sig = strSig(s);
  const synced = idbPending === 0 && !idbBroken && !!aykDB;
  try {
    localStorage.setItem(STORAGE_KEY, s);
    lastWrittenSig = sig;
    if (synced) localStorage.setItem(MIRROR_SIG_KEY, sig); else localStorage.removeItem(MIRROR_SIG_KEY);
    mirrorDirty = false;
    if (storeMeta.mirrorOff) { storeMeta.mirrorOff = false; try { localStorage.removeItem(MIRROR_OFF_KEY); } catch (e) {} }
  } catch (e) {
    // localStorage dolu: ayna durur, eski ayna imzalı kalır (IndexedDB güncel); eski moda düşülürse yazma kapanır
    if (!storeMeta.mirrorOff) {
      storeMeta.mirrorOff = true;
      try { localStorage.setItem(MIRROR_OFF_KEY, "1"); } catch (e2) {}
      if (synced && cur != null) try { localStorage.setItem(MIRROR_SIG_KEY, strSig(cur)); } catch (e2) {}
    }
  }
  if (aykDB) idbWrite([["meta", "main", { ...storeMeta }]]).catch(err => console.error(err));
}
// İçeriği tamamen değiştiren işlemlerden önce (iç yedeğe dönme, yedek dosyası, fabrika ayarları) o anki hâl iç yedeğe
async function storageSnapshotNow() {
  if (storeMode !== "idb" || !aykDB) return;
  try {
    const now = Date.now(), json = JSON.stringify(state);
    await idbWrite([["snaps", "import-" + now, { kind: "import", date: todayStr(), ts: now, sig: strSig(json), json }]]);
    await storagePruneImports();
  } catch (e) { console.error(e); }
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
  const tomorrow = todayStr(new Date(Date.now() + 2 * DAY_MS));
  const puts = [], dels = [], weeks = new Set();
  Object.keys(all).forEach(k => { if ((all[k].kind === "day" || all[k].kind === "week") && all[k].date > tomorrow) { dels.push(["snaps", k]); delete all[k]; } });
  const dayKeys = Object.keys(all).filter(k => all[k].kind === "day" || all[k].kind === "week").sort((a, b) => all[b].date.localeCompare(all[a].date));
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
  if (imp.length > 3) await idbWrite([], imp.slice(3).map(k => ["snaps", k]));
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
