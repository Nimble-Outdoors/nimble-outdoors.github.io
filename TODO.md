1. Create a Stripe account and get API keys
2. Replace `YOUR_STRIPE_PUBLISHABLE_KEY` in `checkout.html` and `checkout-b.html`
3. Replace `YOUR_USERNAME` in `checkout.html` and `checkout-b.html` with your Cloudflare Workers subdomain
4. Set the Worker secret: `cd worker && npx wrangler secret put STRIPE_SECRET_KEY`
5. Deploy the Worker: `cd worker && npx wrangler deploy`
6. Push to `main`
