/* The Medicare Coach routing quiz: ONE source of truth for scoring, profiles and routes.
   Scoring mirrors the live GHL workflow "Medicare Survey Results - Intro Quiz Calculation"
   (read 2026-10-27): age 65+ = +100, not drawing Social Security = +50, insurance
   Employer 0 / Retiree 1 / Marketplace 1 / Medicare 1000 / VA-Tricare 1 / Other 1.
   Age is computed here, in the browser, so the result is instant (the GHL age field lags). */
(function () {
  var INS_POINTS = { employer: 0, retiree: 1, marketplace: 1, medicare: 1000, va: 1, other: 1, medicaid: 1 };

  /* Tag strings follow the live workflow's naming. They were transcribed from the workflow canvas:
     check them against Contacts > Tags before relying on them (see README). */
  var PROFILES = {
    double_payer: {
      name: "The Double-Payer", score: 0, tag: "Quiz: Step 1: The Double Payer (U65, SS-Y, empl) - 0",
      line: "You're drawing Social Security and still have an employer plan.",
      body: "When you're already drawing Social Security before 65, Medicare Parts A and B generally start on their own the month you turn 65, and the Part B premium comes out of your Social Security check. If you're still covered at work, the question nobody asks is whether you actually need Part B yet, or whether you'd be paying for two sets of coverage.",
      checks: ["How your employer plan works alongside Medicare, which depends on the size of the employer and the plan itself", "Whether to keep or delay Part B while you're still covered at work", "If you contribute to an HSA, when those contributions have to stop"]
    },
    half_enrolled: {
      name: "The Half-Enrolled", score: 1, tag: "Quiz: Step 1: The Half-Enrolled (U65, SS-Y, not empl insurance) - 1",
      line: "You're drawing Social Security and don't have an employer plan.",
      body: "Social Security will usually enroll you in Part A and Part B on its own when you turn 65. That feels like being done, but Original Medicare covers only part of the bill, and nobody enrolls you in the pieces that cover the rest: a supplement or Advantage plan, and a drug plan. It's the half of the decision that actually protects your savings.",
      checks: ["What Original Medicare leaves for you to pay", "Whether your doctors take the type of plan you're leaning toward", "The window when companies have to accept you no matter your health"]
    },
    crossroads: {
      name: "The Crossroads", score: 50, tag: "Quiz: Step 1: The Crossroads (U65, SS-N, empl insurance) - 50",
      line: "You haven't started Social Security and you have an employer plan.",
      body: "Because you haven't started Social Security, nothing happens on its own at 65. Keeping your employer plan, adding Medicare, or doing both is your call, and the right answer depends on the size of your employer, what the plan covers, and how it works with Medicare. It's one of the most personal decisions in Medicare, and it's easy to get wrong in either direction.",
      checks: ["Whether your employer plan meets Medicare's rules and costs", "When to start Part B, and what waiting does to your coverage", "If you contribute to an HSA, when those contributions have to stop"]
    },
    assumption_trap: {
      name: "The Assumption Trap", score: 51, tag: "Quiz: Step 1: The Assumption Trap (U65, SS-N, not empl insurance) - 51",
      line: "You haven't started Social Security and you don't have employer coverage.",
      body: "A lot of people assume Medicare will find them when they turn 65. If you haven't started Social Security, it doesn't. You sign up yourself, and when there's no employer plan to fall back on, waiting can mean a lifetime penalty and a gap in coverage. The good news is that this one is simple to get right when you know it's coming.",
      checks: ["Your personal sign-up window, so there's no lapse in coverage", "What happens to a Marketplace plan when you become eligible for Medicare", "How to avoid a penalty that lasts for life"]
    },
    half_in: {
      name: "The Half-In, Half-Out", score: 100, tag: "Quiz: Step 1: The Half In, Half Out (65, SS-Y, empl insurance) - 100",
      line: "You're 65 or older, drawing Social Security, and still covered at work.",
      body: "With Social Security started, you're likely already in Medicare Parts A and B, and still on an employer plan. Whether those two work well together or you're paying for coverage you aren't using depends on details that don't show up on any statement. It's worth knowing before the day you retire, because that's when the clock starts on a few things.",
      checks: ["Whether you're paying for Part B you don't need yet", "How your employer plan and Medicare coordinate", "What to line up before your last day of work"]
    },
    gray_area: {
      name: "The Gray Area", score: 101, tag: "Quiz: Step 1: The Gray Area (65, SS-Y, no empl insurance) - 101",
      line: "You're 65 or older, drawing Social Security, with no employer plan.",
      body: "You're probably enrolled in the government's part of Medicare already, which can make it feel like the decision is made. But the supplement or Advantage plan and the drug plan are still yours to choose, and the six months after Part B starts is the one stretch when companies in most states have to accept you no matter your health. After that, they can ask questions.",
      checks: ["Where you are in your supplement window, and whether it's still open", "Whether you have drug coverage, so there's no penalty building", "Whether your doctors and medications fit the plan you pick"]
    },
    retirement_timer: {
      name: "The Retirement Timer", score: 150, tag: "Quiz: Step 1: The Retirement Timer (65, SS-N, empl insurance) - 150",
      line: "You're 65 or older, working or covered through work, and not on Social Security.",
      body: "As long as you or your spouse are covered through active work, you can usually keep that plan and stay out of Part B without a penalty. The trick is what happens when that coverage ends. There's a set window to join Medicare without penalty, and COBRA and retiree coverage don't count the way people expect. Retiring is the moment this goes wrong for people who didn't plan it.",
      checks: ["Whether your plan counts as active-work coverage", "The sign-up window that opens when your job or coverage ends", "If you contribute to an HSA, when those contributions have to stop"]
    },
    penalty_zone: {
      name: "The Penalty Zone", score: 151, tag: "Quiz: Step 1: The Penalty Zone (65, SS-N, No empl insurance) - 151",
      line: "You're 65 or older with no Social Security and no employer plan.",
      body: "If you're 65 or older and aren't on Social Security or covered through work, you may be past the point where Medicare was supposed to start, and penalties can apply. They tend to last for life, which is why this one deserves a careful look before you do anything. It's often fixable, and the sooner you know where you stand, the better.",
      checks: ["Where you stand today and which sign-up window applies to you", "Which penalties may apply and how to limit them", "How to get covered without a gap"]
    },
    limbo: {
      name: "Medicare Limbo", score: 1000, tag: "Quiz: Step 1: Medicare Limbo (65, SS-N, On Medicare) - 1000+",
      line: "You're on Medicare and under 65.",
      body: "Medicare before 65 follows different rules than the ones most people learn. Your choices for supplements vary by state, and the plans available to you may not look like the ones in the ads. It's an area where general advice tends to be wrong for you.",
      checks: ["Which supplement and Advantage options your state allows", "Whether your doctors and prescriptions are covered where you are", "What changes when you turn 65"]
    },
    on_medicare: {
      name: "Already on Medicare", score: 1100, tag: "Quiz: Step 1: On Medicare 65+ - 1100+",
      line: "You're 65 or older and already on Medicare.",
      body: "You're past the first big decision, so the question now is whether your plan is still the right one. Plans change their doctors, drugs and costs every year, and most people never look.",
      checks: ["Whether your doctors and prescriptions are still covered", "Whether your costs changed for next year", "Whether another option now fits you better"]
    }
  };

  var ROUTES = {
    join: "join.html",
    guide: "guide.html",
    on_medicare: "on-medicare.html",
    ship: "ship.html"
  };
  var ROUTE_TAG = { join: "Quiz Route: Join", guide: "Quiz Route: Guide", on_medicare: "Quiz Route: Already on Medicare", ship: "Quiz Route: Medicaid (SHIP)" };

  /* Set to true to ALSO require $100,000+ saved before sending anyone to the Concierge page.
     Default false: savings only tags the lead and tunes the copy. (Decision logged in README.) */
  var SAVINGS_GATE = false;

  function ageFromDob(s) {
    var m = /^(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{4})$/.exec(String(s || "").trim());
    if (!m) return null;
    var mo = +m[1], d = +m[2], y = +m[3];
    var dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
    var now = new Date(), age = now.getFullYear() - y;
    if (now.getMonth() < mo - 1 || (now.getMonth() === mo - 1 && now.getDate() < d)) age--;
    return (age >= 18 && age <= 110) ? age : null;
  }

  function profileKey(score) {
    if (score >= 1100) return "on_medicare";
    if (score >= 1000) return "limbo";
    if (score >= 151) return "penalty_zone";
    if (score >= 150) return "retirement_timer";
    if (score >= 101) return "gray_area";
    if (score >= 100) return "half_in";
    if (score >= 51) return "assumption_trap";
    if (score >= 50) return "crossroads";
    if (score >= 1) return "half_enrolled";
    return "double_payer";
  }

  /* Emily's own rule (workshop Q&A, 10-16): join the Concierge if you know you're joining Medicare in the
     next 12 months, or you aren't sure your employer plan meets the rules and costs. If it does and you
     aren't joining within 12 months, don't join yet. */
  function routeFor(A, age) {
    var ins = A.ins;
    if (ins === "medicaid") return "ship";
    if (ins === "medicare") return "on_medicare";
    var employer = ins === "employer";
    var route;
    if (age !== null && age >= 65 && !employer) route = "join";          // past 65, no employer plan: the clock is running
    else if (A.timing === "w12" || A.timing === "unsure") route = "join";
    else if (employer && A.fit !== "meets") route = "join";             // employer plan not confirmed to work with Medicare
    else route = "guide";                                               // more than a year out
    if (route === "join" && SAVINGS_GATE && (A.savings === "u100" || A.savings === "na")) route = "guide";
    return route;
  }

  function compute(A) {
    var age = ageFromDob(A.dob);
    var score = (age !== null && age >= 65 ? 100 : 0) + (A.ss === "no" ? 50 : 0) + (INS_POINTS[A.ins] || 0);
    var key = profileKey(score);
    var route = routeFor(A, age);
    var hot = A.savings === "s100" || A.savings === "s500" || A.savings === "s1m";
    var hsa = A.hsa === "yes" && (A.ins === "employer" || A.ins === "marketplace");
    var tags = ["Medicare Intro Quiz Completed", PROFILES[key].tag, ROUTE_TAG[route]];
    if (hot) tags.push("Quiz: $100K+ saved");
    if (hsa) tags.push("Quiz: HSA contributor");
    if (A.ins === "employer" && A.fit !== "meets") tags.push("Quiz: Employer plan unconfirmed");
    return { age: age, score: score, profile: key, route: route, hot: hot, hsa: hsa, tags: tags };
  }

  var KEY = "tmc_route_quiz";
  function save(A, R) { try { sessionStorage.setItem(KEY, JSON.stringify({ answers: A, result: R, at: Date.now() })); } catch (e) {} }
  function load() { try { return JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch (e) { return null; } }

  /* Posts the lead to the GHL inbound webhook when TMC.leadEndpoint is set. Never blocks the visitor for long. */
  function submit(A, R, done) {
    var T = window.TMC || {}, finished = false;
    function go() { if (!finished) { finished = true; done(); } }
    try { if (window.fbq) { window.fbq("track", "Lead"); window.fbq("trackCustom", "QuizRoute", { route: R.route, profile: R.profile }); } } catch (e) {}
    try { (window.dataLayer = window.dataLayer || []).push({ event: "quiz_complete", quiz_route: R.route, quiz_profile: R.profile, quiz_score: R.score }); } catch (e) {}
    if (!T.leadEndpoint) { go(); return; }
    var payload = {
      first_name: A.first_name, email: A.email, phone: A.phone || "",
      date_of_birth: A.dob, age: R.age, social_security: A.ss === "yes" ? "Yes" : "No",
      current_insurance: A.ins, employer_plan_checked: A.fit || "", medicare_start: A.timing || "",
      savings_band: A.savings || "", hsa_contributing: A.hsa || "", most_important: A.priority || "",
      quiz_score: R.score, quiz_profile: PROFILES[R.profile].name, quiz_route: R.route, tags: R.tags,
      page_url: location.href, query: location.search.replace(/^\?/, ""), submitted_at: new Date().toISOString()
    };
    try {
      fetch(T.leadEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), keepalive: true, mode: "cors" })
        .then(go, go);
    } catch (e) { go(); }
    setTimeout(go, 2500);
  }

  window.TMCQuiz = { PROFILES: PROFILES, ROUTES: ROUTES, ageFromDob: ageFromDob, compute: compute, save: save, load: load, submit: submit, profileKey: profileKey };
})();
