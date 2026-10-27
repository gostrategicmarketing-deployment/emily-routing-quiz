/* The Medicare Coach routing funnel: shared config + behaviour. Content is visible without this file. */
window.TMC = {
  // Live destinations (checkouts verified 2026-10-16; re-verify before traffic: see README "Open items").
  checkoutFull: "https://join.themedicarecoach.com/mec-bonus",        // $1,497 one-time
  checkoutTwoPay: "https://go.themedicarecoach.com/mec-two-payments",   // 2 x $749
  workshop: "https://go.themedicarecoach.com/free-workshop",
  phone: "785-537-6225",
  shipUrl: "https://www.shiphelp.org",

  // NOT in the project files. Blocks that need them stay hidden until you fill them in
  // (add ?preview=1 to any page URL to see the hidden blocks flagged "link pending").
  guideCheckout: "",     // the $47 Delaying Medicare Guide checkout
  annualReview: "",      // Money Saving Annual Review checkout, if it should be sold directly
  leadEndpoint: ""       // GHL inbound-webhook URL that receives the quiz gate (see README, "Wiring")
};
document.documentElement.classList.add("js");

(function () {
  var T = window.TMC, qs = location.search, preview = /[?&]preview=1/.test(qs);
  function $all(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  // 1) Wire links from the one config. Empty value = leave the link out.
  $all("[data-href]").forEach(function (a) {
    var k = a.getAttribute("data-href"); if (T[k]) a.href = T[k];
  });
  // Blocks that depend on a link we don't have yet.
  $all("[data-needs]").forEach(function (el) {
    var k = el.getAttribute("data-needs");
    if (T[k]) return;
    if (preview) { el.classList.add("pending"); el.setAttribute("data-pending-label", "Link pending: " + k); }
    else el.hidden = true;
  });
  $all("[data-else]").forEach(function (el) {
    if (T[el.getAttribute("data-else")]) el.hidden = true;
  });

  // 2) Carry UTMs / ad ids through the funnel so attribution survives each hop.
  if (qs && qs.length > 1) {
    $all('a[href]').forEach(function (a) {
      var h = a.getAttribute("href");
      if (/^(index|quiz|join|guide|on-medicare|ship)\.html$/.test(h)) a.setAttribute("href", h + qs);
    });
  }

  // 3) Personalise the result pages from the quiz (or from ?p=<profile>&n=<first name> if a workflow redirected here).
  var Q = window.TMCQuiz;
  if (Q) {
    var saved = Q.load(), pk = null, name = "", hsa = false, hot = false;
    var m = /[?&]p=([a-z_]+)/.exec(qs), n = /[?&]n=([^&]+)/.exec(qs);
    if (saved && saved.result) { pk = saved.result.profile; hsa = saved.result.hsa; hot = saved.result.hot; name = (saved.answers && saved.answers.first_name) || ""; }
    else if (m && Q.PROFILES[m[1]]) pk = m[1];
    if (!name && n) { try { name = decodeURIComponent(n[1].replace(/\+/g, " ")).slice(0, 40); } catch (e) {} }
    var P = pk && Q.PROFILES[pk];
    function txt(sel, v) { $all(sel).forEach(function (el) { el.textContent = v; }); }
    $all(".if-profile").forEach(function (el) { el.hidden = !P; });
    $all(".no-profile").forEach(function (el) { el.hidden = !!P; });
    $all(".if-hsa").forEach(function (el) { el.hidden = !hsa; });
    $all(".if-hot").forEach(function (el) { el.hidden = !hot; });
    txt("[data-name]", name || "there");
    $all(".if-name").forEach(function (el) { el.hidden = !name; });
    if (P) {
      txt("[data-profile-name]", P.name); txt("[data-profile-line]", P.line); txt("[data-profile-body]", P.body);
      $all("[data-profile-checks]").forEach(function (ul) {
        ul.innerHTML = ""; P.checks.forEach(function (c) { var li = document.createElement("li"); li.textContent = c; ul.appendChild(li); });
      });
    }
  }

  // 4) Reveal, sticky CTA.
  var els = $all(".rv");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (el) { io.observe(el); });
  } else { els.forEach(function (el) { el.classList.add("in"); }); }

  var sticky = document.querySelector(".sticky-cta"), anchor = document.querySelector("[data-sticky-after]");
  if (sticky && anchor && "IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      sticky.classList.toggle("show", !es[0].isIntersecting && es[0].boundingClientRect.top < 0);
    }).observe(anchor);
  }
})();
