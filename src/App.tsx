import { Page, Section, Text, Grid, Callout, Table, Diagram, Properties, Button, Segmented, Status, ColumnSeries, Rows, Steps, Toggle, useGrokTheme, useState, useMemo, Fragment } from "./grok-canvas";
import type { ReactNode, ChangeEvent } from "./grok-canvas";

// ---------- deterministic mock data ----------
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(r: () => number): number {
  return Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());
}
const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));
const fm = (x: number): string => {
  const s = x < 0 ? "-" : "";
  const v = Math.abs(x);
  if (v >= 1e9) return s + "$" + (v / 1e9).toFixed(2) + "B";
  if (v >= 1e6) return s + "$" + (v / 1e6).toFixed(v >= 1e8 ? 0 : 1) + "M";
  if (v >= 1e3) return s + "$" + (v / 1e3).toFixed(0) + "K";
  return s + "$" + v.toFixed(0);
};
const pc = (x: number, d = 1): string => x.toFixed(d) + "%";
const mo = (v: number): string => (v >= 120 ? `${v} months (${(v / 12).toFixed(0)} yrs)` : `${v} months`);

// ---------- dictionary: [industry term, everyday analogy, plain-English explanation] ----------
const G: Record<string, [string, string, string]> = {
  abs: ["Asset-backed security, ABS", "loan-backed bond", "An IOU sold to investors that is paid back from a basket of loans or other payments. Instead of one borrower paying you, thousands do, through the basket."],
  pool: ["Collateral pool", "basket", "A big bundle of loans (or leases, card balances, royalties). Every month the payments flow into the basket. The basket is what everyone is really buying a piece of."],
  tranche: ["Tranche", "floor", "The basket is sliced into floors, like a building. Money coming in pays the top floor first. Losses flood the bottom floor first. Top is safer but pays less. Bottom is riskier but pays more."],
  ce: ["Credit enhancement", "safety cushion", "Everything that has to be lost before a floor loses a cent. Like a phone case: the thicker it is, the bigger the drop the phone survives."],
  sub: ["Subordination", "lower floors absorbing losses first", "The floors under yours. They take losses before you do, so they are part of your cushion."],
  oc: ["Overcollateralization, OC", "extra padding", "Putting more loans in the basket than the IOUs sold. Like packing 110 eggs for an order of 100: a few can break and the order still arrives whole."],
  reserve: ["Reserve account", "rainy-day fund", "A pot of cash set aside on day one. If a month comes up short, it is used to pay investors on time."],
  xs: ["Excess spread", "leftover interest", "Borrowers pay a higher interest rate than investors receive. The gap is leftover money each month that soaks up losses first. Whatever is not needed goes to the owner."],
  rating: ["Credit rating", "grade", "A report card for each floor from a grading agency: AAA (super safe), then AA, A, BBB, BB. Lower grades must pay investors more."],
  spread: ["Spread", "extra pay", "How much more interest a floor pays than the safe government rate. The riskier the floor, the more extra pay it takes to attract buyers."],
  bps: ["Basis points, bps", "hundredths of a percent", "Traders count in tiny units: 100 bps = 1%. So 150 bps means 1.5% extra per year."],
  benchmark: ["Benchmark rate", "safe rate", "The interest rate on the safest loan there is: lending to the government. Everything else is priced as safe rate plus extra pay. Here it starts at 4.00% (mock)."],
  coupon: ["Coupon", "interest rate paid", "The yearly interest a floor pays its owners, as a % of what they put in."],
  cdr: ["Default rate, CDR", "loans going bad", "Constant default rate: the % of remaining loans whose borrowers stop paying each year. 2% means about 2 in every 100 go bad per year."],
  cpr: ["Prepayment, CPR", "early payoffs", "Constant prepayment rate: the % of loans paid off early each year: people sell the car or house, or refinance. Money comes back sooner, but the interest stops."],
  mpr: ["Monthly payment rate, MPR", "monthly payback", "For credit cards: the share of all balances that cardholders pay back each month. 18% means the average balance is paid off in about 5 to 6 months."],
  sev: ["Loss severity", "loss when a loan goes bad", "When a borrower stops paying, whatever can be recovered is (a car or home sold, collections). Severity is the share still lost. 50% means half is gone."],
  el: ["Expected net loss", "expected losses", "How much of the basket we think will be lost to bad loans in a normal economy."],
  wal: ["Weighted average life, WAL", "average wait for your money", "On average, how many years until you get your money back. The top floor is repaid first, so its wait is short."],
  waterfall: ["Waterfall", "payment order", "The rulebook for who gets paid, in what order, each month. Like a champagne tower: the top glass fills first, then it spills down."],
  seq: ["Sequential pay", "one floor at a time", "Repayments go entirely to the top floor until it is paid off, then to the next floor, and so on."],
  trigger: ["Performance trigger", "tripwire", "A rule in the deal: if things go badly, the payment order changes to protect the top floors."],
  stepdown: ["Step-down", "cushion release", "After a deal has behaved well for a while, some extra padding is allowed to be released back to the owner."],
  price: ["Price per 100", "what you pay per $100 owed", "Bond prices are quoted per $100 owed. 101 means paying $101 for every $100 you will be repaid. Above 100 is a premium, below is a discount."],
  oversub: ["Oversubscription", "orders vs. supply", "If investors ask for $300M of a $100M floor, it is 3x covered. Lots of demand means you could have offered less extra pay."],
  bid: ["Bid", "the price you can sell at", "The price the dealer will pay you if you sell to them."],
  ask: ["Ask / offer", "the price you can buy at", "The price the dealer charges if you buy. Always a bit above the sell price; that gap is how the dealer earns a living."],
  pnl: ["P&L", "profit or loss", "How much you have made or lost so far, counting your cash plus what your holdings are worth right now."],
  dv01: ["Duration / DV01", "rate sensitivity", "How much a bond's price moves when rates move. The longer the wait for your money, the bigger the price swing."],
  residual: ["Residual / equity tranche", "owner's slice", "Whatever is left after every floor is paid. The riskiest piece, usually kept by the lender. Big upside if borrowers keep paying."],
  fico: ["FICO score", "credit score", "A 300 to 850 number that predicts how likely someone is to repay. 720+ is strong; under 620 is called subprime."],
  spv: ["Special purpose vehicle, SPV", "walled-off box", "A separate mini-company set up for one job: owning the basket and issuing the bonds. It has no employees. Because it is walled off, if the lender goes bust, the lender's creditors can't grab the loans, and investors keep getting paid from borrowers' payments."],
  truesale: ["True sale", "a real sale", "The lender truly sells the loans to the special purpose vehicle and gets cash for them. Once sold, they no longer belong to the lender, so the lender's creditors can't claim them."],
  bkremote: ["Bankruptcy-remote", "walled off from bankruptcy", "Set up so that if the lender (or anyone else) goes bust, the special purpose vehicle and its basket are not dragged in. The bonds depend only on the borrowers' payments."],
  mark: ["Mark-to-market", "what it's worth today", "Valuing what you hold at today's price, not the price you paid."],
  short: ["Short selling", "betting it drops", "Selling a bond you don't own (borrowed from the dealer), hoping to buy it back cheaper later."],
  book: ["Book-building", "taking orders", "Before the sale, the dealer calls investors and writes down how much each wants and for how much extra pay."],
  servicer: ["Servicer", "payment collector", "The team that collects monthly payments, chases late payers and recovers what it can when loans go bad."],
  trustee: ["Trustee", "referee", "An independent firm that makes sure money is paid in the right order and the deal's rules are followed."],
  mbs: ["Mortgage-backed security, MBS", "home-loan bond", "A bond paid by a basket of home mortgages. The biggest bond market of its kind in the world."],
  agency: ["Agency MBS", "government-backed home-loan bond", "Home-loan bonds where a government-sponsored company or agency promises investors they will be paid even if homeowners default. The worry shifts from losses to timing."],
  privatelabel: ["Private-label MBS", "no-guarantee home-loan bond", "Also called non-agency. Home-loan bonds without a government promise. They rely on floors and cushions, like the deals in this lab."],
  prepayrisk: ["Prepayment risk", "early payoff risk", "When rates fall, borrowers refinance and pay you back early, just when you can only reinvest at lower rates."],
  revolving: ["Revolving structure", "refilling basket", "Card balances get paid off and re-borrowed all the time. For a few years the deal uses repayments to buy new balances, so the basket stays full."],
  mastertrust: ["Master trust", "one big shared basket", "A single trust holding millions of card accounts that issues many bond series over the years, all paid from the same shared basket."],
  earlyam: ["Early amortization trigger", "emergency payback tripwire", "A tripwire for refilling deals: if leftover interest turns negative, refilling stops and all repayments go straight to investors."],
  deferment: ["Deferment / forbearance", "payment pause", "Borrowers allowed to pay nothing for a while, e.g. while still in school. Unpaid interest is added to what they owe."],
  guarantee: ["Government guarantee", "a government safety net", "For example the US FFELP student-loan program. A government promise to cover most of the loss if a borrower defaults, so investors lose very little."],
  royalty: ["Royalty income", "song paychecks", "Money a song earns every time it is streamed, sold, played on the radio or used in a film or ad."],
  clo: ["Collateralized loan obligation, CLO", "business-loan bond", "A bond paid by a basket of loans to mid-size companies, run by a manager who can buy and sell loans."],
  senior: ["Senior tranche", "top floor", "The safest slice. It is paid first and loses money last, so it pays the least interest. Usually rated AAA."],
  mezz: ["Mezzanine tranche", "middle floor", "The slice in the middle: paid after the senior tranche and loses money before it. Medium risk, medium pay."],
  junior: ["Junior tranche", "bottom floor", "The lowest slice sold to investors. After the owner's slice, it loses money first, so it pays the most."],
  originator: ["Originator", "the lender that made the loans", "The company that made the loans in the first place and sells them into the deal."],
  underwriter: ["Underwriter", "the dealer that sells the deal", "The investment bank that designs the deal with the seller, lines up investors and sells the bonds."],
  stress: ["Stress test", "storm test", "Running the deal through a much worse economy than expected to see which tranches still get paid in full."],
  secondary: ["Secondary market", "trading afterwards", "Where bonds are bought and sold between investors after the first sale."],
  lease: ["Equipment lease", "machine rental", "A rental contract: a business pays monthly to use a machine (tractor, truck, scanner) instead of buying it."],
};

