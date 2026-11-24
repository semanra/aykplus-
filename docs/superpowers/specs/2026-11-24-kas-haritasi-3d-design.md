# v68 — 3D kas haritası, yeni kas grupları, animasyonlar (tasarım)

Tarih: 24 Kasım 2026 · Durum: kullanıcı listeyi onayladı ("Listeyi onaylıyorum", "devam et"), küçük kas listesi önerisini onayladı; belge plan ile birlikte son onaya sunulur.

## 1. Amaç ve neden

v67'deki paylaşım kartının düz kas haritası "göze batıyordu". Gemini Pro ile üretilen 3D görünümlü, renk anahtarlı vücut görseli
ve bizim işleme betiğimiz (`tasarimlar/_harita3d_v2.py`) kullanıcıyı çok memnun etti: "bu yeni ve güzel bir geliştirme oldu,
kullanabildiğimiz kadar kullanalım". v68 bu haritayı uygulamanın kas gösterilen her yerine taşır.

## 2. Hedefler

1. **Paylaşım kartı** (`31-paylasim.js`): düz harita (`img/kas-harita.png`) yerine 3D harita.
2. **Antrenman → Kütüphane "KAS YÜKÜ" haritası** (`10-antrenman-arayuzu.js`): `anatomy.jpg` + `BODY_POLYS` çokgenleri yerine 3D harita;
   kasa dokunma, seçim, Bu hafta / Bugün / Programım aynen çalışır.
3. **Yeni kas grupları:** Ön Kol, Boyun, İç Bacak, Kaval (haritada zaten ayrı bölge olarak var).
4. **Bitiş özeti** (`openFinishSummary`): küçük 3D harita; animasyon açıkken çalışan kaslar sırayla yanar.
5. **Paylaşım penceresi girişi:** yumuşak açılış; rekor kartında kısa parıltı.

## 3. Hedef dışı

- Mobilite sekmesinde lavanta harita (sıradaki sürüm: kaslara göre mobilite önerisi; çizici renk paleti parametreli yazılır, lavanta orada eklenir).
- İkincil kasların sayılması (kullanıcı daha önce "sonra" dedi).
- Dönen gerçek 3D model (Tripo ücretli, reddedildi).
- Boyun için kütüphaneye yeni hareket eklemek (yalnızca elle seçim ve ad kuralı).
- İlerleme sekmesine harita eklemek (oradaki kas listesi yeni grupları kendiliğinden gösterir, o kadar).

## 4. Kesin kurallar ve kısıtlar

- Kayıt değişmez: `ayk_plus_v5_state`, `DATA_VER` aynı (7). Yeni alan yok. `ex.muscle` ve geçmişteki `sess.muscle` Türkçe kayıt adı olarak kalır.
- Kas grubu otomatik tahmini **hesaplanan** bir değerdir; yeni kurallar eski oturumların hangi gruba sayıldığını değiştirebilir
  (örnek: Hip Adduction geçmişi "Arka Bacak & Kalça"dan "İç Bacak"a geçer). Elle seçilmiş `muscle` asla değişmez. Bu bilinçli; sürüm notunda yazılır.
- `MUSCLES` sırası korunur, yeni gruplar **sona** eklenir (`LIB_CAT_MUSCLE` indeksleri ve eski kod bozulmasın):
  `["Göğüs","Sırt","Omuz","Ön Bacak","Arka Bacak & Kalça","Kalf","Biceps","Triceps","Karın","Ön Kol","Boyun","İç Bacak","Kaval"]`.
