// PRFAQ (press release + frequently asked questions) for the hypothetical Lighthouse ABS Exchange.
// One source of truth: rendered in the app (Exchange Builder, step 8), in the print-friendly view, and into the PDF (make-prfaq.mjs).
// Everything here is fictional and illustrative. Keep it free of backticks and dollar-brace sequences.

export const PRFAQ_TITLE = "Lighthouse ABS Exchange: PRFAQ";
export const PRFAQ_PDF = "bond-lab-prfaq.pdf";

const PAGE1 = String.raw`
<div class="pf-banner">Hypothetical concept &middot; Bond Lab Exchange Builder &middot; fictional exchange &middot; illustrative numbers</div>
<div class="pf-disc"><b>Disclaimer.</b> Lighthouse ABS Exchange and the people quoted are fictional. Real companies are named only as examples of each role; none is involved, affiliated or endorsing, and all deals, dates and figures are made up.</div>
<div class="pf-kicker">Press release &middot; for a future launch</div>
<h1 class="pf-h1">Lighthouse ABS Exchange opens a public marketplace for asset-backed securities (bonds backed by everyday loans)</h1>
<p class="pf-sub">For the first time, insurers, pension funds and smaller investors can see live prices for car-loan, credit-card and equipment-loan bonds before they trade, instead of phoning dealers one by one.</p>
<p><b>NEW YORK, June 1, 2027 (hypothetical date)</b> &mdash; Lighthouse ABS Exchange (the venue operator) today opened the first exchange built for asset-backed securities, ABS (bonds paid from a big pile of loans, such as thousands of car loans). Until now, nearly every ABS trade has happened over the counter, OTC (a private phone or chat negotiation with a dealer). Buyers cannot see prices before they trade. They ask a few broker-dealers (trading middlemen) for quotes and take the best one they hear. The trade is reported afterwards to TRACE, FINRA&rsquo;s bond trade reporting system (the after-the-fact receipt), but by then it is too late to help anyone get a better price.</p>
<p>The result: a wide bid-ask spread (the gap between the buying and selling price, the middleman&rsquo;s cut), smaller investors who often cannot get quotes at all, and sharp price drops when many holders must sell at once because nobody can see where the real buyers are.</p>
<p><b>What is new.</b> Lighthouse runs a hybrid market structure (a mix of ways to trade). Standard-size trades go through a central limit order book, CLOB (one shared board of bids and offers that everyone sees). Large trades can use request for quote, RFQ (asking several dealers at once for a price), or a periodic auction (trading at set times of day). Every trade is guaranteed by a central counterparty, CCP (the clearing house), so neither side has to worry about the other failing to pay. Each bond comes with monthly loan-level data (a line-by-line view of the loans inside), reported by the deal&rsquo;s servicer and checked by an independent pricing vendor (a role firms like ICE Data Services play today).</p>
<p><b>How it works.</b> (1) A member firm connects directly or through its broker-dealer. (2) It sees the best bids and offers, with order sizes partly hidden so big buyers are not exposed. (3) When orders match, the trade happens instantly. (4) The clearing house steps in between buyer and seller, and the bonds settle the next business day through DTC, part of DTCC (the central record-keeper), into accounts at a custodian bank such as BNY or State Street (the safe-keeper). (5) The price and size are published within 15 minutes for everyone to see.</p>
<p>Lighthouse launches with the most standardized bonds first: the top-rated slices of prime auto-loan and credit-card deals, such as bonds from trusts like Ally Auto Receivables Trust 2026-1 (the SPV). Launch market makers (always-there traders) post two-sided quotes all day in return for lower fees.</p>
<blockquote>&ldquo;Bonds backed by car loans and credit cards touch millions of households, yet their prices are hidden behind phone calls,&rdquo; said Maya Okafor, founder and chief executive of Lighthouse ABS Exchange (the venue operator). &ldquo;We are not trying to get rid of dealers. We are giving them, and everyone they serve, one place where the best price is visible.&rdquo;</blockquote>
<blockquote>&ldquo;Today, buying 20 million dollars of auto-loan bonds means four phone calls and a lot of trust,&rdquo; said Daniel Reyes (a fictional portfolio manager at a mid-size insurance company). &ldquo;With a visible order book and a clearing house behind every trade, we can check we paid a fair price and spend less time worrying about who is on the other side.&rdquo;</blockquote>
<p><b>Getting started.</b> Institutional investors can apply for membership directly or ask their broker-dealer to connect them. Trading fees are waived for the first six months (a hypothetical launch offer), and delayed prices are free for anyone to view.</p>
`;

