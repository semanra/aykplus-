# v17 (4. paket): Takviye zamanlama etiketleri (Sabah tok, Antrenman öncesi/sonrası, Yatmadan önce, Özel);
# Bugün ekranında takviyeler bu zamana göre gruplanır ve sıralanır.
import os, sys
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOTS = os.path.join(os.path.dirname(__file__), "shots")
os.makedirs(SHOTS, exist_ok=True)
import subprocess, time, json
srv = subprocess.Popen(['python3', '-m', 'http.server', '8769'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
def st(pg): return pg.evaluate("JSON.parse(localStorage.getItem('ayk_plus_v5_state'))")
def ov(pg):
    w = pg.evaluate("[document.documentElement.scrollWidth, document.documentElement.clientWidth]"); return w[0] <= w[1]
answers = []
def on_dialog(d):
    if d.type == "prompt" and answers: d.accept(answers.pop(0))
    else: d.accept()
SMALL_JS = """(sel) => [...document.querySelectorAll(sel)]
  .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.width < 44 || r.height < 44); })
  .map(e => (e.textContent || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 30) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height))"""

try:
  with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(color_scheme="dark", viewport={"width": 375, "height": 812}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.getElementById('splash'); if(s) s.remove();})")
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("dialog", on_dialog)
    pg.goto("http://localhost:8769/index.html"); pg.wait_for_timeout(300)
    pg.evaluate("switchTab('nutrition'); setNutriView('today')"); pg.wait_for_timeout(100)

    # Varsayılan: zaman yok → grup başlığı yok, eski görünüm
    check(pg.locator("[data-supp-group]").count() == 0 and pg.locator("#suppList button").count() == 4, "zaman seçilmemişken başlıksız eski görünüm")
    # Düzenle → zaman seç
    pg.locator("#suppList button", has_text="Düzenle").click(); pg.wait_for_timeout(80)
    check(pg.locator("#suppEditList [data-supp-row]").count() == 3, "düzenle modunda her takviye için zaman seçimi")
    opts = pg.locator('#suppEditList [data-supp-row="0"] select option').all_inner_texts()
    check(opts == ["Zaman seç", "Sabah tok", "Antrenman öncesi", "Antrenman sonrası", "Yatmadan önce", "Özel"], f"seçenekler: {opts}")
    pg.select_option('#suppEditList [data-supp-row="0"] select', "post")   # Kreatin → antrenman sonrası
    pg.wait_for_timeout(60)
    pg.select_option('#suppEditList [data-supp-row="1"] select', "morning") # Greens → sabah
    pg.wait_for_timeout(60)
    answers.append("Öğle yemeğiyle")
    pg.select_option('#suppEditList [data-supp-row="2"] select', "custom")  # Omega → özel
    pg.wait_for_timeout(80)
    check(pg.is_visible("#uiDialog") and "nd" in pg.get_attribute("#uiDialog", "class"), "v21: özel etiket beslenme temalı pencerede soruluyor")
    pg.fill("#uiDlgInput", answers.pop(0)); pg.click("#uiDlgOk"); pg.wait_for_timeout(80)
    sl = st(pg)["supplementList"]
    check(sl[0]["time"] == "post" and sl[1]["time"] == "morning" and sl[2]["time"] == "custom" and sl[2]["timeLabel"] == "Öğle yemeğiyle", "zamanlar kaydedildi (özel etiket dahil)")
    small = pg.evaluate(SMALL_JS, "#suppList button, #suppList select")
    check(not small and ov(pg), f"düzenleme satırları 44 px ve taşmasız {small}")
    pg.set_viewport_size({"width": 320, "height": 740}); pg.wait_for_timeout(60)
    check(ov(pg), "düzenleme modu 320 px'te taşmıyor")
    pg.set_viewport_size({"width": 375, "height": 812})
    pg.locator("#suppList button", has_text="Bitti").click(); pg.wait_for_timeout(80)

    # Gruplama ve sıralama: Sabah tok → Antrenman sonrası → Özel
    groups = pg.locator("[data-supp-group]").all_inner_texts()
    check(groups == ["İlk öğünle", "Antrenman / Gün içi", "Öğle yemeğiyle"], f"v24: Bugün'de 3 ana gruba göre gruplandı ve sıralandı: {groups}")
    order = pg.evaluate("[...document.querySelectorAll('#suppList [data-supp-group], #suppList .n-pill-name')].map(e => e.dataset.suppGroup ? '#' + e.dataset.suppGroup : e.textContent.trim())")
    check(order[:6] == ["#İlk öğünle", "🥬 Greens", "#Antrenman / Gün içi", "⚡ Kreatin (5g)", "#Öğle yemeğiyle", "🐟 Omega/Vit"], f"sıra doğru: {order[:6]}")
    # İşaretleme hâlâ çalışıyor
    pg.locator("#suppList button", has_text="Kreatin").click(); pg.wait_for_timeout(60)
    check(st(pg)["supplements"].get("creatine") is True, "gruplu görünümde işaretleme çalışıyor")
    # Zamansız yeni takviye "Diğer" grubunda
    pg.locator("#suppList button", has_text="Düzenle").click(); pg.wait_for_timeout(60)
    answers.append("💊 D3 Vitamini")
    pg.locator("#suppList button", has_text="+ Ekle").click(); pg.wait_for_timeout(80)
    pg.fill("#uiDlgInput", answers.pop(0)); pg.click("#uiDlgOk"); pg.wait_for_timeout(80)
    pg.locator("#suppList button", has_text="Bitti").click(); pg.wait_for_timeout(80)
    check(pg.locator("[data-supp-group]").all_inner_texts()[-1] == "Diğer" and "D3" in pg.inner_text("#suppList"), "zaman seçilmeyen takviye 'Diğer' grubunda en sonda")
    # Zamanı kaldırma
    pg.evaluate("suppEdit = true; renderAll()"); pg.select_option('#suppEditList [data-supp-row="0"] select', ""); pg.wait_for_timeout(60)
    check("time" not in st(pg)["supplementList"][0], "'Zaman seç' ile etiket kaldırılıyor")
    pg.evaluate("suppEdit = false; renderAll()")
    pg.screenshot(path=SHOTS + "/v17_supps.png")

    # Eski veri: geçersiz zaman ve bozuk satır temizlenir
    legacy = {"activeTab": "nutrition", "supplementList": [{"id": "a", "name": "Kreatin", "time": "gece"}, {"id": "b", "name": "Omega", "time": "custom"}, None, {"name": "isimsiz"}], "supplements": {"a": True}}
    pg.evaluate("s => localStorage.setItem('ayk_plus_v5_state', s)", json.dumps(legacy)); pg.reload(); pg.wait_for_timeout(300)
    sl = st(pg)["supplementList"]
    check(len(sl) == 2 and "time" not in sl[0] and sl[1]["time"] == "custom" and sl[1]["timeLabel"] == "Özel" and st(pg)["supplements"]["a"] is True, "eski kayıt: geçersiz zaman silindi, bozuk satırlar atıldı, işaretler korundu")
    b.close()
finally:
    srv.terminate()
print("ERRORS:", errs or "none")
print(f"{'HATA: ' + str(len(fails)) + ' kontrol başarısız' if fails else 'TÜM KONTROLLER GEÇTİ'}")
sys.exit(1 if errs or fails else 0)
