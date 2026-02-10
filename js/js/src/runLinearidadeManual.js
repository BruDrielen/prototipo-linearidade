import { runTree } from "./decisionTree.js";
import { validateAnswers } from "./validateAnswers.js";
import { getLinearidadeRequiredIds } from "./linearidadeSchema.js";

const REQUIRED_TESTS = [
  { doneId: "testCochranDone", label: "Homogeneidade de variâncias (Cochran ou equivalente)" },
  { doneId: "testRDone", label: "Coeficiente de Correlação (r)" },
  { doneId: "testR2Done", label: "Coeficiente de Determinação (r²)" },
  { doneId: "testShapiroDone", label: "Shapiro-Wilk (normalidade dos resíduos)" },
  { doneId: "testDurbinWatsonDone", label: "Durbin-Watson (independência)" },
  { doneId: "testAnovaDone", label: "ANOVA (significância da regressão)" },
  { doneId: "testTInterceptDone", label: "Teste t (intercepto)" },
  { doneId: "testOutliersDone", label: "Outliers (Grubbs/Q)" }
];

async function loadTree() {
  const res = await fetch("./js/js/trees/linearidade.json");
  if (!res.ok) throw new Error("Falha ao carregar ./js/js/trees/linearidade.json");
  return res.json();
}

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

    homoscedastic: document.getElementById("homoscedastic"),
    residualNormal: document.getElementById("residualNormal"),
    independentResiduals: document.getElementById("independentResiduals"),
    hasOutliers: document.getElementById("hasOutliers"),

    btnOK: document.getElementById("btnExemploOK"),
    btnAjustes: document.getElementById("btnExemploAjustes"),
    btnIncompleto: document.getElementById("btnExemploIncompleto")
  };
}

