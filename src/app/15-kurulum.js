// ---------------------------------------------------------------------------
// v44: İLK AÇILIŞ KURULUMU (#onboard, 7 adım)
// ---------------------------------------------------------------------------
// Yalnızca yeni kurulumda (settings.onboarded === false) açılır. Girilenler obDraft'ta tutulur; state'e HİÇBİR ŞEY
// yazılmaz (TEK İSTİSNA: obPickLang dil seçilince state.settings.lang'i hemen yazar; yarıda kalan kurulum baştan açıldığı için zararsız). finishOnboarding hepsini tek seferde yazar. Yarıda kapatılırsa onboarded false kalır → sonraki açılışta baştan.
// Sınırlar Profil'deki ile aynı (applyProfileFields / readProfileWeight): yaş 12–99, boy 120–230, kilo 30–300, hedef 30–250.
const OB_STEPS = 7;
const OB_LOSE_PACE = { slow: 300, mid: 500, fast: 700 };   // kcal açık
let obDraft = null, obStep = 1;

function obNewDraft() {
  return { sex: "", age: "", height: "", weight: "", goal: "", target: "", pace: "mid", act: "", exp: "", menu: true, prog: true, mob: true, lang: curLang() };
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

// Sayılar (geçersiz → NaN)
function obVals() {
  const d = obDraft, n = v => String(v).trim() === "" ? NaN : num(v, NaN);
  return { age: n(d.age), height: n(d.height), weight: round1(n(d.weight)), target: round1(n(d.target)) };
}
// Taslakla hedefler: getTargets() geçici bir durum üzerinde çalışır; asıl state'e dokunulmaz, kaydedilmez.
function obTargets(dayType) {
  const d = obDraft, v = obVals(), saved = state;
  state = Object.assign({}, saved, {
    weight: v.weight, dayType,
    deficit: d.goal === "lose" ? OB_LOSE_PACE[d.pace] : 0,
    settings: Object.assign({}, saved.settings, {
      sex: d.sex === "female" ? "female" : "male", age: Math.round(v.age), height: Math.round(v.height),
      goal: d.goal || "keep", gainPace: d.pace, activity: d.act || "mid",
      targetWeight: d.goal === "lose" || d.goal === "gain" ? v.target : v.weight,
      bodyFat: "", calAdjust: 0, proteinHigh: false
    })
  });
  try {
    const t = getTargets();
    t.floor = d.sex === "female" ? 1400 : 1750;
    t.floored = t.tdee + t.goalDelta < t.floor;   // güvenli alt sınır hedefi yukarı çekti
    return t;
  } finally { state = saved; }
}
// Adımın eksik/hatalı alanı (boşsa geçerli)
function obCheck(step) {
  const d = obDraft, v = obVals();
  if (step === 2) {
    if (!d.sex) return "Cinsiyetini seç; kalori hesabı buna göre yapılır.";
    if (isNaN(v.age)) return "Yaşını yaz.";
    if (!(v.age >= 12 && v.age <= 99)) return "Yaş 12 ile 99 arasında olmalı.";
    if (isNaN(v.height)) return "Boyunu santimetre olarak yaz.";
    if (!(v.height >= 120 && v.height <= 230)) return "Boy 120 ile 230 cm arasında olmalı.";
    if (isNaN(v.weight)) return "Kilonu yaz.";
    if (!(v.weight >= 30 && v.weight <= 300)) return "Kilo 30 ile 300 kg arasında olmalı.";
  }
  if (step === 3) {
    if (!d.goal) return "Bir hedef seç.";
    if (d.goal === "keep" && v.weight > 250) return 'Hedef kilo en çok 250 kg olabilir. Bu kilo için "Kilo vermek" hedefini seç.';
    if (d.goal === "lose" || d.goal === "gain") {
      if (isNaN(v.target)) return "Hedef kilonu yaz.";
      if (!(v.target >= 30 && v.target <= 250)) return "Hedef kilo 30 ile 250 kg arasında olmalı.";
      if (d.goal === "lose" && !(v.target >= 30 && v.target < v.weight)) return `Kilo vermek için hedef kilo şu anki kilondan (${fmtNum(v.weight)} kg) az olmalı.`;
      if (d.goal === "gain" && !(v.target > v.weight && v.target <= 250)) return `Kilo almak için hedef kilo şu anki kilondan (${fmtNum(v.weight)} kg) fazla olmalı (en çok 250 kg).`;
    }
  }
  if (step === 4 && !d.act) return "Gün içindeki hareketliliğine en yakın olanı seç.";
  if (step === 5 && !d.exp) return "Birini seç; örnek program buna göre hazırlanır.";
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
  applyStaticI18n();
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
  if (d.goal === "keep") return "Kilonu korumaya göre hesaplanır; kalori ihtiyacın kadar yersin.";
  if (d.goal !== "lose" && d.goal !== "gain") return "";
  // Gerçek ortalama fark: güvenli alt sınır uygulandıktan sonraki hedefle harcama arasındaki fark (antrenman + dinlenme günü ortalaması)
  const a = obTargets("train"), r = obTargets("rest");
  const real = ((a.calTarget - a.tdee) + (r.calTarget - r.tdee)) / 2;
  const kcal = Math.round(d.goal === "lose" ? -real : real);
  if (kcal <= 0) return d.goal === "lose" ? "Güvenli alt sınır yüzünden bu hızda kilo kaybı olmuyor; kalori hedefin harcamana eşit ya da üstünde kalır." : "Bu seçimle günlük kalori fazlası oluşmuyor.";
  const kg = kcal * 7 / 7700;
  let t = `Haftada yaklaşık ${fmtKg(kg)} kg ${d.goal === "lose" ? "kayıp" : "artış"} (günde ~${fmtInt(kcal)} kcal ${d.goal === "lose" ? "açık" : "fazla"}).`;
  const diff = Math.abs(v.weight - v.target);
  const ok = d.goal === "lose" ? v.target >= 30 && v.target < v.weight : v.target > v.weight && v.target <= 250;
  if (ok && kg > 0) t += ` Hedefe yaklaşık ${Math.max(1, Math.round(diff / kg))} haftada ulaşırsın.`;
  return t;
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
    <span class="ob-inwrap"><input id="${id}" class="t-in ob-in" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="next" placeholder="örn. ${ph}"
      value="${esc(obDraft[key])}" oninput="obInput('${key}', this.value)" onkeydown="obKey(event)" />${unit ? `<span class="ob-unit">${unit}</span>` : ""}</span></label>`;
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
      ${obHead("Hoş geldin", "Beslenme, antrenman ve esneme tek yerde. Birkaç soruyla günlük hedeflerini hesaplayalım; iki dakika sürer.")}
    </div>
    <div id="obHealth" class="ob-note" role="note"><span class="ob-note-t">Sağlık notu</span>${esc(HEALTH_NOTE)}</div>
    <p class="ob-small">Verilerin yalnızca bu telefonda kalır; hesap açman gerekmez.</p>
    ${langAvailable() ? `<div class="t-seg ob-seg2" id="obLang" role="group" aria-label="${esc(t("Dil"))}">
      <button type="button" data-lang-opt="tr" class="${d.lang === "tr" ? "on" : ""}" aria-pressed="${d.lang === "tr"}" onclick="obPickLang('tr')">Türkçe</button>
      <button type="button" data-lang-opt="en" class="${d.lang === "en" ? "on" : ""}" aria-pressed="${d.lang === "en"}" onclick="obPickLang('en')">English</button>
    </div>` : ""}
    <div class="ob-actions">
      <button id="obStart" type="button" class="ob-main t-btn" onclick="obGo(2)">Başlayalım</button>
      <button id="obRestore" type="button" class="ob-second" onclick="document.getElementById('obRestoreFile').click()">Yedeğim var, geri yükle</button>
    </div>`;
  if (n === 2) return `${obHead("Seni tanıyalım", "Kalori ihtiyacın bu bilgilerle hesaplanır.")}
    <div class="ob-group"><span class="t-field">Cinsiyet</span>
      <div class="t-seg ob-seg2">
        <button id="obSexFemale" type="button" class="${d.sex === "female" ? "on" : ""}" aria-pressed="${d.sex === "female"}" onclick="obPick('sex', 'female')">Kadın</button>
        <button id="obSexMale" type="button" class="${d.sex === "male" ? "on" : ""}" aria-pressed="${d.sex === "male"}" onclick="obPick('sex', 'male')">Erkek</button>
      </div></div>
    <div class="ob-grid2">${obField("obAge", "Yaş", "age", "30", "")}${obField("obHeight", "Boy", "height", "170", "cm")}</div>
    ${obField("obWeight", "Kilo", "weight", "70", "kg")}`;
  if (n === 3) {
    const tgt = d.goal === "lose" || d.goal === "gain";
    const kc = p => d.goal === "lose" ? `${OB_LOSE_PACE[p]} kcal` : `+%${Math.round(GAIN_PACE[p] * 100)}`;
    const pace = (id, p, t) => `<button id="${id}" type="button" class="${d.pace === p ? "on" : ""}" aria-pressed="${d.pace === p}" onclick="obPick('pace', '${p}')"><span class="ob-pace-t">${t}</span><span class="ob-pace-s">${kc(p)}</span></button>`;
    return `${obHead("Hedefin ne?", "")}
    <div class="ob-list">
      ${obOpt("obGoalLose", d.goal === "lose", "Kilo vermek", "Yağ kaybı, kası koruyarak", "obPick('goal', 'lose')")}
      ${obOpt("obGoalKeep", d.goal === "keep", "Kilomu korumak", "Aynı kiloda daha fit ve güçlü", "obPick('goal', 'keep')")}
      ${obOpt("obGoalGain", d.goal === "gain", "Kilo almak", "Kas kazanmak için kalori fazlası", "obPick('goal', 'gain')")}
    </div>
    ${tgt ? `${obField("obTarget", "Hedef kilo", "target", d.goal === "lose" ? fmtNum(Math.max(30, round1(obVals().weight - 5))) : fmtNum(round1(obVals().weight + 5)), "kg")}
    <div class="ob-group"><span class="t-field">${d.goal === "lose" ? "Ne kadar hızlı? (günlük kalori açığı)" : "Ne kadar hızlı? (günlük kalori fazlası)"}</span>
      <div class="t-seg ob-seg3">${pace("obPaceSlow", "slow", "Yavaş")}${pace("obPaceMid", "mid", "Orta")}${pace("obPaceFast", "fast", "Hızlı")}</div></div>` : ""}
    <p id="obWeekly" class="ob-weekly" aria-live="polite">${esc(obWeeklyText())}</p>`;
  }
  if (n === 4) return `${obHead("Gün içinde ne kadar hareketlisin?", "Antrenmanı sayma; antrenman günleri ayrıca hesaba katılır.")}
    <div class="ob-list">
      ${obOpt("obActLow", d.act === "low", "Az", "Masa başı iş, günde az yürüyüş", "obPick('act', 'low')")}
      ${obOpt("obActMid", d.act === "mid", "Orta", "Gün içinde biraz hareket", "obPick('act', 'mid')")}
      ${obOpt("obActHigh", d.act === "high", "Çok", "Ayakta ya da bedenen çalışılan iş", "obPick('act', 'high')")}
    </div>`;
  if (n === 5) return `${obHead("Antrenman deneyimin", "Örnek program buna göre hazırlanır.")}
    <div class="ob-list">
      ${obOpt("obExpNew", d.exp === "new", "Yeni başlıyorum", "Makine ve dambılla temel hareketler", "obPick('exp', 'new')")}
      ${obOpt("obExpPro", d.exp === "pro", "Salonu biliyorum", "Serbest ağırlık, üst/alt vücut bölünmesi", "obPick('exp', 'pro')")}
    </div>`;
  if (n === 6) return `${obHead("Neyle başlayalım?", "Hepsini istediğin zaman değiştirebilir, silebilir ya da kendi menünü ve programını sıfırdan kurabilirsin.")}
    <div class="ob-list">
      ${obCheckRow("obSampleMenu", "menu", "Örnek menü", "4 öğün; gramajlar kalori hedefine göre, antrenman ve dinlenme günü için ayrı")}
      ${obCheckRow("obSampleProgram", "prog", d.exp === "pro" ? "Örnek program: 4 gün üst/alt vücut" : "Örnek program: 3 gün tüm vücut", "Kilolar boş; ilk antrenmanda kendi kilonu girersin")}
      ${obCheckRow("obSampleMob", "mob", "Örnek esneme rutini", "Günlük esneme: 7 hareket, yaklaşık 10 dakika")}
    </div>
    <p class="ob-small">İşareti kaldırdığın bölüm boş başlar.</p>`;
  if (n === 7) {
    const tr = obTargets("train"), re = obTargets("rest"), wa = waterAutoInfo(obVals().weight);
    return `${obHead("Hazırsın", "Günlük hedeflerin:")}
    <div id="obSummary" class="ob-sum">
      <div class="ob-sum-hero"><span class="ob-sum-l">Antrenman günü</span><span class="ob-sum-kcal"><b class="t-display">${fmtInt(tr.calTarget)}</b> kcal</span>
        <span class="ob-sum-l">Dinlenme günü: <b>${fmtInt(re.calTarget)} kcal</b></span></div>
      <div class="ob-sum-row">
        <div class="ob-sum-c"><span class="ob-sum-l">Protein</span><b class="t-display">${tr.proTarget}</b><span class="ob-sum-u">g</span></div>
        <div class="ob-sum-c"><span class="ob-sum-l">Karb</span><b class="t-display">${tr.carbTarget}</b><span class="ob-sum-u">g</span></div>
        <div class="ob-sum-c"><span class="ob-sum-l">Yağ</span><b class="t-display">${tr.fatTarget}</b><span class="ob-sum-u">g</span></div>
      </div>
      <div class="ob-sum-water"><span>Su</span><b>${wa ? fmtNum(wa.total) : fmtNum(2.5)} L</b></div>
    </div>
    ${tr.floored || re.floored ? `<p id="obFloor" class="ob-floor">${tr.floored && re.floored ? "Antrenman ve dinlenme günü" : tr.floored ? "Antrenman günü" : "Dinlenme günü"} güvenli alt sınırda (${fmtInt(tr.floor)} kcal); kalori bunun altına indirilmez.</p>` : ""}
    <p class="ob-small">Hepsini Profil'den istediğin zaman değiştirebilirsin. Hesaplar tahminidir; tartıldıkça uygulama kalorini kilonun gidişine göre ayarlamayı önerir.</p>`;
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
  $("obDots").setAttribute("aria-label", `Adım ${obStep} / ${OB_STEPS}`);
  $("obBack").style.visibility = obStep > 1 ? "visible" : "hidden";
  $("obNext").classList.toggle("hidden", obStep === 1 || obStep === OB_STEPS);
  $("obFinish").classList.toggle("hidden", obStep !== OB_STEPS);
  $("obFoot").classList.toggle("hidden", obStep === 1);
  if (!keepScroll) {
    obSetErr("");
    if (sc) sc.scrollTop = 0;
    const t = $("obTitle");
    if (t && obStep > 1) { try { t.focus({ preventScroll: true }); } catch (e) { /* yoksay */ } }
  } else if (sc) sc.scrollTop = top;
}

function finishOnboarding() {
  const d = obDraft;
  if (!d) return;
  for (let n = 2; n <= 5; n++) { const e = obCheck(n); if (e) { obGo(n); obSetErr(e); return; } }
  const v = obVals(), tr = obTargets("train"), re = obTargets("rest");
  const st = state.settings;
  if (d.lang === "tr" || d.lang === "en") st.lang = d.lang;   // v46
  st.sex = d.sex === "female" ? "female" : "male";
  st.age = Math.round(v.age);
  st.height = Math.round(v.height);
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
  if (d.mob) state.mobilityRoutine.routines = [sampleMobility()];
  st.onboarded = true;
  state.activeTab = "nutrition";
  state.nutriView = "today";
  closeOnboarding();
  window.scrollTo(0, 0);
  renderAll();
  updateWakeLock();
  if (menuFailed) toast("Örnek menü şu an hazırlanamadı; menünü kendin ekleyebilirsin.", "error");
}
