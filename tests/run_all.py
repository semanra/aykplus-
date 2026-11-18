# Tüm test paketlerini sırayla çalıştırır. Her paket gerçek bir tarayıcıda (Chromium, iPhone boyutu) uygulamayı açar.
# Gereksinim: pip install playwright && python3 -m playwright install chromium
import glob, os, subprocess, sys
here = os.path.dirname(os.path.abspath(__file__))
tests = sorted(glob.glob(os.path.join(here, "test_*.py")))
# --webkit: aynı testler iPhone'daki Safari motoruyla (WebKit). Gereksinim: python -m playwright install webkit
env = dict(os.environ)
if "--webkit" in sys.argv:
    env["PYTHONPATH"] = os.path.join(here, "webkit") + os.pathsep + env.get("PYTHONPATH", "")
    print("WebKit modu")
only = [a for a in sys.argv[1:] if not a.startswith("--")]
if only:
    tests = [t for t in tests if any(o in os.path.basename(t) for o in only)]
failed = []
for t in tests:
    name = os.path.basename(t)
    r = subprocess.run([sys.executable, t], capture_output=True, text=True, timeout=600, env=env)
    ok = r.returncode == 0 and "Traceback" not in r.stderr
    print(("✓ " if ok else "✗ ") + name)
    if not ok:
        failed.append(name)
        print(r.stdout[-2000:]); print(r.stderr[-2000:])
print(f"\n{len(tests) - len(failed)}/{len(tests)} paket geçti")
sys.exit(1 if failed else 0)