// ---------- asset types ----------
type Ev = { title: string; detail: string; w: number; bk?: boolean; bench?: number; unemp?: number; cpr?: number; sev?: number; sp?: number[] };
type R4 = [number, number, number, number];
type AssetDef = {
  id: string; name: string; pro: string; tk: string; thing: string; who: string;
  orig: string; oRole?: string; short: string; serv: string; trust: string; recover: string;
  n: R4; size: number; score: R4; scoreLabel: string; scoreTerm?: boolean; rate: R4; rateLabel: string; term: R4;
  elBase: number; elSlope: number; annual?: boolean; sev: number; cpr: number; lifeK: number; fee: number;
  rev?: boolean; defer?: [number, number]; refi: number; uSens: number; liq: number; guar?: string;
  st: R4; sp: [number, number, number]; xs: [number, number]; thr: number[]; fairK: number; inv: R4;
  events: Ev[]; presets: [string, number, number, number][];
  what: string; like: string; fact: string; notes: [string, string][];
};
const ASSETS: AssetDef[] = [
  {
    id: "auto", name: "Car loans", pro: "auto ABS", tk: "abs", thing: "car loans", who: "drivers", orig: "Sunrise Auto Finance", short: "Sunrise", serv: "Sunrise Collections", trust: "Sunrise Auto Trust 2026-1", recover: "selling repossessed cars",
    n: [2000, 40000, 1000, 20000], size: 26000, score: [580, 790, 5, 690], scoreLabel: "Average credit score", scoreTerm: true, rate: [4, 20, 0.25, 9.5], rateLabel: "Loan rate, APR (what drivers pay)", term: [36, 72, 12, 60],
    elBase: 0.6, elSlope: 0.07, sev: 0.5, cpr: 0.12, lifeK: 0.42, fee: 0.01, refi: 0.03, uSens: 0.3, liq: 1,
    st: [74, 10, 7, 1], sp: [80, 120, 220], xs: [1.5, 8], thr: [5, 4, 3, 2, 1.3], fairK: 1, inv: [1, 1, 1, 1],
    events: [
      { title: "Layoffs spike", detail: "Unemployment jumped. More drivers may miss payments, so investors want more extra pay, mostly on lower floors.", w: 1.2, unemp: 1, sp: [10, 35, 90] },
      { title: "Hiring boom", detail: "Jobs are plentiful. Fewer missed payments expected, so lower floors rally.", w: 1.2, unemp: -0.5, sp: [-4, -12, -30] },
      { title: "Used-car prices slump", detail: "Repossessed cars now sell for less, so each bad loan loses more.", w: 1, sev: 0.1, sp: [5, 20, 60] },
    ],
    presets: [["Sunny", 0.7, 15, 45], ["Mild slowdown", 2, 10, 55], ["Big recession", 3.5, 6, 60], ["Disaster", 6, 4, 70]],
    what: "Bonds paid by thousands of people's monthly car payments.", like: "Owning a thin slice of the car payments of a whole city's drivers.", fact: "Car-loan bonds are one of the biggest asset-backed markets in the US, and their top floors were paid in full even through the 2008 crisis.",
    notes: [["Amortizing (how money comes in)", "Each loan shrinks a little every month as drivers pay (amortizing). Most are paid off in 3 to 6 years."]],
  },
  {
    id: "mortgage", name: "Home mortgages", pro: "MBS", tk: "mbs", thing: "home loans", who: "homeowners", orig: "Hearthstone Home Lending", short: "Hearthstone", serv: "Hearthstone Loan Servicing", trust: "Hearthstone Mortgage Trust 2026-1", recover: "selling foreclosed homes",
    n: [500, 6000, 100, 2000], size: 320000, score: [620, 800, 5, 740], scoreLabel: "Average credit score", scoreTerm: true, rate: [3, 9, 0.125, 6.5], rateLabel: "Mortgage rate (what homeowners pay)", term: [180, 360, 60, 360],
    elBase: 1.0, elSlope: 0.1, sev: 0.35, cpr: 0.08, lifeK: 0.3, fee: 0.0025, refi: 0.35, uSens: 0.2, liq: 0.6, guar: "Agency guarantee (government-backed loans)",
    st: [88, 5, 3, 0.5], sp: [95, 185, 280], xs: [2, 6], thr: [5, 4, 3, 2, 1.3], fairK: 1.2, inv: [1, 1.2, 1.5, 0.9],
    events: [
      { title: "Home prices fall 5%", detail: "Foreclosed homes would sell for less, so each bad loan loses more. Lower floors drop.", w: 1.2, sev: 0.08, sp: [8, 30, 70] },
      { title: "Refinance boom", detail: "Homeowners rushed to refinance into cheaper loans and paid old ones off early. Bonds bought above 100 lose value when repaid at 100.", w: 1.2, cpr: 1.8 },
      { title: "Layoffs spike", detail: "Some homeowners may struggle with payments. Investors want more extra pay on lower floors.", w: 1, unemp: 1, sp: [6, 25, 70] },
    ],
    presets: [["Housing boom", 0.5, 14, 25], ["Rates fall: refi wave", 0.8, 35, 30], ["2008-style housing crash", 5, 4, 50], ["Worse than 2008", 8, 3, 60]],
    what: "Bonds paid by homeowners' monthly mortgage payments.", like: "Collecting a small slice of the house payments from thousands of homes.", fact: "US home-loan bonds are a market worth trillions of dollars, one of the largest bond markets on Earth.",
    notes: [
      ["Agency vs. private-label (guarantee vs. none)", "Most US home-loan bonds are agency bonds: government-sponsored companies (Fannie Mae, Freddie Mac) or a government agency (Ginnie Mae) promise investors they will be paid even if homeowners default. Private-label bonds have no such promise, so they need floors and cushions like this lab. Flip the switch below to see the difference."],
      ["Prepayment risk (the early payoff problem)", "When rates fall, homeowners refinance and pay off old loans early. Investors get money back exactly when they can only reinvest at lower rates. When rates rise, nobody refinances, so investors wait longer than planned."],
      ["The 2008 cautionary tale", "In the mid-2000s lenders made home loans to people who could not afford them, often without checking income. These were bundled, graded AAA, and sold worldwide. When home prices fell, defaults soared far beyond the grading assumptions, supposedly safe floors lost money, and the shock spread through banks everywhere. Lesson: a cushion is only as good as the loss estimate behind it."],
    ],
  },
  {
    id: "cards", name: "Credit cards", pro: "credit card ABS", tk: "revolving", thing: "card balances", who: "cardholders", orig: "Bluewave Card Services", oRole: "the card company", short: "Bluewave", serv: "Bluewave Card Services", trust: "Bluewave Card Master Trust", recover: "collection agencies",
    n: [20000, 300000, 10000, 150000], size: 3200, score: [600, 800, 5, 700], scoreLabel: "Average credit score", scoreTerm: true, rate: [14, 29, 0.5, 22], rateLabel: "Card APR (what cardholders pay)", term: [36, 84, 12, 60],
    elBase: 1.5, elSlope: 0.06, annual: true, sev: 0.9, cpr: 0.18, lifeK: 1, fee: 0.02, rev: true, refi: 0, uSens: 0.45, liq: 0.6,
    st: [78, 7, 7, 1], sp: [60, 100, 130], xs: [0.5, 8], thr: [5, 4, 3, 2, 1.3], fairK: 0.8, inv: [1, 1, 1.3, 1],
    events: [
      { title: "Layoffs spike", detail: "Card losses follow jobs closely. More cardholders may stop paying, so lower floors fall.", w: 1.3, unemp: 1, sp: [6, 25, 70] },
      { title: "Shoppers pay balances down faster", detail: "Cardholders paid off more than usual this month. Good for credit, but money comes back sooner.", w: 1, cpr: 1.2 },
      { title: "Charge-offs tick up", detail: "The card company wrote off more unpaid balances than expected.", w: 1, unemp: 0.5, sp: [4, 15, 40] },
    ],
    presets: [["Strong economy", 0.8, 22, 88], ["Mild slowdown", 1.6, 18, 90], ["Deep recession", 2.6, 12, 92], ["Disaster", 4, 8, 95]],
    what: "Bonds paid by people's credit card balances.", like: "A bucket under a running tap with a hole in it: balances drain out as people pay and pour back in as they spend, so the level stays steady for years.", fact: "Cardholders often pay 20%+ interest while the top floor pays investors around 5%. That big gap is what soaks up card losses, which can run 3% to 10% a year.",
    notes: [
      ["Revolving period (short and renewing)", "Card balances are paid off in months, not years. So for most of the deal, repayments are used to buy fresh balances (the basket refills). Only near the end are investors paid back."],
      ["Master trust (one big shared basket)", "Card companies use a master trust: one giant basket of millions of accounts that issues many bond series over time."],
      ["Early amortization trigger (tripwire)", "If leftover interest turns negative for 3 months in a row, refilling stops and every dollar repaid goes to investors right away (early amortization). Try the Disaster storm to trip it."],
    ],
  },
  {
    id: "student", name: "Student loans", pro: "student loan ABS", tk: "abs", thing: "student loans", who: "graduates", orig: "Brightpath Student Lending", short: "Brightpath", serv: "Brightpath Loan Services", trust: "Brightpath Student Loan Trust 2026-1", recover: "collections",
    n: [2000, 40000, 1000, 15000], size: 32000, score: [620, 800, 5, 710], scoreLabel: "Average credit score", scoreTerm: true, rate: [4, 14, 0.25, 8], rateLabel: "Loan rate, APR (what graduates pay)", term: [120, 240, 60, 120],
    elBase: 1.0, elSlope: 0.08, sev: 0.75, cpr: 0.05, lifeK: 0.4, fee: 0.01, defer: [0.2, 24], refi: 0.1, uSens: 0.2, liq: 1.3, guar: "FFELP guarantee (government-guaranteed loans)",
    st: [78, 8, 5, 1], sp: [90, 165, 260], xs: [1.5, 6], thr: [5, 4, 3, 2, 1.3], fairK: 1.1, inv: [1, 1.1, 1, 1],
    events: [
      { title: "Graduate hiring boom", detail: "New grads are landing jobs quickly, so fewer are expected to fall behind.", w: 1.2, unemp: -0.5, sp: [-3, -10, -25] },
      { title: "Payment pause ends", detail: "Borrowers on a pause must start paying again. Some will struggle at first.", w: 1, unemp: 0.5, sp: [5, 20, 50] },
      { title: "Refinancing offers spread", detail: "Lenders offer cheaper loans to high earners, who pay off their old student loans early.", w: 1, cpr: 1.4 },
    ],
    presets: [["Strong job market", 0.7, 6, 70], ["Slow hiring", 1.8, 4, 75], ["Deep recession", 3, 2, 80], ["Disaster", 5, 2, 85]],
    what: "Bonds paid by graduates' student loan payments.", like: "Betting on a big group of graduates' future paychecks, paid back slowly over a decade or more.", fact: "Student loans can run 10 to 25 years and there is no car or house to take back, so investors wait a long time and rely on borrowers' (and co-signers') willingness to pay.",
    notes: [
      ["Deferment (payment pauses)", "Many borrowers pay nothing while in school or just after (deferment). Here 20% of the basket pays nothing for the first 24 months, and their unpaid interest is added to what they owe."],
      ["FFELP vs. private (guaranteed vs. not)", "Older US government-program loans (FFELP) were about 97% guaranteed against default, so losses barely matter. Private student loans have no guarantee. Flip the switch below to compare."],
    ],
  },
  {
    id: "equipment", name: "Equipment leases", pro: "equipment ABS", tk: "lease", thing: "equipment leases", who: "businesses", orig: "Ironclad Equipment Finance", oRole: "the leasing company", short: "Ironclad", serv: "Ironclad Lease Servicing", trust: "Ironclad Equipment Trust 2026-1", recover: "selling repossessed machines",
    n: [500, 10000, 250, 4000], size: 85000, score: [600, 800, 5, 710], scoreLabel: "Average business credit score", rate: [5, 14, 0.25, 8.5], rateLabel: "Lease rate (what businesses pay)", term: [24, 60, 12, 48],
    elBase: 0.8, elSlope: 0.07, sev: 0.45, cpr: 0.08, lifeK: 0.45, fee: 0.01, refi: 0.03, uSens: 0.3, liq: 1.3,
    st: [80, 8, 5, 1], sp: [70, 120, 210], xs: [1.5, 8], thr: [5, 4, 3, 2, 1.3], fairK: 1, inv: [1, 1, 1, 1.1],
    events: [
      { title: "Factory orders slump", detail: "Businesses are busy less, so some may struggle to make lease payments.", w: 1.2, unemp: 0.7, sp: [6, 20, 55] },
      { title: "Used machine prices drop", detail: "Repossessed tractors and trucks fetch less at auction, so each bad lease loses more.", w: 1, sev: 0.1, sp: [4, 15, 40] },
      { title: "Business investment boom", detail: "Companies are expanding and paying reliably. Lower floors rally.", w: 1.2, unemp: -0.5, sp: [-4, -12, -28] },
    ],
    presets: [["Business boom", 0.7, 10, 40], ["Slowdown", 2, 8, 50], ["Recession", 3.5, 5, 55], ["Disaster", 6, 3, 65]],
    what: "Bonds paid by businesses renting tractors, trucks, medical scanners and copiers.", like: "Renting out a fleet of machines and selling the stack of future rent checks.", fact: "Businesses rarely stop paying for machines they need to earn money, so equipment deals usually have low losses.",
    notes: [["Amortizing (how money comes in)", "Each lease pays a fixed amount every month for 2 to 5 years. If a business stops paying, the machine is taken back and sold."]],
  },
  {
    id: "music", name: "Song royalties", pro: "royalty ABS", tk: "royalty", thing: "song royalty streams", who: "listeners and platforms", orig: "Starlight Music Catalog Co.", oRole: "the catalog owner", short: "Starlight", serv: "Starlight Royalty Collections", trust: "Starlight Royalty Trust 2026-1", recover: "licensing old songs",
    n: [50, 1000, 25, 250], size: 220000, score: [600, 800, 5, 720], scoreLabel: "Catalog strength (higher = steadier hits)", rate: [6, 14, 0.25, 9.5], rateLabel: "Royalty yield (yearly royalties as % of value)", term: [60, 180, 12, 120],
    elBase: 2.0, elSlope: 0.1, sev: 0.6, cpr: 0.02, lifeK: 0.45, fee: 0.02, refi: 0, uSens: 0.05, liq: 3,
    st: [70, 12, 8, 2], sp: [200, 220, 360], xs: [1.5, 6], thr: [6, 5, 3.5, 2.5, 1.5], fairK: 1.4, inv: [0.9, 0.8, 0.6, 1.3],
    events: [
      { title: "Old hit goes viral", detail: "A decades-old song is trending on social video. Streams and royalties jump.", w: 1.3, sev: -0.05, sp: [-10, -25, -50] },
      { title: "Streaming payout cut", detail: "A big platform pays less per stream, so royalty income drops.", w: 1.2, sev: 0.1, sp: [8, 25, 60] },
      { title: "Record catalog sale", detail: "A famous artist's catalog sold for a huge price, so investors value royalty streams more.", w: 1, sp: [-6, -15, -30] },
    ],
    presets: [["Viral revival", 0.4, 2, 40], ["Fading fame", 2, 2, 60], ["Format collapse (like CDs in the 2000s)", 3.5, 2, 70], ["Disaster", 6, 1, 80]],
    what: "Bonds paid by the royalties songs earn when they are streamed, sold, played on the radio or used in films.", like: "Selling the next 10 years of a band's paychecks today for a lump of cash.", fact: "In 1997 David Bowie raised $55M with 'Bowie bonds' backed by royalties from his albums. They were downgraded in 2004 as downloads hurt CD sales, but were paid off in 2007.",
    notes: [
      ["What a 'loss' means here", "Nobody defaults. Instead songs fade from fashion or a format dies, so royalty income comes in below plan. The default rate here stands for songs that stop earning."],
      ["Why rating agencies are stricter", "Unusual collateral pools with little history get tougher stress tests: here AAA needs about 6x expected losses, not 5x."],
    ],
  },
  {
    id: "clo", name: "Business loans", pro: "CLO", tk: "clo", thing: "business loans", who: "mid-size companies", orig: "Northgate Capital", oRole: "the loan manager", short: "Northgate", serv: "Northgate Capital", trust: "Northgate CLO 2026-1", recover: "restructuring bankrupt companies",
    n: [100, 400, 10, 200], size: 2500000, score: [600, 780, 5, 670], scoreLabel: "Average company credit strength", rate: [6, 13, 0.25, 9.5], rateLabel: "Loan rate (what companies pay)", term: [48, 96, 12, 84],
    elBase: 1.5, elSlope: 0.07, sev: 0.35, cpr: 0.2, lifeK: 0.5, fee: 0.005, refi: 0.05, uSens: 0.35, liq: 1.5,
    st: [62, 14, 8, 0], sp: [120, 220, 420], xs: [1.5, 6], thr: [5.5, 4.5, 3.5, 2.5, 1.5], fairK: 1.5, inv: [1, 1.3, 1.2, 1.2],
    events: [
      { title: "Company defaults rise", detail: "More indebted companies are missing payments. Lower floors fall sharply.", w: 1.3, unemp: 1, sp: [12, 40, 120] },
      { title: "Loan prices rally", detail: "Investors are piling into business loans. Everyone accepts less extra pay.", w: 1, sp: [-8, -20, -40] },
      { title: "Companies refinance", detail: "Healthy companies swapped their loans for cheaper ones, paying the basket back early.", w: 1, cpr: 1.5 },
    ],
    presets: [["Calm credit", 0.6, 25, 30], ["Slowdown", 2, 15, 40], ["2008-style credit crunch", 3.5, 10, 50], ["Disaster", 6, 5, 60]],
    what: "Bonds paid by loans to mid-size companies, often ones bought by private equity firms.", like: "Buying a slice of a bank's whole business-loan book, with a manager picking the loans.", fact: "Top-floor CLO bonds had essentially no losses through 2008 and 2020, which is why insurers and banks love them.",
    notes: [
      ["Active management (a manager runs it)", "Unlike most baskets, a loan manager can sell weak loans and buy new ones for the first few years."],
      ["Floating-rate coupons (rates that move)", "Real business loans and CLO floors pay a rate that moves with the safe rate. This lab simplifies them to fixed rates."],
    ],
  },
];