const PAGE23 = String.raw`
<h2 class="pf-h2 pf-break">Customer FAQ <span>(questions investors will ask)</span></h2>
<h3>What exactly is an ABS?</h3>
<p>An asset-backed security, ABS (a bond backed by a pile of loans), is made by bundling thousands of similar loans, such as car loans, and selling bonds that are paid from the borrowers&rsquo; monthly payments. The bonds are split into tranches (floors of a building): the top floor is paid first and is safest; the bottom floors are paid last, take the first losses, and pay higher interest to make up for it.</p>
<h3>Why does this market need an exchange?</h3>
<p>Because prices are hard to find. In today&rsquo;s over-the-counter market (private negotiation with a dealer), you learn a price only by asking. That makes trading slow, leaves smaller investors out, and lets the middleman&rsquo;s cut stay wide. An exchange puts buyers and sellers in one place with visible prices, so competition does the work. Electronic platforms such as Tradeweb, MarketAxess and ICE Bonds already carry some bond trading, mostly by request for quote, but much ABS trading still happens by phone and chat.</p>
<h3>How is it different from today?</h3>
<table class="pf-tbl"><thead><tr><th></th><th>Today (over the counter)</th><th>Lighthouse ABS Exchange</th></tr></thead><tbody>
<tr><td>Finding a price</td><td>Phone or chat several dealers</td><td>See the best bid and offer on screen</td></tr>
<tr><td>Who you trade with</td><td>A dealer, using its own money</td><td>Anyone in the market, through the order book</td></tr>
<tr><td>If the other side fails</td><td>Your problem (bilateral risk)</td><td>The clearing house covers it</td></tr>
<tr><td>Prices made public</td><td>After the trade, via TRACE</td><td>Within 15 minutes, plus live quotes before the trade</td></tr>
<tr><td>Typical bid-ask spread (illustrative)</td><td>About 18 basis points</td><td>Target 11 to 13 basis points</td></tr>
</tbody></table>
<p class="pf-note">A basis point is one hundredth of one percent (a penny on a hundred dollars). Spread numbers come from the synthetic Bond Lab model and are hypothetical.</p>
<h3>Who can trade?</h3>
<p>At launch, institutional investors: insurers, pension funds, money managers, bank treasuries and hedge funds, plus broker-dealers and market makers. Smaller professional investors can trade through a member broker-dealer. The minimum trade size starts at 1 million dollars, which keeps the market focused on professionals while it grows.</p>
<h3>How are prices shown?</h3>
<p>Two ways. Pre-trade transparency (seeing quotes before you trade): the best bids and offers are always visible, but large orders show only part of their size so a big buyer does not tip off the whole market. Post-trade transparency (seeing trades after they happen): every trade&rsquo;s price and size are published within 15 minutes.</p>
<h3>What does it cost?</h3>
<p>Lighthouse uses a maker-taker fee model (pay to take, get paid to give). The firm that hits an existing quote pays a small fee, about 2 basis points (hypothetical); the firm that posted the quote earns a small rebate. Live data feeds are sold by subscription; delayed data is free. Fees are waived for the first six months.</p>
<h3>Is my money safe if the other side fails?</h3>
<p>Yes, that is the job of the central counterparty, CCP (the clearing house). After every trade, the clearing house becomes the buyer to every seller and the seller to every buyer. It collects margin (a safety deposit) from members every day, so if one firm fails, its deposit covers the loss instead of you.</p>
<h3>What happens if the lender that made the loans goes bust?</h3>
<p>The bonds keep paying. The loans were sold into a special purpose vehicle, SPV (a separate legal box that only holds the loans), with a name like Navient Student Loan Trust 2026-1 (the SPV), so the lender&rsquo;s creditors cannot touch them. A trustee (the independent referee), a role banks such as U.S. Bank, BNY and Wilmington Trust play, watches over the deal for bondholders, and a backup servicer can take over collecting payments if the original servicer (the bill collector) stops working.</p>
<h3>What data do I get?</h3>
<p>Every listed bond comes with standard deal documents and monthly loan-level data: how many borrowers are paying on time, how many are late, and how much has been lost. An independent pricing vendor checks the files and Lighthouse publishes an end-of-day price for every bond, so holders can value what they own even on days it does not trade.</p>
<h3>Will a big trade move the price against me?</h3>
<p>That risk is called information leakage (others learning your plans). To limit it, large trades can use a request for quote to a few chosen dealers, or a periodic auction where orders are collected and matched at one price. Order sizes on the board are partly hidden.</p>
<h3>What stops people from gaming the market?</h3>
<p>Market surveillance (security cameras for trading) looks for spoofing (fake orders placed to trick others) and other manipulation. Circuit breakers (an automatic pause button) halt trading briefly if prices move too far, too fast. Members who break the rules can be fined or removed.</p>
<h3>What does one trade look like, start to finish?</h3>
<div class="pf-box"><b>Example (hypothetical, no real trade).</b> A pension fund wants 5 million dollars of a top-rated auto-loan bond. On screen it sees a best offer of 100.20 (dollars per 100 of face value) for up to 3 million, and more behind it at 100.24. It sends a buy order through its broker-dealer. The order fills against a market maker and an insurer that was selling. The clearing house steps into the middle of both trades, collects margin, and the next business day the bonds move into the pension fund&rsquo;s account at its custodian bank while the cash moves the other way. Fifteen minutes after the trade, everyone can see the price and size. Its cost is the spread it crossed plus a fee of about 2 basis points; the fee alone is about 1,000 dollars on this trade (illustrative).</div>
<h3>When can I trade, and when do I get my bonds?</h3>
<p>The order book is open during normal bond-market hours, about 8 a.m. to 5 p.m. New York time. Auctions for large blocks run at set times, for example 11 a.m. and 3 p.m. Settlement (the moment bonds and cash actually swap) happens the next business day, called T+1.</p>
<h3>What if nobody is quoting a bond I own?</h3>
<p>You can still sell. Post an order and wait, send a request for quote to dealers, or enter the next auction. The daily end-of-day price tells you roughly what the bond is worth even when it has not traded.</p>
<h3>Who checks the ratings?</h3>
<p>Credit ratings come from independent rating agencies such as Moody&rsquo;s, S&amp;P Global Ratings, Fitch Ratings and KBRA (the credit graders). Lighthouse shows each bond&rsquo;s rating but does not set it. Because issuers pay for their own ratings (a known conflict of interest), the loan-level data is there so you can check the grade yourself.</p>
<h3>Is the exchange neutral?</h3>
<p>Lighthouse does not trade for itself. Its rulebook is public, every member gets the same data at the same time, and fees are published. Regulators review the rules before they change.</p>
<h3>Do I have to stop using my dealer?</h3>
<p>No. Dealers are members of the exchange, and many clients will still trade through them. The difference is that both you and your dealer can now see the best price in the market.</p>
`;

