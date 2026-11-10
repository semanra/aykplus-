# AYK+ besin veritabanı üretici (v18).
# Girdi : USDA SR Legacy aday listesi (extract.py çıktısı) + scripts/usda/tr/*.json (Türkçe ad, eş anlamlı, kategori; tarifler)
# Çıktı : <repo>/foods.js  →  const USDA_FOODS = { "u<fdcId>": {...}, "r_<tarif>": {...} }
# Kullanım: python3 scripts/usda/build_foods.py <sr_candidates.json>
#
# KURALLAR: Besin değerleri YALNIZCA USDA'dan gelir (asla tahmin yok). Porsiyon gramları yalnızca USDA porsiyon
# verisinden alınır; Türkiye'ye özgü ölçü eklenmez. USDA "cup" (≈240 ml) Türk su bardağı değildir, gerçek adıyla yazılır.
import json, os, re, sys, glob, unicodedata, collections

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
cand = {f["id"]: f for f in json.load(open(sys.argv[1], encoding="utf-8"))}

# Elle kararlar: tekrarlar, domuz içeren ürün, marka adı
DROP = {171549, 169636, 168443}                     # jambonlu çorba; aynı ürünün C vitaminli/2. kaydı
RENAME = {
    170884: "Milkshake, vanilyalı (yoğun)", 173226: "Milkshake, vanilyalı (fast food)",
    168944: "Tam buğday unu (yumuşak buğday)",
    170187: "Ceviz içi", 169640: "Bal",   # v20: uygulamanın eski listesindeki aynı adlı kayıtlar gizlendi (data.js hidden)
    173459: "Süt bazlı protein tozu (hazır karışım)", 173460: "Süt bazlı protein tozu, light (hazır karışım)",
}

def norm(s):
    s = str(s).lower().replace("ı", "i").replace("İ", "i")
    return unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode()

# ---------------------------------------------------------------- porsiyon çevirisi
HEAD = [  # (regex, Türkçe, tür)  tür: "n" doğal birim (önce), "k" kaşık, "c" cup
    (r"^(tbsp|tablespoons?)\b", "yemek kaşığı (15 ml)", "k"),
    (r"^(tsp|teaspoons?)\b", "tatlı kaşığı (5 ml)", "k"),
    (r"^cups?\b", "cup (ABD, 240 ml)", "c"),
    (r"^slices?\b", "dilim", "n"), (r"^pieces?\b", "parça", "n"), (r"^fillets?\b", "fileto", "n"),
    (r"^large\b", "adet (büyük)", "n"), (r"^medium\b", "adet (orta)", "n"), (r"^small\b", "adet (küçük)", "n"),
    (r"^extra large\b", "adet (çok büyük)", "n"), (r"^jumbo\b", "adet (iri)", "n"),
    (r"^(unit|fruit|whole|item)\b", "adet", "n"), (r"^(cookie|cracker|crackers|bar|cake|doughnut|croissant|muffin|pancake|roll|bagel|tortilla|pita|biscuit|waffle)s?\b", "adet", "n"),
    (r"^steaks?\b", "dilim (steak)", "n"), (r"^breasts?\b", "göğüs", "n"), (r"^drumsticks?\b", "baget", "n"),
    (r"^thighs?\b", "üst but", "n"), (r"^wings?\b", "kanat", "n"), (r"^chops?\b", "pirzola", "n"), (r"^patty\b", "köfte (adet)", "n"),
    (r"^leaf|^leaves", "yaprak", "n"), (r"^heads?\b", "baş", "n"), (r"^stalks?\b", "sap", "n"), (r"^spears?\b", "adet", "n"),
    (r"^ears?\b", "koçan", "n"), (r"^half\b", "yarım adet", "n"), (r"^wedges?\b", "dilim", "n"), (r"^sticks?\b", "çubuk", "n"),
    (r"^strips?\b", "şerit", "n"), (r"^cloves?\b", "diş", "n"), (r"^(egg|eggs)\b", "adet", "n"),
    (r"^(serving|nlea serving)\b", "porsiyon (ABD)", "s"), (r"^(package|packet|bag)\b", "paket", "s"),
    (r"^(can|can or bottle|bottle)\b", "kutu/şişe", "s"), (r"^container\b", "kap", "s"), (r"^(drink|glass)\b", "bardak", "s"),
]
QUAL = [("chopped", "doğranmış"), ("diced", "küp doğranmış"), ("sliced", "dilimlenmiş"), ("slices", "dilimlenmiş"),
        ("shredded", "rendelenmiş"), ("grated", "rendelenmiş"), ("mashed", "ezilmiş"), ("pieces", "parçalar"),
        ("halves", "ikiye bölünmüş"), ("cubes", "küp"), ("crumbled", "ufalanmış"), ("ground", "öğütülmüş"), ("packed", "bastırılmış"),
        ("whole", "bütün"), ("cooked", "pişmiş"), ("raw", "çiğ"), ("drained", "süzülmüş"), ("melted", "eritilmiş"), ("whipped", "çırpılmış")]
