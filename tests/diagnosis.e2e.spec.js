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
    return { outlineColor: style.outlineColor, boxShadow: style.boxShadow };
  });
  expect(focusStyle.outlineColor).toBe("rgb(0, 0, 0)");
  expect(focusStyle.boxShadow).toContain("rgb(255, 255, 255)");
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

test("completes the published-root dosha flow in Edge at 375px", async function ({ page }) {
  const monitor = monitorPage(page);
  await page.goto("/");
  expect(await page.evaluate(function readUserAgent() { return navigator.userAgent; })).toMatch(/Edg\//);
  await expect(page.locator("#start-screen")).toBeVisible();
  await expect.poll(function scriptsLoaded() {
    return page.evaluate(function checkGlobals() {
      return typeof globalThis.DiagnosisConfig === "object" &&
        typeof globalThis.DiagnosisEngine === "object";
    });
  }).toBe(true);
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "診断をはじめる" }).click();
  await expectQuestionFocus(page, "予定を立てるとき、最も近いものは？");
  await expect(page.locator("#progress-bar")).toHaveAttribute("aria-labelledby", "progress-text");
  await page.getByLabel("まず動いてから柔軟に調整する").check();
  await page.getByRole("button", { name: "次の質問へ" }).click();
  await expectQuestionFocus(page, "作業中に心地よいのは？");
  await page.getByLabel("成果や進み具合が明確なこと").check();

  await page.getByRole("button", { name: "前の質問へ" }).click();
  await expectQuestionFocus(page, "予定を立てるとき、最も近いものは？");
  await expect(page.getByLabel("まず動いてから柔軟に調整する")).toBeChecked();
  await page.getByRole("button", { name: "次の質問へ" }).click();
  await expectQuestionFocus(page, "作業中に心地よいのは？");
  await expect(page.getByLabel("成果や進み具合が明確なこと")).toBeChecked();

  await page.getByRole("button", { name: "次の質問へ" }).click();
  await expectQuestionFocus(page, "休み方として近いものは？");
  await page.getByLabel("気分に合わせて過ごし方を変える").check();
  await page.getByRole("button", { name: "次の質問へ" }).click();
  await expectQuestionFocus(page, "周囲から言われることが多いのは？");
  await page.getByLabel("穏やかで粘り強く取り組む").check();
  await page.getByRole("button", { name: "結果を見る" }).click();

  await expect(page.locator("#result-screen")).toBeVisible();
  await expect(page.locator("#result-rows tr")).toHaveText([
    /ヴァータ\s*3\s*60\.0%/,
    /ピッタ\s*1\s*20\.0%/,
    /カパ\s*1\s*20\.0%/
  ]);
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "もう一度回答する" }).click();
  await expect(page.locator("#start-screen")).toBeVisible();
  await expect(page.getByRole("button", { name: "診断をはじめる" })).toBeFocused();
  await page.getByRole("button", { name: "診断をはじめる" }).click();
  await expectQuestionFocus(page, "予定を立てるとき、最も近いものは？");
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
  await page.goto("/");
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

  await expect(page.locator("#result-rows tr")).toHaveText([
    /第一軸\s*2\s*66\.7%/,
    /第二軸\s*1\s*33\.3%/
  ]);
  await expectNoHorizontalOverflow(page);
  expect(monitor.scriptFailures).toEqual([]);
  expect(monitor.consoleIssues).toEqual([]);
});
