// ============================================================================
// 1. ZENGİN BESİN VERİTABANI
// ============================================================================
const BASE_FOOD_DB = {
  tam_yumurta: { name: "Tam Yumurta (L Boy)", cat: "Protein & Kahvaltı", unit: "adet", step: 1, def: 3, p: 6.3, c: 0.4, f: 5.0, hidden: true, replace: "u171287" },
  yumurta_beyazi: { name: "Yumurta Beyazı", cat: "Protein & Kahvaltı", unit: "adet", step: 1, def: 4, p: 3.6, c: 0.2, f: 0.0, hidden: true, replace: "u172183" },
  whey_shake: { name: "Whey Protein Shake (Su ile)", cat: "Protein & Kahvaltı", unit: "ölçek", step: 0.5, def: 1, p: 24.0, c: 2.0, f: 1.5 },
  lor_peyniri: { name: "Lor Peyniri", cat: "Protein & Kahvaltı", unit: "g", step: 25, def: 100, p: 0.18, c: 0.02, f: 0.02 },
  hindi_fume: { name: "Hindi Füme", cat: "Protein & Kahvaltı", unit: "g", step: 20, def: 60, p: 0.18, c: 0.02, f: 0.02 },
  suzme_yogurt: { name: "Süzme Yoğurt (Az Yağlı)", cat: "Protein & Kahvaltı", unit: "g", step: 50, def: 150, p: 0.10, c: 0.04, f: 0.015, hidden: true, replace: "u170903" },
  kefir: { name: "Sade Kefir", cat: "Protein & Kahvaltı", unit: "ml", step: 50, def: 250, p: 0.032, c: 0.04, f: 0.02 },

  tavuk_gogsu: { name: "Tavuk Göğsü (Çiğ)", cat: "Et / Tavuk / Balık", unit: "g", step: 25, def: 200, p: 0.23, c: 0.0, f: 0.015, hidden: true, replace: "u171077" },
  tavuk_incik: { name: "Tavuk Kalça / İncik (Derisiz Çiğ)", cat: "Et / Tavuk / Balık", unit: "g", step: 25, def: 200, p: 0.19, c: 0.0, f: 0.06 },
  hindi_gogsu: { name: "Hindi Göğsü (Çiğ)", cat: "Et / Tavuk / Balık", unit: "g", step: 25, def: 200, p: 0.24, c: 0.0, f: 0.01, hidden: true, replace: "u174515" },
  dana_kiyma: { name: "Yağsız Dana Kıyma / Biftek (Çiğ)", cat: "Et / Tavuk / Balık", unit: "g", step: 25, def: 200, p: 0.21, c: 0.0, f: 0.06 },
  somon: { name: "Somon Balığı (Çiğ)", cat: "Et / Tavuk / Balık", unit: "g", step: 25, def: 180, p: 0.20, c: 0.0, f: 0.11, hidden: true, replace: "u175167" },
  ton_baligi: { name: "Ton Balığı (Süzülmüş)", cat: "Et / Tavuk / Balık", unit: "g", step: 20, def: 120, p: 0.25, c: 0.0, f: 0.01, hidden: true, replace: "u171986" },

  yulaf: { name: "Yulaf Ezmesi", cat: "Karbonhidratlar", unit: "g", step: 10, def: 80, p: 0.13, c: 0.60, f: 0.07, hidden: true, replace: "u173904" },
  pirinc: { name: "Baldo / Yasemin Pirinç (Çiğ)", cat: "Karbonhidratlar", unit: "g", step: 10, def: 90, p: 0.07, c: 0.78, f: 0.005 },
  basmati: { name: "Basmati Pirinç (Çiğ)", cat: "Karbonhidratlar", unit: "g", step: 10, def: 90, p: 0.08, c: 0.77, f: 0.006 },
  makarna_tam: { name: "Tam Buğday / Durum Makarna (Çiğ)", cat: "Karbonhidratlar", unit: "g", step: 10, def: 85, p: 0.12, c: 0.72, f: 0.018 },
  bulgur: { name: "Pilavlık Bulgur / Karabuğday (Çiğ)", cat: "Karbonhidratlar", unit: "g", step: 10, def: 85, p: 0.12, c: 0.70, f: 0.015 },
  patates: { name: "Fırın / Haşlama Patates (Çiğ)", cat: "Karbonhidratlar", unit: "g", step: 50, def: 300, p: 0.02, c: 0.18, f: 0.001, hidden: true, replace: "u170026" },
  tatli_patates: { name: "Tatlı Patates (Çiğ)", cat: "Karbonhidratlar", unit: "g", step: 50, def: 250, p: 0.016, c: 0.20, f: 0.001, hidden: true, replace: "u168482" },
  tam_bugday_ekmek: { name: "Tam Buğday / Ekşi Mayalı Ekmek", cat: "Karbonhidratlar", unit: "dilim", step: 1, def: 2, p: 2.7, c: 14.0, f: 0.6 },
  lavas: { name: "Tam Buğday Lavaş", cat: "Karbonhidratlar", unit: "adet", step: 1, def: 1, p: 5.0, c: 28.0, f: 1.5 },
  pirinc_patlagi: { name: "Pirinç Patlağı", cat: "Karbonhidratlar", unit: "adet", step: 1, def: 4, p: 0.8, c: 7.0, f: 0.2 },
  pirinc_unu: { name: "Pirinç Unu / Cream of Rice", cat: "Karbonhidratlar", unit: "g", step: 10, def: 60, p: 0.06, c: 0.80, f: 0.01, hidden: true, replace: "u169714" },
  muz: { name: "Muz (Orta Boy)", cat: "Karbonhidratlar", unit: "adet", step: 0.5, def: 1, p: 1.3, c: 25.0, f: 0.4, hidden: true, replace: "u173944" },
  yesil_elma: { name: "Yeşil Elma / Porsiyon Meyve", cat: "Karbonhidratlar", unit: "adet", step: 1, def: 1, p: 0.5, c: 18.0, f: 0.2 },

  yesil_salata: { name: "Dev Kase Yeşil Salata (Roka, Marul, Maydanoz, Salatalık)", cat: "Yeşillik & Sebzeler", unit: "kase", step: 1, def: 1, p: 2.0, c: 5.0, f: 0.3 },
  brokoli_karnabahar: { name: "Buharda Brokoli & Karnabahar", cat: "Yeşillik & Sebzeler", unit: "g", step: 50, def: 200, p: 0.028, c: 0.05, f: 0.004 },
  ispanak_kabak: { name: "Sote Ispanak / Kabak / Kuşkonmaz", cat: "Yeşillik & Sebzeler", unit: "g", step: 50, def: 200, p: 0.025, c: 0.035, f: 0.003 },
  domates_salatalik: { name: "Söğüş Domates & Salatalık & Biber", cat: "Yeşillik & Sebzeler", unit: "g", step: 50, def: 200, p: 0.01, c: 0.035, f: 0.002 },
  greens_scoop: { name: "Greens & Superfoods Tozu", cat: "Yeşillik & Sebzeler", unit: "ölçek", step: 1, def: 1, p: 1.0, c: 3.0, f: 0.0 },

  badem: { name: "Çiğ Badem", cat: "Kuruyemiş & Sağlıklı Yağlar", unit: "g", step: 5, def: 25, p: 0.21, c: 0.10, f: 0.50, hidden: true, replace: "u170567" },
  ceviz: { name: "Ceviz İçi", cat: "Kuruyemiş & Sağlıklı Yağlar", unit: "g", step: 5, def: 25, p: 0.15, c: 0.07, f: 0.65, hidden: true, replace: "u170187" },
  findik: { name: "Çiğ Fındık", cat: "Kuruyemiş & Sağlıklı Yağlar", unit: "g", step: 5, def: 25, p: 0.15, c: 0.10, f: 0.61, hidden: true, replace: "u170581" },
  kaju: { name: "Çiğ Kaju", cat: "Kuruyemiş & Sağlıklı Yağlar", unit: "g", step: 5, def: 25, p: 0.18, c: 0.27, f: 0.44, hidden: true, replace: "u170162" },
  yer_fistigi: { name: "Kavrulmuş Yer Fıstığı", cat: "Kuruyemiş & Sağlıklı Yağlar", unit: "g", step: 5, def: 25, p: 0.25, c: 0.13, f: 0.49, hidden: true, replace: "u173806" },
  kabak_cekirdegi: { name: "Çiğ Kabak Çekirdeği İçi", cat: "Kuruyemiş & Sağlıklı Yağlar", unit: "g", step: 5, def: 20, p: 0.30, c: 0.10, f: 0.49, hidden: true, replace: "u170556" },
  fistik_ezmesi: { name: "Şekersiz Fıstık Ezmesi (%100)", cat: "Kuruyemiş & Sağlıklı Yağlar", unit: "g", step: 5, def: 20, p: 0.25, c: 0.16, f: 0.50, hidden: true, replace: "u172470" },
  avokado: { name: "Avokado (Soyulmuş)", cat: "Kuruyemiş & Sağlıklı Yağlar", unit: "g", step: 25, def: 75, p: 0.02, c: 0.04, f: 0.15, hidden: true, replace: "u171705" },
  zeytinyagi: { name: "Soğuk Sıkım Zeytinyağı (5g = 1 Tatlı Kaşığı)", cat: "Kuruyemiş & Sağlıklı Yağlar", unit: "g", step: 5, def: 10, p: 0.0, c: 0.0, f: 1.0, hidden: true, replace: "u171413" },
  zeytin: { name: "Siyah / Yeşil Zeytin", cat: "Kuruyemiş & Sağlıklı Yağlar", unit: "adet", step: 5, def: 10, p: 0.1, c: 0.2, f: 1.0 },

  peynirsiz_whopper: { name: "Burger (Peynirsiz / Klasik Etli)", cat: "🍔 Esnek Diyet / Dışarıdan", unit: "adet", step: 1, def: 1, p: 28.0, c: 49.0, f: 32.0 },
  ince_pizza_dilim: { name: "İnce Hamur Pizza (Margarita / Bol Malzemos)", cat: "🍔 Esnek Diyet / Dışarıdan", unit: "dilim", step: 1, def: 2, p: 9.0, c: 22.0, f: 7.5 },
  citir_tavuk_parca: { name: "Çıtır Tavuk Göğüs / Tenders", cat: "🍔 Esnek Diyet / Dışarıdan", unit: "parça", step: 1, def: 3, p: 11.0, c: 9.0, f: 6.0 },
  cig_kofte_durum: { name: "Çiğ Köfte Dürüm (Etsiz / Bol Yeşillikli)", cat: "🍔 Esnek Diyet / Dışarıdan", unit: "adet", step: 1, def: 1, p: 9.0, c: 72.0, f: 8.0 },
  tavuk_gogsu_pismis: { name: "Tavuk Göğsü (Pişmiş / Izgara)", cat: "Et / Tavuk / Balık", unit: "g", step: 25, def: 150, p: 0.31, c: 0.0, f: 0.036, hidden: true, replace: "u171077" },
  patates_kizartmasi: { name: "Patates Kızartması (~150g porsiyon)", cat: "🍔 Esnek Diyet / Dışarıdan", unit: "porsiyon", step: 0.5, def: 1, p: 5.0, c: 50.0, f: 22.0 },
  tr_mercimek_corba: { name: "Mercimek Çorbası", cat: "🇹🇷 Türk Mutfağı", unit: "kase", step: 1, def: 1, p: 9, c: 25, f: 4 },
  tr_ezogelin: { name: "Ezogelin Çorbası", cat: "🇹🇷 Türk Mutfağı", unit: "kase", step: 1, def: 1, p: 7, c: 24, f: 4 },
  tr_tavuk_corba: { name: "Tavuk Suyu Çorba", cat: "🇹🇷 Türk Mutfağı", unit: "kase", step: 1, def: 1, p: 8, c: 12, f: 4 },
  tr_yayla_corba: { name: "Yayla Çorbası", cat: "🇹🇷 Türk Mutfağı", unit: "kase", step: 1, def: 1, p: 6, c: 16, f: 5 },
  tr_kuru_fasulye: { name: "Kuru Fasulye (porsiyon ~250g)", cat: "🇹🇷 Türk Mutfağı", unit: "porsiyon", step: 0.5, def: 1, p: 15, c: 35, f: 10 },
  tr_nohut: { name: "Nohut Yemeği (porsiyon ~250g)", cat: "🇹🇷 Türk Mutfağı", unit: "porsiyon", step: 0.5, def: 1, p: 13, c: 38, f: 9 },
  tr_taze_fasulye: { name: "Zeytinyağlı Taze Fasulye (~200g)", cat: "🇹🇷 Türk Mutfağı", unit: "porsiyon", step: 0.5, def: 1, p: 4, c: 15, f: 10 },
  tr_karniyarik: { name: "Karnıyarık (porsiyon)", cat: "🇹🇷 Türk Mutfağı", unit: "porsiyon", step: 0.5, def: 1, p: 12, c: 18, f: 22 },
  tr_imam_bayildi: { name: "İmam Bayıldı (porsiyon)", cat: "🇹🇷 Türk Mutfağı", unit: "porsiyon", step: 0.5, def: 1, p: 3, c: 15, f: 18 },
  tr_pirinc_pilavi: { name: "Pirinç Pilavı (pişmiş)", cat: "🇹🇷 Türk Mutfağı", unit: "g", step: 25, def: 150, p: 0.027, c: 0.28, f: 0.04 },
  tr_bulgur_pilavi: { name: "Bulgur Pilavı (pişmiş)", cat: "🇹🇷 Türk Mutfağı", unit: "g", step: 25, def: 150, p: 0.033, c: 0.23, f: 0.033 },
  tr_manti: { name: "Yoğurtlu Mantı (porsiyon ~250g)", cat: "🇹🇷 Türk Mutfağı", unit: "porsiyon", step: 0.5, def: 1, p: 20, c: 60, f: 18 },
  tr_menemen: { name: "Menemen (2 yumurtalı porsiyon)", cat: "🇹🇷 Türk Mutfağı", unit: "porsiyon", step: 0.5, def: 1, p: 14, c: 8, f: 16 },
  tr_sucuklu_yumurta: { name: "Sucuklu Yumurta (porsiyon)", cat: "🇹🇷 Türk Mutfağı", unit: "porsiyon", step: 0.5, def: 1, p: 20, c: 2, f: 28 },
  tr_beyaz_peynir: { name: "Beyaz Peynir (Tam Yağlı)", cat: "🇹🇷 Türk Mutfağı", unit: "g", step: 10, def: 50, p: 0.17, c: 0.01, f: 0.21 },
  tr_kasar: { name: "Kaşar Peyniri", cat: "🇹🇷 Türk Mutfağı", unit: "g", step: 10, def: 30, p: 0.26, c: 0.01, f: 0.27 },
  tr_bal: { name: "Bal", cat: "🇹🇷 Türk Mutfağı", unit: "g", step: 5, def: 15, p: 0.0, c: 0.82, f: 0.0, hidden: true, replace: "u169640" },
  tr_simit: { name: "Simit", cat: "🇹🇷 Türk Mutfağı", unit: "adet", step: 0.5, def: 1, p: 9, c: 52, f: 7 },
  tr_pogaca: { name: "Poğaça", cat: "🇹🇷 Türk Mutfağı", unit: "adet", step: 1, def: 1, p: 5, c: 30, f: 12 },
  tr_su_boregi: { name: "Su Böreği (dilim ~150g)", cat: "🇹🇷 Türk Mutfağı", unit: "dilim", step: 1, def: 1, p: 13, c: 35, f: 18 },
  tr_sigara_boregi: { name: "Sigara Böreği", cat: "🇹🇷 Türk Mutfağı", unit: "adet", step: 1, def: 3, p: 3, c: 8, f: 6 },
  tr_gozleme: { name: "Peynirli Gözleme", cat: "🇹🇷 Türk Mutfağı", unit: "adet", step: 0.5, def: 1, p: 15, c: 55, f: 15 },
  tr_tost: { name: "Kaşarlı Tost", cat: "🇹🇷 Türk Mutfağı", unit: "adet", step: 1, def: 1, p: 15, c: 30, f: 14 },
  tr_beyaz_ekmek: { name: "Beyaz Ekmek (dilim)", cat: "🇹🇷 Türk Mutfağı", unit: "dilim", step: 1, def: 2, p: 2.2, c: 12.5, f: 0.8 },
  tr_lahmacun: { name: "Lahmacun", cat: "🇹🇷 Türk Mutfağı", unit: "adet", step: 1, def: 1, p: 12, c: 35, f: 8 },
  tr_pide: { name: "Kıymalı Pide", cat: "🇹🇷 Türk Mutfağı", unit: "adet", step: 0.5, def: 1, p: 30, c: 80, f: 22 },
  tr_tavuk_doner_durum: { name: "Tavuk Döner Dürüm", cat: "🇹🇷 Türk Mutfağı", unit: "adet", step: 1, def: 1, p: 30, c: 55, f: 18 },
  tr_tavuk_doner: { name: "Tavuk Döner (ekmeksiz ~150g)", cat: "🇹🇷 Türk Mutfağı", unit: "porsiyon", step: 0.5, def: 1, p: 32, c: 3, f: 12 },
  tr_et_doner: { name: "Et Döner (ekmeksiz ~150g)", cat: "🇹🇷 Türk Mutfağı", unit: "porsiyon", step: 0.5, def: 1, p: 30, c: 3, f: 25 },
  tr_iskender: { name: "İskender (porsiyon)", cat: "🇹🇷 Türk Mutfağı", unit: "porsiyon", step: 0.5, def: 1, p: 35, c: 45, f: 45 },
  tr_adana: { name: "Adana Kebap (lavaşsız porsiyon)", cat: "🇹🇷 Türk Mutfağı", unit: "porsiyon", step: 0.5, def: 1, p: 30, c: 2, f: 35 },
  tr_tavuk_sis: { name: "Tavuk Şiş (lavaşsız ~200g)", cat: "🇹🇷 Türk Mutfağı", unit: "porsiyon", step: 0.5, def: 1, p: 50, c: 2, f: 12 },
  tr_izgara_kofte: { name: "Izgara Köfte", cat: "🇹🇷 Türk Mutfağı", unit: "adet", step: 1, def: 5, p: 5, c: 1, f: 5 },
  tr_izgara_balik: { name: "Izgara Levrek / Çupra (~200g)", cat: "🇹🇷 Türk Mutfağı", unit: "porsiyon", step: 0.5, def: 1, p: 45, c: 0, f: 10 },
  tr_yaprak_sarma: { name: "Zeytinyağlı Yaprak Sarma", cat: "🇹🇷 Türk Mutfağı", unit: "adet", step: 1, def: 6, p: 0.5, c: 5, f: 1.5 },
  tr_mercimek_kofte: { name: "Mercimek Köftesi", cat: "🇹🇷 Türk Mutfağı", unit: "adet", step: 1, def: 4, p: 2, c: 9, f: 1 },
  tr_cacik: { name: "Cacık", cat: "🇹🇷 Türk Mutfağı", unit: "kase", step: 1, def: 1, p: 4, c: 6, f: 3 },
  tr_ayran: { name: "Ayran", cat: "🇹🇷 Türk Mutfağı", unit: "bardak", step: 1, def: 1, p: 3.5, c: 5, f: 3.5 },
  tr_baklava: { name: "Baklava", cat: "🇹🇷 Türk Mutfağı", unit: "dilim", step: 1, def: 2, p: 2, c: 18, f: 11 },
  tr_sutlac: { name: "Sütlaç", cat: "🇹🇷 Türk Mutfağı", unit: "kase", step: 1, def: 1, p: 7, c: 45, f: 6 },
  tr_kunefe: { name: "Künefe", cat: "🇹🇷 Türk Mutfağı", unit: "porsiyon", step: 0.5, def: 1, p: 12, c: 70, f: 30 },
  tr_kumpir: { name: "Kumpir", cat: "🇹🇷 Türk Mutfağı", unit: "adet", step: 0.5, def: 1, p: 20, c: 90, f: 35 }
};

