// ---------------------------------------------------------------------------
// v51 — İNGİLİZCE BESİN ADLARI: foods-en.js (USDA'nın kendi adları/porsiyon etiketleri) yalnızca dil İngilizceyken
// yüklenir; gösterim yardımcıları besin nesnesini DEĞİŞTİRMEZ (kayıt/menü/foodSnap Türkçe + kimlik tabanlı kalır).
// Not: t() ve EN bu dosyadaki işlevler çağrılana dek tanımlıdır; üst düzeyde çağrılmaz.
// ---------------------------------------------------------------------------
// Uygulamanın kendi listesi (BASE_FOOD_DB kimliği → İngilizce ad; karar 3: genel besin İngilizce, Türkiye'ye özgü ürün Türkçe adıyla + kısa İngilizce açıklama).
// Besin adı verisidir (sözlük değeri değil); besin nesnesinde Türkçe ad kalır, yalnızca gösterimde foodNameL kullanır.
var BASE_EN = {
  tam_yumurta: "Whole egg (large)",
  yumurta_beyazi: "Egg white",
  whey_shake: "Whey protein shake (with water)",
  lor_peyniri: "Lor peyniri (curd cheese)",
  hindi_fume: "Smoked turkey",
  suzme_yogurt: "Strained yogurt (low-fat)",
  kefir: "Plain kefir",
  tavuk_gogsu: "Chicken breast (raw)",
  tavuk_incik: "Chicken thigh / drumstick (skinless, raw)",
  hindi_gogsu: "Turkey breast (raw)",
  dana_kiyma: "Lean beef mince / steak (raw)",
  somon: "Salmon (raw)",
  ton_baligi: "Tuna (drained)",
  yulaf: "Oats",
  pirinc: "Baldo (medium-grain) or jasmine rice (raw)",
  basmati: "Basmati rice (raw)",
  makarna_tam: "Whole wheat / durum pasta (raw)",
  bulgur: "Bulgur / buckwheat (raw)",
  patates: "Potato, for baking or boiling (raw)",
  tatli_patates: "Sweet potato (raw)",
  tam_bugday_ekmek: "Whole wheat / sourdough bread",
  lavas: "Whole wheat lavash (flatbread)",
  pirinc_patlagi: "Rice cake",
  pirinc_unu: "Rice flour / cream of rice",
  muz: "Banana (medium)",
  yesil_elma: "Green apple / 1 portion of fruit",
  yesil_salata: "Large bowl green salad (rocket, lettuce, parsley, cucumber)",
  brokoli_karnabahar: "Steamed broccoli and cauliflower",
  ispanak_kabak: "Sauteed spinach / courgette / asparagus",
  domates_salatalik: "Fresh tomato, cucumber and pepper",
  greens_scoop: "Greens and superfoods powder",
  badem: "Raw almonds",
  ceviz: "Walnut kernels",
  findik: "Raw hazelnuts",
  kaju: "Raw cashews",
  yer_fistigi: "Roasted peanuts",
  kabak_cekirdegi: "Raw pumpkin seed kernels",
  fistik_ezmesi: "100% peanut butter (no added sugar)",
  avokado: "Avocado (peeled)",
  zeytinyagi: "Cold-pressed olive oil (5 g = 1 teaspoon)",
  zeytin: "Black / green olives",
  peynirsiz_whopper: "Burger (no cheese / classic beef)",
  ince_pizza_dilim: "Thin-crust pizza (margherita / loaded)",
  citir_tavuk_parca: "Crispy chicken breast / tenders",
  cig_kofte_durum: "Çiğ köfte wrap (meat-free / extra greens)",
  tavuk_gogsu_pismis: "Chicken breast (cooked / grilled)",
  patates_kizartmasi: "French fries (~150 g serving)",
  tr_mercimek_corba: "Mercimek çorbası (red lentil soup)",
  tr_ezogelin: "Ezogelin çorbası (red lentil and bulgur soup)",
  tr_tavuk_corba: "Tavuk suyu çorba (chicken broth soup)",
  tr_yayla_corba: "Yayla çorbası (yogurt soup)",
  tr_kuru_fasulye: "Kuru fasulye (white bean stew, ~250 g serving)",
  tr_nohut: "Nohut yemeği (chickpea stew, ~250 g serving)",
  tr_taze_fasulye: "Zeytinyağlı taze fasulye (green beans in olive oil, ~200 g)",
  tr_karniyarik: "Karnıyarık (stuffed aubergine, 1 serving)",
  tr_imam_bayildi: "İmam bayıldı (aubergine in olive oil, serving)",
  tr_pirinc_pilavi: "Rice pilaf (cooked)",
  tr_bulgur_pilavi: "Bulgur pilaf (cooked)",
  tr_manti: "Yoğurtlu mantı (dumplings with yogurt, ~250 g serving)",
  tr_menemen: "Menemen (2-egg serving)",
  tr_sucuklu_yumurta: "Sucuklu yumurta (eggs with sucuk, 1 serving)",
  tr_beyaz_peynir: "Beyaz peynir (white cheese, full-fat)",
  tr_kasar: "Kaşar peyniri (kashar cheese)",
  tr_bal: "Honey",
  tr_simit: "Simit (sesame bread ring)",
  tr_pogaca: "Poğaça (savoury pastry)",
  tr_su_boregi: "Su böreği (layered pastry, ~150 g slice)",
  tr_sigara_boregi: "Sigara böreği (fried cheese rolls)",
  tr_gozleme: "Peynirli gözleme (cheese flatbread)",
  tr_tost: "Cheese toastie (Kaşar)",
  tr_beyaz_ekmek: "White bread (slice)",
  tr_lahmacun: "Lahmacun (flatbread with minced meat)",
  tr_pide: "Kıymalı pide (pide with minced meat)",
  tr_tavuk_doner_durum: "Tavuk döner dürüm (chicken doner wrap)",
  tr_tavuk_doner: "Chicken doner (no bread, ~150 g)",
  tr_et_doner: "Meat doner (no bread, ~150 g)",
  tr_iskender: "İskender (doner on bread with yogurt and tomato sauce, 1 serving)",
  tr_adana: "Adana kebap (no lavash, 1 serving)",
  tr_tavuk_sis: "Chicken shish (no lavash, ~200 g)",
  tr_izgara_kofte: "Izgara köfte (grilled meatballs)",
  tr_izgara_balik: "Grilled sea bass / sea bream (~200 g)",
  tr_yaprak_sarma: "Zeytinyağlı yaprak sarma (stuffed vine leaves in olive oil)",
  tr_mercimek_kofte: "Mercimek köftesi (red lentil balls)",
  tr_cacik: "Cacık (yogurt and cucumber dip)",
  tr_ayran: "Ayran (yogurt drink)",
  tr_baklava: "Baklava",
  tr_sutlac: "Sütlaç (rice pudding)",
  tr_kunefe: "Künefe (cheese pastry dessert, 1 serving)",
  tr_kumpir: "Kumpir (loaded baked potato)"
};
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
  if (e && Array.isArray(e[1]) && typeof e[1][i] === "string" && e[1][i]) return e[1][i];
  return label === "1 porsiyon" ? t("1 porsiyon") : label;   // yerleşik tarifin tek porsiyonu
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

