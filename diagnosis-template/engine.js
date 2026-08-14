(function exposeDiagnosisEngine(root, factory) {
  const engine = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = engine;
  }

  root.DiagnosisEngine = engine;
}(typeof globalThis !== "undefined" ? globalThis : this, function createDiagnosisEngine() {
  "use strict";

  function requireNonEmptyText(value, message) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error(message);
    }
    return value.trim();
  }

  function validateConfig(config) {
    if (!config || typeof config !== "object") {
      throw new Error("診断設定が必要です。");
    }
    if (!Array.isArray(config.axes) || config.axes.length === 0) {
      throw new Error("結果軸を1件以上設定してください。");
    }

    const axisKeys = new Set();
    config.axes.forEach(function validateAxis(axis) {
      const key = requireNonEmptyText(axis && axis.key, "結果軸のキーが必要です。");
      requireNonEmptyText(axis.label, "結果軸の表示名が必要です。");
      if (!/^[a-z][a-z0-9_-]*$/.test(key) || axisKeys.has(key)) {
        throw new Error("結果軸のキーは重複しない英小文字始まりの識別子にしてください。");
      }
      axisKeys.add(key);
    });

    if (!Array.isArray(config.questions) || config.questions.length === 0) {
      throw new Error("設問を1件以上設定してください。");
    }

    const questionIds = new Set();
    config.questions.forEach(function validateQuestion(question) {
      const questionId = requireNonEmptyText(question && question.id, "設問IDが必要です。");
      requireNonEmptyText(question.prompt, "設問文が必要です。");
      if (questionIds.has(questionId)) {
        throw new Error("設問IDは重複できません。");
      }
      questionIds.add(questionId);

      if (!Array.isArray(question.choices) || question.choices.length < 2) {
        throw new Error("各設問に選択肢を2件以上設定してください。");
      }

      const choiceIds = new Set();
      question.choices.forEach(function validateChoice(choice) {
        const choiceId = requireNonEmptyText(choice && choice.id, "選択肢IDが必要です。");
        requireNonEmptyText(choice.label, "選択肢の表示文が必要です。");
        if (choiceIds.has(choiceId)) {
          throw new Error("同じ設問内で選択肢IDは重複できません。");
        }
        choiceIds.add(choiceId);

        if (!choice.scores || typeof choice.scores !== "object" || Array.isArray(choice.scores)) {
          throw new Error("選択肢の加点設定が必要です。");
        }

        let positiveScoreExists = false;
        Object.keys(choice.scores).forEach(function validateScore(axisKey) {
          const score = choice.scores[axisKey];
          if (!axisKeys.has(axisKey)) {
            throw new Error("定義されていない結果軸へは加点できません。");
          }
          if (!Number.isSafeInteger(score) || score < 0) {
            throw new Error("加点値は0以上の安全な整数にしてください。");
          }
          positiveScoreExists = positiveScoreExists || score > 0;
        });

        if (!positiveScoreExists) {
          throw new Error("各選択肢は少なくとも1点を加点してください。");
        }
      });
    });

    return config;
  }

  function calculateDiagnosis(config, answers) {
    validateConfig(config);
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
      throw new Error("全設問に回答してください。");
    }

    const questionIds = new Set(config.questions.map(function getQuestionId(question) {
      return question.id;
    }));
    Object.keys(answers).forEach(function rejectUnknownQuestion(questionId) {
      if (!questionIds.has(questionId)) {
        throw new Error("存在しない設問への回答が含まれています。");
      }
    });

    const scores = {};
    config.axes.forEach(function initializeScore(axis) {
      scores[axis.key] = 0;
    });

    config.questions.forEach(function scoreAnswer(question) {
      const selectedChoice = question.choices.find(function findChoice(choice) {
        return choice.id === answers[question.id];
      });
      if (!selectedChoice) {
        throw new Error("全設問で表示されている選択肢を1つ選んでください。");
      }

      Object.keys(selectedChoice.scores).forEach(function addScore(axisKey) {
        const nextScore = scores[axisKey] + selectedChoice.scores[axisKey];
        if (!Number.isSafeInteger(nextScore)) {
          throw new Error("合計点が大きすぎます。");
        }
        scores[axisKey] = nextScore;
      });
    });

    const total = config.axes.reduce(function sumScores(sum, axis) {
      return sum + scores[axis.key];
    }, 0);
    const percentages = {};
    config.axes.forEach(function calculatePercentage(axis) {
      percentages[axis.key] = Number(((scores[axis.key] / total) * 100).toFixed(1));
    });

    const highestScore = Math.max.apply(null, config.axes.map(function getScore(axis) {
      return scores[axis.key];
    }));
    const leaders = config.axes.filter(function findLeader(axis) {
      return scores[axis.key] === highestScore;
    }).map(function getLeaderKey(axis) {
      return axis.key;
    });

    return {
      scores: scores,
      percentages: percentages,
      leaders: leaders,
      answeredQuestionCount: config.questions.length
    };
  }

  return {
    validateConfig: validateConfig,
    calculateDiagnosis: calculateDiagnosis
  };
}));