const PAGE45 = String.raw`
<h2 class="pf-h2 pf-break">Internal FAQ <span>(questions the founding team must answer)</span></h2>
<h3>Who are the players, and what does each one want?</h3>
<table class="pf-tbl pf-small"><thead><tr><th>Player (role)</th><th>Gets paid by</th><th>Wants</th><th>Worries about</th></tr></thead><tbody>
<tr><td>Lighthouse ABS Exchange (venue operator; fictional)</td><td>Trading fees, data, membership</td><td>Volume and a trusted brand</td><td>An empty order book</td></tr>
<tr><td>Market makers, e.g. Citadel Securities, Jane Street</td><td>Bid-ask spread plus rebates</td><td>Low fees, fast data</td><td>Trading against better-informed firms</td></tr>
<tr><td>Broker-dealers, e.g. J.P. Morgan, Goldman Sachs, Citi</td><td>Spreads, commissions, underwriting</td><td>Keep client relationships</td><td>Narrower spreads, less profit</td></tr>
<tr><td>Insurers, e.g. MetLife</td><td>Bond interest (it pays fees)</td><td>Fair prices, safe settlement</td><td>Big orders being exposed</td></tr>
<tr><td>Pension funds, e.g. CalPERS</td><td>Bond interest (it pays fees)</td><td>Low cost, proof of best execution</td><td>New, untested venues</td></tr>
<tr><td>Money managers and hedge funds, e.g. BlackRock, PIMCO</td><td>Trading profits</td><td>Transparency and speed</td><td>Position limits</td></tr>
<tr><td>Issuers, e.g. Ally Financial, Capital One, Navient</td><td>Cash from selling the deal</td><td>Cheaper funding</td><td>Extra data and listing costs</td></tr>
<tr><td>Clearing house, e.g. FICC (part of DTCC)</td><td>Clearing fees</td><td>Well-funded, careful members</td><td>A big member defaulting</td></tr>
<tr><td>Regulators: SEC and FINRA</td><td>Public budget</td><td>Fair, stable markets</td><td>Crashes and manipulation</td></tr>
</tbody></table>
<p class="pf-note">Names are examples of each type of firm. The incentives and worries describe the role in general, not the views or plans of any named company.</p>
<h3>How does the money flow?</h3>
<p>Investors pay trading fees to the exchange and the spread to whoever sells to them. The exchange passes part of its fees back as rebates to market makers, pays the clearing house and technology provider, and sells data subscriptions to everyone. Issuers pay listing fees and data costs. Custodians and the depository charge holders for safe-keeping and settlement. In the synthetic model, the default design earns the venue roughly 20 million dollars a year once volume reaches about 500 million dollars a day (illustrative only).</p>
<h3>How do we solve the cold start?</h3>
<p>Cold-start liquidity (an empty restaurant nobody wants to try) is the biggest risk: buyers will not come without sellers, and sellers will not come without buyers. Our plan, with a limited launch budget:</p>
<ul>
<li><b>Start narrow.</b> List only the most standardized bonds (top-rated prime auto and credit-card slices) so trading concentrates in a few names instead of spreading thin.</li>
<li><b>Anchor participants</b> (the first big customers): sign up three to five insurers and pension funds who commit to route part of their trading to Lighthouse.</li>
<li><b>Market-maker program</b> (paying the always-there traders): fee discounts for firms that quote both sides all day within a maximum spread.</li>
<li><b>Deal standardization</b> (same shape, easier to swap): work with issuers on common data templates.</li>
<li><b>Fee holiday</b>: no trading fees for six months.</li>
</ul>
<p>Goal: critical mass (enough activity that it keeps itself going), which the model defines as about 35 percent of target activity, by month nine. In the Bond Lab simulation, standardized products with anchors and a market-maker program get there in about three months; a niche product with no levers never does.</p>
<h3>Why will dealers resist, and how do we win them over?</h3>
<p>Dealers earn the spread, and a visible order book narrows it. In the model, switching from the balanced design to a fully transparent one cuts dealer profits by about two thirds, which is why a fully lit market is likely to fail politically even if it looks best on paper. So we give dealers reasons to join: size-masked quotes and block RFQs that protect their clients, a role as market makers with rebates, a share of data revenue for firms that contribute prices, and a seat on the product committee. The pitch to dealers is that volume grows enough to offset thinner margins.</p>
<h3>What about regulation?</h3>
<p>We plan to start as an alternative trading system, ATS (a licensed venue with lighter rules) registered with the SEC and run by a FINRA-member broker-dealer, and apply to become a full exchange once volume is proven. Regulators will want fair access, clear rules, trade reporting, surveillance, clearing for all trades and proof of best execution (showing customers got a good price). The model&rsquo;s approval odds rise from about 64 percent for the default design to about 90 percent once circuit breakers, surveillance, data audits and position limits are on.</p>
<h3>What can go wrong, and what protects us? <span class="pf-q">(hypothetical scenarios)</span></h3>
<table class="pf-tbl pf-small"><thead><tr><th>Scenario</th><th>What happens</th><th>Safeguard</th></tr></thead><tbody>
<tr><td>Fire sale (forced selling)</td><td>A fund must sell fast; prices fall</td><td>Auctions, circuit breakers</td></tr>
<tr><td>Flash crash (runaway algorithm)</td><td>Prices collapse in seconds</td><td>Circuit breakers, order limits</td></tr>
<tr><td>Bad data (servicer misreports)</td><td>Bonds are mispriced</td><td>Independent data audits</td></tr>
<tr><td>Manipulation (spoofing)</td><td>Fake orders trick buyers</td><td>Market surveillance</td></tr>
<tr><td>Member default (a big firm fails)</td><td>Unpaid trades</td><td>Clearing house and margin</td></tr>
<tr><td>Liquidity vanishes (market makers leave)</td><td>Spreads blow out</td><td>Market-maker obligations</td></tr>
</tbody></table>
<h3>How will we know it is working?</h3>
<ul>
<li>Average daily volume (hypothetical target: 500 million dollars by the end of year one).</li>
<li>Average bid-ask spread compared with over the counter (target: at least 4 basis points tighter).</li>
<li>Share of listed bonds that trade at least once a week.</li>
<li>Number of active members, and how many are not dealers.</li>
<li>Time quoted by market makers within the maximum spread.</li>
<li>Venue revenue versus costs, and incidents handled without a trading halt.</li>
</ul>
<h3>What could kill it?</h3>
<p>Dealers refusing to join and steering clients away. Anchor customers going quiet after the fee holiday. A crash or data scandal in year one that damages trust. Existing electronic platforms such as Tradeweb, MarketAxess or ICE adding similar features faster. And the plain risk that ABS are too varied (every deal a little different) to ever trade like stocks.</p>
<h3>Open questions</h3>
<ul>
<li>Should lower-rated and less standard bonds ever trade on the order book, or only by RFQ and auction?</li>
<li>When should smaller investors get direct access, and with what protections?</li>
<li>How fast can trade reports go public without hurting large trades?</li>
<li>Who owns the data: the exchange, the issuers, or the members who create the prices?</li>
<li>Should the exchange own its clearing house, or use an independent one?</li>
</ul>
<p class="pf-note">This PRFAQ is a teaching exercise from the Bond Lab Exchange Builder. Lighthouse ABS Exchange, its founder and the quoted customer are fictional. Real companies are named for realism only, as examples of who plays each role; none is involved in or endorses this concept, and no affiliation is implied. All deals, dates and numbers are hypothetical.</p>
`;

