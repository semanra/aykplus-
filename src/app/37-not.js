// ============================================================================
// v78 — HAREKET NOTU (koltuk ayarı, tutuş, kademe…)
// Not harekete bağlıdır (state.exNotes[exKey]); hareket hangi günde / programda olursa olsun aynı not görünür.
// Görünür: antrenman kartı (yazılabilir), Programım satırı, hareket menüsü, Hareketler listesi, ekleme penceresi.
// ============================================================================
function exNote(name) { const k = exKey(name); return (state.exNotes && typeof state.exNotes[k] === "string") ? state.exNotes[k] : ""; }
function setExNote(name, val) {
  const k = exKey(name);
  if (!k) return;
  if (!isObj(state.exNotes)) state.exNotes = {};
  const v = String(val == null ? "" : val).trim().slice(0, EX_NOTE_MAX);
  if (v) state.exNotes[k] = v; else delete state.exNotes[k];
}
async function openExNote(exIdx) {
  const ex = activeDay().exercises[exIdx];
  if (!ex) return;
  const cur = exNote(ex.name);
  const v = await askText(t("Hareket notu"), cur, t("Örn: koltuk 4, dirsekler içeride"), t("Koltuk ayarı, tutuş, kademe… Bu hareket hangi günde olursa olsun not görünür."));
  if (v == null) return;
  const before = cur;
  setExNote(ex.name, v);
  renderAll();
  if (before !== exNote(ex.name)) toast(exNote(ex.name) ? t("Not kaydedildi") : t("Not silindi"));
}
function exNoteLine(name, cls = "text-xs") {
  const n = exNote(name);
  return n ? `<span data-ex-note class="${cls} t-muted flex items-center gap-1 min-w-0"><span class="shrink-0" aria-hidden="true">${svgI("edit", 12, 2)}</span><span class="truncate italic"><span class="sr-only">${t("Not:")} </span>${esc(n)}</span></span>` : "";
}
