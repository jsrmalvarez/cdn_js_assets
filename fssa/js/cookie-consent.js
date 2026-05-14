const DEFAULT_CONFIG = {
  storageKey: "facturar_cookie_consent",
  acceptValue: "accept",
  rejectValue: "reject",
  title: "Cookies",
  text: "Este sitio solo usa cookies necesarias para su funcionamiento.",
  acceptLabel: "Aceptar",
  rejectLabel: "Rechazar",
};

function mergeConfig(raw) {
  return { ...DEFAULT_CONFIG, ...raw };
}

function readConfig(container) {
  const script = container.querySelector('script[type="application/json"]');
  if (!script) {
    return DEFAULT_CONFIG;
  }
  try {
    return mergeConfig(JSON.parse(script.textContent));
  } catch {
    return DEFAULT_CONFIG;
  }
}

function getStoredChoice(storageKey) {
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function setStoredChoice(storageKey, value) {
  try {
    window.localStorage.setItem(storageKey, value);
  } catch {
    /* ignore */
  }
}

function renderBanner(container, config) {
  container.innerHTML = "";
  container.classList.add("cookie-consent");

  const panel = document.createElement("div");
  panel.className = "cookie-consent__panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "false");
  panel.setAttribute("aria-labelledby", "cookie-consent-title");

  const title = document.createElement("h2");
  title.className = "cookie-consent__title";
  title.id = "cookie-consent-title";
  title.textContent = config.title;

  const body = document.createElement("p");
  body.className = "cookie-consent__text";
  body.textContent = config.text;

  const actions = document.createElement("div");
  actions.className = "cookie-consent__actions";

  const rejectBtn = document.createElement("button");
  rejectBtn.type = "button";
  rejectBtn.className = "cookie-consent__btn cookie-consent__btn--secondary";
  rejectBtn.textContent = config.rejectLabel;

  const acceptBtn = document.createElement("button");
  acceptBtn.type = "button";
  acceptBtn.className = "cookie-consent__btn cookie-consent__btn--primary";
  acceptBtn.textContent = config.acceptLabel;

  rejectBtn.addEventListener("click", () => {
    setStoredChoice(config.storageKey, config.rejectValue);
    container.remove();
  });

  acceptBtn.addEventListener("click", () => {
    setStoredChoice(config.storageKey, config.acceptValue);
    container.remove();
  });

  actions.append(rejectBtn, acceptBtn);
  panel.append(title, body, actions);
  container.append(panel);
}

export function initCookieConsent(selector = "[data-cookie-consent]") {
  const container = document.querySelector(selector);
  if (!container) {
    return;
  }

  const config = readConfig(container);
  if (getStoredChoice(config.storageKey)) {
    container.remove();
    return;
  }

  renderBanner(container, config);
}
