// Credit due diligence + monitoring model (mock, deterministic). Every number here is synthetic.
import { rng, gauss, clamp, GR } from "./engine";
import type { AssetDef, RunRes, MonthRow } from "./engine";

export type Band = { label: string; pct: number; flag?: boolean };
export type Strat = { title: string; term?: string; rows: Band[]; stat: string; note?: string };
export type SampleLoan = { id: string; score: number; bal: number; rate: number; m1: string; geo: string; age: number; exc: string | null };
export type Scen = { key: "base" | "stress" | "severe"; label: string; cdr: number; sev: number; cnl: number[]; life: number };
export type TrRev = { size: number; ce: number; beK: number; beCdr: number; beCnl: number; beCapped: boolean; el: number; pl: number; shadow: string; agency: string; notch: number; tone: "ok" | "warn" | "bad"; verdict: string; short: string };
export type Check = { k: string; label: string; detail: string; status: "ok" | "watch" };
export type DD = { strats: Strat[]; sample: SampleLoan[]; sampleExc: number; excRate: number; scen: Scen[]; lo: number[]; hi: number[]; trig: number[]; baseLife: number; sigma: number; tr: TrRev[]; checks: Check[]; unit: string; months: number };
export type Health = "green" | "amber" | "red" | "paid";
export type MonRow = { m: number; actual: number; forecast: number; dq: [number, number, number]; roll: [number, number]; score: number; mig: number; ce: number[]; trig: number; trigCush: number; proj: number; mult: number; health: Health[]; pl: number[]; shadow: string[]; alerts: string[]; dqUp: number };

