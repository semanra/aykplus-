// ---------------------------------------------------------------------------
// v44: İLK AÇILIŞ KURULUMU (#onboard, 7 adım)
// ---------------------------------------------------------------------------
// Yalnızca yeni kurulumda (settings.onboarded === false) açılır. Girilenler obDraft'ta tutulur; state'e HİÇBİR ŞEY
// yazılmaz (İSTİSNALAR: obPickLang dil seçilince state.settings.lang'i, v53 obPickUnits birim seçilince state.settings.units'i hemen yazar; yarıda kalan kurulum baştan açıldığı için zararsız). finishOnboarding hepsini tek seferde yazar. Yarıda kapatılırsa onboarded false kalır → sonraki açılışta baştan.
// Sınırlar Profil'deki ile aynı (applyProfileFields / readProfileWeight): yaş 12–99, boy 120–230, kilo 30–300, hedef 30–250.
// v53: imperial'de kilo/hedef lb, boy ft + in kutularına yazılır; obVals her zaman kg / cm verir, sınırlar kg / cm üzerinden.
const OB_STEPS = 7;
const OB_LOSE_PACE = { slow: 300, mid: 500, fast: 700 };   // kcal açık
let obDraft = null, obStep = 1;

function obNewDraft() {
  return { sex: "", age: "", height: "", weight: "", goal: "", target: "", pace: "mid", act: "", exp: "", menu: true, prog: true, mob: true, lang: curLang(), units: isImperial() ? "imperial" : "metric", heightFt: "", heightIn: "" };
}
function obIsOpen() { const el = $("onboard"); return !!el && !el.classList.contains("hidden"); }
function openOnboarding() {
  if (obIsOpen()) return;
  obDraft = obNewDraft();
  obStep = 1;
  $("onboard").classList.remove("hidden");
  document.body.classList.add("ob-open");
  obRender();
}
function closeOnboarding() {
  const el = $("onboard");
  if (el) el.classList.add("hidden");
  document.body.classList.remove("ob-open");
  obDraft = null;
}
// renderAll sonunda: kayıt kurulum istiyorsa aç (fabrika ayarları), istemiyorsa kapat (yedekten dönüş)
function syncOnboarding() {
  const want = state.settings.onboarded === false;
  if (want && !obIsOpen()) openOnboarding();
  else if (!want && obIsOpen()) closeOnboarding();
}