// ============================================================================
// 2. KAPSAMLI AĞIRLIK ANTRENMANI KÜTÜPHANESİ (135+ HAREKET, 12 KATEGORİ)
// ============================================================================
const EXERCISE_LIBRARY = {
  "1. Göğüs (Chest - Press & Fly)": [
    "Barbell Bench Press",
    "Incline Barbell Bench Press",
    "Decline Barbell Bench Press",
    "Flat Dumbbell Bench Press",
    "Incline Dumbbell Press",
    "Decline Dumbbell Press",
    "Machine Chest Press (Flat)",
    "Incline Machine Chest Press",
    "Smith Machine Bench Press",
    "Smith Machine Incline Press",
    "Weighted Dips (Göğüs Odaklı)",
    "Assisted Chest Dips",
    "Pec Deck Fly (Butterfly)",
    "Pec Deck Fly VEYA Cable Crossover",
    "Cable Crossover (High-to-Low)",
    "Cable Fly (Mid-Pulley)",
    "Low-to-High Cable Fly (Üst Göğüs)",
    "Seated Cable Chest Fly",
    "Flat / Incline Dumbbell Fly",
    "Dumbbell Pullover",
    "Push-Up (Şınav) / Weighted Push-Up",
    "Svend Press / Plate Press"
  ],
  "2. Sırt - Dikey Çekiş (Lats / Width)": [
    "Pull-up (Geniş Tutuş Barfiks)",
    "Weighted Pull-up (Ağırlıklı Barfiks)",
    "Chin-up (Avuç İçi Bakan Barfiks)",
    "Neutral Grip Pull-up",
    "Assisted Pull-up Machine",
    "Lat Pulldown (Wide Grip / Geniş Tutuş)",
    "Close-Grip / V-Bar Lat Pulldown",
    "Reverse-Grip (Underhand) Lat Pulldown",
    "Single-Arm Kneeling Cable Lat Pulldown",
    "Machine High Row / Iso-Lateral Pulldown",
    "Straight-Arm Cable / Rope Pulldown",
    "Dumbbell / Cable Lat Pullover"
  ],
  "3. Sırt - Yatay Çekiş & Alt Sırt (Thickness & Lower Back)": [
    "Chest-Supported Row (Makine veya Sehpa)",
    "Seated Cable Row (V-Bar / Close Grip)",
    "Wide-Grip Seated Cable Row (Üst Sırt)",
    "Barbell Bent-Over Row (Overhand / Underhand)",
    "Pendlay Row",
    "One-Arm Dumbbell Row",
    "T-Bar Row (Landmine veya Makine)",
    "Iso-Lateral / Hammer Strength Machine Row",
    "Meadows Row",
    "Smith Machine Bent-Over Row",
    " Helms Row / Incline Bench Dumbbell Row",
    "Inverted Row (Vücut Ağırlığı Yatay Çekiş)",
    "Conventional Deadlift",
    "Sumo Deadlift",
    "Rack Pull (Kısmi Deadlift)",
    "Hyperextension (45 Derece Back Extension)",
    "Reverse Hyperextension",
    "Good Morning (Barbell)"
  ],
  "4. Omuz - Ön, Yan, Arka & Trapez (Delts & Traps)": [
    "Machine Shoulder Press",
    "Overhead Dumbbell Shoulder Press (Seated / Standing)",
    "Overhead Barbell Press (Military Press)",
    "Smith Machine Shoulder Press",
    "Arnold Press",
    "Landmine Shoulder Press",
    "Dumbbell Lateral Raise",
    "Cable Lateral Raise (Single-Arm)",
    "Behind-the-Back Cable Lateral Raise",
    "Machine Lateral Raise",
    "Chest-Supported / Incline Lateral Raise",
    "Egyptian Cable Lateral Raise",
    "Reverse Pec Deck veya Face Pull",
    "Reverse Pec Deck (Arka Omuz Makinesi)",
    "Face Pull (Rope)",
    "Bent-Over Dumbbell Reverse Fly (Rear Delt)",
    "Single-Arm Rear Delt Cable Fly",
    "Dumbbell / Barbell Front Raise",
    "Cable Rope Front Raise",
    "Barbell Upright Row / Cable Upright Row",
    "Dumbbell Shrug (Trapez)",
    "Barbell / Smith Machine Shrug",
    "Cable Shrug"
  ],
  "5. Bacak - Ön Bacak (Quadriceps)": [
    "Hack Squat",
    "Barbell Back Squat (High-Bar / Low-Bar)",
    "Barbell Front Squat",
    "Leg Press (45 Derece)",
    "Horizontal / Seated Leg Press",
    "Single-Leg Press",
    "Bulgarian Split Squat (Dumbbell / Barbell)",
    "Smith Machine Squat",
    "Pendulum Squat / Belt Squat",
    "Goblet Squat",
    "Sissy Squat",
    "Walking Lunges / Reverse Lunges",
    "Leg Extension (Çift Bacak)",
    "Single-Leg Extension (Tek Bacak)",
    "Step-Up (Dumbbell / Box)"
  ],
  "6. Bacak - Arka Bacak & Kalça (Hamstrings & Glutes)": [
    "Romanian Deadlift (RDL - Barbell)",
    "Dumbbell Romanian Deadlift",
    "Single-Leg Romanian Deadlift",
    "Stiff-Legged Deadlift",
    "Seated Leg Curl",
    "Lying Leg Curl",
    "Standing Single-Leg Curl",
    "Nordic Hamstring Curl",
    "Glute-Ham Raise (GHR)",
    "Barbell Hip Thrust",
    "Machine Hip Thrust / Glute Drive",
    "Smith Machine Hip Thrust",
    "Kas Glute Bridge",
    "Cable Pull-Through",
    "Cable Glute Kickback",
    "Hip Abduction Machine (Dış Bacak / Yan Kalça)",
    "Hip Adduction Machine (İç Bacak)"
  ],
  "7. Bacak - Kalf (Calves & Tibialis)": [
    "Standing Calf Raise (Makine veya Smith)",
    "Seated Calf Raise",
    "Leg Press Calf Raise",
    "Donkey Calf Raise",
    "Single-Leg Dumbbell Calf Raise",
    "Tibialis Raise"
  ],
  "8. Kol - Biceps & Ön Kol (Biceps & Forearms)": [
    "Preacher Curl (EZ-Bar / Makine)",
    "Single-Arm Dumbbell Preacher Curl",
    "Incline Dumbbell Curl",
    "Hammer Curl (Dumbbell)",
    "Cross-Body Hammer Curl",
    "Cable Rope Hammer Curl",
    "Standing Barbell / EZ-Bar Curl",
    "Standing Alternating Dumbbell Curl",
    "Bayesian Cable Curl (Arkadan Kablo Curl)",
    "Standing Cable Bar Curl",
    "High-Pulley Double Biceps Cable Curl",
    "Spider Curl",
    "Concentration Curl",
    "Reverse Barbell / Cable Curl (Ön Kol)",
    "Zottman Curl",
    "Wrist Curl / Reverse Wrist Curl (Bilek)"
  ],
  "9. Kol - Triceps (Arka Kol)": [
    "Overhead Cable Triceps Extension (Rope / Bar)",
    "Triceps Rope/Bar Pushdown",
    "Skullcrusher (EZ-Bar / Dumbbell Alna Triceps)",
    "Single-Arm Overhead Dumbbell Triceps Extension",
    "Seated Two-Arm Overhead Dumbbell Extension",
    "Cross-Body Dual Cable Triceps Extension",
    "Single-Arm Reverse/Underhand Cable Pushdown",
    "JM Press",
    "Close-Grip Barbell Bench Press",
    "Triceps Dip Machine / Bench Dips",
    "Dumbbell / Cable Triceps Kickback",
    "Diamond Push-Up"
  ],
  "10. Karın & Merkez Bölge (Core & Abs)": [
    "Crunch Machine",
    "Hanging Leg Raise",
    "Captain's Chair Knee / Leg Raise",
    "Kneeling Cable Crunch (Halatla)",
    "Decline Bench Crunch / Sit-Up",
    "Ab Wheel Rollout",
    "Plank / RKC Plank",
    "Side Plank",
    "Russian Twist (Medicine Ball / Plate)",
    "Pallof Press (Anti-Rotasyon)",
    "Woodchopper (Cable)",
    "Deadbug / Bird-Dog",
    "Stomach Vacuum"
  ],
  "11. Kardiyo & Kondisyon (Cardio & Conditioning)": [
    "Incline Treadmill Walk (Eğimli Yürüyüş)",
    "Stairmaster (Merdiven Makinesi)",
    "Assault / Air Bike (HIIT)",
    "Stationary Bike (Sabit Bisiklet)",
    "Rowing Machine (Kürek)",
    "Elliptical Trainer",
    "Jump Rope (İp Atlama)",
    "Treadmill Run (Koşu Bandı)",
    "Outdoor Run (Açık Hava Koşu)",
    "Outdoor Walk (Tempolu Yürüyüş)",
    "Outdoor Cycling (Bisiklet)",
    "Swimming (Yüzme)",
    "Farmer's Walk (Çiftçi Yürüyüşü)",
    "Kettlebell Swing"
  ]
};