type Metric = { name: string; term?: string; unit: string; mean: (s: number) => number; sd: number; edges: [number, number, number]; max?: number; maxMsg?: string; dec?: number };
type Cls = { unit: string; metrics: Metric[]; geoT: string; geo: [string, number][]; exc: string[]; seasoning: number; sigmaAdd: number; scoreT: string };
const CONS_GEO: [string, number][] = [["California", 0.16], ["Texas", 0.12], ["Florida", 0.1], ["New York", 0.07], ["All other states", 0.55]];
const CLS: Record<string, Cls> = {
  auto: { unit: "loan", scoreT: "Credit score (FICO-style)", seasoning: 8, sigmaAdd: 0, geoT: "Geography (top states)", geo: CONS_GEO,
    metrics: [{ name: "Loan-to-value, LTV (loan vs. car value)", unit: "%", mean: (s) => 104 - (s - 690) * 0.09, sd: 14, edges: [90, 110, 125], max: 130, maxMsg: "LTV above 130% guideline" },
      { name: "Payment-to-income, PTI (car payment vs. income)", unit: "%", mean: (s) => 11 - (s - 690) * 0.012, sd: 3.5, edges: [8, 12, 15], max: 18, maxMsg: "PTI above 18% guideline" }],
    exc: ["Income not verified", "Title document missing", "Contract rate differs from data tape", "Dealer markup above policy"] },
  mortgage: { unit: "loan", scoreT: "Credit score (FICO-style)", seasoning: 6, sigmaAdd: 0.05, geoT: "Geography (top states)", geo: [["California", 0.22], ["Texas", 0.1], ["Florida", 0.09], ["New York", 0.07], ["All other states", 0.52]],
    metrics: [{ name: "Loan-to-value, LTV (loan vs. home value)", unit: "%", mean: (s) => 76 - (s - 740) * 0.06, sd: 9, edges: [60, 80, 90], max: 97, maxMsg: "LTV above 97% guideline" },
      { name: "Debt-to-income, DTI (all debts vs. income)", unit: "%", mean: (s) => 36 - (s - 740) * 0.04, sd: 6, edges: [30, 38, 43], max: 50, maxMsg: "DTI above 50% guideline" }],
    exc: ["Appraisal older than policy allows", "Income documents incomplete", "Missing title insurance policy", "Occupancy not verified"] },
  cards: { unit: "account", scoreT: "Credit score (FICO-style)", seasoning: 40, sigmaAdd: 0, geoT: "Geography (top states)", geo: CONS_GEO,
    metrics: [{ name: "Credit-line utilization (balance vs. limit)", unit: "%", mean: (s) => 34 - (s - 700) * 0.12, sd: 16, edges: [30, 50, 80], max: 100, maxMsg: "Balance over the credit limit" },
      { name: "Account age (years open)", unit: " yrs", mean: (s) => 6 + (s - 700) * 0.02, sd: 3, edges: [2, 5, 10], dec: 0 }],
    exc: ["Cardholder agreement version missing", "Account flagged for hardship plan", "Charged-off account included", "Address verification missing"] },
  student: { unit: "loan", scoreT: "Credit score (FICO-style)", seasoning: 20, sigmaAdd: 0.1, geoT: "Geography (top states)", geo: CONS_GEO,
    metrics: [{ name: "Debt-to-income, DTI (all debts vs. income)", unit: "%", mean: (s) => 22 - (s - 710) * 0.03, sd: 7, edges: [15, 25, 35], max: 45, maxMsg: "DTI above 45% guideline" },
      { name: "Share still in school or deferment", unit: "%", mean: () => 14, sd: 8, edges: [5, 15, 30], dec: 0 }],
    exc: ["School certification missing", "Co-signer signature missing", "Deferment end date not on tape", "Loan in forbearance not flagged"] },
  equipment: { unit: "lease", scoreT: "Business credit score", seasoning: 10, sigmaAdd: 0.1, geoT: "Industry concentration", geo: [["Agriculture", 0.34], ["Construction", 0.24], ["Transportation", 0.16], ["Forestry", 0.08], ["All other industries", 0.18]],
    metrics: [{ name: "Loan-to-value, LTV (loan vs. equipment value)", unit: "%", mean: (s) => 82 - (s - 710) * 0.06, sd: 10, edges: [70, 85, 100], max: 110, maxMsg: "LTV above 110% guideline" },
      { name: "Years in business", unit: " yrs", mean: (s) => 14 + (s - 710) * 0.05, sd: 7, edges: [3, 10, 20], dec: 0 }],
    exc: ["UCC lien filing missing", "Equipment appraisal out of date", "Guarantor not documented", "Lease end date differs from tape"] },
  music: { unit: "catalog", scoreT: "Catalog strength score", seasoning: 24, sigmaAdd: 0.3, geoT: "Genre concentration", geo: [["Pop", 0.3], ["Hip-hop", 0.22], ["Rock", 0.2], ["Country", 0.12], ["All other genres", 0.16]],
    metrics: [{ name: "Catalog age (years since release)", unit: " yrs", mean: (s) => 9 + (s - 720) * 0.04, sd: 5, edges: [3, 10, 20], dec: 0 },
      { name: "Top-10 songs' share of income", unit: "%", mean: (s) => 38 - (s - 720) * 0.08, sd: 12, edges: [25, 40, 60], max: 75, maxMsg: "Income concentrated in a few songs" }],
    exc: ["Songwriter split sheet missing", "Royalty statement gap (missing quarter)", "Rights reversion date not on tape", "Disputed co-ownership claim"] },
  clo: { unit: "company loan", scoreT: "Company credit strength score", seasoning: 14, sigmaAdd: 0.2, geoT: "Industry concentration", geo: [["Software", 0.14], ["Healthcare", 0.12], ["Business services", 0.11], ["Chemicals", 0.07], ["All other industries", 0.56]],
    metrics: [{ name: "Leverage (debt vs. yearly earnings)", unit: "x", mean: (s) => 5.2 - (s - 670) * 0.012, sd: 1.1, edges: [4, 5.5, 7], max: 8, maxMsg: "Leverage above 8x guideline", dec: 1 },
      { name: "Loan price (market value per 100)", unit: "", mean: (s) => 97 + (s - 670) * 0.03, sd: 2.5, edges: [90, 95, 99], dec: 1 }],
    exc: ["Covenant compliance certificate missing", "Credit agreement amendment not reflected", "Loan below minimum rating test", "Obligor in two industry buckets"] },
};
export const clsFor = (A: AssetDef): Cls => CLS[A.id] ?? CLS.auto;

