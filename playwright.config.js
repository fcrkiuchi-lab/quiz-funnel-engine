"use strict";

const { defineConfig } = require("@playwright/test");
const baseURL = process.env.BASE_URL || "http://127.0.0.1:4173";
const isLocalRun = !process.env.BASE_URL;

const config = {
  testDir: "./tests",
  testMatch: "**/*.e2e.spec.js",
  fullyParallel: false,
  workers: 1,
  timeout: 15000,
  globalTimeout: 60000,
  reporter: "line",
  use: {
    baseURL: baseURL,
    browserName: "chromium",
    channel: "msedge",
    headless: true,
    viewport: { width: 375, height: 812 },
    reducedMotion: "reduce"
  }
};

if (isLocalRun) {
  config.webServer = {
    command: "node tests/static-server.js",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 10000
  };
}

module.exports = defineConfig(config);
