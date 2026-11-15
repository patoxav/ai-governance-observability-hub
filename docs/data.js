/**
 * AI Governance Observability Hub — MVP demo data
 * Todo el contenido aquí es SINTÉTICO (datos de ejemplo para la demo).
 * Representa el "artefacto de gobierno" (Quality Gate, checklist, RACI)
 * que el Hub consume — no define reglas nuevas, solo las opera.
 */

// ---------------------------------------------------------------
// 1. QUALITY GATE — pesos y umbrales por dimensión (artefacto de gobierno)
// ---------------------------------------------------------------
const QUALITY_GATE = {
  weights: { confiabilidad: 0.25, seguridad: 0.30, gobernanza: 0.25, operacion: 0.20 },
  passThreshold: 80,          // % mínimo por dimensión para no generar alerta
  readinessPassPct: 95,       // % de evidencias/controles para "LISTO"
  readinessConditionalPct: 80 // % mínimo para "LISTO CON CONDICIONES"
};

// ---------------------------------------------------------------
// 2. RACI — matriz de responsabilidades (artefacto de gobierno)
// ---------------------------------------------------------------
const RACI = [
  { actividad: "Completar Assessment de la iniciativa", dev: "R", qa: "C", gobierno: "I", arq: "C" },
  { actividad: "Generar evidencia técnica", dev: "R", qa: "C", gobierno: "I", arq: "I" },
  { actividad: "Validar evidencia y controles", dev: "C", qa: "R", gobierno: "A", arq: "C" },
  { actividad: "Actualizar Governance Observatory", dev: "I", qa: "R", gobierno: "A", arq: "I" },
  { actividad: "Aprobar Certification Readiness", dev: "I", qa: "C", gobierno: "A", arq: "C" },
  { actividad: "Autorizar paso a producción", dev: "I", qa: "C", gobierno: "A", arq: "R" },
];

// ---------------------------------------------------------------
// 3. FRAMEWORKS Y CHECKLISTS DE EVIDENCIAS/CONTROLES
//    (extracto representativo de los anexos ya existentes)
// ---------------------------------------------------------------
const FRAMEWORK_CHECKLISTS = {
  RAG: [
    { id: "rag-01", categoria: "confiabilidad", texto: "Evaluación de groundedness / fidelidad al contexto recuperado", bloqueante: true },
    { id: "rag-02", categoria: "confiabilidad", texto: "Pruebas de relevancia de recuperación (retrieval precision/recall)", bloqueante: false },
    { id: "rag-03", categoria: "seguridad", texto: "Validación de fuga de datos sensibles vía contexto recuperado", bloqueante: true },
    { id: "rag-04", categoria: "gobernanza", texto: "Trazabilidad de fuentes citadas en la respuesta", bloqueante: false },
    { id: "rag-05", categoria: "operacion", texto: "Monitoreo de latencia end-to-end en producción", bloqueante: false },
  ],
  Agentic: [
    { id: "agt-01", categoria: "seguridad", texto: "Red-teaming de acciones autónomas de alto impacto", bloqueante: true },
    { id: "agt-02", categoria: "gobernanza", texto: "Límites de autonomía documentados y aprobados", bloqueante: true },
    { id: "agt-03", categoria: "confiabilidad", texto: "Pruebas de task completion rate sobre casos representativos", bloqueante: false },
    { id: "agt-04", categoria: "operacion", texto: "Guardrail de rollback ante acción incorrecta", bloqueante: true },
    { id: "agt-05", categoria: "operacion", texto: "Logging completo de la cadena de decisiones del agente", bloqueante: false },
  ],
  MCP: [
    { id: "mcp-01", categoria: "seguridad", texto: "Validación de guardrail de fuga de datos en llamadas a herramientas", bloqueante: true },
    { id: "mcp-02", categoria: "gobernanza", texto: "Inventario y aprobación de servidores/tools MCP conectados", bloqueante: true },
    { id: "mcp-03", categoria: "seguridad", texto: "Control de permisos por tool (principio de mínimo privilegio)", bloqueante: false },
    { id: "mcp-04", categoria: "operacion", texto: "Monitoreo de errores de invocación de tools en producción", bloqueante: false },
  ],
};

// ---------------------------------------------------------------
// 4. INICIATIVAS SINTÉTICAS (portafolio de demo)
//    "checked" = evidencia ya entregada y validada (editable en la demo)
// ---------------------------------------------------------------
const INITIATIVES = [
  {
    id: "init-1",
    nombre: "Asesor Virtual RAG",
    squad: "Squad Experiencia Digital",
    frameworks: ["RAG", "Agentic"],
    datosSensibles: true,
    impactoFinanciero: "Medio",
    autonomia: "Semi-autónomo",
    dimensiones: { confiabilidad: 87, seguridad: 92, gobernanza: 81, operacion: 89 },
    evidencias: {
      "rag-01": true, "rag-02": true, "rag-03": true, "rag-04": false, "rag-05": true,
      "agt-01": false, "agt-02": true, "agt-03": true, "agt-04": false, "agt-05": true,
    },
  },
  {
    id: "init-2",
    nombre: "Copiloto de Soporte (MCP)",
    squad: "Squad Plataforma Interna",
    frameworks: ["MCP", "Agentic"],
    datosSensibles: true,
    impactoFinanciero: "Alto",
    autonomia: "Autónomo",
    dimensiones: { confiabilidad: 74, seguridad: 68, gobernanza: 60, operacion: 71 },
    evidencias: {
      "mcp-01": false, "mcp-02": false, "mcp-03": true, "mcp-04": true,
      "agt-01": false, "agt-02": false, "agt-03": true, "agt-04": false, "agt-05": true,
    },
  },
  {
    id: "init-3",
    nombre: "Buscador Documental RAG v2",
    squad: "Squad Conocimiento",
    frameworks: ["RAG"],
    datosSensibles: false,
    impactoFinanciero: "Bajo",
    autonomia: "Asistido",
    dimensiones: { confiabilidad: 93, seguridad: 95, gobernanza: 90, operacion: 92 },
    evidencias: {
      "rag-01": true, "rag-02": true, "rag-03": true, "rag-04": true, "rag-05": true,
    },
  },
];

if (typeof module !== "undefined") {
  module.exports = { QUALITY_GATE, RACI, FRAMEWORK_CHECKLISTS, INITIATIVES };
}
