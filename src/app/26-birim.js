// ---------------------------------------------------------------------------
// v53 — BİRİMLER: settings.units = "metric" | "imperial" (dilden bağımsız; yeni kayıtta telefonun bölgesine göre).
// Kayıt HER ZAMAN kg / cm; bu dosyadaki yardımcılar yalnız gösterim ve giriş içindir. Metrikte her yardımcı girdisini
// aynen döndürür ve biçimleyiciler bugünkü metni birebir verir (fmtW(kg) === fmtKg(kg) + " kg").
// Set kilosu: lb'de girilen değer kg'a çevrilip 3 ondalıkla saklanır, gösterimde en yakın 0,5 lb'ye yuvarlanır
// (45 / 95 / 135 / 225 / 2,5 lb gidiş-dönüş birebir). Vücut kilosu lb'de 1 ondalık gösterilir, kayıt kg 3 ondalık
// (yazılan lb aynen geri gelir: 176 → 79,832 → 176); boy ft + in (tam inç), ölçüler in (1 ondalık).
// Arayüz sözleşmesi (Görev 2–3):
// - Okunamayan / boş girdi ("", NaN, metin) HER İKİ modda olduğu gibi döner; değer uydurulmaz (0'a çevrilmez).
// - Metrikte çeviriciler girdiyi aynen döndürür (metin olabilir): hesap yapan çağıran sonucu yine num() ile okur.
// - plateSet / barOptions / wStep GÖSTERİM biriminde; kayıt kg: bar seçimi dispToKg(45) = 20,412 olarak saklanır,
//   seçili seçenek kgToDisp(settings.barKg) ile eşlenir (sahibin barKg 20 → 44 lb hiçbir seçeneğe uymaz: Görev 2
//   kullanıcı değiştirene dek ayarı yazmadan 45 lb varsayar). ex.inc kg'dır (2,5); imperial adım kuralı Görev 2'de.
// Not: t()/state bu dosyada üst düzeyde kullanılmaz (açılış async).
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

// İmperial'de çevrilecek sayı (okunamazsa null → girdi aynen döner)
function unitNum(v) { if (!isImperial()) return null; const n = num(v, NaN); return isFinite(n) ? n : null; }
// Set / plaka kilosu
function kgToDisp(kg) { const n = unitNum(kg); return n === null ? kg : Math.round(n / LB_KG * 2) / 2; }
function dispToKg(v) { const n = unitNum(v); return n === null ? v : Math.round(n * LB_KG * 1000) / 1000; }
// Vücut kilosu (kilo, hedef, tartılar): gösterim lb 1 ondalık, kayıt kg 3 ondalık
function bodyKgToDisp(kg) { const n = unitNum(kg); return n === null ? kg : round1(n / LB_KG); }
function bodyDispToKg(v) { const n = unitNum(v); return n === null ? v : Math.round(n * LB_KG * 1000) / 1000; }
// Ölçüler (cm ↔ in, 1 ondalık in; kayıt cm 2 ondalık)
function cmToDisp(cm) { const n = unitNum(cm); return n === null ? cm : round1(n / IN_CM); }
function dispToCm(v) { const n = unitNum(v); return n === null ? v : round2(n * IN_CM); }
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

// ---------------------------------------------------------------------------
// v53 Görev 2 — Antrenman: set kilosu, artış, kademe, plaka, 1RM / tonaj gösterimi.
// - Giriş: gösterilen değer yeniden yazılırsa (aynı sayı) kayıttaki kg DEĞİŞMEZ (keepKg); yoksa dispToKg (3 ondalık).
// - Artış adımı (ex.inc, autoInc) kg saklanır; imperial'de lb adımı incDisp: lb'de girilmiş adım (3 ondalık kg,
//   gidiş-dönüş birebir) aynen; kg kökenli adım en yakın 2,5 lb katına (en az 2,5): 2,5 → 5, 2 → 5, 5 → 10, 1,25 → 2,5.
// - Plaka aracı ve ısınma imperial'de tamamen lb'de hesaplanır (plateSet, 45 / 35 / 15 lb bar); kademe listeleri kg
//   saklanır, gösterimde lb'ye çevrilir. Bar ayarı (settings.barKg) seçeneklerden birine uymuyorsa 45 lb varsayılır, yazılmaz.
// - Metin: Türkçe/İngilizce kalıplardaki "kg" birimi wTxt ile "lb" olur (Türkçe ekler: kg'a → lb'ye, kg'da → lb'de,
//   kg'ı → lb'yi, kg'lık → lb'lik). Metrikte wTxt metni aynen döndürür (piksel aynı). Kullanıcı metni (hareket adı)
//   wTxt'ten SONRA trFill ile eklenir.
// ---------------------------------------------------------------------------
function round3(n) { return Math.round(n * 1000) / 1000; }
// 1RM / tonaj gibi yuvarlanmayan büyüklükler: imperial'de lb sayısı, metrikte girdi aynen
function wRaw(kg) { return isImperial() ? num(kg) / LB_KG : kg; }
function wTxt(s) {
  if (!isImperial()) return s;
  return String(s).replace(/\bkg('a|'da|'ı|'lık)?(?![A-Za-zÀ-ɏ])/g, (m, suf) => {
    if (!suf) return "lb";
    if (suf === "'a") return "lb'ye";
    if (suf === "'da") return "lb'de";
    if (suf.length === 2) return "lb'yi";
    return "lb'lik";
  });
}
// Gösterilen set kilosu girişi → kayıt kg. Aynı sayı yeniden yazılırsa eski kg aynen (yuvarlama birikmesi yok).
function keepKg(v, origKg) {
  const n = unitNum(v);
  if (n === null) return dispToKg(v);
  if (origKg !== undefined && origKg !== null && origKg !== "" && isFinite(num(origKg, NaN)) && num(kgToDisp(num(origKg))) === n) return origKg;
  return dispToKg(n);
}
// Artış adımı gösterimde (kg saklı): metrikte aynen
function incDisp(kg) {
  if (!isImperial()) return kg;
  const k = num(kg), d = num(kgToDisp(k));
  if (Math.abs(dispToKg(d) - k) < 1e-9) return d;   // lb'de girilmiş
  return Math.max(2.5, Math.round(k / LB_KG / 2.5) * 2.5);
}