const PHI = (z: number): number => { const t = 1 / (1 + 0.2316419 * Math.abs(z)); const d = 0.3989423 * Math.exp(-z * z / 2); const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; };
// probability that lifetime loss (lognormal, median `med`) exceeds `be`, and the tranche's expected loss
export function lossStats(med: number, sigma: number, be: number, thick: number): { pl: number; el: number } {
  if (med <= 0) return { pl: 0, el: 0 };
  const pl = 1 - PHI((Math.log(Math.max(1e-9, be)) - Math.log(med)) / sigma);
  let el = 0, wsum = 0;
  for (let k = 0; k <= 160; k++) { const z = -5 + k * (10 / 160); const w = Math.exp(-z * z / 2); const L = med * Math.exp(sigma * z); el += w * clamp(L - be, 0, thick); wsum += w; }
  return { pl: pl * 100, el: thick > 0 ? (el / wsum / thick) * 100 : 0 };
}
export const shadowFor = (pl: number): string => (pl < 0.5 ? "AAA" : pl < 1.5 ? "AA" : pl < 4 ? "A" : pl < 10 ? "BBB" : pl < 25 ? "BB" : "NR");
const gi = (g: string): number => { const i = GR.indexOf(g); return i < 0 ? GR.length : i; };

export type DDIn = { A: AssetDef; poolScore: number; poolApr: number; bins: number[]; n: number; term: number; baseCdr: number; sev: number; cpr: number; gf: number; B: number; ce: number[]; grades: string[]; pcts: number[]; run: (cdr: number, cpr: number, sev: number) => RunRes };

const cum = (rr: RunRes, B: number): number[] => { let s = 0; return rr.months.map((m: MonthRow) => { s += m.loss; return (s / B) * 100; }); };

