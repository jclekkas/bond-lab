// Exchange Builder: design a new ABS exchange. All data synthetic; all firms fictional.
import { useState, useMemo, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { G, AW, clamp } from "./engine";
import type { Quiz } from "./engine";
import { Term, Panel, Metric, Seg, Switch, Slider, Tag, Props, Tbl, QuizBlock } from "./ui";
import type { Toast } from "./ui";
import { PRFAQ_BODY, PRFAQ_PDF, prfaqDocument } from "./prfaq";

// ---------- dictionary + awards ----------
Object.assign(G, {
  prfaq: ["PRFAQ (press release + FAQ)", "the launch announcement, written first", "A short future press release plus frequently asked questions, written before anything is built, so the team agrees on who the product is for, why it matters and what is still unknown."],
  otc: ["Over-the-counter, OTC", "trading by phone with a dealer", "Trades negotiated privately between two parties, usually a client and a dealer, instead of on a public order book. Most ABS trade this way today."],
  trace: ["TRACE (post-trade reporting)", "the after-the-fact price log", "A US system where dealers report bond trades after they happen, so the public can see prices with a delay. It shows what happened, not what you could trade at now."],
  venue: ["Trading venue / exchange operator", "the marketplace owner", "The company that runs the marketplace: the rules, the matching engine, membership and market data."],
  clob: ["Central limit order book, CLOB", "one shared board of bids and offers", "Everyone sends buy and sell orders to one book; the best prices match automatically, and the best bids and offers are visible."],
  rfq: ["Request for quote, RFQ", "asking a few dealers for a price", "A buyer or seller asks several dealers for a price at once and picks the best. Less visible than an order book, so big orders leak less information."],
  auction: ["Periodic auction", "trading at set times of day", "Orders are collected for a few minutes or hours and matched all at once at a single price. Concentrates liquidity and reduces speed games."],
  hybrid: ["Hybrid market structure", "a mix of models", "A venue offering more than one way to trade, e.g. an order book for small trades plus RFQ or auctions for big ones."],
  makertaker: ["Maker-taker fees", "pay to take, get paid to give", "Traders who post resting quotes (makers) get a rebate; traders who hit those quotes (takers) pay a fee."],
  rebate: ["Liquidity rebate", "a payment for quoting", "Money the exchange pays a market maker for posting prices others can trade against."],
  mmobl: ["Market-maker obligations", "the duty to keep quoting", "Rules that require registered market makers to quote both a bid and an offer most of the day, within a maximum spread, in return for perks."],
  pretrade: ["Pre-trade transparency", "seeing prices before you trade", "How much of the order book (prices and sizes) participants can see before trading."],
  posttrade: ["Post-trade transparency", "seeing prices after trades", "How quickly completed trades (price and size) are published."],
  leakage: ["Information leakage", "others guessing your plan", "When showing an order reveals that a big buyer or seller is active, so others move the price before the order is done."],
  ccp: ["Central counterparty, CCP (clearing house)", "the middleman who guarantees both sides", "After a trade, the clearing house becomes the buyer to every seller and the seller to every buyer, collecting margin so one firm's failure doesn't spread."],
  margin: ["Margin (collateral)", "a safety deposit", "Cash or bonds traders post with the clearing house that cover losses if they fail to pay."],
  custodian: ["Custodian", "the safe-keeper", "A bank that holds securities and cash for investors and handles settlement, income and corporate actions for a fee."],
  depository: ["Central securities depository / settlement", "the ownership ledger", "The institution that records who owns which securities and moves them against cash when trades settle."],
  datavendor: ["Data and pricing vendor", "the price-information seller", "Firms that collect quotes, trades and loan data and sell prices, analytics and evaluations to investors."],
  brokerdealer: ["Broker-dealer", "the trading middleman", "A firm that trades for clients (broker) and for its own account (dealer), often using its balance sheet to hold bonds."],
  buyside: ["Buy-side", "the investors", "Firms that invest money: insurers, pension funds, money managers, banks' treasuries and hedge funds."],
  liqprov: ["Liquidity provider", "the always-there trader", "A trader or firm that continuously posts bids and offers so others can trade quickly."],
  pricedisc: ["Price discovery", "finding the fair price", "How well a market's trading reveals what an asset is really worth."],
  coldstart: ["Cold-start liquidity problem", "the empty-restaurant problem", "Buyers won't come without sellers and sellers won't come without buyers, so a new market can stay empty unless someone kick-starts it."],
  anchor: ["Anchor participants", "the first big customers", "Large firms that commit to trading on a new venue at launch, often in exchange for fee breaks or an ownership stake."],
  tba: ["Agency MBS TBA (to-be-announced)", "a standard home-loan bond contract", "A forward contract on government-backed mortgage bonds where only a few features are agreed upfront, making them interchangeable and very liquid."],
  standard: ["Deal standardization", "using the same template", "Making deals look alike (structure, documents, data fields) so they are easier to compare and trade."],
  loanlevel: ["Loan-level data disclosure", "seeing every loan in the basket", "Publishing data on each underlying loan (payments, delinquencies, credit scores) instead of only pool averages."],
  listing: ["Listing standards", "the entry rules for products", "The rules a security must meet (size, documents, data, ratings) before it can trade on the venue."],
  circuit: ["Circuit breaker", "an emergency pause", "A rule that halts trading briefly when prices move too far, too fast, so people can think and add liquidity."],
  surveillance: ["Market surveillance", "the referee's video replay", "Systems and staff that watch orders and trades for manipulation or rule breaking."],
  spoofing: ["Spoofing", "fake orders to fool others", "Placing orders you intend to cancel to trick others about supply or demand. It is illegal market manipulation."],
  firesale: ["Fire sale", "selling in a panic", "Forced selling of large amounts quickly, which pushes prices far below fair value."],
  flashcrash: ["Flash crash", "a sudden price plunge", "A very fast, deep price drop and rebound, often caused by automated trading and vanishing liquidity."],
  systemic: ["Systemic risk", "one domino knocking over the rest", "The risk that a problem at one firm or market spreads to the whole financial system."],
  bestex: ["Best execution", "getting clients a fair deal", "The duty of a broker to get the best reasonably available terms for a client's order."],
});
Object.assign(AW, {
  xotc: [30, ""], xmap: [50, "Marketplace Mapper"], xflow: [20, ""], xdesign: [40, ""], xwin: [30, ""],
  xcold: [80, "Cold Start Solver"], xstress: [70, "Stress Tester"], xarch: [100, "Market Architect"],
  xq0: [20, ""], xq1: [20, ""], xq2: [20, ""], xq3: [20, ""], xq4: [20, ""], xq5: [20, ""], xq6: [20, ""], xq7: [20, ""],
});

export const STAGES_X = ["Over-the-counter vs. exchange (how it trades today)", "Market participants (the marketplace map)", "Market design (set the rules)", "Incentives (who wins, who loses)", "Cold-start liquidity (getting the first trades)", "Risks and safeguards (stress the design)", "Pitch scorecard (grade the design)", "PRFAQ (the pitch, written up)"];
export const SHORT_X: [string, string][] = [["OTC vs. exchange", "how it trades today"], ["Marketplace map", "who does what"], ["Market design", "set the rules"], ["Incentives", "who wins, who loses"], ["Cold start", "getting first trades"], ["Risks & safeguards", "stress the design"], ["Pitch scorecard", "grade the design"], ["PRFAQ", "press release + FAQ"]];
export const TERMS_X: string[][] = [
  ["otc", "brokerdealer", "rfq", "trace", "clob", "leakage"],
  ["venue", "liqprov", "brokerdealer", "buyside", "ccp", "custodian", "depository", "datavendor"],
  ["clob", "rfq", "auction", "hybrid", "makertaker", "pretrade", "posttrade", "mmobl", "loanlevel", "listing"],
  ["leakage", "pricedisc", "bestex", "rebate", "systemic"],
  ["coldstart", "anchor", "standard", "tba", "loanlevel"],
  ["firesale", "flashcrash", "spoofing", "circuit", "margin", "surveillance", "ccp"],
  ["pricedisc", "systemic", "liqprov"],
  ["prfaq", "otc", "trace", "ccp", "coldstart", "bestex"],
];
export const QUIZ_X: Quiz[] = [
  { q: "Why is the price of an ABS trade usually hard for outsiders to see before it happens?", opts: ["It's negotiated privately between a dealer and a client (over-the-counter)", "Exchanges hide prices by law", "ABS don't have prices"], ok: 0, why: "Most ABS trade OTC: a client asks a few dealers for quotes. Others only see the price afterwards, through post-trade reporting like TRACE." },
  { q: "Who stands between buyer and seller so neither is hurt if the other fails to pay?", opts: ["The custodian (safe-keeper)", "The central counterparty, CCP (clearing house)", "The rating agency (grader)"], ok: 1, why: "The CCP becomes buyer to every seller and seller to every buyer, and holds margin to cover a defaulting member." },
  { q: "In a maker-taker fee model, who usually earns a rebate?", opts: ["Whoever hits an existing quote (takes liquidity)", "Whoever posts a resting quote (makes liquidity)", "The regulator"], ok: 1, why: "Makers add liquidity to the book, so the venue pays them; takers remove it and pay a fee." },
  { q: "Why do many dealers resist full pre-trade transparency?", opts: ["Visible competing quotes narrow the bid-ask spreads they earn", "It makes trading slower", "Dealers aren't allowed to see quotes"], ok: 0, why: "Dealers earn the spread. When everyone sees the best prices, spreads compress and dealer profit per trade falls." },
  { q: "Why launch a new ABS exchange with very standardized products like agency MBS TBA?", opts: ["They're interchangeable, so many buyers and sellers meet in the same few contracts", "Their prices never move", "Regulators ban other ABS from exchanges"], ok: 0, why: "Liquidity needs many people trading the same thing. Standard contracts pool demand; one-of-a-kind deals split it." },
  { q: "What does a circuit breaker do?", opts: ["Pauses trading briefly when prices move too far, too fast", "Cancels every trade of the day", "Doubles trading fees in a crisis"], ok: 0, why: "A pause gives people time to check information and lets new buyers step in, which can stop a panic spiral." },
  { q: "A venue that charges very high fees to maximize its own revenue will most likely...", opts: ["Push participants back to over-the-counter trading", "Attract more market makers", "Lower bid-ask spreads"], ok: 0, why: "Participants have an alternative (OTC). If the venue is too expensive, liquidity leaves, and an empty venue earns nothing." },
  { q: "Why write a PRFAQ (press release + FAQ) before building the exchange?", opts: ["It forces the team to explain who it helps and answer the hard questions first", "Regulators require a press release before launch", "It replaces the need for a business plan"], ok: 0, why: "Writing the launch announcement and the toughest questions first shows whether the idea is clear and worth building, before anyone spends money." },
];

// ---------- marketplace roles (all fictional) ----------
export type Role = { id: string; name: string; role: string; group: "core" | "sell" | "buy" | "post" | "info" | "rules"; does: string; needs: string; paid: string; incent: string; conflict: string };
export const ROLES: Role[] = [
  { id: "ex", name: "Lighthouse ABS Exchange", role: "the exchange / venue operator", group: "core", does: "Runs the marketplace: rulebook, membership, matching engine, listing, market data and surveillance.", needs: "Enough buyers and sellers in the same products, regulatory approval, reliable technology.", paid: "Trading fees, listing fees, market-data and connectivity fees, membership subscriptions.", incent: "Maximize volume and data sales; grow membership.", conflict: "It earns more when volume is high, so it can be tempted to favor fast or high-volume traders, and it also polices those same customers." },
  { id: "mm", name: "Kestrel Markets", role: "a market maker / liquidity provider", group: "sell", does: "Posts bids and offers all day so others can trade immediately.", needs: "Fast data, low fees or rebates, ways to hedge, protection from trading against better-informed players.", paid: "Bid-ask spread plus exchange rebates or market-maker program payments.", incent: "Wants wide enough spreads and generous rebates; dislikes strict quoting obligations in stress.", conflict: "May pull quotes exactly when the market needs them most." },
  { id: "bd", name: "Bluebridge Securities", role: "a broker-dealer", group: "sell", does: "Trades with clients using its own balance sheet, finds the other side for big trades, underwrites new deals.", needs: "A way to keep client relationships and earn on large, complex trades; access for its clients.", paid: "Bid-ask spreads, commissions, underwriting fees.", incent: "OTC opacity lets it earn wider spreads, so it may resist full transparency but join if volume shifts.", conflict: "Trades for itself and for clients at the same time; knows client orders." },
  { id: "ins", name: "Bedrock Mutual Insurance", role: "an insurer (buy-side)", group: "buy", does: "Buys high-grade ABS to match long-term claims; mostly holds to maturity.", needs: "Safe, rated products, low counterparty risk, ability to buy big blocks quietly.", paid: "It pays: spreads, fees and custody costs; earns the bond interest.", incent: "Lower trading costs and fair prices, without revealing big orders.", conflict: "Large orders fear information leakage on a fully visible order book." },
  { id: "pen", name: "Cedar State Retirement Fund", role: "a pension fund (buy-side)", group: "buy", does: "Invests retirement savings for decades; values safety and fair prices.", needs: "Central clearing, good data, best-execution evidence, strict listing standards.", paid: "It pays trading costs and custody fees; earns investment returns for retirees.", incent: "Transparent, fair prices and low systemic risk.", conflict: "Often relies on external managers and dealers whose incentives differ." },
  { id: "am", name: "Evergreen Fund Managers", role: "a money manager (buy-side)", group: "buy", does: "Runs bond funds for savers; trades frequently to manage inflows and outflows.", needs: "Liquidity on demand, low costs, protection when selling during redemptions.", paid: "Earns management fees from savers; pays spreads and fees when trading.", incent: "Tighter spreads and quick execution.", conflict: "Must sell when savers pull money, even at bad prices (fire-sale risk)." },
  { id: "bank", name: "Harborline Bank Treasury", role: "a bank (buy-side)", group: "buy", does: "Parks spare cash in safe, liquid bonds that regulators count as high quality.", needs: "Central clearing, high-quality listings, reliable prices for its books.", paid: "Earns interest; pays trading and custody costs.", incent: "Safety, liquidity and capital-friendly products.", conflict: "May also own a dealer arm that profits from opaque trading." },
  { id: "hf", name: "Northgale Capital", role: "a hedge fund (buy-side)", group: "buy", does: "Trades actively to profit from mispricing; can be buyer or seller.", needs: "Transparent prices, low taker fees, fast access, ability to short.", paid: "Earns performance fees; pays fees, spreads and financing.", incent: "Transparency and speed help it find mispricing.", conflict: "Its speed or information advantage can hurt slower investors." },
  { id: "iss", name: "Sunrise Auto Finance", role: "an issuer / sponsor", group: "sell", does: "Creates ABS deals by selling loans to a special purpose vehicle (SPV); wants investors to buy them.", needs: "Liquid secondary trading so investors pay more (accept lower spreads) at issuance.", paid: "Receives cash from selling the deal; pays listing, rating and legal fees.", incent: "Easy listing, cheap funding.", conflict: "Pays the rating agencies that grade its own deals (issuer-pays)." },
  { id: "ccp", name: "Keystone Clearing Corp", role: "the clearing house / central counterparty, CCP", group: "post", does: "Guarantees trades by stepping between buyer and seller; collects margin and runs a default fund.", needs: "Standard products it can value daily, reliable prices, well-capitalized members.", paid: "Clearing fees per trade; earns interest on margin held.", incent: "Volume, but also safety: a member default can hit its own capital.", conflict: "Lower margin attracts business but raises risk." },
  { id: "cust", name: "Ironwood Custody Bank", role: "a custodian", group: "post", does: "Holds investors' bonds and cash, settles trades, collects interest payments.", needs: "Standard settlement instructions and clean data from the venue and depository.", paid: "Custody fees (a small % of assets held) and transaction fees.", incent: "More assets under custody.", conflict: "Few; mostly operational risk." },
  { id: "dep", name: "Anchor Depository & Settlement", role: "the settlement / depository", group: "post", does: "Keeps the official ownership record and moves bonds against cash at settlement.", needs: "Standard identifiers and settlement cycles.", paid: "Settlement and safekeeping fees.", incent: "Reliable, high-volume settlement.", conflict: "Near-monopoly position; must avoid outages." },
  { id: "data", name: "Lumen Pricing Data", role: "a data and pricing vendor", group: "info", does: "Combines trades, quotes and loan data into prices and analytics.", needs: "Market data from the venue, loan-level data from trustees and servicers.", paid: "Subscriptions from investors, banks and regulators; pays the venue for data licences.", incent: "Prefers opaque markets where its evaluated prices are essential.", conflict: "Exchange data can replace its estimates, so it may lose business to transparency." },
  { id: "rate", name: "Polaris Ratings", role: "a rating agency", group: "info", does: "Grades each tranche's credit risk; ratings feed listing standards and investor rules.", needs: "Good loan-level data and performance history.", paid: "Fees from issuers for rating deals (issuer-pays).", incent: "More deals rated.", conflict: "Paid by the issuers it grades, which can tempt it to be generous." },
  { id: "svc", name: "Granite Trust Co. & Sunrise Collections", role: "the trustee and the servicer (loan-level data)", group: "info", does: "Collect payments and report monthly performance on every loan in each deal.", needs: "A standard data format and clear disclosure rules.", paid: "Servicing and trustee fees from each deal's cash flows.", incent: "Low reporting cost.", conflict: "A servicer owned by the issuer may report bad news slowly." },
  { id: "reg", name: "Securities regulators (SEC-like and FINRA-like, generic)", role: "the regulators", group: "rules", does: "Approve the venue's rules, register participants, watch for manipulation and protect investors.", needs: "Transparency, surveillance data, central clearing, fair access, investor protection.", paid: "Funded by registration and regulatory fees (and the public budget).", incent: "Fair, orderly markets and low systemic risk.", conflict: "Pressure from industry and politics; limited budgets." },
  { id: "tech", name: "Quarry Systems", role: "a technology provider", group: "core", does: "Builds the matching engine, connectivity, risk checks and data feeds.", needs: "Clear specs, long contracts, uptime targets.", paid: "Software licences, hosting and maintenance fees.", incent: "Long, sticky contracts.", conflict: "Vendor lock-in; may sell the same tech to rival venues." },
];
export type Flow = { from: string; to: string; label: string; kind: "fee" | "spread" | "rebate" | "sub" | "custody" };
export const FLOWS: Flow[] = [
  { from: "hf", to: "ex", label: "trading fees", kind: "fee" }, { from: "am", to: "ex", label: "trading fees", kind: "fee" }, { from: "bd", to: "ex", label: "membership + fees", kind: "fee" },
  { from: "iss", to: "ex", label: "listing fees", kind: "fee" }, { from: "ex", to: "mm", label: "maker rebates", kind: "rebate" },
  { from: "am", to: "mm", label: "bid-ask spread", kind: "spread" }, { from: "ins", to: "bd", label: "bid-ask spread", kind: "spread" }, { from: "pen", to: "bd", label: "spread / commissions", kind: "spread" },
  { from: "bd", to: "ccp", label: "clearing fees", kind: "fee" }, { from: "mm", to: "ccp", label: "clearing fees", kind: "fee" },
  { from: "pen", to: "cust", label: "custody fees", kind: "custody" }, { from: "ins", to: "cust", label: "custody fees", kind: "custody" }, { from: "cust", to: "dep", label: "settlement fees", kind: "custody" },
  { from: "bank", to: "data", label: "data subscriptions", kind: "sub" }, { from: "data", to: "ex", label: "market-data licence", kind: "sub" },
  { from: "iss", to: "rate", label: "rating fees (issuer-pays)", kind: "fee" }, { from: "iss", to: "svc", label: "servicing + trustee fees", kind: "fee" },
  { from: "ex", to: "tech", label: "technology licence", kind: "sub" }, { from: "ex", to: "reg", label: "regulatory fees", kind: "fee" },
];

// ---------- design model (synthetic, deterministic) ----------
export type Design = {
  structure: "clob" | "rfq" | "auction" | "hybrid"; fee: "makertaker" | "flat" | "subscription" | "rebate"; feeBps: number;
  minSize: "0.25" | "1" | "5" | "25"; pre: "full" | "masked" | "delayed"; post: "realtime" | "15min" | "eod";
  mmObl: boolean; mmInc: number; clearing: "ccp" | "bilateral"; data: "none" | "basic" | "loanlevel";
  listing: "loose" | "standard" | "strict"; access: "institutional" | "qualified" | "broad";
  cb: boolean; marginOn: boolean; surv: boolean; audit: boolean; limits: boolean;
};
export const DEFAULT_DESIGN: Design = { structure: "hybrid", fee: "makertaker", feeBps: 2, minSize: "1", pre: "masked", post: "15min", mmObl: true, mmInc: 1, clearing: "ccp", data: "basic", listing: "standard", access: "institutional", cb: false, marginOn: true, surv: false, audit: false, limits: false };
// Today's over-the-counter market, expressed in the same terms so the model can compare.
export const OTC_BASE: Design = { structure: "rfq", fee: "flat", feeBps: 0, minSize: "1", pre: "delayed", post: "15min", mmObl: false, mmInc: 0, clearing: "bilateral", data: "basic", listing: "loose", access: "institutional", cb: false, marginOn: false, surv: true, audit: false, limits: false };
export const PLAYERS: { k: PK; label: string; w: number }[] = [
  { k: "bd", label: "Broker-dealers", w: 1.2 }, { k: "mm", label: "Market makers", w: 1.0 }, { k: "am", label: "Money managers", w: 1.0 }, { k: "ins", label: "Insurers", w: 0.6 },
  { k: "pen", label: "Pension funds", w: 0.5 }, { k: "bank", label: "Banks", w: 0.6 }, { k: "hf", label: "Hedge funds", w: 0.9 }, { k: "small", label: "Smaller investors", w: 0.3 },
];
export type PK = "bd" | "mm" | "am" | "ins" | "pen" | "bank" | "hf" | "small";
export type Out = { part: Record<PK, number>; trans: number; leak: number; taker: number; maker: number; volume: number; liq: number; spread: number; disc: number; revenue: number; dealerProfit: number; invCost: number; risk: number; approval: number };
const pick = <T extends string>(v: T, m: Record<T, number>): number => m[v];
export function model(d: Design, otc = false): Out {
  const trans = pick(d.pre, { full: 1, masked: 0.6, delayed: 0.3 }) * 0.6 + pick(d.post, { realtime: 1, "15min": 0.7, eod: 0.3 }) * 0.4;
  const leak = pick(d.structure, { clob: 1, hybrid: 0.6, auction: 0.35, rfq: 0.3 }) * pick(d.pre, { full: 1, masked: 0.5, delayed: 0.6 });
  const taker = otc ? 0 : pick(d.fee, { makertaker: d.feeBps, flat: d.feeBps * 0.8, subscription: 0.2, rebate: d.feeBps * 1.1 });
  const maker = otc ? 0 : pick(d.fee, { makertaker: d.feeBps * 0.6, flat: -d.feeBps * 0.8, subscription: 0, rebate: d.feeBps * 0.9 });
  const data = pick(d.data, { none: 0, basic: 0.5, loanlevel: 1 }), list = pick(d.listing, { loose: 0, standard: 0.5, strict: 1 });
  const ccp = d.clearing === "ccp";
  const st = d.structure;
  const sizeSmall = pick(d.minSize, { "0.25": 0, "1": 10, "5": 30, "25": 55 }), sizeLarge = pick(d.minSize, { "0.25": -5, "1": 0, "5": 6, "25": 10 });
  const p: Record<PK, number> = {
    bd: 75 - 45 * trans + pick(st, { rfq: 20, hybrid: 8, auction: -5, clob: -15 }) + (ccp ? 4 : 0) + maker * 3 + d.mmInc * 2,
    mm: 15 + d.mmInc * 14 + maker * 6 + pick(st, { clob: 18, hybrid: 12, auction: 4, rfq: -8 }) - (d.mmObl ? (d.mmInc >= 2 ? 0 : 12) : 0) + trans * 8 + data * 6 - (d.cb ? 2 : 0),
    am: 45 + 20 * data + (ccp ? 8 : 0) - 25 * leak + sizeLarge + trans * 10 - taker * 2 + pick(st, { rfq: 5, hybrid: 8, auction: 6, clob: 0 }),
    ins: 40 + 15 * data + 10 * list + (ccp ? 10 : 0) - 20 * leak + sizeLarge + pick(st, { rfq: 6, hybrid: 6, auction: 5, clob: -2 }) + (d.marginOn ? 3 : 0),
    pen: 30 + 15 * data + 15 * list + (ccp ? 12 : 0) + 10 * trans - 15 * leak - (d.access === "broad" ? 3 : 0) + (d.surv ? 3 : 0) + (d.marginOn ? 3 : 0),
    bank: 40 + (ccp ? 18 : 0) + 10 * data + 8 * list - 10 * leak + (st === "rfq" ? 5 : 0),
    hf: 35 + 25 * trans + pick(st, { clob: 18, hybrid: 10, auction: 2, rfq: -5 }) - taker * 3 + (ccp ? 5 : 0) + 5 * data - (d.marginOn ? 3 : 0) - (d.limits ? 3 : 0),
    small: 5 + 45 * trans + pick(d.access, { institutional: -40, qualified: -10, broad: 15 }) - sizeSmall + pick(st, { clob: 10, hybrid: 6, auction: 8, rfq: -10 }) - taker * 2 + 10 * data + (d.surv ? 3 : 0),
  };
  // Expensive venues push participants back to over-the-counter trading.
  const feeDrag = 1 / (1 + Math.pow(taker / 3.5, 2));
  (Object.keys(p) as PK[]).forEach((k) => { p[k] = Math.round(clamp(p[k] * (k === "mm" ? 1 : feeDrag), 0, 100)); });
  const base = PLAYERS.reduce((s, x) => s + x.w * p[x.k], 0);
  const volume = base * pick(st, { clob: 1, hybrid: 1.08, auction: 0.8, rfq: 0.85 }) * pick(d.listing, { loose: 1.1, standard: 1, strict: 0.88 }) * (1 + 0.15 * data) * 1.6;
  const liq = clamp(volume / 8, 0, 100);
  const spread = (55 / (1 + volume / 250)) * (1 - 0.3 * trans) * (d.mmObl && d.mmInc >= 1 ? 0.82 : 1) * pick(st, { clob: 0.9, hybrid: 1, auction: 1.1, rfq: 1.08 }) + taker * 0.5;
  const disc = clamp(100 * (0.45 * trans + 0.3 * liq / 100 + 0.25 * data) * (st === "auction" ? 0.95 : 1), 0, 100);
  const safeCost = [d.cb, d.marginOn, d.surv, d.audit, d.limits].filter(Boolean).length;
  const memberSum = PLAYERS.reduce((s, x) => s + p[x.k], 0);
  const revenue = otc ? 0 : Math.max(-20, volume * 250 * Math.max(0, taker - maker * (p.mm / 100)) * 1e-4 + (d.fee === "subscription" ? 4 + 0.05 * memberSum : 0) + (d.pre === "full" && d.post === "realtime" ? 3 : 6) + data * 3 - d.mmInc * 2.5 - safeCost * 1.2);
  const dealerProfit = volume * 250 * (spread / 2) * 1e-4 * (otc ? 0.85 : (p.bd / 100) * 0.6);
  const invCost = spread / 2 + taker;
  const risk = clamp(20 + (ccp ? 0 : 25) + pick(d.access, { institutional: 0, qualified: 5, broad: 12 }) + pick(d.listing, { loose: 12, standard: 5, strict: 0 }) + pick(d.data, { none: 12, basic: 5, loanlevel: 0 }) + pick(st, { clob: 8, hybrid: 5, auction: 0, rfq: 2 }) + (d.mmInc >= 2 && !d.mmObl ? 8 : 0) - (d.cb ? 8 : 0) - (d.marginOn ? (ccp ? 10 : 4) : 0) - (d.surv ? 6 : 0) - (d.audit ? 6 : 0) - (d.limits ? 5 : 0), 0, 100);
  const approval = clamp(35 + (ccp ? 15 : 0) + 18 * trans + 10 * data + 8 * list - 0.45 * risk + (d.access === "broad" && d.listing === "loose" ? -15 : 0) + (d.surv ? 6 : 0) + (d.access === "institutional" ? 5 : 0), 5, 97);
  return { part: p, trans, leak, taker, maker, volume, liq, spread, disc, revenue, dealerProfit, invCost, risk, approval };
}

// plain-English incentive reasoning for each player
export function reasons(d: Design, o: Out, b: Out): Record<PK, string[]> {
  const r: Record<PK, string[]> = { bd: [], mm: [], am: [], ins: [], pen: [], bank: [], hf: [], small: [] };
  const tightened = o.spread < b.spread - 2;
  if (o.trans > 0.6) { r.bd.push("Visible competing quotes narrow the spreads dealers earn, so they lose some profit per trade."); r.small.push("They see the same prices as the big players, so they can tell if a quote is fair."); r.hf.push("Transparent prices make mispricing easier to spot and trade."); }
  else r.bd.push("Prices stay fairly hidden, so dealers keep much of their information advantage and wider spreads.");
  if (d.structure === "rfq") r.bd.push("RFQ keeps dealers at the center: clients still ask them for prices.");
  if (o.leak > 0.6) { r.am.push("Big orders on a visible order book can tip others off (information leakage) and move the price against them."); r.ins.push("Buying large blocks in a lit book risks leakage, so they may keep trading OTC."); }
  else { r.am.push("Masked sizes, RFQ or auctions let big orders trade without broadcasting them."); r.ins.push("They can buy large blocks quietly, which they value most."); }
  if (d.clearing === "ccp") { r.bank.push("Central clearing removes the risk that a trading partner fails to pay."); r.pen.push("A clearing house plus margin means one firm's failure doesn't wipe out their trades."); }
  else { r.bank.push("Bilateral settlement means each bank must vet every trading partner's credit."); r.pen.push("Without central clearing, a dealer failure could leave trades unpaid."); }
  if (d.mmInc >= 2) r.mm.push("Generous rebates or program payments make quoting profitable."); else if (d.mmObl) r.mm.push("Strict quoting duties with little pay make market making unattractive.");
  if (d.mmObl) r.mm.push("Obligations force them to keep quoting in bad times, which is costly but steadies the market.");
  if (d.fee === "makertaker") { r.mm.push("Maker-taker pays them for posting quotes."); r.hf.push("As takers they pay the fee on every aggressive trade."); }
  if (d.minSize === "5" || d.minSize === "25") r.small.push("A large minimum trade size shuts them out.");
  if (d.access === "institutional") r.small.push("Institutional-only access keeps them out entirely.");
  if (d.access === "broad") r.pen.push("Broader access adds more participants but also more risk and supervision needs.");
  if (d.data === "loanlevel") { r.pen.push("Loan-level data lets them check every loan instead of trusting averages."); r.ins.push("Loan-level data supports their credit analysis."); r.am.push("Better data narrows disagreement about value, so trading is easier."); }
  if (d.listing === "strict") r.bank.push("Strict listing standards mean only well-documented, high-quality products.");
  if (tightened) r.small.push(`Spreads fall from ${b.spread.toFixed(0)} to ${o.spread.toFixed(0)} bps, cutting their trading cost.`);
  if (d.marginOn) r.hf.push("Margin requirements tie up their capital.");
  return r;
}

// ---------- cold-start launch plan ----------
export const LEVERS: { id: string; label: string; cost: number; detail: string }[] = [
  { id: "anchor", label: "Anchor participants (founding members)", cost: 4, detail: "Big dealers and investors commit to trade from day one, often for fee breaks or a stake in the exchange. Kick-starts volume, but gives them influence over the rules." },
  { id: "mmp", label: "Market-maker program (paid liquidity)", cost: 3, detail: "Pay chosen market makers to quote tight prices all day. Someone is always there to trade with." },
  { id: "std", label: "Deal standardization (common templates)", cost: 2, detail: "Push issuers toward the same structures and documents so deals are comparable and more people trade each one." },
  { id: "data", label: "Loan-level data standard (common format)", cost: 2, detail: "Require one data format from trustees and servicers so every investor can analyze deals the same way." },
  { id: "holiday", label: "Fee holiday (free trading at launch)", cost: 2, detail: "No fees for six months. Attracts early users, but some leave when fees start." },
  { id: "dealer", label: "Dealer partnership (route RFQs in)", cost: 2, detail: "Let dealers bring their client RFQs onto the venue, so existing relationships move with them." },
];
export const FIRST_ASSET: { id: string; label: string; s: number }[] = [
  { id: "tba", label: "Agency MBS TBA (standard home-loan contracts)", s: 1 }, { id: "auto", label: "Auto ABS (car loans)", s: 0.6 }, { id: "card", label: "Credit card ABS", s: 0.65 }, { id: "clo", label: "CLOs (business loans)", s: 0.4 }, { id: "roy", label: "Royalty ABS (song royalties)", s: 0.1 },
];
export const BUDGET = 9, CRIT = 0.35;
export function adoption(levers: string[], asset: string, liq: number): number[] {
  const s = FIRST_ASSET.find((a) => a.id === asset)?.s ?? 0.5;
  const has = (x: string) => levers.includes(x);
  let L = 0.03 + (has("anchor") ? 0.1 : 0) + (has("holiday") ? 0.03 : 0) + (has("dealer") ? 0.04 : 0);
  const r = 0.08 + (has("mmp") ? 0.14 : 0) + (has("std") ? 0.08 : 0) + (has("data") ? 0.06 : 0) + s * 0.22 + (liq / 100) * 0.12;
  const out = [L];
  for (let m = 1; m <= 12; m++) {
    L = L + r * L * (1 - L) - (has("mmp") ? 0.01 : 0.04) * (1 - s * 0.5) - (has("holiday") && m === 7 ? 0.05 : 0);
    L = clamp(L, 0.005, 1); out.push(L);
  }
  return out;
}

// ---------- risk scenarios ----------
export type Scen = { id: string; title: string; term: string; story: string; sev: (d: Design, o: Out) => number; why: (d: Design) => string[] };
export const SCENS: Scen[] = [
  { id: "fire", title: "Fire sale (forced selling)", term: "firesale", story: "A large bond fund faces redemptions and must sell $800M of ABS this week.", sev: (d, o) => 70 - (d.structure === "auction" ? 15 : d.structure === "hybrid" ? 8 : 0) - (d.cb ? 15 : 0) - (d.mmObl ? 10 : 0) + (o.liq < 40 ? 15 : 0) + (d.access === "broad" ? 5 : 0), why: (d) => [d.structure === "auction" || d.structure === "hybrid" ? "Auctions batch the selling so buyers can step in at one price." : "Continuous trading lets the selling hit thin bids one after another.", d.cb ? "The circuit breaker paused the slide." : "No circuit breaker: prices could keep falling.", d.mmObl ? "Market makers had to keep quoting." : "Market makers were free to step away."] },
  { id: "flash", title: "Flash crash (runaway algorithm)", term: "flashcrash", story: "A trading firm's algorithm malfunctions and floods the book with sell orders for 90 seconds.", sev: (d) => 65 + (d.structure === "clob" ? 10 : 0) - (d.structure === "auction" ? 20 : 0) - (d.cb ? 25 : 0) - (d.surv ? 10 : 0) - (d.limits ? 10 : 0), why: (d) => [d.cb ? "Circuit breakers halted trading within seconds." : "No pause: the runaway orders kept hitting bids.", d.limits ? "Pre-trade risk limits capped the bad orders." : "No order or position limits to stop the flood.", d.structure === "auction" ? "Periodic auctions gave no chance for a sub-minute spiral." : "Continuous matching let the spiral build."] },
  { id: "data", title: "Bad data (servicer misreports)", term: "loanlevel", story: "A servicer under-reports delinquencies for three months; prices are too high until the truth comes out.", sev: (d) => 60 - (d.data === "loanlevel" ? 20 : d.data === "none" ? -15 : 0) - (d.audit ? 25 : 0) - (d.listing === "strict" ? 10 : 0), why: (d) => [d.data === "loanlevel" ? "Loan-level data let investors spot odd patterns early." : "Only pool averages: the problem was hidden.", d.audit ? "Independent data audits caught the error." : "No audits: errors surfaced only when losses hit.", d.listing === "strict" ? "Strict listing standards required verified data." : "Loose listing standards let weak reporting in."] },
  { id: "manip", title: "Manipulation (spoofing, marking the close)", term: "spoofing", story: "A trader places large fake orders to push prices, then trades the other way.", sev: (d) => 60 - (d.surv ? 30 : 0) - (d.post === "realtime" ? 10 : 0) + (d.pre === "full" ? 5 : 0) + (d.access === "broad" ? 10 : 0) - (d.limits ? 10 : 0), why: (d) => [d.surv ? "Surveillance flagged the order pattern and the trader was suspended." : "No surveillance: the scheme ran for weeks.", d.post === "realtime" ? "Real-time trade reports made the odd prices visible quickly." : "Delayed reporting hid the pattern.", d.access === "broad" ? "Broad access means more accounts to monitor." : "Limited access made bad actors easier to trace."] },
  { id: "default", title: "Member default (a big firm fails)", term: "ccp", story: "A large dealer collapses with thousands of open trades.", sev: (d) => 70 - (d.clearing === "ccp" ? 25 : -10) - (d.marginOn ? (d.clearing === "ccp" ? 25 : 10) : 0) - (d.limits ? 10 : 0), why: (d) => [d.clearing === "ccp" ? "The clearing house stepped in and honored the trades." : "Bilateral trades: every counterparty had to chase the failed firm.", d.marginOn ? "Margin collected in advance covered most losses." : "No margin: losses landed on the surviving firms.", d.limits ? "Position limits had capped how much it could owe." : "No limits on how large its positions grew."] },
  { id: "pull", title: "Liquidity vanishes (market makers step away)", term: "liqprov", story: "Volatility spikes and liquidity providers pull their quotes.", sev: (d) => 60 - (d.mmObl ? 20 : 0) - d.mmInc * 5 - (d.structure === "auction" ? 5 : 0) - (d.cb ? 10 : 0), why: (d) => [d.mmObl ? "Obligations kept registered market makers quoting." : "Nothing required anyone to keep quoting.", d.mmInc >= 2 ? "Strong incentives made staying worthwhile." : "Weak incentives: leaving was cheaper.", d.cb ? "A pause let quotes come back." : "Spreads blew out with no pause."] },
];
export const sevLabel = (s: number): { t: string; tone: "ok" | "warn" | "bad" } => (s < 35 ? { t: "Contained", tone: "ok" } : s < 60 ? { t: "Damaged", tone: "warn" } : { t: "Failed", tone: "bad" });

// ---------- scorecard ----------
export const letter = (v: number) => (v >= 80 ? "A" : v >= 65 ? "B" : v >= 50 ? "C" : v >= 35 ? "D" : "F");
export function scores(d: Design, o: Out, coldOk: boolean, stressAvg: number) {
  const buy = (o.part.am + o.part.ins + o.part.pen + o.part.bank + o.part.hf) / 5;
  return {
    liquidity: clamp(o.liq * 0.7 + (40 - Math.min(40, o.spread)) * 0.75, 0, 100),
    fairness: clamp(0.45 * o.trans * 100 + 0.3 * o.part.small + 0.25 * o.disc, 0, 100),
    safety: clamp(100 - o.risk * 0.6 - stressAvg * 0.4, 0, 100),
    profitability: clamp((o.revenue / 35) * 100, 0, 100),
    adoption: clamp(buy * 0.6 + o.part.bd * 0.15 + o.part.mm * 0.15 + (coldOk ? 10 : 0), 0, 100),
  };
}

// ---------- the module (hook used by the terminal shell) ----------
type Award = (k: string) => void;
type ToastFn = (t: string, d?: string, kind?: Toast["kind"]) => void;
const VENUE = "Lighthouse ABS Exchange";
const KIND_LABEL: Record<Flow["kind"], string> = { fee: "Fees", spread: "Bid-ask spreads", rebate: "Rebates", sub: "Subscriptions & licences", custody: "Custody & settlement" };
const KIND_COLOR: Record<Flow["kind"], string> = { fee: "var(--t0)", spread: "var(--t1)", rebate: "var(--t2)", sub: "var(--t3)", custody: "var(--amber)" };
const GROUP_COLOR: Record<Role["group"], string> = { core: "var(--accent)", sell: "var(--t1)", buy: "var(--t2)", post: "var(--t3)", info: "var(--amber)", rules: "var(--down)" };
const GROUP_LABEL: Record<Role["group"], string> = { core: "Venue & technology", sell: "Sell side & issuers", buy: "Buy-side investors", post: "Clearing & settlement", info: "Data, ratings & loan reporting", rules: "Regulators" };
const RING = ["tech", "reg", "data", "rate", "svc", "iss", "bd", "mm", "hf", "am", "ins", "pen", "bank", "ccp", "cust", "dep"];
const OTC_STEPS = [
  ["Ask for quotes (request for quote by phone or chat)", "The investor calls or messages 2 to 4 dealers it knows."],
  ["Dealers quote privately", "Each dealer sends a price only to this investor. Nobody else sees them."],
  ["Pick the best of what you saw", "The investor can only compare the few quotes it asked for."],
  ["Bilateral trade (one-to-one)", "The trade is agreed directly with one dealer, who takes the bonds onto its balance sheet."],
  ["Bilateral settlement", "Custodians on each side settle through the depository; each side carries the other's credit risk until then."],
  ["Reported to TRACE afterwards (post-trade reporting)", "The dealer reports the trade; the public sees the price only after the fact."],
];
const EX_STEPS = [
  ["Send an order to the venue", "The investor (or its broker) sends a buy order to the exchange."],
  ["Central order book shows the best bids and offers", "Everyone sees the same best prices (pre-trade transparency)."],
  ["Order matches at the best available price", "The matching engine pairs it with the best offer, whoever posted it."],
  ["Clearing house steps in (central counterparty, CCP)", "The CCP becomes buyer to the seller and seller to the buyer, backed by margin."],
  ["Settlement through the depository", "Bonds move against cash on a standard cycle."],
  ["Printed to the public tape at once", "Price and size are published immediately (post-trade transparency)."],
];
const SIZE_COST: Record<string, [number, number, string]> = {
  "1": [32, 9, "Small trades are where an exchange shines: a dealer quote carries a wide markup, while the visible book is cheap."],
  "10": [22, 14, "Mid-size trades benefit from both, but the book starts to thin."],
  "50": [26, 34, "Huge blocks are harder on a lit book: showing a big order leaks information and eats through levels (market impact). That's why big investors like RFQ or auctions for blocks."],
};

export function useExchange({ award, toast }: { award: Award; toast: ToastFn }) {
  const [stage, setStageRaw] = useState(0);
  const [maxSeen, setMaxSeen] = useState(0);
  const [quiz, setQuiz] = useState<Record<number, number>>({});
  const [d, setD] = useState<Design>(DEFAULT_DESIGN);
  const [touched, setTouched] = useState(false);
  const [pathT, setPathT] = useState(0);
  const [pathPlay, setPathPlay] = useState(false);
  const [ordSize, setOrdSize] = useState("10");
  const [mapView, setMapView] = useState<"roles" | "money">("roles");
  const [mapSel, setMapSel] = useState("ex");
  const [seenRoles, setSeenRoles] = useState<string[]>(["ex"]);
  const [flowKind, setFlowKind] = useState<"all" | Flow["kind"]>("all");
  const [levers, setLevers] = useState<string[]>([]);
  const [asset, setAsset] = useState("auto");
  const [ran, setRan] = useState(0);
  const [running, setRunning] = useState(false);

  const o = useMemo(() => model(d), [d]);
  const b = useMemo(() => model(OTC_BASE, true), []);
  const why = useMemo(() => reasons(d, o, b), [d, o, b]);
  const adopt = useMemo(() => adoption(levers, asset, o.liq), [levers, asset, o.liq]);
  const critM = adopt.findIndex((x) => x >= CRIT);
  const coldOk = critM >= 0 && critM <= 9;
  const sev = SCENS.map((s) => clamp(s.sev(d, o), 0, 100));
  const stressAvg = sev.reduce((s, x) => s + x, 0) / sev.length;
  const sc = scores(d, o, coldOk, stressAvg);
  const allB = Object.values(sc).every((v) => v >= 65);

  const set = <K extends keyof Design>(k: K, v: Design[K]) => { setD((p) => ({ ...p, [k]: v })); if (!touched) { setTouched(true); award("xdesign"); } };
  const setStage = (n: number) => { if (n < 0 || n >= STAGES_X.length) return; setStageRaw(n); setMaxSeen((m) => Math.max(m, n)); document.querySelector(".main")?.scrollTo({ top: 0 }); };
  const answer = (i: number) => { setQuiz({ ...quiz, [stage]: i }); if (i === QUIZ_X[stage].ok) award("xq" + stage); };

  useEffect(() => {
    if (!pathPlay) return;
    const t = setInterval(() => setPathT((x) => { if (x >= 6) { setPathPlay(false); award("xotc"); return 6; } return x + 1; }), 850);
    return () => clearInterval(t);
  }, [pathPlay]);
  useEffect(() => { if (stage === 3) award("xwin"); }, [stage]);
  useEffect(() => { if (coldOk && levers.length) award("xcold"); }, [coldOk, levers.length]);
  useEffect(() => { if (stage === 6 && allB) award("xarch"); }, [stage, allB]);
  const runRef = useRef(0);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      runRef.current += 1; setRan(runRef.current);
      if (runRef.current >= SCENS.length) { setRunning(false); clearInterval(t); }
    }, 450);
    return () => clearInterval(t);
  }, [running]);
  useEffect(() => { if (ran >= SCENS.length && sev.every((x) => x < 35)) award("xstress"); }, [ran, sev.join(",")]);
  const pickRole = (id: string) => { setMapSel(id); const ns = seenRoles.includes(id) ? seenRoles : [...seenRoles, id]; setSeenRoles(ns); if (ns.length >= 8) award("xmap"); };

  // ---------- screen 0: OTC vs exchange ----------
  const quotes = [99.12, 99.31, 99.05];
  const book = [0, 1, 2, 3, 4].map((k) => ({ bid: 99.4 - k * 0.06, bs: 2 + ((k * 7) % 5) * 2, ask: 99.46 + k * 0.06, as: 3 + ((k * 5) % 4) * 2 }));
  const pathCol = (title: string, steps: string[][], kind: "otc" | "ex") => (
    <Panel title={title} right={<Tag tone={kind === "otc" ? "warn" : "acc"}>{kind === "otc" ? "Opaque, bilateral" : "Transparent, central"}</Tag>} tour={kind === "otc" ? "x-otc" : undefined}>
      <div className="xpath">
        {steps.map((s, i) => (
          <div key={s[0]} className={"xstep" + (pathT > i ? " done" : "") + (pathT === i + 1 ? " on" : "")}>
            <span className="xn">{i + 1}</span>
            <div><div className="xt">{s[0]}</div><div className="xd">{s[1]}</div>
              {kind === "otc" && i === 1 && pathT >= 2 && <div className="xquotes">{quotes.map((q, j) => <span key={j} className={"chip-tag " + (j === 1 ? "tag-ok" : "tag-n")}>{["Bluebridge", "Ridgeway", "Calder"][j]} offers {(q + 0.5).toFixed(2)}</span>)}<span className="dim" style={{ fontSize: 11 }}>Ridgeway Capital Markets and Calder & Co. are fictional dealers too.</span></div>}
              {kind === "ex" && i === 1 && pathT >= 2 && (
                <table className="depth" style={{ marginTop: 6, maxWidth: 260 }}><tbody>{book.slice(0, 3).map((l, k) => <tr key={k}><td style={{ textAlign: "right" }}><span className="num">{l.bs}M</span></td><td style={{ textAlign: "right" }}><span className={"num up" + (k === 0 ? " xbest" : "")}>{l.bid.toFixed(2)}</span></td><td><span className={"num down" + (k === 0 ? " xbest" : "")}>{l.ask.toFixed(2)}</span></td><td><span className="num">{l.as}M</span></td></tr>)}</tbody></table>
              )}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
  const sc0 = SIZE_COST[ordSize];
  const S0 = (): ReactNode => (
    <>
      <div className="callout" style={{ marginBottom: 12 }}><div className="cl">The big idea</div>Most asset-backed securities trade <Term k="otc">over-the-counter (by phone with a dealer)</Term>: an investor asks a few dealers for prices, trades with one, and the price is published later through <Term k="trace">TRACE (post-trade reporting)</Term>. An exchange would put everyone's bids and offers in one <Term k="clob">central limit order book (one shared board)</Term>. Press play to follow the same trade down both paths.</div>
      <div className="player" style={{ marginBottom: 12 }}>
        <button className="btn primary sm" onClick={() => { if (pathT >= 6) setPathT(0); setPathPlay(!pathPlay); }}>{pathPlay ? "\u23f8 Pause" : pathT >= 6 ? "\u21ba Replay" : "\u25b6 Play the trade"}</button>
        <button className="btn sm" onClick={() => { setPathPlay(false); setPathT((x) => Math.min(6, x + 1)); if (pathT + 1 >= 6) award("xotc"); }}>Step {"\u25b6"}</button>
        <button className="btn sm" onClick={() => { setPathPlay(false); setPathT(0); }}>Reset</button>
        <span className="dim" style={{ fontSize: 12 }}>Order: buy</span>
        <Seg label="Order size" value={ordSize} onChange={setOrdSize} options={[{ value: "1", label: "$1M" }, { value: "10", label: "$10M" }, { value: "50", label: "$50M block" }]} />
        <span className="dim num" style={{ fontSize: 12 }}>step {pathT}/6</span>
      </div>
      <div className="grid g2">{pathCol("Today: over-the-counter (OTC)", OTC_STEPS, "otc")}{pathCol("Alternative: an exchange", EX_STEPS, "ex")}</div>
      <div className="grid g2" style={{ marginTop: 12 }}>
        <Panel title={`Estimated all-in cost for a $${ordSize}M buy (synthetic)`}>
          {[["Over-the-counter (dealer quote)", sc0[0], "var(--t1)"], ["Exchange (visible order book)", sc0[1], "var(--accent)"]].map(([l, v, c]) => (
            <div key={String(l)} className="wf-row" style={{ marginBottom: 8 }}><span className="wl">{l}</span><span className="wf-track"><i style={{ width: `${(Number(v) / 40) * 100}%`, background: String(c) }} /></span><span className="wv num">{v} bps</span></div>
          ))}
          <div className="p dim">{sc0[2]}</div>
        </Panel>
        <Panel title="Side by side" tight>
          <Tbl cols={["", "Over-the-counter", "Exchange"]} rows={[
            ["Prices you see before trading", "The few quotes you asked for", "The whole book's best bids and offers"],
            ["Who you trade with", "One dealer, chosen by you", "Whoever posted the best price"],
            [<Term key="l" k="leakage">Information leakage</Term>, "Low: only asked dealers know", "Higher for big orders"],
            ["If the other side fails", "You carry that risk (bilateral)", "The clearing house (CCP) covers it"],
            ["When the public sees the price", "Later, via TRACE", "Immediately"],
          ]} />
        </Panel>
      </div>
    </>
  );

  // ---------- screen 1: marketplace map ----------
  // Lanes: infrastructure on top, sell side left, buy side right, post-trade plumbing at the bottom.
  const W = 1040, H = 612, cx = W / 2, cy = H / 2;
  const pos: Record<string, { x: number; y: number }> = {
    ex: { x: cx, y: cy },
    tech: { x: 260, y: 44 }, reg: { x: 433, y: 44 }, data: { x: 607, y: 44 }, rate: { x: 780, y: 44 },
    iss: { x: 100, y: 170 }, bd: { x: 100, y: 300 }, mm: { x: 100, y: 430 },
    am: { x: 940, y: 130 }, ins: { x: 940, y: 215 }, pen: { x: 940, y: 300 }, bank: { x: 940, y: 385 }, hf: { x: 940, y: 470 },
    ccp: { x: 260, y: 556 }, cust: { x: 433, y: 556 }, dep: { x: 607, y: 556 }, svc: { x: 780, y: 556 },
  };
  const role = ROLES.find((r) => r.id === mapSel) ?? ROLES[0];
  const flows = FLOWS.filter((f) => flowKind === "all" || f.kind === flowKind);
  const curve = (f: Flow, i: number) => {
    const a = pos[f.from], c = pos[f.to];
    const mx = (a.x + c.x) / 2, my = (a.y + c.y) / 2, dx = c.x - a.x, dy = c.y - a.y, len = Math.hypot(dx, dy) || 1;
    const bend = 30 + (i % 3) * 14;
    return { d: `M${a.x},${a.y} Q${mx - (dy / len) * bend},${my + (dx / len) * bend} ${c.x},${c.y}`, lx: mx - (dy / len) * bend * 0.55, ly: my + (dx / len) * bend * 0.55 };
  };
  const S1 = (): ReactNode => (
    <>
      <Panel title="Marketplace map" tour="x-map" right={
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Seg label="Map view" value={mapView} onChange={(v) => { setMapView(v); if (v === "money") award("xflow"); }} options={[{ value: "roles", label: "Who does what" }, { value: "money", label: "Who pays whom" }]} />
        </div>
      }>
        {mapView === "money" && <div className="chips" style={{ marginBottom: 8 }}>{(["all", "fee", "spread", "rebate", "sub", "custody"] as const).map((k) => <button key={k} className={"chip" + (flowKind === k ? " on" : "")} onClick={() => setFlowKind(k)}>{k !== "all" && <span className="sw" style={{ background: KIND_COLOR[k] }} />}{k === "all" ? "All money flows" : KIND_LABEL[k]}</button>)}</div>}
        <div className="xmap">
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Map of ABS exchange participants">
            <defs>{(Object.keys(KIND_COLOR) as Flow["kind"][]).map((k) => <marker key={k} id={"xa-" + k} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style={{ fill: KIND_COLOR[k] }} /></marker>)}</defs>
            {[[cx, 11, "middle", "RULES, DATA & TECHNOLOGY"], [100, 128, "middle", "SELL SIDE & ISSUER"], [940, 92, "middle", "BUY SIDE (INVESTORS)"], [cx, 604, "middle", "CLEARING, SETTLEMENT & SERVICING"]].map(([x, y, a, t]) => <text key={t as string} x={x as number} y={y as number} textAnchor={a as "middle"} fontSize={10} letterSpacing={1.2} style={{ fill: "var(--text3)", fontWeight: 650 }}>{t as string}</text>)}
            {mapView === "roles" && RING.map((id) => <line key={id} x1={cx} y1={cy} x2={pos[id].x} y2={pos[id].y} className={id === mapSel ? "xedge on" : "xedge"} />)}
            {mapView === "money" && flows.map((f, i) => { const cv = curve(f, i); const hot = f.from === mapSel || f.to === mapSel; const show = hot || flowKind !== "all"; return (
              <g key={i} opacity={mapSel !== "ex" && !hot && flowKind === "all" ? 0.25 : 1}>
                <path d={cv.d} fill="none" className="flow-line" style={{ stroke: KIND_COLOR[f.kind], strokeWidth: hot ? 2.6 : 1.6 }} markerEnd={`url(#xa-${f.kind})`} />
                {show && <text x={cv.lx} y={cv.ly} textAnchor="middle" className="xflow-lbl">{f.label}</text>}
              </g>); })}
            {["ex", ...RING].map((id) => { const r = ROLES.find((x) => x.id === id) as Role; const p = pos[id]; const w = id === "ex" ? 210 : 160, h = id === "ex" ? 58 : 46; return (
              <g key={id} className={"xnode" + (id === mapSel ? " on" : "") + (seenRoles.includes(id) ? " seen" : "")} transform={`translate(${p.x - w / 2},${p.y - h / 2})`} onClick={() => pickRole(id)} tabIndex={0} role="button" aria-label={`${r.name} (${r.role})`} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pickRole(id); } }}>
                <rect width={w} height={h} rx={9} style={{ stroke: GROUP_COLOR[r.group] }} />
                <rect width={4} height={h} rx={2} style={{ fill: GROUP_COLOR[r.group] }} />
                <text x={12} y={h / 2 - 4} className="xn1">{r.name.length > 22 && id !== "ex" ? r.name.slice(0, 20) + "\u2026" : r.name}</text>
                <text x={12} y={h / 2 + 11} className="xn2">{r.role.length > 28 ? r.role.slice(0, 26) + "\u2026" : r.role}</text>
              </g>); })}
          </svg>
        </div>
        <div className="legend" style={{ marginTop: 8 }}>{(Object.keys(GROUP_LABEL) as Role["group"][]).map((g) => <span key={g}><span className="sw" style={{ background: GROUP_COLOR[g] }} />{GROUP_LABEL[g]}</span>)}</div>
        <div className="chips m-only" style={{ marginTop: 10 }}>{ROLES.map((r) => <button key={r.id} className={"chip" + (r.id === mapSel ? " on" : seenRoles.includes(r.id) ? " ok" : "")} onClick={() => pickRole(r.id)}>{r.name}</button>)}</div>
      </Panel>
      <div className="grid g-wide-left" style={{ marginTop: 12 }}>
        <Panel title={`${role.name} (${role.role})`} right={<span className="dim">{seenRoles.length}/{ROLES.length} explored</span>} tour="x-role">
          <Props items={[
            { label: "Responsibilities (what they do)", value: role.does },
            { label: "What they need from the exchange", value: role.needs },
            { label: "How they get paid", value: role.paid },
            { label: "Incentives (what they push for)", value: role.incent },
            { label: "Conflicts of interest", value: role.conflict },
          ]} />
        </Panel>
        <Panel title={`Money in and out: ${role.name}`} tight>
          {(() => { const ins = FLOWS.filter((f) => f.to === role.id), outs = FLOWS.filter((f) => f.from === role.id); const nm = (id: string) => ROLES.find((r) => r.id === id)?.name ?? id; return (
            <Tbl cols={["Direction", "Counterparty", "For"]} rows={[...ins.map((f) => [<span key={f.from} className="up">{"\u2190 receives"}</span>, nm(f.from), f.label]), ...outs.map((f) => [<span key={f.to} className="down">{"\u2192 pays"}</span>, nm(f.to), f.label])]} />); })()}
          <div className="p dim" style={{ padding: "8px 12px" }}>Switch the map to "Who pays whom" to watch the money move. Collateral posted as margin is not a fee: it is returned if nobody defaults.</div>
        </Panel>
      </div>
    </>
  );

  // ---------- screen 2: design + simulate ----------
  const delta = (v: number, base: number, unit: string, goodUp: boolean, dp = 0) => {
    const dv = v - base; const good = goodUp ? dv > 0 : dv < 0;
    return <span className={Math.abs(dv) < 0.05 ? "dim" : good ? "up" : "down"}>{(dv >= 0 ? "+" : "") + dv.toFixed(dp) + unit} vs. OTC</span>;
  };
  const PRESETS: { label: string; d: Partial<Design> }[] = [
    { label: "Today's OTC market", d: { ...OTC_BASE, fee: "flat", feeBps: 0.5 } },
    { label: "Fully lit order book", d: { structure: "clob", pre: "full", post: "realtime", access: "broad", minSize: "0.25", clearing: "ccp", fee: "makertaker", feeBps: 2 } },
    { label: "Dealer-friendly RFQ", d: { structure: "rfq", pre: "delayed", post: "eod", access: "institutional", minSize: "5", clearing: "bilateral", fee: "flat", feeBps: 1 } },
    { label: "Balanced hybrid", d: { ...DEFAULT_DESIGN, data: "loanlevel", mmInc: 2, cb: d.cb, surv: d.surv, audit: d.audit, limits: d.limits } },
  ];
  const partBars = (
    <div className="pbars">
      {PLAYERS.map((p) => (
        <div key={p.k} className="pbar">
          <span className="pl">{p.label}</span>
          <span className="pt"><i className="ghost" style={{ width: `${b.part[p.k]}%` }} /><i className="cur" style={{ width: `${o.part[p.k]}%` }} /></span>
          <span className={"pv num " + (o.part[p.k] > b.part[p.k] + 2 ? "up" : o.part[p.k] < b.part[p.k] - 2 ? "down" : "dim")}>{o.part[p.k]}</span>
        </div>
      ))}
      <div className="legend" style={{ marginTop: 6 }}><span><span className="sw" style={{ background: "var(--accent)" }} />Your design</span><span><span className="sw" style={{ background: "var(--border2)" }} />Today's OTC market</span><span className="dim">Participation score, 0 to 100 (synthetic)</span></div>
    </div>
  );
  const metricCards = (
    <div className="metrics">
      <Metric k="Liquidity (daily volume)" v={`$${o.volume.toFixed(0)}M`} d={delta(o.volume, b.volume, "M", true)} />
      <Metric k={<Term k="spread">Bid-ask spread</Term>} v={`${o.spread.toFixed(1)} bps`} d={delta(o.spread, b.spread, " bps", false, 1)} tone={o.spread < b.spread ? "up" : "down"} />
      <Metric k={<Term k="pricedisc">Price discovery</Term>} v={`${o.disc.toFixed(0)}/100`} d={delta(o.disc, b.disc, "", true)} />
      <Metric k="Exchange revenue" v={`$${o.revenue.toFixed(1)}M/yr`} tone={o.revenue < 5 ? "down" : undefined} d={"fees + data \u2212 rebates"} />
      <Metric k="Dealer profits" v={`$${o.dealerProfit.toFixed(0)}M/yr`} d={delta(o.dealerProfit, b.dealerProfit, "M", true)} />
      <Metric k="Investor cost per trade" v={`${o.invCost.toFixed(1)} bps`} d={delta(o.invCost, b.invCost, " bps", false, 1)} />
      <Metric k={<Term k="systemic">Systemic risk</Term>} v={`${o.risk.toFixed(0)}/100`} tone={o.risk > 50 ? "down" : o.risk < 25 ? "up" : "amber"} d={delta(o.risk, b.risk, "", false)} />
      <Metric k="Regulator approval odds" v={`${o.approval.toFixed(0)}%`} tone={o.approval >= 70 ? "up" : o.approval < 45 ? "down" : "amber"} />
    </div>
  );
  const S2 = (): ReactNode => (
    <>
      <div className="chips" style={{ marginBottom: 12 }}><span className="dim" style={{ fontSize: 12, alignSelf: "center" }}>Start from:</span>{PRESETS.map((p) => <button key={p.label} className="chip" onClick={() => { setD((x) => ({ ...x, ...p.d })); if (!touched) { setTouched(true); award("xdesign"); } }}>{p.label}</button>)}</div>
      <div className="grid g-wide-left">
        <Panel title={`Design ${VENUE} (your venue)`} tour="x-design">
          <div className="field"><label>Market structure (how orders meet)</label><Seg label="Market structure" value={d.structure} onChange={(v) => set("structure", v)} options={[{ value: "clob", label: "Order book" }, { value: "rfq", label: "RFQ" }, { value: "auction", label: "Auctions" }, { value: "hybrid", label: "Hybrid" }]} /></div>
          <div className="p dim" style={{ marginTop: -4, marginBottom: 10, fontSize: 12 }}>{G[d.structure === "clob" ? "clob" : d.structure][0]}: {G[d.structure === "clob" ? "clob" : d.structure][2]}</div>
          <div className="field"><label><Term k="makertaker">Fee model</Term></label><Seg label="Fee model" value={d.fee} onChange={(v) => set("fee", v)} options={[{ value: "makertaker", label: "Maker-taker" }, { value: "flat", label: "Flat" }, { value: "subscription", label: "Subscription" }, { value: "rebate", label: "Maker rebates" }]} /></div>
          <Slider label="Fee level (per trade)" value={d.feeBps} min={0} max={6} step={0.5} fmt={(v) => `${v} bps`} onChange={(v) => set("feeBps", v)} />
          <div className="field"><label>Minimum trade size</label><Seg label="Minimum trade size" value={d.minSize} onChange={(v) => set("minSize", v)} options={[{ value: "0.25", label: "$250K" }, { value: "1", label: "$1M" }, { value: "5", label: "$5M" }, { value: "25", label: "$25M" }]} /></div>
          <div className="field"><label><Term k="pretrade">Pre-trade transparency</Term></label><Seg label="Pre-trade transparency" value={d.pre} onChange={(v) => set("pre", v)} options={[{ value: "full", label: "Full book" }, { value: "masked", label: "Size-masked" }, { value: "delayed", label: "Delayed" }]} /></div>
          <div className="field"><label><Term k="posttrade">Post-trade reporting delay</Term></label><Seg label="Post-trade reporting" value={d.post} onChange={(v) => set("post", v)} options={[{ value: "realtime", label: "Real time" }, { value: "15min", label: "15 minutes" }, { value: "eod", label: "End of day" }]} /></div>
          <div className="field"><label><Term k="mmobl">Market-maker obligations and incentives</Term></label><Switch label="Require continuous two-sided quotes" value={d.mmObl} onChange={(v) => set("mmObl", v)} /></div>
          <Slider label="Market-maker incentives (rebates, fee discounts)" value={d.mmInc} min={0} max={3} step={1} fmt={(v) => ["None", "Modest", "Generous", "Very generous"][v]} onChange={(v) => set("mmInc", v)} />
          <div className="field"><label><Term k="ccp">Clearing</Term></label><Seg label="Clearing" value={d.clearing} onChange={(v) => set("clearing", v)} options={[{ value: "ccp", label: "Central (CCP)" }, { value: "bilateral", label: "Bilateral" }]} /></div>
          <div className="field"><label><Term k="loanlevel">Loan-level data disclosure</Term></label><Seg label="Data disclosure" value={d.data} onChange={(v) => set("data", v)} options={[{ value: "none", label: "Pool summary only" }, { value: "basic", label: "Basic monthly" }, { value: "loanlevel", label: "Full loan-level" }]} /></div>
          <div className="field"><label><Term k="listing">Listing standards</Term></label><Seg label="Listing standards" value={d.listing} onChange={(v) => set("listing", v)} options={[{ value: "loose", label: "Loose" }, { value: "standard", label: "Standard" }, { value: "strict", label: "Strict" }]} /></div>
          <div className="field"><label>Who's allowed in (access)</label><Seg label="Access" value={d.access} onChange={(v) => set("access", v)} options={[{ value: "institutional", label: "Institutions only" }, { value: "qualified", label: "+ qualified investors" }, { value: "broad", label: "Broad access" }]} /></div>
        </Panel>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          <Panel title="Simulated outcomes (synthetic model)" tour="x-outcomes">{metricCards}</Panel>
          <Panel title="Participation by player type">{partBars}</Panel>
          <div className="callout"><div className="cl">Read the trade-offs</div>{o.trans > 0.7 ? "Lots of transparency: smaller investors and hedge funds pile in, but dealers and big block traders hold back. " : o.trans < 0.45 ? "Little transparency: dealers are comfortable, but price discovery is weak and smaller investors stay away. " : "A middle path on transparency keeps most groups engaged. "}{o.taker > 3 ? "High fees are pushing people back to over-the-counter trading. " : ""}{d.clearing === "bilateral" ? "Without central clearing, systemic risk and regulator worries rise. " : ""}{d.mmObl && d.mmInc === 0 ? "Obligations with no reward scare off market makers. " : ""}</div>
        </div>
      </div>
    </>
  );

  // ---------- screen 3: who wins, who loses ----------
  const verdicts = PLAYERS.map((p) => {
    let s = o.part[p.k] - b.part[p.k];
    if (p.k === "bd") s += ((o.dealerProfit - b.dealerProfit) / Math.max(1, b.dealerProfit)) * 40;
    if (["am", "ins", "pen", "bank", "hf", "small"].includes(p.k)) s += (b.invCost - o.invCost) * 3;
    return { ...p, s, v: s >= 8 ? "Winner" : s <= -8 ? "Loser" : "Mixed" };
  }).sort((x, y) => y.s - x.s);
  const pool = [{ l: "Dealers (spread)", v: o.dealerProfit, c: "var(--t1)" }, { l: "Market makers (spread + rebates)", v: o.volume * 250 * (o.spread / 2) * 1e-4 * (o.part.mm / 100) * 0.4 + Math.max(0, o.maker) * o.volume * 250 * 1e-4 * (o.part.mm / 100), c: "var(--t2)" }, { l: `${VENUE} (fees + data)`, v: Math.max(0, o.revenue), c: "var(--accent)" }];
  const poolMax = Math.max(...pool.map((x) => x.v), 1);
  const S3 = (): ReactNode => (
    <>
      <div className="grid g-wide-left">
        <Panel title="Who wins, who loses (vs. today's OTC market)" tour="x-wins">
          <div className="wins">
            {verdicts.map((p) => (
              <div key={p.k} className="win">
                <div className="wh"><b>{p.label}</b><Tag tone={p.v === "Winner" ? "ok" : p.v === "Loser" ? "bad" : "n"}>{p.v}</Tag><span className={"num " + (p.s > 0 ? "up" : p.s < 0 ? "down" : "dim")} style={{ marginLeft: "auto" }}>{(p.s >= 0 ? "+" : "") + p.s.toFixed(0)}</span></div>
                <ul>{why[p.k].slice(0, 3).map((t) => <li key={t}>{t}</li>)}{why[p.k].length === 0 && <li>Little changes for them under this design.</li>}</ul>
              </div>
            ))}
          </div>
        </Panel>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          <Panel title="Where the trading money goes ($M a year, synthetic)">
            {pool.map((x) => <div key={x.l} className="wf-row" style={{ marginBottom: 8, gridTemplateColumns: "minmax(120px,1fr) 1.4fr 70px" }}><span className="wl">{x.l}</span><span className="wf-track"><i style={{ width: `${(x.v / poolMax) * 100}%`, background: x.c }} /></span><span className="wv num">${x.v.toFixed(0)}M</span></div>)}
            <div className="p dim">Every basis point of spread or fee is a cost to investors and income to someone else. Transparency shifts money from dealers to investors; rebates shift money from the venue to market makers.</div>
          </Panel>
          <Panel title="Why people resist or support change">
            <div className="rows">
              {[["Dealers", "Earn the bid-ask spread and value knowing client flow. Transparency narrows spreads, so many resist it, unless they can become paid market makers on the venue."], ["Large investors", "Want lower costs but fear information leakage: showing a $50M order tells the market what they're doing. They like RFQ, size masking and auctions for blocks."], ["Smaller investors", "Gain most from transparency: they finally see the same prices as everyone else."], ["Data vendors", "Sell estimates of prices in opaque markets; real-time exchange prices compete with them."], ["Regulators", "Favor transparency, central clearing and surveillance, but worry about broad access to complex products."]].map((r) => <div key={r[0]} className="rw"><div className="tt">{r[0]}</div><div className="dd">{r[1]}</div></div>)}
            </div>
          </Panel>
        </div>
      </div>
      <div className="p dim" style={{ marginTop: 10 }}>Change the rules in step 3 (Market design) and come back: the verdicts and reasons update from the same synthetic model. Explore <Term k="bestex">best execution (getting clients a fair deal)</Term> and <Term k="leakage">information leakage</Term> in the dictionary.</div>
    </>
  );

  // ---------- screen 4: cold start ----------
  const spent = levers.reduce((s, id) => s + (LEVERS.find((l) => l.id === id)?.cost ?? 0), 0);
  const toggleLever = (id: string) => {
    const l = LEVERS.find((x) => x.id === id); if (!l) return;
    if (levers.includes(id)) { setLevers(levers.filter((x) => x !== id)); return; }
    if (spent + l.cost > BUDGET) { toast("Over budget", `You have ${BUDGET - spent} launch points left; ${l.label} costs ${l.cost}.`, "bad"); return; }
    setLevers([...levers, id]);
  };
  const adoptChart = (() => {
    const w = 640, h = 220, l = 40, r = 12, t = 12, bt = 26;
    const X = (i: number) => l + (i / 12) * (w - l - r), Y = (v: number) => t + (1 - v) * (h - t - bt);
    const pts = adopt.map((v, i) => `${X(i)},${Y(v)}`).join(" ");
    return (
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label="Adoption over the first 12 months">
        {[0, 0.5, 1].map((v) => <g key={v}><line x1={l} x2={w - r} y1={Y(v)} y2={Y(v)} style={{ stroke: "var(--border)" }} /><text x={l - 6} y={Y(v) + 4} textAnchor="end" fontSize={10.5} className="mono" style={{ fill: "var(--text3)" }}>{(v * 100).toFixed(0)}%</text></g>)}
        <line x1={l} x2={w - r} y1={Y(CRIT)} y2={Y(CRIT)} strokeDasharray="5 4" style={{ stroke: "var(--amber)" }} />
        <text x={w - r} y={Y(CRIT) - 5} textAnchor="end" fontSize={10.5} style={{ fill: "var(--amber)" }}>critical mass</text>
        <polygon points={`${X(0)},${Y(0)} ${pts} ${X(12)},${Y(0)}`} style={{ fill: coldOk ? "var(--up-bg)" : "var(--down-bg)" }} />
        <polyline points={pts} fill="none" strokeWidth={2.4} style={{ stroke: coldOk ? "var(--up)" : "var(--down)" }} />
        {[0, 3, 6, 9, 12].map((i) => <text key={i} x={X(i)} y={h - 8} textAnchor="middle" fontSize={10.5} style={{ fill: "var(--text3)" }}>{"Month " + i}</text>)}
        {critM >= 0 && <circle cx={X(critM)} cy={Y(adopt[critM])} r={5} style={{ fill: "var(--up)" }} />}
      </svg>
    );
  })();
  const S4 = (): ReactNode => (
    <>
      <div className="callout" style={{ marginBottom: 12 }}><div className="cl">The empty-restaurant problem</div>A new exchange faces the <Term k="coldstart">cold-start liquidity problem</Term>: buyers won't come until sellers are there, and sellers won't come until buyers are. You have {BUDGET} launch points. Pick a first product and the levers that get the first trades happening, then see if usage reaches critical mass within 9 months.</div>
      <div className="grid g-wide-left">
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          <Panel title="1. Choose the first product to list" tour="x-cold">
            <div className="chips">{FIRST_ASSET.map((a) => <button key={a.id} className={"chip" + (asset === a.id ? " on" : "")} onClick={() => setAsset(a.id)}>{a.label}</button>)}</div>
            <div className="p dim" style={{ marginTop: 8 }}>{asset === "tba" ? <span><Term k="tba">Agency MBS TBA (standard home-loan contracts)</Term> are already traded in huge volume as interchangeable contracts, so everyone trades the same few things. The easiest place to start.</span> : asset === "roy" ? "Every royalty deal is unique, so buyers and sellers rarely want exactly the same bond. The hardest place to start." : "Fairly standard deals with regular issuers. Workable, but each deal still differs."}</div>
            <div className="metrics" style={{ marginTop: 8 }}><Metric k="Standardization" v={`${Math.round((FIRST_ASSET.find((a) => a.id === asset)?.s ?? 0) * 100)}/100`} /></div>
          </Panel>
          <Panel title={`2. Spend launch points (${spent}/${BUDGET} used)`}>
            <div className="levers">
              {LEVERS.map((l) => (
                <button key={l.id} className={"lever" + (levers.includes(l.id) ? " on" : "")} onClick={() => toggleLever(l.id)} aria-pressed={levers.includes(l.id)}>
                  <div className="lh"><b>{l.label}</b><span className="num lc">{l.cost} pts</span></div>
                  <div className="ld">{l.detail}</div>
                </button>
              ))}
            </div>
          </Panel>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          <Panel title="3. Adoption over the first year (share of target volume, synthetic)">
            {adoptChart}
            <div style={{ marginTop: 8 }}>{coldOk ? <Tag tone="ok">{`Critical mass in month ${critM}`}</Tag> : critM > 9 ? <Tag tone="warn">{`Critical mass only in month ${critM}: too slow`}</Tag> : <Tag tone="bad">Never reaches critical mass</Tag>}</div>
            <div className="p dim" style={{ marginTop: 8 }}>{levers.length === 0 ? "With no help, early users find nobody to trade with and drift away." : !levers.includes("mmp") ? "Without paid market makers, early users often find no one on the other side and leave (churn)." : coldOk ? "Paid liquidity plus a standard product gets the flywheel turning: more traders, tighter prices, more traders." : "Try a more standardized first product or add anchor participants."} The design from step 3 matters too: its liquidity score ({o.liq.toFixed(0)}/100) speeds up growth.</div>
          </Panel>
          <Panel title="Real-world lessons, simply">
            <div className="rows">
              {[["Start narrow", "Launch with the most standardized product, then add others once traders are used to the venue."], ["Pay for the first liquidity", "Market-maker programs and fee holidays buy time until natural trading takes over."], ["Bring the incumbents", "Dealers control client relationships; a venue that lets them route RFQs in is easier to adopt than one that tries to replace them."], ["Watch the strings attached", <span key="a"><Term k="anchor">Anchor participants</Term> often get ownership or a say in the rules, which can work against later transparency.</span>]].map((r, i) => <div key={i} className="rw"><div className="tt">{r[0]}</div><div className="dd">{r[1]}</div></div>)}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );

  // ---------- screen 5: risks & safeguards ----------
  const pricePath = (s: number, i: number) => {
    const w = 220, h = 64; const drop = (s / 100) * 0.9; const rec = clamp(1 - s / 100, 0.15, 0.95);
    const pts = Array.from({ length: 24 }, (_, k) => { const tt = k / 23; let v = 0.12; if (tt > 0.25) v = 0.12 + drop * Math.min(1, (tt - 0.25) / 0.15); if (tt > 0.45) v = 0.12 + drop * (1 - rec * Math.min(1, (tt - 0.45) / 0.5)); const jitter = Math.sin(k * 2.3 + i) * 0.02; return `${(tt * w).toFixed(1)},${((v + jitter) * h).toFixed(1)}`; }).join(" ");
    return <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} aria-hidden="true"><polyline points={pts} fill="none" strokeWidth={2} style={{ stroke: s < 35 ? "var(--up)" : s < 60 ? "var(--amber)" : "var(--down)" }} /></svg>;
  };
  const S5 = (): ReactNode => (
    <>
      <Panel title="Safeguards (each one costs a little revenue and participation)" tour="x-safe">
        <div className="safes">
          <Switch label={<span><Term k="circuit">Circuit breakers</Term> (emergency pause)</span>} value={d.cb} onChange={(v) => set("cb", v)} />
          <Switch label={<span><Term k="margin">Margin</Term> (safety deposits)</span>} value={d.marginOn} onChange={(v) => set("marginOn", v)} />
          <Switch label={<span><Term k="surveillance">Market surveillance</Term> (the referee's replay)</span>} value={d.surv} onChange={(v) => set("surv", v)} />
          <Switch label="Independent data audits (checking servicer reports)" value={d.audit} onChange={(v) => set("audit", v)} />
          <Switch label="Position and order limits (caps on size)" value={d.limits} onChange={(v) => set("limits", v)} />
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
          <button className="btn primary" onClick={() => { runRef.current = 0; setRan(0); setRunning(true); }}>{"\u26a1"} Run all scenarios against my design</button>
          <span className="dim">Systemic risk {o.risk.toFixed(0)}/100 {"\u00b7"} approval odds {o.approval.toFixed(0)}% {"\u00b7"} revenue ${o.revenue.toFixed(1)}M/yr</span>
        </div>
      </Panel>
      <div className="scens" style={{ marginTop: 12 }}>
        {SCENS.map((s, i) => { const shown = ran > i; const lb = sevLabel(sev[i]); return (
          <div key={s.id} className={"scen" + (shown ? " shown" : "")}>
            <div className="sh"><b><Term k={s.term}>{s.title}</Term></b>{shown ? <Tag tone={lb.tone}>{lb.t}</Tag> : <Tag tone="n">Not run</Tag>}</div>
            <div className="sd">{s.story}</div>
            {shown ? <>
              {pricePath(sev[i], i)}
              <div className="wf-row" style={{ gridTemplateColumns: "70px 1fr 40px" }}><span className="wl">Damage</span><span className="wf-track"><i style={{ width: `${sev[i]}%`, background: sev[i] < 35 ? "var(--up)" : sev[i] < 60 ? "var(--amber)" : "var(--down)" }} /></span><span className="wv num">{sev[i].toFixed(0)}</span></div>
              <ul>{s.why(d).map((t) => <li key={t}>{t}</li>)}</ul>
            </> : <button className="btn sm" onClick={() => setRan(Math.max(ran, i + 1))}>Run this scenario</button>}
          </div>); })}
      </div>
    </>
  );

  // ---------- screen 6: pitch scorecard ----------
  const DIMS: { k: keyof typeof sc; label: string; good: string; bad: string }[] = [
    { k: "liquidity", label: "Liquidity", good: "Plenty of daily volume and tight spreads: people can trade when they need to.", bad: "Thin volume or wide spreads: add market-maker incentives, a hybrid structure or better data." },
    { k: "fairness", label: "Fairness", good: "Prices are visible and smaller players can take part on equal terms.", bad: "Prices stay hidden or access is narrow: consider more transparency or lower minimum sizes." },
    { k: "safety", label: "Safety", good: "Central clearing and safeguards keep shocks contained.", bad: "Shocks spread too easily: add central clearing, margin, circuit breakers and surveillance." },
    { k: "profitability", label: "Profitability", good: "The venue earns enough to fund technology, surveillance and staff.", bad: "The venue can't pay its bills: fees or data income are too low, or rebates too generous." },
    { k: "adoption", label: "Adoption", good: "Dealers, market makers and investors all have reasons to show up.", bad: "Key groups stay away: check who loses in step 4 and give them a reason to join." },
  ];
  const radar = (() => {
    const w = 340, h = 300, rc = 110, ccx = w / 2, ccy = h / 2 + 6;
    const ang = (i: number) => (i / DIMS.length) * Math.PI * 2 - Math.PI / 2;
    const P = (i: number, v: number) => `${ccx + Math.cos(ang(i)) * rc * v},${ccy + Math.sin(ang(i)) * rc * v}`;
    return (
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ maxWidth: 380 }} role="img" aria-label="Scorecard radar chart">
        {[0.25, 0.5, 0.75, 1].map((f) => <polygon key={f} points={DIMS.map((_, i) => P(i, f)).join(" ")} fill="none" style={{ stroke: "var(--border)" }} />)}
        {DIMS.map((_, i) => <line key={i} x1={ccx} y1={ccy} x2={ccx + Math.cos(ang(i)) * rc} y2={ccy + Math.sin(ang(i)) * rc} style={{ stroke: "var(--border)" }} />)}
        <polygon points={DIMS.map((x, i) => P(i, sc[x.k] / 100)).join(" ")} style={{ fill: "var(--accent-bg)", stroke: "var(--accent)", strokeWidth: 2 }} />
        {DIMS.map((x, i) => { const lx = ccx + Math.cos(ang(i)) * (rc + 26), ly = ccy + Math.sin(ang(i)) * (rc + 22); return <text key={x.k} x={lx} y={ly} textAnchor="middle" fontSize={11.5} style={{ fill: "var(--text2)" }}>{x.label} <tspan style={{ fill: "var(--text)", fontWeight: 700 }}>{letter(sc[x.k])}</tspan></text>; })}
      </svg>
    );
  })();
  const S6 = (): ReactNode => (
    <>
      <div className="grid g-wide-left">
        <Panel title={`Pitch scorecard: ${VENUE}`} tour="x-score">
          <div style={{ display: "flex", justifyContent: "center" }}>{radar}</div>
          <Tbl right={[1]} cols={["Dimension", "Score", "Grade", "Feedback"]} rows={DIMS.map((x) => [x.label, sc[x.k].toFixed(0), <Tag key={x.k} tone={sc[x.k] >= 65 ? "ok" : sc[x.k] >= 50 ? "warn" : "bad"}>{letter(sc[x.k])}</Tag>, sc[x.k] >= 65 ? x.good : x.bad])} />
        </Panel>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          <Panel title="Your pitch, in one paragraph">
            <div className="p">{VENUE} will be a {({ clob: "central limit order book", rfq: "request-for-quote venue", auction: "periodic-auction venue", hybrid: "hybrid venue (order book plus RFQ and auctions)" } as Record<string, string>)[d.structure]} for asset-backed securities, open to {({ institutional: "institutional investors", qualified: "institutions and qualified investors", broad: "a broad range of investors" } as Record<string, string>)[d.access]}, with {d.pre === "full" ? "fully visible" : d.pre === "masked" ? "size-masked" : "delayed"} quotes, {({ realtime: "real-time", "15min": "15-minute", eod: "end-of-day" } as Record<string, string>)[d.post]} trade reporting and {d.clearing === "ccp" ? "central clearing" : "bilateral settlement"}. The synthetic model expects about ${o.volume.toFixed(0)}M a day of volume at a {o.spread.toFixed(1)} bps spread (vs. {b.spread.toFixed(1)} bps over the counter), ${o.revenue.toFixed(1)}M a year of venue revenue and {o.approval.toFixed(0)}% odds of regulator approval. Launch plan: {coldOk ? `critical mass by month ${critM}` : "not yet convincing"}.</div>
          </Panel>
          <Panel title="Badges for this module">
            <div className="xbadges">
              {[["Market Architect", "Score B or better (65+) on all five dimensions.", allB], ["Cold Start Solver", "Reach critical mass by month 9 in the launch plan.", coldOk], ["Stress Tester", "Contain all six risk scenarios after running them.", ran >= SCENS.length && sev.every((x) => x < 35)], ["Marketplace Mapper", "Explore 8 or more roles on the marketplace map.", seenRoles.length >= 8]].map((r) => <div key={String(r[0])} className="xbadge"><div className="xbh"><b>{r[2] ? "\u2605 " : "\u2606 "}{r[0]}</b>{r[2] ? <Tag tone="ok">Earned</Tag> : <Tag tone="n">Not yet</Tag>}</div><div className="xbd">{r[1]}</div></div>)}
            </div>
          </Panel>
          <div className="callout"><div className="cl">Overall</div>{allB ? "A credible pitch: liquid, fair, safe, self-funding and attractive to the people who must show up. That balance is the whole game." : `Weakest area: ${DIMS.slice().sort((x, y) => sc[x.k] - sc[y.k])[0].label.toLowerCase()}. Every rule helps someone and costs someone else; adjust the design in step 3, the launch plan in step 5 or safeguards in step 6.`}</div>
        </div>
      </div>
    </>
  );

  // ---------- coach, tour, tape ----------
  const coach = ((): string => {
    switch (stage) {
      case 0: return pathT < 6 ? "Press play to follow one trade down both paths. Then switch the order size: an exchange is cheapest for small trades, but very large blocks can be harder on a visible order book." : "Notice what the public learns and when. Over the counter, only the dealers you called know the price until the trade is reported. On an exchange, everyone sees it at once.";
      case 1: return `Click each box to see what the participant does, what it needs, how it's paid and where its conflicts are. You've explored ${seenRoles.length} of ${ROLES.length}; explore 8 for the Marketplace Mapper badge. Then switch to "Who pays whom".`;
      case 2: return o.taker > 3 ? "Your fees are high. Revenue per trade looks great, but volume is draining back to over-the-counter trading. Try 1 to 2 bps." : o.trans > 0.8 && d.structure === "clob" ? "A fully lit order book is great for price discovery and smaller investors, but watch the insurers and money managers: big orders fear information leakage." : d.clearing === "bilateral" ? "Bilateral settlement keeps things like OTC: regulators and banks get nervous because one failure can spread." : "Every control moves several numbers at once. Watch participation by player type: a market needs dealers, market makers and investors to all show up.";
      case 3: return "Each verdict compares your design with today's over-the-counter market using the same synthetic model. Incentives explain behavior: people support rules that pay them and resist rules that cost them.";
      case 4: return coldOk ? `Critical mass in month ${critM}. A standard first product plus paid liquidity is how many real venues got going.` : "Pick the first product and spend your launch points. Hint: the most standardized products, like agency MBS TBA, make the cold start much easier.";
      case 5: return ran < SCENS.length ? "Run the scenarios to stress your design. Then switch safeguards on and off to see which ones contain which risks, and what they cost." : sev.every((x) => x < 35) ? "Every scenario contained. Check the scorecard: safeguards cost some revenue and participation." : "Some scenarios still do damage. Each card explains why; the matching safeguard or design rule is usually named there.";
      case 7: return "The PRFAQ turns your design into words: a future press release for customers, then the questions customers and the founding team would ask. Read it here, print it, or download the PDF. Every firm and number is fictional.";
      default: return allB ? "All five grades are B or better. That's a balanced exchange." : "The scorecard summarizes trade-offs. You rarely max everything: more safety and transparency can cost revenue and dealer support.";
    }
  })();
  const TOUR: { sel: string; title: string; body: string }[] = [
    { sel: "mode", title: "Welcome to Exchange Builder", body: "A separate module: design a new marketplace where asset-backed securities could trade. Switch between Deal Lab and Exchange Builder here at any time (or press X)." },
    { sel: "rail", title: "Eight steps", body: "From how ABS trade today (over the counter, by phone with dealers) to a final pitch scorecard and a written PRFAQ (press release + FAQ) for your exchange." },
    { sel: "workspace", title: "Hands-on workspace", body: "Play a trade down both paths, explore a clickable marketplace map, set the rules, plan the launch and stress-test the design. All numbers come from a made-up (synthetic) model; all firms are fictional." },
    { sel: "coach", title: "Coach, terms and quizzes", body: "The coach explains each step in plain English, key terms are listed with their everyday meaning, and each step has a quick check for XP. New exchange terms are in the dictionary too." },
    { sel: "", title: "Replay anytime", body: "You can replay this tour anytime from the Replay tour button, the G key, or the ? help overlay. Badges here: Marketplace Mapper, Cold Start Solver, Stress Tester and Market Architect." },
  ];
  const tape = [
    { t: "VENUE", d: `${VENUE} (fictional)` }, { t: "STRUCTURE", d: ({ clob: "Order book", rfq: "RFQ", auction: "Auctions", hybrid: "Hybrid" } as Record<string, string>)[d.structure] },
    { t: "VOLUME", d: `$${o.volume.toFixed(0)}M/day` }, { t: "SPREAD", d: `${o.spread.toFixed(1)} bps vs ${b.spread.toFixed(1)} OTC`, tone: o.spread < b.spread ? "up" : "down" },
    { t: "REVENUE", d: `$${o.revenue.toFixed(1)}M/yr` }, { t: "RISK", d: `${o.risk.toFixed(0)}/100`, tone: o.risk > 50 ? "down" : "up" }, { t: "APPROVAL", d: `${o.approval.toFixed(0)}%` }, { t: "MODEL", d: "Synthetic, for learning only" },
  ];
  const top = [
    { k: "Venue", v: VENUE, hide: true }, { k: "Structure", v: tape[1].d, hide: true },
    { k: "Spread", v: `${o.spread.toFixed(1)} bps`, tone: o.spread < b.spread ? "up" : "down" }, { k: "Approval", v: `${o.approval.toFixed(0)}%`, hide: true, tone: o.approval >= 70 ? "up" : o.approval < 45 ? "down" : "" },
  ];
  const openPrint = (): void => {
    const w = window.open("", "_blank");
    if (!w) { toast("Pop-up blocked", "Allow pop-ups for this site, or use Download PDF.", "bad"); return; }
    w.document.open(); w.document.write(prfaqDocument(true)); w.document.close();
  };
  const S7 = (): ReactNode => (
    <Panel title="PRFAQ: Lighthouse ABS Exchange (hypothetical)" tour="x-prfaq" right={
      <div className="prfaq-actions">
        <button className="btn sm" onClick={openPrint} title="Open a clean, printable copy in a new tab">Print-friendly view</button>
        <a className="btn sm primary" href={PRFAQ_PDF} download title="Download the 5-page PDF">Download PDF</a>
      </div>
    }>
      <div className="callout info" style={{ marginBottom: 12 }}>A PRFAQ (press release + FAQ) is a short planning document: a press release written as if the exchange had already launched, then the questions customers and the founding team would ask. About 5 pages. Everything in it is fictional and illustrative.</div>
      <article className="prfaq" dangerouslySetInnerHTML={{ __html: PRFAQ_BODY }} />
    </Panel>
  );
  const screens = [S0, S1, S2, S3, S4, S5, S6, S7];
  return { stage, setStage, maxSeen, screen: () => screens[stage](), coach, terms: TERMS_X[stage], quiz: QUIZ_X[stage], quizAns: quiz[stage], answer, TOUR, tape, top };
}
