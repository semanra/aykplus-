# v28: tasarım denetimi düzeltmeleri (docs/ANALIZ-tasarim.md "Hemen" listesi) + Mobilite "Alacakaranlık" + Profil "Grafit".
import os, sys, json, subprocess, time
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOTS = os.path.join(os.path.dirname(__file__), "shots")
os.makedirs(SHOTS, exist_ok=True)
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8778'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = "http://localhost:8778/index.html"
def st(pg): return pg.evaluate("JSON.parse(localStorage.getItem('ayk_plus_v5_state'))")
def ov(pg):
    w = pg.evaluate("[document.documentElement.scrollWidth, document.documentElement.clientWidth]"); return w[0] <= w[1]
def css(pg, sel, prop):
    return pg.evaluate("([s, p]) => { const e = document.querySelector(s); return e ? getComputedStyle(e)[p] : null; }", [sel, prop])
def box(pg, sel):
    return pg.evaluate("s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, r.height, r.right]; }", sel)
SMALL_JS = """(sel) => [...document.querySelectorAll(sel)]
  .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.width < 44 || r.height < 44); })
  .map(e => (e.textContent || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 30) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height))"""
# Kenar çizgisi taşmadan sığmış mı: son alt sekmenin sağ kenarı kapsayıcının içinde
FITS_JS = """(sel) => { const n = document.querySelector(sel); if (!n) return null; const nr = n.getBoundingClientRect();
  const last = n.lastElementChild.getBoundingClientRect(); return last.right <= nr.right + 0.5 && n.scrollWidth <= n.clientWidth + 1; }"""

