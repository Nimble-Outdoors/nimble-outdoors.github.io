1. Login to helcim account
2. Create a Helcim.js Configuration in the dashboard, copy the token
3. Replace `YOUR_HELCIM_JS_TOKEN` in `index.html` with the token
4. Replace `YOUR_USERNAME` in `index.html` with your Cloudflare Workers subdomain
5. Run `cd worker && npx wrangler deploy`
6. Push to `main`
