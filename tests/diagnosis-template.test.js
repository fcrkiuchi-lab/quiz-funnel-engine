"use strict";

const assert = require("assert").strict;
const fs = require("fs");
const path = require("path");
const config = require("./fixtures/krishna-tea-config.js");
const workStyleConfig = require("../diagnosis-template/configs/work-style.js");
const { validateConfig, calculateDiagnosis } = require("../diagnosis-template/engine.js");
const { resolvePrimaryAxisKey } = require("../diagnosis-template/app.js");
const { sendResult } = require("../diagnosis-template/integration.js");

require("./dosha-restoration.test.js");

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

test("V2設定は7問・各4択として検証できる", function () {
  assert.equal(validateConfig(config), config);
  assert.equal(config.title, "今日の調律チェック");
  assert.equal(config.eyebrow, "今日は、どんな私で過ごしたい？");
  assert.equal(config.description, "今日の私に寄り添う一杯を。");
  assert.equal(config.presentation.notice, "※体質を決める診断ではありません。");
  assert.equal(config.resultTitle, "今日のあなたに寄り添う一杯");
  assert.equal(config.questions.length, 7);
  config.questions.forEach(function verifyChoiceCount(question) {
    assert.equal(question.choices.length, 4);
  });
});

test("質問はA/B/Cの既存配点とDの全軸0点を持つ", function () {
  config.questions.forEach(function verifyQuestionChoices(question, questionIndex) {
    assert.deepEqual(question.choices.map(function readAxis(choice) { return choice.id; }), ["meguru", "yawaragu", "mezameru", "none"]);
    const expectedScore = questionIndex === 6 ? 2 : 1;
    assert.deepEqual(question.choices.slice(0, 3).map(function readScore(choice) {
      return choice.scores[choice.id];
    }), [expectedScore, expectedScore, expectedScore]);
    assert.equal(question.choices[3].label, "D．どれにも当てはまらない");
    assert.deepEqual(question.choices[3].scores, { meguru: 0, yawaragu: 0, mezameru: 0 });
  });
});

test("0点回答を含んでも他回答を従来どおり採点する", function () {
  const answers = Object.assign({}, singleMeguruAnswers, { q2: "none" });
  const result = calculateDiagnosis(config, answers);
  assert.deepEqual(result.scores, { meguru: 4, yawaragu: 1, mezameru: 2 });
});

test("全問noneはタイプも割合も割り当てず判定保留になる", function () {
  const answers = Object.fromEntries(config.questions.map(function makeNoneAnswer(question) {
    return [question.id, "none"];
  }));
  const result = calculateDiagnosis(config, answers);
  assert.deepEqual(result, {
    outcome: "neutral", scores: { meguru: 0, yawaragu: 0, mezameru: 0 },
    percentages: null, leaders: [], answeredQuestionCount: 7
  });
  assert.equal(resolvePrimaryAxisKey(config, answers, result), null);
});

test("結果には各軸の商品情報と共通コンセプトを持つ", function () {
  assert.deepEqual(config.axes.map(function readProduct(axis) {
    return {
      heading: axis.heading,
      name: axis.product.name,
      keywords: axis.product.keywords
    };
  }), [
    { heading: "めぐる", name: "Ayurveda 調律ハーブ紅茶「めぐる」", keywords: "ゆっくり・温かく・繰り返す" },
    { heading: "やわらぐ", name: "Ayurveda 調律ハーブ紅茶「やわらぐ」", keywords: "緩める・冷ます・手放す" },
    { heading: "めざめる", name: "Ayurveda 調律ハーブ紅茶「めざめる」", keywords: "動く・変える・軽くする" }
  ]);
  assert.equal(config.commonConcept.heading, "Ayurveda 調律茶");
  assert.equal(config.commonConcept.body[0], "五感を調律し、本来のあなたへ。");
});

