# USDA FoodData Central SR Legacy (kamu malı) CSV'sinden aday besin listesi çıkarır.
# Kullanım: python3 scripts/usda/extract.py <SR_LEGACY_CSV_KLASÖRÜ> <ÇIKTI_KLASÖRÜ>
# Veri: https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip
import csv, json, os, re, sys
src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
def rows(name):
    with open(os.path.join(src, name), encoding="utf-8") as f:
        yield from csv.DictReader(f)
cats = {r["id"]: r["description"] for r in rows("food_category.csv")}
EXCLUDE_CATS = {"3", "21", "24", "25", "26", "27"}   # bebek, fast food, yerli Amerikan, restoran, markalı, kalite kontrol
BRAND = re.compile(r"\b[A-Z][A-Z'&.\-]{2,}\b")       # büyük harfli marka adları (KELLOGG'S, KRAFT ...)
# "USDA's Food Distribution Program", "USDA Commodity" gibi ifadeler marka değildir
NOT_BRAND = re.compile(r"\([^()]*\bUSDA\b[^()]*\)|\bUSDA\b[^,]*")
foods = {}
for r in rows("food.csv"):
    if r["food_category_id"] in EXCLUDE_CATS: continue
    d = r["description"]
    if BRAND.search(NOT_BRAND.sub("", d)) or "Pillsbury" in d: continue
    foods[r["fdc_id"]] = {"id": int(r["fdc_id"]), "desc": d, "cat": cats.get(r["food_category_id"], "?")}
NUT = {"1008": "kcal", "1003": "p", "1004": "f", "1005": "c", "1079": "fib", "1093": "na"}   # v22: lif (g), sodyum (mg)
for r in rows("food_nutrient.csv"):
    f = foods.get(r["fdc_id"])
    k = NUT.get(r["nutrient_id"])
    if f is not None and k: f[k] = float(r["amount"])
units = {r["id"]: r["name"] for r in rows("measure_unit.csv")}
for r in rows("food_portion.csv"):
    f = foods.get(r["fdc_id"])
    if f is None: continue
    g = float(r["gram_weight"] or 0)
    if g <= 0: continue
    u = units.get(r["measure_unit_id"], "")
    label = " ".join(x for x in [r["amount"], u if u != "undetermined" else "", r["modifier"], r["portion_description"]] if x).strip()
    f.setdefault("portions", []).append([label, g])
complete = [f for f in foods.values() if all(k in f for k in ("kcal", "p", "f", "c"))]
json.dump(complete, open(os.path.join(out, "sr_candidates.json"), "w", encoding="utf-8"), ensure_ascii=False)
by = {}
for f in complete: by.setdefault(f["cat"], []).append(f)
for c, fs in sorted(by.items()):
    print(f"{len(fs):5d}  {c}")
print(len(complete), "aday")
