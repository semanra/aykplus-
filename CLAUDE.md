# AYK+ — Proje Rehberi (Claude için)

Bu dosya her oturumda okunur. Projeye başlamadan önce tamamını oku.

## 1. Proje nedir?

AYK+, kullanıcının kendi kişisel fitness uygulamasıdır: **beslenme (makro takibi), antrenman (set/kilo kaydı), mobilite/esneme ve ilerleme**. Türkçedir.

- **Platform:** iPhone'da ana ekrana eklenmiş bir PWA (web uygulaması). App Store uygulaması değildir.
- **Yayın:** Bu depo GitHub Pages ile yayınlanır. Depodaki `index.html` = canlı uygulama. `main` dalına gönderilen her değişiklik 1–2 dakika içinde kullanıcının telefonuna gelir.
- **Veri:** Tamamen telefonda, `localStorage` içinde. Sunucu, hesap, senkronizasyon yok. Kullanıcı Ayarlar → Yedek ile JSON yedek alır.
- **Çevrimdışı:** `sw.js` (service worker) dosyaları önbelleğe alır; spor salonunda internetsiz çalışır.
- **Kullanıcının cihazları:** iPhone ve iPad. **Mac yok.** iOS Safari davranışı her zaman öncelikli.

## 2. Dosya yapısı

```
index.html          ← DERLENMİŞ ÇIKTI. ASLA ELLE DÜZENLEME.
sw.js               ← Service worker (önbellek sürümü burada)
manifest.json, icon*.png, anatomy.jpg   ← Statik dosyalar
src/markup.html     ← HTML iskeleti + özel CSS + gömülü yazı tipi (AYKDisplay = Barlow Condensed 800 italik, OFL)
src/app.js          ← Tüm uygulama mantığı (~3.600 satır)
src/data.js         ← Besin veritabanı, hareket ve mobilite kütüphaneleri, varsayılan durum
src/tailwind.css    ← Tailwind girişi
scripts/build.mjs   ← Derleme betiği
tests/              ← Playwright (Python) test paketleri
```

## 3. Derleme ve test

```bash
npm install          # ilk seferde (tailwindcss 3.4.17)
npm run build        # src/* → index.html  (Tailwind sınıfları build/pre.html taranarak derlenir)
pip install playwright && python3 -m playwright install chromium   # ilk seferde
npm test             # 6 test paketi, gerçek Chromium'da iPhone boyutunda; hepsi geçmeli
```

