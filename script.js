const toggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".nav");

if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
}

const quoteRotator = document.querySelector("[data-quote-rotator]");
if (quoteRotator) {
  const slides = [...quoteRotator.querySelectorAll(".quote-slide")];
  const track = quoteRotator.querySelector(".quote-track");
  const bar = quoteRotator.querySelector(".quote-progress span");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let index = 0;

  const show = (next) => {
    const count = slides.length;
    slides[index].setAttribute("aria-hidden", "true");
    index = (next + count) % count;
    slides[index].removeAttribute("aria-hidden");
    track.style.transform = `translateX(-${index * 100}%)`;
  };

  const play = () => {
    quoteRotator.classList.remove("is-playing");
    if (reduceMotion || document.hidden || slides.length < 2) return;
    void bar.offsetWidth;
    quoteRotator.classList.add("is-playing");
  };

  slides.forEach((slide, slideIndex) => {
    if (slideIndex !== 0) slide.setAttribute("aria-hidden", "true");
  });

  bar.addEventListener("animationend", () => {
    show(index + 1);
    play();
  });

  quoteRotator.querySelector(".quote-next").addEventListener("click", () => {
    show(index + 1);
    play();
  });

  quoteRotator.querySelector(".quote-prev").addEventListener("click", () => {
    show(index - 1);
    play();
  });

  document.addEventListener("visibilitychange", () => {
    quoteRotator.classList.toggle("is-paused", document.hidden);
    if (!document.hidden && !quoteRotator.classList.contains("is-playing")) play();
  });

  play();
}

const impactStage = document.querySelector("[data-impact-stage]");
if (impactStage) {
  const panels = [...impactStage.querySelectorAll("[data-impact-panel]")];
  const tabs = [...impactStage.querySelectorAll("[data-impact-go]")];
  const rails = [...impactStage.querySelectorAll("[data-impact-next]")];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let index = 0;
  let generation = 0;
  let holdTimer = 0;
  let started = false;

  const show = (next) => {
    const previous = index;
    const target = (next + panels.length) % panels.length;
    const changed = started && target !== previous;
    index = target;

    if (changed && !reduceMotion) {
      panels.forEach((panel) => {
        if (panel !== panels[previous] && panel.classList.contains("is-leave")) {
          panel.classList.remove("is-leave", "is-enter");
          panel.hidden = true;
        }
      });
      const leaving = panels[previous];
      leaving.classList.remove("is-enter");
      leaving.classList.add("is-leave");
      leaving.hidden = false;
      const finishLeave = (event) => {
        if (event.animationName !== "impact-out") return;
        leaving.hidden = true;
        leaving.classList.remove("is-leave");
        leaving.removeEventListener("animationend", finishLeave);
      };
      leaving.addEventListener("animationend", finishLeave);
      panels[target].classList.add("is-enter");
      const entering = panels[target];
      const finishEnter = (event) => {
        if (event.animationName !== "impact-in") return;
        entering.classList.remove("is-enter");
        entering.removeEventListener("animationend", finishEnter);
      };
      entering.addEventListener("animationend", finishEnter);
    }

    panels.forEach((panel, panelIndex) => {
      if (panelIndex === index) panel.hidden = false;
      else if (!panel.classList.contains("is-leave")) panel.hidden = true;
    });
    tabs.forEach((tab, tabIndex) => {
      const selected = tabIndex === index;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    arm();
    started = true;
  };

  const arm = () => {
    generation += 1;
    const gen = String(generation);
    clearTimeout(holdTimer);
    rails.forEach((rail, railIndex) => {
      rail.classList.remove("is-filling", "is-filled");
      const span = rail.querySelector("span");
      span.dataset.gen = "";
      if (railIndex < index) rail.classList.add("is-filled");
    });
    if (reduceMotion || document.hidden) return;
    const rail = rails[index];
    if (rail) {
      rail.querySelector("span").dataset.gen = gen;
      void rail.offsetWidth;
      rail.classList.add("is-filling");
    }
    holdTimer = window.setTimeout(() => {
      if (gen !== String(generation)) return;
      show(index + 1);
    }, 7000);
  };

  tabs.forEach((tab, tabIndex) => {
    tab.addEventListener("click", () => {
      show(tabIndex === index ? index + 1 : tabIndex);
    });
  });

  rails.forEach((rail) => {
    rail.addEventListener("click", () => show(index + 1));
  });

  impactStage.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const next = event.key === "ArrowRight" ? index + 1 : index - 1;
    show(next);
    tabs[(next + tabs.length) % tabs.length].focus();
    event.preventDefault();
  });

  document.addEventListener("visibilitychange", () => {
    impactStage.classList.toggle("is-paused", document.hidden);
    if (document.hidden) clearTimeout(holdTimer);
    else arm();
  });

  show(0);
}

