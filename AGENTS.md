# AGENTS.md — Nimble Outdoors

This is a single-page Jekyll 4 site for nimblehunting.com — a product landing page for hunting climbing sticks.

## Dev commands

```sh
# Serve locally with live reload
bundle exec jekyll serve --livereload

# Build
bundle exec jekyll build

# JS tests (Vitest) — always run before committing any JS changes
npm test

# Watch mode for TDD
npm run test:watch
```

Ruby 3.2.2 is expected (managed via `mise.toml`). Run `bundle install` first.

## E2E tests (Playwright)

Browser-level tests live in `e2e/`. Always run before deploying checkout changes.

```sh
# Run all e2e tests (auto-starts Jekyll on port 4000)
npm run test:e2e

# UI mode for debugging
npm run test:e2e:ui
```

Pages tests check basic rendering with no external deps. Checkout tests use Stripe test mode against the deployed Worker — they require the Worker to be accessible at `https://nimble-stripe.joey-956.workers.dev`.

Stripe card fields are inside a Stripe iframe. The helper `fillCard()` handles frame switching. 3DS challenge tests use `handle3DSChallenge()` to complete or fail the challenge iframe.

## Deploy

Push to `main` → GitHub Actions builds with `bundle exec jekyll build` and deploys to GitHub Pages. No manual deploy steps.

## Site structure

- `index.html` — the landing page (layout: `default`, hero + features + email signup CTA)
- `404.html` — custom 404
- `shop.html` — product page with pack selector, links to checkout
- `checkout.html` — checkout page (pack chosen via `?pack=N` query param)

- `_layouts/default.html` — no nav header, just footer
- `_layouts/landing.html` — with nav header
- `_includes/header.html` — brand logo only
- `_includes/footer.html` — contact, "made in USA"
- `assets/css/style.css` — single stylesheet (dark theme, forest-green/black brand)

## External services on the landing page

- **Formspree** — signup form submits to `https://formspree.io/f/mykdrwlr`
- **Google reCAPTCHA v2** — site key `6Lfr-agpAAAAAAfwGOtDvgX6cI0woP5J9VPMui7C`, hidden via `.grecaptcha-badge { display: none !important }`
- **Stripe** — payment processing on the preorder forms (checkout.html)
- **Cloudflare Worker** — `worker/` directory contains a Worker that creates Stripe PaymentIntents and serves confirmation pages. Deployed separately via `npx wrangler deploy`.

## Stripe preorder form

The checkout pages use Stripe PaymentElement (embedded UI, not Checkout's hosted page). The flow:

1. Page loads → calls `POST /api/create-payment-intent` on the Worker
2. Worker creates a Stripe PaymentIntent and returns `client_secret`
3. Frontend mounts `stripe.elements()` with a PaymentElement
4. User submits → `stripe.confirmPayment()` either resolves inline or redirects back to the checkout page
5. On redirect back, the page reads `redirect_status` and calls `stripe.retrievePaymentIntent()` to show success or error

### Setup steps

1. Get Stripe publishable key (`pk_live_...`) and secret key (`sk_live_...`) from the Stripe dashboard
2. Replace `YOUR_STRIPE_PUBLISHABLE_KEY` in `checkout.html`
3. Replace `YOUR_USERNAME` with your Cloudflare Workers subdomain in `worker/wrangler.toml`
4. Set the Worker secret: `cd worker && npx wrangler secret put STRIPE_SECRET_KEY`
5. Deploy: `cd worker && npx wrangler deploy`
6. For settings: in the Stripe dashboard, configure the `return_url` under Settings → Payment Methods if needed

## Stripe test cards (test mode)

Use any future expiry and any 3-digit CVC with the `pk_test_*` key.

| Card | Scenario |
|---|---|
| `4242424242424242` | Success (no 3DS) |
| `4000002500003155` | 3D Secure required — authenticate → succeeds |
| `4000000000003220` | 3D Secure required — fail auth → error shown above card field |
| `4000000000000002` | Card declined (generic) |
| `4000000000009995` | Card declined (insufficient funds) |

The 3DS failure card (`...3220`) redirects back to the checkout page. Error appears in the `#paymentError` div above the card element.

## Notable

- JS tests live in `tests/` and use Vitest with jsdom for DOM tests. Always write tests first (TDD) when working with any JavaScript logic, including inline scripts in HTML files.
- The `default` layout intentionally has no header (comment: `Header removed`)
- No blog posts, collections, or data files — pure static brochure site
