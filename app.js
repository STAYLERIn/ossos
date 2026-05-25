(function () {
  "use strict";

  const storageKey = "simulado-ossos-digital-v1";
  const data = window.SIMULADO_DATA;

  const els = {
    pageMeta: document.getElementById("pageMeta"),
    scoreText: document.getElementById("scoreText"),
    pageSelect: document.getElementById("pageSelect"),
    prevBtn: document.getElementById("prevBtn"),
    nextBtn: document.getElementById("nextBtn"),
    checkBtn: document.getElementById("checkBtn"),
    revealBtn: document.getElementById("revealBtn"),
    clearBtn: document.getElementById("clearBtn"),
    progressBar: document.getElementById("progressBar"),
    stage: document.getElementById("stage"),
    pageImage: document.getElementById("pageImage"),
    fieldLayer: document.getElementById("fieldLayer"),
    fieldTemplate: document.getElementById("fieldTemplate"),
  };

  if (!data || !Array.isArray(data.screens)) {
    els.pageMeta.textContent = "Dados do simulado não encontrados.";
    return;
  }

  let state = loadState();
  let showAnswers = false;

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || "{}");
      return {
        screenIndex: Number.isInteger(parsed.screenIndex) ? parsed.screenIndex : 0,
        answers: parsed.answers && typeof parsed.answers === "object" ? parsed.answers : {},
        checked: parsed.checked && typeof parsed.checked === "object" ? parsed.checked : {},
      };
    } catch {
      return { screenIndex: 0, answers: {}, checked: {} };
    }
  }

  function saveState() {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }

  function normalizeAnswer(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  }

  function acceptedAnswers(field) {
    return [field.answer, ...(field.aliases || [])].map(normalizeAnswer).filter(Boolean);
  }

  function isCorrect(field, value) {
    const normalized = normalizeAnswer(value);
    return normalized.length > 0 && acceptedAnswers(field).includes(normalized);
  }

  function currentScreen() {
    const index = Math.max(0, Math.min(state.screenIndex, data.screens.length - 1));
    state.screenIndex = index;
    return data.screens[index];
  }

  function screenAnswers(screen) {
    if (!state.answers[screen.id]) state.answers[screen.id] = {};
    return state.answers[screen.id];
  }

  function screenChecked(screen) {
    if (!state.checked[screen.id]) state.checked[screen.id] = {};
    return state.checked[screen.id];
  }

  function buildPageSelect() {
    els.pageSelect.innerHTML = "";
    data.screens.forEach((screen, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = `${index + 1}/${data.screens.length} · PDF ${screen.sourceBlankPage}→${screen.sourceAnswerPage}`;
      els.pageSelect.append(option);
    });
  }

  function render() {
    const screen = currentScreen();
    const answers = screenAnswers(screen);
    const checked = screenChecked(screen);

    els.pageMeta.textContent = `Tela ${state.screenIndex + 1} de ${data.screens.length} · PDF ${screen.sourceBlankPage}→${screen.sourceAnswerPage}`;
    els.pageSelect.value = String(state.screenIndex);
    els.prevBtn.disabled = state.screenIndex === 0;
    els.nextBtn.disabled = state.screenIndex === data.screens.length - 1;
    els.revealBtn.setAttribute("aria-pressed", showAnswers ? "true" : "false");
    els.revealBtn.textContent = showAnswers ? "Ocultar gabarito" : "Revelar gabarito";
    els.fieldLayer.classList.toggle("show-answers", showAnswers);

    els.pageImage.src = screen.image;
    els.pageImage.alt = `Página ${screen.sourceBlankPage} do simulado`;
    els.fieldLayer.innerHTML = "";

    screen.fields.forEach((field, index) => {
      const item = els.fieldTemplate.content.firstElementChild.cloneNode(true);
      const input = item.querySelector("input");
      const number = item.querySelector(".field-number");
      const chip = item.querySelector(".answer-chip");
      const value = answers[field.id] || "";
      const status = checked[field.id];

      item.style.setProperty("--x", `${field.x}%`);
      item.style.setProperty("--y", `${field.y}%`);
      item.style.setProperty("--w", `${field.w}%`);
      item.style.setProperty("--h", `${field.h}%`);
      item.dataset.fieldId = field.id;
      item.classList.toggle("is-correct", status === "correct");
      item.classList.toggle("is-wrong", status === "wrong");
      item.classList.toggle("is-empty", !value.trim());
      number.textContent = String(index + 1);
      input.value = value;
      input.placeholder = showAnswers ? field.answer : "";
      input.setAttribute("aria-label", `Campo ${index + 1}`);
      chip.textContent = field.answer;

      input.addEventListener("input", () => {
        answers[field.id] = input.value;
        if (checked[field.id]) {
          checked[field.id] = isCorrect(field, input.value) ? "correct" : "wrong";
        }
        saveState();
        updateFieldState(item, field, input.value, checked[field.id]);
        updateScore();
      });

      els.fieldLayer.append(item);
    });

    updateScore();
  }

  function updateFieldState(item, field, value, status) {
    item.classList.toggle("is-empty", !value.trim());
    item.classList.toggle("is-correct", status === "correct" || isCorrect(field, value));
    item.classList.toggle("is-wrong", status === "wrong" && !isCorrect(field, value));
  }

  function updateScore() {
    const screen = currentScreen();
    const answers = screenAnswers(screen);
    let correct = 0;
    screen.fields.forEach((field) => {
      if (isCorrect(field, answers[field.id])) correct += 1;
    });
    const total = screen.fields.length;
    els.scoreText.textContent = `${correct}/${total}`;
    els.progressBar.style.width = total ? `${(correct / total) * 100}%` : "0%";
  }

  function checkPage() {
    const screen = currentScreen();
    const answers = screenAnswers(screen);
    const checked = screenChecked(screen);
    screen.fields.forEach((field) => {
      const value = answers[field.id] || "";
      checked[field.id] = isCorrect(field, value) ? "correct" : "wrong";
    });
    saveState();
    render();
  }

  function clearPage() {
    const screen = currentScreen();
    state.answers[screen.id] = {};
    state.checked[screen.id] = {};
    saveState();
    render();
  }

  function goTo(index) {
    state.screenIndex = Math.max(0, Math.min(index, data.screens.length - 1));
    saveState();
    render();
  }

  els.pageSelect.addEventListener("change", () => goTo(Number(els.pageSelect.value)));
  els.prevBtn.addEventListener("click", () => goTo(state.screenIndex - 1));
  els.nextBtn.addEventListener("click", () => goTo(state.screenIndex + 1));
  els.checkBtn.addEventListener("click", checkPage);
  els.clearBtn.addEventListener("click", clearPage);
  els.revealBtn.addEventListener("click", () => {
    showAnswers = !showAnswers;
    render();
  });

  buildPageSelect();
  render();

  window.simuladoOssos = {
    normalizeAnswer,
    isCorrect,
    data,
  };
})();
