"use strict";

const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  testMatch: "**/*.e2e.spec.js",
  fullyParallel: false,
  workers: 1,
  timeout: 15000,
  globalTimeout: 60000,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
    channel: "msedge",
    headless: true,
    viewport: { width: 375, height: 812 }
  },
  webServer: {
    command: "node tests/static-server.js",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 10000
  }
});
