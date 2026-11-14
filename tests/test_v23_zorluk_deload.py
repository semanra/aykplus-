# v23: set başına zorluk (Kolay/Orta/Zor/Tükeniş, isteğe bağlı), kilo önerisinin zorluğu hesaba katması, dinlenme haftası notu.
import os, sys, json, subprocess, time
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOTS = os.path.join(os.path.dirname(__file__), "shots")
os.makedirs(SHOTS, exist_ok=True)
srv = subprocess.Popen(['python3', '-m', 'http.server', '8776'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
fails = []
URL = "http://localhost:8776/index.html"
DAY = 24 * 3600 * 1000
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
def st(pg): return pg.evaluate("JSON.parse(localStorage.getItem('ayk_plus_v5_state'))")
SPLASH = "document.addEventListener('DOMContentLoaded',()=>{const s=document.getElementById('splash'); if(s) s.remove();})"
NOW = int(time.time() * 1000)
def ex(name, kg=60, reps=10):
    return {"name": name, "kind": "weight", "targetInfo": "3x8–12", "sets": [{"kg": kg, "reps": reps, "target": "8–12", "done": False} for _ in range(3)]}
STATE = {"activeTab": "gym", "gymView": "today", "workoutDays": [{"id": "d1", "name": "1. GÜN: Üst", "exercises": [ex("Bench Press"), ex("Barbell Row"), ex("Overhead Press", 40, 8), ex("Lat Pulldown", 50, 10)]}]}
def sess(name, ts, sets): return {"ts": ts, "logId": "w%d" % ts, "kind": "weight", "name": name, "sets": sets}
try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(color_scheme="dark", viewport={"width": 375, "height": 812}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.add_init_script(SPLASH)
    pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(300)
    keys = pg.evaluate("['Bench Press','Barbell Row','Overhead Press','Lat Pulldown'].map(exKey)")
    hist = {
        # Barbell Row: tüm setlerde 12 tekrar ama son set tükeniş → artırma yok, "aynı kiloda kal"
        keys[1]: [sess("Barbell Row", NOW - 2 * DAY, [{"kg": 60, "reps": 12, "e": 2}, {"kg": 60, "reps": 12, "e": 3}, {"kg": 60, "reps": 12, "e": 4}])],
        # Overhead Press: hedef üstüne çıkmadı ama hepsi Kolay → artır
        keys[2]: [sess("Overhead Press", NOW - 2 * DAY, [{"kg": 40, "reps": 9, "e": 1}, {"kg": 40, "reps": 9, "e": 1}, {"kg": 40, "reps": 8, "e": 1}])],
        # Lat Pulldown: 30 gün önce daha iyi; son 3 haftada 3 seans, ilerleme yok, setler zor → dinlenme haftası notu
        keys[3]: [sess("Lat Pulldown", NOW - 30 * DAY, [{"kg": 55, "reps": 10}] * 3)] +
                 [sess("Lat Pulldown", NOW - d * DAY, [{"kg": 50, "reps": 9, "e": 3}, {"kg": 50, "reps": 8, "e": 4}, {"kg": 50, "reps": 8, "e": 3}]) for d in (15, 8, 2)],
    }
    STATE["exerciseHistory"] = hist
    # eski/bozuk zorluk değerleri: geçersiz (9) ve tamamlanmamış sette olan silinmeli
    STATE["workoutDays"][0]["exercises"][0]["sets"][0]["e"] = 9
    STATE["workoutDays"][0]["exercises"][0]["sets"][1]["e"] = 3
    pg.evaluate("s => localStorage.setItem('ayk_plus_v5_state', JSON.stringify(s))", STATE)
    pg.reload(); pg.wait_for_timeout(500)
    s0 = st(pg)["workoutDays"][0]["exercises"][0]["sets"]
    check(all("e" not in x for x in s0), "geçersiz / tamamlanmamış setteki zorluk değeri temizlendi")

    pg.evaluate("switchTab('gym'); startWorkout()"); pg.wait_for_timeout(300)
    check(pg.evaluate("state.gymActive") is True, "aktif antrenman açıldı")

    # 1) Zorluk seçimi
    check(pg.locator("[data-effort-row]").count() == 0, "set tamamlanmadan zorluk sorulmuyor")
    pg.evaluate("toggleSetDone(0, 0)"); pg.wait_for_timeout(120)
    row = pg.locator('[data-effort-row="0-0"]')
    check(row.count() == 1 and "isteğe bağlı" in row.inner_text(), "set tamamlanınca altında 'nasıl geçti?' (isteğe bağlı)")
    sizes = pg.evaluate("""[...document.querySelectorAll('[data-effort-row="0-0"] button')].map(b => { const r = b.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })""")
    check(len(sizes) == 4 and all(w >= 44 and h >= 44 for w, h in sizes), f"4 seçenek, en az 44 px ({sizes})")
    row.locator("button", has_text="Zor").first.click(); pg.wait_for_timeout(100)
    check(pg.evaluate("activeDay().exercises[0].sets[0].e") == 3, "Zor seçildi (3)")
    pg.screenshot(path=os.path.join(SHOTS, "v23_zorluk.png"))
    pg.evaluate("toggleSetDone(0, 1)"); pg.wait_for_timeout(120)
    check(pg.locator('[data-effort-row="0-0"]').count() == 0 and pg.locator('[data-effort-row="0-1"]').count() == 1, "seçim satırı son tamamlanan sete geçti")
    check("Zor" in pg.inner_text("#exCard_0"), "önceki setin numarasının altında 'Zor' etiketi")
    pg.locator('[data-effort-row="0-1"] button', has_text="Tükeniş").click(); pg.wait_for_timeout(80)
    pg.locator('[data-effort-row="0-1"] button', has_text="Tükeniş").click(); pg.wait_for_timeout(80)
    check(pg.evaluate("activeDay().exercises[0].sets[1].e") is None, "aynı seçeneğe tekrar dokununca seçim kalkıyor")
    pg.locator('[data-effort-row="0-1"] button', has_text="Orta").click(); pg.wait_for_timeout(80)
    pg.evaluate("toggleSetDone(0, 1)"); pg.wait_for_timeout(80)
    check(pg.evaluate("activeDay().exercises[0].sets[1].e") is None, "set geri alınınca zorluğu silindi")
    pg.evaluate("toggleSetDone(0, 1)"); pg.wait_for_timeout(80)   # tekrar tamamla, zorluk seçme

    # 2) Öneriler
    card1 = pg.inner_text("#exCard_1")
    check(pg.locator('[data-hold="1"]').count() == 1 and "tükeniş" in card1 and "seans daha kal" in card1, "tüm tekrarlar tamam ama son set tükeniş → 'aynı kiloda kal'")
    check(pg.locator('#exCard_1 button', has_text="62,5 kg").count() == 0, "bu durumda kilo artırma düğmesi yok")
    card2 = pg.inner_text("#exCard_2")
    check("Kolay" in card2 and "42,5 kg" in card2, f"hepsi Kolay → artırma önerisi (40 → 42,5 kg)")
    check(pg.locator('[data-deload="3"]').count() == 1 and "dinlenme haftası" in pg.inner_text("#exCard_3"), "3 hafta ilerleme yok + setler zor → dinlenme haftası notu")
    check(pg.locator('[data-deload="0"]').count() == 0 and pg.locator('[data-deload="1"]').count() == 0, "diğer hareketlerde not yok")
    pg.locator("#exCard_3").scroll_into_view_if_needed(); pg.screenshot(path=os.path.join(SHOTS, "v23_deload.png"))
    w = pg.evaluate("[document.documentElement.scrollWidth, document.documentElement.clientWidth]")
    check(w[0] <= w[1], "375 px yatay taşma yok")
    pg.set_viewport_size({"width": 320, "height": 740}); pg.wait_for_timeout(100)
    w = pg.evaluate("[document.documentElement.scrollWidth, document.documentElement.clientWidth]")
    check(w[0] <= w[1], "320 px yatay taşma yok")
    pg.locator('[data-effort-row="0-1"]').scroll_into_view_if_needed(); pg.screenshot(path=os.path.join(SHOTS, "v23_zorluk_320.png"))
    pg.set_viewport_size({"width": 375, "height": 812}); pg.wait_for_timeout(80)
    pg.locator('[data-deload="3"] button', has_text="Anladım").click(); pg.wait_for_timeout(100)
    check(pg.locator('[data-deload="3"]').count() == 0 and st(pg)["workoutDays"][0]["exercises"][3].get("deloadDismiss"), "Anladım → not kapandı ve hatırlandı")

    # 3) Kayıt: zorluk geçmişe yazılır, programdaki setlerden temizlenir
    pg.evaluate("void finishAndLogWorkout()"); pg.wait_for_timeout(150); pg.click("#uiDlgOk"); pg.wait_for_timeout(250)
    s = st(pg)
    last = s["exerciseHistory"][keys[0]][-1]["sets"]
    check(last[0].get("e") == 3 and "e" not in last[1] and len(last) == 2, f"geçmişe zorlukla yazıldı ({last})")
    check(all("e" not in x and not x["done"] for x in s["workoutDays"][0]["exercises"][0]["sets"]), "programdaki setlerde zorluk temizlendi")
    check(not errs, f"hata yok {errs[:1]}")
    b.close()
finally:
    srv.terminate()
print(f"{'HATA: ' + str(len(fails)) + ' kontrol başarısız' if fails else 'TÜM KONTROLLER GEÇTİ'}")
sys.exit(1 if fails else 0)
