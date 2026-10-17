(function startDiagnosisApp(root, document) {
  "use strict";

  function resolvePrimaryAxisKey(config, answers, result) {
    if (result.outcome === "neutral" || result.leaders.length === 0) {
      return null;
    }
    if (result.leaders.length === 1 || !config.tieBreakerQuestionId) {
      return result.leaders[0];
    }
    const tieBreakerQuestion = config.questions.find(function findTieBreakerQuestion(question) {
      return question.id === config.tieBreakerQuestionId;
    });
    const tieBreakerChoice = tieBreakerQuestion.choices.find(function findTieBreakerChoice(choice) {
      return choice.id === answers[config.tieBreakerQuestionId];
    });
    const tieBreakerAxisKey = Object.keys(tieBreakerChoice.scores).find(function findPositiveAxisKey(axisKey) {
      return tieBreakerChoice.scores[axisKey] > 0;
    });
    if (result.leaders.includes(tieBreakerAxisKey)) {
      return tieBreakerAxisKey;
    }
    for (let questionIndex = config.questions.length - 1; questionIndex >= 0; questionIndex -= 1) {
      const question = config.questions[questionIndex];
      if (question.id === config.tieBreakerQuestionId) {
        continue;
      }
      const selectedChoice = question.choices.find(function findSelectedChoice(choice) {
        return choice.id === answers[question.id];
      });
      const selectedAxisKey = Object.keys(selectedChoice.scores).find(function findPositiveAxisKey(axisKey) {
        return selectedChoice.scores[axisKey] > 0;
      });
      if (result.leaders.includes(selectedAxisKey)) {
        return selectedAxisKey;
      }
    }
    return result.leaders[0];
  }

  // Image settings are optional and limited to files in this template's assets/.
  // No arbitrary URL, data URI, or path traversal is accepted from a client config.
  function safeVisual(visual) {
    if (!visual || typeof visual.file !== "string" ||
        !/^[a-zA-Z0-9][a-zA-Z0-9_-]*\.(?:png|jpg|jpeg|webp)$/.test(visual.file) ||
        typeof visual.alt !== "string" || !visual.alt.trim()) {
      return null;
    }
    return {
      file: visual.file,
      alt: visual.alt,
      caption: typeof visual.caption === "string" ? visual.caption : "",
      color: /^#[a-fA-F0-9]{6}$/.test(visual.color || "") ? visual.color : null
    };
  }

  // Analytics is optional. Only Cloudflare Web Analytics with a plain token is accepted;
  // an empty or invalid token keeps the page free of external requests and URL changes.
  function safeAnalytics(analytics) {
    if (!analytics || analytics.provider !== "cloudflare" ||
        typeof analytics.token !== "string" || !/^[A-Za-z0-9]{16,64}$/.test(analytics.token)) {
      return null;
    }
    return { provider: "cloudflare", token: analytics.token };
  }

  if (typeof module === "object" && module.exports) {
    module.exports = {
      resolvePrimaryAxisKey: resolvePrimaryAxisKey,
      safeVisual: safeVisual,
      safeAnalytics: safeAnalytics
    };
  }

  if (!document) {
    return;
  }

  const config = root.DiagnosisConfig;
  const engine = root.DiagnosisEngine;
  const scriptUrl = document.currentScript ? document.currentScript.src : document.baseURI;
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
  const analytics = safeAnalytics(config && config.analytics);
  const basePath = root.location ? root.location.pathname.replace(/[^/]*$/, "") : "/";
  let questionIndex = 0;
  let restoringHistory = false;
  let appReady = false;

  function appendTextElement(parent, tagName, text, className) {
    const element = document.createElement(tagName);
    element.textContent = text;
    if (className) {
      element.className = className;
    }
    parent.appendChild(element);
    return element;
  }

  function appendProductDetail(parent, label, value) {
    appendTextElement(parent, "dt", label);
    appendTextElement(parent, "dd", value);
  }

  function appendVisual(parent, visual, className) {
    const safe = safeVisual(visual);
    if (!safe) {
      return null;
    }
    const figure = document.createElement("figure");
    figure.className = className;
    const picture = document.createElement("img");
    picture.alt = safe.alt;
    picture.decoding = "async";
    picture.width = className === "start-visual" ? 1536 : 1536;
    picture.height = className === "start-visual" ? 1024 : 1536;
    picture.addEventListener("error", function hideUnavailableImage() {
      figure.hidden = true;
    });
    picture.src = new URL("assets/" + safe.file, scriptUrl).href;
    figure.appendChild(picture);
    if (safe.caption) {
      appendTextElement(figure, "figcaption", safe.caption);
    }
    parent.appendChild(figure);
    return figure;
  }

  function renderPresentation() {
    const presentation = config.presentation;
    if (!presentation) {
      return;
    }
    document.documentElement.classList.add("brand-presentation");
    const questionBrand = appendTextElement(questionScreen, "p", config.brand || "", "brand question-brand");
    questionScreen.prepend(questionBrand);
    [document.getElementById("start-brand"), document.getElementById("result-brand"), questionBrand]
      .forEach(function addLocation(brand) {
        if (presentation.location) {
          appendTextElement(brand, "span", presentation.location, "brand-location");
        }
      });
    const hero = appendVisual(startScreen, presentation.startImage, "start-visual");
    if (hero) {
      startScreen.insertBefore(hero, document.getElementById("page-eyebrow"));
    }
    if (presentation.subtitle) {
      const subtitle = appendTextElement(startScreen, "p", presentation.subtitle, "start-subtitle");
      startScreen.insertBefore(subtitle, document.getElementById("page-description"));
    }
    const description = document.getElementById("page-description");
    appendTextElement(description, "span",
      "全" + config.questions.length + "問" + (presentation.duration ? "・" + presentation.duration : ""), "start-duration");
    if (presentation.showAxes) {
      // Preview the result axes as colored chips instead of a sentence listing them.
      const axisList = document.createElement("ul");
      axisList.className = "start-axes";
      axisList.setAttribute("aria-label", "チェックする項目");
      config.axes.forEach(function renderAxisChip(axis) {
        const chip = appendTextElement(axisList, "li", axis.label, "start-axis");
        if (/^#[a-fA-F0-9]{6}$/.test(axis.color || "")) {
          chip.style.setProperty("--axis-color", axis.color);
        }
      });
      description.after(axisList);
    }
    const arrow = appendTextElement(startButton, "span", "›", "start-arrow");
    arrow.setAttribute("aria-hidden", "true");
    if (presentation.notice) {
      const notice = appendTextElement(startScreen, "p", presentation.notice, "start-notice");
      startButton.after(notice);
    }
  }

  function renderCta(parent, cta) {
    if (!cta) {
      return;
    }
    const link = appendTextElement(parent, "a", cta.label, "result-cta");
    link.href = cta.url;
    link.referrerPolicy = "no-referrer";
    restartButton.classList.add("secondary-button");
  }

  function renderProductDetails(parent, product) {
    if (!product) {
      return;
    }
    const productSection = document.createElement("section");
    productSection.className = "product-details";
    appendTextElement(productSection, "h4", product.name);
    const details = document.createElement("dl");
    appendProductDetail(details, "ドーシャ", product.dosha);
    appendProductDetail(details, "五感", product.sense);
    appendProductDetail(details, "内容量", product.volume);
    appendProductDetail(details, "原材料", product.ingredients);
    appendProductDetail(details, "特徴", product.feature);
    appendProductDetail(details, "キーワード", product.keywords);
    productSection.appendChild(details);
    parent.appendChild(productSection);
  }

  function renderCommonConcept(parent, commonConcept) {
    if (!commonConcept) {
      return;
    }
    const conceptSection = document.createElement("section");
    conceptSection.className = "common-concept";
    appendTextElement(conceptSection, "h3", commonConcept.heading);
    commonConcept.body.forEach(function renderConceptParagraph(text) {
      appendTextElement(conceptSection, "p", text);
    });
    parent.appendChild(conceptSection);
  }

  function showScreen(screen) {
    [startScreen, questionScreen, resultScreen].forEach(function hideScreen(currentScreen) {
      currentScreen.hidden = currentScreen !== screen;
    });
    recordStep(screen);
  }

  // Each step gets its own path (q1 ... qN, result) so page-view analytics can show drop-off.
  function stepFor(screen) {
    if (screen === questionScreen) {
      return "q" + (questionIndex + 1);
    }
    return screen === resultScreen ? "result" : "";
  }

  function recordStep(screen) {
    if (!analytics || !appReady || restoringHistory || !root.history) {
      return;
    }
    const step = stepFor(screen);
    const path = basePath + step;
    if (root.location.pathname === path) {
      return;
    }
    root.history.pushState({ diagnosisStep: step }, "", path);
  }

  function loadAnalytics() {
    if (!analytics) {
      return;
    }
    const beacon = document.createElement("script");
    beacon.type = "module";
    beacon.src = "https://static.cloudflareinsights.com/beacon.min.js";
    beacon.setAttribute("data-cf-beacon", JSON.stringify({ token: analytics.token }));
    document.head.appendChild(beacon);
  }

  function restoreStep(step) {
    restoringHistory = true;
    try {
      const match = /^q(\d+)$/.exec(step || "");
      const allAnswered = config.questions.every(function hasAnswer(question) {
        return Boolean(answers[question.id]);
      });
      if (match && Number(match[1]) >= 1 && Number(match[1]) <= config.questions.length) {
        questionIndex = Number(match[1]) - 1;
        renderQuestion();
      } else if (step === "result" && allAnswered) {
        renderResult(engine.calculateDiagnosis(config, answers));
      } else {
        questionIndex = 0;
        showScreen(startScreen);
        startButton.focus();
      }
    } finally {
      restoringHistory = false;
    }
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
    document.getElementById("start-brand").textContent = config.brand || "";
    document.getElementById("result-brand").textContent = config.brand || "";
    startButton.textContent = config.labels.start;
    previousButton.textContent = config.labels.previous;
    restartButton.textContent = config.labels.restart;
    resultTitle.textContent = config.resultTitle;
    const resultDescription = document.getElementById("result-description");
    resultDescription.textContent = config.resultDescription;
    resultDescription.hidden = !config.resultDescription || config.hideResultDescription;
  }

  // Optional one-line guidance for respondents who cannot decide between choices.
  function answerHint() {
    return typeof config.answerHint === "string" ? config.answerHint.trim() : "";
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
    if (answerHint()) {
      appendTextElement(questionFieldset, "p", answerHint(), "answer-hint question-hint");
    }

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
    resultScreen.style.removeProperty("--axis-color");
    resultScreen.dataset.outcome = result.outcome || "scored";
    delete resultScreen.dataset.axis;
    restartButton.classList.remove("secondary-button");
    if (result.outcome === "neutral") {
      delete resultScreen.dataset.layout;
      const neutral = config.neutralResult || {
        title: "今回は判定を保留します",
        body: ["今回の回答だけでは、特定の結果をおすすめする材料がありません。無理にタイプを決める必要はありません。"]
      };
      resultTitle.textContent = neutral.title;
      const neutralCard = document.createElement("section");
      neutralCard.className = "axis-text neutral-result";
      neutral.body.forEach(function renderNeutralParagraph(text) {
        appendTextElement(neutralCard, "p", text);
      });
      renderCta(neutralCard, neutral.cta);
      resultTexts.appendChild(neutralCard);
      showScreen(resultScreen);
      resultTitle.focus();
      return;
    }
    if (config.resultLayout === "scores") {
      resultScreen.dataset.layout = "scores";
      resultTitle.textContent = config.resultTitle;
      config.axes.forEach(function renderScoreAxis(axis) {
        const axisColor = /^#[a-fA-F0-9]{6}$/.test(axis.color || "") ? axis.color : null;
        const row = document.createElement("tr");
        row.className = "result-row";
        row.dataset.axis = axis.key;
        if (result.leaders.includes(axis.key)) {
          row.classList.add("is-leader");
        }
        row.style.setProperty("--axis-percent", result.percentages[axis.key] + "%");
        if (axisColor) {
          row.style.setProperty("--axis-color", axisColor);
        }
        appendTextElement(row, "th", axis.label).scope = "row";
        appendTextElement(row, "td", String(result.scores[axis.key]), "result-score");
        appendTextElement(row, "td", result.percentages[axis.key].toFixed(1) + "%", "result-percent");
        resultRows.appendChild(row);
        const textCard = document.createElement("section");
        textCard.className = "axis-text";
        textCard.dataset.axis = axis.key;
        if (axisColor) {
          textCard.style.setProperty("--axis-color", axisColor);
        }
        appendTextElement(textCard, "h3", axis.label);
        appendTextElement(textCard, "p", axis.resultText);
        resultTexts.appendChild(textCard);
      });
      showScreen(resultScreen);
      resultTitle.focus();
      return;
    }
    const primaryAxis = config.axes.find(function findPrimaryAxis(axis) {
      return axis.key === resolvePrimaryAxisKey(config, answers, result);
    });
    resultTitle.textContent = config.resultTitle;
    resultScreen.dataset.axis = primaryAxis.key;
    const visual = safeVisual(primaryAxis.visual);
    if (visual && visual.color) {
      resultScreen.style.setProperty("--axis-color", visual.color);
    }

    const textCard = document.createElement("section");
    textCard.className = "axis-text primary-axis";
    appendTextElement(textCard, "h3", primaryAxis.heading || primaryAxis.label);
    if (config.presentation) {
      appendVisual(textCard, primaryAxis.visual, "result-visual");
    }
    if (primaryAxis.lead) {
      appendTextElement(textCard, "p", primaryAxis.lead, "result-lead");
    }
    if (config.presentation) {
      renderCta(textCard, primaryAxis.cta);
    }
    if (primaryAxis.body) {
      primaryAxis.body.forEach(function renderBodyParagraph(text) {
        appendTextElement(textCard, "p", text, text === primaryAxis.emphasis ? "result-emphasis" : "");
      });
    } else {
      appendTextElement(textCard, "p", primaryAxis.resultText);
    }
    if (!config.presentation) {
      renderCta(textCard, primaryAxis.cta);
    }
    renderProductDetails(textCard, primaryAxis.product);
    resultTexts.appendChild(textCard);
    renderCommonConcept(resultTexts, config.commonConcept);
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
    renderPresentation();
    if (analytics) {
      if (root.location.pathname !== basePath && root.location.pathname !== basePath + "index.html") {
        root.history.replaceState({ diagnosisStep: "" }, "", basePath);
      }
      root.addEventListener("popstate", function handleHistory(event) {
        restoreStep(event.state && event.state.diagnosisStep);
      });
      loadAnalytics();
    }
    showScreen(startScreen);
    appReady = true;
  } catch (error) {
    errorMessage.textContent = error.message;
    errorMessage.hidden = false;
    showScreen(questionScreen);
    nextButton.disabled = true;
  }
}(globalThis, typeof document === "undefined" ? null : document));
