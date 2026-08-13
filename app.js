(function startApp(root, document) {
  "use strict";

  const form = document.getElementById("dosha-form");
  const errorMessage = document.getElementById("form-error");
  const resultSection = document.getElementById("result");
  const resultTitle = document.getElementById("result-title");
  const resultRows = document.getElementById("result-rows");
  const recommendationContent = document.getElementById("recommendation-content");
  const calculator = root.DoshaCalculator;

  function appendCell(row, text, tagName) {
    const cell = document.createElement(tagName);
    cell.textContent = text;
    if (tagName === "th") {
      cell.scope = "row";
    }
    row.appendChild(cell);
  }

  function renderRows(result) {
    resultRows.replaceChildren();

    calculator.DOSHAS.forEach(function renderDosha(dosha) {
      const row = document.createElement("tr");
      appendCell(row, dosha.label, "th");
      appendCell(row, String(result.scores[dosha.key]), "td");
      appendCell(row, result.percentages[dosha.key].toFixed(1) + "%", "td");
      resultRows.appendChild(row);
    });
  }

  function renderRecommendation(result) {
    recommendationContent.replaceChildren();
    const recommendations = root.FUNNEL_CONFIG && root.FUNNEL_CONFIG.recommendations;
    const recommendationKey = result.isCompound ? "compound" : result.dominantKeys[0];
    const recommendation = recommendations && recommendations[recommendationKey];

    if (!recommendation || !recommendation.name) {
      const pendingMessage = document.createElement("p");
      pendingMessage.textContent = "おすすめ商品の情報は現在準備中です";
      recommendationContent.appendChild(pendingMessage);
      return;
    }

    const productName = document.createElement("p");
    productName.textContent = recommendation.name;
    recommendationContent.appendChild(productName);

    if (recommendation.description) {
      const productDescription = document.createElement("p");
      productDescription.textContent = recommendation.description;
      recommendationContent.appendChild(productDescription);
    }
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.hidden = false;
    resultSection.hidden = true;
  }

  form.addEventListener("submit", function handleSubmit(event) {
    event.preventDefault();
    errorMessage.hidden = true;

    try {
      const result = calculator.calculateDosha({
        vata: form.elements.vata.value,
        pitta: form.elements.pitta.value,
        kapha: form.elements.kapha.value
      });

      resultTitle.textContent = "あなたの結果：" + result.resultLabel;
      renderRows(result);
      renderRecommendation(result);
      resultSection.hidden = false;
      resultTitle.focus();
    } catch (error) {
      showError(error.message);
    }
  });
}(globalThis, document));
