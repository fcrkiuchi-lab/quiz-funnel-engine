"use strict";
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const config = require("../diagnosis-template/config.js");
const engine = require("../diagnosis-template/engine.js");
const app = require("../diagnosis-template/app.js");
engine.validateConfig(config);
assert.equal(config.title, "Find Your Dosha");
assert.equal(config.resultLayout, "scores");
assert.equal(config.questions.length, 7);
assert.deepEqual(config.axes.map(axis => axis.key), ["vata", "pitta", "kapha"]);
assert.deepEqual(config.axes.map(axis => axis.label), ["ヴァータ", "ピッタ", "カパ"]);
// Pin the reviewed dosha question set; update this hash only with an approved question change.
assert.equal(crypto.createHash("sha256").update(JSON.stringify(config.questions)).digest("hex"), "6599eff04f8780fc343b6834d90f56ab124a7cd74b2963d8a6b0b9873d805045");
assert.ok(config.questions.every(question => question.choices.length === 4 &&
  question.choices.slice(0, 3).every(choice => Object.keys(choice.scores).length === 1 && choice.scores[choice.id] === 1) &&
  question.choices[3].id === "none" && Object.values(question.choices[3].scores).every(score => score === 0)));
assert.equal(config.answerHint, "迷ったら、ここ数年でいちばん多かった状態を選んでください。");
assert.ok(config.axes.every(axis => !axis.product && !axis.cta && !axis.visual));
assert.equal(config.presentation.startImage, undefined);
assert.equal(config.commonConcept, undefined);
assert.equal(config.tieBreakerQuestionId, undefined);
const keys = ["vata", "pitta", "kapha"];
const count = config.questions.length;
const choiceKeys = keys.concat("none");
for (let variant = 0; variant < 4 ** count; variant += 1) {
  let remaining = variant;
  const answers = {};
  const scores = {vata: 0, pitta: 0, kapha: 0};
  for (let i = 0; i < count; i += 1) {
    const key = choiceKeys[remaining % 4];
    remaining = Math.floor(remaining / 4);
    answers["q" + (i + 1)] = key;
    if (key !== "none") scores[key] += 1;
  }
  const result = engine.calculateDiagnosis(config, answers);
  const total = scores.vata + scores.pitta + scores.kapha;
  assert.deepEqual(result.scores, scores);
  if (total === 0) {
    assert.equal(result.outcome, "neutral");
    assert.equal(result.percentages, null);
    assert.deepEqual(result.leaders, []);
    continue;
  }
  assert.deepEqual(result.percentages, Object.fromEntries(keys.map(key => [key, Number((scores[key] / total * 100).toFixed(1))])));
  assert.deepEqual(result.leaders, keys.filter(key => scores[key] === Math.max(...Object.values(scores))));
  assert.equal(result.answeredQuestionCount, count);
}
assert.throws(() => engine.calculateDiagnosis(config, {q1: "vata"}));
assert.throws(() => engine.calculateDiagnosis(config, Object.fromEntries(config.questions.map(q => [q.id, q.id === "q7" ? "invalid" : "vata"]))));
console.log("PASS dosha check: pinned question hash, all " + 4 ** count + " scoring combinations, ties and invalid answers");

// Analytics stays off unless a Cloudflare token is set.
assert.equal(config.analytics.provider, "cloudflare");
assert.equal(app.safeAnalytics(config.analytics), config.analytics.token ? app.safeAnalytics(config.analytics) : null);
assert.equal(app.safeAnalytics({ provider: "cloudflare", token: "" }), null);
assert.equal(app.safeAnalytics({ provider: "cloudflare", token: "abc\"><script>" }), null);
assert.equal(app.safeAnalytics({ provider: "other", token: "0123456789abcdef0123456789abcdef" }), null);
assert.deepEqual(app.safeAnalytics({ provider: "cloudflare", token: "0123456789abcdef0123456789abcdef" }),
  { provider: "cloudflare", token: "0123456789abcdef0123456789abcdef" });
console.log("PASS analytics accepts only a plain Cloudflare token and is disabled when empty");
