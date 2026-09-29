const UNIT_CENTS = 1599;
const LOCATION_ID = "LFPCG9BC6WSPQ";
const SQUARE_VERSION = "2026-09-16";
const PRODUCT_NAME = "InvestQuest Financial Literacy Card Game";
const ALLOWED = new Set([
  "https://playmoneymind.com",
  "https://www.playmoneymind.com"
]);

const cors = (origin) => ({
  "Access-Control-Allow-Origin": ALLOWED.has(origin) ? origin : "https://playmoneymind.com",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  Vary: "Origin",
  "Access-Control-Allow-Headers": "Content-Type"
});

const json = (body, status, origin) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors(origin) }
  });

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
    if (request.method === "GET") return json({ ok: true }, 200, origin);
    if (request.method !== "POST") return json({ error: "Use POST." }, 405, origin);
    if (!env.SQUARE_ACCESS_TOKEN) {
      return json({ error: "The payment server is missing its Square access token." }, 500, origin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "The checkout details could not be read." }, 400, origin);
    }

    const qty = Math.floor(Number(body.quantity));
    if (!Number.isInteger(qty) || qty < 1 || qty > 6) {
      return json({ error: "Choose a quantity between 1 and 6." }, 400, origin);
    }

    const lineItems = [{
      name: PRODUCT_NAME,
      quantity: String(qty),
      base_price_money: { amount: UNIT_CENTS, currency: "USD" }
    }];
    if (qty >= 2) {
      lineItems.push({
        name: "Shipping",
        quantity: "1",
        note: "Two or more games ship free.",
        base_price_money: { amount: 0, currency: "USD" }
      });
    }

    const squareResponse = await fetch("https://connect.squareup.com/v2/online-checkout/payment-links", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "Square-Version": SQUARE_VERSION
      },
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        description: `${PRODUCT_NAME} x${qty}`,
        payment_note: "InvestQuest order from playmoneymind.com",
        order: { location_id: LOCATION_ID, line_items: lineItems },
        checkout_options: {
          allow_tipping: false,
          ask_for_shipping_address: true,
          merchant_support_email: "gamesmoneymind@gmail.com",
          redirect_url: "https://playmoneymind.com/checkout.html?paid=1"
        }
      })
    });
    const squareBody = await squareResponse.json().catch(() => ({}));
    const url = squareBody?.payment_link?.url;
    if (!squareResponse.ok || !url) {
      return json({ error: "Square checkout didn’t open. Try again." }, 502, origin);
    }
    return json({ url }, 200, origin);
  }
};