SKIP = re.compile(r"^(oz|ounce|lb|pound|fl oz|quart|pint|gallon|cubic inch|cup, fluid|liter|ml|g\b|gram)", re.I)

def fmt_amt(a):
    try: x = float(a)
    except Exception: return "1"
    if abs(x - round(x)) < 1e-9: return str(int(round(x)))
    return ("%g" % x).replace(".", ",")

def tr_portion(label):
    m = re.match(r"^([\d./]+)\s*(.*)$", label.strip())
    amt, rest = (m.group(1), m.group(2)) if m else ("1", label)
    if "/" in amt:
        try: n, d = amt.split("/"); amt = str(float(n) / float(d))
        except Exception: amt = "1"
    rest_l = re.sub(r"\(.*?\)", "", rest.lower()).strip()
    if not rest_l or SKIP.match(rest_l): return None
    for rx, tr, kind in HEAD:
        if re.match(rx, rest_l):
            tail = re.sub(rx, "", rest_l, count=1)
            quals = [q for en, q in QUAL if re.search(r"\b" + en + r"\b", tail)]
            q = (", " + quals[0]) if quals and kind in ("c", "k") else ""
            return (f"{fmt_amt(amt)} {tr}{q}", kind)
    return None

def portions_for(f):
    out, seen = [], set()
    for lab, g in f.get("portions", []):
        if not (0 < g <= 1500) or "yield" in lab.lower(): continue
        t = tr_portion(lab)
        if not t: continue
        name, kind = t
        if name in seen: continue
        seen.add(name)
        out.append((name, round(g, 1), {"n": 0, "s": 1, "k": 2, "c": 3}[kind]))
    out.sort(key=lambda x: x[2])
    return [[n, g] for n, g, _ in out[:4]]

# ---------------------------------------------------------------- birleştirme
def r4(x): return round(x, 4)
foods, names = {}, {}
# Uygulamanın kendi listesindeki (src/data.js) adlarla da çakışmasın
for line in open(os.path.join(REPO, "src", "data.js"), encoding="utf-8").read().splitlines():
    m = re.search(r'name:\s*"([^"]+)"', line)
    if m and "hidden: true" not in line:      # gizli eski kayıtlarla ad çakışması sorun değil
        names[norm(re.sub(r"^\W+", "", m.group(1)))] = "data.js"
problems = []
for path in sorted(glob.glob(os.path.join(HERE, "tr", "tr_[A-Z].json"))):
    for x in json.load(open(path, encoding="utf-8")):
        i = int(x["id"])
        if i in DROP or ("u%d" % i) in foods: continue
        src = cand.get(i)
        if not src: problems.append(f"aday listesinde yok: {i}"); continue
        name = RENAME.get(i, x["tr"]).strip()
        k = norm(name)
        if k in names: problems.append(f"tekrar ad: {name} ({i}, {names[k]})"); continue
        names[k] = i
        kcal, p, c, fat = src["kcal"], src["p"], src["c"], src["f"]
        calc = 4 * p + 4 * c + 9 * fat
        d = src["desc"].lower()
        ke = ""
        if abs(calc - kcal) > max(25, 0.2 * kcal):
            ke = "alkol" if ("alcoholic" in d or "beer" in d or "wine" in d or "distilled" in d or "vanilla extract" in d) else \
                 "tatlandırıcı" if ("sugar-free" in d or "sugarless" in d or "stevia" in d or "sweetener" in d or "low calorie" in d) else "lif"
        por = portions_for(src)
        first = next((g for n, g in por if not n.startswith(("1 cup", "1 yemek", "1 tatlı"))), None)
        e = {"n": name, "c": x["cat"], "k": r4(kcal / 100), "p": r4(p / 100), "h": r4(c / 100), "f": r4(fat / 100),
             "a": [a for a in dict.fromkeys(x.get("aliases", [])) if a and norm(a) != k][:5], "s": i}
        if por: e["o"] = por
        if first and first <= 400: e["d"] = first
        if ke: e["x"] = ke
        foods["u%d" % i] = e

