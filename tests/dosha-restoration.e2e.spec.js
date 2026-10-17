"use strict";

const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const config = require("../diagnosis-template/config.js");
const evidenceDir = process.env.DOSHA_EVIDENCE_DIR || path.resolve(__dirname, "../test-results/dosha-restoration");

async function answer(page, keys) {
  await page.getByRole("button", { name: "チェックする", exact: true }).click();
  for (let i = 0; i < keys.length; i += 1) {
    await expect(page.locator("#progress-text")).toHaveText(`質問 ${i + 1} / ${config.questions.length}`);
    await page.locator(`input[value="${keys[i]}"]`).check();
    await page.locator("#next-button").click();
  }
}

for (const width of [320, 375, 390, 1280]) {
  test(`restored dosha flow and three-axis scores at ${width}px`, async ({ page }) => {
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.goto("./");
    await expect(page).toHaveTitle("Find Your Dosha");
    await expect(page.locator(".start-subtitle")).toHaveText("あなたのドーシャを見つけてみませんか？");
    await expect(page.locator("#start-brand")).toContainText("Salon de Krishna");
    await expect(page.locator(".start-visual, .product-details, .result-cta")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText("紅茶");
    fs.mkdirSync(evidenceDir, { recursive: true });
    if (width === 375 || width === 1280) {
      await page.screenshot({ path: path.join(evidenceDir, `start-${width}.png`), fullPage: true, animations: "disabled" });
    }
    await page.getByRole("button", { name: "チェックする", exact: true }).click();
    await expect(page.locator("#question-title")).toHaveText(config.questions[0].prompt);
    await page.locator("#next-button").click();
    await expect(page.locator("#form-error")).toBeVisible();
    await page.locator('input[value="vata"]').check();
    await page.locator("#next-button").click();
    await page.locator('input[value="pitta"]').check();
    await page.locator("#previous-button").click();
    await expect(page.locator('input[value="vata"]')).toBeChecked();
    await page.locator("#next-button").click();
    await expect(page.locator('input[value="pitta"]')).toBeChecked();
    await page.locator("#next-button").click();
    await page.locator('input[value="vata"]').check();
    if (width === 375) await page.screenshot({ path: path.join(evidenceDir, "question-375.png"), fullPage: true, animations: "disabled" });
    await page.locator("#next-button").click();
    for (const key of ["kapha", "vata", "pitta", "kapha"]) {
      await page.locator(`input[value="${key}"]`).check();
      await page.locator("#next-button").click();
    }
    await expect(page.locator("#result-title")).toHaveText("あなたの3軸スコア");
    await expect(page.locator("#result-title")).toBeFocused();
    await expect(page.locator(".table-wrap")).toBeVisible();
    await expect(page.locator(".rounding-note")).toBeVisible();
    await expect(page.locator("#result-rows tr")).toHaveCount(3);
    await expect(page.locator("#result-rows tr").nth(0)).toHaveText("ヴァータ342.9%");
    await expect(page.locator("#result-rows tr").nth(1)).toHaveText("ピッタ228.6%");
    await expect(page.locator("#result-rows tr").nth(2)).toHaveText("カパ228.6%");
    await expect(page.locator("#result-texts h3")).toHaveText(["ヴァータ", "ピッタ", "カパ"]);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
    if (width === 375 || width === 1280) {
      await page.screenshot({ path: path.join(evidenceDir, `result-${width}.png`), fullPage: true, animations: "disabled" });
    }
    await page.locator("#restart-button").click();
    await expect(page.locator("#start-screen")).toBeVisible();
    await page.locator("#start-button").click();
    await expect(page.locator("input:checked")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test("ties retain all three score rows and keyboard-only answering works", async ({ page }) => {
  await page.goto("./");
  await page.locator("#start-button").focus();
  await page.keyboard.press("Enter");
  const keyboardFocus = await page.locator("#question-title").evaluate(element => ({
    visible: element.matches(":focus-visible"),
    outline: getComputedStyle(element).outlineStyle
  }));
  expect(keyboardFocus).toEqual({ visible: true, outline: "solid" });
  for (const key of ["vata", "vata", "pitta", "pitta", "kapha", "vata", "pitta"]) {
    await page.keyboard.press("Tab");
    const index = ["vata", "pitta", "kapha"].indexOf(key);
    await page.keyboard.press("Space");
    for (let i = 0; i < index; i += 1) await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Tab");
    // Later questions also have the Previous button before Next.
    if (await page.locator("#previous-button").isVisible()) await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
  }
  await expect(page.locator("#result-screen")).toBeVisible();
  await expect(page.locator("#result-rows tr").nth(0)).toHaveText("ヴァータ342.9%");
  await expect(page.locator("#result-rows tr").nth(1)).toHaveText("ピッタ342.9%");
  await expect(page.locator("#result-rows tr").nth(2)).toHaveText("カパ114.3%");
});

test("template entry point uses the same restored questions", async ({ page }) => {
  await page.goto("./diagnosis-template/");
  await expect(page).toHaveTitle("Find Your Dosha");
  await answer(page, Array(config.questions.length).fill("kapha"));
  await expect(page.locator("#result-rows tr").nth(2)).toHaveText("カパ7100.0%");
});

test("no analytics request or URL change while the token is empty", async ({ page, baseURL }) => {
  const beaconRequests = [];
  page.on("request", request => {
    if (request.url().includes("cloudflareinsights.com")) beaconRequests.push(request.url());
  });
  await page.goto("./");
  await answer(page, Array(config.questions.length).fill("vata"));
  await expect(page.locator("#result-screen")).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(new URL("./", baseURL).pathname);
  expect(beaconRequests).toEqual([]);
});

test("with a token, each step gets its own path and Back restores the previous step", async ({ page, context }) => {
  const token = "0123456789abcdef0123456789abcdef";
  const source = fs.readFileSync(path.join(__dirname, "../diagnosis-template/config.js"), "utf8")
    .replace('"token": ""', `"token": "${token}"`);
  await context.route(/\/diagnosis-template\/config\.js(?:\?.*)?$/, route => route.fulfill({
    body: source,
    contentType: "application/javascript"
  }));
  const beacons = [];
  await context.route("https://static.cloudflareinsights.com/**", route => {
    beacons.push(route.request().url());
    return route.fulfill({ body: "", contentType: "application/javascript" });
  });
  await page.goto("./");
  const beacon = page.locator('script[src="https://static.cloudflareinsights.com/beacon.min.js"]');
  await expect(beacon).toHaveAttribute("data-cf-beacon", JSON.stringify({ token }));
  await expect(beacon).toHaveAttribute("type", "module");
  await page.getByRole("button", { name: "チェックする", exact: true }).click();
  await expect(page).toHaveURL(/\/q1$/);
  for (let i = 0; i < config.questions.length; i += 1) {
    await page.locator('input[value="pitta"]').check();
    await page.locator("#next-button").click();
    if (i < config.questions.length - 1) await expect(page).toHaveURL(new RegExp(`/q${i + 2}$`));
  }
  await expect(page).toHaveURL(/\/result$/);
  await expect(page.locator("#result-rows tr").nth(1)).toHaveText("ピッタ7100.0%");
  await page.goBack();
  await expect(page.locator("#question-title")).toHaveText(config.questions[6].prompt);
  await expect(page.locator('input[value="pitta"]')).toBeChecked();
  await page.goForward();
  await expect(page.locator("#result-screen")).toBeVisible();
  await page.locator("#restart-button").click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("#start-screen")).toBeVisible();
  expect(beacons.length).toBeGreaterThan(0);
});
