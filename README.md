# AI Studio

An AI SaaS starter built with Next.js 16. Users sign up, get free coins, and spend them on image gen, video gen, shorts gen and code gen. Coin packs are sold through Razorpay. It installs as a PWA and has light and dark themes.

Every AI feature runs on a free tier or in demo mode, so the whole app works with zero API keys.

## Quick start

```bash
npm install
npm run setup   # creates .env.local with a random secret, and the database
npm run dev     # http://localhost:3000
```

Sign up and you get 100 coins. You can claim 20 more each day from the dashboard.

## Features

| Feature | How it works | Cost |
|---|---|---|
| Image gen | Cloudflare Workers AI, FLUX.1 schnell (free daily allowance). Demo images without keys. | 5 coins per image |
| Video gen | Background job with polling. Simulated renderer (no free video API exists). | 100 coins per 5 s |
| Shorts gen | Gemini writes the hook, scenes, CTA and hashtags; video render is simulated. | 300 coins |
| Code gen | Gemini streams code; HTML answers get a sandboxed live preview. | 1 coin per message |
| Library | All creations, filters, download, delete. | |
| Share | Public link per creation (`/s/<id>`), native share sheet on phones, off by default. | |
| Billing | Coin packs via Razorpay checkout, webhook, transaction history. | |
| Free tier | 100 signup coins, 20 daily coins, 10 generations per minute rate limit. | |
| PWA | Manifest, generated icons, service worker with offline page, install button. | |

## Switching features from demo to live

Add keys to `.env.local` and restart. Settings in the app shows which providers are live.

| Key | Where to get it | Unlocks |
|---|---|---|
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey | Real code gen and shorts scripts |
| `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard, token with Workers AI permission | Real image gen |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay dashboard, Test Mode | Real checkout (test cards and UPI) |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhooks: `https://<domain>/api/billing/webhook`, events `payment.captured` and `order.paid` | Server-side payment confirmation |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Cloud console | "Continue with Google" |

Without Razorpay keys, a demo checkout credits coins in development. It is disabled in production builds unless `ALLOW_MOCK_PAYMENTS=true`.

## How coins work

The `coin_transaction` table is an append-only ledger; the balance is the sum of its rows. Each row has a unique `ref_id` (payment id, `spend:<job>`, `refund:<job>`, `daily:<user>:<date>`), so a retried webhook or a double click can never credit or charge twice.

A generation debits its coins before the provider is called. If the provider fails, the job is marked failed and a refund row is added. Video and shorts jobs finish when the client polls (`GET /api/generations/:id`), which works on serverless hosts with no worker process.

Prices and packs live in [src/lib/pricing.ts](src/lib/pricing.ts).

## Project layout

```text
src/
  app/
    api/            auth, generate/*, generations/[id], files/[id], coins, billing/*
    dashboard/      home, image, video, shorts, code, library, billing, settings
    s/[id]/         public share page
    manifest.ts     PWA manifest; icons are drawn by app/icons/[size]
  components/       app shell, cards, auth, PWA install, UI primitives
  db/               Drizzle schema and client (SQLite or Turso)
  lib/              auth, coins ledger, payments, AI providers, storage, rate limit
  proxy.ts          redirects signed-out users away from /dashboard
public/sw.js        service worker
scripts/setup.mjs   one-command setup
```

## Deploying

1. Create a free Turso database and set `DATABASE_URL` and `DATABASE_AUTH_TOKEN`, then run `npm run db:push`.
2. Generated images are saved to `data/files` on local disk. On Vercel or another serverless host, replace the two functions in [src/lib/storage.ts](src/lib/storage.ts) with Cloudflare R2 or S3.
3. The rate limiter is in memory; use Redis (for example Upstash) when running more than one instance.
4. Set `BETTER_AUTH_URL` to your public URL. PWA install needs HTTPS.

## Scripts

| Command | What it does |
|---|---|
| `npm run setup` | Create `.env.local` and database tables |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run db:push` | Apply schema changes to the database |
| `npm run db:studio` | Browse the database |
| `npm run lint` / `npm run typecheck` | Checks |
