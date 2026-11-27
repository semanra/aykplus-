# AYK+ — Aşama B planı: gerçek iPhone uygulaması (27 Kasım 2026)

> Aşama B = yol haritasındaki "Aşama 4" (`docs/YOL-HARITASI-appstore.md`). Bundan sonra tek ad kullanılır: **Aşama B**.
> Onaylandı (28 Kasım 2026).

## Amaç

AYK+'yı App Store'dan (şimdilik TestFlight'tan) indirilen gerçek bir iPhone uygulamasına çevirmek, verileri iCloud'a otomatik yedeklemek ve etiket fotoğrafından besin değeri okumayı eklemek. Web uygulaması (ana ekrandaki AYK+) bu süreçte aynen çalışmaya devam eder.

## Bu aşamada OLMAYANLAR (sonraki aşamalar)

- Uygulama kapalıyken sayaç bildirimi, titreşim, kilit ekranında sayaç → **Aşama 5**
- App Store'a başvuru, mağaza sayfası, ekran görüntüleri → **Aşama 6**
- Apple Sağlık → **Aşama 7**
- iPhone–iPad eşitleme, abonelik → sonra

## Üç sürüm halinde

Aşama B, her biri ayrı test edilip telefona gelen üç sürümdür. Her sürüm hem web uygulamasına (her zamanki gibi) hem de TestFlight'a gider.

### B1 — v86: Uygulama kalıbı ve TestFlight

**Ne olacak:** AYK+ ilk kez TestFlight'tan iPhone uygulaması olarak açılır. Görünüm ve özellikler aynı.

1. **Capacitor kalıbı** (web uygulamasını iPhone uygulamasının içine koyan araç). Uygulamanın dosyaları (besin listesi, görseller) uygulamanın içine gömülür; internet olmadan da her şey açılır.
2. **Uygulamaya özel düzenlemeler** (web uygulamasında hiçbir şey değişmez):
   - Service worker (önbellek dosyası) uygulamada çalıştırılmaz; dosyalar zaten içeride.
   - **Yedek dosyası ve CSV kaydetme:** web'deki "indir" yöntemi uygulamada çalışmaz. Uygulamada iPhone'un paylaş menüsü açılır ("Dosyalar'a kaydet", AirDrop vb.). İlk günden çalışması şart.
   - Durum çubuğu, çentik/alt çizgi boşlukları, klavye açılınca ekranın kayması, açılış ekranı (siyah zemin → bildiğin Portal Zoom açılışı).
   - Kamera (barkod) ve fotoğraf izin metinleri, Türkçe ve İngilizce.
   - **Hata günlüğü:** Mac olmadığı için uygulamanın içini bilgisayardan izleyemeyiz. Profil → Hakkında'da gizli bir "Tanılama" satırı: son hatalar listelenir, tek dokunuşla kopyalanıp bana gönderilebilir.
3. **Codemagic** (bizim yerimize uygulamayı derleyen, internetteki Apple bilgisayarı): her derleme ayarı depoda yazılı durur. Derleme **elle başlatılır** (her değişiklikte değil), ücretsiz dakikalar boşa gitmesin.
4. **Kontrol listesi:**
   - **Parmakla yakınlaştırma (B10):** Profil → Ayarlar'da açılıp kapanan anahtar (varsayılan kapalı).
   - **Besin listesinin hızı (B12):** iPhone'da açılış süresi ölçülür. Uygulamada dosya telefonun içinden geldiği için büyük ihtimalle sorun kalmaz; 300 ms'yi geçerse besin listesi arkadan yüklenir.
   - **Fotoğraf belleği (B13):** paylaşım kartındaki fotoğraf en fazla 1440 piksele küçültülür, iş bitince bellek boşaltılır.

### B2 — v87: iCloud yedeği ve veri güvenliği

**Ne olacak:** verilerin kendiliğinden iCloud Drive'a yedeklenir. Telefon kaybolsa veya değişse de veri kurtarılır.

1. **iCloud Drive'da tek dosya** `AYK-yedek.json`: uygulama arka plana geçtiğinde (en sık 10 dakikada bir) güncellenir, eskisinin üzerine yazılır. Dosyalar uygulamasında "AYK+" klasöründe görünür.
2. **Profil → Yedekleme:** "iCloud yedeği: 3 dk önce" satırı ve **"iCloud'daki yedekten geri yükle"**. Geri yüklemeden önce o anki hâl her zamanki gibi iç yedeğe alınır (Geri al mümkün).
3. iCloud yedeği son 2 günde başarılıysa **"telefon dışına yedek al" uyarısı uygulamada gösterilmez**. Web uygulamasının yedek bölümü değişmez.
4. iCloud kapalıysa veya dolduysa açık bir uyarı çıkar; uygulama sessizce yedek alıyormuş gibi davranmaz.
5. Uygulamanın kendi verisi zaten iPhone'un iCloud cihaz yedeğine dahildir; bu da denetlenir.
6. **Web'den uygulamaya geçiş:** web uygulaması ile gerçek uygulama birbirinin verisini göremez (Apple'ın kuralı). Geçiş yedek dosyasıyla olur: web'de yedek al → uygulamada ilk açılışta "Yedeğim var". Sen sıfırdan başlayacağın için bu senin için zorunlu değil, ama diğer kullanıcılar için hazır ve testli olacak.

