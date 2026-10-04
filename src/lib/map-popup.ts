type PopupResult = {
  store_name?: string | null;
  city?: string;
  zip_code?: string;
  total_crimes?: number;
  priority_score?: number;
};

// Leaflet interprets string popups as HTML. Keep result text in DOM text nodes.
export function buildMapPopup(result: PopupResult, ownerDocument: Document = document): HTMLElement {
  const score = Number.isFinite(result.priority_score) ? result.priority_score! : 0;
  const color = score >= 50 ? "#f87171" : score >= 20 ? "#fbbf24" : "#34d399";
  const container = ownerDocument.createElement("div");
  container.style.cssText = "background:#070d08;color:#fff;border:1px solid rgba(245,158,11,.15);border-radius:14px;padding:14px 16px;min-width:168px;font-family:monospace;font-size:12px";
  const append = (text: string, css: string) => {
    const line = ownerDocument.createElement("div");
    line.style.cssText = css;
    line.textContent = text;
    container.appendChild(line);
  };
  append(score >= 50 ? "CRITICAL" : score >= 20 ? "ELEVATED" : "NOMINAL", `color:${color};font-size:9px;font-weight:700;letter-spacing:.1em;margin-bottom:6px`);
  append(result.store_name || `ZIP ${result.zip_code ?? ""}`, "font-size:13px;font-weight:600;margin-bottom:2px");
  append(`${result.city ?? ""} · ${result.zip_code ?? ""}`, "color:rgba(255,255,255,.35);font-size:11px;margin-bottom:8px");
  append(`Crimes: ${result.total_crimes?.toLocaleString() ?? "—"}`, "color:#f87171;margin-bottom:2px");
  append(`Risk: ${score}/100`, `color:${color};font-weight:700`);
  return container;
}