// ---------------------------------------------------------------------------
// v53 Görev 3 — Vücut: kilo, hedef kilo, tartılar (lb 1 ondalık), boy (ft + in), ölçüler (in 1 ondalık).
// - Hesap formülleri kg / cm üzerinden (hedefler değişmez); yalnız gösterim ve giriş çevrilir.
// - Giriş: gösterilen değer yeniden yazılırsa kayıttaki kg / cm DEĞİŞMEZ (keepBodyKg / keepCm); yoksa bodyDispToKg
//   (kg 3 ondalık) / dispToCm (cm 2 ondalık). Boy imperial'de iki kutu; ft / in değişmediyse kayıttaki boy aynen kalır.
// - Metin: "kg" birimi wTxt, "cm" birimi lenTxt ile değişir; metrikte ikisi de metni aynen döndürür.
// ---------------------------------------------------------------------------
function lenRaw(cm) { return isImperial() ? num(cm) / IN_CM : cm; }
function fmtLen(cm) { return fmtNum(num(cmToDisp(cm))); }
function lenTxt(s) { return isImperial() ? String(s).replace(/\bcm\b/g, "in") : s; }
function keepBodyKg(v, origKg) {
  const n = unitNum(v);
  if (n === null) return bodyDispToKg(v);
  if (origKg !== undefined && origKg !== null && origKg !== "" && isFinite(num(origKg, NaN)) && num(bodyKgToDisp(num(origKg))) === n) return num(origKg);
  return bodyDispToKg(n);
}
function keepCm(v, origCm) {
  const n = unitNum(v);
  if (n === null) return dispToCm(v);
  if (origCm !== undefined && origCm !== null && origCm !== "" && isFinite(num(origCm, NaN)) && num(cmToDisp(num(origCm))) === n) return num(origCm);
  return dispToCm(n);
}

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
  "Boy (ft)": "Height (ft)", "Boy (in)": "Height (in)", "Boy (ft / in)": "Height (ft / in)",
  "Boyunu ft ve in olarak yaz.": "Enter your height in feet and inches.",
  "Boyda ft tam sayı, in 0 ile 11 arasında olmalı.": "Height: feet must be a whole number and inches between 0 and 11.",
  "Boy {a} ile {b} arasında olmalı.": "Height must be between {a} and {b}.",
  "Kilo {a} ile {b} arasında olmalı.": "Weight must be between {a} and {b}.",
  "Hedef kilo {a} ile {b} arasında olmalı.": "Goal weight must be between {a} and {b}.",
  "Hedef kilo en çok {max} olabilir. Bu kilo için \"Kilo vermek\" hedefini seç.": "Goal weight can be {max} at most. For this weight, choose the \"Lose weight\" goal.",
  "Kilo vermek için hedef kilo şu anki kilondan ({w}) az olmalı.": "To lose weight, your goal weight must be below your current weight ({w}).",
  "Kilo almak için hedef kilo şu anki kilondan ({w}) fazla olmalı (en çok {max}).": "To gain weight, your goal weight must be above your current weight ({w}), up to {max}.",
  "Haftada yaklaşık {w} kayıp (günde ~{kcal} kcal açık).": "About {w} lost per week (a deficit of ~{kcal} kcal a day).",
  "Haftada yaklaşık {w} artış (günde ~{kcal} kcal fazla).": "About {w} gained per week (a surplus of ~{kcal} kcal a day).",
  // v53 Görev 2: antrenman (imperial)
  "45 lb Olimpik bar": "45 lb Olympic bar", "35 lb Bar": "35 lb bar", "15 lb EZ / kısa bar": "15 lb EZ / short bar",
  "bin lb": "k lb", "Son 8 haftanın tonajı (bin lb)": "Volume for the last 8 weeks (thousand lb)",
  // v53 Görev 3: vücut (imperial)
  "Kilo {a} ile {b} arasında olmalı; kaydedilmedi.": "Weight must be between {a} and {b}; not saved.",
  "Kilonu {a} ile {b} arasında yaz (örn: {ex}).": "Enter your weight between {a} and {b} (e.g. {ex}).",
  "{a} ile {b} arasında bir değer yaz (örn. {ex}).": "Enter a value between {a} and {b} (e.g. {ex}).",
  "En az bir ölçüyü {a}–{b} arasında gir.": "Enter at least one measurement between {a} and {b}."
});