// ---------- players ----------
// name + plain-English role, used everywhere a fictional company is mentioned
const nr = (name: string, role: string): string => `${name} (${role})`;
const lr = (A: AssetDef): string => A.oRole ?? "the lender";
// industry name first, everyday name in parentheses, e.g. "Auto ABS (car loans)"
const proName = (x: AssetDef): string => `${x.pro.charAt(0).toUpperCase() + x.pro.slice(1)} (${x.name.toLowerCase()})`;
const SPV_ROLE = "the special purpose vehicle";
const TRUSTEE = nr("Granite Trust Co.", "the trustee");
const DEALER = nr("Bluebridge Securities", "the underwriter/dealer");
const RATERS = "Polaris Ratings and Meridian Credit (the rating agencies)";
const MM = nr("Kestrel Markets", "the market maker");
type Player = { id: string; name: string; role: string; title?: string; pro: string; does: string; like: string; paid: string; here: string; extra?: { label: string; value: ReactNode }[] };
const playersFor = (A: AssetDef): Player[] => [
  { id: "borrowers", name: A.who.charAt(0).toUpperCase() + A.who.slice(1), role: "the borrowers", pro: "Obligors (borrowers)", does: `The ${A.who} whose payments on ${A.thing} feed the whole deal.`, like: "The spring that feeds the river: every dollar starts with them.", paid: "They pay; they don't get paid.", here: `The ${A.thing} in your basket.` },
  { id: "lender", name: A.orig, role: lr(A), pro: "Originator / sponsor", does: `Made the ${A.thing}. Sells them to the special purpose vehicle (${A.trust}) so it gets cash now to do more business.`, like: "A baker who sells a whole tray to a cafe instead of slice by slice.", paid: "Cash from the sale, plus the owner's slice (leftover money).", here: "You play its deal team in steps 3 to 6." },
  {
    id: "trust", name: A.trust, role: SPV_ROLE, title: "Special purpose vehicle, SPV (the walled-off box)", pro: "Special purpose vehicle (SPV), also called the issuer or the trust",
    does: `A separate mini-company set up for one job: holding the basket of ${A.thing}. ${nr(A.orig, lr(A))} sells the ${A.thing} to it, and it issues the bonds (the tranches, or floors) that investors buy. Money from ${A.who} flows through it to investors.`,
    like: `A locked piggy bank handed to a trusted neighbor: even if you get into money trouble, the people you owe can't take it. Even if ${A.short} goes bust, its creditors can't grab the ${A.thing}, and investors keep getting paid from ${A.who}' payments.`,
    paid: "Nothing. It has no employees and no profits of its own; it just holds the basket and passes the money through.",
    here: `Holds your basket from step 3 onward. In this deal it is called ${A.trust}.`,
    extra: [
      { label: "True sale (how it gets the loans)", value: <span>A <Term k="truesale">true sale</Term>: {nr(A.short, lr(A))} really sells the {A.thing} and gets cash, so they stop being {A.short}'s property.</span> },
      { label: "Bankruptcy-remote (why it exists)", value: <span>It is <Term k="bkremote">bankruptcy-remote</Term>: walled off from the lender's money troubles, so the bonds depend only on the basket.</span> },
      { label: "Who runs it", value: `Nobody works there. ${nr(A.serv, "the servicer")} collects the money and ${TRUSTEE} makes sure it is paid out by the rules.` },
    ],
  },
  { id: "servicer", name: A.serv, role: "the servicer", pro: "Servicer", does: `Collects payments from ${A.who}, chases late payers, and recovers money by ${A.recover}.`, like: "A landlord's property manager collecting rent.", paid: `A fee of ${pc(A.fee * 100, 2)} a year of the basket.`, here: "Reports what it collected each month in steps 7 and 8." },
  { id: "trustee", name: "Granite Trust Co.", role: "the trustee", pro: "Trustee", does: "The referee. Makes sure the special purpose vehicle pays each tranche in the right order (the waterfall) and follows the rules.", like: "A referee holding the rulebook.", paid: "A small fixed fee.", here: "Runs the payment order in the storm test." },
  { id: "arranger", name: "Bluebridge Securities", role: "the underwriter/dealer", pro: "Underwriter / arranger (dealer)", does: "Designs the tranches (floors) with the seller, calls investors, takes orders and sells the deal.", like: "A wedding planner coordinating every vendor.", paid: "A fee of about 0.3% of the deal.", here: "Runs your order book in step 6." },
  { id: "ratings", name: "Polaris Ratings & Meridian Credit", role: "the rating agencies", pro: "Rating agencies", does: "Stress-test each tranche (floor) and give it a credit rating (grade) from AAA down.", like: "A crash-test lab handing out safety stars.", paid: "A fee from the deal for grading it.", here: "Grade your floors in step 5." },
  { id: "investors", name: "Investors", role: "the buy-side", pro: "Buy-side: money managers, insurers, banks, hedge funds", does: "Buy the tranches (floors) that match how much risk they can stomach.", like: "Diners choosing a mild set menu or the spicy special.", paid: "Interest plus their money back, paid by the special purpose vehicle.", here: "Four mock investors bid in step 6: Evergreen Fund Managers, Bedrock Mutual Insurance, Harborline Bank Treasury and Quickstrike Capital (each an investor)." },
  { id: "mm", name: "Kestrel Markets", role: "the market maker", pro: "Market maker (dealer desk)", does: "After the sale, always ready to buy or sell tranches so investors can trade.", like: "A used-car dealer: always open, buys a bit lower than it sells.", paid: "The gap between its buy and sell price.", here: "Quotes you prices on the trading floor in step 7." },
];

// ---------- investors (fictional) ----------
const INV = [
  { name: "Evergreen Fund Managers", type: "Money manager: invests people's savings", likes: ["AAA", "AA", "A", "BBB"], budget: 0.35, mult: 1.0 },
  { name: "Bedrock Mutual Insurance", type: "Insurer: needs steady safe income for future claims", likes: ["AAA", "AA", "A"], budget: 0.3, mult: 0.95 },
  { name: "Harborline Bank Treasury", type: "Bank: parks spare cash in the safest stuff", likes: ["AAA"], budget: 0.4, mult: 0.85 },
  { name: "Quickstrike Capital", type: "Hedge fund: takes big risks for big rewards", likes: ["A", "BBB", "BB", "NR"], budget: 0.6, mult: 1.15 },
];
const FAIR: Record<string, number> = { AAA: 65, AA: 90, A: 120, BBB: 180, BB: 350, NR: 650 };
const GR = ["AAA", "AA", "A", "BBB", "BB"];
const grade = (m: number, thr: number[]): string => {
  for (let i = 0; i < thr.length; i++) if (m >= thr[i]) return GR[i];
  return "NR";
};
const gname = (g: string): string => (g === "NR" ? "Not rated" : g);
const FL = ["Senior tranche (top floor)", "Mezzanine tranche (middle floor)", "Junior tranche (bottom floor)"];
const FLS = ["Senior", "Mezzanine", "Junior"];
const BENCH = 0.04;

// ---------- basket + cash flow engine ----------
function makePool(n: number, score: number, rate: number, size: number) {
  const r = rng(42);
  let tot = 0, wf = 0, wa = 0;
  const bins: number[] = Array<number>(14).fill(0);
  for (let i = 0; i < n; i++) {
    const f = clamp(Math.round(score + gauss(r) * 45), 500, 849);
    const b = clamp(size * Math.exp(gauss(r) * 0.35), size * 0.2, size * 4);
    const a = Math.max(1, rate + (score - f) * 0.03 + gauss(r) * 0.6);
    tot += b; wf += f * b; wa += a * b;
    bins[Math.floor((f - 500) / 25)]++;
  }
  return { bal: tot, score: wf / tot, apr: wa / tot / 100, bins, avg: tot / n };
}

type MonthRow = { m: number; collected: number; recovery: number; defaults: number; loss: number; fee: number; intPaid: number[]; prinPaid: number[]; bal: number[]; poolBal: number; reserve: number; reserveDraw: number; toEquity: number; shortfall: number; refilling: boolean };
type TrOut = { int: number; prin: number; loss: number; cf: number[]; wal: number };
type RunRes = { months: MonthRow[]; tr: TrOut[]; equity: number; poolLoss: number; early: number };
type Opt = { rev?: boolean; defer?: [number, number]; fee: number };

function runDeal(B: number, apr: number, term: number, cdr: number, cpr: number, sev: number, tr: { size: number; coupon: number }[], ocAmt: number, resAmt: number, o: Opt): RunRes {
  let bal = B;
  const nb = tr.map((t: { size: number; coupon: number }) => t.size);
  let reserve = resAmt;
  const mdr = o.rev ? cdr / 12 : 1 - Math.pow(1 - cdr, 1 / 12);
  const smm = o.rev ? cpr : 1 - Math.pow(1 - cpr, 1 / 12);
  const r = apr / 12;
  const revEnd = o.rev ? Math.max(1, term - 12) : 0;
  let early = 0;
  const xsH: number[] = [];
  const out: TrOut[] = tr.map(() => ({ int: 0, prin: 0, loss: 0, cf: [] as number[], wal: 0 }));
  const walN = tr.map(() => 0);
  let eq = 0, poolLoss = 0;
  const months: MonthRow[] = [];
  for (let m = 1; m <= term; m++) {
    const start = bal;
    const def = bal * mdr, loss = def * sev, rec = def - loss;
    bal -= def; poolLoss += loss;
    let avail = 0, intr = 0;
    const refilling = !!o.rev && m <= revEnd && !early;
    if (o.rev) {
      intr = bal * r;
      let pr = 0;
      if (!refilling) { pr = m === term ? bal : bal * smm; bal -= pr; }
      avail = intr + pr + rec;
    } else {
      const n = term - m + 1;
      const pmt = r > 0 ? (bal * r) / (1 - Math.pow(1 + r, -n)) : bal / n;
      intr = bal * r;
      const df = o.defer && m <= o.defer[1] ? o.defer[0] : 0;
      const sp = Math.min(bal, pmt - intr) * (1 - df);
      const pre = m === term ? 0 : (bal - sp) * smm * (1 - df);
      bal = Math.max(0, bal - sp - pre + intr * df);
      intr = intr * (1 - df);
      avail = intr + sp + pre + rec;
    }
    const collected = avail;
    const fee = Math.min(avail, (start * o.fee) / 12);
    avail -= fee;
    let draw = 0, due0 = 0;
    const intPaid: number[] = [], prinPaid: number[] = [];
    for (let i = 0; i < tr.length; i++) {
      const due = (nb[i] * tr[i].coupon) / 12;
      due0 += due;
      let pay = Math.min(avail, due);
      avail -= pay;
      if (pay < due) { const d = Math.min(reserve, due - pay); reserve -= d; draw += d; pay += d; }
      intPaid.push(pay);
    }
    if (refilling) {
      xsH.push(intr + rec - fee - due0 - loss);
      if (xsH.length >= 3 && xsH.slice(-3).reduce((s: number, x: number) => s + x, 0) < 0) early = m;
    }
    const notes = nb.reduce((s: number, x: number) => s + x, 0);
    let due = Math.max(0, notes - Math.max(0, bal - ocAmt));
    if (m === term) { due = notes; avail += reserve; draw += reserve; reserve = 0; }
    for (let i = 0; i < tr.length; i++) {
      const p = Math.min(avail, due, nb[i]);
      nb[i] -= p; avail -= p; due -= p;
      prinPaid.push(p);
      out[i].int += intPaid[i]; out[i].prin += p; walN[i] += m * p;
      out[i].cf.push(intPaid[i] + p);
    }
    if (m < term) { const top = Math.min(avail, Math.max(0, resAmt - reserve)); reserve += top; avail -= top; }
    eq += avail;
    const left = nb.reduce((s: number, x: number) => s + x, 0);
    months.push({ m, collected, recovery: rec, defaults: def, loss, fee, intPaid, prinPaid, bal: nb.slice(), poolBal: bal, reserve, reserveDraw: draw, toEquity: avail, shortfall: Math.max(0, left - bal - reserve), refilling });
  }
  out.forEach((x: TrOut, i: number) => { x.loss = nb[i]; x.wal = x.prin > 0 ? walN[i] / x.prin / 12 : 0; });
  return { months, tr: out, equity: eq, poolLoss, early };
}
function pv(cf: number[], rate: number): number {
  let s = 0;
  cf.forEach((c: number, t: number) => { s += c / Math.pow(1 + rate / 12, t + 1); });
  return s;
}

// ---------- awards ----------
const AW: Record<string, [number, string]> = {
  players: [50, "Networker"], pool: [40, ""], graded: [30, ""], aaa: [60, "AAA Achieved"], closed: [80, "Deal Closed"], sweet: [50, "Sweet-Spot Pricing"], mm: [60, "Market Maker"], green: [60, "In the Green"], recession: [80, "Survived the Recession"], explorer: [80, "Explorer"], tripwire: [40, "Tripwire Spotter"], q8: [20, ""],
  q0: [20, ""], q1: [20, ""], q2: [20, ""], q3: [20, ""], q4: [20, ""], q5: [20, ""], q6: [20, ""], q7: [20, ""],
};
const LEVELS: [number, string][] = [[0, "Intern"], [140, "Analyst"], [300, "Associate"], [480, "Vice President"], [680, "Head of Desk"]];
const STAGES = ["Select the collateral pool (pick your basket)", "Market participants (meet the players)", "Build the collateral pool (fill the basket)", "Structure the tranches (build the floors)", "Get rated (get graded)", "Price and place the bonds (sell the floors)", "Secondary trading (the trading floor)", "Stress test (storm test)"];

type Quiz = { q: string; opts: string[]; ok: number; why: string };
const QUIZ: Quiz[] = [
  { q: "Government-backed (agency) home-loan bonds are special because...", opts: ["A government-sponsored company promises to cover defaults", "They are never paid back early", "They pay the most interest"], ok: 0, why: "With the promise, losses barely matter. The big worry becomes early payoffs when rates fall." },
  { q: "Who collects the monthly payments from borrowers?", opts: ["The trustee (referee)", "The servicer (payment collector)", "The rating agency (grader)"], ok: 1, why: "The servicer collects the money; the trustee then makes sure it is handed out in the right order." },
  { q: "If the collateral pool's (basket's) average credit score goes down, expected net loss...", opts: ["go down", "go up", "don't change"], ok: 1, why: "Lower scores mean more borrowers likely to stop paying, so more expected losses." },
  { q: "When bad loans pile up, who loses money first?", opts: ["The senior tranche (top floor)", "The residual and junior tranche (owner's slice and bottom floor)", "Everyone equally"], ok: 1, why: "Losses flood from the bottom up. That is exactly why the top floor is safe." },
  { q: "A tranche's credit enhancement (safety cushion) can absorb 5x expected losses. Which credit rating (grade) fits best for car loans?", opts: ["AAA", "BBB", "Not rated"], ok: 0, why: "Agencies give AAA only to floors that survive a storm about 5 times worse than expected (stricter for unusual baskets)." },
  { q: "Your senior tranche (top floor) is 4x oversubscribed (covered). What does that tell you?", opts: ["You offered more spread (extra pay) than needed", "Nobody wants it", "Its rating (grade) is wrong"], ok: 0, why: "Huge demand means you could cut the extra pay and keep more leftover money for the seller." },
  { q: "The benchmark rate (safe rate) jumps. Bonds you already own...", opts: ["go up in price", "go down in price", "don't move"], ok: 1, why: "New bonds now pay more, so old ones must get cheaper to compete. Like a seesaw: rates up, prices down." },
  { q: "Prepayments (early payoffs) jump. The weighted average life, WAL (average wait for your money)...", opts: ["gets shorter", "gets longer", "stays the same"], ok: 0, why: "Early payoffs return money sooner, so the average wait shrinks. For home loans this happens when rates fall." },
];

const QUIZ_SPV: Quiz = { q: "Why are the loans put in a special purpose vehicle (SPV)?", opts: ["So the lender's creditors can't grab them if the lender goes bust", "So the loans earn more interest", "So the lender can keep the payments for itself"], ok: 0, why: "After a true sale the loans belong to the SPV, which is bankruptcy-remote. Even if the lender fails, investors keep getting paid from borrowers' payments." };

type Mkt = { started: boolean; bk: boolean; m: number; bench: number; unemp: number; cprM: number; sevAdd: number; mkt: number[]; orig: number[]; hist: { m: number; px: number[] }[]; cash: number; pos: number[]; trades: { m: number; side: string; fl: number; px: number }[]; news: { m: number; title: string; detail: string }[] };
const EMPTY_MKT: Mkt = { started: false, bk: false, m: 0, bench: BENCH, unemp: 4, cprM: 1, sevAdd: 0, mkt: [0, 0, 0], orig: [0, 0, 0], hist: [], cash: 1e7, pos: [0, 0, 0], trades: [], news: [] };
const GEN: Ev[] = [
  { title: "Quiet month", detail: "Payments came in as usual. Not much moved.", w: 3 },
  { title: "Benchmark rate up 0.25% (safe rate)", detail: "The central bank nudged rates up. New bonds pay more, so older ones drop in price, most for floors with a long wait.", w: 1.5, bench: 0.0025 },
  { title: "Benchmark rate down 0.25% (safe rate)", detail: "Rates were cut. Older bonds that pay more now look better, so their prices rise.", w: 1.5, bench: -0.0025 },
  { title: "Investors hungry for income", detail: "Lots of cash chasing bonds. Everyone accepts less extra pay, so prices rise.", w: 1, sp: [-6, -15, -25] },
  { title: "Lender files for bankruptcy", detail: "", w: 0.6, bk: true, sp: [3, 10, 25] },
];

// ---------- small custom pieces ----------
function Term({ k, children }: { k: string; children?: ReactNode }) {
  const t = useGrokTheme();
  const [open, setOpen] = useState(false);
  const g = G[k];
  if (!g) return <Fragment>{children}</Fragment>;
  return (
    <span style={{ position: "relative" }} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <span role="button" tabIndex={0} onClick={() => setOpen(!open)} style={{ borderBottom: `1px dotted ${t.text.tertiary}`, cursor: "help" }}>{children ?? `${g[0]} (${g[1]})`}</span>
      {open && (
        <span style={{ position: "absolute", left: 0, top: "100%", marginTop: 6, zIndex: 50, width: 260, maxWidth: "72vw", display: "block", background: t.bg.elevated, color: t.text.primary, border: `1px solid ${t.border.default}`, borderRadius: 8, padding: "10px 12px", fontSize: t.font.label.fontSize, lineHeight: t.font.label.lineHeight, fontWeight: 400, textAlign: "left", whiteSpace: "normal" }}>
          <span style={{ display: "block", fontWeight: 600 }}>{g[0]}</span>
          <span style={{ display: "block", color: t.text.tertiary, marginBottom: 4 }}>Think of it as: {g[1]}</span>
          {g[2]}
        </span>
      )}
    </span>
  );
}

function Slider({ label, value, min, max, step, fmt, onChange }: { label: ReactNode; value: number; min: number; max: number; step: number; fmt: (v: number) => string; onChange: (v: number) => void }) {
  const t = useGrokTheme();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, fontSize: t.font.body2.fontSize, color: t.text.primary }}>
        <span>{label}</span>
        <span style={{ fontFamily: t.font.mono, color: t.text.secondary }}>{fmt(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(Number(e.currentTarget.value))} style={{ width: "100%", accentColor: t.dataviz.categorical[0] }} />
    </div>
  );
}

