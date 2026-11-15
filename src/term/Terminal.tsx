import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import type { ReactNode } from "react";
import {
  G, ASSETS, AW, LEVELS, STAGES, QUIZ, QUIZ_SPV, GEN, INV, FAIR, FL, FLS, BENCH,
  rng, clamp, fm, pc, mo, nr, lr, proName, SPV_ROLE, DISCLAIMER, TRUSTEE, DEALER, RATERS, MM, playersFor, grade, gname, makePool, runDeal, pv,
} from "./engine";
import type { AssetDef, Ev, Opt, RunRes, TrOut, MonthRow, Player, Quiz } from "./engine";
import { Term, Panel, Metric, Slider, Seg, Switch, Rating, Tag, Props, Tbl, QuizBlock, Toasts, useTween } from "./ui";
import type { Toast } from "./ui";
import { useExchange, STAGES_X, SHORT_X } from "./exchange";
import { PriceChart, Histogram, CapitalStack, Gauge, BalanceChart, FlowDiagram, Spark, OWN_COLOR } from "./charts";
import type { OwnTone } from "./charts";
import type { StackLayer } from "./charts";

// ---------- trading state ----------
type Side = "Buy" | "Sell";
type Trade = { id: number; m: number; side: Side; fl: number; size: number; px: number; kind: "Market" | "Limit"; pnl: number };
type Order = { id: number; m: number; side: Side; fl: number; size: number; limit: number };
type News = { m: number; title: string; detail: string; tone?: "good" | "bad" };
type TM = {
  started: boolean; bk: boolean; m: number; bench: number; unemp: number; cprM: number; sevAdd: number;
  mkt: number[]; orig: number[]; hist: { m: number; px: number[] }[]; cash: number; pos: number[]; avg: number[];
  realized: number; income: number; trades: Trade[]; orders: Order[]; news: News[];
};
const EMPTY: TM = { started: false, bk: false, m: 0, bench: BENCH, unemp: 4, cprM: 1, sevAdd: 0, mkt: [0, 0, 0], orig: [0, 0, 0], hist: [], cash: 1e7, pos: [0, 0, 0], avg: [0, 0, 0], realized: 0, income: 0, trades: [], orders: [], news: [] };
const MAX_LONG = 20, MAX_SHORT = -5;
const STAGE_SHORT: [string, string][] = [["Collateral pool", "pick your basket"], ["Market participants", "meet the players"], ["Build the pool", "fill the basket"], ["Tranches", "build the floors"], ["Get rated", "get graded"], ["Price & place", "sell the floors"], ["Secondary trading", "the trading floor"], ["Stress test", "storm test"]];
const STAGE_TERMS: string[][] = [
  ["abs", "pool", "mbs", "clo", "revolving"],
  ["spv", "truesale", "bkremote", "originator", "servicer", "trustee", "underwriter"],
  ["pool", "fico", "cdr", "cpr", "sev", "el"],
  ["tranche", "senior", "mezz", "junior", "ce", "sub", "oc", "reserve", "xs", "residual"],
  ["rating", "stress", "trigger", "stepdown"],
  ["spread", "bps", "benchmark", "coupon", "book", "oversub"],
  ["secondary", "bid", "ask", "price", "mark", "pnl", "dv01", "short"],
  ["stress", "waterfall", "seq", "cdr", "cpr", "sev", "earlyam"],
];
const AWARD_NAME: Record<string, string> = { pool: "Built your first collateral pool", graded: "First credit ratings received" };
const TC = ["var(--t0)", "var(--t1)", "var(--t2)"];
const ls = { get: (k: string): string | null => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } } };
const fmS = (x: number) => (x > 0 ? "+" : "") + fm(x);

