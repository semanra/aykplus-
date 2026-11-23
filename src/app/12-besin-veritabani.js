// ============================================================================
// v18 — BESİN VERİTABANI: USDA (foods.js), akıllı arama, porsiyonlar, bulunamayan aramalar
// ============================================================================
const FOOD_PAGE = 60;   // listede bir seferde gösterilen sonuç
// Aramada eş anlamlı / pişirme kelimeleri (normalleştirilmiş yazımla)
const SEARCH_SYN = {
  pismis: ["pismis", "izgara", "haslanmis", "firinda", "kizartilmis", "tavada", "kavrulmus", "pisirilmis"],
  haslama: ["haslanmis", "haslama"], haslanmis: ["haslanmis", "haslama"],
  kizartma: ["kizartilmis", "kizartma"], kizarmis: ["kizartilmis", "kizarmis"],
  firin: ["firinda", "firin"], izgara: ["izgara"], cig: ["cig"],
  pilic: ["tavuk", "pilic"], tavuk: ["tavuk", "pilic"], dana: ["dana", "sigir"], sigir: ["dana", "sigir"],
  kuzu: ["kuzu"], koyun: ["kuzu", "koyun"], yagsiz: ["yagsiz", "az yagli", "light"], light: ["light", "yagsiz", "az yagli"],
  ekmek: ["ekmek", "ekmegi"], peynir: ["peynir", "peyniri"], yogurt: ["yogurt", "yogurdu"], sut: ["sut", "sutu"],
  corba: ["corba", "corbasi"], pilav: ["pilav", "pilavi"], salata: ["salata", "salatasi"], tatli: ["tatli", "tatlisi"]
};
// Kısa Damerau–Levenshtein (yazım hatası toleransı için)
function editDist(a, b) {
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 2) return 3;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    const c = a[i - 1] === b[j - 1] ? 0 : 1;
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[m][n];
}
let _sIdx = null, _sIdxDb = null;
const _sEntry = new WeakMap();   // v26: besin nesnesi başına hazır arama kaydı (her renderAll'da yeniden hesaplanmasın)
function searchIndex() {
  const db = getFoodDB();
  if (_sIdx && _sIdxDb === db) return _sIdx;
  _sIdx = {};
  Object.keys(db).forEach(id => {
    const f = db[id];
    if (isHiddenFood(f)) return;
    // v51: İngilizcede besinin İngilizce adı da aranır (Türkçe ad + eş anlamlılar kalır); Türkçede enName "" → eski kayıtla aynı
    const dn = foodNameL(f), enName = dn !== f.name ? dn : "";
    const src = f.name + "|" + (f.cat || "") + "|" + (f.aliases || []).join(" ") + (enName ? "|en:" + enName : "");
    const old = _sEntry.get(f);
    if (old && old.src === src) { _sIdx[id] = old; return; }   // özel besin yerinde düzenlenirse src değişir → yeniden hesaplanır
    const trName = normSearch(stripEmoji(f.name).replace(/^⭐\s*/, ""));
    const name = enName ? normSearch(stripEmoji(enName).replace(/^⭐\s*/, "")) : trName;
    const name2 = enName ? trName : "";   // İngilizcede Türkçe ad ikinci ad (Türk yemekleri Türkçe kalır; "kıyma" da bulunur)
    const extra = normSearch((f.aliases || []).join(" ") + " " + stripEmoji(f.cat || ""));
    const tokens = (name + " " + name2 + " " + extra).split(/[^a-z0-9%]+/).filter(tk => tk.length > 1);
    const e = { src, name, name2, nameTok: (name + " " + name2).split(/[^a-z0-9%]+/).filter(Boolean), extra, tokens };
    _sEntry.set(f, e);
    _sIdx[id] = e;
  });
  _sIdxDb = db;
  return _sIdx;
}
// Tek kelimenin bir besine uyum puanı (0 = uymuyor). fuzzy = yazım hatası taraması (yavaş; v26'dan beri yalnızca az sonuçta)
function wordScore(w, e, fuzzy = true) {
  const alts = SEARCH_SYN[w] || [w];
  let best = 0;
  for (const a of alts) {
    if (e.nameTok.some(tk => tk.startsWith(a))) best = Math.max(best, 150);
    else if (e.name.includes(a) || (e.name2 && e.name2.includes(a))) best = Math.max(best, 100);
    else if (e.extra.includes(a)) best = Math.max(best, 60);
  }
  if (best || !fuzzy || w.length < 4) return best;
  for (const tk of e.tokens) if (fuzzyTokHit(w, tk)) return 25;
  return 0;
}
// v26: kelime–token yazım hatası sonucu hatırlanır (aynı token yüzlerce besinde geçiyor)
const _fzMemo = new Map();
function fuzzyTokHit(w, tk) {
  const key = w + "|" + tk;
  let r = _fzMemo.get(key);
  if (r !== undefined) return r;
  r = false;
  const k = w.length >= 7 ? 2 : 1;
  for (const L of [w.length - 1, w.length, w.length + 1]) {
    if (L < 3 || L > tk.length) continue;
    if (editDist(w, tk.slice(0, L)) <= k) { r = true; break; }
  }
  if (_fzMemo.size > 200000) _fzMemo.clear();
  _fzMemo.set(key, r);
  return r;
}
// Sıralama: sık kullanılanlar > tam eşleşme > kelimeyle başlayan > içinde geçen (> eş anlamlı > yazım hatası)
const FUZZY_MIN = 10;   // v26: normal eşleşme bundan azsa yazım hatası taraması da yapılır
function searchFoods(ids, q) {
  const r = searchFoodsPass(ids, q, false);
  if (r.length >= FUZZY_MIN || !q.split(/\s+/).some(w => w.length >= 4)) return r;
  return searchFoodsPass(ids, q, true);
}
function searchFoodsPass(ids, q, fuzzy) {
  const idx = searchIndex();
  const words = q.split(/\s+/).filter(Boolean);
  const freq = new Set(frequentFoodsCached(40));
  const out = [];
  ids.forEach(id => {
    const e = idx[id];
    if (!e) return;
    let sc = 0, inName = true;
    for (const w of words) { const s = wordScore(w, e, fuzzy); if (!s) return; sc += s; if (s < 100) inName = false; }
    if (e.name === q || e.name2 === q) sc += 600;
    else if (e.name.startsWith(q) || (e.name2 && e.name2.startsWith(q))) sc += 300;
    if (freq.has(id) && inName) sc += 1000;   // sık kullanılan önceliği yalnızca adı eşleşince (kategori/eş anlamlıyla değil)
    if (!USDA_DB[id]) sc += 40;            // uygulamanın kendi listesi ve özel besinler önce
    sc -= e.name.length * 0.3;
    out.push([id, sc]);
  });
  return out.sort((a, b) => b[1] - a[1]).map(x => x[0]);
}
// Arama yokken "Tümü": sık kullanılanlar, sonra uygulamanın kendi listesi, sonra veritabanı
function rankBrowse(ids) {
  const freq = frequentFoods(40);
  const fs = new Set(freq);
  const custom = ids.filter(id => !fs.has(id) && state.customFoods[id]);
  const own = ids.filter(id => !fs.has(id) && !USDA_DB[id] && !state.customFoods[id]);
  const usda = ids.filter(id => !fs.has(id) && USDA_DB[id]);
  return [...freq.filter(id => ids.includes(id)), ...custom, ...own, ...usda];
}
function noResultHtml(q) {
  if (!q) return `<div class="text-[14px] n-muted text-center py-8">${t("Bu kategoride besin yok.")}</div>`;
  return `<div id="noResult" class="text-center py-5 space-y-3">
      <p class="text-[14px] n-muted">${t('"{q}" bulunamadı. Şunlardan birini dene:', { q: esc(q) })}</p>
      <div class="grid gap-2">
        <button onclick="openBarcode()" class="n-btn-outline h-12 rounded-full text-[14px]">${t("Barkod okut")}</button>
        <button onclick="newFoodFromSearch()" class="n-btn-outline h-12 rounded-full text-[14px]">${t("Özel besin oluştur")}</button>
        <button onclick="newRecipeFromSearch()" class="n-btn-outline h-12 rounded-full text-[14px]">${t("Tarif oluştur")}</button>
      </div>
    </div>`;
}
function newFoodFromSearch() { const q = $("foodSearch").value.trim(); openCustomFoodModal(); $("cfName").value = q.slice(0, 50); }
function newRecipeFromSearch() { const q = $("foodSearch").value.trim(); openRecipeModal(); $("rcName").value = q.slice(0, 50); }

