# BillKit

Free invoice generator that runs entirely in the browser, with a paid **Pro** unlock.

- Live site: https://r69shabh.github.io/billkit/
- App: https://r69shabh.github.io/billkit/app.html

**Free:** unlimited invoices and PDFs, GST (CGST/SGST/IGST, HSN/SAC, place of supply), VAT/sales tax, 22 currencies, amount in words, UPI scan-to-pay QR.
**Pro ($9 one-time):** no BillKit footer, logo, brand colour, 4 templates, invoice history, saved clients, CSV export, JSON backup.

## How it works

Static HTML/CSS/JS, no build step and no backend. Data lives in `localStorage`.
Pro is unlocked by a license key that the browser checks directly against the payment provider's public license API (Gumroad by default, Dodo Payments as a fallback). Keys are re-checked weekly, so refunded keys stop working.

| File | What it is |
| --- | --- |
| `config.js` | Payment provider, checkout URL, product ID and price |
| `index.html` | Landing page with pricing and FAQ |
| `app.html`, `assets/app.js`, `assets/app.css` | The invoice editor |
| `assets/license.js` | License verification (Gumroad / Dodo) |
| `gst-invoice-generator.html` | SEO page for "GST invoice generator" searches |
| `upi-invoice.html` | INR invoice payment QR guide |
| `freelance-invoice-template.html`, `usd-invoice.html`, `pdf-invoice-maker.html` | Invoice example and guides for international users |
| `legal.html` | Terms, privacy, refunds |
| `.github/workflows/pages.yml` | Deploys `main` to GitHub Pages |

Run locally: `python3 -m http.server 8000`, then open http://localhost:8000.

- Going live with payments: [docs/SETUP.md](docs/SETUP.md)
- Getting the first customers: [docs/LAUNCH.md](docs/LAUNCH.md)
- Free Google and Bing indexing: [docs/INDEXING.md](docs/INDEXING.md)

`assets/vendor/qrcode.js` is [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) by Kazuhiko Arase (MIT).
