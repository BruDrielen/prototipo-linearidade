import { runTree } from "./decisionTree.js";

/* ===== CONFIG ===== */

const REQUIRED_TESTS = [
  { doneId: "testCochranDone", label: "Homogeneidade de variâncias (Cochran ou equivalente)" },
  { doneId: "testRDone", label: "Coeficiente de Correlação (r)" },
  { doneId: "testR2Done", label: "Coeficiente de Determinação (r²)" },
  { doneId: "testShapiroDone", label: "Shapiro-Wilk (normalidade dos resíduos)" },
  { doneId: "testDurbinWatsonDone", label: "Durbin-Watson (independência dos resíduos)" },
  { doneId: "testAnovaDone", label: "ANOVA (significância da regressão)" },
  { doneId: "testTInterceptDone", label: "Teste t do intercepto" },
  { doneId: "testOutliersDone", label: "Avaliação de outliers (Grubbs, Dixon, Q ou equivalente)" }
];

/* ===== LOAD TREE ===== */

async function loadTree() {
 const res = await fetch("./linearidade.json");
  if (!res.ok) throw new Error("Falha ao carregar linearidade.json");
  return res.json();
}

/* ===== DOM ===== */

function getDom() {
  return {
    form: document.getElementById("formLinearidade"),
    output: document.getElementById("output"),
    msg: document.getElementById("msg"),

    nLevels: document.getElementById("nLevels"),
    replicatesPerLevel: document.getElementById("replicatesPerLevel"),
    regressionUsed: document.getElementById("regressionUsed"),

    testCochranDone: document.getElementById("testCochranDone"),
    testRDone: document.getElementById("testRDone"),
    testR2Done: document.getElementById("testR2Done"),
    testShapiroDone: document.getElementById("testShapiroDone"),
    testDurbinWatsonDone: document.getElementById("testDurbinWatsonDone"),
    testAnovaDone: document.getElementById("testAnovaDone"),
    testTInterceptDone: document.getElementById("testTInterceptDone"),
    testOutliersDone: document.getElementById("testOutliersDone"),

    varianceProfile: document.getElementById("varianceProfile"),
    residualNormal: document.getElementById("residualNormal"),
    independentResiduals: document.getElementById("independentResiduals"),
    regressionSignificant: document.getElementById("regressionSignificant"),
    interceptAcceptable: document.getElementById("interceptAcceptable"),
    outliersAcceptable: document.getElementById("outliersAcceptable"),

    btnSaveAnalysis: document.getElementById("btnSaveAnalysis"),
    btnExportHistory: document.getElementById("btnExportHistory"),
    btnClearHistory: document.getElementById("btnClearHistory"),
    historyList: document.getElementById("historyList")
  };
}

/* ===== HELPERS ===== */

