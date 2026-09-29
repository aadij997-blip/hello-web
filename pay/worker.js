const UNIT_CENTS = 1599;
const LOCATION_ID = "LFPCG9BC6WSPQ";
const SQUARE_VERSION = "2026-08-19";
const ALLOWED = new Set([
  "https://playmoneymind.com",
  "https://www.playmoneymind.com"
]);

const money = (cents) => `$${(cents / 100).toFixed(2)}`;

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

const clean = (value, max) => String(value || "").trim().slice(0, max);

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
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
    const sourceId = clean(body.sourceId, 200);
    const name = clean(body.name, 200);
    const email = clean(body.email, 200);
    const address = clean(body.address, 200);
    const city = clean(body.city, 100);
    const state = clean(body.state, 2).toUpperCase();
    const zip = clean(body.zip, 5);
    const idempotencyKey = clean(body.idempotencyKey, 45);
    const [given, ...rest] = name.split(/\s+/);
    const family = rest.join(" ") || given;

    if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
      return json({ error: "Choose a quantity between 1 and 20." }, 400, origin);
    }
    if (!sourceId.startsWith("cnon:")) return json({ error: "Square didn’t return a card token." }, 400, origin);
    if (!/^[A-Za-z0-9-]{8,45}$/.test(idempotencyKey)) {
      return json({ error: "The checkout could not start a payment. Refresh and try again." }, 400, origin);
    }
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !address || !city || !/^[A-Z]{2}$/.test(state) || !/^\d{5}$/.test(zip)) {
      return json({ error: "Check the name, email, and US shipping address." }, 400, origin);
    }

    const subtotal = qty * UNIT_CENTS;
    const freeShipping = qty >= 2;
    const total = subtotal;
    const note = [
      `InvestQuest Financial Literacy Card Game x${qty}`,
      name,
      `${address}, ${city}, ${state} ${zip}`,
      freeShipping
        ? "Shipping: free, two or more games."
        : "Shipping: address rate up to $5.99 was not added to this charge."
    ].join("\n");

    const squareResponse = await fetch("https://connect.squareup.com/v2/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "Square-Version": SQUARE_VERSION
      },
      body: JSON.stringify({
        source_id: sourceId,
        idempotency_key: idempotencyKey,
        amount_money: { amount: total, currency: "USD" },
        location_id: LOCATION_ID,
        autocomplete: true,
        buyer_email_address: email,
        note: note.slice(0, 500),
        shipping_address: {
          address_line_1: address,
          locality: city,
          administrative_district_level_1: state,
          postal_code: zip,
          country: "US",
          first_name: given.slice(0, 100),
          last_name: family.slice(0, 100)
        }
      })
    });

    const squareBody = await squareResponse.json().catch(() => ({}));
    if (!squareResponse.ok) {
      const detail = String(squareBody?.errors?.[0]?.detail || squareBody?.errors?.[0]?.code || "");
      const declined = /declin|card|cvv|postal|avs|insufficient|invalid|nonce|source/i.test(detail);
      return json({
        error: declined
          ? "Square declined the payment. Check the card and try again."
          : "Square couldn’t complete the payment. Try again in a moment."
      }, 402, origin);
    }

    return json({
      receipt: squareBody?.payment?.id || "saved",
      total: money(total),
      shipping: freeShipping ? "Free" : "Not included"
    }, 200, origin);
  }
};