- Tailwind **CDN kullanılmaz**; sınıflar derleme sırasında üretilir. Bu yüzden sınıf adlarını JS içinde **tam ve sabit metin** olarak yaz (`"bg-" + renk` gibi dinamik birleştirme ÇALIŞMAZ). Rastgele değerler (`bg-[#141416]`, `text-[13px]`) kullanılabilir.
- Testler `tests/shots/` klasörüne ekran görüntüsü kaydeder (git'e girmez). Görsel değişikliklerde bu görüntülere bakıp kontrol et.
- Testler açılış animasyonunu (splash) bir başlangıç betiğiyle atlar; yeni testlerde de aynı `add_init_script` satırını kullan.

## 4. Sürüm çıkarma kontrol listesi (her değişiklikte)

1. `src/` altında değişikliği yap.
2. Yeni özellik için `tests/` altına test ekle veya mevcut testi güncelle.
3. `src/markup.html` içindeki sürüm etiketini artır: `AYK+ vN` (Ayarlar'ın en altında görünür).
4. `sw.js` içindeki `const CACHE = 'aykplus-vN'` değerini artır (artırılmazsa telefon eski sürümü göstermeye devam edebilir). Yeni statik dosya eklediysen `FILES` listesine ekle.
5. `npm run build` → `npm test` (6/6 geçmeli).
6. Açıklayıcı Türkçe mesajla commit et ve `main`'e gönder.
7. Kullanıcıya kısa Türkçe özet yaz: ne değişti, telefonda ne yapması gerekiyor (genelde: "uygulamayı iki kez tamamen kapatıp aç").

## 5. Kesin kurallar

- **Depolama anahtarı `ayk_plus_v5_state` asla değişmez.** Yeni alanlar `normalizeState()` içinde varsayılan değerle eklenir; eski kullanıcı verisi her zaman göç ettirilir, asla silinmez.
- **Kullanıcı verisi kutsaldır.** Veri yapısını değiştiren her işte, eski formatla kaydedilmiş veriyle test yaz (bkz. `test_v6_temel.py` içindeki "legacy" tohum verisi).
- **Kullanıcı metni HTML'e eklenirken her zaman `esc()`** kullan. `onclick` içine metin geçirirken `esc(JSON.stringify(metin))` kalıbını kullan.
- **Sayılar:** Kullanıcı Türkçe ondalık virgül yazar. Okurken `num()`, gösterirken `fmtNum()` (1 ondalık) veya `fmtKg()` (2 ondalık; 1,25 kg plakalar için) kullan. Sayı girişleri `type="text" inputmode="decimal"`.
- **Dokunma alanı en az 44 px.** Buton ve ikonlar küçük olmamalı; kullanıcı bunu açıkça istedi.
- **Odak koruma:** Tam yeniden çizim (`renderAll()`) yapan girişlere `data-fk="benzersiz-anahtar"` ver; aksi halde iPhone'da klavye kapanır.
- **Silme işlemleri:** `snapshot()` → sil → `renderAll()` → `offerUndo("mesaj")` (6 sn "Geri al").
- **Dil:** Arayüz metinleri doğru Türkçe yazılır ("antrenman", "antreman" değil). Emojiler beslenme tarafında var; antrenman tarafında çizgi ikonlar (`svgI()`) kullanılır.
- **iOS sınırları (çözmeye çalışma, kullanıcıya dürüstçe söyle):** titreşim API'si yok; uygulama kapalıyken sayaç sesi çalmaz; sessiz modda ses çıkmaz; bildirim sunucu ister; Apple Sağlık entegrasyonu web uygulamasıyla mümkün değil.

## 6. Mimari

- **Tek global durum:** `state` (bkz. `normalizeState`). Her değişiklikten sonra `renderAll()` çağrılır; o da tüm sekmeleri çizer ve `saveState()` yapar.
- **Sekmeler:** `state.activeTab` = `nutrition | gym | mobility | progress`. Antrenman sekmesi seçiliyken `body.theme-train` sınıfı eklenir (siyah tema).
- **Antrenman alt görünümleri:** `state.gymView` = `today | program | library | history`; `state.gymActive` = aktif antrenman modu. Antrenman arayüzü tamamen `renderGym()` tarafından `#gymRoot` içine çizilir (v10 bölümü).
- **Öğün menüleri:** `state.meals` (antrenman günü) ve `state.restMeals` (dinlenme günü); her zaman `curMeals()` ile eriş. Öğünlerin isteğe bağlı `time` alanı var (`placeByTime`).
- **Hareket modeli:** `ex.kind` = `weight | cardio | time`; `ex.sets[]`; isteğe bağlı `ex.muscle`, `ex.equip` (`plates | stack | dumbbell | bodyweight`), `ex.levels` (`{mode:"step",start,step,addon}` veya `{mode:"list",list,addon}`), `ex.inc`, `ex.rest`.
- **Geçmiş:** `state.exerciseHistory[exKey(ad)]` = oturum listesi; `state.workoutLogs`; `state.dailyLogs[YYYY-AA-GG]` (gece yarısı arşivi).
- **`app.js` bölümleri** (yorum başlıklarıyla): yardımcılar → durum → toast/modal → ses/ekran → sayaç → gün dönümü → sekmeler → beslenme → aramalı seçici → hareket modalı → geçmiş/rekor → (eski antrenman yardımcıları) → mobilite → SVG grafik → İlerleme → ayarlar → yedek → **v7** (kas grubu, kilo önerisi, plaka/ısınma, kalori koçu) → **v8** (geri al, sıradaki gün, öğün planları, takviyeler, ölçüler, paylaşım kartı) → **v9** (su/beslenme grafikleri) → **v10** (ekipman/kademeler, yeni antrenman arayüzü, öğün sıralama, özel besin düzenleme) → genel render → başlat.
- Not: "ANTRENMAN RENDER" bölümündeki `exRightHtml` gibi bazı eski yardımcılar artık kullanılmıyor; temizlik yaparken testlerle doğrula.

## 7. Tasarım

**Antrenman bölümü teması (onaylandı, uygulandı):** saf siyah zemin `#000`; yüzey `#141416`; yükseltilmiş `#1E1E21`; çizgi `#2A2A2E`; metin beyaz / `#A1A1AA` / `#8B8B93`; **tek vurgu rengi logodaki turkuaz `#1FD1C1`** (üzerindeki yazı `#00201D`). Başlık ve sayılar `t-display` (AYKDisplay). Yardımcı CSS sınıfları `t-*` (bkz. `src/markup.html`). Esin kaynağı Lightweight! uygulaması; ama birebir kopya değil, kendi kimliği var.

**Vücut haritası:** `anatomy.jpg` kullanıcının kendi ürettiği görseldir (yapay zekâ ile üretip düzenledi); kullanım hakkı onda. Kas bölgeleri `BODY_POLYS` içinde 765×1024 koordinatlarında; renk katmanı `mix-blend-mode: color` ile çizimin gölgesini korur.

**Beslenme bölümü:** Henüz eski (lacivert) tema. Kullanıcı ileride **ayrı bir tema** isteyecek; antrenmanla aynı olmayacak ama çok da farklı olmamalı, sade olmalı.

## 8. Kullanıcıyla çalışma şekli

- **Türkçe** yaz. Kullanıcı teknik değil; adım adım, net anlat.
- **Onay olmadan geliştirmeye başlama.** Önce planı/önerileri sun; kullanıcı "yap" dediğinde başla.
- Kullanıcı **hataya karşı çok hassas** ("hataya yer yok"). Her değişikliği test et; bulduğun hataları açıkça söyle.
- Kullanıcı özellikleri **gerçek kullanımda test edip** ekran görüntüsüyle geri bildirim verir.
- Kullanıcının **istemediği** şeyler: ilerleme fotoğrafları, sporcu/PR kartı, vücut istatistik ekranı (Lightweight'teki "Body"), sıralama tablosu (leaderboard), hazır program şablonları.

## 9. Yol haritası

Yapıldı (v6–v10): kardiyo/süreli hareketler, kalori koçu, kilo artırma önerisi, plaka/ısınma, kas grubu sayımı, planlanan/yenen, geri al, sıradaki gün, aktif antrenman, öğün menüleri (antrenman/dinlenme), takviyeler, vücut ölçüleri, paylaşım kartı, 42 Türk yemeği, su/beslenme grafikleri, açılış ekranı, yağ oranı, **makine/dambıl kademeleri**, **yeni antrenman teması + vücut haritası**, öğün saat ve sürükle-bırak, özel besin düzenle/sil.

Sıradaki adaylar (kullanıcı onayı gerekir):
- **Beslenme bölümü için yeni tema** (kullanıcı örnek uygulama gönderecek).
- Kas grubu sayımında ikincil kasların da sayılması (kullanıcı "sonra" dedi).
- "Akıllı öneri": makinede büyük kademe sıçramasında önce tekrar artırma (kullanıcı bu turda istemedi; tekrar sorulabilir).
- Mobilite sekmesinin geliştirilmesi, ilk açılış kurulum ekranı.

Tasarım taslağı (claude.ai tuvali): https://claude.ai/artifact/D1oHvwvwnFMnJULVg2fHhz
