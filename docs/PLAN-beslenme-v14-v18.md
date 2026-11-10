# AYK+ beslenme geliştirme planı (v14–v18)

Kayıt tarihi: 9 Kasım 2026. Durum: **10 Kasım 2026'da ONAYLANDI. 5 paket tek seferde yapılıp birlikte gönderilecek** (her paket ayrı commit + ayrı test, hepsi geçince tek push).

## Kullanıcının kararları (10 Kasım 2026)
1. v13 zaten yayında (git kuruldu, main'e gönderildi).
2. **Bugün'deki değişiklikler yalnızca o günü etkiler**; menü yalnızca "Menüye de kaydet" seçilince değişir. ONAYLANDI.
3. **5. paket (USDA veritabanı) DAHİL.**
4. **Çiğ ↔ pişmiş dönüştürücü (madde 6) YAPILMAYACAK** ("şimdilik olmasın"). Yol haritasında aday olarak kalır.
5. **Antrenman saatine göre öğün kaydırma (madde 9) YAPILMAYACAK** ("bu özellik olmasın"). Uygulamada antrenman saati bilgisi yok.

## Kurallar (kullanıcının istediği)
- Paketlere böl, her paketten önce onay bekle.
- Her paketten sonra `npm test` ile tüm testler geçmeli; her özellik için yeni test ekle.
- Her pakette sürüm etiketini (`src/markup.html`) ve `sw.js` önbellek sürümünü artır.
- Eski kullanıcı verisi bozulmamalı; göç `normalizeState` ile yapılır.

## Paketler

### 1. Paket: Temel (v14) — ilk yapılacak
1. **"Sadece bugün" / "Menüye kaydet" ayrımı.**
   - Bugün ekranındaki değişiklikler (besin ekleme, çıkarma, miktar değiştirme, "Yarısını yedim") varsayılan olarak yalnızca o günü etkiler; Menülerim bozulmaz.
   - Gece yarısı gün dönümünde günün değişiklikleri arşivlenir ve menü temiz başlar.
   - Değişiklik yaparken "Menüye de kaydet" seçeneği olur.
   - 2. ve 11. maddeler bunun üzerine kurulur.
   - Uygulama fikri: menünün o güne ait kopyası, ilk değişiklikte oluşturulur.
   - Not: Şu an Bugün'deki "+ Besin" menüye ekliyor; bu değişecek.
2. **Serbest öğün ve kalori tamponu.**
   - Öğün kartında "Dışarıda yedim / Tahmini gir" düğmesi olur.
   - Tahmini kalori ve protein girilir (karb ve yağ isteğe bağlı); yalnızca bugünü etkiler.
   - İsteğe bağlı "Günü dengele": kalan öğünlerden karb ve yağ orantılı kısılır, protein sabit kalır, günlük hedef korunur.
   - Hangi öğünün ne kadar kısıldığı gösterilir; "Geri al" çalışır.
3. **Barkod bulunamazsa:** Open Food Facts'te bulunamayan barkodda doğrudan "Etiketteki değerleri gir" formu açılır (100 g veya porsiyon başına kalori/protein/karb/yağ). Ürün o barkodla yerel kaydedilir ve sonraki taramada internetsiz tanınır.
4. **Kiloya göre gramaj ile Kalori koçu çakışması:** İkisi aynı anda açıkken aynı kalori düzeltmesinin iki kez uygulanmadığından emin ol. Gerekirse ikisi birlikte açılırken açıklayıcı bir uyarı göster. Bunu testle doğrula. Önce kodu inceleyip ölç; sonuca önceden karar verme.
- Ayrıca CLAUDE.md yol haritasına "SONRAYA NOT"u ekle: etiket fotoğrafından OCR. Safari'de yerleşik metin tanıma yok, ağır bir kütüphane gerekir ve Türkçe tablolarda hata payı yüksek; ileride yeniden değerlendirilecek. Şimdi yapılmayacak.

### 2. Paket: Mutfak (v15)
5. **Kombo ve tarif.**
   - Kombo: birden fazla besin "Favori Kase" olarak kaydedilir (ör. 80 g yulaf + 1 ölçek whey + 15 g fıstık ezmesi) ve tek dokunuşla öğüne eklenir. Besin ekleme ekranında "Komboların" kategorisi olur.
   - Tarif: malzemeler, gramajları ve pişmiş toplam ağırlık girilir. Uygulama 100 g'ın makrolarını hesaplar ve tarifi tek bir besin olarak kaydeder.
   - "Dünkü öğünü tekrarla" kısayolu.
6. **Çiğ ↔ Pişmiş dönüştürücü.** Pirinç, bulgur, makarna, tavuk ve kırmızı et kartlarında [Çiğ | Pişmiş] anahtarı olur. Varsayılan pişme katsayıları olur; kullanıcı kendi oranını kaydedebilir ("kendi tencerem": çiğ ve pişmiş ağırlığı bir kez girer). Kartta katsayıların yaklaşık olduğu yazar.
7. **Haftalık alışveriş listesi.**
   - Antrenman ve dinlenme menülerinin gramajları, programdaki antrenman günü sayısı ile çarpılır; haftanın geri kalanı dinlenme günü sayılır. Sonuçlar toplanır.
   - Liste üstü çizilebilir olur, "Notlar'a kopyala" düğmesi bulunur.
   - Adet ve gram birimleri doğru gösterilir.

### 3. Paket: Akıllı (v16)
8. **Kalan makroya göre tamamla.**
   - + Besin ekranının en üstünde "Kalan hedefini kapatan seçenekler" başlığıyla 2–3 kombinasyon gösterilir (ör. "180 g tavuk göğsü + 1 kase yoğurt").
   - Öncelik kalan protein, sonra kalori.
   - Yalnızca kullanıcının sık yediği ve kayıtlı besinlerden seçilir; tek dokunuşla eklenir.
9. **Antrenman saatine göre öğün kaydırma.**
   - Antrenman menüsündeki öğünler "Antrenman öncesi" veya "Antrenman sonrası" olarak, dakika farkıyla işaretlenebilir.
   - O günün antrenman saati değişince bu öğünler otomatik yeni saate kayar ve sıralama güncellenir.
   - Yalnızca o günü etkiler (1. maddeye bağlı).
10. **Haftalık görünüm (Geçmiş sekmesi).**
    - 7 günlük ortalama kalori ve protein.
    - Son 7 ve 30 günün hedef tutturma ısı takvimi: yeşil = hedefte, sarı = yakın, kırmızı = uzak.
    - Haftalık kalori bütçesi: haftanın toplam hedefi, şu ana kadar alınan, kalan.
    - Günlük tartının yanında 7 günlük hareketli kilo ortalaması.

### 4. Paket: Detay (v17)
11. **Takviye zamanlama etiketleri:** Sabah tok, Antrenman öncesi, Antrenman sonrası, Yatmadan önce, Özel. Bugün ekranında takviyeler bu zamana göre gruplanır ve sıralanır.

### 5. Paket: Besin veritabanı (v18) — ayrıca onay bekler
Amaç: genel besin seçeneklerini 1.500–2.500 besine çıkarmak ve aramayı akıllandırmak. Zincir restoranlar bu pakette **yok**.

**Veri**
- Kaynak: USDA FoodData Central (Foundation Foods ve SR Legacy, kamu malı). Türkiye'de yaygın yenen besinler seçilir ve Türkçe ad verilir.
- TürKomp yalnızca kullanım koşulları açıkça izin veriyorsa kullanılır. Bilinen koşullara göre izin vermiyor; yazılı izin olmadan kullanılmayacak.
- **Asla tahmini veya uydurma değer girilmez.** Her besinde kaynak alanı olur: USDA `fdcId` ya da "tarif hesaplaması".
- Kategoriler: Türk peynirleri, kahvaltılıklar, baklagiller, tahıl ve ekmekler (çiğ/pişmiş ayrı), meyve, sebze, kuruyemiş ve tohumlar, et/tavuk/balık/sakatat, süt ürünleri, içecekler, yağlar ve soslar, tatlılar ve atıştırmalıklar, takviyeler.
- Türk yemekleri ~150'ye çıkar: standart tariflerden USDA malzemeleriyle hesaplanır ve "tarif hesaplaması (yaklaşık)" olarak etiketlenir.
- Her besine gerçek porsiyonlar eklenir (1 adet, 1 dilim, 1 kase, 1 yemek kaşığı, 1 avuç vb. → gram karşılığı).
  - Gram karşılıkları yalnızca USDA porsiyon verisinden alınır.
  - USDA'nın "1 cup" ölçüsü (240 ml) Türk su bardağı (200 ml) değildir; gerçek adıyla gösterilir.
  - USDA'da olmayan Türkiye'ye özgü ölçüler eklenmez.
- Her besine Türkçe takma adlar ve eş anlamlılar eklenir. Bitince kullanıcıya örnek bir liste gösterilir ve çeviri gözden geçirilir.

**Altyapı**
- Veri ayrı bir `foods.json` dosyasında tutulur; service worker ile önbelleğe alınır ve internetsiz çalışır. `sw.js` FILES listesine eklenir.
- Mevcut besin kimlikleri (BASE_FOOD_DB ve özel besinler) **değiştirilmez**; menülerdeki besinler kaybolmaz. Mümkünse eski kayıtlar yeni kayıtlarla eşleştirilir.

**Arama**
- Türkçe karakter toleransı (ı/i, ş/s, ğ/g, ü/u, ö/o, ç/c), kelime sırasından bağımsız arama, eş anlamlılar, küçük yazım hatası toleransı.
- Sıralama: sık kullanılanlar > tam eşleşme > kelimeyle başlayan > içinde geçen.
- Sonuç yoksa üç seçenek: "Barkod okut", "Özel besin oluştur" (arama metni ada otomatik dolar), "Tarif oluştur".
- Bulunamayan aramalar yerel olarak kaydedilir; Profil'de temizlenebilir bir "Bulunamayan aramalar" listesi olur.

**Testler**
- Her besinde 4P+4K+9Y ≈ kalori kontrolü (toleranslı), yinelenen ad kontrolü, boş kategori kontrolü.
- Arama testleri: "tavuk gogsu", "yumrta", "pismis tavuk", eş anlamlılar.
- Eski menü verisiyle göç testi.
