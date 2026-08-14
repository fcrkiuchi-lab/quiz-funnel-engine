(function startDiagnosisApp(root, document) {
  "use strict";

  const config = root.DiagnosisConfig;
  const engine = root.DiagnosisEngine;
  const startScreen = document.getElementById("start-screen");
  const questionScreen = document.getElementById("question-screen");
  const resultScreen = document.getElementById("result-screen");
  const startButton = document.getElementById("start-button");
  const questionForm = document.getElementById("question-form");
  const questionFieldset = document.getElementById("question-fieldset");
  const errorMessage = document.getElementById("form-error");
  const resultTitle = document.getElementById("result-title");
  const resultRows = document.getElementById("result-rows");
  const resultTexts = document.getElementById("result-texts");
  const previousButton = document.getElementById("previous-button");
  const nextButton = document.getElementById("next-button");
  const restartButton = document.getElementById("restart-button");
  const progressText = document.getElementById("progress-text");
  const progressBar = document.getElementById("progress-bar");
  const answers = Object.create(null);
  let questionIndex = 0;

  function appendTextElement(parent, tagName, text, className) {
    const element = document.createElement(tagName);
    element.textContent = text;
    if (className) {
      element.className = className;
    }
    parent.appendChild(element);
    return element;
  }

  function showScreen(screen) {
    [startScreen, questionScreen, resultScreen].forEach(function hideScreen(currentScreen) {
      currentScreen.hidden = currentScreen !== screen;
    });
  }

  function applyTheme() {
    Object.keys(config.theme).forEach(function setColor(colorName) {
      document.documentElement.style.setProperty("--" + colorName.replace(/[A-Z]/g, function addDash(letter) {
        return "-" + letter.toLowerCase();
      }), config.theme[colorName]);
    });
  }

  function renderStart() {
    document.title = config.title;
    document.querySelector('meta[name="description"]').content = config.description;
    document.getElementById("page-eyebrow").textContent = config.eyebrow;
    document.getElementById("page-title").textContent = config.title;
    document.getElementById("page-description").textContent = config.description;
    startButton.textContent = config.labels.start;
    previousButton.textContent = config.labels.previous;
    restartButton.textContent = config.labels.restart;
    resultTitle.textContent = config.resultTitle;
    document.getElementById("result-description").textContent = config.resultDescription;
  }

  function renderQuestion() {
    const question = config.questions[questionIndex];
    questionFieldset.replaceChildren();
    errorMessage.hidden = true;

    const legend = document.createElement("legend");
    legend.id = "question-title";
    legend.tabIndex = -1;
    legend.textContent = question.prompt;
    questionFieldset.appendChild(legend);

    question.choices.forEach(function renderChoice(choice) {
      const label = document.createElement("label");
      label.className = "choice";
      const input = document.createElement("input");
      input.type = "radio";
      input.name = question.id;
      input.value = choice.id;
      input.checked = answers[question.id] === choice.id;
      input.required = true;
      label.appendChild(input);
      appendTextElement(label, "span", choice.label);
      questionFieldset.appendChild(label);
    });

    progressText.textContent = "質問 " + (questionIndex + 1) + " / " + config.questions.length;
    progressBar.max = config.questions.length;
    progressBar.value = questionIndex + 1;
    previousButton.hidden = questionIndex === 0;
    nextButton.textContent = questionIndex === config.questions.length - 1 ? config.labels.finish : config.labels.next;
    showScreen(questionScreen);
    legend.focus();
  }

  function renderResult(result) {
    resultRows.replaceChildren();
    resultTexts.replaceChildren();
    config.axes.forEach(function renderAxis(axis) {
      const row = document.createElement("tr");
      row.className = "result-row";
      row.style.setProperty("--axis-percent", result.percentages[axis.key] + "%");
      appendTextElement(row, "th", axis.label).scope = "row";
      appendTextElement(row, "td", String(result.scores[axis.key]));
      appendTextElement(row, "td", result.percentages[axis.key].toFixed(1) + "%", "result-percent");
      resultRows.appendChild(row);

      const textCard = document.createElement("section");
      textCard.className = "axis-text";
      textCard.style.setProperty("--axis-percent", result.percentages[axis.key] + "%");
      appendTextElement(textCard, "h3", axis.label);
      appendTextElement(textCard, "p", axis.resultText);
      resultTexts.appendChild(textCard);
    });
    showScreen(resultScreen);
    resultTitle.focus();
  }

  questionForm.addEventListener("submit", function handleSubmit(event) {
    event.preventDefault();
    errorMessage.hidden = true;
    const question = config.questions[questionIndex];
    const selectedChoice = new FormData(questionForm).get(question.id);
    if (!selectedChoice) {
      errorMessage.textContent = "選択肢を1つ選んでください。";
      errorMessage.hidden = false;
      return;
    }

    answers[question.id] = selectedChoice;
    if (questionIndex < config.questions.length - 1) {
      questionIndex += 1;
      renderQuestion();
      return;
    }

    try {
      renderResult(engine.calculateDiagnosis(config, answers));
    } catch (error) {
      errorMessage.textContent = error.message;
      errorMessage.hidden = false;
    }
  });

  startButton.addEventListener("click", function startDiagnosis() {
    questionIndex = 0;
    renderQuestion();
  });

  previousButton.addEventListener("click", function showPreviousQuestion() {
    const question = config.questions[questionIndex];
    const selectedChoice = new FormData(questionForm).get(question.id);
    if (selectedChoice) {
      answers[question.id] = selectedChoice;
    }
    questionIndex -= 1;
    renderQuestion();
  });

  restartButton.addEventListener("click", function restartDiagnosis() {
    Object.keys(answers).forEach(function clearAnswer(questionId) {
      delete answers[questionId];
    });
    questionIndex = 0;
    showScreen(startScreen);
    startButton.focus();
  });

  try {
    engine.validateConfig(config);
    applyTheme();
    renderStart();
    showScreen(startScreen);
  } catch (error) {
    errorMessage.textContent = error.message;
    errorMessage.hidden = false;
    showScreen(questionScreen);
    nextButton.disabled = true;
  }
}(globalThis, document));
