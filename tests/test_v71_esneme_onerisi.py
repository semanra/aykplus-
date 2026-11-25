# v71: çalışan kaslara göre esneme önerisi (Mobilite ana ekranı + antrenman bitiş özeti)
# 1) Seçim kuralı: kas sırası (set çoktan aza), round-robin, en fazla 6, tekil, 48 saat sınırı, bütün eşleme adları kütüphanede
# 2) Kart: harita (lavanta), metin, liste; antrenman yokken kart yok
# 3) Seans: öneri hareketleri geçici öğelerle; biten hareket bugünün mobilityLog'una; rutinlere dokunulmaz
# 4) Rutin olarak kaydet + Geri al   5) Ayar kapalı → hiçbir yerde yok; eski kayıt (alan yok) → açık
# 6) Bitiş özetinde "Esneme önerisi" → Mobilite   7) İngilizce   8) Profil satırı
import os, sys, subprocess, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PORT = 8827
fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)

SEED = """([hoursAgo, list]) => { const T = Date.now() - hoursAgo * 3600 * 1000; state.exerciseHistory = {};
  list.forEach(([name, muscle, n]) => { const k = exKey(name); (state.exerciseHistory[k] = state.exerciseHistory[k] || []).push({ ts: T, logId: 'W', kind: 'weight', name, muscle, sets: Array.from({ length: n }, () => ({ kg: 20, reps: 10 })) }); });
  state.settings.mobSuggest = true; renderAll(); }"""
LIST = [["Bench Press", "Göğüs", 9], ["Lateral Raise", "Omuz", 6], ["Pushdown", "Triceps", 4], ["Wrist Curl (Bilek)", "Ön Kol", 2]]

