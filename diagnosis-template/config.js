(function exposeDiagnosisConfig(root, factory) {
  const config = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = config;
  }

  root.DiagnosisConfig = config;
}(typeof globalThis !== "undefined" ? globalThis : this, function createDiagnosisConfig() {
  "use strict";

  return {
    id: "dosha-sample-v1",
    title: "ドーシャ傾向セルフチェック",
    eyebrow: "設定駆動型診断サンプル",
    description: "日頃の行動で近いものを選ぶと、ヴァータ・ピッタ・カパの3軸を点数と割合で確認できます。制作基盤の動作確認用サンプルであり、医療上の判断を行うものではありません。",
    resultTitle: "あなたの3軸スコア",
    resultDescription: "回答から加点した値と、その合計に占める割合です。分類や体質の断定は行いません。",
    labels: {
      start: "診断をはじめる",
      next: "次の質問へ",
      previous: "前の質問へ",
      finish: "結果を見る",
      restart: "もう一度回答する"
    },
    theme: {
      background: "#f5efe6",
      surface: "#fffdf8",
      primary: "#8a4f35",
      primaryText: "#ffffff",
      accent: "#ead5c2",
      text: "#352b27",
      muted: "#6e625d",
      border: "#decfc3"
    },
    axes: [
      { key: "vata", label: "ヴァータ", resultText: "変化や軽快さに関する回答で加点される軸です。" },
      { key: "pitta", label: "ピッタ", resultText: "集中や達成に関する回答で加点される軸です。" },
      { key: "kapha", label: "カパ", resultText: "安定や継続に関する回答で加点される軸です。" }
    ],
    questions: [
      {
        id: "q1",
        prompt: "予定を立てるとき、最も近いものは？",
        choices: [
          { id: "vata", label: "まず動いてから柔軟に調整する", scores: { vata: 2 } },
          { id: "pitta", label: "目標と手順を決めて進める", scores: { pitta: 2 } },
          { id: "kapha", label: "無理なく続けられるペースを選ぶ", scores: { kapha: 2 } }
        ]
      },
      {
        id: "q2",
        prompt: "作業中に心地よいのは？",
        choices: [
          { id: "vata", label: "新しい刺激や変化があること", scores: { vata: 1 } },
          { id: "pitta", label: "成果や進み具合が明確なこと", scores: { pitta: 1 } },
          { id: "kapha", label: "落ち着いて同じ調子を保てること", scores: { kapha: 1 } }
        ]
      },
      {
        id: "q3",
        prompt: "休み方として近いものは？",
        choices: [
          { id: "vata", label: "気分に合わせて過ごし方を変える", scores: { vata: 1 } },
          { id: "pitta", label: "やりたいことを決めて楽しむ", scores: { pitta: 1 } },
          { id: "kapha", label: "慣れた場所でゆっくり過ごす", scores: { kapha: 1 } }
        ]
      },
      {
        id: "q4",
        prompt: "周囲から言われることが多いのは？",
        choices: [
          { id: "vata", label: "発想が豊かで切り替えが早い", scores: { vata: 1 } },
          { id: "pitta", label: "判断が早く熱心に取り組む", scores: { pitta: 1 } },
          { id: "kapha", label: "穏やかで粘り強く取り組む", scores: { kapha: 1 } }
        ]
      }
    ]
  };
}));
