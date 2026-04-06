export function runTree(node, answers) {
  if (!node) {
    throw new Error("Árvore de decisão inválida: nó inexistente.");
  }

  if (node.result) {
    return node.result;
  }

  if (!node.if) {
    throw new Error("Nó inválido: falta a condição 'if'.");
  }

  const conditionResult = evalCond(node.if, answers);
  const nextNode = conditionResult ? node.then : node.else;

  if (!nextNode) {
    throw new Error("Árvore de decisão inválida: falta ramo 'then' ou 'else'.");
  }

  return runTree(nextNode, answers);
}

function evalCond(condition, answers) {
  if (!condition || typeof condition !== "object") {
    throw new Error("Condição inválida na árvore de decisão.");
  }

  if (Array.isArray(condition.all)) {
    return condition.all.every(item => evalCond(item, answers));
  }

  if (Array.isArray(condition.any)) {
    return condition.any.some(item => evalCond(item, answers));
  }

  if (!Object.prototype.hasOwnProperty.call(condition, "var")) {
    throw new Error("Condição inválida: campo 'var' ausente.");
  }

  if (!Object.prototype.hasOwnProperty.call(condition, "op")) {
    throw new Error(`Condição inválida para '${condition.var}': campo 'op' ausente.`);
  }

  if (!Object.prototype.hasOwnProperty.call(answers, condition.var)) {
    throw new Error(
      `Erro de configuração: a variável '${condition.var}' definida no JSON não foi encontrada nos dados processados.`
    );
  }

  const left = answers[condition.var];
  const right = condition.value;

  switch (condition.op) {
    case "==":
      return left === right;

    case "!=":
      return left !== right;

    case "<":
      return Number(left) < Number(right);

    case "<=":
      return Number(left) <= Number(right);

    case ">":
      return Number(left) > Number(right);

    case ">=":
      return Number(left) >= Number(right);

    default:
      throw new Error(`Operador não suportado na árvore de decisão: '${condition.op}'.`);
  }
}