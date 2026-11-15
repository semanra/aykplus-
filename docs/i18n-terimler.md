# AYK+ İngilizce terim sözlüğü (Aşama 3, v46–v49)

Bu belge, AYK+ İngilizce arayüzünde kullanılacak **tek ve bağlayıcı** terim listesidir. v47–v49'daki bütün çeviriler bu karşılıkları kullanır; bir terim değişecekse önce burada değişir, sonra kodda.

**Ana ilke (kullanıcının şartı):** çeviri kelime kelime yapılmaz. Her terim, o ekranda ne işe yaradığına bakılarak, yerleşik bir İngilizce fitness/beslenme uygulamasında nasıl söyleniyorsa öyle karşılanır. Örnek: "Menülerim" kelimesi kelimesine "My menus" olur, ama İngilizcede "menu" restoran listesi demektir; bizim ekranımızdaki şey bir **meal plan**'dır.

**Nasıl hazırlandı:** terimler kaynak koddaki gerçek ekran metinlerinden (`src/markup.html`, `src/app/*.js`, `src/data.js`) ve CLAUDE.md §6'daki ekran tarifinden toplandı.

**Kaynak gösterme kuralı:** "Neden" sütununda bir uygulama veya kurum adı yalnızca o kullanım doğrulandıysa geçer ve köşeli parantezli bir kaynak numarası taşır (ör. **[K3]**); numaraların bağlantıları bölüm 14'te. Kaynak numarası olmayan gerekçeler kaynağa dayanmaz, düz akıl yürütmedir ("yaygın İngilizce kullanım", "kısa ve açık" gibi). Hiçbir uygulamanın metni kopyalanmadı; yalnızca terim uyumu sağlandı.

**Boyut:** 1–11. bölümlerde **181 terim satırı** (bazı satırlar birbirine bağlı seçenek takımlarıdır, ör. Kolay / Orta / Zor / Tükeniş) + bölüm 12'de bağlayıcı olmayan **12 örnek metin satırı** + kurallar.

---

## 0. Kurallar

### 0.1 Yazım: hangi İngilizce?
- **Hedef kitle:** kg/cm kullanan genel İngilizce konuşanlar (Birleşik Krallık, İrlanda, AB, Avustralya, Yeni Zelanda), ABD öncelikli değil. Uygulama zaten yalnızca kg/cm kullanıyor.
- **Temel yazım en-GB:** `colour`, `personalise`, `fibre`, `centre`, `-ise` ekleri, `analyse`, isim olarak `licence`.
- **İstisna: "program" (programme değil).** Gerekçe:
  1. Antrenman uygulamalarında "program" yaygın; ör. Hevy yardım merkezi "Build a workout program" başlığını kullanıyor **[K8]**. Kullanıcı kelimeyi uygulamalardan tanıyor.
  2. Kısa düğme ve sekmelerde 2 harf fark eder (`My program` dar ekranda sığmalı).
  3. ABD'li bir kullanıcı "programme"ı yadırgar; İngiliz kullanıcı için de "program" yabancı değildir (bilişim bağlamında İngiltere'de de bu yazım kullanılır).
  Reddedilen: `programme` (uygulamalarda seyrek, daha uzun).
- **ABD/GB farkı olan terimler:** mümkün olduğunca iki tarafta da aynı yazılan kelime seçilir (ör. "Appearance", "Calories", "Workout"). Fark kaçınılmazsa en-GB kullanılır: `fibre`, `colour`, `personalise`, `licences`, `shopping list` (grocery list değil).

### 0.2 Büyük harf
- Düğmeler, başlıklar, sekme adları ve bölüm etiketleri **Sentence case** yazılır (yalnızca ilk harf büyük): `Add food`, `Rest day`, `Start workout`. Title Case (`Add Food`) KULLANILMAZ. Bu kural Türkçe arayüzün v32 cümle düzeni kuralıyla da uyumlu.
- Kısaltmalar her zaman büyük: `TDEE`, `BMR`, `1RM`, `e1RM`, `PR`, `USDA`.
- Özel adlar korunur: `AYK+`, `Open Food Facts`, `USDA FoodData Central`.

### 0.3 Değişmeyenler
- **"AYK+" çevrilmez.**
- **Birimler değişmez:** `kg`, `cm`, `kcal`, `g`, `mg`, `ml`, `L`. Saniye için `sn` yerine `s`, dakika için `dk` yerine `min`. Sayı ile birim arasında boşluk bırakılır: `80 kg`, `2.5 L`, `250 kcal`.
- **Kalori:** metinde "calories", sayının yanında her zaman `kcal`. Arayüz enerjiyi yalnızca kcal ile gösterir. AB, Avustralya ve Yeni Zelanda etiketlerinde enerji önce kJ yazılır; bu yüzden etiketten giriş yapılan yerlerde (özel besin formu, barkod düzeltme, `labelCheck` uyarısı) ipucu kJ'den söz edebilir: "Enter kcal, not kJ". "Cal" yazılmaz.
- **Sayılar (İngilizce gösterim):** ondalık ayırıcı noktadır (`2.5 kg`). Binlik ayırıcı virgül yalnızca salt okunur gösterimlerde kullanılır (`2,478 kcal`). Giriş kutularına binlik ayırıcı yazılmaz (spec §8.5).
- **Tarih:** en-GB sırası, `15 Nov`, `Mon 15 Nov`; hafta Pazartesi başlar (bugünkü davranış).
- Kullanıcının yazdığı adlar (besin, hareket, rutin, öğün) çevrilmez. Uygulamanın kayda yazdığı varsayılan adlar oluşturuldukları dilde kalır (spec §5.4).

### 0.4 Üslup
- Türkçedeki samimi "sen" dili İngilizcede doğal ikinci tekil şahısla karşılanır (`your goal`, `you've hit…`). Ünlem ve abartı kullanılmaz.
- Kısa düğmeler emir kipindedir: `Save`, `Undo`, `Restore`. "Please" kullanılmaz.
- Sağlık ve hesap metinlerinde yerleşik terimler kullanılır: `TDEE`, `lean body mass`, `calorie deficit`, `calorie surplus`, `maintenance calories` (bkz. bölüm 3).
- Aynı kavram her ekranda aynı kelimeyle söylenir. Ör. tek bir antrenman seansı her yerde `workout` olur; bir yerde "session", başka yerde "training" denmez. Mobilitede `session` yalnızca rehberli esneme seansı içindir.
- **"Goal" ve "target" ayrımı:** `goal` yöndür (Lose / Maintain / Gain), `target` sayıdır (calorie target, daily targets). Tek istisna yerleşik deyim olan `goal weight`.

---

## 1. Uygulama geneli ve sekmeler

