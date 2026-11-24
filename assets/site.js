(function () {
  var c = window.BILLKIT_CONFIG || {};
  document.querySelectorAll("[data-price]").forEach(function (e) { if (c.price) e.textContent = c.price; });
  document.querySelectorAll("[data-price-note]").forEach(function (e) { if (c.priceNote) e.textContent = c.priceNote; });
  document.querySelectorAll("[data-buy]").forEach(function (e) {
    if (c.checkoutUrl) { e.href = c.checkoutUrl; e.target = "_blank"; e.rel = "noopener"; e.textContent = "Get Pro for " + (c.price || ""); }
    else e.textContent = "Pro launching soon";
  });
  document.querySelectorAll("[data-mail]").forEach(function (e) {
    if (c.supportEmail) { e.href = "mailto:" + c.supportEmail; if (!e.textContent.trim()) e.textContent = c.supportEmail; }
  });
})();