export default function Terminal() {
  // ---------- core deal state (same model as the Page) ----------
  const [stage, setStageRaw] = useState(0);
  const [maxSeen, setMaxSeen] = useState(0);
  const [awards, setAwards] = useState<string[]>([]);
  const [quiz, setQuiz] = useState<Record<number, number>>({});
  const [aid, setAid] = useState("auto");
  const [tried, setTried] = useState<string[]>(["auto"]);
  const [guar, setGuar] = useState(false);
  const [sel, setSel] = useState("trust");
  const [seen, setSeen] = useState<string[]>(["trust"]);
  const A0 = ASSETS[0];
  const [nLoans, setN] = useState(A0.n[3]);
  const [score, setScore] = useState(A0.score[3]);
  const [aprIn, setApr] = useState(A0.rate[3]);
  const [term, setTerm] = useState(A0.term[3]);
  const [a, setA] = useState(A0.st[0]);
  const [b, setB] = useState(A0.st[1]);
  const [c, setC] = useState(A0.st[2]);
  const [res, setRes] = useState(A0.st[3]);
  const [spreads, setSpreads] = useState<number[]>(A0.sp.slice());
  const [graded, setGraded] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [closed, setClosed] = useState(false);
  const [mk, setMk] = useState<TM>(EMPTY);
  const [preset, setPreset] = useState("1");
  const [custom, setCustom] = useState<number[]>([5, 10, 55]);
  const [month, setMonth] = useState(1);
  // ---------- terminal UI state ----------
  const [theme, setTheme] = useState<"dark" | "light">(() => (ls.get("bondlab.theme") === "light" ? "light" : "dark"));
  const [sideOpen, setSideOpen] = useState(true);
  const [sideTab, setSideTab] = useState<"coach" | "dict">("coach");
  const [dictQ, setDictQ] = useState("");
  const [dock, setDock] = useState<"blotter" | "orders" | "news">("blotter");
  const [dockOpen, setDockOpen] = useState(true);
  const [mtab, setMtab] = useState<"work" | "coach" | "tape">("work");
  const [help, setHelp] = useState(false);
  const [tour, setTour] = useState<number>(() => (ls.get("bondlab.tour.v1") ? -1 : 0));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [now, setNow] = useState(() => new Date());
  const [tkSide, setTkSide] = useState<Side>("Buy");
  const [tkFl, setTkFl] = useState(0);
  const [tkSize, setTkSize] = useState(1);
  const [tkType, setTkType] = useState<"Market" | "Limit">("Market");
  const [tkLimit, setTkLimit] = useState("");
  const [chartMode, setChartMode] = useState<"candle" | "line">("candle");
  const [tf, setTf] = useState(0);
  const [auto, setAuto] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState("1");
  const [bookT, setBookT] = useState(1);

  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); ls.set("bondlab.theme", theme); }, [theme]);
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { setDockOpen(stage === 6 || stage === 7); }, [stage]);

  const toastId = useRef(1);
  const toast = useCallback((title: string, detail?: string, kind: Toast["kind"] = "") => {
    const id = toastId.current++;
    setToasts((p) => [...p.slice(-2), { id, title, detail, kind }]);
    setTimeout(() => setToasts((p) => p.filter((x) => x.id !== id)), 4000);
  }, []);
  const got = useRef<Set<string>>(new Set());
  const award = (k: string): void => {
    if (got.current.has(k)) return;
    got.current.add(k);
    setAwards((p) => (p.includes(k) ? p : [...p, k]));
    const w = AW[k];
    if (!w) return;
    if (w[1]) toast(`Badge unlocked: ${w[1]}`, `+${w[0]} XP`, "badge-t");
    else if (!k.startsWith("q")) toast(`+${w[0]} XP`, AWARD_NAME[k] ?? "", "good");
  };

  // ---------- module switch: Deal Lab vs Exchange Builder ----------
  const X = useExchange({ award, toast });
  const [mode, setModeRaw] = useState<"deal" | "exchange">(() => (ls.get("bondlab.mode") === "exchange" ? "exchange" : "deal"));
  const isX = mode === "exchange";
  const [tourSet, setTourSet] = useState<"deal" | "exchange">("deal");
  useEffect(() => { const el = document.querySelector<HTMLElement>(".stage-strip .chip.on"); const st = el?.parentElement; if (el && st) st.scrollTo({ left: el.offsetLeft - 12, behavior: "smooth" }); }, [isX, X.stage, stage]);
  useEffect(() => { document.title = isX ? "Exchange Builder \u00b7 Bond Lab" : "Bond Lab"; }, [isX]);
  const A = ASSETS.find((x) => x.id === aid) ?? A0;
  const xp = awards.reduce((s, k) => s + (AW[k] ? AW[k][0] : 0), 0);
  const badges = awards.filter((k) => AW[k] && AW[k][1]).map((k) => AW[k][1]);
  if (QUIZ.every((_q: Quiz, i: number) => awards.includes("q" + i)) && awards.includes("q8")) badges.push("Quiz Master");
  let li = 0;
  LEVELS.forEach((l, i) => { if (xp >= l[0]) li = i; });
  const nextL = LEVELS[li + 1];
  const frac = nextL ? (xp - LEVELS[li][0]) / (nextL[0] - LEVELS[li][0]) : 1;

  const pickAsset = (id: string): void => {
    const X = ASSETS.find((x) => x.id === id) ?? A0;
    setAid(id); setGuar(false);
    setN(X.n[3]); setScore(X.score[3]); setApr(X.rate[3]); setTerm(X.term[3]);
    setA(X.st[0]); setB(X.st[1]); setC(X.st[2]); setRes(X.st[3]); setSpreads(X.sp.slice());
    setGraded(false); setClosed(false); setMk(EMPTY); setPreset("1"); setMonth(1); setAuto(false); setPlaying(false);
    const nt = tried.includes(id) ? tried : [...tried, id];
    setTried(nt);
    if (nt.length === ASSETS.length) award("explorer");
  };

  // ---------- derived deal (identical maths to the Page) ----------
  const pool = useMemo(() => makePool(nLoans, score, aprIn, A.size), [nLoans, score, aprIn, A.size]);
  const B = pool.bal;
  const gf = A.guar && guar ? 0.03 : 1;
  const elRaw = (A.elBase + Math.max(0, 760 - pool.score) * A.elSlope) * (A.annual ? 1 : Math.sqrt(term / A.term[3]));
  const el = elRaw * gf;
  const sevEff = A.sev * gf;
  const baseCdr = A.annual ? elRaw / 100 / A.sev : elRaw / 100 / (A.sev * (term / 12) * A.lifeK);
  const opt: Opt = { rev: A.rev, defer: A.defer, fee: A.fee };
  const oc = 100 - a - b - c;
  const pcts = [a, b, c];
  const coupons = spreads.map((s) => BENCH + s / 10000);
  const xs = (pool.apr - A.fee - pcts.reduce((s, p, i) => s + (p / 100) * coupons[i], 0)) * 100;
  const xsCredit = clamp(xs * A.xs[0], 0, A.xs[1]);
  const hard = [b + c + oc + res, c + oc + res, oc + res];
  const cushion = hard.map((h) => h + xsCredit);
  const mult = cushion.map((x) => x / el);
  const grades = mult.map((m) => grade(m, A.thr));
  const trs = pcts.map((p, i) => ({ size: (B * p) / 100, coupon: coupons[i] }));
  const ocAmt = (B * oc) / 100, resAmt = (B * res) / 100;
  const run = (cdr: number, cpr: number, sev: number): RunRes => runDeal(B, pool.apr, term, cdr, cpr, sev, trs, ocAmt, resAmt, opt);
  const baseRun = useMemo(() => run(baseCdr, A.cpr, sevEff), [aid, B, pool.apr, term, baseCdr, sevEff, a, b, c, res, spreads[0], spreads[1], spreads[2]]);

  // order book
  const book = pcts.map((p, i) => {
    const size = (B * p) / 100;
    const orders = INV.map((v, j) => {
      const rr = rng(900 + i * 13 + j)();
      const resv = FAIR[grades[i]] * A.fairK * v.mult * (0.92 + 0.16 * rr);
      const likes = v.likes.includes(grades[i]);
      const ok = likes && spreads[i] >= resv;
      return { amt: ok ? size * v.budget * A.inv[j] * (1 + Math.min(1.5, ((spreads[i] - resv) / resv) * 2)) : 0, resv, likes, ok };
    });
    const tot = orders.reduce((s, o) => s + o.amt, 0);
    return { size, orders, cover: size > 0 ? tot / size : 0 };
  });
  const allCovered = book.every((x) => x.size === 0 || x.cover >= 1);

  // ---------- market ----------
  const priceMids = (s: TM): number[] => {
    const rr = run(baseCdr * Math.max(0.5, 1 + (s.unemp - 4) * A.uSens), clamp(A.cpr * s.cprM, 0, 0.6), clamp(sevEff + s.sevAdd * gf, 0, 0.98));
    return rr.tr.map((o: TrOut, i: number) => (trs[i].size > 0 ? (pv(o.cf, s.bench + s.mkt[i] / 10000) / trs[i].size) * 100 : 100));
  };
  const hwFor = (s: TM) => [0.0625, 0.25, 0.75].map((h) => h * A.liq * (1 + Math.max(0, s.unemp - 4) * 0.3));
  const mids = mk.started && mk.hist.length ? mk.hist[mk.hist.length - 1].px : [100, 100, 100];
  const prevMids = mk.hist.length > 1 ? mk.hist[mk.hist.length - 2].px : mids;
  const hw = hwFor(mk);
  const depthFor = (s: TM, i: number, mid: number) => {
    const h = hwFor(s)[i], step = Math.max(0.01, h * 0.6);
    const r = rng(31337 + s.m * 101 + i * 7 + aid.length);
    const lv = (k: number) => Math.max(1, Math.round(((2 + 6 * r()) * (1 + k * 0.6)) / Math.sqrt(A.liq)));
    return {
      bids: [0, 1, 2, 3, 4].map((k) => ({ px: mid - h - k * step, sz: lv(k) })),
      asks: [0, 1, 2, 3, 4].map((k) => ({ px: mid + h + k * step, sz: lv(k) })),
    };
  };
  const vwap = (lvls: { px: number; sz: number }[], size: number) => {
    let left = size, cost = 0;
    for (const l of lvls) { const q = Math.min(left, l.sz); cost += q * l.px; left -= q; if (left <= 0) break; }
    if (left > 0) cost += left * lvls[lvls.length - 1].px;
    return cost / size;
  };
  const holdVal = mk.pos.reduce((s, p, i) => s + p * 1e6 * (mids[i] / 100), 0);
  const pnl = mk.cash + holdVal - 1e7;
  const unreal = mk.pos.map((p, i) => (p === 0 ? 0 : p * (mids[i] - mk.avg[i]) * 1e4));

  const exec = (s: TM, side: Side, i: number, size: number, px: number, kind: "Market" | "Limit"): TM | string => {
    const buy = side === "Buy";
    const amt = size * px * 1e4;
    if (buy && s.cash < amt) return "Not enough cash for that order.";
    if (buy && s.pos[i] + size > MAX_LONG) return `Position limit: you can hold at most $${MAX_LONG}M of one tranche.`;
    if (!buy && s.pos[i] - size < MAX_SHORT) return `Short limit: you can be short at most $${-MAX_SHORT}M of one tranche.`;
    const pos = s.pos.slice(), avg = s.avg.slice();
    const p0 = pos[i], d = buy ? size : -size;
    let realized = 0;
    if (p0 === 0 || Math.sign(p0) === Math.sign(d)) {
      avg[i] = (Math.abs(p0) * avg[i] + size * px) / (Math.abs(p0) + size);
    } else {
      const closeQ = Math.min(size, Math.abs(p0));
      realized = closeQ * (px - avg[i]) * Math.sign(p0) * 1e4;
      if (size > Math.abs(p0)) avg[i] = px;
      else if (size === Math.abs(p0)) avg[i] = 0;
    }
    pos[i] = p0 + d;
    const t: Trade = { id: Date.now() + Math.random(), m: s.m, side, fl: i, size, px, kind, pnl: realized };
    return { ...s, pos, avg, cash: s.cash + (buy ? -amt : amt), realized: s.realized + realized, trades: [t, ...s.trades] };
  };

  const openMarket = (): void => {
    const s: TM = { ...EMPTY, started: true, mkt: spreads.slice(), orig: spreads.slice(), news: [{ m: 0, title: "Secondary trading open", detail: `Your ${A.name.toLowerCase()} deal has been sold. ${MM} will now quote you bids and asks (prices to sell or buy) on any tranche.` }] };
    s.hist = [{ m: 0, px: priceMids(s) }];
    setMk(s); setAuto(false);
    toast("Secondary trading open", `${MM} is quoting all three tranches.`, "good");
  };
  const nextMonth = (): void => {
    if (!mk.started) return;
    const r = rng(5000 + mk.m * 7919 + nLoans + aid.length * 31);
    const evs = [...GEN, ...A.events];
    const wt = evs.reduce((s, e) => s + e.w, 0);
    let pick = r() * wt, ev: Ev = evs[0];
    for (const e of evs) { if (pick < e.w) { ev = e; break; } pick -= e.w; }
    if (ev.bk && mk.bk) ev = evs[0];
    let s: TM = { ...mk, m: mk.m + 1, mkt: mk.mkt.slice(), pos: mk.pos.slice(), bk: mk.bk || !!ev.bk };
    s.bench = clamp(s.bench + (ev.bench ?? 0), 0.005, 0.09);
    s.unemp = clamp(s.unemp + (ev.unemp ?? 0), 3, 12);
    s.cprM = ev.cpr ? Math.min(4, s.cprM * ev.cpr) : 1 + (s.cprM - 1) * 0.7;
    let detail = ev.bk ? `A simulated scenario, not real news: this has not happened. Your bonds keep paying. The ${A.thing} were sold in a true sale to ${nr(A.trust, SPV_ROLE)}, so ${A.short}'s creditors can't touch them. A backup servicer takes over collecting. Prices dip a little on the scary headline.` : ev.detail;
    if (ev.bench) {
      s.cprM = Math.min(4, s.cprM * (ev.bench < 0 ? 1 + A.refi * 2 : 1 / (1 + A.refi)));
      if (ev.bench < 0 && A.refi > 0.2) detail += " Homeowners start refinancing, so early payoffs jump.";
    }
    s.sevAdd = clamp(s.sevAdd + (ev.sev ?? 0), -0.2, 0.35);
    s.mkt = s.mkt.map((v, i) => {
      const vol = [4, 10, 22][i] * A.liq;
      return Math.max(10, v + (ev.sp ? ev.sp[i] : 0) + (r() - 0.5) * vol + (s.orig[i] - v) * 0.06);
    });
    const inc = mk.pos.reduce((acc, p, i) => acc + (p * 1e6 * coupons[i]) / 12, 0);
    s.cash = mk.cash + inc; s.income = mk.income + inc;
    const row = baseRun.months[s.m - 1];
    const extra = row ? ` ${nr(ev.bk ? "The backup servicer" : A.serv, "the servicer")} collected ${fm(row.collected)} from ${A.who} this month.` : "";
    const title = ev.bk ? `What-if: ${nr(A.orig, lr(A))} goes bust (hypothetical stress event)` : ev.title;
    const px = priceMids(s);
    s.hist = [...mk.hist, { m: s.m, px }];
    const moveTone = px[2] - (mk.hist[mk.hist.length - 1]?.px[2] ?? px[2]);
    s.news = [{ m: s.m, title, detail: detail + extra, tone: (moveTone >= 0 ? "good" : "bad") as "good" | "bad" }, ...mk.news].slice(0, 30);
    // working limit orders
    const left: Order[] = [];
    for (const o of s.orders) {
      const dpt = depthFor(s, o.fl, px[o.fl]);
      const best = o.side === "Buy" ? dpt.asks[0].px : dpt.bids[0].px;
      const fills = o.side === "Buy" ? best <= o.limit : best >= o.limit;
      if (fills) {
        const out = exec(s, o.side, o.fl, o.size, o.side === "Buy" ? Math.min(best, o.limit) : Math.max(best, o.limit), "Limit");
        if (typeof out === "string") { left.push(o); continue; }
        s = out;
        toast("Limit order filled", `${o.side} $${o.size}M ${FL[o.fl]} at ${o.limit.toFixed(2)} or better`, "good");
      } else left.push(o);
    }
    s.orders = left;
    setMk(s);
    toast(`M${s.m}: ${title}`, undefined, ev.bk ? "bad" : moveTone >= 0 ? "good" : "bad");
    const p2 = s.cash + s.pos.reduce((acc, p, i) => acc + p * 1e6 * (px[i] / 100), 0) - 1e7;
    if (s.m >= 6 && p2 > 0) award("green");
  };
  const nmRef = useRef(nextMonth);
  nmRef.current = nextMonth;
  useEffect(() => {
    if (!auto || stage !== 6 || !mk.started) return;
    const t = setInterval(() => nmRef.current(), 2600);
    return () => clearInterval(t);
  }, [auto, stage, mk.started]);

  const tkPx = (): { px: number; ok: boolean } => {
    const d = depthFor(mk, tkFl, mids[tkFl]);
    if (tkType === "Market") return { px: vwap(tkSide === "Buy" ? d.asks : d.bids, tkSize), ok: true };
    const lim = parseFloat(tkLimit);
    return { px: lim, ok: isFinite(lim) && lim > 50 && lim < 150 };
  };
  const submit = (side: Side = tkSide): void => {
    if (!mk.started) return;
    setTkSide(side);
    const d = depthFor(mk, tkFl, mids[tkFl]);
    if (tkType === "Market") {
      const px = vwap(side === "Buy" ? d.asks : d.bids, tkSize);
      const out = exec(mk, side, tkFl, tkSize, px, "Market");
      if (typeof out === "string") { toast("Order rejected", out, "bad"); return; }
      setMk(out);
      toast(`${side === "Buy" ? "Bought" : "Sold"} $${tkSize}M ${FLS[tkFl]}`, `${side === "Buy" ? "from" : "to"} ${MM} at ${px.toFixed(3)}`, side === "Buy" ? "good" : "bad");
      if (out.trades.length >= 5) award("mm");
      return;
    }
    const lim = parseFloat(tkLimit);
    if (!isFinite(lim) || lim < 50 || lim > 150) { toast("Enter a limit price", "Prices are quoted per 100, e.g. 99.50.", "bad"); return; }
    const best = side === "Buy" ? d.asks[0].px : d.bids[0].px;
    if ((side === "Buy" && best <= lim) || (side === "Sell" && best >= lim)) {
      const out = exec(mk, side, tkFl, tkSize, side === "Buy" ? Math.min(best, lim) : Math.max(best, lim), "Limit");
      if (typeof out === "string") { toast("Order rejected", out, "bad"); return; }
      setMk(out); toast("Limit order filled now", `${side} $${tkSize}M ${FLS[tkFl]}`, "good");
      if (out.trades.length >= 5) award("mm");
      return;
    }
    setMk({ ...mk, orders: [...mk.orders, { id: Date.now(), m: mk.m, side, fl: tkFl, size: tkSize, limit: lim }] });
    toast("Limit order working", `${side} $${tkSize}M ${FLS[tkFl]} at ${lim.toFixed(2)}. It fills if the market reaches your price.`);
    setDock("orders"); setDockOpen(true);
  };

  // ---------- stress ----------
  const P = A.presets[Number(preset)];
  const sv: number[] = preset === "custom" || !P ? custom : [baseCdr * P[1] * 100, P[2], Math.round(P[3] * gf)];
  const sRun = useMemo(() => run(sv[0] / 100, sv[1] / 100, sv[2] / 100), [aid, B, pool.apr, term, sv[0], sv[1], sv[2], a, b, c, res, spreads[0], spreads[1], spreads[2]]);
  const pickPreset = (k: string): void => {
    setPreset(k);
    const p = A.presets[Number(k)];
    if (!p) { setCustom(sv.slice()); return; }
    const rr = run(baseCdr * p[1], p[2] / 100, (p[3] * gf) / 100);
    if (k === "2" && rr.tr[0].loss < 1) award("recession");
    if (rr.early > 0) award("tripwire");
  };
  const setSv = (i: number, v: number): void => { const n = sv.slice(); n[i] = v; setCustom(n); setPreset("custom"); };
  const mNow = Math.min(Math.max(1, month), term);
  const mrow: MonthRow | undefined = sRun.months[mNow - 1];
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setMonth((m) => { if (m >= term) { setPlaying(false); return term; } return m + 1; }), 650 / Number(speed));
    return () => clearInterval(t);
  }, [playing, speed, term]);

  // ---------- book-building animation ----------
  const bookKey = `${aid}|${spreads.join(",")}|${grades.join(",")}|${stage}`;
  useEffect(() => {
    if (stage !== 5) return;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => { const k = Math.min(1, (t - t0) / 1500); setBookT(k); if (k < 1) raf = requestAnimationFrame(step); };
    setBookT(0); raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [bookKey]);
  const fillFrac = (j: number) => { const x = clamp((bookT - j * 0.16) / 0.5, 0, 1); return 1 - Math.pow(1 - x, 3); };

  // ---------- navigation + locks ----------
  const lockReason = (i: number): string | null => {
    if (i === 5 && !graded) return "Get rated first (step 5).";
    if ((i === 6 || i === 7) && !closed) return "Price and close the deal first (step 6).";
    return null;
  };
  const setStage = (n: number): void => {
    if (n < 0 || n >= STAGES.length) return;
    const why = lockReason(n);
    if (why) { toast("Locked", why, "bad"); return; }
    setStageRaw(n); setMaxSeen((m) => Math.max(m, n)); setMtab("work");
    document.querySelector(".main")?.scrollTo({ top: 0 });
  };
  const answer = (i: number): void => { setQuiz({ ...quiz, [stage]: i }); if (i === QUIZ[stage].ok) award("q" + stage); };
  const PL = playersFor(A);
  // ---- ownership tracker (who legally owns the loans / the bonds at each moment) ----
  const [own, setOwn] = useState(0);
  const [ownPlay, setOwnPlay] = useState(false);
  useEffect(() => {
    if (!ownPlay) return;
    const t = setInterval(() => setOwn((o) => { if (o >= 5) { setOwnPlay(false); return o; } return o + 1; }), 2600);
    return () => clearInterval(t);
  }, [ownPlay]);
  // On phones the map scrolls sideways; start it centred on the special purpose vehicle.
  useEffect(() => { if (stage !== 1) return; const el = document.querySelector<HTMLElement>(".flow-scroll"); if (el && el.scrollWidth > el.clientWidth) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2; }, [stage, aid, mtab]);
  const pl: Player = PL.find((p) => p.id === sel) ?? PL[0];
  const meet = (id: string) => { setSel(id); const ns = seen.includes(id) ? seen : [...seen, id]; setSeen(ns); if (ns.length >= 6) award("players"); };
  const howPays = A.rev ? `Revolving (refilling): for all but the last 12 months, repayments buy new ${A.thing}; then investors are paid back.` : A.defer ? `Deferment (payment pause): pays down monthly, but ${A.defer[0] * 100}% of borrowers pay nothing for the first ${A.defer[1]} months.` : "Amortizing (pays down a little every month until paid off).";
  const elText = A.annual ? "a year" : "over its life";

  // ---------- capital stack ----------
  const latest = useRef({ a, b, c });
  latest.current = { a, b, c };
  const onDrag = (h: number, dp: number): void => {
    if (!dp) return;
    let { a: na, b: nb, c: nc } = latest.current;
    if (h === 0) { na += dp; nb -= dp; } else if (h === 1) { nb += dp; nc -= dp; } else { nc += dp; }
    if (na < 40 || nb < 0 || nb > 30 || nc < 0 || nc > 25 || na + nb + nc > 100) return;
    latest.current = { a: na, b: nb, c: nc };
    setA(na); setB(nb); setC(nc);
  };
  const stackLayers = (withNotes: boolean): StackLayer[] => [
    { key: "s", label: "Senior (top floor)", pct: a, color: "var(--t0)", note: `${a}% \u00b7 ${gname(grades[0])}` },
    { key: "m", label: "Mezzanine (middle floor)", pct: b, color: "var(--t1)", note: `${b}% \u00b7 ${gname(grades[1])}` },
    { key: "j", label: "Junior (bottom floor)", pct: c, color: "var(--t2)", note: `${c}% \u00b7 ${gname(grades[2])}` },
    { key: "o", label: "Residual / OC (owner's slice)", pct: oc, color: "var(--t3)", note: withNotes ? `${oc}% \u00b7 ${A.short}` : `${oc}%` },
    { key: "x", label: "Reserve + excess spread", pct: res + xsCredit, color: "", note: `${(res + xsCredit).toFixed(1)}%`, dashed: true },
  ];
  const floods = [
    { pct: el, label: `Expected net loss ${pc(el)}`, solid: true },
    { pct: el * A.thr[3], label: `${A.thr[3]}x stress (BBB test)` },
    { pct: el * A.thr[0], label: `${A.thr[0]}x stress (AAA test)` },
  ];

  // ---------- coach text (same lessons as the Page) ----------
  const coach = ((): string => {
    switch (stage) {
      case 0: return `Select the collateral pool (pick what goes in the basket). Each asset class behaves differently: home loans get paid off early when rates fall, card balances refill, song royalties fade with fashion. You've tried ${tried.length} of ${ASSETS.length}; try them all for the Explorer badge.`;
      case 1: return `Tap each market participant (player) to see what they do in this ${A.name.toLowerCase()} deal. You've met ${seen.length} of ${PL.length}. Meet at least 6 for the Networker badge.`;
      case 2: return gf < 1 ? "With the government promise switched on, losses almost vanish. The real risks become prepayment (early payoffs) and interest rates." : pool.score < 640 ? "A riskier collateral pool: higher rates, but more borrowers will default (stop paying). You'll need more credit enhancement (a thicker cushion) when you structure the tranches." : pool.score > 750 ? "A very safe collateral pool. Few losses expected, but low rates mean little excess spread (leftover interest)." : "Try moving the credit score slider and watch expected net loss change.";
      case 3: return grades[0] !== "AAA" ? "Your senior tranche (top floor) isn't AAA yet. Add subordination (thicker floors below it), more overcollateralization (padding), or a bigger reserve account (rainy-day fund). Watch the red stress lines." : oc < 3 ? "Senior tranche is AAA. Careful: very little overcollateralization (padding) means the residual (owner's leftover money) disappears fast if losses rise." : "Nice. The senior tranche (top floor) sits above the AAA stress line. Junior tranches pay more because they sit closer to the water. Drag the white handles on the capital stack to resize tranches.";
      case 4: return graded ? `The rating agencies have spoken. Senior tranche: ${gname(grades[0])}. Change tranche sizes in step 4 and come back to try for a better rating.` : "Press the button to send your deal to the rating agencies. They run stress tests (storms several times worse than expected) and check which tranches (floors) stay dry.";
      case 5: return closed ? `Deal sold! ${nr(A.orig, lr(A))} has its cash. Next, see how your tranches trade in the secondary market (afterwards).` : !allCovered ? "At least one tranche is undersubscribed (fewer orders than bonds for sale). Offer a wider spread (a bit more extra pay) on it." : book.some((x) => x.cover > 2.5) ? "Every tranche is covered, but some are hugely oversubscribed. You could tighten the spread (offer less extra pay)." : "Every tranche is covered at a sensible level. Price and close the deal!";
      case 6: return !mk.started ? "Open secondary trading, then press Next month (N) to let time pass. Buy tranches you think will rise, sell ones you think will fall." : A.refi > 0.2 ? "MBS tip: rate cuts trigger refinancing, so prepayments (early payoffs) jump. Watch what that does to prices above 100." : "Tip: bad economic news hits junior tranches hardest; benchmark rate rises dent everything a little. Holding bonds also earns monthly coupon interest. Press B to buy, S to sell, N for next month.";
      default: return sRun.early > 0 ? `The early amortization trigger (tripwire) fired in month ${sRun.early}: refilling stopped and every repaid dollar went to investors.` : sRun.tr[0].loss > 1 ? "Ouch: even the senior tranche lost money in this stress test, like many 'AAA' home-loan bonds in 2008. Try more credit enhancement in step 4." : sRun.tr[2].loss > 1 ? "The storm reached the junior tranche, but the senior tranche stayed dry. That's subordination doing its job." : "Every tranche was paid in full. Try a harsher stress scenario. Press play to watch the waterfall month by month.";
    }
  })();

  // ---------- tour ----------
  const TOUR_D: { sel: string; title: string; body: string }[] = [
    { sel: "", title: "Welcome to Bond Lab", body: "You'll build an asset-backed security (a bond paid by a basket of loans) from scratch, then sell it and trade it. Real company names appear for realism only; every deal, price and number is made up for practice, and no affiliation or endorsement is implied. This 30-second tour shows you around." },
    { sel: "mode", title: "Two modules", body: "Deal Lab (this one) builds and trades a deal. Exchange Builder lets you design a new marketplace for these bonds: who does what, who gets paid how. Switch here any time, or press X." },
    { sel: "topbar", title: "Top bar: your desk at a glance", body: "The deal you're building, the asset class, your mock cash, your P&L (profit or loss), your XP level and a live clock. Market month shows how much simulated time has passed." },
    { sel: "rail", title: "Steps of a real deal", body: "The 8 steps run from selecting the collateral pool (picking the basket of loans) to the stress test (storm test). A lock means an earlier step has to be finished first." },
    { sel: "workspace", title: "Your workspace", body: "Each step has its own tools: sliders, a draggable capital stack, a live order book, a trading screen. Dotted words are industry terms: hover or tap them for a plain-English explanation." },
    { sel: "coach", title: "Coach and dictionary", body: "The coach tells you what to do next, teaches the key terms for each step, and has a quick check quiz for XP. The dictionary tab lists every term. Hide this panel with C." },
    { sel: "tape", title: "News tape and blotter", body: "Market news scrolls along the tape. Underneath, the trade blotter (your trade log), working orders and news wire keep a record of everything." },
    { sel: "", title: "Shortcuts", body: "Press ? any time for keyboard shortcuts. On the trading screen, B buys, S sells and N moves to the next month. T switches light and dark mode. You can replay this tour anytime from the Tour button (or press G). Have fun!" },
  ];
  const TOUR = tourSet === "exchange" ? X.TOUR : TOUR_D;
  const endTour = () => { setTour(-1); ls.set(tourSet === "exchange" ? "bondlab.tour.x.v1" : "bondlab.tour.v1", "1"); };
  const startTour = (step = 0, set: "deal" | "exchange" = mode) => { const T = set === "exchange" ? X.TOUR : TOUR_D; setHelp(false); setMtab("work"); setSideOpen(true); setTourSet(set); setTour(clamp(step, 0, T.length - 1)); };
  const setMode = (m: "deal" | "exchange") => {
    setModeRaw(m); ls.set("bondlab.mode", m); setMtab("work"); setHelp(false);
    document.querySelector(".main")?.scrollTo({ top: 0 });
    if (m === "exchange" && !ls.get("bondlab.tour.x.v1") && tour < 0) startTour(0, "exchange");
  };
  const [hole, setHole] = useState<DOMRect | null>(null);
  useEffect(() => {
    if (tour < 0) return;
    const s = TOUR[tour]?.sel;
    const pickEl = () => {
      if (!s) return null;
      const els = [...document.querySelectorAll<HTMLElement>(`[data-tour="${s}"]`)];
      return els.find((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0; }) ?? null;
    };
    const upd = () => { const el2 = pickEl(); setHole(el2 ? el2.getBoundingClientRect() : null); };
    upd();
    window.addEventListener("resize", upd);
    return () => window.removeEventListener("resize", upd);
  }, [tour, sideOpen, tourSet, mode]);

  // ---------- keyboard shortcuts ----------
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => undefined);
  keyRef.current = (e: KeyboardEvent) => {
    const el2 = e.target as HTMLElement | null;
    if (el2 && (el2.tagName === "TEXTAREA" || el2.tagName === "SELECT" || (el2.tagName === "INPUT" && (el2 as HTMLInputElement).type !== "range"))) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (k === "Escape") { setHelp(false); if (tour >= 0) endTour(); return; }
    if (tour >= 0) {
      if (k === "ArrowRight") { if (tour === TOUR.length - 1) endTour(); else setTour(tour + 1); }
      else if (k === "ArrowLeft" && tour > 0) setTour(tour - 1);
      return;
    }
    if (k === "g" || k === "G") { startTour(0); return; }
    if (k === "x" || k === "X") { setMode(isX ? "deal" : "exchange"); return; }
    if (k === "?") { setHelp((h) => !h); e.preventDefault(); return; }
    if (k === "t" || k === "T") { setTheme((t) => (t === "dark" ? "light" : "dark")); return; }
    if (k === "c" || k === "C") { setSideOpen((o) => !o); return; }
    if (k === "d" || k === "D") { setSideOpen(true); setSideTab("dict"); return; }
    if (isX) {
      if (k === "]") { X.setStage(X.stage + 1); return; }
      if (k === "[") { X.setStage(X.stage - 1); return; }
      if (/^[1-8]$/.test(k)) { X.setStage(Number(k) - 1); return; }
      return;
    }
    if (k === "]") { setStage(stage + 1); return; }
    if (k === "[") { setStage(stage - 1); return; }
    if (/^[1-8]$/.test(k)) { setStage(Number(k) - 1); return; }
    if (stage === 6 && mk.started) {
      if (k === "b" || k === "B") { submit("Buy"); return; }
      if (k === "s" || k === "S") { submit("Sell"); return; }
      if (k === "n" || k === "N") { nextMonth(); return; }
      if (k === "p" || k === "P") { setAuto((x) => !x); return; }
    }
    if (stage === 7) {
      if (k === "p" || k === "P") { if (mNow >= term) setMonth(1); setPlaying((x) => !x); return; }
      if (k === "n" || k === "N") { setMonth((m) => Math.min(term, m + 1)); return; }
    }
  };
  useEffect(() => { const h = (e: KeyboardEvent) => keyRef.current(e); window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, []);

  // ---------- small render helpers ----------
  const tick = (i: number) => {
    const ch = mids[i] - prevMids[i];
    return { ch, cls: ch > 0.0005 ? "up" : ch < -0.0005 ? "down" : "muted", flash: ch > 0.0005 ? "flash-up" : ch < -0.0005 ? "flash-down" : "" };
  };
  const pnlT = useTween(pnl, 600);
  const moveOn = (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
      <button className="btn" disabled={stage === 0} onClick={() => setStage(stage - 1)}>{"\u2190 Back"}</button>
      {stage < STAGES.length - 1 ? (
        <button className="btn primary" onClick={() => setStage(stage + 1)} title={lockReason(stage + 1) ?? ""}>{lockReason(stage + 1) ? "\ud83d\udd12 " : ""}{"Next: " + STAGES[stage + 1] + " \u2192"}</button>
      ) : <button className="btn primary" onClick={() => setStage(0)}>Back to start</button>}
    </div>
  );
  const WHO = A.who.charAt(0).toUpperCase() + A.who.slice(1);
  type OwnStep = { t: string; loan: string; bond: string[]; cash: string[]; fee: string[]; sold: string[]; hot: string[]; body: ReactNode };
  const OWN: OwnStep[] = [
    { t: "Borrower signs the loan", loan: "l", bond: [], cash: [], fee: [], sold: [], hot: ["l>d"],
      body: <span>The {A.thing} are created. {WHO} sign a promissory note (an IOU) and owe the payments. {nr(A.orig, lr(A))} becomes the <b>owner of the loans</b>: the legal right to collect every payment. No bonds exist yet.</span> },
    { t: "Lender (originator) owns the loans", loan: "l", bond: [], cash: ["s"], fee: [], sold: [], hot: ["d>s"],
      body: <span>The <Term k="originator">originator (the lender that made the loans)</Term>, {nr(A.orig, lr(A))}, keeps thousands of {A.thing} on its own books (its balance sheet). If it went bust now, its creditors could claim them. {nr(A.serv, "the servicer")} already collects the monthly payments.</span> },
    { t: "True sale to the SPV", loan: "t", bond: [], cash: ["s"], fee: [], sold: ["l"], hot: ["l>t", "t>l"],
      body: <span>In a <Term k="truesale">true sale (a real, final sale)</Term>, {A.short} sells the {A.thing} to {nr(A.trust, SPV_ROLE)} and gets cash. Legal ownership moves for good: it is a sale, not a loan backed by the {A.thing}.</span> },
    { t: "SPV / trust owns the loans", loan: "t", bond: [], cash: ["s", "g"], fee: [], sold: ["l"], hot: ["g>t", "s>t"],
      body: <span>The <Term k="spv">special purpose vehicle, SPV (walled-off box)</Term>, {A.trust}, now <b>owns the loans</b>. {A.short}&apos;s creditors can&apos;t touch them. {TRUSTEE} holds everything on behalf of the future bondholders and enforces the rules (the referee). It never owns the loans for itself.</span> },
    { t: "Investors own the bonds", loan: "t", bond: ["i"], cash: ["s", "g"], fee: ["u", "r", "s", "g"], sold: ["l"], hot: ["t>u", "u>i", "i>t", "t>i"],
      body: <span>The SPV issues bonds, sold by {DEALER} and graded by {RATERS}. Investors (the buy-side) now <b>own the bonds</b>: claims on the cash flows, not the {A.thing} themselves. Every month {nr(A.serv, "the servicer")} collects from {A.who} and passes the cash on; it earns a fee but <b>never owns</b> the {A.thing}.</span> },
    { t: "Bonds trade later; the loans stay put", loan: "t", bond: ["i", "m"], cash: ["s", "g"], fee: ["s", "g"], sold: ["l"], hot: ["i>m", "t>i"],
      body: <span>In the <Term k="secondary">secondary market (trading afterwards)</Term> investors can sell bonds to {MM}. Whoever holds a bond on payment day gets its share. The bonds change hands; the {A.thing} stay in {A.trust} the whole time.</span> },
  ];
  const OS = OWN[own];
  const ownTags = (id: string): { t: string; tone: OwnTone }[] => {
    const t: { t: string; tone: OwnTone }[] = [];
    if (id === "d") t.push({ t: "OWE THE PAYMENTS", tone: "sold" });
    if (OS.loan === id) t.push({ t: "OWNS THE LOANS", tone: "loan" });
    if (OS.bond.includes(id)) t.push({ t: "OWNS THE BONDS", tone: "bond" });
    if (OS.sold.includes(id)) t.push({ t: "SOLD ITS LOANS", tone: "sold" });
    if (OS.cash.includes(id)) t.push({ t: id === "g" ? "HOLDS FOR INVESTORS" : "HANDLES CASH", tone: "cash" });
    if (OS.fee.includes(id)) t.push({ t: "FEE", tone: "fee" });
    return t;
  };
  const ownRing = (id: string): OwnTone | undefined => (OS.loan === id ? "loan" : OS.bond.includes(id) ? "bond" : undefined);
  const nodeName: Record<string, string> = { l: nr(A.orig, lr(A)), t: nr(A.trust, SPV_ROLE), i: "Investors (the buy-side)", m: MM };
  const nodeOf: Record<string, string> = { borrowers: "d", lender: "l", servicer: "s", trust: "t", trustee: "g", ratings: "r", arranger: "u", investors: "i", mm: "m" };
  const playerOf: Record<string, string> = { d: "borrowers", l: "lender", s: "servicer", t: "trust", g: "trustee", r: "ratings", u: "arranger", i: "investors", m: "mm" };

  // ================= screens =================
  const S0 = (): ReactNode => (
    <>
      <Panel title="Asset class: what goes in your collateral pool (basket)?" right={<span className="dim">{tried.length}/{ASSETS.length} explored</span>} tour="assets">
        <div className="asset-grid">
          {ASSETS.map((x) => (
            <button key={x.id} className={"asset-card" + (x.id === aid ? " on" : "")} onClick={() => pickAsset(x.id)} aria-pressed={x.id === aid}>
              {tried.includes(x.id) && <span className="tick">{"\u2713"}</span>}
              <div className="ac-t">{proName(x)}</div>
              <div className="ac-s">{x.what}</div>
              <div className="ac-m">
                <span>Loan size <b className="num">{fm(x.size)}</b></span>
                <span>Term <b className="num">{x.term[3]}m</b></span>
                <span>Senior <b className="num">{x.st[0]}%</b></span>
                <span>{x.rev ? "Revolving" : x.defer ? "Deferment" : "Amortizing"}</span>
              </div>
            </button>
          ))}
        </div>
        <div className="p dim" style={{ marginTop: 10 }}>Switching resets your deal to that asset class's typical setup.</div>
      </Panel>
      <div className="grid g-wide-left">
        <Panel title={`${A.name}, in real life`}>
          <Props items={[
            { label: "What it is", value: <span>{A.what} Industry name: <Term k={A.tk}>{A.pro}</Term>.</span> },
            { label: "Think of it like", value: A.like },
            { label: "Obligors (who pays)", value: A.who },
            { label: "Originator (who sells it)", value: nr(A.orig, lr(A)) },
            { label: "Special purpose vehicle, SPV (walled-off box)", value: <span>{A.trust}, the <Term k="spv">special purpose vehicle</Term> that holds the collateral pool (basket) and issues the bonds</span> },
            { label: "Servicer (who collects payments)", value: nr(A.serv, "the servicer") },
            { label: "Payment structure (how money comes in)", value: howPays },
            { label: "Expected net loss (typical losses)", value: `${pc(el)} ${elText} (mock)` },
            { label: "Fun fact", value: A.fact },
          ]} />
        </Panel>
        <Panel title="Good to know">
          <div className="rows">{A.notes.map((nt) => <div key={nt[0]} className="rw"><div className="tt">{nt[0]}</div><div className="dd">{nt[1]}</div></div>)}</div>
          {A.guar && <div style={{ marginTop: 10 }}><Switch label={A.guar} value={guar} onChange={setGuar} /></div>}
          {A.guar && <div className="p dim" style={{ marginTop: 6 }}>{guar ? `On: a government-backed promise covers about 97% of each loss. Expected losses drop to ${pc(el, 2)}. Watch every tranche become AAA in step 5.` : "Off: no guarantee, so tranches and cushions do all the protecting."}</div>}
        </Panel>
      </div>
      <Panel title="Asset classes side by side" right={<span className="dim">typical mock setups</span>} tight>
        <Tbl right={[1, 2, 4, 5]} cols={["Asset class (basket)", "Typical loan size", "Term (length)", "Payment structure", "Expected net loss", "Senior tranche (top floor)"]} rows={ASSETS.map((x) => [proName(x), fm(x.size), mo(x.term[3]), x.rev ? "Revolving (refilling)" : x.defer ? "Deferment, then amortizing" : "Amortizing (monthly paydown)", `${pc(x.elBase + Math.max(0, 760 - x.score[3]) * x.elSlope)} ${x.annual ? "/ yr" : "total"}`, `${x.st[0]}%`])} />
      </Panel>
    </>
  );

  const S1 = (): ReactNode => (
    <>
      <Panel title="The whole idea in 30 seconds">
        <div className="steps">
          {[
            { t: `${A.who.charAt(0).toUpperCase() + A.who.slice(1)} pay`, d: <span>{nr(A.orig, lr(A))} has thousands of {A.thing}. Every month {A.who} pay.</span> },
            { t: "True sale to the SPV (the loans move into a walled-off box)", d: <span>{nr(A.short, lr(A))} sells the {A.thing} in a <Term k="truesale">true sale (a real sale)</Term> to a <Term k="spv">special purpose vehicle, SPV (walled-off box)</Term> called {A.trust}. It holds them as the <Term k="pool">collateral pool (basket)</Term> and is <Term k="bkremote">bankruptcy-remote (walled off)</Term> if {A.short} ever goes bust.</span> },
            { t: "Tranching (the basket is cut into floors)", d: <span>Like a building in a flood: the <Term k="senior">senior tranche (top floor)</Term> stays dry longest, the <Term k="junior">junior tranche (bottom floor)</Term> gets wet first, so it earns more.</span> },
            { t: "Rating and placement (floors get graded and sold)", d: <span>Rating agencies give each tranche a <Term k="rating">credit rating (grade)</Term>; the <Term k="underwriter">underwriter</Term> sells them to investors as <Term k="abs">asset-backed securities, ABS (bonds)</Term>.</span> },
            { t: "The waterfall (money flows down every month)", d: <span>The <Term k="servicer">servicer (payment collector)</Term> gathers payments and the <Term k="trustee">trustee (referee)</Term> pays the tranches by the <Term k="waterfall">waterfall (payment order)</Term>.</span> },
            { t: "Secondary trading (floors trade afterwards)", d: <span>Investors buy and sell tranches with a market maker in the <Term k="secondary">secondary market (trading afterwards)</Term> as news moves prices.</span> },
          ].map((s, i) => <div key={i} className="step"><div className="sn">STEP {i + 1}</div><div className="stt">{s.t}</div><div className="sd">{s.d}</div></div>)}
        </div>
      </Panel>
      <Panel title="Market participants: follow the money" right={<span className="dim">click a box</span>}>
          <div className="own-now" aria-live="polite">
            <div className="own-cell"><span className="k"><i style={{ background: OWN_COLOR.loan }} />Current owner of the loans</span><b>{nodeName[OS.loan]}</b></div>
            <div className="own-cell"><span className="k"><i style={{ background: OWN_COLOR.bond }} />Current owner of the bonds</span><b>{OS.bond.length ? OS.bond.map((b) => nodeName[b]).join(" and ") : "No bonds yet"}</b></div>
          </div>
          <div className="own-steps" role="group" aria-label="Ownership timeline">
            {OWN.map((o, i) => <button key={o.t} className={"own-step" + (i === own ? " on" : i < own ? " done" : "")} onClick={() => { setOwnPlay(false); setOwn(i); }} aria-label={`Ownership step ${i + 1}: ${o.t}`} aria-current={i === own ? "step" : undefined}><span className="n">{i + 1}</span><span className="tt">{o.t}</span></button>)}
          </div>
          <div className="own-explain">
            <div className="own-eh"><b>Step {own + 1} of {OWN.length}: {OS.t}</b>
              <span className="own-ctl">
                <button className="btn sm" disabled={own === 0} onClick={() => { setOwnPlay(false); setOwn(own - 1); }} aria-label="Previous ownership step">{"\u2190"}</button>
                <button className="btn sm" onClick={() => { if (own >= OWN.length - 1) setOwn(0); setOwnPlay(!ownPlay); }}>{ownPlay ? "Pause" : "\u25b6 Play"}</button>
                <button className="btn sm" disabled={own === OWN.length - 1} onClick={() => { setOwnPlay(false); setOwn(own + 1); }} aria-label="Next ownership step">{"\u2192"}</button>
              </span>
            </div>
            <div className="own-body">{OS.body}</div>
          </div>
          <div className="flow-scroll"><FlowDiagram sel={nodeOf[sel]} onPick={(id) => meet(playerOf[id] ?? "trust")} nodes={([
            { id: "d", label: PL[0].name, detail: "the borrowers", kind: "person" },
            { id: "l", label: A.orig, detail: lr(A) },
            { id: "s", label: A.serv, detail: "the servicer" },
            { id: "t", label: A.trust, detail: "special purpose vehicle (SPV)", kind: "key" },
            { id: "g", label: "U.S. Bank Trust Company", detail: "the trustee" },
            { id: "r", label: "S&P & Moody's", detail: "the rating agencies" },
            { id: "u", label: "J.P. Morgan Securities", detail: "the underwriter/dealer" },
            { id: "i", label: "Investors", detail: "the buy-side", kind: "person" },
            { id: "m", label: "Goldman Sachs", detail: "the market maker" },
          ] as { id: string; label: string; detail?: string; kind?: "box" | "key" | "person" }[]).map((n) => ({ ...n, tags: ownTags(n.id), ring: ownRing(n.id) }))} edges={[
            { from: "l", to: "d", label: "lends" },
            { from: "d", to: "s", label: "monthly payments" },
            { from: "s", to: "t", label: "passes the cash" },
            { from: "l", to: "t", label: "true sale of the loans" },
            { from: "t", to: "l", label: "cash for the loans", dashed: true },
            { from: "t", to: "u", label: "issues bonds" },
            { from: "u", to: "i", label: "sells bonds" },
            { from: "i", to: "t", label: "cash for bonds", dashed: true },
            { from: "t", to: "i", label: "interest + repayments" },
            { from: "g", to: "t", label: "watches the rules", dashed: true },
            { from: "r", to: "u", label: "rates the tranches", dashed: true },
            { from: "i", to: "m", label: "trade later" },
          ].map((e) => ({ ...e, hot: OS.hot.includes(e.from + ">" + e.to) }))} /></div>
          <div className="m-only dim" style={{ fontSize: 11.5, marginTop: 4 }}>Swipe sideways to see the whole map.</div>
          <div className="own-legend" aria-label="Legend">
            <span><i style={{ background: OWN_COLOR.loan }} /><b>Owns the loans</b> (legal owner of the IOUs)</span>
            <span><i style={{ background: OWN_COLOR.bond }} /><b>Owns the bonds</b> (a claim on the cash, not the loans)</span>
            <span><i style={{ background: OWN_COLOR.cash }} /><b>Handles cash, never owns</b> (servicer collects, trustee holds for investors)</span>
            <span><i className="fee" /><b>Gets paid a fee</b> (paid for a job, owns nothing)</span>
            <span><i className="hotline" /><b>Moving now</b> in this step</span>
          </div>
          <div className="p dim" style={{ marginTop: 8 }}>The highlighted box, {A.trust}, is the <Term k="spv">special purpose vehicle, SPV (walled-off box)</Term>. The loans go in, bonds come out, and every month borrowers' money flows through it to investors. Investors' cash for the bonds flows back through it to {nr(A.short, lr(A))}.</div>
      </Panel>
      <div style={{ marginTop: 12 }}>
        <Panel title={pl.title ?? nr(pl.name, pl.role)} right={<span className="dim">{seen.length}/{PL.length} met</span>}>
          <div className="chips" style={{ marginBottom: 12 }}>
            {PL.map((p) => <button key={p.id} className={"chip" + (p.id === sel ? " on" : seen.includes(p.id) ? " ok" : "")} onClick={() => meet(p.id)}>{nr(p.name, p.role)}</button>)}
          </div>
          <Props items={[
            ...(pl.title ? [{ label: "Its name in this deal", value: pl.name }] : []),
            { label: "What they do", value: pl.does },
            { label: "Think of it like", value: pl.like },
            { label: "How they get paid", value: pl.paid },
            { label: "In this game", value: pl.here },
            ...(pl.extra ?? []),
            { label: "Industry title", value: pl.pro },
          ]} />
          <div className="legal" style={{ marginTop: 10 }}>{DISCLAIMER}</div>
        </Panel>
      </div>
      <Panel title="Quick check: the special purpose vehicle, SPV (walled-off box)">
        <QuizBlock q={QUIZ_SPV} ans={quiz[8]} onAns={(i) => { setQuiz({ ...quiz, 8: i }); if (i === QUIZ_SPV.ok) award("q8"); }} />
      </Panel>
    </>
  );

  const S2 = (): ReactNode => (
    <>
      <div className="metrics" style={{ marginBottom: 12 }}>
        <Metric k="Pool balance (total value)" v={fm(B)} d={`${nLoans.toLocaleString()} ${A.thing}`} />
        <Metric k={A.scoreTerm ? "Avg FICO (credit score)" : A.scoreLabel} v={pool.score.toFixed(0)} tone={pool.score < 640 ? "down" : pool.score > 750 ? "up" : undefined} />
        <Metric k="Weighted avg rate" v={pc(pool.apr * 100, 2)} />
        <Metric k={<Term k="el">Expected net loss</Term>} v={pc(el, el < 1 ? 2 : 1)} d={elText} tone={el > 5 ? "down" : el < 1.5 ? "up" : "amber"} />
        <Metric k={<Term k="cdr">Default rate, CDR</Term>} v={pc(baseCdr * 100)} d="loans going bad / yr" />
        <Metric k={A.rev ? <Term k="mpr">Payment rate, MPR</Term> : <Term k="cpr">Prepayment, CPR</Term>} v={pc(A.cpr * 100, 0)} d={A.rev ? "per month" : "early payoffs / yr"} />
      </div>
      <div className="grid g2">
        <Panel title={`Collateral selection (choose the ${A.thing})`} tour="pool">
          <Slider label={`Loan count (number of ${A.thing})`} value={nLoans} min={A.n[0]} max={A.n[1]} step={A.n[2]} fmt={(v) => v.toLocaleString()} onChange={(v) => { setN(v); award("pool"); }} />
          <Slider label={A.scoreTerm ? <span>Average <Term k="fico">FICO score (credit score)</Term></span> : A.scoreLabel} value={score} min={A.score[0]} max={A.score[1]} step={A.score[2]} fmt={(v) => String(v)} onChange={(v) => { setScore(v); award("pool"); }} />
          <Slider label={A.rateLabel} value={aprIn} min={A.rate[0]} max={A.rate[1]} step={A.rate[2]} fmt={(v) => pc(v, 2)} onChange={(v) => { setApr(v); award("pool"); }} />
          <Slider label={A.rev ? "Deal term (refills until the last 12 months)" : "Term (length)"} value={term} min={A.term[0]} max={A.term[1]} step={A.term[2]} fmt={mo} onChange={(v) => { setTerm(v); setMonth(Math.min(month, v)); award("pool"); }} />
        </Panel>
        <Panel title="Credit score distribution (strength scores in your basket)" right={<span className="dim">amber = subprime &lt;620</span>}>
          <Histogram bins={pool.bins} />
          <Props items={[
            { label: "Average loan size", value: <span className="num">{fm(pool.avg)}</span> },
            { label: "Collected in month 1", value: `${fm(baseRun.months[0].collected)} by ${nr(A.serv, "the servicer")}` },
            { label: "Payment structure (how money comes in)", value: howPays },
          ]} />
        </Panel>
      </div>
      <div className="callout" style={{ marginTop: 12 }}><div className="cl">What happens next</div>{nr(A.orig, lr(A))} wants its cash now rather than waiting years to be repaid, so it will sell this collateral pool (basket) to {nr(A.trust, SPV_ROLE)}, which issues bonds to investors.</div>
    </>
  );

  const S3 = (): ReactNode => (
    <>
      <div className="metrics" style={{ marginBottom: 12 }}>
        {[0, 1, 2].map((i) => <Metric key={i} k={<span><span className="sw" style={{ background: TC[i] }} />{FLS[i]} tranche</span>} v={<Rating g={grades[i]} />} d={`cushion ${pc(cushion[i])} \u00b7 ${mult[i] > 99 ? "99+" : mult[i].toFixed(1)}x EL`} />)}
        <Metric k={<Term k="oc">Overcollateralization</Term>} v={`${oc}%`} tone={oc < 3 ? "amber" : undefined} d="owner's slice" />
        <Metric k={<Term k="xs">Excess spread</Term>} v={pc(xs, 2)} tone={xs < 0 ? "down" : "up"} d="leftover interest / yr" />
      </div>
      <div className="grid g-wide-left">
        <Panel title="Capital structure (your building)" right={<span className="dim">drag the handles</span>} tour="stack">
          <CapitalStack layers={stackLayers(true)} floods={floods} onDrag={onDrag} height={400} />
          <div className="legend" style={{ marginTop: 8 }}>
            <span><span className="sw" style={{ background: "var(--down)" }} />Stress lines: how deep a storm the rating agencies test</span>
          </div>
        </Panel>
        <Panel title="Structure the tranches (slice the basket into floors)">
          <Slider label={<span><Term k="senior">Senior tranche (top floor)</Term>: safest, paid first</span>} value={a} min={40} max={100 - b - c} step={1} fmt={(v) => `${v}%`} onChange={setA} />
          <Slider label={<Term k="mezz">Mezzanine tranche (middle floor)</Term>} value={b} min={0} max={Math.min(30, 100 - a - c)} step={1} fmt={(v) => `${v}%`} onChange={setB} />
          <Slider label={<span><Term k="junior">Junior tranche (bottom floor)</Term>: riskiest one sold</span>} value={c} min={0} max={Math.min(25, 100 - a - b)} step={1} fmt={(v) => `${v}%`} onChange={setC} />
          <Slider label={<Term k="reserve">Reserve account (rainy-day fund)</Term>} value={res} min={0} max={3} step={0.25} fmt={(v) => `${v}% of pool`} onChange={setRes} />
          <div className="p dim">Whatever you don't sell is <Term k="oc">overcollateralization, OC (extra padding)</Term>: {nr(A.short, lr(A))} keeps it as the <Term k="residual">residual / equity tranche (owner's slice)</Term>. Right now that's {oc}%. Each month, <Term k="xs">excess spread (leftover interest)</Term> of {pc(xs, 2)} a year soaks up losses first.</div>
        </Panel>
      </div>
      <Panel title="Tranche by tranche (floor by floor)" tight>
        <Tbl right={[1, 2, 3, 4, 5]} cols={["Tranche (floor)", "Share", "Size", "Credit enhancement (cushion)", "Coupon (interest paid)", "WAL (avg wait)", "Rating"]} rows={[0, 1, 2].map((i) => [<span key={i}><span className="sw" style={{ background: TC[i] }} />{FL[i]}</span>, `${pcts[i]}%`, fm(trs[i].size), pc(cushion[i]), pc(coupons[i] * 100, 2), `${baseRun.tr[i].wal.toFixed(1)} yrs`, <Rating key={"r" + i} g={grades[i]} />])} />
      </Panel>
      <div className="p dim" style={{ marginTop: 10 }}><Term k="ce">Credit enhancement (safety cushion)</Term> is everything below a tranche: <Term k="sub">subordination (lower floors absorbing losses first)</Term>, overcollateralization, the reserve account and excess spread. Repayments are <Term k="seq">sequential pay (one floor at a time)</Term>, so the senior tranche has the shortest <Term k="wal">weighted average life, WAL (wait for its money)</Term>.</div>
    </>
  );

  const requestRating = (): void => {
    setReviewing(true);
    setTimeout(() => {
      setReviewing(false); setGraded(true); award("graded");
      if (grades[0] === "AAA") award("aaa");
      toast("Ratings received", `Senior ${gname(grades[0])} \u00b7 Mezzanine ${gname(grades[1])} \u00b7 Junior ${gname(grades[2])}`, "good");
    }, 900);
  };
  const S4 = (): ReactNode => (
    <>
      <div className="grid g-wide-left">
        <Panel title="Get rated (send it to the rating agencies)">
          <div className="p">{RATERS} run stress tests: storms several times worse than expected net loss ({pc(el, el < 1 ? 2 : 1)} {elText}). For {A.name.toLowerCase()}, a tranche whose credit enhancement survives {A.thr[0]}x gets AAA, {A.thr[1]}x AA, {A.thr[2]}x A, {A.thr[3]}x BBB, {A.thr[4]}x BB. Below that: not rated.</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
            <button className="btn primary lg" disabled={reviewing} onClick={requestRating}>{reviewing ? "Agencies reviewing\u2026" : graded ? "Re-check ratings (grades)" : "Request credit ratings (ask for grades)"}</button>
            {reviewing && <span className="pinging dim">S&P and Moody's (simulated) are running their stress tests</span>}
          </div>
          {graded && !reviewing && (
            <div style={{ marginTop: 14 }}>
              <Tbl right={[1, 2, 4]} cols={["Tranche (floor)", "Credit enhancement (cushion)", "Stress multiple (storm it survives)", "Rating (grade)", "Expected spread (extra pay buyers want)"]} rows={[0, 1, 2].map((i) => [<span key={i}><span className="sw" style={{ background: TC[i] }} />{FL[i]}</span>, pc(cushion[i]), `${mult[i] > 99 ? "99+" : mult[i].toFixed(1)}x`, <Rating key={"g" + i} g={grades[i]} />, `~${Math.round(FAIR[grades[i]] * A.fairK)} bps`])} />
              <div className="p dim" style={{ marginTop: 8 }}>Lower ratings scare off cautious buyers, so those tranches must offer a wider <Term k="spread">spread (extra pay)</Term> over the benchmark rate, counted in <Term k="bps">basis points, bps (hundredths of a percent)</Term>. Real deals also add <Term k="trigger">performance triggers (tripwires)</Term> and allow a <Term k="stepdown">step-down (cushion release)</Term> later.</div>
            </div>
          )}
        </Panel>
        <Panel title="Stress scenarios vs. your capital structure (flood lines vs. your building)">
          <CapitalStack layers={stackLayers(false)} floods={floods} height={340} />
        </Panel>
      </div>
    </>
  );

  const closeDeal = (): void => {
    setClosed(true); award("closed");
    if (book.every((x) => x.cover <= 2.5)) award("sweet");
    toast("Deal priced and closed", `${nr(A.orig, lr(A))} receives ${fm(B * (a + b + c) / 100)} for the bonds.`, "good");
  };
  const S5 = (): ReactNode => (
    <>
      <div className="gauges" style={{ marginBottom: 12 }}>
        {[0, 1, 2].map((i) => <Panel key={i} title={<span><span className="sw" style={{ background: TC[i] }} />{FLS[i]} {"\u00b7"} <Rating g={grades[i]} /></span>} right={<span className="num dim">{fm(book[i].size)}</span>}><Gauge v={book[i].cover * Math.min(1, bookT * 1.4)} label={"Oversubscription (orders \u00f7 bonds for sale)"} /></Panel>)}
      </div>
      <div className="grid g2">
        <Panel title="Price the tranches: set the spread (extra pay)">
          {[0, 1, 2].map((i) => (
            <Slider key={i} label={<span>{FL[i]}, {gname(grades[i])}: <Term k="spread">spread</Term></span>} value={spreads[i]} min={[20, 40, 80][i]} max={[300, 600, 1000][i]} step={5} fmt={(v) => `${v} bps = ${pc(BENCH * 100 + v / 100, 2)}`} onChange={(v) => { if (closed) return; const n = spreads.slice(); n[i] = v; setSpreads(n); }} />
          ))}
          <div className="p dim"><Term k="coupon">Coupon (interest paid)</Term> = <Term k="benchmark">benchmark rate (safe rate)</Term> 4.00% + spread. A tighter spread leaves more <Term k="xs">excess spread (leftover interest)</Term> for {nr(A.short, lr(A))}: now {pc(xs, 2)} a year, about {fm((xs / 100) * B)}.</div>
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button className="btn primary lg" disabled={!allCovered || closed} onClick={closeDeal}>{closed ? "\u2713 Deal priced and closed" : "Price and close the deal"}</button>
            {closed && <button className="btn" onClick={() => setClosed(false)}>Reopen to re-price</button>}
            {closed && <button className="btn" onClick={() => setStage(6)}>Go to the trading floor {"\u2192"}</button>}
          </div>
        </Panel>
        <Panel title="Live order book (investors calling in)" tight right={<span className="dim">{DEALER.split(" (")[0]} book-building</span>}>
          <div className="book-row" style={{ fontSize: 10.5, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em" }}><span>Investor</span><span>Senior</span><span>Mezzanine</span><span>Junior</span></div>
          {INV.map((v, j) => (
            <div key={v.name} className="book-row">
              <span title={v.type}><b style={{ fontWeight: 650 }}>{v.name}</b><br /><span className="dim" style={{ fontSize: 11 }}>{v.type.split(":")[0]}</span></span>
              {[0, 1, 2].map((i) => {
                const o = book[i].orders[j];
                const w = o.ok && book[i].size > 0 ? Math.min(100, (o.amt / book[i].size) * 100 * fillFrac(j)) : 0;
                return (
                  <div key={i} className="book-cell" title={!o.likes ? "Outside mandate (not their style)" : o.ok ? `${fm(o.amt)} order` : `Wants ${Math.ceil(o.resv)}+ bps spread`}>
                    <i style={{ width: `${w}%`, background: TC[i] }} />
                    <span className={o.ok ? "num" : "dim"}>{!o.likes ? "Outside mandate" : o.ok ? (fillFrac(j) > 0.05 ? fm(o.amt * fillFrac(j)) : "\u2026") : `Wants ${Math.ceil(o.resv)}+ bps`}</span>
                  </div>
                );
              })}
            </div>
          ))}
          <div className="p dim" style={{ padding: "8px 12px" }}>{DEALER} is <Term k="book">book-building (taking orders)</Term>. Aim for 1x to 2.5x <Term k="oversub">oversubscription (orders vs. supply)</Term> on every tranche.</div>
        </Panel>
      </div>
    </>
  );

  const est = tkPx();
  const estAmt = est.ok ? tkSize * est.px * 1e4 : 0;
  const S6 = (): ReactNode => !mk.started ? (
    <div className="grid g2">
      <Panel title={`Secondary trading at ${MM}`}>
        <div className="p">You get $10M of mock cash. {MM} quotes a <Term k="bid">bid (price you can sell at)</Term> and a slightly higher <Term k="ask">ask (price you can buy at)</Term> for each tranche of your {A.name.toLowerCase()} deal. Prices are quoted <Term k="price">per 100 (per $100 owed)</Term>. Trade $1M, $2M or $5M at a time with market or limit orders, and you can also <Term k="short">short (bet a tranche drops)</Term> by selling up to $5M you don't own. News is tailored to {A.name.toLowerCase()}.</div>
        <button className="btn primary lg" style={{ marginTop: 12 }} onClick={openMarket}>Open secondary trading (the trading floor)</button>
      </Panel>
      <Panel title="How the trading floor works">
        <div className="rows">
          {[["Quotes board", "Bid and ask for each tranche, flashing green or red as prices move."], ["Order ticket", "Choose Buy or Sell, a size and Market (fill now) or Limit (only at your price or better)."], ["Depth (level 2)", "The market maker's ladder of prices. Bigger orders walk down it and get a worse average price."], ["Positions", "What you hold, your average cost, and unrealized vs. realized P&L (paper vs. locked-in profit)."]].map((r) => <div key={r[0]} className="rw"><div className="tt">{r[0]}</div><div className="dd">{r[1]}</div></div>)}
        </div>
      </Panel>
    </div>
  ) : (
    <>
      <div className="metrics" style={{ marginBottom: 12 }}>
        <Metric k="Cash" v={fm(mk.cash)} />
        <Metric k={<Term k="mark">Mark-to-market</Term>} v={fm(holdVal)} d="holdings worth today" />
        <Metric k={<Term k="pnl">P&amp;L</Term>} v={fmS(pnlT)} tone={pnl >= 0 ? "up" : "down"} d={`realized ${fmS(mk.realized)} \u00b7 coupons ${fm(mk.income)}`} />
        <Metric k={<Term k="benchmark">Benchmark rate</Term>} v={pc(mk.bench * 100, 2)} />
        <Metric k="Unemployment" v={pc(mk.unemp)} tone={mk.unemp > 5 ? "down" : undefined} />
        <Metric k={A.rev ? "Payment speed" : "Prepay speed"} v={`${mk.cprM.toFixed(2)}x`} d="vs. normal" />
      </div>
      <div className="grid g-trade">
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          <Panel title={`Quotes \u00b7 ${MM}`} tight tour="quotes" right={<span className="num dim">M{mk.m}</span>}>
            <div className="quote-row" style={{ cursor: "default", fontSize: 10.5, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em" }}><span>Tranche</span><span className="r">Bid</span><span className="r">Ask</span><span className="r">Chg</span><span className="r">Spread</span></div>
            {[0, 1, 2].map((i) => { const tk = tick(i); return (
              <div key={i + "-" + mk.m} className={"quote-row" + (i === tkFl ? " on" : "")} onClick={() => setTkFl(i)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") setTkFl(i); }}>
                <span><span className="qn"><span className="sw" style={{ background: TC[i] }} />{FLS[i]}</span> <Rating g={grades[i]} /><br /><span className="qs"><Spark vals={mk.hist.map((h) => h.px[i])} color={TC[i]} /></span></span>
                <span className={"num cell-px up " + tk.flash} style={{ textAlign: "right" }}>{(mids[i] - hw[i]).toFixed(2)}</span>
                <span className={"num cell-px down " + tk.flash} style={{ textAlign: "right" }}>{(mids[i] + hw[i]).toFixed(2)}</span>
                <span className={"num " + tk.cls} style={{ textAlign: "right" }}>{(tk.ch >= 0 ? "+" : "") + tk.ch.toFixed(2)}</span>
                <span className="num dim" style={{ textAlign: "right" }}>{mk.mkt[i].toFixed(0)} bp</span>
              </div>
            ); })}
          </Panel>
          <Panel title={<span>{FL[tkFl]} <span className="dim">{"\u00b7 mid per 100"}</span></span>} tight right={
            <div style={{ display: "flex", gap: 6 }}>
              <Seg label="Chart type" value={chartMode} onChange={setChartMode} options={[{ value: "candle", label: "Candles" }, { value: "line", label: "Line" }]} />
              <Seg label="Timeframe" value={String(tf)} onChange={(v) => setTf(Number(v))} options={[{ value: "6", label: "6M" }, { value: "12", label: "1Y" }, { value: "0", label: "All" }]} />
            </div>
          }>
            <PriceChart hist={mk.hist} sel={tkFl} mode={chartMode} tf={tf} vol={hw[tkFl]} />
            <div className="p dim" style={{ padding: "6px 12px 10px" }}>Junior tranches swing more on bad news; tranches with a longer WAL swing more on rate news (<Term k="dv01">duration (rate sensitivity)</Term>). Holding a tranche also pays you its monthly interest in cash.</div>
          </Panel>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          <Panel title="Order ticket" className="ticket" tour="ticket">
            <Seg className="seg-side" label="Side" value={tkSide} onChange={setTkSide} options={[{ value: "Buy", label: "Buy", cls: "buy" }, { value: "Sell", label: "Sell", cls: "sell" }]} />
            <div className="field" style={{ marginTop: 10 }}><label>Tranche (floor)</label>
              <Seg label="Tranche" value={String(tkFl)} onChange={(v) => setTkFl(Number(v))} options={FLS.map((f, i) => ({ value: String(i), label: f }))} />
            </div>
            <div className="field"><label>Size (face value)</label>
              <Seg label="Size" value={String(tkSize)} onChange={(v) => setTkSize(Number(v))} options={[1, 2, 5].map((s) => ({ value: String(s), label: `$${s}M` }))} />
            </div>
            <div className="field"><label>Order type</label>
              <Seg label="Order type" value={tkType} onChange={setTkType} options={[{ value: "Market", label: "Market" }, { value: "Limit", label: "Limit" }]} />
            </div>
            {tkType === "Limit" && <div className="field"><label htmlFor="lim">Limit price (per 100)</label><input id="lim" className="input num" inputMode="decimal" placeholder={(tkSide === "Buy" ? mids[tkFl] - hw[tkFl] : mids[tkFl] + hw[tkFl]).toFixed(2)} value={tkLimit} onChange={(e) => setTkLimit(e.target.value)} /></div>}
            <div className="est num">
              <span className="dim">{tkType === "Market" ? "Est. avg price" : "Limit price"}</span><span>{est.ok ? est.px.toFixed(3) : "\u2014"}</span>
              <span className="dim">Est. {tkSide === "Buy" ? "cost" : "proceeds"}</span><span>{est.ok ? fm(estAmt) : "\u2014"}</span>
              <span className="dim">Position after</span><span>{`$${mk.pos[tkFl] + (tkSide === "Buy" ? tkSize : -tkSize)}M`}</span>
            </div>
            <button className={"btn lg block " + (tkSide === "Buy" ? "buy" : "sell")} onClick={() => submit()}>{tkSide} ${tkSize}M {FLS[tkFl]} <span className="kbd">{tkSide === "Buy" ? "B" : "S"}</span></button>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button className="btn primary" style={{ flex: 1 }} onClick={nextMonth}>Next month <span className="kbd">N</span></button>
              <button className={"btn" + (auto ? " primary" : "")} onClick={() => setAuto(!auto)} aria-pressed={auto}>{auto ? "\u23f8 Auto" : "\u25b6 Auto"} <span className="kbd">P</span></button>
            </div>
          </Panel>
          <Panel title="Depth (level 2)" tight right={<span className="dim">{FLS[tkFl]}</span>}>
            {(() => { const d = depthFor(mk, tkFl, mids[tkFl]); const mx = Math.max(...d.bids.map((x) => x.sz), ...d.asks.map((x) => x.sz)); return (
              <table className="depth">
                <thead><tr><th style={{ textAlign: "right" }}>Size</th><th style={{ textAlign: "right" }}>Bid</th><th>Ask</th><th>Size</th></tr></thead>
                <tbody>{d.bids.map((bl, k) => { const al = d.asks[k]; return (
                  <tr key={k}>
                    <td style={{ textAlign: "right" }}><i className="bar-b" style={{ width: `${(bl.sz / mx) * 100}%` }} /><span className="num">{bl.sz}M</span></td>
                    <td style={{ textAlign: "right" }}><span className="num up">{bl.px.toFixed(2)}</span></td>
                    <td><span className="num down">{al.px.toFixed(2)}</span></td>
                    <td><i className="bar-a" style={{ width: `${(al.sz / mx) * 100}%` }} /><span className="num">{al.sz}M</span></td>
                  </tr>); })}</tbody>
              </table>); })()}
          </Panel>
        </div>
      </div>
      <Panel title="Positions" tight style={{ marginTop: 12 }}>
        <Tbl right={[1, 2, 3, 4, 5]} cols={["Tranche (floor)", "Position", "Avg cost", "Mark (mid)", "Unrealized P&L", "Coupon / mo"]} rows={[0, 1, 2].map((i) => [<span key={i}><span className="sw" style={{ background: TC[i] }} />{FL[i]}</span>, mk.pos[i] === 0 ? "\u2014" : `${mk.pos[i] < 0 ? "short " : ""}$${Math.abs(mk.pos[i])}M`, mk.pos[i] === 0 ? "\u2014" : mk.avg[i].toFixed(3), mids[i].toFixed(3), <span key={"u" + i} className={unreal[i] > 0 ? "up" : unreal[i] < 0 ? "down" : "dim"}>{mk.pos[i] === 0 ? "\u2014" : fmS(unreal[i])}</span>, fm((mk.pos[i] * 1e6 * coupons[i]) / 12)])} />
      </Panel>
      <div style={{ marginTop: 10 }}><button className="btn sm" onClick={openMarket}>Restart market</button></div>
    </>
  );

  const S7 = (): ReactNode => {
    const r = mrow;
    const mx = r ? Math.max(1, r.collected) : 1;
    const wf: { l: string; v: number; color: string; src?: boolean }[] = r ? [
      { l: `Collected by ${A.serv}`, v: r.collected, color: "var(--accent)", src: true },
      { l: "Lost to defaults (after recoveries)", v: r.loss, color: "var(--down)" },
      { l: "Servicer fee (paid first)", v: r.fee, color: "var(--t4)" },
      ...[0, 1, 2].map((i) => ({ l: `Interest \u2192 ${FLS[i]}`, v: r.intPaid[i], color: TC[i] })),
      ...[0, 1, 2].map((i) => ({ l: `Principal \u2192 ${FLS[i]}`, v: r.prinPaid[i], color: TC[i] })),
      { l: r.reserveDraw > 0 ? "Reserve account used" : "Reserve account balance", v: r.reserveDraw > 0 ? r.reserveDraw : r.reserve, color: "var(--amber)" },
      { l: `Residual \u2192 ${A.short} (owner's slice)`, v: r.toEquity, color: "var(--t3)" },
    ] : [];
    return (
      <>
        <Panel title={`Stress test (pick a storm) for ${A.name.toLowerCase()}`}>
          <Seg label="Stress scenario" value={preset} onChange={pickPreset} options={[...A.presets.map((p, i) => ({ value: String(i), label: p[0] })), { value: "custom", label: "Custom" }]} />
          <div className="grid g3" style={{ marginTop: 12 }}>
            <Slider label={<Term k="cdr" />} value={Number(sv[0].toFixed(1))} min={0} max={40} step={0.5} fmt={(v) => `${v}% / yr`} onChange={(v) => setSv(0, v)} />
            {A.rev ? <Slider label={<Term k="mpr" />} value={sv[1]} min={3} max={40} step={1} fmt={(v) => `${v}% / month`} onChange={(v) => setSv(1, v)} />
              : <Slider label={<Term k="cpr" />} value={sv[1]} min={0} max={40} step={1} fmt={(v) => `${v}% / yr`} onChange={(v) => setSv(1, v)} />}
            <Slider label={<Term k="sev" />} value={sv[2]} min={0} max={98} step={1} fmt={(v) => `${v}%`} onChange={(v) => setSv(2, v)} />
          </div>
        </Panel>
        <div className="metrics" style={{ margin: "12px 0" }}>
          {[0, 1, 2].map((i) => { const o = sRun.tr[i]; const lp = trs[i].size > 0 ? (o.loss / trs[i].size) * 100 : 0; return <Metric key={i} k={<span><span className="sw" style={{ background: TC[i] }} />{FLS[i]} tranche</span>} v={lp < 0.01 ? "Paid in full" : `Lost ${pc(lp)}`} tone={lp < 0.01 ? "up" : lp < 50 ? "amber" : "down"} d={`WAL ${o.wal.toFixed(1)} yrs`} />; })}
          <Metric k="Collateral losses" v={fm(sRun.poolLoss)} d={pc((sRun.poolLoss / B) * 100) + " of the basket"} tone="down" />
          <Metric k="Residual to owner" v={fm(sRun.equity)} d={nr(A.short, lr(A))} />
          {A.rev && <Metric k={<Term k="earlyam">Early amortization</Term>} v={sRun.early > 0 ? `M${sRun.early}` : "Never"} tone={sRun.early > 0 ? "amber" : "up"} />}
        </div>
        <div className="grid g2">
          <Panel title={<span>Waterfall <span className="dim">{"\u00b7"} month {mNow} of {term}</span></span>} tour="waterfall" right={r && r.shortfall > 0 ? <Tag tone="bad">Credit enhancement breached</Tag> : r && r.loss > 0 ? <Tag tone="warn">Losses</Tag> : <Tag tone="ok">All paid</Tag>}>
            <div className="player" style={{ marginBottom: 12 }}>
              <button className="btn primary sm" onClick={() => { if (mNow >= term) setMonth(1); setPlaying(!playing); }} aria-label={playing ? "Pause" : "Play"}>{playing ? "\u23f8 Pause" : "\u25b6 Play"}</button>
              <button className="btn sm" onClick={() => setMonth(Math.max(1, mNow - 1))} aria-label="Previous month">{"\u25c0"}</button>
              <button className="btn sm" onClick={() => setMonth(Math.min(term, mNow + 1))} aria-label="Next month">{"\u25b6"}</button>
              <input type="range" min={1} max={term} value={mNow} onChange={(e) => { setPlaying(false); setMonth(Number(e.target.value)); }} aria-label="Month" />
              <Seg label="Playback speed" value={speed} onChange={setSpeed} options={[{ value: "1", label: "1x" }, { value: "2", label: "2x" }, { value: "4", label: "4x" }]} />
            </div>
            <div className="wf">
              {wf.map((w) => (
                <div key={w.l} className={"wf-row" + (w.src ? " src" : "")}>
                  <span className="wl" title={w.l}>{w.l}</span>
                  <span className="wf-track"><i style={{ width: `${Math.min(100, (w.v / mx) * 100)}%`, background: w.color }} /></span>
                  <span className="wv num">{fm(w.v)}</span>
                </div>
              ))}
            </div>
            {r && <div className="p dim" style={{ marginTop: 10 }}>{fm(r.defaults)} defaulted (went bad); {fm(r.recovery)} was recovered by {A.recover}.{r.refilling ? ` Repayments this month bought new ${A.thing} (refilling).` : ""} {TRUSTEE} checks that {nr(A.trust, SPV_ROLE)} follows the payment order at each step.{r.shortfall > 0 ? ` Tranches are owed ${fm(r.shortfall)} more than the collateral pool holds; the junior tranche is first in line to lose it.` : ""}</div>}
          </Panel>
          <Panel title="Outstanding balance by tranche (money still owed to each floor)" right={<span className="dim">click to seek</span>}>
            <BalanceChart series={[0, 1, 2].map((i) => sRun.months.map((m) => m.bal[i]))} months={term} at={mNow} onSeek={(m) => { setPlaying(false); setMonth(m); }} />
            <div className="legend" style={{ marginTop: 6 }}>{[0, 1, 2].map((i) => <span key={i}><span className="sw" style={{ background: TC[i] }} />{FL[i]}</span>)}</div>
          </Panel>
        </div>
        <Panel title="Tranche results (who got paid back)" tight style={{ marginTop: 12 }}>
          <Tbl right={[1, 2, 3, 4, 5]} cols={["Tranche (floor)", "Size", "Interest received", "Principal repaid (paid back)", "Principal lost", "WAL (avg wait)", "Result"]} rows={[0, 1, 2].map((i) => { const o = sRun.tr[i]; const lp = trs[i].size > 0 ? (o.loss / trs[i].size) * 100 : 0; return [<span key={i}><span className="sw" style={{ background: TC[i] }} />{FL[i]}</span>, fm(trs[i].size), fm(o.int), fm(o.prin), fm(o.loss), `${o.wal.toFixed(1)} yrs`, <Tag key={"t" + i} tone={lp < 0.01 ? "ok" : lp < 50 ? "warn" : "bad"}>{lp < 0.01 ? "Paid in full" : `Lost ${pc(lp)}`}</Tag>]; })} />
        </Panel>
        <div className="p dim" style={{ marginTop: 10 }}>The residual / equity tranche (owner's slice), kept by {nr(A.orig, lr(A))}, received {fm(sRun.equity)} in leftover money over the deal's life.{A.rev ? (sRun.early > 0 ? ` The early amortization trigger (tripwire) fired in month ${sRun.early}.` : " The early amortization trigger (tripwire) never fired.") : ""}</div>
      </>
    );
  };

  // ================= shell =================
  const screens = [S0, S1, S2, S3, S4, S5, S6, S7];
  const tape: { t: string; d: string; tone?: string }[] = mk.started
    ? [...[0, 1, 2].map((i) => { const tk = tick(i); return { t: `${A.tk.toUpperCase()} ${FLS[i].toUpperCase()} ${mids[i].toFixed(2)}`, d: (tk.ch >= 0 ? "\u25b2" : "\u25bc") + Math.abs(tk.ch).toFixed(2), tone: tk.cls }; }), { t: "BENCHMARK", d: pc(mk.bench * 100, 2) }, { t: "UNEMPLOYMENT", d: pc(mk.unemp) }, ...mk.news.slice(0, 5).map((n) => ({ t: `M${n.m}`, d: n.title, tone: n.tone === "bad" ? "down" : n.tone === "good" ? "up" : "" }))]
    : [{ t: "BOND LAB", d: "Practice desk: real names for realism only; every deal, price and data point is made up; no affiliation or endorsement" }, { t: "DEAL", d: A.trust }, { t: "ASSET", d: proName(A) }, { t: "POOL", d: fm(B) }, { t: "EXPECTED NET LOSS", d: pc(el, 2) }, { t: "SENIOR", d: `${a}% \u00b7 ${gname(grades[0])}` }, { t: "STATUS", d: closed ? "Priced and closed" : graded ? "Rated, ready to price" : "Structuring" }];
  const dictKeys = Object.keys(G).filter((k) => { const q = dictQ.trim().toLowerCase(); return !q || G[k].some((s) => s.toLowerCase().includes(q)); }).sort((x, y) => G[x][0].localeCompare(G[y][0]));
  const stageDone = (i: number) => i < maxSeen || (i === 4 && graded) || (i === 5 && closed);
  const hd = STAGE_SHORT[stage];

  const coachPanel = (
    <aside className="side" data-tour="coach" aria-label="Coach and dictionary">
      <div className="side-tabs" role="tablist">
        <button className="icon-btn side-collapse" onClick={() => setSideOpen(!sideOpen)} aria-label={sideOpen ? "Collapse coach panel" : "Expand coach panel"} title="Toggle panel (C)">{sideOpen ? "\u203a" : "\u2039"}</button>
        <button role="tab" aria-selected={sideTab === "coach"} className={"tab" + (sideTab === "coach" ? " on" : "")} onClick={() => setSideTab("coach")}>Coach</button>
        <button role="tab" aria-selected={sideTab === "dict"} className={"tab" + (sideTab === "dict" ? " on" : "")} onClick={() => setSideTab("dict")}>Dictionary</button>
      </div>
      <div className="side-body">
        {sideTab === "coach" ? (
          <>
            <div className="coach-card">
              <div className="cl"><span className="avatar">{"\u2726"}</span>{isX ? "Exchange coach" : "Coach"} {"\u00b7"} step {(isX ? X.stage : stage) + 1}</div>
              <div className="coach-msg" key={isX ? X.coach : coach}>{isX ? X.coach : coach}</div>
            </div>
            <div className="coach-card">
              <div className="cl">Key terms for this step</div>
              {(isX ? X.terms : STAGE_TERMS[stage]).filter((k) => G[k]).map((k) => <div key={k} className="dict-item"><div className="di-t">{G[k][0]}</div><div className="di-a">{G[k][1]}</div><div className="di-e">{G[k][2]}</div></div>)}
            </div>
            <div className="coach-card">
              <div className="cl">Quick check {"\u00b7"} +20 XP</div>
              {isX ? <QuizBlock q={X.quiz} ans={X.quizAns} onAns={X.answer} /> : <QuizBlock q={QUIZ[stage]} ans={quiz[stage]} onAns={answer} />}
            </div>
          </>
        ) : (
          <>
            <input className="input" placeholder={`Search ${Object.keys(G).length} terms\u2026`} value={dictQ} onChange={(e) => setDictQ(e.target.value)} aria-label="Search the dictionary" />
            <div>{dictKeys.map((k) => <div key={k} className="dict-item"><div className="di-t">{G[k][0]}</div><div className="di-a">{G[k][1]}</div><div className="di-e">{G[k][2]}</div></div>)}{dictKeys.length === 0 && <div className="empty">No terms match.</div>}</div>
          </>
        )}
      </div>
    </aside>
  );

  const blotter = mk.trades.length === 0 ? <div className="empty">No trades yet. Your fills will appear here.</div> : (
    <Tbl right={[0, 4, 5, 6]} cols={["Month", "Side", "Tranche (floor)", "Type", "Size", "Price", "Realized P&L"]} rows={mk.trades.slice(0, 40).map((t) => [`M${t.m}`, <span key={t.id} className={t.side === "Buy" ? "up" : "down"}>{t.side === "Buy" ? "Bought" : "Sold"}</span>, FL[t.fl], t.kind, `$${t.size}M`, t.px.toFixed(3), t.pnl ? <span key={"p" + t.id} className={t.pnl > 0 ? "up" : "down"}>{fmS(t.pnl)}</span> : "\u2014"])} />
  );
  const ordersTab = mk.orders.length === 0 ? <div className="empty">No working limit orders. Choose Limit on the order ticket to rest one.</div> : (
    <Tbl right={[3, 4]} cols={["Placed", "Side", "Tranche (floor)", "Size", "Limit", ""]} rows={mk.orders.map((o) => [`M${o.m}`, <span key={o.id} className={o.side === "Buy" ? "up" : "down"}>{o.side}</span>, FL[o.fl], `$${o.size}M`, o.limit.toFixed(2), <button key={"c" + o.id} className="btn sm" onClick={() => { setMk({ ...mk, orders: mk.orders.filter((x) => x.id !== o.id) }); toast("Order cancelled"); }}>Cancel</button>])} />
  );
  const newsTab = mk.news.length === 0 ? <div className="empty">The news wire starts when secondary trading opens (step 7).</div> : (
    <div className="rows" style={{ padding: "0 12px" }}>{mk.news.map((n, i) => <div key={i} className="rw rw-lead"><div className="ld num">M{n.m}</div><div><div className={"tt " + (n.tone === "bad" ? "down" : n.tone === "good" ? "up" : "")}>{n.title}</div><div className="dd">{n.detail}</div></div></div>)}</div>
  );

  const tc = tour >= 0 ? TOUR[tour] : null;
  const cardPos = ((): { left: number; top: number } => {
    const vw = typeof window !== "undefined" ? window.innerWidth : 1200, vh = typeof window !== "undefined" ? window.innerHeight : 800;
    if (!hole) return { left: Math.max(12, vw / 2 - 165), top: Math.max(12, vh / 2 - 110) };
    const W = Math.min(330, vw - 24);
    let left = hole.right + 14, top = hole.top;
    if (left + W > vw - 12) left = hole.left - W - 14;
    if (left < 12) { left = clamp(hole.left, 12, vw - W - 12); top = hole.bottom + 14 > vh - 220 ? Math.max(12, hole.top - 230) : hole.bottom + 14; }
    return { left, top: clamp(top, 12, vh - 230) };
  })();

  return (
    <div className={"app" + (sideOpen ? "" : " side-closed") + (mtab === "coach" ? " m-coach" : mtab === "tape" ? " m-tape" : "")}>
      <header className="topbar" data-tour="topbar">
        <div className="brand"><span className="logo">BL</span><span>BOND LAB</span></div>
        <div className="mode-switch" data-tour="mode" role="radiogroup" aria-label="Module">
          <button role="radio" aria-checked={!isX} className={!isX ? "on" : ""} onClick={() => setMode("deal")} title="Deal Lab: build and trade a deal (X)">Deal Lab</button>
          <button role="radio" aria-checked={isX} className={isX ? "on" : ""} onClick={() => setMode("exchange")} title="Exchange Builder: design a new ABS exchange (X)">Exchange Builder</button>
        </div>
        {isX ? X.top.map((c) => <div key={c.k} className={"tb-cell" + (c.hide ? " tb-hide-sm" : "")} style={{ maxWidth: 230 }}><span className="k">{c.k}</span><span className={"v " + (c.hide ? "" : "num ") + (c.tone ?? "")}>{c.v}</span></div>) : <>
        <div className="tb-cell tb-hide-sm" style={{ maxWidth: 230 }}><span className="k">Deal</span><span className="v">{A.trust}</span></div>
        <div className="tb-cell tb-hide-sm tb-hide-md"><span className="k">Asset class</span><span className="v">{proName(A)}</span></div>
        <div className="tb-cell"><span className="k">Cash</span><span className="v num">{fm(mk.cash)}</span></div>
        <div className="tb-cell"><span className="k">P&amp;L</span><span className={"v num " + (pnl > 0.5 ? "up" : pnl < -0.5 ? "down" : "muted")}>{fmS(pnlT)}</span></div></>}
        <div className="tb-cell tb-xp tb-hide-sm" title={`${xp} XP`}><span className="k">{LEVELS[li][1]} {"\u00b7"} {xp} XP</span><div className="bar"><i className="grow" style={{ width: `${Math.round(frac * 100)}%` }} /></div></div>
        <div className="tb-grow" />
        {!isX && <div className="tb-cell tb-hide-sm"><span className="k">Market</span><span className="v num"><span className="live-dot" />{mk.started ? `Month ${mk.m}` : closed ? "Closed" : "Pre-deal"}</span></div>}
        <div className="tb-cell tb-hide-sm"><span className="k">Time (local)</span><span className="v num">{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span></div>
        <button className="icon-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} title="Theme (T)">{theme === "dark" ? "\u2600" : "\u263e"}</button>
        <button className="icon-btn" onClick={() => setHelp(true)} aria-label="Keyboard shortcuts" title="Shortcuts (?)">?</button>
        <button className="icon-btn tour-btn" data-testid="tour-btn" onClick={() => startTour(0)} title="Replay the guided tour (G)" aria-label="Replay the guided tour (shortcut G)">{"\u25b6"} <span className="tour-lbl">Replay tour</span></button>
      </header>

      <nav className="rail" data-tour="rail" aria-label="Deal steps">
        <div className="rail-h"><span>{isX ? "Exchange design" : "Deal workflow"}</span><span>{isX ? `${X.maxSeen + 1}/${STAGES_X.length}` : `${Math.min(maxSeen + 1, 8)}/8`}</span></div>
        {isX && STAGES_X.map((s, i) => (
          <button key={s} className={"stage-btn" + (i === X.stage ? " on" : "") + (i < X.maxSeen && i !== X.stage ? " done" : "")} onClick={() => X.setStage(i)} aria-current={i === X.stage ? "step" : undefined} title={s} aria-label={`Step ${i + 1}: ${s}`}>
            <span className="n">{i < X.maxSeen && i !== X.stage ? "\u2713" : i + 1}</span>
            <span><span className="t" style={{ display: "block" }}>{SHORT_X[i][0]}</span><span className="s" style={{ display: "block" }}>{SHORT_X[i][1]}</span></span>
          </button>))}
        {!isX && STAGES.map((s, i) => { const lk = lockReason(i); return (
          <button key={s} className={"stage-btn" + (i === stage ? " on" : "") + (stageDone(i) && i !== stage ? " done" : "")} onClick={() => setStage(i)} aria-current={i === stage ? "step" : undefined} title={lk ?? s} aria-label={`Step ${i + 1}: ${s}${lk ? " (locked)" : ""}`} style={lk ? { opacity: 0.55 } : undefined}>
            <span className="n">{lk ? "\ud83d\udd12" : stageDone(i) && i !== stage ? "\u2713" : i + 1}</span>
            <span><span className="t" style={{ display: "block" }}>{STAGE_SHORT[i][0]}</span><span className="s" style={{ display: "block" }}>{STAGE_SHORT[i][1]}</span></span>
          </button>); })}
        <div className="rail-foot">
          <div className="hide-n dim" style={{ fontSize: 11 }}>Badges {badges.length}</div>
          <div className="badges">{badges.length ? badges.map((x) => <span key={x} className="badge">{"\u2605 "}{x}</span>) : <span className="dim" style={{ fontSize: 11 }}>Earn badges as you go</span>}</div>
        </div>
      </nav>

      <div className="stage-strip" aria-label="Deal steps">
        {isX && STAGES_X.map((s, i) => <button key={s} className={"chip" + (i === X.stage ? " on" : i < X.maxSeen ? " ok" : "")} onClick={() => X.setStage(i)} aria-label={`Step ${i + 1}: ${s}`}>{i + 1}. {SHORT_X[i][0]}</button>)}
        {!isX && STAGES.map((s, i) => <button key={s} className={"chip" + (i === stage ? " on" : stageDone(i) ? " ok" : "")} onClick={() => setStage(i)} aria-label={`Step ${i + 1}: ${s}`}>{lockReason(i) ? "\ud83d\udd12 " : ""}{i + 1}. {STAGE_SHORT[i][0]}</button>)}
      </div>

      <main className="main" data-tour="workspace" id="workspace">
        {isX ? <>
        <div className="ws-head">
          <div><div className="crumb">Exchange Builder {"\u00b7"} step {X.stage + 1} of {STAGES_X.length} {"\u00b7"} synthetic model, real names for realism, fictional exchange</div><h1>{STAGES_X[X.stage]}</h1></div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn sm" disabled={X.stage === 0} onClick={() => X.setStage(X.stage - 1)} aria-label="Previous step">{"\u2190"} <span className="kbd">[</span></button>
            <button className="btn sm" disabled={X.stage === STAGES_X.length - 1} onClick={() => X.setStage(X.stage + 1)} aria-label="Next step"><span className="kbd">]</span> {"\u2192"}</button>
          </div>
        </div>
        <div className="m-only callout" style={{ marginBottom: 12 }}><div className="cl">Coach</div>{X.coach}</div>
        <div key={"x" + X.stage} style={{ animation: "fadeIn .25s ease" }}>{X.screen()}</div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          <button className="btn" disabled={X.stage === 0} onClick={() => X.setStage(X.stage - 1)}>{"\u2190 Back"}</button>
          {X.stage < STAGES_X.length - 1 ? <button className="btn primary" onClick={() => X.setStage(X.stage + 1)}>{"Next: " + STAGES_X[X.stage + 1] + " \u2192"}</button> : <button className="btn primary" onClick={() => setMode("deal")}>Back to Deal Lab</button>}
        </div>
        <div className="m-only" style={{ marginTop: 16 }}><Panel title={`Quick check: step ${X.stage + 1}`}><QuizBlock q={X.quiz} ans={X.quizAns} onAns={X.answer} /></Panel></div>
        </> : <>
        <div className="ws-head">
          <div><div className="crumb">Step {stage + 1} of 8 {"\u00b7"} {proName(A)}</div><h1>{STAGES[stage]}</h1></div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn sm" disabled={stage === 0} onClick={() => setStage(stage - 1)} aria-label="Previous step">{"\u2190"} <span className="kbd">[</span></button>
            <button className="btn sm" disabled={stage === 7} onClick={() => setStage(stage + 1)} aria-label="Next step"><span className="kbd">]</span> {"\u2192"}</button>
          </div>
        </div>
        <div className="m-only callout" style={{ marginBottom: 12 }}><div className="cl">Coach</div>{coach}</div>
        <div key={stage + aid} style={{ animation: "fadeIn .25s ease" }}>{screens[stage]()}</div>
        {moveOn}
        <div className="m-only" style={{ marginTop: 16 }}><Panel title={`Quick check: step ${stage + 1}`}><QuizBlock q={QUIZ[stage]} ans={quiz[stage]} onAns={answer} /></Panel></div>
        </>}
        <footer className="legal app-legal">{DISCLAIMER}{isX ? " Lighthouse ABS Exchange is a fictional venue." : ""}</footer>
      </main>

      {coachPanel}

      <footer className="tape" data-tour="tape">
        <div className="ticker" aria-label="News ticker">
          <span className="lbl">{isX ? "DESIGN" : mk.started ? "LIVE" : "DESK"}</span>
          <div className="track" key={mode} style={{ ["--dur" as string]: `${Math.max(30, (isX ? X.tape : tape).length * 7)}s` }}>
            {(isX ? [...X.tape, ...X.tape] : [...tape, ...tape]).map((x, i) => <span key={i} className="it" aria-hidden={i >= (isX ? X.tape : tape).length}><b>{x.t}</b> <span className={x.tone ?? ""}>{x.d}</span></span>)}
          </div>
        </div>
        {!isX && <div className={"dock" + (dockOpen ? "" : " closed")}>
          <div className="dock-tabs" role="tablist">
            {([["blotter", `Trade blotter (${mk.trades.length})`], ["orders", `Working orders (${mk.orders.length})`], ["news", "News wire"]] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={dock === k} className={"tab" + (dock === k ? " on" : "")} onClick={() => { setDock(k); setDockOpen(true); }}>{l}</button>)}
            <div style={{ flex: 1 }} />
            <span className="dim tb-hide-sm" style={{ fontSize: 11, marginRight: 8 }}>Press <span className="kbd">?</span> for shortcuts</span>
            <button className="icon-btn" style={{ height: 24 }} onClick={() => setDockOpen(!dockOpen)} aria-label={dockOpen ? "Collapse dock" : "Expand dock"}>{dockOpen ? "\u25be" : "\u25b4"}</button>
          </div>
          {dockOpen && <div className="dock-body">{dock === "blotter" ? blotter : dock === "orders" ? ordersTab : newsTab}</div>}
        </div>}
      </footer>

      <nav className="mtabs" aria-label="Sections">
        {([["work", "Workspace"], ["coach", "Coach"], ["tape", isX ? "Tape" : "Blotter & news"]] as const).map(([k, l]) => <button key={k} className={mtab === k ? "on" : ""} onClick={() => { setMtab(k); if (k === "coach") setSideOpen(true); }} aria-pressed={mtab === k}>{l}</button>)}
        <button onClick={() => startTour(0)} aria-label="Replay the guided tour" title="Replay the guided tour">{"\u25b6"} Tour</button>
      </nav>

      <Toasts items={toasts} />

      {help && (
        <div className="scrim" onClick={() => setHelp(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" onClick={(e) => e.stopPropagation()}>
            <div className="modal-h"><h3>Keyboard shortcuts</h3><button className="icon-btn" onClick={() => setHelp(false)} aria-label="Close">{"\u2715"}</button></div>
            <div className="modal-b keys">
              {[["?", "Show or hide this help"], ["Esc", "Close dialogs"], ["[  ]", "Previous / next step"], ["1 \u2013 8", "Jump to a step (also in Exchange Builder)"], ["T", "Light / dark mode"], ["X", "Switch module: Deal Lab / Exchange Builder"], ["G", "Replay the guided tour (also the Replay tour button in the top bar)"], ["\u2190 \u2192", "Back / next while the tour is open"], ["C", "Show / hide the coach panel"], ["D", "Open the dictionary"], ["B / S", "Buy / sell on the trading floor (step 7)"], ["N", "Next month (trading) or next waterfall month (stress test)"], ["P", "Auto-advance (trading) or play / pause (stress test)"]].map(([k, d]) => [<span key={k} className="kbd">{k}</span>, <span key={d}>{d}</span>])}
            </div>
            <div className="modal-b" style={{ borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                <b>Guided tours</b>
                <button className="btn sm primary" onClick={() => startTour(0)}>{"\u25b6"} Replay tour from the start</button>
              </div>
              <div className="dim" style={{ fontSize: 12, marginBottom: 6 }}>Deal Lab tour: jump straight to a part</div>
              <div className="chips">{TOUR_D.map((t, i) => <button key={t.title} className="chip" onClick={() => { if (isX) { setModeRaw("deal"); ls.set("bondlab.mode", "deal"); } startTour(i, "deal"); }} aria-label={`Tour step ${i + 1}: ${t.title}`}>{i + 1}. {t.title}</button>)}</div>
              <div className="dim" style={{ fontSize: 12, margin: "12px 0 6px" }}>Exchange Builder tour</div>
              <div className="chips">{X.TOUR.map((t, i) => <button key={t.title} className="chip" onClick={() => { if (!isX) { setModeRaw("exchange"); ls.set("bondlab.mode", "exchange"); } startTour(i, "exchange"); }} aria-label={`Exchange tour step ${i + 1}: ${t.title}`}>{i + 1}. {t.title}</button>)}</div>
            </div>
          </div>
        </div>
      )}

      {tc && (
        <>
          {hole ? <div className="tour-hole" style={{ left: hole.left - 4, top: hole.top - 4, width: hole.width + 8, height: hole.height + 8 }} /> : <div className="scrim" style={{ zIndex: 599 }} />}
          <div className="tour-card" role="dialog" aria-label="Tour" style={cardPos}>
            <h4>{tc.title}</h4>
            <p>{tc.body}</p>
            <div className="tf">
              <div className="dots">{TOUR.map((_, i) => <i key={i} className={i === tour ? "on" : ""} />)}</div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn sm" onClick={endTour}>Skip tour</button>
                {tour > 0 && <button className="btn sm" onClick={() => setTour(tour - 1)}>Back</button>}
                <button className="btn sm primary" onClick={() => (tour === TOUR.length - 1 ? endTour() : setTour(tour + 1))}>{tour === TOUR.length - 1 ? "Start building" : "Next"}</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
