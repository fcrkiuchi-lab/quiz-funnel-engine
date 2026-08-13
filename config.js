(function exposeConfig(root) {
  "use strict";

  root.FUNNEL_CONFIG = Object.freeze({
    recommendations: Object.freeze({
      vata: null,
      pitta: null,
      kapha: null,
      compound: null
    })
  });
}(typeof globalThis !== "undefined" ? globalThis : this));
