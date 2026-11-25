# v70: küçük kas gruplarına (Boyun, Ön Kol, İç Bacak, Kaval) 9 yeni kütüphane hareketi + görselleri (293–301)
# 1) Kütüphanede, doğru kas grubu, doğru hareket türü, görsel eşlemesi ve dosyası, İngilizce ad
# 2) Geçmişe yazılan set ilgili küçük kasa sayılır (KAS YÜKÜ listesinde görünür)
# 3) Hareket seçicide görünür, küçük görseli yüklenir
import os, sys, subprocess, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PORT = 8826
fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)

NEW = {
    "Plate Neck Flexion (Boyun Öne)": ("Boyun", "weight", 293, "Plate Neck Flexion"),
    "Plate Neck Extension (Boyun Arkaya)": ("Boyun", "weight", 294, "Plate Neck Extension"),
    "Lateral Neck Flexion (Boyun Yana)": ("Boyun", "weight", 295, "Lateral Neck Flexion"),
    "Wrist Roller (Bilek Sarma)": ("Ön Kol", "weight", 296, "Wrist Roller"),
    "Plate Pinch Hold (Plaka Sıkıştırma)": ("Ön Kol", "time", 297, "Plate Pinch Hold"),
    "Dead Hang (Kavrama / Asılma)": ("Ön Kol", "time", 298, "Dead Hang (Grip)"),
    "Copenhagen Plank (İç Bacak)": ("İç Bacak", "time", 299, "Copenhagen Plank (Adductors)"),
    "Cable Hip Adduction (İç Bacak)": ("İç Bacak", "weight", 300, "Cable Hip Adduction (Inner Thigh)"),
    "Banded Dorsiflexion (Kaval)": ("Kaval", "weight", 301, "Banded Dorsiflexion (Tibialis)"),
}
for n, (_, _, img, _) in NEW.items():
    check(os.path.exists(os.path.join(REPO, "img", "hareket", f"{img}.webp")), f"1: görsel dosyası var ({img}.webp, {n})")

srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT)], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
URL = f"http://localhost:{PORT}/index.html"
errs = []
try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    c = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, locale="tr-TR", service_workers="block")
    c.add_init_script(TEST_INIT)
    pg = c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_function("window.aykBooted === true")
    info = pg.evaluate("""names => names.map(n => {
      const inLib = Object.keys(EXERCISE_LIBRARY).some(c => EXERCISE_LIBRARY[c].map(x => x.trim()).includes(n));
      return { n, inLib, muscle: LIB_MUSCLE_MAP[exKey(n)], kind: detectKind(n), img: EX_IMG[n] };
    })""", list(NEW))
    for r in info:
        m, k, img, _ = NEW[r["n"]]
        check(r["inLib"], f"1: kütüphanede: {r['n']}")
        check(r["muscle"] == m, f"1: kas {m}: {r['n']} ({r['muscle']})")
        check(r["kind"] == k, f"1: tür {k}: {r['n']} ({r['kind']})")
        check(r["img"] == img, f"1: görsel {img}: {r['n']} ({r['img']})")
    # eski hareketlerin türü değişmedi
    old = pg.evaluate("""() => ['Farmer\\'s Walk (Çiftçi Yürüyüşü)', 'Plank / RKC Plank', 'Wrist Curl (Bilek)', 'Dead Hang (Barfikste Pasif Asılma)'].map(detectKind)""")
    check(old == ["weight", "time", "weight", "time"], f"1: eski hareketlerin türü aynı {old}")
    fw = pg.evaluate("""() => { const n = "Farmer's Walk (Çiftçi Yürüyüşü)", cats = Object.keys(EXERCISE_LIBRARY);
      return { cat: cats.find(c => EXERCISE_LIBRARY[c].map(x => x.trim()).includes(n)), muscle: LIB_MUSCLE_MAP[exKey(n)], kind: detectKind(n), img: EX_IMG[n] }; }""")
    check(fw["cat"] and fw["cat"].startswith("8.") and fw["muscle"] == "Ön Kol" and fw["kind"] == "weight" and fw["img"] == 187,
          f"1: Farmer's Walk kardiyoda değil, Kol – Biceps & Ön Kol'da, Ön Kol, ağırlık, görsel aynı {fw}")
    kb = pg.evaluate("""() => { const n = 'Kettlebell Swing', cats = Object.keys(EXERCISE_LIBRARY);
      return { cat: cats.find(c => EXERCISE_LIBRARY[c].map(x => x.trim()).includes(n)), muscle: LIB_MUSCLE_MAP[exKey(n)], kind: detectKind(n), img: EX_IMG[n] }; }""")
    check(kb["cat"] and kb["cat"].startswith("6.") and kb["muscle"] == "Arka Bacak & Kalça" and kb["kind"] == "weight" and kb["img"] == 188,
          f"1: Kettlebell Swing kardiyoda değil, Arka Bacak & Kalça {kb}")
    # 2) geçmiş → küçük kas sayımı
    pg.evaluate("""() => { const T = Date.now(); state.exerciseHistory = {}; state.libMuscle = null; state.libRange = 'week';
      const add = (name, n) => { const k = exKey(name); (state.exerciseHistory[k] = state.exerciseHistory[k] || []).push({ ts: T, logId: 'W', kind: 'weight', name, sets: Array.from({ length: n }, () => ({ kg: 10, reps: 12 })) }); };
      add('Plate Neck Flexion (Boyun Öne)', 3); add('Wrist Roller (Bilek Sarma)', 2); add('Cable Hip Adduction (İç Bacak)', 4); add('Banded Dorsiflexion (Kaval)', 2);
      state.gymView = 'library'; state.activeTab = 'gym'; renderAll(); }""")
    pg.wait_for_timeout(300)
    txt = pg.evaluate("document.getElementById('gymRoot').innerText")
    for m in ["Boyun", "Ön Kol", "İç Bacak", "Kaval"]:
        check(m in txt, f"2: KAS YÜKÜ listesinde {m} görünür")
    # 3) İngilizce adlar
    pg.evaluate("setLang && setLang('en')")
    pg.wait_for_timeout(200)
    en = pg.evaluate("names => names.map(exNameL)", list(NEW))
    for n, e in zip(NEW, en):
        check(e == NEW[n][3], f"3: İngilizce ad {NEW[n][3]} ({e})")
    pg.evaluate("setLang('tr')")
    # 4) seçicide küçük görsel
    pg.evaluate("openExercisePicker()"); pg.wait_for_timeout(400)
    pg.evaluate("""() => { const el = document.querySelector('#pickerSearch, [data-picker-search], input[type=search]'); if (el) { el.value = 'Neck'; el.dispatchEvent(new Event('input', { bubbles: true })); } }""")
    pg.wait_for_timeout(600)
    imgs = pg.evaluate("""() => [...document.querySelectorAll('img')].filter(i => /hareket\\/29[3-5]\\.webp/.test(i.src)).map(i => ({ src: i.src.split('/').pop(), ok: i.complete && i.naturalWidth > 0 }))""")
    check(len(imgs) >= 1 and all(x["ok"] for x in imgs), f"4: seçicide boyun hareketlerinin görselleri yüklenir {imgs}")
    b.close()
finally:
    srv.terminate()
check(errs == [], f"sayfa hatası yok: {errs}")
print(); print(f"{len(fails)} HATA" if fails else "hepsi geçti")
sys.exit(1 if fails else 0)
