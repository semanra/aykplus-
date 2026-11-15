// ---------------------------------------------------------------------------
// DEPOLAMA (v41–v42, App Store Aşama 1). Bütün kalıcı kayıt bu katmandan geçer.
// - IndexedDB "aykplus": veri parçalara bölünür (STORE_PARTS + "core"); dokunuşta yalnızca değişen parça yazılır.
// - localStorage "ayk_plus_v5_state" SİLİNMEZ: "ayna" olarak, dokunuşlar durunca (2 sn) ve arka plana geçerken güncellenir.
// - SIRA NUMARASI (v42): her kayıt bir numara alır. IndexedDB'de parçalarla AYNI işlemde (meta.gen), localStorage'da aynadan
//   SONRA (ayk_plus_v5_sira) yazılır. Açılışta numarası büyük olan en yenidir: IndexedDB yazamadıysa / uygulama yazma bitmeden
//   kapandıysa localStorage kazanır ve içe alınır; localStorage dolduysa (eski kalır) IndexedDB kazanır.
// - İmza (ayk_plus_v5_imza) = bizim localStorage'a son yazdığımız metin. Tutmuyorsa kaydı başkası yazmıştır (eski sürüm,
//   yedek aracı, v41 öncesi kayıt) → içe alınır (önceki hâl iç yedek). Bizim yazdığımızı başkası silerse yeniden oluşturulmaz.
// - IndexedDB açılamazsa "ls" (eski) modu; localStorage eski kalmış olabilirse salt okunur açılış (kullanıcı devam diyebilir).
// - İç yedekler (snaps): günlük (son 7 gece + 4 hafta), "Geçiş öncesi", "İçe alma öncesi", "Değişiklik öncesi".
// Bu dosya yalnızca tanımlar içerir; başlatma 13-cizim-baslat.js → storageInit().then(bootApp).
// ---------------------------------------------------------------------------
const IDB_NAME = "aykplus";
const STORE_PARTS = ["dailyLogs", "exerciseHistory", "workoutLogs", "weightLogs", "mobilityLog", "mobilityRoutineLog", "measurements", "foodSnap"];
const MIRROR_DELAY_MS = 2000;
const LS_SIG_KEY = "ayk_plus_v5_imza";          // localStorage'a bizim son yazdığımız metnin imzası
const LS_GEN_KEY = "ayk_plus_v5_sira";          // localStorage aynasının sıra numarası
const MIRROR_OFF_KEY = "ayk_plus_v5_ayna_kapali"; // localStorage doldu, ayna eski kalmış olabilir
const IDB_FAIL_KEY = "ayk_plus_v5_idb_hata";    // "adet:zaman": içe alma doğrulaması tutmadı (2 kez → 7 gün eski modda kal)
const IDB_USED_KEY = "ayk_plus_v5_idb";         // bu cihazda IndexedDB kullanıldı (açılamazsa daha uzun dene)
var storeMode = "boot";          // boot | idb | ls
var storeReady = false;          // açılış bitmeden hiçbir şey yazılmaz
var storeReadOnly = false;       // depo açılamadı ve localStorage eski olabilir: kullanıcı onaylayana dek yazma yok
var aykDB = null;
var storeLast = {};              // parça → son gönderilen JSON metni
var storeMeta = { migratedAt: 0, gen: 0 };
var storeGen = 0;                // son verilen sıra numarası
var storeLoadNote = "";
let saveQueued = false, mirrorTimer = 0, mirrorDirty = false;
let idbBroken = false, idbReconnectAt = 0, lastWrittenSig = "";

