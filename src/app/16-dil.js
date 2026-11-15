// v46: dil altyapısı. Anahtar = Türkçe metin ("metin|bağlam" biçiminde bağlam Türkçe gösterimde atılır).
// Türkçe seçiliyken t() metni olduğu gibi döndürür; İngilizce EN sözlüğünden (17-sozluk-en.js), yoksa Türkçe.
const EN_PUBLIC = false;   // İngilizce herkese açıldığında true
function langAvailable() { return EN_PUBLIC || (typeof window !== "undefined" && window.AYK_TEST_EN === true); }
function curLang() {
  try { return state && state.settings && state.settings.lang === "en" && langAvailable() ? "en" : "tr"; } catch (e) { return "tr"; }
}
function locale() { return curLang() === "en" ? "en-GB" : "tr-TR"; }
function trFill(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? (typeof vars[k] === "number" ? fmtNum(vars[k]) : String(vars[k])) : m));
}
function t(key, vars) {
  let s = String(key);
  if (curLang() === "en" && typeof EN !== "undefined" && typeof EN[key] === "string") s = EN[key];
  else s = s.split("|")[0];
  return trFill(s, vars);
}
function tn(n, key, vars) {
  let s = String(key).split("|")[0];
  if (curLang() === "en" && typeof EN !== "undefined" && EN[key] && typeof EN[key] === "object") s = n === 1 ? EN[key].one : EN[key].other;
  return trFill(s, { ...(vars || {}), n });
}
// v46: dile göre gösterim yardımcıları (veri anahtarları exKey/normSearch/mobNorm hep Türkçe kalır)
function fmtDay(d, opts) { return new Date(d).toLocaleDateString(locale(), opts); }
function dayShort() { return curLang() === "en" ? ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] : ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"]; }
function upperL(s) { return String(s).toLocaleUpperCase(locale()); }
function lowerL(s) { return String(s).toLocaleLowerCase(locale()); }
