/*
  中学受験 算数講座 ─ 画面ロジック
  分野一覧 → 分野詳細（典型解法／演習）の2画面だけの、ごく単純なSPA。
*/

(function () {
  "use strict";

  const STORAGE_KEY = "sansuu-koza:progress";

  // ---------- localStorage（進捗の保存） ----------

  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveProgress(progress) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
      /* 保存できなくても致命的ではないので無視する */
    }
  }

  let progress = loadProgress();

  function isDone(fieldId, exId) {
    return !!(progress[fieldId] && progress[fieldId].includes(exId));
  }

  function setDone(fieldId, exId, done) {
    if (!progress[fieldId]) progress[fieldId] = [];
    const list = progress[fieldId];
    const i = list.indexOf(exId);
    if (done && i === -1) list.push(exId);
    if (!done && i !== -1) list.splice(i, 1);
    saveProgress(progress);
  }

  function doneCount(field) {
    if (!field.exercises || !field.exercises.length) return null;
    const list = progress[field.id] || [];
    return { done: list.length, total: field.exercises.length };
  }

  // ---------- DOM 参照 ----------

  const els = {
    backBtn: document.getElementById("backBtn"),
    fieldMenu: document.getElementById("fieldMenu"),
    fieldDetail: document.getElementById("fieldDetail"),
    fdBadge: document.getElementById("fdBadge"),
    fdName: document.getElementById("fdName"),
    fdCore: document.getElementById("fdCore"),
    tabExplainBtn: document.getElementById("tabExplainBtn"),
    tabExerciseBtn: document.getElementById("tabExerciseBtn"),
    explainPane: document.getElementById("explainPane"),
    exercisePane: document.getElementById("exercisePane"),
  };

  const groupById = {};
  SANSUU_DATA.groups.forEach((g) => (groupById[g.id] = g));

  const fieldById = {};
  SANSUU_DATA.fields.forEach((f) => (fieldById[f.id] = f));

  // ---------- 分野一覧 ----------

  function renderFieldMenu() {
    const html = SANSUU_DATA.groups
      .map((group) => {
        const fields = SANSUU_DATA.fields.filter((f) => f.group === group.id);
        const cards = fields
          .map((field) => {
            const dc = doneCount(field);
            const ready = !!(field.exercises && field.exercises.length);
            const statusLabel = !ready
              ? "準備中"
              : dc.done > 0
              ? `演習 ${dc.done}/${dc.total} 完了`
              : `演習 ${dc.total}問`;
            return `
              <button class="field-card" data-field="${field.id}"
                style="--fam:${group.color};--fam-bg:${group.bg}">
                <div class="field-card-top">
                  <span class="field-no">${field.no}</span>
                  <span class="field-status ${ready ? "is-ready" : ""}">${statusLabel}</span>
                </div>
                <span class="field-name">${field.name}</span>
                <p class="field-core-line">${field.core}</p>
              </button>
            `;
          })
          .join("");
        return `
          <div class="group-block">
            <div class="group-head">
              <span class="group-dot" style="background:${group.color}"></span>
              <span class="group-name">${group.id} ── ${group.name}</span>
            </div>
            <div class="field-cards">${cards}</div>
          </div>
        `;
      })
      .join("");
    els.fieldMenu.innerHTML = html;

    els.fieldMenu.querySelectorAll(".field-card").forEach((card) => {
      card.addEventListener("click", () => showField(card.dataset.field));
    });
  }

  // ---------- 分野詳細 ----------

  function renderExplanation(field) {
    if (!field.explanation || !field.explanation.length) {
      els.explainPane.innerHTML = `
        <div class="empty-state">この分野の解説は準備中です。<br>もう少しお待ちください。</div>
      `;
      return;
    }
    els.explainPane.innerHTML = field.explanation
      .map(
        (t) => `
        <div class="tech-card">
          <h3>${t.title}</h3>
          <div class="body">${t.body}</div>
        </div>
      `
      )
      .join("");
  }

  function renderExercises(field) {
    if (!field.exercises || !field.exercises.length) {
      els.exercisePane.innerHTML = `
        <div class="empty-state">この分野の演習は準備中です。<br>もう少しお待ちください。</div>
      `;
      return;
    }
    els.exercisePane.innerHTML = field.exercises
      .map((ex) => {
        const done = isDone(field.id, ex.id);
        return `
          <div class="ex-card ${done ? "is-done" : ""}" data-ex="${ex.id}">
            <div class="ex-head">
              <span class="ex-level">${ex.level}</span>
              <span class="ex-title">${ex.title}</span>
              <label class="ex-done-toggle">
                <input type="checkbox" ${done ? "checked" : ""}>
                できた
              </label>
            </div>
            <p class="ex-q">${ex.question}</p>
            <details class="ex-reveal">
              <summary>こたえを見る</summary>
              <div class="ex-reveal-body">
                <p class="ex-answer">答え：${ex.answer}</p>
                <p class="ex-solution">${ex.solution}</p>
              </div>
            </details>
          </div>
        `;
      })
      .join("");

    els.exercisePane.querySelectorAll(".ex-card").forEach((card) => {
      const exId = card.dataset.ex;
      const checkbox = card.querySelector(".ex-done-toggle input");
      checkbox.addEventListener("change", () => {
        setDone(field.id, exId, checkbox.checked);
        card.classList.toggle("is-done", checkbox.checked);
      });
    });
  }

  function setTab(which) {
    const explain = which === "explain";
    els.tabExplainBtn.classList.toggle("is-active", explain);
    els.tabExerciseBtn.classList.toggle("is-active", !explain);
    els.tabExplainBtn.setAttribute("aria-selected", String(explain));
    els.tabExerciseBtn.setAttribute("aria-selected", String(!explain));
    els.explainPane.hidden = !explain;
    els.exercisePane.hidden = explain;
  }

  function showField(fieldId) {
    const field = fieldById[fieldId];
    if (!field) return;
    const group = groupById[field.group];

    els.fieldDetail.style.setProperty("--fam", group.color);
    els.fieldDetail.style.setProperty("--fam-bg", group.bg);
    els.fdBadge.textContent = `${field.no} ／ ${group.name}`;
    els.fdBadge.style.color = group.color;
    els.fdBadge.style.background = group.bg;
    els.fdName.textContent = field.name;
    els.fdCore.textContent = field.core;

    renderExplanation(field);
    renderExercises(field);
    setTab("explain");

    els.fieldMenu.hidden = true;
    els.fieldDetail.hidden = false;
    els.backBtn.hidden = false;
    window.scrollTo(0, 0);
  }

  function showMenu() {
    els.fieldDetail.hidden = true;
    els.fieldMenu.hidden = false;
    els.backBtn.hidden = true;
    renderFieldMenu(); // 進捗表示を更新するため再描画
    window.scrollTo(0, 0);
  }

  // ---------- 初期化 ----------

  els.backBtn.addEventListener("click", showMenu);
  els.tabExplainBtn.addEventListener("click", () => setTab("explain"));
  els.tabExerciseBtn.addEventListener("click", () => setTab("exercise"));

  renderFieldMenu();
})();
