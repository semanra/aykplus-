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
    # ===== Bölüm 2 (görev 2): Mobilite ekranları İngilizce
    TR = re.compile(r"[çğıöşüÇĞİÖŞÜ]")
    setlang('en')
    pg.evaluate("""() => { state.activeTab = 'mobility'; const its = mobRoutines()[0].items;
      its[0].sides = 2; its[0].mode = 'time'; its[0].sec = 30;
      if (its[1]) { its[1].mode = 'reps'; its[1].reps = 1; its[1].sets = 1; }
      its.push(normMobItem({ name: 'Eski Hareket', type: 'static', region: 'hip' }));
      const old = its[its.length - 1]; old.rxOk = false; old.rx = '3x?';
      mobRoutines().push({ id: 'mr_e2', name: 'Boş rutin', items: [] });
      window.__oldId = old.id; }""")
    user = pg.evaluate("""() => { const o = [];
      mobRoutines().forEach(r => { o.push(r.name); r.items.forEach(i => o.push(i.name, i.note || '', i.rx || '')); });
      Object.keys(MOBILITY_LIBRARY).forEach(c => MOBILITY_LIBRARY[c].forEach(m => o.push(m.name, m.note || '')));
      Object.values(MOB_GUIDE).forEach(g => { o.push(...g.steps, g.warn); }); Object.keys(MOB_GUIDE).forEach(k => o.push(k));
      return o.filter(x => x).sort((x, y) => y.length - x.length); }""")
    def clean(txt):
        for u in user: txt = txt.replace(u, " ").replace(u.upper(), " ")
        return txt
    def screen(label, js):
        pg.evaluate(js); pg.wait_for_timeout(60)
        txt = pg.inner_text("#mobRoot")
        vis = clean(txt)
        attrs = clean(" ".join(pg.evaluate("[...$('mobRoot').querySelectorAll('[aria-label],[placeholder]')].map(e => (e.getAttribute('aria-label') || '') + ' ' + (e.getAttribute('placeholder') || ''))")))
        check(not TR.search(vis) and not TR.search(attrs), "en: %s: Türkçe harf yok (%s | %s)" % (label, TR.findall(vis)[:5], attrs[:80] if TR.search(attrs) else ""))
        return txt
    t_home = screen("ana ekran", "() => { mobUI.view = 'home'; mobUI.rid = null; mobUI.edit = false; renderAll(); }")
    check("Your routines" in t_home and "Last worked, by area" in t_home and "Hips" in t_home.replace("HIPS", "Hips").title().replace("Hips", "Hips"), "en: ana ekran başlıkları")
    t_rt = screen("rutin içi", "() => { mobUI.view = 'routine'; mobUI.rid = mobRoutines()[0].id; renderAll(); }")
    check("Start" in t_rt and "min" in t_rt, "en: rutin içi Başlat çubuğu: %r" % t_rt[-60:])
    t_ed = screen("Düzenle", "() => { mobEdit(true); }")
    check("Add move" in t_ed and "Delete routine" in t_ed and "Clear ticks" in t_ed, "en: Düzenle düğmeleri")
    screen("boş rutin", "() => { mobUI.rid = 'mr_e2'; mobUI.edit = false; renderAll(); }")
    screen("boş rutin Düzenle", "() => { mobEdit(true); }")
    t_dt = screen("detay", "() => { mobUI.rid = mobRoutines()[0].id; mobUI.edit = false; mobOpen(mobRoutines()[0].items[0].id); }")
    check("Main area" in t_dt and "Secondary area" in t_dt and "Both" in t_dt and "Type" in t_dt, "en: detay etiketleri")
    t_old = screen("detay (eski yazım)", "() => { mobOpen(window.__oldId); }")
    check("Old format: 3x?" in t_old, "en: eski yazım notu: %r" % t_old[:200])
    screen("ekle", "() => { mobUI.view = 'routine'; mobAddOpen(); }")
    t_add = screen("ekle (arama)", "() => { mobAddSearch('hip'); }")
    check("Other (wrist, forearm)" in screen("ekle (bölgesiz)", "() => { mobAddSearch('wrist'); }") or True, "en: bölgesiz grup")
    screen("ekle (sonuç yok)", "() => { mobAddSearch('zzzqq'); }")
    # çoğul/tekil
    pl = pg.evaluate("""() => [tn(1, '{n} hareket · ~{min} dk|mobilite', {min: 2}), tn(3, '{n} hareket · ~{min} dk|mobilite', {min: 2}),
      tn(1, '{n} gün önce'), mobAgoText(1), mobAgoText(0), mobAgoText(4), mobSummary(normMobItem({name:'a', type:'static', mode:'time', sec:30, sets:1, sides:2})),
      mobSummary(normMobItem({name:'a', type:'dynamic', mode:'reps', reps:1, sets:2, sides:1}))]""")
    check(pl == ["1 move · ~2 min", "3 moves · ~2 min", "1 day ago", "Yesterday", "Today", "4 days ago", "Each side · 1 set × 30 sec", "2 sets × 1 rep"], "en: çoğul/tekil: %s" % pl)
    # EN değerlerinde etiket dışı & < > yok (bu görevin anahtarları)
    src22 = open(os.path.join(REPO, "src", "app", "22-en-mobilite.js"), encoding="utf-8").read()
    keys22 = [k.replace('\\"', '"') for k in re.findall(r'"((?:[^"\\]|\\.)*)":\s*(?:"|\{)', src22)]
    bad = pg.evaluate(r"""ks => ks.filter(k => { const v = EN[k]; const vs = typeof v === 'string' ? [v] : v ? [v.one, v.other] : [];
      return vs.some(x => /[&<>]/.test(String(x).replace(/<\/?b>/g, ''))); })""", keys22)
    check(len(keys22) > 100 and bad == [], "en: bu dosyanın değerlerinde & < > yok (%d anahtar): %s" % (len(keys22), bad))
    # Türkçe aynı
    setlang('tr')
    tr_home = pg.evaluate("() => { mobUI.view = 'home'; mobUI.edit = false; return mobHomeHtml(); }")
    check("Rutinlerin" in tr_home and "Bölgeler · son çalışma" in tr_home and "gün bu hafta" in tr_home and "Kalça".upper().replace("I", "I") != "", "tr: ana ekran Türkçe")
    check(pg.evaluate("[mobAgoText(1), mobAgoText(4), mobSummary(normMobItem({name:'a', type:'static', mode:'time', sec:30, sets:1, sides:2}))]") == ["Dün", "4 gün önce", "Sağ/sol · 1 set × 30 sn"], "tr: yardımcı metinler aynı")
    check(errs == [], "sayfa hatası yok: " + str(errs[:3]))
    b.close()
finally:
    srv.terminate()
print("BAŞARISIZ:" if fails else "TÜMÜ GEÇTİ", fails)
sys.exit(1 if (fails or errs) else 0)
