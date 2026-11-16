/**
 * AI Governance Observability Hub — motor de cálculo (engine)
 * Funciones puras: consumen el artefacto de gobierno (data.js) + el
 * estado de una iniciativa, y devuelven AI Health por pilar, perfil
 * de riesgo del Assessment y el Dictamen de Calidad post-ejecución.
 * No definen reglas nuevas: aplican los criterios de decisión
 * (APROBADO / APROBADO CON OBSERVACIONES / REQUIERE AJUSTE / BLOQUEANTES)
 * ya declarados en el Framework de Calidad en IA del banco (sección 9).
 */

function getChecklistForTipos(tipos, checklists) {
  return tipos.flatMap((t) => checklists[t] || []);
}

// ---------------------------------------------------------------
// PORTAFOLIO / OBSERVATORY — score por pilar sobre resultados ya ejecutados
// ---------------------------------------------------------------
function computePilarScores(initiative, checklists, pilares) {
  const items = getChecklistForTipos(initiative.tiposSolucion, checklists);
  const scores = {};
  Object.keys(pilares).forEach((pilarKey) => {
    const itemsPilar = items.filter((it) => it.pilar === pilarKey);
    if (itemsPilar.length === 0) {
      scores[pilarKey] = null; // pilar no aplica a esta iniciativa
      return;
    }
    const hasResultados = Object.keys(initiative.resultados || {}).length > 0;
    if (!hasResultados) {
      scores[pilarKey] = undefined; // aplica, pero aún no hay ejecución (fase temprana)
      return;
    }
    const passed = itemsPilar.filter((it) => initiative.resultados[it.id]).length;
    scores[pilarKey] = Math.round((passed / itemsPilar.length) * 1000) / 10;
  });
  return scores;
}

function computeAIHealth(pilarScores, pesos) {
  let sumPeso = 0;
  let sumPonderado = 0;
  Object.entries(pilarScores).forEach(([k, v]) => {
    if (typeof v === "number") {
      sumPonderado += v * pesos[k];
      sumPeso += pesos[k];
    }
  });
  if (sumPeso === 0) return null;
  return Math.round((sumPonderado / sumPeso) * 10) / 10;
}

function computeRiskLevel(pilarScores, healthScore, gate) {
  if (healthScore === null) return "Pendiente";
  const valores = Object.values(pilarScores).filter((v) => typeof v === "number");
  const belowGate = valores.some((v) => v < gate.passThreshold);
  if (healthScore < 70 || belowGate) return "Crítico";
  if (healthScore < 85) return "Medio";
  return "Bajo";
}

// ---------------------------------------------------------------
// DICTAMEN DE CALIDAD — veredicto POST-EJECUCIÓN (no es una guía de
// precertificación): aplica los criterios de decisión del framework
// (sección 9) sobre métricas ejecutadas + paquete de evidencias.
// ---------------------------------------------------------------
function computeDictamen(initiative, checklists, entregablesRequeridos) {
  const items = getChecklistForTipos(initiative.tiposSolucion, checklists);
  const hasResultados = Object.keys(initiative.resultados || {}).length > 0;

  if (!hasResultados) {
    return {
      aplica: false,
      estado: "DICTAMEN NO APLICA AÚN",
      motivo: `La iniciativa está en fase "${initiative.fase}". El dictamen se emite al cierre de la Ejecución, con evidencia ya registrada.`,
      items, total: items.length, aprobados: 0, pct: 0,
      bloqueantesAbiertos: [], menoresAbiertos: [],
      entregables: entregablesRequeridos.map((e) => ({ ...e, presente: false })),
      entregablesFaltantes: entregablesRequeridos,
    };
  }

  const total = items.length;
  const aprobados = items.filter((it) => initiative.resultados[it.id]).length;
  const pct = total === 0 ? 0 : Math.round((aprobados / total) * 1000) / 10;

  const bloqueantesAbiertos = items.filter((it) => it.bloqueante && !initiative.resultados[it.id]);
  const menoresAbiertos = items.filter((it) => !it.bloqueante && !initiative.resultados[it.id]);

  const entregables = entregablesRequeridos.map((e) => ({ ...e, presente: !!initiative.entregables[e.id] }));
  const entregablesFaltantes = entregables.filter((e) => !e.presente);

  // Criterios de decisión (sección 9 del framework):
  // BLOQUEANTES: riesgo crítico, falla de seguridad o AUSENCIA DE EVIDENCIA ESENCIAL.
  let estado;
  if (bloqueantesAbiertos.length > 0 || entregablesFaltantes.length > 0) {
    estado = "BLOQUEANTES";
  } else if (menoresAbiertos.length > Math.ceil(total * 0.2)) {
    estado = "REQUIERE AJUSTE";
  } else if (menoresAbiertos.length > 0) {
    estado = "APROBADO CON OBSERVACIONES";
  } else {
    estado = "APROBADO";
  }

  return {
    aplica: true, estado, items, total, aprobados, pct,
    bloqueantesAbiertos, menoresAbiertos, entregables, entregablesFaltantes,
  };
}

// ---------------------------------------------------------------
// ASSESSMENT — perfil de riesgo + dimensión/métrica/umbral aplicable
// + escenarios de prueba sugeridos (fases Inicio/Planificación/Diseño)
// ---------------------------------------------------------------
function computeAssessmentRiskProfile(answers) {
  // answers: { tipos: string[], datosSensibles: bool, impacto, autonomia }
  let points = 0;
  points += Math.max(0, answers.tipos.length - 1); // combinar tipos incrementa riesgo
  if (answers.datosSensibles) points += 2;
  if (answers.impacto === "Alto") points += 2;
  else if (answers.impacto === "Medio") points += 1;
  if (answers.autonomia === "Autónomo") points += 2;
  else if (answers.autonomia === "Semi-autónomo") points += 1;

  let perfil = "Bajo";
  if (points >= 6) perfil = "Crítico";
  else if (points >= 4) perfil = "Alto";
  else if (points >= 2) perfil = "Medio";

  return { points, perfil };
}

function computeAssessmentOutput(answers, checklists, escenarios) {
  const riskProfile = computeAssessmentRiskProfile(answers);
  const tiposCubiertos = answers.tipos.filter((t) => checklists[t]);
  const tiposSinCobertura = answers.tipos.filter((t) => !checklists[t]);
  const metricasAplicables = getChecklistForTipos(tiposCubiertos, checklists);
  const escenariosSugeridos = tiposCubiertos.flatMap((t) => escenarios[t] || []);
  return { riskProfile, tiposCubiertos, tiposSinCobertura, metricasAplicables, escenariosSugeridos };
}

if (typeof module !== "undefined") {
  module.exports = {
    getChecklistForTipos,
    computePilarScores,
    computeAIHealth,
    computeRiskLevel,
    computeDictamen,
    computeAssessmentRiskProfile,
    computeAssessmentOutput,
  };
}