# Tarifler: değerler USDA malzemelerinden hesaplanır (tarif hesaplaması, yaklaşık)
for x in json.load(open(os.path.join(HERE, "tr", "tr_recipes.json"), encoding="utf-8")):
    tot = {"kcal": 0, "p": 0, "c": 0, "f": 0}; g = 0; ok = True
    for it in x["items"]:
        src = cand.get(int(it["id"]))
        if not src: problems.append(f"tarif {x['key']}: malzeme yok {it['id']}"); ok = False; break
        w = float(it["g"]); g += w
        for kk in tot: tot[kk] += src[kk] * w / 100
    if not ok or g <= 0: continue
    name = x["tr"].strip(); k = norm(name)
    if k in names: problems.append(f"tekrar ad (tarif): {name}"); continue
    names[k] = x["key"]
    e = {"n": name, "c": "Türk yemekleri (tarif)", "k": r4(tot["kcal"] / g), "p": r4(tot["p"] / g), "h": r4(tot["c"] / g), "f": r4(tot["f"] / g),
         "a": [a for a in dict.fromkeys(x.get("aliases", [])) if a and norm(a) != k][:5], "s": "tarif",
         "o": [["1 porsiyon", float(x["serving_g"])]], "d": float(x["serving_g"])}
    if x.get("note"): e["t"] = x["note"]
    foods["r_" + x["key"]] = e

# v20: Pişmiş hâller listeden GİZLENİR (silinmez; menüde kullanılıyorsa çalışmaya devam eder). Gerekçe: pişirince ağırlık
# su kaybı/emilimiyle değişir, tutarlı hesap için çiğ (kuru) tartılır. Kavrulmuş kuruyemiş, konserve, şarküteri, ekmek,
# hazır ürünler ve tarifler kalır (alındığı/yendiği hâliyle tartılır).
HIDE_CATS = {"Kırmızı et", "Tavuk ve hindi", "Balık ve deniz ürünleri", "Sakatat", "Tahıllar ve makarna", "Baklagiller", "Sebzeler"}
COOK_RX = re.compile(r"pişmiş|haşlanmış|haşlama|ızgara|fırında|kızartılmış|kızarmış|tavada|kavrulmuş|közlenmiş|buharda|tencerede|"
                     r"çevirme|mikrodalga|pişirilmiş|hazırlanmış|sote|lapası")
KEEP_RX = re.compile(r"çiğ|kuru\b|konserve|kavanoz|salamura|turşu|füme|pişmemiş|"
                     r"hazır|pane|kroket|rösti|dondurulmuş, (fırında|tavada)|tofu, kızartılmış|vegan")   # hazır/dondurulmuş ürünler alındığı gibi
HIDE_KEEP_IDS = set()      # kurala uyduğu hâlde görünür kalması istenenler (fdcId)
def raw_key(n, parens=True):
    n = norm(n)
    if not parens: n = re.sub(r"\(.*?\)", " ", n)
    n = re.sub(r"\b(cig|kuru|pismis|haslanmis|haslama|izgara|firinda|kizartilmis|kizarmis|tavada|kavrulmus|kozlenmis|buharda|"
               r"tencerede|cevirme|mikrodalgada|pisirilmis|hazirlanmis|kisik|ateste|yagda|suyla|soyulup|kabugunda|kabuguyla|kabuklu)\b", " ", n)
    return " ".join(re.sub(r"[^a-z0-9 ]", " ", n).split())
raw_by_key, raw_by_key2 = {}, {}
for k, e in foods.items():
    if k.startswith("u") and re.search(r"\bçiğ\b|kuru \(çiğ\)|\bkuru\b", e["n"].lower()):
        raw_by_key.setdefault(raw_key(e["n"]), k)
        raw_by_key2.setdefault(raw_key(e["n"], False), k)
hidden_rows = []
for k, e in foods.items():
    if not k.startswith("u") or e["c"] not in HIDE_CATS or e["s"] in HIDE_KEEP_IDS: continue
    nl = e["n"].lower()
    if COOK_RX.search(nl) and not KEEP_RX.search(nl):
        e["z"] = 1
        rk = raw_by_key.get(raw_key(e["n"])) or raw_by_key2.get(raw_key(e["n"], False))
        hidden_rows.append((k, e["n"], e["c"], "pişmiş hâl (çiğ tartılır)", foods[rk]["n"] if rk else ""))
