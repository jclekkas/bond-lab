// Local stand-in for the "grok/canvas" kit so the Page runs as a plain static site.
import React, { Fragment, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { ReactNode, CSSProperties, ChangeEvent } from "react";
export { Fragment, useCallback, useEffect, useMemo, useReducer, useRef, useState };
export type { ReactNode, CSSProperties, ChangeEvent };

// ---------- theme ----------
type TS = { fontSize: string; lineHeight: string; letterSpacing: string };
const ts = (s: number, lh: number): TS => ({ fontSize: s + "px", lineHeight: lh + "px", letterSpacing: "0" });
const FAMILY = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
function makeTheme(dark: boolean) {
  const text = dark
    ? { primary: "#f2f3f5", secondary: "#b6bac2", tertiary: "#868b94", onColor: "#ffffff", onPrimary: "#111214", accent: "#6ea8ff", success: "#4cc38a", warning: "#f0a64a", danger: "#ff6b6b", accentDeep: "#9cc3ff", successDeep: "#7fd9ab", warningDeep: "#f6c27f", dangerDeep: "#ff9a9a" }
    : { primary: "#15171a", secondary: "#4a4f57", tertiary: "#7a8089", onColor: "#ffffff", onPrimary: "#ffffff", accent: "#1f6feb", success: "#1a7f4b", warning: "#b2560b", danger: "#c4302b", accentDeep: "#174ea6", successDeep: "#11643a", warningDeep: "#8a4208", dangerDeep: "#9c231f" };
  return {
    kind: (dark ? "dark" : "light") as "light" | "dark",
    bg: dark ? { base: "#111214", subtle: "#17191c", elevated: "#1e2125" } : { base: "#ffffff", subtle: "#f6f7f9", elevated: "#ffffff" },
    text,
    fill: dark
      ? { primary: "#f2f3f5", primaryHover: "#ffffff", secondary: "#2a2e33", secondaryHover: "#33383e", hover: "#24282c", pressed: "#2e3237", accent: "#6ea8ff", controlChecked: "#6ea8ff", accentSubtle: "#1c2a40", successSubtle: "#16301f", warningSubtle: "#3a2a14", dangerSubtle: "#3a1a1a" }
      : { primary: "#15171a", primaryHover: "#2b2e33", secondary: "#eef0f3", secondaryHover: "#e3e6ea", hover: "#f2f4f6", pressed: "#e6e9ed", accent: "#1f6feb", controlChecked: "#1f6feb", accentSubtle: "#e8f0fe", successSubtle: "#e6f4ec", warningSubtle: "#fdf0e3", dangerSubtle: "#fdeceb" },
    border: dark
      ? { subtle: "#24272b", weak: "#2c3035", default: "#353a40", strong: "#5a6068", focus: "#6ea8ff" }
      : { subtle: "#eef0f2", weak: "#e5e8eb", default: "#dde1e5", strong: "#a9afb7", focus: "#1f6feb" },
    font: { family: FAMILY, mono: MONO, heading1: ts(30, 38), heading2: ts(20, 28), heading3: ts(16, 24), body1: ts(16, 24), subtext: ts(15, 22), table: ts(14, 20), metric: ts(28, 34), body2: ts(14, 21), label: ts(13, 18), caption: ts(12, 16), code: ts(13, 20) },
    weight: { regular: 400 as const, medium: 500 as const, semibold: 600 as const },
    radius: { sm: 4 as const, md: 8 as const, lg: 12 as const, xl: 16 as const, full: 9999 as const },
    motion: { hover: "120ms", easing: "ease" },
    dataviz: {
      categorical: dark ? ["#5b9dff", "#f2c94c", "#3ccfd8"] : ["#2f6fe4", "#e0a800", "#13a9b5"],
      other: dark ? "#6b7079" : "#a3a9b1", negative: dark ? "#ff6b6b" : "#d1433f", singleSeriesRest: dark ? "#33435c" : "#c9d8f5",
      areaAlpha: "33", bandAlpha: "22", blueTint: "#e8f0fe", blue5: "#2f6fe4",
      sequential: ["#e8f0fe", "#b9d0fb", "#7fa8f5", "#4a82ec", "#2f6fe4", "#1d4fb0"], diverging: ["#d1433f", "#f0a3a0", "#eeeeee", "#9fc0f7", "#2f6fe4"],
    },
    chart: ["#2f6fe4", "#e0a800", "#13a9b5", "#a3a9b1"] as [string, string, string, string],
  };
}
export type GrokTheme = ReturnType<typeof makeTheme>;
const mq = (): MediaQueryList | null => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null);
export function useGrokTheme(): GrokTheme {
  const [dark, setDark] = useState<boolean>(() => !!mq()?.matches);
  useEffect(() => {
    const m = mq(); if (!m) return;
    const h = (e: MediaQueryListEvent) => setDark(e.matches);
    m.addEventListener("change", h);
    return () => m.removeEventListener("change", h);
  }, []);
  return useMemo(() => makeTheme(dark), [dark]);
}

