// ---------------------------------------------------------------------------
// BESİNLER (arama, kategori, gramaj, hazır porsiyon, canlı kalan)
// ---------------------------------------------------------------------------
// dest: "day" → bugünkü plana (yalnızca bugün), "menu" → Menülerim'e
const foodUI = { meal: null, cat: "all", sel: null, amt: 0, dest: "day" };
function foodMeals() { return foodUI.dest === "menu" ? curMeals() : dayMeals(); }
function foodTargetIdx() {
  const meals = foodMeals();
  if (!meals.length) return -1;
  if (foodUI.meal != null && foodUI.meal >= 0 && foodUI.meal < meals.length) return foodUI.meal;
  const nx = meals.findIndex(m => !m.done);
  return nx >= 0 ? nx : 0;
}
function goAddFood(mIdx, dest) {
  foodUI.meal = mIdx;
  foodUI.sel = null;
  foodUI.dest = dest === "menu" ? "menu" : "day";
  state.nutriView = "foods";
  window.scrollTo(0, 0);
  renderAll();
}
function setFoodDest(d) { foodUI.dest = d === "menu" ? "menu" : "day"; renderAll(); }
function setFoodMeal(i) { foodUI.meal = i; renderAll(); }
function setFoodCat(c) { foodUI.cat = c; foodUI.sel = null; foodUI.limit = 0; renderFoods(); }
function foodCatKey(cat) { return "c:" + String(cat || "Diğer"); }

function renderFoods() {
  const meals = foodMeals();
  const tIdx = foodTargetIdx();
  $("foodMealChips").innerHTML = meals.map((m, i) => `<button onclick="setFoodMeal(${i})" class="n-chip ${i === tIdx ? "solid" : ""} max-w-[220px]" aria-pressed="${i === tIdx}"><span class="truncate">${esc(m.time ? m.time + " · " + m.title : m.title)}</span></button>`).join("");
  const db = getFoodDB();
  const cats = [];
  if (state.recentFoods.some(id => db[id] && !isHiddenFood(db[id]))) cats.push(["recent", t("Son kullanılanlar")]);
  if (state.combos.length) cats.push(["combos", t("Komboların")]);
  if (Object.keys(state.customFoods).some(id => id.startsWith("custom_recipe_"))) cats.push(["recipes", t("Tariflerim")]);
  if (Object.keys(state.customFoods).length) cats.push(["custom", t("Özel eklediklerim")]);
  [...new Set(Object.values(BASE_FOOD_DB).map(f => f.cat || "Diğer"))].forEach(c => cats.push([foodCatKey(c), stripEmoji(c)]));
  [...new Set(Object.values(USDA_DB).map(f => f.cat))].forEach(c => { if (!cats.some(x => x[0] === foodCatKey(c))) cats.push([foodCatKey(c), c]); });
  if (!cats.some(c => c[0] === foodUI.cat)) foodUI.cat = "all";
  $("foodCats").innerHTML = [["all", t("Tümü")], ...cats].map(([k, l]) => `<button onclick='setFoodCat(${esc(JSON.stringify(k))})' class="n-chip ${foodUI.cat === k ? "solid" : ""}">${esc(l)}</button>`).join("");
  renderFoodHead();
  renderFoodSuggest();
  renderFoodList();
}

function foodRemainingText(extraCal, extraP) {
  const targets = getTargets();
  const plan = nutritionTotals(foodMeals());
  const rc = targets.calTarget - Math.round(plan.cal + extraCal);
  const rp = targets.proTarget - Math.round(plan.p + extraP);
  const c = rc >= 0 ? `<strong class="tabular-nums">${fmtInt(rc)} kcal</strong> ${t("kalır")}` : `<strong class="tabular-nums n-over">${fmtInt(-rc)} kcal</strong> ${t("aşar")}`;
  const p = rp >= 0 ? `<strong class="n-p tabular-nums">${fmtInt(rp)} g</strong> ${t("protein kalır")}` : t("protein hedefi {g} aşılır", { g: `<strong class="n-p">${fmtInt(-rp)} g</strong>` });
  return `${c} · ${p}`;
}
function foodRemainPrefix(sel) {
  const menu = foodUI.dest === "menu";
  return sel ? (menu ? t("Ekledikten sonra menüde ") : t("Ekledikten sonra bugün ")) : (menu ? t("Menüde ") : t("Bugün "));
}
function renderFoodHead() {
  const meals = foodMeals();
  const tIdx = foodTargetIdx();
  const day = foodUI.dest !== "menu";
  const seg = `<div class="n-seg grid-cols-2 mb-1.5" aria-label="${esc(t("Nereye eklensin?"))}">
      <button id="fdDay" onclick="setFoodDest('day')" class="${day ? "on" : ""}" aria-pressed="${day}">${t("Sadece bugüne")}</button>
      <button id="fdMenu" onclick="setFoodDest('menu')" class="${day ? "" : "on"}" aria-pressed="${!day}">${t("Menüme (her gün)")}</button>
    </div>
    <p id="fdHint" class="text-[12px] n-dim mb-3 px-1">${day ? t("Yalnızca bugünkü öğüne eklenir; menün değişmez.") : t("Menüne eklenir; her gün geçerli olur.")}</p>`;
  if (tIdx < 0) {
    $("foodHead").innerHTML = seg + `<div class="n-card rounded-[20px] p-4 text-[14px] n-muted">${t("Besin eklemek için önce Menülerim'den bir öğün oluştur.")}</div>`;
    return;
  }
  const sel = foodSelMacros();
  $("foodHead").innerHTML = seg + `<div class="flex items-start justify-between gap-2">
      <div class="min-w-0"><div class="n-label">${day ? t("BUGÜN HANGİ ÖĞÜNE?") : t("MENÜDE HANGİ ÖĞÜNE?")}</div>
        <h2 class="text-[20px] font-extrabold leading-tight mt-0.5 break-words">${esc(meals[tIdx].title)}</h2></div>
    </div>
    <p id="foodRemain" class="text-[13px] n-muted mt-1">${foodRemainPrefix(sel)}${foodRemainingText(sel ? sel.cal : 0, sel ? sel.p : 0)}</p>`;
}

