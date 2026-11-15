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
  return str.replace(/\{(\w+)\}/g, (m, k) => (Object.prototype.hasOwnProperty.call(vars, k) ? (typeof vars[k] === "number" ? fmtNum(vars[k]) : String(vars[k])) : m));
}
// İngilizce giriş: yalnızca sözlüğün KENDİ anahtarı (constructor gibi prototip adları sayılmaz)
function enEntry(key) {
  if (curLang() !== "en" || typeof EN === "undefined" || !Object.prototype.hasOwnProperty.call(EN, key)) return undefined;
  return EN[key];
}
function t(key, vars) {
  let s = String(key).split("|")[0];
  const e = enEntry(key);
  if (typeof e === "string") s = e;
  else if (e && typeof e === "object" && typeof e.other === "string") s = e.other;
  return trFill(s, vars);
}
function tn(n, key, vars) {
  let s = String(key).split("|")[0];
  const e = enEntry(key);
  if (typeof e === "string") s = e;
  else if (e && typeof e === "object") {
    const one = Number(n) === 1, pick = one ? e.one : e.other, alt = one ? e.other : e.one;
    if (typeof pick === "string") s = pick; else if (typeof alt === "string") s = alt;
  }
  return trFill(s, { ...(vars || {}), n });
}
// v46: dile göre gösterim yardımcıları (veri anahtarları exKey/normSearch/mobNorm hep Türkçe kalır)
function fmtDay(d, opts) { return new Date(d).toLocaleDateString(locale(), opts); }
function dayShort() { return curLang() === "en" ? ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] : ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"]; }
function upperL(s) { return String(s).toLocaleUpperCase(locale()); }
function lowerL(s) { return String(s).toLocaleLowerCase(locale()); }

// v46: statik metinler ([data-t] = Türkçe metin). Türkçede ve dil hiç değişmemişken DOM'a dokunulmaz.
let i18nTouched = false;
function applyStaticI18n(root) {
  root = root || document;
  if (curLang() === "tr" && !i18nTouched) return;
  document.documentElement.lang = curLang();
  root.querySelectorAll("[data-t]").forEach(el => { const v = t(el.dataset.t); if (el.textContent !== v) el.textContent = v; });
  root.querySelectorAll("[data-t-aria]").forEach(el => el.setAttribute("aria-label", t(el.dataset.tAria)));
  root.querySelectorAll("[data-t-ph]").forEach(el => el.setAttribute("placeholder", t(el.dataset.tPh)));
}
function setLang(l) {
  l = l === "en" && langAvailable() ? "en" : "tr";
  if (state.settings.lang === l && !i18nTouched) return;
  state.settings.lang = l;
  i18nTouched = true;
  try { if (typeof uiDlg !== "undefined" && uiDlg) uiDialogDone(false); } catch (e) { /* yoksay */ }
  applyStaticI18n();
  renderAll();
  if (!$("profilePage").classList.contains("hidden")) renderProfile();
}
