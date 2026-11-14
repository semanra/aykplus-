# AYK+ — App Store'a hazırlık durumu (14 Kasım 2026, v36)

Kısa cevap: **Uygulamanın kendisi (özellikler, kararlılık, veri güvenliği, tasarım) kişisel kullanım için çok iyi durumda. App Store'a çıkmaya ise henüz hazır değil.** Eksikler kodun kalitesinde değil. Uygulama "tek bir kişi için" yapıldı; App Store'da "herkes için" olması ve Apple'ın kurallarına uyması gerekiyor.

Puanlama: ✅ hazır · 🟡 kısmen · ❌ yok

---

## 1. Ürün olarak hazır olanlar

| Konu | Durum | Not |
|---|---|---|
| Özellik derinliği | ✅ | Beslenme (USDA ~1.800 besin + 124 Türk yemeği, barkod, tarif, kombo, ikame), antrenman (set/kilo, öneri, zorluk, plaka, kas haritası), mobilite (sayaçlı), ilerleme grafikleri, su, takviye. Rakip uygulamalarla yarışabilecek düzeyde. |
| Kararlılık | ✅ | 29 otomatik test paketi, bozuk veri denemesi (yaklaşık 1.800 deneme, 0 hata), kötü niyetli metin denemesi (açık yok), 38 ekranın koyu/aydınlık karşılaştırması. |
| Veri güvenliği | ✅ | Veri hiç silinmiyor, bozuk kayıtta kurtarma kopyası, yedek/geri yükleme, kayıt alanı göstergesi (v35–v36). |
| Tasarım | ✅ | Tutarlı tema, aydınlık/koyu/sistem, 44 px dokunma alanı, okunurluk ölçümü temiz. |
| Çevrimdışı çalışma | ✅ | İnternetsiz açılıyor (barkodla ürün arama hariç). |
| Gizlilik | ✅ | Hesap yok, sunucu yok, veri telefonda. App Store'da "veri toplanmıyor" etiketi alınabilir. Tek istisna: barkod numarası Open Food Facts'e gönderiliyor; gizlilik metninde yazılmalı. |
| Hız | ✅ (bugün) / 🟡 (yıllar sonra) | Bugün her dokunuş ~5 ms. 5 yıllık yoğun veride ~40 ms, kayıt alanı da %85'e yaklaşıyor (bkz. 3.3). |

## 2. App Store için eksik olanlar

### 2.1 Uygulama "herkes için" değil ❌ (en büyük iş)
- **İlk açılış kurulumu yok.** Yeni kullanıcı senin varsayılan verinle başlıyor: 105 kg, senin 4 öğünlük menün, senin antrenman programın. Gereken: cinsiyet / yaş / boy / kilo / hedef / etkinlik soran bir kurulum ekranı ve boş ya da genel başlangıç menüsü.
- **Hedef formülleri sana göre ayarlı.** Protein = hedef kilo × 2,0 + kilo × 0,35; dinlenme/antrenman çarpanları sabit. Herkese uyacak şekilde seçenekli olmalı (etkinlik düzeyi, hedef: ver / koru / al). Kalori için güvenlik alt sınırı var (kadın 1.400 / erkek 1.750 kcal); bu iyi.
- **Sağlık uyarısı yok.** Kalori açığı öneren uygulamalarda "tıbbi tavsiye değildir" notu ve 18 yaş altı için dikkat beklenir.