// ============================================================================
// 3. ZENGİN MOBİLİTE & STRETCHING KÜTÜPHANESİ (45+ HAREKET)
// ============================================================================
const MOBILITY_LIBRARY = {
  "Dinamik Mobilite & Eklem Akışı (Dynamic Mobility)": [
    { name: "World’s Greatest Stretch", prescription: "1 Set x 8-10 Tekrar (Sağ/Sol)", note: "Kalça, torasik omurga ve hamstring kompleksi" },
    { name: "90/90 Hip Switch", prescription: "1 Set x 8-10 Tekrar", note: "Kalça iç ve dış rotasyon mobilitesi" },
    { name: "Kneeling Ankle Dorsiflexion", prescription: "1 Set x 8-10 Tekrar (Her Ayak)", note: "Squat derinliği için ayak bileği mobilitesi" },
    { name: "Quadruped Cat-Cow", prescription: "1 Set x 8-10 Tekrar", note: "Omurga segmentasyonu ve nefes uyumu" },
    { name: "Towel/Band Shoulder Dislocates", prescription: "1 Set x 8-10 Tekrar", note: "Omuz kapsülü ve pektoral açılış" },
    { name: "Quadruped Thoracic Rotation (T-Spine)", prescription: "1 Set x 8-10 Tekrar (Her Yön)", note: "Üst sırt rotasyonel açıklık" },
    { name: "Deep Squat Hold with Pry & Thoracic Reach", prescription: "1 Set x 60 sn Akış", note: "Kalça ve ayak bileği açma" },
    { name: "Scapular Push-Up & Wall Slides", prescription: "1 Set x 10-12 Tekrar", note: "Serratus anterior ve skapula kontrolü" },
    { name: "Cossack Squat (Dinamik Yan Lunge)", prescription: "1 Set x 8 Tekrar (Sağ/Sol)", note: "Adductor (iç bacak) ve kalça mobilitesi" },
    { name: "Leg Swings (Öne-Arkaya & Yana)", prescription: "1 Set x 12 Tekrar", note: "Dinamik kalça ısınması" },
    { name: "Inchworm to Cobra Flow", prescription: "1 Set x 6-8 Tekrar", note: "Arka zincir ve omuz stabilitesi" },
    { name: "Quadruped Hip CARs (Controlled Articular Rotations)", prescription: "1 Set x 6 Tur (Her Yön)", note: "Kalça eklem kapsülü kontrolü" },
    { name: "Shoulder CARs (Ayakta Tam Daire)", prescription: "1 Set x 5 Tur (Her Kol)", note: "Omuz eklem sağlığı" },
    { name: "Thread the Needle (Dinamik)", prescription: "1 Set x 8 Tekrar (Sağ/Sol)", note: "Torasik rotasyon ve arka omuz" },
    { name: "Banded Pull-Apart & External Rotation", prescription: "1 Set x 15 Tekrar", note: "Rotator manşet (Rotator Cuff) aktivasyonu" },
    { name: "Glute Bridge March", prescription: "1 Set x 10 Tekrar", note: "Kalça aktivasyonu ve pelvik stabilite" }
  ],
  "Statik Stretching & Esneme (Static Stretching)": [
    { name: "Doorway Pec & Biceps Stretch", prescription: "2 Set x 30 sn", note: "Göğüs ve ön omuz gerginliğini açar" },
    { name: "Child’s Pose with Lat Reach", prescription: "Sağ ve Sol için 1'er Set x 45 sn", note: "Kanat (Latissimus) ve bel esnetme" },
    { name: "Couch Stretch", prescription: "Sağ ve Sol için 2'şer Set x 30 sn", note: "Rectus femoris ve psoas (kalça fleksörü) esnetme" },
    { name: "Supine Figure-4 Glute Stretch", prescription: "Sağ ve Sol için 2'şer Set x 30 sn", note: "Piriformis ve derin kalça esnetme" },
    { name: "Single-Leg Seated Hamstring Stretch", prescription: "Sağ ve Sol için 2'şer Set x 30 sn", note: "Arka bacak uzatma" },
    { name: "Pigeon Pose (Güvercin Pozu)", prescription: "Sağ ve Sol için 2'şer Set x 45 sn", note: "Derin glute ve dış kalça esnetme" },
    { name: "Frog Stretch (Kurbağa Esnemesi)", prescription: "2 Set x 45 sn", note: "İç bacak (Adductor) ve kasık esnetme" },
    { name: "Half-Kneeling Hip Flexor Stretch", prescription: "Sağ ve Sol 2'şer Set x 30 sn", note: "Posterior pelvik tilt ile kalça önü esnetme" },
    { name: "Butterfly Groin Stretch", prescription: "2 Set x 40 sn", note: "Oturarak ayak tabanları birleşik iç bacak esnetme" },
    { name: "Standing Wall Calf & Soleus Stretch", prescription: "Sağ ve Sol 2'şer Set x 30 sn", note: "Diz düz (Gastrocnemius) ve diz bükülü (Soleus)" },
    { name: "Overhead Triceps & Lat Side Lean Stretch", prescription: "Sağ ve Sol 2'şer Set x 30 sn", note: "Triceps uzun başı ve yan gövde" },
    { name: "Cross-Body Posterior Shoulder Stretch", prescription: "Sağ ve Sol 2'şer Set x 30 sn", note: "Arka omuz kapsülü esnetme" },
    { name: "Upper Trap & Levator Scapulae Neck Stretch", prescription: "Sağ ve Sol 2'şer Set x 30 sn", note: "Boyun ve üst trapez gevşetme" },
    { name: "Cobra / Sphinx Abdominal Stretch", prescription: "2 Set x 30 sn", note: "Karın ve ön zincir esnetme" },
    { name: "Supine Spinal Twist (Yatarak Omurga Rotasyonu)", prescription: "Sağ ve Sol 1'er Set x 45 sn", note: "Bel ve omurga dekompresyonu" },
    { name: "Dead Hang (Barfikste Pasif Asılma)", prescription: "2 Set x 30–45 sn", note: "Omuz sağlığı ve omurga dekompresyonu" }
  ],
  "Foam Roller & Miyofasyal Gevşetme (SMR)": [
    { name: "Thoracic Spine Foam Roll", prescription: "1 Set x 60 sn", note: "Üst sırt ekstansiyonu" },
    { name: "Latissimus Dorsi Foam Roll", prescription: "Sağ/Sol 45 sn", note: "Koltuk altı ve yan sırt" },
    { name: "Quadriceps & Hip Flexor Foam Roll", prescription: "Sağ/Sol 60 sn", note: "Ön bacak miyofasyal gevşetme" },
    { name: "Glute / Piriformis Lacrosse Ball Release", prescription: "Sağ/Sol 60 sn", note: "Tetik nokta gevşetme" },
    { name: "Plantar Fascia (Ayak Tabanı) Top Masajı", prescription: "Sağ/Sol 45 sn", note: "Ayak tabanı fasyası" }
  ]
};

// v27: Mobilite bölgeleri ve türleri. Kütüphane kategorileri sırasıyla dynamic / static / release türüne karşılık gelir.
const MOB_REGIONS = [["hip", "Kalça"], ["shoulder", "Omuz"], ["spine", "Omurga"], ["chest", "Göğüs"], ["hamstring", "Arka bacak"], ["ankle", "Ayak bileği"]];
const MOB_TYPES = [["dynamic", "Dinamik"], ["static", "Statik"], ["release", "Foam roller"]];
// Kütüphanedeki her hareketin ana ve (varsa) ikincil bölgesi
const MOB_LIB_REGIONS = {
  "World’s Greatest Stretch": ["hip", "spine"], "90/90 Hip Switch": ["hip"], "Kneeling Ankle Dorsiflexion": ["ankle"],
  "Quadruped Cat-Cow": ["spine"], "Towel/Band Shoulder Dislocates": ["shoulder", "chest"],
  "Quadruped Thoracic Rotation (T-Spine)": ["spine", "shoulder"], "Deep Squat Hold with Pry & Thoracic Reach": ["hip", "ankle"],
  "Scapular Push-Up & Wall Slides": ["shoulder"], "Cossack Squat (Dinamik Yan Lunge)": ["hip", "hamstring"],
  "Leg Swings (Öne-Arkaya & Yana)": ["hip", "hamstring"], "Inchworm to Cobra Flow": ["hamstring", "spine"],
  "Quadruped Hip CARs (Controlled Articular Rotations)": ["hip"], "Shoulder CARs (Ayakta Tam Daire)": ["shoulder"],
  "Thread the Needle (Dinamik)": ["spine", "shoulder"], "Banded Pull-Apart & External Rotation": ["shoulder"], "Glute Bridge March": ["hip"],
  "Doorway Pec & Biceps Stretch": ["chest", "shoulder"], "Child’s Pose with Lat Reach": ["shoulder", "spine"], "Couch Stretch": ["hip"],
  "Supine Figure-4 Glute Stretch": ["hip"], "Single-Leg Seated Hamstring Stretch": ["hamstring"], "Pigeon Pose (Güvercin Pozu)": ["hip"],
  "Frog Stretch (Kurbağa Esnemesi)": ["hip"], "Half-Kneeling Hip Flexor Stretch": ["hip"], "Butterfly Groin Stretch": ["hip"],
  "Standing Wall Calf & Soleus Stretch": ["ankle"], "Overhead Triceps & Lat Side Lean Stretch": ["shoulder", "spine"],
  "Cross-Body Posterior Shoulder Stretch": ["shoulder"], "Upper Trap & Levator Scapulae Neck Stretch": ["shoulder", "spine"],
  "Cobra / Sphinx Abdominal Stretch": ["spine", "chest"], "Supine Spinal Twist (Yatarak Omurga Rotasyonu)": ["spine"],
  "Dead Hang (Barfikste Pasif Asılma)": ["shoulder", "spine"],
  "Thoracic Spine Foam Roll": ["spine"], "Latissimus Dorsi Foam Roll": ["shoulder"], "Quadriceps & Hip Flexor Foam Roll": ["hip"],
  "Glute / Piriformis Lacrosse Ball Release": ["hip"], "Plantar Fascia (Ayak Tabanı) Top Masajı": ["ankle"]
};