// Sayılar (geçersiz → NaN). v53: her zaman kg / cm (imperial'de kutulardaki lb / ft + in çevrilir).
function obVals() {
  const d = obDraft, n = v => String(v).trim() === "" ? NaN : num(v, NaN);
  if (d.units === "imperial") return { age: n(d.age), height: String(d.heightFt).trim() === "" ? NaN : ftInToCm(d.heightFt, d.heightIn), weight: bodyDispToKg(n(d.weight)), target: bodyDispToKg(n(d.target)) };
  return { age: n(d.age), height: n(d.height), weight: round1(n(d.weight)), target: round1(n(d.target)) };
}
// Kayda yazılan boy: metrikte tam cm (eskisi gibi), imperial'de ft + in'in cm karşılığı (1 ondalık; geri çevrilince aynı ft/in)
function obHeightCm(v) { return obDraft && obDraft.units === "imperial" ? round1(v.height) : Math.round(v.height); }
// Taslakla hedefler: getTargets() geçici bir durum üzerinde çalışır; asıl state'e dokunulmaz, kaydedilmez.
function obTargets(dayType) {
  const d = obDraft, v = obVals(), saved = state;
  state = Object.assign({}, saved, {
    weight: v.weight, dayType,
    deficit: d.goal === "lose" ? OB_LOSE_PACE[d.pace] : 0,
    settings: Object.assign({}, saved.settings, {
      sex: d.sex === "female" ? "female" : "male", age: Math.round(v.age), height: obHeightCm(v),
      goal: d.goal || "keep", gainPace: d.pace, activity: d.act || "mid",
      targetWeight: d.goal === "lose" || d.goal === "gain" ? v.target : v.weight,
      bodyFat: "", calAdjust: 0, proteinHigh: false
    })
  });
  try {
    const tg = getTargets();
    tg.floor = d.sex === "female" ? 1400 : 1750;
    tg.floored = tg.tdee + tg.goalDelta < tg.floor;   // güvenli alt sınır hedefi yukarı çekti
    return tg;
  } finally { state = saved; }
}
// Adımın eksik/hatalı alanı (boşsa geçerli)
function obCheck(step) {
  const d = obDraft, v = obVals(), imp = d.units === "imperial";
  if (step === 2) {
    if (!d.sex) return t("Cinsiyetini seç; kalori hesabı buna göre yapılır.");
    if (isNaN(v.age)) return t("Yaşını yaz.");
    if (!(v.age >= 12 && v.age <= 99)) return t("Yaş 12 ile 99 arasında olmalı.");
    if (imp) {
      if (isNaN(v.height)) return t("Boyunu ft ve in olarak yaz.");
      { const f = num(d.heightFt, NaN), i = String(d.heightIn).trim() === "" ? 0 : num(d.heightIn, NaN);
        if (!(Number.isInteger(f) && f >= 0 && i >= 0 && i < 12)) return t("Boyda ft tam sayı, in 0 ile 11 arasında olmalı."); }
      if (!(v.height >= 120 && v.height <= 230)) return t("Boy {a} ile {b} arasında olmalı.", { a: fmtHeight(48 * IN_CM), b: fmtHeight(90 * IN_CM) });   // 4'0" = 121,9 cm, 7'6" = 228,6 cm
      if (isNaN(v.weight)) return t("Kilonu yaz.");
      if (!(v.weight >= 30 && v.weight <= 300)) return t("Kilo {a} ile {b} arasında olmalı.", { a: fmtW(30, { body: true }), b: fmtW(300, { body: true }) });
      return "";
    }
    if (isNaN(v.height)) return t("Boyunu santimetre olarak yaz.");
    if (!(v.height >= 120 && v.height <= 230)) return t("Boy 120 ile 230 cm arasında olmalı.");
    if (isNaN(v.weight)) return t("Kilonu yaz.");
    if (!(v.weight >= 30 && v.weight <= 300)) return t("Kilo 30 ile 300 kg arasında olmalı.");
  }
  if (step === 3 && imp) {   // v53: aynı kurallar, lb ile
    const bw = x => fmtW(x, { body: true }), wTyped = fmtNum(round1(num(d.weight))) + " lb";   // şu anki kilo yazıldığı gibi
    if (!d.goal) return t("Bir hedef seç.");
    if (d.goal === "keep" && v.weight > 250) return t('Hedef kilo en çok {max} olabilir. Bu kilo için "Kilo vermek" hedefini seç.', { max: bw(250) });
    if (d.goal === "lose" || d.goal === "gain") {
      if (isNaN(v.target)) return t("Hedef kilonu yaz.");
      if (!(v.target >= 30 && v.target <= 250)) return t("Hedef kilo {a} ile {b} arasında olmalı.", { a: bw(30), b: bw(250) });
      if (d.goal === "lose" && !(v.target >= 30 && v.target < v.weight)) return t("Kilo vermek için hedef kilo şu anki kilondan ({w}) az olmalı.", { w: wTyped });
      if (d.goal === "gain" && !(v.target > v.weight && v.target <= 250)) return t("Kilo almak için hedef kilo şu anki kilondan ({w}) fazla olmalı (en çok {max}).", { w: wTyped, max: bw(250) });
    }
  }
  else if (step === 3) {
    if (!d.goal) return t("Bir hedef seç.");
    if (d.goal === "keep" && v.weight > 250) return t('Hedef kilo en çok 250 kg olabilir. Bu kilo için "Kilo vermek" hedefini seç.');
    if (d.goal === "lose" || d.goal === "gain") {
      if (isNaN(v.target)) return t("Hedef kilonu yaz.");
      if (!(v.target >= 30 && v.target <= 250)) return t("Hedef kilo 30 ile 250 kg arasında olmalı.");
      if (d.goal === "lose" && !(v.target >= 30 && v.target < v.weight)) return t("Kilo vermek için hedef kilo şu anki kilondan ({w} kg) az olmalı.", { w: fmtNum(v.weight) });
      if (d.goal === "gain" && !(v.target > v.weight && v.target <= 250)) return t("Kilo almak için hedef kilo şu anki kilondan ({w} kg) fazla olmalı (en çok 250 kg).", { w: fmtNum(v.weight) });
    }
  }
  if (step === 4 && !d.act) return t("Gün içindeki hareketliliğine en yakın olanı seç.");
  if (step === 5 && !d.exp) return t("Birini seç; örnek program buna göre hazırlanır.");
  return "";
}
function obSetErr(msg) { const e = $("obErr"); if (e) e.textContent = msg || ""; }