// ---------- layout ----------
const GridCtx = React.createContext(false);
const card = (t: GrokTheme): CSSProperties => ({ background: t.bg.base, border: `1px solid ${t.border.default}`, borderRadius: 16, padding: 20, minWidth: 0 });

export function Page({ title, summary, width = "column", children }: { title: string; summary?: string; width?: "column" | "wide" | "full"; children?: ReactNode; sources?: string[]; lang?: string; palette?: string[] }) {
  const t = useGrokTheme();
  useEffect(() => { document.title = title; document.body.style.background = t.bg.base; document.body.style.color = t.text.primary; }, [title, t]);
  const max = width === "column" ? 700 : width === "wide" ? 1280 : 1600;
  return (
    <div style={{ fontFamily: t.font.family, color: t.text.primary, background: t.bg.base, minHeight: "100vh" }}>
      <style>{`*{box-sizing:border-box} body{margin:0} .gk-grid{display:grid;gap:16px} @media (max-width:760px){.gk-grid{grid-template-columns:1fr !important}} .gk-btn:hover{filter:brightness(0.97)} .gk-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}`}</style>
      <main style={{ maxWidth: max, margin: "0 auto", padding: "32px 20px 64px", display: "flex", flexDirection: "column", gap: 28 }}>
        <header>
          <h1 style={{ margin: 0, ...t.font.heading1, fontWeight: 600 }}>{title}</h1>
          {summary && <p style={{ margin: "10px 0 0", ...t.font.subtext, color: t.text.secondary, maxWidth: 820 }}>{summary}</p>}
        </header>
        {children}
      </main>
    </div>
  );
}

export function Section({ heading, id, caption, collapsible, defaultOpen = true, children }: { heading?: string; id?: string; caption?: string; actions?: ReactNode; collapsible?: boolean; defaultOpen?: boolean; children?: ReactNode }) {
  const t = useGrokTheme();
  const inGrid = React.useContext(GridCtx);
  const [open, setOpen] = useState(defaultOpen);
  const body = <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>{children}</div>;
  const h = heading && (
    <div style={{ marginBottom: 14 }}>
      <h2 role={collapsible ? "button" : undefined} onClick={collapsible ? () => setOpen(!open) : undefined}
        style={{ margin: 0, ...(inGrid ? t.font.heading3 : t.font.heading2), fontWeight: 600, cursor: collapsible ? "pointer" : undefined, userSelect: collapsible ? "none" : undefined }}>
        {collapsible ? (open ? "\u25be " : "\u25b8 ") : ""}{heading}
      </h2>
      {caption && <div style={{ ...t.font.label, color: t.text.tertiary, marginTop: 4 }}>{caption}</div>}
    </div>
  );
  return <section id={id} style={{ minWidth: 0 }}>{h}{(!collapsible || open) && body}</section>;
}