const igFeed = document.querySelector("[data-ig-feed]");
if (igFeed) {
  const track = igFeed.querySelector(".ig-track");
  const cards = [...track.children];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let index = 0;
  let timer = 0;

  const perView = () => (window.matchMedia("(max-width: 860px)").matches ? 1 : 3);
  const maxIndex = () => Math.max(0, cards.length - perView());

  const render = () => {
    if (index > maxIndex()) index = 0;
    const card = cards[0];
    const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
    track.style.transform = `translateX(-${index * (card.getBoundingClientRect().width + gap)}px)`;
  };

  const go = (next) => {
    const max = maxIndex();
    index = next > max ? 0 : next < 0 ? max : next;
    render();
  };

  const arm = () => {
    clearInterval(timer);
    if (reduceMotion || document.hidden || maxIndex() === 0) return;
    timer = window.setInterval(() => go(index + 1), 4500);
  };

  igFeed.querySelector(".ig-next").addEventListener("click", () => {
    go(index + 1);
    arm();
  });
  igFeed.querySelector(".ig-prev").addEventListener("click", () => {
    go(index - 1);
    arm();
  });
  igFeed.addEventListener("mouseenter", () => clearInterval(timer));
  igFeed.addEventListener("mouseleave", arm);
  window.addEventListener("resize", render);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clearInterval(timer);
    else arm();
  });

  render();
  arm();
}