// ---------------------------------------------------------------------------
// v51 görev 3 — kategori adları, notlar, kalori istisnası, hareket kütüphanesi adları (hepsi yalnızca gösterim; kayıt Türkçe kalır)
// ---------------------------------------------------------------------------
Object.assign(EN, {
  // besin kategorileri (anahtar = foods.js "c" ve BASE_FOOD_DB "cat" metni, emojisiz)
  "Kırmızı et": "Red meat", "Sakatat": "Organ meats", "Şarküteri": "Deli meats", "Tavuk ve hindi": "Poultry", "Balık ve deniz ürünleri": "Fish and seafood",
  "Yumurta": "Eggs", "Süt ürünleri": "Dairy", "Takviyeler": "Supplements", "Peynirler": "Cheeses", "Tatlılar": "Sweets and desserts", "Sebzeler": "Vegetables",
  "Soslar ve çorbalar": "Sauces and soups", "Kahvaltılıklar": "Breakfast foods", "Baklagiller": "Legumes", "Kuruyemiş ve tohumlar": "Nuts and seeds",
  "Meyveler": "Fruits", "İçecekler": "Beverages", "Baharatlar": "Spices", "Yağlar": "Oils and fats", "Tahıllar ve makarna": "Grains and pasta",
  "Kahvaltılık gevrekler": "Breakfast cereals", "Atıştırmalıklar": "Snacks", "Ekmek ve hamur işleri": "Bread and pastries", "Hazır yemekler": "Prepared meals",
  "Türk yemekleri (tarif)": "Turkish dishes (recipes)",
  "Protein & Kahvaltı": "Protein and breakfast", "Et / Tavuk / Balık": "Meat / Poultry / Fish", "Karbonhidratlar": "Carbs", "Yeşillik & Sebzeler": "Greens and vegetables",
  "Kuruyemiş & Sağlıklı Yağlar": "Nuts and healthy fats", "Esnek Diyet / Dışarıdan": "Flexible diet / Eating out", "Türk Mutfağı": "Turkish cuisine",
  // kalori istisnası cümlesi ve nedenleri (f.kx)
  "Kalori USDA ölçümüdür ({x} nedeniyle makrolardan hesaplanandan farklı).": "Calories are USDA-measured (they differ from the macro-based calculation because of {x}).",
  "lif|kalori istisnası": "fibre", "alkol|kalori istisnası": "alcohol", "tatlandırıcı|kalori istisnası": "sweetener",
  // yerleşik tarif notları (foods.js "t"; cümle cümle)
  "Salça, USDA'da olmadığı için kuru domates/biber tozu + su olarak hesaplandı.": "Tomato/pepper paste is not in USDA, so it was calculated as dried tomato/pepper powder plus water.",
  "Balık olarak pişmiş levrek değeri kullanıldı.": "The value for cooked sea bass was used for the fish.",
  "Barbunya yerine benzer pinto fasulyesi ile hesaplandı.": "Calculated with similar pinto beans instead of borlotti beans.",
  "Ispanak pişmiş ağırlığıyla hesaplandı.": "Spinach was calculated by its cooked weight.",
  "Kızartmada kaybedilen su düşülerek (kızarmış ağırlık) hesaplandı.": "Calculated after subtracting the water lost in frying (fried weight).",
  "Közlenmiş patlıcan yerine haşlanmış patlıcan değeri kullanıldı.": "The value for boiled aubergine was used instead of roasted aubergine.",
  "Kaşar yerine besin değeri çok yakın olan provolone ile hesaplandı.": "Calculated with provolone, which has very similar nutrition, instead of kashar cheese.",
  "Lavaş ve garnitür dahil değil.": "Lavash bread and sides are not included.",
  "Lavaş dahil değil; kuzu but için fırınlanmış değer kullanıldı.": "Lavash bread is not included; the roasted value was used for lamb leg.",
  "Lavaş yerine buğday tortillası ile hesaplandı.": "Calculated with a wheat tortilla instead of lavash.",
  "Lavaş dahil değil.": "Lavash bread is not included.",
  "Buğulama için kuru ısıda pişmiş levrek değeri kullanıldı.": "The dry-heat cooked sea bass value was used for steaming.",
  "Yanındaki yoğurt dahil değil.": "The yogurt served alongside is not included.",
  "Yufka yerine phyllo hamuru ile hesaplandı.": "Calculated with phyllo dough instead of yufka.",
  "Beyaz peynir yerine feta ile hesaplandı.": "Calculated with feta instead of white cheese.",
  "Pişirmede buharlaşan suyun bir kısmı tarifteki sudan düşüldü.": "Part of the water that evaporates during cooking was subtracted from the water in the recipe.",
  "Kolot/çeçil peyniri yerine mozzarella ile hesaplandı.": "Calculated with mozzarella instead of kolot/çeçil cheese.",
  "Nar ekşisi yerine nar suyu ile hesaplandı.": "Calculated with pomegranate juice instead of pomegranate molasses.",
  "Süzme yoğurt için tam yağlı Yunan yoğurdu, beyaz peynir için feta kullanıldı.": "Full-fat Greek yogurt was used for strained yogurt, and feta for white cheese.",
  "Yaklaşık tarif.": "Approximate recipe.",
  "Kaymak/tahin dahil değil.": "Kaymak/tahini is not included.",
  "Kaymak dahil değil.": "Kaymak is not included."
});
// Yerleşik tarif notu (f.src === "tarif"): cümle cümle sözlükten; Türkçede ve özel besinde olduğu gibi.
function foodNoteL(f) {
  if (!f || !f.note) return f ? f.note : "";
  if (curLang() !== "en" || f.src !== "tarif") return f.note;
  const parts = String(f.note).match(/[^.]+\./g);
  return parts ? parts.map(x => t(x.trim())).join(" ") : f.note;
}
// Kalori istisnasının nedeni (f.kx: lif | alkol | tatlandırıcı)
function kxL(x) {
  return ({ "lif": t("lif|kalori istisnası"), "alkol": t("alkol|kalori istisnası"), "tatlandırıcı": t("tatlandırıcı|kalori istisnası") })[x] || x;
}
// Hareket kütüphanesi adı (gösterim). Yalnızca EXERCISE_LIBRARY adları: İngilizcede Türkçe parantez kaldırılır ya da İngilizcesi yazılır.
// Kayıtlı ad, exKey ve geçmiş anahtarı DEĞİŞMEZ; kullanıcının kendi yazdığı ad aynen döner.
const EX_EN = {
  "Weighted Dips (Göğüs Odaklı)": "Weighted Dips (Chest Focus)",
  "Low-to-High Cable Fly (Üst Göğüs)": "Low-to-High Cable Fly (Upper Chest)",
  "Push-Up (Şınav) / Weighted Push-Up": "Push-Up / Weighted Push-Up",
  "Pull-up (Geniş Tutuş Barfiks)": "Pull-up (Wide Grip)",
  "Weighted Pull-up (Ağırlıklı Barfiks)": "Weighted Pull-up",
  "Chin-up (Avuç İçi Bakan Barfiks)": "Chin-up (Palms Facing You)",
  "Lat Pulldown (Wide Grip / Geniş Tutuş)": "Lat Pulldown (Wide Grip)",
  "Chest-Supported Row (Makine veya Sehpa)": "Chest-Supported Row (Machine or Bench)",
  "Wide-Grip Seated Cable Row (Üst Sırt)": "Wide-Grip Seated Cable Row (Upper Back)",
  "T-Bar Row (Landmine veya Makine)": "T-Bar Row (Landmine or Machine)",
  "Inverted Row (Vücut Ağırlığı Yatay Çekiş)": "Inverted Row (Bodyweight Horizontal Pull)",
  "Rack Pull (Kısmi Deadlift)": "Rack Pull (Partial Deadlift)",
  "Hyperextension (45 Derece Back Extension)": "Hyperextension (45-Degree Back Extension)",
  "Reverse Pec Deck (Arka Omuz Makinesi)": "Reverse Pec Deck (Rear Delt Machine)",
  "Dumbbell Shrug (Trapez)": "Dumbbell Shrug (Traps)",
  "Leg Press (45 Derece)": "Leg Press (45-Degree)",
  "Leg Extension (Çift Bacak)": "Leg Extension (Both Legs)",
  "Single-Leg Extension (Tek Bacak)": "Single-Leg Extension",
  "Hip Abduction Machine (Dış Bacak / Yan Kalça)": "Hip Abduction Machine (Outer Thigh / Hip)",
  "Hip Adduction Machine (İç Bacak)": "Hip Adduction Machine (Inner Thigh)",
  "Standing Calf Raise (Makine veya Smith)": "Standing Calf Raise (Machine or Smith)",
  "Preacher Curl (EZ-Bar / Makine)": "Preacher Curl (EZ-Bar / Machine)",
  "Bayesian Cable Curl (Arkadan Kablo Curl)": "Bayesian Cable Curl",
  "Reverse Barbell / Cable Curl (Ön Kol)": "Reverse Barbell / Cable Curl (Forearm)",
  // v62: eski birleşik ad listeden çıktı (ikiye ayrıldı); kayıtta kalmışsa İngilizce gösterimi için duruyor
  "Wrist Curl / Reverse Wrist Curl (Bilek)": "Wrist Curl / Reverse Wrist Curl",
  "Wrist Curl (Bilek)": "Wrist Curl",
  "Reverse Wrist Curl (Bilek)": "Reverse Wrist Curl",
  "Skullcrusher (EZ-Bar / Dumbbell Alna Triceps)": "Skullcrusher (EZ-Bar / Dumbbell)",
  "Kneeling Cable Crunch (Halatla)": "Kneeling Cable Crunch (Rope)",
  "Pallof Press (Anti-Rotasyon)": "Pallof Press (Anti-Rotation)",
  "Incline Treadmill Walk (Eğimli Yürüyüş)": "Incline Treadmill Walk",
  "Stairmaster (Merdiven Makinesi)": "Stairmaster (Stair Climber)",
  "Stationary Bike (Sabit Bisiklet)": "Stationary Bike",
  "Rowing Machine (Kürek)": "Rowing Machine",
  "Jump Rope (İp Atlama)": "Jump Rope",
  "Treadmill Run (Koşu Bandı)": "Treadmill Run",
  "Outdoor Run (Açık Hava Koşu)": "Outdoor Run",
  "Outdoor Walk (Tempolu Yürüyüş)": "Outdoor Walk (Brisk)",
  "Outdoor Cycling (Bisiklet)": "Outdoor Cycling",
  "Swimming (Yüzme)": "Swimming",
  "Farmer's Walk (Çiftçi Yürüyüşü)": "Farmer's Walk"
};
function exNameL(name) {
  if (curLang() !== "en") return name;
  const k = String(name == null ? "" : name).trim();
  return Object.prototype.hasOwnProperty.call(EX_EN, k) ? EX_EN[k] : name;
}
