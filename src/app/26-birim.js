// ---------------------------------------------------------------------------
// v53 — BİRİMLER: settings.units = "metric" | "imperial" (dilden bağımsız; yeni kayıtta telefonun bölgesine göre).
// Kayıt HER ZAMAN kg / cm; bu dosyadaki yardımcılar yalnız gösterim ve giriş içindir. Metrikte her yardımcı girdisini
// aynen döndürür ve biçimleyiciler bugünkü metni birebir verir (fmtW(kg) === fmtKg(kg) + " kg").
// Set kilosu: lb'de girilen değer kg'a çevrilip 3 ondalıkla saklanır, gösterimde en yakın 0,5 lb'ye yuvarlanır
// (45 / 95 / 135 / 225 / 2,5 lb gidiş-dönüş birebir). Vücut kilosu lb'de 1 ondalık (kayıt kg, 1 ondalık); boy ft + in
// (tam inç), ölçüler in (1 ondalık). Not: t()/state bu dosyada üst düzeyde kullanılmaz (açılış async).
// ---------------------------------------------------------------------------
const LB_KG = 0.45359237, IN_CM = 2.54;
const PLATES_LB = [45, 35, 25, 10, 5, 2.5];

// Yeni kurulum: navigator.language bölge alt etiketi "US" (en-US, es-US, en-Latn-US) → imperial
function regionImperial() {
  try { return String((typeof navigator !== "undefined" && navigator.language) || "").split(/[-_]/).slice(1).some(x => x.toUpperCase() === "US"); }
  catch (e) { return false; }
}
function isImperial() { return !!(state && state.settings && state.settings.units === "imperial"); }
function wUnit() { return isImperial() ? "lb" : "kg"; }
function lenUnit() { return isImperial() ? "in" : "cm"; }

// Set / plaka kilosu
function kgToDisp(kg) { return isImperial() ? Math.round(num(kg) / LB_KG * 2) / 2 : kg; }
function dispToKg(v) { return isImperial() ? Math.round(num(v) * LB_KG * 1000) / 1000 : v; }
// Vücut kilosu (kilo, hedef, tartılar): lb 1 ondalık, kayıt kg 1 ondalık
function bodyKgToDisp(kg) { return isImperial() ? round1(num(kg) / LB_KG) : kg; }
function bodyDispToKg(v) { return isImperial() ? round1(num(v) * LB_KG) : v; }
// Ölçüler (cm ↔ in, 1 ondalık in; kayıt cm 2 ondalık)
function cmToDisp(cm) { return isImperial() ? round1(num(cm) / IN_CM) : cm; }
function dispToCm(v) { return isImperial() ? round2(num(v) * IN_CM) : v; }
// Boy: imperial girişte iki kutu (ft, in) → cm (1 ondalık). ft okunamazsa NaN; boş inç 0 sayılır.
function ftInToCm(ft, inch) {
  const f = num(ft, NaN), i = String(inch ?? "").trim() === "" ? 0 : num(inch, NaN);
  return isFinite(f) && isFinite(i) ? round1((f * 12 + i) * IN_CM) : NaN;
}
function cmToFtIn(cm) { const n = Math.round(num(cm) / IN_CM); return [Math.floor(n / 12), n % 12]; }
function fmtHeight(cm) {
  if (!isImperial()) return fmtNum(num(cm)) + " cm";
  const [f, i] = cmToFtIn(cm);
  return f + "'" + i + '"';
}

// Biçim. opts.body: vücut kilosu (1 ondalık, metrikte fmtNum); opts.fine: çevrilip 2 ondalık, 0,5 lb'ye yuvarlanmaz
// (haftalık değişim gibi küçük değerler). Varsayılan: set kilosu (metrikte fmtKg, imperial'de 0,5 lb).
function fmtWNum(kg, opts) {
  const o = opts || {};
  if (o.body) return fmtNum(num(bodyKgToDisp(kg)));
  if (o.fine) return fmtKg(isImperial() ? num(kg) / LB_KG : num(kg));
  return fmtKg(num(kgToDisp(kg)));
}
function fmtW(kg, opts) { return fmtWNum(kg, opts) + " " + wUnit(); }

// Plaka takımı, boş bar seçenekleri (0 = bar yok / plakalı makine), artış adımı — gösterim biriminde
function plateSet() { return isImperial() ? PLATES_LB.slice() : PLATES.slice(); }
function barOptions() { return isImperial() ? [45, 35, 15, 0] : [20, 15, 10, 0]; }
function wStep() { return isImperial() ? 5 : 2.5; }

// Ayar: yalnız gösterim değişir; kayıtlı hiçbir değer çevrilmez
function setUnits(u) {
  u = u === "imperial" ? "imperial" : "metric";
  if (state.settings.units === u) return;
  state.settings.units = u;
  try { if (typeof profileIsOpen === "function" && profileIsOpen()) fillProfileFields(); } catch (e) { /* yoksay */ }
  renderAll();   // Profil açıksa renderAll içinde yeniden çizilir (seçici işareti dahil)
}

Object.assign(EN, {
  "Birim": "Units",
  "Boy (ft)": "Height (ft)", "Boy (in)": "Height (in)",
  "Boyunu ft ve in olarak yaz.": "Enter your height in feet and inches.",
  "Boy {a} ile {b} arasında olmalı.": "Height must be between {a} and {b}.",
  "Kilo {a} ile {b} arasında olmalı.": "Weight must be between {a} and {b}.",
  "Hedef kilo {a} ile {b} arasında olmalı.": "Goal weight must be between {a} and {b}.",
  "Hedef kilo en çok {max} olabilir. Bu kilo için \"Kilo vermek\" hedefini seç.": "Goal weight can be {max} at most. For this weight, choose the \"Lose weight\" goal.",
  "Kilo vermek için hedef kilo şu anki kilondan ({w}) az olmalı.": "To lose weight, your goal weight must be below your current weight ({w}).",
  "Kilo almak için hedef kilo şu anki kilondan ({w}) fazla olmalı (en çok {max}).": "To gain weight, your goal weight must be above your current weight ({w}), up to {max}.",
  "Haftada yaklaşık {w} kayıp (günde ~{kcal} kcal açık).": "About {w} lost per week (a deficit of ~{kcal} kcal a day).",
  "Haftada yaklaşık {w} artış (günde ~{kcal} kcal fazla).": "About {w} gained per week (a surplus of ~{kcal} kcal a day)."
});
