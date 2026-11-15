# AYK+ İngilizce terim sözlüğü (Aşama 3, v46–v49)

Bu belge, AYK+ İngilizce arayüzünde kullanılacak **tek ve bağlayıcı** terim listesidir. v47–v49'daki bütün çeviriler bu karşılıkları kullanır; bir terim değişecekse önce burada değişir, sonra kodda.

**Ana ilke (kullanıcının şartı):** çeviri kelime kelime yapılmaz. Her terim, o ekranda ne işe yaradığına bakılarak, yerleşik bir İngilizce fitness/beslenme uygulamasında nasıl söyleniyorsa öyle karşılanır. Örnek: "Menülerim" kelimesi kelimesine "My menus" olur, ama İngilizcede "menu" restoran listesi demektir; bizim ekranımızdaki şey bir **meal plan**'dır.

**Nasıl hazırlandı:** terimler kaynak koddaki gerçek ekran metinlerinden (`src/markup.html`, `src/app/*.js`, `src/data.js`) ve CLAUDE.md §6'daki ekran tarifinden toplandı. Karşılıklar; MacroFactor, MyFitnessPal, Cronometer (beslenme), Strong, Hevy, Fitbod (antrenman) uygulamalarının yardım sayfalarındaki terim kullanımı, ISSN pozisyon bildirgeleri ve NSCA terimleri, ayrıca Birleşik Krallık/AB besin etiketi kuralları (ör. "salt") esas alınarak seçildi. Hiçbir uygulamanın metni kopyalanmadı; yalnızca terim uyumu sağlandı. Kaynak listesi belgenin sonunda.

Toplam: **190 tablo satırı** (11 bölüm; bazı satırlar birbirine bağlı seçenek takımlarıdır, ör. Kolay/Orta/Zor/Tükeniş) + kurallar.

---

## 0. Kurallar

### 0.1 Yazım: hangi İngilizce?
- **Hedef kitle:** kg/cm kullanan genel İngilizce konuşanlar (Birleşik Krallık, İrlanda, AB, Avustralya, Yeni Zelanda), ABD öncelikli değil. Uygulama zaten yalnızca kg/cm kullanıyor.
- **Temel yazım en-GB:** `colour`, `personalise`, `fibre`, `centre`, `-ise` ekleri, `analyse`.
- **İstisna: "program" (programme değil).** Gerekçe:
  1. Antrenman uygulamalarının neredeyse hepsi (Strong, Hevy, Fitbod, Boostcamp) İngiltere mağazasında da "program" yazıyor; kullanıcı bu kelimeyi uygulamalardan tanıyor.
  2. Kısa düğme ve sekmelerde 2 harf fark eder (`My program` dar ekranda sığmalı).
  3. ABD'li bir kullanıcı "programme"ı yadırgar, İngiliz kullanıcı "program"ı yadırgamaz (bilişim bağlamında İngiltere'de de "program" doğru yazımdır). Reddedilen: `programme` (uygulamalarda nadir, uzun).
- **Diğer ABD/GB farkı olan terimler:** mümkün olduğunca iki tarafta da aynı yazılan kelime seçilir (ör. "Appearance", "Calories", "Workout"; "Color theme" gibi ABD/GB farklı yazılan ifadelerden kaçınılır). Fark kaçınılmazsa en-GB: `fibre`, `colour`, `personalise`, `shopping list` (grocery list değil).

### 0.2 Büyük harf
- Düğmeler, başlıklar, sekme adları, bölüm etiketleri: **Sentence case** (yalnızca ilk harf büyük): `Add food`, `Rest day`, `Start workout`. Title Case (`Add Food`) KULLANILMAZ. Bu, Türkçe arayüzün v32 kuralıyla da (cümle düzeni) uyumlu.
- Kısaltmalar her zaman büyük: `TDEE`, `BMR`, `1RM`, `e1RM`, `PR`, `RPE` (kullanılırsa), `USDA`.
- Özel adlar korunur: `AYK+`, `Open Food Facts`, `USDA FoodData Central`.

### 0.3 Değişmeyenler
- **"AYK+" çevrilmez.**
- **Birimler değişmez:** `kg`, `cm`, `kcal`, `g`, `mg`, `ml`, `L`, `sn` → İngilizcede `s` (saniye), `dk` → `min`. Birim ile sayı arasında boşluk: `80 kg`, `2.5 L`, `250 kcal`.
- Kalori: metinde "calories", sayının yanında her zaman `kcal`. ("Cal" ve "kJ" kullanılmaz.)
- **Sayılar (İngilizce gösterim):** ondalık ayırıcı nokta (`2.5 kg`), binlik ayırıcı virgül yalnızca salt okunur gösterimlerde (`2,478 kcal`); giriş kutularında binlik ayırıcı yok (spec §8.5).
- **Tarih:** en-GB sırası, `15 Nov`, `Mon 15 Nov`; hafta Pazartesi başlar (bugünkü davranış).
- Kullanıcının yazdığı adlar (besin, hareket, rutin, öğün) çevrilmez. Uygulamanın kayda yazdığı varsayılan adlar oluşturulduğu dildedir (spec §5.4).

### 0.4 Üslup
- Türkçedeki samimi "sen" dili İngilizcede doğal ikinci tekil şahısla karşılanır (`your goal`, `you've hit…`). Ünlem ve abartı yok.
- Emir kipli kısa düğmeler: `Save`, `Undo`, `Restore`. "Please" kullanılmaz.
- Sağlık ve hesap metinlerinde yerleşik terimler: `TDEE`, `lean body mass`, `calorie deficit`, `calorie surplus`, `maintenance calories` (bkz. bölüm 3).
- Aynı kavram her ekranda aynı kelimeyle: ör. tek bir antrenman seansı her yerde `workout` (bir yerde "session", bir yerde "training" değil). Mobilitede `session` yalnızca rehberli esneme seansı içindir.

