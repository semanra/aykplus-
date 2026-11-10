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
src/data.js         ← Uygulamanın kendi besin listesi (BASE_FOOD_DB), hareket ve mobilite kütüphaneleri, varsayılan durum
foods.js            ← v18 USDA besin veritabanı (~1.800 besin + 124 Türk yemeği tarifi). ÜRETİLİR, elle düzenleme (scripts/usda/)
scripts/usda/       ← foods.js üreticisi: extract.py, build_foods.py, tr/*.json (Türkçe adlar, tarifler), README.md
src/tailwind.css    ← Tailwind girişi
scripts/build.mjs   ← Derleme betiği
tests/              ← Playwright (Python) test paketleri
```

## 3. Derleme ve test

```bash
npm install          # ilk seferde (tailwindcss 3.4.17)
npm run build        # src/* → index.html  (Tailwind sınıfları build/pre.html taranarak derlenir)
pip install playwright && python3 -m playwright install chromium   # ilk seferde
npm test             # 14 test paketi, gerçek Chromium'da iPhone boyutunda; hepsi geçmeli
```

- Tailwind **CDN kullanılmaz**; sınıflar derleme sırasında üretilir. Bu yüzden sınıf adlarını JS içinde **tam ve sabit metin** olarak yaz (`"bg-" + renk` gibi dinamik birleştirme ÇALIŞMAZ). Rastgele değerler (`bg-[#141416]`, `text-[13px]`) kullanılabilir.
- Testler `tests/shots/` klasörüne ekran görüntüsü kaydeder (git'e girmez). Görsel değişikliklerde bu görüntülere bakıp kontrol et.
- Testler açılış animasyonunu (splash) bir başlangıç betiğiyle atlar; yeni testlerde de aynı `add_init_script` satırını kullan.

## 4. Sürüm çıkarma kontrol listesi (her değişiklikte)

1. `src/` altında değişikliği yap.
2. Yeni özellik için `tests/` altına test ekle veya mevcut testi güncelle.
3. `src/markup.html` içindeki sürüm etiketini artır: `AYK+ vN` (Ayarlar'ın en altında görünür).
4. `sw.js` içindeki `const CACHE = 'aykplus-vN'` değerini artır (artırılmazsa telefon eski sürümü göstermeye devam edebilir). Yeni statik dosya eklediysen `FILES` listesine ekle.
5. `npm run build` → `npm test` (hepsi geçmeli). Derleme çıktısında "✓ index.html oluşturuldu" yazdığını kontrol et (sözdizimi hatasında derleme durur ve eski index.html kalır).
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
- **Onay / metin girişi:** Antrenman ve Profil tarafında `prompt/confirm/alert` KULLANMA; temalı `uiAsk({title, message, input, ok, cancel, danger})` (Promise döner), `uiAlert()`, bağlama göre `askConfirm()` / `sayAlert()` kullan. Beslenme ve Mobilite tarafı şimdilik sistem kutularını kullanıyor (beslenme için temalı kutulara geçiş Aşama 2 adayı).
- **Dil:** Arayüz metinleri doğru Türkçe yazılır ("antrenman", "antreman" değil). Antrenman ve (v13'ten beri) beslenme sayfasında çizgi ikonlar (`svgI()`) kullanılır; besin/takviye adlarındaki kullanıcı emojilerine dokunulmaz.
- **iOS sınırları (çözmeye çalışma, kullanıcıya dürüstçe söyle):** titreşim API'si yok; uygulama kapalıyken sayaç sesi çalmaz; sessiz modda ses çıkmaz; bildirim sunucu ister; Apple Sağlık entegrasyonu web uygulamasıyla mümkün değil.

## 6. Mimari

- **Yeni tema pencereleri:** Ortak pencereler (`pickerModal`, `chartModal`, `customFoodModal`) `openModal()` ile açılırken `trainCtx()` (antrenman sekmesi veya Profil açık) doğruysa `.tm` sınıfı alır; `src/markup.html` içindeki `.tm` CSS kuralları eski renkleri yeni temaya çevirir ve başlıktaki emojiyi kaldırır. Beslenmeden açılınca eski temada kalır. `exerciseModal` yalnızca antrenmanda kullanıldığı için doğrudan yeni temada yazıldı (`t-in`, `t-seg`, `t-field`).
- **Beslenme (v13):** Beslenme sekmesindeyken `body.theme-nutri` (+ gündüz teması açıksa `nutri-light`; `state.settings.nutriLight`, üstteki `#nutriThemeBtn`). Renkler CSS değişkenleri (`--n-*`); `.n-hero` her iki temada koyu kalır. Ortak pencereler beslenmeden açılınca (`nutriCtx()`) `.nm` alır. Alt sekmeler `state.nutriView` = `today | menus | foods | history` (`setNutriView`), her biri `#nvToday/#nvMenus/#nvFoods/#nvHistory`:
  - **Bugün:** gün tipi (`#btnTrain/#btnRest`), kalori halkası (`#calRing`, `updateMacroCard`), su bardakları (`renderWater`), takviyeler (`#suppList`), zaman çizelgesi (`#todayMeals`, `[data-today-meal]`, daire = `toggleMealDone` onay kutusu). Yenmiş öğün tek satıra kapanır.
  - **Menülerim:** menü seçimi (`#mnTrain/#mnRest`), menü toplamı (`#menuTotal`), kilo/açık kartı, kiloya göre gramaj (`#scaleCard`), öğün listesi `#mealsContainer [data-meal-card]` (sürükle-bırak burada; öğün açılınca gramaj düzenleme, ⇄, kopyala/sil).
  - **Besinler:** hedef öğün (`foodUI.meal`, `goAddFood(mIdx)`), arama `#foodSearch` (statik; yeniden çizilmez), kategoriler, seçili besin kartı `#foodSelCard` (gramaj yazarken tam çizim YAPILMAZ: `foodAmtInput` → `updateFoodSelUI`), hazır porsiyonlar (`foodPresets`), barkod.
  - **Geçmiş:** `state.dailyLogs` + bugünün canlı özeti (`renderNutriHistory`).
  - Açık/kapalı öğün bilgisi kaydedilmez; öğün **kimliğiyle** tutulur (`openDoneMeals`, `openMenuMeals` Set). `normalizeState` kimliği olmayan öğünlere kimlik verir.
  - **İkame:** `SWAP_GROUPS` (aynı birimli, gram besin grupları); `openSwap` seçici penceresinde kaloriyi koruyan gramajlarla alternatifleri listeler, Geri al destekli.
  - **Kiloya göre gramaj:** `settings.scaleOn/scaleBase`; oran `scaleK()` = kilo/referans (0,7–1,3). Saklanan `item.amount` DEĞİŞMEZ; görünen/hesaplanan miktar `effAmount(item)` (yalnızca `g`/`ml` birimli besinler). Ekrandan girilen miktar `rawFromEff()` ile saklanır. `calcItemMacros` `effAmount` kullanır. "Sabitle" (`resetScaleBase`) görünen gramajları kayda yazar.
  - **Sadece bugün (v14):** Bugün ekranındaki değişiklikler menünün o güne ait kopyasında yapılır: `state.dayPlan = { date, train, rest }` (`ensureDayCopy()`, ilk değişiklikte oluşur). Erişim: `curMeals()` = **menü** (Menülerim, düzenleme), `dayMeals()` = **bugünkü plan** (Bugün, halka, yenen, arşiv, Geçmiş). `nutritionTotals(meals)` parametresiz çağrılınca bugünkü planı hesaplar. Besinler'de `foodUI.dest` = `day | menu`; `goAddFood(mIdx, dest)`, `openSwap(m, i, dest)`, `quickAdd(m, id, amt, list)`. Bugün kartındaki kalem düğmesi düzenleme modunu açar (`openEditMeals`): miktar, sil, "Yarısını yedim" (`halfMeal`), "Dışarıda yedim" (`openFreeMeal` → `#freeMealModal`). Farklılık bandı `#dayDiffBanner`: "Menüye de kaydet" (`saveDayToMenu`, dışarıda yenen öğünler yazılmaz) / "Menüdeki hâline dön" (`revertDayToMenu`). Gece yarısı `archiveDay` bugünkü planı arşivler, `resetDaily` kopyayı siler. Toplu işlemler (besin silme, gramaj sabitleme) `allMealLists()` kullanır.
  - **Tahmini giriş (v14):** öğe `{ foodId: "_est", amount: 1, est: { name, cal, p, c, f } }`; yalnızca bugünkü kopyada bulunur. `calcItemMacros` bunu tanır; diğer yerlerde `item.est` kontrolü yapılır. "Günü dengele" (`balanceDay`): yenmemiş öğünlerde, protein payı %40 altı ve 50 kcal üstü besinleri orantılı kısar (her besinden en fazla %75), kısılan miktar öğünde `m.balanced` olarak gösterilir.
  - **Etiket kalorisi (v14):** besinde isteğe bağlı `kcal` (birim başına) alanı varsa `kcalPerUnit()` onu kullanır, yoksa 4P+4K+9Y. Özel besin formunda "1 porsiyon" modu: değerler porsiyon gramına bölünüp saklanır, `serv` alanı tutulur. Barkod bulunamayınca `openLabelForm(code)` doğrudan açılır.
  - **Mutfak (v15):** Kombo `state.combos = [{ id, name, items }]` (ham miktarlar; `saveMealAsCombo(mIdx, dest)`, Besinler'de "Komboların" kategorisi, seçim `foodUI.sel = "combo:<id>"`, `addComboToMeal`). Tarif = özel besin `customFoods["custom_recipe_<id>"]` (`unit: "g"`, birim başına `kcal`, `recipe: { items, cooked }`; `#recipeModal`, `openRecipeModal`, `editCustomFood` tarifse tarif penceresini açar; malzeme seçici tarif penceresinin üstünde açılır, bu yüzden tarif/alışveriş pencereleri `z-[45]`). "Dünkü gibi" (`repeatLastMeal`): `archiveDay` öğün içeriklerini `dailyLogs[gün].meals` içine yazar (yalnızca son 7 gün). Alışveriş listesi (`#shopModal`, `shopList()`): antrenman menüsü × `shopTrainDays()` (varsayılan program gün sayısı) + dinlenme × kalan gün; tarifler malzemelerine açılır; işaretler `state.shopChecked`.
  - **Akıllı (v16):** Besinler'de `#foodSuggest` (`renderFoodSuggest`, `fillSuggestions`): kalan protein/kaloriyi kapatan 2–3 seçenek, yalnızca `frequentFoods()` (menüler, kombolar, son kullanılanlar, son 7 günün arşivi) içinden; miktar en fazla porsiyonun 2,5 katı (`maxSuggestAmt`). Arama yazılınca/besin seçilince gizlenir. Geçmiş'in başında `#weekCard` (`weekCardHtml`): 7 günlük ortalama (`logIntake`: tik varsa yenen, yoksa plan), hedef tutturma takvimi 7/30 gün (`state.nutriHistRange`, `hitClass`: ±%5 yeşil, ±%15 sarı), haftalık bütçe (`weekStats`, Pazartesi–Pazar), 7 günlük kilo ortalaması (`weightAvg7`, Menülerim'de `#weightAvgText`). Not: İlerleme sekmesinde ayrı bir `setHistRange` var; karıştırma.
  - **Takviye zamanı (v17):** `supplementList[i].time` = `morning | pre | post | bed | custom` (+ `timeLabel` özelde), `SUPP_TIMES` sırasıyla Bugün'de gruplanır; zamansızlar "Diğer"de. Düzenle modunda her satırda `select.n-in` (`setSuppTime`) ve çöp kutusu (`removeSupp`).
  - **Besin veritabanı (v18):** `foods.js` → `USDA_FOODS` (sıkıştırılmış anahtarlar) → açılışta `USDA_DB`'ye çevrilir (`unit: "g"`, birim başına `p/c/f/kcal`, `src` = fdcId | "tarif", `aliases`, `portions` [[ad, gram]], `kx` kalori istisnası, `note`). Kimlikler `u<fdcId>` ve `r_<tarif>`; `BASE_FOOD_DB` kimlikleri DEĞİŞMEZ. `getFoodDB()` birleşik tabloyu önbellekte tutar; `renderAll()` ve özel besin değişince `invalidateFoodDB()`. foods.js yüklenemezse uygulama eski listeyle çalışır. Arama: `searchFoods` (Türkçe karakter `normSearch`, kelime sırası serbest, `SEARCH_SYN` eş anlamlılar, `editDist` yazım hatası; sıra: sık kullanılan (adı eşleşirse) > tam > başlayan > içeren). Liste sayfalı (`FOOD_PAGE` = 60, "daha fazla"); seçici ilk 150. Sonuç yoksa `#noResult` (barkod / özel besin / tarif, ad aramadan dolar); bulunamayan aramalar `state.missSearches` (Profil → "Bulunamayan aramalar"). USDA porsiyonları kartta gram karşılığıyla (`foodPresets`); "cup" su bardağı değildir, "cup (ABD, 240 ml)" yazılır.
  - **Barkod:** `vendor/zxing.min.js` (@zxing/library 0.21.3, Apache-2.0, `sw.js` önbelleğinde) yalnızca barkod açılınca yüklenir. Ürün `fetchOFF()` ile Open Food Facts'ten gelir (internet gerekir; çevrimdışıyken uyarır). Eklenen ürün `customFoods["custom_bc_<barkod>"]` olur ve `barcode` alanı taşır; aynı barkod sonra internetsiz tanınır. Kamera açılamazsa numara elle yazılabilir.
- **Profil:** Üstteki profil düğmesi (`#profileBtn`) tam ekran `#profilePage`'i açar (eski Ayarlar penceresi kaldırıldı; `openSettings` = `openProfile`). Alan kimlikleri (`setAge`, `setBf`, `setRest`...) aynı. Kaydet: `saveSettings()` (`#profileSave`). Değişiklik varken Geri → uyarı. Kilo/hedef/ölçü kutuları `renderProfile()` ile `renderAll()` içinde güncellenir.
- **Üst başlık (v12):** Sol üstte logo yok; `#tabTitle` açık sekmenin adını yazar (`TAB_TITLES`, `applyTabVisibility()` içinde). Yanındaki `#brandTag` ("AYK+") yalnızca sayfa yüklenirken CSS animasyonuyla (`brandOut`, ~2,3 sn sonra) kayarak kaybolur; açılış animasyonu kapalıysa `html.no-brand` ile hiç gösterilmez. "Kaydedildi" yazısı kaldırıldı (kayıt hatası yine toast ile bildirilir).
- **Profil fotoğrafı (v12):** Eski "uygulama içi logo" alanı `state.customIconDataUrl` artık profil fotoğrafıdır; sağ üstteki `#profileBtn` içinde (`#profileAvatar`) ve Profil'de (`#pfAvatar`) görünür, yoksa kişi simgesi. Yüklenen fotoğraf `shrinkPhoto()` ile 320×320 JPEG'e küçültülür (localStorage dolmasın diye). Paylaşım kartı her zaman `icon.png` kullanır.
- **Sayaç:** Üst bardaki kronometre v11'de kaldırıldı; tek sayaç alttaki `#restPill` (set tamamlanınca / `startTimer()`).
- **Sürükle-bırak:** Tek `pointerdown/move/up` mantığı hem öğün kartlarını (`.drag-handle[data-midx]`, `#mealsContainer`) hem Programım'daki hareketleri (`.drag-handle[data-exidx]`, `#progExList [data-ex-row]`) taşır.
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

**Beslenme bölümü teması (v13, "Emerald Obsidian", uygulandı):** zemin `#050706`; kart `#0E1210` (çizgi `#1A211D`); yükseltilmiş `#151B18`; metin beyaz / `#94A3B8` / `#7C8A9E`; **vurgu zümrüt yeşili `#22C55E`**, dolu düğme `#16A34A` + beyaz yazı; özet kartı yeşil degrade (`.n-hero`). Makro renkleri: protein `#58B9F7`, karb `#E5B85B`, yağ `#E27C66`, su `#4EA8DE`, aşım `#FB7185`. Sınıflar `n-*` (bkz. `src/markup.html`). Kaynak: kullanıcının gönderdiği tasarım dosyası (`ayk_beslenme_tema_ux_st_dyosu.tsx`, 4 tema içeriyordu; Emerald Obsidian seçildi). Mobilite ve İlerleme hâlâ eski lacivert temada.

## 8. Kullanıcıyla çalışma şekli

- **Türkçe** yaz. Kullanıcı teknik değil; adım adım, net anlat.
- **Onay olmadan geliştirmeye başlama.** Önce planı/önerileri sun; kullanıcı "yap" dediğinde başla.
- Kullanıcı **hataya karşı çok hassas** ("hataya yer yok"). Her değişikliği test et; bulduğun hataları açıkça söyle.
- Kullanıcı özellikleri **gerçek kullanımda test edip** ekran görüntüsüyle geri bildirim verir.
- Kullanıcının **istemediği** şeyler: ilerleme fotoğrafları, sporcu/PR kartı, vücut istatistik ekranı (Lightweight'teki "Body"), sıralama tablosu (leaderboard), hazır program şablonları.

## 9. Yol haritası

Yapıldı (v6–v12): kardiyo/süreli hareketler, kalori koçu, kilo artırma önerisi, plaka/ısınma, kas grubu sayımı, planlanan/yenen, geri al, sıradaki gün, aktif antrenman, öğün menüleri (antrenman/dinlenme), takviyeler, vücut ölçüleri, paylaşım kartı, 42 Türk yemeği, su/beslenme grafikleri, açılış ekranı, yağ oranı, **makine/dambıl kademeleri**, **yeni antrenman teması + vücut haritası**, öğün saat ve sürükle-bırak, özel besin düzenle/sil. **v11:** Programım'da hareketleri sürükleyerek sıralama, antrenmandaki tüm pencereler ve onaylar yeni temada, vücut haritasında "Programım" kas yükü, üst kronometre kaldırıldı, Ayarlar → tam ekran Profil (kişisel bilgiler, kilo, hedefler, ölçüler, ayarlar). **v12:** sol üstte sekme adı + açılışta kayarak kaybolan AYK+, profil fotoğrafı (sağ üstte yuvarlak). **v13:** beslenme, kullanıcının gönderdiği tasarım dosyasına göre baştan: yeni tema, Bugün / Menülerim / Besinler / Geçmiş, ikame ⇄, hazır porsiyonlar, kiloya göre gramaj (aç/kapa), gündüz teması, barkod okuma (Open Food Facts).

**v14–v18 (10 Kasım 2026, tamamlandı):** "sadece bugün" + Dışarıda yedim/Günü dengele + barkod etiket formu (v14), kombo/tarif/dünkü öğün/alışveriş listesi (v15), kalan hedefi kapatan öneriler + haftalık görünüm (v16), takviye zamanları (v17), USDA veritabanı + akıllı arama (v18). Ayrıntı ve kararlar: `docs/PLAN-beslenme-v14-v18.md`. Kullanıcı çeviri listesini `docs/besin-veritabani-listesi.csv` üzerinden gözden geçirecek; düzeltme isterse `scripts/usda/tr/*.json` düzenlenip `build_foods.py` yeniden çalıştırılır.

**SONRAYA NOT (v14):** Etiket fotoğrafından besin değeri okuma (OCR). Safari'de yerleşik metin tanıma yok, ağır bir kütüphane gerekir ve Türkçe tablolarda hata payı yüksek; ileride yeniden değerlendirilecek. Şimdilik yapılmıyor.

Sıradaki adaylar (kullanıcı onayı gerekir):
- Pişmiş / çiğ dönüştürücü (v14–v18 planında madde 6; kullanıcı "şimdilik olmasın" dedi).
- Antrenman saatine göre öğün kaydırma (planda madde 9; kullanıcı "bu özellik olmasın" dedi).
- Beslenmede sistem kutuları (`prompt/confirm/alert`) yerine temalı kutular.
- Kas grubu sayımında ikincil kasların da sayılması (kullanıcı "sonra" dedi).
- "Akıllı öneri": makinede büyük kademe sıçramasında önce tekrar artırma (kullanıcı bu turda istemedi; tekrar sorulabilir).
- Mobilite sekmesinin geliştirilmesi, ilk açılış kurulum ekranı.

Tasarım taslağı (claude.ai tuvali): https://claude.ai/artifact/D1oHvwvwnFMnJULVg2fHhz