- İngilizce: Ön Kol → Forearms, Boyun → Neck, İç Bacak → Adductors, Kaval → Tibialis. v47 sözlük bekçisi geçmeli.
- iOS Safari: canvas `ctx.filter` kullanılmaz (eski iOS'ta yok). Bulanıklık/ışıma `shadowBlur` veya küçült-büyüt ile.
- Animasyonlar `animOK()` ile korunur, `/* v68 ANİM: … */` etiketli; kapalıyken son hâl anında çizilir (testler `AYK_NO_ANIM`).
- Dokunma alanı ≥ 44 px; VoiceOver her kası bir kez okur.
- Çevrimdışı çalışır: yeni görseller `sw.js` `FILES` listesinde, kalıcı görsel önbelleği dalından hariç (v67'deki `kas-harita.png` gibi).
- İzinsiz ücretli işlem yok: kaynak görsel zaten elimizde (`tasarimlar/_paylasim/3d/kaynak-3d-gemini-tam.jpg`, Gemini Pro), yeni üretim gerekmez.

## 5. Yaklaşımlar

| | Yaklaşım | Artı | Eksi |
|---|---|---|---|
| **A (seçilen)** | Uygulamaya iki hafif dosya: **etiket** (her pikselin kası, paletli PNG) + **ışık** (gri tonlu gölge, WebP). Renk, yoğunluk, tema, seçim ve ışıma çalışma anında canvas'ta hesaplanır. | Tek kaynak her yerde; tema/yoğunluk/seçim/animasyon serbest; ~100 KB. | Piksel döngüsü (~1 M piksel) → sonuç önbelleğe alınmalı. |
| B | Her kas ve durum için hazır görseller | Çalışma anında hesap yok | Yüzlerce birleşim, MB'larca dosya, seçim/yoğunluk esnek değil. |
| C | 3D görselin üstüne eski gibi SVG çokgen + `mix-blend-mode` | Mevcut koda yakın | Çokgenler 3D şekle oturmaz; karışım modu parlak turkuazı söndürür (kullanıcının istediği "neon" olmaz). |

A seçildi: v67'deki etiket yaklaşımının ışıklı hâli; kullanıcının onayladığı görünüm doğrudan bu yöntemle üretildi.

## 6. Tasarım

### 6.1 Görsel üretimi (`scripts/gorsel/kas_3d.py`, `kas_harita.py`'nin yerine)

- Girdi: `tasarimlar/_paylasim/3d/kaynak-3d-gemini-tam.jpg` (repoya girer).
- Etiketleme `_harita3d_v2.py` ile aynı: tondan kas + konum kuralları (Karın alt → Kalf, Biceps bacakta → İç Bacak,
  Triceps/Göğüs alt bacakta → Kaval, Ön Kol boyunda → Boyun); kırıntı temizliği yalnız renkli piksellerde (ModeFilter 9);
  kenara bağlı olmayan koyu yarıklar zemin değil gövde.
- **Ek temizlik:** her kasın 150 pikselden küçük kopuk parçaları çevresindeki çoğunluk etikete katılır (kalan minik noktalar).
- Çıktılar (900 px genişlik, figür sınırına kırpılmış, aynı boyut):
  - `img/kas-3d-etiket.png`: paletli PNG; indeks 0 zemin, 1 gövde, 2… = `MUSCLES` sırasıyla 13 kas (indeks = `MUSCLES.indexOf(ad) + 2`).
  - `img/kas-3d-isik.webp`: gri ton, `SHADE` (grup başına 92. yüzdeliğe göre normalize ışık, 0…1,15 → 0…255 ölçekli, 1,15 = 255).
- Betik, bir de kontrol görseli yazar (`tasarimlar/_paylasim/3d/etiket-kontrol-uretim.png`, her kas ayrı renk).

### 6.2 Çizici (`src/app/32-kas-harita.js`, yeni dosya)

- `loadMuscleMap()` → Promise `{w, h, lab: Uint8Array, shade: Float32Array}`; iki görsel bir kez okunur, hata → `null` (çağıran haritasız çizer; v67 davranışı).
- `muscleLevel(sets, scale)` → 0…1. Ölçekler:
  - `"session"` (paylaşım kartı, bitiş özeti, Antrenman "Bugün"): `clamp((sets − 1) / 7)` → 1 set = 0, 8+ set = 1.
  - `"week"` (Antrenman "Bu hafta" / "Programım"): `clamp((sets − 1) / 19)` → 20+ set = 1 (haftalık 10–20 öneri bandına uygun).
  - 0 set = çalışılmadı (boşta rengi).
- `MAP_THEMES` (renkler 0–255; onaylanan önizlemeden):
  - `dark`: gövde (56,56,64), boşta (87,87,97), turkuaz düşük (6,112,104), yüksek (24,236,214), vurgu (185,255,248), ışıma (24,236,214) güç 1,0; zemin saydam.
  - `light` (**Aydınlık 3**): gövde (230,230,235), boşta (184,184,196), düşük (0,110,100), yüksek (0,196,178), vurgu (120,245,232), ışıma güç 0,6,
    figür konturu (140,140,153) ~4 px, altta yumuşak gölge siyah %22.
  - `clear` (çıkartma/fotoğraf şablonu): gövde beyaz %27, boşta beyaz %47, kaslar dark turkuazı, ışıma 1,0.
- Piksel kuralı (önizlemedeki ile aynı): boşta/gövde = renk × ışık; çalışan kas `c = düşük + (yüksek − düşük) × seviye`,
  `col = c × (0,86 + 0,24 L)`, yarık koyultma `× (1 − 0,75 × clamp((0,62 − L)/0,32))`, parlama `clamp((L − 0,84)/0,30) × (0,30 + 0,35 × seviye)` vurgu rengine.
- Işıma: çalışan kas maskesi, kas başına alfa `0,35 + 0,65 × seviye`; `shadowBlur` ile figürün arkasına (yarıçap ≈ yükseklik / 60).
- Seçili kas (Antrenman): o kasın kenar pikselleri ~3 px kontur; koyu temada beyaz, aydınlıkta koyu (#18181B) — beyaz açık figürde görünmez (kurucu kararı).
- `paintMuscleMap3d(muscles, {theme, scale, selected})` → canvas. Aynı anahtar (kaslar + tema + ölçek + seçim) için son sonuç önbellekte;
  Antrenman her `renderAll`'da yeniden hesaplamaz.
- `muscleAt(x, y, r)` (görsel koordinatı) → kas adı; gövde/zemindeyse `r` yarıçapta en yakın kas, yoksa `null`. Antrenman `r`'yi **22 CSS px** karşılığı verir
  (340 px kutuda ≈ 58 görsel px), Boyun/Kaval gibi küçük kaslar da parmakla seçilebilsin (kurucu kararı).

### 6.3 Paylaşım kartı

- `paintMuscleMap` / `MAP_KEYS` / `MAP_PALS` / `loadMuscleLabels` kaldırılır, `paintMuscleMap3d(data.muscles, {theme: kart teması | "clear", scale: "session"})` kullanılır.
- `img/kas-harita.png`, `scripts/gorsel/kas_harita.py` silinir; `sw.js` listesi güncellenir.
- Kart yerleşimi değişmez (harita kutusu oranı yeni görsele göre ayarlanır; taşma testi v67'deki gibi).

### 6.4 Antrenman "KAS YÜKÜ"

- `<img anatomy.jpg>` + SVG yerine `<canvas>` (aynı kutu: en fazla 340 px genişlik, oran yeni görselden); ÖN/ARKA yazıları kalır.
- Dokunma: `pointerup` → `muscleAt` → `selectMuscle(ad)`; boş yere dokunma bir şey yapmaz.
- "Bugün" görünümünde de haritanın altında 44 px'lik kas satırları gösterilir (yalnız o gün set yapılan kaslar), küçük kas haritada ıskalanırsa satırdan seçilir (kurucu kararı).
- VoiceOver: haritanın altında görsel olarak gizli (sr-only) her kas için bir düğme (`aria-pressed`), harita `role="img"` + açıklama.
- Lejant: 0 / 1–9 / 10–20 / 20+ kutuları yeni renklerden (boşta, düşük, orta, yüksek) — "Bugün" görünümünde 1 / 2–4 / 5–7 / 8+.
- Aydınlıkta `anatomy-light.webp` CSS kuralı kalkar; kart arka planı `--t-surface`, harita `light` temasıyla.
- `BODY_POLYS`, `heatColor`, `anatomy.jpg`, `anatomy-light.webp`, `scripts/anatomy_light.py` kullanılmaz hâle gelir: kod silinir,
  görseller `sw.js`'ten çıkar. **`anatomy.jpg` repoda kalır** (kullanıcının kendi eseri), yalnız yüklenmez.

### 6.5 Yeni kas grupları

- `MUSCLES` sonuna 4 grup; `#exMuscle` seçicisine 4 seçenek (`src/markup.html`).
- Tek tek kütüphane eşlemesi (`LIB_MUSCLE_OVERRIDE`, kategori eşlemesinin üstüne): Wrist Curl, Reverse Wrist Curl,
  Reverse Barbell / Cable Curl → Ön Kol; Hip Adduction Machine → İç Bacak; Tibialis Raise → Kaval.
- `MUSCLE_RULES` başına: Kaval `/tibialis|kaval/`, İç Bacak `/adduct|iç bacak|copenhagen/`, Ön Kol `/wrist|bilek|forearm|farmer|ön kol|reverse (barbell |cable |ez-bar )?curl/`,
  Boyun `/neck|boyun/`; Kalf ve Biceps kurallarından çakışan parçalar (`tibialis`, `ön kol`) çıkar, Arka Bacak'tan `adduct` çıkar.
- Haftalık sayım ve paylaşım kartının çalışan kas satırı yeni grupları kendiliğinden sayar/gösterir.
- **Listelerde küçük kaslar (kullanıcı kararı, 24 Kasım 2026):** `MINOR_MUSCLES = ["Ön Kol","Boyun","İç Bacak","Kaval"]`. Antrenman "KAS YÜKÜ" satırları
  (Bu hafta / Programım / Bugün) ve İlerleme "Bu hafta kas başına set" listesinde bu dört kas **yalnız set sayısı > 0 ise** görünür ve yanında yalnız
  set sayısı yazar; "yok / az / ideal / yüksek" yorumu ve 10–20 bandı **yok**. Haritada her zaman vardır (çalışıldıysa turkuaz).
  Haritada seçilen küçük kas 0 setteyse seçim kartı "henüz çalışılmadı" der (yorum değil, durum).

### 6.6 Bitiş özeti

- İstatistik kutularının altında küçük harita (yükseklik ~180 px, ön + arka), `scale: "session"`, pencere temasına göre dark/light.
- Hiç ağırlık/süre seti yoksa (yalnız kardiyo) harita çıkmaz.
- `/* v68 ANİM */`: kaslar set sayısı büyükten küçüğe, 160 ms arayla boşta renginden kendi rengine 350 ms'de geçer, ışıma ile birlikte; toplam ≤ 1,5 sn.
  Kapalıyken son hâl.

### 6.7 Paylaşım penceresi animasyonu

- `/* v68 ANİM */`: pencere açılırken önizleme 0,96 → 1 ölçek + saydamlık 220 ms; rekor şablonu ilk gösterildiğinde rekor değerinin üstünden bir kez parıltı geçer (CSS, ~700 ms).
  Paylaşılan görsel (canvas) animasyondan etkilenmez.

## 7. Test

- Yeni `tests/test_v68_kas3d.py` (kendi portu):
  1. `MUSCLES` 13 grup, sıra; `autoMuscle` örnekleri (Wrist Curl → Ön Kol, Hip Adduction → İç Bacak, Tibialis Raise → Kaval, Neck Curl → Boyun, Seated Calf Raise → Kalf, Hammer Curl → Biceps).
  2. Eski kayıt: elle `muscle: "Kalf"` verilmiş Tibialis Raise "Kalf" sayılır; kaydın kendisi değişmez (`aykStoredState`).
  3. Çizici: çalışan kasın piksel ortalaması turkuaz tonda ve 8 sette 1 settekinden parlak; çalışılmayan kas gri; `light` temada figür kenarında kontur.
  4. Antrenman haritası: kasın üstüne tıklama → `state.libMuscle`; sr-only düğmeler 13 adet; aydınlık temada `anatomy-light` yüklenmez.
  5. Bitiş özeti haritası var; yalnız kardiyoda yok; `AYK_NO_ANIM` ile son hâl.
  6. Harita görseli 404 → paylaşım kartı ve Antrenman haritasız ama hatasız (v67 7. bölümün karşılığı).
  7. İngilizce: yeni grup adları çevrili.
- v67, v48, v61, v31, v11, v12, v47, v63 testlerinin harita varsayımları güncellenir. `kontrol` ekranları (paylaşım, kütüphane) yeniden çekilir.
- `bozuk_veri.py`, `html_enjeksiyon.py` (`ex.muscle` alanı yeni değerleri alabilir).
- Chromium + WebKit tam paket, `kontrol -- --hizli`.

## 8. Kurucuya bırakılanlar

- Canvas'ın piksel yoğunluğu (cihaz piksel oranı), önbellek anahtarının biçimi, sr-only düğmelerin yerleşimi.
- Lejant kutularının kesin renk tonları (çiziciden türetilir).
- Bitiş özetinde haritanın yatay mı (ön/arka yan yana) yoksa tek parça mı yerleştirileceği — önizlemedeki gibi yan yana.