try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    for W in (320, 390):
      ctx = b.new_context(viewport={"width": W, "height": 700}, device_scale_factor=2, is_mobile=True, has_touch=True)
      ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.getElementById('splash'); if(s) s.remove();})")
      pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
      pg.goto(URL); pg.wait_for_timeout(400)
      tag = f"[{W}px] "

      # ---- Sürüm
      if W == 390:
        import re
        v = int(re.search(r"AYK\+ v(\d+)", pg.content()).group(1)); c = int(re.search(r"aykplus-v(\d+)", open(os.path.join(REPO, "sw.js"), encoding="utf-8").read()).group(1))
        check(v >= 28, f"Ayarlar'da sürüm etiketi v28 veya sonrası (v{v})")
        check(c == v, f"sw.js önbellek sürümü uygulamayla aynı (aykplus-v{c})")

      # ---- Beslenme: alt sekmeler sığıyor, "Yedim" koyu yeşil
      pg.evaluate("switchTab('nutrition'); setNutriView('today')"); pg.wait_for_timeout(150)
      check(pg.evaluate(FITS_JS, "#nutriNav") is True, tag + "Beslenme alt sekmeleri yana kaymadan sığıyor (Geçmiş kesilmiyor)")
      check(not pg.evaluate(SMALL_JS, "#nutriNav button"), tag + "Beslenme alt sekmeleri ≥ 44 px")
      yedim = pg.locator("#todayMeals button", has_text="Yedim").first
      check(yedim.evaluate("e => getComputedStyle(e).backgroundColor") == "rgb(21, 128, 61)", tag + "Yedim düğmesi #15803D (beyaz yazı 5,0:1)")
      check(ov(pg), tag + "Beslenme yatay taşma yok")
      if W == 390:
        pg.evaluate("state.settings.nutriLight = true; renderAll()"); pg.wait_for_timeout(100)
        check(css(pg, "#navBtnGym", "color") == "rgb(113, 113, 122)", "gündüz teması: seçili olmayan alt menü #71717A")
        check(css(pg, "#navBtnNutrition", "color") != "rgb(113, 113, 122)", "gündüz teması: seçili Beslenme kendi renginde")
        pg.evaluate("state.settings.nutriLight = false; renderAll()"); pg.wait_for_timeout(100)
        check(css(pg, "#navBtnGym", "color") == "rgb(139, 139, 147)", "koyu tema: alt menü rengi değişmedi (#8B8B93)")

      # ---- Antrenman: alt sekmeler, gün düğmeleri, not kutusu
      pg.evaluate("switchTab('gym'); setGymView('today')"); pg.wait_for_timeout(150)
      check(pg.evaluate(FITS_JS, "nav.gym-subnav") is True, tag + "Antrenman alt sekmeleri sığıyor")
      small = pg.evaluate(SMALL_JS, "#gymRoot button[onclick^='selectWorkoutDay']")
      check(not small, tag + f"gün seçim düğmeleri ≥ 44 px ({small})")
      pg.evaluate("startWorkout()"); pg.wait_for_timeout(150)
      h = pg.evaluate("Math.round(document.querySelector('input.t-note').getBoundingClientRect().height)")
      check(h >= 44, tag + f"'Not ekle' kutusu ≥ 44 px ({h})")
      check(css(pg, "#gymRoot .t-btn, .t-btn", "backgroundColor") in ("rgb(31, 209, 193)", None), tag + "Antrenman vurgusu turkuaz kaldı")
      pg.evaluate("state.gymActive = false; renderAll()")
      check(ov(pg), tag + "Antrenman yatay taşma yok")

      # ---- Mobilite: Alacakaranlık zeminleri, onay kutusu çerçevesi
      pg.evaluate("state.mobilityRoutine.items[0].done = true; switchTab('mobility')"); pg.wait_for_timeout(150)
      check(css(pg, "body", "backgroundColor") == "rgb(7, 6, 13)", tag + "Mobilite zemini indigo-siyah #07060D")
      check(css(pg, "#mobList .m-card:not(.done)", "backgroundColor") == "rgb(19, 17, 28)", tag + "Mobilite kartı #13111C")
      check(css(pg, "#mobList .m-card:not(.done) .m-chk", "borderTopColor") == "rgb(107, 102, 128)", tag + "boş onay kutusu çerçevesi #6B6680 (≥ 3:1)")
      check(css(pg, "#mobList .m-grip", "color") == "rgb(125, 120, 148)", tag + "sürükleme tutamacı #7D7894 (≥ 3:1)")
      check(css(pg, "#mobList .m-card.done .m-chk", "backgroundColor") == "rgb(179, 166, 255)", tag + "vurgu lavanta #B3A6FF (parlaklık korunuyor)")
      check(css(pg, ".bottom-nav", "backgroundColor") == "rgba(13, 12, 20, 0.97)", tag + "alt menü indigo tonunda")
      # Antrenman'a dönünce zemin yine saf siyah
      pg.evaluate("switchTab('gym')"); pg.wait_for_timeout(100)
      check(css(pg, "body", "backgroundColor") == "rgb(0, 0, 0)", tag + "Antrenman zemini saf siyah kaldı")

      if W == 390:
        # Hareket ekle: rutinde olan → çerçeveli ✓ + onay
        pg.evaluate("switchTab('mobility'); mobAddOpen()"); pg.wait_for_timeout(150)
        n0 = len(st(pg)["mobilityRoutine"]["items"])
        row_in = pg.locator("#mobAddList [data-mob-lib]", has_text="Rutinde").first
        btn_in = row_in.locator("[data-mob-add]")
        check("in" in (btn_in.get_attribute("class") or "").split() and "zaten rutinde" in (btn_in.get_attribute("aria-label") or ""),
              "rutindeki harekette düğme çerçeveli ✓ ve açıklamalı")
        check(btn_in.evaluate("e => getComputedStyle(e).backgroundColor") == "rgba(0, 0, 0, 0)", "rutindeki düğme dolu değil")
        btn_in.click(); pg.wait_for_timeout(120)
        check(pg.is_visible("#uiDlgOk") and "Zaten rutinde" in pg.inner_text("#uiDlgTitle"), "rutindekini eklemek onay soruyor")
        pg.click("#uiDlgCancel"); pg.wait_for_timeout(120)
        check(len(st(pg)["mobilityRoutine"]["items"]) == n0, "Vazgeç → eklenmedi")
        btn_in.click(); pg.wait_for_timeout(120); pg.click("#uiDlgOk"); pg.wait_for_timeout(150)
        check(len(st(pg)["mobilityRoutine"]["items"]) == n0 + 1, "Yine de ekle → eklendi")
        row_new = pg.locator("#mobAddList [data-mob-lib]:not(:has-text('Rutinde'))").first
        name_new = row_new.locator(".m-name").inner_text().strip()
        btn_new = row_new.locator("[data-mob-add]")
        check("in" not in (btn_new.get_attribute("class") or "").split(), "rutinde olmayan harekette dolu +")
        btn_new.click(); pg.wait_for_timeout(150)
        check(not pg.is_visible("#uiDlgOk") and st(pg)["mobilityRoutine"]["items"][-1]["name"] == name_new, "rutinde olmayan soru sormadan eklenir")
        pg.screenshot(path=SHOTS + "/v28_mob_ekle.png")
        # Sayaç: Profil rengi sızmıyor
        pg.evaluate("mobBack(); const t = state.mobilityRoutine.items.find(i => i.mode === 'time'); mobTimerStart(t.id)"); pg.wait_for_timeout(150)
        check(pg.evaluate("document.body.classList.contains('pf-open') && !document.body.classList.contains('pf-page')"), "sayaç açıkken Profil rengi devrede değil")
        check(css(pg, "#mobTimer", "backgroundColor") == "rgb(7, 6, 13)", "sayaç zemini indigo-siyah")
        pg.screenshot(path=SHOTS + "/v28_mob_sayac.png")
        pg.evaluate("mobTimerClose()"); pg.wait_for_timeout(100)

      # ---- Profil: Grafit, yağ oranı kutuları hizalı
      pg.evaluate("switchTab('gym'); openProfile()"); pg.wait_for_timeout(200)
      check(css(pg, "#profileSave", "backgroundColor") == "rgb(244, 244, 245)" and css(pg, "#profileSave", "color") == "rgb(9, 9, 11)",
            tag + "Profil 'Kaydet' kırık beyaz, yazı koyu")
      bf, tbf = box(pg, "#setBf"), box(pg, "#setTargetBf")
      check(abs(bf[1] - tbf[1]) < 1 and abs(bf[3] - tbf[3]) < 1, tag + f"yağ oranı kutuları aynı hizada ({bf[1]:.0f} / {tbf[1]:.0f})")
      if W == 390:
        pg.evaluate("document.getElementById('setWaterAuto').checked = true")
        check(css(pg, "#setWaterAuto", "backgroundColor") == "rgb(244, 244, 245)", "Profil anahtarı açıkken kırık beyaz")
        pg.screenshot(path=SHOTS + "/v28_profil.png")
      pg.evaluate("hideProfile()"); pg.wait_for_timeout(100)
      check(not pg.evaluate("document.body.classList.contains('pf-page')"), tag + "Profil kapanınca Grafit kalkıyor")
      pg.evaluate("startWorkout()"); pg.wait_for_timeout(100)
      check(pg.evaluate("getComputedStyle(document.querySelector('#gymRoot .t-btn, #gymRoot .t-btn-outline')).borderColor + getComputedStyle(document.querySelector('#gymRoot .t-btn, #gymRoot .t-btn-outline')).backgroundColor").count("31, 209, 193") >= 1,
            tag + "Profil kapandıktan sonra Antrenman yine turkuaz")
      pg.evaluate("state.gymActive = false; renderAll()")

      # ---- İlerleme: dokunma alanı + kontrast
      pg.evaluate("""() => { for (let i = 5; i >= 1; i--) { const t = Date.now() - i*864e5; state.weightLogs.push({ date: fmtDate(t), weight: 100 + i/10, ts: t }); }
        switchTab('progress'); setProgressView('kilo'); }"""); pg.wait_for_timeout(200)  # v29: tartı listesi Kilo alt sekmesinde
      small = pg.evaluate(SMALL_JS, "#progressContent button")
      check(not small, tag + f"İlerleme'deki tüm düğmeler ≥ 44 px ({small[:4]})")
      check(pg.locator("#progressContent button[aria-label='Tartıyı sil']").count() >= 1, tag + "tartı silme düğmesinin sesli adı var")
      check(css(pg, "#progressContent .p-dim", "color") == "rgb(139, 139, 147)", tag + "İlerleme (v29) gri yazı #8B8B93 (siyah zeminde 6,2:1)")
      check(ov(pg), tag + "İlerleme yatay taşma yok")
      n = len(st(pg)["weightLogs"])
      pg.locator("#progressContent button[aria-label='Tartıyı sil']").first.click(); pg.wait_for_timeout(150)
      check(len(st(pg)["weightLogs"]) == n - 1, tag + "büyütülmüş × hâlâ tartıyı siliyor")
      if W == 320: pg.screenshot(path=SHOTS + "/v28_ilerleme_320.png")
      ctx.close()

    check(not errs, f"sayfa hatası yok ({errs[:3]})")
    b.close()
finally:
    srv.terminate()
print(f"\n{len(fails)} hata" if fails else "\nHEPSİ GEÇTİ")
sys.exit(1 if fails else 0)
