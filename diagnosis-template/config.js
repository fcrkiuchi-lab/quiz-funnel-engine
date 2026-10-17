(function exposeDiagnosisConfig(root, factory) {
  const config = factory();
  if (typeof module === "object" && module.exports) { module.exports = config; }
  root.DiagnosisConfig = config;
}(typeof globalThis !== "undefined" ? globalThis : this, function createDiagnosisConfig() {
  "use strict";
  return {
    "id": "dosha-sample-v1",
    "title": "Find Your Dosha",
    "eyebrow": "設定駆動型診断サンプル",
    "description": "7つの簡単な質問で、\nあなたのドーシャ傾向をチェック。\nヴァータ・ピッタ・カパの\nバランスを見てみましょう。",
    "resultTitle": "あなたの3軸スコア",
    "resultDescription": "回答から加点した値と、その合計に占める割合です。分類や体質の断定は行いません。",
    "labels": {
      "start": "チェックする",
      "next": "次の質問へ",
      "previous": "前の質問へ",
      "finish": "結果を見る",
      "restart": "もう一度回答する"
    },
    "theme": {
      "background": "#f5efe6",
      "surface": "#fffdf8",
      "primary": "#0b5e8e",
      "primaryText": "#ffffff",
      "accent": "#e2eff0",
      "text": "#273f48",
      "muted": "#52666b",
      "border": "#cedcda"
    },
    "axes": [
      {
        "key": "vata",
        "color": "#6f7fc0",
        "label": "ヴァータ",
        "resultText": "風と空の性質をもつドーシャ。軽やかで変化に富み、発想や行動のスピードに表れやすい傾向です。"
      },
      {
        "key": "pitta",
        "color": "#c8693a",
        "label": "ピッタ",
        "resultText": "火と水の性質をもつドーシャ。熱や鋭さをもち、集中力や判断の速さに表れやすい傾向です。"
      },
      {
        "key": "kapha",
        "color": "#4f8f72",
        "label": "カパ",
        "resultText": "水と地の性質をもつドーシャ。重さや安定をもち、穏やかさや持久力に表れやすい傾向です。"
      }
    ],
    "questions": [
      {
        "id": "q1",
        "prompt": "体つきについて、最も近いものは？",
        "choices": [
          {
            "id": "vata",
            "label": "細身で骨ばっていて、太りにくい",
            "scores": {
              "vata": 1
            }
          },
          {
            "id": "pitta",
            "label": "中肉中背で、筋肉がつきやすい",
            "scores": {
              "pitta": 1
            }
          },
          {
            "id": "kapha",
            "label": "がっしり・ふっくらしていて、太りやすい",
            "scores": {
              "kapha": 1
            }
          }
        ]
      },
      {
        "id": "q2",
        "prompt": "肌や髪の状態で、最も近いものは？",
        "choices": [
          {
            "id": "vata",
            "label": "乾燥しやすく、髪もパサつきやすい",
            "scores": {
              "vata": 1
            }
          },
          {
            "id": "pitta",
            "label": "赤みやほてりが出やすく、皮脂が多め",
            "scores": {
              "pitta": 1
            }
          },
          {
            "id": "kapha",
            "label": "しっとりしていて、髪は太く豊か",
            "scores": {
              "kapha": 1
            }
          }
        ]
      },
      {
        "id": "q3",
        "prompt": "食欲や消化について、最も近いものは？",
        "choices": [
          {
            "id": "vata",
            "label": "食欲にむらがあり、お腹が張りやすい",
            "scores": {
              "vata": 1
            }
          },
          {
            "id": "pitta",
            "label": "食欲旺盛で、食事を抜くとイライラする",
            "scores": {
              "pitta": 1
            }
          },
          {
            "id": "kapha",
            "label": "食欲は安定していて、一食抜いても平気",
            "scores": {
              "kapha": 1
            }
          }
        ]
      },
      {
        "id": "q4",
        "prompt": "眠りについて、最も近いものは？",
        "choices": [
          {
            "id": "vata",
            "label": "眠りが浅く、夜中に目が覚めやすい",
            "scores": {
              "vata": 1
            }
          },
          {
            "id": "pitta",
            "label": "短めでも、深く眠れる",
            "scores": {
              "pitta": 1
            }
          },
          {
            "id": "kapha",
            "label": "ぐっすり長く眠り、朝は起きにくい",
            "scores": {
              "kapha": 1
            }
          }
        ]
      },
      {
        "id": "q5",
        "prompt": "苦手な気候は？",
        "choices": [
          {
            "id": "vata",
            "label": "寒さ・乾燥・強い風",
            "scores": {
              "vata": 1
            }
          },
          {
            "id": "pitta",
            "label": "暑さ・強い日差し",
            "scores": {
              "pitta": 1
            }
          },
          {
            "id": "kapha",
            "label": "湿気・冷たい雨の日",
            "scores": {
              "kapha": 1
            }
          }
        ]
      },
      {
        "id": "q6",
        "prompt": "ストレスを感じたとき、出やすい反応は？",
        "choices": [
          {
            "id": "vata",
            "label": "不安や心配が増えて、落ち着かなくなる",
            "scores": {
              "vata": 1
            }
          },
          {
            "id": "pitta",
            "label": "イライラして、つい批判的になる",
            "scores": {
              "pitta": 1
            }
          },
          {
            "id": "kapha",
            "label": "やる気が出ず、引きこもりがちになる",
            "scores": {
              "kapha": 1
            }
          }
        ]
      },
      {
        "id": "q7",
        "prompt": "普段のテンポで、最も近いものは？",
        "choices": [
          {
            "id": "vata",
            "label": "動きも話し方も速く、気分が変わりやすい",
            "scores": {
              "vata": 1
            }
          },
          {
            "id": "pitta",
            "label": "目的に向かって効率よく、はっきり話す",
            "scores": {
              "pitta": 1
            }
          },
          {
            "id": "kapha",
            "label": "ゆったり落ち着いていて、マイペース",
            "scores": {
              "kapha": 1
            }
          }
        ]
      }
    ],
    "brand": "Salon de Krishna",
    "resultLayout": "scores",
    "presentation": {
      "duration": "約2分",
      "subtitle": "あなたのドーシャを見つけてみませんか？",
      "notice": "※医療上の診断を行うものではありません。"
    },
    "analytics": {
      "provider": "cloudflare",
      "token": ""
    }
  };
}));
