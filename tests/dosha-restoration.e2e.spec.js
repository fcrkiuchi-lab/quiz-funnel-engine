"use strict";

const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const config = require("../diagnosis-template/config.js");
const evidenceDir = process.env.DOSHA_EVIDENCE_DIR || path.resolve(__dirname, "../test-results/dosha-restoration");

async function answer(page, keys) {
  await page.getByRole("button", { name: "診断をはじめる", exact: true }).click();
  for (let i = 0; i < keys.length; i += 1) {
    await expect(page.locator("#progress-text")).toHaveText(`質問 ${i + 1} / 4`);
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
    await expect(page).toHaveTitle("ドーシャチェック");
    await expect(page.locator("#page-description")).toContainText("ヴァータ・ピッタ・カパ");
    await expect(page.locator("#start-brand")).toContainText("Salon de Krishna");
    await expect(page.locator(".start-visual, .product-details, .result-cta")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText("紅茶");
    fs.mkdirSync(evidenceDir, { recursive: true });
    if (width === 375 || width === 1280) {
      await page.screenshot({ path: path.join(evidenceDir, `start-${width}.png`), fullPage: true, animations: "disabled" });
    }
    await page.getByRole("button", { name: "診断をはじめる", exact: true }).click();
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
    await page.locator('input[value="kapha"]').check();
    await page.locator("#next-button").click();
    await expect(page.locator("#result-title")).toHaveText("あなたの3軸スコア");
    await expect(page.locator("#result-title")).toBeFocused();
    await expect(page.locator(".table-wrap")).toBeVisible();
    await expect(page.locator(".rounding-note")).toBeVisible();
    await expect(page.locator("#result-rows tr")).toHaveCount(3);
    await expect(page.locator("#result-rows tr").nth(0)).toHaveText("ヴァータ360.0%");
    await expect(page.locator("#result-rows tr").nth(1)).toHaveText("ピッタ120.0%");
    await expect(page.locator("#result-rows tr").nth(2)).toHaveText("カパ120.0%");
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
  for (const key of ["vata", "pitta", "pitta", "kapha"]) {
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
  await expect(page.locator("#result-rows tr").nth(0)).toHaveText("ヴァータ240.0%");
  await expect(page.locator("#result-rows tr").nth(1)).toHaveText("ピッタ240.0%");
  await expect(page.locator("#result-rows tr").nth(2)).toHaveText("カパ120.0%");
});

test("template entry point uses the same restored questions", async ({ page }) => {
  await page.goto("./diagnosis-template/");
  await expect(page).toHaveTitle("ドーシャチェック");
  await answer(page, ["kapha", "kapha", "kapha", "kapha"]);
  await expect(page.locator("#result-rows tr").nth(2)).toHaveText("カパ5100.0%");
});
