# v47: JS kaynağında Türkçe harfli metin sabitlerini bulur (yorum dışı); t(/tn( çağrısı içindekiler "sarılı" sayılır.
import re
TR = re.compile(r"[çğıöşüÇĞİÖŞÜ]")

def _sablon_sonu(src, i):
    """src[i] == '`'; kapanış ters tırnağından sonraki indeks."""
    j = i + 1
    while j < len(src) and src[j] != "`":
        if src[j] == "\\": j += 2; continue
        if src.startswith("${", j): j = _expr_sonu(src, j + 2); continue
        j += 1
    return j + 1
_RX = re.compile(r"/(?![/*])(?:[^/\\n\[]|\.|\[(?:[^\]\\n]|\.)*\])+/[a-z]*")
def _expr_sonu(src, k):
    """${ veya { içinde, k ifade başı; eşleşen } dan sonraki indeks."""
    d = 1; n = len(src)
    while k < n and d:
        ch = src[k]
        if src.startswith("//", k):
            while k < n and src[k] != "\n": k += 1
            continue
        if src.startswith("/*", k):
            k = src.find("*/", k) + 2; continue
        if ch == "/" and re.search(r"([(,=:!&|?{;]|return)\s*$", src[max(0, k - 12):k]):
            m = _RX.match(src, k)
            if m: k = m.end(); continue
        if ch in "\"'":
            k += 1
            while k < n and src[k] != ch: k += 2 if src[k] == "\\" else 1
            k += 1; continue
        if ch == "`": k = _sablon_sonu(src, k); continue
        if ch == "{": d += 1
        elif ch == "}": d -= 1
        k += 1
    return k
def tarama(src):
    """[(satır, metin, sarili_mi, ham_satir)]"""
    out = []; i = 0; n = len(src); line = 1
    stack = []          # parantez yığını: True = t(/tn( çağrısı
    tstack = []         # şablon içi ${ } için: yığın uzunluğu
    last = ""           # son anlamlı belirteç (regex ayrımı için)
    lines = src.split("\n")
    def wrapped(): return any(stack)
    def read_str(q, i):
        j = i + 1; buf = []
        while j < n and src[j] != q:
            if src[j] == "\\": buf.append(src[j:j + 2]); j += 2
            else: buf.append(src[j]); j += 1
        return "".join(buf), j + 1
    while i < n:
        c = src[i]
        if c == "\n": line += 1; i += 1; continue
        if c in " \t\r": i += 1; continue
        if src.startswith("//", i):
            while i < n and src[i] != "\n": i += 1
            continue
        if src.startswith("/*", i):
            j = src.find("*/", i + 2); j = n if j < 0 else j + 2
            line += src.count("\n", i, j); i = j; continue
        if c in "\"'":
            s, j = read_str(c, i)
            if TR.search(s): out.append((line, s, wrapped(), lines[line - 1].strip()))
            line += src.count("\n", i, j); i = j; last = "str"; continue
        if c == "`":
            # şablon: metin parçaları + ${ ... } ifadeleri
            j = i + 1; buf = []; ln0 = line
            while j < n and src[j] != "`":
                if src[j] == "\\": buf.append(src[j:j + 2]); j += 2; continue
                if src.startswith("${", j):
                    inner_start = j + 2
                    k = _expr_sonu(src, inner_start)
                    inner = src[inner_start:k - 1]
                    for (l2, s2, w2, r2) in tarama(inner):
                        out.append((line + src.count("\n", i, j) + l2 - 1, s2, w2 or wrapped(), r2))
                    buf.append("${}"); j = k; continue
                buf.append(src[j]); j += 1
            s = "".join(buf)
            if TR.search(s): out.append((line, s, wrapped(), lines[line - 1].strip()))
            line += src.count("\n", i, j); i = j + 1; last = "str"; continue
        if c == "/" and last in ("", "(", ",", "=", ":", "[", "!", "&", "|", "?", "{", "}", ";", "return", "=>", "+"):
            j = i + 1; cls = False
            while j < n and (src[j] != "/" or cls) and src[j] != "\n":
                if src[j] == "\\": j += 1
                elif src[j] == "[": cls = True
                elif src[j] == "]": cls = False
                j += 1
            i = j + 1
            while i < n and src[i].isalpha(): i += 1
            last = "str"; continue
        if c.isalpha() or c in "_$":
            j = i
            while j < n and (src[j].isalnum() or src[j] in "_$"): j += 1
            w = src[i:j]; i = j; last = w; ident_end = j
            continue_flag = True
            # t( / tn( : önceki karakter nokta değil
            k = i
            while k < n and src[k] in " \t": k += 1
            if w in ("t", "tn") and k < n and src[k] == "(" and not (ident_end - len(w) > 0 and src[ident_end - len(w) - 1] == "."):
                stack.append(True); i = k + 1; last = "("; continue
            continue
        if c in "([{":
            stack.append(False); i += 1; last = c; continue
        if c in ")]}":
            if stack: stack.pop()
            i += 1; last = c; continue
        if c.isdigit():
            while i < n and (src[i].isalnum() or src[i] == "."): i += 1
            last = "num"; continue
        last = c; i += 1
    return out

# ---- markup taraması: data-t'siz Türkçe metin düğümü / öznitelik (başlangıç <body> etiketinden)
from html.parser import HTMLParser
class _Mk(HTMLParser):
    VOID = {"input", "img", "br", "hr", "meta", "link", "path", "circle", "rect", "line", "polyline", "polygon", "use", "source"}
    def __init__(self):
        super().__init__(convert_charrefs=True); self.st = []; self.out = []; self.skip = 0
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ("script", "style"): self.skip += 1
        for k, lab in (("aria-label", "data-t-aria"), ("placeholder", "data-t-ph"), ("title", None), ("alt", None)):
            if k in a and a[k] and TR.search(a[k]) and not (lab and lab in a):
                self.out.append(("attr:" + k, a[k], [x[1] for x in self.st if x[1]] + ([a["id"]] if "id" in a else []), self.getpos()[0]))
        if tag not in self.VOID: self.st.append((tag, a.get("id"), "data-t" in a))
    def handle_endtag(self, tag):
        if tag in ("script", "style"): self.skip = max(0, self.skip - 1)
        for i in range(len(self.st) - 1, -1, -1):
            if self.st[i][0] == tag: del self.st[i:]; break
    def handle_data(self, d):
        if self.skip or not TR.search(d): return
        if any(x[2] for x in self.st): return
        self.out.append(("text", d.strip(), [x[1] for x in self.st if x[1]], self.getpos()[0]))
def markup_tarama(html):
    p = _Mk(); p.feed(html); return p.out

def islev_govdesi(src, ad):
    """function <ad>( ... ) { govde } -> govde metni (None: bulunamadı)."""
    m = re.search(r"(?:async\s+)?function\s+" + re.escape(ad) + r"\s*\(", src)
    if not m: return None
    i = src.index("{", src.index(")", m.end()))
    return src[i + 1:_expr_sonu(src, i + 1) - 1]

def islev_govdesi(src, ad):
    """function <ad>( ... ) { govde } -> govde metni (None: bulunamadı)."""
    m = re.search(r"(?:async\s+)?function\s+" + re.escape(ad) + r"\s*\(", src)
    if not m: return None
    i = src.index("{", src.index(")", m.end()))
    return src[i + 1:_expr_sonu(src, i + 1) - 1]