// v39: NASIL YAPILIR — kütüphanedeki her hareket için 3–4 kısa adım + bir "Dikkat" notu (anahtar: hareketin adı).
// Kullanıcının rutinindeki hareket adıyla eşleşirse detayda ve seansta gösterilir (mobGuide; kesme işareti/büyük harf farkı yok sayılır).
const MOB_GUIDE = {
  "World’s Greatest Stretch": { steps: ["Uzun bir hamle adımı at, arka dizin düz ve yerden yukarıda kalsın.", "Öndeki ayağın iç yanına aynı taraftaki elini koy, dirseğini ayağa doğru indir.", "Aynı kolu tavana doğru aç, göğsünü çevir; gözlerin elini izlesin.", "Eli yere geri koy, diğer tarafa geç."], warn: "Arka dizini yere çarpma; dönüşü zorlamadan, nefesle yap." },
  "90/90 Hip Switch": { steps: ["Yere otur, iki dizin de 90 derece bükülü olsun: biri önde, biri yanda.", "Ellerini arkaya koy, gövdeni dik tut.", "Dizlerini yavaşça diğer tarafa devir, yeni 90/90 pozisyonuna geç.", "Her geçişte bir an dur, gövdeni dik tutmaya çalış."], warn: "Dizde ağrı olursa açıyı küçült; dizleri zorla yere bastırma." },
  "Kneeling Ankle Dorsiflexion": { steps: ["Bir dizin yerde, diğer ayağın önde yere basık olsun.", "Topuğunu yerden kaldırmadan dizini ayak parmaklarının üzerinden ileri sür.", "En ileri noktada 1–2 saniye bekle, geri dön.", "Dizini hafifçe içe ve dışa yönlendirerek de tekrarla."], warn: "Topuk yerden kalkıyorsa fazla ilerledin; ayak bileğinin önünde sıkışma ağrısı olursa dur." },
  "Quadruped Cat-Cow": { steps: ["Eller omuz, dizler kalça hizasında dört ayak üstüne gel.", "Nefes alırken göğsünü öne it, belini çukurlaştır, başını hafifçe kaldır.", "Nefes verirken sırtını tavana doğru yuvarla, çeneni göğsüne getir.", "Hareketi omurganın her bölümüne yayarak yavaşça tekrarla."], warn: "Belde ağrı varsa hareketi küçült; hızlı yapma." },
  "Towel/Band Shoulder Dislocates": { steps: ["Havluyu ya da bandı geniş tutuşla iki elinle önde tut.", "Dirseklerini bükmeden kollarını başının üstünden arkaya doğru götür.", "Aynı yoldan öne geri getir.", "Rahat geliyorsa tutuşu her sette biraz daralt."], warn: "Omuzda batma ya da sıkışma olursa tutuşu genişlet; asla zorla geçirme." },
  "Quadruped Thoracic Rotation (T-Spine)": { steps: ["Dört ayak üstüne gel, kalçanı topuklarına doğru biraz geri it.", "Bir elini ensene koy.", "Dirseğini önce diğer koltuk altına doğru indir, sonra tavana doğru aç.", "Dönüşü göğüsten yap, belini sabit tut."], warn: "Hareket belden değil üst sırttan gelmeli; kalçanı geride tutmak bunu sağlar." },
  "Deep Squat Hold with Pry & Thoracic Reach": { steps: ["Ayaklar omuz genişliğinde, en derin rahat çömelmeye in.", "Dirseklerinle dizlerini hafifçe dışa it, kalçanı sağa sola salla.", "Bir kolunu tavana doğru uzat, gövdeni o tarafa çevir; sonra diğer kol.", "Topukların yerde, sırtın dik kalsın."], warn: "Topuklar kalkıyorsa altına ince bir şey koy; dizde ağrı olursa derinliği azalt." },
  "Scapular Push-Up & Wall Slides": { steps: ["Şınav pozisyonunda kollar düz: kürek kemiklerini birbirine yaklaştır, sonra açarak sırtı yukarı it.", "Ardından sırtını duvara yasla, kollarını 'W' şeklinde duvara koy.", "Kollarını duvardan ayırmadan yukarı 'Y' şekline kaydır, yavaşça geri indir."], warn: "Belini duvardan ayırma, omuzlarını kulaklarına doğru kaldırma." },
  "Cossack Squat (Dinamik Yan Lunge)": { steps: ["Ayaklarını geniş aç, parmak uçları hafifçe dışa baksın.", "Ağırlığını bir bacağa ver, o dizi bükerek yana doğru çömel; diğer bacak düz kalsın.", "Düz bacağın parmakları tavana dönebilir, topuk yerde kalır.", "Ortadan geçerek diğer tarafa in."], warn: "Bükülen dizin içe çökmesin; ağrısız inebildiğin kadar in." },
  "Leg Swings (Öne-Arkaya & Yana)": { steps: ["Bir elinle duvara ya da direğe tutun, tek ayak üstünde dur.", "Serbest bacağını öne ve arkaya kontrollü sallayarak aç.", "Sonra karşına dönüp bacağını vücudunun önünden sağa sola salla.", "Her salınımda açıklığı biraz artır."], warn: "Bacağı fırlatma; belin sabit kalsın, hareket kalçadan gelsin." },
  "Inchworm to Cobra Flow": { steps: ["Ayakta dur, dizlerini olabildiğince düz tutarak ellerini yere koy.", "Ellerinle öne yürü, şınav pozisyonuna gel.", "Kalçanı yere indir, göğsünü kaldırıp kobra pozisyonuna geç.", "Kalçanı kaldır, ellerinle geri yürüyerek ayağa kalk."], warn: "Arka bacak çok gerginse dizlerini biraz bük; kobrada omuzlarını kulaktan uzak tut." },
  "Quadruped Hip CARs (Controlled Articular Rotations)": { steps: ["Dört ayak üstüne gel, karnını hafifçe sık.", "Bir dizini göğsüne doğru çek.", "Dizini yana aç, sonra arkaya doğru geniş ve yavaş bir daire çiz.", "Daireyi tersine de çiz; gövden kıpırdamasın."], warn: "Hareketi yavaş yap; beli döndürerek değil kalçadan çevir." },
  "Shoulder CARs (Ayakta Tam Daire)": { steps: ["Ayakta dik dur, karnını ve kalçanı hafifçe sık.", "Bir kolunu düz tutarak öne ve yukarı kaldır.", "Kolunu başının yanından geçirip arkaya ve aşağı doğru en geniş daireyi çiz.", "Daireyi yavaşça tersine de çiz."], warn: "Gövdeni eğip bükerek daireyi büyütme; omuzda batma olursa daireyi küçült." },
  "Thread the Needle (Dinamik)": { steps: ["Dört ayak üstüne gel.", "Bir kolunu diğer kolunun altından karşı tarafa uzat, omzunu ve şakağını yere yaklaştır.", "Aynı kolu geri çekip tavana doğru aç, gözlerin elini izlesin.", "Nefesle, yavaş bir akışla tekrarla."], warn: "Boynuna yük bindirme; başının ağırlığını yere verme." },
  "Banded Pull-Apart & External Rotation": { steps: ["Bandı omuz hizasında, kollar düz önde tut.", "Kürek kemiklerini birbirine yaklaştırarak bandı göğsüne doğru iki yana aç, yavaşça geri gel.", "Sonra dirsekler belinin yanında 90 derece bükülü, ön kolları dışa çevirerek bandı aç."], warn: "Omuzlarını kulaklarına doğru kaldırma; bandı geri gelirken kontrol et." },
  "Glute Bridge March": { steps: ["Sırt üstü yat, dizler bükülü, ayaklar yere basık.", "Kalçanı sıkarak omuzdan dizlere düz bir çizgi oluşana kadar kaldır.", "Kalçayı düşürmeden bir dizini göğsüne doğru kaldır, indir; diğerine geç.", "Kalçanın iki yanı aynı yükseklikte kalsın."], warn: "Belini aşırı çukurlaştırma; yükü kalça kasları taşısın." },
  "Doorway Pec & Biceps Stretch": { steps: ["Kapı eşiğinde dur, ön kolunu ya da avucunu omuz hizasında kasaya yasla.", "Aynı taraftaki ayakla öne adım at, göğsünü kapıdan geçiriyormuş gibi öne it.", "Göğsün ve omzunun önünde gerilme hissedince nefes alarak bekle.", "Kolu biraz yukarı ya da aşağı alarak farklı bölgeleri esnet."], warn: "Omzun önünde batma ya da uyuşma olursa geri çık." },
  "Child’s Pose with Lat Reach": { steps: ["Dizlerinin üstüne otur, kalçanı topuklarına bırak.", "Kollarını öne uzatıp alnını yere indir.", "Ellerini bir tarafa kaydır; karşı yan gövdende gerilme hissedeceksin.", "Nefes vererek biraz daha uzan, sonra diğer tarafa geç."], warn: "Dizde ağrı olursa dizlerinin arasını aç ya da altına yastık koy." },
  "Couch Stretch": { steps: ["Arka dizini duvar dibine koy, ayağın duvara yaslansın.", "Öndeki ayağını yere bas, gövdeni yavaşça dik kaldır.", "Kalçanı sık, leğeni hafifçe öne it.", "Nefes vererek gerilmeyi kalçanın önünde tut."], warn: "Belini çukurlaştırma; dizinin altına mutlaka yumuşak bir şey koy." },
  "Supine Figure-4 Glute Stretch": { steps: ["Sırt üstü yat, dizlerini bük.", "Bir ayak bileğini diğer dizinin üstüne koy (4 şekli).", "Alttaki bacağın arkasından tutup göğsüne doğru çek.", "Kalçanın arkasında gerilme hissedince nefesle bekle."], warn: "Dizde ağrı olursa çekişi azalt; başını ve omuzlarını yerde bırak." },
  "Single-Leg Seated Hamstring Stretch": { steps: ["Yere otur; bir bacağın düz, diğer ayağının tabanı düz bacağın iç yanında.", "Sırtını dik tut, göğsünü öne uzatarak kalçadan eğil.", "Düz bacağın arkasında gerilme hissedince dur, nefesle bekle."], warn: "Sırtını yuvarlayıp ayağa ulaşmaya çalışma; dizin arkasında keskin ağrı olursa dur." },
  "Pigeon Pose (Güvercin Pozu)": { steps: ["Dört ayaktan bir dizini öne, aynı eline doğru getir; ayağın diğer kalçana doğru dursun.", "Arka bacağını düz şekilde geriye uzat.", "Kalçanı yere doğru bırak, ellerinle destekle.", "Rahat geliyorsa gövdeni öne eğ."], warn: "Öndeki dizde ağrı olursa ayağını kalçana yaklaştır ya da sırt üstü 4 esnemesini yap." },
  "Frog Stretch (Kurbağa Esnemesi)": { steps: ["Dört ayak üstüne gel, dizlerini rahat edebildiğin kadar iki yana aç.", "Ayak bileklerin dizlerinle aynı hizada, ayakların dışa baksın.", "Ön kollarına inip kalçanı yavaşça geriye doğru it.", "İç bacakta gerilme hissedince nefesle bekle."], warn: "Dizlerinin altına yumuşak bir şey koy; kasıkta keskin ağrı olursa dizleri yaklaştır." },
  "Half-Kneeling Hip Flexor Stretch": { steps: ["Bir dizin yerde, diğer ayağın önde basık olsun.", "Karnını sık, kuyruk sokumunu hafifçe aşağı çek.", "Arka taraftaki kalçayı sıkarak gövdeni hafifçe öne kaydır.", "Kolunu tavana uzatıp karşı tarafa hafifçe eğilebilirsin."], warn: "Belini çukurlaştırarak öne gitme; gerilme kalçanın önünde olmalı." },
  "Butterfly Groin Stretch": { steps: ["Yere otur, ayak tabanlarını birleştir, topukları kendine çek.", "Ayak bileklerinden tut, sırtını dik tut.", "Dizlerini yavaşça yere doğru bırak; dirseklerinle hafifçe bastırabilirsin.", "Göğsünü öne uzatarak gerilmeyi artır."], warn: "Dizlere sert bastırma; kasıkta keskin ağrı olursa geri gel." },
  "Standing Wall Calf & Soleus Stretch": { steps: ["Ellerini duvara koy, bir ayağın geride, topuğu yerde olsun.", "Arka dizin düzken kalçanı duvara doğru it; baldırın üstünde gerilme hissedeceksin.", "Sonra arka dizini hafifçe bük; gerilme aşağıya, aşil tarafına kayar.", "Her pozisyonda nefesle bekle."], warn: "Arka topuk yerden kalkmasın, ayak parmakların öne baksın." },
  "Overhead Triceps & Lat Side Lean Stretch": { steps: ["Ayakta dur, bir kolunu başının üstünden arkaya bük, elini sırtına indir.", "Diğer elinle dirseğini başının arkasına doğru çek.", "Gövdeni dirseği çektiğin tarafa doğru yana eğ.", "Kolun arkasında ve yan gövdende gerilme hissedince bekle."], warn: "Boynunu öne itme; yana eğilirken öne ya da arkaya dönme." },
  "Cross-Body Posterior Shoulder Stretch": { steps: ["Bir kolunu göğsünün önünden karşı tarafa uzat.", "Diğer kolunla dirseğinin üstünden kendine doğru bastır.", "Omzunu kulağından uzak, aşağıda tut.", "Omzunun arkasında gerilme hissedince bekle."], warn: "Omuz eklemine bastırma; baskıyı dirseğin üstünden ver." },
  "Upper Trap & Levator Scapulae Neck Stretch": { steps: ["Dik otur, bir elinle sandalyenin kenarından tut.", "Başını karşı tarafa doğru yana eğ (üst trapez).", "Sonra burnunu karşı koltuk altına doğru çevirip başını öne eğ (levator).", "Diğer elinle başına çok hafif ağırlık verebilirsin."], warn: "Boynunu asla çekiştirerek bastırma; uyuşma ya da baş dönmesi olursa dur." },
  "Cobra / Sphinx Abdominal Stretch": { steps: ["Yüz üstü yat, ellerini omuzlarının altına koy.", "Sfenks: ön kolların yerde, göğsünü yavaşça kaldır.", "Kobra: kollarını düzelterek göğsünü daha yukarı kaldır; kalçan yerde kalsın.", "Omuzlarını kulaklarından uzak tutup nefesle bekle."], warn: "Belde sıkışma ağrısı olursa sfenks pozisyonunda kal ya da hiç yapma." },
  "Supine Spinal Twist (Yatarak Omurga Rotasyonu)": { steps: ["Sırt üstü yat, kollarını iki yana aç.", "Dizlerini bükerek ikisini birlikte bir tarafa, yere doğru bırak.", "Başını karşı tarafa çevir, omuzların yerde kalsın.", "Nefes vererek gevşe, sonra diğer tarafa geç."], warn: "Dizleri yere zorla bastırma; bel fıtığı ya da sinir ağrısı varsa küçük ve dikkatli yap." },
  "Dead Hang (Barfikste Pasif Asılma)": { steps: ["Barfiks barını omuz genişliğinde, avuçlar öne bakacak şekilde tut.", "Ayaklarını yerden kesip kollarını düz bırak, gövdeni sarkıt.", "Omuzlarını gevşet, nefesini düzenli tut.", "Bırakırken ayaklarının üstüne kontrollü in."], warn: "Omuzda batma ya da elde kayma olursa bırak; omuz sakatlığın varsa omuzları hafif aktif tut." },
  "Thoracic Spine Foam Roll": { steps: ["Silindiri sırtına, kürek kemiklerinin altına yatay koy.", "Ellerini ensende birleştir, kalçanı yerde tut.", "Üst sırtını silindirin üzerinden geriye doğru esnet, sonra geri gel.", "Silindiri birkaç santim kaydırarak üst sırt boyunca tekrarla."], warn: "Silindiri bel bölgesine indirme; boynunu ellerinle destekle, çekme." },
  "Latissimus Dorsi Foam Roll": { steps: ["Yan yat, silindiri koltuk altının hemen altına koy.", "Alttaki kolunu başının üstüne uzat, başparmağın tavana baksın.", "Gövdeni hafifçe öne ve arkaya döndürerek yan sırt boyunca yuvarlan.", "Hassas noktada birkaç nefes bekle."], warn: "Doğrudan koltuk altının içine ve kaburgalara bastırma." },
  "Quadriceps & Hip Flexor Foam Roll": { steps: ["Yüz üstü ön kollarına dayan, silindiri uyluklarının önüne koy.", "Kalçanın hemen altından dizinin üstüne kadar yavaşça yuvarlan.", "Bir bacağa ağırlık vererek daha derin çalış; hassas noktada bekle.", "Dizini bükerek gerginliği artırabilirsin."], warn: "Dizkapağının ve kalça kemiğinin üstüne yuvarlanma; karnını sık, belini çukurlaştırma." },
  "Glute / Piriformis Lacrosse Ball Release": { steps: ["Yere otur, topu bir kalçanın altına, yan arka tarafa koy.", "Aynı taraftaki ayak bileğini diğer dizinin üstüne koy.", "Ağırlığını yavaşça topa vererek küçük daireler çiz.", "Hassas bir noktada 20–30 saniye bekle, nefes ver."], warn: "Bacağa yayılan elektriklenme ya da uyuşma olursa topu başka yere kaydır." },
  "Plantar Fascia (Ayak Tabanı) Top Masajı": { steps: ["Ayakta ya da oturarak topu ayak tabanının altına koy.", "Ağırlığını kontrollü vererek topuktan parmaklara doğru yuvarla.", "Kemerin ortasında ve hassas noktalarda birkaç saniye bekle."], warn: "Topuğun ortasında keskin ağrı varsa baskıyı hafiflet; çıplak ayakla ya da ince çorapla yap." }
};

