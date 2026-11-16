// ---------------------------------------------------------------
// Generación de escenarios de prueba asistida por LLM (opcional).
// Diseño deliberado para un MVP sin backend:
//  - Llamada directa desde el navegador a un endpoint compatible con
//    OpenAI Chat Completions ("bring your own key"); no se persiste
//    la API key en ningún storage ni se envía a GitHub Pages.
//  - Solo se envían METADATOS del Assessment (nombre, tipos de
//    solución, perfil de riesgo, dimensión/métrica/umbral ya
//    definidos por el framework). Nunca evidencia real ni datos
//    sensibles de la iniciativa — ese es el control exigido para
//    este tipo de capacidad.
//  - Si no hay API key o falla la llamada, el Assessment sigue
//    funcionando con los escenarios heurísticos base (degradación
//    controlada, sin dependencia dura de un proveedor externo).
// ---------------------------------------------------------------

function buildScenarioPrompt(context) {
  const { nombre, tipos, riskProfile, metricasAplicables } = context;

  const metricasTxt = metricasAplicables
    .map((m) => `- [${m.pilar}] ${m.metrica} (umbral: ${m.umbral}, bloqueante: ${m.bloqueante ? "sí" : "no"})`)
    .join("\n");

  const system = [
    "Eres un asistente de aseguramiento de calidad para soluciones de IA en un banco.",
    "Tu única tarea es SUGERIR escenarios de prueba adicionales para la iniciativa descrita.",
    "Reglas estrictas:",
    "1) No inventes métricas, umbrales ni dimensiones nuevas: usa únicamente los que se listan como contexto.",
    "2) No solicites ni proceses datos sensibles reales; trabaja solo con la caracterización entregada.",
    "3) Devuelve EXCLUSIVAMENTE un arreglo JSON de strings, sin texto adicional, sin markdown.",
    "4) Cada string debe ser un escenario de prueba concreto y accionable (una línea), en español.",
    "5) Máximo 6 escenarios, priorizando los que cubran métricas marcadas como bloqueantes.",
  ].join("\n");

  const user = [
    `Iniciativa: ${nombre || "(sin nombre)"}`,
    `Tipos de solución: ${tipos.join(", ")}`,
    `Perfil de riesgo inicial: ${riskProfile.perfil} (puntaje ${riskProfile.points})`,
    `Dimensión / métrica / umbral aplicable (framework vigente, no modificar):`,
    metricasTxt || "(sin métricas cargadas para estos tipos)",
    "",
    "Genera los escenarios de prueba sugeridos como arreglo JSON de strings.",
  ].join("\n");

  return { system, user };
}

function parseScenarioResponse(rawText) {
  // Intento 1: JSON estricto, como se le pidió al modelo.
  try {
    const parsed = JSON.parse(rawText);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch (_) {
    // Intento 2: el modelo puede envolver el JSON en un bloque ```json ... ```
    const match = rawText.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
      } catch (_) {
        /* sigue al fallback de líneas */
      }
    }
  }
  // Fallback: parsear como lista de líneas (por si el modelo no respetó el formato JSON).
  return rawText
    .split("\n")
    .map((l) => l.replace(/^[-*\d.()\s]+/, "").trim())
    .filter((l) => l.length > 3);
}

async function generateScenariosWithLLM({ endpoint, apiKey, model, context }) {
  if (!apiKey) {
    return { ok: false, error: "Falta la API key. El Hub sigue mostrando los escenarios heurísticos base." };
  }
  const { system, user } = buildScenarioPrompt(context);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { ok: false, error: `El proveedor LLM respondió ${res.status}. ${errText.slice(0, 180)}` };
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || "";
    const scenarios = parseScenarioResponse(content);

    if (!scenarios.length) {
      return { ok: false, error: "El modelo respondió, pero no se pudo interpretar ningún escenario." };
    }
    return { ok: true, scenarios };
  } catch (err) {
    return { ok: false, error: `No se pudo contactar al proveedor LLM (${err.message || err}). Revisa conexión/CORS/API key.` };
  }
}
