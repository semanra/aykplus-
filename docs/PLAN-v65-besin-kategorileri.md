# v65 — Besinler: kategori ve filtre düzenlemesi (yol haritası 1. bölüm, 2. madde)

23 Kasım 2026. Kullanıcı bilgisayar başında değildi; "sıradaki işine bana sormadan geçebilirsin" dedi.
Bu yüzden plan + kod yapıldı, **yalnızca bilgisayarda commit edildi, telefona gönderilmedi (push yok)**.
Kullanıcı bakıp onaylayınca yayınlanır; istemediği bir şey varsa değiştirilir.

## 1. Mevcut durum (analiz)

Besinler ekranındaki kategori şeridi (`#foodCats`) iki kaynaktan oluşuyordu:

| Kaynak | Kategori sayısı | Görünen besin |
|---|---|---|
| Uygulamanın kendi listesi (`BASE_FOOD_DB`, `src/data.js`) | 7 (ör. "Protein & Kahvaltı", "Karbonhidratlar", "🍔 Esnek Diyet / Dışarıdan") | ~89 (bazıları gizli, USDA karşılığı var) |
| USDA + Türk yemekleri (`foods.js`) | 25 | 1.491 (334 pişmiş hâl gizli) |

Ayrıca özel çipler: Son kullanılanlar, Komboların, Tariflerim, Özel eklediklerim.

Sorunlar:
- Yatayda kayan **~36 çip**; aradığını bulmak zor.
- Aynı şey iki kez: "Et / Tavuk / Balık" (kendi liste) + "Kırmızı et", "Tavuk ve hindi", "Balık ve deniz ürünleri" (USDA); "Yeşillik & Sebzeler" + "Sebzeler"; "🇹🇷 Türk Mutfağı" + "Türk yemekleri (tarif)".
- Kendi listenin kategorileri karışık: "Karbonhidratlar" içinde muz, elma, patates; "Protein & Kahvaltı" içinde whey ve hindi füme; "Kuruyemiş & Sağlıklı Yağlar" içinde avokado ve zeytin.
- Favori yok; "yüksek protein / düşük kalori" süzgeci yok.
- Arama sonuçları düz liste (hangi grupta olduğu görünmüyor).

## 2. Yeni yapı

**Kayıtta hiçbir şey değişmez:** besin kimlikleri, `cat` alanları, `foods.js` aynen kalır. Yeni yapı yalnızca **gösterim eşlemesi**
(`FOOD_GROUPS`, `FOOD_CAT_GROUP`, `FOOD_ID_GROUP` → `foodGroupOf(id, f)`, `src/app/12-besin-veritabani.js`).

14 grup (sırasıyla):

| Grup | İçine girenler |
|---|---|
| Et, tavuk ve balık | Kırmızı et, Tavuk ve hindi, Balık ve deniz ürünleri, Sakatat, Şarküteri, Et / Tavuk / Balık, hindi füme |
| Süt ürünleri ve yumurta | Süt ürünleri, Peynirler, Yumurta, Protein & Kahvaltı (yumurta, lor, süzme yoğurt, kefir) |
| Tahıllar ve ekmek | Tahıllar ve makarna, Ekmek ve hamur işleri, Kahvaltılık gevrekler, Karbonhidratlar (pirinç, yulaf, bulgur, ekmek…) |
| Baklagiller | Baklagiller |
| Sebzeler | Sebzeler, Yeşillik & Sebzeler, patates, tatlı patates |
| Meyveler | Meyveler, muz, yeşil elma, avokado |
| Kuruyemiş ve yağlar | Kuruyemiş ve tohumlar, Yağlar, Kuruyemiş & Sağlıklı Yağlar |
| Kahvaltılıklar | Kahvaltılıklar (zeytin, bal, reçel…), zeytin |
| Atıştırmalık ve tatlılar | Atıştırmalıklar, Tatlılar |
| İçecekler | İçecekler (3. maddede markalı içecekler buraya eklenecek) |
| Fast food ve hazır yemek | Hazır yemekler, Esnek Diyet / Dışarıdan (3. maddede zincir ürünleri buraya) |
| Türk mutfağı | Türk yemekleri (tarif), Türk Mutfağı |
| Sos, çorba ve baharat | Soslar ve çorbalar, Baharatlar |
| Takviyeler | Takviyeler, whey shake, greens tozu |

Bilinmeyen kategori → "Diğer" (yalnızca öyle bir besin varsa çip görünür). Kullanıcının kendi besinleri ve tarifleri
eskisi gibi kendi çiplerinde ("Özel eklediklerim", "Tariflerim").

**Çip sırası:** Tümü · Favoriler (varsa) · Son kullanılanlar (varsa) · Komboların · Tariflerim · Özel eklediklerim · 14 grup.
**36 → en fazla 20 çip.**

**Favoriler (yeni):** seçili besin kartında yıldız düğmesi (44 px, `toggleFavFood`, `aria-pressed`). Kayıt `state.favFoods`
(kimlik listesi; `normalizeState` varsayılan `[]`, metin olmayan/tekrarlı kimlikler atılır, en fazla 300). Eski kayıtta alan
yoksa boş liste; göç adımı gerekmez (yalnızca yeni alan). Özel besin silinince favorilerden de çıkar. Bulunamayan/gizli besin
listede gösterilmez (kayıttan silinmez).

**Süzgeçler (yeni):** kategori şeridinin altında iki aç/kapa çip: **Yüksek protein** (kalorisinin en az %30'u proteinden) ve
**Düşük kalori** (g/ml besinde 100 g'da en fazla 100 kcal; adet/ölçek gibi birimlerde 1 birimde en fazla 100 kcal). Her
kategoriyle ve aramayla birlikte çalışır; kaydedilmez (ekran açıkken geçerli).

**Arama sonuçları gruplu:** "Tümü"nde arama yapılınca ilk 5 sonuç "En iyi eşleşmeler" başlığı altında arama sırasıyla kalır
(tamamen gruplamak alaka sırasını bozuyordu: "tavuk göğsü" aramasında "Hindi göğsü" 3. sıraya çıkıyordu); kalanlar grup
başlıklarıyla bölünür (grup sırası gruptaki ilk sonuca göre, grup içinde arama sırası aynen). 5 veya daha az sonuçta ve kategori
seçiliyken başlık yok.

## 3. Kapsam dışı (bu sürümde yok)
- Markalı içecekler ve fast food ürünleri (yol haritası 3. madde, ayrı sürüm).
- Besin seçicide (menü/tarif malzeme seçici) kategori çipleri: oralarda arama var, değişmedi.

## 4. Test
`tests/test_v65_besin_kategori.py`: her görünür besin bir gruba düşüyor ("Diğer" yok), çip sayısı, grup süzme, favori ekle/çıkar
ve kayıt, eski kayıtta `favFoods` yok → `[]`, bozuk `favFoods` temizlenir, özel besin silinince favoriden çıkar, süzgeçler,
gruplu arama, İngilizce adlar, 44 px.
