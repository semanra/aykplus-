# v62: birleşik "X VEYA Y" hareket adları. Kütüphanede iki birleşik ad kalktı (ayrı hâlleri zaten vardı), 6 birleşik ad ikiye ayrıldı.
# Göç adımı 7 (DATA_VER 7): sahibin programındaki "Pec Deck Fly VEYA Cable Crossover" → "Pec Deck Fly (Butterfly)",
# "Reverse Pec Deck veya Face Pull" → "Face Pull (Rope)"; geçmiş taşınır, hedefin geçmişiyle birleşir, hiçbir seans silinmez.
import os, sys, json, subprocess, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT, FIXTURE
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8819'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = "http://localhost:8819/index.html"
KEY = "ayk_plus_v5_state"
def boot(pg): pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(80)
def st(pg): return pg.evaluate("aykStoredState()")
OWN = json.load(open(FIXTURE, encoding="utf-8"))
PEC_OLD, PEC_NEW = "Pec Deck Fly VEYA Cable Crossover", "Pec Deck Fly (Butterfly)"
RPD_OLD, FP_NEW = "Reverse Pec Deck veya Face Pull", "Face Pull (Rope)"
def k(n): return n.lower().replace("ı", "i")
def sess(ts, name, kg): return {"ts": ts, "logId": "w%d" % ts, "kind": "weight", "name": name, "sets": [{"kg": kg, "reps": 12}], "muscle": "Göğüs"}
def all_names(s): return [e["name"] for d in s["workoutDays"] for e in d["exercises"]]

