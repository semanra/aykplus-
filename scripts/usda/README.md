# AYK+ besin veritabanı (v18)

`foods.js` (depo kökünde) bu klasördeki betiklerle üretilir. **Elle düzenleme.**

- **Kaynak:** USDA FoodData Central, SR Legacy (kamu malı). Besin değerleri ve porsiyon gramları yalnızca USDA'dan gelir.
- **Türkçe adlar, eş anlamlılar, kategoriler:** `tr/tr_A.json … tr_G.json` (elle gözden geçirilmiş seçim; fdcId → Türkçe).
- **Türk yemekleri:** `tr/tr_recipes.json` — standart ev tarifleri, malzemeler USDA fdcId + gram; değerler malzemelerden hesaplanır ("tarif hesaplaması, yaklaşık"). Yaklaşımlar her tarifin `note` alanında.
- Domuz ürünleri, marka ürünleri, bebek mamaları ve restoran/fast food yiyecekleri yoktur.

## Yeniden üretme

```bash
# 1) USDA verisini indir ve aç (yaklaşık 6 MB)
curl -O https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip
unzip FoodData_Central_sr_legacy_food_csv_2018-04.zip -d usda_sr
# 2) Aday listesini çıkar
python3 scripts/usda/extract.py usda_sr/FoodData_Central_sr_legacy_food_csv_2018-04 usda_out
# 3) foods.js üret (tekrar ad, eksik kimlik vb. sorun varsa durur)
python3 scripts/usda/build_foods.py usda_out/sr_candidates.json
# 4) npm run build && npm test
```

Kalori: uygulama USDA'nın ölçtüğü kaloriyi (`k`) kullanır. 4P+4K+9Y ile %20'den fazla farklı olan az sayıdaki besin `x` alanıyla işaretlidir (lif, alkol, tatlandırıcı) ve testte gerekçeli istisnadır.

Tam liste (gözden geçirmek için): `docs/besin-veritabani-listesi.csv`.
