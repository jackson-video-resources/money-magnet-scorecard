// The scorecard: intro, one question at a time, name and email, then the result and its next step.
// Everything it says comes from config.json. Events go to the Money Magnets dashboard when config.siteKey is set.
(function () {
  var esc = function (s) {
    var d = document.createElement("div");
    d.textContent = s == null ? "" : s;
    return d.innerHTML;
  };
  var track = function (name, props) {
    if (window.LJ && window.LJ.track) window.LJ.track(name, props);
  };
  var $ = function (s) { return document.querySelector(s); };
  fetch("/config.json")
    .then(function (r) { return r.json(); })
    .then(function (c) {
      document.title = c.title;
      document.querySelector('meta[name="description"]').content = c.promise;
      document.documentElement.style.setProperty("--accent", c.brand.color || "#1d1c1a");
      $("#brand").textContent = c.brand.name;
      $("#title").textContent = c.title;
      $("#promise").textContent = c.promise;
      $("#intro").textContent = c.intro || "";
      $("#privacy").textContent = c.privacy || "";
      if (c.siteKey) {
        var t = document.createElement("script");
        t.src = "https://lewiswjackson.com/lj/t.js";
        t.dataset.site = c.siteKey;
        t.defer = true;
        document.body.appendChild(t);
      }
      run(c);
    });

  function run(c) {
    var picks = [];
    var qBox = $('[data-step="q"]');
    var show = function (name) {
      document.querySelectorAll(".step").forEach(function (el) { el.hidden = el.dataset.step !== name; });
      window.scrollTo(0, 0);
    };
    function ask(i) {
      if (i >= c.questions.length) {
        track("sc_answered");
        return show("email");
      }
      var q = c.questions[i];
      qBox.innerHTML =
        '<div class="bar"><span style="width:' + Math.round((i / c.questions.length) * 100) + '%"></span></div>' +
        '<p class="eyebrow">Question ' + (i + 1) + " of " + c.questions.length + "</p><h2>" + esc(q.q) + "</h2>" +
        q.answers.map(function (a, j) { return '<button type="button" class="opt" data-a="' + j + '">' + esc(a.label) + "</button>"; }).join("") +
        (i ? '<button type="button" class="ghost" data-back>Back</button>' : "");
      qBox.querySelectorAll("[data-a]").forEach(function (b) {
        b.onclick = function () { picks[i] = Number(b.dataset.a); ask(i + 1); };
      });
      var back = qBox.querySelector("[data-back]");
      if (back) back.onclick = function () { ask(i - 1); };
      show("q");
    }
    $("#start").onclick = function () {
      track("sc_start");
      ask(0);
    };
    var form = $('[data-step="email"]');
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = form.querySelector("button"), err = $("#err");
      err.hidden = true;
      btn.disabled = true;
      fetch("/api/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ first: form.first.value, email: form.email.value, answers: picks }),
      })
        .then(function (r) { return r.json(); })
        .then(function (r) {
          btn.disabled = false;
          if (r.error) { err.textContent = r.error; err.hidden = false; return; }
          track("sc_result", { result: r.result.id, score: r.score });
          $('[data-step="result"]').innerHTML =
            '<p class="eyebrow">Your score</p><p class="score">' + r.score + "<small> / " + r.max + "</small></p><h1>" +
            esc(r.result.headline) + "</h1><p>" + esc(r.result.text) + '</p><a class="cta" data-track="cta-' + esc(r.result.id) + '" href="' + esc(r.result.cta.url) + '">' + esc(r.result.cta.label) + "</a>";
          show("result");
        })
        .catch(function () {
          btn.disabled = false;
          err.textContent = "Something went wrong. Try again.";
          err.hidden = false;
        });
    });
  }
})();
