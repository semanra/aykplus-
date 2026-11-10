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

