// ---------------------------------------------------------------------------
// v51 — İNGİLİZCE BESİN ADLARI: foods-en.js (USDA'nın kendi adları/porsiyon etiketleri) yalnızca dil İngilizceyken
// yüklenir; gösterim yardımcıları besin nesnesini DEĞİŞTİRMEZ (kayıt/menü/foodSnap Türkçe + kimlik tabanlı kalır).
// Not: t() ve EN bu dosyadaki işlevler çağrılana dek tanımlıdır; üst düzeyde çağrılmaz.
// ---------------------------------------------------------------------------
var BASE_EN = {};   // uygulamanın kendi listesi (BASE_FOOD_DB kimliği → İngilizce ad); v51 görev 3'te doldurulur
let _baseIdMap = null;
function baseIdOf(f) {
  if (!_baseIdMap) {
    _baseIdMap = new Map();
    try { Object.keys(BASE_FOOD_DB).forEach(id => _baseIdMap.set(BASE_FOOD_DB[id], id)); } catch (e) { /* yoksay */ }
  }
  return _baseIdMap.get(f);
}
function foodEnEntry(f) {
  if (!f || typeof f.src !== "number" || typeof USDA_EN === "undefined") return null;
  const e = USDA_EN["u" + f.src];
  return Array.isArray(e) ? e : null;
}
// Besin adı (gösterim). İngilizce değilse veya İngilizce ad yoksa f.name aynen döner.
function foodNameL(f) {
  if (!f) return "";
  if (curLang() !== "en" || f._lost) return f.name;
  const e = foodEnEntry(f);
  if (e && e[0]) return e[0];
  const b = baseIdOf(f);
  if (b && Object.prototype.hasOwnProperty.call(BASE_EN, b)) return BASE_EN[b];
  return f.name;
}
// Hazır porsiyon adı (gösterim): USDA besininde i. porsiyonun kendi İngilizce etiketi; yoksa verilen etiket.
function portionL(f, i, label) {
  if (curLang() !== "en") return label;
  const e = foodEnEntry(f);
  return e && Array.isArray(e[1]) && typeof e[1][i] === "string" && e[1][i] ? e[1][i] : label;
}
let _foodsEnP = null;
// foods-en.js'i bir kez yükler (yalnızca İngilizcede). Bitince birleşik tablo yenilenir ve ekran yeniden çizilir.
// Hata → false, sessiz (Türkçe adlar görünmeye devam eder; sonraki dil değişiminde yeniden denenir).
function loadFoodsEn() {
  if (curLang() !== "en") return Promise.resolve(false);
  if (typeof USDA_EN !== "undefined") return Promise.resolve(true);
  if (_foodsEnP) return _foodsEnP;
  _foodsEnP = new Promise(resolve => {
    try {
      const s = document.createElement("script");
      s.src = "foods-en.js";
      s.onload = () => {
        const ok = typeof USDA_EN !== "undefined";
        _foodsEnP = null;
        if (ok) { try { invalidateFoodDB(); renderAll(); } catch (e) { console.error(e); } }
        resolve(ok);
      };
      s.onerror = () => { _foodsEnP = null; try { s.remove(); } catch (e) { /* yoksay */ } resolve(false); };
      document.head.appendChild(s);
    } catch (e) { _foodsEnP = null; resolve(false); }
  });
  return _foodsEnP;
}
