# v66 — İçecekler (yol haritası 1. bölüm, 3. madde) — PLAN

**Karar (23 Kasım 2026, kullanıcı):** Fast food EKLENMEZ ("kesin olmayan bir şeyi koymayalım"); kullanıcı kendi ekler (barkod / özel besin). Yalnızca resmi değeri bulunabilen içecekler. Aşağıdaki C bölümü bu yüzden iptal.

23 Kasım 2026. v65'teki "İçecekler" ve "Fast food ve hazır yemek" gruplarına yeni ürünler eklenecek.

## 1. Kaynak araştırması (23 Kasım 2026)

| Ürün türü | Resmi Türkiye değeri var mı? | Not |
|---|---|---|
| Kola, gazoz, ice tea (Coca-Cola, Fanta, Sprite, Fuse Tea) | **Var**: coca-cola.com/tr ürün sayfaları (100 ml) | Coca-Cola 42 kcal, Zero 0,2 kcal / 100 ml |
| Pepsi, Yedigün, Lipton Ice Tea | Ambalaj etiketi / market sayfaları | Market sayfaları **tutarsız** (Pepsi 330 ml: 28 kcal, 250 ml: 43 kcal / 100 ml; Türkiye'de tarif farkı olabilir) → etiketten tek tek doğrulanmalı |
| Enerji içecekleri (Red Bull, Monster, Burn) | **Var**: redbull.com/tr-tr + etiket | Red Bull 46 kcal / 100 ml |
| Ayran, şalgam, meyve suları (markalı) | Etiket / üretici sitesi | Ayran ve şalgam genel değerle de eklenebilir |
| Kahve dükkânı içecekleri (Starbucks vb.) | **Yok**: Starbucks Türkiye resmi tablo yayınlamıyor (yalnız yurt dışı) | Markasız "kahve hesaplayıcı" öneriliyor (aşağıda) |
| McDonald's | Ürün sayfalarında olabilir; **doğrulanamadı** (arama bulamadı) | Siteye tarayıcıyla bakılmalı |
| Burger King, KFC, Popeyes, Domino's, Little Caesars | **Bulunamadı** (yalnız ABD / İngiltere / Almanya tabloları; Türkiye tarifi farklı olabilir) | ABD değeri Türkiye ürününe yazılmaz |

Kaynaklar: [Coca-Cola Türkiye](https://www.coca-cola.com/tr/tr/brands/coca-cola) · [Red Bull Türkiye](https://www.redbull.com/tr-tr/energydrink/products/red-bull-energy-drink-ingredients-list) · [Migros Pepsi 330 ml](https://www.migros.com.tr/pepsi-kola-kutu-330-ml-p-7a3927) · [Starbucks DE (yurt dışı tablo örneği)](https://www.starbucks.de/en/nutrition) · [karekod.org McDonald's TR derlemesi (üçüncü taraf, kullanılmaz)](https://www.karekod.org/blog/mcdonalds-besin-degerleri-2026-guncel-liste-hangi-burger-kac-kalori/)

**İlke:** Yalnızca üreticinin Türkiye için yayınladığı değer (site veya ambalaj etiketi) markalı ürün olarak girer. Kaynağı
bulunamayan markalı ürün EKLENMEZ; yerine markasız "yaklaşık" ürün (Türk yemekleri tariflerindeki gibi USDA malzemeleriyle hesap).
Her ürünün kaynağı ve kontrol tarihi kayıtta tutulur (kartta "Kaynak: … · 11.2026"), "değerler değişebilir" notu.

## 2. Önerilen kapsam

**A) Paketli içecekler (markalı, resmi değer):** ~25 ürün
- Coca-Cola, Coca-Cola Zero, Coca-Cola Light, Fanta, Sprite, Sprite Zero, Fuse Tea (şeftali, limon)
- Pepsi, Pepsi Zero, Yedigün, Lipton Ice Tea (şeftali, limon) — etiket doğrulanırsa
- Red Bull, Red Bull Sugarfree/Zero, Monster (Original, Ultra), Burn
- Ayran (genel + 1–2 marka), şalgam, Uludağ gazoz, maden suyu (sade, meyveli)
- Boyutlar porsiyon olarak: 200 ml cam, 250 ml kutu, 330 ml kutu, 500 ml, 1 L (ürünün gerçekten satıldığı boyutlar)

**B) Kahve hesaplayıcı (markasız):** Latte, Cappuccino, Flat White, Americano, Mocha, Filtre kahve, Türk kahvesi, Chai latte, Sıcak çikolata
- Boy: Küçük (240 ml) / Orta (350 ml) / Büyük (470 ml) — zincirlerin tall / grande / venti boylarına yakın
- Süt: tam yağlı, yarım yağlı, yağsız, laktozsuz, yulaf, badem, soya
- Şurup pompası (0–4; 1 pompa ≈ 10 ml ≈ 25–30 kcal) ve şeker (0–3 küp/paket)
- Değerler USDA espresso + süt + şurup değerlerinden hesaplanır; "yaklaşık" yazılır
- Eklenince öğüne tek kalem olarak yazılır (ör. "Latte · orta · yulaf sütü · 1 şurup"), sonradan değerleri değişmez

