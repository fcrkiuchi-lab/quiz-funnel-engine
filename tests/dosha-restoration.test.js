"use strict";
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const config = require("../diagnosis-template/config.js");
const engine = require("../diagnosis-template/engine.js");
engine.validateConfig(config);
assert.equal(config.title, "ドーシャチェック");
assert.equal(config.resultLayout, "scores");
assert.equal(config.questions.length, 4);
assert.deepEqual(config.axes.map(axis => axis.key), ["vata", "pitta", "kapha"]);
assert.deepEqual(config.axes.map(axis => axis.label), ["ヴァータ", "ピッタ", "カパ"]);
assert.equal(crypto.createHash("sha256").update(JSON.stringify(config.questions)).digest("hex"), "2aab129b6023e14cc5b80397e26e7e0f1d100ed242d881ea8e28583f4bfbaa6c");
assert.ok(config.axes.every(axis => !axis.product && !axis.cta && !axis.visual));
assert.equal(config.presentation.startImage, undefined);
assert.equal(config.commonConcept, undefined);
assert.equal(config.tieBreakerQuestionId, undefined);
const keys = ["vata", "pitta", "kapha"];
for (let variant = 0; variant < 81; variant += 1) {
  let remaining = variant;
  const answers = {};
  const scores = {vata: 0, pitta: 0, kapha: 0};
  for (let i = 0; i < 4; i += 1) {
    const key = keys[remaining % 3];
    remaining = Math.floor(remaining / 3);
    answers["q" + (i + 1)] = key;
    scores[key] += i === 0 ? 2 : 1;
  }
  const result = engine.calculateDiagnosis(config, answers);
  assert.deepEqual(result.scores, scores);
  assert.deepEqual(result.percentages, Object.fromEntries(keys.map(key => [key, scores[key] * 20])));
  assert.deepEqual(result.leaders, keys.filter(key => scores[key] === Math.max(...Object.values(scores))));
  assert.equal(result.answeredQuestionCount, 4);
}
assert.throws(() => engine.calculateDiagnosis(config, {q1: "vata"}));
assert.throws(() => engine.calculateDiagnosis(config, {q1: "vata",q2:"pitta",q3:"kapha",q4:"none"}));
console.log("PASS dosha restoration: original question hash, all 81 scoring combinations, ties and invalid answers");