function setMsg(dom, text, isError = false) {
  dom.msg.textContent = text || "";
  dom.msg.style.color = isError ? "var(--error)" : "var(--muted)";
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function toList(items) {
  if (!items || !items.length) return "<div>Nenhum.</div>";
  return `<ul>${items.map(i => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;
}

function nowIso() {
  return new Date().toISOString();
}

function formatDateTime(iso) {
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

function downloadTextFile(filename, content, type = "application/json;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ===== LOCAL STORAGE ===== */

const STORAGE_KEY = "linearidadeHistorico";

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function addHistoryRecord(record) {
  const history = loadHistory();
  history.unshift(record);
  saveHistory(history);
}

function removeHistoryRecord(id) {
  const history = loadHistory().filter(item => item.id !== id);
  saveHistory(history);
}

/* ===== CORE ===== */

function computeMissingTests(answers) {
  return REQUIRED_TESTS
    .filter(t => answers[t.doneId] === false)
    .map(t => t.label);
}

function readAnswers(dom) {
  const regressionUsed = dom.regressionUsed.value;
  const varianceProfile = dom.varianceProfile.value;

  const answers = {
    nLevels: Number(dom.nLevels.value),
    replicatesPerLevel: Number(dom.replicatesPerLevel.value),

    regressionUsed,
    varianceProfile,

    usedMMQO: regressionUsed === "MMQO",
    usedMMQP: regressionUsed === "MMQP",

    variancesHomogeneous: varianceProfile === "homogeneas",
    variancesHeterogeneous: varianceProfile === "heterogeneas",

    testCochranDone: dom.testCochranDone.checked,
    testRDone: dom.testRDone.checked,
    testR2Done: dom.testR2Done.checked,
    testShapiroDone: dom.testShapiroDone.checked,
    testDurbinWatsonDone: dom.testDurbinWatsonDone.checked,
    testAnovaDone: dom.testAnovaDone.checked,
    testTInterceptDone: dom.testTInterceptDone.checked,
    testOutliersDone: dom.testOutliersDone.checked,

    residualNormal: dom.residualNormal.checked,
    independentResiduals: dom.independentResiduals.checked,
    regressionSignificant: dom.regressionSignificant.checked,
    interceptAcceptable: dom.interceptAcceptable.checked,
    outliersAcceptable: dom.outliersAcceptable.checked
  };

  answers.missingTests = computeMissingTests(answers);
  answers.missingCount = answers.missingTests.length;

  answers.cochranResultMissing =
    answers.testCochranDone && varianceProfile === "nao_informado";

  answers.regressionModelMissing =
    regressionUsed === "nao_informado" || regressionUsed === "nao_especificado";

  answers.modeloInconsistente =
    (answers.variancesHomogeneous && answers.usedMMQP) ||
    (answers.variancesHeterogeneous && answers.usedMMQO);

  answers.residuosInvalidos =
    (answers.testShapiroDone && !answers.residualNormal) ||
    (answers.testDurbinWatsonDone && !answers.independentResiduals);

  answers.anovaInvalida =
    answers.testAnovaDone && !answers.regressionSignificant;

  answers.interceptoInvalido =
    answers.testTInterceptDone && !answers.interceptAcceptable;

  answers.outliersInvalidos =
    answers.testOutliersDone && !answers.outliersAcceptable;

  answers.desenhoAdequado =
    answers.nLevels >= 5 &&
    answers.replicatesPerLevel >= 3;

  answers.execucaoCompleta =
    answers.missingCount === 0 &&
    !answers.cochranResultMissing &&
    !answers.regressionModelMissing;

  answers.resultadoValido =
    !answers.modeloInconsistente &&
    !answers.residuosInvalidos &&
    !answers.anovaInvalida &&
    !answers.interceptoInvalido &&
    !answers.outliersInvalidos;

  answers.estudoAdequado =
    answers.desenhoAdequado &&
    answers.execucaoCompleta &&
    answers.resultadoValido;

  return answers;
}

/* ===== UI RULES ===== */

function applyEnableRules(dom) {
  dom.varianceProfile.disabled = !dom.testCochranDone.checked;
  if (!dom.testCochranDone.checked) dom.varianceProfile.value = "nao_informado";

  dom.residualNormal.disabled = !dom.testShapiroDone.checked;
  if (!dom.testShapiroDone.checked) dom.residualNormal.checked = false;

  dom.independentResiduals.disabled = !dom.testDurbinWatsonDone.checked;
  if (!dom.testDurbinWatsonDone.checked) dom.independentResiduals.checked = false;

  dom.regressionSignificant.disabled = !dom.testAnovaDone.checked;
  if (!dom.testAnovaDone.checked) dom.regressionSignificant.checked = false;

  dom.interceptAcceptable.disabled = !dom.testTInterceptDone.checked;
  if (!dom.testTInterceptDone.checked) dom.interceptAcceptable.checked = false;

  dom.outliersAcceptable.disabled = !dom.testOutliersDone.checked;
  if (!dom.testOutliersDone.checked) dom.outliersAcceptable.checked = false;
}

/* ===== SNAPSHOT / RESTORE ===== */

function snapshotForm(dom) {
  return {
    nLevels: dom.nLevels.value,
    replicatesPerLevel: dom.replicatesPerLevel.value,
    regressionUsed: dom.regressionUsed.value,

    testCochranDone: dom.testCochranDone.checked,
    testRDone: dom.testRDone.checked,
    testR2Done: dom.testR2Done.checked,
    testShapiroDone: dom.testShapiroDone.checked,
    testDurbinWatsonDone: dom.testDurbinWatsonDone.checked,
    testAnovaDone: dom.testAnovaDone.checked,
    testTInterceptDone: dom.testTInterceptDone.checked,
    testOutliersDone: dom.testOutliersDone.checked,

    varianceProfile: dom.varianceProfile.value,
    residualNormal: dom.residualNormal.checked,
    independentResiduals: dom.independentResiduals.checked,
    regressionSignificant: dom.regressionSignificant.checked,
    interceptAcceptable: dom.interceptAcceptable.checked,
    outliersAcceptable: dom.outliersAcceptable.checked
  };
}

function restoreForm(dom, data) {
  dom.nLevels.value = data.nLevels ?? "5";
  dom.replicatesPerLevel.value = data.replicatesPerLevel ?? "3";
  dom.regressionUsed.value = data.regressionUsed ?? "nao_informado";

  dom.testCochranDone.checked = !!data.testCochranDone;
  dom.testRDone.checked = !!data.testRDone;
  dom.testR2Done.checked = !!data.testR2Done;
  dom.testShapiroDone.checked = !!data.testShapiroDone;
  dom.testDurbinWatsonDone.checked = !!data.testDurbinWatsonDone;
  dom.testAnovaDone.checked = !!data.testAnovaDone;
  dom.testTInterceptDone.checked = !!data.testTInterceptDone;
  dom.testOutliersDone.checked = !!data.testOutliersDone;

  applyEnableRules(dom);

  dom.varianceProfile.value = data.varianceProfile ?? "nao_informado";
  dom.residualNormal.checked = !!data.residualNormal;
  dom.independentResiduals.checked = !!data.independentResiduals;
  dom.regressionSignificant.checked = !!data.regressionSignificant;
  dom.interceptAcceptable.checked = !!data.interceptAcceptable;
  dom.outliersAcceptable.checked = !!data.outliersAcceptable;
}

/* ===== RENDER ===== */

function buildAuditSummary(answers) {
  const warnings = [];

  if (answers.missingTests.length) {
    warnings.push(`Testes mínimos ausentes: ${answers.missingTests.join("; ")}.`);
  }

  if (answers.cochranResultMissing) {
    warnings.push("O teste de homogeneidade foi marcado como realizado, mas o resultado não foi informado.");
  }

  if (answers.regressionModelMissing) {
    warnings.push("O modelo de regressão utilizado não foi informado de forma auditável.");
  }

  if (answers.modeloInconsistente) {
    warnings.push("Há incompatibilidade entre o perfil de variância reportado e o modelo de regressão utilizado.");
  }

  if (answers.residuosInvalidos) {
    warnings.push("Há falhas nos critérios de normalidade e/ou independência dos resíduos.");
  }

  if (answers.anovaInvalida) {
    warnings.push("A regressão não foi considerada significativa.");
  }

  if (answers.interceptoInvalido) {
    warnings.push("O intercepto não atende ao critério declarado.");
  }

  if (answers.outliersInvalidos) {
    warnings.push("A avaliação de outliers indica condição não aceitável.");
  }

  return warnings;
}

function renderResult(answers, result) {
  const auditWarnings = buildAuditSummary(answers);

  return `
    <div class="rWrap">
      <div class="badge">Resultado global: ${escapeHtml(result.status)}</div>

      <div class="kv">
        <div class="k">Síntese decisória</div>
        <div class="v">${escapeHtml(result.why || "-")}</div>
      </div>

      ${
        result.notes
          ? `
          <div class="kv">
            <div class="k">Notas técnicas</div>
            <div class="v">${toList(result.notes)}</div>
          </div>
        `
          : ""
      }

      ${
        result.recommendations
          ? `
          <div class="kv">
            <div class="k">Recomendações</div>
            <div class="v">${toList(result.recommendations)}</div>
          </div>
        `
          : ""
      }

      <hr class="hr">

      <div class="kv">
        <div class="k">1. Desenho do estudo</div>
        <div class="v">${answers.desenhoAdequado ? "✔ Adequado" : "✘ Inadequado"}</div>
      </div>

      <div class="kv">
        <div class="k">2. Execução da avaliação</div>
        <div class="v">${answers.execucaoCompleta ? "✔ Completa" : "✘ Incompleta"}</div>
      </div>

      <div class="kv">
        <div class="k">3. Consistência dos resultados</div>
        <div class="v">${answers.resultadoValido ? "✔ Consistente" : "✘ Inconsistente"}</div>
      </div>

      <hr class="hr">

      <div class="kv">
        <div class="k">Pendências críticas da auditoria</div>
        <div class="v">${toList(auditWarnings)}</div>
      </div>

      <div class="kv">
        <div class="k">Conclusão técnica</div>
        <div class="v">
          ${
            answers.estudoAdequado
              ? "O estudo apresenta condições suficientes para ser classificado como adequado no escopo desta auditoria de linearidade."
              : "O estudo não apresenta condições suficientes para ser classificado como adequado no escopo desta auditoria de linearidade."
          }
        </div>
      </div>
    </div>
  `;
}

function renderHistory(dom) {
  if (!dom.historyList) return;

  const history = loadHistory();

  if (!history.length) {
    dom.historyList.innerHTML = `<div class="history-empty">Nenhuma análise salva.</div>`;
    return;
  }

  dom.historyList.innerHTML = history.map(item => `
    <div class="history-item" data-id="${escapeHtml(item.id)}">
      <div class="history-main">
        <div><strong>${escapeHtml(item.result.status)}</strong> — ${escapeHtml(item.result.why)}</div>
        <div class="history-meta">${escapeHtml(formatDateTime(item.createdAt))}</div>
      </div>
      <div class="history-actions">
        <button type="button" class="secondary" data-action="load" data-id="${escapeHtml(item.id)}">Carregar</button>
        <button type="button" class="secondary" data-action="delete" data-id="${escapeHtml(item.id)}">Excluir</button>
      </div>
    </div>
  `).join("");
}

/* ===== MAIN ===== */

async function main() {
  const dom = getDom();
  const tree = await loadTree();

  setMsg(dom, "Pronto.");
  dom.output.innerHTML = `<div class="kv"><div class="v">Preencha os campos e execute a avaliação.</div></div>`;

  const wire = () => applyEnableRules(dom);

  [
    dom.testCochranDone,
    dom.testShapiroDone,
    dom.testDurbinWatsonDone,
    dom.testAnovaDone,
    dom.testTInterceptDone,
    dom.testOutliersDone
  ].forEach(el => el.addEventListener("change", wire));

  applyEnableRules(dom);
  renderHistory(dom);

  dom.form.addEventListener("submit", (e) => {
    e.preventDefault();

    try {
      const answers = readAnswers(dom);
      const result = runTree(tree.root, answers);

      setMsg(dom, "Avaliação executada com sucesso.");
      dom.output.innerHTML = renderResult(answers, result);

      dom.form.dataset.lastAnswers = JSON.stringify(answers);
      dom.form.dataset.lastResult = JSON.stringify(result);
    } catch (err) {
      console.error(err);
      setMsg(dom, "Erro na execução da avaliação.", true);
      dom.output.innerHTML = `<pre class="err">${escapeHtml(err.message)}</pre>`;
    }
  });

  dom.btnSaveAnalysis?.addEventListener("click", () => {
    try {
      const answers = readAnswers(dom);
      const result = runTree(tree.root, answers);

      const record = {
        id: crypto.randomUUID(),
        createdAt: nowIso(),
        formData: snapshotForm(dom),
        answers,
        result
      };

      addHistoryRecord(record);
      renderHistory(dom);
      setMsg(dom, "Análise salva no histórico local.");
    } catch (err) {
      console.error(err);
      setMsg(dom, "Não foi possível salvar a análise.", true);
    }
  });

  dom.btnExportHistory?.addEventListener("click", () => {
    const history = loadHistory();
    downloadTextFile("historico_linearidade.json", JSON.stringify(history, null, 2));
    setMsg(dom, "Histórico exportado em JSON.");
  });

  dom.btnClearHistory?.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    renderHistory(dom);
    setMsg(dom, "Histórico local apagado.");
  });

  dom.historyList?.addEventListener("click", (e) => {
    const button = e.target.closest("button[data-action]");
    if (!button) return;

    const action = button.dataset.action;
    const id = button.dataset.id;
    const history = loadHistory();
    const record = history.find(item => item.id === id);

    if (!record) return;

    if (action === "load") {
      restoreForm(dom, record.formData);
      dom.output.innerHTML = renderResult(record.answers, record.result);
      setMsg(dom, "Análise carregada do histórico.");
      return;
    }

    if (action === "delete") {
      removeHistoryRecord(id);
      renderHistory(dom);
      setMsg(dom, "Análise removida do histórico.");
    }
  });
}

main();