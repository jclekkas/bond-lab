# Bond Lab

An interactive, beginner-friendly simulator for building and trading **mock asset-backed securities** (ABS). Everything is plain English first, with the pro jargon second and tap-to-explain tooltips.

**Live:** https://jclekkas.github.io/bond-lab/

> All companies, prices and data are made up (synthetic, generated deterministically in code). This is a learning tool, not financial advice or a real trading platform.

## What you do

1. **Pick your basket**: car loans, home mortgages (MBS), credit cards, student loans, equipment leases, song royalties ("Bowie bonds") or business loans (CLOs). Each has its own behaviour, history and fun facts.
2. **Meet the players**: lender, lockbox trust, payment collector (servicer), referee (trustee), dealer, grading agencies, investors, market maker.
3. **Fill the basket**: number of loans, credit score, rate and length, with synthetic stats.
4. **Build the floors (tranches)**: top / middle / bottom floors, extra padding, rainy-day fund and leftover interest, drawn as a building with flood lines.
5. **Get graded**: rule-based mock ratings from how many times expected losses each floor's cushion survives.
6. **Sell the floors**: set the extra pay (spread) and watch four mock investors place orders.
7. **Trading floor**: $10M of mock cash, dealer buy/sell quotes, monthly news shocks, P&L and a trade log.
8. **Storm test**: run recessions, refinance waves or a 2008-style crash month by month and see who gets paid.

XP, levels, badges and a quiz in every step keep it fun.

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

- `src/App.tsx`: the whole simulator (data, cash-flow engine, UI).
- `src/grok-canvas.tsx`: small local UI kit (page, sections, tables, charts, diagram, controls, theme with light/dark).
- `inline.mjs`: post-build step that inlines the JS bundle into `index.html`.
- `smoke.mjs`: optional headless Chrome smoke test (`node smoke.mjs`, needs a local Chrome and `puppeteer-core`).