// Bulunamayan aramalar: yazmayı bıraktıktan 1,5 sn sonra hâlâ sonuç yoksa kaydedilir (yalnızca bu telefonda)
let missTimer = null;
function noteMissSearch(raw) {
  clearTimeout(missTimer);
  const q = String(raw || "").trim();
  if (q.length < 3) return;
  missTimer = setTimeout(() => {
    if ($("foodSearch").value.trim() !== q) return;
    const k = normSearch(q);
    const ex = state.missSearches.find(x => normSearch(x.q) === k);
    if (ex) { ex.n = num(ex.n, 1) + 1; ex.ts = Date.now(); }
    else state.missSearches.unshift({ q: q.slice(0, 40), n: 1, ts: Date.now() });
    state.missSearches = state.missSearches.slice(0, 50);
    saveState();
  }, 1500);
}
function cancelMissSearch() { clearTimeout(missTimer); }
function clearMissSearches() {   // v26: Geri al
  snapshot(); state.missSearches = []; saveState(); renderMissList();
  toast(t("Bulunamayan aramalar temizlendi"), "ok", { label: t("Geri al"), fn: () => { doUndo(); renderMissList(); } });
}
function renderMissList() {
  const el = $("missList");
  if (!el) return;
  const l = state.missSearches || [];
  el.innerHTML = l.length
    ? l.map(x => `<span class="px-3 py-2 rounded-full bg-[var(--t-elev)] text-[13px]" data-miss="${esc(x.q)}">${esc(x.q)}${num(x.n, 1) > 1 ? ` <span class="text-[var(--t-dim)]">×${num(x.n, 1)}</span>` : ""}</span>`).join("")
    : `<span class="text-[13px] text-[var(--t-dim)]">${t("Henüz yok.")}</span>`;
  $("missClear").classList.toggle("hidden", !l.length);
}
// Besin kartındaki kaynak satırı
function foodSourceText(f) {
  if (f.src === "tarif") return t("Tarif hesaplaması (yaklaşık), USDA malzemeleriyle");
  if (f.brand && f.srcSite) { const [y, m] = String(f.srcDate || "").split("-"); return t("Kaynak: {b} ({s}), {d} kontrolü. Tarif değişebilir; paketteki etiketi esas al.", { b: f.brand, s: f.srcSite, d: m && y ? m + "." + y : "" }); }   // v66
  if (typeof f.src === "number") return `USDA FoodData Central · ${f.src}`;
  return "";
}


