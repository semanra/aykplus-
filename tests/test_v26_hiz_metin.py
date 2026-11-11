# v26: arama hızı (yazım hatası taraması yalnızca az sonuçta, bekleme), kalori halkası bir kereliğine "Yenen"
# (işaretle; sonra kullanıcının seçimi korunur), sadeleşen metinler, Geri al eklemeleri, color-mix yerine sabit renk,
# sayı biçimi (2,00 → 2).
import os, sys, json, subprocess, time
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOTS = os.path.join(os.path.dirname(__file__), "shots")
os.makedirs(SHOTS, exist_ok=True)
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8783'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
fails = []
URL = "http://localhost:8783/index.html"
KEY = "ayk_plus_v5_state"
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
def st(pg): return pg.evaluate(f"JSON.parse(localStorage.getItem('{KEY}'))")
def undo(pg): pg.locator("#toastWrap button", has_text="Geri al").last.click(); pg.wait_for_timeout(120)
SPLASH = "document.addEventListener('DOMContentLoaded',()=>{const s=document.getElementById('splash'); if(s) s.remove();})"
def new_page(b, state=None):
    ctx = b.new_context(viewport={"width": 375, "height": 812}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.add_init_script(SPLASH)
    pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    native = []; pg.on("dialog", lambda d: (native.append(d.message), d.accept()))
    pg.goto(URL); pg.wait_for_timeout(300)
    if state is not None:
        pg.evaluate(f"s => {{ localStorage.clear(); localStorage.setItem('{KEY}', JSON.stringify(s)); }}", state)
        pg.reload(); pg.wait_for_timeout(400)
    return ctx, pg, errs, native

try:
  with sync_playwright() as p:
    b = p.chromium.launch()

    # 1) Kalori halkası: yeni kurulumda Yenen
    ctx, pg, errs, native = new_page(b)
    pg.evaluate("switchTab('nutrition'); setNutriView('today')"); pg.wait_for_timeout(80)
    s = st(pg)["settings"]
    check(s["macroView"] == "eaten" and s.get("macroViewV26") == 1, f"yeni kurulum: halka Yenen, geçiş işareti kayıtlı ({s['macroView']})")
    check("on" in (pg.get_attribute("#mmEaten", "class") or "") and "Menü ·" in pg.inner_text("#mmPlan"), "Yenen seçili; diğer düğme 'Menü · … kcal'")
    ctx.close()

    # 2) Eski kullanıcı (işaret yok, Plan kayıtlı) → bir kereliğine Yenen; sonra Plan seçimi korunur
    old = {"activeTab": "nutrition", "settings": {"macroView": "plan"}}
    ctx, pg, errs2, _ = new_page(b, state=old)
    s = st(pg)["settings"]
    check(s["macroView"] == "eaten" and s.get("macroViewV26") == 1, "eski kayıt: Plan → bir kereliğine Yenen, işaret yazıldı")
    pg.evaluate("setMacroView('plan')"); pg.wait_for_timeout(60)
    pg.reload(); pg.wait_for_timeout(400)
    check(st(pg)["settings"]["macroView"] == "plan", "kullanıcı Plan'ı seçince yeniden açılışta korunuyor (geçiş tekrar etmedi)")
    check("on" in (pg.get_attribute("#mmPlan", "class") or ""), "Plan düğmesi seçili görünüyor")
    pg.reload(); pg.wait_for_timeout(300)
    check(st(pg)["settings"]["macroView"] == "plan", "üçüncü açılışta da Plan")
    ctx.close()
    ctx, pg, errs3, _ = new_page(b, state={"activeTab": "nutrition", "settings": {"macroView": "plan", "macroViewV26": 1}})
    check(st(pg)["settings"]["macroView"] == "plan", "işaret varsa kayıtlı Plan seçimine dokunulmuyor")
    ctx.close()

    # 3) Arama: sonuç sırası yazım hatası taramalı tam aramayla aynı, yazım hatası hâlâ bulunuyor, hızlı
    ctx, pg, errs4, native4 = new_page(b)
    pg.evaluate("switchTab('nutrition'); setNutriView('foods')"); pg.wait_for_timeout(80)
    for q in ["tavuk", "yulaf", "pirinc", "tavuk gogus", "yumurta"]:
        same = pg.evaluate(f"""(() => {{ const ids = Object.keys(getFoodDB()).filter(id => !isHiddenFood(getFoodDB()[id]));
            const a = searchFoods(ids, '{q}'), b = searchFoodsPass(ids, '{q}', true);
            return a.length > 0 && JSON.stringify(a) === JSON.stringify(b.slice(0, a.length)); }})()""")
        check(same, f"'{q}': sonuç sırası değişmedi")
    typo = pg.evaluate("(() => { const ids = Object.keys(getFoodDB()); return searchFoods(ids, 'yumrta').slice(0, 5).map(id => getFoodDB()[id].name); })()")
    check(any("Yumurta" in n for n in typo), f"yazım hatası ('yumrta') hâlâ bulunuyor ({typo[:2]})")
    ms = pg.evaluate("(() => { const ids = Object.keys(getFoodDB()); searchFoods(ids, 'tavuk'); const t = performance.now(); for (let i = 0; i < 10; i++) searchFoods(ids, 'tavuk'); return (performance.now() - t) / 10; })()")
    check(ms < 40, f"'tavuk' araması hızlı ({ms:.1f} ms)")
    # Bekleme: yazınca hemen değil, kısa süre sonra listelenir; boşaltınca hemen
    pg.fill("#foodSearch", "mercimek"); pg.wait_for_timeout(350)
    check("Mercimek" in pg.inner_text("#foodList"), "yazdıktan sonra sonuç listelendi")
    pg.fill("#foodSearch", ""); pg.wait_for_timeout(20)
    check("Mercimek" not in pg.inner_text("#foodList")[:200] or pg.locator("#foodList [data-food]").count() > 20, "kutu boşalınca liste hemen yenilendi")
    # Nereye eklensin: yeni adlar + açıklama
    check(pg.inner_text("#fdDay") == "Sadece bugüne" and pg.inner_text("#fdMenu") == "Menüme (her gün)", "anahtar: 'Sadece bugüne' / 'Menüme (her gün)'")
    check("menün değişmez" in pg.inner_text("#fdHint"), "açıklama: yalnızca bugün")
    pg.click("#fdMenu"); pg.wait_for_timeout(80)
    check("her gün geçerli" in pg.inner_text("#fdHint"), "açıklama: menüye eklenir")
    pg.screenshot(path=os.path.join(SHOTS, "v26_besinler_anahtar.png"))
    # P/K/Y hapları: color-mix yok, arka plan sabit renk
    check("color-mix" not in open(os.path.join(REPO, "index.html"), encoding="utf-8").read(), "index.html'de color-mix kalmadı")
    pg.fill("#foodSearch", "yulaf"); pg.wait_for_timeout(300)
    pg.locator("#foodList [data-food]").first.click(); pg.wait_for_timeout(120)
    bg = pg.evaluate("getComputedStyle(document.getElementById('foodSelP')).backgroundColor")
    check(bg not in ("rgba(0, 0, 0, 0)", "transparent"), f"protein hapının arka planı görünüyor ({bg})")
    pg.fill("#foodSearch", ""); pg.wait_for_timeout(50)

    # 4) Metinler: Bugünü menüye geri döndür (iki yerde), Menülerim notu
    pg.evaluate("setNutriView('today'); ensureDayCopy(); dayMeals()[0].items[0].amount += 10; renderAll()"); pg.wait_for_timeout(80)
    check(pg.locator("#dayDiffBanner button", has_text="Bugünü menüye geri döndür").count() == 1, "Bugün bandında 'Bugünü menüye geri döndür'")
    pg.evaluate("setNutriView('menus')"); pg.wait_for_timeout(80)
    note = pg.inner_text("#menuDayNote")
    check("Bugün ekranında bugüne özel değişiklikler yaptın" in note and "bugünü değiştirmez" in note and "plan" not in note.lower(), "Menülerim notu sade")
    check(pg.locator("#menuDayNote button", has_text="Bugünü menüye geri döndür").count() == 1, "Menülerim'de aynı ad")

    # 5) Kiloya göre gramaj: "yeni başlangıç" + Geri al
    pg.evaluate("state.settings.scaleOn = true; state.settings.scaleBase = 100; state.weight = 90; renderAll()"); pg.wait_for_timeout(80)
    card = pg.inner_text("#scaleCard")
    check("Bu gramajları yeni başlangıç yap (90 kg)" in card and "Başlangıç kilosu" in card and "son başlangıç yaptığın gramajlara" in card and "sabitle" not in card.lower(), "gramaj kartı metinleri")
    before = st(pg)["meals"]
    pg.locator("#scaleCard button", has_text="yeni başlangıç").click(); pg.wait_for_timeout(120)
    check(st(pg)["settings"]["scaleBase"] == 90 and st(pg)["meals"] != before, "yeni başlangıç uygulandı")
    check("90 kg için yeni başlangıç oldu" in pg.inner_text("#toastWrap"), "bildirim metni")
    undo(pg)
    check(st(pg)["settings"]["scaleBase"] == 100 and st(pg)["meals"] == before, "yeni başlangıç Geri al ile geri alındı")
    # Koç notu artık kaldırılan "Karbı dengele"yi önermiyor
    pg.evaluate("state.settings.calAdjust = 100; renderAll()"); pg.wait_for_timeout(60)
    check("Karbı dengele" not in pg.inner_text("#scaleCard") and "gramajları ayarla" in pg.inner_text("#scaleCard"), "koç notu kaldırılan düğmeye yönlendirmiyor")
    pg.evaluate("state.settings.calAdjust = 0; state.settings.scaleOn = false; renderAll()")

    # 6) Alışveriş işaretleri: temizle + Geri al
    pg.evaluate("openShopList()"); pg.wait_for_timeout(150)
    pg.evaluate("Object.assign(state.shopChecked, {a: 1, b: 1}); saveState(); renderShopList()")
    pg.locator("#shopModal button", has_text="İşaretleri temizle").click(); pg.wait_for_timeout(100)
    check(st(pg)["shopChecked"] == {}, "işaretler temizlendi")
    undo(pg)
    check(st(pg)["shopChecked"] == {"a": 1, "b": 1}, "işaretler Geri al ile geri geldi")
    pg.evaluate("closeModal('shopModal')") if pg.evaluate("typeof closeModal") == "function" else None

    # 7) Bulunamayan aramalar: temizle + Geri al
    pg.evaluate("state.missSearches = [{q: 'kokoreç', n: 2, ts: Date.now()}]; renderAll(); openProfile()"); pg.wait_for_timeout(150)
    pg.evaluate("renderMissList(); clearMissSearches()"); pg.wait_for_timeout(100)
    check(st(pg)["missSearches"] == [], "bulunamayan aramalar temizlendi")
    undo(pg)
    check(len(st(pg)["missSearches"]) == 1 and "kokoreç" in pg.inner_text("#missList"), "bulunamayan aramalar Geri al ile geri geldi (liste yenilendi)")
    pg.evaluate("closeProfile ? closeProfile() : null") if pg.evaluate("typeof closeProfile") == "function" else None
    pg.wait_for_timeout(100)

    # 8) Doz silme + Geri al
    pg.evaluate("switchTab('nutrition'); setNutriView('today'); state.supplementList[0].dose = 5; state.supplementList[0].unit = 'g'; renderAll()"); pg.wait_for_timeout(80)
    pg.evaluate("void editSuppDose(0)"); pg.wait_for_timeout(150)
    pg.fill("#uiDlgInput", ""); pg.click("#uiDlgOk"); pg.wait_for_timeout(150)
    check(st(pg)["supplementList"][0].get("dose") is None, "boş yanıt dozu kaldırdı")
    undo(pg)
    check(st(pg)["supplementList"][0].get("dose") == 5, "doz Geri al ile geri geldi")

    # 9) Sayı biçimi: su 2 L "2", 1,75 L "1,75"
    pg.evaluate("state.waterLiters = 2; renderAll()"); pg.wait_for_timeout(50)
    check(pg.inner_text("#waterVal") == "2", f"su '2' (2,00 değil): {pg.inner_text('#waterVal')!r}")
    pg.evaluate("state.waterLiters = 1.75; renderAll()"); pg.wait_for_timeout(50)
    check(pg.inner_text("#waterVal") == "1,75", "su '1,75'")
    pg.evaluate("setNutriView('menus'); state.deficit = 500; renderAll()"); pg.wait_for_timeout(50)
    tl = pg.inner_text("#timelineInfo")
    check("~0,45 kg" in tl, f"haftalık kayıp biçimi ({tl})")
    check(not (errs + errs2 + errs3 + errs4) and not native4, f"hata/sistem kutusu yok {(errs + errs2 + errs3 + errs4)[:1]}")
    ctx.close()
    b.close()
finally:
    srv.terminate()
print(f"{'HATA: ' + str(len(fails)) + ' kontrol başarısız' if fails else 'TÜM KONTROLLER GEÇTİ'}")
sys.exit(1 if fails else 0)
