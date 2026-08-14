"use strict";

const assert = require("assert").strict;
const fs = require("fs");
const path = require("path");
const { calculateDosha } = require("../calculator.js");

let failures = 0;

function test(name, run) {
  try {
    run();
    console.log("PASS " + name);
  } catch (error) {
    failures += 1;
    console.error("FAIL " + name);
    console.error(error.stack);
  }
}

test("10, 8, 3 の点数と割合", function () {
  const result = calculateDosha({ vata: "10", pitta: "8", kapha: "3" });
  assert.deepEqual(result.scores, { vata: 10, pitta: 8, kapha: 3 });
  assert.deepEqual(result.percentages, { vata: 47.6, pitta: 38.1, kapha: 14.3 });
});

test("1, 1, 1 は各33.3%", function () {
  const result = calculateDosha({ vata: "1", pitta: "1", kapha: "1" });
  assert.deepEqual(result.scores, { vata: 1, pitta: 1, kapha: 1 });
  assert.deepEqual(result.percentages, { vata: 33.3, pitta: 33.3, kapha: 33.3 });

  const page = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.match(page, /表示上の合計が100\.0%にならない場合があります/);
});

test("0, 0, 0 を拒否", function () {
  assert.throws(function () {
    calculateDosha({ vata: "0", pitta: "0", kapha: "0" });
  });
});

test("負数を拒否", function () {
  assert.throws(function () {
    calculateDosha({ vata: "-1", pitta: "1", kapha: "1" });
  });
});

test("小数を拒否", function () {
  assert.throws(function () {
    calculateDosha({ vata: "1.5", pitta: "1", kapha: "1" });
  });
});

test("空欄を拒否", function () {
  assert.throws(function () {
    calculateDosha({ vata: "", pitta: "1", kapha: "1" });
  });
});

test("数値以外を拒否", function () {
  assert.throws(function () {
    calculateDosha({ vata: "abc", pitta: "1", kapha: "1" });
  });
});

if (failures > 0) {
  process.exitCode = 1;
} else {
  console.log("All tests passed.");
}
