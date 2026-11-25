# v79: küçük kas gruplarına 18 hareket daha (Boyun 5, Ön Kol 6, İç Bacak 5, Kaval 2) + görselleri (302–319)
# (v70 testinin kopyası; v70'in kendi hareketleri test_v70_kucuk_kas.py'de)
# 1) Kütüphanede, doğru kas grubu, doğru hareket türü, görsel eşlemesi ve dosyası, İngilizce ad
# 2) Geçmişe yazılan set ilgili küçük kasa sayılır (KAS YÜKÜ listesinde görünür)
# 3) Hareket seçicide görünür, küçük görseli yüklenir
import os, sys, subprocess, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PORT = 8835
fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)

NEW = {
    "Neck Harness Extension (Boyun Kemeri)": ("Boyun", "weight", 302, "Neck Harness Extension"),
    "4-Way Neck Machine (Boyun Makinesi)": ("Boyun", "weight", 303, "4-Way Neck Machine"),
    "Banded Neck Isometric (Bantla Boyun Sabit Tutuş)": ("Boyun", "time", 304, "Banded Neck Isometric"),
    "Banded Neck Rotation (Bantla Boyun Döndürme)": ("Boyun", "weight", 305, "Banded Neck Rotation"),
    "Chin Tuck (Çene İçeri Çekme)": ("Boyun", "weight", 306, "Chin Tuck"),
    "Behind-the-Back Barbell Wrist Curl (Arkadan Bilek Bükme)": ("Ön Kol", "weight", 307, "Behind-the-Back Barbell Wrist Curl"),
    "Dumbbell Pronation / Supination (Bilek Çevirme)": ("Ön Kol", "weight", 308, "Dumbbell Pronation / Supination"),
    "Dumbbell Radial Deviation (Bileği Yukarı Kaldırma)": ("Ön Kol", "weight", 309, "Dumbbell Radial Deviation"),
    "Hand Gripper (El Yayı)": ("Ön Kol", "weight", 310, "Hand Gripper"),
    "Towel Hang (Havluyla Asılma)": ("Ön Kol", "time", 311, "Towel Hang"),
    "Kettlebell Bottoms-Up Hold (Ters Kettlebell Tutuşu)": ("Ön Kol", "time", 312, "Kettlebell Bottoms-Up Hold"),
    "Sumo Goblet Squat (İç Bacak)": ("İç Bacak", "weight", 313, "Sumo Goblet Squat (Adductors)"),
    "Side-Lying Hip Adduction (Yan Yatarak İç Bacak)": ("İç Bacak", "weight", 314, "Side-Lying Hip Adduction"),
    "Adductor Ball Squeeze (Top Sıkıştırma)": ("İç Bacak", "weight", 315, "Adductor Ball Squeeze"),
    "Lateral Lunge (Yan Lunge)": ("İç Bacak", "weight", 316, "Lateral Lunge"),
    "Weighted Cossack Squat (Ağırlıklı Kazak Squat)": ("İç Bacak", "weight", 317, "Weighted Cossack Squat"),
    "Heel Walk (Topuk Yürüyüşü)": ("Kaval", "time", 318, "Heel Walk"),
    "Seated Dumbbell Tibialis Raise (Oturarak Ayak Ucu Kaldırma)": ("Kaval", "weight", 319, "Seated Dumbbell Tibialis Raise"),
}
# v79: yardımcı kaslar ve ekipman (kütüphane süzgeci)
SEC = {
    "Sumo Goblet Squat (İç Bacak)": ["Ön Bacak", "Arka Bacak & Kalça"], "Lateral Lunge (Yan Lunge)": ["Ön Bacak", "Arka Bacak & Kalça"],
    "Weighted Cossack Squat (Ağırlıklı Kazak Squat)": ["Ön Bacak", "Arka Bacak & Kalça"], "Chin Tuck (Çene İçeri Çekme)": [],
    "Hand Gripper (El Yayı)": [], "Dumbbell Radial Deviation (Bileği Yukarı Kaldırma)": [], "Heel Walk (Topuk Yürüyüşü)": [],
    "Neck Harness Extension (Boyun Kemeri)": [], "Towel Hang (Havluyla Asılma)": [],
}
EQ = {
    "4-Way Neck Machine (Boyun Makinesi)": "machine", "Chin Tuck (Çene İçeri Çekme)": "body", "Hand Gripper (El Yayı)": "body",
    "Weighted Cossack Squat (Ağırlıklı Kazak Squat)": "dumbbell", "Side-Lying Hip Adduction (Yan Yatarak İç Bacak)": "body",
    "Adductor Ball Squeeze (Top Sıkıştırma)": "body", "Behind-the-Back Barbell Wrist Curl (Arkadan Bilek Bükme)": "bar",
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
    old = pg.evaluate("""() => ['Kettlebell Swing', "Farmer's Walk (Çiftçi Yürüyüşü)", 'Plank / RKC Plank', 'Dead Hang (Kavrama / Asılma)', 'Hanging Leg Raise'].map(detectKind)""")
    check(old == ["weight", "weight", "time", "time", "weight"], f"1: eski hareketlerin türü aynı {old}")
    sec = pg.evaluate("names => names.map(n => secondaryMuscles(n, autoMuscle(n)))", list(SEC))
    for (n, exp), g in zip(SEC.items(), sec):
        check(g == exp, f"1: yardımcı kaslar {n}: {exp} ({g})")
    eq = pg.evaluate("names => names.map(n => libEquipsOf(n))", list(EQ))
    for (n, exp), g in zip(EQ.items(), eq):
        check(exp in g, f"1: ekipman {n}: {exp} ({g})")
    cnt = pg.evaluate("() => { const c = {}; libGrouped('', 'all', null).forEach(g => c[g.sec] = g.items.length); return [c['Boyun'], c['Ön Kol'], c['İç Bacak'], c['Kaval'], libAllNames().length]; }")
    check(cnt == [8, 13, 8, 4, 199], f"1: bölüm sayıları Boyun 8, Ön Kol 13, İç Bacak 8, Kaval 4; toplam 199 ({cnt})")
    # 2) geçmiş → küçük kas sayımı
    pg.evaluate("""() => { const T = Date.now(); state.exerciseHistory = {}; state.libMuscle = null; state.libRange = 'week';
      const add = (name, n) => { const k = exKey(name); (state.exerciseHistory[k] = state.exerciseHistory[k] || []).push({ ts: T, logId: 'W', kind: 'weight', name, sets: Array.from({ length: n }, () => ({ kg: 10, reps: 12 })) }); };
      add('4-Way Neck Machine (Boyun Makinesi)', 3); add('Hand Gripper (El Yayı)', 2); add('Sumo Goblet Squat (İç Bacak)', 4); add('Seated Dumbbell Tibialis Raise (Oturarak Ayak Ucu Kaldırma)', 2);
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
    pg.evaluate("""() => { const el = document.querySelector('#pickerSearch, [data-picker-search], input[type=search]'); if (el) { el.value = 'Banded Neck'; el.dispatchEvent(new Event('input', { bubbles: true })); } }""")
    pg.wait_for_timeout(600)
    imgs = pg.evaluate("""() => [...document.querySelectorAll('img')].filter(i => /hareket\\/30[45]\\.webp/.test(i.src)).map(i => ({ src: i.src.split('/').pop(), ok: i.complete && i.naturalWidth > 0 }))""")
    check(len(imgs) >= 1 and all(x["ok"] for x in imgs), f"4: seçicide boyun hareketlerinin görselleri yüklenir {imgs}")
    b.close()
finally:
    srv.terminate()
check(errs == [], f"sayfa hatası yok: {errs}")
print(); print(f"{len(fails)} HATA" if fails else "hepsi geçti")
sys.exit(1 if fails else 0)
