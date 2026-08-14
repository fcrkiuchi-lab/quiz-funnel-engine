(function exposeDiagnosisConfig(root, factory) {
  const config = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = config;
  }

  root.DiagnosisConfig = config;
}(typeof globalThis !== "undefined" ? globalThis : this, function createDiagnosisConfig() {
  "use strict";

  return {
    id: "work-style-sample-v1",
    title: "仕事の進め方チェック",
    eyebrow: "第2サンプル診断",
    description: "3つの質問から、仕事の進め方に関する3軸の点数と割合を確認します。",
    resultTitle: "仕事スタイルの3軸スコア",
    resultDescription: "回答に基づく各軸の加点結果です。優劣や適性を判定するものではありません。",
    labels: {
      start: "チェックをはじめる",
      next: "次の質問へ",
      previous: "前の質問へ",
      finish: "結果を見る",
      restart: "もう一度回答する"
    },
    theme: {
      background: "#edf4f7",
      surface: "#ffffff",
      primary: "#235f73",
      primaryText: "#ffffff",
      accent: "#d5e8ee",
      text: "#203239",
      muted: "#5d6f76",
      border: "#c7d9df"
    },
    axes: [
      { key: "explore", label: "探索", resultText: "新しい方法を試す回答で加点される軸です。" },
      { key: "plan", label: "計画", resultText: "順序や見通しを整える回答で加点される軸です。" },
      { key: "support", label: "協働", resultText: "周囲との連携を重視する回答で加点される軸です。" }
    ],
    questions: [
      {
        id: "q1",
        prompt: "新しい仕事を始めるときは？",
        choices: [
          { id: "explore", label: "小さく試して手応えを確かめる", scores: { explore: 2 } },
          { id: "plan", label: "手順と期限を先に整理する", scores: { plan: 2 } },
          { id: "support", label: "関係者と期待値をそろえる", scores: { support: 2 } }
        ]
      },
      {
        id: "q2",
        prompt: "行き詰まったときは？",
        choices: [
          { id: "explore", label: "別の方法をすぐ試す", scores: { explore: 1 } },
          { id: "plan", label: "原因を分解して順番に確認する", scores: { plan: 1 } },
          { id: "support", label: "早めに相談して視点を増やす", scores: { support: 1 } }
        ]
      },
      {
        id: "q3",
        prompt: "成果を振り返るとき重視するのは？",
        choices: [
          { id: "explore", label: "次に試したいアイデア", scores: { explore: 1 } },
          { id: "plan", label: "計画との差と改善点", scores: { plan: 1 } },
          { id: "support", label: "チームで共有できる学び", scores: { support: 1 } }
        ]
      }
    ]
  };
}));