// Gezinme
function obGo(step) {
  obStep = Math.max(1, Math.min(OB_STEPS, step));
  obRender();
}
function obNext() {
  const err = obCheck(obStep);
  if (err) { obSetErr(err); return; }
  obGo(obStep + 1);
}
function obBack() { if (obStep > 1) obGo(obStep - 1); }
function obInput(key, val) {
  if (!obDraft) return;
  obDraft[key] = val;
  obSetErr("");
  if (obStep === 3) obUpdateWeekly();
}
function obPickLang(l) {   // v46: ekran hemen yeni dile geçer
  if (!obDraft) return;
  l = l === "en" && langAvailable() ? "en" : "tr";
  obDraft.lang = l;
  state.settings.lang = l; i18nTouched = true;
  applyStaticI18n(null, true);
  obRender(true);
  loadFoodsEn();   // v51
}
function obPickUnits(u) {   // v53: yazılmış kilo / boy / hedef yeni birime çevrilir (kayıt kurulum bitince, kg / cm)
  if (!obDraft) return;
  u = u === "imperial" ? "imperial" : "metric";
  if (obDraft.units === u) return;
  const d = obDraft, v = obVals();
  d.units = u; state.settings.units = u;
  if (!isNaN(v.weight)) d.weight = fmtNum(bodyKgToDisp(v.weight));
  if (!isNaN(v.target)) d.target = fmtNum(bodyKgToDisp(v.target));
  if (!isNaN(v.height)) {
    if (u === "imperial") { const [f, i] = cmToFtIn(v.height); d.heightFt = String(f); d.heightIn = String(i); }
    else d.height = String(Math.round(v.height));
  }
  obSetErr("");
  obRender(true);
}
function obPick(key, val) {
  if (!obDraft) return;
  obDraft[key] = val;
  obSetErr("");
  obRender(true);
}
// Enter: aynı adımdaki sonraki kutuya geçer; son kutuda İleri gibi çalışır
function obKey(e) {
  if (e.key !== "Enter") return;
  e.preventDefault();
  const ins = [...document.querySelectorAll("#obBody input.ob-in")], i = ins.indexOf(e.target);
  if (i >= 0 && i < ins.length - 1) { ins[i + 1].focus(); return; }
  if (e.target.blur) e.target.blur();
  obNext();
}

// Haftalık tahmini değişim (3. adım). 1 kg ≈ 7700 kcal. Hareketlilik henüz seçilmediyse "orta" ile.
function obWeeklyText() {
  const d = obDraft, v = obVals();
  if (d.goal === "keep") return t("Kilonu korumaya göre hesaplanır; kalori ihtiyacın kadar yersin.");
  if (d.goal !== "lose" && d.goal !== "gain") return "";
  // Gerçek ortalama fark: güvenli alt sınır uygulandıktan sonraki hedefle harcama arasındaki fark (antrenman + dinlenme günü ortalaması)
  const a = obTargets("train"), r = obTargets("rest");
  const real = ((a.calTarget - a.tdee) + (r.calTarget - r.tdee)) / 2;
  const kcal = Math.round(d.goal === "lose" ? -real : real);
  if (kcal <= 0) return d.goal === "lose" ? t("Güvenli alt sınır yüzünden bu hızda kilo kaybı olmuyor; kalori hedefin harcamana eşit ya da üstünde kalır.") : t("Bu seçimle günlük kalori fazlası oluşmuyor.");
  const kg = kcal * 7 / 7700;
  let txt = d.units === "imperial" ? (d.goal === "lose" ? t("Haftada yaklaşık {w} kayıp (günde ~{kcal} kcal açık).", { w: fmtW(kg, { fine: true }), kcal: fmtInt(kcal) }) : t("Haftada yaklaşık {w} artış (günde ~{kcal} kcal fazla).", { w: fmtW(kg, { fine: true }), kcal: fmtInt(kcal) }))
    : d.goal === "lose" ? t("Haftada yaklaşık {kg} kg kayıp (günde ~{kcal} kcal açık).", { kg: fmtKg(kg), kcal: fmtInt(kcal) }) : t("Haftada yaklaşık {kg} kg artış (günde ~{kcal} kcal fazla).", { kg: fmtKg(kg), kcal: fmtInt(kcal) });
  const diff = Math.abs(v.weight - v.target);
  const ok = d.goal === "lose" ? v.target >= 30 && v.target < v.weight : v.target > v.weight && v.target <= 250;
  if (ok && kg > 0) txt += " " + tn(Math.max(1, Math.round(diff / kg)), "Hedefe yaklaşık {n} haftada ulaşırsın.");
  return txt;
}
function obUpdateWeekly() { const el = $("obWeekly"); if (el) el.textContent = obWeeklyText(); }

