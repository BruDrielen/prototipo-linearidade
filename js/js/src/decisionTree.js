export function runTree(node, answers) {
  if (node.result) return node.result;
  if (!node.if) throw new Error("Nó inválido: falta 'if'.");

  const cond = evalCond(node.if, answers);
  const next = cond ? node.then : node.else;

  if (!next) throw new Error("Nó inválido: falta branch then/else.");
  return runTree(next, answers);
}

function evalCond(c, answers) {
  if (c.all) return c.all.every(x => evalCond(x, answers));
  if (c.any) return c.any.some(x => evalCond(x, answers));

  // Verificar se a variável do JSON existe nos dados preenchidos
  if (!(c.var in answers)) {
    throw new Error(`Erro de Configuração: A variável '${c.var}' definida no JSON não foi encontrada nos dados do formulário.`);
  }

  const left = answers[c.var];
  const right = c.value;

  switch (c.op) {
    case "==": return left === right;
    case "!=": return left !== right;
    case "<": return Number(left) < Number(right);
    case "<=": return Number(left) <= Number(right);
    case ">": return Number(left) > Number(right);
    case ">=": return Number(left) >= Number(right);
    default: throw new Error(`Operador não suportado: ${c.op}`);
  }
}


