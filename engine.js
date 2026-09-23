/*!
 * am-i-cooked scoring engine
 *
 * Pure functions, no DOM access. Loads as a global (`Cooked`) in the browser
 * and as a CommonJS module in Node so it can be unit tested.
 *
 * How it works:
 *   1. Start from a neutral base score.
 *   2. Every rule whose pattern matches the text adds (or removes) points.
 *   3. Two optional dropdowns (deadline, progress) add points too.
 *   4. A tiny deterministic jitter (from a hash of the text) keeps different
 *      inputs from landing on identical numbers. Same text, same result.
 *   5. Scores above COMPRESS_FROM are compressed so "charred" takes real effort.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Cooked = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var BASE = 30;
  var MIN_LENGTH = 8;
  var MAX_FACTORS_SHOWN = 6;
  var COMPRESS_FROM = 75;
  var COMPRESS_FACTOR = 0.7;

  /* ------------------------------------------------------------------ */
  /* Doneness levels                                                     */
  /* ------------------------------------------------------------------ */

  var LEVELS = [
    {
      id: "raw", name: "Not cooked", min: 0, max: 19,
      tagline: "You're fine. Suspiciously fine.",
      advice: [
        "Do the thing while you're calm. Future you says thanks.",
        "Nothing's on fire. Write down the next step and do it before you talk yourself into panic.",
        "You're allowed to relax. Just don't let \"fine\" quietly turn into \"tomorrow\"."
      ]
    },
    {
      id: "toasted", name: "Lightly toasted", min: 20, max: 39,
      tagline: "A little browning at the edges. Very recoverable.",
      advice: [
        "Pick the task that scares you most and do it first.",
        "Set a 25-minute timer and start. Browning is normal, burning is optional.",
        "Tell someone what you're working on. It makes it real and harder to dodge."
      ]
    },
    {
      id: "medium", name: "Medium", min: 40, max: 59,
      tagline: "Salvageable, but the oven is on.",
      advice: [
        "List what is actually left. It's usually shorter than it feels.",
        "Cut scope now. Finish the important 70% instead of half of everything.",
        "Silence notifications for two hours and take the first step."
      ]
    },
    {
      id: "well", name: "Well done", min: 60, max: 74,
      tagline: "This one is going to take real effort.",
      advice: [
        "Do the smallest useful piece in the next 20 minutes, then decide what to cut.",
        "Message whoever is waiting on you now. Early honesty costs less than a late excuse.",
        "Sleep is part of the plan. A rested 80% beats an exhausted attempt at 100%."
      ]
    },
    {
      id: "cooked", name: "Cooked", min: 75, max: 89,
      tagline: "Yeah. You're cooked.",
      advice: [
        "Triage: what must happen, what can be late, what can be dropped? Write it down.",
        "Ask for help or an extension before the deadline, not after it.",
        "Stop refreshing and start. One ugly first draft beats a perfect plan."
      ]
    },
    {
      id: "charred", name: "Charred", min: 90, max: 100,
      tagline: "Absolutely cooked. Open a window.",
      advice: [
        "Stop making it worse. Don't touch anything else until you know what the damage is.",
        "Tell the people affected now, plainly and with facts. Then work on the fix.",
        "Breathe, write down what happened in order, and fix one thing at a time."
      ]
    }
  ];

  /* ------------------------------------------------------------------ */
  /* Optional dropdown inputs                                            */
  /* ------------------------------------------------------------------ */

  var DEADLINES = {
    passed:   { w: 30,  why: "The deadline already passed" },
    hours:    { w: 22,  why: "You have hours, not days" },
    tomorrow: { w: 14,  why: "It's due in about a day" },
    days:     { w: 4,   why: "You have a few days" },
    weeks:    { w: -8,  why: "You have weeks" },
    none:     { w: -12, why: "There's no deadline" }
  };

  var PROGRESS = {
    none:   { w: 16,  why: "You haven't started" },
    little: { w: 8,   why: "You've barely started" },
    half:   { w: 0,   why: "" },
    most:   { w: -10, why: "Most of it is done" },
    done:   { w: -20, why: "It's basically done" }
  };

  /* ------------------------------------------------------------------ */
  /* Rules                                                               */
  /*                                                                     */
  /*   re        pattern, matched against lowercased text (no "g" flag)   */
  /*   w         points added (positive = more cooked, negative = less)   */
  /*   why       shown to the user as the reason                          */
  /*   time      skipped when the "how long do you have" dropdown is used */
  /*   progress  skipped when the "how much is done" dropdown is used     */
  /*                                                                     */
  /* Rules with a negative weight are ignored when negated ("no          */
  /* extension", "not prepared"). Each rule counts once.                 */
  /* ------------------------------------------------------------------ */

  var RULES = [
    // Time
    { time: true, re: /\b(was due|were due|already (passed|due)|missed (the|my) deadline|deadline (has )?passed)\b/, w: 26, why: "The deadline already passed" },
    { time: true, re: /\b(tonight|tomorrow|today|this (morning|afternoon|evening)|in (an?|one|two|three|\d+) (hours?|hrs?|minutes?|mins?)|right now|asap)\b/, w: 14, why: "The clock is nearly out" },
    { time: true, re: /\b(next (week|month|semester|year)|in (a )?(few|couple( of)?|\d+) (weeks|months))\b/, w: -8, why: "The deadline is far away" },

    // School
    { re: /\b(exams?|finals?|midterms?|quiz(zes)?|viva|orals?)\b/, w: 8, why: "There's an exam involved" },
    { re: /\b(thesis|dissertation)\b/, w: 8, why: "It's a thesis-sized problem" },
    { progress: true, re: /\b(haven'?t|hasn'?t|have not|never|didn'?t|did not|not yet|yet to)\s+(even\s+)?(started|begun|start|studied|study|opened|read|attended|prepared|written|write|looked|touched)\b|\b(not started|zero progress|nothing (is )?(done|written))\b/, w: 18, why: "You haven't started" },
    { re: /\b(all[- ]?nighter|no sleep|haven'?t slept|didn'?t sleep|running on (coffee|caffeine|fumes|energy drinks?)|sleep[- ]deprived)\b/, w: 10, why: "You're running on no sleep" },
    { re: /\b(fail(ed|ing)?|flunk(ed|ing)?|retake|resit|academic probation)\b/, w: 12, why: "Failing is on the table" },

    // Work
    { re: /\b(boss|manager|ceo|clients?|investors?)\b/, w: 5, why: "Someone with power is involved" },
    { re: /\b(deadline|due|launch|release|demo)\b/, w: 5, why: "There's a deadline attached" },
    { re: /\b(laid off|layoffs?|fired|redundan(t|cy)|performance improvement plan)\b/, w: 16, why: "Your job is on the line" },
    { re: /\b(repl(y|ied)[- ]?all|wrong (person|channel|group|chat|thread)|sent (it |that |this )?to (everyone|everybody|the wrong)|(whole|entire) company)\b/, w: 16, why: "A message reached the wrong people" },
    { re: /\bmeant for (someone|somebody|my|a|the)\b/, w: 8, why: "It wasn't meant for that audience" },
    { re: /\b(drop table|rm -rf|force[- ]?push(ed)?|deleted (the |our |my )?(prod(uction)?|database|db|repo|repository)|dropped (the |our )?(prod(uction)?|database|db))\b/, w: 30, why: "Something irreversible got deleted" },
    { re: /\b(prod|production|the site|the server|our servers?|the website)\b.{0,40}\b(down|crash(ed|ing)?|on fire|broken|melting)\b/, w: 18, why: "Production is on fire" },
    { re: /\b(no back-?ups?|without (a )?back-?ups?|(don'?t|didn'?t|never|can'?t) (have|find|make) (a )?back-?ups?)\b/, w: 15, why: "There's no backup" },

    // Money
    { re: /\b(i'?m broke|am broke|flat broke|overdrawn|overdraft(ed)?|in debt|maxed[- ]out|can'?t (afford|pay)|behind on (rent|payments?|bills)|evict(ed|ion)|bankrupt(cy)?)\b/, w: 16, why: "Money is a problem" },
    { re: /\b(taxes|tax bill|audit|penalty|late fees?)\b/, w: 8, why: "The taxman is involved" },

    // Relationships
    { re: /\b(my ex|texted (my )?ex|left on read|on read|ghosted|read receipts?)\b/, w: 10, why: "An ex or a read receipt is involved" },
    { re: /\b(wrong name|forgot (our |her |his |their |my )?(anniversary|birthday)|missed (our |her |his |their |my )?(anniversary|birthday))\b/, w: 16, why: "You forgot something you can't unforget" },
    { re: /\b(in-?laws?|(girlfriend|boyfriend|partner)'?s (parents|mom|dad|mum))\b/, w: 4, why: "Parents are watching" },
    { re: /\b(cheat(ed|ing)?|caught (me|you|him|her|them)|found out|busted|got caught)\b/, w: 10, why: "Someone found out" },
    { re: /\b(lied|lying|lie to)\b/, w: 8, why: "There's a lie in the mix" },
    { re: /\b(drunk|tipsy|wasted|[1-4] ?am)\b/, w: 6, why: "Late-night decisions were made" },

    // Everyday disasters
    { re: /\b(hungover|hangover)\b/, w: 6, why: "You have a hangover" },
    { re: /\b(sick|flu|fever|covid)\b/, w: 6, why: "You're not at full strength" },
    { re: /\b(missed|miss|late for|running late for) (my |the |our )?(flight|train|bus|interview|meeting|exam|class)\b/, w: 18, why: "You missed something important" },
    { re: /\b(lost|forgot|left)( my| the)? (passport|wallet|keys?|phone|laptop|charger|id)\b/, w: 12, why: "You lost something you need" },
    { re: /\b(car (broke|died|won'?t start)|flat tire|crash(ed)? (my|the) car)\b/, w: 10, why: "Vehicle trouble" },
    { re: /\b(deleted|lost|overwrote|overwritten|corrupted) (the |my |all |our )?(files?|work|essay|project|document|draft|photos)\b/, w: 14, why: "You lost your work" },
    { re: /\b(didn'?t|did not|forgot to|forgot) (to )?save\b/, w: 14, why: "Nothing was saved" },
    { re: /\bno extensions?\b/, w: 8, why: "There's no extension available" },

    // Mitigations
    { re: /\bextension\b/, w: -15, why: "You have an extension" },
    { progress: true, re: /\b(almost|nearly|mostly|pretty much) (done|finished|there|complete)|halfway|half[- ]?(done|way)|\d{2}% (done|complete)/, w: -12, why: "You're most of the way there" },
    { re: /\b(plenty of|lots of|loads of|enough|got) time\b/, w: -14, why: "You have time" },
    { re: /\b(prepared|ready|studied|already (finished|submitted|sent|done)|submitted)\b/, w: -8, why: "You're at least partly prepared" },
    { re: /\b(backed up|back-?ups? (exist|available|saved)|(have|got|there'?s|there is) a back-?up)\b/, w: -14, why: "You have a backup" },
    { re: /\b(understanding|forgiving|supportive|sympathetic|laid[- ]back)\b/, w: -8, why: "Someone is on your side" },
    { re: /\b(ungraded|optional|low[- ]stakes|worth (nothing|0%|1%|2%|5%)|just a (quiz|draft|homework)|dry run)\b/, w: -10, why: "The stakes are low" },
    { re: /\b(apolog(i[sz]ed|y)|explained|talked (to|with)|told (them|him|her|my))\b/, w: -6, why: "You're already communicating about it" },
    { re: /\b((friends?|teammates?|colleagues?|classmates?) (will|can|are going to|is going to) help|got help|getting help)\b/, w: -8, why: "You have help" },
    { re: /\b(refundable|reversible|can undo|undo it|rollback|roll back|revert(ed)?)\b/, w: -10, why: "It's reversible" }
  ];

  /* Text that should never get a joke verdict. */
  var CRISIS = /\b(kill(ing)? myself|suicid\w*|self[- ]?harm|want to die|end it all|hurt myself|overdos\w*|chest pain|can'?t breathe|being abused|domestic violence)\b/;

  /* One-tap examples for the UI (also used by tests). */
  var EXAMPLES = [
    { label: "Chem final tomorrow", text: "I have a chem final tomorrow at 9 and I haven't opened the textbook." },
    { label: "Deleted prod", text: "I deleted the prod database and there are no backups. My boss is asking why the site is down." },
    { label: "Reply-all", text: "I replied all to the entire company with a joke meant for my friend." },
    { label: "Texted my ex", text: "I texted my ex at 2am and got left on read." },
    { label: "Essay, with extension", text: "Essay due next week and I'm about halfway done, plus I have an extension." }
  ];

  /* ------------------------------------------------------------------ */
  /* Helpers                                                             */
  /* ------------------------------------------------------------------ */

  function normalize(text) {
    return String(text == null ? "" : text)
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  // FNV-1a: small, fast, good enough to spread inputs around.
  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // True when the words just before `index` negate what follows ("no extension", "not ready").
  function negated(text, index) {
    var before = text.slice(Math.max(0, index - 16), index);
    return /\b(not|no|never|isn'?t|wasn'?t|aren'?t|don'?t|doesn'?t|haven'?t|hasn'?t|nothing)\s*(\w+\s+)?$/.test(before);
  }

  function levelFor(score) {
    for (var i = LEVELS.length - 1; i >= 0; i--) {
      if (score >= LEVELS[i].min) return { level: LEVELS[i], index: i };
    }
    return { level: LEVELS[0], index: 0 };
  }

  /**
   * Needle position from 0 to 1. Every level owns an equal slice of the gauge
   * so the labels line up, even though the score ranges are different sizes.
   */
  function position(score) {
    var s = Math.max(0, Math.min(100, score));
    var found = levelFor(s);
    var span = found.level.max - found.level.min;
    var frac = span === 0 ? 0 : (s - found.level.min) / span;
    return (found.index + Math.min(1, frac)) / LEVELS.length;
  }

  /* ------------------------------------------------------------------ */
  /* Main entry point                                                    */
  /* ------------------------------------------------------------------ */

  /**
   * @param {{text: string, deadline?: string, progress?: string}} input
   * @returns {{error: string} | {crisis: true} | {
   *   score: number, level: object, position: number,
   *   factors: {label: string, delta: number}[], advice: string, noSignal: boolean
   * }}
   */
  function assess(input) {
    input = input || {};
    var text = normalize(input.text);

    if (text.length < MIN_LENGTH) {
      return { error: "Give me a bit more to work with. One sentence is enough." };
    }
    if (CRISIS.test(text)) return { crisis: true };

    var deadline = DEADLINES[input.deadline] || null;
    var progress = PROGRESS[input.progress] || null;
    var factors = [];
    var sum = 0;

    function add(label, delta) {
      factors.push({ label: label, delta: delta });
      sum += delta;
    }

    if (deadline) add(deadline.why, deadline.w);
    if (progress && progress.w !== 0) add(progress.why, progress.w);

    for (var i = 0; i < RULES.length; i++) {
      var rule = RULES[i];
      if (rule.time && deadline) continue;
      if (rule.progress && progress) continue;
      var m = rule.re.exec(text);
      if (!m) continue;
      if (rule.w < 0 && negated(text, m.index)) continue;
      add(rule.why, rule.w);
    }

    var h = hash(text);
    var raw = BASE + sum + ((h % 7) - 3);
    var score = raw > COMPRESS_FROM ? COMPRESS_FROM + (raw - COMPRESS_FROM) * COMPRESS_FACTOR : raw;
    score = Math.max(1, Math.min(100, Math.round(score)));

    var level = levelFor(score).level;
    factors.sort(function (a, b) { return Math.abs(b.delta) - Math.abs(a.delta); });

    return {
      score: score,
      level: { id: level.id, name: level.name, tagline: level.tagline },
      position: position(score),
      factors: factors.slice(0, MAX_FACTORS_SHOWN),
      advice: level.advice[(h >>> 3) % level.advice.length],
      noSignal: factors.length === 0
    };
  }

  return {
    assess: assess,
    position: position,
    LEVELS: LEVELS,
    EXAMPLES: EXAMPLES,
    DEADLINES: DEADLINES,
    PROGRESS: PROGRESS,
    MAX_LENGTH: 600
  };
});