export function Grid({ columns = 2, plain, children }: { columns?: number; joined?: boolean; plain?: boolean; children?: ReactNode }) {
  const t = useGrokTheme();
  const kids = React.Children.toArray(children);
  return (
    <GridCtx.Provider value={true}>
      <div className="gk-grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, alignItems: "start" }}>
        {kids.map((k, i) => <div key={i} style={plain ? { minWidth: 0 } : card(t)}>{k}</div>)}
      </div>
    </GridCtx.Provider>
  );
}

export function Text({ children }: { children?: ReactNode }) {
  const t = useGrokTheme();
  return <p style={{ margin: 0, ...t.font.body1, color: t.text.primary }}>{children}</p>;
}

export function Callout({ lead, tone, children }: { lead?: string; tone?: "info" | "success" | "warning" | "danger"; children?: ReactNode }) {
  const t = useGrokTheme();
  const bg = tone === "success" ? t.fill.successSubtle : tone === "warning" ? t.fill.warningSubtle : tone === "danger" ? t.fill.dangerSubtle : tone === "info" ? t.fill.accentSubtle : t.bg.subtle;
  return (
    <div style={{ background: bg, border: `1px solid ${t.border.weak}`, borderRadius: 12, padding: "14px 18px", ...t.font.body1 }}>
      {lead && <div style={{ fontWeight: 600, marginBottom: 4 }}>{lead}</div>}
      <div style={{ color: t.text.primary }}>{children}</div>
    </div>
  );
}

// ---------- status / controls ----------
type StatusTone = "success" | "warning" | "danger" | "accent" | "neutral";
export function Status({ tone = "neutral", children }: { tone?: StatusTone; children: ReactNode }) {
  const t = useGrokTheme();
  const m: Record<StatusTone, [string, string]> = {
    success: [t.fill.successSubtle, t.text.success], warning: [t.fill.warningSubtle, t.text.warning], danger: [t.fill.dangerSubtle, t.text.danger],
    accent: [t.fill.accentSubtle, t.text.accent], neutral: [t.fill.secondary, t.text.secondary],
  };
  return <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 999, background: m[tone][0], color: m[tone][1], ...t.font.label, fontWeight: 600, whiteSpace: "nowrap" }}>{children}</span>;
}

export function Button({ label, onClick, variant = "quiet", disabled }: { label: string; onClick: () => void; variant?: "primary" | "quiet"; disabled?: boolean }) {
  const t = useGrokTheme();
  const p = variant === "primary";
  return (
    <button className="gk-btn" disabled={disabled} onClick={onClick}
      style={{ cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1, padding: "8px 14px", borderRadius: 999, fontFamily: t.font.family, ...t.font.body2, fontWeight: 600,
        background: p ? t.fill.primary : t.bg.base, color: p ? t.text.onPrimary : t.text.primary, border: `1px solid ${p ? t.fill.primary : t.border.default}` }}>
      {label}
    </button>
  );
}

type SegOpt<T extends string> = T | { value: T; label: string; count?: number };
export function Segmented<T extends string = string>({ options, value, onChange }: { options: SegOpt<T>[]; value: T; onChange: (v: T) => void }) {
  const t = useGrokTheme();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: 4, borderRadius: 12, background: t.fill.secondary, alignSelf: "flex-start" }}>
      {options.map((o) => {
        const v = (typeof o === "string" ? o : o.value) as T;
        const l = typeof o === "string" ? o : o.label;
        const on = v === value;
        return (
          <button key={v} onClick={() => onChange(v)} style={{ cursor: "pointer", border: "none", borderRadius: 9, padding: "6px 12px", fontFamily: t.font.family, ...t.font.body2, fontWeight: on ? 600 : 400,
            background: on ? t.bg.base : "transparent", color: on ? t.text.primary : t.text.secondary, boxShadow: on ? `0 0 0 1px ${t.border.default}` : "none" }}>{l}</button>
        );
      })}
    </div>
  );
}

