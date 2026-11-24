# AYK+ — App Store yol haritası (14 Kasım 2026)

Kaynak: `docs/ANALIZ-appstore.md` (durum raporu) + kullanıcının cevapları.

## Kullanıcının kararları (14 Kasım 2026)

1. **Hedef:** Herkese açık App Store uygulaması.
2. **Dil:** Türkçe + İngilizce (İngilizce ilk sürümde hazır olmalı).
3. **Para:** İlk çıkış **ücretsiz** (insanlar denesin). Abonelik sistemi **sonra** eklenecek. Bu yüzden veri yapısı ve ekranlar ileride "Pro" özellik ayrımına izin verecek şekilde tasarlanmalı, ama şimdi satın alma kodu yazılmayacak.
4. **Bütçe:** Apple Geliştirici hesabı **ödendi**. Bulutta derleme (Mac yerine) anlatıldı; karar ve kurulum C aşamasında.
5. **Öncelik:** (1) iPhone'da sorunsuz, gerçek uygulama gibi kullanım → (2) uygulama kapalıyken sayaç bildirimi/titreşim → (3) Apple Sağlık.

Kullanıcının istemedikleri hâlâ geçerli (CLAUDE.md §8): ilerleme fotoğrafı, Body ekranı, liderlik tablosu, hazır program şablonları. (23 Kasım 2026: paylaşım görselleri artık İSTENİYOR; sosyal ağ/akış istenmez.)

## Güncel sıra (23 Kasım 2026)

Aşama 1–3 bitti (v41–v53), v54–v62 yayında. 292 hareket görseli üretildi (19 Kasım). Hafta sonu kararlarıyla sıra:

```
[0] Görseller ──► [1] Web uygulaması: 5 yeni özellik ──► [2] Aşama 4 ──► Aşama 5 ──► Aşama 6 ──► Aşama 7 ──► Yayın sonrası
    bitirme          ölçü rehberi · besin kategorileri      Capacitor     sayaç     mağaza     Sağlık      widget
                     içecek/fast food · paylaşım görseli    iCloud        bildirim  başvurusu  (yalnız
                     mobilite önerisi                       yedek         Live Act.            gösterim)
```

### 0 — Hareket görsellerini bitirme
- 292 görsel: beyaz zemin → şeffaf, ok/işaretlerin silinmesi (3, 21, 36, 66, 67, 104; 85), aynı 16:9 ölçü, küçük webp (~50 KB); sonra tam boy kontrol.
- Uygulamada hareket ve mobilite kartlarına görsel alanı (boş yer tutucu yok), harekete adla bağlama, testler, sürüm.

