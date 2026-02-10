export function getLinearidadeRequiredIds() {
  // Para o seu objetivo (checklist), só o desenho é obrigatório.
  // O resto você marca como feito/não feito e o sistema lista faltantes.
  return ["nLevels", "replicatesPerLevel"];
}
