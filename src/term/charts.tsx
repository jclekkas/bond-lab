import { useRef, useState } from "react";
import type { PointerEvent as RPE, KeyboardEvent as RKE } from "react";
import { rng, FLS } from "./engine";

const TC = ["var(--t0)", "var(--t1)", "var(--t2)"];

// ---------- price chart: candles or lines, crosshair, timeframe ----------
export type Candle = { m: number; o: number; h: number; l: number; c: number };
export function candlesFor(hist: { m: number; px: number[] }[], k: number, vol: number): Candle[] {
  return hist.map((h, i) => {
    const c = h.px[k];
    const o = i === 0 ? c : hist[i - 1].px[k];
    const r = rng(7001 + h.m * 31 + k * 977);
    const wick = vol * (0.25 + r());
    return { m: h.m, o, c, h: Math.max(o, c) + wick * r(), l: Math.min(o, c) - wick * r() };
  });
}

export function PriceChart({ hist, sel, mode, tf, vol }: { hist: { m: number; px: number[] }[]; sel: number; mode: "candle" | "line"; tf: number; vol: number }) {
  const W = 760, H = 300, l = 8, r = 58, tp = 12, b = 26;
  const data = tf > 0 ? hist.slice(-(tf + 1)) : hist;
  const cs = candlesFor(hist, sel, vol).slice(-data.length);
  const vals = mode === "candle" ? cs.flatMap((c) => [c.h, c.l]) : data.flatMap((h) => h.px);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const padv = Math.max(0.15, (hi - lo) * 0.12);
  lo -= padv; hi += padv;
  const n = Math.max(1, data.length - 1);
  const slot = (W - l - r) / Math.max(1, data.length);
  const X = (i: number) => (data.length === 1 ? (W - r + l) / 2 : l + slot / 2 + (i / n) * (W - l - r - slot));
  const Y = (v: number) => tp + ((hi - v) / (hi - lo)) * (H - tp - b);
  const ticks = [0, 1, 2, 3, 4].map((k) => lo + ((hi - lo) * k) / 4);
  const [hov, setHov] = useState<{ i: number; y: number } | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const move = (e: RPE<SVGSVGElement>) => {
    const rc = ref.current?.getBoundingClientRect();
    if (!rc) return;
    const x = ((e.clientX - rc.left) / rc.width) * W, y = ((e.clientY - rc.top) / rc.height) * H;
    let best = 0, bd = 1e9;
    data.forEach((_, i) => { const d = Math.abs(X(i) - x); if (d < bd) { bd = d; best = i; } });
    setHov({ i: best, y: Math.max(tp, Math.min(H - b, y)) });
  };
  const last = data[data.length - 1];
  const lastV = last.px[sel];
  const hv = hov ? hi - ((hov.y - tp) / (H - tp - b)) * (hi - lo) : 0;
  const hd = hov ? data[hov.i] : null, hc = hov ? cs[hov.i] : null;
  return (
    <div className="chart-wrap">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Price chart, ${FLS[sel]} tranche`} onPointerMove={move} onPointerLeave={() => setHov(null)}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={l} x2={W - r} y1={Y(v)} y2={Y(v)} style={{ stroke: "var(--border)" }} strokeDasharray="2 4" />
            <text x={W - r + 6} y={Y(v) + 4} fontSize={11} className="mono" style={{ fill: "var(--text3)" }}>{v.toFixed(2)}</text>
          </g>
        ))}
        {data.map((h, i) => (i % Math.ceil(data.length / 8) === 0 || i === data.length - 1) && <text key={h.m} x={X(i)} y={H - 8} textAnchor="middle" fontSize={11} style={{ fill: "var(--text3)" }}>{"M" + h.m}</text>)}
        <line x1={l} x2={W - r} y1={Y(100)} y2={Y(100)} style={{ stroke: "var(--text3)", opacity: Y(100) > tp && Y(100) < H - b ? 0.6 : 0 }} strokeDasharray="6 4" />
        {mode === "candle" ? cs.map((c, i) => {
          const upc = c.c >= c.o, col = upc ? "var(--up)" : "var(--down)";
          const bw = Math.max(3, Math.min(16, slot * 0.6));
          return (
            <g key={c.m}>
              <line x1={X(i)} x2={X(i)} y1={Y(c.h)} y2={Y(c.l)} style={{ stroke: col }} strokeWidth={1.2} />
              <rect x={X(i) - bw / 2} y={Y(Math.max(c.o, c.c))} width={bw} height={Math.max(1.5, Math.abs(Y(c.o) - Y(c.c)))} rx={1.5} style={{ fill: col }} />
            </g>
          );
        }) : [0, 1, 2].map((k) => (
          <polyline key={k} fill="none" style={{ stroke: TC[k], opacity: k === sel ? 1 : 0.45 }} strokeWidth={k === sel ? 2.2 : 1.4} points={data.map((h, i) => `${X(i)},${Y(h.px[k])}`).join(" ")} />
        ))}
        {/* last price tag */}
        <rect x={W - r + 2} y={Y(lastV) - 9} width={r - 4} height={18} rx={3} style={{ fill: mode === "candle" ? (cs[cs.length - 1].c >= cs[cs.length - 1].o ? "var(--up)" : "var(--down)") : TC[sel] }} />
        <text x={W - r + 6} y={Y(lastV) + 4} fontSize={11} fontWeight={700} className="mono" style={{ fill: "#fff" }}>{lastV.toFixed(2)}</text>
        {hov && (
          <g pointerEvents="none">
            <line x1={X(hov.i)} x2={X(hov.i)} y1={tp} y2={H - b} style={{ stroke: "var(--text2)" }} strokeDasharray="3 3" />
            <line x1={l} x2={W - r} y1={hov.y} y2={hov.y} style={{ stroke: "var(--text2)" }} strokeDasharray="3 3" />
            <rect x={W - r + 2} y={hov.y - 9} width={r - 4} height={18} rx={3} style={{ fill: "var(--panel3)", stroke: "var(--border2)" }} />
            <text x={W - r + 6} y={hov.y + 4} fontSize={11} className="mono" style={{ fill: "var(--text)" }}>{hv.toFixed(2)}</text>
          </g>
        )}
      </svg>
      {hov && hd && hc && (
        <div className="chart-tip mono" style={{ left: `${Math.min(70, (X(hov.i) / W) * 100)}%`, top: 6 }}>
          <b>{"Month " + hd.m}</b>{" "}
          {mode === "candle" ? `${FLS[sel]}  O ${hc.o.toFixed(2)}  H ${hc.h.toFixed(2)}  L ${hc.l.toFixed(2)}  C ${hc.c.toFixed(2)}` : FLS.map((f, k) => `${f} ${hd.px[k].toFixed(2)}`).join("  ")}
        </div>
      )}
    </div>
  );
}

// ---------- tiny sparkline ----------
export function Spark({ vals, w = 80, h = 22, color }: { vals: number[]; w?: number; h?: number; color: string }) {
  if (vals.length < 2) return <svg width={w} height={h} />;
  const lo = Math.min(...vals), hi = Math.max(...vals), d = hi - lo || 1;
  return <svg width={w} height={h} aria-hidden><polyline fill="none" style={{ stroke: color }} strokeWidth={1.5} points={vals.map((v, i) => `${(i / (vals.length - 1)) * w},${h - 2 - ((v - lo) / d) * (h - 4)}`).join(" ")} /></svg>;
}

// ---------- histogram ----------
export function Histogram({ bins }: { bins: number[] }) {
  const mx = Math.max(...bins, 1);
  const W = 620, H = 170, l = 20, b = 26, bw = (W - 2 * l) / bins.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Credit score distribution">
      {bins.map((v, i) => {
        const h = (v / mx) * (H - b - 12);
        const weak = 500 + i * 25 < 620;
        return <rect key={i} x={l + i * bw + 2} y={H - b - h} width={bw - 4} height={h} rx={3} style={{ fill: weak ? "var(--t1)" : "var(--t0)", transition: "all .3s" }} />;
      })}
      <line x1={l} x2={W - l} y1={H - b} y2={H - b} style={{ stroke: "var(--border2)" }} />
      {[500, 575, 650, 725, 800, 850].map((s) => <text key={s} x={l + ((s - 500) / 350) * (W - 2 * l)} y={H - 8} textAnchor="middle" fontSize={11} style={{ fill: "var(--text3)" }}>{s}</text>)}
    </svg>
  );
}

// ---------- interactive capital stack ----------
export type StackLayer = { key: string; label: string; pct: number; color: string; note: string; dashed?: boolean };
export function CapitalStack({ layers, floods, onDrag, height = 380 }: { layers: StackLayer[]; floods: { pct: number; label: string; solid?: boolean }[]; onDrag?: (handle: number, deltaPct: number, done: boolean) => void; height?: number }) {
  // layers listed top to bottom; losses eat from the bottom
  const total = layers.reduce((s, x) => s + Math.max(x.pct, 0), 0);
  const H = height - 2;
  // Readability: when the top layer is very thick, draw it compressed (axis break) so the thin
  // layers below, where losses actually hit, get most of the height.
  const topShare = total > 0 ? Math.max(layers[0].pct, 0) / total : 0;
  const broken = topShare > 0.42;
  const k = broken ? (H * 0.62) / Math.max(total - layers[0].pct, 1) : H / Math.max(total, 1);
  const hs = layers.map((x, i) => (broken && i === 0 ? H * 0.38 : Math.max(0, x.pct * k)));
  const tops: number[] = [];
  let y = 0;
  hs.forEach((h) => { tops.push(y); y += h; });
  const yFor = (L: number) => {
    let yb = H, rem = L;
    for (let i = layers.length - 1; i >= 0; i--) {
      const p = layers[i].pct;
      if (rem <= p) return yb - (p > 0 ? (rem / p) * hs[i] : 0);
      rem -= p; yb -= hs[i];
    }
    return 0;
  };
  const drag = useRef<{ h: number; y0: number } | null>(null);
  const [act, setAct] = useState(-1);
  const down = (h: number) => (e: RPE<HTMLDivElement>) => { (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId); drag.current = { h, y0: e.clientY }; setAct(h); };
  const mv = (e: RPE<HTMLDivElement>) => {
    const d = drag.current; if (!d || !onDrag) return;
    const dp = Math.round((e.clientY - d.y0) / k);
    if (dp !== 0) { onDrag(d.h, dp, false); d.y0 += dp * k; }
  };
  const up = () => { if (drag.current && onDrag) onDrag(drag.current.h, 0, true); drag.current = null; setAct(-1); };
  const key = (h: number) => (e: RKE<HTMLDivElement>) => { if (!onDrag) return; if (e.key === "ArrowUp") { onDrag(h, -1, true); e.preventDefault(); } if (e.key === "ArrowDown") { onDrag(h, 1, true); e.preventDefault(); } };
  return (
    <div className="stack" style={{ height }} onPointerMove={mv} onPointerUp={up} onPointerCancel={up}>
      {layers.map((ly, i) => (
        <div key={ly.key} className={"layer" + (hs[i] < 26 ? " thin" : "")} style={{ top: tops[i], height: hs[i], background: ly.dashed ? "repeating-linear-gradient(45deg, var(--panel3), var(--panel3) 6px, var(--panel2) 6px, var(--panel2) 12px)" : ly.color, color: ly.dashed ? "var(--text2)" : "#fff", borderTop: i ? "1px solid rgba(0,0,0,.25)" : 0 }}>
          {hs[i] >= 14 && <><span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ly.label}</span><span className="lm">{ly.note}</span></>}
        </div>
      ))}
      {broken && <div className="stack-break" aria-hidden="true">{"\u2248 top floor drawn shorter (not to scale)"}</div>}
      {onDrag && [0, 1, 2].map((h) => (
        <div key={h} className={"handle" + (act === h ? " drag" : "")} style={{ top: tops[h + 1] }} onPointerDown={down(h)} onKeyDown={key(h)} tabIndex={0} role="slider" aria-label={`Boundary between ${layers[h].label} and ${layers[h + 1].label}. Use arrow keys.`} aria-valuenow={layers[h].pct}><i /></div>
      ))}
      {floods.map((f) => {
        const fy = yFor(f.pct);
        return <div key={f.label} className={"flood" + (f.solid ? " solid" : "")} style={{ top: fy }}><span>{f.label}</span></div>;
      })}
    </div>
  );
}

// ---------- oversubscription gauge ----------
export function Gauge({ v, label, max = 4 }: { v: number; label: string; max?: number }) {
  const cx = 80, cy = 78, R = 62;
  const ang = (x: number) => Math.PI * (1 - Math.min(max, Math.max(0, x)) / max);
  const pt = (x: number, rr: number) => [cx + rr * Math.cos(ang(x)), cy - rr * Math.sin(ang(x))];
  const arc = (a: number, b2: number, col: string) => {
    const [x1, y1] = pt(a, R), [x2, y2] = pt(b2, R);
    return <path d={`M${x1},${y1} A${R},${R} 0 0 1 ${x2},${y2}`} fill="none" style={{ stroke: col }} strokeWidth={11} />;
  };
  const deg = (Math.min(max, Math.max(0, v)) / max) * 180 - 90;
  const tone = v < 1 ? "down" : v > 2.5 ? "amber" : "up";
  return (
    <div className="gauge">
      <svg viewBox="0 0 160 96" role="img" aria-label={`${label}: ${v.toFixed(2)} times covered`}>
        {arc(0, 1, "var(--down)")}{arc(1, 2.5, "var(--up)")}{arc(2.5, max, "var(--warn)")}
        <g style={{ transform: `rotate(${deg}deg)`, transformOrigin: `${cx}px ${cy}px`, transition: "transform .6s cubic-bezier(.2,.9,.3,1.15)" }}>
          <line x1={cx} y1={cy} x2={cx} y2={cy - R + 6} style={{ stroke: "var(--text)" }} strokeWidth={3} strokeLinecap="round" />
        </g>
        <circle cx={cx} cy={cy} r={5} style={{ fill: "var(--text)" }} />
      </svg>
      <div className={"num " + tone} style={{ fontSize: 18, fontWeight: 700, marginTop: -4 }}>{v.toFixed(2)}x</div>
      <div className="gl">{label}</div>
    </div>
  );
}

// ---------- outstanding balances with playhead ----------
export function BalanceChart({ series, months, at, onSeek }: { series: number[][]; months: number; at: number; onSeek: (m: number) => void }) {
  const W = 760, H = 200, l = 44, r = 10, tp = 10, b = 22;
  const tot = series[0].map((_, i) => series.reduce((s, x) => s + x[i], 0));
  const mx = Math.max(...tot, 1);
  const X = (i: number) => l + (i / Math.max(1, months - 1)) * (W - l - r);
  const Y = (v: number) => tp + (1 - v / mx) * (H - tp - b);
  const ref = useRef<SVGSVGElement>(null);
  const seek = (e: RPE<SVGSVGElement>) => {
    if (e.type === "pointermove" && e.buttons !== 1) return;
    const rc = ref.current?.getBoundingClientRect(); if (!rc) return;
    const x = ((e.clientX - rc.left) / rc.width) * W;
    onSeek(Math.max(1, Math.min(months, Math.round(((x - l) / (W - l - r)) * (months - 1)) + 1)));
  };
  const areas = [2, 1, 0].map((k) => {
    const lower = series[0].map((_, i) => series.slice(k + 1).reduce((s, x) => s + x[i], 0));
    const upper = lower.map((v, i) => v + series[k][i]);
    const pts = upper.map((v, i) => `${X(i)},${Y(v)}`).join(" ") + " " + lower.map((v, i) => `${X(i)},${Y(v)}`).reverse().join(" ");
    return <polygon key={k} points={pts} style={{ fill: TC[k], opacity: 0.8 }} />;
  });
  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Outstanding balance by tranche" onPointerDown={seek} onPointerMove={seek} style={{ cursor: "pointer", touchAction: "none" }}>
      {[0, 0.5, 1].map((f) => <g key={f}><line x1={l} x2={W - r} y1={Y(mx * f)} y2={Y(mx * f)} style={{ stroke: "var(--border)" }} /><text x={l - 6} y={Y(mx * f) + 4} textAnchor="end" fontSize={10.5} className="mono" style={{ fill: "var(--text3)" }}>{"$" + (mx * f / 1e6).toFixed(0) + "M"}</text></g>)}
      {areas}
      <line x1={X(at - 1)} x2={X(at - 1)} y1={tp - 4} y2={H - b} style={{ stroke: "var(--amber)" }} strokeWidth={2} />
      <circle cx={X(at - 1)} cy={tp - 4} r={4} style={{ fill: "var(--amber)" }} />
      <text x={l} y={H - 5} fontSize={10.5} style={{ fill: "var(--text3)" }}>Month 1</text>
      <text x={W - r} y={H - 5} textAnchor="end" fontSize={10.5} style={{ fill: "var(--text3)" }}>{"Month " + months}</text>
    </svg>
  );
}

// ---------- money-flow diagram (clickable nodes) ----------
export type OwnTone = "loan" | "bond" | "cash" | "fee" | "sold";
export const OWN_COLOR: Record<OwnTone, string> = { loan: "var(--up)", bond: "var(--accent)", cash: "var(--amber)", fee: "var(--text3)", sold: "var(--text3)" };
type DNode = { id: string; label: string; detail?: string; kind?: "box" | "key" | "person"; tags?: { t: string; tone: OwnTone }[]; ring?: OwnTone };
type DEdge = { from: string; to: string; label?: string; dashed?: boolean; hot?: boolean };
// Split a long name over two lines at a word boundary so it never spills out of its box.
const wrap2 = (t: string, max = 25): string[] => {
  if (t.length <= max) return [t];
  const w = t.split(" "); let a = "";
  while (w.length && (a + " " + w[0]).trim().length <= max) a = (a + " " + w.shift()).trim();
  if (!a) a = w.shift() ?? "";
  const b = w.join(" ");
  return [a, b.length > max + 3 ? b.slice(0, max + 1) + "\u2026" : b];
};
export function FlowDiagram({ nodes, edges, sel, onPick }: { nodes: DNode[]; edges: DEdge[]; sel?: string; onPick?: (id: string) => void }) {
  const solid = edges.filter((e) => !e.dashed);
  const fwd: DEdge[] = [];
  const state: Record<string, number> = {};
  const visit = (id: string) => {
    state[id] = 1;
    for (const e of solid.filter((x) => x.from === id)) { if (state[e.to] === 1) continue; fwd.push(e); if (!state[e.to]) visit(e.to); }
    state[id] = 2;
  };
  nodes.filter((n) => !solid.some((e) => e.to === n.id)).forEach((n) => { if (!state[n.id]) visit(n.id); });
  nodes.forEach((n) => { if (!state[n.id]) visit(n.id); });
  const rank: Record<string, number> = {};
  nodes.forEach((n) => (rank[n.id] = 0));
  for (let it = 0; it < nodes.length; it++) fwd.forEach((e) => { if (rank[e.to] < rank[e.from] + 1) rank[e.to] = rank[e.from] + 1; });
  nodes.forEach((n) => {
    if (solid.some((e) => e.from === n.id || e.to === n.id)) return;
    const o = edges.filter((e) => e.from === n.id);
    if (o.length) rank[n.id] = Math.max(0, Math.min(...o.map((e) => rank[e.to])) - 1);
  });
  const maxR = Math.max(...Object.values(rank));
  const layers: DNode[][] = Array.from({ length: maxR + 1 }, () => []);
  nodes.forEach((n) => layers[rank[n.id]].push(n));
  const NW = 200, NH = 64, GX = 80, GY = 72;
  const maxL = Math.max(...layers.map((L) => L.length));
  const pos: Record<string, { x: number; y: number }> = {};
  layers.forEach((L, r) => L.forEach((n, i) => { const off = (maxL - L.length) / 2; pos[n.id] = { x: 250 + (i + off) * (NW + GX), y: 16 + r * (NH + GY) }; }));
  const W = 270 + maxL * NW + (maxL - 1) * GX, H = 32 + (maxR + 1) * NH + maxR * GY;
  const mid = (id: string) => ({ x: pos[id].x + NW / 2, y: pos[id].y + NH / 2 });
  const port = (id: string, toward: { x: number; y: number }) => {
    const c = mid(id), dx = toward.x - c.x, dy = toward.y - c.y;
    const s = Math.max(Math.abs(dx) / (NW / 2), Math.abs(dy) / (NH / 2)) || 1;
    return { x: c.x + dx / s, y: c.y + dy / s };
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: Math.min(W, 860), display: "block", margin: "0 auto" }} role="img" aria-label="Who pays whom in the deal">
      <defs><marker id="fl-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style={{ fill: "var(--text3)" }} /></marker></defs>
      {edges.map((e, i) => {
        const twin = edges.some((x) => x.from === e.to && x.to === e.from);
        const span = Math.abs(rank[e.to] - rank[e.from]);
        const st = { stroke: e.hot ? "var(--amber)" : e.dashed ? "var(--text3)" : "var(--accent)", strokeWidth: e.hot ? 2.6 : e.dashed ? 1.2 : 1.6, fill: "none", opacity: e.hot ? 1 : e.dashed ? 0.9 : 0.75 };
        const cls = e.dashed ? "" : "flow-line";
        const lbl = (x: number, y: number, anchor: "middle" | "end") => e.label ? (
          <g>
            <rect x={anchor === "middle" ? x - e.label.length * 3.3 - 4 : x - e.label.length * 6.6 - 6} y={y - 9} width={e.label.length * 6.6 + 8} height={16} rx={4} style={{ fill: "var(--panel)" }} />
            <text x={anchor === "middle" ? x : x - 2} y={y + 3} textAnchor={anchor} fontSize={11} style={{ fill: "var(--text2)" }}>{e.label}</text>
          </g>
        ) : null;
        if (span >= 2) {
          const p1 = pos[e.from], p2 = pos[e.to];
          const ax = p1.x, ay = p1.y + NH / 2 + (e.dashed ? 8 : -8), bx = p2.x, by = p2.y + NH / 2 + (e.dashed ? 8 : -8);
          const cx = Math.min(ax, bx) - (e.dashed ? 110 : 60);
          return <g key={i}><path className={cls} d={`M${ax},${ay} C${cx},${ay} ${cx},${by} ${bx - 2},${by}`} style={st} strokeDasharray={e.dashed ? "5 4" : undefined} markerEnd="url(#fl-arrow)" />{lbl(Math.min(ax, bx) - 0.75 * 110 - 6, (ay + by) / 2 + (e.dashed ? 10 : -10), "end")}</g>;
        }
        const off = twin ? 8 : 0;
        const a0 = port(e.from, mid(e.to)), b0 = port(e.to, mid(e.from));
        const dx = b0.x - a0.x, dy = b0.y - a0.y, len = Math.hypot(dx, dy) || 1;
        const a = { x: a0.x - (dy / len) * off, y: a0.y + (dx / len) * off }, b2 = { x: b0.x - (dy / len) * off, y: b0.y + (dx / len) * off };
        return <g key={i}><line className={cls} x1={a.x} y1={a.y} x2={b2.x} y2={b2.y} style={st} strokeDasharray={e.dashed ? "5 4" : undefined} markerEnd="url(#fl-arrow)" />{lbl((a.x + b2.x) / 2, (a.y + b2.y) / 2, "middle")}</g>;
      })}
      {nodes.map((n) => {
        const p = pos[n.id], person = n.kind === "person", key = n.kind === "key", on = sel === n.id;
        return (
          <g key={n.id} onClick={() => onPick?.(n.id)} style={{ cursor: onPick ? "pointer" : "default" }} tabIndex={onPick ? 0 : undefined} role={onPick ? "button" : undefined} aria-label={`${n.label}, ${n.detail ?? ""}`} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onPick?.(n.id); }}>
            {n.ring && <rect x={p.x - 5} y={p.y - 5} width={NW + 10} height={NH + 10} rx={(person ? NH / 2 : 10) + 5} style={{ fill: "none", stroke: OWN_COLOR[n.ring], opacity: 0.55 }} strokeWidth={2} strokeDasharray="4 3" />}
            <rect x={p.x} y={p.y} width={NW} height={NH} rx={person ? NH / 2 : 10} style={{ fill: key ? "var(--accent-bg)" : "var(--panel2)", stroke: on ? "var(--amber)" : n.ring ? OWN_COLOR[n.ring] : person || key ? "var(--accent)" : "var(--border2)", transition: "stroke .2s" }} strokeWidth={on || n.ring ? 2.6 : key ? 2.2 : 1.2} />
            {(() => { const L = wrap2(n.label); const y0 = p.y + (L.length > 1 ? (n.detail ? 24 : 30) : n.detail ? 31 : 38); return <>{L.map((t, k) => <text key={k} x={p.x + NW / 2} y={y0 + k * 14} textAnchor="middle" fontSize={12.5} fontWeight={650} style={{ fill: "var(--text)" }}>{t}</text>)}{n.detail && <text x={p.x + NW / 2} y={y0 + (L.length - 1) * 14 + 16} textAnchor="middle" fontSize={11} style={{ fill: key ? "var(--accent)" : "var(--text3)" }}>{n.detail}</text>}</>; })()}
            {(() => { let x = p.x + 10; return (n.tags ?? []).map((tg) => { const w = tg.t.length * 6.1 + 12; const el = <g key={tg.t} className="own-tag"><rect x={x} y={p.y - 8} width={w} height={16} rx={8} style={{ fill: tg.tone === "sold" ? "var(--panel2)" : tg.tone === "fee" ? "var(--panel3)" : OWN_COLOR[tg.tone], stroke: tg.tone === "sold" || tg.tone === "fee" ? "var(--text3)" : "none" }} /><text x={x + w / 2} y={p.y + 3.5} textAnchor="middle" fontSize={9.5} fontWeight={700} letterSpacing={0.3} style={{ fill: tg.tone === "sold" || tg.tone === "fee" ? "var(--text)" : "#0b0f14" }}>{tg.t}</text></g>; x += w + 5; return el; }); })()}
          </g>
        );
      })}
    </svg>
  );
}
