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

## Deploy

Push to `main` → GitHub Actions builds with `bundle exec jekyll build` and deploys to GitHub Pages. No manual deploy steps.

## Site structure

- `index.html` — the landing page (layout: `default`, hero + features + email signup CTA)
- `404.html` — custom 404
- `shop.html` — product page with pack selector, links to checkout
- `checkout.html` — checkout page (pack chosen via `?pack=N` query param)
- `checkout-b.html` — checkout page with inline pack selector
- `_layouts/default.html` — no nav header, just footer
- `_layouts/landing.html` — with nav header
- `_includes/header.html` — brand logo only
- `_includes/footer.html` — contact, "made in USA"
- `assets/css/style.css` — single stylesheet (dark theme, forest-green/black brand)

## External services on the landing page

- **Formspree** — signup form submits to `https://formspree.io/f/mykdrwlr`
- **Google reCAPTCHA v2** — site key `6Lfr-agpAAAAAAfwGOtDvgX6cI0woP5J9VPMui7C`, hidden via `.grecaptcha-badge { display: none !important }`
- **Stripe** — payment processing on the preorder forms (checkout.html, checkout-b.html)
- **Cloudflare Worker** — `worker/` directory contains a Worker that creates Stripe PaymentIntents and serves confirmation pages. Deployed separately via `npx wrangler deploy`.

## Stripe preorder form

The checkout pages use Stripe PaymentElement (embedded UI, not Checkout's hosted page). The flow:

1. Page loads → calls `POST /api/create-payment-intent` on the Worker
2. Worker creates a Stripe PaymentIntent and returns `client_secret`
3. Frontend mounts `stripe.elements()` with a PaymentElement
4. User submits → `stripe.confirmPayment()` redirects to the Worker's `/confirm` endpoint
5. Worker renders a success/failure HTML page with matching dark theme

### Setup steps

1. Get Stripe publishable key (`pk_live_...`) and secret key (`sk_live_...`) from the Stripe dashboard
2. Replace `YOUR_STRIPE_PUBLISHABLE_KEY` in `checkout.html` and `checkout-b.html`
3. Replace `YOUR_USERNAME` with your Cloudflare Workers subdomain in both checkout files and `worker/wrangler.toml`
4. Set the Worker secret: `cd worker && npx wrangler secret put STRIPE_SECRET_KEY`
5. Deploy: `cd worker && npx wrangler deploy`
6. For settings: in the Stripe dashboard, configure the `return_url` under Settings → Payment Methods if needed

## Notable

- JS tests live in `tests/` and use Vitest with jsdom for DOM tests. Always write tests first (TDD) when working with any JavaScript logic, including inline scripts in HTML files.
- The `default` layout intentionally has no header (comment: `Header removed`)
- No blog posts, collections, or data files — pure static brochure site