function strSig(s) {   // uzunluk + FNV-1a (32 bit)
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
        db.onversionchange = () => { try { db.close(); } catch (e) {} if (aykDB === db) aykDB = null; };
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
// Birden çok mağazaya tek işlemde (atomik) yazar: puts = [[store, key, value]], dels = [[store, key]]
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
function partsToRaw(parts) {   // { core, … } metinleri → ham nesne; okunamayan parçaların adları
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
function lsGen() { const n = parseInt(lsGet(LS_GEN_KEY), 10); return n > 0 ? n : 0; }

// --- Açılış ---
async function storageInit() {
  { const [n, t] = String(lsGet(IDB_FAIL_KEY) || "0:0").split(":").map(Number);   // içe alma tutmuyor: 7 gün eski mod
    if (n >= 2 && Date.now() - t < 7 * DAY_MS) return storageUseLegacy(); }
  try { aykDB = await idbOpen(); } catch (e) { aykDB = null; }
  if (!aykDB && lsGet(IDB_USED_KEY) === "1" && lsGet(MIRROR_OFF_KEY) !== "1") {   // R3-I2: kullanılan depo geç açılıyor olabilir
    try { aykDB = await idbOpen(10000); } catch (e) { aykDB = null; }
    if (!aykDB) { storageUseLegacy(); storeGen += 1e6; return; }   // bu oturumun değişiklikleri sonra kazanır (ayna ≤ 2 sn geride olabilir)
  }
  if (!aykDB && lsGet(MIRROR_OFF_KEY) === "1") {   // localStorage eski kalmış olabilir: bir kez daha, daha uzun dene
    try { aykDB = await idbOpen(10000); } catch (e) { aykDB = null; }
    if (!aykDB) { storageUseLegacy(); storeReadOnly = true; return; }
  }
  if (!aykDB) return storageUseLegacy();
  try {
    storeMeta = { ...storeMeta, ...((await idbGet("meta", "main")) || {}) };
    const lsStr = lsGet(STORAGE_KEY), lg = lsGen();
    const outside = lsStr != null && strSig(lsStr) !== lsGet(LS_SIG_KEY);
    lastWrittenSig = lsStr != null ? strSig(lsStr) : "";
    let wantImport = !storeMeta.migratedAt || outside || (lsStr != null && lg > (storeMeta.gen || 0));
    if (wantImport && storeMeta.migratedAt && lsStr != null) {
      let ok = false; try { ok = isObj(JSON.parse(lsStr)); } catch (e) {}
      if (!ok) {   // kopya okunamıyor: IndexedDB'deki sağlam veri açılır, ham metin kurtarma kopyasına
        try { if (!localStorage.getItem(RESCUE_KEY)) localStorage.setItem(RESCUE_KEY, lsStr); } catch (e) {}
        loadFailed = true;
        wantImport = false;
      }
    }
    if (wantImport) {
      await storageImportFromLocal(lsStr, lg);
      if (storeMode !== "idb") return;
    } else {
      const parts = await idbGetAll("parts");
      if (parts.core == null) parts.core = "";   // çekirdek hiç yoksa okunamamış say
      const { raw, bad } = partsToRaw(parts);
      if (bad.length) await storageRecoverParts(raw, bad, parts, lsStr);
      state = normalizeState(raw);
      hadV5State = true;
      storeMode = "idb";
      storeGen = Math.max(storeMeta.gen || 0, lg);
      storeLast = stateParts(state);
      bad.forEach(k => { delete storeLast[k]; });   // kurtarılan parçalar ilk kayıtta yeniden yazılır
    }
    storeReady = true;
    if (lsGet(MIRROR_OFF_KEY) === "1") { mirrorDirty = true; writeMirror(true); }   // yer açıldıysa ayna yeniden çalışsın
  } catch (e) {
    console.error(e);
    return storageUseLegacy();
  }
}
function storageUseLegacy() {
  aykDB = null;
  state = loadState(!window.indexedDB);   // v44: yeni kurulum yalnızca IndexedDB gerçekten yoksa (geçici hata/zaman aşımı kurulumu açmaz)
  storeGen = lsGen();
  storeMode = "ls";
  storeReady = true;
}
// Salt okunur açılışta kullanıcı "bu verilerle devam" derse: localStorage'daki hâl bundan sonra en yeni sayılır.
function storageContinueReadOnly() {
  storeReadOnly = false;
  storeGen += 1e9;
  try { localStorage.removeItem(MIRROR_OFF_KEY); } catch (e) {}
  saveState();
  toast("Bu verilerle devam ediliyor");
}
// İlk geçiş ya da localStorage daha yeni / dışarıdan yazılmış: ham kayıt (v4/kurtarma mantığıyla) okunur, parçalar
// yazılır, geri okunup doğrulanır. Mevcut IndexedDB hâli önce "İçe alma öncesi" iç yedeği olur.
async function storageImportFromLocal(lsStr, lg) {
  const now = Date.now(), puts = [];
  if (storeMeta.migratedAt) {
    const cur = await idbGetAll("parts");
    const { raw, bad } = partsToRaw(cur);
    if (!bad.length && cur.core) await storageAddSnap("import", JSON.stringify(raw), puts);
  } else if (lsStr != null) {
    puts.push(["snaps", "pre", { kind: "pre", date: todayStr(), ts: now, json: lsStr }]);
  }
  state = loadState(!storeMeta.migratedAt);   // v44: IndexedDB sorunsuz açıldı ve hiç geçirilmedi → yeni kurulum olabilir
  storeGen = Math.max(storeMeta.gen || 0, lg) + 1;
  const parts = stateParts(state);
  Object.keys(parts).forEach(k => puts.push(["parts", k, parts[k]]));
  const meta = { ...storeMeta, migratedAt: storeMeta.migratedAt || now, gen: storeGen };
  puts.push(["meta", "main", meta]);
  await idbWrite(puts);
  const back = partsToRaw(await idbGetAll("parts"));
  if (back.bad.length || stableStr(normalizeState(back.raw)) !== stableStr(normalizeState(JSON.parse(JSON.stringify(state))))) {
    console.error("depolama doğrulaması tutmadı; eski moda geçiliyor");
    try { localStorage.setItem(IDB_FAIL_KEY, ((parseInt(String(lsGet(IDB_FAIL_KEY) || "0").split(":")[0], 10) || 0) + 1) + ":" + Date.now()); } catch (e) {}
    return storageUseLegacy();
  }
  storeMeta = meta;
  // localStorage'daki kayıt artık bizim: imzası ve numarası (içeriğine dokunulmaz)
  try {
    if (lsStr != null) { localStorage.setItem(LS_SIG_KEY, strSig(lsStr)); localStorage.setItem(LS_GEN_KEY, String(storeGen)); }
    localStorage.removeItem(IDB_FAIL_KEY);
    localStorage.setItem(IDB_USED_KEY, "1");
  } catch (e) {}
  await storagePruneSnapKind("import", 3);
  storeMode = "idb";
}
// Okunamayan parça. Kaynak: (1) localStorage aynası, (2) en yeni iç yedek, (3) boş. Ham metin kurtarma kopyasına (yoksa).
async function storageRecoverParts(raw, bad, parts, lsStr) {
  try {
    if (!localStorage.getItem(RESCUE_KEY)) {
      const keep = { ...raw, _okunamayanBolumler: {} };
      bad.forEach(k => { keep._okunamayanBolumler[k] = String(parts[k] == null ? "" : parts[k]).slice(0, 2000000); });
      localStorage.setItem(RESCUE_KEY, JSON.stringify(keep));
    }
  } catch (e) {}
  let src = null;
  try { const o = lsStr ? JSON.parse(lsStr) : null; if (isObj(o)) src = o; } catch (e) {}
  if (!src) {
    const snaps = Object.values(await idbGetAll("snaps")).sort((a, b) => b.ts - a.ts);
    for (const s of snaps) { try { const o = JSON.parse(s.json); if (isObj(o)) { src = o; break; } } catch (e) {} }
  }
  bad.forEach(k => {
    if (k === "core") { Object.keys(src || {}).forEach(f => { if (!STORE_PARTS.includes(f)) raw[f] = src[f]; }); }
    else if (src && src[k] !== undefined) raw[k] = src[k];
  });
  loadFailed = true;
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
  const s = JSON.stringify(state);
  try {
    localStorage.setItem(STORAGE_KEY, s);
    storeGen++;
    try { localStorage.setItem(LS_GEN_KEY, String(storeGen)); localStorage.setItem(LS_SIG_KEY, strSig(s)); } catch (e) {}
    saveFailNotified = false;
  } catch (e) {
    console.error(e);
    if (!saveFailNotified) { toast("Veriler kaydedilemedi! Hemen yedek al.", "error"); saveFailNotified = true; }
  }
}
function storageSaveFailed(e) {
  console.error(e);
  idbBroken = true;
  storeGen++;       // localStorage kopyası, IndexedDB'nin onayladığı her numaradan büyük olsun
  storeLast = {};   // bağlantı geri gelince her şey baştan yazılır
  mirrorDirty = true;
  writeMirror(true);   // localStorage'a, IndexedDB'dekinden büyük numarayla (sonraki açılış buradan açar)
  if (lsGet(STORAGE_KEY) !== JSON.stringify(state) && !saveFailNotified) { toast("Veriler kaydedilemedi! Hemen yedek al.", "error"); saveFailNotified = true; }
  const now = Date.now();
  if (now - idbReconnectAt > 10000) {   // en fazla 10 sn'de bir yeniden bağlanma
    idbReconnectAt = now;
    aykDB = null;
    idbOpen().then(db => { aykDB = db; if (storeMode === "idb") flushSave(); }, () => {});
  }
}
function flushSave() {
  saveQueued = false;
  if (storeMode !== "idb" || !storeReady || storeReadOnly) return;
  const parts = stateParts(state), puts = [];
  Object.keys(parts).forEach(k => { if (parts[k] !== storeLast[k]) puts.push(["parts", k, parts[k]]); });
  if (!puts.length) return;
  const full = puts.length === Object.keys(parts).length;
  storeGen++;
  puts.forEach(([, k, v]) => { storeLast[k] = v; });   // gönderildiği anda (sıradaki yazma bununla karşılaştırır)
  puts.push(["meta", "main", { ...storeMeta, gen: storeGen }]);
  mirrorDirty = true;
  if (!aykDB) { storageSaveFailed(new Error("bağlantı yok")); return; }
  try {
    idbWrite(puts).then(() => { if (full) idbBroken = false; saveFailNotified = false; }, storageSaveFailed);
  } catch (e) { storageSaveFailed(e); }
  scheduleMirror();
}
function scheduleMirror() {
  clearTimeout(mirrorTimer);
  mirrorTimer = setTimeout(() => writeMirror(), MIRROR_DELAY_MS);
}
// Aynayı yazar: önce metin, sonra numara ve imza (metin yazılamazsa hiçbiri değişmez). force: değişiklik olmasa da yaz.
function writeMirror(force) {
  clearTimeout(mirrorTimer); mirrorTimer = 0;
  if (storeMode !== "idb" || !storeReady || storeReadOnly) return;
  if (saveQueued) flushSave();
  const cur = lsGet(STORAGE_KEY);
  if (cur != null && strSig(cur) !== lastWrittenSig) return;   // başkası yazdı: ezme
  if (cur == null && lastWrittenSig) return;                    // biz yazdıktan sonra silindi: yeniden oluşturma
  if (!force && !mirrorDirty && cur != null) return;
  const s = JSON.stringify(state), sig = strSig(s);
  try {
    localStorage.setItem(STORAGE_KEY, s);
    lastWrittenSig = sig;
    mirrorDirty = false;
    localStorage.setItem(LS_GEN_KEY, String(storeGen));
    localStorage.setItem(LS_SIG_KEY, sig);
    localStorage.removeItem(MIRROR_OFF_KEY);
  } catch (e) {
    // localStorage dolu: ayna eski metniyle ve eski numarasıyla kalır → açılışta IndexedDB kazanır
    try { localStorage.setItem(MIRROR_OFF_KEY, "1"); } catch (e2) {}
  }
}
// İçeriği tamamen değiştiren işlemlerden önce (iç yedeğe dönme, yedek dosyası, fabrika ayarları) o anki hâl iç yedeğe
async function storageSnapshotNow() {
  if (storeMode !== "idb" || !aykDB) return;
  try {
    const puts = [];
    await storageAddSnap("safe", JSON.stringify(state), puts);
    if (puts.length) await idbWrite(puts);
    await storagePruneSnapKind("safe", 3);
  } catch (e) { console.error(e); }
}
// Aynı içerik o türde zaten yedekliyse tekrar eklenmez
async function storageAddSnap(kind, json, puts) {
  const sig = strSig(json), now = Date.now();
  const snaps = await idbGetAll("snaps");
  if (Object.values(snaps).some(x => x.kind === kind && x.sig === sig)) return;
  puts.push(["snaps", kind + "-" + now, { kind, date: todayStr(), ts: now, sig, json }]);
}
async function storagePruneSnapKind(kind, keep) {
  const all = await idbGetAll("snaps");
  const ks = Object.keys(all).filter(k => all[k].kind === kind).sort((a, b) => all[b].ts - all[a].ts);
  if (ks.length > keep) await idbWrite([], ks.slice(keep).map(k => ["snaps", k]));
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