// ---------- lists / rows / properties / steps ----------
export function Properties({ items }: { items: { label: string; value: ReactNode }[] }) {
  const t = useGrokTheme();
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", padding: "9px 0", borderTop: i ? `1px solid ${t.border.subtle}` : "none", ...t.font.body2 }}>
          <div style={{ flex: "0 0 180px", maxWidth: "100%", color: t.text.secondary }}>{it.label}</div>
          <div style={{ flex: "1 1 160px", minWidth: 0, color: t.text.primary }}>{it.value}</div>
        </div>
      ))}
    </div>
  );
}

type RowT = { lead?: string; title: string; detail?: string; meta?: string; status?: { label: string; tone?: "success" | "warning" | "danger" } };
export function Rows({ rows }: { rows: RowT[] }) {
  const t = useGrokTheme();
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderTop: i ? `1px solid ${t.border.subtle}` : "none", alignItems: "flex-start" }}>
          {r.lead && <div style={{ flex: "0 0 auto", minWidth: 30, ...t.font.label, color: t.text.tertiary, fontFamily: t.font.mono, paddingTop: 2 }}>{r.lead}</div>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", ...t.font.body2, fontWeight: 600 }}>
              <span>{r.title}</span>{r.status && <Status tone={r.status.tone ?? "neutral"}>{r.status.label}</Status>}
            </div>
            {r.detail && <div style={{ ...t.font.body2, color: t.text.secondary, marginTop: 2 }}>{r.detail}</div>}
          </div>
          {r.meta && <div style={{ ...t.font.label, color: t.text.tertiary }}>{r.meta}</div>}
        </div>
      ))}
    </div>
  );
}