// v39: GENİŞLETİLMİŞ KÜTÜPHANE (kullanıcı isteği: "insanlar yapmak istedikleri hareketi bulabilsin"). Her hareket tek yerde:
// c = kategori (0 dinamik, 1 statik, 2 foam roller/top), ad, uygulama, not, bölgeler (ana, ikincil), adımlar, dikkat.
// Açılışta MOBILITY_LIBRARY / MOB_LIB_REGIONS / MOB_GUIDE'a eklenir. Bölge karşılığı olmayan (bilek) hareketler bölgesizdir.
const MOB_LIB_V39 = [
  // ---- Dinamik ----
  { c: 0, name: "Arm Circles (Kol Çevirme)", rx: "1 Set x 10 Tekrar (Her Yön)", note: "Omuz ısınması", reg: ["shoulder"],
    steps: ["Ayakta dur, kollarını yana omuz hizasında aç.", "Küçük dairelerle başla, her turda daireyi büyüt.", "10 tur öne, sonra 10 tur geriye çevir."], warn: "Omuzlarını kulaklarına doğru kaldırma; batma olursa daireyi küçült." },
  { c: 0, name: "Hip Circles (Kalça Çevirme)", rx: "1 Set x 10 Tekrar (Her Yön)", note: "Kalça ve bel ısınması", reg: ["hip", "spine"],
    steps: ["Ayaklar omuz genişliğinde, ellerin belinde dur.", "Kalçanı yavaşça geniş daireler çizerek çevir.", "Bir yöne 10 tur, sonra diğer yöne 10 tur yap."], warn: "Dizlerini kilitleme; hareket kalçadan gelsin, baş sabit kalsın." },
  { c: 0, name: "Walking Knee Hugs (Yürüyerek Diz Çekme)", rx: "1 Set x 10 Tekrar (Sağ/Sol)", note: "Kalça ve arka bacak ısınması", reg: ["hip", "hamstring"],
    steps: ["Bir adım at, arka bacağın dizini iki elinle tutup göğsüne çek.", "Destek bacağında parmak ucuna yüksel, 1 saniye bekle.", "Bırak, adım at ve diğer bacakla tekrarla."], warn: "Gövdeni dik tut; dengen kayarsa duvara yakın yap." },
  { c: 0, name: "Walking Quad Pull (Yürüyerek Ön Bacak Çekme)", rx: "1 Set x 10 Tekrar (Sağ/Sol)", note: "Ön bacak ve kalça önü", reg: ["hip"],
    steps: ["Bir adım at, arka ayağını aynı taraftaki elinle tutup kalçana doğru çek.", "Dizlerini yan yana tut, kalçanı hafifçe sık.", "Diğer kolunu yukarı uzatıp 1–2 saniye bekle, sonra diğer bacağa geç."], warn: "Belini çukurlaştırma; dizde ağrı olursa çekişi azalt." },
  { c: 0, name: "Spiderman Lunge with Rotation", rx: "1 Set x 6-8 Tekrar (Sağ/Sol)", note: "Kalça ve üst sırt akışı", reg: ["hip", "spine"],
    steps: ["Şınav pozisyonundan bir ayağını aynı taraftaki elinin dışına getir.", "Kalçanı aşağı bırak, arka bacağın düz kalsın.", "İçteki kolunu tavana doğru aç, göğsünü çevir.", "Eli yere koy, ayağını geri al ve diğer tarafa geç."], warn: "Öndeki diz içe çökmesin; dönüşü zorlamadan yap." },
  { c: 0, name: "Hip Airplane (Kalça Uçağı)", rx: "1 Set x 5 Tekrar (Sağ/Sol)", note: "Kalça rotasyon kontrolü ve denge", reg: ["hip"],
    steps: ["Tek ayak üstünde dur, gövdeni öne eğ, diğer bacağını geriye uzat.", "Gövdeni ve leğenini yavaşça yere doğru aç (döndür).", "Sonra kalçadan geri kapatarak başa dön."], warn: "Dengeni kaybedersen bir eliyle duvardan destek al; destek dizini kilitleme." },
  { c: 0, name: "Ankle Circles (Ayak Bileği Çevirme)", rx: "1 Set x 10 Tekrar (Her Ayak)", note: "Ayak bileği ısınması", reg: ["ankle"],
    steps: ["Otur ya da bir ayak üstünde dur, diğer ayağını yerden kaldır.", "Ayak bileğinle mümkün olan en geniş daireleri çiz.", "10 tur bir yöne, 10 tur diğer yöne çevir."], warn: "Hareketi yalnızca ayak bileğinden yap; dizini kıpırdatma." },
  { c: 0, name: "Calf Raises (Topuk Kaldırma)", rx: "1 Set x 15 Tekrar", note: "Baldır ve ayak bileği aktivasyonu", reg: ["ankle"],
    steps: ["Ayaklar kalça genişliğinde, gerekirse duvara tutun.", "Topuklarını yavaşça kaldır, parmak uçlarında 1 saniye bekle.", "Kontrollü şekilde indir, topuklarını tam yere bas."], warn: "Ayak bileğini dışa yatırma; ağırlık başparmak tarafında kalsın." },
  { c: 0, name: "Bird Dog (Kuş-Köpek)", rx: "1 Set x 8 Tekrar (Sağ/Sol)", note: "Gövde ve bel stabilitesi", reg: ["spine", "hip"],
    steps: ["Dört ayak üstüne gel, karnını hafifçe sık.", "Bir kolunu öne, karşı bacağını geriye düz uzat.", "2 saniye bekle, kontrollü indir ve diğer tarafa geç."], warn: "Belin çukurlaşmasın ya da kalçan yana dönmesin; bacağı gereğinden yükseğe kaldırma." },
  { c: 0, name: "Dead Bug (Ölü Böcek)", rx: "1 Set x 8 Tekrar (Sağ/Sol)", note: "Karın ve bel kontrolü", reg: ["spine"],
    steps: ["Sırt üstü yat, kollar tavana, dizler 90 derece havada.", "Belini yere bastır, karnını sık.", "Bir kolu başının üstüne, karşı bacağı öne doğru uzatarak indir.", "Başa dön, diğer tarafla tekrarla."], warn: "Belin yerden kalkıyorsa bacağı daha az indir." },
  { c: 0, name: "Prone Y-T-W Raises", rx: "1 Set x 8 Tekrar", note: "Kürek kemiği ve arka omuz aktivasyonu", reg: ["shoulder", "spine"],
    steps: ["Yüz üstü yat, alnını havluya koy.", "Kollarını 'Y' şeklinde öne uzatıp hafifçe kaldır, indir.", "Sonra 'T' (yana) ve 'W' (dirsekler bükülü) şekillerinde tekrarla.", "Her kaldırışta kürek kemiklerini geriye ve aşağı çek."], warn: "Boynunu kaldırma, bakışın yerde kalsın; omuzlarını kulaklarına doğru sıkma." },
  { c: 0, name: "Open Book (Yan Yatarak Göğüs Açma)", rx: "1 Set x 8 Tekrar (Sağ/Sol)", note: "Üst sırt rotasyonu ve göğüs açılımı", reg: ["spine", "chest"],
    steps: ["Yan yat, dizlerini 90 derece bük, kollarını önde üst üste koy.", "Üstteki kolunu kitap açar gibi tavana ve karşı tarafa aç.", "Gözlerin elini izlesin, dizlerin yerden kalkmasın.", "Yavaşça geri kapat."], warn: "Dönüşü zorlama; omzunda batma olursa kolunu biraz daha aşağıdan aç." },
  { c: 0, name: "Bodyweight Good Morning", rx: "1 Set x 10 Tekrar", note: "Kalça menteşesi ve arka bacak", reg: ["hamstring", "hip"],
    steps: ["Ayaklar kalça genişliğinde, ellerini ensende birleştir.", "Dizlerini hafif bük, sırtını düz tutarak kalçanı geriye it.", "Arka bacakta gerilme hissedince kalçanı sıkarak dik dur."], warn: "Sırtını yuvarlama; hareket belden değil kalçadan gelsin." },
  { c: 0, name: "Jefferson Curl (Hafif)", rx: "1 Set x 5 Tekrar", note: "Omurga ve arka bacak esnekliği (ağırlıksız ya da çok hafif)", reg: ["hamstring", "spine"],
    steps: ["Bir basamağın kenarında, dizler düz dur.", "Çeneni göğsüne getir, omurganı yukarıdan aşağı omur omur yuvarlayarak in.", "En alt noktada nefes al, aynı şekilde omur omur yukarı kalk."], warn: "Bel sorunun varsa yapma; ağırlık eklemeden önce aylarca ağırlıksız çalış, yavaş yap." },
  { c: 0, name: "Walking Lunge with Overhead Reach", rx: "1 Set x 8 Tekrar (Sağ/Sol)", note: "Kalça önü ve yan gövde açılımı", reg: ["hip", "spine"],
    steps: ["Uzun bir hamle adımı at, arka dizini yere yaklaştır.", "Arka bacağın tarafındaki kolunu yukarı uzat, hafifçe karşı tarafa eğil.", "Ayağa kalk, diğer bacakla adım at."], warn: "Öndeki diz ayak parmaklarının çok önüne geçmesin, içe çökmesin." },
  { c: 0, name: "Scorpion Stretch (Akrep)", rx: "1 Set x 6 Tekrar (Sağ/Sol)", note: "Kalça önü ve omurga rotasyonu", reg: ["spine", "hip"],
    steps: ["Yüz üstü yat, kollarını yana T şeklinde aç.", "Bir bacağını dizden bükerek karşı elinin tarafına doğru çevir.", "Göğsün ve karşı omzun yerde kalsın, yavaşça başa dön."], warn: "Bele zorlama hissi olursa açıklığı küçült; ayağı yere ulaştırmaya çalışma." },
  { c: 0, name: "Sumo Squat to Stand", rx: "1 Set x 8 Tekrar", note: "İç bacak, arka bacak ve kalça", reg: ["hamstring", "hip"],
    steps: ["Ayaklar geniş, öne eğilip ayak parmaklarını tut.", "Kalçanı aşağı indirerek derin çömel, göğsünü kaldır.", "Kalçanı yukarı kaldırıp dizlerini düzleştir, parmaklarını bırakma.", "Ayağa kalk, tekrarla."], warn: "Dizlerin içe çökmesin; arka bacak çok gerginse dizlerini tam düzleştirme." },
  { c: 0, name: "Fire Hydrants", rx: "1 Set x 10 Tekrar (Sağ/Sol)", note: "Kalça dış rotasyonu ve yan kalça", reg: ["hip"],
    steps: ["Dört ayak üstüne gel.", "Bir dizini 90 derece bükülü hâlde yana doğru kaldır.", "Gövdeni sabit tutarak yavaşça indir."], warn: "Kalçanı yana yatırarak yüksekliği artırma; bel sabit kalsın." },
  { c: 0, name: "Clamshells (İstiridye)", rx: "1 Set x 12 Tekrar (Sağ/Sol)", note: "Yan kalça aktivasyonu", reg: ["hip"],
    steps: ["Yan yat, dizler bükülü, topukların kalçanla aynı hizada.", "Ayaklarını birbirinden ayırmadan üstteki dizini aç.", "Yavaşça kapat; leğenin geriye devrilmesin."], warn: "Hareketi bel dönerek değil kalçadan yap." },
  { c: 0, name: "Seated Thoracic Rotation", rx: "1 Set x 8 Tekrar (Sağ/Sol)", note: "Üst sırt rotasyonu (oturarak)", reg: ["spine"],
    steps: ["Sandalyede dik otur, kollarını göğsünde çapraz koy.", "Kalçan sabitken gövdeni bir tarafa çevir.", "En son noktada nefes ver, ortaya dön ve diğer tarafa çevir."], warn: "Dönüşü boyundan değil göğüsten yap; zorlama." },
  { c: 0, name: "Neck CARs (Boyun Çevirme)", rx: "1 Set x 5 Tekrar (Her Yön)", note: "Boyun eklem hareketliliği", reg: ["spine", "shoulder"],
    steps: ["Dik otur ya da dur, omuzlarını gevşet.", "Çeneni göğsüne getir, başını yavaşça bir yana ve arkaya doğru çevir.", "Yavaş ve kontrollü tam bir daire tamamla, sonra ters yöne."], warn: "Baş dönmesi, uyuşma ya da ağrı olursa dur; başını geriye atma." },
  { c: 0, name: "Wrist Circles & Rocks (Bilek Mobilitesi)", rx: "1 Set x 10 Tekrar", note: "Bilek ve ön kol (şınav, press öncesi)", reg: [],
    steps: ["Parmaklarını birleştirip bileklerini iki yönde daire çizerek çevir.", "Dört ayak üstünde avuçlarını yere koy.", "Ağırlığını yavaşça öne-arkaya ve yanlara aktar.", "Elleri ters çevirip (parmaklar dizlere) hafifçe tekrarla."], warn: "Bilekte batma olursa ağırlığı azalt." },
  { c: 0, name: "Heel & Toe Walks (Topuk ve Parmak Ucu Yürüyüşü)", rx: "1 Set x 20 Tekrar", note: "Ayak bileği ve kaval önü", reg: ["ankle"],
    steps: ["20 adım parmak uçlarında yürü, topukların yere değmesin.", "Ardından 20 adım topuklarının üstünde yürü, parmakların havada.", "Adımları kısa ve kontrollü tut."], warn: "Dengeni kaybedersen duvar boyunca yürü." },
  { c: 0, name: "Kneeling Adductor Rock-Back", rx: "1 Set x 10 Tekrar (Sağ/Sol)", note: "İç bacak ve kalça", reg: ["hip"],
    steps: ["Dört ayak üstünden bir bacağını yana düz uzat, ayak tabanın yerde.", "Sırtını düz tutarak kalçanı topuklarına doğru geri it.", "İç bacakta gerilme hissedince öne dön, tekrarla."], warn: "Uzattığın bacağın dizini kilitleme; kasıkta keskin ağrı olursa açıyı küçült." },
  { c: 0, name: "Gate Openers (Kalça Kapı Açma)", rx: "1 Set x 8 Tekrar (Sağ/Sol)", note: "Kalça dış rotasyonu ısınması", reg: ["hip"],
    steps: ["Ayakta dur, bir dizini öne ve yukarı kaldır.", "Dizini yana doğru açıp aşağı indir (kapıyı açar gibi).", "8 kez dışa açtıktan sonra 8 kez içe kapatarak çevir."], warn: "Gövdeni dik tut; dengen için duvara tutunabilirsin." },
  { c: 0, name: "Pelvic Tilts (Leğen Devirme)", rx: "1 Set x 12 Tekrar", note: "Bel ve leğen kontrolü", reg: ["spine"],
    steps: ["Sırt üstü yat, dizler bükülü, ayaklar yere basık.", "Karnını sıkarak belini yere bastır (leğeni arkaya devir).", "Sonra belini hafifçe yerden kaldır (leğeni öne devir).", "Yavaş ve nefesle tekrarla."], warn: "Hareket küçük olmalı; kalçanı yerden kaldırma." },
  { c: 0, name: "Prone Back Extension (Süpermen)", rx: "1 Set x 10 Tekrar", note: "Sırt ekstansörleri ve kalça", reg: ["spine"],
    steps: ["Yüz üstü yat, kolların önde uzansın.", "Kalçanı sıkarak göğsünü ve bacaklarını yerden birkaç santim kaldır.", "1–2 saniye bekle, kontrollü indir."], warn: "Boynunu geriye atma; belde sıkışma olursa yalnızca göğsü kaldır." },
  { c: 0, name: "Leg Cradle Walk", rx: "1 Set x 8 Tekrar (Sağ/Sol)", note: "Kalça dış rotasyonu ve kalça arkası", reg: ["hip"],
    steps: ["Bir adım at, arka bacağını kaldırıp dizini ve ayak bileğini kollarınla tut.", "Bacağı beşik gibi göğsüne doğru yatay çek.", "Destek bacağında dik dur, 1–2 saniye bekle, sonra diğer bacak."], warn: "Dizini yana zorlama; kucaklayış ayak bileğinden destek alsın." },
  { c: 0, name: "Shoulder Taps & Scap Circles", rx: "1 Set x 10 Tekrar", note: "Omuz stabilitesi ve kürek kemiği kontrolü", reg: ["shoulder"],
    steps: ["Şınav pozisyonuna gel, kalçanı sabit tut.", "Bir elinle karşı omzuna dokun, yerine koy; diğer elle tekrarla.", "Ardından kollar düz, kürek kemiklerini daire çizer gibi çevir."], warn: "Kalçan sağa sola sallanmasın; zor gelirse dizlerin üstünde yap." },

  // ---- Statik ----
  { c: 1, name: "Lizard Pose (Kertenkele)", rx: "Sağ ve Sol 2'şer Set x 30 sn", note: "Kalça önü ve iç kalça", reg: ["hip"],
    steps: ["Hamle pozisyonundan arka dizini yere koy.", "Öndeki ayağını biraz dışa al, iki elini ayağın iç tarafına koy.", "Kalçanı yere doğru bırak; rahatsa ön kollarına in."], warn: "Öndeki diz dışa düşmesin; kasıkta keskin ağrı olursa elleri yükselt." },
  { c: 1, name: "Standing Quad Stretch (Ayakta Ön Bacak)", rx: "Sağ ve Sol 2'şer Set x 30 sn", note: "Ön bacak", reg: ["hip"],
    steps: ["Bir eliyle duvara tutun, diğer elinle aynı taraftaki ayağını tut.", "Topuğunu kalçana doğru çek, dizlerin yan yana olsun.", "Kalçanı hafifçe öne it, bekle."], warn: "Belini çukurlaştırma; dizde ağrı olursa çekişi azalt ya da bir havluyla tut." },
  { c: 1, name: "Seated Forward Fold (Oturarak Öne Eğilme)", rx: "2 Set x 30 sn", note: "Arka bacak ve sırt", reg: ["hamstring", "spine"],
    steps: ["Yere otur, bacaklarını önde düz uzat.", "Sırtını dik tutarak kalçadan öne eğil.", "Ellerini ulaşabildiğin yere koy, her nefes verişte biraz daha uzan."], warn: "Dizlerini zorla bastırma; arka bacakta keskin ağrı olursa dizlerini biraz bük." },
  { c: 1, name: "Standing Forward Fold (Ayakta Öne Eğilme)", rx: "2 Set x 30 sn", note: "Arka bacak ve bel gevşetme", reg: ["hamstring"],
    steps: ["Ayaklar kalça genişliğinde, dizler hafif bükülü dur.", "Kalçadan öne eğil, gövdeni bacaklarına doğru bırak.", "Kollarını sarkıt ya da dirseklerini tut, başını gevşet."], warn: "Yüksek tansiyon ya da baş dönmesi varsa dikkatli ol; kalkarken yavaşça doğrul." },
  { c: 1, name: "Supine Hamstring Strap Stretch", rx: "Sağ ve Sol 2'şer Set x 30 sn", note: "Arka bacak (sırt üstü, bantla)", reg: ["hamstring"],
    steps: ["Sırt üstü yat, bir bandı ya da havluyu ayak tabanına geçir.", "Bacağını düz tutarak yukarı kaldır, diğer bacak yerde kalsın.", "Gerilme hissedince bekle, nefes verdikçe biraz daha çek."], warn: "Belini yerden kaldırma; dizinin arkasında sinir çekmesi olursa açıyı azalt." },
  { c: 1, name: "Wide-Leg Seated Straddle (Pancake)", rx: "2 Set x 45 sn", note: "İç bacak ve arka bacak", reg: ["hip", "hamstring"],
    steps: ["Yere otur, bacaklarını rahat edebildiğin kadar iki yana aç.", "Ayak parmakların tavana baksın, sırtını dik tut.", "Kalçadan öne eğilerek ellerini önde yere yürüt."], warn: "Sırtını yuvarlayarak öne gitme; altına yastık koymak eğilmeyi kolaylaştırır." },
  { c: 1, name: "Happy Baby (Mutlu Bebek)", rx: "2 Set x 30 sn", note: "Kalça ve bel gevşetme", reg: ["hip", "spine"],
    steps: ["Sırt üstü yat, dizlerini göğsüne çek.", "Ayak tabanlarını tavana çevir, ayaklarının dışından tut.", "Dizlerini koltuk altlarına doğru indir, hafifçe sağa sola sallan."], warn: "Başını ve sırtını yerde tut; zorlanırsan ayak bileklerinden tut." },
  { c: 1, name: "Knees to Chest (Dizleri Göğse Çekme)", rx: "2 Set x 30 sn", note: "Bel gevşetme", reg: ["spine"],
    steps: ["Sırt üstü yat, iki dizini göğsüne çek.", "Kollarınla dizlerine sarıl, başını yerde bırak.", "Nefes verirken hafifçe sağa sola sallan."], warn: "Dizlerde ağrı olursa dizlerin arkasından tut." },
  { c: 1, name: "Seated Spinal Twist (Oturarak Omurga Rotasyonu)", rx: "Sağ ve Sol 2'şer Set x 30 sn", note: "Omurga rotasyonu ve kalça dışı", reg: ["spine", "hip"],
    steps: ["Yere otur, bir bacağın düz; diğer ayağını düz bacağın dış tarafına bas.", "Karşı dirseğini bükülü dizin dışına koy.", "Diğer elini arkana koyup dik dur ve gövdeni çevir."], warn: "Önce dikleş sonra dön; dönüşü boyundan zorlama." },
  { c: 1, name: "Puppy Pose (Yavru Köpek)", rx: "2 Set x 30 sn", note: "Omuz, kanat ve göğüs açılımı", reg: ["shoulder", "chest"],
    steps: ["Dört ayak üstünden ellerini öne yürüt, kalçan dizlerinin üstünde kalsın.", "Göğsünü yere doğru bırak, alnını yere koy.", "Kollarını uzun tut, nefesle göğsünü biraz daha indir."], warn: "Omuzda batma olursa ellerini daha geniş koy; belini aşırı çukurlaştırma." },
  { c: 1, name: "Sleeper Stretch (Uyku Esnemesi)", rx: "Sağ ve Sol 2'şer Set x 30 sn", note: "Arka omuz kapsülü (iç rotasyon)", reg: ["shoulder"],
    steps: ["Yan yat, alttaki kolunu omuz hizasında öne uzat, dirseğini 90 derece bük.", "Diğer elinle alttaki ön kolu yavaşça yere doğru bastır.", "Omzunun arkasında hafif gerilme hissedince bekle."], warn: "Çok hafif bastır; omzun önünde batma olursa hemen bırak." },
  { c: 1, name: "Towel Behind Back Shoulder Stretch", rx: "2 Set x 30 sn", note: "Omuz iç rotasyonu ve göğüs önü", reg: ["shoulder", "chest"],
    steps: ["Bir havluyu bir elinle başının üstünden sırtına sarkıt.", "Diğer elinle havlunun alt ucunu bel hizasında tut.", "Üstteki elinle havluyu yukarı çekerek alttaki eli yükselt; sonra ters yöne."], warn: "Omuzda batma olursa çekişi azalt; ani çekme." },
  { c: 1, name: "Bench Prayer Stretch (Kanat Esnetme)", rx: "2 Set x 30 sn", note: "Latissimus ve üst sırt", reg: ["shoulder", "spine"],
    steps: ["Bir sehpanın önünde diz çök, dirseklerini sehpaya koy, avuçlarını birleştir.", "Kalçanı geriye it, başını kollarının arasından aşağı bırak.", "Ellerini ensene doğru bükerek gerilmeyi artırabilirsin."], warn: "Belini aşırı çukurlaştırma; omuzda sıkışma olursa dirsekleri biraz aç." },
  { c: 1, name: "Chin Tucks & Neck Flexion", rx: "2 Set x 30 sn", note: "Boyun arkası ve duruş", reg: ["spine"],
    steps: ["Dik otur, çeneni geriye doğru çek (çift çene yap).", "Bu pozisyonda başını hafifçe öne eğ.", "Ensende gerilme hissedince bekle, elinle çok hafif destek verebilirsin."], warn: "Boynunu bastırarak çekme; uyuşma ya da baş dönmesi olursa dur." },
  { c: 1, name: "Wrist Flexor & Extensor Stretch", rx: "Sağ ve Sol 2'şer Set x 30 sn", note: "Ön kol ve bilek", reg: [],
    steps: ["Kolunu önde düz uzat, avucun yukarı baksın.", "Diğer elinle parmaklarını aşağı ve kendine doğru çek, bekle.", "Sonra avucunu aşağı çevir, elinin sırtını kendine doğru çekerek bekle."], warn: "Bilekte batma ya da uyuşma olursa çekişi azalt." },
  { c: 1, name: "Kneeling Shin Stretch (Kaval Önü)", rx: "2 Set x 30 sn", note: "Ayak sırtı ve kaval önü", reg: ["ankle"],
    steps: ["Dizlerinin üstüne otur, ayak sırtların yerde, parmaklar arkaya baksın.", "Ellerini arkaya koyup dizlerini yavaşça yerden kaldırmaya çalış.", "Ayak sırtında ve kaval önünde gerilme hissedince bekle."], warn: "Dizde ağrı varsa altına yastık koy; ayak bileğini zorlama." },
  { c: 1, name: "Toe Sit (Parmak Esnetme)", rx: "2 Set x 30 sn", note: "Ayak parmakları ve ayak tabanı", reg: ["ankle"],
    steps: ["Diz çök, ayak parmaklarını yere bas (parmaklar bükülü).", "Kalçanı yavaşça topuklarının üstüne bırak.", "Ayak tabanında gerilme hissedince bekle, elinle yerden destek al."], warn: "Çok yoğun gelir; birkaç saniyeyle başla, süreyi yavaş artır." },
  { c: 1, name: "Reclined Butterfly (Yatarak Kelebek)", rx: "2 Set x 45 sn", note: "İç bacak ve kalça gevşetme", reg: ["hip"],
    steps: ["Sırt üstü yat, ayak tabanlarını birleştir, dizlerini yana bırak.", "Kollarını yanında gevşet, belini yere yerleştir.", "Nefes vererek dizlerin kendi ağırlığıyla insin."], warn: "Kasıkta çekme olursa dizlerin altına yastık koy." },
  { c: 1, name: "Standing Side Bend (Yana Eğilme)", rx: "Sağ ve Sol 2'şer Set x 30 sn", note: "Yan gövde ve kanat", reg: ["spine", "shoulder"],
    steps: ["Ayaklar kalça genişliğinde dur, bir kolunu başının üstüne uzat.", "Gövdeni karşı tarafa doğru yana eğ.", "Kalçanı hafifçe aksi yöne it, yan gövdende gerilmeyi hisset."], warn: "Öne ya da arkaya dönme; yalnızca yana eğil." },
  { c: 1, name: "Low Lunge (Alçak Hamle)", rx: "Sağ ve Sol 2'şer Set x 30 sn", note: "Kalça önü (psoas)", reg: ["hip"],
    steps: ["Hamle pozisyonunda arka dizini yere koy.", "Ellerini öndeki dizine koy, gövdeni dik kaldır.", "Kalçanı yavaşça öne ve aşağı bırak, kollarını yukarı uzatabilirsin."], warn: "Belini çukurlaştırma; arka dizinin altına yumuşak bir şey koy." },
  { c: 1, name: "Seated Figure-4 (Sandalyede Kalça)", rx: "Sağ ve Sol 2'şer Set x 30 sn", note: "Kalça arkası (oturarak, iş yerinde)", reg: ["hip"],
    steps: ["Sandalyede dik otur, bir ayak bileğini diğer dizinin üstüne koy.", "Sırtını dik tutarak kalçadan öne eğil.", "Kalçanın arkasında gerilme hissedince bekle."], warn: "Dizde ağrı olursa üstteki dizi zorla aşağı bastırma." },
  { c: 1, name: "Downward Dog (Aşağı Bakan Köpek)", rx: "2 Set x 30 sn", note: "Arka bacak, baldır ve omuz", reg: ["hamstring", "ankle"],
    steps: ["Dört ayak üstünden kalçanı yukarı ve geriye kaldır, ters V oluştur.", "Ellerini yere it, kollarının arasından bak.", "Topuklarını yere doğru bırak, gerekirse dizlerini hafif bük."], warn: "Sırtını yuvarlama; omuzda ya da bilekte ağrı olursa ön kollarına in." },
  { c: 1, name: "Camel Pose (Deve, Hafif)", rx: "2 Set x 20 sn", note: "Göğüs ve kalça önü açılımı", reg: ["chest", "spine"],
    steps: ["Dizlerinin üstünde dik dur, ellerini belinin arkasına koy.", "Kalçanı öne it, göğsünü yukarı kaldırarak hafifçe geriye eğil.", "Rahatsan ellerini topuklarına indir; başın omurganın devamı olsun."], warn: "Bel sorunun varsa yapma; geriye eğilmeyi belden değil göğüsten yap, yavaş çık." },
  { c: 1, name: "Bear Hug Upper Back Stretch", rx: "2 Set x 30 sn", note: "Kürek kemikleri arası ve üst sırt", reg: ["shoulder", "spine"],
    steps: ["Kollarını göğsünün önünde çaprazlayıp kendine sarıl.", "Ellerinle kürek kemiklerini tutup öne çek.", "Sırtını yuvarla, çeneni hafifçe indir, nefes al."], warn: "Boynunu öne itme; omuzlarını gevşek tut." },
  { c: 1, name: "Doorway Hamstring Stretch (Kapı Eşiğinde)", rx: "Sağ ve Sol 2'şer Set x 45 sn", note: "Arka bacak (pasif, uzun süreli)", reg: ["hamstring"],
    steps: ["Bir kapı eşiğinde sırt üstü yat.", "Bir bacağını kapı kasasına dayayarak yukarı uzat, diğeri eşikten geçip yerde dursun.", "Kalçanı kasaya yaklaştırarak gerilmeyi ayarla, gevşe."], warn: "Belin yerde kalmalı; dizin arkasında keskin ağrı olursa uzaklaş." },
  { c: 1, name: "Pec Stretch on Foam Roller (Göğüs Açma)", rx: "2 Set x 45 sn", note: "Göğüs ve omuz önü (pasif)", reg: ["chest", "shoulder"],
    steps: ["Silindiri omurga boyunca uzunlamasına koyup üstüne sırt üstü yat.", "Başın ve kalçan silindirin üstünde olsun, dizlerin bükülü.", "Kollarını avuçlar yukarı bakacak şekilde yana aç, yerçekimine bırak."], warn: "Elinde karıncalanma olursa kollarını biraz aşağı indir." },
  { c: 1, name: "Calf Stretch on Step (Basamakta Baldır)", rx: "Sağ ve Sol 2'şer Set x 30 sn", note: "Baldır ve aşil", reg: ["ankle"],
    steps: ["Bir basamağın kenarına ayak ön tarafınla bas, tırabzandan tutun.", "Bir topuğunu yavaşça basamağın altına bırak.", "Dizin düzken bekle, sonra hafif bükerek tekrarla."], warn: "Topuğu bir anda düşürme; aşil ağrın varsa derinliği azalt." },

  // ---- Foam roller / top ----
  { c: 2, name: "Calf Foam Roll (Baldır)", rx: "Sağ/Sol 60 sn", note: "Baldır miyofasyal gevşetme", reg: ["ankle"],
    steps: ["Yere otur, silindiri baldırının altına koy, ellerinle kalçanı kaldır.", "Ayak bileğinden dizin altına kadar yavaşça yuvarlan.", "Ayağını içe ve dışa çevirerek baldırın kenarlarını da çalış."], warn: "Dizin arkasına yuvarlanma." },
  { c: 2, name: "Hamstring Foam Roll (Arka Bacak)", rx: "Sağ/Sol 60 sn", note: "Arka bacak gevşetme", reg: ["hamstring"],
    steps: ["Yere otur, silindiri uyluğunun arkasına koy, ellerinle destek al.", "Kalçanın altından dizin üstüne kadar yavaşça yuvarlan.", "Bacağı içe-dışa çevirerek farklı bölgeleri çalış."], warn: "Dizin arkasına ve oturma kemiğinin üstüne bastırma." },
  { c: 2, name: "Adductor Foam Roll (İç Bacak)", rx: "Sağ/Sol 60 sn", note: "İç bacak gevşetme", reg: ["hip"],
    steps: ["Yüz üstü ön kollarına dayan, bir bacağını yana kurbağa gibi aç.", "Silindiri iç uyluğunun altına, yere paralel koy.", "Dizin yanından kasığa doğru yavaşça yuvarlan."], warn: "Kasığa çok yaklaşma; baskıyı ön kollarınla ayarla." },
  { c: 2, name: "TFL & Outer Thigh Foam Roll (Dış Bacak)", rx: "Sağ/Sol 60 sn", note: "Kalça yanı ve dış uyluk", reg: ["hip"],
    steps: ["Yan yat, silindiri kalça kemiğinin hemen altına ve önüne koy.", "Üstteki bacağını öne basarak ağırlığı ayarla.", "Kalça yanından uyluğun ortasına kadar yavaşça yuvarlan."], warn: "Dış bacak çok hassastır; baskıyı üstteki ayağınla azalt, dizin üstüne yuvarlanma." },
  { c: 2, name: "Glute Foam Roll (Kalça)", rx: "Sağ/Sol 60 sn", note: "Kalça kasları gevşetme", reg: ["hip"],
    steps: ["Silindirin üstüne otur, bir ayak bileğini diğer dizinin üstüne koy.", "Ağırlığını çalıştığın kalça tarafına ver.", "Kalçanın üst ve yan kısmında küçük hareketlerle yuvarlan."], warn: "Bacağa yayılan uyuşma olursa pozisyonu değiştir." },
  { c: 2, name: "Pec Ball Release (Göğüs Topla)", rx: "Sağ/Sol 45 sn", note: "Göğüs ve omuz önü gevşetme", reg: ["chest", "shoulder"],
    steps: ["Topu köprücük kemiğinin altına, omzunun önüne koy.", "Duvara dönük durup topu duvarla göğsün arasına sıkıştır.", "Küçük daireler çiz; kolunu yavaşça yukarı-aşağı hareket ettirebilirsin."], warn: "Köprücük kemiğinin ve koltuk altının üstüne bastırma." },
  { c: 2, name: "Upper Trap Ball Release (Trapez Topla)", rx: "Sağ/Sol 45 sn", note: "Üst trapez ve boyun-omuz arası", reg: ["shoulder"],
    steps: ["Sırtını duvara ver, topu boynunla omzunun arasındaki kasa koy.", "Dizlerini hafif bükerek topu yukarı-aşağı yuvarla.", "Hassas noktada bekle, başını karşı tarafa hafifçe eğ."], warn: "Omurganın ve boynun üstüne bastırma." },
  { c: 2, name: "Thoracic Two-Ball Release (Sırt İki Top)", rx: "1 Set x 60 sn", note: "Omurga yanı (üst sırt) gevşetme", reg: ["spine"],
    steps: ["İki topu bir çorabın içine koy ya da yan yana tut.", "Sırt üstü yat, topları omurganın iki yanına, kürek kemikleri hizasına koy.", "Kollarını göğsünde çaprazlayıp kalçanı kaldırarak yavaşça yukarı-aşağı yuvarlan."], warn: "Topları bel bölgesine indirme; omurganın tam üstüne koyma." },
  { c: 2, name: "Infraspinatus Ball Release (Kürek Kemiği)", rx: "Sağ/Sol 45 sn", note: "Arka omuz ve kürek kemiği üstü", reg: ["shoulder"],
    steps: ["Topu kürek kemiğinin düz kısmına koyup sırtını duvara yasla.", "Kolunu göğsünün önünden karşıya uzat.", "Küçük daireler çiz, hassas noktada bekle."], warn: "Omurganın üstüne kaydırma; kolda uyuşma olursa topu yer değiştir." },
  { c: 2, name: "Tibialis Foam Roll (Kaval Önü)", rx: "Sağ/Sol 45 sn", note: "Kaval kemiği yanı kaslar", reg: ["ankle"],
    steps: ["Dört ayak üstünde bir bacağının kaval önünü silindirin üstüne koy.", "Silindiri kaval kemiğinin dış yanına (kas tarafına) yerleştir.", "Ayak bileğinden dizin altına doğru yavaşça yuvarlan."], warn: "Doğrudan kaval kemiğinin üstüne bastırma." },
  { c: 2, name: "Forearm Ball Release (Ön Kol)", rx: "Sağ/Sol 45 sn", note: "Ön kol ve kavrama kasları", reg: [],
    steps: ["Ön kolunu masaya koy, topu altına yerleştir.", "Diğer elinle ön kola hafifçe bastırarak bilekten dirseğe doğru yuvarla.", "Hassas noktada bekleyip parmaklarını açıp kapat."], warn: "Bilek iç yüzündeki hassas bölgeye ve dirsek kemiğine bastırma." }
];
(() => {
  const cats = Object.keys(MOBILITY_LIBRARY);
  MOB_LIB_V39.forEach(x => {
    MOBILITY_LIBRARY[cats[x.c]].push({ name: x.name, prescription: x.rx, note: x.note });
    MOB_LIB_REGIONS[x.name] = x.reg;
    MOB_GUIDE[x.name] = { steps: x.steps, warn: x.warn };
  });
})();