function Chip({ label, active, done, onClick }: { label: string; active: boolean; done?: boolean; onClick: () => void }) {
  const t = useGrokTheme();
  return (
    <button onClick={onClick} style={{ cursor: "pointer", padding: "6px 12px", borderRadius: 999, border: `1px solid ${active ? t.border.strong : t.border.default}`, background: active ? t.fill.secondary : "transparent", color: active ? t.text.primary : t.text.secondary, fontSize: t.font.label.fontSize, fontFamily: t.font.family, fontWeight: active ? 600 : 400 }}>
      {done ? "\u2713 " : ""}{label}
    </button>
  );
}

function Wrap({ children }: { children?: ReactNode }) {
  return <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>{children}</div>;
}

function Desk({ xp, badges, stage, setStage, maxSeen, asset }: { xp: number; badges: string[]; stage: number; setStage: (n: number) => void; maxSeen: number; asset: string }) {
  const t = useGrokTheme();
  let li = 0;
  LEVELS.forEach((l: [number, string], i: number) => { if (xp >= l[0]) li = i; });
  const next = LEVELS[li + 1];
  const frac = next ? (xp - LEVELS[li][0]) / (next[0] - LEVELS[li][0]) : 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ minWidth: 200, flex: "1 1 220px" }}>
          <div style={{ fontSize: t.font.body2.fontSize, color: t.text.primary, fontWeight: 600 }}>{LEVELS[li][1] + " \u00b7 " + xp + " XP \u00b7 Collateral: " + asset}</div>
          <div style={{ height: 6, borderRadius: 3, background: t.fill.secondary, marginTop: 6 }}>
            <div style={{ height: 6, borderRadius: 3, width: `${Math.round(frac * 100)}%`, background: t.dataviz.categorical[0] }} />
          </div>
          <div style={{ fontSize: t.font.label.fontSize, color: t.text.tertiary, marginTop: 4 }}>{next ? `${next[0] - xp} XP to ${next[1]}` : "Top level reached"}</div>
        </div>
        <Wrap>{badges.length ? badges.map((b: string) => <Status key={b} tone="accent">{b}</Status>) : <span style={{ fontSize: t.font.label.fontSize, color: t.text.tertiary }}>Badges you earn show up here</span>}</Wrap>
      </div>
      <Wrap>{STAGES.map((s: string, i: number) => <Chip key={s} label={`${i + 1}. ${s}`} active={i === stage} done={i < maxSeen && i !== stage} onClick={() => setStage(i)} />)}</Wrap>
    </div>
  );
}