### 1 — HEMEN: web uygulamasında (her biri ayrı sürüm; her birinde önce plan, kullanıcı "yap" demeden başlanmaz)
1. **(v64'te YAPILDI) Vücut ölçüsü nasıl alınır rehberi:** her ölçü için çizim + adımlar (bel, kalça, göğüs, kol, bacak, boyun); genel kurallar: sabah aç karnına, mezurayı sıkmadan, hep aynı taraftan. Ölçü penceresinde "Nasıl ölçerim?" bağlantısı.
2. **(v65'te YAPILDI) Besinler: kategori ve filtre düzenlemesi.** Önce mevcut durumun analizi (USDA kategorileri, uygulamanın kendi listesi, Türk mutfağı, tarifler, özel besinler); sonra sade yeni yapı önerisi (örn. Et/Tavuk/Balık, Süt ürünleri & Yumurta, Tahıllar & Ekmek, Baklagiller, Meyveler, Sebzeler, Kuruyemiş & Yağlar, Atıştırmalık & Tatlılar, İçecekler, Fast food, Türk mutfağı). Net kategori çipleri ve filtreler: son kullanılanlar, favoriler (yıldız), yüksek protein, düşük kalori. Arama sonuçları kategorilere göre gruplu. Eski kayıtlar, menüler, özel besinler bozulmaz; eski veriyle göç testi. TR + EN.
3. **(v66'da YAPILDI: yalnız resmi değerli içecekler + ayrı İçecekler bölümü; fast food kullanıcı kararıyla EKLENMEDİ) İçecekler ve fast food** (2. maddenin yapısına oturur): markalı içecekler (Coca-Cola, Coca-Cola Zero, Fanta, Sprite, Ice Tea, enerji içecekleri; Latte, Cappuccino, Americano, Mocha gibi kahveler boyut + süt türü + şeker/şurup seçimiyle; ayran, meyve suları, alkollü içecekler) ve Türkiye'de popüler fast food zincirlerinin en bilinen ürünleri. Besin aramasında "İçecekler" ve "Fast food" kategorisi (Su kartına dokunulmaz). Logo yok; değerler üreticinin yayınladığı bilgiden tek tek; "değerler değişebilir" notu. Yaygın Türkiye boyutları (330 ml kutu, 500 ml, 1 L).
4. **(v67'de yapılıyor; tasarım `docs/superpowers/specs/2026-11-24-paylasim-gorselleri-design.md`, A3 onaylı; yalnız antrenman; + rekor kartı ve ay sırası. SONRAYA: kartta App Store bağlantısı/QR → Aşama 6; haftalık özet kartı → ayrı iş) Sosyal medya paylaşım görselleri: Hikâye 1080×1920 ve gönderi 1080×1350, şeffaf sticker, fotoğraf üstüne istatistik (fotoğraf kaydedilmez), antrenman kartında kas haritası, kişisel bilgiler varsayılan gizli, koyu ve aydınlık tema. Sosyal ağ/akış yok. Önce `tasarimlar/` klasörüne 3 stil önerisi.
5. **Çalışan kaslara göre mobilite rutini önerisi.** Profil → Ayarlar'dan açılıp kapatılır (varsayılan: açık). Kapalıyken öneri hiçbir yerde görünmez; mevcut mobilite rutinlerine ve verilere dokunulmaz.

### 2 — iPhone uygulamasıyla (aşama ayrıntıları aşağıda)
- **Aşama 4:** Capacitor + Codemagic + TestFlight; PWA verisinin taşınması; veriler iPhone'un iCloud yedeğine dahil + iCloud Drive'da tek dosyalık otomatik yedek (`AYK-yedek.json`, eskisinin üzerine yazılır). Bu gelince uygulamadaki yedek uyarısı kaldırılır. Web uygulamasındaki yedek kısmı şimdilik DEĞİŞMEZ.
- **Aşama 5:** kapalıyken sayaç bildirimi + ses + titreşim (kalır) VE kilitli ekran / Dynamic Island dinlenme sayacı (Live Activity).
- **Aşama 6:** App Store ekran görüntülerinin TR + EN otomatik üretimi + mağaza başvurusu.
- **Aşama 7 (isteğe bağlı):** Apple Sağlık'tan "bugün yaktığın" bilgisi yalnızca gösterilir; kalori hedefini ve menüyü DEĞİŞTİRMEZ.
- **Yayından sonra:** ana ekran widget'ı (kalan kalori/protein, sıradaki antrenman).

### KALDIRILDI (yeniden önerilmesin)
- **Yakılan kaloriye göre günlük değişen kalori hedefi** (23 Kasım 2026): menü tabanlı yapıyla çelişir; kalori koçu zaten kilo trendiyle düzeltiyor.

## Sıra (14 Kasım 2026 planı; aşama ayrıntıları)

Her aşama ayrı sürüm(ler)dir. Her aşamanın başında plan sunulur ve onay alınır (CLAUDE.md §8). Mevcut PWA, aşamalar boyunca çalışmaya devam eder.

### Aşama 1 — Depolama temeli (PWA'da da fayda)
- Tek `localStorage` kaydı yerine parçalı/kalıcı depolama. Hedef: her dokunuş hızlı kalsın, 5+ yıl veri sığsın. Paketli uygulamada iOS'un web verisini silme riskine karşı yerel depolamaya geçişe hazır olsun.
- Kural: `ayk_plus_v5_state` asla silinmez. Göç tek seferlik, geri dönüşlü ve testli yapılır (eski formatla test).
- Neden önce: sonraki her şey (kurulum, dil, paket) bunun üstüne kurulur; kullanıcının verisi en değerli şey.

- **Eski sürüm yükünü bitirme (kullanıcı kararı, 14 Kasım 2026: "eski sürümler ayağımıza bağ olmasın"):**
  - Kayda veri sürümü numarası (örn. `state.dataVer`). Bütün eski biçim çevirileri tek dosyada, sırayla; her kayıt her çeviriden bir kez geçer, numara güncellenir. Kodun geri kalanı yalnızca bugünkü biçimi bilir (bugün `normalizeState` içinde 15'ten fazla dağınık eski biçim kontrolü var: v4 taşıma, mobilitenin eski iki listesi `mobFromLegacy`/`parseMobRx`, `nutriLight`, `macroViewV26`, `separatePlans` …).
  - Eski yedek geri yüklenince aynı çeviri zincirinden geçer (eski yedekler açılmaya devam eder; eski formatla test).
  - Kullanılmayan eski yardımcılar (`exRightHtml` vb.) testlerle doğrulanarak silinir.
  - Kalır: `data.js` içindeki 23 gizli eski besin (menüde kullanılıyorsa hesap için gerekli). Mobilitenin eski `dynamic`/`static` yedek dizilerini silmek ayrıca sorulur.
  - Depolama göçüyle aynı anda yapılır (ikisi de açılışta kaydı okuyan kodu değiştirir).
  - Yapıldı (v37): küçültülmemiş eski profil fotoğrafı küçültülüyor, okunmayan `ayk_plus_v4_state` siliniyor.

### Aşama 2 — Herkes için uygulama
- İlk açılış kurulumu: cinsiyet, yaş, boy, kilo, hedef (ver / koru / al), etkinlik düzeyi, birim.
- Genel varsayılanlar: kişisel menü ve program yerine boş veya örnek başlangıç. **Mevcut kullanıcının verisine dokunulmaz.** Kurulum yalnızca yeni kurulumda çıkar.
- Hedef formülleri seçenekli (protein katsayısı, etkinlik çarpanı), güvenlik alt sınırları korunur.
- "Tıbbi tavsiye değildir" notu, Hakkında sayfası (lisanslar: Open Food Facts ODbL, zxing Apache-2.0, yazı tipi OFL, USDA).

### Aşama 3 — İngilizce
- Bütün arayüz metinleri dil dosyasına (tr / en); telefon diline göre seçim + Profil'den değiştirme.
- Sayı/tarih biçimi dile göre (ondalık virgül/nokta, `num()`/`fmtNum()` buna uyarlanır).
- Besin adları: USDA İngilizce adları zaten var; Türk yemeklerine İngilizce ad.
- Birimler: kg/lb, cm/in (İngilizce kullanıcı için gerekli).

### Aşama 4 — Gerçek iPhone uygulaması (öncelik 1)
- Capacitor ile paketleme. Simge, açılış ekranı, güvenli alan, klavye, geri hareketi, durum çubuğu ayarları.
- Bulutta derleme (18 Kasım 2026 kararı): **Codemagic** (kişisel hesapta aylık ücretsiz macOS dakikası; App Store Connect API anahtarıyla imzalama ve TestFlight'a gönderme). Mac gerekmez; Windows'tan tarayıcıyla yönetilir. GitHub Actions'ın macOS makinesi yalnızca yedek seçenek: hesabın geçmişi nedeniyle GitHub'da yoğun derleme yükü istenmiyor, depo gizlenirse Mac dakikası da hızla biter. Codemagic depoyu yalnızca okur.
- Testler bilgisayarın dilinden bağımsız (her tarayıcı açılışında `locale` açık; 18 Kasım 2026). Python tarafı tarih kullandığı için saat dilimi bilinçli olarak sabitlenmedi: bulut makinesi UTC ise tarayıcı ile Python aynı günü görür.
- Kamera (barkod) ve fotoğraf izin metinleri.
- TestFlight ile kullanıcının kendi iPhone/iPad'inde günlük kullanım denemesi; PWA verisinin uygulamaya taşınması (yedek dosyasıyla veya otomatik).
- (23 Kasım 2026) Veriler iPhone'un iCloud yedeğine dahil; iCloud Drive'da tek dosyalık otomatik yedek `AYK-yedek.json` (eskisinin üzerine yazılır). Gelince uygulamadaki yedek uyarısı kalkar; web uygulamasının yedek kısmı şimdilik değişmez.

### Aşama 5 — Sayaç bildirimi ve titreşim (öncelik 2)
- Uygulama kapalı/kilitliyken dinlenme ve mobilite sayacı bitince yerel bildirim + ses.
- Set tamamlama, sayaç bitişi gibi anlarda titreşim (haptics).
- (23 Kasım 2026) Kilitli ekran / Dynamic Island dinlenme sayacı (Live Activity).

### Aşama 6 — Mağaza başvurusu
- Gizlilik politikası ve destek sayfası (GitHub Pages, TR + EN). **Yapıldı (v61):** `privacy.html`, `support.html`; iletişim şimdilik GitHub Issues (ayrı bir destek e-postası eklenebilir). App Privacy formu: "veri toplanmıyor" + barkodun Open Food Facts'e gönderildiği notu.
- Mağaza sayfası TR + EN: ad, açıklama, anahtar kelimeler, ekran görüntüleri (iPhone 6,9" / 6,5", iPad 13"; 23 Kasım 2026: TR + EN otomatik üretilecek), yaş derecelendirmesi.
- "AYK+" adının mağazada uygunluğu, `anatomy.jpg` üretim aracının ticari kullanım şartları kontrolü.
- İnceleme → yayın (ücretsiz).

### Aşama 7 — Apple Sağlık (öncelik 3)
- (23 Kasım 2026, isteğe bağlı) "Bugün yaktığın" bilgisi Sağlık'tan okunup YALNIZCA gösterilir; kalori hedefini ve menüyü değiştirmez (bkz. KALDIRILDI). İzin metinleri, gizlilik formunun güncellenmesi.
- Eski fikir (14 Kasım): kilo, antrenman ve aktif enerji yazma; isteğe bağlı kilo okuma — ileride ayrıca konuşulur.

### Yayından sonra
- Ana ekran widget'ı (kalan kalori/protein, sıradaki antrenman).

### Sonra (karar verildiğinde)
- Abonelik (Apple uygulama içi satın alma, "satın alımı geri yükle", Pro özellik seçimi).
- iPhone–iPad eşitleme (iCloud).
- "Daha Büyük Yazı" desteği, VoiceOver baştan sona deneme. **Yapıldı (v61):** Yazı boyutu ayarı (Sistem / Normal / Büyük / En büyük) ve VoiceOver adlandırma düzeltmeleri; gerçek iPhone'da VoiceOver ile elden deneme kullanıcıda.