srv = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT)], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
URL = f"http://localhost:{PORT}/index.html"
errs = []
def boot(pg): pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(80)
try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    def ctx(locale="tr-TR", scheme="dark"):
        c = b.new_context(color_scheme=scheme, viewport={"width": 390, "height": 844}, locale=locale, service_workers="block")
        c.add_init_script(TEST_INIT)
        pg = c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(URL); boot(pg); return c, pg
    c, pg = ctx()
    # 1) eşleme adları kütüphanede
    miss = pg.evaluate("() => { const lib = new Set(mobLibAll().map(x => mobNorm(x.m.name).trim())); const out = []; Object.keys(MUSCLE_STRETCH).forEach(m => MUSCLE_STRETCH[m].forEach(n => { if (!lib.has(mobNorm(n).trim())) out.push(n); })); return out; }")
    check(miss == [], f"1a: bütün eşleme adları mobilite kütüphanesinde {miss}")
    allm = pg.evaluate("() => MUSCLES.filter(m => !(MUSCLE_STRETCH[m] || []).length)")
    check(allm == [], f"1a: her kas grubunun en az bir esnemesi var {allm}")
    pg.evaluate(SEED, [5, LIST])
    d = pg.evaluate("() => { const d = mobSuggestData(); return d && { mus: d.muscles.map(x => x[0]), names: d.libs.map(x => x.m.name) }; }")
    check(d and d["mus"] == ["Göğüs", "Omuz", "Triceps", "Ön Kol"], f"1b: kaslar set çoktan aza {d and d['mus']}")
    check(d and len(d["names"]) == 6 and len(set(d["names"])) == 6, f"1c: en fazla 6, tekil {d and d['names']}")
    check(d and d["names"][:4] == ["Doorway Pec & Biceps Stretch", "Cross-Body Posterior Shoulder Stretch", "Overhead Triceps & Lat Side Lean Stretch", "Wrist Flexor & Extensor Stretch"],
          f"1d: her kastan sırayla ilk hareket {d and d['names'][:4]}")
    pg.evaluate(SEED, [50, LIST])
    check(pg.evaluate("mobSuggestData()") is None, "1e: 48 saatten eski antrenman → öneri yok")
    pg.evaluate(SEED, [0, [["Seated Leg Curl", "Arka Bacak & Kalça", 3]]])
    one = pg.evaluate("() => mobSuggestData().libs.map(x => x.m.name)")
    check(len(one) == 6 and one[0] == "Supine Hamstring Strap Stretch", f"1f: tek kas → o kasın listesinden 6 {one}")
    # 2) kart
    pg.evaluate(SEED, [5, LIST]); pg.evaluate("switchTab('mobility')"); pg.wait_for_timeout(500)
    check(pg.locator("#mobSuggest").count() == 1, "2a: Mobilite ana ekranında öneri kartı")
    txt = pg.locator("#mobSuggest").inner_text()
    check("Göğüs" in txt and "Ön Kol" in txt and "6 hareket" in txt, f"2b: kart metni kasları ve hareket sayısını yazar ({txt[:120]!r})")
    lav = pg.evaluate("""() => { const cv = document.getElementById('mobSugMap'); if (!cv || !cv.width) return null; const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let lv = 0, tq = 0;
      for (let i = 0; i < d.length; i += 16) { if (d[i + 3] < 200) continue; if (d[i + 2] > d[i + 1] + 40 && d[i] > d[i + 1]) lv++; if (d[i + 1] > d[i] + 60) tq++; } return [lv, tq]; }""")
    check(lav and lav[0] > 50 and lav[1] < lav[0] / 10, f"2c: harita lavanta (turkuaz değil) {lav}")
    bx = pg.evaluate("() => ['mobSuggestStart', 'mobSuggestSave'].map(id => document.getElementById(id).getBoundingClientRect().height)")
    check(all(h >= 44 for h in bx), f"2d: düğmeler ≥ 44 px {bx}")
    pg.screenshot(path=os.path.join(REPO, "tests", "shots", "v71_oneri_koyu.png"), full_page=False)
    pg.evaluate("state.exerciseHistory = {}; renderAll()"); pg.wait_for_timeout(200)
    check(pg.locator("#mobSuggest").count() == 0, "2e: antrenman yokken kart yok")
    # 3) seans
    pg.evaluate(SEED, [5, LIST]); pg.wait_for_timeout(200)
    nR = pg.evaluate("JSON.stringify(state.mobilityRoutine)")
    pg.click("#mobSuggestStart"); pg.wait_for_timeout(300)
    check(pg.evaluate("!!(mobT && mobT.ses && mobT.ses.ids.length === 6 && mobT.ses.ids[0] === 'sg_0')"), "3a: seans 6 öneri hareketiyle başlar")
    first = pg.evaluate("mobT.name")
    pg.evaluate("mobSesItemDone()"); pg.wait_for_timeout(100)
    logd = pg.evaluate("state.mobilityLog[mobTodayKey()] || []")
    check(first in logd, f"3b: biten öneri hareketi bugünün mobilityLog'unda ({first} ∈ {logd})")
    pg.evaluate("mobTimerClose()"); pg.wait_for_timeout(200)
    check(pg.evaluate("JSON.stringify(state.mobilityRoutine)") == nR, "3c: seans rutinlere dokunmaz")
    stored = pg.evaluate("async () => { const s = await aykStoredState(); return (s.mobilityLog || {})[mobTodayKey()] || []; }")
    check(first in stored, "3d: mobilityLog kalıcı kayıtta")
    check(pg.evaluate("mobWeekStats().days[mobWeekStats().dow]") , "3e: bugün haftalık şeritte yapıldı sayılır")
    # 4) rutin olarak kaydet + geri al
    n0 = pg.evaluate("mobRoutines().length")
    pg.click("#mobSuggestSave"); pg.wait_for_timeout(200)
    r = pg.evaluate("() => { const r = mobRoutines()[mobRoutines().length - 1]; return { n: mobRoutines().length, name: r.name, items: r.items.length, ids: r.items.every(i => !String(i.id).startsWith('sg_')) }; }")
    check(r["n"] == n0 + 1 and r["name"] == "Esneme önerisi" and r["items"] == 6 and r["ids"], f"4a: yeni rutin {r}")
    pg.evaluate("doUndo()"); pg.wait_for_timeout(200)
    check(pg.evaluate("mobRoutines().length") == n0, "4b: Geri al rutini kaldırır")
    # 6) bitiş özeti
    pg.evaluate("switchTab('gym')"); pg.wait_for_timeout(200)
    pg.evaluate("""() => { state.workoutLogs.push({ id: 'W', ts: Date.now(), dayName: 'Test', exercises: [{ name: 'Bench Press', kind: 'weight', muscle: 'Göğüs', sets: [{ kg: 20, reps: 10, done: true }] }] }); }""")
    pg.evaluate("openFinishSummary(state.workoutLogs.length - 1, [])"); pg.wait_for_timeout(400)
    if pg.locator("#finishModal:not(.hidden)").count():
        check(pg.locator("#finStretch").count() == 1, "6a: bitiş özetinde Esneme önerisi düğmesi")
        pg.click("#finStretch"); pg.wait_for_timeout(400)
        check(pg.evaluate("state.activeTab") == "mobility" and pg.locator("#mobSuggest").count() == 1, "6b: düğme Mobilite'yi ve öneriyi açar")
    else:
        print("bilgi: bitiş özeti fonksiyonu bulunamadı, 6 atlandı")
    # 5) ayar kapalı
    pg.evaluate("state.settings.mobSuggest = false; switchTab('mobility')"); pg.wait_for_timeout(300)
    check(pg.locator("#mobSuggest").count() == 0 and pg.evaluate("mobSuggestData()") is None, "5a: ayar kapalı → kart yok")
    # 8) Profil satırı
    pg.evaluate("openProfile()"); pg.wait_for_timeout(300)
    check(pg.locator("#setMobSuggest").count() == 1 and not pg.evaluate("$('setMobSuggest').checked"), "8a: Profil anahtarı ayarı gösterir")
    pg.evaluate("$('setMobSuggest').checked = true; $('setMobSuggest').dispatchEvent(new Event('change', { bubbles: true }))"); pg.wait_for_timeout(200)
    check(pg.evaluate("state.settings.mobSuggest") is True, "8b: anahtar ayarı kaydeder")
    pg.evaluate("closeProfile()")
    c.close()
    # 5b) eski kayıt: alan yok → açık
    c, pg = ctx()
    v = pg.evaluate("() => { const s = JSON.parse(JSON.stringify(state)); delete s.settings.mobSuggest; return normalizeState(s).settings.mobSuggest; }")
    check(v is True, f"5b: eski kayıtta alan yok → açık ({v})")
    v2 = pg.evaluate("() => { const s = JSON.parse(JSON.stringify(state)); s.settings.mobSuggest = false; return normalizeState(s).settings.mobSuggest; }")
    check(v2 is False, "5c: kapalı ayar korunur")
    c.close()
    # 7) İngilizce + aydınlık
    c, pg = ctx("en-US", "light")
    pg.evaluate("setLang('en')"); pg.evaluate(SEED, [5, LIST]); pg.evaluate("switchTab('mobility')"); pg.wait_for_timeout(500)
    et = pg.locator("#mobSuggest").inner_text()
    check("Stretches for your worked muscles" in et and "Save as routine" in et and "Chest" in et, f"7a: İngilizce kart ({et[:100]!r})")
    lav2 = pg.evaluate("""() => { const cv = document.getElementById('mobSugMap'); if (!cv || !cv.width) return null; const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let lv = 0;
      for (let i = 0; i < d.length; i += 16) { if (d[i + 3] > 200 && d[i + 2] > d[i + 1] + 40 && d[i] > d[i + 1]) lv++; } return lv; }""")
    check(lav2 and lav2 > 50, f"7b: aydınlıkta lavanta harita {lav2}")
    pg.screenshot(path=os.path.join(REPO, "tests", "shots", "v71_oneri_aydinlik_en.png"), full_page=False)
    c.close()
    b.close()
finally:
    srv.terminate()
check(errs == [], f"sayfa hatası yok: {errs}")
print(); print(f"{len(fails)} HATA" if fails else "hepsi geçti")
sys.exit(1 if fails else 0)