// ---------------------------------------------------------------------------
// v65: BESİN GRUPLARI (yalnız gösterim; kayıttaki kimlik ve cat alanları DEĞİŞMEZ). Plan: docs/PLAN-v65-besin-kategorileri.md
// ---------------------------------------------------------------------------
const FOOD_GROUPS = [
  ["et", "Et, tavuk ve balık"], ["sut", "Süt ürünleri ve yumurta"], ["tahil", "Tahıllar ve ekmek"], ["bakla", "Baklagiller"],
  ["sebze", "Sebzeler"], ["meyve", "Meyveler"], ["kuru", "Kuruyemiş ve yağlar"], ["kahvalti", "Kahvaltılıklar"],
  ["atistirma", "Atıştırmalık ve tatlılar"], ["icecek", "İçecekler"], ["fast", "Fast food ve hazır yemek"], ["turk", "Türk mutfağı"],
  ["sos", "Sos, çorba ve baharat"], ["takviye", "Takviyeler"], ["diger", "Diğer"],
];
// kategori adı (emojisiz) → grup: FOOD_CAT_GROUP (src/data.js; kategori adları veri katmanı, Türkçe)
// uygulamanın kendi listesinde kategorisi karışık olanlar (ör. "Karbonhidratlar" içindeki muz)
const FOOD_ID_GROUP = { hindi_fume: "et", whey_shake: "takviye", greens_scoop: "takviye", patates: "sebze", tatli_patates: "sebze",
  muz: "meyve", yesil_elma: "meyve", avokado: "meyve", zeytin: "kahvalti" };
// Grup anahtarı; kullanıcının kendi besin/tarifi için "" (onlar kendi çiplerinde)
function foodGroupOf(id, f) {
  if (!f || String(id).startsWith("custom_")) return "";
  return FOOD_ID_GROUP[id] || FOOD_CAT_GROUP[stripEmoji(f.cat || "")] || "diger";
}
function foodGroupName(g) {
  if (g === "") return "";
  const x = FOOD_GROUPS.find(([k]) => k === g);
  return x ? t(x[1]) : t("Diğer");
}
// Süzgeçler: yüksek protein (kalorinin ≥ %30'u proteinden), düşük kalori (g/ml: 100 g'da ≤ 100 kcal; diğer birimler: 1 birimde ≤ 100 kcal)
function foodHighProtein(f) { const k = kcalPerUnit(f); return k > 0 && (num(f.p) * 4) / k >= 0.3; }
function foodLowCal(f) { const k = kcalPerUnit(f); if (f.drink || f.cat === "İçecekler") return f.unit === "ml" || f.unit === "g" ? k * 100 <= 20 : k <= 20; return (f.unit === "g" || f.unit === "ml") ? k * 100 <= 100 : k <= 100; }
// v66: içecek mi? (markalı içecek, USDA İçecekler grubu, kullanıcının "İçecek" olarak eklediği)
function isDrinkFood(id, f) { return !!f && (f.drink === true || foodGroupOf(id, f) === "icecek"); }
function isFavFood(id) { return (state.favFoods || []).includes(id); }
function toggleFavFood(id) {
  if (!Array.isArray(state.favFoods)) state.favFoods = [];
  const on = !state.favFoods.includes(id);
  state.favFoods = on ? [id, ...state.favFoods].slice(0, FAV_FOODS_MAX) : state.favFoods.filter(x => x !== id);
  toast(on ? t("Favorilere eklendi") : t("Favorilerden çıkarıldı"));
  renderAll();
}
const FAV_FOODS_MAX = 300;
const FOOD_TOP_HITS = 5;   // v65: gruplu aramada başlıksız/üstte kalan en iyi sonuç sayısı
