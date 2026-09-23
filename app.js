(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };

  var form = $("form");
  var situation = $("situation");
  var deadline = $("deadline");
  var progress = $("progress");
  var errorEl = $("error");
  var needle = $("needle");
  var gauge = $("gauge");
  var levelsEl = $("levels");
  var examplesEl = $("examples");
  var srStatus = $("sr-status");
  var result = $("result");
  var care = $("care");
  var pct = $("pct");
  var verdict = $("verdict");
  var tagline = $("tagline");
  var factorsEl = $("factors");
  var advice = $("advice");
  var copyBtn = $("copy");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var last = null;
  var countFrame = 0;

  /* ---------- Build static bits from the engine so labels never drift ---------- */

  Cooked.LEVELS.forEach(function (level) {
    var li = document.createElement("li");
    li.textContent = level.name;
    li.dataset.id = level.id;
    levelsEl.appendChild(li);
  });

  Cooked.EXAMPLES.forEach(function (example) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.textContent = example.label;
    btn.addEventListener("click", function () {
      situation.value = example.text;
      deadline.value = "";
      progress.value = "";
      run();
    });
    examplesEl.appendChild(btn);
  });

  /* ---------- Rendering ---------- */

  function setNeedle(position) {
    needle.style.setProperty("--pos", String(position));
  }

  function markLevel(id) {
    Array.prototype.forEach.call(levelsEl.children, function (li) {
      if (li.dataset.id === id) li.setAttribute("aria-current", "true");
      else li.removeAttribute("aria-current");
    });
  }

  function countUp(el, to) {
    cancelAnimationFrame(countFrame);
    if (reduceMotion) {
      el.textContent = String(to);
      return;
    }
    var start = performance.now();
    var duration = 1300;
    function tick(now) {
      var t = Math.min(1, (now - start) / duration);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = String(Math.round(to * eased));
      if (t < 1) countFrame = requestAnimationFrame(tick);
    }
    countFrame = requestAnimationFrame(tick);
  }

  function renderFactors(res) {
    factorsEl.textContent = "";
    if (res.noSignal) {
      var note = document.createElement("li");
      note.className = "note";
      note.textContent = "Nothing obvious stood out. Add who, when and how bad for a sharper reading.";
      factorsEl.appendChild(note);
      return;
    }
    res.factors.forEach(function (f) {
      var li = document.createElement("li");
      var delta = document.createElement("span");
      delta.className = "delta " + (f.delta > 0 ? "up" : "down");
      delta.textContent = (f.delta > 0 ? "+" : "\u2212") + Math.abs(f.delta);
      li.appendChild(delta);
      li.appendChild(document.createTextNode(f.label));
      factorsEl.appendChild(li);
    });
  }

  function render(res) {
    last = res;
    care.hidden = true;
    result.hidden = false;

    setNeedle(res.position);
    markLevel(res.level.id);
    gauge.setAttribute("aria-label", "Doneness thermometer: " + res.score + " percent, " + res.level.name);

    countUp(pct, res.score);
    verdict.textContent = res.level.name;
    tagline.textContent = res.level.tagline;
    renderFactors(res);
    advice.textContent = res.advice;
    copyBtn.textContent = "Copy result";

    srStatus.textContent = res.score + " percent cooked. Verdict: " + res.level.name + ". " + res.level.tagline;
    result.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
  }

  function renderCare() {
    last = null;
    result.hidden = true;
    care.hidden = false;
    setNeedle(0);
    markLevel("");
    srStatus.textContent = "This isn't a cooked question. Please read the message on the page.";
    care.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
  }

  function showError(message) {
    errorEl.textContent = message;
    situation.setAttribute("aria-invalid", "true");
    situation.focus();
  }

  function clearError() {
    errorEl.textContent = "";
    situation.removeAttribute("aria-invalid");
  }

  /* ---------- Actions ---------- */

  function run() {
    clearError();
    var res = Cooked.assess({
      text: situation.value,
      deadline: deadline.value,
      progress: progress.value
    });
    if (res.error) return showError(res.error);
    if (res.crisis) return renderCare();
    render(res);
  }

  function reset() {
    situation.value = "";
    deadline.value = "";
    progress.value = "";
    clearError();
    result.hidden = true;
    care.hidden = true;
    last = null;
    setNeedle(0);
    markLevel("");
    gauge.setAttribute("aria-label", "Doneness thermometer");
    srStatus.textContent = "";
    situation.focus();
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    run();
  });

  situation.addEventListener("input", clearError);

  // Ctrl/Cmd + Enter submits from the textarea.
  situation.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      run();
    }
  });

  $("reset").addEventListener("click", reset);
  $("care-reset").addEventListener("click", reset);

  copyBtn.addEventListener("click", function () {
    if (!last) return;
    var text = "I'm " + last.score + "% cooked (" + last.level.name + "). Check yours: " + location.href.split("#")[0];
    var done = function (label) {
      copyBtn.textContent = label;
      setTimeout(function () { copyBtn.textContent = "Copy result"; }, 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { done("Copied"); },
        function () { done("Couldn't copy"); }
      );
    } else {
      done("Couldn't copy");
    }
  });
})();
