export default {
  async fetch(request) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const data = await request.formData();
    const response = data.get('response');
    const responseMessage = data.get('responseMessage');
    const transactionId = data.get('transactionId');
    const amount = data.get('amount');
    const cardNumber = data.get('cardNumber');

    const success = response === '1';

    const page = success ? `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Payment Confirmed — Nimble Outdoors</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:system-ui,sans-serif;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:20px}
    .card{background:#222;padding:3rem;border-radius:8px;max-width:500px;border:5px solid #1F3D1B}
    h1{font-family:Oswald,sans-serif;text-transform:uppercase;font-weight:500;letter-spacing:1px;margin:1rem 0}
    .check{font-size:3rem}
    p{margin-bottom:0.5rem;color:#ccc}
    a{color:#fff;text-decoration:none;display:inline-block;margin-top:1.5rem;padding:12px 28px;border-radius:4px;background:#1F3D1B;font-family:Oswald,sans-serif;text-transform:uppercase;letter-spacing:1px}
    a:hover{background:#1E3D1A}
  </style>
</head>
<body>
  <div class="card">
    <div class="check">&#10003;</div>
    <h1>Payment Confirmed</h1>
    <p>Your preorder has been placed. You'll receive a confirmation email shortly.</p>
    <p>Transaction: ${transactionId}</p>
    <p>Amount: $${amount}</p>
    <p>Card: ${cardNumber}</p>
    <a href="/">Return to Nimble Outdoors</a>
  </div>
</body>
</html>` : `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Payment Failed — Nimble Outdoors</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:system-ui,sans-serif;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:20px}
    .card{background:#222;padding:3rem;border-radius:8px;max-width:500px;border:5px solid #8B0000}
    h1{font-family:Oswald,sans-serif;text-transform:uppercase;font-weight:500;letter-spacing:1px;margin:1rem 0}
    p{margin-bottom:0.5rem;color:#ccc}
    a{color:#fff;text-decoration:none;display:inline-block;margin-top:1.5rem;padding:12px 28px;border-radius:4px;background:#1F3D1B;font-family:Oswald,sans-serif;text-transform:uppercase;letter-spacing:1px}
    a:hover{background:#1E3D1A}
  </style>
</head>
<body>
  <div class="card">
    <h1>Payment Failed</h1>
    <p>${responseMessage || 'Your payment could not be processed.'}</p>
    <p>Please try again or contact us at joey@nimbleoutdoorsllc.com.</p>
    <a href="/">Return to Nimble Outdoors</a>
  </div>
</body>
</html>`;

    return new Response(page, {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  },
};