### 2.2 Apple kuralları ve gerekli belgeler ❌
- **Apple Geliştirici Programı:** yıllık ~99 $ ücret, kimlik doğrulaması. Bireysel hesapta mağazada kendi adın görünür; şirket adı istenirse D-U-N-S numarası gerekir.
- **Gizlilik politikası sayfası** (zorunlu, bir web adresi) ve **destek sayfası**: GitHub Pages'te yayınlanabilir.
- **App Store sayfası:** ad, açıklama, anahtar kelimeler, iPhone (6,9" / 6,5") ve iPad (13") ekran görüntüleri, yaş derecelendirmesi, "App Privacy" formu, şifreleme beyanı (yalnızca HTTPS → muaf).
- **"Web sitesini paketleme" kuralı (madde 4.2):** Apple yalnızca bir web sitesini kutuya koyan uygulamaları reddediyor. AYK+ çevrimdışı ve zengin olduğu için şansı yüksek. Yine de kamera, Apple Sağlık, bildirim, titreşim gibi en az birkaç gerçek telefon özelliği eklemek onayı garantiye yakın hâle getirir.
- **Lisanslar:** USDA verisi kamu malı (sorun yok); Open Food Facts verisi ODbL (uygulamada kaynak belirtilmeli); zxing Apache-2.0 ve yazı tipi OFL (lisans metinleri "Hakkında" sayfasına eklenmeli). `anatomy.jpg` yapay zekâ ile üretildi; kullandığın aracın ticari kullanım şartlarına bakılmalı. "AYK+" adının mağazada boş olduğu kontrol edilmeli.

### 2.3 Teknik dönüşüm ❌
- **Uygulama paketlenmeli.** Önerim Capacitor: mevcut kod neredeyse olduğu gibi bir iOS uygulamasına sarılır, yeniden yazmaya gerek yok.
- **Mac yok.** App Store'a yükleme Xcode (Mac) ister. Çözümler: bulutta Mac kiralamak (aylık ücretli), GitHub Actions'ın macOS makineleri + Fastlane ile otomatik derleyip TestFlight'a yüklemek (düşük maliyetli) veya Codemagic gibi bir hizmet. Hepsi Windows'tan yönetilebilir.
- **Depolama yeniden ele alınmalı.** Şu an bütün veri tek bir `localStorage` kaydında. Paketli uygulamada iOS, depolama dolduğunda web verisini silebilir. Capacitor de önemli veri için yerel depolama (SQLite / Preferences / dosya) öneriyor. Bu geçiş aynı zamanda 5 yıllık sınır ve hız sorununu (3.3) çözer. Eski veri tek seferde göç ettirilmeli, asla silinmemeli.
- **Kazanılacak özellikler:** paketli uygulamada PWA'da imkânsız olanlar mümkün olur: Apple Sağlık (kilo, aktif enerji, antrenman yazma/okuma), uygulama kapalıyken dinlenme sayacı bildirimi, titreşim, iCloud ile iPhone–iPad eşitleme (ileride).

### 2.4 Dil 🟡
- Arayüz yalnızca Türkçe ve metinler kodun içine gömülü. Yalnızca Türkiye mağazası için sorun değil. Uluslararası çıkış için bütün metinlerin ayrı bir dil dosyasına taşınması ve İngilizce çeviri gerekir; büyük ama mekanik bir iş. Besin adları zaten çift dilli (USDA İngilizce + Türkçe).

### 2.5 Erişilebilirlik 🟡
- Dokunma alanları, okunurluk, "hareketi azalt" ve klavye odağı tamam. Eksikler: yazı boyutları sabit, yani iOS'taki "Daha Büyük Yazı" ayarına uymuyor; VoiceOver ile baştan sona bir deneme yapılmadı. Apple bunlar için reddetmez ama yorumlarda ve puanda etkisi olur.

### 2.6 İş modeli ❓ (karar senin)
- Ücretsiz, ücretli veya abonelik. Uygulama içi satış olursa Apple'ın satın alma sistemi (komisyonlu) zorunlu; "satın alımı geri yükle" düğmesi gerekir.

## 3. Mevcut durumun riskleri (App Store'dan bağımsız)

1. **Tek cihaz.** iPhone ve iPad arasında eşitleme yok; veri yalnızca yedek dosyasıyla taşınıyor.
2. **Yedek kullanıcıya bağlı.** Hatırlatma bandı var. Telefon kaybolursa son yedekten sonrası gider.
3. **Uzun dönem.** Yoğun kullanımda kayıt yaklaşık 4–5 yılda telefonun ayırdığı alanın sonuna yaklaşır ve her dokunuş yavaşlar (~40 ms). Gösterge %70'te uyarıyor; kalıcı çözüm 2.3'teki depolama geçişi.

## 4. Yol haritası için karar soruları

1. **Hedef:** Kişisel kullanım + birkaç arkadaş (TestFlight yeterli, mağaza onayı gerekmez, 90 günlük sürümler) mı, yoksa herkese açık App Store mu?
2. **Ülke/dil:** Yalnızca Türkiye ve Türkçe mi, İngilizce de mi?
3. **Para:** Ücretsiz mi, ücretli mi, abonelik mi?
4. **Bütçe/araç:** Apple Geliştirici hesabı (~99 $/yıl) ve Mac çözümü (GitHub Actions / bulut Mac) için hazır mısın?
5. **Öncelikli telefon özellikleri:** Apple Sağlık, sayaç bildirimi, iPhone–iPad eşitleme. Hangileri senin için önemli?

## 5. Önerilen sıra (taslak, birlikte netleşecek)

| Aşama | İçerik | Mağaza gerektirir mi |
|---|---|---|
| A | Depolama geçişi (tek kayıt → parçalı/yerel), hız | Hayır; PWA'da da fayda sağlar |
| B | İlk açılış kurulumu + genel varsayılanlar + hedef seçenekleri + sağlık uyarısı | Hayır |
| C | Capacitor paketi + bulutta derleme + TestFlight (kendi telefonunda gerçek uygulama) | Geliştirici hesabı |
| D | Telefon özellikleri: sayaç bildirimi, titreşim, Apple Sağlık | Hayır |
| E | Gizlilik/destek sayfaları, lisanslar, mağaza görselleri, inceleme başvurusu | Evet |
| F | (İsteğe bağlı) İngilizce, iCloud eşitleme, satın alma | — |
