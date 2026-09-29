const UNIT_CENTS = 1599;
const LOCATION_ID = "LFPCG9BC6WSPQ";
const SQUARE_VERSION = "2026-09-16";
const PRODUCT_NAME = "InvestQuest Financial Literacy Card Game";
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

const square = async (env, path, payload, method = "POST") => {
  const response = await fetch(`https://connect.squareup.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      "Square-Version": SQUARE_VERSION
    },
    body: payload ? JSON.stringify(payload) : undefined
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
};

const customerError = (body) => {
  const detail = String(body?.errors?.[0]?.detail || body?.errors?.[0]?.code || "");
  return /declin|card|cvv|postal|avs|insufficient|invalid|nonce|source/i.test(detail)
    ? "Square declined the payment. Check the card and try again."
    : "Square couldn’t complete the payment. Try again in a moment.";
};

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
    if (body.action === "link") {
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
      const created = await square(env, "/v2/online-checkout/payment-links", {
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
      });
      const url = created.body?.payment_link?.url;
      if (!created.response.ok || !url) {
        return json({ error: "Square checkout didn’t open. Try again." }, 502, origin);
      }
      return json({ url }, 200, origin);
    }

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

    const freeShipping = qty >= 2;
    const lineItems = [
      {
        name: PRODUCT_NAME,
        quantity: String(qty),
        base_price_money: { amount: UNIT_CENTS, currency: "USD" }
      }
    ];
    if (freeShipping) {
      lineItems.push({
        name: "Shipping",
        quantity: "1",
        base_price_money: { amount: 0, currency: "USD" },
        note: "Two or more games ship free."
      });
    }

    const created = await square(env, "/v2/orders", {
      idempotency_key: `${idempotencyKey}-order`,
      order: {
        location_id: LOCATION_ID,
        line_items: lineItems,
        fulfillments: [
          {
            type: "SHIPMENT",
            shipment_details: {
              recipient: {
                display_name: name,
                email_address: email,
                address: {
                  address_line_1: address,
                  locality: city,
                  administrative_district_level_1: state,
                  postal_code: zip,
                  country: "US",
                  first_name: given.slice(0, 100),
                  last_name: family.slice(0, 100)
                }
              }
            }
          }
        ]
      }
    });
    const order = created.body?.order;
    const orderReady = created.response.ok && order?.id && order.total_money;
    const amount = orderReady ? order.total_money : { amount: qty * UNIT_CENTS, currency: "USD" };
    const paid = await square(env, "/v2/payments", {
      source_id: sourceId,
      idempotency_key: idempotencyKey,
      amount_money: amount,
      ...(orderReady ? { order_id: order.id } : {}),
      location_id: LOCATION_ID,
      autocomplete: true,
      buyer_email_address: email,
      shipping_address: {
        address_line_1: address,
        locality: city,
        administrative_district_level_1: state,
        postal_code: zip,
        country: "US",
        first_name: given.slice(0, 100),
        last_name: family.slice(0, 100)
      },
      note: freeShipping
        ? `${PRODUCT_NAME} x${qty}. Shipping free.`
        : `${PRODUCT_NAME} x${qty}. Address shipping up to $5.99 was not added.`
    });
    if (!paid.response.ok) {
      if (orderReady) {
        await square(env, `/v2/orders/${order.id}`, {
          order: {
            version: order.version,
            location_id: LOCATION_ID,
            state: "CANCELED"
          }
        }, "PUT");
      }
      return json({
        error: customerError(paid.body),
        code: paid.body?.errors?.[0]?.code || "PAYMENT"
      }, 402, origin);
    }

    return json({
      receipt: paid.body?.payment?.id || "saved",
      orderId: orderReady ? order.id : "",
      total: money(amount.amount),
      shipping: freeShipping ? "Free" : "Not included"
    }, 200, origin);
  }
};
