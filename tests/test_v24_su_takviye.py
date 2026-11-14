# v24: Su ve Takviye Rutini kartları — halka, yüzde, kiloya göre su hedefi (+kreatin),
# zamana göre 3 grup, doz ayarlayıcı (−/+), hazır takviyeler, tamamlanma parıltısı, yeni gün.
import os, sys
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOTS = os.path.join(os.path.dirname(__file__), "shots")
os.makedirs(SHOTS, exist_ok=True)
import subprocess, time, json
srv = subprocess.Popen(['python3', '-m', 'http.server', '8774'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
def st(pg): return pg.evaluate("JSON.parse(localStorage.getItem('ayk_plus_v5_state'))")
def ov(pg):
    w = pg.evaluate("[document.documentElement.scrollWidth, document.documentElement.clientWidth]"); return w[0] <= w[1]
SMALL_JS = """(sel) => [...document.querySelectorAll(sel)]
  .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.width < 44 || r.height < 44); })
  .map(e => (e.textContent || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 30) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height))"""
def supp(pg, name): return [x for x in st(pg)["supplementList"] if name in x["name"]]

try:
  with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(color_scheme="dark", viewport={"width": 375, "height": 812}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.getElementById('splash'); if(s) s.remove();})")
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))

    # ---------- Eski kayıt (v23): doz alanı yok, waterAuto yok, bozuk doz
    legacy = {"activeTab": "nutrition", "nutriView": "today", "weight": 100, "waterLiters": 1.25,
              "settings": {"waterTarget": 2.8},
              "supplementList": [{"id": "creatine", "name": "⚡ Kreatin (5g)", "time": "post"}, {"id": "greens", "name": "🥬 Greens", "time": "morning"},
                                 {"id": "x", "name": "Bozuk", "dose": "abc", "unit": "g", "step": -1}],
              "supplements": {"greens": True}}
    pg.goto("http://localhost:8774/index.html"); pg.wait_for_timeout(200)
    pg.evaluate("s => localStorage.setItem('ayk_plus_v5_state', s)", json.dumps(legacy)); pg.reload(); pg.wait_for_timeout(300)
    s = st(pg)
    check(s["settings"]["waterAuto"] is True and s["settings"]["waterTarget"] == 2.8, "eski kayıt: kiloya göre su açık, elle hedef korunuyor")
    check(len(s["supplementList"]) == 3 and "dose" not in s["supplementList"][2] and "step" not in s["supplementList"][2], "eski kayıt: bozuk doz temizlendi, takviye silinmedi")
    check(s["waterLiters"] == 1.25 and s["supplements"] == {"greens": True}, "eski kayıt: su ve işaretler korunuyor")

    # ---------- Su kartı: kilo × 35 ml + kreatin
    check(pg.inner_text("#waterTarget") == "4", f"hedef 100 kg × 35 ml + 0,5 L kreatin = 4 L ({pg.inner_text('#waterTarget')})")
    check("kreatin" in pg.inner_text("#waterNote") and "100 kg" in pg.inner_text("#waterNote"), "halkanın altında hesap notu")
    check(pg.inner_text("#waterVal") == "1,25" and pg.inner_text("#waterPct") == "%31", f"1,25 / 4 L → %31 ({pg.inner_text('#waterPct')})")
    pg.locator("#waterCard button", has_text="+500 ml").click(); pg.locator("#waterCard button", has_text="+250 ml").click(); pg.wait_for_timeout(80)
    ring = float(pg.evaluate("document.getElementById('waterRing').style.strokeDashoffset"))
    check(pg.inner_text("#waterVal") == "2" and pg.inner_text("#waterPct") == "%50" and abs(ring - 182.21) < 0.5, f"2 L → %50, halka yarıda ({ring})")
    pg.locator("#waterCard button[aria-label='250 mililitre çıkar']").click(); pg.wait_for_timeout(60)
    check(st(pg)["waterLiters"] == 1.75, "− düğmesi 250 ml azaltıyor")
    pg.evaluate("state.waterLiters = 9; renderAll()")
    check(pg.inner_text("#waterPct") == "%100" and float(pg.evaluate("document.getElementById('waterRing').style.strokeDashoffset")) == 0, "hedef aşılınca %100'de duruyor")
    pg.evaluate("state.waterLiters = 1.75; renderAll()")
    pg.evaluate("state.weight = 80; renderAll()")
    check(pg.inner_text("#waterTarget") == "3,3", f"kilo değişince hedef güncelleniyor (80 × 35 ml = 2,8 + 0,5) ({pg.inner_text('#waterTarget')})")
    pg.evaluate("state.settings.waterAuto = false; renderAll()")
    check(pg.inner_text("#waterTarget") == "2,8" and "elle" in pg.inner_text("#waterNote"), "kapalıyken Profil'deki elle hedef")
    pg.evaluate("state.settings.waterAuto = true; state.weight = 100; renderAll()")

    # ---------- Takviye kartı: gruplar, sayaç
    groups = pg.locator("[data-supp-group]").all_inner_texts()
    check(groups == ["İlk öğünle", "Antrenman / Gün içi", "Diğer"], f"3 ana grup + zamansızlar 'Diğer' ({groups})")
    check(pg.inner_text("#suppCounter") == "1 / 3 Tamamlandı", f"sayaç ({pg.inner_text('#suppCounter')})")
    check(pg.evaluate("document.getElementById('suppBar').style.width") == "33%", "dolum çubuğu %33")
    check(pg.locator("#suppList .n-step").count() == 0, "dozu olmayan eski takviyelerde −/+ yok")

    # ---------- Düzenle: hazır takviyeler (listede kreatin var → kreatin önerilmez)
    pg.locator("#suppList button", has_text="Düzenle").click(); pg.wait_for_timeout(80)
    pres = pg.locator("#suppPresets button").all_inner_texts()
    check(pres == ["+ Vitamin D3 + K2", "+ Omega-3", "+ Whey Protein", "+ Magnezyum", "+ Çinko"], f"hazır takviyeler, listede olan kreatin hariç ({pres})")
    pg.locator("#suppPresets button", has_text="Whey").click(); pg.wait_for_timeout(60)
    pg.locator("#suppPresets button", has_text="Magnezyum").click(); pg.wait_for_timeout(60)
    w = supp(pg, "Whey")[0]
    check(w["dose"] == 1 and w["step"] == 0.5 and w["min"] == 0.5 and w["max"] == 4 and w["unit"] == "ölçek" and w["time"] == "post" and w["preset"] == "whey", "Whey: 1 ölçek, adım 0,5, 0,5–4, antrenman sonrası")
    check(pg.locator("#suppPresets button", has_text="Whey").count() == 0, "eklenen hazır takviye listeden kalkıyor")
    # Elle doz: Greens → "2 kapsül"
    pg.locator('#suppEditList [data-supp-row="1"] [data-supp-dose]').click(); pg.wait_for_timeout(80)
    check(pg.is_visible("#uiDialog") and "nd" in pg.get_attribute("#uiDialog", "class"), "doz beslenme temalı pencerede soruluyor")
    pg.fill("#uiDlgInput", "2 kapsül"); pg.click("#uiDlgOk"); pg.wait_for_timeout(80)
    g = supp(pg, "Greens")[0]
    check(g["dose"] == 2 and g["unit"] == "kapsül" and g["step"] == 1, f"elle doz: 2 kapsül, adım 1 ({g})")
    pg.locator('#suppEditList [data-supp-row="1"] [data-supp-dose]').click(); pg.wait_for_timeout(80)
    pg.fill("#uiDlgInput", "kapsül iki"); pg.click("#uiDlgOk"); pg.wait_for_timeout(80)
    check(pg.is_visible("#uiDialog") and "anlaşılamadı" in pg.inner_text("#uiDialog"), "sayısız doz uyarı veriyor")
    pg.click("#uiDlgOk"); pg.wait_for_timeout(60)
    check(supp(pg, "Greens")[0]["dose"] == 2, "hatalı girişte doz değişmedi")
    small = pg.evaluate(SMALL_JS, "#suppCard button, #suppCard select")
    check(not small and ov(pg), f"düzenleme modu 44 px ve taşmasız {small}")
    pg.set_viewport_size({"width": 320, "height": 740}); pg.wait_for_timeout(60)
    check(ov(pg), "düzenleme modu 320 px'te taşmıyor")
    pg.set_viewport_size({"width": 375, "height": 812})
    pg.locator("#suppList button", has_text="Bitti").click(); pg.wait_for_timeout(80)

    # ---------- Doz ayarlayıcı: işaretlemeden doz değişir
    whey = '#suppList [data-supp-pill^="sup_whey"]'
    check("1 ölçek" in pg.inner_text(whey) and "Antrenman sonrası" in pg.inner_text(whey), "kartta doz ve not")
    pg.locator(whey + " button[aria-label='Whey Protein dozunu artır']").click(); pg.wait_for_timeout(60)
    check(supp(pg, "Whey")[0]["dose"] == 1.5 and "1,5 ölçek" in pg.inner_text(whey), "+ → 1,5 ölçek (virgülle)")
    check(not st(pg)["supplements"].get(supp(pg, "Whey")[0]["id"]), "doz değiştirmek takviyeyi işaretlemiyor")
    for _ in range(2): pg.locator(whey + " button[aria-label='Whey Protein dozunu azalt']").click(); pg.wait_for_timeout(40)
    check(supp(pg, "Whey")[0]["dose"] == 0.5 and pg.locator(whey + " button[aria-label='Whey Protein dozunu azalt']").is_disabled(), "en az 0,5'te duruyor, − pasif")
    mg = '#suppList [data-supp-pill^="sup_magnesium"]'
    for _ in range(4): pg.locator(mg + " button[aria-label='Magnezyum dozunu artır']").click(); pg.wait_for_timeout(40)
    check(supp(pg, "Magnezyum")[0]["dose"] == 600 and pg.locator(mg + " button[aria-label='Magnezyum dozunu artır']").is_disabled(), "en fazla 600 mg'da duruyor, + pasif")
    groups = pg.locator("[data-supp-group]").all_inner_texts()
    check(groups == ["İlk öğünle", "Antrenman / Gün içi", "Akşam / Uyku öncesi", "Diğer"], f"Magnezyum akşam grubunda ({groups})")

    # ---------- İşaretleme, tamamlanma parıltısı
    pg.locator(whey + " .n-pill-main").click(); pg.wait_for_timeout(60)
    check("taken" in pg.get_attribute(whey, "class") and pg.get_attribute(whey + " .n-pill-main", "aria-pressed") == "true", "karta dokununca alındı")
    check("all-done" not in pg.get_attribute("#suppCard", "class"), "hepsi alınmadan parıltı yok")
    pg.evaluate("state.supplementList.forEach(s => state.supplements[s.id] = true); renderAll()")
    check("all-done" in pg.get_attribute("#suppCard", "class") and pg.inner_text("#suppCounter") == "5 / 5 Tamamlandı", "hepsi alınınca 5 / 5 ve yeşil parıltı")
    small = pg.evaluate(SMALL_JS, "#waterCard button, #suppCard button")
    check(not small and ov(pg), f"tüm düğmeler 44 px ve taşmasız {small}")
    pg.locator("#waterCard").scroll_into_view_if_needed(); pg.wait_for_timeout(100)
    pg.screenshot(path=SHOTS + "/v24_su_takviye.png", full_page=False)
    pg.locator("#suppCard").screenshot(path=SHOTS + "/v24_takviye_kart.png")
    pg.set_viewport_size({"width": 320, "height": 740}); pg.wait_for_timeout(60)
    check(ov(pg), "320 px'te taşma yok")
    pg.locator("#suppCard").screenshot(path=SHOTS + "/v24_takviye_320.png")
    pg.set_viewport_size({"width": 375, "height": 812})
    # Gündüz teması
    pg.evaluate("state.settings.theme = 'light'; renderAll()"); pg.wait_for_timeout(80)
    pg.locator("#waterCard").scroll_into_view_if_needed()
    pg.screenshot(path=SHOTS + "/v24_su_takviye_gunduz.png", full_page=False)
    pg.evaluate("state.settings.theme = 'dark'; renderAll()")

    # ---------- Yeni gün: işaretler ve su sıfır, dozlar korunur
    pg.evaluate("void manualNewDay()"); pg.wait_for_timeout(80); pg.click("#uiDlgOk"); pg.wait_for_timeout(120)
    s = st(pg)
    check(s["supplements"] == {} and s["waterLiters"] == 0, "yeni gün: işaretler ve su sıfırlandı")
    check(supp(pg, "Whey")[0]["dose"] == 0.5 and supp(pg, "Magnezyum")[0]["dose"] == 600 and supp(pg, "Greens")[0]["dose"] == 2, "yeni gün: ayarlanan dozlar korundu")
    check(pg.inner_text("#waterPct") == "%0" and pg.inner_text("#suppCounter") == "0 / 5 Tamamlandı", "kartlar sıfırdan başlıyor")

    # ---------- Kreatin listeden çıkınca +0,5 L kalkar
    pg.evaluate("removeSupp(state.supplementList.findIndex(s => s.id === 'creatine'))"); pg.wait_for_timeout(60)
    check(pg.inner_text("#waterTarget") == "3,5" and "kreatin" not in pg.inner_text("#waterNote"), "kreatin yokken 100 kg → 3,5 L")

    # ---------- Profil: Su hedefi kiloya göre
    pg.evaluate("openProfile()"); pg.wait_for_timeout(120)
    check(pg.is_checked("#setWaterAuto") and pg.is_disabled("#setWater") and "3,5 L" in pg.inner_text("#setWaterHint"), "Profil: açık, elle kutu pasif, hesap yazıyor")
    pg.fill("#pfWeight", "90"); pg.wait_for_timeout(40)
    check("3,2 L" in pg.inner_text("#setWaterHint"), f"kilo yazılınca açıklama güncelleniyor ({pg.inner_text('#setWaterHint')})")
    pg.fill("#pfWeight", "100")
    pg.uncheck("#setWaterAuto"); pg.wait_for_timeout(40)
    check(not pg.is_disabled("#setWater"), "kapatınca elle hedef yazılabiliyor")
    pg.fill("#setWater", "3,1"); pg.click("#profileSave"); pg.wait_for_timeout(150)
    s = st(pg)
    check(s["settings"]["waterAuto"] is False and s["settings"]["waterTarget"] == 3.1, "kaydedildi: otomatik kapalı, 3,1 L")
    pg.evaluate("closeProfile && closeProfile()") if pg.evaluate("typeof closeProfile === 'function'") else None
    pg.wait_for_timeout(100)
    check(pg.inner_text("#waterTarget") == "3,1", "su kartı elle hedefi gösteriyor")

    # ---------- iPad: kartlar yan yana
    pg.set_viewport_size({"width": 820, "height": 1180}); pg.wait_for_timeout(100)
    r1 = pg.evaluate("document.getElementById('waterCard').getBoundingClientRect().toJSON()")
    r2 = pg.evaluate("document.getElementById('suppCard').getBoundingClientRect().toJSON()")
    check(abs(r1["top"] - r2["top"]) < 2 and r2["left"] > r1["right"] and r2["width"] > r1["width"], "iPad: su solda, takviye sağda ve daha geniş")
    b.close()
finally:
    srv.terminate()
print("ERRORS:", errs or "none")
print(f"{'HATA: ' + str(len(fails)) + ' kontrol başarısız' if fails else 'TÜM KONTROLLER GEÇTİ'}")
sys.exit(1 if errs or fails else 0)
