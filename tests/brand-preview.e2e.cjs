"use strict";

// Native, headless Microsoft Edge only. No Chrome extension and no external CTA visit.
// Optional argument: directory of an already-installed playwright package.
const { chromium } = require(process.argv[2] || "playwright");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const { pathToFileURL } = require("node:url");
const config = require("../diagnosis-template/config.js");
const root = path.resolve(__dirname, "..");
const evidenceDir = path.join(root, "evidence");

async function run() {
  fs.mkdirSync(evidenceDir, { recursive: true });
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const records = [];
  try {
    for (const width of [320, 375, 390, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
      const requests = [];
      const issues = [];
      await context.route(/^https?:/, async (route) => {
        requests.push(route.request().url());
        await route.abort();
      });
      const page = await context.newPage();
      page.on("pageerror", (error) => issues.push(error.message));

      async function checkLayout() {
        const layout = await page.evaluate(() => {
          const current = document.querySelector(".screen:not([hidden])");
          const width = document.documentElement.clientWidth;
          const elements = Array.from(current.querySelectorAll("button, a, label, img, legend, h1, h2, h3, p, .eyebrow, .progress-row"))
            .filter((el) => {
              const r = el.getBoundingClientRect();
              return r.width > 0 && r.height > 0;
            });
          const overflow = elements.filter((el) => {
            const r = el.getBoundingClientRect();
            return r.left < -1 || r.right > width + 1;
          }).map((el) => el.id || el.className || el.tagName);
          const overlaps = [];
          for (let left = 0; left < elements.length; left += 1) {
            for (let right = left + 1; right < elements.length; right += 1) {
              const a = elements[left];
              const b = elements[right];
              if (a.contains(b) || b.contains(a)) continue;
              const ar = a.getBoundingClientRect();
              const br = b.getBoundingClientRect();
              const overlapX = Math.min(ar.right, br.right) - Math.max(ar.left, br.left);
              const overlapY = Math.min(ar.bottom, br.bottom) - Math.max(ar.top, br.top);
              if (overlapX > 1 && overlapY > 1) {
                overlaps.push((a.id || a.className || a.tagName) + " / " + (b.id || b.className || b.tagName));
              }
            }
          }
          return { overflow, overlaps, scrollWidth: document.documentElement.scrollWidth, width };
        });
        assert.deepEqual(layout.overflow, []);
        assert.deepEqual(layout.overlaps, []);
        assert.ok(layout.scrollWidth <= layout.width);
      }

      await page.goto(pathToFileURL(path.join(root, "index.html")).href);
      await page.locator(".start-visual img").evaluate((img) => img.decode());
      assert.equal(await page.locator("#start-screen").isVisible(), true);
      assert.equal(await page.locator(".tea-family span").count(), 0);
      await checkLayout();
      if (width === 375 || width === 1280) {
        await page.screenshot({ path: path.join(evidenceDir, width + "-start.png"), fullPage: true });
      }
      await page.locator("#start-button").click();
      await page.locator("#next-button").click();
      assert.equal(await page.locator("#form-error").isVisible(), true);
      await page.locator('input[value="yawaragu"]').check();
      await page.locator("#next-button").click();
      await page.locator("#previous-button").click();
      assert.equal(await page.locator('input[value="yawaragu"]').isChecked(), true);
      assert.equal(await page.locator("#question-title").evaluate((el) => document.activeElement === el), true);
      if (width === 375) {
        await page.screenshot({ path: path.join(evidenceDir, "375-question.png"), fullPage: true });
      }

      await checkLayout();

      for (const outcome of ["meguru", "yawaragu", "mezameru", "none"]) {
        if (outcome !== "meguru") {
          await page.locator("#restart-button").click();
          assert.equal(await page.locator("#start-button").evaluate((el) => document.activeElement === el), true);
          await page.locator("#start-button").click();
          assert.equal(await page.locator("input:checked").count(), 0);
        }
        for (let index = 0; index < config.questions.length; index += 1) {
          await page.locator('input[value="' + outcome + '"]').check();
          await page.locator("#next-button").click();
        }
        assert.equal(await page.locator("#result-screen").isVisible(), true);
        assert.equal(await page.locator("#result-title").evaluate((el) => document.activeElement === el), true);
        assert.equal(await page.locator(".result-cta").count(), 1);
        assert.equal(await page.locator(".result-cta").getAttribute("href"), "https://lin.ee/uUx66iz");
        assert.equal(await page.locator(".result-cta").getAttribute("referrerpolicy"), "no-referrer");
        assert.equal(await page.locator(".table-wrap").isVisible(), false);
        if (outcome === "none") {
          assert.equal(await page.locator("#result-screen").getAttribute("data-outcome"), "neutral");
          assert.equal(await page.locator(".result-visual").count(), 0);
          assert.equal(await page.locator(".product-details").count(), 0);
          assert.equal(await page.locator("#result-screen").getAttribute("data-axis"), null);
          assert.equal(await page.locator("#result-screen").evaluate((el) => el.style.getPropertyValue("--axis-color")), "");
        } else {
          assert.equal(await page.locator("#result-screen").getAttribute("data-axis"), outcome);
          const img = page.locator(".result-visual img");
          await img.evaluate((image) => image.decode());
          assert.ok((await img.getAttribute("src")).endsWith("/" + outcome + ".png"));
          const box = await page.locator(".result-cta").boundingBox();
          assert.ok(box && box.y >= 0 && box.y + box.height <= 900, "CTA should be visible on the initial result viewport");
        }
        await checkLayout();
        if (width === 375) {
          await page.screenshot({ path: path.join(evidenceDir, "375-" + outcome + ".png"), fullPage: true });
        }
      }
      // Reduced-motion preference must suppress the reused transition system.
      const motion = await page.locator("#result-screen").evaluate((el) => getComputedStyle(el).animationDuration);
      assert.ok(motion.split(",").every((value) => parseFloat(value) <= 0.001));
      assert.deepEqual(requests, [], "No off-origin request or answer transmission");
      assert.deepEqual(issues, []);
      records.push({ width, allOutcomes: "PASS", navigation: "PASS", images: "PASS", layout: "PASS", externalRequests: 0 });
      await context.close();
    }

    // Second entrypoint, without changing the filesystem or original template config.
    const context = await browser.newContext({ viewport: { width: 375, height: 900 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto(pathToFileURL(path.join(root, "diagnosis-template/index.html")).href);
    await page.locator(".start-visual img").evaluate((img) => img.decode());
    assert.equal(await page.locator("#start-button").isVisible(), true);
    records.push({ entrypoint: "diagnosis-template/index.html", localImageResolution: "PASS" });
    // Test-only fixture generated from the same entrypoint, swapping only config and relative paths.
    const sampleHtml = fs.readFileSync(path.join(root, "index.html"), "utf8")
      .replaceAll('href="diagnosis-template/', 'href="../diagnosis-template/')
      .replaceAll('src="diagnosis-template/', 'src="../diagnosis-template/')
      .replace('src="../diagnosis-template/config.js"', 'src="../diagnosis-template/configs/work-style.js"');
    const samplePath = path.join(evidenceDir, "reuse-sample.html");
    fs.writeFileSync(samplePath, sampleHtml);
    await page.goto(pathToFileURL(samplePath).href);
    assert.equal(await page.locator("html").evaluate((el) => el.classList.contains("brand-presentation")), false);
    assert.equal(await page.locator(".start-visual, .tea-family").count(), 0);
    await page.locator("#start-button").click();
    for (let index = 0; index < 3; index += 1) {
      await page.locator('input[value="explore"]').check();
      await page.locator("#next-button").click();
    }
    assert.equal(await page.locator(".primary-axis h3").innerText(), "探索");
    assert.equal(await page.locator(".result-visual, .result-cta").count(), 0);
    records.push({ alternateConfig: "work-style", completeJourney: "PASS", krishnaImageOrCtaLeak: false });

    await page.goto(pathToFileURL(path.join(root, "index.html")).href);
    await page.addStyleTag({ content: "html { font-size: 200%; }" });
    await page.locator("#start-button").click();
    const enlarged = await page.locator(".choice").evaluateAll((elements) => elements.every((el) => {
      const r = el.getBoundingClientRect();
      return r.left >= 0 && r.right <= document.documentElement.clientWidth;
    }));
    assert.equal(enlarged, true);
    records.push({ fontSize: "200%", choiceLayout: "PASS" });
    await context.close();
    console.log(JSON.stringify({ browser: "Microsoft Edge headless", records }, null, 2));
  } finally {
    await browser.close();
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
