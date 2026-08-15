(function exposeDiagnosisConfig(root, factory) {
  const config = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = config;
  }

  root.DiagnosisConfig = config;
}(typeof globalThis !== "undefined" ? globalThis : this, function createDiagnosisConfig() {
  "use strict";

  return {
    id: "salon-de-krishna-tuning-check-v2",
    brand: "Salon de Krishna",
    title: "今日の調律チェック",
    eyebrow: "今日のセルフチェック",
    description: "今日の心と身体の状態を見つめ、今の自分に合う整え方を見つける小さなチェックです。",
    resultTitle: "今日の調律",
    resultDescription: "これは固定的な分類ではなく、今日のあなたの状態を見つめるためのチェックです。心と身体の状態は、日々変化します。",
    labels: {
      start: "チェックをはじめる",
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
      { key: "meguru", label: "めぐる", resultText: "流れを取り戻す、今日の調律／温かさと穏やかな手当てで、自分のリズムを取り戻す日。" },
      { key: "yawaragu", label: "やわらぐ", resultText: "力を抜く、今日の調律／頑張ることより、緊張をほどき、余白に戻る時間を大切にする日。" },
      { key: "mezameru", label: "めざめる", resultText: "感覚をひらく、今日の調律／光や風、軽い動きで、内側の感覚をやさしく呼び起こす日。" }
    ],
    tieBreakerQuestionId: "q7",
    questions: [
      {
        id: "q1",
        prompt: "今朝、目覚めたときの感覚に近いものは？",
        choices: [
          { id: "meguru", label: "体がこわばり、動き出すまで少し時間がいる", scores: { meguru: 1 } },
          { id: "yawaragu", label: "考えがすぐ動き始め、休む余白が少ない", scores: { yawaragu: 1 } },
          { id: "mezameru", label: "まだぼんやりしていて、始動のきっかけがほしい", scores: { mezameru: 1 } }
        ]
      },
      {
        id: "q2",
        prompt: "今、身体が求めているものは？",
        choices: [
          { id: "mezameru", label: "光や風、軽い刺激", scores: { mezameru: 1 } },
          { id: "yawaragu", label: "静かな休息と、ゆっくりした呼吸", scores: { yawaragu: 1 } },
          { id: "meguru", label: "温かさと、やさしい動き", scores: { meguru: 1 } }
        ]
      },
      {
        id: "q3",
        prompt: "頭の中の様子に近いものは？",
        choices: [
          { id: "mezameru", label: "焦点が合いにくく、考えがゆっくり", scores: { mezameru: 1 } },
          { id: "meguru", label: "考えが滞って、切り替えにくい", scores: { meguru: 1 } },
          { id: "yawaragu", label: "予定や気遣いで、張りつめている", scores: { yawaragu: 1 } }
        ]
      },
      {
        id: "q4",
        prompt: "人と向き合うなら、今はどれに近い？",
        choices: [
          { id: "yawaragu", label: "少し距離をとり、静かにいたい", scores: { yawaragu: 1 } },
          { id: "mezameru", label: "外の空気や会話で、気分を切り替えたい", scores: { mezameru: 1 } },
          { id: "meguru", label: "自分のペースを取り戻したい", scores: { meguru: 1 } }
        ]
      },
      {
        id: "q5",
        prompt: "今、自由な10分があったら？",
        choices: [
          { id: "yawaragu", label: "何もせず、ただほどけたい", scores: { yawaragu: 1 } },
          { id: "meguru", label: "温めて、ゆっくり身体を開きたい", scores: { meguru: 1 } },
          { id: "mezameru", label: "背筋を伸ばし、新しい一歩を始めたい", scores: { mezameru: 1 } }
        ]
      },
      {
        id: "q6",
        prompt: "今日の終わりに求めるのは？",
        choices: [
          { id: "mezameru", label: "すっきり切り替わった実感", scores: { mezameru: 1 } },
          { id: "yawaragu", label: "安心してゆるむ時間", scores: { yawaragu: 1 } },
          { id: "meguru", label: "内側が整っていく感覚", scores: { meguru: 1 } }
        ]
      },
      {
        id: "q7",
        prompt: "今のあなたに、いちばんしっくりくる言葉は？",
        choices: [
          { id: "meguru", label: "流れを取り戻したい", scores: { meguru: 2 } },
          { id: "mezameru", label: "眠っていた感覚をひらきたい", scores: { mezameru: 2 } },
          { id: "yawaragu", label: "ほどけて、余白に戻りたい", scores: { yawaragu: 2 } }
        ]
      }
    ]
  };
}));
