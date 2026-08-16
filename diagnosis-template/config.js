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
    brand: "",
    title: "🌿 今日の調律チェック",
    eyebrow: "― 今日は、どんな私で過ごしたい？ ―",
    description: "※これは体質を決める診断ではなく、「今日の自分に必要な調律」を見つけるチェックです。",
    resultTitle: "✨ 今日のあなたに必要な調律は……",
    resultDescription: "五感を調律し、本来のあなたへ。",
    hideResultDescription: true,
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
      {
        key: "meguru",
        label: "めぐる",
        resultText: "ゆっくり、温かく、繰り返す。",
        heading: "🌿 めぐる",
        lead: "ゆっくり、温かく、繰り返す。",
        body: [
          "今日は少しペースを落として、自分の内側に戻る時間を。",
          "あなたには今、",
          "「動くこと」より「落ち着くこと」が必要なのかもしれません。",
          "そんな今日におすすめなのが",
          "Ayurveda 調律ハーブ紅茶「めぐる」。"
        ],
        emphasis: "「動くこと」より「落ち着くこと」が必要なのかもしれません。",
        product: {
          name: "Ayurveda 調律ハーブ紅茶「めぐる」",
          dosha: "ヴァータ",
          sense: "聴覚",
          volume: "30g（リーフティー）",
          ingredients: "アッサムFOP、カモミール、シナモン、カルダモン、リコリス、オレンジピール、ラベンダー、マリーゴールド、コーンフラワー",
          feature: "温かみのあるアッサム紅茶に、カモミールやカルダモン、ラベンダーなど、穏やかでやさしい香りのハーブをブレンド。ヴァータの冷えや揺らぎに寄り添い、温かさと安心感を感じながら、ゆっくりと自分のリズムを取り戻す方向へ調律します。",
          keywords: "ゆっくり・温かく・繰り返す"
        }
      },
      {
        key: "yawaragu",
        label: "やわらぐ",
        resultText: "緩める、冷ます、手放す。",
        heading: "🌸 やわらぐ ― ピッタ",
        lead: "緩める、冷ます、手放す。",
        body: [
          "今日は少し頑張ることをゆるめて、心と身体にひと息つく時間を。",
          "あなたには今、",
          "「頑張ること」より「力を抜くこと」が必要なのかもしれません。",
          "そんな今日におすすめなのが",
          "Ayurveda 調律ハーブ紅茶「やわらぐ」。"
        ],
        emphasis: "「頑張ること」より「力を抜くこと」が必要なのかもしれません。",
        product: {
          name: "Ayurveda 調律ハーブ紅茶「やわらぐ」",
          dosha: "ピッタ",
          sense: "視覚",
          volume: "30g（リーフティー）",
          ingredients: "ダージリン セカンドフラッシュ ブレンド、ローズ（ローズレッド）、ローズヒップ、ハイビスカス、ペパーミント",
          feature: "ダージリンに、ローズやローズヒップ、ハイビスカス、ペパーミントなど、爽やかさや清涼感を感じるハーブをブレンド。ピッタの熱や緊張に寄り添い、クールダウンしながら、力をゆるめて穏やかな状態へ調律します。",
          keywords: "緩める・冷ます・手放す"
        }
      },
      {
        key: "mezameru",
        label: "めざめる",
        resultText: "動く、変える、軽くする。",
        heading: "🌾 めざめる ― カパ",
        lead: "動く、変える、軽くする。",
        body: [
          "今日はいつもの流れを少し変えて、心と身体を軽やかに動かす時間を。",
          "あなたには今、",
          "「休むこと」より「一歩動き出すこと」が必要なのかもしれません。",
          "そんな今日におすすめなのが",
          "Ayurveda 調律ハーブ紅茶「めざめる」。"
        ],
        emphasis: "「休むこと」より「一歩動き出すこと」が必要なのかもしれません。",
        product: {
          name: "Ayurveda 調律ハーブ紅茶「めざめる」",
          dosha: "カパ",
          sense: "嗅覚",
          volume: "30g（リーフティー）",
          ingredients: "イングリッシュブレンド（アッサム＆セイロン）、ジンジャー、ローズマリー、シナモン、オレンジピール",
          feature: "紅茶に、ジンジャーやローズマリー、シナモン、オレンジピールなど、スパイス感と香りの立つハーブをブレンド。カパの重さや停滞に寄り添い、心地よい刺激で軽やかさを引き出し、一歩動き出すきっかけへ調律します。",
          keywords: "動く・変える・軽くする"
        }
      }
    ],
    commonConcept: {
      heading: "Ayurveda 調律茶",
      body: [
        "五感を調律し、本来のあなたへ。",
        "「今日は自分に何が必要？」",
        "その日の心や身体の感覚に耳を澄ませて、",
        "今の自分に必要な一杯を選ぶ。",
        "めぐる・やわらぐ・めざめる",
        "3つの調律から、今日のあなたに寄り添う一杯を。"
      ]
    },
    tieBreakerQuestionId: "q7",
    questions: [
      {
        id: "q1",
        prompt: "Q1．今のあなたに一番近いのは？",
        choices: [
          { id: "meguru", label: "A．頭の中が忙しく、あれこれ考えている", scores: { meguru: 1 } },
          { id: "yawaragu", label: "B．やることが多く、ちょっと力が入っている", scores: { yawaragu: 1 } },
          { id: "mezameru", label: "C．なんとなく重くて、動き出すのがおっくう", scores: { mezameru: 1 } }
        ]
      },
      {
        id: "q2",
        prompt: "Q2．今、どんな時間があったら嬉しい？",
        choices: [
          { id: "meguru", label: "A．温かい飲み物をゆっくり飲んで、ほっとしたい", scores: { meguru: 1 } },
          { id: "yawaragu", label: "B．静かな場所でひと息ついて、頭を休めたい", scores: { yawaragu: 1 } },
          { id: "mezameru", label: "C．音楽を聴いたり、少し歩いたり、気分を変えたい", scores: { mezameru: 1 } }
        ]
      },
      {
        id: "q3",
        prompt: "Q3．今の気分を「空」で表すなら？",
        choices: [
          { id: "meguru", label: "A．風が吹いて、雲がどんどん流れている空", scores: { meguru: 1 } },
          { id: "yawaragu", label: "B．太陽がまぶしい、澄みきった空", scores: { yawaragu: 1 } },
          { id: "mezameru", label: "C．朝もやがかかった、静かな空", scores: { mezameru: 1 } }
        ]
      },
      {
        id: "q4",
        prompt: "Q4．今、一番惹かれる景色は？",
        choices: [
          { id: "meguru", label: "A．木々が風に揺れる、広々とした草原", scores: { meguru: 1 } },
          { id: "yawaragu", label: "B．光がきらめく、涼しげな水辺", scores: { yawaragu: 1 } },
          { id: "mezameru", label: "C．緑が深く、生命力を感じる森", scores: { mezameru: 1 } }
        ]
      },
      {
        id: "q5",
        prompt: "Q5．今日の身体に近いのは？",
        choices: [
          { id: "meguru", label: "A．落ち着かず、そわそわする感じ", scores: { meguru: 1 } },
          { id: "yawaragu", label: "B．熱がこもる、または肩や身体に力が入りやすい感じ", scores: { yawaragu: 1 } },
          { id: "mezameru", label: "C．どっしりしていて、少し重たい感じ", scores: { mezameru: 1 } }
        ]
      },
      {
        id: "q6",
        prompt: "Q6．もし今、ひとつだけ手放せるとしたら？",
        choices: [
          { id: "meguru", label: "A．頭の中の「あれもしなきゃ、これもしなきゃ」", scores: { meguru: 1 } },
          { id: "yawaragu", label: "B．「ちゃんとしなきゃ」という頑張り", scores: { yawaragu: 1 } },
          { id: "mezameru", label: "C．「あとでいいや」という重たい気分", scores: { mezameru: 1 } }
        ]
      },
      {
        id: "q7",
        prompt: "Q7．最後は直感で✨\n今、あなたが一番惹かれる言葉は？",
        choices: [
          { id: "meguru", label: "A．ゆっくり。温かく。もう一度。", scores: { meguru: 2 } },
          { id: "yawaragu", label: "B．緩める。冷ます。手放す。", scores: { yawaragu: 2 } },
          { id: "mezameru", label: "C．動く。変える。軽くする。", scores: { mezameru: 2 } }
        ]
      }
    ]
  };
}));