| Türkçe | English | Bağlam (ekran) | Neden |
|---|---|---|---|
| Beslenme (sekme) | **Nutrition** | Alt menü, başlık `#tabTitle` | Bu bölümün yaygın İngilizce adı. Reddedilen: "Diet" (zayıflama diyeti çağrışımı), "Food" (yalnızca besin listesi gibi). |
| Antrenman (sekme) | **Training** | Alt menü, başlık | Sekme program, kütüphane ve geçmiş dahil bütün antrenman tarafını kapsar. Tek seans `workout` olduğu için sekme adı ondan ayrılır. Reddedilen: "Workout" (sekmede tek seans gibi okunur), "Gym" (ev antrenmanını dışlar). |
| Mobilite (sekme) | **Mobility** | Alt menü, başlık | Esneme, foam rolling ve dinamik hareketleri birlikte kapsayan yaygın terim. Reddedilen: "Stretching" (foam rolling ve dinamik hareketleri kapsamaz). |
| İlerleme (sekme) | **Progress** | Alt menü, başlık | Yaygın kullanım; açık ve kısa. |
| Profil | **Profile** | `#profilePage` | Yaygın kullanım. |
| Ayarlar | **Settings** | Profil içi bölüm | Yaygın kullanım. |
| Bugün | **Today** | Beslenme ve Antrenman alt sekmesi | Doğrudan karşılık; doğal. |
| Geçmiş | **History** | Beslenme ve Antrenman alt sekmesi | Geçmiş kayıtların yaygın adı. Reddedilen: "Log" (isim mi fiil mi olduğu belirsiz). |
| Geri al (bildirimde) | **Undo** | 6 sn'lik bildirim düğmesi | Telefonlarda bu işlemin yerleşik adı. |
| Kaydedildi | **Saved** | Profil otomatik kayıt bildirimi | Yaygın kullanım. |
| Antrenman günü | **Training day** | Beslenme gün tipi, menü seçimi | Beslenme yazılarında "training day / rest day" ikilisi yaygın; anlamı açık. Reddedilen: "Workout day", "Gym day" (daha gündelik). |
| Dinlenme günü | **Rest day** | Aynı | Yaygın. Reddedilen: "Off day", "Recovery day" (aktif toparlanma anlamı taşır). |
| Yeni gün (düğme) | **Start new day** | Beslenme, `manualNewDay` | İşlevi günü elle kapatıp yenisini başlatmak. Yalnızca "New day" yazmak düğmeyi başlık gibi gösterir. |
| Görünüm: Sistem / Koyu / Aydınlık | **Appearance: System / Dark / Light** | Profil → Görünüm | "Appearance", "Light", "Dark" telefon ayarlarından tanıdık kelimeler. Telefonun ayarını izleyen seçenek için uygulama içinde "System" yaygın, kısa ve açık bir etikettir. Reddedilen: "Automatic" (zamanlamaya göre değişiyor gibi anlaşılabilir), "Theme", "Day mode". |

## 2. Beslenme: menü, öğün, kayıt

