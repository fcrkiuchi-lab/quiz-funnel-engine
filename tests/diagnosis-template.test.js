"use strict";

const assert = require("assert").strict;
const config = require("../diagnosis-template/config.js");
const { validateConfig, calculateDiagnosis } = require("../diagnosis-template/engine.js");
const { sendResult } = require("../diagnosis-template/integration.js");

const tests = [];

function test(name, run) {
  tests.push({ name: name, run: run });
}

test("サンプル設定を検証できる", function () {
  assert.equal(validateConfig(config), config);
});

test("設定された加点先から点数と割合を計算する", function () {
  const result = calculateDiagnosis(config, { q1: "a", q2: "b", q3: "a" });
  assert.deepEqual(result.scores, { a: 2, b: 1, c: 0 });
  assert.deepEqual(result.percentages, { a: 66.7, b: 33.3, c: 0 });
  assert.deepEqual(result.leaders, ["a"]);
  assert.equal(result.answeredQuestionCount, 3);
});

test("設定差し替えで加点先を変更できる", function () {
  const replacedConfig = JSON.parse(JSON.stringify(config));
  replacedConfig.questions[0].choices[0].scores = { c: 2 };
  const result = calculateDiagnosis(replacedConfig, { q1: "a", q2: "b", q3: "a" });
  assert.deepEqual(result.scores, { a: 1, b: 1, c: 2 });
  assert.deepEqual(result.leaders, ["c"]);
});

test("最高点が同点なら全結果軸を返す", function () {
  const result = calculateDiagnosis(config, { q1: "a", q2: "b", q3: "c" });
  assert.deepEqual(result.scores, { a: 1, b: 1, c: 1 });
  assert.deepEqual(result.leaders, ["a", "b", "c"]);
});

test("未回答を拒否する", function () {
  assert.throws(function () {
    calculateDiagnosis(config, { q1: "a", q2: "b" });
  });
});

test("定義されていない結果軸への加点を拒否する", function () {
  const invalidConfig = JSON.parse(JSON.stringify(config));
  invalidConfig.questions[0].choices[0].scores = { unknown: 1 };
  assert.throws(function () {
    validateConfig(invalidConfig);
  });
});

test("連携無効時は通信しない", async function () {
  let requestCount = 0;
  const state = await sendResult({ enabled: false }, {}, async function request() {
    requestCount += 1;
  });
  assert.deepEqual(state, { status: "disabled" });
  assert.equal(requestCount, 0);
});

test("連携有効時は規定項目だけをPOSTする", async function () {
  const result = calculateDiagnosis(config, { q1: "a", q2: "b", q3: "a" });
  let capturedUrl;
  let capturedOptions;
  const state = await sendResult({
    enabled: true,
    endpoint: "https://example.com/webhook",
    diagnosisId: "test-v1"
  }, result, async function request(url, options) {
    capturedUrl = url;
    capturedOptions = options;
    return { ok: true, status: 200 };
  });

  assert.equal(capturedUrl, "https://example.com/webhook");
  assert.equal(capturedOptions.method, "POST");
  assert.deepEqual(JSON.parse(capturedOptions.body), {
    schemaVersion: 1,
    diagnosisId: "test-v1",
    scores: { a: 2, b: 1, c: 0 },
    percentages: { a: 66.7, b: 33.3, c: 0 },
    leaders: ["a"],
    answeredQuestionCount: 3
  });
  assert.deepEqual(state, { status: "sent", httpStatus: 200 });
});

(async function runTests() {
  let failures = 0;
  for (const currentTest of tests) {
    try {
      await currentTest.run();
      console.log("PASS " + currentTest.name);
    } catch (error) {
      failures += 1;
      console.error("FAIL " + currentTest.name);
      console.error(error.stack);
    }
  }

  if (failures > 0) {
    process.exitCode = 1;
  } else {
    console.log("All diagnosis template tests passed.");
  }
}());