function QuizBox({ quiz, ans, onAns }: { quiz: Quiz; ans: number | undefined; onAns: (i: number) => void }) {
  const t = useGrokTheme();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: t.font.body1.fontSize, color: t.text.primary }}>{quiz.q}</div>
      <Wrap>{quiz.opts.map((o: string, i: number) => <Chip key={o} label={o} active={ans === i} onClick={() => onAns(i)} />)}</Wrap>
      {ans !== undefined && (
        <div style={{ fontSize: t.font.body2.fontSize, color: t.text.secondary }}>
          <span style={{ color: ans === quiz.ok ? t.text.success : t.text.warning, fontWeight: 600 }}>{ans === quiz.ok ? "Correct, +20 XP. " : "Not quite. "}</span>{quiz.why}
        </div>
      )}
    </div>
  );
}

function Histogram({ bins }: { bins: number[] }) {
  const t = useGrokTheme();
  const mx = Math.max(...bins, 1);
  const W = 620, H = 200, l = 20, b = 30, bw = (W - 2 * l) / bins.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img">
      {bins.map((v: number, i: number) => {
        const h = (v / mx) * (H - b - 16);
        const weak = 500 + i * 25 < 620;
        return <rect key={i} x={l + i * bw + 2} y={H - b - h} width={bw - 4} height={h} rx={3} fill={weak ? t.dataviz.categorical[1] : t.dataviz.categorical[0]} />;
      })}
      <line x1={l} x2={W - l} y1={H - b} y2={H - b} stroke={t.border.default} />
      {[500, 575, 650, 725, 800, 850].map((s: number) => <text key={s} x={l + ((s - 500) / 350) * (W - 2 * l)} y={H - 10} textAnchor="middle" fontSize={11} fill={t.text.tertiary}>{s}</text>)}
    </svg>
  );
}

