// v46: dil altyapısı. Anahtar = Türkçe metin ("metin|bağlam" biçiminde bağlam Türkçe gösterimde atılır).
// Türkçe seçiliyken t() metni olduğu gibi döndürür; İngilizce EN sözlüğünden (17-sozluk-en.js), yoksa Türkçe.
const EN_PUBLIC = true;   // v52: İngilizce herkese açık (AYK_TEST_EN bayrağı artık etkisiz ama zararsız)
function langAvailable() { return EN_PUBLIC || (typeof window !== "undefined" && window.AYK_TEST_EN === true); }
function curLang() {
  try { return state && state.settings && state.settings.lang === "en" && langAvailable() ? "en" : "tr"; } catch (e) { return "tr"; }
}
function locale() { return curLang() === "en" ? "en-GB" : "tr-TR"; }
// v47: kayıtlı tarih etiketi kullanıcı verisidir ve çevrilmez; yalnızca sistemin yazdığı "Başlangıç" çevrilir (kayıtlı-metinler kural 1)
function logDateLabel(d) { return d === "Başlangıç" ? t("Başlangıç") : d; }
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
// v47 (M7): düğüm listeleri önbellekte (data-t yalnız statik işaretlemede; JS ile eklenen data-t yok). Yeniden tarama:
// setLang / kurulumda dil seçimi (rescan), önbellekteki bir düğüm DOM'dan çıkmışsa, ya da belirli bir bölge (root) verilince.
let i18nTouched = false, i18nNodes = null;
function i18nCollect(root) {
  return { t: [...root.querySelectorAll("[data-t]")], a: [...root.querySelectorAll("[data-t-aria]")], p: [...root.querySelectorAll("[data-t-ph]")] };
}
function applyStaticI18n(root, rescan) {
  if (curLang() === "tr" && !i18nTouched) return;
  i18nTouched = true;   // DOM çevrildi; Türkçeye dönülünce (yedek, iç yedek, fabrika) eski metin geri yazılmalı
  document.documentElement.lang = curLang();
  let c;
  if (root && root !== document) { c = i18nCollect(root); i18nNodes = null; }
  else {
    if (rescan || !i18nNodes || i18nNodes.t.some(el => !el.isConnected)) i18nNodes = i18nCollect(document);
    c = i18nNodes;
  }
  c.t.forEach(el => { const v = t(el.dataset.t); if (el.textContent !== v) el.textContent = v; });
  c.a.forEach(el => el.setAttribute("aria-label", t(el.dataset.tAria)));
  c.p.forEach(el => el.setAttribute("placeholder", t(el.dataset.tPh)));
}
function setLang(l) {
  l = l === "en" && langAvailable() ? "en" : "tr";
  if (state.settings.lang === l && !i18nTouched) return;
  state.settings.lang = l;
  i18nTouched = true;
  try { if (typeof uiDlg !== "undefined" && uiDlg) uiDialogDone(false); } catch (e) { /* yoksay */ }
  applyStaticI18n(null, true);
  try { if (typeof profileIsOpen === "function" && profileIsOpen()) { fillProfileFields(); updateWaterAutoHint(); updateBfHint(); if ($("pfSnaps").closest("details").open) renderSnapList(); } } catch (e) { /* yoksay */ }   // v47: kutulardaki sayılar (80,5 / 80.5) yeni dile göre
  renderAll();   // Profil açıksa renderAll içinde yeniden çizilir
  loadFoodsEn();   // v51: İngilizce besin adları (yalnızca İngilizcede; bitince yeniden çizer)
}
