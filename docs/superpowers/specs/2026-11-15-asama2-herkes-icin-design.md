# Aşama 2 — Herkes için AYK+ (v43 + v44) — Tasarım

Tarih: 15 Kasım 2026 · Kaynak yol haritası: `docs/YOL-HARITASI-appstore.md` (Aşama 2)

## 1. Amaç ve neden

AYK+ herkese açık App Store uygulaması olacak. Bugün yeni bir kullanıcı uygulamayı kullanıcının (geliştirici/sahip) kişisel verisiyle açıyor: 105 kg, onun 4 öğünlük menüsü, onun 4 günlük programı, onun takviyeleri. Hesap da yalnızca kilo vermeye göre kurulu (kalori açığı 0–1000; fazla yok; hareketlilik sabit; protein "hedef kilo × 2 + kilo × 0,35").

Bu aşamanın sonunda:
- Yeni kullanıcı kısa bir kurulumla kendi bilgilerini girer, isterse örnek menü/program/rutinle, isterse boş başlar.
- Kilo vermek, korumak ve **almak** isteyen herkes için hesap doğru çalışır.
- Protein önerisi kanıta dayanır; insanları gereksiz yüksek proteine yönlendirmez (kullanıcının açık ilkesi).
- "Tıbbi tavsiye değildir" notu ve Hakkında/lisanslar sayfası vardır.
- **Mevcut kullanıcının (sahibin) telefonundaki verisine dokunulmaz.** Kurulum ona hiç çıkmaz.

## 2. Hedefler / hedef olmayanlar / başarısızlık sayılacaklar

Hedefler: yukarıdaki beş madde.

Hedef değil (bu aşamada): İngilizce ve kg/lb birimleri (Aşama 3), takviye önerisi, hazır program kütüphanesi/şablon mağazası, hesap/oturum.

Başarısızlık (çalışsa bile): sahibin verisinden tek bir alanın değişmesi (protein hedefinin bilinçli değişimi hariç, bkz. §5.4); mevcut kullanıcıya kurulum ekranı çıkması; boş menü/programla bir ekranın hata vermesi veya boş kalıp ne yapılacağının anlaşılmaması; kilolu bir kullanıcıya kilosunun 2 katı protein önerilmesi; örneğin "zorunlu şablon" gibi hissettirmesi (kullanıcı kendi programını kurabileceğini bilmeli).

## 3. Kısıtlar

- CLAUDE.md §4–§5 kuralları: depolama anahtarı değişmez; veri sürümü adımı (`migrateState`, `DATA_VER` 2 → 3) + eski formatla test; `esc()`; 44 px; temalı pencereler; `data-fk`; sınıf adları sabit metin.
- Kurulum internetsiz çalışmalı (tek `index.html` içinde).
- 34 test paketi bugün sahibin varsayılan verisiyle açılıyor; hepsi geçmeye devam etmeli.
- iOS Safari öncelikli; iPhone ve iPad.
- GitHub Pages sürümünü sahipten başka kullanan yok (kullanıcı, 15 Kasım 2026). Bu yüzden v43'ün protein değişikliği için başka kullanıcılara uyarı gerekmez.

## 4. Yaklaşımlar

**Yapım yolu** (kullanıcı A'yı seçti):
- **A) Uygulama içinde tam ekran, adım adım kurulum** (Profil sayfası gibi). Mevcut tema, internetsiz, Capacitor paketine aynen geçer. **Seçildi.**
- B) Ayrı `kurulum.html`: önbelleğe ek dosya, iki sayfa arasında veri taşıma; risk var, kazanç yok.
- C) Art arda `uiAsk` pencereleri: hızlı ama özensiz, geri dönüp düzeltmek zor.

