# v67 — Antrenman paylaşım görselleri (tasarım)

Tarih: 24 Kasım 2026 · Durum: ONAYLANDI (24 Kasım 2026; rekor kartı + ay sırası eklendi) · Görsel tasarım: `tasarimlar/paylasim-A3.html` / `.png` (ONAYLANDI)

## 1. Amaç ve neden

Strava'daki gibi: antrenman bitince kullanıcı sonucunu Instagram hikâyesi / gönderisi, WhatsApp vb. ile paylaşabilsin.
Kullanıcı (sahip) "Strava gibi olsun" dedi; uygulama App Store'a çıkacağı için paylaşılan her görsel aynı zamanda AYK+'nın
tanıtımıdır ("bu hangi uygulama?" dedirtmeli). Yol haritasında "1 — web uygulamasında 5 yeni özellik"in 4. maddesi.

Bugün: tek bir paylaşım kartı var (`buildShareCanvas`, `src/app/09-kas-plaka-koc-takviye.js`): yalnız 1080×1350, yalnız koyu,
fotoğraf / şeffaf seçeneği ve kas haritası yok. Yeni özellik bunun yerine geçer; giriş noktaları aynı kalır:
antrenman bitiş özeti `#finShare` (`openFinishSummary`, `10-antrenman-arayuzu.js`) ve Geçmiş'teki paylaş düğmesi
(`openShareCard(i)`, `10-antrenman-arayuzu.js` ~602).

## 2. Hedefler / hedef olmayanlar / kesin istenmeyenler

Hedefler
- Strava akışı: "Paylaş" → önizleme + kaydırılan şablonlar → boyut / tema / istatistik seçimi → iOS paylaşım menüsü.
- 5 şablon: **Kas haritası**, **Rekor** (yalnız rekor varsa), **Fotoğraf üstü**, **Şeffaf çıkartma**, **Hareket listesi**.
- 2 boyut: **Hikâye 1080×1920**, **Gönderi 1080×1350** (her şablonda).
- **Koyu / Aydınlık** (kas haritası ve liste şablonunda; fotoğraf ve çıkartma her zaman açık yazı + gölge).
- İstatistik aç/kapa: Süre, Tonaj, Set, Rekor, (varsa) Kardiyo; en az biri açık kalır.
- Çevrimdışı çalışır (spor salonunda internet yok), sunucu yok, ek kütüphane yok.
- TR + EN, metrik + imperial (mevcut `t()`, `wRaw`/`wUnit`/`fmtWNum` yardımcılarıyla).

Hedef olmayanlar (bu sürümde yok)
- Mobilite seansı paylaşımı (kullanıcı seçimi: yalnız antrenman, "A"), beslenme günü paylaşımı.
- Video / animasyonlu paylaşım; Instagram'a doğrudan hikâye API'si (PWA'da yok; Aşama 4 Capacitor'da yeniden bakılabilir).

Kesin istenmeyenler (olursa özellik başarısız sayılır)
- Seçilen fotoğrafın kaydedilmesi (state'e, IndexedDB'ye, önbelleğe, yedeğe) — yalnızca bellekte, pencere kapanınca bırakılır.
- Kişisel bilgi: kilo, hedef kilo, ölçü, yaş, boy, yağ oranı, ad, profil fotoğrafı HİÇBİR şablonda yok.
- Hangi kasın çalıştığını okunmaz yapan süsler (bütün vücudun parlaması, radar ızgarası, hız çizgileri — yapay zekâ
  önerilerinden bilinçli olarak alınmadı).
- Sosyal ağ / akış / beğeni (CLAUDE.md §8).

## 3. Yaklaşımlar

| Yol | Artı | Eksi | Karar |
|---|---|---|---|
| **Canvas 2D ile telefonda çizim** (bugünkü kartın yöntemi) | çevrimdışı, ek dosya yok, piksel denetimi tam, testleri var | her şablon elle çizilir | **SEÇİLDİ** |
| HTML'den görsele kütüphane (html2canvas vb.) | HTML/CSS ile tasarım kolay | ~45 KB+ kütüphane, iOS'ta yazı tipi/filtre sorunları, `transform: skew` ve `mix-blend` hatalı | elendi |
| Sunucuda üretim | — | sunucu yok, gizlilik | elendi |