function foodSelMacros() {
  if (foodUI.sel && String(foodUI.sel).startsWith("combo:")) {
    const c = state.combos.find(x => "combo:" + x.id === foodUI.sel);
    if (!c) return null;
    const ct = itemsTotals(c.items);
    return { combo: true, f: null, a: 1, p: ct.p, c: ct.c, fat: ct.f, cal: ct.cal };
  }
  const f = foodUI.sel && getFoodDB()[foodUI.sel];
  if (!f) return null;
  const a = num(foodUI.amt, 0);
  return { f, a, p: f.p * a, c: f.c * a, fat: f.f * a, cal: kcalPerUnit(f) * a };
}

// Hazır porsiyonlar: [{ v: miktar, label }]. USDA besinlerinde USDA porsiyonları (gram karşılığıyla) gösterilir.
function foodPresets(f) {
  const def = num(f.def, 1);
  if (Array.isArray(f.portions) && f.portions.length) {
    const list = f.portions.map(([n, g], i) => ({ v: round1(g), label: `${portionL(f, i, n)} · ${fmtNum(g)} g` }));
    if (!list.some(x => x.v === 100)) list.push({ v: 100, label: "100 g" });
    return { list, plus: 50 };
  }
  let vals;
  if (f.unit === "g") vals = [def, 50, 100, 150, 200];
  else if (f.unit === "ml") vals = [def, 100, 200, 250, 330];
  else vals = [def, 0.5, 1, 2, 3].filter(v => v >= num(f.step, 1) || v === def);
  vals = [...new Set(vals.map(v => round1(v)))].filter(v => v > 0).sort((a, b) => a - b);
  const plus = f.unit === "g" || f.unit === "ml" ? 50 : num(f.step, 1);
  return { list: vals.map(v => ({ v, label: `${fmtNum(v)} ${unitL(v, f.unit)}${v === round1(def) ? t(" · porsiyon") : ""}` })), plus };
}

