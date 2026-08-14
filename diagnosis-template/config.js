(function exposeDiagnosisConfig(root, factory) {
  const config = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = config;
  }

  root.DiagnosisConfig = config;
}(typeof globalThis !== "undefined" ? globalThis : this, function createDiagnosisConfig() {
  "use strict";

  return {
    title: "設定差し替え型・サンプル診断",
    description: "設問、選択肢、加点先は config.js だけで差し替えられます。",
    axes: [
      { key: "a", label: "タイプA" },
      { key: "b", label: "タイプB" },
      { key: "c", label: "タイプC" }
    ],
    questions: [
      {
        id: "q1",
        prompt: "予定を立てるとき、最も近いものは？",
        choices: [
          { id: "a", label: "まず試してから調整する", scores: { a: 1 } },
          { id: "b", label: "目的と手順を先に決める", scores: { b: 1 } },
          { id: "c", label: "無理のないペースを優先する", scores: { c: 1 } }
        ]
      },
      {
        id: "q2",
        prompt: "作業中に重視することは？",
        choices: [
          { id: "a", label: "変化と新しさ", scores: { a: 1 } },
          { id: "b", label: "達成と精度", scores: { b: 1 } },
          { id: "c", label: "安定と継続", scores: { c: 1 } }
        ]
      },
      {
        id: "q3",
        prompt: "休み方として近いものは？",
        choices: [
          { id: "a", label: "気分に合わせて行き先を変える", scores: { a: 1 } },
          { id: "b", label: "やりたいことを決めて楽しむ", scores: { b: 1 } },
          { id: "c", label: "慣れた場所でゆっくり過ごす", scores: { c: 1 } }
        ]
      }
    ],
    integration: {
      enabled: false,
      endpoint: "",
      diagnosisId: "sample-v1"
    }
  };
}));