### B3 — v88: Etiket fotoğrafından besin değeri okuma

**Ne olacak:** barkod bulunamayınca açılan "elle gir" formunda **"Etiketi okut"** düğmesi. Besin değeri tablosunun fotoğrafını çekersin, değerler forma dolar, sen kontrol edip kaydedersin.

1. Okuma Apple'ın kendi metin tanımasıyla (iOS Vision) telefonda yapılır; fotoğraf hiçbir yere gönderilmez, saklanmaz.
2. Türkçe ve İngilizce etiketler: Enerji (kcal), Protein, Karbonhidrat, Yağ, 100 g / 100 ml ve porsiyon değerleri.
3. Okunamayan değer boş kalır, **uydurulmaz**. Okunan her değer formda işaretli görünür ki kontrol edesin.
4. Yalnız uygulamada; web uygulamasında düğme görünmez.

## Senin yapacakların (tek seferlik, her adımı ekran ekran anlatacağım)

| # | Ne | Ne zaman | Süre |
|---|---|---|---|
| 1 | **Apple Developer:** uygulama kimliğini kaydetmek, App Store Connect'te uygulama kaydı açmak (ad burada ayrılır) | B1 başında | ~15 dk |
| 2 | **App Store Connect API anahtarı** oluşturmak. Dosya **yalnızca bir kez** indirilir; doğrudan Codemagic'e yüklersin, bana ve depoya gelmez | B1 başında | ~10 dk |
| 3 | **Codemagic:** GitHub ile ücretsiz hesap açmak, yalnız AYK+ deposuna erişim vermek, API anahtarını eklemek. **Kart bilgisi eklenmeyecek** | B1 başında | ~15 dk |
| 4 | Telefona **TestFlight** uygulamasını yüklemek | B1 sonunda | 2 dk |
| 5 | Apple Developer'da **iCloud kapsayıcısını** açmak (bir onay kutusu ve bir ad) | B2 başında | ~5 dk |
| 6 | Her sürümde TestFlight'tan yükleyip **deneme listesini** denemek, ekran görüntüsüyle dönmek | Her sürümde | — |
| 7 | Verini silmeden önce **Profil → Yedekleme'den yedek almak** | Sıfırlamadan önce | 1 dk |

## Kararlar (28 Kasım 2026, kullanıcı onayladı: "Lets go")

1. **App Store'daki ad:** **AYK+: Gym, Macro & Mobility** (27 karakter; sınır 30). Telefonda simgenin altında "AYK+".
2. **Simge:** şimdiki simge kalır (`scripts/simge/icon-1024.png`).
3. **Uygulama kimliği:** kullanıcıya seçenekler anlatıldı; geçici olarak `com.aykplus.app` (ilk derlemeden önce kesinleşir, sonra değişmez).
4. **Parmakla yakınlaştırma (B10):** **Profil → Ayarlar'da anahtar** (`settings.zoom`, varsayılan kapalı). Açıkken iki parmakla yakınlaştırma; çift dokunuş yakınlaştırması her durumda kapalı. Web uygulamasında da çalışır.
5. **Sıra:** B1 → B2 → B3.

## Maliyet

**0 TL.** Apple Developer hesabı zaten ödendi. Codemagic'in ücretsiz paketi ayda 500 dakika veriyor; hesabı açarken birlikte kontrol edeceğiz. Bir derleme yaklaşık 10–15 dakika, yani ayda 30'dan fazla derleme demek. Dakikalar biterse derleme ay başına kadar durur; kart eklemediğimiz için **kendiliğinden ücret çıkmaz**. Ücretli bir şey gerekirse önce sorarım.

## Değişen tek alışkanlık

