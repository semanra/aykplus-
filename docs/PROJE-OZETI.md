# AYK+ — Proje Özeti (dış inceleme için)

Son güncelleme: 10 Kasım 2026 · Uygulama sürümü **v22**

## 1. Uygulama nedir?

AYK+, tek bir kullanıcının kendi kişisel fitness uygulamasıdır (Türkçe). Dört bölümü var:

- **Beslenme:** makro takibi, öğün menüleri, besin veritabanı.
- **Antrenman:** set ve kilo kaydı.
- **Mobilite / esneme.**
- **İlerleme.**

Kullanım ortamı:

- **Platform:** iPhone ana ekranına eklenmiş bir **PWA** (web uygulaması). App Store uygulaması değildir. Kullanıcının cihazları iPhone ve iPad; Mac yok.
- **Yayın:** GitHub Pages. Depodaki `index.html` canlı uygulamadır.
- **Veri:** tamamen telefonda, `localStorage` içinde. Sunucu, hesap ve senkronizasyon yok; kullanıcı JSON yedek alır.
- **Çevrimdışı:** service worker (`sw.js`) dosyaları önbelleğe alır; spor salonunda internetsiz çalışır.

## 2. Mimari (Gemini'nin sorusuna cevap)

**React / React Native DEĞİL.** Uygulama **saf (vanilla) JavaScript**:

- Kaynak üç dosyaya bölünmüş durumda:

  | Dosya | Satır | İçerik |
  |---|---|---|
  | `src/markup.html` | ~1.050 | HTML iskeleti ve özel CSS |
  | `src/app.js` | ~6.000 | tüm uygulama mantığı |
  | `src/data.js` | ~500 | uygulamanın kendi besin listesi, hareket kütüphanesi, varsayılan durum |

- `scripts/build.mjs` bu üç dosyayı birleştirip Tailwind CSS'i (3.4.17, CDN yok) derler. Çıktı **tek bir `index.html`** dosyasıdır (~535 KB).
- `foods.js` ayrı bir veri dosyasıdır: ~1.800 USDA besini ve 124 Türk yemeği tarifi. `scripts/usda/` içindeki Python betikleri USDA FoodData Central SR Legacy verisinden üretir.
- **Tek global durum** nesnesi `state` vardır. Her değişiklikten sonra `renderAll()` çağrılır; tüm sekmeleri `innerHTML` ile yeniden çizer ve kaydeder. Sanal DOM yoktur.
- **Testler:** `tests/` altında 18 Playwright (Python) paketi var. Gerçek Chromium'da, iPhone boyutunda (375 px ve 320 px) çalışırlar.

## 3. Kesin kurallar (önerilerin bunlara uyması gerekir)

- **Veri güvenliği:**
  - Depolama anahtarı `ayk_plus_v5_state` asla değişmez.
  - Eski veri her zaman `normalizeState()` ile taşınır; kullanıcı verisi asla silinmez.
  - Besin değerleri asla tahmin edilmez; kaynak USDA'dır (kamu malı).
- **Kullanım:**
  - Dokunma alanı en az 44 px.
  - Giriş alanları 16 px (iOS büyütmesin diye).
  - Silmeler "Geri al" destekli.
- **iOS sınırları:**
  - Titreşim API'si yok.
  - Uygulama kapalıyken ses çalmaz.
  - Bildirimler sunucu gerektirir.
  - Apple Sağlık entegrasyonu web uygulamasıyla mümkün değil.
- **Kullanıcının istemedikleri:** ilerleme fotoğrafları, PR / sporcu kartı, vücut istatistik ekranı, sıralama tablosu, hazır program şablonları.

## 4. Özellikler

### Beslenme ("Emerald Obsidian" teması; koyu ve gündüz)

- **Sekmeler:** Bugün / Menülerim / Besinler / Geçmiş.
- **Menüler:** antrenman günü ve dinlenme günü için ayrı.
- **"Sadece bugün" mantığı:** Bugün ekranındaki değişiklik yalnızca o günü etkiler. İstenirse "Menüye de kaydet" seçilir.
- **Bugün ekranından yapılabilenler:** "Dışarıda yedim" (tahmini giriş), "Yarısını yedim", "Günü dengele".
- **Besin veritabanı (USDA, ~1.500 görünür besin):**
  - Akıllı Türkçe arama: Türkçe karakter, yazım hatası toleransı, eş anlamlılar.
  - Pişmiş hâller gizli; tutarlı hesap için çiğ tartılır.
  - Türkiye'de bulunmayan ABD ürünleri gizli.
- **Mutfak araçları:** kombo, tarif (pişmiş ağırlık üzerinden), dünkü öğünü tekrarla, haftalık alışveriş listesi.
- **Barkod:** Open Food Facts'ten ürün gelir; tutarlılık kontrolünden geçer (kJ/kcal, ondalık hatası).
- **Hesaplama yardımları:**
  - Kalan hedefi kapatan öneriler.
  - Kiloya göre gramaj.
  - İkame ⇄: aynı kaloride alternatif.
- **Takip:**
  - Su ve takviyeler (zamana göre gruplu).
  - Lif ve tuz.
  - Protein dağılımı (öğün başına).
  - Geçmiş'te haftalık ortalama, hedef tutturma takvimi, haftalık kalori bütçesi.

### Antrenman (siyah zemin + turkuaz vurgu)

- **Program ve kayıt:**
  - Programım: günler ve hareketler, sürükle-bırak sıralama.
  - Aktif antrenman ekranı, set tamamlama, dinlenme sayacı.
- **Akıllı yardımlar:**
  - Kilo artırma önerisi.
  - Makine / dambıl kademeleri.
  - Plaka hesabı ve ısınma setleri.
- **Analiz:**
  - Hareket başına tahmini 1RM grafiği.
  - Vücut haritası: kas grubu başına haftalık set; 10–20 set bandı.
- **Hareket türleri:** kardiyo ve süreli hareketler.

### Diğer

- **Profil:** kişisel bilgiler, hedefler, ölçüler, ayarlar (gün geçişi saati dahil), yedekleme.
- **Mobilite ve İlerleme:** eski lacivert temada. Sıradaki iş, bunları yeni temaya taşımak.

## 5. Bilinen eksikler / sıradaki adaylar

- **Tema:** Mobilite ve İlerleme sekmeleri henüz yeni temada değil. Mobilite hâlâ sistem `prompt()` kutusu kullanıyor.
- **Antrenman:** set başına zorluk notu (RPE / RIR) yok. Yorgunluk / dinlenme haftası (deload) önerisi yok.
- **Beslenme:** uygulamanın eski kendi listesindeki besinlerde (simit, döner gibi porsiyonlu kayıtlar) lif/tuz verisi yok.
- **Kod yapısı:** `app.js` tek dosyada ~6.000 satır, bölümler yorum başlıklarıyla ayrılmış.

## 6. Dosyalar (zip içeriği)

| Klasör / dosya | İçerik |
|---|---|
| `src/` | Kaynak (HTML / CSS, JS, veri) |
| `scripts/` | Derleme betiği ve USDA veritabanı üreticisi |
| `tests/` | Playwright testleri (Python) |
| `docs/` | Planlar, besin listeleri, bu özet |
| `ekranlar/` | Güncel ekran görüntüleri (iPhone boyutu) |
| `foods.js` | Üretilmiş besin veritabanı |
| `sw.js`, `manifest.json`, `package.json` | PWA ve derleme dosyaları |
| `CLAUDE.md` | Projenin ayrıntılı geliştirici rehberi (mimari notlar) |

`node_modules/`, `.git/` ve derlenmiş `index.html` dahil edilmedi.
