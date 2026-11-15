/**
 * AI Governance Observability Hub — motor de cálculo (engine)
 * Funciones puras: consumen el artefacto de gobierno (QUALITY_GATE,
 * FRAMEWORK_CHECKLISTS) + el estado de evidencias de una iniciativa,
 * y devuelven AI Health Score, Riesgo y Certification Readiness.
 * No definen reglas nuevas: aplican las reglas declaradas en data.js.
 */

function computeAIHealth(dimensiones, weights) {
  const w = weights;
  const score =
    dimensiones.confiabilidad * w.confiabilidad +
    dimensiones.seguridad * w.seguridad +
    dimensiones.gobernanza * w.gobernanza +
    dimensiones.operacion * w.operacion;
  return Math.round(score * 10) / 10;
}

function computeRiskLevel(dimensiones, healthScore, gate) {
  const belowGate = Object.values(dimensiones).some((v) => v < gate.passThreshold);
  if (healthScore < 70 || belowGate) return "Crítico";
  if (healthScore < 85) return "Medio";
  return "Bajo";
}

function getChecklistForFrameworks(frameworks, checklists) {
  return frameworks.flatMap((fw) => checklists[fw] || []);
}

function computeReadiness(initiative, checklists, gate) {
  const items = getChecklistForFrameworks(initiative.frameworks, checklists);
  const total = items.length;
  const completed = items.filter((it) => initiative.evidencias[it.id]).length;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 1000) / 10;

  const blockers = items.filter((it) => it.bloqueante && !initiative.evidencias[it.id]);

  let estado = "NO LISTO PARA CERTIFICACIÓN";
  if (blockers.length === 0 && pct >= gate.readinessPassPct) {
    estado = "LISTO PARA CERTIFICACIÓN";
  } else if (blockers.length === 0 && pct >= gate.readinessConditionalPct) {
    estado = "LISTO CON CONDICIONES";
  }

  return { items, total, completed, pct, blockers, estado };
}

function computeAssessmentRiskProfile(answers) {
  // answers: { patterns: string[], datosSensibles: bool, impacto: 'Bajo'|'Medio'|'Alto', autonomia: 'Asistido'|'Semi-autónomo'|'Autónomo' }
  let points = 0;
  points += Math.max(0, answers.patterns.length - 1); // combinar patrones incrementa riesgo
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

if (typeof module !== "undefined") {
  module.exports = {
    computeAIHealth,
    computeRiskLevel,
    getChecklistForFrameworks,
    computeReadiness,
    computeAssessmentRiskProfile,
  };
}