function renderFoodList() {
  const db = getFoodDB();
  const q = normSearch($("foodSearch").value).trim();
  const words = q.split(/\s+/).filter(Boolean);
  // v16: öneri kartı yalnızca arama boşken ve besin seçili değilken görünür
  if ($("foodSuggest")) $("foodSuggest").classList.toggle("hidden", !!q || !!foodUI.sel || !foodSuggestCache.length);
  let ids;
  // v15: komboalar ("Komboların" kategorisinde ve aramada adıyla eşleşenler)
  let comboHtml = "";
  if (foodUI.cat === "combos" || (foodUI.cat === "all" && words.length)) {
    comboHtml = state.combos.filter(c => !words.length || words.every(w => normSearch(c.name).includes(w))).map(comboRowHtml).join("");
  }
  if (foodUI.cat === "combos") {
    $("foodList").innerHTML = comboHtml || `<div class="text-[14px] n-muted text-center py-8">${t("Henüz kombon yok. Bir öğünü açıp ★ Kombo olarak kaydedebilirsin.")}</div>`;
    updateFoodSelUI();
    return;
  }
  if (foodUI.cat === "recent") ids = state.recentFoods.filter(id => db[id] && !isHiddenFood(db[id]));
  else if (foodUI.cat === "recipes") ids = Object.keys(state.customFoods).filter(id => id.startsWith("custom_recipe_") && db[id]);
  else if (foodUI.cat === "custom") ids = Object.keys(state.customFoods).filter(id => db[id]);
  else if (foodUI.cat.startsWith("c:")) ids = Object.keys(db).filter(id => !isHiddenFood(db[id]) && foodCatKey(db[id].cat) === foodUI.cat);
  else ids = Object.keys(db).filter(id => !isHiddenFood(db[id]));
  // v18: akıllı arama (Türkçe karakter, kelime sırası, eş anlamlı, küçük yazım hatası) + sıralama
  if (words.length) ids = searchFoods(ids, q);
  else if (foodUI.cat === "all") ids = rankBrowse(ids);
  const total = ids.length;
  const shownIds = ids.slice(0, foodUI.limit || FOOD_PAGE);
  if (foodUI.sel && !shownIds.includes(foodUI.sel) && ids.includes(foodUI.sel)) shownIds.unshift(foodUI.sel);   // seçili besin her zaman görünür
  if (words.length) { if (!total && !comboHtml) noteMissSearch($("foodSearch").value); else cancelMissSearch(); }
  const tIdx = foodTargetIdx();
  const html = shownIds.map(id => {
    const f = db[id];
    const def = num(f.def, 1);
    if (id !== foodUI.sel) {
      return `<button onclick='selectFood(${esc(JSON.stringify(id))})' class="w-full min-h-[64px] flex items-center justify-between gap-3 py-2.5 text-left n-bb" data-food="${esc(id)}">
          <span class="min-w-0"><span class="block text-[15px] font-bold leading-snug">${esc(foodNameL(f))}</span>
            <span class="block text-[12px] n-muted mt-0.5 tabular-nums">${esc(t("{n} {u} · {k} kcal · {p} g protein", { n: fmtNum(def), u: unitL(def, f.unit), k: String(Math.round(kcalPerUnit(f) * def)), p: String(Math.round(f.p * def)) }))}</span></span>
          <span class="w-10 h-10 rounded-full n-btn flex items-center justify-center shrink-0" aria-hidden="true">${svgI("plus", 20, 2.4)}</span>
        </button>`;
    }
    const pr = foodPresets(f);
    const custom = id.startsWith("custom_");
    return `<div class="n-elev n-sel rounded-[24px] p-4 space-y-3.5 my-2" data-food="${esc(id)}" id="foodSelCard">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0"><h3 class="text-[17px] font-extrabold leading-snug break-words">${esc(foodNameL(f))}</h3>
            <div class="text-[12px] n-muted mt-0.5">${esc(t(stripEmoji(f.cat || "")))}${f.barcode ? esc(t(" · barkod {b}", { b: f.barcode })) : ""}</div>
            ${foodSourceText(f) ? `<div class="text-[12px] n-dim mt-0.5" data-src>${esc(foodSourceText(f))}</div>` : ""}
            ${f.note ? `<div class="text-[12px] n-dim mt-0.5">${esc(f.note)}</div>` : ""}
            ${f.kx ? `<div class="text-[12px] n-dim mt-0.5">Kalori USDA ölçümüdür (${esc(f.kx)} nedeniyle makrolardan hesaplanandan farklı).</div>` : ""}</div>
          <div class="text-right shrink-0 whitespace-nowrap"><span id="foodSelKcal" class="t-display text-[28px] leading-none tabular-nums"></span><span class="text-[12px] n-muted ml-1">kcal</span></div>
        </div>
        <div class="flex items-center justify-between px-1">
          <button onclick="foodStep(-1)" class="w-12 h-12 rounded-full n-card flex items-center justify-center" aria-label="${esc(t("Azalt"))}">${svgI("minus", 20, 2.4)}</button>
          <div class="flex items-baseline justify-center gap-1 min-w-0">
            <input id="foodAmt" type="text" inputmode="decimal" data-fk="food-amt" value="${esc(fmtNum(foodUI.amt))}" oninput="foodAmtInput(this.value)" class="n-amt big t-display" aria-label="${esc(t("{ad} miktarı", { ad: foodNameL(f) }))}" />
            <span class="text-[14px] font-semibold n-muted">${esc(unitL(2, f.unit))}</span>
          </div>
          <button onclick="foodStep(1)" class="w-12 h-12 rounded-full n-card flex items-center justify-center" aria-label="${esc(t("Artır"))}">${svgI("plus", 20, 2.4)}</button>
        </div>
        ${naturalUnit(f) ? `<div class="flex items-center justify-between gap-2 n-card rounded-full pl-4 pr-1 py-1" data-unit-row>
            <span class="min-w-0 text-[13px] n-muted leading-tight"><strong id="foodUnitCount" class="n-text text-[15px]"></strong><span class="block text-[12px]">1 ${esc(naturalUnit(f).label)} = ${fmtNum(naturalUnit(f).g)} g</span></span>
            <div class="flex gap-1 shrink-0">
              <button onclick="foodUnitStep(-1)" class="w-11 h-11 rounded-full n-elev flex items-center justify-center" aria-label="${esc(t("Bir {u} azalt", { u: naturalUnit(f).label }))}">${svgI("minus", 18, 2.4)}</button>
              <button onclick="foodUnitStep(1)" class="w-11 h-11 rounded-full n-elev flex items-center justify-center" aria-label="${esc(t("Bir {u} artır", { u: naturalUnit(f).label }))}">${svgI("plus", 18, 2.4)}</button>
            </div>
          </div>` : ""}
        <div class="flex items-center justify-start gap-2 flex-wrap" aria-label="${esc(t("Hazır porsiyonlar"))}">
          ${pr.list.map(x => `<button onclick="foodPreset(${x.v})" class="n-chip ${round1(num(foodUI.amt)) === x.v ? "on" : ""}" data-preset="${x.v}">${esc(x.label)}</button>`).join("")}
          <button onclick="foodPreset(null, ${pr.plus})" class="n-chip">+${fmtNum(pr.plus)} ${esc(unitL(pr.plus, f.unit))}</button>
        </div>
        <div class="grid grid-cols-3 gap-2 text-center text-[13px] font-extrabold">
          <div id="foodSelP" class="py-2 rounded-full n-p" style="background: var(--n-p-soft)"></div>
          <div id="foodSelC" class="py-2 rounded-full n-k" style="background: var(--n-k-soft)"></div>
          <div id="foodSelF" class="py-2 rounded-full n-y" style="background: var(--n-y-soft)"></div>
        </div>
        ${microOf(f, 1) ? `<div id="foodSelMicro" class="text-[12px] n-muted text-center -mt-1"></div>` : ""}
        <button id="foodAddBtn" onclick="addSelectedFood()" class="n-btn w-full h-[52px] rounded-full text-[15px]" ${tIdx < 0 ? "disabled" : ""}></button>
        ${custom ? `<div class="flex justify-end gap-2 pt-1 n-bt">
            <button onclick='editCustomFood(${esc(JSON.stringify(id))})' class="n-btn-ghost h-11 px-4 rounded-full text-[13px] flex items-center gap-1.5">${svgI("edit", 16)}${t("Düzenle")}</button>
            <button onclick='deleteCustomFood(${esc(JSON.stringify(id))})' class="n-btn-ghost h-11 px-4 rounded-full text-[13px] flex items-center gap-1.5 n-over">${svgI("trash", 16)}${t("Sil")}</button>
          </div>` : ""}
      </div>`;
  }).join("");
  const more = total > shownIds.length
    ? `<button onclick="foodUI.limit = (foodUI.limit || FOOD_PAGE) + 100; renderFoodList()" class="n-btn-ghost w-full h-12 rounded-full text-[14px] mt-2" id="foodMore">${t("{n} sonuç daha · göster", { n: fmtInt(total - shownIds.length) })}</button>` : "";
  $("foodList").innerHTML = (comboHtml + html) ? comboHtml + html + more : noResultHtml($("foodSearch").value.trim());
  updateFoodSelUI();
}

