// Shared deal engine + educational data for the standalone terminal UI.
// Generated from src/App.tsx (the Page mirror) and kept in sync by hand.
import type { ReactNode } from "react";
import { Term } from "./ui";


// ---------- deterministic mock data ----------
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function gauss(r: () => number): number {
  return Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());
}
export const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));
export const fm = (x: number): string => {
  const s = x < 0 ? "-" : "";
  const v = Math.abs(x);
  if (v >= 1e9) return s + "$" + (v / 1e9).toFixed(2) + "B";
  if (v >= 1e6) return s + "$" + (v / 1e6).toFixed(v >= 1e8 ? 0 : 1) + "M";
  if (v >= 1e3) return s + "$" + (v / 1e3).toFixed(0) + "K";
  return s + "$" + v.toFixed(0);
};
export const pc = (x: number, d = 1): string => x.toFixed(d) + "%";
export const mo = (v: number): string => (v >= 120 ? `${v} months (${(v / 12).toFixed(0)} yrs)` : `${v} months`);

// ---------- dictionary: [industry term, everyday analogy, plain-English explanation] ----------
export const G: Record<string, [string, string, string]> = {
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
export type Ev = { title: string; detail: string; w: number; bk?: boolean; bench?: number; unemp?: number; cpr?: number; sev?: number; sp?: number[] };
export type R4 = [number, number, number, number];
export type AssetDef = {
  id: string; name: string; pro: string; tk: string; thing: string; who: string;
  orig: string; oRole?: string; short: string; serv: string; trust: string; recover: string;
  n: R4; size: number; score: R4; scoreLabel: string; scoreTerm?: boolean; rate: R4; rateLabel: string; term: R4;
  elBase: number; elSlope: number; annual?: boolean; sev: number; cpr: number; lifeK: number; fee: number;
  rev?: boolean; defer?: [number, number]; refi: number; uSens: number; liq: number; guar?: string;
  st: R4; sp: [number, number, number]; xs: [number, number]; thr: number[]; fairK: number; inv: R4;
  events: Ev[]; presets: [string, number, number, number][];
  what: string; like: string; fact: string; notes: [string, string][];
};
export const ASSETS: AssetDef[] = [
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
export const nr = (name: string, role: string): string => `${name} (${role})`;
export const lr = (A: AssetDef): string => A.oRole ?? "the lender";
// industry name first, everyday name in parentheses, e.g. "Auto ABS (car loans)"
export const proName = (x: AssetDef): string => `${x.pro.charAt(0).toUpperCase() + x.pro.slice(1)} (${x.name.toLowerCase()})`;
export const SPV_ROLE = "the special purpose vehicle";
export const TRUSTEE = nr("Granite Trust Co.", "the trustee");
export const DEALER = nr("Bluebridge Securities", "the underwriter/dealer");
export const RATERS = "Polaris Ratings and Meridian Credit (the rating agencies)";
export const MM = nr("Kestrel Markets", "the market maker");
export type Player = { id: string; name: string; role: string; title?: string; pro: string; does: string; like: string; paid: string; here: string; extra?: { label: string; value: ReactNode }[] };
export const playersFor = (A: AssetDef): Player[] => [
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
export const INV = [
  { name: "Evergreen Fund Managers", type: "Money manager: invests people's savings", likes: ["AAA", "AA", "A", "BBB"], budget: 0.35, mult: 1.0 },
  { name: "Bedrock Mutual Insurance", type: "Insurer: needs steady safe income for future claims", likes: ["AAA", "AA", "A"], budget: 0.3, mult: 0.95 },
  { name: "Harborline Bank Treasury", type: "Bank: parks spare cash in the safest stuff", likes: ["AAA"], budget: 0.4, mult: 0.85 },
  { name: "Quickstrike Capital", type: "Hedge fund: takes big risks for big rewards", likes: ["A", "BBB", "BB", "NR"], budget: 0.6, mult: 1.15 },
];
export const FAIR: Record<string, number> = { AAA: 65, AA: 90, A: 120, BBB: 180, BB: 350, NR: 650 };
export const GR = ["AAA", "AA", "A", "BBB", "BB"];
export const grade = (m: number, thr: number[]): string => {
  for (let i = 0; i < thr.length; i++) if (m >= thr[i]) return GR[i];
  return "NR";
};
export const gname = (g: string): string => (g === "NR" ? "Not rated" : g);
export const FL = ["Senior tranche (top floor)", "Mezzanine tranche (middle floor)", "Junior tranche (bottom floor)"];
export const FLS = ["Senior", "Mezzanine", "Junior"];
export const BENCH = 0.04;

// ---------- basket + cash flow engine ----------
export function makePool(n: number, score: number, rate: number, size: number) {
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

export type MonthRow = { m: number; collected: number; recovery: number; defaults: number; loss: number; fee: number; intPaid: number[]; prinPaid: number[]; bal: number[]; poolBal: number; reserve: number; reserveDraw: number; toEquity: number; shortfall: number; refilling: boolean };
export type TrOut = { int: number; prin: number; loss: number; cf: number[]; wal: number };
export type RunRes = { months: MonthRow[]; tr: TrOut[]; equity: number; poolLoss: number; early: number };
export type Opt = { rev?: boolean; defer?: [number, number]; fee: number };

export function runDeal(B: number, apr: number, term: number, cdr: number, cpr: number, sev: number, tr: { size: number; coupon: number }[], ocAmt: number, resAmt: number, o: Opt): RunRes {
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
export function pv(cf: number[], rate: number): number {
  let s = 0;
  cf.forEach((c: number, t: number) => { s += c / Math.pow(1 + rate / 12, t + 1); });
  return s;
}

// ---------- awards ----------
export const AW: Record<string, [number, string]> = {
  players: [50, "Networker"], pool: [40, ""], graded: [30, ""], aaa: [60, "AAA Achieved"], closed: [80, "Deal Closed"], sweet: [50, "Sweet-Spot Pricing"], mm: [60, "Market Maker"], green: [60, "In the Green"], recession: [80, "Survived the Recession"], explorer: [80, "Explorer"], tripwire: [40, "Tripwire Spotter"], q8: [20, ""],
  q0: [20, ""], q1: [20, ""], q2: [20, ""], q3: [20, ""], q4: [20, ""], q5: [20, ""], q6: [20, ""], q7: [20, ""],
};
export const LEVELS: [number, string][] = [[0, "Intern"], [140, "Analyst"], [300, "Associate"], [480, "Vice President"], [680, "Head of Desk"]];
export const STAGES = ["Select the collateral pool (pick your basket)", "Market participants (meet the players)", "Build the collateral pool (fill the basket)", "Structure the tranches (build the floors)", "Get rated (get graded)", "Price and place the bonds (sell the floors)", "Secondary trading (the trading floor)", "Stress test (storm test)"];

export type Quiz = { q: string; opts: string[]; ok: number; why: string };
export const QUIZ: Quiz[] = [
  { q: "Government-backed (agency) home-loan bonds are special because...", opts: ["A government-sponsored company promises to cover defaults", "They are never paid back early", "They pay the most interest"], ok: 0, why: "With the promise, losses barely matter. The big worry becomes early payoffs when rates fall." },
  { q: "Who collects the monthly payments from borrowers?", opts: ["The trustee (referee)", "The servicer (payment collector)", "The rating agency (grader)"], ok: 1, why: "The servicer collects the money; the trustee then makes sure it is handed out in the right order." },
  { q: "If the collateral pool's (basket's) average credit score goes down, expected net loss...", opts: ["go down", "go up", "don't change"], ok: 1, why: "Lower scores mean more borrowers likely to stop paying, so more expected losses." },
  { q: "When bad loans pile up, who loses money first?", opts: ["The senior tranche (top floor)", "The residual and junior tranche (owner's slice and bottom floor)", "Everyone equally"], ok: 1, why: "Losses flood from the bottom up. That is exactly why the top floor is safe." },
  { q: "A tranche's credit enhancement (safety cushion) can absorb 5x expected losses. Which credit rating (grade) fits best for car loans?", opts: ["AAA", "BBB", "Not rated"], ok: 0, why: "Agencies give AAA only to floors that survive a storm about 5 times worse than expected (stricter for unusual baskets)." },
  { q: "Your senior tranche (top floor) is 4x oversubscribed (covered). What does that tell you?", opts: ["You offered more spread (extra pay) than needed", "Nobody wants it", "Its rating (grade) is wrong"], ok: 0, why: "Huge demand means you could cut the extra pay and keep more leftover money for the seller." },
  { q: "The benchmark rate (safe rate) jumps. Bonds you already own...", opts: ["go up in price", "go down in price", "don't move"], ok: 1, why: "New bonds now pay more, so old ones must get cheaper to compete. Like a seesaw: rates up, prices down." },
  { q: "Prepayments (early payoffs) jump. The weighted average life, WAL (average wait for your money)...", opts: ["gets shorter", "gets longer", "stays the same"], ok: 0, why: "Early payoffs return money sooner, so the average wait shrinks. For home loans this happens when rates fall." },
];

export const QUIZ_SPV: Quiz = { q: "Why are the loans put in a special purpose vehicle (SPV)?", opts: ["So the lender's creditors can't grab them if the lender goes bust", "So the loans earn more interest", "So the lender can keep the payments for itself"], ok: 0, why: "After a true sale the loans belong to the SPV, which is bankruptcy-remote. Even if the lender fails, investors keep getting paid from borrowers' payments." };

export type Mkt = { started: boolean; bk: boolean; m: number; bench: number; unemp: number; cprM: number; sevAdd: number; mkt: number[]; orig: number[]; hist: { m: number; px: number[] }[]; cash: number; pos: number[]; trades: { m: number; side: string; fl: number; px: number }[]; news: { m: number; title: string; detail: string }[] };
export const EMPTY_MKT: Mkt = { started: false, bk: false, m: 0, bench: BENCH, unemp: 4, cprM: 1, sevAdd: 0, mkt: [0, 0, 0], orig: [0, 0, 0], hist: [], cash: 1e7, pos: [0, 0, 0], trades: [], news: [] };
export const GEN: Ev[] = [
  { title: "Quiet month", detail: "Payments came in as usual. Not much moved.", w: 3 },
  { title: "Benchmark rate up 0.25% (safe rate)", detail: "The central bank nudged rates up. New bonds pay more, so older ones drop in price, most for floors with a long wait.", w: 1.5, bench: 0.0025 },
  { title: "Benchmark rate down 0.25% (safe rate)", detail: "Rates were cut. Older bonds that pay more now look better, so their prices rise.", w: 1.5, bench: -0.0025 },
  { title: "Investors hungry for income", detail: "Lots of cash chasing bonds. Everyone accepts less extra pay, so prices rise.", w: 1, sp: [-6, -15, -25] },
  { title: "Lender files for bankruptcy", detail: "", w: 0.6, bk: true, sp: [3, 10, 25] },
];

