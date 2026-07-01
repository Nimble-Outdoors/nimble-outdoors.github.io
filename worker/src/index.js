// Worker handles Stripe PaymentIntent creation and confirmation pages.
// Requires STRIPE_SECRET_KEY environment variable set via:
//   npx wrangler secret put STRIPE_SECRET_KEY

const STRIPE_API = 'https://api.stripe.com/v1';

async function stripeApi(path, secretKey = globalThis.STRIPE_SECRET_KEY, options = {}) {
  const resp = await fetch(STRIPE_API + path, {
    ...options,
    headers: {
      'Authorization': 'Bearer ' + secretKey,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...options.headers,
    },
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error?.message || 'Stripe API error');
  }
  return data;
}

function confirmationPage(success, data) {
  var style = `
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:system-ui,sans-serif;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:20px}
    .card{background:#222;padding:3rem;border-radius:8px;max-width:500px;border:5px solid ${success ? '#1F3D1B' : '#8B0000'}}
    h1{font-family:Oswald,sans-serif;text-transform:uppercase;font-weight:500;letter-spacing:1px;margin:1rem 0}
    .check{font-size:3rem}
    p{margin-bottom:0.5rem;color:#ccc}
    a{color:#fff;text-decoration:none;display:inline-block;margin-top:1.5rem;padding:12px 28px;border-radius:4px;background:#1F3D1B;font-family:Oswald,sans-serif;text-transform:uppercase;letter-spacing:1px}
    a:hover{background:#1E3D1A}
  `;

  if (success) {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Payment Confirmed — Nimble Outdoors</title><style>${style}</style></head>
<body>
  <div class="card">
    <div class="check">&#10003;</div>
    <h1>Payment Confirmed</h1>
    <p>Your preorder has been placed. You'll receive a confirmation email shortly.</p>
    <p>Transaction: ${data.id}</p>
    <p>Amount: $${(data.amount / 100).toFixed(2)}</p>
    <a href="/">Return to Nimble Outdoors</a>
  </div>
</body>
</html>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Payment Failed — Nimble Outdoors</title><style>${style}</style></head>
<body>
  <div class="card">
    <h1>Payment Failed</h1>
    <p>${data.last_payment_error?.message || 'Your payment could not be processed.'}</p>
    <p>Please try again or contact us at joey@nimbleoutdoorsllc.com.</p>
    <a href="/">Return to Nimble Outdoors</a>
  </div>
</body>
</html>`;
}

export default {
  async fetch(request, env = {}) {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // List active prices from Stripe catalog
    if (request.method === 'GET' && url.pathname === '/api/prices') {
      try {
        const secret = env.STRIPE_SECRET_KEY || globalThis.STRIPE_SECRET_KEY;
        const data = await stripeApi('/prices?active=true&expand[]=data.product&limit=10', secret);

        const packs = data.data
          .filter(p => p.product?.active !== false)
          .map(p => ({
            name: p.product.name,
            sku: p.product.metadata?.sku || '',
            price: (p.unit_amount || 0) / 100,
            stripePriceId: p.id,
          }))
          .sort((a, b) => a.price - b.price);

        return new Response(JSON.stringify(packs), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // One-shot: fetch prices + create PaymentIntent for the selected pack
    if (request.method === 'POST' && url.pathname === '/api/init-checkout') {
      try {
        const { packIndex, email } = await request.json();
        const secret = env.STRIPE_SECRET_KEY || globalThis.STRIPE_SECRET_KEY;

        const data = await stripeApi('/prices?active=true&expand[]=data.product&limit=10', secret);
        const packs = data.data
          .filter(p => p.product?.active !== false)
          .map(p => ({
            name: p.product.name,
            sku: p.product.metadata?.sku || '',
            price: (p.unit_amount || 0) / 100,
            stripePriceId: p.id,
          }))
          .sort((a, b) => a.price - b.price);

        const idx = (typeof packIndex === 'number' && packIndex >= 1 && packIndex <= packs.length) ? packIndex - 1 : 1;
        const pack = packs[idx];
        if (!pack) {
          return new Response(JSON.stringify({ error: 'Invalid pack selection' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const stripePrice = await stripeApi('/prices/' + pack.stripePriceId, secret);
        const cents = stripePrice.unit_amount;
        const description = 'Nimble Climbing Sticks — ' + pack.name;

        const body = new URLSearchParams({
          amount: String(cents),
          currency: 'usd',
          description: description,
          'payment_method_types[]': 'card',
        });
        if (email) body.set('receipt_email', email);

        const pi = await stripeApi('/payment_intents', secret, {
          method: 'POST',
          body: body.toString(),
        });

        return new Response(JSON.stringify({ packs, clientSecret: pi.client_secret }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Confirmation page (return_url target from Stripe redirect)
    if (url.pathname === '/confirm') {
      const paymentIntentId = url.searchParams.get('payment_intent');
      const success = url.searchParams.get('redirect_status') === 'succeeded';

      if (paymentIntentId) {
        try {
          const pi = await stripeApi('/payment_intents/' + paymentIntentId, env.STRIPE_SECRET_KEY || globalThis.STRIPE_SECRET_KEY);
          const html = confirmationPage(pi.status === 'succeeded', pi);
          return new Response(html, {
            headers: { 'content-type': 'text/html; charset=utf-8' },
          });
        } catch (err) {
          // fall through to generic response
        }
      }

      const html = confirmationPage(success, {
        id: paymentIntentId || 'N/A',
        amount: 0,
        last_payment_error: { message: success ? null : 'Your payment could not be processed.' },
      });
      return new Response(html, {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    }

    return new Response('Not found', { status: 404 });
  },
};