| Türkçe | English | Bağlam (ekran) | Neden |
|---|---|---|---|
| Menü (antrenman/dinlenme günü menüsü) | **Meal plan** | Menülerim, Bugün, alışveriş | Bizdeki "menü", her gün tekrarlanan planlı öğünlerdir. İngilizcede bunun adı "meal plan"dır; Eat This Much bu tür ürününü "meal planning" diye anlatıyor **[K12]**. Reddedilen: "Menu" (restoran listesi anlamına gelir; kelime kelime çeviri), "Template". |
| Menülerim (alt sekme) | **Plans** | `#nutriNav` | Dar alt sekmeye tek kelime gerekir; bağlamdan beslenme planı olduğu anlaşılır. Başlıkta uzun hâli "Your meal plans". Reddedilen: "My menus". |
| Antrenman günü menüsü / Dinlenme günü menüsü | **Training-day plan / Rest-day plan** | `#mnTrain/#mnRest` | Yukarıdaki iki terimin birleşimi; tutarlı. |
| Öğün | **Meal** | Her yerde | Doğrudan karşılık. Ara öğün de "meal"dır (kullanıcı adlandırıyor). |
| Besin | **Food** | Besin listesi, seçici | Takip uygulamalarında yaygın kullanım. Reddedilen: "Ingredient" (yalnızca tarifte kullanılır), "Item" (teknik). |
| Besinler (alt sekme) | **Foods** | `#nutriNav` | Aynı. |
| Kalem (öğündeki besin) | **Item** / bağlama göre **food** | Öğün düzenleme | Arayüzde mümkünse "food" yazılır; liste sayımında "3 items". |
| Planlanan | **Planned** | Halka, Geçmiş | Doğrudan karşılık; "eaten" ile doğal bir çift oluşturur. |
| Yenen | **Eaten** | Kalori halkası varsayılanı, Geçmiş | Halkada kısa ve gündelik. Reddedilen: "Consumed" (resmî), "Logged" (bizde tik "yendi" demek, "kaydedildi" değil). |
| Menü · X kcal (halka düğmesi) | **Plan · X kcal** | `#calRing` düğmesi | "Meal plan" teriminin kısa hâli. |
| Yedim (öğün tiki) | **Eaten** (onay kutusu etiketi: "Mark as eaten") | Bugün zaman çizelgesi | Erişilebilirlik etiketi fiil olarak yazılır. |
| Sadece bugüne / Menüme (her gün) | **Today only / My plan (every day)** | Besinler anahtarı, `#fdHint` | Eklenen besinin yalnızca bugünkü kopyaya mı, kalıcı plana mı gideceğini seçtirir; ifade bu işlevi söylüyor. |
| Menüye de kaydet | **Save to plan too** | `#dayDiffBanner` | Aynı. |
| Bugünü menüye geri döndür | **Reset today to plan** | `#dayDiffBanner` | "Revert" teknik bir kelime; "reset to" gündelik ve açık. |
| Dışarıda yedim | **Ate out** | Bugün düzenleme, `openFreeMeal` | Doğal gündelik deyim. Reddedilen: "Ate outside" (kelime kelime; "açık havada yedim" anlamına gelir). |
| Tahmini giriş | **Quick estimate** | Dışarıda yedim formu | Değerin tahmin olduğunu vurgular. Reddedilen: "Quick add" (bizde `quickAdd` başka bir işlev). |
| Yarısını yedim | **Ate half** | Bugün düzenleme | Kısa ve doğal. |
| Günü dengele | **Rebalance my day** | `balanceDay` | Kalan öğünleri hedefe göre kısar; "rebalance" bu işlemi söylüyor. "Balance the day" daha soyut kalıyor. |
| Dünkü gibi | **Same as yesterday** | `repeatLastMeal` | Doğal deyim. Aynı işlev MyFitnessPal'da "copy from yesterday" olarak geçiyor **[K14]**; anlam aynı, metin farklı. |
| İkame (⇄) | **Swap** | `openSwap` | Kısa ve açık; Eat This Much öğün/tarif değişimine "swap" diyor **[K12]**. Reddedilen: "Substitute" (dar düğmeye uzun), "Replace" (kaloriyi koruyan değişim anlamını kaybeder). |
| Kombo | **Combo** | Mutfak, "Komboların" kategorisi | MyFitnessPal kayıtlı besin gruplarına "Meals" diyor **[K14]**, Cronometer ise "Custom Meals" diyor (tariflerden ayrı, "Custom Recipes") **[K15]**. Bizde "meal" öğün demek; çakışmayı önlemek için "combo". Kategori adı "Your combos". Reddedilen: "Saved meal", "Meal", "Custom meal" (öğünle çakışır). |
| Tarif | **Recipe** | `#recipeModal` | Doğrudan karşılık; Cronometer de "Custom Recipes" diyor **[K15]**. |
| Özel besin | **Custom food** | Besin formu | Kullanıcının kendi eklediği besin için yaygın, açık ifade. Reddedilen: "My food", "Personal food". |
| Barkod | **Barcode** | Barkod okuyucu | Doğrudan karşılık; düğme "Scan barcode". |
| Etikete bakıp düzelt | **Edit from label** | `barcodeFixFood` | Değerleri ürün etiketine bakarak düzeltmek. Kısa ve neyin düzeltileceği açık. Reddedilen: "Check the label and fix" (neyin düzeltileceği belirsiz). |
| Besin etiketi / Etiket kalorisi | **Nutrition label / Label calories** | Özel besin formu, `labelCheck` | Paketteki besin tablosu için gündelik ve açık ifade. |
| Porsiyon / Hazır porsiyonlar | **Serving / Serving sizes** | `foodPresets`, "1 porsiyon" modu | Paket ve takip bağlamında yaygın kelime. Reddedilen: "Portion" (gündelik ama paket üstünde "serving" geçer). |
| Kiloya göre gramaj | **Scale portions to body weight** | `#scaleCard` | İşlevi açıkça söyler; kısa başlık "Portion scaling". |
| Bu gramajları yeni başlangıç yap (Sabitle) | **Make these the new base amounts** | `resetScaleBase` | "Lock in" kısa ama belirsiz; işlevi söyleyen metin seçildi. |
| Alışveriş listesi | **Shopping list** | `#shopModal` | en-GB ("grocery list" ABD). |
| Bulunamayan besin (⚠) | **Missing food** | `lostFood`, `checkFoodHealth` | Veritabanında artık olmayan besin; "missing" nötr. Reddedilen: "Unknown food", "Lost food". |
| Bulunamayan aramalar | **Searches with no results** | Profil | İşlevi açıklayan ifade. |
| Pişmiş / çiğ | **Cooked / raw** | Besin adları, notlar | Doğrudan karşılık. |
| Önerilen besinler (kalanı kapatan) | **Suggestions to fill your remaining macros** (kısa: **Suggestions**) | `#foodSuggest` | "Remaining" kalan hedefi anlatan doğal kelime. |
| Bu hafta (Geçmiş kartı) | **This week** | `#weekCard` | Doğrudan karşılık. |
| Haftalık bütçe | **Weekly calorie budget** | `weekStats` | Lose It! "budget" terimini haftalık görünümüyle birlikte kullanıyor **[K13]**; haftaya yayılan kalori hesabını iyi anlatıyor. |
| Hedef tutturma takvimi | **Days on target** (günler: **On target / Close / Off target**) | Geçmiş, `hitClass` | Kart, her günün hedefe ne kadar yakın olduğunu gösterir; "days on target" bunu doğrudan söyler. ±%5 "on target", ±%15 "close". Ayrıca değerlendirilen: "Heat map" (görselin biçimini anlatır, ne ölçtüğünü anlatmaz). Reddedilen: "Target calendar" (İngilizcede belirsiz), "Hit/miss" (oyun dili). |
| Protein dağılımı | **Protein distribution** | `proteinSpreadHtml` | ISSN 2017 protein bildirgesi, 20–40 g'lık dozların gün içine eşit dağıtılmasından söz ediyor **[K19]**; kart bunu gösteriyor. |

## 3. Hedef, enerji ve makrolar (hesap terimleri)

