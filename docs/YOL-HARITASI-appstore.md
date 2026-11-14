# AYK+ — App Store yol haritası (14 Kasım 2026)

Kaynak: `docs/ANALIZ-appstore.md` (durum raporu) + kullanıcının cevapları.

## Kullanıcının kararları (14 Kasım 2026)

1. **Hedef:** Herkese açık App Store uygulaması.
2. **Dil:** Türkçe + İngilizce (İngilizce ilk sürümde hazır olmalı).
3. **Para:** İlk çıkış **ücretsiz** (insanlar denesin). Abonelik sistemi **sonra** eklenecek. Bu yüzden veri yapısı ve ekranlar ileride "Pro" özellik ayrımına izin verecek şekilde tasarlanmalı, ama şimdi satın alma kodu yazılmayacak.
4. **Bütçe:** Apple Geliştirici hesabı **ödendi**. Bulutta derleme (Mac yerine) anlatıldı; karar ve kurulum C aşamasında.
5. **Öncelik:** (1) iPhone'da sorunsuz, gerçek uygulama gibi kullanım → (2) uygulama kapalıyken sayaç bildirimi/titreşim → (3) Apple Sağlık.

Kullanıcının istemedikleri hâlâ geçerli (CLAUDE.md §8): ilerleme fotoğrafı, PR kartı, Body ekranı, liderlik tablosu, hazır program şablonları.

## Sıra

Her aşama ayrı sürüm(ler)dir. Her aşamanın başında plan sunulur ve onay alınır (CLAUDE.md §8). Mevcut PWA, aşamalar boyunca çalışmaya devam eder.

### Aşama 1 — Depolama temeli (PWA'da da fayda)
- Tek `localStorage` kaydı yerine parçalı/kalıcı depolama. Hedef: her dokunuş hızlı kalsın, 5+ yıl veri sığsın. Paketli uygulamada iOS'un web verisini silme riskine karşı yerel depolamaya geçişe hazır olsun.
- Kural: `ayk_plus_v5_state` asla silinmez. Göç tek seferlik, geri dönüşlü ve testli yapılır (eski formatla test).
- Neden önce: sonraki her şey (kurulum, dil, paket) bunun üstüne kurulur; kullanıcının verisi en değerli şey.

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
- Bulutta derleme: GitHub Actions'ın macOS makinesi + Fastlane → TestFlight. Mac gerekmez; Windows'tan yönetilir.
- Kamera (barkod) ve fotoğraf izin metinleri.
- TestFlight ile kullanıcının kendi iPhone/iPad'inde günlük kullanım denemesi; PWA verisinin uygulamaya taşınması (yedek dosyasıyla veya otomatik).

### Aşama 5 — Sayaç bildirimi ve titreşim (öncelik 2)
- Uygulama kapalı/kilitliyken dinlenme ve mobilite sayacı bitince yerel bildirim + ses.
- Set tamamlama, sayaç bitişi gibi anlarda titreşim (haptics).

### Aşama 6 — Mağaza başvurusu
- Gizlilik politikası ve destek sayfası (GitHub Pages, TR + EN). App Privacy formu: "veri toplanmıyor" + barkodun Open Food Facts'e gönderildiği notu.
- Mağaza sayfası TR + EN: ad, açıklama, anahtar kelimeler, ekran görüntüleri (iPhone 6,9" / 6,5", iPad 13"), yaş derecelendirmesi.
- "AYK+" adının mağazada uygunluğu, `anatomy.jpg` üretim aracının ticari kullanım şartları kontrolü.
- İnceleme → yayın (ücretsiz).

### Aşama 7 — Apple Sağlık (öncelik 3)
- Kilo, antrenman ve aktif enerji yazma; isteğe bağlı kilo okuma. İzin metinleri, gizlilik formunun güncellenmesi.

### Sonra (karar verildiğinde)
- Abonelik (Apple uygulama içi satın alma, "satın alımı geri yükle", Pro özellik seçimi).
- iPhone–iPad eşitleme (iCloud).
- "Daha Büyük Yazı" desteği, VoiceOver baştan sona deneme.