export const PRFAQ_BODY = PAGE1 + PAGE23 + PAGE45;

// Print / PDF stylesheet (light, document-like). Also used by the in-app print-friendly view.
export const PRFAQ_PRINT_CSS = String.raw`
@page { size: Letter; margin: 0.62in 0.7in 0.66in; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font: 10pt/1.42 -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #1b2330; background: #fff; }
.pf-wrap { max-width: 7.1in; margin: 0 auto; }
.pf-banner { font-size: 7.6pt; letter-spacing: .06em; text-transform: uppercase; color: #5a6578; border-bottom: 1px solid #d7dce4; padding-bottom: 6px; margin-bottom: 14px; }
.pf-kicker { font-size: 8pt; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #1f6feb; margin-bottom: 4px; }
.pf-h1 { font-size: 17.5pt; line-height: 1.18; margin: 0 0 6px; color: #0d1420; letter-spacing: -.01em; }
.pf-sub { font-size: 10.8pt; color: #3c4758; font-style: italic; margin: 0 0 10px; }
.pf-h2 { font-size: 14pt; margin: 0 0 6px; padding-bottom: 5px; border-bottom: 2px solid #1f6feb; color: #0d1420; }
.pf-h2 span { font-weight: 400; color: #5a6578; font-size: 10.5pt; }
.pf-break { break-before: page; page-break-before: always; }
h3 { font-size: 10.6pt; margin: 10px 0 2px; color: #0d1420; break-after: avoid; }
p { margin: 0 0 6px; }
ul { margin: 2px 0 6px; padding-left: 18px; } li { margin: 0 0 2px; }
blockquote { margin: 5px 0 6px; padding: 4px 10px; border-left: 3px solid #1f6feb; background: #f2f6fc; color: #233044; }
.pf-tbl { width: 100%; border-collapse: collapse; margin: 4px 0 6px; font-size: 9pt; break-inside: avoid; }
.pf-tbl th { text-align: left; background: #eef2f7; color: #354156; font-weight: 650; padding: 4px 6px; border-bottom: 1px solid #cdd4de; }
.pf-tbl td { padding: 3.5px 6px; border-bottom: 1px solid #e3e7ee; vertical-align: top; }
.pf-tbl td:first-child { font-weight: 600; color: #233044; }
.pf-small { font-size: 8.5pt; }
.pf-box { background: #f5f7fa; border: 1px solid #dfe4eb; border-radius: 6px; padding: 7px 10px; margin: 4px 0 6px; break-inside: avoid; }
.pf-note { font-size: 8.4pt; color: #5a6578; }
.pf-disc { font-size: 8pt; color: #4a5568; background: #fff8e6; border: 1px solid #f0d58c; border-radius: 5px; padding: 5px 8px; margin: -6px 0 10px; }
h3 .pf-q { font-weight: 400; color: #5a6578; font-size: 9pt; }
.pf-toolbar { position: sticky; top: 0; background: #0d1420; color: #fff; padding: 8px 14px; display: flex; gap: 10px; align-items: center; font-size: 13px; margin-bottom: 18px; }
.pf-toolbar button { font: inherit; padding: 5px 12px; border-radius: 6px; border: 0; background: #1f6feb; color: #fff; cursor: pointer; }
@media screen { body { background: #e9edf2; } .pf-wrap { background: #fff; padding: 0.6in 0.7in; margin: 0 auto 30px; box-shadow: 0 2px 14px rgba(0,0,0,.12); } }
@media print { .pf-toolbar { display: none; } .pf-wrap { padding: 0; box-shadow: none; } }
`;

/** A complete standalone HTML document (no external resources). */
export function prfaqDocument(withToolbar = false): string {
  const bar = withToolbar ? '<div class="pf-toolbar"><b>Print-friendly view</b><span style="opacity:.75">Lighthouse ABS Exchange PRFAQ (hypothetical)</span><span style="flex:1"></span><button onclick="window.print()">Print or save as PDF</button></div>' : "";
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + PRFAQ_TITLE + "</title><style>" + PRFAQ_PRINT_CSS + "</style></head><body>" + bar + '<div class="pf-wrap">' + PRFAQ_BODY + "</div></body></html>";
}
