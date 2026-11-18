# WebKit modu (npm run test:webkit): run_all.py --webkit bu klasörü PYTHONPATH'e ekler.
# Python her test sürecinin başında bu dosyayı yükler; p.chromium WebKit'i (iPhone'daki Safari motoru) döndürür.
# Test dosyalarının kendisi değişmez.
from playwright.sync_api._generated import Playwright
Playwright.chromium = property(lambda self: self.webkit)
