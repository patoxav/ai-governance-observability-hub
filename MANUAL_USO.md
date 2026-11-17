# Manual rápido de uso — AI Governance Observability Hub (MVP)

Guía para clonar este repositorio y correr el MVP localmente. No requiere build,
backend ni dependencias: es HTML/CSS/JS plano.

## 1. Clonar y ejecutar

```bash
git clone https://github.com/patoxav/ai-governance-observability-hub.git
cd ai-governance-observability-hub/docs
```

El webapp vive en `docs/` (la misma carpeta que sirve GitHub Pages). Para
correrlo localmente necesitas un servidor estático simple — abrir
`index.html` directamente con `file://` puede fallar por restricciones del
navegador al cargar los `<script>` en algunos sistemas.

```bash
# Opción 1 — Python (ya viene instalado en la mayoría de equipos)
python3 -m http.server 8080

# Opción 2 — Node (si tienes npx disponible)
npx serve .
```

Luego abre `http://localhost:8080` en el navegador.

## 2. Estructura de archivos (`docs/`)

| Archivo | Rol |
|---|---|
| `index.html` | Shell de la página: las 4 pestañas, formularios y contenedores donde se inyecta el contenido dinámico. |
| `data.js` | **Única fuente de datos** del MVP: fases del flujo del banco, Tribus/Células, los 5 pilares y sus pesos, checklists de métricas por tipo de solución (RAG/Agentic/MCP/Clasificador), escenarios sugeridos, entregables requeridos y las 4 iniciativas sintéticas de ejemplo. |
| `engine.js` | Funciones puras de cálculo: pilares → AI Health → riesgo global → Dictamen de Calidad (Aprobado / Con observaciones / Requiere ajuste / Bloqueantes). No toca el DOM. |
| `llm.js` | Generación opcional de escenarios de prueba vía LLM (client-side, "bring your own key"). No toca el DOM; expone `generateScenariosWithLLM(...)`. |
| `app.js` | Capa de presentación: escucha eventos de la UI, llama a `engine.js`/`llm.js` y renderiza el HTML de cada pestaña. |
| `style.css` | Estilos. |

Si quieres extender el MVP (nuevo tipo de solución, nueva iniciativa, nuevo
pilar), **solo necesitas tocar `data.js`** — `engine.js` y `app.js` son
genéricos y no requieren cambios para datos nuevos del mismo tipo.

## 3. Las 4 pestañas

### 📊 Governance Observatory
Selecciona una iniciativa en la lista (agrupada por **Tribu → Célula**) para
ver, en el panel derecho: el stepper de fase (Inicio…Cierre), el **AI Health
Score**, el **riesgo global** y la barra de cada uno de los **5 pilares**
(Confiabilidad, Seguridad y Riesgo, Gobierno y Cumplimiento, Operabilidad,
Assurance). Una barra puede mostrar "No aplica" (el pilar no corresponde a
ese tipo de solución) o "Pendiente de ejecución" (aún no hay resultados
porque la iniciativa no ha llegado a la fase de Ejecución).

### ✅ Dictamen de Calidad
Misma lista de iniciativas; el panel derecho muestra el checklist de
métricas con su umbral (marcando/desmarcando resultados en vivo), el estado
de bloqueantes y el checklist de entregables requeridos. El veredicto final
se recalcula en tiempo real según la lógica real del framework: cualquier
bloqueante abierto o entregable faltante → **Bloqueantes**; más de 20% de
métricas no bloqueantes fallidas → **Requiere ajuste**; algunas fallidas →
**Aprobado con observaciones**; todo correcto → **Aprobado**.

### 📝 Assessment
Formulario para caracterizar una iniciativa **antes** de construir:
1. Nombre de la iniciativa / objeto de prueba.
2. Tipo(s) de solución (RAG, MCP, Agentes, Clasificación, Voz, Multiagente).
3. Datos sensibles, impacto financiero, nivel de autonomía.

Al completarlo, el panel derecho muestra el **perfil de riesgo inicial**, la
tabla de **dimensión / métrica / umbral** aplicable según el framework, y una
lista de **escenarios de prueba sugeridos** (heurística base, siempre
disponible sin configuración).

Debajo hay una caja opcional **"Escenarios generados por IA"**:
- Pon tu propia API key (compatible con OpenAI Chat Completions) en el campo
  correspondiente — nunca se guarda ni se envía a otro destino que no sea el
  endpoint configurado.
- Solo se envían metadatos ya calculados (tipos de solución, perfil de
  riesgo, dimensión/métrica/umbral); nunca evidencia real ni datos sensibles.
- Si no pones una key, o la llamada falla, el Hub sigue funcionando con los
  escenarios heurísticos — no es un requisito para usar el MVP.

### 🗂️ Artefactos de Gobierno
Referencia estática de los artefactos que sustentan todo lo anterior: la
tabla del Quality Gate (5 pilares y su peso), el mapeo de las 5 fases del
flujo del banco a los módulos del Hub, la matriz RACI, el paquete de
entregables auditables y el checklist de métricas por tipo de solución.

## 4. Datos de ejemplo

Todas las iniciativas, tribus/células, métricas y entregables son
**sintéticos**, declarados explícitamente en `data.js` — no hay conexión a
ningún sistema real. Esto es intencional para el MVP de demostración (ver
"límites conocidos" en la lámina 3 de la presentación).

## 5. Dónde están los demás entregables

- `deliverables/AI_Governance_Observability_Hub.pptx` / `.pdf` — presentación ejecutiva de 5 láminas.
- `deliverables/webapp.zip` — copia descargable de `docs/` para correr offline.
- `AI_Governance_Observability_Hub.md` — contenido completo (storytelling, mockups, argumentario).
