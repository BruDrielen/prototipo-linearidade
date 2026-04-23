(async () => {
  const modulo = await import("./js/decisionTree.js");
  const runTree = modulo.runTree;

  const resposta = await fetch("./js/linearidade.json");
  const treeData = await resposta.json();

  const cenarios = [
    {
      desc: "Níveis insuficientes",
      answers: {
        nLevels: 4,
        replicatesPerLevel: 3,
        missingCount: 0,
        cochranResultMissing: false,
        regressionModelMissing: false,
        modeloInconsistente: false,
        residuosInvalidos: false,
        anovaInvalida: false,
        interceptoInvalido: false,
        outliersInvalidos: false,
        estudoAdequado: false
      },
      expected: "INADEQUADO"
    },
    {
      desc: "Replicatas insuficientes",
      answers: {
        nLevels: 6,
        replicatesPerLevel: 2,
        missingCount: 0,
        cochranResultMissing: false,
        regressionModelMissing: false,
        modeloInconsistente: false,
        residuosInvalidos: false,
        anovaInvalida: false,
        interceptoInvalido: false,
        outliersInvalidos: false,
        estudoAdequado: false
      },
      expected: "INADEQUADO"
    },
    {
      desc: "Testes mínimos ausentes",
      answers: {
        nLevels: 6,
        replicatesPerLevel: 3,
        missingCount: 2,
        cochranResultMissing: false,
        regressionModelMissing: false,
        modeloInconsistente: false,
        residuosInvalidos: false,
        anovaInvalida: false,
        interceptoInvalido: false,
        outliersInvalidos: false,
        estudoAdequado: false
      },
      expected: "INSUFICIENTE/INCONCLUSIVO"
    },
    {
      desc: "Cochran sem resultado informado",
      answers: {
        nLevels: 6,
        replicatesPerLevel: 3,
        missingCount: 0,
        cochranResultMissing: true,
        regressionModelMissing: false,
        modeloInconsistente: false,
        residuosInvalidos: false,
        anovaInvalida: false,
        interceptoInvalido: false,
        outliersInvalidos: false,
        estudoAdequado: false
      },
      expected: "INSUFICIENTE/INCONCLUSIVO"
    },
    {
      desc: "Modelo inconsistente",
      answers: {
        nLevels: 6,
        replicatesPerLevel: 3,
        missingCount: 0,
        cochranResultMissing: false,
        regressionModelMissing: false,
        modeloInconsistente: true,
        residuosInvalidos: false,
        anovaInvalida: false,
        interceptoInvalido: false,
        outliersInvalidos: false,
        estudoAdequado: false
      },
      expected: "INADEQUADO"
    },
    {
      desc: "Caso adequado",
      answers: {
        nLevels: 6,
        replicatesPerLevel: 3,
        missingCount: 0,
        cochranResultMissing: false,
        regressionModelMissing: false,
        modeloInconsistente: false,
        residuosInvalidos: false,
        anovaInvalida: false,
        interceptoInvalido: false,
        outliersInvalidos: false,
        estudoAdequado: true
      },
      expected: "ADEQUADO"
    }
  ];

  let aprovados = 0;

  console.log("========== TESTES ==========");

  cenarios.forEach((c, i) => {
    try {
      const r = runTree(treeData.root, c.answers);
      const ok = r.status === c.expected;
      if (ok) aprovados++;

      console.log(
        `[${i + 1}] ${c.desc}: ${ok ? "PASSOU" : "FALHOU"} | esperado=${c.expected} | obtido=${r.status}`
      );

      if (!ok) {
        console.log("Retorno completo:", r);
      }
    } catch (e) {
      console.log(`[${i + 1}] ${c.desc}: ERRO | ${e.message}`);
    }
  });

  console.log(`Resumo: ${aprovados}/${cenarios.length} testes aprovados.`);
})();
