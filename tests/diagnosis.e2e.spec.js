"use strict";

const { test, expect } = require("@playwright/test");

function monitorPage(page) {
  const consoleIssues = [];
  const scriptFailures = [];

  page.on("console", function recordConsole(message) {
    if (message.type() === "error" || message.type() === "warning") {
      consoleIssues.push(message.type() + ": " + message.text());
    }
  });
  page.on("pageerror", function recordPageError(error) {
    consoleIssues.push("pageerror: " + error.message);
  });
  page.on("requestfailed", function recordFailedRequest(request) {
    if (request.resourceType() === "script") {
      scriptFailures.push(request.url() + ": " + request.failure().errorText);
    }
  });
  page.on("response", function recordFailedResponse(response) {
    if (response.request().resourceType() === "script" && !response.ok()) {
      scriptFailures.push(response.url() + ": HTTP " + response.status());
    }
  });

  return { consoleIssues: consoleIssues, scriptFailures: scriptFailures };
}

async function expectQuestionFocus(page, prompt) {
  const legend = page.locator("#question-title");
  await expect(legend).toHaveText(prompt);
  await expect(legend).toHaveAttribute("tabindex", "-1");
  await expect(legend).toBeFocused();
  const focusStyle = await legend.evaluate(function readFocusStyle(element) {
    const style = getComputedStyle(element);
    return {
      outlineColor: style.outlineColor,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth
    };
  });
  expect(focusStyle.outlineStyle).toBe("solid");
  expect(parseFloat(focusStyle.outlineWidth)).toBeGreaterThan(0);
  expect(focusStyle.outlineColor).not.toBe("rgba(0, 0, 0, 0)");
}

async function expectNoHorizontalOverflow(page) {
  const widths = await page.evaluate(function measureWidths() {
    return {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth
    };
  });
  expect(widths.clientWidth).toBe(375);
  expect(widths.scrollWidth).toBeLessThanOrEqual(widths.clientWidth);
}

async function expectVisibleCardFitsViewport(page) {
  const measurement = await page.evaluate(function measureVisibleCard() {
    const card = document.querySelector(".card.screen:not([hidden])");
    const cardStyle = getComputedStyle(card);
    const cardRect = card.getBoundingClientRect();
    const contentLeft = cardRect.left + parseFloat(cardStyle.borderLeftWidth) + parseFloat(cardStyle.paddingLeft);
    const contentRight = cardRect.right - parseFloat(cardStyle.borderRightWidth) - parseFloat(cardStyle.paddingRight);
    const outOfBounds = Array.from(card.querySelectorAll("button, input")).filter(function findOutOfBoundsControl(control) {
      if (control.closest("[hidden]")) {
        return false;
      }
      const rect = control.getBoundingClientRect();
      return rect.left < contentLeft || rect.right > contentRight;
    }).map(function readControl(control) {
      return control.id || control.name || control.type;
    });
    return {
      cardScrollLeft: card.scrollLeft,
      overflowX: cardStyle.overflowX,
      outOfBounds: outOfBounds,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    };
  });
  expect(measurement.cardScrollLeft).toBe(0);
  expect(measurement.overflowX).toBe("clip");
  expect(measurement.outOfBounds).toEqual([]);
  expect(measurement.scrollWidth).toBe(375);
  expect(measurement.clientWidth).toBe(375);
}

async function expectReducedMotion(page) {
  await expect.poll(function readsReducedMotionPreference() {
    return page.evaluate(function readReducedMotionPreference() {
      return matchMedia("(prefers-reduced-motion: reduce)").matches;
    });
  }).toBe(true);
}

async function readV2Motion(page, selector, pseudoElement) {
  return page.locator(selector).evaluate(function readMotion(element, pseudo) {
    const style = getComputedStyle(element, pseudo);
    return {
      animationName: style.animationName,
      animationDuration: style.animationDuration,
      animationIterationCount: style.animationIterationCount,
      pointerEvents: style.pointerEvents
    };
  }, pseudoElement);
}

async function expectStaticV2Motion(page, selector, pseudoElement) {
  const motion = await readV2Motion(page, selector, pseudoElement);
  expect(motion.animationName).toBe("none");
  expect(motion.pointerEvents).toBe("none");
}

async function readV2AnimationProgress(page, selector, pseudoElement, animationName) {
  return page.locator(selector).evaluate(function readAnimationProgress(element, details) {
    const style = getComputedStyle(element, details.pseudoElement);
    const animation = document.getAnimations().find(function findAnimation(candidate) {
      return candidate.animationName === details.animationName;
    });
    return {
      animationName: style.animationName,
      opacity: parseFloat(style.opacity),
      currentTime: animation ? Number(animation.currentTime) : null,
      playState: animation ? animation.playState : null
    };
  }, { pseudoElement: pseudoElement, animationName: animationName });
}