// Seçili besinin canlı değerleri (tam yeniden çizim yapmadan; iPhone'da klavye kapanmasın)
function updateFoodSelUI() {
  const s = foodSelMacros();
  if (s && !s.combo && $("foodSelKcal")) {
    const tIdx = foodTargetIdx();
    $("foodSelKcal").textContent = fmtInt(s.cal);
    $("foodSelP").textContent = `${fmtNum(s.p)} g ${t("P|makro")}`;
    $("foodSelC").textContent = `${fmtNum(s.c)} g ${t("K|makro")}`;
    $("foodSelF").textContent = `${fmtNum(s.fat)} g ${t("Y|makro")}`;
    $("foodAddBtn").textContent = tIdx >= 0 ? t("Öğüne ekle · {k} kcal", { k: fmtInt(s.cal) }) : t("Önce bir öğün oluştur");
    $("foodAddBtn").disabled = tIdx < 0 || !(s.a > 0);
    document.querySelectorAll("#foodSelCard [data-preset]").forEach(b => b.classList.toggle("on", num(b.dataset.preset) === round1(s.a)));
    const f = getFoodDB()[foodUI.sel];
    const u = naturalUnit(f);
    if (u && $("foodUnitCount")) $("foodUnitCount").textContent = `${fmtNum(round1(s.a / u.g))} × ${u.label}`;
    const mi = microOf(f, s.a);
    if ($("foodSelMicro")) $("foodSelMicro").textContent = mi ? [mi.fib != null ? t("Lif {n} g", { n: fmtNum(mi.fib) }) : "", mi.salt != null ? t("Tuz {n} g", { n: fmtNum(mi.salt) }) : ""].filter(Boolean).join(" · ") : "";
  }
  const r = $("foodRemain");
  if (r) r.innerHTML = foodRemainPrefix(s) + foodRemainingText(s ? s.cal : 0, s ? s.p : 0);
}
function selectFood(id) {
  const f = getFoodDB()[id];
  if (!f) return;
  foodUI.sel = id;
  foodUI.amt = round1(num(f.def, 1));
  renderFoodHead();
  renderFoodList();
  const el = $("foodSelCard");
  if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
}
// v22: Doğal birim (adet, dilim, parça...): gramla seçilen besinlerde "adet ile" sayaç. Varsayılan porsiyon doğal birimse o seçilir.
const NATURAL_RX = /^1 (adet|dilim|parça|fileto|göğüs|baget|kanat|pirzola|köfte|yaprak|diş|sap|baş|koçan|çubuk|şerit|üst but)/;
function naturalUnit(f) {
  if (!f || f.unit !== "g" || !Array.isArray(f.portions)) return null;
  const nat = f.portions.map((p, i) => [p[0], p[1], i]).filter(([n, g]) => NATURAL_RX.test(n) && g > 0);
  if (!nat.length) return null;
  const p = nat.find(([, g]) => round1(g) === round1(num(f.def, 0))) || nat[0];
  return { label: portionL(f, p[2], p[0]).replace(/^1 /, ""), g: num(p[1], 0) };
}
function foodUnitStep(dir) {
  const f = foodUI.sel && getFoodDB()[foodUI.sel];
  const u = naturalUnit(f);
  if (!u) return;
  const n = Math.max(1, Math.round(num(foodUI.amt) / u.g) + dir);
  foodUI.amt = round1(n * u.g);
  $("foodAmt").value = fmtNum(foodUI.amt);
  updateFoodSelUI();
}
// v22: lif ve tuz (tuz = sodyum × 2,5). Veri yalnızca veritabanı (USDA) besinlerinde var.
function microOf(f, a) {
  if (!f) return null;
  const r = {};
  if (f.fib != null) r.fib = f.fib * a;
  if (f.na != null) r.salt = f.na * a * 2.5 / 1000;
  return r.fib == null && r.salt == null ? null : r;
}
function microTotals(view) {
  const db = getFoodDB();
  let fib = 0, salt = 0, n = 0, mFib = 0, mSalt = 0;
  dayMeals().forEach(m => {
    if (view === "eaten" && !m.done) return;
    m.items.forEach(it => {
      n++;
      const f = it.est ? null : db[it.foodId];
      const x = f ? microOf(f, effAmount(it)) : null;
      if (x && x.fib != null) fib += x.fib; else mFib++;
      if (x && x.salt != null) salt += x.salt; else mSalt++;
    });
  });
  return { fib, salt, n, miss: Math.max(mFib, mSalt) };
}
function fibTarget() { return Math.round(getTargets().calTarget / 1000 * 14); }   // 14 g / 1000 kcal (genel öneri)
const SALT_LIMIT = 5;   // g/gün (DSÖ önerisi)
function renderMicroLine(view) {
  const el = $("microLine");
  if (!el) return;
  const mc = microTotals(view);
  if (!mc.n) { el.innerHTML = ""; el.classList.add("hidden"); return; }
  el.classList.remove("hidden");
  const over = mc.salt > SALT_LIMIT;
  el.innerHTML = `<span>${t("Lif")} <strong class="text-white tabular-nums">${fmtNum(mc.fib)}</strong> / ${fibTarget()} g</span>
    <span>${t("Tuz")} <strong class="tabular-nums" style="color:${over ? "#FB7185" : "#fff"}">${fmtNum(mc.salt)}</strong> / ${SALT_LIMIT} g</span>
    ${mc.miss ? `<span class="text-white/60" data-micro-miss>${tn(mc.miss, "{n} besinde lif/tuz verisi yok")}</span>` : ""}`;
}
function foodAmtInput(v) { foodUI.amt = Math.max(0, num(v, 0)); updateFoodSelUI(); }
function foodStep(dir) {
  const f = foodUI.sel && getFoodDB()[foodUI.sel];
  if (!f) return;
  foodUI.amt = Math.max(0, round1(num(foodUI.amt) + dir * num(f.step, 1)));
  $("foodAmt").value = fmtNum(foodUI.amt);
  updateFoodSelUI();
}
function foodPreset(v, plus) {
  foodUI.amt = plus ? round1(num(foodUI.amt) + plus) : round1(v);
  $("foodAmt").value = fmtNum(foodUI.amt);
  updateFoodSelUI();
}
function addSelectedFood() {
  const s = foodSelMacros();
  const tIdx = foodTargetIdx();
  if (!s || tIdx < 0 || !(s.a > 0)) return;
  const fid = foodUI.sel, amt = s.a;
  if (foodUI.dest === "menu") {
    const mealTitle = curMeals()[tIdx].title;
    quickAdd(tIdx, fid, amt, curMeals());
    toast(t("{a} {u} {f} → {m} (menüne, her gün)", { a: fmtNum(amt), u: unitL(amt, s.f.unit), f: foodNameL(s.f), m: mealTitle }));
  } else {
    const list = ensureDayCopy();
    const meal = list[tIdx];
    quickAdd(tIdx, fid, amt, list);
    const mid = meal.id;
    toast(t("{a} {u} {f} → {m} (yalnızca bugün)", { a: fmtNum(amt), u: unitL(amt, s.f.unit), f: foodNameL(s.f), m: meal.title }), "ok", { label: t("Menüye de kaydet"), fn: () => addToMenuById(mid, fid, amt) });
  }
  foodUI.sel = null;
  renderFoods();
}
// Bugüne eklenen besini, aynı kimlikli menü öğününe de ekler
function addToMenuById(mealId, foodId, amount) {
  const mi = curMeals().findIndex(m => m.id === mealId);
  if (mi < 0) { toast(t("Bu öğün menüde bulunamadı"), "error"); return; }
  quickAdd(mi, foodId, amount, curMeals());
  toast(t("Menüdeki \"{m}\" öğününe de eklendi", { m: curMeals()[mi].title }));
}

