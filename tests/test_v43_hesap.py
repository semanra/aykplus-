# v43: hedef (Ver/Koru/Al), hareketlilik, kanıta dayalı protein, yağ %25 — hesap ve göç.
import os, sys, json, subprocess, time, datetime
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8802'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = "http://localhost:8802/index.html"
KEY = "ayk_plus_v5_state"
def st(pg): return pg.evaluate("aykStoredState()")

try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    def page():
        ctx = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844})
        ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.getElementById('splash'); if(s) s.remove();})")
        pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(URL); pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(50)
        return ctx, pg
    def seed(pg, data):
        pg.evaluate("s => { localStorage.clear(); void indexedDB.deleteDatabase('aykplus'); localStorage.setItem('%s', s); }" % KEY, json.dumps(data))
        pg.reload(); pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(50)

    ctx, pg = page()
    # ================= 1) HESAP ÇEKİRDEĞİ + GÖÇ =================
    OWNER = {"weight": 105, "deficit": 700, "dayType": "train",
             "settings": {"sex": "male", "age": 26, "height": 180, "targetWeight": 82}}
    seed(pg, OWNER); t = pg.evaluate("getTargets()"); s = st(pg)
    check(s["dataVer"] == 3 and s["settings"]["goal"] == "lose" and s["settings"]["activity"] == "mid", "eski kayıt: lose + mid, dataVer 3")
    check(t["calTarget"] == 2478, "sahibin kalorisi değişmedi (2478)")
    check(t["proTarget"] == 180 and t["fatTarget"] == 69 and t["carbTarget"] == 284, "protein 180, yağ 69, karb 284")
    check(s["deficit"] == 700, "açık korunuyor")

    seed(pg, {**OWNER, "deficit": 0}); t = pg.evaluate("getTargets()")
    check(st(pg)["settings"]["goal"] == "keep" and t["calTarget"] == t["tdee"], "açık 0 → keep, kalori = tdee")

    seed(pg, {**OWNER, "settings": {**OWNER["settings"], "bodyFat": 25}})
    check(pg.evaluate("getTargets().proTarget") == 197, "yağ oranı 25: yağsız kütle × 2,5 = 197")
    seed(pg, {**OWNER, "settings": {**OWNER["settings"], "proteinHigh": True}})
    check(pg.evaluate("getTargets().proTarget") == 210, "Yüksek: kilo × 2 = 210")
    LEAN = {"weight": 80, "deficit": 500, "dayType": "train", "settings": {"sex": "male", "age": 30, "height": 180, "targetWeight": 80, "bodyFat": 10, "proteinHigh": True}}
    seed(pg, LEAN)
    check(pg.evaluate("getTargets().proTarget") == 176, "zayıf + Yüksek: Standart (176) Yüksek'ten (160) büyükse Standart")
    BIG = {"weight": 130, "deficit": 0, "dayType": "train", "settings": {"sex": "male", "age": 35, "height": 182, "targetWeight": 85, "goal": "keep"}}
    seed(pg, BIG); check(pg.evaluate("getTargets().proTarget") == 136, "130 kg, hedef 85, keep: 85 × 1,6 = 136")
    seed(pg, {**BIG, "deficit": 600, "settings": {**BIG["settings"], "goal": "lose"}})
    check(pg.evaluate("getTargets().proTarget") == 187, "130 kg lose: 85 × 2,2 = 187")
    F = {"weight": 120, "deficit": 1000, "dayType": "rest", "settings": {"sex": "female", "age": 55, "height": 155, "targetWeight": 70, "activity": "low"}}
    seed(pg, F); t = pg.evaluate("getTargets()")
    check(t["calTarget"] == 1400 and t["proTarget"]*4 + t["fatTarget"]*9 + t["carbTarget"]*4 <= 1400 + 8, "taban 1400'de hedef toplamı kaloriyi aşmıyor")
    G = {"weight": 70, "deficit": 0, "dayType": "train", "settings": {"sex": "male", "age": 30, "height": 178, "targetWeight": 76, "goal": "gain", "gainPace": "mid"}}
    seed(pg, G); t = pg.evaluate("getTargets()")
    check(t["tdee"] == 2585 and t["goalDelta"] == 388 and t["calTarget"] == 2973 and t["proTarget"] == 126 and t["fatTarget"] == 83, "gain mid: +%15, protein 70 × 1,8")
    seed(pg, {**OWNER, "settings": {**OWNER["settings"], "activity": "high"}})
    check(abs(pg.evaluate("getTargets().tdee") - 3485) <= 1, "high: 2050 × 1,70")
    seed(pg, {**OWNER, "settings": {**OWNER["settings"], "targetWeight": ""}})
    check(pg.evaluate("getTargets().proTarget") == 231, "hedef kilo boş: ref = kilo (105 × 2,2 = 231)")
    seed(pg, {**OWNER, "settings": {**OWNER["settings"], "goal": 5, "activity": "x", "gainPace": None, "proteinHigh": "evet"}})
    s = st(pg)["settings"]
    check(s["goal"] == "lose" and s["activity"] == "mid" and s["gainPace"] == "mid" and s["proteinHigh"] is False, "bozuk ayarlar geçerli değere döndü")
    seed(pg, {**OWNER, "dataVer": 3, "deficit": 0, "settings": {**OWNER["settings"], "goal": "lose"}})
    check(st(pg)["settings"]["goal"] == "lose", "dataVer 3 kayıtta göç tekrar çalışmıyor (kullanıcının seçimi korunur)")
    ctx.close()

    # ================= 2) MENÜLERİM HEDEF KARTI =================
    ctx, pg = page()
    seed(pg, OWNER); pg.evaluate("setNutriView('menus')"); pg.wait_for_timeout(80)
    check(pg.is_visible("#goalLose") and pg.is_visible("#goalVal"), "Hedef kartı görünür")
    check(pg.is_visible("#loseBox") and not pg.is_visible("#gainBox") and "kayıp" in pg.inner_text("#timelineInfo"), "Ver: kaydırıcı görünür, 'kayıp'")
    pg.screenshot(path=os.path.join(REPO, "tests", "shots", "v43_hedef_ver_koyu.png"))
    pg.click("#goalGain"); pg.wait_for_timeout(80)
    check(st(pg)["settings"]["goal"] == "gain" and pg.is_visible("#gainBox") and not pg.is_visible("#loseBox"), "Al: hız düğmeleri görünür")
    check("ulaştın" in pg.inner_text("#timelineInfo"), "Al + kilo (105) hedefin (82) üstünde: 'hedefine ulaştın', negatif hafta yok")
    pg.evaluate("state.settings.targetWeight = 110; renderAll()")
    check("alım" in pg.inner_text("#timelineInfo") and "hafta" in pg.inner_text("#timelineInfo"), "Al: 'haftalık ~… kg alım → … hafta'")
    c1 = pg.evaluate("getTargets().calTarget"); pg.click("#paceFast"); pg.wait_for_timeout(80)
    check(st(pg)["settings"]["gainPace"] == "fast" and pg.evaluate("getTargets().calTarget") > c1 and pg.inner_text("#goalVal").startswith("+"), "Hızlı: kalori arttı, '+' gösterilir")
    pg.screenshot(path=os.path.join(REPO, "tests", "shots", "v43_hedef_al_koyu.png"))
    pg.click("#goalKeep"); pg.wait_for_timeout(80)
    check("koru" in pg.inner_text("#timelineInfo").lower() and not pg.is_visible("#loseBox") and not pg.is_visible("#gainBox"), "Koru")
    pg.evaluate("state.deficit = 0; renderAll()"); pg.click("#goalLose"); pg.wait_for_timeout(80)
    check(st(pg)["deficit"] == 500, "Ver'e açık 0 iken geçince 500")
    for sel in ["#goalLose", "#goalKeep", "#goalGain", "#paceSlow"]:
        pg.click("#goalGain"); bb = pg.locator(sel).bounding_box(); check(bb and bb["height"] >= 44, sel + " ≥ 44 px")
    pg.evaluate("state.settings.theme = 'light'; applyTheme()"); pg.wait_for_timeout(80)
    pg.screenshot(path=os.path.join(REPO, "tests", "shots", "v43_hedef_al_acik.png"))
    pg.click("#goalLose"); pg.wait_for_timeout(80)
    pg.screenshot(path=os.path.join(REPO, "tests", "shots", "v43_hedef_ver_acik.png"))
    ctx.close()

    # ================= 3) KOÇ İKİ YÖNLÜ =================
    ctx, pg = page()
    DAYMS = 86400000
    def wl(w0, w1):
        nowms = int(time.time() * 1000)
        return [{"date": "x", "weight": round(w0 + (w1 - w0) * d / 21, 2), "ts": nowms - (21 - d) * DAYMS} for d in [0, 4, 8, 12, 17, 21]]
    def coach(data):
        seed(pg, data)
        return pg.evaluate("coachAnalysis()"), pg.evaluate("progCoachHtml()")
    GS = {"sex": "male", "age": 30, "height": 178, "targetWeight": 76, "goal": "gain", "gainPace": "mid"}
    a_gain, html = coach({"weight": 71.5, "deficit": 0, "dayType": "train", "weightLogs": wl(70, 71.5), "settings": GS})
    check(a_gain["ready"] and a_gain["expectedWeekly"] > 0 and a_gain["gainTooFast"] and "fazla yağ" in html, "Al + hızlı alım: uyarı")
    check(not a_gain["tooFast"] and not a_gain["gaining"], "Al'da kilo verme uyarıları çıkmıyor")
    a, html = coach({"weight": 70, "deficit": 0, "dayType": "train", "weightLogs": wl(70, 70), "settings": GS})
    check(a["notGaining"] and "almıyorsun" in html, "Al + alım yok: uyarı")
    a, html = coach({"weight": 78.5, "deficit": 0, "dayType": "train", "weightLogs": wl(80, 78.5), "settings": {**GS, "goal": "keep", "targetWeight": 80}})
    check(a["keepDrift"] and a["expectedWeekly"] == 0 and "korunmuyor" in html, "Koru + kayma: uyarı")
    a, html = coach({"weight": 101, "deficit": 700, "dayType": "train", "weightLogs": wl(105, 101), "settings": {"sex": "male", "age": 26, "height": 180, "targetWeight": 82}})
    check(a["tooFast"] and not a["gainTooFast"] and a["goal"] == "lose", "Ver: eski uyarı aynı")

    ctx.close()

    # ================= 4) PROFİL: HAREKETLİLİK + PROTEİN =================
    ctx, pg = page()
    seed(pg, OWNER)
    pg.evaluate("openProfile()"); pg.wait_for_timeout(150)
    check(pg.input_value("#setActivity") == "mid" and pg.input_value("#setProtein") == "std", "Profil varsayılanları")
    c0 = pg.evaluate("getTargets().calTarget"); pg.select_option("#setActivity", "high"); pg.wait_for_timeout(100)
    check(st(pg)["settings"]["activity"] == "high" and pg.evaluate("getTargets().calTarget") > c0 and "Kaydedildi" in pg.inner_text("#toastWrap"), "hareketlilik otomatik kaydedildi, kalori arttı")
    pg.select_option("#setProtein", "high"); pg.wait_for_timeout(100)
    check(st(pg)["settings"]["proteinHigh"] is True and pg.evaluate("getTargets().proTarget") == 210, "Yüksek protein kaydedildi")
    pg.locator("#toastWrap button", has_text="Geri al").last.click(); pg.wait_for_timeout(120)
    check(st(pg)["settings"]["proteinHigh"] is False and pg.input_value("#setProtein") == "std", "Geri al")
    check("araştırmalara göre yeterli" in pg.inner_text("#profilePage"), "protein açıklaması görünüyor")
    for sc in ["dark", "light"]:
        pg.emulate_media(color_scheme=sc); pg.wait_for_timeout(100)
        pg.locator("#setActivity").scroll_into_view_if_needed()
        pg.screenshot(path=os.path.join(REPO, "tests", "shots", f"v43_profil_{sc}.png"))
    ctx.close()
    check(not errs, f"sayfa hatası yok ({errs[:3]})")
    b.close()
finally:
    srv.terminate()
print(f"\n{len(fails)} hata" if fails else "\nHEPSİ GEÇTİ")
sys.exit(1 if fails else 0)