export function Steps({ steps }: { steps: { title: ReactNode; detail?: ReactNode }[] }) {
  const t = useGrokTheme();
  return (
    <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 14 }}>
      {steps.map((s, i) => (
        <li key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <span style={{ flex: "0 0 28px", height: 28, borderRadius: 999, background: t.fill.secondary, color: t.text.primary, display: "flex", alignItems: "center", justifyContent: "center", ...t.font.label, fontWeight: 600 }}>{i + 1}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ ...t.font.body1, fontWeight: 600 }}>{s.title}</div>
            {s.detail && <div style={{ ...t.font.body2, color: t.text.secondary, marginTop: 2 }}>{s.detail}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}

// ---------- table ----------
const numeric = (c: unknown): boolean => typeof c === "string" && /^[\s$+\-−]*[\d.,]+/.test(c);
export function Table({ columns, rows, align }: { columns: string[]; rows: ReactNode[][]; emphasis?: number; align?: ("auto" | "start" | "end")[] }) {
  const t = useGrokTheme();
  const right = columns.map((_, j) => {
    const a = align?.[j];
    if (a === "start") return false;
    if (a === "end") return true;
    if (j === 0) return false;
    const cells = rows.map((r) => r[j]).filter((c) => typeof c === "string");
    return cells.length > 0 && cells.every(numeric);
  });
  const cell = (c: ReactNode): ReactNode => {
    if (c && typeof c === "object" && !React.isValidElement(c) && "text" in (c as object)) {
      const o = c as unknown as { text: string; tone?: "success" | "warning" | "danger" };
      return <span style={{ color: o.tone ? t.text[o.tone] : undefined }}>{o.text}</span>;
    }
    return c;
  };
  return (
    <div className="gk-scroll" style={{ border: `1px solid ${t.border.default}`, borderRadius: 12 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", ...t.font.table }}>
        <thead>
          <tr>{columns.map((c, j) => <th key={j} style={{ textAlign: right[j] ? "right" : "left", padding: "10px 14px", color: t.text.secondary, fontWeight: 600, borderBottom: `1px solid ${t.border.default}`, whiteSpace: "nowrap" }}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>{r.map((c, j) => <td key={j} style={{ textAlign: right[j] ? "right" : "left", padding: "10px 14px", borderTop: i ? `1px solid ${t.border.subtle}` : "none", verticalAlign: "top", color: t.text.primary, fontVariantNumeric: "tabular-nums", minWidth: j === 0 ? 110 : undefined }}>{cell(c)}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- stacked column chart ----------
export function ColumnSeries({ labels, series, stacked, unit, format }: { labels: string[]; series: { name: string; values: number[] }[]; stacked?: boolean; ceiling?: number; unit?: string; format?: (v: number) => string; legend?: boolean }) {
  const t = useGrokTheme();
  const C = [...t.dataviz.categorical, t.dataviz.other];
  const W = 640, H = 260, l = 52, r = 12, tp = 12, b = 30;
  const totals = labels.map((_, i) => stacked ? series.reduce((s, x) => s + (x.values[i] ?? 0), 0) : Math.max(...series.map((x) => x.values[i] ?? 0)));
  const max = Math.max(1, ...totals) * 1.08;
  const fmt = format ?? ((v: number) => (v >= 100 ? v.toFixed(0) : v.toFixed(1)) + (unit ? " " + unit : ""));
  const bw = (W - l - r) / Math.max(1, labels.length);
  const Y = (v: number) => tp + (1 - v / max) * (H - tp - b);
  const every = Math.ceil(labels.length / 8);
  return (
    <div style={{ ...card(t) }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginBottom: 10, ...t.font.label, color: t.text.secondary }}>
        {series.map((s, k) => <span key={s.name} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: C[Math.min(k, 3)] }} />{s.name}</span>)}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}><line x1={l} x2={W - r} y1={Y(max * f)} y2={Y(max * f)} stroke={t.border.subtle} />
            <text x={l - 6} y={Y(max * f) + 4} textAnchor="end" fontSize={11} fill={t.text.tertiary}>{fmt(max * f)}</text></g>
        ))}
        {labels.map((lab, i) => {
          let acc = 0;
          const x = l + i * bw + bw * 0.18, w = bw * 0.64;
          return (
            <g key={lab}>
              {series.map((s, k) => {
                const v = s.values[i] ?? 0;
                if (!stacked) { const ww = w / series.length; return <rect key={k} x={x + k * ww} y={Y(v)} width={ww - 1} height={Y(0) - Y(v)} fill={C[Math.min(k, 3)]} rx={2}><title>{`${s.name} ${lab}: ${fmt(v)}`}</title></rect>; }
                const y0 = Y(acc), y1 = Y(acc + v); acc += v;
                return v > 0 ? <rect key={k} x={x} y={y1} width={w} height={Math.max(0, y0 - y1)} fill={C[Math.min(k, 3)]}><title>{`${s.name} ${lab}: ${fmt(v)}`}</title></rect> : null;
              })}
              {i % every === 0 && <text x={x + w / 2} y={H - 10} textAnchor="middle" fontSize={11} fill={t.text.tertiary}>{lab}</text>}
            </g>
          );
        })}
        <line x1={l} x2={W - r} y1={Y(0)} y2={Y(0)} stroke={t.border.default} />
      </svg>
    </div>
  );
}

// ---------- diagram: layered layout ----------
type DNode = { id: string; label: string; detail?: string; kind?: "box" | "decision" | "terminal" | "person" };
type DEdge = { from: string; to: string; label?: string; dashed?: boolean; detail?: string };
export function Diagram({ nodes, edges, direction = "vertical" }: { nodes: DNode[]; edges: DEdge[]; direction?: "horizontal" | "vertical" }) {
  const t = useGrokTheme();
  // rank = longest path from a source
  const rank: Record<string, number> = {};
  nodes.forEach((n) => (rank[n.id] = 0));
  for (let it = 0; it < nodes.length; it++) edges.forEach((e) => { if (rank[e.to] < rank[e.from] + 1) rank[e.to] = rank[e.from] + 1; });
  // pull sources right next to their first child
  nodes.forEach((n) => { const outs = edges.filter((e) => e.from === n.id); const ins = edges.filter((e) => e.to === n.id); if (!ins.length && outs.length) rank[n.id] = Math.max(0, Math.min(...outs.map((e) => rank[e.to])) - 1); });
  const maxR = Math.max(...Object.values(rank));
  const layers: DNode[][] = Array.from({ length: maxR + 1 }, () => []);
  nodes.forEach((n) => layers[rank[n.id]].push(n));
  const NW = 150, NH = 54, GX = direction === "horizontal" ? 70 : 30, GY = direction === "horizontal" ? 34 : 70;
  const maxL = Math.max(...layers.map((L) => L.length));
  const pos: Record<string, { x: number; y: number }> = {};
  layers.forEach((L, r) => L.forEach((n, i) => {
    const off = (maxL - L.length) / 2;
    if (direction === "horizontal") pos[n.id] = { x: 20 + r * (NW + GX), y: 20 + (i + off) * (NH + GY) };
    else pos[n.id] = { x: 20 + (i + off) * (NW + GX), y: 20 + r * (NH + GY) };
  }));
  const W = direction === "horizontal" ? 40 + (maxR + 1) * NW + maxR * GX : 40 + maxL * NW + (maxL - 1) * GX;
  const H = direction === "horizontal" ? 40 + maxL * NH + (maxL - 1) * GY : 40 + (maxR + 1) * NH + maxR * GY;
  const mid = (id: string) => ({ x: pos[id].x + NW / 2, y: pos[id].y + NH / 2 });
  const port = (id: string, toward: { x: number; y: number }) => {
    const c = mid(id), dx = toward.x - c.x, dy = toward.y - c.y;
    const sx = Math.abs(dx) / (NW / 2), sy = Math.abs(dy) / (NH / 2), s = Math.max(sx, sy) || 1;
    return { x: c.x + dx / s, y: c.y + dy / s };
  };
  const C0 = t.dataviz.categorical[0];
  return (
    <div className="gk-scroll" style={{ ...card(t) }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: direction === "horizontal" ? 720 : undefined, display: "block" }} role="img">
        <defs><marker id="gk-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill={t.text.tertiary} /></marker></defs>
        {edges.map((e, i) => {
          const a = port(e.from, mid(e.to)), b = port(e.to, mid(e.from));
          return (
            <g key={i}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={t.text.tertiary} strokeWidth={1.3} strokeDasharray={e.dashed ? "5 4" : undefined} markerEnd="url(#gk-arrow)" />
              {e.label && (
                <g>
                  <rect x={(a.x + b.x) / 2 - e.label.length * 3.3 - 4} y={(a.y + b.y) / 2 - 9} width={e.label.length * 6.6 + 8} height={16} rx={4} fill={t.bg.base} />
                  <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 + 3} textAnchor="middle" fontSize={11} fill={t.text.secondary}>{e.label}</text>
                </g>
              )}
            </g>
          );
        })}
        {nodes.map((n) => {
          const p = pos[n.id];
          const person = n.kind === "person";
          return (
            <g key={n.id}>
              <rect x={p.x} y={p.y} width={NW} height={NH} rx={person ? NH / 2 : 10} fill={t.bg.elevated} stroke={person ? C0 : t.border.strong} strokeWidth={person ? 1.6 : 1} />
              <text x={p.x + NW / 2} y={p.y + (n.detail ? 23 : 31)} textAnchor="middle" fontSize={12.5} fontWeight={600} fill={t.text.primary}>{n.label}</text>
              {n.detail && <text x={p.x + NW / 2} y={p.y + 40} textAnchor="middle" fontSize={11} fill={t.text.tertiary}>{n.detail}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function Toggle({ label, value, onChange, disabled }: { label?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  const t = useGrokTheme();
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: disabled ? "not-allowed" : "pointer", ...t.font.body2, color: t.text.primary, alignSelf: "flex-start" }}>
      <button role="switch" aria-checked={value} disabled={disabled} onClick={() => onChange(!value)}
        style={{ width: 40, height: 24, borderRadius: 999, border: "none", padding: 2, background: value ? t.fill.controlChecked : t.border.strong, cursor: "inherit", transition: "background 120ms" }}>
        <span style={{ display: "block", width: 20, height: 20, borderRadius: 999, background: "#fff", transform: value ? "translateX(16px)" : "translateX(0)", transition: "transform 120ms" }} />
      </button>
      {label}
    </label>
  );
}