**C) Fast food:**
- Seçenek 1 (önerilen): resmi değeri doğrulanabilen zincirin (muhtemelen yalnız McDonald's) en bilinen 10–15 ürünü
  + markasız "yaklaşık" ürünler: klasik burger (tek/çift köfte), cheeseburger, tavuk burger, çıtır tavuk (adet), nugget (6/9),
  patates kızartması (küçük/orta/büyük), pizza dilimi (ince/normal hamur; margarita/karışık), döner dürüm (et/tavuk),
  lahmacun, pide, tost, simit, hamburger menü içeceği. Bir kısmı zaten var (v18 Türk yemekleri, eski "Esnek Diyet" listesi):
  tekrar eklenmez, eksikler tamamlanır.
- Seçenek 2: yalnız markasız yaklaşık ürünler (en güvenli, en hızlı).
- Seçenek 3: araştırmayı genişletip zincirlerin uygulamalarındaki değerleri tarayıcıdan tek tek okumak (uzun sürer, her biri senin kontrolünle).

## 3. Teknik

- Yeni ürünler `foods.js` üreticisine (`scripts/usda/tr/…json` → `build_foods.py`) "marka" kaynağıyla eklenir; kimlik `b_<ad>`
  (USDA `u…` ve tarif `r_…` kimlikleri değişmez). Kaynak/tarih alanı kartta görünür.
- Kahve hesaplayıcı: Besinler'de "Kahve" kartı → küçük seçim penceresi (boy / süt / şurup / şeker, −/+ 44 px), sonuçla kalem
  `{ foodId: "_est", est: {…} }` (v14 tahmini giriş yapısı, mevcut) — yeni veri biçimi gerekmez. Menüye eklenebilmesi için ayrıca
  özel besin olarak kaydetme seçeneği.
- Su kartına dokunulmaz. Logo yok. TR + EN (İngilizcede marka adı aynen).
- Test: her yeni ürünün kaynağı ve tarihi var, 100 ml / porsiyon değerleri etiketle tutarlı (`labelCheck`), kimlikler benzersiz,
  eski menüler etkilenmez; kahve hesaplayıcı örnek değerleri (ör. orta latte tam yağlı ≈ 190 kcal).

## 4. Senden beklenen kararlar
1. Fast food için seçenek 1, 2 veya 3?
2. Kahve hesaplayıcı fikri uygun mu (markasız)?
3. Paketli içecek listesine eklemek/çıkarmak istediğin marka var mı? (örn. Damla, Beypazarı, Sırma, Saka, Erikli meyveli, Cappy, Dimes, Pınar ayran, Sütaş ayran)
4. Alkollü içecekler: USDA'daki genel bira/şarap/rakı yeterli mi, yoksa markalı (Efes, Tuborg) da istiyor musun?