// ---------------------------------------------------------------------------
// GEÇMİŞ
// ---------------------------------------------------------------------------
function renderNutriHistory() {
  const tgs = getTargets();
  const plan = nutritionTotals();
  const eaten = eatenTotals();
  const meals = dayMeals();
  const sup = state.supplements || {};
  const rows = [{
    key: state.today || logicalToday(), live: true, dayType: state.dayType,
    eatenKcal: eaten.cal, eatenP: eaten.p, kcal: plan.cal, calTarget: tgs.calTarget, proTarget: tgs.proTarget,
    water: state.waterLiters || 0, mealsDone: meals.filter(m => m.done).length, mealsTotal: meals.length,
    supps: state.supplementList.filter(x => sup[x.id]).length
  }];
  Object.keys(state.dailyLogs).sort().reverse().filter(k => k !== rows[0].key).slice(0, 60).forEach(k => rows.push({ key: k, ...state.dailyLogs[k] }));
  const dayLabel = k => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(k);
    return m ? fmtDay(new Date(+m[1], +m[2] - 1, +m[3]), { weekday: "short", day: "numeric", month: "short" }) : k;
  };
  const card = r => {
    const hasEaten = r.eatenKcal != null;
    const kc = Math.round(num(hasEaten ? r.eatenKcal : r.kcal, 0));
    const tg = Math.round(num(r.calTarget, 0));
    const pct = tg > 0 ? Math.min(100, Math.round(kc / tg * 100)) : 0;
    const over = tg > 0 && kc > tg;
    const bits = [];
    if (r.eatenP != null) bits.push(`${t("Protein")} <strong>${fmtInt(r.eatenP)}</strong>${r.proTarget ? " / " + fmtInt(r.proTarget) : ""} g`);
    if (r.water != null) bits.push(`${t("Su")} <strong>${fmtNum(num(r.water))}</strong> L`);
    if (r.mealsTotal) bits.push(`${t("Öğün")} <strong>${num(r.mealsDone)}/${num(r.mealsTotal)}</strong>`);
    if (r.supps != null) bits.push(`${t("Takviye")} <strong>${num(r.supps)}</strong>`);
    return `<div class="n-card rounded-[20px] p-4 space-y-2.5" data-history-day="${esc(r.key)}">
        <div class="flex items-center justify-between gap-2">
          <div class="text-[15px] font-bold">${r.live ? t("Bugün") : esc(dayLabel(r.key))}${r.live ? ` <span class="text-[12px] font-semibold n-accent">${t("· devam ediyor")}</span>` : ""}</div>
          ${r.dayType ? `<span class="text-[12px] font-semibold n-muted">${r.dayType === "rest" ? t("Dinlenme") : t("Antrenman")}</span>` : ""}
        </div>
        <div class="flex items-baseline gap-1.5"><span class="t-display text-[26px] leading-none tabular-nums ${over ? "n-over" : ""}">${fmtInt(kc)}</span>
          <span class="text-[13px] n-muted">${tg ? "/ " + fmtInt(tg) + " " : ""}kcal ${hasEaten ? t("yenen") : t("planlanan")}</span></div>
        ${tg ? `<div class="h-1.5 rounded-full n-bar-bg overflow-hidden"><div class="h-full rounded-full" style="width:${pct}%;background:${over ? "var(--n-over)" : "var(--n-accent)"}"></div></div>` : ""}
        ${bits.length ? `<div class="text-[12px] n-muted flex flex-wrap gap-x-3 gap-y-1">${bits.map(b => `<span>${b}</span>`).join("")}</div>` : ""}
      </div>`;
  };
  $("nutriHistory").innerHTML = weekCardHtml() + rows.map(card).join("")
    + (rows.length === 1 ? `<p class="text-[13px] n-muted text-center py-2">${t("Her gün gece yarısı (ya da \"Yeni gün\" ile) günün özeti buraya eklenir.")}</p>` : "")
    + `<button onclick="switchTab('progress')" class="n-btn-outline w-full h-12 rounded-full text-[14px]">${t("Grafikler için İlerleme sekmesine git")}</button>`;
}

// ---------------------------------------------------------------------------
// BARKOD (kamera → ZXing; ürün bilgisi Open Food Facts'ten, internet gerekir)
// ---------------------------------------------------------------------------
const bc = { reader: null, token: 0, found: null };
let cfPendingBarcode = null;
function bcStatus(msg) { $("bcStatus").textContent = msg || ""; }
function openBarcode() {
  $("bcResult").innerHTML = "";
  $("bcManual").value = "";
  bc.found = null;
  const m = $("barcodeModal");
  m.classList.remove("hidden"); m.classList.add("flex");
  startScan();
}
function closeBarcode() { stopScan(); closeModal("barcodeModal"); }
function loadZXing() {
  return new Promise((res, rej) => {
    if (window.ZXing) { res(window.ZXing); return; }
    const s = document.createElement("script");
    s.src = "vendor/zxing.min.js";
    s.onload = () => window.ZXing ? res(window.ZXing) : rej(new Error("ZXing yüklenemedi"));
    s.onerror = () => rej(new Error("ZXing yüklenemedi"));
    document.head.appendChild(s);
  });
}
async function startScan() {
  stopScan();
  const token = bc.token;
  const wrap = $("bcCamWrap");
  wrap.classList.remove("hidden");
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    wrap.classList.add("hidden");
    bcStatus(t("Bu cihazda kamera açılamadı. Barkod numarasını aşağıya elle yazabilirsin."));
    return;
  }
  bcStatus(t("Kamera açılıyor…"));
  try {
    const Z = await loadZXing();
    if (token !== bc.token) return;
    const hints = new Map();
    hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E, Z.BarcodeFormat.CODE_128]);
    const reader = new Z.BrowserMultiFormatReader(hints, 250);
    bc.reader = reader;
    await reader.decodeFromConstraints({ audio: false, video: { facingMode: { ideal: "environment" } } }, $("bcVideo"), (result) => {
      if (!result || token !== bc.token) return;
      const code = result.getText();
      stopScan();
      wrap.classList.add("hidden");
      onBarcode(code);
    });
    if (token === bc.token) bcStatus(t("Barkodu çerçevenin içine getir."));
  } catch (e) {
    if (token !== bc.token) return;
    stopScan();
    wrap.classList.add("hidden");
    const name = e && e.name;
    bcStatus(name === "NotAllowedError" || name === "SecurityError"
      ? t("Kamera izni verilmedi. iPhone'da Ayarlar → Safari → Kamera'dan izin verebilirsin. Numarayı aşağıya elle de yazabilirsin.")
      : name === "NotFoundError" || name === "OverconstrainedError"
        ? t("Kamera bulunamadı. Barkod numarasını aşağıya elle yazabilirsin.")
        : t("Kamera açılamadı. Barkod numarasını aşağıya elle yazabilirsin."));
  }
}
function stopScan() {
  bc.token++;
  try { if (bc.reader) bc.reader.reset(); } catch (e) { /* yoksay */ }
  bc.reader = null;
  const v = $("bcVideo");
  if (v && v.srcObject) { try { v.srcObject.getTracks().forEach(tr => tr.stop()); } catch (e) { /* yoksay */ } v.srcObject = null; }
}
function barcodeManual() { stopScan(); $("bcCamWrap").classList.add("hidden"); onBarcode($("bcManual").value); }

