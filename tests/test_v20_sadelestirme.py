# v20: Pişmiş hâller (et, tavuk, balık, sakatat, tahıl, baklagil, sebze) ve eski listedeki USDA tekrarları listeden GİZLENİR.
# Gizli besin silinmez: menüde kullanılıyorsa aynı değerle hesaplanır, uyarı çıkmaz. ⇄ ikame listede kalan karşılığı önerir.
import os, sys, json, subprocess, time, csv
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOTS = os.path.join(os.path.dirname(__file__), "shots")
os.makedirs(SHOTS, exist_ok=True)
srv = subprocess.Popen(['python3', '-m', 'http.server', '8773'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
fails = []
URL = "http://localhost:8773/index.html"
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
def st(pg): return pg.evaluate("JSON.parse(localStorage.getItem('ayk_plus_v5_state'))")
SPLASH = "document.addEventListener('DOMContentLoaded',()=>{const s=document.getElementById('splash'); if(s) s.remove();})"

# Eski kayıt: menüde gizlenecek besinler var (eski liste tavuk göğsü/badem/pişmiş tavuk, USDA ızgara tavuk ve haşlanmış pirinç)
LEGACY = {
    "weight": 90, "deficit": 500, "dayType": "train",
    "meals": [{"id": "m1", "title": "Öğle", "items": [
        {"foodId": "tavuk_gogsu", "amount": 200}, {"foodId": "tavuk_gogsu_pismis", "amount": 150},
        {"foodId": "u171534", "amount": 120}, {"foodId": "badem", "amount": 30}, {"foodId": "u168878", "amount": 200}]}],
    "recentFoods": ["tavuk_gogsu", "badem", "u171534"],
}
try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(color_scheme="dark", viewport={"width": 375, "height": 812}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.add_init_script(SPLASH)
    pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("dialog", lambda d: d.accept())
    pg.goto(URL); pg.wait_for_timeout(300)

    # 1) Veritabanı: gizlenenler doğru, kalanlar doğru
    info = pg.evaluate("""(() => { const db = getFoodDB(); const h = id => !!(db[id] && db[id].hidden);
        return { hiddenN: Object.values(USDA_DB).filter(f => f.hidden).length, total: Object.keys(USDA_DB).length,
          izgaraTavuk: h('u171534'), cigTavuk: h('u171077'), pirincHas: h('u168878'), pirincKuru: h('u168877'),
          kavrulmusBadem: h('u170158'), cigBadem: h('u170567'), tarif: Object.keys(USDA_DB).filter(k => k.startsWith('r_') && db[k].hidden).length,
          baseTavuk: h('tavuk_gogsu'), basePismis: h('tavuk_gogsu_pismis'), baseKasar: h('tr_kasar'), baseLor: h('lor_peyniri'),
          ceviz: db.u170187.name, bal: db.u169640.name,
          cookedVisible: Object.values(db).filter(f => !isHiddenFood(f) && ['Kırmızı et','Tavuk ve hindi','Balık ve deniz ürünleri','Sakatat','Tahıllar ve makarna','Baklagiller','Sebzeler'].includes(f.cat)
             && /pişmiş|haşlanmış|ızgara|fırında|kızartılmış|tencerede|çevirme/.test(f.name.toLowerCase())
             && !/çiğ|kuru|konserve|füme|hazır|pane|kroket|dondurulmuş, (fırında|tavada)|tofu|vegan|pişmemiş/.test(f.name.toLowerCase())).map(f => f.name) }; })()""")
    print("  bilgi:", {k: v for k, v in info.items() if k != "cookedVisible"})
    check(250 <= info["hiddenN"] <= 400, f"veritabanında ~290 pişmiş hâl (+ v21: ~40 ABD ürünü) gizli ({info['hiddenN']} / {info['total']})")
    check(info["total"] == 1825, "hiçbir besin silinmedi (1825 kayıt duruyor)")
    check(info["izgaraTavuk"] and not info["cigTavuk"], "ızgara tavuk gizli, çiğ tavuk görünür")
    check(info["pirincHas"] and not info["pirincKuru"], "haşlanmış pirinç gizli, kuru pirinç görünür")
    check(not info["kavrulmusBadem"] and not info["cigBadem"], "kavrulmuş kuruyemiş görünür kalıyor")
    check(info["tarif"] == 0, "tariflerin hiçbiri gizlenmedi")
    check(info["baseTavuk"] and info["basePismis"], "eski listedeki tekrar (Tavuk Göğsü Çiğ) ve pişmiş kayıt gizli")
    check(not info["baseKasar"] and not info["baseLor"], "USDA karşılığı olmayan eski kayıtlar (kaşar, lor) görünür")
    check(info["ceviz"] == "Ceviz içi" and info["bal"] == "Bal", f"'(USDA ölçümü)' eki kalktı ({info['ceviz']}, {info['bal']})")
    check(not info["cookedVisible"], f"listede pişmiş et/tahıl/sebze kalmadı {info['cookedVisible'][:5]}")

    # 2) Eski menü: gizli besinler aynı değerle hesaplanıyor, uyarı yok, ⚠ yok
    pg.evaluate("s => localStorage.setItem('ayk_plus_v5_state', JSON.stringify(s))", LEGACY)
    pg.reload(); pg.wait_for_timeout(1900)
    exp = pg.evaluate("""(() => { const db = getFoodDB(); const c = (id, a) => kcalPerUnit(db[id]) * a;
        return Math.round(c('tavuk_gogsu',200) + c('tavuk_gogsu_pismis',150) + c('u171534',120) + c('badem',30) + c('u168878',200)); })()""")
    got = pg.evaluate("Math.round(nutritionTotals(curMeals()).cal)")
    check(got == exp and got > 900, f"eski menü gizli besinlerle aynı kaloriyle hesaplanıyor ({got})")
    s = st(pg)
    check([i["foodId"] for i in s["meals"][0]["items"]] == ["tavuk_gogsu", "tavuk_gogsu_pismis", "u171534", "badem", "u168878"], "menü verisi değişmedi")
    t = pg.evaluate("[...document.querySelectorAll('#toastWrap > div')].map(e => e.textContent).join(' | ')")
    check("bulunamadı" not in t, "gizli besinler için 'bulunamadı' uyarısı çıkmıyor")
    pg.evaluate("switchTab('nutrition'); setNutriView('menus')"); pg.wait_for_timeout(150)
    txt = pg.inner_text("#mealsContainer")
    check("⚠" not in txt, "menüde ⚠ işareti yok")

    # 3) Besinler: arama/liste/son kullanılanlar gizlileri göstermiyor
    pg.evaluate("setNutriView('foods')"); pg.wait_for_timeout(100)
    def search(q):
        pg.fill("#foodSearch", q); pg.evaluate("foodUI.limit = 0; renderFoodList()"); pg.wait_for_timeout(40)
        return pg.evaluate("[...document.querySelectorAll('#foodList [data-food]')].map(e => e.dataset.food)")
    r = search("tavuk göğsü")
    names = pg.evaluate("ids => ids.map(id => getFoodDB()[id].name)", r)
    check("u171077" in r[:3] and "u171534" not in r and "tavuk_gogsu" not in r and "tavuk_gogsu_pismis" not in r, f"'tavuk göğsü' aramasında yalnızca çiğ ({names[:4]})")
    r = search("pirinç")
    check("u168878" not in r and "u168877" in r, "'pirinç' aramasında haşlanmış yok, kuru var")
    r = search("izgara")
    bad = [n for n in pg.evaluate("ids => ids.map(id => getFoodDB()[id].cat + ' | ' + getFoodDB()[id].name)", r) if n.split(" | ")[0] in ("Kırmızı et", "Tavuk ve hindi", "Balık ve deniz ürünleri")]
    check(not bad, f"'ızgara' aramasında pişmiş et/balık çıkmıyor {bad[:3]}")
    pg.fill("#foodSearch", ""); pg.evaluate("foodUI.cat = 'recent'; foodUI.limit = 0; renderFoodList()"); pg.wait_for_timeout(40)
    rec = pg.evaluate("[...document.querySelectorAll('#foodList [data-food]')].map(e => e.dataset.food)")
    check(not any(x in rec for x in ["tavuk_gogsu", "badem", "u171534"]), f"son kullanılanlarda gizliler yok ({rec})")
    pg.evaluate("foodUI.cat = 'all'; renderFoodList()")
    check(not any(x in pg.evaluate("frequentFoods(40)") for x in ["tavuk_gogsu", "badem", "u171534"]), "önerilerde gizliler yok")
    pick = pg.evaluate("(() => { const out = []; Object.keys(getFoodDB()).forEach(id => { const f = getFoodDB()[id]; if (!isHiddenFood(f)) out.push(id); }); return out.length; })()")
    check(pick >= 1500, f"görünen besin sayısı makul ({pick})")

    # 4) ⇄ ikame: gizli eski kayıt yerine listede kalan karşılığı öneriliyor
    opts = pg.evaluate("swapOptions({foodId:'tavuk_gogsu', amount:200}).map(o => o.id)")
    check("u174515" in opts and "hindi_gogsu" not in opts and "u171077" not in opts, f"eski tavuk → USDA hindi öneriliyor, kendisinin karşılığı değil ({opts})")
    opts2 = pg.evaluate("swapOptions({foodId:'u171077', amount:200}).map(o => o.id)")
    check(len(opts2) >= 3 and "tavuk_gogsu" not in opts2, f"USDA tavuk göğsü (çiğ) da ⇄ ikame grubunda ({len(opts2)} seçenek)")
    nuts = pg.evaluate("swapOptions({foodId:'u170567', amount:30}).map(o => getFoodDB()[o.id].name)")
    check(any("Ceviz" in n for n in nuts) and any("Kaju" in n for n in nuts), f"kuruyemiş ikamesi USDA kayıtlarıyla ({nuts[:4]})")

    # 5) Gözden geçirme tablosu
    rows = list(csv.reader(open(os.path.join(REPO, "docs", "gizlenen-besinler.csv"), encoding="utf-8-sig"), delimiter=";"))
    check(rows[0][0] == "kimlik" and len(rows) - 1 == info["hiddenN"] + 23, f"gizlenen-besinler.csv tam ({len(rows) - 1} satır)")
    pg.screenshot(path=os.path.join(SHOTS, "v20_arama.png"))
    check(not errs, f"hata yok {errs[:1]}")
    b.close()
finally:
    srv.terminate()
print(f"{'HATA: ' + str(len(fails)) + ' kontrol başarısız' if fails else 'TÜM KONTROLLER GEÇTİ'}")
sys.exit(1 if fails else 0)