// Çizim
function obOpt(id, on, title, sub, fn) {
  return `<button id="${id}" type="button" class="ob-opt${on ? " on" : ""}" aria-pressed="${on}" onclick="${fn}">
    <span class="ob-opt-tx"><span class="ob-opt-t">${title}</span>${sub ? `<span class="ob-opt-s">${sub}</span>` : ""}</span>
    <span class="ob-radio" aria-hidden="true">${on ? svgI("check", 16, 3) : ""}</span></button>`;
}
function obField(id, label, key, ph, unit) {
  return `<label class="ob-field" for="${id}"><span class="t-field">${label}</span>
    <span class="ob-inwrap"><input id="${id}" class="t-in ob-in" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="next" placeholder="${esc(t("örn. {ph}", { ph }))}"
      value="${esc(obDraft[key])}" oninput="obInput('${key}', this.value)" onkeydown="obKey(event)" />${unit ? `<span class="ob-unit">${unit}</span>` : ""}</span></label>`;
}
function obBox(id, aria, key, ph, unit) {   // v53: etiketsiz kutu (boy ft + in)
  return `<span class="ob-inwrap"><input id="${id}" class="t-in ob-in" type="text" inputmode="numeric" autocomplete="off" enterkeyhint="next" aria-label="${esc(aria)}" placeholder="${esc(t("örn. {ph}", { ph }))}"
      value="${esc(obDraft[key])}" oninput="obInput('${key}', this.value)" onkeydown="obKey(event)" /><span class="ob-unit">${unit}</span></span>`;
}
function obUnitsSeg(d) {   // v53: birim seçici (Profil #pfUnits ile aynı bileşen; düğme adları dilden bağımsız)
  return `<div class="ob-group"><span class="t-field">${esc(t("Birim"))}</span>
      <div class="t-seg ob-seg2" id="obUnits" role="group" aria-label="${esc(t("Birim"))}">
        <button type="button" data-units-opt="metric" class="${d.units !== "imperial" ? "on" : ""}" aria-pressed="${d.units !== "imperial"}" onclick="obPickUnits('metric')">kg, cm</button>
        <button type="button" data-units-opt="imperial" class="${d.units === "imperial" ? "on" : ""}" aria-pressed="${d.units === "imperial"}" onclick="obPickUnits('imperial')">lb, ft, in</button>
      </div></div>`;
}
function obHead(title, sub) {
  return `<h2 id="obTitle" class="ob-title t-display" tabindex="-1">${title}</h2>${sub ? `<p class="ob-sub">${sub}</p>` : ""}`;
}
function obCheckRow(id, key, title, sub) {
  return `<label class="ob-check" for="${id}"><input id="${id}" type="checkbox" class="ob-cb"${obDraft[key] ? " checked" : ""} onchange="obInput('${key}', this.checked)" />
    <span class="ob-opt-tx"><span class="ob-opt-t">${title}</span><span class="ob-opt-s">${sub}</span></span></label>`;
}
function obStepHtml(n) {
  const d = obDraft;
  if (n === 1) return `<div class="ob-hero">
      <img src="icon.png" alt="" class="ob-logo" width="72" height="72" />
      ${obHead(t("Hoş geldin"), t("Beslenme, antrenman ve esneme tek yerde. Birkaç soruyla günlük hedeflerini hesaplayalım; iki dakika sürer."))}
    </div>
    <div id="obHealth" class="ob-note" role="note"><span class="ob-note-t">${esc(t("Sağlık notu"))}</span>${esc(t(HEALTH_NOTE))}</div>
    <p class="ob-small">${esc(t("Verilerin yalnızca bu telefonda kalır; hesap açman gerekmez."))}</p>
    ${langAvailable() ? `<div class="t-seg ob-seg2" id="obLang" role="group" aria-label="${esc(t("Dil"))}">
      <button type="button" data-lang-opt="tr" class="${d.lang === "tr" ? "on" : ""}" aria-pressed="${d.lang === "tr"}" onclick="obPickLang('tr')">Türkçe</button>
      <button type="button" data-lang-opt="en" class="${d.lang === "en" ? "on" : ""}" aria-pressed="${d.lang === "en"}" onclick="obPickLang('en')">English</button>
    </div>` : ""}
    <div class="ob-actions">
      <button id="obStart" type="button" class="ob-main t-btn" onclick="obGo(2)">${esc(t("Başlayalım"))}</button>
      <button id="obRestore" type="button" class="ob-second" onclick="document.getElementById('obRestoreFile').click()">${esc(t("Yedeğim var, geri yükle"))}</button>
    </div>`;
  if (n === 2) return `${obHead(t("Seni tanıyalım"), t("Kalori ihtiyacın bu bilgilerle hesaplanır."))}
    <div class="ob-group"><span class="t-field">${esc(t("Cinsiyet"))}</span>
      <div class="t-seg ob-seg2">
        <button id="obSexFemale" type="button" class="${d.sex === "female" ? "on" : ""}" aria-pressed="${d.sex === "female"}" onclick="obPick('sex', 'female')">${esc(t("Kadın"))}</button>
        <button id="obSexMale" type="button" class="${d.sex === "male" ? "on" : ""}" aria-pressed="${d.sex === "male"}" onclick="obPick('sex', 'male')">${esc(t("Erkek"))}</button>
      </div></div>
    ${obUnitsSeg(d)}
    ${d.units === "imperial" ? `<div class="ob-grid2">${obField("obAge", t("Yaş"), "age", "30", "")}${obField("obWeight", t("Kilo"), "weight", "154", "lb")}</div>
    <div class="ob-group"><span class="t-field">${esc(t("Boy"))}</span><div class="ob-grid2">${obBox("obHeightFt", t("Boy (ft)"), "heightFt", "5", "ft")}${obBox("obHeightIn", t("Boy (in)"), "heightIn", "7", "in")}</div></div>`
    : `<div class="ob-grid2">${obField("obAge", t("Yaş"), "age", "30", "")}${obField("obHeight", t("Boy"), "height", "170", "cm")}</div>
    ${obField("obWeight", t("Kilo"), "weight", "70", "kg")}`}`;
  if (n === 3) {
    const tgt = d.goal === "lose" || d.goal === "gain";
    const kc = p => d.goal === "lose" ? `${OB_LOSE_PACE[p]} kcal` : t("+%{p}", { p: Math.round(GAIN_PACE[p] * 100) });
    const pace = (id, p, lb) => `<button id="${id}" type="button" class="${d.pace === p ? "on" : ""}" aria-pressed="${d.pace === p}" onclick="obPick('pace', '${p}')"><span class="ob-pace-t">${lb}</span><span class="ob-pace-s">${kc(p)}</span></button>`;
    return `${obHead(t("Hedefin ne?"), "")}
    <div class="ob-list">
      ${obOpt("obGoalLose", d.goal === "lose", t("Kilo vermek"), t("Yağ kaybı, kası koruyarak"), "obPick('goal', 'lose')")}
      ${obOpt("obGoalKeep", d.goal === "keep", t("Kilomu korumak"), t("Aynı kiloda daha fit ve güçlü"), "obPick('goal', 'keep')")}
      ${obOpt("obGoalGain", d.goal === "gain", t("Kilo almak"), t("Kas kazanmak için kalori fazlası"), "obPick('goal', 'gain')")}
    </div>
    ${tgt ? `${d.units === "imperial" ? obField("obTarget", t("Hedef kilo"), "target", fmtNum(d.goal === "lose" ? Math.max(67, Math.round(num(d.weight)) - 10) : Math.min(551, Math.round(num(d.weight)) + 10)), "lb")
      : obField("obTarget", t("Hedef kilo"), "target", d.goal === "lose" ? fmtNum(Math.max(30, round1(obVals().weight - 5))) : fmtNum(round1(obVals().weight + 5)), "kg")}
    <div class="ob-group"><span class="t-field">${esc(d.goal === "lose" ? t("Ne kadar hızlı? (günlük kalori açığı)") : t("Ne kadar hızlı? (günlük kalori fazlası)"))}</span>
      <div class="t-seg ob-seg3">${pace("obPaceSlow", "slow", t("Yavaş"))}${pace("obPaceMid", "mid", t("Orta"))}${pace("obPaceFast", "fast", t("Hızlı"))}</div></div>` : ""}
    <p id="obWeekly" class="ob-weekly" aria-live="polite">${esc(obWeeklyText())}</p>`;
  }
  if (n === 4) return `${obHead(t("Gün içinde ne kadar hareketlisin?"), t("Antrenmanı sayma; antrenman günleri ayrıca hesaba katılır."))}
    <div class="ob-list">
      ${obOpt("obActLow", d.act === "low", t("Az"), t("Masa başı iş, günde az yürüyüş"), "obPick('act', 'low')")}
      ${obOpt("obActMid", d.act === "mid", t("Orta"), t("Gün içinde biraz hareket"), "obPick('act', 'mid')")}
      ${obOpt("obActHigh", d.act === "high", t("Çok"), t("Ayakta ya da bedenen çalışılan iş"), "obPick('act', 'high')")}
    </div>`;
  if (n === 5) return `${obHead(t("Antrenman deneyimin"), t("Örnek program buna göre hazırlanır."))}
    <div class="ob-list">
      ${obOpt("obExpNew", d.exp === "new", t("Yeni başlıyorum"), t("Makine ve dambılla temel hareketler"), "obPick('exp', 'new')")}
      ${obOpt("obExpPro", d.exp === "pro", t("Salonu biliyorum"), t("Serbest ağırlık, üst/alt vücut bölünmesi"), "obPick('exp', 'pro')")}
    </div>`;
  if (n === 6) return `${obHead(t("Neyle başlayalım?"), t("Hepsini istediğin zaman değiştirebilir, silebilir ya da kendi menünü ve programını sıfırdan kurabilirsin."))}
    <div class="ob-list">
      ${obCheckRow("obSampleMenu", "menu", t("Örnek menü"), t("4 öğün; gramajlar kalori hedefine göre, antrenman ve dinlenme günü için ayrı"))}
      ${obCheckRow("obSampleProgram", "prog", d.exp === "pro" ? t("Örnek program: 4 gün üst/alt vücut") : t("Örnek program: 3 gün tüm vücut"), t("Kilolar boş; ilk antrenmanda kendi kilonu girersin"))}
      ${obCheckRow("obSampleMob", "mob", t("Örnek esneme rutini"), t("Günlük esneme: 7 hareket, yaklaşık 10 dakika"))}
    </div>
    <p class="ob-small">${esc(t("İşareti kaldırdığın bölüm boş başlar."))}</p>`;
  if (n === 7) {
    const tr = obTargets("train"), re = obTargets("rest"), wa = waterAutoInfo(obVals().weight);
    return `${obHead(t("Hazırsın"), t("Günlük hedeflerin:"))}
    <div id="obSummary" class="ob-sum">
      <div class="ob-sum-hero"><span class="ob-sum-l">${esc(t("Antrenman günü"))}</span><span class="ob-sum-kcal"><b class="t-display">${fmtInt(tr.calTarget)}</b> kcal</span>
        <span class="ob-sum-l">${t("Dinlenme günü: <b>{v} kcal</b>", { v: fmtInt(re.calTarget) })}</span></div>
      <div class="ob-sum-row">
        <div class="ob-sum-c"><span class="ob-sum-l">${esc(t("Protein"))}</span><b class="t-display">${tr.proTarget}</b><span class="ob-sum-u">g</span></div>
        <div class="ob-sum-c"><span class="ob-sum-l">${esc(t("Karb"))}</span><b class="t-display">${tr.carbTarget}</b><span class="ob-sum-u">g</span></div>
        <div class="ob-sum-c"><span class="ob-sum-l">${esc(t("Yağ"))}</span><b class="t-display">${tr.fatTarget}</b><span class="ob-sum-u">g</span></div>
      </div>
      <div class="ob-sum-water"><span>${esc(t("Su"))}</span><b>${wa ? fmtNum(wa.total) : fmtNum(2.5)} L</b></div>
    </div>
    ${tr.floored || re.floored ? `<p id="obFloor" class="ob-floor">${esc(t(tr.floored && re.floored ? "Antrenman ve dinlenme günü güvenli alt sınırda ({k} kcal); kalori bunun altına indirilmez." : tr.floored ? "Antrenman günü güvenli alt sınırda ({k} kcal); kalori bunun altına indirilmez." : "Dinlenme günü güvenli alt sınırda ({k} kcal); kalori bunun altına indirilmez.", { k: fmtInt(tr.floor) }))}</p>` : ""}
    <p class="ob-small">${t("Hepsini Profil'den istediğin zaman değiştirebilirsin. Hesaplar tahminidir; tartıldıkça uygulama kalorini kilonun gidişine göre ayarlamayı önerir.")}</p>`;
  }
  return "";
}
function obRender(keepScroll) {
  const root = $("onboard");
  if (!root || !obDraft) return;
  root.dataset.step = String(obStep);
  const sc = $("obScroll"), top = sc ? sc.scrollTop : 0;
  $("obBody").innerHTML = `<div class="ob-step${keepScroll ? " ob-still" : ""}">${obStepHtml(obStep)}</div>`;   // seçim değişince yeniden belirmez
  const ins = document.querySelectorAll("#obBody input.ob-in");
  if (ins.length) ins[ins.length - 1].setAttribute("enterkeyhint", "done");   // son kutu "Bitti"
  $("obDots").innerHTML = Array.from({ length: OB_STEPS }, (_, i) => `<span class="ob-dot${i + 1 === obStep ? " on" : i + 1 < obStep ? " done" : ""}"></span>`).join("");
  $("obDots").setAttribute("aria-label", t("Adım {n} / {m}", { n: obStep, m: OB_STEPS }));
  $("obBack").style.visibility = obStep > 1 ? "visible" : "hidden";
  $("obNext").classList.toggle("hidden", obStep === 1 || obStep === OB_STEPS);
  $("obFinish").classList.toggle("hidden", obStep !== OB_STEPS);
  $("obFoot").classList.toggle("hidden", obStep === 1);
  if (!keepScroll) {
    obSetErr("");
    if (sc) sc.scrollTop = 0;
    const el = $("obTitle");
    if (el && obStep > 1) { try { el.focus({ preventScroll: true }); } catch (e) { /* yoksay */ } }
  } else if (sc) sc.scrollTop = top;
}