test.beforeEach(async function enableReducedMotion({ page }) {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("plays one-shot V2 motion only on the start and result screens", async function ({ page }) {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("./");

  const templatePage = await page.context().newPage();
  await templatePage.emulateMedia({ reducedMotion: "reduce" });
  await templatePage.goto("./diagnosis-template/");
  await expect(templatePage.locator(".start-motion")).toHaveAttribute("aria-hidden", "true");
  await expect(templatePage.locator(".result-motion")).toHaveAttribute("aria-hidden", "true");
  await expectStaticV2Motion(templatePage, ".shirodhara-illustration");
  await expectStaticV2Motion(templatePage, ".singing-bowl-illustration");
  await expectStaticV2Motion(templatePage, ".bowl-ripples");
  expect(await templatePage.locator(".start-motion").innerHTML()).toBe(await page.locator(".start-motion").innerHTML());
  expect(await templatePage.locator(".result-motion").innerHTML()).toBe(await page.locator(".result-motion").innerHTML());
  await templatePage.close();

  const startMotion = await readV2Motion(page, ".shirodhara-illustration");
  expect(startMotion).toEqual({
    animationName: "shirodhara-enter",
    animationDuration: "2.7s",
    animationIterationCount: "1",
    pointerEvents: "none"
  });

  await page.waitForTimeout(220);
  const visibleStartMotion = await readV2AnimationProgress(page, ".shirodhara-illustration", undefined, "shirodhara-enter");
  expect(visibleStartMotion.opacity).toBeGreaterThan(0.1);
  expect(visibleStartMotion.playState).toBe("running");

  await page.waitForTimeout(3000);
  const settledStartMotion = await readV2AnimationProgress(page, ".shirodhara-illustration", undefined, "shirodhara-enter");
  expect(settledStartMotion.opacity).toBeCloseTo(0.48, 2);

  await page.locator("#start-button").click();
  await expect(page.locator("#question-screen .start-motion, #question-screen .result-motion")).toHaveCount(0);
  for (let questionNumber = 1; questionNumber <= 7; questionNumber += 1) {
    await page.locator("input[name=q" + questionNumber + "]").first().check();
    await page.locator("#next-button").click();
  }

  await expect(page.locator("#result-screen")).toBeVisible();
  const freshBowl = await readV2AnimationProgress(page, ".singing-bowl-illustration", undefined, "singing-bowl-enter");
  const freshRipple = await readV2AnimationProgress(page, ".bowl-ripples", undefined, "bowl-ripple");
  expect(freshBowl.playState).toBe("running");
  expect(freshRipple.playState).toBe("running");
  expect(freshBowl.currentTime).toBeLessThan(800);
  expect(freshRipple.currentTime).toBeLessThan(800);
  const resultMotion = [
    await readV2Motion(page, ".singing-bowl-illustration"),
    await readV2Motion(page, ".bowl-ripples")
  ];
  expect(resultMotion).toEqual([
    {
      animationName: "singing-bowl-enter",
      animationDuration: "1.8s",
      animationIterationCount: "1",
      pointerEvents: "none"
    },
    {
      animationName: "bowl-ripple",
      animationDuration: "1.8s",
      animationIterationCount: "1",
      pointerEvents: "none"
    }
  ]);
  await page.locator("#restart-button").click();
  await expect(page.locator("#start-screen")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("completes the published-root tuning-check flow in Edge at 375px", async function ({ page }) {
  const monitor = monitorPage(page);
  await page.goto("./");
  await expectReducedMotion(page);
  expect(await page.evaluate(function readUserAgent() { return navigator.userAgent; })).toMatch(/Edg\//);
  await expect(page.locator("#start-screen")).toBeVisible();
  await expect.poll(function scriptsLoaded() {
    return page.evaluate(function checkGlobals() {
      return typeof globalThis.DiagnosisConfig === "object" &&
        typeof globalThis.DiagnosisEngine === "object";
    });
  }).toBe(true);
  await expect(page.locator("#start-brand")).toHaveText("");
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "チェックをはじめる" }).click();
  await expectQuestionFocus(page, "Q1．今のあなたに一番近いのは？");
  await expect(page.locator("#question-screen .brand")).toHaveCount(0);
  await expect(page.locator("#progress-bar")).toHaveAttribute("aria-labelledby", "progress-text");
  await page.getByLabel("A．頭の中が忙しく、あれこれ考えている").check();
  await page.getByRole("button", { name: "次の質問へ" }).click();
  await expectQuestionFocus(page, "Q2．今、どんな時間があったら嬉しい？");
  await page.getByLabel("B．静かな場所でひと息ついて、頭を休めたい").check();

  await page.getByRole("button", { name: "前の質問へ" }).click();
  await expectQuestionFocus(page, "Q1．今のあなたに一番近いのは？");
  await expect(page.getByLabel("A．頭の中が忙しく、あれこれ考えている")).toBeChecked();
  await page.getByRole("button", { name: "次の質問へ" }).click();
  await expectQuestionFocus(page, "Q2．今、どんな時間があったら嬉しい？");
  await expect(page.getByLabel("B．静かな場所でひと息ついて、頭を休めたい")).toBeChecked();

  await page.getByRole("button", { name: "次の質問へ" }).click();
  await expectQuestionFocus(page, "Q3．今の気分を「空」で表すなら？");
  await page.getByLabel("A．風が吹いて、雲がどんどん流れている空").check();
  await page.getByRole("button", { name: "次の質問へ" }).click();
  await expectQuestionFocus(page, "Q4．今、一番惹かれる景色は？");
  await page.getByLabel("A．木々が風に揺れる、広々とした草原").check();
  await page.getByRole("button", { name: "次の質問へ" }).click();
  await expectQuestionFocus(page, "Q5．今日の身体に近いのは？");
  await page.getByLabel("B．熱がこもる、または肩や身体に力が入りやすい感じ").check();
  await page.getByRole("button", { name: "次の質問へ" }).click();
  await expectQuestionFocus(page, "Q6．もし今、ひとつだけ手放せるとしたら？");
  await page.getByLabel("A．頭の中の「あれもしなきゃ、これもしなきゃ」").check();
  await page.getByRole("button", { name: "次の質問へ" }).click();
  await expectQuestionFocus(page, "Q7．最後は直感で✨\n今、あなたが一番惹かれる言葉は？");
  await page.getByLabel("A．ゆっくり。温かく。もう一度。").check();
  await page.getByRole("button", { name: "結果を見る" }).click();

  await expect(page.locator("#result-screen")).toBeVisible();
  await expect(page.locator("#result-brand")).toHaveText("");
  await expect(page.locator("#result-title")).toHaveText("✨ 今日のあなたに必要な調律は……");
  await expect(page.locator("#result-description")).toBeHidden();
  await expect(page.locator(".primary-axis")).toHaveCount(1);
  await expect(page.locator(".primary-axis h3")).toHaveText("🌿 めぐる");
  await expect(page.locator(".result-emphasis")).toHaveText("「動くこと」より「落ち着くこと」が必要なのかもしれません。");
  await expect(page.locator(".product-details h4")).toHaveText("Ayurveda 調律ハーブ紅茶「めぐる」");
  await expect(page.locator(".product-details")).toContainText("ヴァータ");
  await expect(page.locator(".product-details")).toContainText("30g（リーフティー）");
  await expect(page.locator(".common-concept h3")).toHaveText("Ayurveda 調律茶");
  await expect(page.locator(".common-concept")).toContainText("3つの調律から、今日のあなたに寄り添う一杯を。");
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "もう一度回答する" }).click();
  await expect(page.locator("#start-screen")).toBeVisible();
  await expect(page.getByRole("button", { name: "チェックをはじめる" })).toBeFocused();
  await page.getByRole("button", { name: "チェックをはじめる" }).click();
  await expectQuestionFocus(page, "Q1．今のあなたに一番近いのは？");
  await expect(page.locator('input[name="q1"]:checked')).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  expect(monitor.scriptFailures).toEqual([]);
  expect(monitor.consoleIssues).toEqual([]);
});

test("reserved question IDs retain answers and score correctly", async function ({ page }) {
  const monitor = monitorPage(page);
  const reservedConfig = {
    id: "reserved-ids-v1",
    title: "予約ID診断",
    eyebrow: "回帰テスト",
    description: "予約語に似た質問IDを検証します。",
    resultTitle: "結果",
    resultDescription: "回答の集計結果です。",
    labels: {
      start: "開始",
      next: "次へ",
      previous: "戻る",
      finish: "結果",
      restart: "再回答"
    },
    theme: {
      background: "#ffffff",
      surface: "#ffffff",
      primary: "#333333",
      primaryText: "#ffffff",
      accent: "#eeeeee",
      text: "#111111",
      muted: "#555555",
      border: "#cccccc"
    },
    axes: [
      { key: "first", label: "第一軸", resultText: "第一軸の説明" },
      { key: "second", label: "第二軸", resultText: "第二軸の説明" }
    ],
    questions: [
      {
        id: "length",
        prompt: "lengthの質問",
        choices: [
          { id: "first", label: "第一軸へ2点", scores: { first: 2 } },
          { id: "second", label: "第二軸へ2点", scores: { second: 2 } }
        ]
      },
      {
        id: "__proto__",
        prompt: "__proto__の質問",
        choices: [
          { id: "first", label: "第一軸へ1点", scores: { first: 1 } },
          { id: "second", label: "第二軸へ1点", scores: { second: 1 } }
        ]
      }
    ]
  };

  await page.route("**/diagnosis-template/config.js", function replaceConfig(route) {
    return route.fulfill({
      contentType: "text/javascript; charset=utf-8",
      body: "globalThis.DiagnosisConfig = " + JSON.stringify(reservedConfig) + ";"
    });
  });
  await page.goto("./");
  await expectReducedMotion(page);
  await page.getByRole("button", { name: "開始" }).click();
  await expectQuestionFocus(page, "lengthの質問");
  await page.getByLabel("第一軸へ2点").check();
  await page.getByRole("button", { name: "次へ" }).click();
  await expectQuestionFocus(page, "__proto__の質問");
  await page.getByLabel("第二軸へ1点").check();
  await page.getByRole("button", { name: "戻る" }).click();
  await expectQuestionFocus(page, "lengthの質問");
  await expect(page.getByLabel("第一軸へ2点")).toBeChecked();
  await page.getByRole("button", { name: "次へ" }).click();
  await expectQuestionFocus(page, "__proto__の質問");
  await expect(page.getByLabel("第二軸へ1点")).toBeChecked();
  await page.getByRole("button", { name: "結果" }).click();

  await expect(page.locator(".primary-axis h3")).toHaveText("第一軸");
  await expect(page.locator(".primary-axis")).toContainText("第一軸の説明");
  await expect(page.locator("#result-rows tr")).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  expect(monitor.scriptFailures).toEqual([]);
  expect(monitor.consoleIssues).toEqual([]);
});

test("keeps every V2 card at scrollLeft zero while controls receive focus", async function ({ page }) {
  async function answerAndAdvance(choiceIndex, questionNumber) {
    const choice = page.locator("input[name=q" + questionNumber + "]").nth(choiceIndex);
    await choice.focus();
    await expectVisibleCardFitsViewport(page);
    await choice.check();
    await page.locator("#next-button").focus();
    await expectVisibleCardFitsViewport(page);
    await page.locator("#next-button").click();
  }

  async function openResult(choices) {
    await page.goto("./");
    await page.locator("#start-button").focus();
    await expectVisibleCardFitsViewport(page);
    await page.locator("#start-button").click();
    for (let questionNumber = 1; questionNumber <= choices.length; questionNumber += 1) {
      await answerAndAdvance(choices[questionNumber - 1], questionNumber);
    }
    await expect(page.locator("#result-screen")).toBeVisible();
    await expectStaticV2Motion(page, ".singing-bowl-illustration");
    await expectStaticV2Motion(page, ".bowl-ripples");
    await page.locator("#restart-button").focus();
    await expectVisibleCardFitsViewport(page);
    await page.locator("#restart-button").click();
    await expect(page.locator("#start-screen")).toBeVisible();
    await expectStaticV2Motion(page, ".shirodhara-illustration");
    await expectVisibleCardFitsViewport(page);
  }

  await page.goto("./");
  await expectStaticV2Motion(page, ".shirodhara-illustration");
  await page.locator("#start-button").focus();
  await expectVisibleCardFitsViewport(page);
  await page.locator("#start-button").click();
  await expectQuestionFocus(page, "Q1．今のあなたに一番近いのは？");
  await page.locator("input[name=q1]").first().focus();
  await expectVisibleCardFitsViewport(page);
  await page.locator("input[name=q1]").first().check();
  await page.locator("#next-button").focus();
  await expectVisibleCardFitsViewport(page);
  await page.locator("#next-button").click();
  for (let questionNumber = 2; questionNumber <= 6; questionNumber += 1) {
    await answerAndAdvance(0, questionNumber);
  }
  await expectQuestionFocus(page, "Q7．最後は直感で✨\n今、あなたが一番惹かれる言葉は？");
  await page.locator("input[name=q7]").first().focus();
  await expectVisibleCardFitsViewport(page);
  await page.locator("#previous-button").focus();
  await expectVisibleCardFitsViewport(page);
  await page.locator("#next-button").focus();
  await expectVisibleCardFitsViewport(page);

  await openResult([0, 2, 1, 2, 1, 2, 0]);
  await openResult([1, 1, 2, 0, 0, 1, 2]);
  await openResult([2, 0, 0, 1, 2, 0, 1]);
});
