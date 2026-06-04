# AGENTS.md — Nimble Outdoors

This is a single-page Jekyll 4 site for nimbleoutdoorsllc.com — a product landing page for hunting climbing sticks.

## Dev commands

```sh
# Serve locally with live reload
bundle exec jekyll serve --livereload

# Build
bundle exec jekyll build
```

Ruby 3.2.2 is expected (managed via `mise.toml`). Run `bundle install` first.

## Deploy

Push to `main` → GitHub Actions builds with `bundle exec jekyll build` and deploys to GitHub Pages. No manual deploy steps.

## Site structure

- `index.html` — the landing page (layout: `default`, hero + features + email signup CTA)
- `404.html` — custom 404
- `_layouts/default.html` — no nav header, just footer
- `_layouts/landing.html` — with nav header
- `_includes/header.html` — brand logo only
- `_includes/footer.html` — contact, "made in USA"
- `assets/css/style.css` — single stylesheet (dark theme, forest-green/black brand)

## External services on the landing page

- **Formspree** — signup form submits to `https://formspree.io/f/mykdrwlr`
- **Google reCAPTCHA v2** — site key `6Lfr-agpAAAAAAfwGOtDvgX6cI0woP5J9VPMui7C`, hidden via `.grecaptcha-badge { display: none !important }`
- **Helcim.js** — payment processing on the preorder form (script from `https://secure.myhelcim.com/js/version2.js`)
- **Cloudflare Worker** — `worker/` directory contains a Worker that handles the Helcim.js POST response. Deployed separately via `npx wrangler deploy`.

## Helcim.js preorder form

The preorder section in `index.html` embeds a Helcim.js payment form (custom HTML/CSS, no iFrame). Card data flows browser → Helcim via CORS. The `token` hidden field value must be replaced with a real Helcim.js Configuration token from the Helcim dashboard.

The form's `action` is the Worker's `*.workers.dev` URL — update `YOUR_USERNAME` after deploying. For local testing, point it to the same URL (the Worker is already deployed to Cloudflare's edge).

The Worker (`worker/src/index.js`) receives the POST response, checks for success/failure, and returns an HTML confirmation page with matching dark theme.

## Notable

- No tests, no linter, no typechecker — just Jekyll build as validation
- The `default` layout intentionally has no header (comment: `Header removed`)
- No blog posts, collections, or data files — pure static brochure site