const contact = document.querySelector("[data-contact]");
if (contact) {
  const tabs = [...contact.querySelectorAll("[data-contact-tab]")];
  const panels = [...contact.querySelectorAll("[data-contact-panel]")];
  const empty = contact.querySelector("[data-contact-empty]");

  const show = (id, updateHash) => {
    const known = tabs.some((tab) => tab.dataset.contactTab === id);
    if (!known) return;
    tabs.forEach((tab) => {
      const selected = tab.dataset.contactTab === id;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.contactPanel !== id;
    });
    empty.hidden = true;
    if (updateHash) {
      history.replaceState(null, "", `#${id}`);
      panels.find((panel) => panel.dataset.contactPanel === id)?.querySelector("h2")?.focus();
    }
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => show(tab.dataset.contactTab, true));
  });

  contact.addEventListener("keydown", (event) => {
    const current = event.target.closest("[data-contact-tab]");
    if (!current) return;
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const index = tabs.indexOf(current);
    const step = event.key === "ArrowRight" ? 1 : -1;
    const next = tabs[(index + step + tabs.length) % tabs.length];
    next.focus();
    show(next.dataset.contactTab, true);
  });

  contact.querySelectorAll("form").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const lines = [...form.querySelectorAll("label")].flatMap((label) => {
        const field = label.querySelector("input, textarea, select");
        const title = label.querySelector("span")?.textContent.trim();
        if (!field || !title || !String(field.value).trim()) return [];
        return [`${title}: ${String(field.value).trim()}`];
      });
      let subject = form.dataset.subject || "MoneyMind Games";
      const need = form.querySelector("[data-need]");
      if (need && need.value) subject = `${subject}: ${need.value}`;
      window.location.href = `mailto:gamesmoneymind@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
    });
  });

  const fromHash = () => {
    const id = location.hash.replace("#", "");
    if (id) show(id, false);
  };

  window.addEventListener("hashchange", fromHash);
  fromHash();
}

const CART_KEY = "mm-cart";
const UNIT_CENTS = 1599;
const MAX_SHIP_CENTS = 599;
const PRODUCT_NAME = "InvestQuest Financial Literacy Card Game";

const money = (cents) => (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

const readQty = () => {
  const raw = Number(localStorage.getItem(CART_KEY) || 0);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
};

const chargeFor = (qty) => {
  const subtotal = qty * UNIT_CENTS;
  const freeShipping = qty >= 2;
  return {
    subtotal,
    shipping: freeShipping ? 0 : null,
    total: freeShipping ? subtotal : null,
    shipLabel: freeShipping ? "Free" : "Up to $5.99",
    totalLabel: freeShipping ? money(subtotal) : `Up to ${money(subtotal + MAX_SHIP_CENTS)}`,
    note: freeShipping
      ? "Two or more games ship free."
      : "Square calculates shipping from the address. A single game is $0.00 to $5.99."
  };
};

const renderCart = () => {
  const qty = readQty();
  document.querySelectorAll("[data-cart-count]").forEach((node) => {
    node.textContent = String(qty);
  });
  const body = document.querySelector("[data-cart-body]");
  const summary = document.querySelector("[data-summary-body]");
  const note = document.querySelector("[data-ship-note]");
  const line = (count) => {
    const charge = chargeFor(count);
    return `
      <div class="cart-line">
        <img src="assets/product-1.png" alt="" />
        <div>
          <strong>${PRODUCT_NAME}</strong>
          <p>${money(UNIT_CENTS)}</p>
          <div class="qty">
            <button type="button" data-cart-step="-1" aria-label="Decrease quantity">−</button>
            <input data-cart-qty type="number" min="1" value="${count}" inputmode="numeric" aria-label="Quantity in cart" />
            <button type="button" data-cart-step="1" aria-label="Increase quantity">+</button>
          </div>
        </div>
      </div>
      <div class="cart-totals">
        <div><span>Subtotal</span><span>${money(charge.subtotal)}</span></div>
        <div><span>Shipping</span><span>${charge.shipLabel}</span></div>
        <div><span>Total</span><span>${charge.totalLabel}</span></div>
      </div>
      <p class="fine">${charge.note} US shipping only. No returns, with a refund available within 24 hours of a sale.</p>`;
  };
  if (body) {
    body.innerHTML = qty
      ? `${line(qty)}<a class="btn" href="checkout.html">Checkout</a>`
      : `<p class="cart-empty">Your cart is empty.</p><p><a class="btn" href="product.html">Shop InvestQuest</a></p>`;
  }
  if (summary) {
    summary.innerHTML = qty
      ? line(qty)
      : `<p class="cart-empty">Your cart is empty.</p><p><a class="btn" href="product.html">Shop InvestQuest</a></p>`;
  }
  if (note) {
    const pending = Math.max(1, Number(document.querySelector(".shop-add input")?.value) || 1);
    note.textContent = pending >= 2
      ? "This quantity ships free."
      : "Shipping is calculated from the address, up to $5.99. A second game ships free.";
  }
};

const writeQty = (qty) => {
  const next = Math.max(0, Math.floor(Number(qty) || 0));
  if (next) localStorage.setItem(CART_KEY, String(next));
  else localStorage.removeItem(CART_KEY);
  renderCart();
};

const cartDrawer = document.querySelector("[data-cart-drawer]");
const openCart = () => {
  if (!cartDrawer) return;
  cartDrawer.hidden = false;
  cartDrawer.querySelector(".cart-panel")?.focus();
};
const closeCart = () => {
  if (cartDrawer) cartDrawer.hidden = true;
};

document.querySelectorAll("[data-cart-open]").forEach((button) => {
  button.addEventListener("click", openCart);
});
document.querySelectorAll("[data-cart-close]").forEach((button) => {
  button.addEventListener("click", closeCart);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeCart();
});

const addForm = document.querySelector("[data-add-form]");
if (addForm) {
  addForm.addEventListener("click", (event) => {
    const step = event.target.closest("[data-qty-step]");
    if (!step) return;
    const input = addForm.querySelector("input");
    input.value = String(Math.max(1, (Number(input.value) || 1) + Number(step.dataset.qtyStep)));
    renderCart();
  });
  addForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = addForm.querySelector("input");
    const add = Math.max(1, Number(input.value) || 1);
    writeQty(readQty() + add);
    openCart();
  });
  addForm.querySelector("input")?.addEventListener("input", renderCart);
}

document.addEventListener("click", (event) => {
  const step = event.target.closest("[data-cart-step]");
  if (!step) return;
  writeQty(readQty() + Number(step.dataset.cartStep));
});
document.addEventListener("change", (event) => {
  if (!event.target.matches("[data-cart-qty]")) return;
  writeQty(event.target.value);
});

const checkoutForm = document.querySelector("[data-checkout-form]");
if (checkoutForm) {
  const status = checkoutForm.querySelector("[data-pay-status]");
  let card = null;
  const square = window.MM_SQUARE || {};

  const startCard = async () => {
    if (!window.Square || !square.applicationId || !square.locationId) return;
    const payments = window.Square.payments(square.applicationId, square.locationId);
    card = await payments.card({
      style: {
        input: { color: "#ffffff", backgroundColor: "#141414" },
        "input::placeholder": { color: "#9a9a9a" },
        ".input-container": { borderColor: "rgba(255,255,255,0.12)" }
      }
    });
    await card.attach("#card-container");
  };

  startCard().catch((error) => {
    status.textContent = error?.message
      ? `Square’s card form didn’t load. ${error.message}`
      : "Square’s card form didn’t load. You can still review the order.";
  });

  checkoutForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const qty = readQty();
    if (!qty) {
      status.textContent = "Add InvestQuest to your cart before paying.";
      return;
    }
    if (!checkoutForm.reportValidity()) return;
    if (!card) {
      status.textContent = "Square’s card form isn’t connected yet, so the payment stays on this page until it is.";
      return;
    }
    const data = new FormData(checkoutForm);
    const name = String(data.get("name") || "").trim();
    const nameParts = name.split(/\s+/);
    const charge = chargeFor(qty);
    status.textContent = "Sending the card to Square…";
    const result = await card.tokenize({
      amount: ((charge.total ?? charge.subtotal) / 100).toFixed(2),
      currencyCode: "USD",
      intent: "CHARGE",
      customerInitiated: true,
      sellerKeyedIn: false,
      billingContact: {
        givenName: nameParts[0],
        familyName: nameParts.slice(1).join(" ") || nameParts[0],
        email: String(data.get("email") || ""),
        addressLines: [String(data.get("address") || "")],
        city: String(data.get("city") || ""),
        state: String(data.get("state") || "").toUpperCase(),
        postalCode: String(data.get("zip") || ""),
        countryCode: "US"
      }
    });
    if (result.status !== "OK") {
      status.textContent = "Square couldn’t read that card. Check the number and try again.";
      return;
    }
    if (!square.payUrl) {
      status.textContent = "Square’s card form is connected. The charge itself waits on the access token, which has to be saved on the payment server.";
      return;
    }
    let response;
    try {
      response = await fetch(square.payUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: result.token,
          idempotencyKey: crypto.randomUUID(),
          quantity: qty,
          name,
          email: String(data.get("email") || ""),
          address: String(data.get("address") || ""),
          city: String(data.get("city") || ""),
          state: String(data.get("state") || "").toUpperCase(),
          zip: String(data.get("zip") || "")
        })
      });
    } catch {
      status.textContent = "The payment server didn’t respond. Try again in a moment.";
      return;
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      status.textContent = payload.error || "Square declined the payment. Check the card and try again.";
      return;
    }
    writeQty(0);
    const shippingNote = payload.shipping === "Not included"
      ? " Shipping from the address, up to $5.99, was not added to this charge."
      : "";
    status.textContent = `Paid ${payload.total || charge.totalLabel}.${shippingNote}`;
  });
}

if (document.querySelector("[data-cart-count], [data-cart-body], [data-summary-body]")) renderCart();

const mainImage = document.querySelector("[data-product-main]");
document.querySelectorAll("[data-thumb]").forEach((button) => {
  button.addEventListener("click", () => {
    const src = button.getAttribute("data-thumb");
    if (mainImage && src) mainImage.src = src;
    document.querySelectorAll("[data-thumb]").forEach((item) => {
      if (item === button) item.setAttribute("aria-current", "true");
      else item.removeAttribute("aria-current");
    });
  });
});
