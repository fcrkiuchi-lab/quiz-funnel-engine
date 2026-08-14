"use strict";

const assert = require("assert").strict;
const fs = require("fs");
const path = require("path");
const config = require("../diagnosis-template/config.js");
const workStyleConfig = require("../diagnosis-template/configs/work-style.js");
const { validateConfig, calculateDiagnosis } = require("../diagnosis-template/engine.js");
const { sendResult } = require("../diagnosis-template/integration.js");

const tests = [];

function test(name, run) {
  tests.push({ name: name, run: run });
}

test("ドーシャ設定を検証できる", function () {
  assert.equal(validateConfig(config), config);
});

test("ドーシャ設定の加点先から点数と割合を計算する", function () {
  const result = calculateDiagnosis(config, { q1: "vata", q2: "pitta", q3: "vata", q4: "kapha" });
  assert.deepEqual(result.scores, { vata: 3, pitta: 1, kapha: 1 });
  assert.deepEqual(result.percentages, { vata: 60, pitta: 20, kapha: 20 });
  assert.deepEqual(result.leaders, ["vata"]);
  assert.equal(result.answeredQuestionCount, 4);
});

test("設定差し替えで加点先を変更できる", function () {
  const replacedConfig = JSON.parse(JSON.stringify(config));
  replacedConfig.questions[0].choices[0].scores = { kapha: 2 };
  const result = calculateDiagnosis(replacedConfig, { q1: "vata", q2: "pitta", q3: "vata", q4: "kapha" });
  assert.deepEqual(result.scores, { vata: 1, pitta: 1, kapha: 3 });
  assert.deepEqual(result.leaders, ["kapha"]);
});

test("最高点が同点なら全結果軸を返す", function () {
  const result = calculateDiagnosis(config, { q1: "vata", q2: "pitta", q3: "pitta", q4: "kapha" });
  assert.deepEqual(result.scores, { vata: 2, pitta: 2, kapha: 1 });
  assert.deepEqual(result.leaders, ["vata", "pitta"]);
});

test("第2診断も設定だけで点数と割合を計算する", function () {
  assert.equal(validateConfig(workStyleConfig), workStyleConfig);
  const result = calculateDiagnosis(workStyleConfig, { q1: "explore", q2: "plan", q3: "explore" });
  assert.deepEqual(result.scores, { explore: 3, plan: 1, support: 0 });
  assert.deepEqual(result.percentages, { explore: 75, plan: 25, support: 0 });
  assert.deepEqual(result.leaders, ["explore"]);
});

test("未回答を拒否する", function () {
  assert.throws(function () {
    calculateDiagnosis(config, { q1: "vata", q2: "pitta", q3: "kapha" });
  });
});

test("定義されていない結果軸への加点を拒否する", function () {
  const invalidConfig = JSON.parse(JSON.stringify(config));
  invalidConfig.questions[0].choices[0].scores = { unknown: 1 };
  assert.throws(function () {
    validateConfig(invalidConfig);
  });
});

test("不正な配色を拒否する", function () {
  const invalidConfig = JSON.parse(JSON.stringify(config));
  invalidConfig.theme.primary = "red";
  assert.throws(function () {
    validateConfig(invalidConfig);
  });
});

test("公開ルートとテンプレートに開始・質問・結果画面がある", function () {
  ["index.html", path.join("diagnosis-template", "index.html")].forEach(function verifyPage(relativePath) {
    const page = fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
    assert.match(page, /id="start-screen"/);
    assert.match(page, /id="question-screen"/);
    assert.match(page, /id="result-screen"/);
    assert.match(page, /id="progress-bar"[^>]+aria-labelledby="progress-text"/);
    assert.doesNotMatch(page, /integration\.js/);
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
  const result = calculateDiagnosis(config, { q1: "vata", q2: "pitta", q3: "vata", q4: "kapha" });
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
    scores: { vata: 3, pitta: 1, kapha: 1 },
    percentages: { vata: 60, pitta: 20, kapha: 20 },
    leaders: ["vata"],
    answeredQuestionCount: 4
  });
  assert.deepEqual(state, { status: "sent", httpStatus: 200 });
});

test("rejects an unsafe total before calculating percentages", function () {
  const invalidConfig = JSON.parse(JSON.stringify(config));
  invalidConfig.questions = [invalidConfig.questions[0]];
  invalidConfig.questions[0].choices[0].scores = {
    vata: Number.MAX_SAFE_INTEGER,
    pitta: Number.MAX_SAFE_INTEGER
  };
  assert.throws(function () {
    calculateDiagnosis(invalidConfig, { q1: "vata" });
  }, /安全な整数/);
});

test("rejects a non-positive total before calculating percentages", function () {
  const invalidConfig = JSON.parse(JSON.stringify(config));
  invalidConfig.questions = [invalidConfig.questions[0]];
  let scoreReadCount = 0;
  Object.defineProperty(invalidConfig.questions[0].choices[0].scores, "vata", {
    configurable: true,
    enumerable: true,
    get: function returnPositiveDuringValidationAndZeroDuringScoring() {
      scoreReadCount += 1;
      return scoreReadCount === 1 ? 2 : 0;
    }
  });
  assert.equal(validateConfig(invalidConfig), invalidConfig);
  scoreReadCount = 0;
  assert.throws(function () {
    calculateDiagnosis(invalidConfig, { q1: "vata" });
  }, /全軸の合計点/);
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
