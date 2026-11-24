# Go live: turn on payments (about 10 minutes)

The site works without this, but the "Buy Pro" buttons say "Pro launching soon" until `config.js` has a checkout URL. The structured Pro offer points to BillKit's pricing section, where the button uses `checkoutUrl`. When switching providers, change the checkout URL in `config.js`; no structured-data URL change is needed.

## Gumroad (default)

1. Go to https://app.gumroad.com/products/new.
2. Name: **BillKit Pro (Lifetime)**. Type: **Digital product**. Price: **$9** (or set your own and update `price` in `config.js`). Click **Next: Customize**.
3. Description (paste):
   > Unlock BillKit Pro in your browser: no "Made with BillKit" footer, your logo and brand colour, 4 invoice templates, saved invoice history and clients, CSV export and backups. One payment, lifetime access.
   > After purchase, copy your license key, open https://r69shabh.github.io/billkit/app.html, click **Upgrade** and paste the key into **Activate**.
4. Cover image: upload `assets/og.png` from this repo. Thumbnail: `assets/logo.svg` exported to PNG, or a screenshot.
5. **Content** tab: add a text/link block with "Open BillKit and activate: https://r69shabh.github.io/billkit/app.html". Gumroad requires some content.
6. **Content** tab (or Settings, depending on the Gumroad UI): turn on **Generate a unique license key per sale**. The **product_id** appears right below that toggle. Copy it.
7. Publish the product and copy its URL, for example `https://yourname.gumroad.com/l/billkit-pro`.
8. In `config.js`, set:
   ```js
   provider: "gumroad",
   checkoutUrl: "https://yourname.gumroad.com/l/billkit-pro?wanted=true",
   productId: "<the product_id from step 6>",
   ```
   (`?wanted=true` opens checkout directly.)
9. Commit to `main`. GitHub Pages redeploys within about a minute.
10. Test: buy it yourself (or use a 100% off discount code from Gumroad → Checkout → Discounts), paste the key into the app, and check that the footer disappears.

Payouts: Gumroad → Settings → Payments → add your Indian bank account (or PayPal). Gumroad is merchant of record, so it handles VAT/sales tax for international buyers.

## Dodo Payments (backup)

1. In the Dodo dashboard create a one-time product, **BillKit Pro**, $9, and enable **License keys** for it.
2. Create a payment link / checkout link for the product.
3. In `config.js`: `provider: "dodo"`, `checkoutUrl: "<the payment link>"`. Set `dodoTestMode: true` while testing with test-mode keys, then back to `false`.

## Changing the price

Change it at the provider, then update `price` (and optionally `priceNote`) in `config.js`. The landing page JSON-LD in `index.html` also lists `"price":"9"`.