# Uygulamanın kendi listesinde gizlenenler (src/data.js: hidden: true, replace: "<yerine>")
data_txt = open(os.path.join(REPO, "src", "data.js"), encoding="utf-8").read()
for m in re.finditer(r'^\s*([a-z0-9_]+): \{ name: "([^"]+)", cat: "([^"]+)".*?hidden: true(?:, replace: "([^"]*)")?', data_txt, re.M):
    rep = m.group(4) or ""
    if rep and rep not in foods: problems.append(f"data.js {m.group(1)}: yerine gösterilen besin yok ({rep})")
    hidden_rows.append((m.group(1), m.group(2), m.group(3), "uygulamanın eski listesinde tekrar" if rep and "pişmiş" not in m.group(2).lower() else "pişmiş hâl (çiğ tartılır)",
                        foods[rep]["n"] if rep in foods else ""))

# v19: Yayındaki bir besin kimliği ASLA kaybolmamalı (kullanıcının menüsünde olabilir; uygulama "⚠" ile eski değerleri
# gösterir ama bu bir yedektir, çözüm değildir). Bir besini bilerek kaldırmak gerekirse kimliği ALLOW_REMOVE'a yazılır.
ALLOW_REMOVE = set()
old_path = os.path.join(REPO, "foods.js")
if os.path.exists(old_path):
    old_txt = open(old_path, encoding="utf-8").read()
    try:
        old_ids = set(json.loads(old_txt[old_txt.index("{"):old_txt.rindex("}") + 1]).keys())
    except Exception:
        old_ids = set(re.findall(r'"((?:u\d+)|(?:r_[a-z0-9_]+))":\{', old_txt))
    for gone in sorted(old_ids - set(foods) - ALLOW_REMOVE):
        problems.append(f"yayındaki besin kaybolacaktı: {gone} (bilerek kaldırılıyorsa ALLOW_REMOVE'a ekle)")

if problems:
    print("SORUNLAR:"); [print("  " + s) for s in problems]
    sys.exit(1)

cats = collections.Counter(v["c"] for v in foods.values())
out = os.path.join(REPO, "foods.js")
with open(out, "w", encoding="utf-8") as o:
    o.write("// AYK+ besin veritabanı (v18) — scripts/usda/build_foods.py ile üretilir, ELLE DÜZENLEME.\n")
    o.write("// Kaynak: USDA FoodData Central, SR Legacy (kamu malı). Türk yemekleri: USDA malzemeleriyle tarif hesaplaması (yaklaşık).\n")
    o.write("// Alanlar (birim başına = 1 g): n ad, c kategori, k kcal, p protein, h karb, f yağ, a eş anlamlılar, s kaynak (fdcId | \"tarif\"),\n")
    o.write("// o porsiyonlar [[ad, gram]], d varsayılan gram, x kalori istisnası nedeni (lif/alkol/tatlandırıcı), t not (tarif yaklaşımları)\n")
    o.write("const USDA_FOODS = ")
    json.dump(foods, o, ensure_ascii=False, separators=(",", ":"))
    o.write(";\n")
import csv
with open(os.path.join(REPO, "docs", "gizlenen-besinler.csv"), "w", encoding="utf-8-sig", newline="") as o:
    w = csv.writer(o, delimiter=";")
    w.writerow(["kimlik", "gizlenen besin", "kategori", "neden", "listede kalan karşılığı"])
    for r in sorted(hidden_rows, key=lambda r: (r[2], r[1])): w.writerow(r)
print(f"gizlenen: {sum(1 for v in foods.values() if v.get('z'))} veritabanı + {sum(1 for r in hidden_rows if not r[0].startswith('u'))} eski liste · görünen: {sum(1 for v in foods.values() if not v.get('z'))}")
print(f"✓ foods.js: {len(foods)} besin ({sum(1 for k in foods if k.startswith('r_'))} tarif) · {os.path.getsize(out) // 1024} KB")
for c, n in cats.most_common(): print(f"  {n:4d} {c}")
print("kalori istisnası:", collections.Counter(v.get("x") for v in foods.values() if v.get("x")))
print("porsiyonu olan:", sum(1 for v in foods.values() if v.get("o")))