const STORAGE_KEY = "ayk_plus_v5_state";

// Yardımcı fonksiyon: Belirtilen set sayısı ve hedef tekrar aralığıyla set dizisi üretir
function makeSets(count, targetRange, defaultKg = 0, defaultReps = 8) {
  const arr = [];
  for (let i = 0; i < count; i++) {
    arr.push({ kg: defaultKg, reps: defaultReps, target: targetRange, done: false });
  }
  return arr;
}

const DEFAULT_STATE = {
  activeTab: "nutrition",
  weight: 105,
  deficit: 700,
  dayType: "train",
  waterLiters: 0,
  supplements: { creatine: false, greens: false, omega: false },
  weightLogs: [{ date: "Başlangıç", weight: 105 }],
  customFoods: {},
  customIconDataUrl: "",
  meals: [
    {
      id: "breakfast",
      title: "1. Öğün: Kahvaltı (Yulaf + Yumurta + Yeşillik)",
      targetNote: "Hedef: 50-60g Protein",
      done: false,
      items: [
        { foodId: "tam_yumurta", amount: 3 },
        { foodId: "yulaf", amount: 80 },
        { foodId: "whey_shake", amount: 1 },
        { foodId: "domates_salatalik", amount: 200 }
      ]
    },
    {
      id: "lunch",
      title: "2. Öğün: Öğle Yemeği (Antrenman Öncesi)",
      targetNote: "Yüksek Karbonhidrat & Protein",
      done: false,
      items: [
        { foodId: "tavuk_gogsu", amount: 200 },
        { foodId: "pirinc", amount: 90 },
        { foodId: "yesil_salata", amount: 1 },
        { foodId: "zeytinyagi", amount: 10 }
      ]
    },
    {
      id: "snack",
      title: "3. Öğün: Ara Öğün (Antrenman Sonrası / İkindi)",
      targetNote: "Hızlı Toparlanma & Kuruyemiş",
      done: false,
      items: [
        { foodId: "whey_shake", amount: 1 },
        { foodId: "suzme_yogurt", amount: 150 },
        { foodId: "muz", amount: 1 },
        { foodId: "ceviz", amount: 25 }
      ]
    },
    {
      id: "dinner",
      title: "4. Öğün: Akşam Yemeği",
      targetNote: "Kas Onarımı & Sebze/Lif",
      done: false,
      items: [
        { foodId: "dana_kiyma", amount: 200 },
        { foodId: "makarna_tam", amount: 85 },
        { foodId: "brokoli_karnabahar", amount: 200 },
        { foodId: "zeytinyagi", amount: 5 }
      ]
    }
  ],

  // KULLANICININ AKTİF 4 GÜNLÜK ANTRENMAN PROGRAMI (BİREBİR EŞLEŞTİRİLDİ)
  activeWorkoutDayIdx: 0,
  workoutLogs: [],
  workoutDays: [
    {
      id: "upperA",
      name: "1. GÜN: Üst Vücut A",
      exercises: [
        { name: "Barbell Bench Press", targetInfo: "3x5–8", note: "Hedef: 3 Set x 5–8 Tekrar", sets: makeSets(3, "5–8", 0, 6) },
        { name: "Chest-Supported Row", targetInfo: "4x6–10", note: "Hedef: 4 Set x 6–10 Tekrar", sets: makeSets(4, "6–10", 0, 8) },
        { name: "Incline Dumbbell Press", targetInfo: "3x8–10", note: "Hedef: 3 Set x 8–10 Tekrar", sets: makeSets(3, "8–10", 0, 10) },
        { name: "Lat Pulldown", targetInfo: "3x8–12", note: "Hedef: 3 Set x 8–12 Tekrar", sets: makeSets(3, "8–12", 0, 10) },
        { name: "Cable Lateral Raise", targetInfo: "4x10–15", note: "Hedef: 4 Set x 10–15 Tekrar", sets: makeSets(4, "10–15", 0, 12) },
        { name: "Reverse Pec Deck veya Face Pull", targetInfo: "3x12–15", note: "Hedef: 3 Set x 12–15 Tekrar", sets: makeSets(3, "12–15", 0, 15) },
        { name: "Overhead Cable Triceps Extension", targetInfo: "3x8–12", note: "Hedef: 3 Set x 8–12 Tekrar", sets: makeSets(3, "8–12", 0, 10) },
        { name: "Triceps Rope/Bar Pushdown", targetInfo: "2x10–12", note: "Hedef: 2 Set x 10–12 Tekrar", sets: makeSets(2, "10–12", 0, 12) },
        { name: "Preacher Curl", targetInfo: "3x8–12", note: "Hedef: 3 Set x 8–12 Tekrar", sets: makeSets(3, "8–12", 0, 10) }
      ]
    },
    {
      id: "lowerA",
      name: "2. GÜN: Alt Vücut A",
      exercises: [
        { name: "Hack Squat", targetInfo: "3x5–8", note: "Hedef: 3 Set x 5–8 Tekrar", sets: makeSets(3, "5–8", 0, 6) },
        { name: "Romanian Deadlift", targetInfo: "3x6–10", note: "Hedef: 3 Set x 6–10 Tekrar", sets: makeSets(3, "6–10", 0, 8) },
        { name: "Seated Leg Curl", targetInfo: "3x8–12", note: "Hedef: 3 Set x 8–12 Tekrar", sets: makeSets(3, "8–12", 0, 10) },
        { name: "Leg Extension", targetInfo: "3x10–12", note: "Hedef: 3 Set x 10–12 Tekrar", sets: makeSets(3, "10–12", 0, 12) },
        { name: "Standing Calf Raise", targetInfo: "4x8–12", note: "Hedef: 4 Set x 8–12 Tekrar", sets: makeSets(4, "8–12", 0, 10) },
        { name: "Crunch Machine", targetInfo: "3x10–15", note: "Hedef: 3 Set x 10–15 Tekrar", sets: makeSets(3, "10–15", 0, 12) }
      ]
    },
    {
      id: "upperB",
      name: "3. GÜN: Üst Vücut B",
      exercises: [
        { name: "Machine Shoulder Press", targetInfo: "3x6–10 (36kg)", note: "Hedef: 3 Set x 6–10 Tekrar (36K)", sets: makeSets(3, "6–10", 36, 8) },
        { name: "Pull-up", targetInfo: "4x6–10", note: "Hedef: 4 Set x 6–10 Tekrar", sets: makeSets(4, "6–10", 0, 8) },
        { name: "Weighted Dips", targetInfo: "3x6–10", note: "Hedef: 3 Set x 6–10 Tekrar", sets: makeSets(3, "6–10", 0, 8) },
        { name: "Seated Cable Row", targetInfo: "3x8–12", note: "Hedef: 3 Set x 8–12 Tekrar", sets: makeSets(3, "8–12", 0, 10) },
        { name: "Pec Deck Fly VEYA Cable Crossover", targetInfo: "3x10–12", note: "Hedef: 3 Set x 10–12 Tekrar", sets: makeSets(3, "10–12", 0, 12) },
        { name: "Dumbbell Lateral Raise", targetInfo: "4x12–15", note: "Hedef: 4 Set x 12–15 Tekrar", sets: makeSets(4, "12–15", 0, 15) },
        { name: "Incline Dumbbell Curl", targetInfo: "3x8–12", note: "Hedef: 3 Set x 8–12 Tekrar", sets: makeSets(3, "8–12", 0, 10) },
        { name: "Skullcrusher", targetInfo: "3x8–12", note: "Hedef: 3 Set x 8–12 Tekrar", sets: makeSets(3, "8–12", 0, 10) },
        { name: "Hammer Curl", targetInfo: "3x8–12", note: "Hedef: 3 Set x 8–12 Tekrar", sets: makeSets(3, "8–12", 0, 10) }
      ]
    },
    {
      id: "lowerB",
      name: "4. GÜN: Alt Vücut B",
      exercises: [
        { name: "Barbell Hip Thrust", targetInfo: "3x6–10", note: "Hedef: 3 Set x 6–10 Tekrar", sets: makeSets(3, "6–10", 0, 8) },
        { name: "Leg Press", targetInfo: "3x8–10", note: "Hedef: 3 Set x 8–10 Tekrar", sets: makeSets(3, "8–10", 0, 10) },
        { name: "Bulgarian Split Squat", targetInfo: "3x8–10", note: "Hedef: 3 Set x 8–10 Tekrar", sets: makeSets(3, "8–10", 0, 10) },
        { name: "Lying Leg Curl", targetInfo: "3x8–12", note: "Hedef: 3 Set x 8–12 Tekrar", sets: makeSets(3, "8–12", 0, 10) },
        { name: "Leg Extension", targetInfo: "3x10–15", note: "Hedef: 3 Set x 10–15 Tekrar", sets: makeSets(3, "10–15", 0, 12) },
        { name: "Hyperextension", targetInfo: "2x10–15", note: "Hedef: 2 Set x 10–15 Tekrar", sets: makeSets(2, "10–15", 0, 12) },
        { name: "Seated Calf Raise", targetInfo: "3x12–15", note: "Hedef: 3 Set x 12–15 Tekrar", sets: makeSets(3, "12–15", 0, 15) },
        { name: "Hanging Leg Raise", targetInfo: "3x8–15", note: "Hedef: 3 Set x 8–15 Tekrar", sets: makeSets(3, "8–15", 0, 12) }
      ]
    }
  ],

  // DİNAMİK MOBİLİTE AKIŞI & STATİK STRETCHING PROGRAMI (BİREBİR EŞLEŞTİRİLDİ)
  mobilityRoutine: {
    dynamic: [
      { name: "World’s Greatest Stretch", prescription: "1 Set x 8–10 Tekrar", note: "Sağ ve sol akıcı geçiş", done: false },
      { name: "90/90 Hip Switch", prescription: "1 Set x 8–10 Tekrar", note: "Gövde dik, kalça rotasyonu", done: false },
      { name: "Kneeling Ankle Dorsiflexion", prescription: "1 Set x 8–10 Tekrar", note: "Topuk yerden kalkmadan diz ileri", done: false },
      { name: "Quadruped Cat-Cow", prescription: "1 Set x 8–10 Tekrar", note: "Nefes alarak ekstansiyon, vererek fleksiyon", done: false },
      { name: "Towel/Band Shoulder Dislocates", prescription: "1 Set x 8–10 Tekrar", note: "Dirsekler bükülmeden tam tur", done: false }
    ],
    static: [
      { name: "Doorway Pec & Biceps Stretch", prescription: "2 Set x 30 sn", timerSec: 30, note: "Kapı eşiğinde göğüs ve biceps esnetme", done: false },
      { name: "Child’s Pose with Lat Reach", prescription: "Sağ ve Sol için 1'er Set x 45 sn", timerSec: 45, note: "Ellerle çapraza uzanarak kanat esnetme", done: false },
      { name: "Couch Stretch", prescription: "Sağ ve Sol için 2'şer Set x 30 sn", timerSec: 30, note: "Kalça fleksörü ve üst bacak", done: false },
      { name: "Supine Figure-4 Glute Stretch", prescription: "Sağ ve Sol için 2'şer Set x 30 sn", timerSec: 30, note: "Sırtüstü 4 figürü ile kalça esnetme", done: false },
      { name: "Single-Leg Seated Hamstring Stretch", prescription: "Sağ ve Sol için 2'şer Set x 30 sn", timerSec: 30, note: "Tek bacak oturarak arka bacak esnetme", done: false }
    ]
  }
};

