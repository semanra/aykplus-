# AYK+ v57 denetimi (16 Kasım 2026)

Salt okunur inceleme: kod ve belgeler okundu, hiçbir şey çalıştırılmadı, hiçbir dosya değiştirilmedi. Satır numaraları `src/` altındaki kaynaklara göredir (index.html değil). "Küçük" = birkaç saat, "orta" = bir sürüm, "büyük" = birden çok sürüm.

Genel görüş: Uygulamanın kendisi (özellikler, veri güvenliği, dil, birim, tema) App Store'a hazır bir olgunlukta. Kalan işler iki grupta: (a) mağazanın şart koştuğu belgeler ve gerçek telefon paketi, (b) Profil ekranının uzaması ve dağınıklığı.

---

## 1. Uygulamada kalan eksikler / düzeltilmesi gerekenler

Önem sırasına göre. "Öncelik": Yüksek = mağazadan önce şart, Orta = çıkıştan önce olsa iyi, Düşük = sonra.

| # | Konu | Nerede | Neden önemli | Boyut | Öncelik |
|---|---|---|---|---|---|
| 1 | **Gizlilik politikası ve destek sayfası yok.** Depoda yalnızca uygulama içi iki cümlelik not var (`PRIVACY_NOTE`). Apple, web adresi olan bir gizlilik sayfası ve bir destek adresi/e-postası ister; başvuru bunlarsız gönderilemez. | `src/app/08-profil-yedek.js:33`; depoda `privacy.html` / `destek` dosyası yok (`ls` ile doğrulandı) | Mağaza başvurusunun ilk engeli. TR + EN, GitHub Pages'te yayınlanır; Hakkında'dan bağlantı verilir. | Küçük | Yüksek |
| 2 | **Profil her açılışta bütün kaydı metne çeviriyor.** `openProfile()` içinde `$("backupText").value = JSON.stringify(state)` çalışıyor. Yıllık veride (hareket geçmişi, günlükler, profil fotoğrafı) bu megabaytlık bir metin; Profil'e her girişte takılma ve bellek yükü. Metin yalnızca "Yedek kodu ile" kutusu açılınca gerekir. | `src/app/08-profil-yedek.js:63` | CLAUDE.md "hız" ilkesiyle çelişiyor; eski iPhone'da hissedilir. Düzeltme: metni `copyBackup()` anında üret, kutuyu boş bırak. | Küçük | Yüksek |
| 3 | **Gerçek iPhone uygulaması (Capacitor) yok.** `package.json`'da Capacitor yok; bulutta derleme hattı kurulmadı. Apple'ın "web sitesini kutulama" kuralı (4.2) için bildirim/titreşim/kamera gibi gerçek özellikler de gerekiyor. | `docs/YOL-HARITASI-appstore.md` Aşama 4–5 | Mağazaya çıkmanın kendisi. | Büyük | Yüksek |
| 4 | **Yazılar sabit boyutlu, "Daha Büyük Yazı" yok; sayfa yakınlaştırması kapalı.** Viewport `maximum-scale=1.0, user-scalable=no`; arayüz `text-[13px]` gibi sabit pikseller. Görme zorluğu olan kullanıcı yazıyı büyütemez. Tasarım analizinde A6.1 bilinçli bırakılmıştı, ama mağaza yorumlarında ve erişilebilirlik puanında yer tutar. | `src/markup.html:5`; tüm `src/app/*.js` | Apple reddetmez ama kitle kaybettirir. Çözüm: `html { font-size }` çarpanı + iOS metin boyutu ayarını okuma (Capacitor'da `Text Zoom`), Profil'e "Yazı boyutu" seçici. | Büyük | Orta |
| 5 | **VoiceOver ile baştan sona deneme yapılmadı.** Markup'ta yalnızca 56 `aria-label` var; grafikler, halkalar (kalori, su) ve `.n-seg` düğmeleri (aria-pressed eksik, CLAUDE.md "bekleyenler") ekran okuyucuya anlamlı gelmeyebilir. | `src/markup.html`, `src/app/03-beslenme.js`, `07-grafik-ilerleme.js` | Apple erişilebilirlik beyanında doğrulamak ister. | Orta | Orta |
| 6 | **Bildirimler/titreşim yok** (iOS sınırı). Dinlenme sayacı uygulama kapalıyken sessiz; Profil'de bildirim izni ayarı da yok. | `docs/YOL-HARITASI-appstore.md` Aşama 5 | Kullanıcının 2. önceliği. Paket olmadan çözülemez. | Orta (paketten sonra) | Orta |
| 7 | **Veri dışa aktarma yalnızca kendi JSON yedeği.** CSV/tablo (kilo, antrenman, beslenme geçmişi) yok. Avrupa/Apple tarafında "verimi dışa aktar" beklentisi artıyor; ayrıca kullanıcı başka uygulamaya taşıyamaz. | `src/app/08-profil-yedek.js:281` (`exportBackupFile`) | Güven ve mağaza yorumları için iyi; zorunlu değil. | Orta | Düşük |
| 8 | **Yedek durumu yeterince görünür değil.** Son yedek tarihi var (`lastBackupText`) ama Profil'in en üstünde değil, Yedekleme bölümü sayfanın ortasında; uyarı bandı da yalnızca ≥ 7 gün sonra çıkıyor. İlk açılıştan beri hiç yedek almamış yeni kullanıcı 7 gün kör. | `src/app/08-profil-yedek.js:147`, `:429-436` | Veri kaybı tek gerçek risk (paketli uygulamada daha da önemli). | Küçük | Orta |
| 9 | **Cinsiyet yalnızca Erkek/Kadın.** Formül (Mifflin-St Jeor, kalori alt sınırı) bu iki değere dayanıyor; "belirtmek istemiyorum" seçeneği yok. Mağazada kapsayıcılık eleştirisi doğurabilir. | `src/markup.html` (`#setSex`), `src/app/01-temel.js:15` | Çözüm: "Formül için kullanılan: erkek/kadın denklemi" diye açıkla ya da üçüncü seçenekte ortalama kullan. Hesap değişirse test gerekir. | Orta | Düşük |
| 10 | **Bulunamayan aramalar bölümü Profil'de.** Sahibin besin listesini geliştirmek için eklenmişti; yeni kullanıcıya ayrı, büyük bir kart olarak gösteriliyor. Besinler ekranına ait bir araç. | `src/markup.html` (`pfH7`) | Profil'i uzatıyor; bkz. Bölüm 2. | Küçük | Düşük |
| 11 | **Hakkında → Lisanslar'da "uygulama sahibinin kendi görseli" notu.** `anatomy.jpg` yapay zekâ ile üretildi; Apple ve kullanılan aracın ticari kullanım şartları henüz doğrulanmadı (CLAUDE.md/Yol haritası Aşama 6 maddesi). | `src/app/08-profil-yedek.js:34` | Şartlar ticari kullanıma izin vermiyorsa görsel değişmeli; mağaza öncesi kontrol edilmeli. | Küçük (araştırma) | Orta |
| 12 | **"AYK+" adının mağazada uygunluğu** kontrol edilmedi. | Yol haritası Aşama 6 | Ad çakışırsa başvuru geri döner. | Küçük | Orta |
| 13 | **Kendi `PRIVACY_NOTE` Barkod için "yalnızca barkod numarası" diyor.** Open Food Facts isteği gerçekte IP adresi ve tarayıcı bilgisini de sunucuya iletir. App Privacy formu "veri toplanmıyor" derken bu not netleştirilmeli (kendi sunucumuz yok, üçüncü taraf var). | `src/app/08-profil-yedek.js:33`, `04-besinler-barkod.js` | Doğruluk ve Apple formu tutarlılığı. | Küçük | Orta |
| 14 | **Profil'de otomatik kayıt, fakat tek tek "Kaydedildi" bildirimi.** Her alan değişince toast çıkıyor (`applyProfileFields`); art arda değişikliklerde bildirim yığılır ve Profil'de altta yer kaplar. | `src/app/08-profil-yedek.js:187-246` | İnce bir ergonomi sorunu, iPhone'da klavye açıkken görünmez. | Küçük | Düşük |
| 15 | **Küçük yazılar.** 11 px ve altı sınıflar hâlâ var (grafik ekseni bilinçli 11 px; `10-antrenman-arayuzu.js` içinde 3 yerde 10–11 px). CLAUDE.md "en az 12 px" der. | `src/app/10-antrenman-arayuzu.js`, `09-kas-plaka-koc-takviye.js`, `08-profil-yedek.js` (`text-[1[01]px]` taraması) | Küçük ama okunurluk ölçümüyle çakışabilir; tek tek bakılmalı. | Küçük | Düşük |
| 16 | **Belge/test sayıları eskimiş.** CLAUDE.md "42 test paketi, 53 ekran" diyor; `tests/` altında 50 `.py` dosyası var. | `CLAUDE.md` §3, `tests/` | Yeni oturumda yanlış beklenti yaratır. | Küçük | Düşük |
| 17 | **iPhone–iPad eşitleme yok** (iCloud). Kullanıcı iki cihaz kullanıyor; şimdilik yalnızca yedek dosyası. | Yol haritası "Sonra" | Mağaza için şart değil. | Büyük | Düşük |
| 18 | **Apple Sağlık yok** (Aşama 7) ve abonelik altyapısı yok (kullanıcı kararı: sonra). | Yol haritası | Planlı; çıkış blokajı değil. | Büyük | Düşük |

Doğrulanan iyi haberler (tekrar listeleme gerek yok): `navigator.storage.persist()` çağrılıyor (`13-cizim-baslat.js:100`), İngilizce herkese açık (`EN_PUBLIC = true`), birim kg/lb var (v53), fabrika sıfırlama iki onaylı ve önce iç yedek alıyor.

---

## 2. Profil bölümü: mevcut durum

Tam ekran bir sayfa (`#profilePage`, `src/markup.html:1376`), tek uzun kaydırma. Alttaki sıra markup'a göre:

1. **Başlık çubuğu**: Geri + "Profil".
2. **Kişisel bilgiler**: fotoğraf (seç/kaldır), cinsiyet, yaş, boy (cm ya da ft/in).
3. **Kilom**: güncel kilo + "Tartıyı kaydet", son tartı özeti (`pfWeightBox`).
4. **Hedeflerim**: hedef kilo, su hedefi, güncel yağ oranı, hedef yağ oranı, hareketlilik, protein tercihi, "Su hedefi kiloya göre" anahtarı, yağ oranı ipucu, hesaplanan hedefler kutusu (`pfTargetsBox`).
5. **Vücut ölçülerim**: "+ Ölçü ekle" ve ölçü listesi.
6. **Ayarlar** (tek kart içinde 12 satır): Görünüm (Sistem/Koyu/Aydınlık), Dil, Birim, Varsayılan dinlenme, Sayaç sesi, Antrenmanda ekran açık, Isınma kartı, Mobilitede sesli yönlendirme, Gün geçişi saati, Açılış animasyonu, Animasyonlar.
7. **Yedekleme**: kayıt alanı göstergesi, "Yedek dosyası kaydet", "Dosyadan geri yükle", "Yedek kodu ile" (açılır), "Otomatik iç yedekler" (açılır), kurtarma kopyası kartı (yalnızca sorun varsa).
8. **Bulunamayan aramalar**: liste + "Listeyi temizle".
9. **Hakkında**: sağlık notu, gizlilik notu, "Hesap yöntemi ve kaynaklar" (açılır), "Lisanslar" (açılır).
10. **Alt satır**: "AYK+ v56" + "Fabrika ayarlarına sıfırla".

Alan sayısı: 21 alan `PF_FIELDS` içinde, her biri otomatik kaydediliyor (`08-profil-yedek.js:5`).

### UX sorunları

- **Çok uzun.** Dokuz bölüm tek kaydırmada; üstteki alanlardan Yedekleme'ye ulaşmak iPhone'da 6–8 ekran kaydırmak demek. Aranan ayarı bulmanın yolu yok.
- **Karışık gruplama.** "Kilom" ile "Hedeflerim" ve "Vücut ölçülerim" ilerleme verisi; ama aynı sayfada "Ayarlar" ile yan yana. Kilo girişi İlerleme sekmesinde de var (`#pWeighBtn`) → aynı iş iki yerde.
- **"Ayarlar" torba hâline geldi.** Antrenman (dinlenme, ekran açık, ısınma), Mobilite (ses), Beslenme (gün geçişi), Görünüm (tema, animasyon, açılış) ve Genel (dil, birim) tek listede karışık. Kullanıcı "dinlenme süresi nerede?" diye aramak zorunda.
- **Su hedefi iki yerde konuşuluyor**: Hedeflerim'de hem "Su hedefi (L)" kutusu hem "Su hedefi kiloya göre" anahtarı; otomatik açıkken kutunun ne işe yaradığı belirsiz.
- **Hedef bilgisi dağınık.** Hedef (Ver/Koru/Al) ve kilo alma hızı Profil'de değil, Beslenme → Menülerim'de. Profil'in "Hedeflerim"i bu ana kararı göstermiyor; Profil'i açan hedefin ne olduğunu göremez.
- **Başta özet yok.** En üstte fotoğraf var, ama ad, hedef, kilo ve bugünün kalori hedefi gibi "ben kimim" özeti yok. Profil kimlik gibi hissettirmiyor.
- **Yedek durumu gömülü.** Telefonun tek güvenlik ağı olan yedek, 6. bölümde; son yedek tarihi küçük yazıyla kutunun içinde.
- **Sahibe özgü ya da nadir öğeler ön planda**: "Bulunamayan aramalar", "Açılış animasyonu", "Animasyonlar" yeni kullanıcı için gürültü.
- **Tehlikeli eylem en altta ve küçük** (iyi), ama sürüm etiketi aynı satırda; destek/iletişim bağlantısı yok.
- **Otomatik kayıt iyi, ama "kaydedildi" hissi zayıf**: kayıt anında yalnızca toast çıkıyor, alan başında onay yok.

---

## 3. Profil için fikirler

| # | Fikir | Fayda | Efor |
|---|---|---|---|
| 1 | **Üst özet kartı**: fotoğraf, ad (isteğe bağlı yeni alan), "Hedef: Ver · 82,4 kg → 75 kg", bugünün kalori hedefi, son yedek rozeti. Düzenlemek için dokun. | Profil kimlik gibi hissettirir; kritik bilgi ilk ekranda. | Orta |
| 2 | **Ana liste + alt sayfalar** (iOS Ayarlar düzeni): Profil'in ilk ekranı 5 satır — Kişisel bilgilerim, Hedeflerim, Uygulama ayarları, Veri ve yedekleme, Hakkında. Her biri kendi tam ekranı. | Uzun kaydırma biter; her sayfa kısa ve bulunur. Mevcut alan kimlikleri (`setAge` vb.) aynı kalır, yalnızca markup taşınır. | Büyük |
| 3 | **Ayarlar'ı konuya göre böl**: Görünüm ve dil (tema, dil, birim, animasyonlar, açılış), Antrenman (dinlenme, ekran açık, ısınma), Mobilite (ses, sesli yönlendirme), Beslenme (gün geçişi, su). | Aranan ayar mantıklı yerde; "dinlenme nerede?" sorusu kalmaz. | Orta |
| 4 | **Profil içi arama** ("sayaç", "tema", "yedek" yazınca ilgili satıra atlar). | Alt sayfa yapılmadan bile bulunabilirlik; 20+ ayar için işe yarar. | Orta |
| 5 | **Yedekleme kartı yukarı + net durum**: "Son yedek: 3 gün önce ✓" yeşil / "12 gün önce !" sarı, tek büyük "Şimdi yedekle" düğmesi; geri kalan seçenekler (kod ile, iç yedekler) "Gelişmiş" altında. | Tek gerçek veri riskini görünür kılar; paketli uygulamada kritik. | Küçük |
| 6 | **Nadir öğeleri "Gelişmiş"e taşı**: Bulunamayan aramalar, açılış animasyonu, kayıt alanı göstergesi, kurtarma kopyası. | Varsayılan görünüm sade; meraklılar bulur. | Küçük |
| 7 | **Kilo girişini tek yere indir**: Profil'de kilo satırı kalsın ama yalnızca "Güncel kilo 82,4 · Tartı ekle → İlerleme" özeti olsun; ya da tam tersi. | Çift giriş yolu karışıklığı biter. | Küçük |
| 8 | **Hedef kararını Profil'e getir**: Ver/Koru/Al, hız ve kalori açığı Profil → Hedeflerim'de de görünsün/değişsin (Menülerim'deki kartla aynı fonksiyonlar). | Hedef tek yerden yönetilir; yeni kullanıcı nerede ayarlayacağını bulur. | Orta |
| 9 | **Su hedefini sadeleştir**: anahtar açıkken kutu "Otomatik: 2,8 L" salt okunur gösterilsin, kapatınca düzenlenebilsin. | Çelişkili iki kontrol tek akıllı satır olur. | Küçük |
| 10 | **Destek ve gizlilik satırları Hakkında'da**: "Gizlilik politikası", "Destek / geri bildirim", "Sürüm" (mağaza için zorunlu bağlantılar). | Aşama 6 için şart; kullanıcıya güven. | Küçük |
| 11 | **Kayıt hissini güçlendir**: değişen alanın yanında 1 sn'lik ✓; toast yalnızca hata/Geri al'da. | Daha sakin, klavye açıkken de anlaşılır. | Küçük |
| 12 | **Veri dışa aktar (CSV) ve "Yazı boyutu" seçicisi** Veri/Uygulama ayarları sayfalarına eklenir (bkz. Bölüm 1 #4 ve #7). | Erişilebilirlik ve taşınabilirlik. | Orta–Büyük |

Öneri: 1 + 5 + 10 + 9 küçük işlerdir, hemen yapılabilir. 2 + 3 + 4 birlikte "Profil yeniden düzeni" olarak tek sürüm olmalı (aralarında bağımlılık var).

---

## 4. Önerilen yol haritası

### Aşama 4'ten ÖNCE (PWA aşamasında, Mac/Capacitor gerektirmeyen işler)

**v58 — Profil: hızlı düzeltmeler (küçük)**
- Bölüm 1 #2 (Profil açılışındaki `JSON.stringify` yükü), #8 (yedek durumu), #13 (gizlilik notu doğruluğu), #14 (kayıt bildirimi), Fikir 5, 6, 9, 10.
- Hakkında'ya gizlilik/destek satırı yeri (adres sonra).
- Test: mevcut Profil testleri + yeni küçük test; Türkçe/İngilizce ekran ölçümü.

**v59 — Profil yeniden düzeni (orta–büyük)**
- Fikir 1 (özet kartı), 2 (ana liste + alt sayfalar), 3 (ayarları konuya böl), 4 (arama), 7, 8.
- Alan kimlikleri korunur; `PF_FIELDS`, otomatik kayıt, test fikstürleri değişmez. Kontrol aracında Profil ekran listesi (`ortak.py`) güncellenir.
- Neden Aşama 4'ten önce: Profil sayfası paketli uygulamada ayarlar ve bildirim izni, yazı boyutu gibi yeni satırlar alacak; düzen önce oturmalı.

**v60 — Erişilebilirlik ve belgeler (orta)**
- Bölüm 1 #4 (Yazı boyutu: önce uygulama içi çarpan, yakınlaştırma izni), #5 (VoiceOver incelemesi, `aria-pressed`, halkalara `role="img"` + etiket), #15 (küçük yazılar), #16 (CLAUDE.md sayıları).
- Gizlilik politikası + destek sayfası (#1) ve Aşama 6'nın "ad uygunluğu / görsel lisansı" kontrolleri (#11, #12): web sayfaları Aşama 4 ile paralel hazırlanabilir, kod gerektirmez.

**İsteğe bağlı v61 — Veri dışa aktarma (#7)**: CSV dışa aktarma. Kullanıcı isterse.

### Aşama 4 (Capacitor + bulutta derleme + TestFlight)
- v60 bittikten sonra başla. Girdi: Profil düzeni oturmuş, gizlilik sayfası yayında, yedek akışı net. Bu aşamada: simge/açılış ekranı/güvenli alan, klavye, kamera izin metinleri, yedek dosyasının paket içinde kaydedilmesi (`saveTextFile`), PWA verisini yedek dosyasıyla uygulamaya taşıma, GitHub Actions macOS + Fastlane → TestFlight.
- Kullanıcıdan alınacak karar: bulut Mac çözümü (Yol haritası zaten GitHub Actions öneriyor).

### Aşama 5'te (Aşama 4'ten SONRA, paket gerektirir)
- Yerel bildirim + ses (sayaç bitince, uygulama kapalıyken), titreşim (set/sayaç), Profil'de "Bildirimler" satırı ve izin yönetimi.
- Yazı boyutu: iOS "Daha Büyük Yazı" ayarını okuma (paket olmadan güvenilir değil).
- Profil'e "Bildirimler ve titreşim" ayar satırları ve ilgili testler.

### Aşama 6 (mağaza başvurusu)
- Gizlilik/destek adresleri uygulama içinde bağlanır, App Privacy formu (veri toplanmıyor + Open Food Facts notu), TR+EN mağaza sayfası, ekran görüntüleri, yaş derecelendirmesi, inceleme.
- Bu aşamadan ÖNCE bitmiş olması gerekenler: #1, #3, #11, #12, #13, Aşama 5'in en az bildirim kısmı (Apple 4.2 güvencesi).

### Aşama 7 ve sonrası
- Apple Sağlık, abonelik/Pro, iCloud eşitleme, cinsiyet seçeneği (#9), CSV dışa aktarma (yapılmadıysa).

### Özet sıra
v58 (Profil hızlı düzeltme) → v59 (Profil yeniden düzeni) → v60 (erişilebilirlik + belgeler) → Aşama 4 → Aşama 5 → Aşama 6 → Aşama 7.
