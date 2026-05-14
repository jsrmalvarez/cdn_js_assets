function getSelectedValues(formData, questionName, isMulti) {
  if (isMulti) {
    return formData.getAll(questionName);
  }
  const value = formData.get(questionName);
  return value ? [value] : [];
}

function computeScore(config, formData) {
  let total = 0;

  for (const question of config.questions) {
    const selectedValues = getSelectedValues(formData, question.id, question.type === "multi");
    for (const option of question.options) {
      if (selectedValues.includes(option.value)) {
        total += Number(option.score || 0);
      }
    }
  }

  return total;
}

function getMissingMandatoryQuestions(config, formData) {
  const missingQuestions = [];

  for (const question of config.questions) {
    if (!question.mandatory) {
      continue;
    }

    const selectedValues = getSelectedValues(formData, question.id, question.type === "multi");
    if (selectedValues.length === 0) {
      missingQuestions.push(question);
    }
  }

  return missingQuestions;
}

function resolveResult(results, score) {
  for (const item of results) {
    const min = Number(item.min ?? Number.NEGATIVE_INFINITY);
    const max = Number(item.max ?? Number.POSITIVE_INFINITY);
    if (score >= min && score <= max) {
      return item;
    }
  }
  return null;
}

function renderQuestion(question, useFancyOptions) {
  const inputType = question.type === "multi" ? "checkbox" : "radio";
  const optionsClass = useFancyOptions ? "quiz__options quiz__options--fancy" : "quiz__options quiz__options--plain";
  const optionClass = useFancyOptions ? "quiz__option quiz__option--fancy" : "quiz__option quiz__option--plain";
  const inputClass = useFancyOptions ? "quiz__input quiz__input--fancy" : "quiz__input quiz__input--plain";
  const labelClass = useFancyOptions ? "quiz__label quiz__label--fancy" : "quiz__label quiz__label--plain";
  const optionsHtml = question.options
    .map((option) => {
      const id = `${question.id}-${option.value}`;
      return `
        <label class="${optionClass}" for="${id}">
          <input class="${inputClass}" id="${id}" type="${inputType}" name="${question.id}" value="${option.value}">
          <span class="${labelClass}">${option.label}</span>
        </label>
      `;
    })
    .join("");

  return `
    <section class="quiz__question">
      <h3>${question.question}</h3>
      <div class="${optionsClass}">
        ${optionsHtml}
      </div>
    </section>
  `;
}

function renderQuiz(container, config) {
  const useFancyOptionsByDefault = config.fancyOptions !== false;
  const questionModes = (config.questions || []).map((question) => ({
    question,
    useFancyOptions: question.fancyOptions !== undefined ? question.fancyOptions !== false : useFancyOptionsByDefault,
  }));
  const questionsHtml = questionModes
    .map((item) => renderQuestion(item.question, item.useFancyOptions))
    .join("");
  const hasFancyOptions = questionModes.some((item) => item.useFancyOptions);
  const hasPlainOptions = questionModes.some((item) => !item.useFancyOptions);
  const title = typeof config.title === "string" ? config.title.trim() : "";
  const description = typeof config.description === "string" ? config.description.trim() : "";
  const hasIntro = Boolean(title || description);
  const titleHtml = title ? `<h2 class="quiz__title">${title}</h2>` : "";
  const descriptionHtml = description ? `<p class="quiz__note">${description}</p>` : "";
  const resetButtonHtml = config.buttonResetLabel
    ? `<button class="quiz__button quiz__button--reset" type="reset">${config.buttonResetLabel}</button>`
    : "";
  container.classList.toggle("quiz--no-intro", !hasIntro);
  container.classList.toggle("quiz--fancy-options", hasFancyOptions);
  container.classList.toggle("quiz--plain-options", hasPlainOptions);
  container.innerHTML = `
    ${titleHtml}
    ${descriptionHtml}
    <form class="quiz__form">
      ${questionsHtml}
      <div class="quiz__actions">
        <button class="quiz__button quiz__button--submit" type="submit">${config.buttonLabel || "Ver resultado"}</button>
        ${resetButtonHtml}
      </div>
    </form>
    <section class="quiz__result" hidden aria-live="polite"></section>
  `;
}

function revealResult(resultEl, html) {
  resultEl.hidden = false;
  resultEl.innerHTML = html;
  requestAnimationFrame(() => {
    resultEl.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
  });
}

function attachEvents(container, config) {
  const form = container.querySelector(".quiz__form");
  const resultEl = container.querySelector(".quiz__result");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const missingMandatoryQuestions = getMissingMandatoryQuestions(config, formData);

    if (missingMandatoryQuestions.length > 0) {
      const warningText =
        config.warningMandatoryMissing ||
        "Debes responder todas las preguntas obligatorias antes de ver el resultado.";
      revealResult(resultEl, `<h3 class="quiz__result-title">Faltan respuestas</h3><p>${warningText}</p>`);
      return;
    }

    const score = computeScore(config, formData);
    const result = resolveResult(config.results || [], score);
    const shouldShowPoints = config.showPoints !== false;

    if (!result) {
      revealResult(
        resultEl,
        `<h3 class="quiz__result-title">Resultado</h3><div class="quiz__result-body"><p>No se ha definido un resultado para esta puntuacion.</p></div>`
      );
      return;
    }

    const pointsHtml = shouldShowPoints ? `<p class="quiz__note">Puntuacion: ${score}</p>` : "";
    const resultContentHtml = result.html ? result.html : `<p>${result.text || ""}</p>`;
    revealResult(resultEl, `
      <h3 class="quiz__result-title">${result.title}</h3>
      <div class="quiz__result-body">${resultContentHtml}</div>
      ${pointsHtml}
    `);
  });

  if (config.buttonResetLabel) {
    form.addEventListener("reset", () => {
      resultEl.hidden = true;
      resultEl.innerHTML = "";
    });
  }
}

export function initQuizzes(selector = "[data-quiz]") {
  const containers = document.querySelectorAll(selector);

  for (const container of containers) {
    const configScript = container.querySelector('script[type="application/json"]');
    if (!configScript) {
      continue;
    }

    try {
      const config = JSON.parse(configScript.textContent);
      renderQuiz(container, config);
      attachEvents(container, config);
    } catch (error) {
      container.innerHTML = "<p>No se pudo cargar el quiz. Revisa la configuracion JSON.</p>";
      console.error("Quiz config error:", error);
    }
  }
}
