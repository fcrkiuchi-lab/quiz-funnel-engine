"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const config = require("./fixtures/krishna-tea-config.js");
const baseline = require("./fixtures/krishna-baseline-config.js");
const engine = require("../diagnosis-template/engine.js");
const app = require("../diagnosis-template/app.js");
const baselineApp = require("./fixtures/krishna-baseline-app.js");
const sample = require("../diagnosis-template/configs/work-style.js");

const engineHash = crypto.createHash("sha256")
  .update(fs.readFileSync(path.join(__dirname, "../diagnosis-template/engine.js"))).digest("hex");
assert.equal(engineHash, "e4ef6f2a83e711226eeedb94597018bd9ec9681fd1c0712bc87219c052c19a35");
assert.deepEqual(config.questions, baseline.questions);
assert.equal(config.tieBreakerQuestionId, baseline.tieBreakerQuestionId);
assert.equal(config.presentation.notice, "※体質を決める診断ではありません。");
assert.deepEqual(config.neutralResult.body, baseline.neutralResult.body);
assert.deepEqual(config.neutralResult.cta, baseline.neutralResult.cta);
assert.deepEqual(config.commonConcept, baseline.commonConcept);
for (let index = 0; index < config.axes.length; index += 1) {
  const { heading, visual, ...unchangedAxis } = config.axes[index];
  const { heading: oldHeading, ...baselineAxis } = baseline.axes[index];
  assert.deepEqual(unchangedAxis, baselineAxis);
  assert.equal(heading, unchangedAxis.label);
  const safe = app.safeVisual(visual);
  assert.ok(safe);
  assert.ok(fs.existsSync(path.join(__dirname, "../diagnosis-template/assets", safe.file)));
}
console.log("PASS engine bytes, all questions, scoring, product content, CTA and neutral body preserved");

assert.ok(app.safeVisual(config.presentation.startImage));
for (const file of ["../secret.png", "https://example.test/a.png", "//example.test/a.png", "data:image/png,a", "x.svg", "x.png?q=1", "a\\x.png", "a%2f.png", "", null, 1]) {
  assert.equal(app.safeVisual({ file, alt: "test" }), null, String(file));
}
assert.equal(app.safeVisual({ file: "safe.png", alt: "" }), null);
assert.equal(app.safeVisual({ file: "safe.png", alt: "test", color: "url(https://example.test)" }).color, null);
console.log("PASS local-image allowlist rejects external URLs, traversal and invalid color");

const counts = { meguru: 0, yawaragu: 0, mezameru: 0, neutral: 0 };
for (let variant = 0; variant < 4 ** config.questions.length; variant += 1) {
  let remaining = variant;
  const answers = {};
  for (const question of config.questions) {
    answers[question.id] = question.choices[remaining % 4].id;
    remaining = Math.floor(remaining / 4);
  }
  const current = engine.calculateDiagnosis(config, answers);
  const previous = engine.calculateDiagnosis(baseline, answers);
  assert.deepEqual(current, previous);
  const key = app.resolvePrimaryAxisKey(config, answers, current);
  assert.equal(key, baselineApp.resolvePrimaryAxisKey(baseline, answers, previous));
  counts[key || "neutral"] += 1;
}
assert.deepEqual(counts, { meguru: 5461, yawaragu: 5461, mezameru: 5461, neutral: 1 });
console.log("PASS 16,384 answer combinations match baseline", JSON.stringify(counts));

engine.validateConfig(sample);
assert.equal(sample.presentation, undefined);
assert.ok(sample.axes.every((axis) => !axis.visual && !axis.cta));
console.log("PASS existing work-style sample remains presentation-free");