function finishOnboarding() {
  const d = obDraft;
  if (!d) return;
  for (let n = 2; n <= 5; n++) { const e = obCheck(n); if (e) { obGo(n); obSetErr(e); return; } }
  const v = obVals(), tr = obTargets("train"), re = obTargets("rest");
  const st = state.settings;
  if (d.lang === "tr" || d.lang === "en") st.lang = d.lang;   // v46
  st.units = d.units === "imperial" ? "imperial" : "metric";   // v53
  st.sex = d.sex === "female" ? "female" : "male";
  st.age = Math.round(v.age);
  st.height = obHeightCm(v);
  st.goal = d.goal;
  st.activity = d.act;
  if (d.goal === "gain") st.gainPace = d.pace;
  st.targetWeight = d.goal === "keep" ? v.weight : v.target;
  state.deficit = d.goal === "lose" ? OB_LOSE_PACE[d.pace] : 0;
  state.weight = v.weight;
  const now = Date.now();
  state.weightLogs = [{ date: fmtDateStore(now), weight: v.weight, ts: now }];
  let menuFailed = false;
  if (d.menu) {
    const m1 = buildSampleMenu(tr.calTarget), m2 = buildSampleMenu(re.calTarget);
    if (m1.length && m2.length) { state.meals = m1; state.restMeals = m2; state.dayPlan = null; } else menuFailed = true;
  }
  if (d.prog) { state.workoutDays = samplePrograms(d.exp); state.activeWorkoutDayIdx = 0; }
  else if (state.workoutDays.length === 1 && state.workoutDays[0].name === "1. Gün" && !state.workoutDays[0].exercises.length) state.workoutDays[0].name = t("1. Gün|varsayılan gün");   // v52: yeni kayıt o anki dilde
  if (d.mob) state.mobilityRoutine.routines = [sampleMobility()];
  st.onboarded = true;
  state.activeTab = "nutrition";
  state.nutriView = "today";
  closeOnboarding();
  window.scrollTo(0, 0);
  renderAll();
  updateWakeLock();
  if (menuFailed) toast(t("Örnek menü şu an hazırlanamadı; menünü kendin ekleyebilirsin."), "error");
}