---

## 1. Uygulama geneli ve sekmeler

| Türkçe | English | Bağlam (ekran) | Neden (kaynak / yaygın kullanım) |
|---|---|---|---|
| Beslenme (sekme) | **Nutrition** | Alt menü, başlık `#tabTitle` | MyFitnessPal, Cronometer, MacroFactor bölüm adı. Reddedilen: "Diet" (zayıflama diyeti çağrışımı), "Food" (yalnızca besin listesi gibi). |
| Antrenman (sekme) | **Training** | Alt menü, başlık | Sekme; program, kütüphane, geçmiş dahil bütün antrenman dünyasını kapsar. Tek seans `workout` olduğu için sekme adı ondan ayrılır. Reddedilen: "Workout" (sekmede tek seans gibi okunur), "Gym" (ev antrenmanını dışlar). |
| Mobilite (sekme) | **Mobility** | Alt menü, başlık | Yerleşik terim (GOWOD, Pliability gibi uygulamalar). Reddedilen: "Stretching" (foam rolling ve dinamik hareketleri kapsamaz). |
| İlerleme (sekme) | **Progress** | Alt menü, başlık | Strong/Hevy/MFP'deki standart ad. |
| Profil | **Profile** | `#profilePage` | Standart. |
| Ayarlar | **Settings** | Profil içi bölüm | Standart. |
| Bugün | **Today** | Beslenme ve Antrenman alt sekmesi | Standart. |
| Geçmiş | **History** | Beslenme ve Antrenman alt sekmesi | Strong, Hevy, MFP. Reddedilen: "Log" (fiil/isim belirsiz). |
| Geri al (bildirimde) | **Undo** | 6 sn'lik bildirim düğmesi | iOS/Android standardı. |
| Kaydedildi | **Saved** | Profil otomatik kayıt bildirimi | Standart. |
| Antrenman günü | **Training day** | Beslenme gün tipi, menü seçimi | Kalori döngüsü (calorie cycling) yazılarında "training day / rest day" kalıbı yerleşik. Reddedilen: "Workout day", "Gym day" (daha gündelik). |
| Dinlenme günü | **Rest day** | Aynı | Yerleşik. Reddedilen: "Off day", "Recovery day" (aktif toparlanma anlamı taşır). |
| Yeni gün (düğme) | **Start new day** | Beslenme, `manualNewDay` | İşlev: günü elle kapatıp yenisini başlatmak. Yalnızca "New day" bir başlık gibi okunur. |
| Görünüm: Sistem / Koyu / Aydınlık | **Appearance: System / Dark / Light** | Profil → Görünüm | iOS Ayarlar'daki terimler (Appearance, Light, Dark). Reddedilen: "Theme" (iOS'ta yaygın değil), "Day mode". |

## 2. Beslenme: menü, öğün, kayıt

