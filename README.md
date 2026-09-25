# MoneyMind Games

Editable copy of [playmoneymind.com](https://www.playmoneymind.com). Pages are plain HTML and CSS, so you can change copy, colors, and layout in this folder.

## Pages

- `index.html` — home
- `the-problem.html`
- `investquest.html` — game details and buy button
- `impact.html`
- `our-team.html`
- `contact.html`
- `styles.css` — colors, type, and layout
- `assets/` — logo, photos, and product images

## Preview

From this folder:

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080

## Checkout

The **Buy on Square** button still sends shoppers to the existing Square store at `moneymind-games.square.site`. Card payments, inventory, and shipping labels stay in Square until you choose a different checkout.

## Domain

You can keep `playmoneymind.com`. Point the domain’s DNS at wherever you host these files (for example GitHub Pages, Netlify, or Cloudflare Pages), and leave the Square store running on its `square.site` address for orders.
