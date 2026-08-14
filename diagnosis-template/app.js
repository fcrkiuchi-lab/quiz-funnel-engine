(function startDiagnosisApp(root, document) {
  "use strict";

  const config = root.DiagnosisConfig;
  const engine = root.DiagnosisEngine;
  const integration = root.DiagnosisIntegration;
  const form = document.getElementById("diagnosis-form");
  const questionList = document.getElementById("question-list");
  const errorMessage = document.getElementById("form-error");
  const resultSection = document.getElementById("result");
  const resultTitle = document.getElementById("result-title");
  const resultRows = document.getElementById("result-rows");
  const leaderText = document.getElementById("leader-text");
  const integrationStatus = document.getElementById("integration-status");

  function appendTextElement(parent, tagName, text, className) {
    const element = document.createElement(tagName);
    element.textContent = text;
    if (className) {
      element.className = className;
    }
    parent.appendChild(element);
    return element;
  }

  function renderQuestions() {
    document.title = config.title;
    document.getElementById("page-title").textContent = config.title;
    document.getElementById("page-description").textContent = config.description;

    config.questions.forEach(function renderQuestion(question, questionIndex) {
      const fieldset = document.createElement("fieldset");
      const legend = document.createElement("legend");
      legend.textContent = (questionIndex + 1) + ". " + question.prompt;
      fieldset.appendChild(legend);

      question.choices.forEach(function renderChoice(choice) {
        const label = document.createElement("label");
        label.className = "choice";
        const input = document.createElement("input");
        input.type = "radio";
        input.name = question.id;
        input.value = choice.id;
        input.required = true;
        label.appendChild(input);
        appendTextElement(label, "span", choice.label);
        fieldset.appendChild(label);
      });
      questionList.appendChild(fieldset);
    });
  }

  function renderResult(result) {
    resultRows.replaceChildren();
    config.axes.forEach(function renderAxis(axis) {
      const row = document.createElement("tr");
      appendTextElement(row, "th", axis.label).scope = "row";
      appendTextElement(row, "td", String(result.scores[axis.key]));
      appendTextElement(row, "td", result.percentages[axis.key].toFixed(1) + "%");
      resultRows.appendChild(row);
    });

    const leaderLabels = config.axes.filter(function isLeader(axis) {
      return result.leaders.includes(axis.key);
    }).map(function getLabel(axis) {
      return axis.label;
    });
    leaderText.textContent = "最高点: " + leaderLabels.join("／");
    resultSection.hidden = false;
    resultTitle.focus();
  }

  function collectAnswers() {
    const formData = new FormData(form);
    const answers = {};
    config.questions.forEach(function collectAnswer(question) {
      const answer = formData.get(question.id);
      if (answer !== null) {
        answers[question.id] = answer;
      }
    });
    return answers;
  }

  form.addEventListener("submit", async function handleSubmit(event) {
    event.preventDefault();
    errorMessage.hidden = true;
    integrationStatus.textContent = "";

    try {
      const result = engine.calculateDiagnosis(config, collectAnswers());
      renderResult(result);
      const sendState = await integration.sendResult(config.integration, result);
      if (sendState.status === "sent") {
        integrationStatus.textContent = "結果を連携先へ送信しました。";
      }
    } catch (error) {
      errorMessage.textContent = error.message;
      errorMessage.hidden = false;
      resultSection.hidden = true;
    }
  });

  try {
    engine.validateConfig(config);
    renderQuestions();
  } catch (error) {
    errorMessage.textContent = error.message;
    errorMessage.hidden = false;
    form.querySelector("button").disabled = true;
  }
}(globalThis, document));