| Türkçe | English | Bağlam (ekran) | Neden (kaynak / yaygın kullanım) |
|---|---|---|---|
| Menü (antrenman/dinlenme günü menüsü) | **Meal plan** | Menülerim, Bugün, alışveriş | Bizdeki "menü" = her gün tekrarlanan planlı öğünler. İngilizcede bunun adı "meal plan" (MFP Meal Planner, Eat This Much). Reddedilen: "Menu" (restoran listesi anlamı; kelime kelime çeviri), "Template". |
| Menülerim (alt sekme) | **Plans** | `#nutriNav` | Dar alt sekmede tek kelime gerekir; bağlamdan beslenme planı olduğu açık. Başlıkta uzun hâli: "Your meal plans". Reddedilen: "My menus". |
| Antrenman günü menüsü / Dinlenme günü menüsü | **Training-day plan / Rest-day plan** | `#mnTrain/#mnRest` | Yukarıdaki iki terimin birleşimi; tutarlı. |
| Öğün | **Meal** | Her yerde | Standart. Not: ara öğün de "meal" (kullanıcı adlandırıyor). |
| Besin | **Food** | Besin listesi, seçici | MFP/Cronometer: "food". Reddedilen: "Ingredient" (yalnızca tarifte), "Item" (yalnızca teknik). |
| Besinler (alt sekme) | **Foods** | `#nutriNav` | Aynı. |
| Kalem (öğündeki besin) | **Item** / bağlama göre **food** | Öğün düzenleme | Arayüzde mümkünse "food"; liste sayımında "3 items". |
| Planlanan | **Planned** | Halka, Geçmiş | MacroFactor/MFP: planned vs logged. |
| Yenen | **Eaten** | Kalori halkası varsayılanı, Geçmiş | Halkadaki karşılığı "Eaten" (kısa, gündelik). Reddedilen: "Consumed" (resmî), "Logged" (bizde tik = yendi, "kaydedildi" anlamı değil). |
| Menü · X kcal (halka düğmesi) | **Plan · X kcal** | `#calRing` düğmesi | "Meal plan" teriminin kısa hâli. |
| Yedim (öğün tiki) | **Eaten** (onay kutusu etiketi: "Mark as eaten") | Bugün zaman çizelgesi | Erişilebilirlik etiketi fiil olarak. |
| Sadece bugüne / Menüme (her gün) | **Today only / My plan (every day)** | Besinler anahtarı, `#fdHint` | İşlev: eklenen besin yalnızca bugünkü kopyaya mı, kalıcı plana mı gider. |
| Menüye de kaydet | **Save to plan too** | `#dayDiffBanner` | Aynı. |
| Bugünü menüye geri döndür | **Reset today to plan** | `#dayDiffBanner` | "Revert" teknik; "reset to" gündelik ve açık. |
| Dışarıda yedim | **Ate out** | Bugün düzenleme, `openFreeMeal` | Doğal gündelik deyim. Reddedilen: "Ate outside" (kelime kelime; "açık havada" anlamı). |
| Tahmini giriş | **Quick estimate** | Dışarıda yedim formu | MFP'deki "Quick add" ile karışmasın diye "estimate" vurgusu. Reddedilen: "Quick add" (bizde `quickAdd` başka işlev). |
| Yarısını yedim | **Ate half** | Bugün düzenleme | Kısa, doğal. |
| Günü dengele | **Rebalance my day** | `balanceDay` | İşlev: kalan öğünleri hedefe göre kısar. "Balance the day" daha soyut. |
| Dünkü gibi | **Same as yesterday** | `repeatLastMeal` | Doğal deyim (MFP "Copy from yesterday" ile aynı anlam, farklı metin). |
| İkame (⇄) | **Swap** | `openSwap` | Kısa ve yerleşik (Eat This Much, MacroFactor "swap"). Reddedilen: "Substitute" (dar düğmeye uzun), "Replace" (anlamı kayıp: kaloriyi koruyan değişim). |
| Kombo | **Combo** | Mutfak, "Komboların" kategorisi | MFP bunlara "Meals" diyor, ama bizde "meal" = öğün; çakışmayı önlemek için "combo" (Cronometer'daki "custom meal" de aynı çakışmayı taşır). Kategori adı "Your combos". Reddedilen: "Saved meal", "Meal" (çakışma). |
| Tarif | **Recipe** | `#recipeModal` | Standart. |
| Özel besin | **Custom food** | Besin formu | MFP, Cronometer standardı. Reddedilen: "My food", "Personal food". |
| Barkod | **Barcode** | Barkod okuyucu | Standart. "Scan barcode" düğmesi. |
| Etikete bakıp düzelt | **Check the label and fix** | `barcodeFixFood` | İşlev açık; "nutrition label" terimi. |
| Besin etiketi / Etiket kalorisi | **Nutrition label / Label calories** | Özel besin formu, `labelCheck` | AB/GB etiketinin adı "nutrition information"; uygulamalarda "nutrition label" yaygın. |
| Porsiyon / Hazır porsiyonlar | **Serving / Serving sizes** | `foodPresets`, "1 porsiyon" modu | MFP/Cronometer "serving". Reddedilen: "Portion" (gündelik, ama etiketlerde "serving"). |
| Kiloya göre gramaj | **Scale portions to body weight** | `#scaleCard` | İşlev açık; kısa başlık "Portion scaling". |
| Bu gramajları yeni başlangıç yap (Sabitle) | **Make these the new base amounts** | `resetScaleBase` | "Lock in" kısa ama anlamı belirsiz; işlevi söyleyen metin seçildi. |
| Alışveriş listesi | **Shopping list** | `#shopModal` | en-GB ("grocery list" ABD). |
| Bulunamayan besin (⚠) | **Missing food** | `lostFood`, `checkFoodHealth` | Veritabanında artık yok; "missing" nötr. Reddedilen: "Unknown food", "Lost food". |
| Bulunamayan aramalar | **Searches with no results** | Profil | İşlevi açıklayan ifade. |
| Pişmiş / çiğ | **Cooked / raw** | Besin adları, notlar | Standart. |
| Önerilen besinler (kalanı kapatan) | **Suggestions to fill your remaining macros** (kısa: **Suggestions**) | `#foodSuggest` | "Remaining" MacroFactor/MFP terimi. |
| Bu hafta (Geçmiş kartı) | **This week** | `#weekCard` | Standart. |
| Haftalık bütçe | **Weekly calorie budget** | `weekStats` | "Calorie budget" (Lose It!, MFP) yerleşik. |
| Hedef tutturma takvimi | **Target calendar** (günler: **On target / Close / Off target**) | Geçmiş, `hitClass` | ±%5 = on target, ±%15 = close. Reddedilen: "Hit/miss" (oyun dili). |
| Protein dağılımı | **Protein distribution** | `proteinSpreadHtml` | ISSN 2017 bildirgesi "protein distribution" (öğün başına 20–40 g) terimini kullanır. |

## 3. Hedef, enerji ve makrolar (hesap terimleri)

| Türkçe | English | Bağlam (ekran) | Neden (kaynak / yaygın kullanım) |
|---|---|---|---|
| Hedef: Ver / Koru / Al | **Goal: Lose / Maintain / Gain** | Menülerim Hedef kartı `#goalLose/#goalKeep/#goalGain`, kurulum | MacroFactor'ın hedef türleri tam olarak lose / maintain / gain. Kurulumda uzun hâller: "Lose weight", "Maintain weight", "Gain weight". Reddedilen: "Cut / Maintain / Bulk" (vücut geliştirme jargonu, genel kullanıcıyı dışlar). |
| Kilo vermek (kurulum açıklaması: "Yağ kaybı, kası koruyarak") | **Lose weight** — "Lose fat while keeping muscle" | Kurulum adım 3 | Açıklama anlamı korur. |
| Kilomu korumak ("Aynı kiloda daha fit ve güçlü") | **Maintain weight** — "Stay at your weight, get fitter and stronger" | Kurulum | Aynı. |
| Kilo almak ("Kas kazanmak için kalori fazlası") | **Gain weight** — "A calorie surplus to build muscle" | Kurulum | Aynı. |
| Kalori açığı (açık) | **Calorie deficit** (kısa: **deficit**) | `#deficitSlider`, Hakkında, koç | Yerleşik bilimsel ve uygulama terimi. |
| Kalori fazlası (fazla) | **Calorie surplus** (kısa: **surplus**) | `#gainBox`, Hakkında | Yerleşik. |
| Kilo alma hızı: Yavaş / Orta / Hızlı | **Rate of gain: Slow / Moderate / Fast** | `#paceSlow/#paceMid/#paceFast` | MacroFactor "goal rate". "Moderate" tüm üç kademeli seçimlerde (bkz. hareketlilik, zorluk) ortak orta kelime. Reddedilen: "Medium" (boyut çağrıştırır), "Aggressive" (olumsuz ton). |
| Ne kadar hızlı? (günlük kalori açığı) | **How fast? (daily calorie deficit)** | Kurulum, kart | Aynı. |
| Koruma kalorisi (TDEE) | **Maintenance calories** (teknik metinde **TDEE**) | Hakkında, kurulum özeti, hedef kartı | MacroFactor "maintenance / expenditure"; TDEE = total daily energy expenditure, sağlık metninde açılımıyla bir kez. Reddedilen: "Maintenance energy" (akademik), "Calories burned" (yalnızca egzersizi çağrıştırır). |
| Bazal metabolizma | **BMR** (basal metabolic rate) | Hakkında | Mifflin-St Jeor açıklamasında standart. |
| Günlük hedeflerin | **Your daily targets** | Kurulum özeti | MacroFactor/Cronometer "targets". Reddedilen: "Goals" (bizde goal = Ver/Koru/Al; çakışma). |
| Kalori hedefi | **Calorie target** | Halka, hedef kartı | Aynı gerekçe: "target" sayı, "goal" yön. |
| Hedef kilo | **Goal weight** | Profil, kurulum | MFP, Lose It! "goal weight". Burada "goal" doğal deyimdir ve sayıyla karışmaz. Reddedilen: "Target weight" (daha az yaygın). |
| Makrolar | **Macros** | Her yerde | Yerleşik. |
| Protein / Karb / Yağ | **Protein / Carbs / Fat** | P/K/Y hapları, kartlar | Uygulamalarda standart kısa hâller; haplarda tek harf **P / C / F**. Reddedilen: "Carbohydrate" (dar alanda uzun), "Fats". |
| Kalori | **Calories** (birim **kcal**) | Her yerde | Bkz. 0.3. |
| Lif | **Fibre** | `#microLine`, besin kartı | en-GB yazımı (GB etiketlerinde "fibre"). ABD'de "fiber"; kitle kuralı gereği fibre. |
| Tuz | **Salt** | `#microLine` (≤ 5 g) | GB/AB etiketleri sodyumu "salt" olarak gösterir; DSÖ önerisi de "5 g salt". Bizim hedefimiz zaten tuz gramı. |
| Sodyum | **Sodium** | Besin detay (mg) | Standart. |
| Yağsız kütle | **Lean body mass** | Hakkında, protein kuralı | Helms ve ark. 2014 ve ISSN bildirgesindeki terim. Reddedilen: "Fat-free mass" (akademik eş anlamlı; arayüzde lean body mass daha tanıdık). |
| Yağ oranı | **Body fat %** (metinde **body fat percentage**) | Profil, İlerleme Kilo | Standart. |
| Hareketlilik: Az / Orta / Çok | **Activity level: Low / Moderate / High** | Profil `#setActivity`, kurulum adım 4 | TDEE hesaplayıcılarında "activity level" yerleşik. Açıklamalar: "Desk job, little walking" / "Some movement during the day" / "On your feet or physical work". Reddedilen: "Sedentary / Active / Very active" (Az seçeneği haftada antrenman yapan kişiyi "sedentary" diye etiketler; antrenman ayrıca hesaplandığı için yanlış). |
| Protein: Standart / Yüksek | **Protein: Standard / High** | Profil `#setProtein` | Sade, anlamı tam. |
| Antrenman deneyimi: Yeni başlıyorum / Salonu biliyorum | **Training experience: New to the gym / I know my way around the gym** | Kurulum adım 5 | Doğal deyim. Reddedilen: "Beginner / Advanced" (ikinci seçenek ileri seviye değil). |
| Cinsiyet: Erkek / Kadın | **Sex: Male / Female** | Kurulum, Profil | Hesap biyolojik cinsiyete dayanır (Mifflin-St Jeor); tıbbi hesaplayıcılar "sex" der. Reddedilen: "Gender" (hesabın dayandığı şey değil). |
| Yaş / Boy / Kilo | **Age / Height / Weight** | Profil, kurulum | Standart. |
| Su hedefi kiloya göre | **Water target based on body weight** | Profil `#setWaterAuto` | Aynı "target" kuralı. |

## 4. Su ve takviye

| Türkçe | English | Bağlam (ekran) | Neden (kaynak / yaygın kullanım) |
|---|---|---|---|
| Su | **Water** | `#waterCard` | Standart. |
| Takviye | **Supplement** | `#suppCard` | Standart. |
| Takviye rutini (kart) | **Supplements** (kart başlığı) | Bugün | "Routine" mobilitede rutin için ayrıldı; kart başlığında tek kelime yeterli. Reddedilen: "Supplement routine" (çakışma), "Stack" (jargon). |
| Doz | **Dose** | `changeSuppDose` | Standart. |
| Hazır takviyeler | **Common supplements** | Düzenle modu `SUPP_PRESETS` | "Preset" teknik dil. |
| Zaman: Sabah tok / Antrenman öncesi / Antrenman sonrası / Yatmadan önce / Özel | **With breakfast / Pre-workout / Post-workout / Before bed / Custom** | `SUPP_TIMES` | "Pre-/post-workout" takviye dünyasında yerleşik. "Sabah tok" = sabah yemekle; "with breakfast" doğal. |
| Gruplar: İlk öğünle / Antrenman · Gün içi / Akşam · Uyku öncesi / Diğer | **With first meal / Workout & daytime / Evening & bedtime / Other** | `SUPP_GROUPS` | Grup başlıkları; anlam korunur. |
| Kreatin | **Creatine** | Su hedefi notu | Standart. |

## 5. Antrenman: temel

| Türkçe | English | Bağlam (ekran) | Neden (kaynak / yaygın kullanım) |
|---|---|---|---|
| Antrenman (tek seans) | **Workout** | "Antrenmanı başlat/bitir", geçmiş | Strong/Hevy standardı. Düğmeler: "Start workout", "Finish workout". Reddedilen: "Session" (mobiliteye ayrıldı), "Training" (sekme adı). |
| Programım (alt sekme) | **Program** (başlıkta **My program**) | `GYM_VIEWS` | Hevy/Strong "program/routine". Bizde program = günlerden oluşan haftalık düzen; "routine" mobiliteye ayrıldığı için program. Yazım gerekçesi 0.1'de. |
| Gün (programdaki, "1. Gün") | **Day** ("Day 1") | Programım | Doğal. Reddedilen: "Workout A/B" (kullanıcı gün adlandırıyor). |
| Sıradaki gün | **Up next** (cümlede: "next workout") | Bugün | Strong'un "next workout" anlamı; kart etiketi "Up next" kısa ve doğal. Reddedilen: "Next day" (yarın gibi okunur). |
| Hareketler (alt sekme) / Hareket | **Exercises** / **Exercise** | `GYM_VIEWS`, seçici | Strong/Hevy "Exercises". Reddedilen: "Moves", "Movements" (mobilitede "moves" kullanılabilir, bkz. 8). |
| Hareket kütüphanesi | **Exercise library** | Hareketler | Hevy "exercise library". |
| Set | **Set** | Her yerde | Standart. |
| Tekrar | **Reps** (tekil **rep**) | Set satırı | Standart. Reddedilen: "Repetitions" (dar alanda uzun). |
| Kilo (sette) | **Weight** (sütunda **kg**) | Set satırı | Strong'da sütun başlığı birim. |
| Hareket türü: Ağırlık / Kardiyo / Süreli | **Weights / Cardio / Timed** | `ex.kind`, hareket penceresi | "Timed" plank gibi süreli hareketler için yerleşik. Reddedilen: "Duration" (sıfat değil), "Strength" (İlerleme'deki Güç sekmesinin adı; çakışır). |
| Ekipman: Plakalı (bar / plaka) | **Barbell & plates** (kısa: **Plates**) | `EQUIP_LABEL/EQUIP_SHORT` | Plaka hesabını tetikleyen tür; "plates" anlamı taşır. |
| Ağırlık yığını (makine / kablo) | **Weight stack (machine / cable)** (kısa: **Machine**) | Aynı | "Weight stack" makinenin pimli ağırlık kulesinin İngilizce adı. |
| Dambıl | **Dumbbell** | Aynı | Standart. |
| Vücut ağırlığı | **Bodyweight** | Aynı | Fitness yazımında bitişik "bodyweight" yaygın. |
| Kas grubu | **Muscle group** | Hareket penceresi, haftalık sayım | Standart. |
| Vücut haritası | **Muscle map** | Hareketler / Programım | Fitbod "muscle recovery map", Hevy "muscle map". Reddedilen: "Body map" (ağrı haritası çağrışımı). |
| Bu hafta kas başına set | **Weekly sets per muscle** | `[data-week-muscles]` | Hipertrofi literatüründe "weekly sets per muscle group" kalıbı yerleşik. |
| Dinlenme sayacı | **Rest timer** | `#restPill` | Strong/Hevy standardı. |
| Not ekle | **Add note** | Hareket | Standart. |
| Isınma (kart) | **Warm-up** | `#gymWarmup` | Standart; isim "warm-up", fiil "warm up". |
| Isınma kartını gizle | **Hide warm-up** | `#gymWarmupHide` | Aynı. |

## 6. Antrenman: yük, ilerleme, zorluk

| Türkçe | English | Bağlam (ekran) | Neden (kaynak / yaygın kullanım) |
|---|---|---|---|
| Isınma setleri | **Warm-up sets** | Plaka/ısınma penceresi | Hevy "warm-up set", NSCA terimi. |
| Plaka / Plaka dağılımı | **Plates / Plate breakdown** | Aynı | "Plate calculator" araç adıdır; ekranda her tarafa takılacak plakalar gösterildiği için "breakdown". Reddedilen: "Plate distribution" (kelime kelime). |
| Kademe (makine/dambıl kilo adımları) | **Weight increments** (tek adım: **increment**) | `ex.levels`, "Makinenin kilo kademeleri" | Strong ve Hevy plaka/makine adımına "increment" der. Reddedilen: "Levels" (zorluk seviyesi gibi okunur), "Stages", "Steps" (merdiven/adım sayar gibi). |
| Kilo artırma önerisi | **Progression suggestion** (ekranda öneri metni: "Try 62.5 kg next time") | `overloadSuggestion` | "Progressive overload / progression" yerleşik antrenman terimi. Reddedilen: "Weight increase suggestion" (uzun, kelime kelime). |
| Aynı kiloda kal | **Stay at this weight** | `[data-hold]` | Doğal. Reddedilen: "Hold weight" (belirsiz). |
| Tahmini 1RM | **Estimated 1RM** (dar alanda **e1RM**) | İlerleme Güç, rekorlar | Strong, Boostcamp, Fitbod'da yerleşik; ilk geçtiği yerde "estimated one-rep max". |
| Rekor | **PR** (başlıkta **Personal records**) | `#pPrs` | "PR" (personal record) uygulamalarda standart; Britanya'da "PB" de kullanılır ama uygulamalar "PR" der. Reddedilen: "PB" (uygulama dışı, koşu dünyası), "Record". |
| Tonaj | **Volume** (birim kg) | İlerleme Güç `#pTonnage` | Strong ve Hevy set×tekrar×kilo toplamına "volume" der. Reddedilen: "Tonnage" (doğru ama jargon; sadece açıklamada geçebilir: "total volume (sets × reps × weight)"). |
| Set zorluğu (etiket satırı) | **Set effort** | `effortRowHtml`, `[data-effort-row]` | İşlev: setin ne kadar zor geldiğini işaretlemek. Reddedilen: "RPE" (bizde 1–10 ölçek değil; yanıltıcı olur), "Difficulty" (hareketin zorluğu gibi okunur). |
| Kolay / Orta / Zor / Tükeniş | **Easy / Moderate / Hard / Failure** | `EFFORT_LABELS` | "Failure" Hevy'nin "failure set" terimi ve antrenman literatüründe "training to failure" ile birebir aynı anlam: son tekrarda kasın pes etmesi. "Moderate" tüm orta seçeneklerle ortak. Reddedilen: "Max" (1RM ile karışır), "Exhausted" (yorgunluk hissi, teknik anlam değil), "Medium". |
| Dinlenme haftası | **Deload week** | `deloadInfo`/`deloadHtml` | NSCA ve uygulamalarda yerleşik terim; ilk geçişte kısa açıklama ("a lighter week to recover"). Reddedilen: "Rest week" (hiç antrenman yapmamak gibi okunur), "Recovery week". |
| Anladım | **Got it** | `ex.deloadDismiss` | iOS'ta yaygın kapatma düğmesi. |
| Kardiyo / rekor (8 hafta kartı) | **Cardio / PRs** | `#pTonnage` | Yukarıdaki terimlerle tutarlı. |
| Antrenman takvimi | **Workout calendar** | `#pCalendar` | Aynı "workout" kuralı. |

## 7. Mobilite

| Türkçe | English | Bağlam (ekran) | Neden (kaynak / yaygın kullanım) |
|---|---|---|---|
| Rutin | **Routine** | `#mobHome`, rutin kartları | Esneme/mobilite uygulamalarında standart ("routine"). Antrenmandaki "program" ile çakışmaz. |
| Rutinim (varsayılan ad) | **My routine** | `mr_main` adı (yeni kayıtta, oluşturulduğu dilde) | Spec §5.4. |
| Seans (rehberli) | **Session** | `#mobTimer`, bitiş özeti | Rehberli esneme akışının adı; antrenmanın "workout" kelimesinden bilinçli ayrılır. |
| Hareket (mobilite) | **Move** (listede) / **exercise** (cümlede) | Rutin listesi, Ekle | Mobilite uygulamalarında "moves" yaygın; kısa. Antrenmanda "exercise" kalır. |
| Tür: Dinamik / Statik / Foam roller | **Dynamic / Static / Foam rolling** | `MOB_TYPES` | Yerleşik üçlü; "foam rolling" etkinliğin adı ("foam roller" aletin adı). Reddedilen: "Release", "Myofascial release" (teknik). |
| Esneme | **Stretching / stretch** | Örnek rutin adı, metinler | Standart. "Örnek esneme rutini" → "Sample stretching routine". |
| Bölgeler: Kalça / Omuz / Omurga / Göğüs / Arka bacak / Ayak bileği | **Hips / Shoulders / Spine / Chest / Hamstrings / Ankles** | `MOB_REGIONS` | Bölge adları çoğul (iki taraflı eklemler), uygulamalarda böyle. Reddedilen: "Back of thigh" (kelime kelime; doğru terim hamstrings). |
| Ana bölge / ikincil bölge | **Main area / Secondary area** | Hareket detayı | "Region" tıbbi; "area" gündelik ve dar alanda kısa. |
| Taraf: Tek / İki taraf | **Sides: One / Both** ; sayaçta **Each side** | `sides` | "Each side" egzersiz talimatlarında standart ("30 s each side"). |
| Sağ / Sol / Sola geç | **Right / Left / Switch to left** | Sayaç, sesli yönlendirme | Doğal komut. |
| Tekrar / Süre | **Reps / Time** | `mode: reps|time` | Bkz. 5. |
| Hazırlık (5 sn) | **Get ready** | `phase: prep` | Uygulamalarda standart geri sayım ifadesi. |
| Bitti (tekrarlı hareket) | **Done** | `#mobTDone` | Standart. |
| Atla / Önceki | **Skip / Previous** | `#mobTSkip/#mobTPrev` | Standart. |
| Nasıl yapılır | **How to** | `#mobDtGuide`, `#mobTGuide` | Uygulamalarda yerleşik başlık. Reddedilen: "Instructions" (resmî). |
| Dikkat (kılavuzda) | **Watch out** / **Tips** | `MOB_GUIDE` | Uyarı ise "Watch out", ipucu ise "Tips"; v49'da metne göre seçilir. |
| Bölgeler son çalışma | **Areas, last worked** | `mobRegionLast` | İşlev: her bölgenin en son ne zaman çalışıldığı. |
| Sesli yönlendirme | **Voice guidance** | `#mobTVoice`, Profil `#setMobVoice` | Navigasyon ve fitness uygulamalarında yerleşik. |
| Eski yazım (çevrilemeyen reçete) | **Old format** | `rxOk:false` notu | Kayıtta Türkçe kalır, gösterimde çevrilir (spec §8.2). |

## 8. İlerleme

| Türkçe | English | Bağlam (ekran) | Neden (kaynak / yaygın kullanım) |
|---|---|---|---|
| Genel / Kilo / Güç / Beslenme | **Overview / Weight / Strength / Nutrition** | `PROG_VIEWS` | "Overview" özet sekmesinin yerleşik adı. Reddedilen: "General" (kelime kelime). |
| Kilo (vücut ağırlığı) | **Weight** (gerekirse **body weight**) | Kilo sekmesi | Standart. |
| Tartı / Tartıyı kaydet | **Weigh-in / Log weigh-in** | `#pWeighBtn`, kurulum | "Weigh-in" isim olarak yerleşik (Happy Scale, MacroFactor). |
| Son tartılar | **Recent weigh-ins** | Kilo | Aynı. |
| 7 günlük ortalama | **7-day average** | Kilo grafiği, Menülerim | MacroFactor "trend weight"; bizde basit ortalama olduğu için "average" (dürüstlük). |
| Ölçüler | **Measurements** | `#pMeasure`, Profil | Standart (body measurements). |
| Koç / Kalori koçu | **Coach / Calorie coach** | `#pCoach`, `coachAnalysis` | MacroFactor kendini "nutrition coach" diye anlatır; bizde kalori önerisi verdiği için "calorie coach". |
| Koç düzeltmesi | **Coach adjustment** | `applyCoach/resetCoachAdjust` | Aynı. |
| Seri | **Streak** | `mobWeekStats` | Yerleşik (Duolingo'dan beri herkesin bildiği terim). |
| Bu hafta, gün gün | **This week, day by day** | `#pStrip` | Doğal. |
| Hedef tutturuldu / yakın / uzak (✓ ~ !) | **On target / Close / Off target** | `#pStrip`, Geçmiş takvimi | Bölüm 2 ile aynı. |
| Hareket seçimi (grafik) | **Choose exercise** | `#pExChart` | Standart. |

## 9. Profil, yedek ve veri

| Türkçe | English | Bağlam (ekran) | Neden (kaynak / yaygın kullanım) |
|---|---|---|---|
| Kişisel bilgiler | **Personal details** | Profil | en-GB'de "details" "info"dan doğal. |
| Gün geçişi | **Day starts at** (ayar etiketi) | Profil `#setDayStart` | İşlev: gece yarısından sonra kaçta yeni gün başlasın. Ayar olarak "Day starts at 03:00" anında anlaşılır. Kavram adı gerekirse "day rollover". Reddedilen: "Day transition" (kelime kelime). |
| Yedekleme | **Backup** | Profil → Yedekleme | Standart. |
| Yedek al / Yedek dosyası indirildi | **Back up now / Backup file downloaded** | Aynı | İsim "backup", fiil "back up". |
| Geri yükle | **Restore** | Aynı | Standart. |
| Yedeğim var, geri yükle | **I have a backup — restore it** | Kurulum adım 1 | Doğal. |
| İç yedek (otomatik) | **Automatic backups** | `#pfSnaps` | Kullanıcı açısından işlev otomatik yedek. Reddedilen: "Snapshots" (teknik), "Internal backup" (kelime kelime). |
| Gece yedeği / Haftalık yedek | **Nightly backup / Weekly backup** | İç yedek listesi | Standart. |
| Değişiklik öncesi / İçe alma öncesi / Geçiş öncesi | **Before changes / Before import / Before upgrade** | İç yedek türleri | İşlev: o işlemden hemen önceki hâl. "Geçiş" = depolama geçişi; kullanıcıya "upgrade". |
| Bu hâle dön | **Restore this version** | `aykSnapRestore` | Standart. |
| Kurtarma kopyası | **Recovery copy** | `#pfRescue` | Okunamayan kaydın ham kopyası; "recovery" işlevi açık. Reddedilen: "Rescue copy" (kelime kelime), "Backup" (yedekle karışır). |
| Fabrika ayarlarına sıfırla | **Erase all data** | Profil | iOS'taki "Erase All Content and Settings" anlamı; işlevi açık ve dürüst. Reddedilen: "Factory reset" (cihaz çağrışımı). |
| Kayıt alanı | **Storage** | `#pfStorage` | iOS "Storage". |
| Hakkında | **About** | `#pfAbout` | Standart. |
| Sağlık notu | **Health notice** | `HEALTH_NOTE`, kurulum | Uygulamalarda yasal/sağlık uyarısı başlığı. Reddedilen: "Disclaimer" (soğuk, yasal), "Health note" (kelime kelime; İngilizcede not defteri gibi). |
| Gizlilik | **Privacy** | Hakkında | Standart. |
| Hesap yöntemi ve kaynaklar | **How we calculate & sources** | Hakkında | Doğal. |
| Lisanslar | **Licences** | Hakkında | en-GB isim yazımı (ABD "licenses"). |
| Profil fotoğrafı | **Profile photo** | `#pfAvatar` | Standart. |
| Dil | **Language** | Profil → Dil (v49) | Standart. |

## 10. Kurulum ve örnek içerik

| Türkçe | English | Bağlam (ekran) | Neden (kaynak / yaygın kullanım) |
|---|---|---|---|
| Kurulum | **Setup** | `#onboard` | Kullanıcıya görünen ad. ("Onboarding" yalnızca geliştirici terimi.) |
| Hoş geldin / Başlayalım | **Welcome / Let's get started** | Adım 1 | Doğal. |
| Seni tanıyalım | **About you** | Adım 2 başlığı | Kelime kelime "Let's get to know you" uzun; "About you" yerleşik. |
| Hedefin ne? | **What's your goal?** | Adım 3 | Doğal. |
| Gün içinde ne kadar hareketlisin? | **How active are you during the day?** | Adım 4 | Doğal. |
| Neyle başlayalım? | **How would you like to start?** | Adım 6 | Doğal. |
| Örnek menü / Örnek program / Örnek esneme rutini | **Sample meal plan / Sample program / Sample stretching routine** | Adım 6 kutuları | "Sample" = örnek; kullanıcı kendi düzenleyecek. Reddedilen: "Template" (hazır şablon; kullanıcı istemiyor), "Starter". |
| Örnek program: 3 gün tüm vücut / 4 gün üst/alt vücut | **3-day full body / 4-day upper/lower** | Örnek program adları | Antrenmanda yerleşik bölünme adları. |
| Hazırsın / Son onay | **You're all set / Final check** | Adım 7 | Doğal. |
| Boş başla | **Start empty** | Adım 6 | İşlev açık. |
| İlk öğününü ekle / İlk hareketini ekle | **Add your first meal / Add your first exercise** | `[data-empty-menu]`, `[data-empty-day]` | Boş durum kartları. |
| Devam et / Bitti | **Continue / Done** | Kurulum düğmeleri | iOS standardı. |

## 11. Ortak pencere ve düğme kelimeleri

| Türkçe | English | Bağlam (ekran) | Neden |
|---|---|---|---|
| Kaydet / İptal / Sil / Düzenle / Ekle / Kapat | **Save / Cancel / Delete / Edit / Add / Close** | `uiAsk`, her yerde | iOS standardı. "Sil" kalıcı silmede "Delete", listeden çıkarmada "Remove". |
| Kopyala | **Duplicate** (öğün/rutin kopyası) | Öğün kartı, `#mobCopyRoutine` | Kopya oluşturma işlevi için iOS'ta "Duplicate". "Copy" pano çağrıştırır. |
| Başlat / Bitir | **Start / Finish** | Seans, antrenman | Standart. |
| Sıfırla | **Reset** | Çeşitli | Standart. |
| Emin misin? kalıbı | **"Delete X?"** biçimi | Onay pencereleri | iOS kalıbı: başlık eylemin kendisi ("Delete this meal?"). "Are you sure?" kullanılmaz. |

---

## 12. Bilinçli olarak çevrilmeyen / sonraya bırakılanlar
- Besin adları (USDA, tarifler) ve hareket rehberleri v49'da ayrı çevrilir; bu sözlükteki terimlerle (ör. "cooked", "raw", "each side") tutarlı olmak zorunda.
- Mobilite hareket adları zaten İngilizce (kullanıcı kararı).
- Kayıtta Türkçe tutulan metinler (`timeLabel`, "Eski yazım", varsayılan adlar vb.) kayıtta değişmez; gösterimde bu sözlükle çevrilir (spec §8.2).

## 13. Bakılan kaynaklar
- MacroFactor yardım merkezi ve blog: hedef türleri (lose/maintain/gain), "goal rate", "expenditure", "maintenance", kilo alırken küçük fazla — macrofactor.com/goal-features, help.macrofactorapp.com (makaleler 125, 199, 222).
- Hevy yardım merkezi: set türleri (warm-up, normal, failure, drop set), RPE 6–10, "routine", "program", "exercise library" — help.hevyapp.com "Set Types in Hevy Explained", hevyapp.com/features.
- Strong: "estimated 1RM", "volume", "personal records", rest timer (üçüncü taraf incelemesi sensai.fit, Strong yardım alıntısı); Boostcamp "personal records"; Fitbod "estimated strength", "muscle recovery".
- MyFitnessPal / Cronometer / Lose It!: "custom food", "serving", "goal weight", "calorie budget", "remaining", "meals" (kombo çakışması gerekçesi).
- ISSN Pozisyon Bildirisi: Protein ve egzersiz (Jäger ve ark., 2017) — "protein distribution", öğün başına 20–40 g; Helms ve ark. 2014 — "lean body mass"; Iraki ve ark. 2019 — "calorie surplus".
- NSCA terimleri: "warm-up sets", "deload", "volume", "training to failure", "progressive overload".
- Birleşik Krallık/AB besin etiketi kuralı (Regulation (EU) 1169/2011): "fibre", "salt" (sodyum yerine tuz).
- Apple iOS arayüz terimleri: Appearance (Light/Dark), Storage, Duplicate, onay pencerelerinde eylem adı.
