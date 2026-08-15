"use strict";

const assert = require("assert").strict;
const fs = require("fs");
const path = require("path");
const config = require("../diagnosis-template/config.js");
const workStyleConfig = require("../diagnosis-template/configs/work-style.js");
const { validateConfig, calculateDiagnosis } = require("../diagnosis-template/engine.js");
const { resolvePrimaryAxisKey } = require("../diagnosis-template/app.js");
const { sendResult } = require("../diagnosis-template/integration.js");

const tests = [];

function test(name, run) {
  tests.push({ name: name, run: run });
}

const singleMeguruAnswers = {
  q1: "meguru",
  q2: "yawaragu",
  q3: "meguru",
  q4: "meguru",
  q5: "yawaragu",
  q6: "meguru",
  q7: "mezameru"
};

test("V2設定は7問・各3択として検証できる", function () {
  assert.equal(validateConfig(config), config);
  assert.equal(config.title, "今日の調律チェック");
  assert.equal(config.brand, "Salon de Krishna");
  assert.equal(config.questions.length, 7);
  config.questions.forEach(function verifyChoiceCount(question) {
    assert.equal(question.choices.length, 3);
  });
});

test("単独最大時はQ7が別軸でも単独最大を返す", function () {
  const result = calculateDiagnosis(config, singleMeguruAnswers);
  assert.deepEqual(result.scores, { meguru: 4, yawaragu: 2, mezameru: 2 });
  assert.deepEqual(result.percentages, { meguru: 50, yawaragu: 25, mezameru: 25 });
  assert.deepEqual(result.leaders, ["meguru"]);
  assert.equal(resolvePrimaryAxisKey(config, singleMeguruAnswers, result), "meguru");
  assert.equal(result.answeredQuestionCount, 7);
});

test("Q7軸を含む最高点同点ではQ7軸を返す", function () {
  const answers = {
    q1: "meguru",
    q2: "meguru",
    q3: "meguru",
    q4: "meguru",
    q5: "yawaragu",
    q6: "yawaragu",
    q7: "yawaragu"
  };
  const result = calculateDiagnosis(config, answers);
  assert.deepEqual(result.scores, { meguru: 4, yawaragu: 4, mezameru: 0 });
  assert.deepEqual(result.leaders, ["meguru", "yawaragu"]);
  assert.equal(resolvePrimaryAxisKey(config, answers, result), "yawaragu");
});

test("Q7軸が最高点同点外ではQ6からQ1へ最新回答で決着する", function () {
  const answers = {
    q1: "meguru",
    q2: "meguru",
    q3: "meguru",
    q4: "yawaragu",
    q5: "yawaragu",
    q6: "yawaragu",
    q7: "mezameru"
  };
  const result = calculateDiagnosis(config, answers);
  assert.deepEqual(result.scores, { meguru: 3, yawaragu: 3, mezameru: 2 });
  assert.deepEqual(result.leaders, ["meguru", "yawaragu"]);
  assert.equal(resolvePrimaryAxisKey(config, answers, result), "yawaragu");
});

test("設定差し替え後も同点優先を使わない診断を計算できる", function () {
  assert.equal(validateConfig(workStyleConfig), workStyleConfig);
  const result = calculateDiagnosis(workStyleConfig, { q1: "explore", q2: "plan", q3: "explore" });
  assert.deepEqual(result.scores, { explore: 3, plan: 1, support: 0 });
  assert.deepEqual(result.percentages, { explore: 75, plan: 25, support: 0 });
  assert.deepEqual(result.leaders, ["explore"]);
  assert.equal(resolvePrimaryAxisKey(workStyleConfig, { q1: "explore", q2: "plan", q3: "explore" }, result), "explore");
});

test("未回答を拒否する", function () {
  assert.throws(function () {
    calculateDiagnosis(config, { q1: "meguru", q2: "yawaragu", q3: "mezameru" });
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

test("公開ルートとテンプレートに開始・質問・結果画面と開始・結果用の屋号がある", function () {
  ["index.html", path.join("diagnosis-template", "index.html")].forEach(function verifyPage(relativePath) {
    const page = fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
    assert.match(page, /id="start-screen"/);
    assert.match(page, /id="question-screen"/);
    assert.match(page, /id="result-screen"/);
    assert.match(page, /id="start-brand"/);
    assert.match(page, /id="result-brand"/);
    assert.match(page, /id="progress-bar"[^>]+aria-labelledby="progress-text"/);
    assert.doesNotMatch(page, /integration\.js/);
  });
});

test("新デザインが機能を妨げないモーション規則を持つ", function () {
  const styles = fs.readFileSync(path.join(__dirname, "..", "diagnosis-template", "styles.css"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "..", "diagnosis-template", "app.js"), "utf8");
  assert.match(styles, /\.screen:not\(\[hidden\]\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(styles, /animation-iteration-count:\s*infinite/);
  assert.match(app, /--axis-percent/);
  assert.match(app, /resolvePrimaryAxisKey/);
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
  const result = calculateDiagnosis(config, singleMeguruAnswers);
  let capturedUrl;
  let capturedOptions;
  const state = await sendResult({
    enabled: true,
    endpoint: "https://example.com/webhook",
    diagnosisId: "test-v2"
  }, result, async function request(url, options) {
    capturedUrl = url;
    capturedOptions = options;
    return { ok: true, status: 200 };
  });

  assert.equal(capturedUrl, "https://example.com/webhook");
  assert.equal(capturedOptions.method, "POST");
  assert.deepEqual(JSON.parse(capturedOptions.body), {
    schemaVersion: 1,
    diagnosisId: "test-v2",
    scores: { meguru: 4, yawaragu: 2, mezameru: 2 },
    percentages: { meguru: 50, yawaragu: 25, mezameru: 25 },
    leaders: ["meguru"],
    answeredQuestionCount: 7
  });
  assert.deepEqual(state, { status: "sent", httpStatus: 200 });
});

test("割合の計算前に安全でない合計を拒否する", function () {
  const invalidConfig = JSON.parse(JSON.stringify(config));
  invalidConfig.questions = [invalidConfig.questions[0]];
  delete invalidConfig.tieBreakerQuestionId;
  invalidConfig.questions[0].choices[0].scores = {
    meguru: Number.MAX_SAFE_INTEGER,
    yawaragu: Number.MAX_SAFE_INTEGER
  };
  assert.throws(function () {
    calculateDiagnosis(invalidConfig, { q1: "meguru" });
  }, /安全な整数/);
});

test("割合の計算前に0以下の合計を拒否する", function () {
  const invalidConfig = JSON.parse(JSON.stringify(config));
  invalidConfig.questions = [invalidConfig.questions[0]];
  delete invalidConfig.tieBreakerQuestionId;
  let scoreReadCount = 0;
  Object.defineProperty(invalidConfig.questions[0].choices[0].scores, "meguru", {
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
    calculateDiagnosis(invalidConfig, { q1: "meguru" });
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
