# Bond Lab

An interactive, beginner-friendly simulator for building and trading **mock asset-backed securities** (ABS). Everything is plain English first, with the pro jargon second and tap-to-explain tooltips.

**Live:** https://jclekkas.github.io/bond-lab/

> All companies, prices and data are made up (synthetic, generated deterministically in code). This is a learning tool, not financial advice or a real trading platform.

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

A dark trading-terminal layout (light mode too): top bar with the deal, asset class, cash, P&L, XP and clock; a stage rail with progress and locks; the workspace; a collapsible coach and dictionary panel; and a bottom news tape with blotter, working orders and news wire. First visit shows a short plain-English tour. On phones the panels become tabs.

Keyboard: `?` help, `Esc` close, `[` `]` previous/next step, `1`–`8` jump, `T` theme, `C` coach panel, `D` dictionary; on the trading floor `B` buy, `S` sell, `N` next month, `P` auto-advance; in the stress test `P` play/pause, `N` step.

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
- `src/term/ui.tsx`, `src/term/charts.tsx`: UI pieces and SVG charts (price chart, capital stack, gauges, balance chart, flow diagram).
- `src/term/styles.css`: theme tokens and layout (system fonts only; injected at runtime so the build stays one file).
- `src/App.tsx` + `src/grok-canvas.tsx`: the original page version, kept as a reference mirror (type-checked, not rendered).
- `inline.mjs`: post-build step that inlines the JS bundle into `index.html`.
- `smoke.mjs`: optional headless Chrome smoke test covering all 7 asset types, trading, the stress test, themes, the tour, mobile and file:// (`node smoke.mjs`, needs a local Chrome and `puppeteer-core`).
