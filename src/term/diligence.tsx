// Credit due diligence (the home inspection) + monitoring views for Deal Lab. All figures are mock.
import type { ReactNode } from "react";
import { Term, Panel, Metric, Tag, Tbl, Rating } from "./ui";
import { fm, pc, gname } from "./engine";
import type { AssetDef } from "./engine";
import type { DD, MonRow, Health, Strat } from "./ddmodel";

const TC = ["var(--t0)", "var(--t1)", "var(--t2)"];
const FL = ["Senior tranche (top floor)", "Mezzanine tranche (middle floor)", "Junior tranche (bottom floor)"];
const FLS = ["Senior", "Mezzanine", "Junior"];
export const HEALTH_LABEL: Record<Health, string> = { green: "Green", amber: "Amber", red: "Red", paid: "Paid off" };
const HC: Record<Health, string> = { green: "var(--up)", amber: "var(--amber)", red: "var(--down)", paid: "var(--text3)" };
const htone = (h: Health): "ok" | "warn" | "bad" | "n" => (h === "green" ? "ok" : h === "amber" ? "warn" : h === "red" ? "bad" : "n");
const p2 = (x: number) => (x < 0.01 ? "<0.01%" : pc(x, x < 1 ? 2 : 1));
export const RISK_SRC = "refreshed credit data as a risk analytics provider would supply it (built from depersonalized credit-bureau data; mock)";