type Layer = { label: string; pct: number; color: string; note: string; dashed?: boolean };
function Building({ layers, floods }: { layers: Layer[]; floods: { pct: number; label: string }[] }) {
  const t = useGrokTheme();
  const hs = layers.map((x: Layer) => Math.max(24, x.pct * 3.4));
  const tot = hs.reduce((s: number, x: number) => s + x, 0);
  const top = 16, H = tot + top + 16, W = 720, x0 = 220, x1 = 470;
  const yFor = (L: number): number => {
    let yb = top + tot, rem = L;
    for (let k = layers.length - 1; k >= 0; k--) {
      const p = layers[k].pct;
      if (rem <= p) return yb - (p > 0 ? (rem / p) * hs[k] : 0);
      rem -= p; yb -= hs[k];
    }
    return top - 6;
  };
  let y = top;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img">
      <polygon points={`${x0 - 10},${top} ${(x0 + x1) / 2},${top - 14} ${x1 + 10},${top}`} fill={t.border.default} />
      {layers.map((ly: Layer, i: number) => {
        const yy = y; y += hs[i];
        return (
          <g key={ly.label}>
            <rect x={x0} y={yy + 1} width={x1 - x0} height={hs[i] - 2} rx={4} fill={ly.dashed ? "transparent" : ly.color} stroke={ly.dashed ? t.border.strong : "none"} strokeDasharray={ly.dashed ? "5 4" : undefined} />
            <text x={x0 - 10} y={yy + hs[i] / 2 + 4} textAnchor="end" fontSize={12} fill={t.text.primary}>{ly.label}</text>
            <text x={x1 + 10} y={yy + hs[i] / 2 + 4} fontSize={12} fill={t.text.secondary}>{ly.note}</text>
          </g>
        );
      })}
      {floods.map((f: { pct: number; label: string }, i: number) => {
        const fy = yFor(f.pct);
        return (
          <g key={f.label}>
            <line x1={x0 - 6} x2={W - 6} y1={fy} y2={fy} stroke={t.dataviz.negative} strokeWidth={i === 0 ? 2 : 1.5} strokeDasharray={i === 0 ? undefined : "6 4"} />
            <text x={W - 6} y={fy - 4} textAnchor="end" fontSize={11} fill={t.text.secondary}>{f.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function PriceChart({ hist }: { hist: { m: number; px: number[] }[] }) {
  const t = useGrokTheme();
  const W = 640, H = 240, l = 44, r = 110, tp = 14, b = 28;
  const all = hist.flatMap((h: { m: number; px: number[] }) => h.px);
  const lo = Math.floor(Math.min(...all) - 0.5), hi = Math.ceil(Math.max(...all) + 0.5);
  const n = Math.max(1, hist.length - 1);
  const X = (i: number): number => l + (i / n) * (W - l - r);
  const Y = (v: number): number => tp + ((hi - v) / (hi - lo)) * (H - tp - b);
  const ticks = [0, 1, 2, 3, 4].map((k: number) => lo + ((hi - lo) * k) / 4);
  const xt = Array.from(new Set([0, 1, 2, 3, 4, 5].map((k: number) => Math.round((k / 5) * n))));
  const last = hist[hist.length - 1];
  const order = [0, 1, 2].sort((a: number, c: number) => last.px[c] - last.px[a]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img">
      {ticks.map((v: number) => (
        <g key={v}>
          <line x1={l} x2={W - r} y1={Y(v)} y2={Y(v)} stroke={t.border.subtle} />
          <text x={l - 6} y={Y(v) + 4} textAnchor="end" fontSize={11} fill={t.text.tertiary}>{v.toFixed(1)}</text>
        </g>
      ))}
      {xt.map((i: number) => <text key={i} x={X(i)} y={H - 8} textAnchor="middle" fontSize={11} fill={t.text.tertiary}>{"Month " + hist[Math.min(i, hist.length - 1)].m}</text>)}
      {[0, 1, 2].map((k: number) => (
        <polyline key={k} fill="none" stroke={t.dataviz.categorical[k]} strokeWidth={2} points={hist.map((h: { m: number; px: number[] }, i: number) => `${X(i)},${Y(h.px[k])}`).join(" ")} />
      ))}
      {order.map((k: number, j: number) => (
        <text key={k} x={W - r + 8} y={tp + 14 + j * 18} fontSize={11} fill={t.text.secondary}>
          <tspan fill={t.dataviz.categorical[k]}>{"\u25cf "}</tspan>{FLS[k] + " " + last.px[k].toFixed(2)}
        </text>
      ))}
    </svg>
  );
}

// ---------- app ----------
export default function App() {
  const t = useGrokTheme();
  const C = t.dataviz.categorical;
  const [stage, setStageRaw] = useState(0);
  const [maxSeen, setMaxSeen] = useState(0);
  const [awards, setAwards] = useState<string[]>([]);
  const [quiz, setQuiz] = useState<Record<number, number>>({});
  const [aid, setAid] = useState("auto");
  const [tried, setTried] = useState<string[]>(["auto"]);
  const [guar, setGuar] = useState(false);
  const [sel, setSel] = useState("lender");
  const [seen, setSeen] = useState<string[]>(["lender"]);
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
  const [closed, setClosed] = useState(false);
  const [mk, setMk] = useState<Mkt>(EMPTY_MKT);
  const [preset, setPreset] = useState("1");
  const [custom, setCustom] = useState<number[]>([5, 10, 55]);
  const [month, setMonth] = useState(12);

  const A = ASSETS.find((x: AssetDef) => x.id === aid) ?? A0;
  const award = (k: string): void => setAwards((p: string[]) => (p.includes(k) ? p : [...p, k]));
  const setStage = (n: number): void => { setStageRaw(n); setMaxSeen((m: number) => Math.max(m, n)); };
  const xp = awards.reduce((s: number, k: string) => s + (AW[k] ? AW[k][0] : 0), 0);
  const badges = awards.filter((k: string) => AW[k] && AW[k][1]).map((k: string) => AW[k][1]);
  if (QUIZ.every((q: Quiz, i: number) => awards.includes("q" + i)) && awards.includes("q8")) badges.push("Quiz Master");

  const pickAsset = (id: string): void => {
    const X = ASSETS.find((x: AssetDef) => x.id === id) ?? A0;
    setAid(id); setGuar(false);
    setN(X.n[3]); setScore(X.score[3]); setApr(X.rate[3]); setTerm(X.term[3]);
    setA(X.st[0]); setB(X.st[1]); setC(X.st[2]); setRes(X.st[3]); setSpreads(X.sp.slice());
    setGraded(false); setClosed(false); setMk(EMPTY_MKT); setPreset("1"); setMonth(12);
    const nt = tried.includes(id) ? tried : [...tried, id];
    setTried(nt);
    if (nt.length === ASSETS.length) award("explorer");
  };

  // derived deal
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
  const coupons = spreads.map((s: number) => BENCH + s / 10000);
  const xs = (pool.apr - A.fee - pcts.reduce((s: number, p: number, i: number) => s + (p / 100) * coupons[i], 0)) * 100;
  const xsCredit = clamp(xs * A.xs[0], 0, A.xs[1]);
  const hard = [b + c + oc + res, c + oc + res, oc + res];
  const cushion = hard.map((h: number) => h + xsCredit);
  const mult = cushion.map((x: number) => x / el);
  const grades = mult.map((m: number) => grade(m, A.thr));
  const trs = pcts.map((p: number, i: number) => ({ size: (B * p) / 100, coupon: coupons[i] }));
  const ocAmt = (B * oc) / 100, resAmt = (B * res) / 100;
  const run = (cdr: number, cpr: number, sev: number): RunRes => runDeal(B, pool.apr, term, cdr, cpr, sev, trs, ocAmt, resAmt, opt);
  const baseRun = useMemo(() => run(baseCdr, A.cpr, sevEff), [aid, B, pool.apr, term, baseCdr, sevEff, a, b, c, res, spreads[0], spreads[1], spreads[2]]);

  // order book
  const book = pcts.map((p: number, i: number) => {
    const size = (B * p) / 100;
    const orders = INV.map((v: { likes: string[]; budget: number; mult: number }, j: number) => {
      const rr = rng(900 + i * 13 + j)();
      const resv = FAIR[grades[i]] * A.fairK * v.mult * (0.92 + 0.16 * rr);
      const likes = v.likes.includes(grades[i]);
      const ok = likes && spreads[i] >= resv;
      return { amt: ok ? size * v.budget * A.inv[j] * (1 + Math.min(1.5, ((spreads[i] - resv) / resv) * 2)) : 0, resv, likes, ok };
    });
    const tot = orders.reduce((s: number, o: { amt: number }) => s + o.amt, 0);
    return { size, orders, cover: size > 0 ? tot / size : 0 };
  });
  const allCovered = book.every((x: { cover: number; size: number }) => x.size === 0 || x.cover >= 1);

  // market
  const priceMids = (s: Mkt): number[] => {
    const rr = run(baseCdr * Math.max(0.5, 1 + (s.unemp - 4) * A.uSens), clamp(A.cpr * s.cprM, 0, 0.6), clamp(sevEff + s.sevAdd * gf, 0, 0.98));
    return rr.tr.map((o: TrOut, i: number) => (trs[i].size > 0 ? (pv(o.cf, s.bench + s.mkt[i] / 10000) / trs[i].size) * 100 : 100));
  };
  const mids = useMemo(() => (mk.started ? priceMids(mk) : [100, 100, 100]), [mk, aid, B, term, a, b, c, res, gf, spreads[0], spreads[1], spreads[2]]);
  const hw = [0.0625, 0.25, 0.75].map((h: number) => h * A.liq * (1 + Math.max(0, mk.unemp - 4) * 0.3));
  const holdVal = mk.pos.reduce((s: number, p: number, i: number) => s + p * 1e6 * (mids[i] / 100), 0);
  const pnl = mk.cash + holdVal - 1e7;

  const openMarket = (): void => {
    const s: Mkt = { ...EMPTY_MKT, started: true, mkt: spreads.slice(), orig: spreads.slice(), news: [{ m: 0, title: "Secondary trading open", detail: `Your ${A.name.toLowerCase()} deal has been sold. ${MM} will now quote you bids and asks (prices to sell or buy) on any tranche.` }] };
    s.hist = [{ m: 0, px: priceMids(s) }];
    setMk(s);
  };
  const nextMonth = (): void => {
    const r = rng(5000 + mk.m * 7919 + nLoans + aid.length * 31);
    const evs = [...GEN, ...A.events];
    const wt = evs.reduce((s: number, e: Ev) => s + e.w, 0);
    let pick = r() * wt, ev = evs[0];
    for (const e of evs) { if (pick < e.w) { ev = e; break; } pick -= e.w; }
    if (ev.bk && mk.bk) ev = evs[0];
    const s: Mkt = { ...mk, m: mk.m + 1, mkt: mk.mkt.slice(), pos: mk.pos.slice(), bk: mk.bk || !!ev.bk };
    s.bench = clamp(s.bench + (ev.bench ?? 0), 0.005, 0.09);
    s.unemp = clamp(s.unemp + (ev.unemp ?? 0), 3, 12);
    s.cprM = ev.cpr ? Math.min(4, s.cprM * ev.cpr) : 1 + (s.cprM - 1) * 0.7;
    let detail = ev.bk ? `Your bonds keep paying. The ${A.thing} were sold in a true sale to ${nr(A.trust, SPV_ROLE)}, so ${A.short}'s creditors can't touch them. A backup servicer takes over collecting. Prices dip a little on the scary headline.` : ev.detail;
    if (ev.bench) {
      s.cprM = Math.min(4, s.cprM * (ev.bench < 0 ? 1 + A.refi * 2 : 1 / (1 + A.refi)));
      if (ev.bench < 0 && A.refi > 0.2) detail += " Homeowners start refinancing, so early payoffs jump.";
    }
    s.sevAdd = clamp(s.sevAdd + (ev.sev ?? 0), -0.2, 0.35);
    s.mkt = s.mkt.map((v: number, i: number) => {
      const vol = [4, 10, 22][i] * A.liq;
      return Math.max(10, v + (ev.sp ? ev.sp[i] : 0) + (r() - 0.5) * vol + (s.orig[i] - v) * 0.06);
    });
    s.cash = mk.cash + mk.pos.reduce((acc: number, p: number, i: number) => acc + (p * 1e6 * coupons[i]) / 12, 0);
    const row = baseRun.months[s.m - 1];
    const extra = row ? ` ${nr(ev.bk ? "The backup servicer" : A.serv, "the servicer")} collected ${fm(row.collected)} from ${A.who} this month.` : "";
    const title = ev.bk ? `${nr(A.orig, lr(A))} files for bankruptcy` : ev.title;
    s.news = [{ m: s.m, title, detail: detail + extra }, ...mk.news].slice(0, 6);
    const px = priceMids(s);
    s.hist = [...mk.hist, { m: s.m, px }];
    setMk(s);
    const p2 = s.cash + s.pos.reduce((acc: number, p: number, i: number) => acc + p * 1e6 * (px[i] / 100), 0) - 1e7;
    if (s.m >= 6 && p2 > 0) award("green");
  };
  const trade = (i: number, buy: boolean): void => {
    const px = buy ? mids[i] + hw[i] : mids[i] - hw[i];
    const amt = (px / 100) * 1e6;
    if (buy && (mk.cash < amt || mk.pos[i] >= 20)) return;
    if (!buy && mk.pos[i] <= -5) return;
    const pos = mk.pos.slice();
    pos[i] += buy ? 1 : -1;
    const trades = [{ m: mk.m, side: buy ? "Bought" : "Sold", fl: i, px }, ...mk.trades];
    setMk({ ...mk, pos, cash: mk.cash + (buy ? -amt : amt), trades });
    if (trades.length >= 5) award("mm");
  };

  // stress
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
  const mrow = sRun.months[Math.min(month, term) - 1];
  const step = term <= 72 ? 6 : term <= 120 ? 12 : term <= 240 ? 24 : 36;

  const answer = (i: number): void => {
    setQuiz({ ...quiz, [stage]: i });
    if (i === QUIZ[stage].ok) award("q" + stage);
  };
  const PL = playersFor(A);
  const pl = PL.find((p: Player) => p.id === sel) ?? PL[0];
  const howPays = A.rev ? `Revolving (refilling): for all but the last 12 months, repayments buy new ${A.thing}; then investors are paid back.` : A.defer ? `Deferment (payment pause): pays down monthly, but ${A.defer[0] * 100}% of borrowers pay nothing for the first ${A.defer[1]} months.` : "Amortizing (pays down a little every month until paid off).";

  const layers: Layer[] = [
    { label: "Senior (top floor)", pct: a, color: C[0], note: `${a}% \u00b7 ${gname(grades[0])}` },
    { label: "Mezzanine (middle floor)", pct: b, color: C[1], note: `${b}% \u00b7 ${gname(grades[1])}` },
    { label: "Junior (bottom floor)", pct: c, color: C[2], note: `${c}% \u00b7 ${gname(grades[2])}` },
    { label: "Residual / OC (owner's slice)", pct: oc, color: t.dataviz.other, note: `${oc}% \u00b7 kept by ${nr(A.short, lr(A))}` },
    { label: "Reserve + excess spread", pct: res + xsCredit, color: "", note: `${(res + xsCredit).toFixed(1)}% extra cushion (rainy-day + leftover)`, dashed: true },
  ];
  const floods = [
    { pct: el, label: `Expected net loss ${pc(el)}` },
    { pct: el * A.thr[3], label: `${A.thr[3]}x stress (BBB test)` },
    { pct: el * A.thr[0], label: `${A.thr[0]}x stress (AAA test)` },
  ];
  const elText = A.annual ? "a year" : "over its life";

  const coach = ((): string => {
    switch (stage) {
      case 0: return `Select the collateral pool (pick what goes in the basket). Each asset class behaves differently: home loans get paid off early when rates fall, card balances refill, song royalties fade with fashion. You've tried ${tried.length} of ${ASSETS.length}; try them all for the Explorer badge.`;
      case 1: return `Tap each market participant (player) to see what they do in this ${A.name.toLowerCase()} deal. You've met ${seen.length} of ${PL.length}. Meet at least 6 for the Networker badge.`;
      case 2: return gf < 1 ? "With the government promise switched on, losses almost vanish. The real risks become prepayment (early payoffs) and interest rates." : pool.score < 640 ? "A riskier collateral pool: higher rates, but more borrowers will default (stop paying). You'll need more credit enhancement (a thicker cushion) when you structure the tranches." : pool.score > 750 ? "A very safe collateral pool. Few losses expected, but low rates mean little excess spread (leftover interest)." : "Try moving the credit score slider and watch expected net loss change.";
      case 3: return grades[0] !== "AAA" ? "Your senior tranche (top floor) isn't AAA yet. Add subordination (thicker floors below it), more overcollateralization (padding), or a bigger reserve account (rainy-day fund). Watch the red stress lines." : oc < 3 ? "Senior tranche is AAA. Careful: very little overcollateralization (padding) means the residual (owner's leftover money) disappears fast if losses rise." : "Nice. The senior tranche (top floor) sits above the AAA stress line. Junior tranches pay more because they sit closer to the water.";
      case 4: return graded ? `The rating agencies have spoken. Senior tranche: ${gname(grades[0])}. Change tranche sizes in step 4 and come back to try for a better rating.` : "Press the button to send your deal to the rating agencies. They run stress tests (storms several times worse than expected) and check which tranches (floors) stay dry.";
      case 5: return closed ? `Deal sold! ${nr(A.orig, lr(A))} has its cash. Next, see how your tranches trade in the secondary market (afterwards).` : !allCovered ? "At least one tranche is undersubscribed (fewer orders than bonds for sale). Offer a wider spread (a bit more extra pay) on it." : book.some((x: { cover: number }) => x.cover > 2.5) ? "Every tranche is covered, but some are hugely oversubscribed. You could tighten the spread (offer less extra pay)." : "Every tranche is covered at a sensible level. Price and close the deal!";
      case 6: return !mk.started ? "Open secondary trading, then press Next month to let time pass. Buy tranches you think will rise, sell ones you think will fall." : A.refi > 0.2 ? "MBS tip: rate cuts trigger refinancing, so prepayments (early payoffs) jump. Watch what that does to prices above 100." : "Tip: bad economic news hits junior tranches hardest; benchmark rate rises dent everything a little. Holding bonds also earns monthly coupon interest.";
      default: return sRun.early > 0 ? `The early amortization trigger (tripwire) fired in month ${sRun.early}: refilling stopped and every repaid dollar went to investors.` : sRun.tr[0].loss > 1 ? "Ouch: even the senior tranche lost money in this stress test, like many 'AAA' home-loan bonds in 2008. Try more credit enhancement in step 4." : sRun.tr[2].loss > 1 ? "The storm reached the junior tranche, but the senior tranche stayed dry. That's subordination doing its job." : "Every tranche was paid in full. Try a harsher stress scenario.";
    }
  })();

  const glossRows = Object.keys(G).map((k: string) => [G[k][0], G[k][1], G[k][2]]);

  return (
    <Page width="wide" title="Bond Lab" summary="Learn by doing: select a collateral pool (basket) of car loans, home mortgages, credit cards, student loans, equipment leases, song royalties or business loans; structure it into tranches (floors); get it rated; price and place the bonds with investors; then trade them as the economy changes. All companies, prices and data are made up (synthetic) for practice. Tap any dotted term for a plain-English explanation.">
      <Section heading="Your desk">
        <Desk xp={xp} badges={badges} stage={stage} setStage={setStage} maxSeen={maxSeen} asset={proName(A)} />
      </Section>

      <Callout lead={`Coach \u00b7 Step ${stage + 1}: ${STAGES[stage]}`}>{coach}</Callout>

      {stage === 0 && (
        <Fragment>
          <Section heading="Asset class: what goes in your collateral pool (basket)?">
            <Wrap>{ASSETS.map((x: AssetDef) => <Chip key={x.id} label={proName(x)} active={x.id === aid} done={tried.includes(x.id) && x.id !== aid} onClick={() => pickAsset(x.id)} />)}</Wrap>
            <Text>Switching resets your deal to that asset class's typical setup.</Text>
          </Section>
          <Section heading={`${A.name}, in real life`}>
            <Properties items={[
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
          </Section>
          {A.notes.length > 0 && (
            <Section heading="Good to know">
              <Rows rows={A.notes.map((nt: [string, string]) => ({ title: nt[0], detail: nt[1] }))} />
              {A.guar && <Toggle label={A.guar} value={guar} onChange={(v: boolean) => setGuar(v)} />}
              {A.guar && <Text>{guar ? `On: a government-backed promise covers about 97% of each loss. Expected losses drop to ${pc(el, 2)}. Watch every floor become AAA in step 5.` : "Off: no guarantee, so floors and cushions do all the protecting."}</Text>}
            </Section>
          )}
          <Section heading="Asset classes side by side" caption="Typical mock setups before you change anything.">
            <Table columns={["Asset class (basket)", "Typical loan size", "Term (length)", "Payment structure", "Expected net loss", "Senior tranche (top floor)"]} rows={ASSETS.map((x: AssetDef) => [proName(x), fm(x.size), mo(x.term[3]), x.rev ? "Revolving (refilling)" : x.defer ? "Deferment, then amortizing" : "Amortizing (monthly paydown)", `${pc(x.elBase + Math.max(0, 760 - x.score[3]) * x.elSlope)} ${x.annual ? "/ yr" : "total"}`, `${x.st[0]}%`])} />
          </Section>
        </Fragment>
      )}

      {stage === 1 && (
        <Fragment>
          <Section heading="The whole idea in 30 seconds">
            <Steps steps={[
              { title: `${A.who.charAt(0).toUpperCase() + A.who.slice(1)} pay`, detail: <span>{nr(A.orig, lr(A))} has thousands of {A.thing}. Every month {A.who} pay.</span> },
              { title: "True sale to the SPV (the loans move into a walled-off box)", detail: <span>{nr(A.short, lr(A))} sells the {A.thing} in a <Term k="truesale">true sale (a real sale)</Term> to a <Term k="spv">special purpose vehicle, SPV (walled-off box)</Term> called {A.trust}. It holds them as the <Term k="pool">collateral pool (basket)</Term> and is <Term k="bkremote">bankruptcy-remote (walled off)</Term> if {A.short} ever goes bust.</span> },
              { title: "Tranching (the basket is cut into floors)", detail: <span>Like a building in a flood: the <Term k="senior">senior tranche (top floor)</Term> stays dry longest, the <Term k="junior">junior tranche (bottom floor)</Term> gets wet first, so it earns more.</span> },
              { title: "Rating and placement (floors get graded and sold)", detail: <span>Rating agencies give each tranche a <Term k="rating">credit rating (grade)</Term>; the <Term k="underwriter">underwriter</Term> sells them to investors as <Term k="abs">asset-backed securities, ABS (bonds)</Term>.</span> },
              { title: "The waterfall (money flows down every month)", detail: <span>The <Term k="servicer">servicer (payment collector)</Term> gathers payments and the <Term k="trustee">trustee (referee)</Term> pays the tranches by the <Term k="waterfall">waterfall (payment order)</Term>.</span> },
              { title: "Secondary trading (floors trade afterwards)", detail: <span>Investors buy and sell tranches with a market maker in the <Term k="secondary">secondary market (trading afterwards)</Term> as news moves prices.</span> },
            ]} />
          </Section>
          <Section heading="Market participants: follow the money">
            <Diagram direction="horizontal" nodes={[
              { id: "d", label: PL[0].name, detail: "the borrowers", kind: "person" },
              { id: "l", label: A.orig, detail: lr(A) },
              { id: "s", label: A.serv, detail: "the servicer" },
              { id: "t", label: A.trust, detail: "special purpose vehicle (SPV)", kind: "decision" },
              { id: "g", label: "Granite Trust Co.", detail: "the trustee" },
              { id: "r", label: "Polaris & Meridian", detail: "the rating agencies" },
              { id: "u", label: "Bluebridge Securities", detail: "the underwriter/dealer" },
              { id: "i", label: "Investors", detail: "the buy-side", kind: "person" },
              { id: "m", label: "Kestrel Markets", detail: "the market maker" },
            ]} edges={[
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
            ]} />
            <Text>The box in the middle, {A.trust}, is the <Term k="spv">special purpose vehicle, SPV (walled-off box)</Term>. The loans go in, bonds come out, and every month borrowers' money flows through it to investors. Investors' cash for the bonds flows back through it to {nr(A.short, lr(A))}.</Text>
          </Section>
          <Section heading="Tap a market participant (player)">
            <Wrap>{PL.map((p: Player) => <Chip key={p.id} label={nr(p.name, p.role)} active={p.id === sel} done={seen.includes(p.id)} onClick={() => { setSel(p.id); const ns = seen.includes(p.id) ? seen : [...seen, p.id]; setSeen(ns); if (ns.length >= 6) award("players"); }} />)}</Wrap>
          </Section>
          <Section heading={pl.title ?? nr(pl.name, pl.role)}>
            <Properties items={[
              ...(pl.title ? [{ label: "Its name in this deal", value: pl.name }] : []),
              { label: "What they do", value: pl.does },
              { label: "Think of it like", value: pl.like },
              { label: "How they get paid", value: pl.paid },
              { label: "In this game", value: pl.here },
              ...(pl.extra ?? []),
              { label: "Industry title", value: pl.pro },
            ]} />
          </Section>
          <Section heading="Quick check: the special purpose vehicle, SPV (walled-off box)">
            <QuizBox quiz={QUIZ_SPV} ans={quiz[8]} onAns={(i: number) => { setQuiz({ ...quiz, 8: i }); if (i === QUIZ_SPV.ok) award("q8"); }} />
          </Section>
        </Fragment>
      )}

      {stage === 2 && (
        <Fragment>
          <Grid columns={2}>
            <Section heading={`Collateral selection (choose the ${A.thing})`}>
              <Slider label={`Loan count (number of ${A.thing})`} value={nLoans} min={A.n[0]} max={A.n[1]} step={A.n[2]} fmt={(v: number) => v.toLocaleString()} onChange={(v: number) => { setN(v); award("pool"); }} />
              <Slider label={A.scoreTerm ? <span>Average <Term k="fico">FICO score (credit score)</Term></span> : A.scoreLabel} value={score} min={A.score[0]} max={A.score[1]} step={A.score[2]} fmt={(v: number) => String(v)} onChange={(v: number) => { setScore(v); award("pool"); }} />
              <Slider label={A.rateLabel} value={aprIn} min={A.rate[0]} max={A.rate[1]} step={A.rate[2]} fmt={(v: number) => pc(v, 2)} onChange={(v: number) => { setApr(v); award("pool"); }} />
              <Slider label={A.rev ? "Deal term (refills until the last 12 months)" : "Term (length)"} value={term} min={A.term[0]} max={A.term[1]} step={A.term[2]} fmt={mo} onChange={(v: number) => { setTerm(v); setMonth(Math.min(month, v)); award("pool"); }} />
            </Section>
            <Section heading="Collateral pool (your basket, mock data)">
              <Properties items={[
                { label: "Pool balance (total value)", value: fm(B) },
                { label: "Average loan size", value: fm(pool.avg) },
                { label: A.scoreTerm ? "Average FICO score (credit score)" : A.scoreLabel, value: pool.score.toFixed(0) },
                { label: "Weighted average rate (average rate)", value: pc(pool.apr * 100, 2) },
                { label: "Expected net loss", value: <Term k="el">{`${pc(el, el < 1 ? 2 : 1)} of the basket ${elText}`}</Term> },
                { label: "Collected in month 1", value: `${fm(baseRun.months[0].collected)} by ${nr(A.serv, "the servicer")}` },
                { label: "Default rate, CDR (loans going bad)", value: <Term k="cdr">{pc(baseCdr * 100)} a year</Term> },
                A.rev ? { label: "Monthly payment rate, MPR (monthly payback)", value: <Term k="mpr">{pc(A.cpr * 100, 0)} of balances a month</Term> } : { label: "Prepayment, CPR (early payoffs)", value: <Term k="cpr">{pc(A.cpr * 100, 0)} a year</Term> },
                { label: "Payment structure (how money comes in)", value: howPays },
              ]} />
            </Section>
          </Grid>
          <Section heading="Credit score distribution (strength scores in your basket)" caption="Number of loans by score; yellow bars are the weakest (subprime, under 620).">
            <Histogram bins={pool.bins} />
            <Text>{nr(A.orig, lr(A))} wants its cash now rather than waiting years to be repaid, so it will sell this collateral pool (basket) to {nr(A.trust, SPV_ROLE)}, which issues bonds to investors.</Text>
          </Section>
        </Fragment>
      )}

      {stage === 3 && (
        <Fragment>
          <Grid columns={2}>
            <Section heading="Structure the tranches (slice the basket into floors)">
              <Slider label={<span><Term k="senior">Senior tranche (top floor)</Term>: safest, paid first</span>} value={a} min={40} max={100 - b - c} step={1} fmt={(v: number) => `${v}%`} onChange={setA} />
              <Slider label={<Term k="mezz">Mezzanine tranche (middle floor)</Term>} value={b} min={0} max={Math.min(30, 100 - a - c)} step={1} fmt={(v: number) => `${v}%`} onChange={setB} />
              <Slider label={<span><Term k="junior">Junior tranche (bottom floor)</Term>: riskiest one sold</span>} value={c} min={0} max={Math.min(25, 100 - a - b)} step={1} fmt={(v: number) => `${v}%`} onChange={setC} />
              <Slider label={<span><Term k="reserve">Reserve account (rainy-day fund)</Term></span>} value={res} min={0} max={3} step={0.25} fmt={(v: number) => `${v}% of pool`} onChange={setRes} />
              <Text>Whatever you don't sell is <Term k="oc">overcollateralization, OC (extra padding)</Term>: {nr(A.short, lr(A))} keeps it as the <Term k="residual">residual / equity tranche (owner's slice)</Term>. Right now that's {oc}%. Each month, <Term k="xs">excess spread (leftover interest)</Term> of {pc(xs, 2)} a year soaks up losses first.</Text>
            </Section>
            <Section heading="Capital structure (your building)">
              <Building layers={layers} floods={floods} />
            </Section>
          </Grid>
          <Section heading="Tranche by tranche (floor by floor)">
            <Table columns={["Tranche (floor)", "Share", "Size", "Credit enhancement (cushion)", "Coupon (interest paid)", "WAL (avg wait)"]} rows={[0, 1, 2].map((i: number) => [FL[i], `${pcts[i]}%`, fm(trs[i].size), pc(cushion[i]), pc(coupons[i] * 100, 2), `${baseRun.tr[i].wal.toFixed(1)} yrs`])} />
            <Text><Term k="ce">Credit enhancement (safety cushion)</Term> is everything below a tranche: <Term k="sub">subordination (lower floors absorbing losses first)</Term>, overcollateralization, the reserve account and excess spread. Repayments are <Term k="seq">sequential pay (one floor at a time)</Term>, so the senior tranche has the shortest <Term k="wal">weighted average life, WAL (wait for its money)</Term>.</Text>
          </Section>
        </Fragment>
      )}

      {stage === 4 && (
        <Fragment>
          <Section heading="Get rated (send it to the rating agencies)">
            <Text>{RATERS} run stress tests: storms several times worse than expected net loss ({pc(el, el < 1 ? 2 : 1)} {elText}). For {A.name.toLowerCase()}, a tranche whose credit enhancement survives {A.thr[0]}x gets AAA, {A.thr[1]}x AA, {A.thr[2]}x A, {A.thr[3]}x BBB, {A.thr[4]}x BB. Below that: not rated.</Text>
            <Wrap><Button variant="primary" label={graded ? "Re-check ratings (grades)" : "Request credit ratings (ask for grades)"} onClick={() => { setGraded(true); award("graded"); if (grades[0] === "AAA") award("aaa"); }} /></Wrap>
          </Section>
          {graded && (
            <Section heading="Credit ratings (report cards)">
              <Table columns={["Tranche (floor)", "Credit enhancement (cushion)", "Stress multiple (storm it survives)", "Rating (grade)", "Expected spread (extra pay buyers want)"]} rows={[0, 1, 2].map((i: number) => [FL[i], pc(cushion[i]), `${mult[i] > 99 ? "99+" : mult[i].toFixed(1)}x expected losses`, <Status key={i} tone={grades[i] === "AAA" ? "success" : grades[i] === "NR" ? "warning" : "neutral"}>{gname(grades[i])}</Status>, `about ${Math.round(FAIR[grades[i]] * A.fairK)} bps`])} />
              <Text>Lower ratings scare off cautious buyers, so those tranches must offer a wider <Term k="spread">spread (extra pay)</Term> over the benchmark rate, counted in <Term k="bps">basis points, bps (hundredths of a percent)</Term>. Real deals also add <Term k="trigger">performance triggers (tripwires)</Term> and allow a <Term k="stepdown">step-down (cushion release)</Term> later.</Text>
            </Section>
          )}
          <Section heading="Stress scenarios vs. your capital structure (flood lines vs. your building)">
            <Building layers={layers} floods={floods} />
          </Section>
        </Fragment>
      )}

      {stage === 5 && (
        <Fragment>
          <Grid columns={2}>
            <Section heading="Price the tranches: set the spread (extra pay)">
              {[0, 1, 2].map((i: number) => (
                <Slider key={i} label={<span>{FL[i]}, {gname(grades[i])}: <Term k="spread">spread (extra pay)</Term></span>} value={spreads[i]} min={[20, 40, 80][i]} max={[300, 600, 1000][i]} step={5} fmt={(v: number) => `${v} bps = ${pc(BENCH * 100 + v / 100, 2)}`} onChange={(v: number) => { if (closed) return; const n = spreads.slice(); n[i] = v; setSpreads(n); }} />
              ))}
              <Text><Term k="coupon">Coupon (interest paid)</Term> = <Term k="benchmark">benchmark rate (safe rate)</Term> 4.00% + spread. A tighter spread leaves more <Term k="xs">excess spread (leftover interest)</Term> for {nr(A.short, lr(A))}: now {pc(xs, 2)} a year, about {fm((xs / 100) * B)}.</Text>
            </Section>
            <Section heading="Order book (orders vs. supply)">
              <Table columns={["Tranche (floor)", "For sale", "Orders", "Coverage (times covered)"]} rows={[0, 1, 2].map((i: number) => [FL[i], fm(book[i].size), fm(book[i].cover * book[i].size), <Status key={i} tone={book[i].cover < 1 ? "danger" : book[i].cover > 2.5 ? "warning" : "success"}>{`${book[i].cover.toFixed(2)}x`}</Status>])} />
              <Text>{DEALER} is <Term k="book">book-building (taking orders)</Term>. Aim for 1x to 2.5x <Term k="oversub">oversubscription (orders vs. supply)</Term> on every tranche.</Text>
              <Wrap><Button variant="primary" disabled={!allCovered || closed} label={closed ? "Deal priced and closed" : "Price and close the deal"} onClick={() => { setClosed(true); award("closed"); if (book.every((x: { cover: number }) => x.cover <= 2.5)) award("sweet"); }} />{closed && <Button label="Reopen to re-price" onClick={() => setClosed(false)} />}</Wrap>
            </Section>
          </Grid>
          <Section heading="Investor orders (the investors calling in)">
            <Table columns={["Investor", "Investor type (who they are)", "Senior", "Mezzanine", "Junior"]} rows={INV.map((v: { name: string; type: string }, j: number) => [nr(v.name, "an investor"), v.type, ...[0, 1, 2].map((i: number) => { const o = book[i].orders[j]; return !o.likes ? "Outside mandate (not their style)" : o.ok ? fm(o.amt) : `Wants ${Math.ceil(o.resv)}+ bps spread`; })])} />
          </Section>
        </Fragment>
      )}

      {stage === 6 && (
        <Fragment>
          {!mk.started ? (
            <Section heading={`Secondary trading at ${MM}`}>
              <Text>You get $10M of mock cash. {MM} quotes a <Term k="bid">bid (price you can sell at)</Term> and a slightly higher <Term k="ask">ask (price you can buy at)</Term> for each tranche of your {A.name.toLowerCase()} deal. Prices are quoted <Term k="price">per 100 (per $100 owed)</Term>, trades are $1M each, and you can also <Term k="short">short (bet a tranche drops)</Term> by selling up to $5M you don't own. News is tailored to {A.name.toLowerCase()}.</Text>
              <Wrap><Button variant="primary" label="Open secondary trading (the trading floor)" onClick={openMarket} /></Wrap>
            </Section>
          ) : (
            <Fragment>
              <Section heading={`Month ${mk.m}: quotes from ${MM}`}>
                <Table columns={["Tranche (floor)", "Bid (sell at)", "Ask (buy at)", "Spread now (extra pay)", "Position (you hold)", "Trade"]} rows={[0, 1, 2].map((i: number) => [FL[i], (mids[i] - hw[i]).toFixed(2), (mids[i] + hw[i]).toFixed(2), `${mk.mkt[i].toFixed(0)} bps`, `${mk.pos[i] >= 0 ? "" : "short "}$${Math.abs(mk.pos[i])}M`, <Wrap key={i}><Button label="Buy $1M" onClick={() => trade(i, true)} /><Button label="Sell $1M" onClick={() => trade(i, false)} /></Wrap>])} />
                <Wrap><Button variant="primary" label="Next month" onClick={nextMonth} /><Button label="Restart market" onClick={openMarket} /></Wrap>
              </Section>
              <Grid columns={2}>
                <Section heading="Your account (P&L)">
                  <Properties items={[
                    { label: "Cash", value: fm(mk.cash) },
                    { label: "Mark-to-market (holdings worth today)", value: <Term k="mark">{fm(holdVal)}</Term> },
                    { label: "P&L (profit or loss)", value: <span style={{ color: pnl >= 0 ? t.text.success : t.text.danger }}><Term k="pnl">{(pnl >= 0 ? "+" : "") + fm(pnl)}</Term></span> },
                    { label: "Benchmark rate (safe rate)", value: <Term k="benchmark">{pc(mk.bench * 100, 2)}</Term> },
                    { label: "Unemployment", value: pc(mk.unemp) },
                    { label: A.rev ? "Payment rate vs. normal (payback speed)" : "Prepayment speed vs. normal (early payoffs)", value: `${mk.cprM.toFixed(2)}x` },
                    { label: "Trades made", value: String(mk.trades.length) },
                  ]} />
                </Section>
                <Section heading="News wire">
                  <Rows rows={mk.news.slice(0, 4).map((n: { m: number; title: string; detail: string }) => ({ lead: `M${n.m}`, title: n.title, detail: n.detail }))} />
                </Section>
              </Grid>
              {mk.hist.length > 1 && (
                <Section heading="Prices over time" caption="Mid price per $100 owed.">
                  <PriceChart hist={mk.hist} />
                  <Text>Junior tranches swing more on bad news; tranches with a longer WAL swing more on rate news (<Term k="dv01">duration (rate sensitivity)</Term>). Holding a floor also pays you its monthly interest in cash.</Text>
                </Section>
              )}
              {mk.trades.length > 0 && (
                <Section heading="Trade blotter (your trade log)">
                  <Table columns={["Month", "Action", "Tranche (floor)", "Price"]} rows={mk.trades.slice(0, 8).map((x: { m: number; side: string; fl: number; px: number }) => [String(x.m), `${x.side} $1M ${x.side === "Bought" ? "from" : "to"} ${MM}`, FL[x.fl], x.px.toFixed(3)])} />
                </Section>
              )}
            </Fragment>
          )}
        </Fragment>
      )}

      {stage === 7 && (
        <Fragment>
          <Section heading={`Stress test (pick a storm) for ${A.name.toLowerCase()}`}>
            <Segmented options={[...A.presets.map((p: [string, number, number, number], i: number) => ({ value: String(i), label: p[0] })), { value: "custom", label: "Custom" }]} value={preset} onChange={(v: string) => pickPreset(v)} />
            <div style={{ height: 14 }} />
            <Grid columns={3} plain>
              <Slider label={<Term k="cdr" />} value={Number(sv[0].toFixed(1))} min={0} max={40} step={0.5} fmt={(v: number) => `${v}% / yr`} onChange={(v: number) => setSv(0, v)} />
              {A.rev ? (
                <Slider label={<Term k="mpr" />} value={sv[1]} min={3} max={40} step={1} fmt={(v: number) => `${v}% / month`} onChange={(v: number) => setSv(1, v)} />
              ) : (
                <Slider label={<Term k="cpr" />} value={sv[1]} min={0} max={40} step={1} fmt={(v: number) => `${v}% / yr`} onChange={(v: number) => setSv(1, v)} />
              )}
              <Slider label={<Term k="sev" />} value={sv[2]} min={0} max={98} step={1} fmt={(v: number) => `${v}%`} onChange={(v: number) => setSv(2, v)} />
            </Grid>
          </Section>
          <Section heading="Tranche results (who got paid back)">
            <Table columns={["Tranche (floor)", "Size", "Interest received", "Principal repaid (paid back)", "Principal lost", "WAL (avg wait)", "Result"]} rows={[0, 1, 2].map((i: number) => { const o = sRun.tr[i]; const lp = trs[i].size > 0 ? (o.loss / trs[i].size) * 100 : 0; return [FL[i], fm(trs[i].size), fm(o.int), fm(o.prin), fm(o.loss), `${o.wal.toFixed(1)} yrs`, <Status key={i} tone={lp < 0.01 ? "success" : lp < 50 ? "warning" : "danger"}>{lp < 0.01 ? "Paid in full" : `Lost ${pc(lp)}`}</Status>]; })} />
            <Text>Collateral losses (basket losses) in this stress test: {fm(sRun.poolLoss)} ({pc((sRun.poolLoss / B) * 100)}). The residual / equity tranche (owner's slice), kept by {nr(A.orig, lr(A))}, received {fm(sRun.equity)} in leftover money over the deal's life.{A.rev ? (sRun.early > 0 ? ` The early amortization trigger (tripwire) fired in month ${sRun.early}.` : " The early amortization trigger (tripwire) never fired.") : ""}</Text>
          </Section>
          <Section heading="Outstanding balance by tranche (money still owed to each floor)" caption={`$ millions outstanding every ${step} months.`}>
            <ColumnSeries stacked unit="$M" labels={sRun.months.filter((r: MonthRow) => r.m % step === 0).map((r: MonthRow) => `M${r.m}`)} series={[0, 1, 2].map((i: number) => ({ name: FL[i], values: sRun.months.filter((r: MonthRow) => r.m % step === 0).map((r: MonthRow) => Math.round(r.bal[i] / 1e5) / 10) }))} />
          </Section>
          <Section heading="Waterfall (follow one month of the payment order)">
            <Slider label="Month" value={Math.min(month, term)} min={1} max={term} step={1} fmt={(v: number) => `Month ${v}`} onChange={setMonth} />
            {mrow && (
              <Rows rows={[
                { lead: "1", title: `${nr(A.serv, "the servicer")} collected ${fm(mrow.collected)}`, detail: `Includes ${fm(mrow.recovery)} recovered by ${A.recover}.${mrow.refilling ? ` Repayments this month were used to buy new ${A.thing} (refilling).` : ""}` },
                { lead: "2", title: `${fm(mrow.defaults)} defaulted (went bad)`, detail: `After recoveries, ${fm(mrow.loss)} was lost for good.`, status: mrow.loss > 0 ? { label: "Losses", tone: "warning" } : undefined },
                { lead: "3", title: `Servicer fee ${fm(mrow.fee)}`, detail: "Paid first, so the collecting keeps happening." },
                { lead: "4", title: "Interest to each tranche, senior first", detail: [0, 1, 2].map((i: number) => `${FL[i]} ${fm(mrow.intPaid[i])}`).join(" \u00b7 ") },
                { lead: "5", title: "Principal, sequential pay (one floor at a time)", detail: [0, 1, 2].map((i: number) => `${FL[i]} ${fm(mrow.prinPaid[i])}`).join(" \u00b7 ") },
                { lead: "6", title: mrow.reserveDraw > 0 ? `Reserve account (rainy-day fund) used: ${fm(mrow.reserveDraw)}` : `Reserve account (rainy-day fund) holds ${fm(mrow.reserve)}`, detail: `${TRUSTEE} checks that ${nr(A.trust, SPV_ROLE)} follows the rules at each step.` },
                { lead: "7", title: `Residual (leftover) to ${nr(A.short, lr(A))}: ${fm(mrow.toEquity)}`, detail: mrow.shortfall > 0 ? `Credit enhancement breached: tranches are owed ${fm(mrow.shortfall)} more than the collateral pool holds. The junior tranche is first in line to lose it.` : "Only what's left after every floor is paid.", status: mrow.shortfall > 0 ? { label: "Credit enhancement breached", tone: "danger" } : undefined },
              ]} />
            )}
          </Section>
        </Fragment>
      )}

      <Section heading={`Quick check: step ${stage + 1}`}>
        <QuizBox quiz={QUIZ[stage]} ans={quiz[stage]} onAns={answer} />
      </Section>

      <Section heading="Move on">
        <Wrap>
          <Button label="Back" disabled={stage === 0} onClick={() => setStage(stage - 1)} />
          <Button variant="primary" label={stage === STAGES.length - 1 ? "Back to start" : `Next: ${STAGES[stage + 1]}`} onClick={() => setStage(stage === STAGES.length - 1 ? 0 : stage + 1)} />
        </Wrap>
      </Section>

      <Section heading="Dictionary: industry terms in plain English" collapsible defaultOpen={false}>
        <Table columns={["Industry term", "Everyday analogy", "What it means"]} rows={glossRows} />
      </Section>
    </Page>
  );
}