| Türkçe | English | Bağlam (ekran) | Neden |
|---|---|---|---|
| Hedef: Ver / Koru / Al | **Goal: Lose / Maintain / Gain** | Menülerim Hedef kartı `#goalLose/#goalKeep/#goalGain`, kurulum | MacroFactor'ın hedef türleri lose / maintain / gain **[K1]**. Kurulumda uzun hâller: "Lose weight", "Maintain weight", "Gain weight". Reddedilen: "Cut / Maintain / Bulk" (vücut geliştirme jargonu; genel kullanıcıyı dışlar). |
| Kalori açığı (açık) | **Calorie deficit** (kısa: **deficit**) | `#deficitSlider`, Hakkında, koç | Beslenme biliminde ve uygulamalarda yaygın terim; MacroFactor de hedef hızını açık/fazla büyüklüğüyle anlatıyor **[K1]**. |
| Kalori fazlası (fazla) | **Calorie surplus** (kısa: **surplus**) | `#gainBox`, Hakkında | Aynı **[K1]**. |
| Kilo verme hızı / Kilo alma hızı | **Rate of loss / Rate of gain** | `#loseBox` ve `#gainBox` başlıkları | Simetrik bir çift; MacroFactor de "goal rate" diyor **[K1]**. |
| Hız seçenekleri: Yavaş / Orta / Hızlı | **Slow / Moderate / Fast** | `#paceSlow/#paceMid/#paceFast` | "Moderate", üç kademeli bütün seçimlerde ortak orta kelimedir (bkz. hareketlilik, zorluk). Reddedilen: "Medium" (boyut çağrıştırır), "Aggressive" (olumsuz ton). |
| Koruma kalorisi (TDEE) | **Maintenance calories** (teknik metinde **TDEE**) | Hakkında, kurulum özeti, hedef kartı | MacroFactor "maintain" hedefinde kaloriyi tahmini günlük harcamaya eşitliyor **[K1]**. Gündelik adı "maintenance calories". TDEE (total daily energy expenditure) sağlık metninde bir kez açılımıyla yazılır. Reddedilen: "Maintenance energy" (akademik), "Calories burned" (yalnızca egzersizi çağrıştırır). |
| Bazal metabolizma | **BMR** (basal metabolic rate) | Hakkında | Yaygın kısaltma; ilk geçişte açılımıyla. |
| Günlük hedeflerin | **Your daily targets** | Kurulum özeti | "Goal / target" kuralı (0.4). Reddedilen: "Goals" (Ver/Koru/Al ile çakışır). |
| Kalori hedefi | **Calorie target** | Halka, hedef kartı | Aynı kural: "target" bir sayıdır. |
| Hedef kilo | **Goal weight** | Profil, kurulum | Yerleşik deyim; sayıyla karışmaz. Reddedilen: "Target weight" (daha az doğal). |
| Makrolar | **Macros** | Her yerde | Yaygın kısa kullanım. |
| Protein / Karb / Yağ | **Protein / Carbs / Fat** | P/K/Y hapları, kartlar | Yaygın kısa hâller; haplarda tek harf **P / C / F**. Reddedilen: "Carbohydrate" (dar alanda uzun), "Fats". |
| Kalori | **Calories** (birim **kcal**) | Her yerde | Bkz. 0.3. |
| Lif | **Fibre** | `#microLine`, besin kartı | AB 1169/2011 besin tablosunda "fibre" yazılır **[K17]**. Hedef kitle kuralına da uygun (ABD'de "fiber"). |
| Tuz | **Salt** | `#microLine` (≤ 5 g) | AB 1169/2011 besin tablosunda sodyum "salt" olarak gösterilir **[K17]**. DSÖ önerisi de "5 g salt"tan az **[K18]**. Bizim gösterdiğimiz değer zaten tuz gramı. |
| Sodyum | **Sodium** | Besin detayı (mg) | Doğrudan karşılık. |
| Yağsız kütle | **Lean body mass** | Hakkında, protein kuralı | Sağlık metinlerinde yaygın terim. Protein kuralının dayandığı ve uygulamanın Hakkında bölümünde zaten listelenen Helms ve ark. 2014 kaynağının konusudur. Reddedilen: "Fat-free mass" (akademik eş anlamlı; arayüzde daha az tanıdık). |
| Yağ oranı | **Body fat %** (metinde **body fat percentage**) | Profil, İlerleme Kilo | Yaygın kullanım. |
| Hareketlilik: Az / Orta / Çok | **Activity level: Low / Moderate / High** | Profil `#setActivity`, kurulum adım 4 | Kalori hesaplayıcılarında "activity level" yaygın bir ifade. Açıklamalar bölüm 12'de. Reddedilen: "Sedentary / Active / Very active" ("Az" seçen ama haftada antrenman yapan kişiyi "sedentary" diye etiketler; antrenman ayrıca hesaplandığı için yanlış olur). |
| Protein: Standart / Yüksek | **Protein: Standard / High** | Profil `#setProtein` | Sade; anlamı tam. |
| Antrenman deneyimi: Yeni başlıyorum / Salonu biliyorum | **Training experience: New to the gym / I've trained before** | Kurulum adım 5 | Kısa, birbirine paralel iki seçenek; 390 px'lik seçenek kartına sığar. Reddedilen: "Beginner / Advanced" (ikinci seçenek ileri seviye demek değil), "I know my way around the gym" (kartta uzun). |
| Cinsiyet: Erkek / Kadın | **Sex: Male / Female** | Kurulum, Profil | Kalori formülü biyolojik cinsiyete göre değişir; doğru kelime "sex". Reddedilen: "Gender" (hesabın dayandığı şey değil). |
| Yaş / Boy / Kilo | **Age / Height / Weight** | Profil, kurulum | Doğrudan karşılık. |
| Su hedefi kiloya göre | **Water target based on body weight** | Profil `#setWaterAuto` | "Target" kuralı. |

## 4. Su ve takviye

| Türkçe | English | Bağlam (ekran) | Neden |
|---|---|---|---|
| Su | **Water** | `#waterCard` | Doğrudan karşılık. |
| Takviye | **Supplement** | `#suppCard` | Doğrudan karşılık. |
| Takviye rutini (kart) | **Supplements** (kart başlığı) | Bugün | "Routine" mobilite rutini için ayrıldı; kart başlığında tek kelime yeterli. Reddedilen: "Supplement routine" (çakışma), "Stack" (jargon). |
| Doz | **Dose** | `changeSuppDose` | Doğrudan karşılık. |
| Hazır takviyeler | **Common supplements** | Düzenle modu, `SUPP_PRESETS` | "Preset" teknik bir kelime. |
| Zaman: Sabah tok / Antrenman öncesi / Antrenman sonrası / Yatmadan önce / Özel | **With first meal / Pre-workout / Post-workout / Before bed / Custom** | `SUPP_TIMES` | "Sabah tok" günün ilk yemeğiyle almak demek. Grup adıyla aynı ifade kullanılır, çünkü pek çok kişinin ilk öğünü kahvaltı değildir. "Pre-/post-workout" takviye bağlamında yaygın. Reddedilen: "With breakfast" (ilk öğünü kahvaltı olmayanlara yanlış). |
| Gruplar: İlk öğünle / Antrenman · Gün içi / Akşam · Uyku öncesi / Diğer | **With first meal / Workout & daytime / Evening & bedtime / Other** | `SUPP_GROUPS` | Grup başlıkları; anlam korunur, yukarıdaki satırla tutarlı. |
| Kreatin | **Creatine** | Su hedefi notu | Doğrudan karşılık. |

## 5. Antrenman: temel

| Türkçe | English | Bağlam (ekran) | Neden |
|---|---|---|---|
| Antrenman (tek seans) | **Workout** | "Antrenmanı başlat/bitir", geçmiş | Spor salonu uygulamalarında tek seansın yaygın adı. Hevy de kayıt ekranında "workout" diyor **[K7]**. Düğmeler: "Start workout", "Finish workout". Reddedilen: "Session" (mobiliteye ayrıldı), "Training" (sekme adı). |
| Programım (alt sekme) | **Program** (başlıkta **My program**) | `GYM_VIEWS` | Bizde program, günlerden oluşan haftalık düzendir. Hevy de programı "routine"lerden oluşan üst yapı olarak kullanıyor **[K8]**. Bizde "routine" mobiliteye ayrıldığı için burada "program". Yazım gerekçesi 0.1'de. |
| Gün (programdaki, "1. Gün") | **Day** ("Day 1") | Programım | Doğal. Reddedilen: "Workout A/B" (kullanıcı günleri kendisi adlandırıyor). |
| Sıradaki gün | **Up next** (cümlede: "next workout") | Bugün | "Up next" sıradaki öğeyi gösteren, yaygın bir İngilizce arayüz etiketi; kısa ve doğal. Reddedilen: "Next day" (yarın gibi okunur). |
| Hareketler (alt sekme) / Hareket | **Exercises** / **Exercise** | `GYM_VIEWS`, seçici | Hevy hareket listesine "exercise library" diyor **[K9]**. Reddedilen: "Moves", "Movements" (mobilitede "moves" kullanılıyor, bkz. bölüm 7). |
| Hareket kütüphanesi | **Exercise library** | Hareketler | Aynı **[K9]**. |
| Set | **Set** | Her yerde | Yaygın; Türkçede de aynı kelime. |
| Tekrar | **Reps** (tekil **rep**) | Set satırı | Yaygın kısa hâl. Reddedilen: "Repetitions" (dar alanda uzun). |
| Kilo (sette) | **Weight** (sütunda **kg**) | Set satırı | Dar sütunda birim yeterli ve açık. |
| Hareket türü: Ağırlık / Kardiyo / Süreli | **Weights / Cardio / Timed** | `ex.kind`, hareket penceresi | "Timed", plank gibi süreyle yapılan hareketler için açık bir sıfat. Reddedilen: "Duration" (sıfat değil), "Strength" (İlerleme'deki Güç sekmesinin adı; çakışır). |
| Ekipman: Plakalı (bar / plaka) | **Barbell & plates** (kısa: **Plates**) | `EQUIP_LABEL/EQUIP_SHORT` | Plaka hesabını açan ekipman türü; anlamı açık. |
| Ağırlık yığını (makine / kablo) | **Weight stack (machine / cable)** (kısa: **Machine**) | Aynı | "Weight stack", makinenin pimli ağırlık kulesinin İngilizce adıdır; MacroFactor de pimli makineler için bu ifadeyi kullanıyor **[K3]**. |
| Dambıl | **Dumbbell** | Aynı | Doğrudan karşılık. |
| Vücut ağırlığı | **Bodyweight** | Aynı | Fitness yazımında bitişik "bodyweight" yaygın. |
| Kas grubu | **Muscle group** | Hareket penceresi, haftalık sayım | Yaygın kullanım. |
| Vücut haritası | **Muscle map** | Hareketler / Programım | Bizde bu, kas bölgeleri yüke göre renklenen bir vücut çizimidir. Strava aynı tür görsele "muscle maps" diyor **[K10]**. Hevy kendi görseline "muscle distribution" diyor ve ısı haritası kullanıyor; Fitbod "Recovery" ekranında ısı haritası kullanıyor **[K10]**. "Heat map" yalnızca renklendirmenin biçimini anlatır; başlık olarak "muscle map" neyin gösterildiğini söylediği için korundu. Reddedilen: "Body map" (ağrı haritası çağrışımı), "Heat map" (bkz. yukarı). |
| Bu hafta kas başına set | **Weekly sets per muscle** | `[data-week-muscles]` | Hipertrofi yazılarında "weekly sets per muscle group" kalıbı yaygın; dar alanda kısa hâli. |
| Dinlenme sayacı | **Rest timer** | `#restPill` | Hevy **[K7]** ve Strong **[K11]** bu adı kullanıyor. |
| Not ekle | **Add note** | Hareket | Doğrudan karşılık. |
| Isınma (kart) | **Warm-up** | `#gymWarmup` | İsim "warm-up", fiil "warm up". |
| Isınma kartını gizle | **Hide warm-up** | `#gymWarmupHide` | Aynı. |

## 6. Antrenman: yük, ilerleme, zorluk

| Türkçe | English | Bağlam (ekran) | Neden |
|---|---|---|---|
| Isınma setleri | **Warm-up sets** | Plaka/ısınma penceresi | Hevy set türlerinden biri "Warm Up Set" **[K6]**. |
| Plaka / Plaka dağılımı | **Plates / Plate breakdown** | Aynı | Ekranda her tarafa takılacak plakalar gösterilir; "breakdown" bunu anlatır. Reddedilen: "Plate distribution" (kelime kelime), "Plate calculator" (aracın adı, gösterilen sonucun değil). |
| Kademe (makine/dambıl kilo adımları) | **Weight increments** (tek adım: **increment**) | `ex.levels`, "Makinenin kilo kademeleri" | Makine ve plaka adımları için "increment" kullanılıyor: MacroFactor pimli makinelerde her ağırlık aralığına kendi "increment"ini veriyor **[K3]**, StrongLifts **[K4]** ve Alpha Progression **[K5]** da aynı terimi kullanıyor. Reddedilen: "Levels" (zorluk seviyesi gibi okunur), "Stages", "Steps". |
| Kilo artırma önerisi | **Progression suggestion** (ekrandaki öneri: "Try 62.5 kg next time") | `overloadSuggestion` | "Progression" ve "progressive overload" antrenmanda yaygın terimler; kelime kelime çeviriden daha doğal. Reddedilen: "Weight increase suggestion" (uzun, kelime kelime). |
| Aynı kiloda kal | **Stay at this weight** | `[data-hold]` | Doğal. Reddedilen: "Hold weight" (belirsiz). |
| Tahmini 1RM | **Estimated 1RM** (dar alanda **e1RM**) | İlerleme Güç, rekorlar | Strong tahmini 1RM'yi grafikle gösteriyor **[K11]**; Fitbod "estimated strength" kavramını kullanıyor **[K11]**. İlk geçtiği yerde "estimated one-rep max". |
| Rekor | **PR** (başlıkta **Personal records**) | `#pPrs` | Boostcamp bu bölüme "personal records" diyor **[K11]**; Strong da rekorları işaretliyor **[K11]**. Kısa hâl "PR". Reddedilen: "PB" (İngiltere'de koşuda yaygın ama ağırlık uygulamalarında "PR" daha yerleşik), "Record". |
| Tonaj | **Volume** (birim kg) | İlerleme Güç `#pTonnage` | Strong set × tekrar × kilo toplamını "volume" olarak grafikle gösteriyor **[K11]**. Reddedilen: "Tonnage" (doğru ama jargon; yalnızca açıklamada geçebilir: "total volume (sets × reps × weight)"). |
| Set zorluğu (etiket satırı) | **Set effort** | `effortRowHtml`, `[data-effort-row]` | Setin ne kadar zor geldiğini işaretler; "effort" bunu söyler. Reddedilen: "RPE" (bizde 1–10 ölçek yok; Hevy'deki RPE 6–10 ölçeklidir **[K6]**, yanıltıcı olur), "Difficulty" (hareketin zorluğu gibi okunur). |
| Kolay / Orta / Zor / Tükeniş | **Easy / Moderate / Hard / Failure** | `EFFORT_LABELS` | Hevy'nin set türlerinden biri "Failure Set" **[K6]**; "training to failure" ile aynı anlam: son tekrarda kasın pes etmesi. "Moderate" bütün orta seçeneklerle ortak. Reddedilen: "Max" (1RM ile karışır), "Exhausted" (yorgunluk hissi; teknik anlamı yok), "Medium". |
| Dinlenme haftası | **Deload week** | `deloadInfo`/`deloadHtml` | NSCA'nın Strength and Conditioning Journal makalesi "deload" terimini kullanıyor ("unloading" eş anlamlı; tek bir tanım olmadığını da belirtiyor) **[K16]**. İlk geçişte kısa açıklama: "a lighter week to recover". Reddedilen: "Rest week" (hiç antrenman yapmamak gibi okunur), "Recovery week". |
| Anladım | **Got it** | `ex.deloadDismiss` | Bilgi kartını kapatmak için yaygın, kısa ifade. |
| Kardiyo / rekor (8 hafta kartı) | **Cardio / PRs** | `#pTonnage` | Yukarıdaki terimlerle tutarlı. |
| Antrenman takvimi | **Workout calendar** | `#pCalendar` | "Workout" kuralı. |

## 7. Mobilite

| Türkçe | English | Bağlam (ekran) | Neden |
|---|---|---|---|
| Rutin | **Routine** | `#mobHome`, rutin kartları | Tekrarlanan esneme dizisinin doğal adı. Antrenmandaki "program" ile çakışmaz. |
| Rutinim (varsayılan ad) | **My routine** | `mr_main` adı (yeni kayıtta, oluşturulduğu dilde) | Spec §5.4. |
| Seans (rehberli) | **Session** | `#mobTimer`, bitiş özeti | Rehberli esneme akışının adı; antrenmanın "workout" kelimesinden bilinçli olarak ayrılır. |
| Hareket (mobilite) | **Move** (listede) / **exercise** (cümlede) | Rutin listesi, Ekle | Kısa ve gündelik; antrenmanda "exercise" kalır. |
| Tür: Dinamik / Statik / Foam roller | **Dynamic / Static / Foam rolling** | `MOB_TYPES` | Yaygın üçlü. "Foam rolling" etkinliğin adı, "foam roller" ise aletin adı. Reddedilen: "Release", "Myofascial release" (teknik). |
| Esneme | **Stretching / stretch** | Örnek rutin adı, metinler | Doğrudan karşılık. "Örnek esneme rutini" → "Sample stretching routine". |
| Bölgeler: Kalça / Omuz / Omurga / Göğüs / Arka bacak / Ayak bileği | **Hips / Shoulders / Spine / Chest / Hamstrings / Ankles** | `MOB_REGIONS` | Çift taraflı bölgeler çoğul yazılır; egzersiz dilinde böyle. Reddedilen: "Back of thigh" (kelime kelime; doğru terim "hamstrings"). |
| Ana bölge / ikincil bölge | **Main area / Secondary area** | Hareket detayı | "Region" tıbbi; "area" gündelik ve dar alanda kısa. |
| Taraf: Tek / İki taraf | **Sides: One / Both**; sayaçta **Each side** | `sides` | "Each side", egzersiz talimatlarında yaygın kalıp ("30 s each side"). |
| Sağ / Sol / Sola geç | **Right / Left / Switch to left** | Sayaç, sesli yönlendirme | Doğal komut. |
| Tekrar / Süre | **Reps / Time** | `mode: reps|time` | Bkz. bölüm 5. |
| Hazırlık (5 sn) | **Get ready** | `phase: prep` | Geri sayımdan önce yaygın ifade. |
| Bitti (tekrarlı hareket) | **Done** | `#mobTDone` | Doğrudan karşılık. |
| Atla / Önceki | **Skip / Previous** | `#mobTSkip/#mobTPrev` | Doğrudan karşılık. |
| Nasıl yapılır | **How to** | `#mobDtGuide`, `#mobTGuide` | Kısa, yaygın başlık. Reddedilen: "Instructions" (resmî). |
| Dikkat (kılavuzda) | **Watch out** | `MOB_GUIDE` "dikkat" alanı | Bu alan uyarı içerir ("dizini kilitleme" gibi). "Watch out" kısa, gündelik ve uyarı anlamını taşır. Reddedilen: "Caution" (resmî, etiket gibi), "Tips" (uyarı değil, öneri anlamı). |
| Bölgeler son çalışma | **Last worked, by area** (satırlarda "3 days ago") | `mobRegionLast` | Her bölgenin en son ne zaman çalışıldığını gösterir. Reddedilen: "Areas, last worked" (virgüllü yapı doğal değil). |
| Sesli yönlendirme | **Voice guidance** | `#mobTVoice`, Profil `#setMobVoice` | Yaygın ve açık ifade. |
| Eski yazım (çevrilemeyen reçete) | **Old format** | `rxOk:false` notu | Kayıtta Türkçe kalır, gösterimde çevrilir (spec §8.2). |

## 8. İlerleme

| Türkçe | English | Bağlam (ekran) | Neden |
|---|---|---|---|
| Genel / Kilo / Güç / Beslenme | **Overview / Weight / Strength / Nutrition** | `PROG_VIEWS` | "Overview", özet sekmesi için yaygın ad. Reddedilen: "General" (kelime kelime). |
| İlerleme bölümleri (erişilebilirlik etiketi) | **Progress sections** | `#progNav` aria-label | Alt sekme çubuğunun ekran okuyucu adı; "Progress" (§1) + bölümlerin ortak adı "sections". Cümle düzeni (0.2). Reddedilen: "Progress views" (teknik). |
| Kilo (vücut ağırlığı) | **Weight** (gerekirse **body weight**) | Kilo sekmesi | Doğrudan karşılık. |
| Tartı / Tartıyı kaydet | **Weigh-in / Log weigh-in** | `#pWeighBtn`, kurulum | MacroFactor tek tartı kaydına "weigh-in" diyor **[K2]**. |
| Son tartılar | **Recent weigh-ins** | Kilo | Aynı **[K2]**. |
| 7 günlük ortalama | **7-day average** | Kilo grafiği, Menülerim | MacroFactor yeni tartılara daha çok ağırlık veren bir eğilim kullanıyor ve buna "weight trend" diyor **[K2]**. Bizimki basit ortalama olduğu için dürüstçe "average" denir. |
| Ölçüler | **Measurements** | `#pMeasure`, Profil | Doğrudan karşılık (body measurements). |
| Koç / Kalori koçu | **Coach / Calorie coach** | `#pCoach`, `coachAnalysis` | MacroFactor kendini "nutrition coach" olarak tanıtıyor ve haftalık "coaching" güncellemeleri yapıyor **[K2]**. Bizimki kalori önerisi verdiği için "calorie coach". |
| Koç düzeltmesi | **Coach adjustment** | `applyCoach/resetCoachAdjust` | Aynı. |
| Seri | **Streak** | `mobWeekStats` | Art arda günler için yaygın, herkesin tanıdığı kelime. |
| Bu hafta, gün gün | **This week, day by day** | `#pStrip` | Doğal. |
| Hedef tutturuldu / yakın / uzak (✓ ~ !) | **On target / Close / Off target** | `#pStrip`, Geçmiş takvimi | Bölüm 2 ile aynı. |
| Hareket seçimi (grafik) | **Choose exercise** | `#pExChart` | Doğrudan karşılık. |

## 9. Profil, yedek ve veri

| Türkçe | English | Bağlam (ekran) | Neden |
|---|---|---|---|
| Kişisel bilgiler | **Personal details** | Profil | en-GB'de "details", "info"dan daha doğal. |
| Gün geçişi | **Day starts at** (ayar etiketi) | Profil `#setDayStart` | Gece yarısından sonra yeni günün kaçta başlayacağını seçtirir. "Day starts at 03:00" hemen anlaşılır. Kavram adı gerekirse "day rollover". Reddedilen: "Day transition" (kelime kelime). |
| Yedekleme | **Backup** | Profil → Yedekleme | Doğrudan karşılık. |
| Yedek al / Yedek dosyası indirildi | **Back up now / Backup file downloaded** | Aynı | İsim "backup", fiil "back up". |
| Geri yükle | **Restore** | Aynı | Yaygın kullanım. |
| İç yedek (otomatik) | **Automatic backups** | `#pfSnaps` | Kullanıcı açısından işlevi otomatik yedektir. Reddedilen: "Snapshots" (teknik), "Internal backup" (kelime kelime). |
| Gece yedeği / Haftalık yedek | **Nightly backup / Weekly backup** | İç yedek listesi | Doğrudan karşılık. |
| Değişiklik öncesi / İçe alma öncesi / Geçiş öncesi | **Before changes / Before import / Before upgrade** | İç yedek türleri | O işlemden hemen önceki hâl. "Geçiş" depolama geçişidir; kullanıcıya "upgrade" olarak anlatılır. |
| Bu hâle dön | **Restore this version** | `aykSnapRestore` | Açık ve yaygın. |
| Kurtarma kopyası | **Recovery copy** | `#pfRescue` | Okunamayan kaydın ham kopyası; "recovery" işlevi açık. Reddedilen: "Rescue copy" (kelime kelime), "Backup" (yedekle karışır). |
| Fabrika ayarlarına sıfırla | **Erase all data** | Profil | Ne olacağını açık ve dürüst söyler. Reddedilen: "Factory reset" (telefonun kendisini sıfırlamak gibi anlaşılabilir). |
| Kayıt alanı | **Storage** | `#pfStorage` | Telefon ayarlarından tanıdık kelime. |
| Hakkında | **About** | `#pfAbout` | Yaygın kullanım. |
| Sağlık notu | **Health notice** | `HEALTH_NOTE`, kurulum | Sağlıkla ilgili uyarı başlığı için yaygın ve sıcak bir ifade. Reddedilen: "Disclaimer" (soğuk, hukuki), "Health note" (kelime kelime; not defteri gibi). |
| Gizlilik | **Privacy** | Hakkında | Doğrudan karşılık. |
| Hesap yöntemi ve kaynaklar | **How we calculate & sources** | Hakkında | Doğal. |
| Lisanslar | **Licences** | Hakkında | en-GB isim yazımı (ABD "licenses"). |
| Profil fotoğrafı | **Profile photo** | `#pfAvatar` | Doğrudan karşılık. |
| Dil | **Language** | Profil → Dil (v49) | Doğrudan karşılık. |

## 10. Kurulum ve örnek içerik (terimler)

| Türkçe | English | Bağlam (ekran) | Neden |
|---|---|---|---|
| Kurulum | **Setup** | `#onboard` | Kullanıcıya görünen ad ("onboarding" yalnızca geliştirici terimi). |
| Örnek menü / Örnek program / Örnek esneme rutini | **Sample meal plan / Sample program / Sample stretching routine** | Adım 6 kutuları | "Sample" = örnek; kullanıcı kendisi düzenleyecek. Reddedilen: "Template" (hazır şablon; kullanıcı istemiyor), "Starter". |
| Örnek program: 3 gün tüm vücut / 4 gün üst/alt vücut | **3-day full body / 4-day upper/lower** | Örnek program adları | Antrenmanda yaygın bölünme adları. |
| Boş başla | **Start empty** | Adım 6 | İşlevi açık. |
| Yedeğim var, geri yükle | **I have a backup — restore it** | Kurulum adım 1 | Doğal. |
| İlk öğününü ekle / İlk hareketini ekle | **Add your first meal / Add your first exercise** | `[data-empty-menu]`, `[data-empty-day]` | Boş durum kartları; terimlerle tutarlı. |
| Devam et / Bitti | **Continue / Done** | Kurulum düğmeleri | Yaygın kullanım. |

## 11. Ortak pencere ve düğme kelimeleri

| Türkçe | English | Bağlam (ekran) | Neden |
|---|---|---|---|
| Kaydet / İptal / Sil / Düzenle / Ekle / Kapat | **Save / Cancel / Delete / Edit / Add / Close** | `uiAsk`, her yerde | Yaygın kullanım. "Sil" kalıcı silmede "Delete", listeden çıkarmada "Remove". |
| Kopyala | **Duplicate** (öğün/rutin kopyası) | Öğün kartı, `#mobCopyRoutine` | Kopya oluşturma işlevi için "duplicate" açık; "copy" panoya kopyalamayı çağrıştırır. |
| Başlat / Bitir | **Start / Finish** | Seans, antrenman | Doğrudan karşılık. |
| Sıfırla | **Reset** | Çeşitli | Doğrudan karşılık. |
| "Emin misin?" kalıbı | **"Delete X?"** biçimi | Onay pencereleri | Başlık eylemin kendisidir ("Delete this meal?"); kullanıcı neyi onayladığını hemen görür. "Are you sure?" kullanılmaz. |

---

## 12. Örnek metinler (bağlayıcı değil)

Aşağıdakiler terim değil, kurulum ekranındaki cümleler için ilk taslaktır. Bağlayıcı değildir; v47–v48'de ekranla birlikte metin dosyalarına taşınır ve orada son hâlini alır. Yalnızca yukarıdaki terimlerle tutarlı olmaları şarttır.

| Türkçe | English (taslak) | Bağlam |
|---|---|---|
| Hoş geldin / Başlayalım | Welcome / Let's get started | Adım 1 |
| Seni tanıyalım | About you | Adım 2 başlığı |
| Hedefin ne? | What's your goal? | Adım 3 |
| Yağ kaybı, kası koruyarak | Lose fat while keeping muscle | Adım 3, "Lose weight" açıklaması |
| Aynı kiloda daha fit ve güçlü | Stay at your weight, get fitter and stronger | Adım 3, "Maintain weight" açıklaması |
| Kas kazanmak için kalori fazlası | A calorie surplus to build muscle | Adım 3, "Gain weight" açıklaması |
| Ne kadar hızlı? (günlük kalori açığı / fazlası) | How fast? (daily calorie deficit / surplus) | Adım 3 kaydırıcısı |
| Gün içinde ne kadar hareketlisin? | How active are you during the day? | Adım 4 |
| Masa başı iş, günde az yürüyüş / Gün içinde biraz hareket / Ayakta ya da bedenen çalışılan iş | Desk job, little walking / Some movement during the day / On your feet or physical work | Adım 4, Low / Moderate / High açıklamaları |
| Neyle başlayalım? | How would you like to start? | Adım 6 |
| Hazırsın / Son onay | You're all set / Final check | Adım 7 |
| Günlük hedeflerin: | Your daily targets: | Adım 7 özeti |

## 13. Bilinçli olarak çevrilmeyen / sonraya bırakılanlar
- Besin adları (USDA, tarifler) ve hareket rehberleri v49'da ayrı çevrilir; bu sözlükteki terimlerle (ör. "cooked", "raw", "each side", "watch out") tutarlı olmaları zorunludur.
- Mobilite hareket adları zaten İngilizce (kullanıcı kararı).
- Kayıtta Türkçe tutulan metinler (`timeLabel`, "Eski yazım", varsayılan adlar vb.) kayıtta değişmez; gösterimde bu sözlükle çevrilir (spec §8.2).

## 14. Kaynaklar (doğrulanmış)

Yalnızca aşağıdaki kaynaklar gerekçelerde adıyla anılır. Kaynak numarası olmayan gerekçeler düz akıl yürütmedir.

- **[K1] MacroFactor, hedefler:** lose / maintain / gain hedef türleri; hedef hızı ("goal rate") ve açık/fazla büyüklüğü; maintain hedefinde kalorinin tahmini harcamaya eşitlenmesi. https://macrofactor.com/goal-features/ · https://help.macrofactorapp.com/en/articles/222-how-does-macrofactor-make-adjustments-for-a-weight-gain-or-weight-loss-goal
- **[K2] MacroFactor, tartı ve koçluk:** "weigh-in", "weight trend" (yeni tartılara daha çok ağırlık veren hareketli ortalama), haftalık "coaching" güncellemeleri, "Smart nutrition coach". https://help.macrofactorapp.com/en/articles/278-weight-trend · https://help.macrofactorapp.com/en/articles/109-how-frequently-do-i-need-to-log-my-weight-for-the-expenditure-algorithm-and-weekly-coaching-updates · https://macrofactorapp.com/?p=4998
- **[K3] MacroFactor, pimli makineler:** "weight stack" aralıkları ve her aralığın kendi "increment"i. https://help.macrofactorapp.com/en/articles/403-how-to-configure-weight-stack-ranges-for-pin-loaded-machines
- **[K4] StrongLifts, increments.** https://support.stronglifts.com/article/71-increments
- **[K5] Alpha Progression, available weights / increments.** https://alphaprogression.com/en/glossary/available-weights
- **[K6] Hevy, set türleri:** Warm Up Set, Normal Set, Failure Set, Drop Set; RPE 6–10. https://help.hevyapp.com/hc/en-us/articles/34896293707927-Set-Types-in-Hevy-Explained-Drop-Sets-Warm-Up-Sets-and-More · https://help.hevyapp.com/hc/en-us/articles/35687721776663
- **[K7] Hevy, antrenman kaydı:** "live workouts" ve harekete eklenen "rest timer" (set türleri yardım makalesinde geçiyor; K6 ile aynı sayfa). https://help.hevyapp.com/hc/en-us/articles/34896293707927-Set-Types-in-Hevy-Explained-Drop-Sets-Warm-Up-Sets-and-More
- **[K8] Hevy, program ve rutinler:** "Build a workout program: create & organize routines". https://help.hevyapp.com/hc/en-us/articles/34953606698903-Build-a-Workout-Program-Create-Organize-Routines
- **[K9] Hevy, exercise library.** https://www.hevyapp.com/features/exercise-library/
- **[K10] Kas görselleri:** Strava "muscle maps"; Hevy "muscle distribution" ve ısı haritası; Fitbod "Recovery" ekranında ısı haritası. https://www.wareable.com/sport/strava-strength-training-update-muscle-maps-integrations · https://www.hevyapp.com/features/muscle-group-workout-chart/ · https://help.hevyapp.com/hc/en-us/articles/35361145804439 · https://help.fitbod.me/hc/en-us/articles/360006269014-Muscle-Recovery
- **[K11] Güç ölçüleri:** Strong'da rest timer, tahmini 1RM, volume grafikleri ve rekor işaretleme (bağımsız inceleme; Strong yardım merkezinden alıntı içeriyor); Boostcamp "personal records"; Fitbod "estimated strength". https://www.sensai.fit/blog/strong-app-review-2026 · https://www.boostcamp.app/features/personal-records · https://fitbod.me/blog/estimated-strength
- **[K12] Eat This Much:** meal planning, öğün/tarif "swap". https://www.eatthismuch.com/meal-planning-with-grocery-list
- **[K13] Lose It!, kalori "budget" (haftalık görünüm dahil).** https://www.cspinet.org/article/our-guide-food-tracking-apps · https://lifestack.ai/blog/lose-it-vs-myfitnesspal
- **[K14] MyFitnessPal:** kayıtlı "Meals", "copy from yesterday". https://blog.myfitnesspal.com/copy-and-remember-meals/
- **[K15] Cronometer:** "Custom Meals" ("Custom Recipes"tan ayrı). https://cronometer.com/blog/custom-meals
- **[K16] NSCA, Strength and Conditioning Journal, "A Practical Approach to Deloading":** "deload" ("unloading" eş anlamlı; tek bir tanım yok). https://www.nsca.com/globalassets/certification/rscc/2026-renewal/scj--practical-guide-to-deloading.pdf
- **[K17] AB Tüzüğü 1169/2011, Ek XV:** besin tablosunda "fibre" ve "salt". https://legislation.gov.uk/eur/2011/1169/annex/XV/data.pdf · https://www.fsai.ie/business-advice/labelling/labelling-nutrition-information/nutrition-labelling
- **[K18] DSÖ, tuzu azaltma bilgi notu:** yetişkinlere günde 5 g tuzdan az. https://www.who.int/news-room/fact-sheets/detail/salt-reduction
- **[K19] ISSN pozisyon bildirgesi: protein ve egzersiz (Jäger ve ark., 2017):** 20–40 g'lık dozlar, 3–4 saatte bir eşit dağılım. https://jissn.biomedcentral.com/counter/pdf/10.1186/s12970-017-0177-8
