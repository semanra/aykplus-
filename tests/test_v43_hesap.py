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

    check(not errs, f"sayfa hatası yok ({errs[:3]})")
    b.close()
finally:
    srv.terminate()
print(f"\n{len(fails)} hata" if fails else "\nHEPSİ GEÇTİ")
sys.exit(1 if fails else 0)
