# Bond Lab

An interactive, beginner-friendly simulator for building and trading **mock asset-backed securities** (ABS). Everything is plain English first, with the pro jargon second and tap-to-explain tooltips.

**Live:** https://jclekkas.github.io/bond-lab/

> Real company names (lenders, servicers, trustees, rating agencies, banks, investors, market infrastructure) are used for realism only, to show who plays each role. Every deal, price, rating, event and figure is made up (synthetic, generated deterministically in code), and no affiliation with or endorsement by any company is implied. Stress events such as a lender going bust are hypothetical what-ifs, not news. This is a learning tool, not financial advice or a real trading platform.

## What you do

1. **Select the collateral pool (pick your basket)**: auto ABS (car loans), MBS (home mortgages), credit card ABS, student loan ABS, equipment ABS, royalty ABS (song royalties) or CLOs (business loans). Each has its own behaviour, history and fun facts.
2. **Market participants (meet the players)**: originator, special purpose vehicle (SPV), servicer, trustee, underwriter, rating agencies, investors and market maker, on a clickable money-flow diagram.
3. **Build the collateral pool (fill the basket)**: loan count, credit score, rate and term, with synthetic stats and a score histogram.
4. **Structure the tranches (build the floors)**: senior / mezzanine / junior tranches, overcollateralization, reserve account and excess spread on a draggable capital stack with stress lines.
5. **Get rated (get graded)**: rule-based mock ratings from how many times expected losses each tranche's credit enhancement survives.
6. **Price and place the bonds (sell the floors)**: set spreads and watch a live investor order book fill, with oversubscription gauges.
7. **Secondary trading (the trading floor)**: $10M of mock cash, a quotes board with price flashes, candle/line chart with crosshair, order ticket (buy/sell, $1M/$2M/$5M, market or limit), level-2 depth, positions with unrealized and realized P&L, monthly news shocks, coupons and a trade blotter.
8. **Stress test (storm test)**: recessions, refinance waves or a 2008-style crash with an animated month-by-month waterfall (play, pause, step, speed, scrub).

XP, levels, badges, a quick check in every step and a searchable dictionary keep it fun.

## The interface

A dark trading-terminal layout (light mode too): top bar with the deal, asset class, cash, P&L, XP and clock; a stage rail with progress and locks; the workspace; a collapsible coach and dictionary panel; and a bottom news tape with blotter, working orders and news wire. First visit shows a short plain-English tour; replay it anytime with the **Replay tour** button in the top bar (the ▶ Tour tab on phones), the `G` key, or the `?` help overlay, which can also jump to any tour step. On phones the panels become tabs.

Keyboard: `?` help, `Esc` close, `[` `]` previous/next step, `1`–`8` jump, `T` theme, `C` coach panel, `D` dictionary, `G` replay the tour, `X` switch between Deal Lab and Exchange Builder (where `1`–`8` jump); on the trading floor `B` buy, `S` sell, `N` next month, `P` auto-advance; in the stress test `P` play/pause, `N` step.

### Who owns what

Step 2 (Market participants: follow the money) has an ownership tracker: a six-step timeline (borrower signs the loan, the lender owns it, true sale, the SPV owns the loans, investors own the bonds, bonds trade later) with live "Current owner of the loans" and "Current owner of the bonds" cards, tags on the map (owns the loans, owns the bonds, handles cash but never owns, gets paid a fee) and a legend.

## Exchange Builder: design a new ABS exchange

A second module, opened with the **Deal Lab / Exchange Builder** switch in the top bar (or the `X` key). It walks through what a new marketplace for asset-backed securities would need, in eight steps:

1. **OTC vs. exchange**: an animated side-by-side trade path (phone a dealer vs. a visible order book), with costs by trade size and how TRACE-style trade reporting fits in.
2. **Marketplace map**: every role (venue operator, market makers, broker-dealers, investors, issuer, clearing house, custodian, depository, data vendor, rating agency, trustee and servicer, regulators, technology, and a risk analytics and credit data provider, "the portfolio report card") with what each one does, needs, gets paid and wants, plus an animated "who pays whom" money-flow view with data and score flows. The risk-score provider is a hypothetical combined role; FICO, VantageScore, the credit bureaus, dv01 and Intex are named only as examples of pieces of it today. A mock-labelled design switch, "Standard refreshed risk score published", shows its effect in step 3.
3. **Market design**: set the market structure, fees, minimum size, transparency, reporting delay, market-maker rules, clearing, data disclosure, listing standards and access, and watch liquidity, spreads, price discovery, venue revenue, dealer profits, investor cost, systemic risk and regulator approval move.
4. **Incentives**: who wins, who loses, where the trading money goes, and who will resist.
5. **Cold start**: pick a first product and spend a limited budget on launch levers to reach critical mass.
6. **Risks and safeguards**: stress the design with fire-sale, flash-crash, bad-data, manipulation, member-default and vanishing-liquidity scenarios.
7. **Pitch scorecard**: grades for liquidity, fairness, safety, profitability and adoption, with feedback and badges (Market Architect, Cold Start Solver and others).
8. **PRFAQ** (press release + FAQ): a 5-page plain-English write-up of a hypothetical exchange, Lighthouse ABS Exchange: a future press release, a customer FAQ and an internal FAQ. Read it in the app (works offline), open a print-friendly view, or download `bond-lab-prfaq.pdf`.

It has its own coach, quizzes, dictionary entries and replayable tour (from the `?` overlay, `G`, or the Replay tour button while in Exchange Builder). The model is synthetic and simplified, for learning only. The exchange (Lighthouse ABS Exchange) is fictional; real firms are named only as examples of each role.

## Run locally

```bash
npm install
npm run dev      # local dev server
npm run build    # outputs a single self-contained dist/index.html (works offline, even from file://)
```

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds with Vite and publishes `dist/` to GitHub Pages
(Settings → Pages → Source: **GitHub Actions**).

## Code layout

- `src/term/Terminal.tsx`: the trading-terminal app (state, market model, order handling, screens, shell).
- `src/term/engine.tsx`: data, asset classes, players, ratings, quizzes and the cash-flow waterfall engine.
- `src/term/exchange.tsx`: the Exchange Builder module (roles, money flows, market-design model, cold start, risk scenarios, scorecard).
- `src/term/prfaq.ts`: the PRFAQ text and print stylesheet; `node make-prfaq.mjs` re-renders `public/bond-lab-prfaq.pdf` from it (needs local Chrome).
- `src/term/ui.tsx`, `src/term/charts.tsx`: UI pieces and SVG charts (price chart, capital stack, gauges, balance chart, flow diagram).
- `src/term/styles.css`: theme tokens and layout (system fonts only; injected at runtime so the build stays one file).
- `src/App.tsx` + `src/grok-canvas.tsx`: the original page version, kept as a reference mirror (type-checked, not rendered).
- `inline.mjs`: post-build step that inlines the JS bundle into `index.html`.
- `smoke.mjs`: optional headless Chrome smoke test covering all 7 asset types, trading, the stress test, themes, the tour, mobile and file:// (`node smoke.mjs`, needs a local Chrome and `puppeteer-core`).
- `smoke-exchange.mjs`: the same kind of test for Exchange Builder on desktop and mobile (`node smoke-exchange.mjs`).
