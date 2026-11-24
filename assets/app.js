(function () {
  "use strict";
  var cfg = window.BILLKIT_CONFIG || {};
  var L = window.BillKitLicense;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var DRAFT = "billkit.draft", HIST = "billkit.history", CLIENTS = "billkit.clients", PROFILE = "billkit.profile";
  var CURRENCIES = ["INR", "USD", "EUR", "GBP", "AUD", "CAD", "SGD", "AED", "JPY", "CHF", "NZD", "ZAR", "BRL", "MXN", "PHP", "IDR", "MYR", "NGN", "PKR", "BDT", "LKR", "NPR"];
  var COLORS = ["#4f46e5", "#0ea5e9", "#059669", "#dc2626", "#ea580c", "#d946ef", "#0f172a", "#a16207"];

  function today(offset) {
    var d = new Date(); d.setDate(d.getDate() + (offset || 0));
    return d.toISOString().slice(0, 10);
  }
  function guessCurrency() {
    var tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || "");
    if (/Calcutta|Kolkata/.test(tz)) return "INR";
    if (/^Europe\/London/.test(tz)) return "GBP";
    if (/^Europe\//.test(tz)) return "EUR";
    if (/^Australia\//.test(tz)) return "AUD";
    if (/Dubai/.test(tz)) return "AED";
    if (/Singapore/.test(tz)) return "SGD";
    return "USD";
  }
  var STATES = [["01","Jammu and Kashmir"],["02","Himachal Pradesh"],["03","Punjab"],["04","Chandigarh"],["05","Uttarakhand"],["06","Haryana"],["07","Delhi"],["08","Rajasthan"],["09","Uttar Pradesh"],["10","Bihar"],["11","Sikkim"],["12","Arunachal Pradesh"],["13","Nagaland"],["14","Manipur"],["15","Mizoram"],["16","Tripura"],["17","Meghalaya"],["18","Assam"],["19","West Bengal"],["20","Jharkhand"],["21","Odisha"],["22","Chhattisgarh"],["23","Madhya Pradesh"],["24","Gujarat"],["26","Dadra and Nagar Haveli and Daman and Diu"],["27","Maharashtra"],["29","Karnataka"],["30","Goa"],["31","Lakshadweep"],["32","Kerala"],["33","Tamil Nadu"],["34","Puducherry"],["35","Andaman and Nicobar Islands"],["36","Telangana"],["37","Andhra Pradesh"],["38","Ladakh"],["97","Other Territory"],["96","Outside India (export)"]];
  function stateName(code) { for (var i = 0; i < STATES.length; i++) if (STATES[i][0] === code) return STATES[i][1]; return ""; }
  var GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
  function gstinOk(g) { g = String(g || "").trim().toUpperCase(); return GSTIN_RE.test(g) && !!stateName(g.slice(0, 2)) ? g : ""; }
  function blank() {
    var cur = guessCurrency();
    return {
      id: null, template: "classic", accent: COLORS[0],
      from: { name: "", email: "", address: "", phone: "", taxId: "", state: "", logo: "" },
      to: { name: "", email: "", address: "", taxId: "" },
      meta: { number: "INV-0001", date: today(), due: today(15), currency: cur, pos: "" },
      taxMode: cur === "INR" ? "gst" : "none", gstSplit: "auto", reverseCharge: "no", taxLabel: "VAT",
      items: [{ desc: "", detail: "", hsn: "", qty: 1, rate: 0, tax: cur === "INR" ? 18 : 0 }],
      discount: 0, discountType: "flat", shipping: 0, shipTax: "",
      upi: "", upiName: "", bank: "", notes: "Thank you for your business!", terms: ""
    };
  }
  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function save(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); }
    catch (e) { toast("Browser storage is full. Try a smaller logo."); }
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
  function get(o, path) { return path.split(".").reduce(function (a, k) { return a == null ? a : a[k]; }, o); }
  function set(o, path, v) { var ks = path.split("."), last = ks.pop(); ks.reduce(function (a, k) { return a[k]; }, o)[last] = v; }

  var pro = L.isPro();
  var state = load(DRAFT, null) || (function () {
    var s = blank(), p = load(PROFILE, null);
    if (p) { s.from = p.from || s.from; s.upi = p.upi || ""; s.upiName = p.upiName || ""; s.bank = p.bank || ""; s.terms = p.terms || ""; }
    return s;
  })();
  // fill any fields added in newer versions
  function migrate(st) {
    var b = blank(); Object.keys(b).forEach(function (k) { if (st[k] === undefined) st[k] = b[k]; });
    var pos = String(st.meta.pos || "");
    if (pos && !stateName(pos)) {
      var m = pos.match(/\b(\d{2})\b/), low = pos.toLowerCase();
      st.meta.pos = m && stateName(m[1]) ? m[1] : (STATES.filter(function (x) { return low.indexOf(x[1].toLowerCase()) >= 0; })[0] || [""])[0];
    }
    if (st.from.state === undefined) st.from.state = "";
    delete st.gstType;
    return st;
  }
  migrate(state);

  // GST place-of-supply logic: same state -> CGST+SGST, different state or export -> IGST.
  function gstInfo() {
    var s = state, supG = gstinOk(s.from.taxId), cliG = gstinOk(s.to.taxId);
    var sup = supG ? supG.slice(0, 2) : s.from.state || "";
    var pos = s.meta.pos || (cliG ? cliG.slice(0, 2) : "");
    var auto = sup && pos ? (sup === pos ? "intra" : "inter") : "";
    var kind = s.gstSplit === "intra" || s.gstSplit === "inter" ? s.gstSplit : (auto || "intra");
    var issues = [];
    if (!s.from.taxId) issues.push("your GSTIN");
    else if (!supG) issues.push("a valid GSTIN for you (15 characters, e.g. 29ABCDE1234F1Z5)");
    if (s.to.taxId && !cliG) issues.push("a valid client GSTIN (or leave it empty for an unregistered client)");
    if (supG && s.from.state && s.from.state !== supG.slice(0, 2)) issues.push("your state to match your GSTIN (" + stateName(supG.slice(0, 2)) + ")");
    if (!sup) issues.push("your state");
    if (!pos) issues.push("the place of supply");
    var noHsn = s.items.filter(function (it) { return num(it.qty) * num(it.rate) && !String(it.hsn || "").trim(); }).length;
    if (noHsn) issues.push("HSN/SAC for " + noHsn + (noHsn > 1 ? " items" : " item"));
    var warn = auto && kind !== auto ? "Override: your state and place of supply call for " + (auto === "intra" ? "CGST + SGST" : "IGST") + "." : "";
    return { sup: sup, pos: pos, auto: auto, kind: kind, issues: issues, warn: warn };
  }

  function fmt(n) {
    var c = state.meta.currency || "USD";
    try { return new Intl.NumberFormat(c === "INR" ? "en-IN" : "en-US", { style: "currency", currency: c }).format(n); }
    catch (e) { return c + " " + n.toFixed(2); }
  }

  // Empty = charges follow the main supply, taxed at the highest item rate.
  function shipTaxRate() {
    if (String(state.shipTax == null ? "" : state.shipTax).trim() !== "") return num(state.shipTax);
    return state.items.reduce(function (m, it) { return Math.max(m, num(it.tax)); }, 0);
  }
  function calc() {
    var sub = 0, taxRaw = 0, byRate = {};
    state.items.forEach(function (it) {
      var amt = num(it.qty) * num(it.rate);
      sub += amt;
      if (state.taxMode !== "none") {
        var t = amt * num(it.tax) / 100; taxRaw += t;
        byRate[num(it.tax)] = (byRate[num(it.tax)] || 0) + t;
      }
    });
    var disc = state.discountType === "pct" ? sub * num(state.discount) / 100 : num(state.discount);
    disc = Math.min(Math.max(disc, 0), sub);
    var factor = sub ? (sub - disc) / sub : 1;
    var tax = taxRaw * factor;
    Object.keys(byRate).forEach(function (r) { byRate[r] *= factor; });
    var ship = num(state.shipping), shipRate = shipTaxRate();
    if (state.taxMode !== "none" && ship && shipRate) {
      var st = ship * shipRate / 100; tax += st;
      byRate[shipRate] = (byRate[shipRate] || 0) + st;
    }
    var total = sub - disc + ship + tax;
    return { sub: sub, disc: disc, tax: tax, byRate: byRate, ship: ship, taxable: sub - disc + ship, total: Math.round(total * 100) / 100 };
  }

  // ---------- amount in words ----------
  var ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  var TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  function w99(n) { return n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? "-" + ONES[n % 10] : ""); }
  function w999(n) { var h = Math.floor(n / 100), r = n % 100; return (h ? ONES[h] + " Hundred" + (r ? " " : "") : "") + (r ? w99(r) : ""); }
  function words(n, indian) {
    n = Math.floor(n); if (!n) return "Zero";
    var parts = [], units = indian ? [[1e7, "Crore"], [1e5, "Lakh"], [1e3, "Thousand"]] : [[1e12, "Trillion"], [1e9, "Billion"], [1e6, "Million"], [1e3, "Thousand"]];
    units.forEach(function (u) {
      var q = Math.floor(n / u[0]);
      if (q) { parts.push((q > 999 ? words(q, indian) : w999(q)) + " " + u[1]); n -= q * u[0]; }
    });
    if (n) parts.push(w999(n));
    return parts.join(" ");
  }
  var CUR_WORDS = { INR: ["Rupees", "Paise"], USD: ["Dollars", "Cents"], AUD: ["Australian Dollars", "Cents"], CAD: ["Canadian Dollars", "Cents"], SGD: ["Singapore Dollars", "Cents"], NZD: ["New Zealand Dollars", "Cents"], EUR: ["Euros", "Cents"], GBP: ["Pounds", "Pence"], AED: ["Dirhams", "Fils"] };
  function amountWords(t) {
    var c = state.meta.currency, w = CUR_WORDS[c]; if (!w) return "";
    var major = Math.floor(t), minor = Math.round((t - major) * 100);
    var ind = c === "INR";
    var s = w[0] + " " + words(major, ind) + (minor ? " and " + words(minor, ind) + " " + w[1] : "");
    return s + " Only";
  }

  function upiQr(total) {
    if (!state.upi || state.meta.currency !== "INR" || typeof qrcode !== "function") return "";
    var url = "upi://pay?pa=" + encodeURIComponent(state.upi.trim()) +
      (state.upiName ? "&pn=" + encodeURIComponent(state.upiName) : "") +
      (total > 0 ? "&am=" + total.toFixed(2) : "") + "&cu=INR&tn=" + encodeURIComponent("Invoice " + state.meta.number);
    try { var q = qrcode(0, "M"); q.addData(url); q.make(); return q.createDataURL(6, 2); } catch (e) { return ""; }
  }

  function dateStr(d) {
    if (!d) return "";
    var x = new Date(d + "T00:00:00");
    return isNaN(x) ? d : x.toLocaleDateString(state.meta.currency === "INR" ? "en-IN" : "en-US", { day: "numeric", month: "short", year: "numeric" });
  }

  // ---------- render invoice ----------
  function render() {
    document.body.classList.toggle("is-pro", pro);
    document.body.className = document.body.className.replace(/\btax-\w+/g, "").trim() + " tax-" + state.taxMode;
    $("#planBadge").textContent = pro ? "Pro" : "Free";
    $("#planBadge").className = "pill" + (pro ? " ok" : "");
    var taxIdName = state.taxMode === "gst" ? "GSTIN" : state.taxMode === "simple" ? (state.taxLabel || "Tax") + " no." : "Tax ID";
    $("#fromTaxLabel").textContent = taxIdName; $("#toTaxLabel").textContent = taxIdName;

    var c = calc(), s = state, gst = s.taxMode === "gst", taxed = s.taxMode !== "none";
    var tpl = pro ? s.template : "classic";
    var paper = $("#paper");
    paper.className = "paper t-" + tpl;
    paper.style.setProperty("--accent", pro ? s.accent : COLORS[0]);

    var g = gst ? gstInfo() : null;
    var title = gst && !g.issues.length ? "Tax Invoice" : "Invoice";
    var gw = $("#gstWarn");
    if (gw) {
      gw.innerHTML = !gst ? "" : (g.issues.length ? "<b>Draft, not a Tax Invoice yet.</b> Add " + g.issues.map(esc).join(", ") + "." : "") +
        (g.warn ? (g.issues.length ? "<br>" : "") + esc(g.warn) : "") +
        (!g.issues.length && !g.warn ? "Tax Invoice: " + (g.kind === "intra" ? "CGST + SGST (same state)" : "IGST (" + (g.pos === "96" ? "export" : "inter-state") + ")") + "." : "");
      gw.className = "msg" + (gst && (g.issues.length || g.warn) ? " err" : gst ? " ok" : "");
    }
    var h = '<div class="inv-head"><div class="inv-from">';
    if (pro && s.from.logo) h += '<img class="inv-logo" src="' + esc(s.from.logo) + '" alt="">';
    h += '<div class="nm">' + esc(s.from.name || "Your Business") + '</div><div class="pre">' + esc(s.from.address) + "</div>";
    h += "<div>" + [s.from.email, s.from.phone].filter(Boolean).map(esc).join(" · ") + "</div>";
    if (s.from.taxId) h += "<div><b>" + esc(taxIdName) + ":</b> " + esc(s.from.taxId) + "</div>";
    h += '</div><div class="inv-title"><h1>' + title + '</h1><div class="no"># ' + esc(s.meta.number) + "</div></div></div>";

    h += '<div class="inv-meta"><div class="to"><div class="lbl">Bill to</div><div class="nm">' + esc(s.to.name || "Client name") + '</div><div class="pre">' + esc(s.to.address) + "</div>";
    if (s.to.email) h += "<div>" + esc(s.to.email) + "</div>";
    if (s.to.taxId) h += "<div><b>" + esc(taxIdName) + ":</b> " + esc(s.to.taxId) + "</div>";
    h += '</div><div class="inv-dates"><span class="k">Issue date</span><span class="v">' + esc(dateStr(s.meta.date)) + "</span>";
    if (s.meta.due) h += '<span class="k">Due date</span><span class="v">' + esc(dateStr(s.meta.due)) + "</span>";
    if (gst && g.pos) h += '<span class="k">Place of supply</span><span class="v">' + esc(stateName(g.pos) + " (" + g.pos + ")") + "</span>";
    if (gst) h += '<span class="k">Reverse charge</span><span class="v">' + (s.reverseCharge === "yes" ? "Yes" : "No") + "</span>";
    h += '<span class="k">Amount due</span><span class="v">' + esc(fmt(c.total)) + "</span></div></div>";

    h += '<table class="lines"><thead><tr><th>#</th><th>Description</th>' + (gst ? '<th>HSN/SAC</th>' : "") +
      '<th class="r">Qty</th><th class="r">Rate</th>' + (taxed ? '<th class="r">' + (gst ? "GST" : esc(s.taxLabel || "Tax")) + "</th>" : "") + '<th class="r">Amount</th></tr></thead><tbody>';
    s.items.forEach(function (it, i) {
      h += "<tr><td>" + (i + 1) + '</td><td class="d">' + esc(it.desc || "Item") + (it.detail ? "<small>" + esc(it.detail) + "</small>" : "") + "</td>" +
        (gst ? "<td>" + esc(it.hsn) + "</td>" : "") + '<td class="r">' + esc(num(it.qty)) + '</td><td class="r">' + esc(fmt(num(it.rate))) + "</td>" +
        (taxed ? '<td class="r">' + esc(num(it.tax)) + "%</td>" : "") + '<td class="r">' + esc(fmt(num(it.qty) * num(it.rate))) + "</td></tr>";
    });
    h += "</tbody></table>";

    var qr = upiQr(c.total);
    h += '<div class="inv-bottom"><div class="pay">';
    if (qr) h += '<div class="lbl">Scan to pay (UPI)</div><div class="upi"><img src="' + qr + '" alt="UPI QR"><div><b>' + esc(s.upi) + "</b><br>" + esc(s.upiName) + "<br><small>GPay · PhonePe · Paytm · BHIM</small></div></div>";
    if (s.bank) h += '<div class="lbl">Payment details</div><div class="pre">' + esc(s.bank) + "</div>";
    h += '</div><div class="totals"><div class="ln"><span>Subtotal</span><span class="v">' + esc(fmt(c.sub)) + "</span></div>";
    if (c.disc) h += '<div class="ln"><span>Discount' + (s.discountType === "pct" ? " (" + num(s.discount) + "%)" : "") + '</span><span class="v">−' + esc(fmt(c.disc)) + "</span></div>";
    if (c.ship) h += '<div class="ln"><span>Shipping / other' + (taxed && shipTaxRate() ? " (" + (gst ? "GST" : esc(s.taxLabel || "Tax")) + " " + shipTaxRate() + "%)" : "") + '</span><span class="v">' + esc(fmt(c.ship)) + "</span></div>";
    if (taxed && (c.disc || c.ship)) h += '<div class="ln"><span>Taxable value</span><span class="v">' + esc(fmt(c.taxable)) + "</span></div>";
    if (taxed) {
      Object.keys(c.byRate).sort(function (a, b) { return a - b; }).forEach(function (r) {
        var t = c.byRate[r]; if (!t) return;
        if (gst && g.kind === "intra") {
          h += '<div class="ln"><span>CGST @ ' + r / 2 + '%</span><span class="v">' + esc(fmt(t / 2)) + "</span></div>";
          h += '<div class="ln"><span>SGST @ ' + r / 2 + '%</span><span class="v">' + esc(fmt(t / 2)) + "</span></div>";
        } else {
          h += '<div class="ln"><span>' + (gst ? "IGST" : esc(s.taxLabel || "Tax")) + " @ " + r + '%</span><span class="v">' + esc(fmt(t)) + "</span></div>";
        }
      });
    }
    h += '<div class="ln grand"><span>Total</span><span class="v">' + esc(fmt(c.total)) + "</span></div>";
    var aw = amountWords(c.total); if (aw) h += '<div class="words">' + esc(aw) + "</div>";
    h += "</div></div>";

    if (s.notes || s.terms) {
      h += '<div class="notes"><div>' + (s.notes ? '<div class="lbl">Notes</div><div class="pre">' + esc(s.notes) + "</div>" : "") + "</div><div>" +
        (s.terms ? '<div class="lbl">Terms</div><div class="pre">' + esc(s.terms) + "</div>" : "") + "</div></div>";
    }
    if (gst) h += '<div class="sign"><div>For ' + esc(s.from.name || "Your Business") + '</div><div class="line">Authorised signatory</div></div>';
    h += '<div class="spacer"></div>';
    if (!pro) h += '<div class="wm">Made with <a href="' + esc(cfg.siteUrl || "./") + '">BillKit</a>, the free invoice generator</div>';
    paper.innerHTML = h;
    renderDesign();
  }

  // ---------- editor ----------
  function bindFields() {
    var opts = '<option value="">Select state</option>' + STATES.map(function (x) { return '<option value="' + x[0] + '">' + esc(x[1]) + " (" + x[0] + ")</option>"; }).join("");
    $$(".state-select").forEach(function (el) { el.innerHTML = opts; });
    var cur = $("#currency");
    cur.innerHTML = CURRENCIES.map(function (c) { return "<option>" + c + "</option>"; }).join("");
    $$("[data-bind]").forEach(function (el) {
      var path = el.getAttribute("data-bind"), v = get(state, path);
      el.value = v == null ? "" : v;
      el.addEventListener("input", function () {
        set(state, path, el.hasAttribute("data-num") ? num(el.value) : el.value);
        if (path === "meta.currency" && el.value === "INR" && state.taxMode === "none") {
          state.taxMode = "gst"; $('[data-bind="taxMode"]').value = "gst";
        }
        changed();
      });
    });
  }
  function itemsUI() {
    var box = $("#items");
    box.innerHTML = state.items.map(function (it, i) {
      return '<div class="item" data-i="' + i + '"><button type="button" class="del" title="Remove">&times;</button>' +
        '<label>Item ' + (i + 1) + '<input data-f="desc" value="' + esc(it.desc) + '" placeholder="Website design"></label>' +
        '<label><input data-f="detail" value="' + esc(it.detail) + '" placeholder="Details (optional)"></label>' +
        '<div class="row4"><label>Qty<input type="number" step="any" data-f="qty" value="' + esc(it.qty) + '"></label>' +
        '<label>Rate<input type="number" step="any" data-f="rate" value="' + esc(it.rate) + '"></label>' +
        '<label class="tax-field">Tax %<input type="number" step="any" data-f="tax" value="' + esc(it.tax) + '"></label></div>' +
        '<label class="hsn-field">HSN / SAC<input data-f="hsn" value="' + esc(it.hsn) + '" placeholder="998314"></label></div>';
    }).join("");
  }
  $("#items").addEventListener("input", function (e) {
    var f = e.target.getAttribute("data-f"); if (!f) return;
    var i = +e.target.closest(".item").getAttribute("data-i");
    state.items[i][f] = ["qty", "rate", "tax"].indexOf(f) >= 0 ? e.target.value : e.target.value;
    changed();
  });
  $("#items").addEventListener("click", function (e) {
    if (!e.target.classList.contains("del")) return;
    var i = +e.target.closest(".item").getAttribute("data-i");
    state.items.splice(i, 1);
    if (!state.items.length) state.items.push(blank().items[0]);
    itemsUI(); changed();
  });
  $("#addItem").addEventListener("click", function () {
    var last = state.items[state.items.length - 1] || {};
    state.items.push({ desc: "", detail: "", hsn: "", qty: 1, rate: 0, tax: last.tax || 0 });
    itemsUI(); changed();
    var inputs = $$("#items .item:last-child input"); if (inputs[0]) inputs[0].focus();
  });

  var saveTimer;
  function changed() {
    render();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      save(DRAFT, state);
      save(PROFILE, { from: state.from, upi: state.upi, upiName: state.upiName, bank: state.bank, terms: state.terms });
    }, 300);
  }

  // ---------- design (Pro) ----------
  function renderDesign() {
    $$("#templates button").forEach(function (b) { b.classList.toggle("on", (pro ? state.template : "classic") === b.getAttribute("data-tpl")); });
    $$("#swatches button").forEach(function (b) { b.classList.toggle("on", (pro ? state.accent : COLORS[0]) === b.getAttribute("data-c")); });
    var d = $("#logoDrop"), img = $("#logoImg");
    if (pro && state.from.logo) { img.src = state.from.logo; d.classList.add("has"); } else { d.classList.remove("has"); }
  }
  $("#swatches").innerHTML = COLORS.map(function (c) { return '<button type="button" data-c="' + c + '" style="background:' + c + '" aria-label="Colour ' + c + '"></button>'; }).join("");
  $("#templates").addEventListener("click", function (e) {
    var t = e.target.getAttribute("data-tpl"); if (!t) return;
    if (!pro && t !== "classic") return upsell("Unlock all 4 templates");
    state.template = t; changed();
  });
  $("#swatches").addEventListener("click", function (e) {
    var c = e.target.getAttribute("data-c"); if (!c) return;
    if (!pro) return upsell("Use your brand colour");
    state.accent = c; changed();
  });
  $("#logoDrop").addEventListener("click", function () {
    if (!pro) return upsell("Add your logo to every invoice");
    $("#logoFile").click();
  });
  $("#logoFile").addEventListener("change", function (e) {
    var f = e.target.files[0]; if (!f) return;
    var img = new Image(), url = URL.createObjectURL(f);
    img.onload = function () {
      var max = 600, sc = Math.min(1, max / Math.max(img.width, img.height));
      var cv = document.createElement("canvas"); cv.width = img.width * sc; cv.height = img.height * sc;
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      state.from.logo = cv.toDataURL("image/png"); URL.revokeObjectURL(url); changed();
    };
    img.src = url; e.target.value = "";
  });

  // ---------- modals ----------
  function open(id) { $(id).classList.add("open"); }
  function closeAll() { $$(".modal").forEach(function (m) { m.classList.remove("open"); }); }
  $$(".modal").forEach(function (m) {
    m.addEventListener("click", function (e) { if (e.target === m || e.target.hasAttribute("data-close")) closeAll(); });
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeAll(); });
  function upsell(title) {
    $("#upTitle").textContent = title || "Make every invoice look like yours";
    $("#licenseMsg").textContent = ""; $("#licenseMsg").className = "msg";
    open("#upgradeModal");
  }
  (function setupBuy() {
    $("#upPrice").textContent = cfg.price || "";
    $("#upPriceNote").textContent = cfg.priceNote ? "(" + cfg.priceNote + ")" : "";
    var b = $("#buyBtn"), url = L.checkoutUrl();
    if (url) { b.href = url; b.textContent = "Buy Pro for " + (cfg.price || ""); }
    else { b.removeAttribute("href"); b.textContent = "Pro launching soon"; b.setAttribute("disabled", ""); }
  })();
  $("#btnUpgrade").addEventListener("click", function () { upsell(); });
  $("#activateBtn").addEventListener("click", async function () {
    var m = $("#licenseMsg"), btn = this;
    btn.disabled = true; m.className = "msg"; m.textContent = "Checking…";
    try {
      var r = await L.activate($("#licenseInput").value);
      if (r.ok) {
        pro = true; m.className = "msg ok"; m.textContent = "Pro unlocked. Thank you!";
        render(); refreshClients(); toast("BillKit Pro is active");
        setTimeout(closeAll, 900);
      } else { m.className = "msg err"; m.textContent = r.reason; }
    } catch (e) { m.className = "msg err"; m.textContent = e.message && /configured/.test(e.message) ? e.message : "Couldn't reach the license server. Check your connection and try again."; }
    btn.disabled = false;
  });

  function toast(t) { var el = $("#toast"); el.textContent = t; el.classList.add("show"); clearTimeout(el._t); el._t = setTimeout(function () { el.classList.remove("show"); }, 2200); }

  // ---------- history & clients (Pro) ----------
  function nextNumber(n) {
    var m = String(n || "").match(/^(.*?)(\d+)(\D*)$/);
    if (!m) return (n || "INV") + "-2";
    var next = String(+m[2] + 1); while (next.length < m[2].length) next = "0" + next;
    return m[1] + next + m[3];
  }
  function saveInvoice() {
    if (!pro) return upsell("Save invoices and clients");
    var hist = load(HIST, []);
    if (!state.id) state.id = "i" + Date.now();
    var rec = JSON.parse(JSON.stringify(state)); rec.savedAt = Date.now(); rec.total = calc().total;
    var idx = hist.findIndex(function (h) { return h.id === rec.id; });
    if (idx >= 0) hist[idx] = rec; else hist.unshift(rec);
    save(HIST, hist);
    if (state.to.name) {
      var cl = load(CLIENTS, []).filter(function (c) { return c.name !== state.to.name; });
      cl.unshift(JSON.parse(JSON.stringify(state.to))); save(CLIENTS, cl.slice(0, 200));
    }
    save(DRAFT, state); refreshClients(); toast("Saved " + state.meta.number);
  }
  function refreshClients() {
    var pick = $("#clientPick"), cl = load(CLIENTS, []);
    pick.hidden = !(pro && cl.length);
    $("#clientSelect").innerHTML = '<option value="">Saved clients…</option>' + cl.map(function (c, i) { return '<option value="' + i + '">' + esc(c.name) + "</option>"; }).join("");
  }
  $("#clientSelect").addEventListener("change", function () {
    var c = load(CLIENTS, [])[this.value]; if (!c) return;
    state.to = JSON.parse(JSON.stringify(c)); bindValues(); changed(); this.value = "";
  });
  function bindValues() { $$("[data-bind]").forEach(function (el) { var v = get(state, el.getAttribute("data-bind")); el.value = v == null ? "" : v; }); itemsUI(); }

  function historyUI() {
    var hist = load(HIST, []), box = $("#historyList");
    if (!hist.length) { box.innerHTML = '<p class="muted">No saved invoices yet. Click Save to keep one here.</p>'; }
    else {
      box.innerHTML = '<table class="hist"><thead><tr><th>Invoice</th><th>Client</th><th>Date</th><th class="r">Total</th><th></th></tr></thead><tbody>' +
        hist.map(function (h, i) {
          var t; try { t = new Intl.NumberFormat("en-US", { style: "currency", currency: h.meta.currency }).format(h.total); } catch (e) { t = h.total; }
          return "<tr><td>" + esc(h.meta.number) + "</td><td>" + esc(h.to.name) + "</td><td>" + esc(h.meta.date) + '</td><td class="r">' + esc(t) +
            '</td><td class="r"><button class="btn small" data-act="open" data-i="' + i + '">Open</button><button class="btn small" data-act="dup" data-i="' + i + '">Duplicate</button><button class="btn small" data-act="del" data-i="' + i + '">&times;</button></td></tr>';
        }).join("") + "</tbody></table>";
    }
    var li = L.info(); $("#licenseInfo").innerHTML = li ? "Pro license active" + (li.email ? " for " + esc(li.email) : "") + '. <a href="#" id="deact">Remove from this browser</a>' : "";
    var d = $("#deact"); if (d) d.onclick = function (e) { e.preventDefault(); if (confirm("Remove the Pro license from this browser?")) { L.deactivate(); location.reload(); } };
  }
  $("#historyList").addEventListener("click", function (e) {
    var a = e.target.getAttribute("data-act"); if (!a) return;
    var hist = load(HIST, []), i = +e.target.getAttribute("data-i"), h = hist[i];
    if (a === "del") { if (!confirm("Delete " + h.meta.number + "?")) return; hist.splice(i, 1); save(HIST, hist); return historyUI(); }
    var s = JSON.parse(JSON.stringify(h)); delete s.savedAt; delete s.total;
    if (a === "dup") { s.id = null; s.meta.number = nextNumber(maxNumber()); s.meta.date = today(); s.meta.due = today(15); }
    state = s; bindValues(); changed(); closeAll(); toast(a === "dup" ? "Duplicated as " + s.meta.number : "Opened " + s.meta.number);
  });
  function maxNumber() { var hist = load(HIST, []); return hist.length ? hist[0].meta.number : state.meta.number; }
  $("#btnSave").addEventListener("click", saveInvoice);
  $("#btnHistory").addEventListener("click", function () { if (!pro) return upsell("Keep a history of every invoice"); historyUI(); open("#historyModal"); });
  $("#btnNew").addEventListener("click", function () {
    if (!confirm("Start a new invoice? Unsaved changes to this one will be lost" + (pro ? " (use Save first to keep it)." : "."))) return;
    var b = blank(), n = nextNumber(pro ? maxNumber() : state.meta.number);
    b.from = state.from; b.upi = state.upi; b.upiName = state.upiName; b.bank = state.bank; b.terms = state.terms;
    b.template = state.template; b.accent = state.accent; b.meta.currency = state.meta.currency; b.taxMode = state.taxMode; b.gstSplit = state.gstSplit; b.shipTax = state.shipTax; b.taxLabel = state.taxLabel;
    b.items[0].tax = state.items[0] ? state.items[0].tax : 0;
    b.meta.number = n; state = b; bindValues(); changed();
  });
  function download(name, text, type) {
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: type })); a.download = name; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  $("#exportCsv").addEventListener("click", function () {
    var rows = [["Invoice", "Date", "Due", "Client", "Client tax ID", "Currency", "Total"]];
    load(HIST, []).forEach(function (h) { rows.push([h.meta.number, h.meta.date, h.meta.due, h.to.name, h.to.taxId, h.meta.currency, h.total]); });
    download("billkit-invoices.csv", rows.map(function (r) { return r.map(function (v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; }).join(","); }).join("\n"), "text/csv");
  });
  $("#exportJson").addEventListener("click", function () {
    download("billkit-backup.json", JSON.stringify({ history: load(HIST, []), clients: load(CLIENTS, []), profile: load(PROFILE, null) }, null, 1), "application/json");
  });
  $("#importJson").addEventListener("change", function (e) {
    var f = e.target.files[0]; if (!f) return;
    f.text().then(function (t) {
      var d = JSON.parse(t);
      if (d.history) save(HIST, d.history); if (d.clients) save(CLIENTS, d.clients); if (d.profile) save(PROFILE, d.profile);
      historyUI(); refreshClients(); toast("Backup restored");
    }).catch(function () { toast("That file is not a BillKit backup"); });
  });

  // ---------- PDF ----------
  $("#btnPdf").addEventListener("click", function () {
    var old = document.title;
    document.title = (state.meta.number || "invoice") + (state.to.name ? " - " + state.to.name : "");
    save(DRAFT, state);
    window.print();
    setTimeout(function () { document.title = old; }, 500);
    if (!pro) setTimeout(function () { toast("Tip: Pro removes the BillKit footer and adds your logo"); }, 1200);
  });

  bindFields(); itemsUI(); refreshClients(); render();
  if (/[?&]upgrade/.test(location.search)) upsell();
  L.recheck();
})();
