(function exposeCalculator(root, factory) {
  const calculator = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = calculator;
  }

  root.DoshaCalculator = calculator;
}(typeof globalThis !== "undefined" ? globalThis : this, function createCalculator() {
  "use strict";

  const DOSHAS = [
    { key: "vata", label: "ヴァータ" },
    { key: "pitta", label: "ピッタ" },
    { key: "kapha", label: "カパ" }
  ];

  function parseScore(value) {
    const text = typeof value === "string" ? value.trim() : String(value);

    if (!/^\d+$/.test(text)) {
      throw new Error("3項目すべてに0以上の整数を入力してください。");
    }

    const score = Number(text);
    if (!Number.isSafeInteger(score)) {
      throw new Error("点数が大きすぎます。安全に計算できる整数を入力してください。");
    }

    return score;
  }

  function calculateDosha(values) {
    const scores = {};

    DOSHAS.forEach(function assignScore(dosha) {
      scores[dosha.key] = parseScore(values[dosha.key]);
    });

    const total = DOSHAS.reduce(function sumScores(sum, dosha) {
      return sum + scores[dosha.key];
    }, 0);

    if (total === 0) {
      throw new Error("3項目の合計は1以上にしてください。");
    }

    const percentages = {};
    DOSHAS.forEach(function assignPercentage(dosha) {
      percentages[dosha.key] = Number(((scores[dosha.key] / total) * 100).toFixed(1));
    });

    const maximum = Math.max.apply(null, DOSHAS.map(function getScore(dosha) {
      return scores[dosha.key];
    }));
    const dominantDoshas = DOSHAS.filter(function isDominant(dosha) {
      return scores[dosha.key] === maximum;
    });
    const isCompound = dominantDoshas.length > 1;
    const resultLabel = isCompound
      ? "複合タイプ（" + dominantDoshas.map(function getLabel(dosha) { return dosha.label; }).join("・") + "）"
      : dominantDoshas[0].label;

    return {
      scores: scores,
      percentages: percentages,
      total: total,
      dominantKeys: dominantDoshas.map(function getKey(dosha) { return dosha.key; }),
      isCompound: isCompound,
      resultLabel: resultLabel
    };
  }

  return {
    DOSHAS: DOSHAS,
    calculateDosha: calculateDosha
  };
}));
