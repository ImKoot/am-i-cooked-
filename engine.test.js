"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Cooked = require("../js/engine.js");

const labels = (res) => res.factors.map((f) => f.label);

test("asks for more detail when the text is too short", () => {
  assert.ok(Cooked.assess({ text: "hi" }).error);
  assert.ok(Cooked.assess({ text: "   " }).error);
  assert.ok(Cooked.assess({}).error);
  assert.ok(Cooked.assess().error);
});

test("is deterministic: same input, same output", () => {
  const input = { text: "I have an exam tomorrow and haven't started" };
  assert.deepEqual(Cooked.assess(input), Cooked.assess(input));
});

test("a calm situation with lots of buffer is not cooked", () => {
  const res = Cooked.assess({
    text: "I have a quiz next week but I'm almost done studying and I have plenty of time."
  });
  assert.equal(res.level.id, "raw");
});

test("a disaster with no backups is at least cooked", () => {
  const res = Cooked.assess({
    text: "I deleted the prod database and there are no backups. My boss is asking why the site is down."
  });
  assert.ok(res.score >= 85, `score was ${res.score}`);
});

test("scores stay within 0-100", () => {
  const worst = Cooked.assess({
    text: "deleted the prod database, no backups, the site is down, boss is furious, deadline passed, fired, no sleep, failing, tonight",
    deadline: "passed",
    progress: "none"
  });
  const best = Cooked.assess({
    text: "extension, plenty of time, almost done, backed up, understanding boss, ungraded, next week",
    deadline: "none",
    progress: "done"
  });
  assert.ok(worst.score <= 100 && worst.score >= 0);
  assert.ok(best.score <= 100 && best.score >= 0);
  assert.ok(worst.score > best.score);
});

test("negation stops mitigations from applying", () => {
  const withExt = Cooked.assess({ text: "The essay is due tomorrow but I have an extension." });
  const noExt = Cooked.assess({ text: "The essay is due tomorrow and I have no extension." });
  assert.ok(labels(withExt).includes("You have an extension"));
  assert.ok(!labels(noExt).includes("You have an extension"));
  assert.ok(labels(noExt).includes("There's no extension available"));
});

test("'not ready' does not count as prepared", () => {
  const res = Cooked.assess({ text: "The presentation is on Friday and I am not ready at all." });
  assert.ok(!labels(res).includes("You're at least partly prepared"));
});

test("the deadline dropdown overrides time words in the text", () => {
  const res = Cooked.assess({ text: "The report is due tomorrow morning, I think.", deadline: "weeks" });
  assert.ok(!labels(res).includes("The clock is nearly out"));
  assert.ok(labels(res).includes("You have weeks"));
});

test("the progress dropdown overrides progress words in the text", () => {
  const res = Cooked.assess({ text: "I haven't started the report yet, help.", progress: "most" });
  assert.ok(!labels(res).includes("You haven't started"));
  assert.ok(labels(res).includes("Most of it is done"));
});

test("serious topics return a care message instead of a verdict", () => {
  const res = Cooked.assess({ text: "I want to die and nothing matters anymore" });
  assert.equal(res.crisis, true);
  assert.equal(res.score, undefined);
});

test("curly apostrophes are handled", () => {
  const res = Cooked.assess({ text: "I haven\u2019t started my thesis and it\u2019s due tomorrow." });
  assert.ok(labels(res).includes("You haven't started"));
});

test("gauge position is monotonic and spans 0 to 1", () => {
  assert.equal(Cooked.position(0), 0);
  assert.equal(Cooked.position(100), 1);
  let prev = -1;
  for (let s = 0; s <= 100; s++) {
    const p = Cooked.position(s);
    assert.ok(p >= prev, `position dropped at ${s}`);
    assert.ok(p >= 0 && p <= 1);
    prev = p;
  }
});

test("levels cover 0-100 without gaps or overlaps", () => {
  const L = Cooked.LEVELS;
  assert.equal(L[0].min, 0);
  assert.equal(L[L.length - 1].max, 100);
  for (let i = 1; i < L.length; i++) assert.equal(L[i].min, L[i - 1].max + 1);
});

test("example prompts land where the copy says they should", () => {
  const byLabel = Object.fromEntries(Cooked.EXAMPLES.map((e) => [e.label, Cooked.assess({ text: e.text })]));
  assert.ok(["well", "cooked"].includes(byLabel["Chem final tomorrow"].level.id));
  assert.ok(["cooked", "charred"].includes(byLabel["Deleted prod"].level.id));
  assert.ok(["medium", "well"].includes(byLabel["Reply-all"].level.id));
  assert.ok(["toasted", "medium"].includes(byLabel["Texted my ex"].level.id));
  assert.ok(["raw", "toasted"].includes(byLabel["Essay, with extension"].level.id));
});
