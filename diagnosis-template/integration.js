(function exposeDiagnosisIntegration(root, factory) {
  const integration = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = integration;
  }

  root.DiagnosisIntegration = integration;
}(typeof globalThis !== "undefined" ? globalThis : this, function createDiagnosisIntegration() {
  "use strict";

  async function sendResult(settings, result, fetchImplementation) {
    if (!settings || settings.enabled !== true) {
      return { status: "disabled" };
    }
    if (typeof settings.endpoint !== "string" || !/^https:\/\//.test(settings.endpoint)) {
      throw new Error("連携先にはHTTPSのURLを設定してください。");
    }

    const request = fetchImplementation || globalThis.fetch;
    if (typeof request !== "function") {
      throw new Error("この環境では送信機能を利用できません。");
    }

    const payload = {
      schemaVersion: 1,
      diagnosisId: settings.diagnosisId || "diagnosis",
      scores: result.scores,
      percentages: result.percentages,
      leaders: result.leaders,
      answeredQuestionCount: result.answeredQuestionCount
    };
    const response = await request(settings.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "omit",
      referrerPolicy: "no-referrer"
    });

    if (!response || response.ok !== true) {
      throw new Error("結果を送信できませんでした。");
    }
    return { status: "sent", httpStatus: response.status };
  }

  return { sendResult: sendResult };
}));