function setMsg(dom, text, isError = false) {
  dom.msg.textContent = text || "";
  dom.msg.style.color = isError ? "var(--error)" : "var(--muted)";
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toList(items) {
  if (!Array.isArray(items) || items.length === 0) return "<div class='kv'><div class='v'>Nenhum.</div></div>";
  const li = items.map(x => `<li>${escapeHtml(x)}</li>`).join("");
  return `<ul>${li}</ul>`;
}

function computeMissingTests(answers) {
  const missing = [];
  for (const t of REQUIRED_TESTS) {
    if (answers[t.doneId] === false) missing.push(t.label);
  }
  return missing;
}

function readAnswers(dom) {
  const regressionUsed = String(dom.regressionUsed.value || "nao_informado");
  const regressionModelSpecified = (regressionUsed === "MMQO" || regressionUsed === "MMQP");

  const answers = {
    nLevels: Number(dom.nLevels.value),
    replicatesPerLevel: Number(dom.replicatesPerLevel.value),

    regressionUsed,
    regressionModelSpecified,
    usedMMQO: regressionUsed === "MMQO",
    usedMMQP: regressionUsed === "MMQP",

    testCochranDone: Boolean(dom.testCochranDone.checked),
    testRDone: Boolean(dom.testRDone.checked),
    testR2Done: Boolean(dom.testR2Done.checked),
    testShapiroDone: Boolean(dom.testShapiroDone.checked),
    testDurbinWatsonDone: Boolean(dom.testDurbinWatsonDone.checked),
    testAnovaDone: Boolean(dom.testAnovaDone.checked),
    testTInterceptDone: Boolean(dom.testTInterceptDone.checked),
    testOutliersDone: Boolean(dom.testOutliersDone.checked),

    // Mantido como input do formulário (conforme seu texto). Hoje não entra no veredito do Cochran.
    homoscedastic: Boolean(dom.homoscedastic.checked),

    residualNormal: Boolean(dom.residualNormal.checked),
    independentResiduals: Boolean(dom.independentResiduals.checked),
    hasOutliers: Boolean(dom.hasOutliers.checked)
  };

  const missingTests = computeMissingTests(answers);
  answers.missingTests = missingTests;
  answers.missingCount = missingTests.length;

  return answers;
}

function applyEnableRules(dom) {
  // Mantém consistência: se marcar “teste não feito”, desabilita o resultado associado.
  dom.homoscedastic.disabled = !dom.testCochranDone.checked;
  if (dom.homoscedastic.disabled) dom.homoscedastic.checked = false;

  dom.residualNormal.disabled = !dom.testShapiroDone.checked;
  if (dom.residualNormal.disabled) dom.residualNormal.checked = false;

  dom.independentResiduals.disabled = !dom.testDurbinWatsonDone.checked;
  if (dom.independentResiduals.disabled) dom.independentResiduals.checked = false;

  dom.hasOutliers.disabled = !dom.testOutliersDone.checked;
  if (dom.hasOutliers.disabled) dom.hasOutliers.checked = false;
}

function renderResult(answers, result) {
  const status = result?.status ?? "sem_status";
  const why = result?.why ?? "";
  const recommendedRegression = result?.recommendedRegression ?? "";
  const recommendedNext = result?.recommendedNext ?? result?.recommendations ?? [];
  const notes = result?.notes ?? [];

  const testsDone = REQUIRED_TESTS
    .filter(t => answers[t.doneId] === true)
    .map(t => t.label);

  const missing = answers.missingTests || [];

  const regUsedLabel =
    answers.regressionUsed === "MMQO" ? "MMQO (ordinária)" :
    answers.regressionUsed === "MMQP" ? "MMQP (ponderada)" :
    answers.regressionUsed === "nao_especificado" ? "Regressão feita, modelo não especificado" :
    "Não informado";

  const cochranStatus = answers.testCochranDone ? "realizado" : "não realizado";

  return `
    <div class="rWrap">
      <div class="rTop">
        <div class="badge">Veredito (Cochran → modelo): ${escapeHtml(status)}</div>
        <div class="kv"><div class="k">Regressão usada no estudo</div><div class="v">${escapeHtml(regUsedLabel)}</div></div>
        <div class="kv"><div class="k">Teste de homogeneidade (Cochran ou equivalente)</div><div class="v">${escapeHtml(cochranStatus)}</div></div>
        ${recommendedRegression ? `<div class="kv"><div class="k">Modelo recomendado</div><div class="v">${escapeHtml(recommendedRegression)}</div></div>` : ""}
        ${why ? `<div class="kv"><div class="k">Justificativa</div><div class="v">${escapeHtml(why)}</div></div>` : ""}
      </div>

      <div class="kv">
        <div class="k">Desenho do estudo</div>
        <div class="v">
          nLevels = ${escapeHtml(answers.nLevels)} (mín. 5)<br/>
          replicatesPerLevel = ${escapeHtml(answers.replicatesPerLevel)} (mín. 3)
        </div>
      </div>

      <hr class="hr"/>

      <div class="kv">
        <div class="k">Testes/itens realizados (checklist)</div>
        <div class="v">${toList(testsDone)}</div>
      </div>

      <div class="kv">
        <div class="k">Testes/itens faltantes (mínimos)</div>
        <div class="v">${toList(missing)}</div>
      </div>

      ${recommendedNext.length ? `<hr class="hr"/><div class="kv"><div class="k">Ações recomendadas</div><div class="v">${toList(recommendedNext)}</div></div>` : ""}
      ${notes.length ? `<hr class="hr"/><div class="kv"><div class="k">Notas</div><div class="v">${toList(notes)}</div></div>` : ""}
    </div>
  `;
}

function renderErrors(errors) {
  return `
    <div class="rWrap">
      <div class="err"><b>Erros de validação:</b></div>
      ${toList(errors)}
    </div>
  `;
}

async function main() {
  const dom = getDom();
  const tree = await loadTree();

  setMsg(dom, "Pronto. Preencha o estudo e execute.");
  dom.output.textContent = "Aguardando execução…";

  const wire = () => applyEnableRules(dom);
  [
    dom.testCochranDone,
    dom.testShapiroDone,
    dom.testDurbinWatsonDone,
    dom.testOutliersDone
  ].forEach(el => el.addEventListener("change", wire));

  applyEnableRules(dom);

  dom.form.addEventListener("submit", (e) => {
    e.preventDefault();

    const answers = readAnswers(dom);
    const requiredIds = getLinearidadeRequiredIds();
    const v = validateAnswers(tree, answers, requiredIds);

    if (!v.ok) {
      setMsg(dom, v.errors.join(" | "), true);
      dom.output.innerHTML = renderErrors(v.errors);
      return;
    }

    const result = runTree(tree.root, answers);
    setMsg(dom, "Executado com sucesso.");
    dom.output.innerHTML = renderResult(answers, result);
  });

  dom.btnOK.addEventListener("click", () => {
    dom.nLevels.value = 6;
    dom.replicatesPerLevel.value = 3;
    dom.regressionUsed.value = "MMQO";

    dom.testCochranDone.checked = true;
    dom.testRDone.checked = true;
    dom.testR2Done.checked = true;
    dom.testShapiroDone.checked = true;
    dom.testDurbinWatsonDone.checked = true;
    dom.testAnovaDone.checked = true;
    dom.testTInterceptDone.checked = true;
    dom.testOutliersDone.checked = true;

    applyEnableRules(dom);

    dom.homoscedastic.checked = true;
    dom.residualNormal.checked = true;
    dom.independentResiduals.checked = true;
    dom.hasOutliers.checked = false;

    setMsg(dom, "Exemplo OK carregado.");
  });

  dom.btnAjustes.addEventListener("click", () => {
    dom.nLevels.value = 6;
    dom.replicatesPerLevel.value = 3;
    dom.regressionUsed.value = "MMQO";

    dom.testCochranDone.checked = true;
    dom.testRDone.checked = true;
    dom.testR2Done.checked = true;
    dom.testShapiroDone.checked = true;
    dom.testDurbinWatsonDone.checked = true;
    dom.testAnovaDone.checked = true;
    dom.testTInterceptDone.checked = true;
    dom.testOutliersDone.checked = true;

    applyEnableRules(dom);

    dom.homoscedastic.checked = false;
    dom.residualNormal.checked = true;
    dom.independentResiduals.checked = true;
    dom.hasOutliers.checked = false;

    setMsg(dom, "Exemplo Ajustes carregado.");
  });

  dom.btnIncompleto.addEventListener("click", () => {
    dom.nLevels.value = 5;
    dom.replicatesPerLevel.value = 3;
    dom.regressionUsed.value = "nao_especificado";

    dom.testCochranDone.checked = false;
    dom.testRDone.checked = false;
    dom.testR2Done.checked = false;
    dom.testShapiroDone.checked = true;
    dom.testDurbinWatsonDone.checked = false;
    dom.testAnovaDone.checked = true;
    dom.testTInterceptDone.checked = false;
    dom.testOutliersDone.checked = true;

    applyEnableRules(dom);

    dom.residualNormal.checked = true;
    dom.hasOutliers.checked = true;

    setMsg(dom, "Exemplo Incompleto carregado.");
  });
}

main().catch(err => console.error(err));


