(function () {
  var KEY = "billkit.license";
  var RECHECK_MS = 7 * 24 * 3600 * 1000;
  var cfg = window.BILLKIT_CONFIG || {};

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; }
  }
  function write(v) { localStorage.setItem(KEY, JSON.stringify(v)); }

  async function verifyGumroad(key) {
    if (!cfg.productId) throw new Error("Pro checkout is not configured yet.");
    var body = new URLSearchParams({ product_id: cfg.productId, license_key: key, increment_uses_count: "false" });
    var res = await fetch("https://api.gumroad.com/v2/licenses/verify", { method: "POST", body: body });
    var data = await res.json().catch(function () { return {}; });
    if (!data.success) return { ok: false, reason: data.message || "That license key was not found." };
    var p = data.purchase || {};
    if (p.refunded || p.chargebacked || p.disputed) return { ok: false, reason: "This purchase was refunded." };
    if (p.subscription_ended_at || p.subscription_cancelled_at || p.subscription_failed_at) return { ok: false, reason: "This subscription has ended." };
    return { ok: true, email: p.email || "" };
  }

  async function verifyDodo(key) {
    var host = cfg.dodoTestMode ? "https://test.dodopayments.com" : "https://live.dodopayments.com";
    var res = await fetch(host + "/licenses/validate", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ license_key: key })
    });
    var data = await res.json().catch(function () { return {}; });
    if (!data.valid) return { ok: false, reason: "That license key is not valid." };
    return { ok: true, email: "" };
  }

  async function verify(key) {
    key = (key || "").trim();
    if (!key) return { ok: false, reason: "Paste your license key." };
    return cfg.provider === "dodo" ? verifyDodo(key) : verifyGumroad(key);
  }

  var License = {
    isPro: function () { var l = read(); return !!(l && l.key && l.valid); },
    info: function () { return read(); },
    activate: async function (key) {
      var r = await verify(key);
      if (r.ok) write({ key: key.trim(), valid: true, email: r.email, checkedAt: Date.now() });
      return r;
    },
    deactivate: function () { localStorage.removeItem(KEY); },
    // Re-check stored keys weekly so refunds lose Pro; network errors keep Pro on.
    recheck: async function () {
      var l = read();
      if (!l || !l.key || Date.now() - (l.checkedAt || 0) < RECHECK_MS) return;
      try {
        var r = await verify(l.key);
        if (r.ok) { l.checkedAt = Date.now(); write(l); }
        else { localStorage.removeItem(KEY); location.reload(); }
      } catch (e) { /* offline */ }
    },
    checkoutUrl: function () { return cfg.checkoutUrl || ""; }
  };
  window.BillKitLicense = License;
})();
