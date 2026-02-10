export function validateAnswers(tree, answers, requiredIds = []) {
  const errors = [];

  for (const id of requiredIds) {
    if (answers[id] === undefined || answers[id] === null || answers[id] === "") {
      errors.push(`Campo obrigatório ausente: ${id}`);
    }
  }

  if (!Number.isFinite(Number(answers.nLevels))) errors.push("nLevels deve ser número.");
  if (!Number.isFinite(Number(answers.replicatesPerLevel))) errors.push("replicatesPerLevel deve ser número.");

  if (Number(answers.nLevels) < 1) errors.push("nLevels deve ser >= 1.");
  if (Number(answers.replicatesPerLevel) < 1) errors.push("replicatesPerLevel deve ser >= 1.");

  const allowedReg = ["nao_informado", "nao_especificado", "MMQO", "MMQP"];
  if (typeof answers.regressionUsed !== "string" || !allowedReg.includes(answers.regressionUsed)) {
    errors.push("regressionUsed deve ser: nao_informado, nao_especificado, MMQO ou MMQP.");
  }

  const bools = [
    "testCochranDone",
    "testRDone",
    "testR2Done",
    "testShapiroDone",
    "testDurbinWatsonDone",
    "testAnovaDone",
    "testTInterceptDone",
    "testOutliersDone",
    "homoscedastic",
    "residualNormal",
    "independentResiduals",
    "hasOutliers",
    "regressionModelSpecified"
  ];

  for (const b of bools) {
    if (typeof answers[b] !== "boolean") errors.push(`${b} deve ser boolean (true/false).`);
  }

  return { ok: errors.length === 0, errors };
}