export function runDD(x: DDIn): DD {
  const { A, B } = x; const C = clsFor(A);
  const r = rng(7001 + x.n * 3 + Math.round(x.poolScore * 10) + Math.round(x.poolApr * 1e4));
  // ---- synthetic loan tape (capped for speed) ----
  const N = Math.min(x.n, 1500);
  const loans: { s: number; b: number; a: number; m: number[]; g: number; age: number }[] = [];
  const gcum: number[] = []; C.geo.reduce((acc, g, i) => { gcum[i] = acc + g[1]; return gcum[i]; }, 0);
  for (let i = 0; i < N; i++) {
    const s = clamp(Math.round(x.poolScore + gauss(r) * 45), 500, 849);
    const b = Math.exp(gauss(r) * 0.35);
    const a = Math.max(1, x.poolApr * 100 + (x.poolScore - s) * 0.03 + gauss(r) * 0.6);
    const m = C.metrics.map((mt) => Math.max(0, mt.mean(s) + gauss(r) * mt.sd));
    const u = r(); let g = gcum.findIndex((c) => u < c); if (g < 0) g = C.geo.length - 1;
    const age = Math.max(0, Math.round(C.seasoning * Math.exp(gauss(r) * 0.6)));
    loans.push({ s, b, a, m, g, age });
  }
  const wt = loans.reduce((acc, l) => acc + l.b, 0);
  const share = (f: (l: (typeof loans)[number]) => boolean): number => (loans.filter(f).reduce((acc, l) => acc + l.b, 0) / wt) * 100;
  const fmtE = (v: number, mt: Metric) => v.toFixed(mt.dec ?? 0) + mt.unit;
  const strats: Strat[] = [];
  const sb = [0, 620, 660, 720, 760, 900];
  strats.push({ title: C.scoreT, term: A.scoreTerm ? "fico" : undefined, rows: ["Under 620", "620 to 659", "660 to 719", "720 to 759", "760 and up"].map((label, i) => ({ label, pct: share((l) => l.s >= sb[i] && l.s < sb[i + 1]), flag: i === 0 && share((l) => l.s < 620) > 20 })), stat: `Weighted average ${Math.round(x.poolScore)}` });
  C.metrics.forEach((mt, k) => {
    const e = mt.edges;
    const rows = [`Under ${fmtE(e[0], mt)}`, `${fmtE(e[0], mt)} to ${fmtE(e[1], mt)}`, `${fmtE(e[1], mt)} to ${fmtE(e[2], mt)}`, `Over ${fmtE(e[2], mt)}`].map((label, i) => ({ label, pct: share((l) => (i === 0 || l.m[k] >= e[i - 1]) && (i === 3 || l.m[k] < e[i])), flag: i === 3 && mt.max !== undefined }));
    const avg = loans.reduce((acc, l) => acc + l.m[k] * l.b, 0) / wt;
    strats.push({ title: mt.name, rows, stat: `Weighted average ${fmtE(avg, { ...mt, dec: mt.dec ?? 0 })}` });
  });
  const ab = [0, 7, 13, 25, 9999];
  strats.push({ title: "Seasoning (months since origination)", term: "seasoning", rows: ["0 to 6 months", "7 to 12 months", "13 to 24 months", "25+ months"].map((label, i) => ({ label, pct: share((l) => l.age >= ab[i] && l.age < ab[i + 1]) })), stat: `Weighted average ${Math.round(loans.reduce((acc, l) => acc + l.age * l.b, 0) / wt)} months` });
  const geoRows: Band[] = C.geo.map((g, i) => ({ label: g[0], pct: share((l) => l.g === i) }));
  const top = Math.max(...geoRows.slice(0, -1).map((g) => g.pct));
  geoRows.forEach((g, i) => { g.flag = i < geoRows.length - 1 && g.pct > 25; });
  strats.push({ title: C.geoT, term: "concentration", rows: geoRows, stat: `Largest single bucket ${top.toFixed(0)}%`, note: top > 25 ? "Above a 25% concentration limit: one region or industry could hurt many loans at once." : "No bucket above a 25% concentration limit." });
  const ap = x.poolApr * 100, rb = [-99, ap - 2, ap, ap + 2, 999];
  strats.push({ title: "Interest rate (what borrowers pay)", rows: [`Under ${(ap - 2).toFixed(1)}%`, `${(ap - 2).toFixed(1)}% to ${ap.toFixed(1)}%`, `${ap.toFixed(1)}% to ${(ap + 2).toFixed(1)}%`, `Over ${(ap + 2).toFixed(1)}%`].map((label, i) => ({ label, pct: share((l) => l.a >= rb[i] && l.a < rb[i + 1]) })), stat: `Weighted average ${ap.toFixed(2)}%` });
  // ---- loan-level sample review (12 files) ----
  const excP = clamp(0.05 + Math.max(0, 700 - x.poolScore) * 0.0012 + 3 / Math.sqrt(x.n), 0.04, 0.4);
  const rs = rng(4242 + x.n + Math.round(x.poolScore));
  const sample: SampleLoan[] = Array.from({ length: 12 }, (_, i) => {
    const l = loans[Math.floor(rs() * loans.length)];
    let exc: string | null = null;
    C.metrics.forEach((mt, k) => { if (!exc && mt.max !== undefined && l.m[k] > mt.max) exc = mt.maxMsg ?? "Outside guideline"; });
    if (!exc && rs() < excP) exc = C.exc[Math.floor(rs() * C.exc.length)];
    return { id: `${A.tk.toUpperCase()}-${(10000 + Math.floor(rs() * 89999)).toString()}`, score: l.s, bal: l.b * A.size, rate: l.a, m1: fmtE(l.m[0], C.metrics[0]), geo: C.geo[l.g][0].replace("All other ", "Other "), age: l.age, exc };
  });
  const sampleExc = sample.filter((s) => s.exc).length;
  const excRate = (excP * 2 + sampleExc / 12) / 3;
  // ---- credit risk forecast ----
  const months = x.term;
  const mk = (key: Scen["key"], label: string, km: number, sAdd: number): Scen => { const cdr = x.baseCdr * km, sev = clamp(x.sev + sAdd * x.gf, 0, 0.98); const c = cum(x.run(cdr, x.cpr, sev), B); return { key, label, cdr, sev, cnl: c, life: c[c.length - 1] ?? 0 }; };
  const scen = [mk("base", "Base case (expected)", 1, 0), mk("stress", "Stress (recession)", 2, 0.1), mk("severe", "Severe (2008-style)", 3.5, 0.2)];
  const lo = cum(x.run(x.baseCdr * 0.7, x.cpr, x.sev), B);
  const hi = cum(x.run(x.baseCdr * (1.4 + excRate), x.cpr, x.sev), B);
  const baseLife = Math.max(1e-4, scen[0].life);
  const trig = scen[0].cnl.map((v, i) => v * 1.8 + 0.3 * Math.min(1, (i + 1) / 12) * x.gf + 0.02);
  const sigma = 0.45 + C.sigmaAdd + excRate * 0.8 + 1.5 / Math.sqrt(x.n);
  // ---- tranche review ----
  const tr: TrRev[] = x.pcts.map((p, i) => {
    const size = (B * p) / 100;
    const lossAt = (k: number) => { const rr = x.run(x.baseCdr * k, x.cpr, x.sev); return { hit: rr.tr[i].loss > size * 1e-4, cnl: (rr.poolLoss / B) * 100 }; };
    const kMax = Math.min(60, 0.95 / Math.max(1e-6, x.baseCdr));
    let lo2 = 0, hi2 = kMax, capped = false;
    if (size <= 0) return { size, ce: x.ce[i], beK: 0, beCdr: 0, beCnl: 0, beCapped: false, el: 0, pl: 0, shadow: "NR", agency: x.grades[i], notch: 0, tone: "ok", verdict: "No bonds in this tranche (size 0%).", short: "Empty" };
    if (!lossAt(hi2).hit) capped = true;
    else for (let it = 0; it < 16; it++) { const mid = (lo2 + hi2) / 2; if (lossAt(mid).hit) hi2 = mid; else lo2 = mid; }
    const beK = hi2, beCnl = lossAt(beK).cnl;
    // probability of loss: how likely losses run beK times the base forecast (lognormal around 1x)
    const { pl, el } = capped ? { pl: 0, el: 0 } : lossStats(1, sigma, beK, beK * (p / Math.max(1, x.ce[i])));
    const shadow = shadowFor(pl), agency = x.grades[i], notch = gi(agency) - gi(shadow);
    const mult = beK;
    const tone: TrRev["tone"] = shadow === "NR" || notch <= -2 ? "bad" : notch < 0 ? "warn" : "ok";
    const be = capped ? `more than ${beCnl.toFixed(1)}%` : `${beCnl.toFixed(1)}%`;
    const head = notch === 0 ? `Agrees with the agency rating (${agency === "NR" ? "not rated" : agency}).` : notch > 0 ? `Stronger than its ${agency === "NR" ? "unrated" : agency} grade: our shadow rating is ${shadow}.` : `The ${agency === "NR" ? "unrated" : agency} grade looks generous: our shadow rating is ${shadow === "NR" ? "below BB" : shadow}.`;
    const tail = notch > 0 ? " That could be good value at this spread." : notch < 0 ? " Ask for more spread or a thicker cushion before buying." : capped ? " Even our harshest test did not reach it." : "";
    const verdict = `${head} The pool would have to lose ${be} of its balance (${capped ? "far more than" : mult.toFixed(1) + " times"} our base forecast) before this tranche loses its first dollar. Chance of any loss: ${pl < 0.01 ? "under 0.01" : pl.toFixed(pl < 1 ? 2 : 1)}%.${tail}`;
    return { size, ce: x.ce[i], beK, beCdr: x.baseCdr * beK * 100, beCnl, beCapped: capped, el, pl, shadow, agency, notch, tone, verdict, short: notch === 0 ? "Fairly graded" : notch > 0 ? "Possible value" : "Grade looks generous" };
  });
  // ---- checklist ----
  const trigCush = ((trig[11] ?? trig[trig.length - 1]) - (scen[0].cnl[11] ?? baseLife)) / (trig[11] ?? 1) * 100;
  const checks: Check[] = [
    { k: "tape", label: "Data tape (loan-level file) checked against loan files", detail: `${sampleExc} of 12 sampled files had exceptions; estimated ${(excRate * 100).toFixed(0)}% of the pool has a paperwork or guideline issue.`, status: sampleExc >= 3 || excRate > 0.15 ? "watch" : "ok" },
    { k: "docs", label: "Document review (offering documents)", detail: `Read the prospectus and the deal's servicing agreement: payment order (waterfall), eligibility rules and triggers are modelled here.`, status: "ok" },
    { k: "servicer", label: `Servicer review: ${A.serv} (the servicer)`, detail: `Collections, staffing and the named backup servicer.${x.poolScore < 650 ? " A riskier pool needs hands-on collections, so this stays on watch." : " Collection history looks steady (mock)."}`, status: x.poolScore < 650 ? "watch" : "ok" },
    { k: "legal", label: "Legal: true sale and bankruptcy-remoteness", detail: `Legal opinions say the ${A.thing} were truly sold to ${A.trust} (the special purpose vehicle) and would stay out of ${A.short}'s bankruptcy.`, status: "ok" },
    { k: "triggers", label: "Triggers (tripwires) and their cushion", detail: `Cumulative net loss trigger at month 12: ${(trig[11] ?? 0).toFixed(2)}% of the pool; the base forecast sits ${trigCush.toFixed(0)}% below it.${A.rev ? " For card deals the real tripwire is excess spread; it is shown as a loss trigger here to keep it simple." : ""}`, status: trigCush < 30 ? "watch" : "ok" },
    { k: "conc", label: "Concentrations (region or industry)", detail: `Largest bucket ${top.toFixed(0)}% (${C.geoT.toLowerCase()}).`, status: top > 25 ? "watch" : "ok" },
    { k: "ratings", label: "Shadow ratings vs. agency ratings", detail: tr.some((t) => t.notch < 0) ? "At least one tranche looks more generously graded than our own analysis." : "Our shadow ratings match or beat the agencies' grades.", status: tr.some((t) => t.notch < 0) ? "watch" : "ok" },
  ];
  return { strats, sample, sampleExc, excRate, scen, lo, hi, trig, baseLife, sigma, tr, checks, unit: C.unit, months };
}