// ---------- cumulative net loss chart ----------
export function CnlChart({ dd, actual, at }: { dd: DD; actual?: number[]; at?: number }) {
  const W = 460, H = 230, L = 46, R = 10, T = 10, Bm = 28;
  const n = dd.months;
  const maxY = Math.max(0.5, dd.scen[2].life, ...dd.scen.map((s) => Math.max(...s.cnl)), ...dd.hi, ...(actual ?? [0])) * 1.08;
  const x = (m: number) => L + (m / n) * (W - L - R), y = (v: number) => T + (1 - v / maxY) * (H - T - Bm);
  const path = (arr: number[]) => "M" + x(0) + "," + y(0) + " " + arr.map((v, i) => `L${x(i + 1).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const band = "M" + x(0) + "," + y(0) + " " + dd.hi.map((v, i) => `L${x(i + 1).toFixed(1)},${y(v).toFixed(1)}`).join(" ") + " " + dd.lo.map((v, i) => [i, v] as const).reverse().map(([i, v]) => `L${x(i + 1).toFixed(1)},${y(v).toFixed(1)}`).join(" ") + " Z";
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxY);
  const xt = [0, Math.round(n / 4), Math.round(n / 2), Math.round((3 * n) / 4), n];
  return (
    <div className="cnl-chart">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Cumulative net loss forecast chart">
        {ticks.map((t) => <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="grid-l" /><text x={L - 6} y={y(t) + 4} textAnchor="end" className="ax">{t.toFixed(t < 2 ? 1 : 0)}%</text></g>)}
        {xt.map((m, k) => <text key={m} x={x(m)} y={H - 8} textAnchor={k === 0 ? "start" : k === xt.length - 1 ? "end" : "middle"} className="ax">{m === 0 ? "M0" : `M${m}`}</text>)}
        <path d={band} style={{ fill: "var(--accent)", opacity: 0.13 }} />
        <path d={path(dd.trig)} fill="none" style={{ stroke: "var(--text3)", strokeDasharray: "5 4", strokeWidth: 1.4 }} />
        <path d={path(dd.scen[2].cnl)} fill="none" style={{ stroke: "var(--down)", strokeWidth: 1.8 }} />
        <path d={path(dd.scen[1].cnl)} fill="none" style={{ stroke: "var(--amber)", strokeWidth: 1.8 }} />
        <path d={path(dd.scen[0].cnl)} fill="none" style={{ stroke: "var(--accent)", strokeWidth: 2.4 }} />
        {actual && actual.length > 1 && <path d={"M" + x(0) + "," + y(0) + " " + actual.slice(1).map((v, i) => `L${x(i + 1).toFixed(1)},${y(v).toFixed(1)}`).join(" ")} fill="none" style={{ stroke: "var(--text)", strokeWidth: 3.2 }} />}
        {at !== undefined && at > 0 && <line x1={x(at)} x2={x(at)} y1={T} y2={H - Bm} style={{ stroke: "var(--text3)", strokeWidth: 1 }} />}
      </svg>
      <div className="legend">
        <span><span className="sw" style={{ background: "var(--accent)" }} />Base case</span>
        <span><span className="sw" style={{ background: "var(--accent)", opacity: 0.35 }} />Confidence band</span>
        <span><span className="sw" style={{ background: "var(--amber)" }} />Stress</span>
        <span><span className="sw" style={{ background: "var(--down)" }} />Severe</span>
        <span><span className="sw sw-dash" />Loss trigger (tripwire)</span>
        {actual && <span><span className="sw" style={{ background: "var(--text)" }} />Actual (monitoring)</span>}
      </div>
    </div>
  );
}

function StratCard({ s }: { s: Strat }) {
  const mx = Math.max(1, ...s.rows.map((r) => r.pct));
  return (
    <div className="strat">
      <div className="strat-h"><span className="strat-t">{s.term ? <Term k={s.term}>{s.title}</Term> : s.title}</span><span className="dim num">{s.stat}</span></div>
      {s.rows.map((r) => (
        <div key={r.label} className="strat-row">
          <span className="sl">{r.label}</span>
          <span className="st"><i style={{ width: `${(r.pct / mx) * 100}%`, background: r.flag && r.pct > 0.5 ? "var(--amber)" : "var(--accent)" }} /></span>
          <span className="sv num">{r.pct.toFixed(1)}%</span>
        </div>
      ))}
      {s.note && <div className="dim strat-n">{s.note}</div>}
    </div>
  );
}

export function HealthTimeline({ mon }: { mon: MonRow[] }) {
  const rows = mon.slice(-48);
  return (
    <div className="htl" aria-label="Tranche health history">
      {[0, 1, 2].map((i) => (
        <div key={i} className="htl-row">
          <span className="htl-n"><span className="sw" style={{ background: TC[i] }} />{FLS[i]}</span>
          <span className="htl-cells">{rows.map((r) => <i key={r.m} title={`Month ${r.m}: ${HEALTH_LABEL[r.health[i]]}`} style={{ background: HC[r.health[i]] }} />)}</span>
        </div>
      ))}
      <div className="htl-ax dim"><span>M{rows[0]?.m ?? 0}</span><span>M{rows[rows.length - 1]?.m ?? 0}</span></div>
    </div>
  );
}

// ---------- monitoring (full) ----------
export function MonitorPanel({ dd, mon, onReport, sizes }: { dd: DD; mon: MonRow[]; onReport: () => void; sizes: number[] }) {
  const cur = mon[mon.length - 1], first = mon[0];
  const alerts = mon.slice().reverse().flatMap((r) => r.alerts.map((a) => ({ m: r.m, a }))).slice(0, 8);
  const last6 = mon.slice(-6);
  return (
    <Panel title={<span>Ongoing monitoring <span className="dim">{"\u00b7"} month {cur.m} {"\u00b7"} mock data</span></span>} tour="monitor" right={<button className="btn sm primary" onClick={onReport}>Open updated tranche review</button>}>
      <div className="metrics" style={{ marginBottom: 12 }}>
        <Metric k={<Term k="cnl">Actual vs. forecast losses</Term>} v={`${pc(cur.actual, 2)} / ${pc(cur.forecast, 2)}`} tone={cur.forecast > 0 && cur.actual > cur.forecast * 1.15 ? "down" : "up"} d={cur.forecast > 0 ? `${(cur.actual / cur.forecast).toFixed(2)}x forecast` : "starts next month"} />
        <Metric k="Projected lifetime loss" v={pc(cur.proj, 2)} d={`base forecast ${pc(dd.baseLife, 2)}`} tone={cur.proj > dd.baseLife * 1.2 ? "down" : undefined} />
        <Metric k={<Term k="roll">30+ days late</Term>} v={pc(cur.dq[0], 1)} d={`60+ ${pc(cur.dq[1], 1)} \u00b7 90+ ${pc(cur.dq[2], 1)}`} />
        <Metric k="Refreshed credit score" v={cur.score.toFixed(0)} tone={cur.score < first.score - 5 ? "down" : undefined} d={`${cur.mig.toFixed(1)}% down 40+ pts`} />
        <Metric k={<Term k="trigger">Trigger cushion</Term>} v={cur.trigCush < 0 ? "Breached" : pc(cur.trigCush, 0)} tone={cur.trigCush < 0 ? "down" : cur.trigCush < 25 ? "amber" : "up"} d={`tripwire at ${pc(cur.trig, 2)} losses`} />
      </div>
      <div className="grid g2">
        <div>
          <div className="mini-h">Actual losses vs. the forecast</div>
          <CnlChart dd={dd} actual={mon.map((r) => r.actual)} at={cur.m} />
        </div>
        <div>
          <div className="mini-h">Tranche health (green / amber / red)</div>
          <div className="health-now">{[0, 1, 2].map((i) => <div key={i} className="hn"><span><span className="sw" style={{ background: TC[i] }} />{FLS[i]}</span><Tag tone={htone(cur.health[i])}>{HEALTH_LABEL[cur.health[i]]}</Tag><span className="dim num">{cur.shadow[i] === "Paid" ? "repaid" : `shadow ${gname(cur.shadow[i])}`}</span></div>)}</div>
          <HealthTimeline mon={mon} />
          <div className="mini-h" style={{ marginTop: 12 }}><Term k="watchlist">Watchlist alerts (early warnings)</Term></div>
          {alerts.length === 0 ? <div className="empty" style={{ padding: 10 }}>No alerts yet. They appear when refreshed scores slip, losses beat the forecast or a cushion thins.</div>
            : <div className="rows alerts">{alerts.map((x, k) => <div key={k} className="rw rw-lead"><div className="ld num">M{x.m}</div><div className="dd">{x.a}</div></div>)}</div>}
        </div>
      </div>
      <div className="grid g2" style={{ marginTop: 12 }}>
        <div>
          <div className="mini-h"><Term k="ce">Credit enhancement</Term> build or erosion</div>
          <Tbl right={[1, 2, 3]} cols={["Tranche (floor)", "At closing", "Now", "Change"]} rows={[0, 1, 2].map((i) => { const d = cur.ce[i] - first.ce[i]; return [<span key={i}><span className="sw" style={{ background: TC[i] }} />{FLS[i]}</span>, pc(first.ce[i]), sizes[i] <= 0 || cur.health[i] === "paid" ? "Paid off" : pc(cur.ce[i]), <span key={"d" + i} className={d >= 0 ? "up" : "down"}>{(d >= 0 ? "+" : "") + d.toFixed(1)} pts</span>]; })} />
        </div>
        <div>
          <div className="mini-h"><Term k="roll">Roll rates</Term>, last {last6.length} months</div>
          <Tbl right={[1, 2, 3, 4]} cols={["Month", "30+ late", "60+ late", "90+ late", "30\u219260 roll"]} rows={last6.map((r) => [`M${r.m}`, pc(r.dq[0], 2), pc(r.dq[1], 2), pc(r.dq[2], 2), pc(r.roll[0] * 100, 0)])} />
        </div>
      </div>
      <div className="p dim" style={{ marginTop: 10 }}>Each month the pool is refreshed with {RISK_SRC}. In Exchange Builder this is the job of the risk analytics and credit data provider (the portfolio report card), published for every listed deal.</div>
    </Panel>
  );
}

// ---------- compact strip for the trading floor ----------
export function MonitorStrip({ mon, dd, onReport, onFull }: { mon: MonRow[]; dd: DD; onReport: () => void; onFull: () => void }) {
  const cur = mon[mon.length - 1];
  const lastAlert = mon.slice().reverse().find((r) => r.alerts.length)?.alerts[0];
  return (
    <Panel title="Credit monitoring (updated tranche review)" tight tour="monitor-strip" right={<span className="num dim">M{cur.m}</span>}>
      <div className="mstrip">
        {[0, 1, 2].map((i) => <span key={i} className="ms-i"><span className="sw" style={{ background: TC[i] }} />{FLS[i]} <Tag tone={htone(cur.health[i])}>{HEALTH_LABEL[cur.health[i]]}</Tag></span>)}
        <span className="ms-i dim num">losses {pc(cur.actual, 2)} vs. forecast {pc(cur.forecast, 2)}</span>
        <span className="ms-i dim num">projected lifetime {pc(cur.proj, 2)} (base {pc(dd.baseLife, 2)})</span>
      </div>
      {lastAlert && <div className="ms-alert"><Tag tone="warn">Watchlist</Tag> <span>{lastAlert}</span></div>}
      <div className="ms-act"><button className="btn sm primary" onClick={onReport}>Open updated tranche review</button><button className="btn sm" onClick={onFull}>Full monitoring (step 6)</button></div>
    </Panel>
  );
}

// ---------- report ----------
export type ReportCtx = { A: AssetDef; dd: DD; mon?: MonRow; sizes: number[]; pcts: number[]; B: number; n: number; score: number; shared: boolean };
export function ReportBody({ r }: { r: ReportCtx }) {
  const { A, dd, mon } = r;
  return (
    <div className="report">
      <div className="rp-top"><div><div className="rp-k">Tranche review report {"\u00b7"} {mon && mon.m > 0 ? `updated at month ${mon.m}` : "baseline at closing"}</div><div className="rp-t">{A.trust}</div><div className="dim">{A.name} {"\u00b7"} {fm(r.B)} pool {"\u00b7"} {r.n.toLocaleString()} {dd.unit}s {"\u00b7"} average score {Math.round(r.score)}</div></div><Tag tone="acc">Mock analysis</Tag></div>
      <Tbl right={[1, 2, 3, 4, 5]} cols={["Tranche (floor)", "Size", "Cushion (CE)", "Breakeven loss", "Prob. of loss", "Expected loss", "Agency", "Shadow"]} rows={dd.tr.map((t, i) => [<span key={i}><span className="sw" style={{ background: TC[i] }} />{FLS[i]}</span>, <span key={"z" + i} className="nowrap">{`${r.pcts[i]}% \u00b7 ${fm(t.size)}`}</span>, pc(mon ? mon.ce[i] : t.ce), t.size <= 0 ? "\u2014" : `${t.beCapped ? ">" : ""}${pc(t.beCnl)} (${t.beCapped ? "max" : t.beK.toFixed(1) + "x"})`, p2(mon ? mon.pl[i] : t.pl), p2(t.el), <Rating key={"a" + i} g={t.agency} />, mon && mon.m > 0 ? <span key={"s" + i}><Rating g={mon.shadow[i] === "Paid" ? "NR" : mon.shadow[i]} /></span> : <Rating key={"s" + i} g={t.shadow} />])} />
      {mon && mon.m > 0 && <div className="rp-mon">{[0, 1, 2].map((i) => <span key={i}><span className="sw" style={{ background: TC[i] }} />{FLS[i]}: <Tag tone={htone(mon.health[i])}>{HEALTH_LABEL[mon.health[i]]}</Tag></span>)}<span className="dim num">Losses {pc(mon.actual, 2)} vs. forecast {pc(mon.forecast, 2)} {"\u00b7"} 60+ days late {pc(mon.dq[1] + mon.dq[2], 2)} {"\u00b7"} trigger cushion {mon.trigCush < 0 ? "breached" : pc(mon.trigCush, 0)}</span></div>}
      {mon && mon.m > 0 && <><div className="rp-sec">Now, at month {mon.m}</div>
        <div className="rows">{dd.tr.map((t, i) => <div key={i} className="rw"><div className="tt"><span className="sw" style={{ background: TC[i] }} />{FL[i]} <Tag tone={htone(mon.health[i])}>{HEALTH_LABEL[mon.health[i]]}</Tag></div><div className="dd">{nowLine(t.beCnl, t.beCapped, t.size, mon, i, dd.baseLife)}</div></div>)}</div></>}
      <div className="rp-sec">{mon && mon.m > 0 ? "Verdicts at closing (baseline)" : "Verdicts in plain English"}</div>
      <div className="rows">{dd.tr.map((t, i) => <div key={i} className="rw"><div className="tt"><span className="sw" style={{ background: TC[i] }} />{FL[i]} {t.size > 0 && <Tag tone={t.tone}>{t.short}</Tag>}</div><div className="dd">{t.verdict}</div></div>)}</div>
      <div className="rp-sec">Credit risk forecast (cumulative net loss over the deal's life)</div>
      <Tbl right={[1, 2, 3]} cols={["Scenario", "Default rate (CDR)", "Severity", "Lifetime loss"]} rows={dd.scen.map((s) => [s.label, `${(s.cdr * 100).toFixed(1)}% / yr`, pc(s.sev * 100, 0), pc(s.life, 2)])} />
      <div className="rp-sec">Due diligence checklist</div>
      <div className="rows">{dd.checks.map((c) => <div key={c.k} className="rw"><div className="tt">{c.status === "ok" ? "\u2713 " : "\u26a0 "}{c.label} <Tag tone={c.status === "ok" ? "ok" : "warn"}>{c.status === "ok" ? "Clear" : "Watch"}</Tag></div><div className="dd">{c.detail}</div></div>)}</div>
      <div className="legal" style={{ marginTop: 12 }}>Teaching tool. Every loan, score, forecast and rating in this report is synthetic. Real company names are used for realism only; no affiliation or endorsement is implied, and this is not investment advice.{r.shared ? " Shared with investors in the book." : ""}</div>
    </div>
  );
}

export function nowLine(be: number, capped: boolean, size: number, mon: MonRow, i: number, base: number): string {
  if (size <= 0) return "No bonds in this tranche.";
  if (mon.health[i] === "paid") return "Fully repaid: investors in this tranche got all their money back.";
  const pace = mon.forecast > 0 ? mon.actual / mon.forecast : 1;
  return `Losses are running ${pace.toFixed(2)}x the forecast, so we now project ${pc(mon.proj, 2)} lifetime losses (base ${pc(base, 2)}) against a breakeven of ${capped ? "more than " : ""}${pc(be, 1)}. Chance of any loss now: ${p2(mon.pl[i])}; shadow rating ${gname(mon.shadow[i])}.${mon.health[i] === "red" ? " Red: losses are close to this tranche's flood line." : mon.health[i] === "amber" ? " Amber: worth watching closely." : ""}`;
}
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export function reportHTML(r: ReportCtx): string {
  const { A, dd, mon } = r;
  const row = (cells: string[]) => `<tr>${cells.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`;
  const head = (cells: string[]) => `<tr>${cells.map((c) => `<th>${esc(c)}</th>`).join("")}</tr>`;
  const tr = dd.tr.map((t, i) => row([FLS[i], `${r.pcts[i]}% (${fm(t.size)})`, pc(mon ? mon.ce[i] : t.ce), t.size <= 0 ? "-" : `${t.beCapped ? ">" : ""}${pc(t.beCnl)}`, p2(mon ? mon.pl[i] : t.pl), p2(t.el), gname(t.agency), mon && mon.m > 0 ? (mon.shadow[i] === "Paid" ? "Paid off" : gname(mon.shadow[i])) : gname(t.shadow), mon && mon.m > 0 ? HEALTH_LABEL[mon.health[i]] : "-"])).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Tranche review report - ${esc(A.trust)}</title><style>
body{font:13px/1.45 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111;max-width:860px;margin:24px auto;padding:0 18px}
h1{font-size:20px;margin:0 0 2px}h2{font-size:14px;margin:18px 0 6px;border-bottom:1px solid #ccc;padding-bottom:3px}
table{width:100%;border-collapse:collapse;font-size:12px}th,td{text-align:left;padding:4px 6px;border-bottom:1px solid #ddd}th{background:#f2f4f7}
.k{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#555}.d{color:#444}.legal{font-size:11px;color:#555;margin-top:16px;border-top:1px solid #ccc;padding-top:8px}
.bar{display:flex;gap:8px;margin:10px 0}@media print{.bar{display:none}body{margin:0}}button{font:inherit;padding:6px 12px}
</style></head><body><div class="bar"><button onclick="window.print()">Print or save as PDF</button></div>
<div class="k">Tranche review report &middot; ${mon && mon.m > 0 ? `updated at month ${mon.m}` : "baseline at closing"} &middot; mock analysis</div>
<h1>${esc(A.trust)}</h1><div class="d">${esc(A.name)} &middot; ${esc(fm(r.B))} pool &middot; ${r.n.toLocaleString()} ${esc(dd.unit)}s &middot; average score ${Math.round(r.score)}</div>
<h2>Tranche summary</h2><table>${head(["Tranche", "Size", "Cushion (CE)", "Breakeven loss", "Prob. of loss", "Expected loss", "Agency", "Shadow", "Health"])}${tr}</table>
${mon && mon.m > 0 ? `<p class="d">Monitoring: losses ${pc(mon.actual, 2)} vs. forecast ${pc(mon.forecast, 2)}; 30/60/90+ days late ${mon.dq.map((d) => d.toFixed(2) + "%").join(" / ")}; refreshed score ${mon.score.toFixed(0)}; trigger cushion ${mon.trigCush < 0 ? "breached" : pc(mon.trigCush, 0)}.</p>` : ""}
${mon && mon.m > 0 ? `<h2>Now, at month ${mon.m}</h2>${dd.tr.map((t, i) => `<p><b>${esc(FL[i])} (${HEALTH_LABEL[mon.health[i]]}):</b> ${esc(nowLine(t.beCnl, t.beCapped, t.size, mon, i, dd.baseLife))}</p>`).join("")}` : ""}
<h2>${mon && mon.m > 0 ? "Verdicts at closing (baseline)" : "Verdicts"}</h2>${dd.tr.map((t, i) => `<p><b>${esc(FL[i])}:</b> ${esc(t.verdict)}</p>`).join("")}
<h2>Credit risk forecast</h2><table>${head(["Scenario", "CDR", "Severity", "Lifetime loss"])}${dd.scen.map((s) => row([s.label, `${(s.cdr * 100).toFixed(1)}% / yr`, pc(s.sev * 100, 0), pc(s.life, 2)])).join("")}</table>
<h2>Due diligence checklist</h2><table>${head(["Item", "Status", "Finding"])}${dd.checks.map((c) => row([c.label, c.status === "ok" ? "Clear" : "Watch", c.detail])).join("")}</table>
<h2>Loan-level sample review</h2><table>${head(["File", "Score", "Balance", "Rate", "Exception"])}${dd.sample.map((s) => row([s.id, String(s.score), fm(s.bal), pc(s.rate, 2), s.exc ?? "None"])).join("")}</table>
<div class="legal">Bond Lab teaching tool. Every loan, score, forecast and rating here is synthetic. Real company names are used for realism only; no affiliation with or endorsement by any company is implied. Not investment advice.</div></body></html>`;
}

// Draws a compact PNG of the report on a canvas (no external libraries).
export function reportPNG(r: ReportCtx): Promise<Blob | null> {
  const { A, dd, mon } = r;
  const W = 1100, pad = 36;
  const cv = document.createElement("canvas");
  const ctx = cv.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  const lines: { t: string; f: string; c: string; gap?: number; cols?: string[]; widths?: number[] }[] = [];
  const add = (t: string, f = "15px sans-serif", c = "#1b2433", gap = 6) => lines.push({ t, f, c, gap });
  add("TRANCHE REVIEW REPORT \u00b7 " + (mon && mon.m > 0 ? `UPDATED AT MONTH ${mon.m}` : "BASELINE AT CLOSING") + " \u00b7 MOCK", "600 13px sans-serif", "#5b6678");
  add(A.trust, "700 26px sans-serif", "#0d1420", 4);
  add(`${A.name} \u00b7 ${fm(r.B)} pool \u00b7 ${r.n.toLocaleString()} ${dd.unit}s \u00b7 average score ${Math.round(r.score)}`, "15px sans-serif", "#3a4556", 16);
  const widths = [170, 150, 120, 150, 120, 120, 90, 110];
  lines.push({ t: "", f: "600 13px sans-serif", c: "#5b6678", cols: ["Tranche", "Size", "Cushion", "Breakeven loss", "Prob. of loss", "Exp. loss", "Agency", "Shadow"], widths, gap: 4 });
  dd.tr.forEach((t, i) => lines.push({ t: "", f: "15px sans-serif", c: "#0d1420", cols: [FLS[i], `${r.pcts[i]}% \u00b7 ${fm(t.size)}`, pc(mon ? mon.ce[i] : t.ce), t.size <= 0 ? "-" : `${t.beCapped ? ">" : ""}${pc(t.beCnl)}`, p2(mon ? mon.pl[i] : t.pl), p2(t.el), gname(t.agency), mon && mon.m > 0 ? (mon.shadow[i] === "Paid" ? "Paid" : gname(mon.shadow[i])) + " \u00b7 " + HEALTH_LABEL[mon.health[i]] : gname(t.shadow)], widths, gap: 4 }));
  add("", "8px sans-serif", "#000", 10);
  add("Verdicts", "700 17px sans-serif", "#0d1420", 6);
  ctx.font = "15px sans-serif";
  const wrap = (s: string, f: string) => { ctx.font = f; const out: string[] = []; let cur = ""; for (const w of s.split(" ")) { const t = cur ? cur + " " + w : w; if (ctx.measureText(t).width > W - pad * 2) { out.push(cur); cur = w; } else cur = t; } if (cur) out.push(cur); return out; };
  dd.tr.forEach((t, i) => { add(FL[i], "600 15px sans-serif", "#0d1420", 2); wrap(t.verdict, "14px sans-serif").forEach((l) => add(l, "14px sans-serif", "#2a3546", 2)); add("", "6px sans-serif", "#000", 6); });
  add("Checklist", "700 17px sans-serif", "#0d1420", 6);
  dd.checks.forEach((c) => add(`${c.status === "ok" ? "\u2713" : "!"} ${c.label}: ${c.status === "ok" ? "clear" : "watch"}`, "14px sans-serif", c.status === "ok" ? "#1d6b3a" : "#8a5a00", 3));
  add("", "6px sans-serif", "#000", 10);
  wrap("Bond Lab teaching tool. Every figure is synthetic. Real company names are used for realism only; no affiliation or endorsement is implied. Not investment advice.", "12px sans-serif").forEach((l) => add(l, "12px sans-serif", "#5b6678", 2));
  const lh = (f: string) => Math.round(Number((/(\d+)px/.exec(f) ?? ["", "15"])[1]) * 1.35);
  const H = pad * 2 + lines.reduce((s, l) => s + lh(l.f) + (l.gap ?? 0), 0);
  cv.width = W; cv.height = H;
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#2f6fed"; ctx.fillRect(0, 0, W, 6);
  let yy = pad;
  for (const l of lines) {
    const h = lh(l.f); yy += h; ctx.font = l.f; ctx.fillStyle = l.c;
    if (l.cols && l.widths) { let xx = pad; l.cols.forEach((c, k) => { ctx.fillText(c, xx, yy); xx += l.widths![k]; }); } else ctx.fillText(l.t, pad, yy);
    yy += l.gap ?? 0;
  }
  return new Promise((res) => cv.toBlob((b) => res(b), "image/png"));
}

// ---------- the stage itself ----------
export type DDStageProps = {
  A: AssetDef; dd: DD; step: number; onRun: () => void; shared: boolean; onShare: () => void; onReport: () => void;
  mon: MonRow[]; started: boolean; pcts: number[]; B: number; n: number; score: number; goTrade: () => void; prem: number[]; premCut: number[];
};
const CHECK_STEPS = ["Pull the data tape (loan-level file)", "Stratify the pool", "Sample loan files for exceptions", "Review documents and the servicer", "Confirm true sale and triggers", "Forecast losses", "Grade each tranche"];
export function DDStage(p: DDStageProps) {
  const { A, dd } = p;
  const done = p.step >= CHECK_STEPS.length;
  const run: ReactNode = (
    <Panel title="Run the due diligence (the home inspection)" tour="dd-run">
      <div className="p">Before investors buy a tranche, their analysts open up the deal like a home inspector: they check the <Term k="datatape">data tape (the loan-level spreadsheet)</Term> against real loan files, slice the pool into a <Term k="stratification">stratification (pool breakdown)</Term>, forecast losses, and work out each tranche&apos;s <Term k="breakeven">breakeven loss (losses before it loses its first dollar)</Term>. Here you run it on your {A.name.toLowerCase()} deal, {A.trust}. Every number is mock.</div>
      <div className="dd-steps">{CHECK_STEPS.map((s, i) => <div key={s} className={"dd-step" + (p.step > i ? " ok" : p.step === i ? " on" : "")}><span className="n">{p.step > i ? "\u2713" : i + 1}</span><span>{s}</span></div>)}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
        <button className="btn primary lg" disabled={p.step >= 0 && !done} onClick={p.onRun}>{done ? "Re-run due diligence" : p.step >= 0 ? "Inspecting\u2026" : "Run due diligence"}</button>
        {done && <button className="btn lg" onClick={p.onReport}>Open the tranche review report</button>}
        {done && <button className={"btn lg" + (p.shared ? "" : " primary")} onClick={p.onShare} disabled={p.shared}>{p.shared ? "\u2713 Shared with investors" : "Share the report with investors"}</button>}
      </div>
    </Panel>
  );
  if (!done) return <>{run}<div className="p dim" style={{ marginTop: 10 }}>The inspection uses your choices so far: the pool from step 3, the tranches from step 4 and the agency grades from step 5.</div></>;
  const cur = p.mon[p.mon.length - 1];
  return (
    <>
      {run}
      <div className="metrics" style={{ margin: "12px 0" }}>
        <Metric k="Pool" v={fm(p.B)} d={`${p.n.toLocaleString()} ${dd.unit}s`} />
        <Metric k={<Term k="cnl">Base lifetime loss</Term>} v={pc(dd.baseLife, 2)} d={`stress ${pc(dd.scen[1].life, 1)} \u00b7 severe ${pc(dd.scen[2].life, 1)}`} />
        <Metric k={<Term k="cdr">Default rate</Term>} v={`${(dd.scen[0].cdr * 100).toFixed(1)}% / yr`} d={`severity ${pc(dd.scen[0].sev * 100, 0)}`} />
        <Metric k="Sample exceptions" v={`${dd.sampleExc} of 12`} tone={dd.sampleExc >= 3 ? "down" : dd.sampleExc >= 1 ? "amber" : "up"} d={`~${(dd.excRate * 100).toFixed(0)}% of the pool (estimate)`} />
        <Metric k="Checklist" v={`${dd.checks.filter((c) => c.status === "ok").length}/${dd.checks.length} clear`} tone={dd.checks.some((c) => c.status === "watch") ? "amber" : "up"} d="items on watch need a closer look" />
      </div>
      <Panel title={<span>Tranche-by-tranche review <span className="dim">{"\u00b7"} shadow rating vs. agency rating</span></span>} tour="dd-tranches">
        <Tbl right={[1, 2, 3, 4, 5]} cols={["Tranche (floor)", "Cushion (CE)", "Breakeven loss", "Breakeven CDR", "Expected loss", "Prob. of loss", "Agency", "Shadow"]} rows={dd.tr.map((t, i) => [<span key={i}><span className="sw" style={{ background: TC[i] }} />{FLS[i]}</span>, pc(t.ce), t.size <= 0 ? "\u2014" : `${t.beCapped ? ">" : ""}${pc(t.beCnl)} \u00b7 ${t.beCapped ? "max" : t.beK.toFixed(1) + "x"}`, t.size <= 0 ? "\u2014" : `${t.beCapped ? ">" : ""}${t.beCdr.toFixed(1)}%`, p2(t.el), p2(t.pl), <Rating key={"a" + i} g={t.agency} />, <Rating key={"s" + i} g={t.shadow} />])} />
        <div className="verdicts">{dd.tr.map((t, i) => <div key={i} className={"verdict v-" + t.tone}><div className="vh"><span className="sw" style={{ background: TC[i] }} />{FLS[i]} {t.size > 0 && <Tag tone={t.tone}>{t.short}</Tag>}</div><div className="vb">{t.verdict}</div></div>)}</div>
        <div className="p dim" style={{ marginTop: 8 }}><Term k="breakevencdr">Breakeven CDR</Term> is the yearly default rate the tranche survives; the multiple (x) compares its breakeven loss with our base forecast. The <Term k="shadowrating">shadow rating (our own grade)</Term> comes from the <Term k="pol">probability of loss</Term>, so it can disagree with {"S&P Global Ratings and Moody's (the rating agencies)"}.</div>
      </Panel>
      <div className="grid g2" style={{ marginTop: 12 }}>
        <Panel title="Credit risk forecast (cumulative net loss)" tour="dd-forecast">
          <CnlChart dd={dd} actual={p.started && p.mon.length > 1 ? p.mon.map((r) => r.actual) : undefined} at={cur?.m} />
          <Tbl right={[1, 2, 3]} cols={["Scenario", "CDR", "Severity", "Lifetime loss"]} rows={dd.scen.map((s) => [s.label, `${(s.cdr * 100).toFixed(1)}%`, pc(s.sev * 100, 0), pc(s.life, 2)])} />
          {A.rev && dd.scen[2].life < dd.scen[1].life && <div className="p dim" style={{ marginTop: 6 }}>In the severe case the early amortization tripwire fires early: the deal stops buying new balances and pays investors back fast, so total losses end lower.</div>}
        </Panel>
        <Panel title="Loan-level sample review (12 files)">
          <Tbl right={[1, 2, 3]} cols={["File", "Score", "Balance", "Rate", "Exception"]} rows={dd.sample.map((s) => [<span key={s.id} className="num nowrap">{s.id}</span>, String(s.score), fm(s.bal), pc(s.rate, 2), s.exc ? <Tag key={"e" + s.id} tone="warn">{s.exc}</Tag> : <span key={"n" + s.id} className="dim">None</span>])} />
        </Panel>
      </div>
      <Panel title={<span><Term k="stratification">Pool stratification</Term> <span className="dim">{"\u00b7"} share of pool balance (mock)</span></span>} style={{ marginTop: 12 }}>
        <div className="strats">{dd.strats.map((s) => <StratCard key={s.title} s={s} />)}</div>
      </Panel>
      <div className="grid g2" style={{ marginTop: 12 }}>
        <Panel title="Due diligence checklist">
          <div className="rows">{dd.checks.map((c) => <div key={c.k} className="rw"><div className="tt">{c.status === "ok" ? "\u2713 " : "\u26a0 "}{c.label} <Tag tone={c.status === "ok" ? "ok" : "warn"}>{c.status === "ok" ? "Clear" : "Watch"}</Tag></div><div className="dd">{c.detail}</div></div>)}</div>
        </Panel>
        <Panel title="Why it matters for pricing">
          <div className="p">Investors charge an uncertainty premium (extra pay for the unknown) when they can&apos;t see inside a deal. Sharing this report lets them price the risk itself instead of the fog (mock effect in step 7):</div>
          <Tbl right={[1, 2]} cols={["Tranche (floor)", "Without report", "With report"]} rows={[0, 1, 2].map((i) => [<span key={i}><span className="sw" style={{ background: TC[i] }} />{FLS[i]}</span>, `+${p.prem[i].toFixed(0)} bps`, `+${(p.prem[i] - p.premCut[i]).toFixed(0)} bps`])} />
          <div className="p dim" style={{ marginTop: 8 }}>After the deal closes, the same review is refreshed every month on the trading floor, so buyers in the secondary market see an updated report card too. In Exchange Builder, a risk analytics provider would publish a standard version of it for every listed deal.</div>
          {!p.started ? <div className="p dim" style={{ marginTop: 6 }}>Monitoring starts when secondary trading opens (step 8).</div> : <button className="btn sm" style={{ marginTop: 8 }} onClick={p.goTrade}>Back to the trading floor</button>}
        </Panel>
      </div>
    </>
  );
}
