// The only file to edit when going live. See docs/SETUP.md.
window.BILLKIT_CONFIG = {
  // "gumroad" (default) or "dodo" (Dodo Payments)
  provider: "gumroad",

  // Where the "Buy Pro" buttons send people (your Gumroad product URL or Dodo checkout link).
  // Leave empty until the product exists: buy buttons then show "Pro launching soon".
  checkoutUrl: "",

  // Gumroad only: the product_id shown on the product's edit page under
  // Content -> "License key" (required to verify keys). Not used for Dodo.
  productId: "",

  // Dodo only: true while testing with Dodo's test mode keys.
  dodoTestMode: false,

  // Shown on the site. Keep in sync with the price set at the payment provider.
  price: "$9",
  priceNote: "one-time · lifetime updates",

  supportEmail: "rishabhgusain.6@gmail.com",
  siteUrl: "https://r69shabh.github.io/billkit/"
};