// ---------- monthly monitoring ----------
export type MonCtx = { dd: DD; m: number; unemp: number; sevAdd: number; bk: boolean; bkNew?: boolean; months: MonthRow[]; B: number; poolScore: number; sev: number; uSens: number; pcts: number[]; hardCe: number[]; seed: number; term: number; baseCdr: number };
// projK = projected losses as a multiple of the base forecast; beK = the multiple a tranche can survive
const healthOf = (projK: number, beK: number, capped: boolean, paid: boolean): Health => (paid ? "paid" : capped ? "green" : projK / beK < 0.45 ? "green" : projK / beK < 0.75 ? "amber" : "red");
export function monStart(c: MonCtx): MonRow {
  const dq30 = clamp(c.baseCdr * 100 * 0.9, 0.2, 12);
  const health = c.dd.tr.map((t) => (t.size <= 0 ? "paid" : healthOf(1, t.beK, t.beCapped, false)) as Health);
  return { m: 0, actual: 0, forecast: 0, dq: [dq30, dq30 * 0.3, dq30 * 0.12], roll: [0.3, 0.5], score: c.poolScore, mig: 2, ce: c.hardCe.slice(), trig: c.dd.trig[0] ?? 0, trigCush: 100, proj: c.dd.baseLife, mult: 1, health, pl: c.dd.tr.map((t) => t.pl), shadow: c.dd.tr.map((t) => t.shadow), alerts: [], dqUp: 0 };
}
export function monStep(prev: MonRow, c: MonCtx): MonRow {
  const r = rng(c.seed + c.m * 977);
  const dd = c.dd, m = c.m;
  const econ = Math.max(0.35, 1 + (c.unemp - 4) * c.uSens * 1.5) * (1 + (0.6 * c.sevAdd) / Math.max(0.05, c.sev)) * (c.bk ? 1.05 : 1);
  const raw = Math.min(2.5, econ * (0.85 + 0.3 * r()) * (1 + (dd.excRate - 0.08)));
  const mult = prev.mult * 0.6 + raw * 0.4;
  // past the final month the pool has paid off: no new losses or late payments
  const row = m <= c.months.length ? c.months[m - 1] : undefined;
  const live = !!row && row.poolBal > 1;
  const loss = row ? row.loss * raw : 0;
  const actual = prev.actual + (loss / c.B) * 100;
  const forecast = dd.scen[0].cnl[Math.min(m, dd.scen[0].cnl.length) - 1] ?? prev.forecast;
  const roll: [number, number] = [clamp(0.28 * Math.pow(mult, 0.6), 0.05, 0.8), clamp(0.5 * Math.pow(mult, 0.5), 0.1, 0.9)];
  const dq30 = prev.dq[0] * 0.6 + (live ? clamp(c.baseCdr * 100 * 0.9, 0.2, 12) * Math.pow(mult, 0.8) : 0) * 0.4;
  const dq: [number, number, number] = [dq30, prev.dq[0] * roll[0], prev.dq[1] * roll[1] + prev.dq[2] * 0.45];
  const score = prev.score + 0.15 - (c.unemp - 4) * 0.9 - (c.sevAdd > 0.05 ? 0.3 : 0) + (r() - 0.5) * 1.2;
  const mig = clamp(2 + (c.poolScore - score) * 0.6 + (c.unemp - 4) * 1.5, 0.5, 40);
  const extra = ((actual - forecast) / 100) * c.B;
  const ce = c.pcts.map((_, i) => {
    if (!row) return prev.ce[i];
    const pb = Math.max(1, row.poolBal - extra);
    const above = row.bal.slice(0, i + 1).reduce((s, v) => s + v, 0);
    return row.bal[i] <= 1 ? prev.ce[i] : Math.min(100, ((pb + row.reserve - above) / pb) * 100);
  });
  const trig = dd.trig[Math.min(m, dd.trig.length) - 1] ?? prev.trig;
  const trigCush = ((trig - actual) / Math.max(1e-6, trig)) * 100;
  const proj = actual + Math.max(0, dd.baseLife - forecast) * mult;
  const rem = Math.sqrt(Math.max(0.15, 1 - m / c.term));
  const pl: number[] = [], shadow: string[] = [];
  const health: Health[] = dd.tr.map((t, i) => {
    const paid = t.size <= 0 || (row ? row.bal[i] <= 1 : false);
    const st = paid || t.beCapped ? { pl: 0 } : lossStats(proj / dd.baseLife, dd.sigma * rem, t.beK, 1);
    pl.push(st.pl); shadow.push(paid ? "Paid" : shadowFor(st.pl));
    const h = healthOf(proj / dd.baseLife, t.beK, t.beCapped, paid);
    if (paid) return h;
    // cushion erosion overrides: no cushion left = red; half the closing cushion gone = at least amber
    if (ce[i] <= 0.05) return "red";
    if (ce[i] < c.hardCe[i] * 0.5 && h === "green") return "amber";
    return h;
  });
  const alerts: string[] = [];
  if (mig - prev.mig > 1.2 && mig > 5) alerts.push(`Refreshed credit scores slipping: ${mig.toFixed(1)}% of borrowers are now 40+ points below their score at closing.`);
  const ratio = forecast > 0 ? actual / forecast : 1, pratio = prev.forecast > 0 ? prev.actual / prev.forecast : 1;
  if (m >= 3 && ratio > 1.25 && pratio <= 1.25) alerts.push(`Losses now running ${ratio.toFixed(2)}x the forecast.`);
  // serious delinquencies: alert once when they have risen three months in a row
  const dqUp = dq[1] + dq[2] > (prev.dq[1] + prev.dq[2]) * 1.03 ? prev.dqUp + 1 : 0;
  if (dqUp === 3) alerts.push(`Serious delinquencies (60+ days late) up three months in a row: ${(dq[1] + dq[2]).toFixed(2)}% of the pool.`);
  if (trigCush < 0 && prev.trigCush >= 0) alerts.push("Trigger breached: cash is now diverted to pay down the senior tranche faster.");
  else if (trigCush < 25 && prev.trigCush >= 25) alerts.push(`Trigger cushion thin: losses are within ${trigCush.toFixed(0)}% of the tripwire.`);
  health.forEach((h, i) => { if (h !== prev.health[i] && h !== "paid" && (h === "red" || (h === "amber" && prev.health[i] === "green"))) alerts.push(`Tranche ${["senior", "mezzanine", "junior"][i]} moved to ${h.toUpperCase()}.`); });
  if (c.bkNew) alerts.push("Backup servicer now collecting: watch for a dip in collections.");
  return { m, actual, forecast, dq, roll, score, mig, ce, trig, trigCush, proj, mult, health, pl, shadow, alerts, dqUp };
}
export const HEALTH_PREM: Record<Health, number[]> = { green: [0, 0, 0], paid: [0, 0, 0], amber: [4, 15, 45], red: [15, 50, 150] };