Görsel tarz: önerilen A / B / C'den kullanıcı **A**'yı seçti; kas haritası "göze batıyor" dedi → Gemini Pro'ya sade,
düz renkli harita ürettirildi (ChatGPT'ninki kaba çıktı); sonra Gemini + ChatGPT'den eleştiri ve tema önerisi alındı,
seçilenlerle **A3** oluştu ve onaylandı.

## 4. Kararlaştırılan tasarım (A3)

Ölçüler 1080 genişlik pikselinde; tam yerleşim `tasarimlar/_uret_paylasim.py` içindeki `A3_*` işlevlerinde (HTML taslak —
uygulamada aynı yerleşim Canvas'ta yeniden çizilir; taslak birebir piksel referansıdır).

Ortak dil
- Zemin saf siyah `#000` (aydınlıkta `#F4F4F5`), tek vurgu turkuaz `#1FD1C1` (aydınlıkta `#0E7C72`), başlık/sayılar AYKDisplay
  (eğik kalın), diğer yazılar sistem yazı tipi, etiketler italik.
- Üstte yalnız **"AYK+" yazısı** (`scripts/simge/ayk-yazi.svg` ile aynı görünüm; simge resmi YOK — logo tekrarı kaldırıldı) + sağda tarih.
- "Antrenman tamamlandı" etiketi: önünde eğik turkuaz çubuk; altında gün adı (büyük harf, `upperL`) + altında soldan
  sağa solan turkuaz çizgi.
- İstatistikler **tek eğik panelde** (−8° eğik, turkuaz ince kenar + hafif dış ışık, yarı saydam koyu dolgu), hücreler arası
  ince turkuaz ayraç; Rekor değeri turkuaz.
- Altta "— AYK+ ile kaydedildi —".

Şablonlar
1. **Kas haritası:** başlık bloğu, ortada kas haritası (arkasında hafif turkuaz ışık + üst-sağdan solan ince yay),
   altında "Çalışan kaslar: Göğüs • Omuz • Triceps", altında 2×2 istatistik paneli. Gönderi boyutunda harita solda, panel sağda tek sütun.
2. **Fotoğraf üstü:** seçilen fotoğraf tam boy (`object-fit: cover` karşılığı), alttan siyaha geçiş, sol üstte AYK+,
   sağda küçük şeffaf harita, solda etiket + gün adı, altta istatistik paneli, en altta tarih · çalışan kaslar.
   Fotoğraf seçilmeden önce bu şablonda "Fotoğraf seç" yer tutucusu görünür (paylaş düğmesi pasif).
3. **Şeffaf çıkartma:** zemin TAMAMEN şeffaf PNG; ortada AYK+, gün adı, 3 sütunlu panel (yarı saydam dolgu), küçük şeffaf harita;
   yazılara hafif gölge (her fotoğraf üstünde okunsun). Önizlemede damalı zemin.
4. **Hareket listesi:** başlık, sağ üstte küçük harita, 4 sütunlu yatay istatistik paneli, "HAREKETLER" ve satırlar
   (ad · set × tekrar · kilo), rekor kıran hareketlerde turkuaz yıldız ve turkuaz değer. Sığmayan satırlar "+N hareket daha".

5. **Rekor kartı** (kullanıcı onayı 24 Kasım, sonradan eklendi): yalnız o antrenmanda yıldızlı (bkz. §9-3) en az bir
   hareket varsa görünür, şablon sırasında 2. sıraya girer (Kas haritası → Rekor → Fotoğraf → Çıkartma → Liste).
   İçerik: AYK+ + tarih, eğik turkuaz çubuklu "YENİ REKOR" etiketi, hareket adı (büyük, AYKDisplay), rekor seti
   (`85 kg × 8`, çok büyük, turkuaz), altında "Tahmini 1RM ~105 kg" ve önceki en iyiye göre fark ("+5 kg"), birden çok
   rekorda "+N rekor daha" ve diğer hareket adları küçük; altta küçük kas haritası ve istatistik paneli. Gösterilen rekor:
   yıldızlı oturumlardan önceki en iyiye göre `e1rm` artışı yüzde olarak en büyük olan. Her iki boyut, koyu/aydınlık.
   Taslağı yok → A3 kurallarıyla türetilir, yayından önce ekran görüntüsü gösterilir.

**Ay sırası satırı** (kullanıcı onayı 24 Kasım): kas haritası, rekor ve liste kartlarında altta "AYK+ ile kaydedildi"nin
hemen üstünde küçük satır: "Kasım ayının 12. antrenmanı" (EN: "12th workout of November"; İngilizce sıra eki 1st/2nd/3rd/
11th–13th kuralıyla). Sayı = aynı takvim ayında `ts ≤ log.ts` olan `workoutLogs` adedi (eski antrenman paylaşılınca o günkü
sırası). İstatistik çiplerinde "Ay sırası" çipiyle kapatılabilir (varsayılan açık). Kişisel bilgi sayılmaz.

Sonraya bırakılanlar (kullanıcı kararı): kartta uygulama bağlantısı / QR (Aşama 6 mağaza), haftalık özet kartı (ayrı iş).

## 5. Kas haritası

- Kaynak: Gemini Pro'nun renk anahtarlı görseli `tasarimlar/_paylasim/kaynak-gemini.jpg` (her kas grubu ayrı düz renk;
  kırmızı Göğüs, sarı Omuz, mavi Biceps, eflatun Triceps, turuncu Karın, yeşil Ön Bacak, camgöbeği Sırt, mor Arka Bacak & Kalça,
  kahverengi Kalf, gri gövde, siyah boşluk). Önden görünümde baldır yok (anatomik olarak arkada); kabul edildi.
- Üretim betiği `scripts/gorsel/kas_harita.py` (bugünkü `tasarimlar/_harita_isle.py`'den taşınır): her pikseli en yakın
  anahtar renge atar → **etiket görseli** `img/kas-harita.png` (az renkli/dizinli PNG, renkler okunabilsin diye anahtar
  renkler korunur; hedef < 150 KB, genişlik ~900 px). Etiket numaraları uygulamadaki `MUSCLES` adlarına sabit tabloyla bağlanır.
- Uygulamada: görsel bir kez yüklenir, `getImageData` ile etiketler okunur; her paylaşımda kasa göre boyanır:
  gövde, çalışmayan kas, çalışan kas (yoğunluk = 0,55 + 0,45 × set / en çok set; koyu turkuazdan parlak turkuaza).
  Üç boya takımı: koyu, aydınlık, şeffaf (fotoğraf/çıkartma: gövde ve boş kaslar yarı saydam beyaz). Kenar yumuşaklığı:
  büyük boyda boyanıp küçültülerek çizilir.
- Kas başına set sayısı: o antrenmanın oturumları (`state.exerciseHistory[*]` içinde `sess.logId === log.id`), grup
  `sess.muscle` yoksa `autoMuscle(sess.name)`; kardiyo sayılmaz. Hiç kas yoksa (yalnız kardiyo) harita tamamen gri,
  "Çalışan kaslar" satırı çizilmez ve açılışta varsayılan şablon **Hareket listesi** olur.
- `sw.js` `FILES` listesine `./img/kas-harita.png` eklenir (çevrimdışı ilk paylaşımda da olsun).

## 6. Paylaşım ekranı (akış)

Tam ekran alttan açılan pencere (mevcut `openModal` / `.tm` teması; `chartModal` yerine yeni `#shareModal`):

```
┌──────────────────────────────┐
│ Paylaş                    ✕  │
│  ┌────────┐                  │  önizleme (seçili şablon, 9:16 veya 4:5)
│  │ kart   │  ← kaydır →       │  yatay kaydırma = şablon değiştirir
│  └────────┘                  │
│  ● ○ ○ ○   Kas haritası      │  sayfa noktaları + şablon adı
│ [Hikâye | Gönderi]           │
│ [Koyu | Aydınlık]            │  (fotoğraf/çıkartmada gizli)
│ (Süre)(Tonaj)(Set)(Rekor)    │  istatistik çipleri
│ [Fotoğraf seç]               │  (yalnız fotoğraf şablonunda)
│ [   Paylaş   ] [Kopyala]     │  Kopyala yalnız çıkartmada
└──────────────────────────────┘
```

- Dokunma alanları ≥ 44 px; şablonlar ayrıca sayfa noktalarına dokunarak da seçilir (VoiceOver için düğme, `aria-label`).
- **Paylaş:** `navigator.share({ files: [png] })`; desteklenmiyorsa indirme (bugünkü `shareWorkoutCard` yedeği aynen).
- **Kopyala (çıkartma):** `navigator.clipboard.write([new ClipboardItem({'image/png': blob})])` → "Kopyalandı. Instagram
  hikâyesinde yapıştır." Desteklenmiyorsa düğme gizli. (Instagram'ın şeffaflığı koruması iPhone'da kullanıcıyla denenecek;
  korumuyorsa not düşülür, sorun sayılmaz.)
- **Fotoğraf seç:** gizli `<input type="file" accept="image/*">`; `createImageBitmap` / `Image` ile belleğe; pencere
  kapanınca `URL.revokeObjectURL` ve referans `null`. EXIF yönü: `createImageBitmap(file, { imageOrientation: "from-image" })`
  (desteklenmezse `Image` — iOS Safari yönü kendisi uygular).
- Seçimler (şablon, boyut, tema, istatistikler) hatırlanır: `state.settings.share = { tpl, size, theme, stats: {...} }`,
  `normalizeState` varsayılanı `{ tpl: "map", size: "story", theme: "dark", stats: tümü açık }`; bozuk değer varsayılana döner.
  Veri sürümü değişmez (yeni isteğe bağlı alan). Fotoğraf asla bu nesneye girmez.
- Önizleme her değişiklikte yeniden çizilir (küçük boyda; paylaşırken tam boy). Çizim < 300 ms hedef.

## 7. Veri ve metin kuralları

- Yalnız okuma: paylaşım hiçbir kaydı değiştirmez (`settings.share` dışında).
- Rekor yıldızı (liste): o antrenmandaki ağırlık oturumunun en iyi tahmini 1RM'i (`e1rm`) aynı hareketin daha önceki bütün
  oturumlarından büyükse. Rekor sayısı paneli `log.prs` (bugünkü gibi).
- Tonaj `wRaw(log.volume)` + `wUnit()`, set satırı kilo `fmtWNum`; süre `fmtMinutes`; tarih `fmtDay(..., { day, month: "long", year })`.
- Uzun gün adı: yazı boyutu en küçük sınıra kadar küçülür, sonra `fitText` ile "…". Uzun hareket adı `fitText`.
- Bütün metinler `t()` ile; İngilizce karşılıklar `21-en-antrenman.js` sözlüğüne. Kas adları `muscleL`.
- Kullanıcı metni (gün/hareket adı) canvas'a düz yazılır (HTML değil); pencere HTML'inde `esc()`.

## 8. Testler ve kontrol

- Yeni `tests/test_v67_paylasim.py` (sıradaki boş port, örn. 8824; `ortak_tohum` `TEST_INIT`, `locale` açık):
  4 şablon × 2 boyut × (koyu/aydınlık) tuval boyutları; şeffaf çıkartmada köşe piksel alfa = 0; kas boyama (çalışan kas
  pikseli turkuaz, çalışmayan gri); kişisel bilgi taraması (tohumdaki kilo/ölçü/ad metinleri `fillText` çağrılarında YOK);
  istatistik kapatınca ilgili etiket çizilmiyor, sonuncusu kapatılamıyor; fotoğraf seçimi sonrası `state`/IndexedDB/
  localStorage'da görsel verisi yok; `settings.share` bozuk değer → varsayılan; eski kayıt (alan yok) sorunsuz; yalnız kardiyo
  antrenmanı; İngilizce + imperial metinler; 44 px dokunma alanları.
- Güncellenecek eski testler: `test_v12_baslik_foto.py` (kartta `icon.png` artık yok → AYK+ yazısı denetimi),
  `test_v52_son.py` ve `test_v53_birim.py` (pencere başlığı/düğme metni ve tuval metinleri yeni şablona göre),
  `test_v8_ozellikler.py` (Geçmiş'ten açma). `buildShareCanvas(log, opts)` adı korunur (varsayılan: kas haritası, hikâye, koyu).
- `test_v47_ingilizce.py` fonksiyon listesine yeni işlevler.
- Kontrol aracı (`scripts/kontrol/ortak.py`): paylaşım penceresi TR + EN ekranları; WebKit paketi de geçmeli.
- Sürüm: `AYK+ v67`, `sw.js` `aykplus-v67`; `docs/SURUM-GECMISI.md` notu; gizlilik sayfasına "paylaşım için seçilen
  fotoğraf yalnız cihazda işlenir, kaydedilmez" cümlesi (TR + EN).

## 9. Yapı kontrolünden çıkan kararlar (Claude'un kararları, kullanıcı belge okurken denetler)

1. **Değişen istatistik sayısı:** sıra her yerde Süre · Tonaj · Set · Rekor · Kardiyo. Değeri olmayan istatistik
   kendiliğinden gizlenir ve çipi pasif görünür: Süre 0 (eski kayıtlar), Rekor 0, Kardiyo 0. Panel açık + değerli
   istatistik sayısına (n) uyar: kas haritası hikâye n ≤ 3 → tek satır n sütun, n = 4 → 2×2, n = 5 → 3 + 2; gönderi tek
   sütun; çıkartma ilk 3 (sıraya göre); liste tek satır n sütun (sayı boyu n'ye göre küçülür). Hepsi gizliyse panel çizilmez.
2. **Taslakta olmayan boyut/tema birleşimleri** (fotoğraf/çıkartma/liste gönderi boyutu, aydınlık liste): A3 kurallarından
   türetilir (aynı bileşenler, aynı renk takımları); yayından önce bütün birleşimlerin ekran görüntüsü kullanıcıya gösterilir.
3. **Rekor:** panel `log.prs` (bitiş özeti ve Geçmiş ile aynı sayı). Liste yıldızı: o antrenmandan ÖNCEKİ (`ts < log.ts`)
   aynı hareket oturumlarının en iyi `e1rm`'ini geçen ağırlık oturumu; `log.prs` 0 ise hiç yıldız çizilmez (çelişki olmasın).
4. **Oturumu bağlanamayan eski antrenman** (`logId` eşleşmesi yok): harita gri, "Çalışan kaslar" satırı yok, Hareket
   listesi şablonu gizlenir (satırsız liste gösterilmez).
5. **Açılış şablonu:** hatırlanan şablon kazanır; ama "Fotoğraf üstü" hatırlanmaz (her seferinde fotoğraf seçme ekranıyla
   açılmasın) → kas haritası. Hatırlanan şablon o antrenmanda yoksa (liste gizli) kas haritası. Kas verisi olmayan
   antrenmanda, hatırlanan kas haritasıysa ve liste varsa liste ile açılır.

## 10. Uygulayıcıya kalanlar

- Canvas'ta eğik panel ve yay/ışık çizim tekniği (taslaktaki görünüme sadık kalmak şartıyla).
- `#shareModal` iç yerleşiminin ayrıntısı, kaydırma (scroll-snap) mi düğme mi — ikisi de olabilir, VoiceOver ile kullanılabilir olmalı.
- Kod dosyası: paylaşım kodu yeni `src/app/31-paylasim.js`'e taşınır (eski kart işlevleri oradan; sıra numarası yükleme
  sırasına uygun olmalı — `09`'daki yardımcılara bağımlı, `13` başlatmadan önce tanımlı olması yeterli).
