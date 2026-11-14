# v22: lif ve tuz (USDA), "adet ile" sayacı (yumurta gibi doğal birimli besinler), proteinin öğünlere dağılımı,
# antrenman kütüphanesinde "Bu hafta" kas başına set listesi.
import os, sys, json, subprocess, time
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOTS = os.path.join(os.path.dirname(__file__), "shots")
os.makedirs(SHOTS, exist_ok=True)
srv = subprocess.Popen(['python3', '-m', 'http.server', '8775'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
fails = []
URL = "http://localhost:8775/index.html"
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
def st(pg): return pg.evaluate("JSON.parse(localStorage.getItem('ayk_plus_v5_state'))")
SPLASH = "document.addEventListener('DOMContentLoaded',()=>{const s=document.getElementById('splash'); if(s) s.remove();})"
NOW = int(time.time() * 1000)
STATE = {
    "weight": 90, "dayType": "train",
    "meals": [
        {"id": "m1", "title": "Kahvaltı", "items": [{"foodId": "u171287", "amount": 100}, {"foodId": "u173904", "amount": 80}]},   # 2 yumurta + yulaf
        {"id": "m2", "title": "Öğle", "items": [{"foodId": "u171077", "amount": 200}, {"foodId": "u173420", "amount": 50}]},     # tavuk + feta
        {"id": "m3", "title": "Ara", "items": [{"foodId": "tr_simit", "amount": 1}]},                                            # eski liste (lif/tuz verisi yok)
    ],
    "exerciseHistory": {"bench press": [{"name": "Bench Press", "ts": NOW - 3600000, "kind": "weight", "sets": [{"kg": 60, "reps": 8}] * 4}]},
}
try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(color_scheme="dark", viewport={"width": 375, "height": 812}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.add_init_script(SPLASH)
    pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(300)
    pg.evaluate("s => localStorage.setItem('ayk_plus_v5_state', JSON.stringify(s))", STATE)
    pg.reload(); pg.wait_for_timeout(500)
    pg.evaluate("switchTab('nutrition'); setNutriView('today')"); pg.wait_for_timeout(150)

    # 1) Veri: lif/sodyum USDA'dan, tariflerde sodyum yok (eklenen tuz bilinmiyor)
    d = pg.evaluate("""(() => { const db = getFoodDB(); const r = Object.keys(USDA_DB).filter(k => k.startsWith('r_'));
        return { oatFib: db.u173904.fib, fetaNa: db.u173420.na, eggFib: db.u171287.fib,
                 withFib: Object.values(USDA_DB).filter(f => f.fib != null).length, n: Object.keys(USDA_DB).length,
                 recipeNa: r.filter(k => db[k].na != null).length, recipeFib: r.filter(k => db[k].fib != null).length,
                 simitFib: db.tr_simit.fib }; })()""")
    check(abs(d["oatFib"] - 0.101) < 1e-6 and abs(d["fetaNa"] - 11.39) < 1e-6, f"USDA lif/sodyum değerleri (yulaf 10,1 g/100 g, feta 1139 mg/100 g)")
    check(d["withFib"] > 1500, f"çoğu besinde lif verisi var ({d['withFib']} / {d['n']})")
    check(d["recipeNa"] == 0 and d["recipeFib"] > 50, f"tariflerde sodyum yazılmıyor (eklenen tuz bilinmiyor), lif var ({d['recipeFib']})")
    check(d["simitFib"] is None, "eski listedeki besinlerde lif/tuz uydurulmadı")

    # 2) Bugün kartında günlük lif/tuz + veri olmayan besin sayısı
    exp = pg.evaluate("""(() => { const db = getFoodDB(); let f = 0, s = 0;
        [['u171287',100],['u173904',80],['u171077',200],['u173420',50]].forEach(([id,a]) => { f += db[id].fib * a; s += db[id].na * a * 2.5 / 1000; });
        return [Math.round(f * 10) / 10, Math.round(s * 10) / 10]; })()""")
    mt = pg.evaluate("(() => { const t = microTotals('plan'); return [Math.round(t.fib * 10) / 10, Math.round(t.salt * 10) / 10, t.miss]; })()")
    check(mt[:2] == exp and mt[2] == 1, f"günlük lif {mt[0]} g, tuz {mt[1]} g, 1 besinde veri yok ({mt})")
    pg.evaluate("setMacroView('plan')"); pg.wait_for_timeout(60)   # v26: varsayılan görünüm Yenen; bu kontrol menü değerleri için
    txt = pg.inner_text("#microLine")
    check("Lif" in txt and "Tuz" in txt and "/ 5 g" in txt and "1 besinde lif/tuz verisi yok" in txt, f"Bugün kartında lif/tuz satırı ({txt!r})")
    pg.locator("#microLine").scroll_into_view_if_needed(); pg.screenshot(path=os.path.join(SHOTS, "v22_lif_tuz.png"))

    # 3) Yumurta: adet ile sayaç
    pg.evaluate("setNutriView('foods'); selectFood('u171287')"); pg.wait_for_timeout(150)
    check(pg.locator("[data-unit-row]").count() == 1, "yumurta kartında 'adet ile' sayacı var")
    check(pg.inner_text("#foodUnitCount") == "1 × adet (büyük)" and pg.input_value("#foodAmt") == "50", f"başlangıç 1 adet (büyük) = 50 g ({pg.inner_text('#foodUnitCount')})")
    pg.locator('[data-unit-row] button[aria-label*="artır"]').click(); pg.wait_for_timeout(40)
    pg.locator('[data-unit-row] button[aria-label*="artır"]').click(); pg.wait_for_timeout(40)
    check(pg.input_value("#foodAmt") == "150" and pg.inner_text("#foodUnitCount") == "3 × adet (büyük)", "iki kez + → 3 adet = 150 g")
    pg.locator('[data-unit-row] button[aria-label*="azalt"]').click(); pg.wait_for_timeout(40)
    check(pg.input_value("#foodAmt") == "100", "− → 2 adet = 100 g")
    micro = pg.inner_text("#foodSelMicro")
    check("Tuz" in micro, f"besin kartında lif/tuz ({micro!r})")
    sizes = pg.evaluate("[...document.querySelectorAll('[data-unit-row] button')].map(b => { const r = b.getBoundingClientRect(); return Math.min(r.width, r.height); })")
    check(all(s >= 44 for s in sizes), f"sayaç düğmeleri en az 44 px ({sizes})")
    pg.locator("#foodSelCard").scroll_into_view_if_needed(); pg.screenshot(path=os.path.join(SHOTS, "v22_yumurta_adet.png"))
    pg.evaluate("selectFood('tr_simit')"); pg.wait_for_timeout(80)
    check(pg.locator("[data-unit-row]").count() == 0 and pg.locator("#foodSelMicro").count() == 0, "adet birimli eski kayıtta sayaç ve lif/tuz satırı yok")

    # 4) Protein dağılımı (Menülerim)
    pg.evaluate("setNutriView('menus')"); pg.wait_for_timeout(120)
    sp = pg.inner_text("[data-protein-spread]")
    check("protein dağılımı" in sp.lower() and "Kahvaltı" in sp and "Öğle" in sp, "Menülerim'de protein dağılımı")
    check("öğünde protein 20 g'ın altında" in sp, "20 g altındaki öğün için not")
    pg.locator("[data-protein-spread]").scroll_into_view_if_needed(); pg.screenshot(path=os.path.join(SHOTS, "v22_protein_dagilimi.png"))
    w = pg.evaluate("[document.documentElement.scrollWidth, document.documentElement.clientWidth]")
    check(w[0] <= w[1], "Menülerim yatay taşma yok")

    # 5) Antrenman kütüphanesi: Bu hafta kas başına set
    pg.evaluate("switchTab('gym'); state.gymView = 'library'; state.libRange = 'week'; renderAll()"); pg.wait_for_timeout(200)
    wm = pg.locator("[data-week-muscles]")
    check(wm.count() == 1 and "Göğüs" in wm.inner_text() and "4" in wm.inner_text(), "Bu hafta görünümünde kas başına set listesi (Göğüs 4 set)")
    wm.scroll_into_view_if_needed(); pg.screenshot(path=os.path.join(SHOTS, "v22_hafta_kas.png"))
    pg.set_viewport_size({"width": 320, "height": 740}); pg.wait_for_timeout(80)
    w = pg.evaluate("[document.documentElement.scrollWidth, document.documentElement.clientWidth]")
    check(w[0] <= w[1], "320 px'te yatay taşma yok")
    check(not errs, f"hata yok {errs[:1]}")
    b.close()
finally:
    srv.terminate()
print(f"{'HATA: ' + str(len(fails)) + ' kontrol başarısız' if fails else 'TÜM KONTROLLER GEÇTİ'}")
sys.exit(1 if fails else 0)