test("Krishnaの4結果は公式サイト掲載のLINE相談CTAを持つ", function () {
  const officialLineUrl = "https://lin.ee/uUx66iz";
  assert.deepEqual(config.axes.map(function readCta(axis) {
    return axis.cta;
  }), [
    { label: "「めぐる」についてLINEで相談する", url: officialLineUrl },
    { label: "「やわらぐ」についてLINEで相談する", url: officialLineUrl },
    { label: "「めざめる」についてLINEで相談する", url: officialLineUrl }
  ]);
  assert.deepEqual(config.neutralResult.cta, {
    label: "紅茶選びをLINEで相談する",
    url: officialLineUrl
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
  assert.match(app, /renderProductDetails/);
  assert.match(app, /renderCommonConcept/);
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

test("割合の計算前に負の合計を拒否する", function () {
  const invalidConfig = JSON.parse(JSON.stringify(config));
  invalidConfig.questions = [invalidConfig.questions[0]];
  delete invalidConfig.tieBreakerQuestionId;
  let scoreReadCount = 0;
  Object.defineProperty(invalidConfig.questions[0].choices[0].scores, "meguru", {
    configurable: true,
    enumerable: true,
    get: function returnPositiveDuringValidationAndNegativeDuringScoring() {
      scoreReadCount += 1;
      return scoreReadCount === 1 ? 2 : -1;
    }
  });
  assert.equal(validateConfig(invalidConfig), invalidConfig);
  scoreReadCount = 0;
  assert.throws(function () {
    calculateDiagnosis(invalidConfig, { q1: "meguru" });
  }, /全軸の合計点/);
});

test("CTAは任意でありHTTPSリンクを設定できる", function () {
  const candidate = JSON.parse(JSON.stringify(config));
  candidate.axes.forEach(function (axis) {
    axis.cta = { label: axis.label + "の商品を見る", url: "https://shop.example.test/products/" + axis.key };
  });
  candidate.neutralResult.cta = { label: "3つの紅茶を見る", url: "https://shop.example.test/tea" };
  assert.equal(validateConfig(candidate), candidate);
  assert.equal(validateConfig(workStyleConfig), workStyleConfig);
  assert.deepEqual(calculateDiagnosis(candidate, singleMeguruAnswers), calculateDiagnosis(config, singleMeguruAnswers));
});

test("危険または不完全なCTAを結果・判定保留の両方で拒否する", function () {
  const invalidCtas = [null, [], {}, { label: "見る" },
    { label: " ", url: "https://shop.example.test/" },
    ...["", "javascript:alert(1)", "data:text/html,hello", "http://shop.example.test/", "/tea", "//shop.example.test/", "https://user:password@shop.example.test/", "https://shop.example.test/\n", "https://shop.example.test/a b", "https:\\shop.example.test", "https://"].map(function (url) { return { label: "見る", url: url }; })];
  ["axis", "neutral"].forEach(function (location) {
    invalidCtas.forEach(function (cta) {
      const candidate = JSON.parse(JSON.stringify(config));
      (location === "axis" ? candidate.axes[0] : candidate.neutralResult).cta = cta;
      assert.throws(function () { validateConfig(candidate); }, /CTA/);
    });
  });
});

test("判定保留設定を検証し省略時にもゼロ合計を処理する", function () {
  [null, [], {}, { title: "保留", body: [] }, { title: "保留", body: [""] }].forEach(function (neutral) {
    const candidate = JSON.parse(JSON.stringify(config));
    candidate.neutralResult = neutral;
    assert.throws(function () { validateConfig(candidate); }, /判定保留/);
  });
  const candidate = JSON.parse(JSON.stringify(config));
  delete candidate.neutralResult;
  const answers = Object.fromEntries(candidate.questions.map(function (q) { return [q.id, "none"]; }));
  assert.equal(calculateDiagnosis(candidate, answers).outcome, "neutral");
});

test("4の7乗の全回答で決定的に完了し判定保留は全問中立だけになる", function () {
  const before = JSON.stringify(config);
  const choiceIds = ["meguru", "yawaragu", "mezameru", "none"];
  let neutralCount = 0;
  for (let combination = 0; combination < 4 ** 7; combination += 1) {
    let code = combination;
    const answers = {};
    const expectedScores = { meguru: 0, yawaragu: 0, mezameru: 0 };
    config.questions.forEach(function (question, index) {
      const choice = choiceIds[code % 4];
      code = Math.floor(code / 4);
      answers[question.id] = choice;
      if (choice !== "none") expectedScores[choice] += index === 6 ? 2 : 1;
    });
    const result = calculateDiagnosis(config, answers);
    assert.deepEqual(result, calculateDiagnosis(config, answers));
    assert.deepEqual(result.scores, expectedScores);
    assert.equal(result.answeredQuestionCount, 7);
    if (combination === 4 ** 7 - 1) {
      neutralCount += 1;
      assert.equal(result.outcome, "neutral");
      assert.equal(result.percentages, null);
      assert.equal(resolvePrimaryAxisKey(config, answers, result), null);
    } else {
      assert.equal(result.outcome, undefined);
      assert.ok(result.leaders.includes(resolvePrimaryAxisKey(config, answers, result)));
      Object.values(result.percentages).forEach(function (percent) {
        assert.ok(Number.isFinite(percent) && percent >= 0 && percent <= 100);
      });
    }
  }
  assert.equal(neutralCount, 1);
  assert.equal(JSON.stringify(config), before);
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