# Eski kayıt: sahibin programı (birleşik adlar içinde) + birleşik adlarla geçmiş + Face Pull'un kendi geçmişi (birleşme denenir)
LEG = json.loads(json.dumps(OWN))
LEG["dataVer"] = 6
LEG["exerciseHistory"] = {
    k(PEC_OLD): [sess(1000, PEC_OLD, 40), sess(3000, PEC_OLD, 45)],
    k(RPD_OLD): [sess(1500, RPD_OLD, 20), sess(4000, RPD_OLD, 22.5)],
    k(FP_NEW): [sess(2000, FP_NEW, 25)],
    "barbell bench press": [sess(1200, "Barbell Bench Press", 80)],
}
try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    c = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, locale="tr-TR")
    c.add_init_script(TEST_INIT)
    pg = c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL); boot(pg)
    def seed(data):
        pg.evaluate("s => { localStorage.clear(); void indexedDB.deleteDatabase('aykplus'); localStorage.setItem('%s', s); }" % KEY, json.dumps(data))
        pg.reload(); boot(pg)

    # ===== (a) kütüphane
    lib = pg.evaluate("Object.values(EXERCISE_LIBRARY).flat().map(n => n.trim())")
    check(PEC_OLD not in lib and RPD_OLD not in lib, "a: iki birleşik ad listeden çıktı")
    check(all(n in lib for n in [PEC_NEW, "Cable Crossover (High-to-Low)", "Reverse Pec Deck (Arka Omuz Makinesi)", FP_NEW]), "a: ayrı hâlleri listede")
    SPLIT = ["Pendulum Squat", "Belt Squat", "Walking Lunges", "Reverse Lunges", "Wrist Curl (Bilek)", "Reverse Wrist Curl (Bilek)",
             "Triceps Dip Machine", "Bench Dips", "Decline Bench Crunch", "Sit-Up", "Deadbug", "Bird-Dog"]
    check(all(n in lib for n in SPLIT), "a: 6 birleşik ad 12 ayrı harekete bölündü")
    check(not any(" VEYA " in n.upper() for n in lib if "(" not in n), "a: parantez dışında 'veya' ile birleşik ad kalmadı")
    check(len(lib) == len(set(lib)), "a: listede yinelenen ad yok")
    mus = pg.evaluate("ns => ns.map(n => muscleOf({ name: n }))", SPLIT)
    check(all(mus), "a: yeni adların hepsi bir kas grubuna bağlı: %s" % mus)
    en = pg.evaluate("ns => ns.map(n => EX_EN[n])", ["Wrist Curl (Bilek)", "Reverse Wrist Curl (Bilek)"])
    check(en == ["Wrist Curl", "Reverse Wrist Curl"], "a: İngilizce adlar Türkçe parantezsiz: %s" % en)

    # ===== (b) göç: eski kayıt
    seed(LEG)
    s = st(pg)
    names = all_names(s)
    check(s["dataVer"] == 8, "b: dataVer 8 (v78 göç adımı 8 de geçer)")
    check(PEC_OLD not in names and RPD_OLD not in names, "b: programda birleşik ad kalmadı")
    check(names.count(PEC_NEW) == all_names(LEG).count(PEC_OLD) and names.count(FP_NEW) >= all_names(LEG).count(RPD_OLD) >= 1,
          "b: program hareketleri yeni ada geçti (Pec Deck %d, Face Pull %d)" % (names.count(PEC_NEW), names.count(FP_NEW)))
    check(len(names) == len(all_names(LEG)), "b: programdaki hareket sayısı aynı")
    # program hareketinin setleri/ayarları dokunulmadan kaldı
    def ex_of(st_, n): return next(e for d in st_["workoutDays"] for e in d["exercises"] if e["name"] == n)
    o = dict(ex_of(LEG, PEC_OLD)); nw = dict(ex_of(s, PEC_NEW)); o.pop("name"); nw.pop("name")
    check(json.dumps(o["sets"], sort_keys=True) == json.dumps(nw["sets"], sort_keys=True) and o.get("kind") == nw.get("kind"), "b: Pec Deck setleri aynı")
    h = s["exerciseHistory"]
    check(k(PEC_OLD) not in h and k(RPD_OLD) not in h, "b: eski geçmiş anahtarları kalktı")
    check([x["ts"] for x in h[k(PEC_NEW)]] == [1000, 3000] and all(x["name"] == PEC_NEW for x in h[k(PEC_NEW)]), "b: Pec Deck geçmişi taşındı, ad güncel")
    check([x["ts"] for x in h[k(FP_NEW)]] == [1500, 2000, 4000] and all(x["name"] == FP_NEW for x in h[k(FP_NEW)]),
          "b: Face Pull geçmişi birleşti ve sıralı: %s" % [x["ts"] for x in h[k(FP_NEW)]])
    check(sum(len(v) for v in h.values()) == sum(len(v) for v in LEG["exerciseHistory"].values()), "b: hiçbir seans kaybolmadı")
    check(h["barbell bench press"][0]["sets"][0]["kg"] == 80, "b: başka harekete dokunulmadı")
    check([x["sets"][0]["kg"] for x in h[k(FP_NEW)]] == [20, 25, 22.5], "b: set kiloları aynen")
    check(len(pg.evaluate("historyFor(%s)" % json.dumps(FP_NEW))) == 3, "b: uygulama Face Pull geçmişini 3 seans görüyor")
    # yeniden açılış: göç bir daha çalışmaz, veri aynı
    pg.reload(); boot(pg)
    check(json.dumps(st(pg)["exerciseHistory"], sort_keys=True) == json.dumps(h, sort_keys=True), "b: yeniden açılışta geçmiş aynı")

    # ===== (c) dataVer 7 kaydında aynı ad kullanıcının kendi adı sayılır, dokunulmaz
    V7 = json.loads(json.dumps(LEG)); V7["dataVer"] = 7
    seed(V7)
    s = st(pg)
    check(PEC_OLD in all_names(s) and k(PEC_OLD) in s["exerciseHistory"], "c: dataVer 7 kaydındaki ada dokunulmaz")

    # ===== (d) eski yedek dosyası geri yüklenince aynı göçten geçer
    seed(OWN)
    pg.evaluate("t => void restoreFromText(t)", json.dumps(LEG)); pg.wait_for_selector("#uiDlgOk", timeout=5000); pg.click("#uiDlgOk")
    pg.wait_for_function("() => (state.workoutDays || []).some(d => d.exercises.some(e => e.name === %s))" % json.dumps(FP_NEW), timeout=5000)
    # kalıcı kayıt (IndexedDB) WebKit'te birkaç yüz ms gecikebilir: yazılana kadar bekle
    t0 = time.time()
    while time.time() - t0 < 10 and k(FP_NEW) not in (st(pg).get("exerciseHistory") or {}): time.sleep(0.1)
    s = st(pg)
    check(PEC_OLD not in all_names(s) and [x["ts"] for x in s["exerciseHistory"].get(k(FP_NEW), [])] == [1500, 2000, 4000], "d: eski yedek geri yüklenince göç edildi")

    # ===== (e) bozuk geçmiş göçü bozmasın
    BAD = json.loads(json.dumps(LEG)); BAD["exerciseHistory"][k(PEC_OLD)] = [None, 5, sess(1000, PEC_OLD, 40)]; BAD["exerciseHistory"][k(FP_NEW)] = "bozuk"
    seed(BAD)
    s = st(pg)
    check([x["ts"] for x in s["exerciseHistory"][k(PEC_NEW)]] == [1000] and [x["ts"] for x in s["exerciseHistory"][k(FP_NEW)]] == [1500, 4000],
          "e: bozuk seanslar atıldı, sağlamlar taşındı")
    b.close()
finally:
    srv.terminate()
if errs: print("SAYFA HATALARI:", errs[:5])
print("\n%d hata" % (len(fails) + len(errs)))
sys.exit(1 if fails or errs else 0)
