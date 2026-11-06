# Tüm test paketlerini sırayla çalıştırır. Her paket gerçek bir tarayıcıda (Chromium, iPhone boyutu) uygulamayı açar.
# Gereksinim: pip install playwright && python3 -m playwright install chromium
import glob, os, subprocess, sys
here = os.path.dirname(os.path.abspath(__file__))
tests = sorted(glob.glob(os.path.join(here, "test_*.py")))
failed = []
for t in tests:
    name = os.path.basename(t)
    r = subprocess.run([sys.executable, t], capture_output=True, text=True, timeout=300)
    ok = r.returncode == 0 and "Traceback" not in r.stderr
    print(("✓ " if ok else "✗ ") + name)
    if not ok:
        failed.append(name)
        print(r.stdout[-2000:]); print(r.stderr[-2000:])
print(f"\n{len(tests) - len(failed)}/{len(tests)} paket geçti")
sys.exit(1 if failed else 0)