**Başlangıç içeriği** (kullanıcı C'yi seçti): A) her zaman boş · B) her zaman örnek · **C) kurulumun sonunda kullanıcı seçer.** Not: CLAUDE.md §8'deki "hazır program şablonu istenmiyor" sahibin kişisel kullanımı içindi; herkese açık uygulamada örnek isteğe bağlı olduğu için çelişmez.

**Protein** (kullanıcı B'yi seçti, araştırma taraması sonrası): A) sade 1,6 / açıkta 2,0 g/kg · **B) duruma göre (aşağıda)** · C) herkese kilo × 2,0 (kilolularda aşırı; reddedildi).

**Sürüm bölmesi** (onaylandı): **v43** hesap genişletme (sahibi hemen etkiler, önce o dener) · **v44** kurulum + örnekler + not + Hakkında.

## 5. v43 — Hesabın genişletilmesi (kullanıcının kararları)

### 5.1 Hedef: Ver / Koru / Al
- Yeni alan `settings.goal` = `lose | keep | gain`. Yeni alan `settings.gainPace` = `slow | mid | fast` (varsayılan `mid`).
- **Ver:** bugünkü `state.deficit` (0–1000, adım 50) aynen. **Koru:** açık/fazla 0. **Al:** fazla = TDEE × %10 / %15 / %20 (Iraki 2019: korumanın %10–20 üstü, ileri seviyede alt uç).
- Göç (`migrateState` **adım 3, v43, `DATA_VER` 3**): kayıtlı veride `goal` yoksa `deficit > 0 ? "lose" : "keep"`. Sahibin `deficit` değeri (700) değişmez.
- Menülerim'deki "Kalori açığı" kartı **Hedef** kartı olur: üstte `[Ver] [Koru] [Al]`; Ver'de bugünkü kaydırıcı; Al'da `[Yavaş] [Orta] [Hızlı]`; altında "+350 kcal · haftada ~0,3 kg alım → 82 kg hedefine ~20 hafta". Koru'da "Kilo koruma" ve hedefe uzaklık yazısı yok.
- Kalori: `calTarget = max(taban, TDEE + calAdjust − açık + fazla)`; taban aynı (kadın 1400, erkek 1750).
- "Haftalık kayıp" geçen her yazı yöne göre "kayıp/alım" olur (Menülerim zaman çizelgesi, Geçmiş haftalık bütçe, İlerleme). "Hedefine ulaştın": Ver'de kilo ≤ hedef, Al'da kilo ≥ hedef.

### 5.2 Hareketlilik
- Yeni alan `settings.activity` = `low | mid | high` (varsayılan ve göçte `mid`).
- Çarpanlar (antrenman günü / dinlenme günü): low 1,45 / 1,30 · **mid 1,55 / 1,43 (bugünkü, sahibin değeri)** · high 1,70 / 1,58. *(Benim kararım; kullanıcı onaylamadı, Hakkında'da yazılı olacak.)*
- Profil → Kişisel bilgiler'de seçici (3 düğme, otomatik kayıt `PF_FIELDS` mantığıyla).

### 5.3 Protein (B)
- Referans kilo `ref` = hedef kilo geçerliyse `min(kilo, hedef)`, değilse `kilo`.
- **Ver:** yağ oranı geçerliyse (`validBf`) `yağsız kütle × 2,5`, değilse `ref × 2,2`.
- **Koru:** `ref × 1,6`. **Al:** `ref × 1,8`.
- Üst sınır: `kilo × 2,2`.
- Yeni ayar `settings.proteinHigh` (varsayılan kapalı; Profil → "Protein: Standart / Yüksek"): açıksa `max(Standart, kilo × 2,0)` (Yüksek hiçbir zaman Standart'tan az olmaz; üst sınır uygulanmaz, bilinçli seçim). *(Benim kararım, gözden geçirme sonrası.)* Altında tek satır: "Standart, araştırmalara göre yeterli miktardır. Yüksek, daha fazlasını isteyenler için."
- **Yağ (kullanıcı B'yi seçti):** `yağ = kalori hedefinin %25'i / 9` (gün tipine göre; antrenman ve dinlenme günü farklı çıkar). Eski `max(55/45, kilo × 0,72)` kalkar. Gerekçe: AMDR %20–35, Helms 2014 %15–30; çok düşük yağda testosteron düşüşü (Whittaker 2021). Eski formül kiloya baktığı için uçlarda bozuluyordu (120 kg kadın, 1400 kcal → yağ %55, hedefler toplamı kaloriyi aşıyordu; 70 kg kilo alan erkek, 3000 kcal → %16).
- Karbonhidrat bugünkü gibi kalan kaloriden (alt sınır 60 g).
- Kanıt (Hakkında'da kaynakçası): Morton 2018 (~1,6 g/kg tavan, üst güven sınırı ~2,2), Nunes 2022 (≥1,6 g/kg), ISSN 2017 (1,4–2,0; açıkta daha yüksek gerekebilir), Helms 2014 (açıkta zayıf antrenmanlılarda yağsız kütle başına 2,3–3,1 g), Joslin klinik rehberi (kilolularda toplam kiloya göre hesap ihtiyacı abartır).

### 5.4 Sahibin hesabına etkisi (bilinçli, kullanıcı onayladı)
- 105 kg, hedef 82, Ver, yağ oranı yok → protein **~201 g → 180 g**; kalori aynı; proteinden düşen ~21 g kadar karbonhidrat artar (kesin değer uygulamada ölçülüp kullanıcıya söylenir). Yağ oranı girerse lean × 2,5; "Yüksek" ile ~210 g. Yağ ~76 g → antrenman günü ~%25 (≈69 g), dinlenme günü ≈62 g (tahmini; kesin değer uygulamada ölçülüp söylenir).
- Hareketlilik `mid` → kalori değişmez.

### 5.5 Koç (iki yön)
- Beklenen haftalık değişim: Ver `−açık×7/7700`, Koru `0`, Al `+fazla×7/7700`.
- İstenen kalori: Ver `tdeeTahmini − açık`, Koru `tdeeTahmini`, Al `tdeeTahmini × (1 + oran)`; tavan/taban ve `COACH_MAX_STEP` aynı.
- Uyarılar: Ver → haftada %1'den hızlı kayıp ("çok hızlı"), kilo artıyor. Al → haftada %0,5'ten hızlı alım ("fazla yağ birikebilir"), yeterli veriyle alım yok ("kaloriyi artır"). Koru → haftada ±%0,25'ten büyük kayma.

## 6. v44 — Herkes için başlangıç

### 6.1 Kurulum kime çıkar
- Yeni alan `settings.onboarded` (boolean).
- **Yeni kurulum** = açılışta hiçbir kayıt yok (localStorage `ayk_plus_v5_state` yok, `ayk_plus_v4_state` yok, IndexedDB'de çekirdek parça yok). Yalnızca bu durumda `onboarded = false` ve kurulum çıkar.
- **Herhangi bir kayıt varsa** (eski formatta bile) `migrateState` **adım 4 (v44, `DATA_VER` 4)** `onboarded = true` yazar. Sahip kurulumu hiç görmez.
- Dikkat: `normalizeState({})` yeni kurulumda da çalışır ve dataVer 0 görür. Yeni kurulum **açık bir işaretle** (depolamanın "hiç kayıt yok" sonucu) ayrılır; o yolda göç adımları `onboarded=true` yazmaz, durum doğrudan güncel `DATA_VER` ile oluşturulur. *(Benim kararım.)*
- Kurulum yarıda kapatılırsa sonraki açılışta baştan çıkar (kurulum bitene dek kalıcı kayıt yapılmaz veya `onboarded=false` kalır; hangisi daha güvenliyse kurucunun kararı).

### 6.2 Kurulum ekranları (tam ekran, adım adım, geri düğmeli, ilerleme noktaları)
1. **Hoş geldin + sağlık notu:** kısa tanıtım, "Tıbbi tavsiye değildir" metni (§6.5), `[Başlayalım]`. Altta ikincil: **"Yedeğim var, geri yükle"** (mevcut yedek geri yükleme akışı; başarılıysa `onboarded = true`, kurulum kapanır). PWA'dan App Store sürümüne geçişte gerekli.
2. **Hakkında sen:** cinsiyet, yaş, boy, kilo (sayılar `inputmode="decimal"`, `num()`; Profil'deki sınırlar).
3. **Hedef:** Ver / Koru / Al; Ver ve Al'da hedef kilo; Ver'de hız (yavaş 300 / orta 500 / hızlı 700 kcal açık — *benim kararım*), Al'da yavaş/orta/hızlı. Haftalık tahmini değişim canlı yazılır.
4. **Gün içi hareketlilik:** Az (masa başı) / Orta / Çok (ayakta, bedenen çalışma); her birinin altında bir satır örnek.
5. **Antrenman deneyimi:** "Yeni başlıyorum" / "Salonu biliyorum".
6. **Neyle başlayalım:** üç işaret kutusu, hepsi varsayılan işaretli: Örnek menü · Örnek program (deneyime göre: "3 gün tüm vücut" ya da "4 gün üst/alt") · Örnek esneme rutini. Üstte açıkça: **"Hepsini istediğin zaman değiştirebilir, silebilir ya da kendi menünü ve programını sıfırdan kurabilirsin."**
7. **Özet:** günlük kalori, protein/karb/yağ, su hedefi, `[Uygulamaya geç]`.

### 6.3 Örnek içerik
- **Menü:** 4 öğün, yaygın Türk mutfağı, `BASE_FOOD_DB` / USDA kimlikleri (gizli olmayan): kahvaltı (yumurta, yulaf, peynir, domates-salatalık), öğle (tavuk göğsü, bulgur/pirinç, salata, zeytinyağı), ara (süzme yoğurt, meyve, kuruyemiş), akşam (kırmızı mercimek veya kıyma, sebze, tam buğday makarna/ekmek). Gramajlar kurulumdaki kalori hedefine göre ölçeklenir: `g/ml` kalemler oranla çarpılıp 5 g'a yuvarlanır, adetli kalemler tam sayıya; antrenman menüsü antrenman günü hedefine, dinlenme menüsü dinlenme günü hedefine. Protein hedefi tutmazsa hata değil (menü örnek).
- **Program:** yalnızca uygulamanın hareket kütüphanesindeki adlar (kas haritası ve öneriler çalışsın), kilolar 0. Yeni başlayan: 3 gün tüm vücut (A/B/C), gün başına 5–6 hareket, makine + dambıl ağırlıklı. Salonu bilen: 4 gün üst/alt (A/B). Hareket seçimi kurucuya bırakıldı (§8).
- **Mobilite:** "Günlük esneme" rutini, kütüphaneden 6–8 hareket (~10 dk), dinamik + statik karışık.
- **Takviye:** boş liste (hazır takviyeler Düzenle'de duruyor). Su hedefi otomatik (bugünkü `waterAuto`).

### 6.4 Kod içindeki kişisel varsayılanların kaldırılması
- `DEFAULT_STATE` (kilo 105, menü, program, mobilite), `DEFAULT_SETTINGS` (yaş 26, boy 180, hedef 82, su 3,5), `DEFAULT_SUPPS` genel/boş değerlere iner. Sahibin bugünkü varsayılan verisi testler için bir fikstür dosyasına taşınır (ör. `tests/fixtures/`); uygulamadan çıkar.
- **Eski varsayılanlar uygulamada TUTULMAZ (kullanıcı kararı, 15 Kasım 2026):** sahibin menüsü/programı/listesi yalnızca kendi telefonundaki kayıtta kalır; koddan tamamen çıkar (testler için fikstürde durur). Gerekçe: sahibin güncel kaydı `normalizeState` çıktısıdır ve her alanı içerir, eksik alan doldurmaya ihtiyacı yoktur; eksik alan ancak çok eski bir yedek dosyasında olabilir ve yedek geri yüklenmeden önce o anki hâl zaten "Değişiklik öncesi" iç yedeği olur (v41–v42), yani hiçbir şey kaybolmaz. Uygulama sırasında doğrulanacak: (1) sahibin kayıt biçimi (`stateParts` + ayna) bütün `DEFAULT_STATE` / `DEFAULT_SETTINGS` alanlarını yazıyor; (2) listeleri/alanları eksik eski bir kayıt hatasız açılır (eksik liste boş, eksik sayı genel varsayılan), sayfa hatası 0. Bu doğrulamalardan biri tutmazsa sahibe sorulmadan dondurma yapılmaz; durum sahibe bildirilir.
- `normalizeState`'in boş menüyü/programı sahibin menüsüyle doldurması kalkar; boş liste geçerli olur. `restMeals` boşsa `meals`'tan kopyalanan bugünkü davranış korunur (meals da boşsa boş).
- **Boş durumlar:** menü boşken Menülerim ve Bugün'de "İlk öğününü ekle" kartı; program boşken Antrenman → Bugün/Programım'da "İlk antrenman gününü oluştur"; mobilitede rutin yokken mevcut "Yeni rutin". Boş listeyle hiçbir yerde hata olmamalı (ör. `activeWorkoutDayIdx`, sıradaki gün, ısınma kartı, kas yükü, alışveriş listesi, İlerleme şeridi).

### 6.5 Sağlık notu, Hakkında, lisanslar
- Not metni (kurulum 1. ekran + Hakkında): "AYK+ genel bilgi amaçlıdır; tıbbi tavsiye, teşhis ya da tedavi yerine geçmez. Hamileysen, emziriyorsan, bir sağlık sorunun ya da yeme bozukluğu geçmişin varsa, beslenme ve egzersiz planını değiştirmeden önce bir doktora veya diyetisyene danış."
- Profil'in altına **Hakkında** bölümü (tam ekran Profil içinde açılır kart ya da alt sayfa; kurucunun kararı): sürüm, sağlık notu, "Verilerin yalnızca bu telefonda; barkod okuttuğunda yalnızca barkod numarası Open Food Facts'e gönderilir", hesap yöntemi (Mifflin-St Jeor, Katch-McArdle, hareketlilik çarpanları, protein kuralı ve kaynakları §5.3), lisanslar: Barlow Condensed (SIL OFL 1.1), @zxing/library (Apache-2.0, `vendor/ZXING-LICENSE.txt`), Open Food Facts verisi (ODbL; ürün verisi katkıcılara ait), USDA FoodData Central (kamu malı / CC0), Tailwind CSS (MIT; derlenmiş CSS'te), `anatomy.jpg` (sahibin kendi görseli).

## 7. Doğrulama
- v43: eski formatlı kayıt (goal/activity/proteinHigh yok) → kalori v42 ile aynı, protein yeni kurala göre; Ver/Koru/Al hesapları; koç iki yön; kilolu kullanıcı (130 kg, hedef 85) protein ≤ 2,2 × kilo ve = 85 × oran.
- v44: yeni kurulumda kurulum çıkar, kayıt varken çıkmaz (v4 kaydı, localStorage-only, IndexedDB-only, bozuk kayıt + kurtarma); "Yedeğim var"; örnek menünün gramajları hedefe göre; boş başlangıçta bütün sekmeler/alt ekranlar hatasız (`pageerror` = 0); alanları/listeleri eksik eski kayıt testi.
- Her sürümde CLAUDE.md §4 listesi; veri yapısı değiştiği için `bozuk_veri.py` ve `html_enjeksiyon.py` de; `kontrol.py`'ye kurulum ekranları ve boş durum ekranları eklenir.

## 8. Kurucuya bırakılanlar
- Örnek programların ve mobilite rutininin hareket seçimi (kütüphanedeki adlardan), örnek menünün tam besin/gram listesi (yukarıdaki çerçevede).
- Kurulum ekranlarının görsel ayrıntısı (Antrenman ailesi `--t-*` değişkenleri, iki temada okunur, 44 px).
- Hakkında'nın Profil içindeki yerleşimi.
- Test düzeni: fikstür ve "kurulumu atla" mekanizmasının biçimi (ör. testlerin başlangıç betiğinde fikstürü yazmak).
- Kurulum yarıda kalınca kayıt davranışının ayrıntısı (§6.1).
