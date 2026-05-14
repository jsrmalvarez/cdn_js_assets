import { initQuizzes } from "./quiz.js";

initQuizzes();

if (document.documentElement.dataset.cookieConsentEnabled === "true") {
  void import("./cookie-consent.js").then((m) => m.initCookieConsent());
}