async function onBarcode(raw) {
  const code = String(raw || "").replace(/\D/g, "");
  $("bcResult").innerHTML = "";
  if (code.length < 8 || code.length > 14) { bcStatus(t("Geçerli bir barkod numarası değil (8–14 rakam olmalı).")); return; }
  $("bcManual").value = code;
  const local = Object.keys(state.customFoods).find(id => state.customFoods[id] && state.customFoods[id].barcode === code);
  if (local) {
    closeBarcode();
    pickFoodInFoods(local);
    toast(t("{f} listende vardı; miktarı seçip öğüne ekle", { f: state.customFoods[local].name }));
    return;
  }
  if (navigator.onLine === false) {
    bcStatus(t("{code} okundu. Ürünü bulmak için internet gerekli. Bağlanınca tekrar dene ya da besini elle ekle.", { code }));
    bcManualButton(code, "");
    return;
  }
  bcStatus(t("{code} aranıyor…", { code }));
  let p;
  try { p = await fetchOFF(code); }
  catch (e) {
    bcStatus(t("Ürün bilgisine ulaşılamadı. İnternet bağlantını kontrol edip tekrar dene ya da besini elle ekle."));
    bcManualButton(code, "");
    return;
  }
  if ($("bcManual").value !== code) return;   // bu arada başka barkod arandı
  if (!p) {
    // v14: bulunamayınca doğrudan etiket formu açılır
    closeBarcode();
    openLabelForm(code, "");
    return;
  }
  const n = p.nutriments || {};
  const v = k => { const x = n[k]; return x === "" || x == null ? NaN : num(x, NaN); };
  const pr = v("proteins_100g"), cb = v("carbohydrates_100g"), ft = v("fat_100g");
  let kcal = v("energy-kcal_100g");
  if (!isFinite(kcal) && isFinite(v("energy_100g"))) kcal = v("energy_100g") / 4.184;
  const name = String(p.product_name_tr || p.product_name || "").trim() || t("Ürün {code}", { code });
  const brand = String(p.brands || "").split(",")[0].trim();
  const unit = String(p.product_quantity_unit || "").toLowerCase() === "ml" ? "ml" : "g";
  const serving = num(p.serving_quantity, 0);
  const complete = [pr, cb, ft].every(x => isFinite(x) && x >= 0);
  bc.found = { code, name, brand, unit, p: pr, c: cb, f: ft, kcal: isFinite(kcal) ? kcal : null, def: serving > 0 && serving <= 1000 ? Math.round(serving) : 100 };
  const issues = complete ? labelCheck(isFinite(kcal) ? kcal : null, pr, cb, ft, 100) : [];
  bcStatus(!complete ? t("Ürün bulundu ama besin değerleri eksik.") : issues.length ? t("Ürün bulundu ama değerleri tutarsız görünüyor.") : t("Ürün bulundu."));
  $("bcResult").innerHTML = `<div class="n-elev rounded-[20px] p-4 space-y-2.5">
      <div><div class="text-[16px] font-bold leading-snug break-words">${esc(name)}</div><div class="text-[12px] n-muted">${brand ? esc(brand) + " · " : ""}${code}</div></div>
      ${complete
        ? `<div class="text-[13px]"><span class="n-muted">100 ${unit}:</span> <strong>${Math.round(isFinite(kcal) ? kcal : pr * 4 + cb * 4 + ft * 9)} kcal</strong> · <span class="n-p">${fmtNum(pr)} g ${t("P|makro")}</span> · <span class="n-k">${fmtNum(cb)} g ${t("K|makro")}</span> · <span class="n-y">${fmtNum(ft)} g ${t("Y|makro")}</span></div>
           ${issues.length
             ? `<div id="bcWarn" class="rounded-2xl p-3 text-[13px] leading-snug" style="background: var(--n-over-soft); color: var(--n-text)"><strong style="color: var(--n-over)">${t("⚠ Etiketle karşılaştır.")}</strong> ${esc(issues.join(" "))} ${t("Bu veriler gönüllülerce girilir; hata olabilir.")}</div>
                <button onclick="barcodeFixFood()" class="n-btn w-full h-12 rounded-full text-[15px]">${t("Etikete bakıp düzelt")}</button>
                <button onclick="addBarcodeFood()" class="n-btn-outline w-full h-12 rounded-full text-[15px]">${t("Yine de ekle")}</button>`
             : `<button onclick="addBarcodeFood()" class="n-btn w-full h-12 rounded-full text-[15px]">${t("Listeme ekle ve seç")}</button>`}`
        : `<p class="text-[13px] n-muted">${t("Paketin üzerindeki 100 {u} değerleriyle elle ekleyebilirsin.", { u: unit })}</p>
           <button onclick="barcodeManualFood()" class="n-btn w-full h-12 rounded-full text-[15px]">${t("Elle ekle")}</button>`}
    </div>`;
}
function bcManualButton(code, name) {
  bc.found = { code, name };
  $("bcResult").innerHTML = `<button onclick="barcodeManualFood()" class="n-btn-outline w-full h-12 rounded-full text-[15px]">${t("Etiketteki değerleri gir")}</button>`;
}
// v21: Etiket değerleri tutarlı mı? (Open Food Facts'te ve elle girişte sık görülen hatalar: kJ/kcal karışıklığı,
// ondalık hatası, porsiyon ↔ 100 g karışıklığı). base = değerlerin ait olduğu gram (100 ya da porsiyon); 0 = adet (yalnızca kalori sağlaması).
// Sonuç: sorun cümleleri (boşsa tutarlı).
function labelCheck(kcal, p, c, f, base) {
  const out = [];
  p = num(p, 0); c = num(c, 0); f = num(f, 0);
  if (base > 0 && p + c + f > base * 1.03) out.push(t("Protein + karb + yağ ({s} g), {b} g'ı aşıyor.", { s: fmtNum(p + c + f), b: fmtNum(base) }));
  const k = kcal == null || !isFinite(kcal) ? null : num(kcal, 0);
  if (base > 0 && k != null && k > base * 9.2) out.push(t("{b} g için {k} kcal olamaz (en fazla ~{m}).", { b: fmtNum(base), k: String(Math.round(k)), m: String(Math.round(base * 9)) }));
  if (k != null && (p + c + f) > 0) {
    const calc = p * 4 + c * 4 + f * 9;
    if (Math.abs(calc - k) > Math.max(12, 0.2 * Math.max(k, calc))) {
      const kj = Math.abs(calc * 4.184 - k) <= Math.max(25, 0.15 * k);
      out.push(t("Yazan kalori {k}, makrolardan hesaplanan {c}.", { k: String(Math.round(k)), c: String(Math.round(calc)) }) + (kj ? " " + t("Kalori yerine kilojoule (kJ) yazılmış olabilir.") : ""));
    }
  }
  return out;
}
async function fetchOFF(code) {
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = setTimeout(() => { if (ctrl) ctrl.abort(); }, 10000);
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,product_name_tr,brands,nutriments,serving_quantity,product_quantity_unit`, ctrl ? { signal: ctrl.signal } : {});
    if (r.status === 404) return null;
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    return j && j.status === 1 && j.product ? j.product : null;
  } finally { clearTimeout(timer); }
}
function addBarcodeFood() {
  const b = bc.found;
  if (!b || !isFinite(b.p)) return;
  const id = "custom_bc_" + b.code;
  const nm = (b.brand && !b.name.toLocaleLowerCase("tr").includes(b.brand.toLocaleLowerCase("tr")) ? `${b.name} (${b.brand})` : b.name).slice(0, 70);
  state.customFoods[id] = { name: "⭐ " + nm, cat: "⭐ Özel Eklediklerim", unit: b.unit, step: 10, def: b.def, p: b.p / 100, c: b.c / 100, f: b.f / 100, barcode: b.code };
  invalidateFoodDB();
  closeBarcode();
  pickFoodInFoods(id);
  toast(t("{f} listene eklendi; miktarı seçip öğüne ekle", { f: nm }));
}
// Tutarsız barkod ürünü: etiket formu bulunan değerlerle dolu açılır, kullanıcı paketteki tabloyla düzeltir
function barcodeFixFood() {
  const b = bc.found || {};
  if (!b.code) return;
  closeBarcode();
  openLabelForm(b.code, (b.brand && b.name && !b.name.toLocaleLowerCase("tr").includes(b.brand.toLocaleLowerCase("tr")) ? `${b.name} (${b.brand})` : b.name || "").slice(0, 50));
  $("cfHint").textContent = t("Barkod {code}. Bulunan değerler tutarsızdı; paketin besin tablosuyla karşılaştırıp düzelt (100 g değerleri).", { code: b.code });
  if (b.kcal != null) $("cfK").value = fmtNum(b.kcal);
  $("cfP").value = fmtNum(b.p); $("cfC").value = fmtNum(b.c); $("cfF").value = fmtNum(b.f);
}
function barcodeManualFood() {
  const b = bc.found || {};
  closeBarcode();
  if (b.code) {
    openLabelForm(b.code, b.name || "");
    $("cfHint").textContent = t("Barkod {code}. Paketin besin tablosundaki değerleri yaz (100 g ya da 1 porsiyon). Ürün bu barkodla kaydedilir; sonraki taramada internetsiz tanırım.", { code: b.code });
    return;
  }
  openCustomFoodModal();
  if (b.name) $("cfName").value = b.name;
}
function pickFoodInFoods(id) {
  state.nutriView = "foods";
  foodUI.cat = "all";
  $("foodSearch").value = "";
  renderAll();
  selectFood(id);
}
document.addEventListener("click", e => { if (e.target && e.target.id === "barcodeModal") closeBarcode(); });

function updateProfile() {
  state.weight = round1(num($("weightSlider").value, state.weight));
  state.deficit = Math.round(num($("deficitSlider").value, state.deficit));
  renderAll();
}
function setGoal(g) {
  if (g !== "lose" && g !== "keep" && g !== "gain") return;
  state.settings.goal = g;
  if (g === "lose" && !(state.deficit > 0)) state.deficit = 500;
  renderAll();
}
function setGainPace(p) {
  if (p !== "slow" && p !== "mid" && p !== "fast") return;
  state.settings.gainPace = p;
  renderAll();
}
function adjustWeight(d) { state.weight = Math.max(30, round1(state.weight + d)); renderAll(); }

function logCurrentWeight() {
  const now = Date.now();
  const last = state.weightLogs[state.weightLogs.length - 1];
  const entry = { date: fmtDateStore(now), weight: state.weight, ts: now };
  if (validBf(state.settings.bodyFat)) entry.bf = validBf(state.settings.bodyFat);
  if (last && last.ts && todayStr(new Date(last.ts)) === todayStr()) state.weightLogs[state.weightLogs.length - 1] = entry;
  else state.weightLogs.push(entry);
  toast(t("{w} kg kaydedildi", { w: fmtNum(state.weight) }));
  renderAll();
}
function deleteWeightLog(idx) {
  if (idx < 0) return;
  snapshot();
  state.weightLogs.splice(idx, 1);
  renderAll();
  offerUndo(t("Tartı kaydı silindi"));
}

function addWater(delta) { state.waterLiters = Math.max(0, Math.round(((state.waterLiters || 0) + delta) * 100) / 100); renderAll(); }
function toggleSupp(key) { state.supplements[key] = !state.supplements[key]; renderAll(); }
function toggleMealDone(mIdx) {
  const m = dayMeals()[mIdx];
  if (!m) return;
  m.done = !m.done;
  openDoneMeals.delete(m.id);
  renderAll();
}
function setDayType(type) { state.dayType = type; renderAll(); }

// Ekranda görünen miktar (kiloya göre gramaj açıksa ölçeklenmiş hâli) üzerinden çalışır
function changeAmount(mIdx, iIdx, dir) {
  const item = curMeals()[mIdx].items[iIdx];
  const f = getFoodDB()[item.foodId];
  const step = f ? num(f.step, 1) : 1;
  const next = Math.max(0, round1(effAmount(item) + dir * step));
  if (next === 0) { removeItem(mIdx, iIdx); return; }   // v25: 0'a inince silme Geri al ile
  item.amount = rawFromEff(f, next);
  renderAll();
}
function setAmount(mIdx, iIdx, val) {
  const n = num(val, NaN);
  const item = curMeals()[mIdx].items[iIdx];
  if (!item) return;
  // v25: boş / geçersiz giriş besini silmez, eski gram geri gelir; 0 yazınca Geri al ile silinir
  if (!isFinite(n) || n < 0) { renderAll(); return; }
  if (n === 0) { removeItem(mIdx, iIdx); return; }
  item.amount = rawFromEff(getFoodDB()[item.foodId], round1(n));
  renderAll();
}
function removeItem(mIdx, iIdx) {
  snapshot();
  const it = curMeals()[mIdx].items.splice(iIdx, 1)[0];
  const f = it ? getFoodDB()[it.foodId] : null;
  renderAll();
  offerUndo(t("{f} çıkarıldı", { f: f ? foodNameL(f) : t("Besin") }));
}

// amount: ekranda görünen miktar (ölçek açıksa saklanacak miktara çevrilir)
// meals verilmezse Menülerim (curMeals) kullanılır
function quickAdd(mIdx, foodId, amount, meals) {
  const list = meals || curMeals();
  const f = getFoodDB()[foodId];
  if (!f || !list[mIdx]) return;
  const raw = rawFromEff(f, amount);
  const existing = list[mIdx].items.find(i => i.foodId === foodId);
  if (existing) existing.amount = isScalable(f) && scaleK() !== 1 ? existing.amount + raw : round1(existing.amount + raw);
  else list[mIdx].items.push({ foodId, amount: raw });
  state.recentFoods = [foodId, ...state.recentFoods.filter(id => id !== foodId)].slice(0, 8);
  renderAll();
}

function openCustomFoodModal() {
  cfEditId = null;
  cfPendingBarcode = null;
  $("cfTitle").textContent = t("Kendi özel besinini tanımla");
  $("cfHint").classList.add("hidden");
  $("cfName").value = ""; $("cfUnit").value = "100g"; $("cfDef").value = "100";
  $("cfK").value = "";
  $("cfP").value = "20"; $("cfC").value = "10"; $("cfF").value = "5";
  cfUnitChanged();
  openModal("customFoodModal");
}
// v14: barkod bulunamayınca doğrudan etiket formu (ürün bu barkodla kaydedilir)
function openLabelForm(code, name) {
  openCustomFoodModal();
  cfPendingBarcode = code || null;
  $("cfTitle").textContent = t("Etiketteki değerleri gir");
  $("cfHint").textContent = t("Barkod {code} veritabanında yok. Paketin besin tablosundaki değerleri yaz (100 g ya da 1 porsiyon). Ürün bu barkodla kaydedilir; sonraki taramada internetsiz tanırım.", { code });
  $("cfHint").classList.remove("hidden");
  $("cfName").value = name || "";
  ["cfK", "cfP", "cfC", "cfF"].forEach(id => { $(id).value = ""; });
}
function cfUnitChanged() {
  const m = $("cfUnit").value;
  $("cfDefLabel").textContent = m === "serv" ? t("1 porsiyon kaç gram?") : m === "1adet" ? t("Varsayılan miktar (adet):") : t("Varsayılan miktar (g):");
}
async function saveCustomFood() {
  const name = $("cfName").value.trim();
  if (!name) { sayAlert(t("Ad eksik"), t("Lütfen besin adını gir.")); return; }
  const unitMode = $("cfUnit").value;
  const def = num($("cfDef").value, 100) || 100;
  const p = num($("cfP").value), c = num($("cfC").value), f = num($("cfF").value);
  const kRaw = $("cfK").value.trim();
  const k = kRaw === "" ? null : num(kRaw, NaN);
  if ([p, c, f].some(x => x < 0) || (k != null && !(k >= 0))) { sayAlert(t("Değer hatalı"), t("Değerler negatif olamaz; kaloriyi rakamla yaz.")); return; }
  if (unitMode === "serv" && !(def > 0 && def <= 2000)) { sayAlert(t("Porsiyon eksik"), t("Lütfen 1 porsiyonun kaç gram olduğunu yaz (etikette yazar, örn: 30).")); return; }
  // v21: etiket tutarlılık kontrolü (100 g / 1 porsiyon; adet modunda yalnızca kalori sağlaması)
  const lc = labelCheck(k, p, c, f, unitMode === "1adet" ? 0 : unitMode === "serv" ? def : 100);
  if (lc.length && !(await askConfirm(t("Değerler tutarsız görünüyor"), lc.join(" ") + " " + t("Etiketle karşılaştır; doğruysa yine de kaydedebilirsin."), t("Yine de kaydet")))) return;
  const editing = cfEditId && state.customFoods[cfEditId];
  const prev = editing ? state.customFoods[cfEditId] : null;
  const barcode = prev && prev.barcode ? prev.barcode : cfPendingBarcode;
  const id = editing ? cfEditId : barcode ? "custom_bc_" + barcode : "custom_" + Date.now();
  cfEditId = null;
  cfPendingBarcode = null;
  const gUnit = prev && prev.unit === "ml" ? "ml" : "g";
  const base = unitMode === "1adet" ? 1 : unitMode === "serv" ? def : 100;
  const food = unitMode === "1adet"
    ? { name: "⭐ " + name, cat: "⭐ Özel Eklediklerim", unit: "adet", step: 1, def, p, c, f }
    : { name: "⭐ " + name, cat: "⭐ Özel Eklediklerim", unit: gUnit, step: 10, def, p: p / base, c: c / base, f: f / base };
  if (unitMode === "serv") food.serv = def;
  if (k != null) food.kcal = k / base;
  if (barcode) food.barcode = barcode;
  state.customFoods[id] = food;
  invalidateFoodDB();
  closeModal("customFoodModal");
  toast(editing ? t("{f} güncellendi", { f: name }) : t("{f} besin listene eklendi", { f: name }));
  renderAll();
  if (!editing && state.activeTab === "nutrition" && state.nutriView === "foods") selectFood(id);
}

