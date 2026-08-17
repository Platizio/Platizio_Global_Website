# Deployment — Vercel environment variables

The homepage's market sections are served by `/api/quotes`, a Vercel serverless
function. It reads three environment variables. **Without them the endpoint
returns 503 and both market sections silently remove themselves** — see
[Failure mode](#failure-mode), which is the part worth reading twice.

## The three variables

| Variable | Purpose | Example shape |
|----------|---------|---------------|
| `VIEWTRADE_BASE_URL` | `uma` service host. Auth *and* quotes both live here, so one URL covers everything. | `https://user-auth-gateway-staging.viewtrade.in` |
| `VIEWTRADE_API_KEY` | `api_key` in the B2B login body | 19-character string |
| `VIEWTRADE_API_SECRET` | `api_secret` in the B2B login body | 15-character string |

Read by [`api/_lib/viewtrade.ts`](../../api/_lib/viewtrade.ts).

### Where the values come from

`C:\Users\pc\Desktop\Global_API\credentials\client-url-config.json` →
`urls.uma.value`, `apiKey`, `apiSecret`.

That folder is **outside the repository and must stay there.** `.gitignore`
carries defensive patterns so an accidental copy cannot be committed.

## ⚠️ Never prefix these with `VITE_`

Vite inlines any `VITE_`-prefixed variable into the **client bundle**, where it
is readable by anyone who opens devtools. A `VITE_VIEWTRADE_API_SECRET` would
publish the broker credential to every visitor.

These three are read through `process.env` inside the serverless function only.
Verified: no `VITE_`-prefixed credential exists anywhere, and the built client
JS contains none of these names.

## Setting them

Vercel Dashboard → **Project → Settings → Environment Variables**. Add each as a
**Secret / Sensitive** value, not Plain Text.

Tick the environments deliberately:

| Environment | Set? | Notes |
|-------------|------|-------|
| **Production** | Yes | Needs **production** ViewTrade credentials — see below |
| **Preview** | Yes | UAT credentials are appropriate here |
| **Development** | Optional | Only for `vercel dev`; `npm run dev` reads `.env.local` instead |

**Environment variables are read at build and at cold start, so changing one
requires a redeploy.** Editing a value in the dashboard does not affect the
running deployment until you redeploy.

## 🚩 Production credentials do not exist yet

Everything in `Global_API` is **UAT/staging**. There are no production
ViewTrade credentials, so the production deployment cannot serve live data
until they are issued.

UAT prices are also synthetic (MU at $1001 in testing) — fine for proving the
plumbing, useless for judging whether numbers look right.

Two options until production keys arrive:

1. **Leave Production unset.** The market sections remove themselves cleanly and
   the rest of the homepage is unaffected. Nothing looks broken.
2. **Point Production at UAT.** Live-looking but wrong prices on a regulated
   broker's homepage. **Not recommended** — the delayed-price notice does not
   cover "these figures are from a test environment".

Option 1 is the safe default.

## Failure mode

This is the one that catches people, because **nothing looks wrong**.

When the variables are missing, `/api/quotes` returns 503, `useMarketData`
flags failure, and the trending band and popular grid unmount. The page renders
hero → why → how → fees → regulations → footer and reads as a deliberate
design. There is no error, no empty state, no console warning beyond a network
503.

That behaviour is intentional — a market data outage must never produce a
visibly broken homepage — but it means **a misconfigured deploy looks identical
to a working one** unless you check for the sections.

## Verifying a deployment

```bash
curl -s https://<deployment-url>/api/quotes | head -c 400
```

- **200** with `trending` and `popular` arrays of 8 → working.
- **503** `{"error":"Market data unavailable"}` → variables missing, wrong, or
  ViewTrade unreachable. Check the function logs in Vercel; the handler logs the
  reason (`Missing environment variables: …` or `Auth failed with status …`)
  without ever logging the credential itself.

In the browser, confirm the trending band appears under the hero and the
popular grid shows eight cards with prices.

## Local development

`npm run dev` serves the function through a Vite middleware
([`vite.config.ts`](../../vite.config.ts)) and reads `.env.local`, which is
gitignored. Format:

```
VIEWTRADE_BASE_URL=<uma host>
VIEWTRADE_API_KEY=<api key>
VIEWTRADE_API_SECRET=<api secret>
```

`npm run preview` serves the prerendered `dist/` **without** the function, so
`/api/quotes` 404s there by design. That makes it a convenient way to exercise
the failure path.

## Security checklist

- [ ] Values entered as Sensitive, not Plain Text
- [ ] No `VITE_` prefix on any of the three
- [ ] `Global_API/` never copied into the repo
- [ ] `.env.local` untracked (`git check-ignore .env.local`)
- [ ] The three exposed UAT credentials rotated with ViewTrade
- [ ] Production credentials requested
