# v49 bölüm 1 (görev 1): Mobilite terimleri, kayıt adları dile göre, sayaç tarafı, konuşma her zaman Türkçe, sürükleme bildirimi.
import os, sys, re, subprocess, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortak_tohum import TEST_INIT
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8807'], cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(cond, label):
    print(("ok   " if cond else "FAIL ") + label)
    if not cond: fails.append(label)
URL = "http://localhost:8807/index.html"
EN_WORDS = re.compile(r"\b(start|left|right|done|switch|side|reps|seconds|sets|finished|next|last)\b", re.I)
def boot(pg): pg.wait_for_function("window.aykBooted === true"); pg.wait_for_timeout(80)
STUB = """window.__said = [];
(function(){ const ss = window.speechSynthesis; if (!ss) return;
  ss.speak = u => { window.__said.push(u.text); }; ss.cancel = () => {}; ss.getVoices = () => []; })();"""
try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(color_scheme="dark", viewport={"width": 390, "height": 844}, locale="en-US")
    ctx.add_init_script(TEST_INIT); ctx.add_init_script("window.AYK_TEST_EN = true")
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL); boot(pg)
    pg.evaluate(STUB)
    def setlang(l): pg.evaluate("() => { state.settings.lang = '%s'; applyStaticI18n(); renderAll(); }" % l)
    H = "[mobRegionL('hip'), mobTypeL('release'), mobSideL('Sol'), mobSideL(''), mobRegionL('ankle'), mobTypeL('dynamic'), mobSideL('Sağ')]"
    setlang('tr')
    r = pg.evaluate(H)
    check(r == ["Kalça", "Foam roller", "Sol", "", "Ayak bileği", "Dinamik", "Sağ"], "tr: yardımcılar aynı: %s" % r)
    setlang('en')
    r = pg.evaluate(H)
    check(r == ["Hips", "Foam rolling", "Left", "", "Ankles", "Dynamic", "Right"], "en: yardımcılar: %s" % r)
    # --- Review Focus 1: rutin kopyalama
    name0 = pg.evaluate("mobRoutines()[0].name")
    pg.evaluate("() => { mobUI.view = 'routine'; mobUI.rid = mobRoutines()[0].id; mobCopyRoutine(); }")
    names = pg.evaluate("mobRoutines().map(r => r.name)")
    check(names[0] == name0 and (name0 + " (copy)")[:40] in names, "en: kopya adı '<ad> (copy)', eski ad değişmedi: %s" % names)
    setlang('tr')
    pg.evaluate("() => { mobUI.rid = mobRoutines()[0].id; mobCopyRoutine(); }")
    names = pg.evaluate("mobRoutines().map(r => r.name)")
    check((name0 + " (kopya)")[:40] in names and names[0] == name0 and (name0 + " (copy)")[:40] in names, "tr: kopya adı '<ad> (kopya)', önceki 'copy' kaydı değişmedi: %s" % names)
    # --- Review Focus 2-3: sayaç + konuşma
    pg.evaluate("""() => { state.settings.mobVoice = true; state.settings.lang = 'en';
      const it = normMobItem({ name: 'Test Stretch', type: 'static', region: 'hip', sets: 1, mode: 'time', sec: 30, sides: 2 });
      const it2 = normMobItem({ name: 'Second Move', type: 'dynamic', region: 'spine', sets: 1, mode: 'reps', reps: 8, sides: 1 });
      state.mobilityRoutine.routines.push({ id: 'mr_t49', name: 'T49', items: [it, it2] });
      window.__said = []; mobSesStart('mr_t49'); }""")
    pg.evaluate("() => { mobT.endAt = Date.now() - 100; mobTimerTick(); mobT.endAt = Date.now() - 100; mobTimerTick(); }")
    txt = pg.inner_text("#mobTimer")
    check("Switch to left" in txt, "en: sayaçta 'Switch to left': %r" % txt[:120])
    ph = pg.evaluate("[mobT.phase, mobT.rounds.map(x => x.side)]")
    check(ph[0] == "switch" and ph[1] == ["Sağ", "Sol"], "en: tur kaydı Türkçe kalır, tur geçişi çalışır: %s" % ph)
    pg.evaluate("() => { mobSesFinish(); }")
    said = pg.evaluate("window.__said")
    check("Sola geç" in said, "en: konuşulan 'Sola geç': %s" % said)
    check(not any(EN_WORDS.search(x) for x in said), "en: konuşulan metinlerde İngilizce kelime yok: %s" % said)
    check(said[-1] == "T49 bitti. Tebrikler.", "en: son konuşma Türkçe: %r" % said[-1])
    check(said[0] == "Test Stretch. Sağ taraf. 30 saniye.", "en: tanıtım cümlesi Türkçe: %r" % said[0])
    pg.evaluate("mobTimerClose()")
    # ısınma başlığı konuşmada Türkçe
    pg.evaluate("""() => { window.__said = []; mobSesStartIds(t('Isınma'), ['x'], null, 'Isınma'); }""")
    pg.evaluate("() => { const it = mobAllItems()[0]; mobSesStartIds(t('Isınma'), [it.id], null, 'Isınma'); window.__said = []; mobSesFinish(); }")
    check(pg.evaluate("window.__said[0]") == "Isınma bitti. Tebrikler.", "en: ısınma bitişi Türkçe: %s" % pg.evaluate("window.__said"))
    pg.evaluate("mobTimerClose()")
    # Türkçe konuşma aynı
    setlang('tr')
    pg.evaluate("""() => { window.__said = []; mobSesStart('mr_t49'); mobT.endAt = Date.now() - 100; mobTimerTick(); mobT.endAt = Date.now() - 100; mobTimerTick(); mobSesFinish(); }""")
    said = pg.evaluate("window.__said")
    check(said[0] == "Test Stretch. Sağ taraf. 30 saniye." and "Sola geç" in said and said[-1] == "T49 bitti. Tebrikler.", "tr: konuşma aynı: %s" % said)
    pg.evaluate("mobTimerClose()")
    # --- Bekleyen a1: sürükleme bildirimi
    def drag():
        pg.evaluate("() => { mobUI.rid = 'mr_t49'; mealDrag = { from: 0, to: 1, card: document.createElement('div'), cards: [], kind: 'mob' }; endMealDrag(); }")
        return pg.evaluate("$('toastWrap').innerText")
    setlang('en')
    check("Move reordered" in drag(), "en: sürükleme bildirimi mobilite metni")
    pg.evaluate("$('toastWrap').innerHTML = ''")
    setlang('tr')
    check("Hareket taşındı" in drag(), "tr: sürükleme bildirimi 'Hareket taşındı'")
    check(errs == [], "sayfa hatası yok: " + str(errs[:3]))
    b.close()
finally:
    srv.terminate()
print("BAŞARISIZ:" if fails else "TÜMÜ GEÇTİ", fails)
sys.exit(1 if (fails or errs) else 0)