Web uygulamasında bir değişiklik 1–2 dakikada telefonuna geliyordu. **Uygulamada her değişiklik yeni bir derleme ister:** Codemagic'te ~15 dakika, sonra TestFlight'ta "Güncelle". Bu yüzden küçük düzeltmeleri toplayıp birlikte göndereceğiz. Web uygulaması eskisi gibi anında güncellenmeye devam eder.

## Riskler ve önlemler

| Risk | Önlem |
|---|---|
| Mac olmadığı için uygulamanın içinde hata görmek zor | Uygulama içi tanılama günlüğü (B1); bütün mantık tarayıcı testlerinde (Chromium + WebKit) denenmiş olarak gider |
| Barkod kamerası uygulamada farklı davranabilir | İzin metni + B1 deneme listesinde ilk madde |
| Yedek/CSV indirme uygulamada çalışmaz | B1'de paylaş menüsüne geçer; testli |
| iCloud'a yazma yarım kalırsa bozuk yedek | Önce geçici dosyaya yazılır, tamamlanınca eskisinin yerine konur; geri yüklemede dosya doğrulanır, bozuksa mevcut veri değişmez |
| Veri kaybı | Depolama ve iCloud kodu için ayrıca bağımsız "saldırgan" inceleme (Aşama 1'deki ders); her bulgu önce teste dönüşür |

## Her sürümde kontrol

1. Bütün testler: Chromium + WebKit (şu an 74/74) + yeni testler.
2. Uygulamaya özel kod tarayıcıda sahte "uygulama ortamı" ile test edilir (iCloud, paylaş menüsü, etiket okuyucu taklit edilir). Etiket okuyucunun ayrıştırıcısı gerçek Türkçe/İngilizce etiket metinleriyle denenir.
3. `npm run kontrol -- --hizli`: web görünümü değişmemeli.
4. Codemagic derlemesi → TestFlight → senin telefonunda deneme listesi.
5. Göndermeden (push) önce senin onayın.

---

## Teknik ayrıntı (Claude için)

- **Araçlar:** `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios` (son kararlı sürüm, SPM), `@capacitor/status-bar`, `@capacitor/keyboard`, `@capacitor/splash-screen`, `@capacitor/filesystem`, `@capacitor/share`, `@capacitor/app`. Haptics Aşama 5'te.
- **webDir:** `scripts/native.mjs` → `www/` (index.html, foods.js, foods-en.js, img/, simgeler, manifest, privacy/support; sw.js HARİÇ). `www/` git'e girmez.
- **ios/ klasörü:** Windows'ta `npx cap add ios` (SPM) denenir; olmazsa Codemagic her derlemede üretir ve `Info.plist` / yetkiler betikle yamalanır. Özel Swift eklentileri (`AykICloud`, `AykOcr`) yerel paket olarak `native/` altında.
- **Ortam tespiti:** tek yardımcı `isNative()` (`window.Capacitor?.isNativePlatform?.()`); SW kaydı (`13-cizim-baslat.js:103`) ve `saveTextFile` bununla dallanır. Testler `window.Capacitor` taklidiyle.
- **iCloud:** `AykICloud.write(text)` (geçici dosya + atomik değiştirme, `NSFileCoordinator`), `read()`, `status()`. Tetik: `visibilitychange`/`pause` + en az 10 dk aralık; içerik `stableStr` ile aynıysa yazılmaz. Geri yükleme mevcut yedek geri yükleme yolundan (`safe` iç yedek → doğrulama).
- **OCR:** `AykOcr.recognize()` → `VNRecognizeTextRequest` (`tr-TR`, `en-US`, accurate) satır + kutu. Ayrıştırıcı saf JS (`42-etiket-oku.js`), birim testli; v83 elle giriş formunu doldurur.
- **B10:** `applyZoom()` viewport meta'sını `settings.zoom`'a göre yazar (kapalı: `maximum-scale=1.0, user-scalable=no`; açık: `maximum-scale=5`); çift dokunuş `body { touch-action: manipulation }` ile kapalı kalır. WKWebView `user-scalable=no`'ya uyar (`ignoresViewportScaleLimits` false).
- **Codemagic:** `codemagic.yaml`; `npm ci` → `npm run build` → `node scripts/native.mjs` → `npx cap sync ios` → otomatik imzalama (App Store Connect API anahtarı Codemagic'te, depoda değil) → derleme numarası = Codemagic derleme sayısı → TestFlight. Tetik: elle.
- **Yürütme:** native kod tek oturumda, depolama/iCloud kısmı için bağımsız inceleme ajanı.
