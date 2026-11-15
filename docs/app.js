// AI Governance Observability Hub — app.js
// Capa de presentación: NO contiene reglas de negocio (están en engine.js/data.js).

let selectedInitiativeId = INITIATIVES[0].id;

function dimColor(val) {
  if (val >= 85) return "var(--green)";
  if (val >= 70) return "var(--amber)";
  return "var(--red)";
}

function badgeClass(risk) {
  return risk.toLowerCase() === "bajo" ? "bajo" : risk.toLowerCase() === "medio" ? "medio" : "crítico";
}

function getInitiative(id) {
  return INITIATIVES.find((i) => i.id === id);
}

// ---------------- TABS ----------------
document.querySelectorAll("nav.tabs button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("nav.tabs button").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("view-" + btn.dataset.view).classList.add("active");
  });
});

// ---------------- PORTFOLIO LIST (shared renderer, two mount points) ----------------
function renderPortfolioList(containerId, onSelect) {
  const el = document.getElementById(containerId);
  el.innerHTML = "";
  INITIATIVES.forEach((init) => {
    const health = computeAIHealth(init.dimensiones, QUALITY_GATE.weights);
    const risk = computeRiskLevel(init.dimensiones, health, QUALITY_GATE);
    const item = document.createElement("div");
    item.className = "portfolio-item" + (init.id === selectedInitiativeId ? " selected" : "");
    item.innerHTML = `
      <div class="name">${init.nombre}</div>
      <div class="squad">${init.squad} · ${init.frameworks.join(" + ")}</div>
      <span class="badge ${badgeClass(risk)}">Riesgo ${risk} · Health ${health}</span>
    `;
    item.addEventListener("click", () => {
      selectedInitiativeId = init.id;
      onSelect();
    });
    el.appendChild(item);
  });
}

// ---------------- OBSERVATORY PANEL ----------------
function renderObservatory() {
  renderPortfolioList("portfolio-list", renderObservatory);
  const init = getInitiative(selectedInitiativeId);
  const health = computeAIHealth(init.dimensiones, QUALITY_GATE.weights);
  const risk = computeRiskLevel(init.dimensiones, health, QUALITY_GATE);
  const panel = document.getElementById("observatory-panel");

  const dimLabels = { confiabilidad: "Confiabilidad", seguridad: "Seguridad", gobernanza: "Gobernanza", operacion: "Operación" };

  panel.innerHTML = `
    <span class="section-label">${init.nombre}</span>
    <div class="score-row">
      <div>
        <div class="score-big">${health}</div>
        <div class="score-sub">AI HEALTH SCORE</div>
      </div>
      <div>
        <span class="badge ${badgeClass(risk)}" style="font-size:13px;padding:6px 14px;">RIESGO GLOBAL: ${risk.toUpperCase()}</span>
        <div class="score-sub" style="margin-top:8px;">Frameworks aplicables: ${init.frameworks.join(", ")}</div>
      </div>
    </div>
    ${Object.entries(init.dimensiones).map(([k, v]) => `
      <div class="dim-row">
        <div class="dim-label"><span>${dimLabels[k]}</span><span>${v}%</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${v}%; background:${dimColor(v)};"></div></div>
      </div>
    `).join("")}
    <p class="note">Datos sensibles: ${init.datosSensibles ? "Sí" : "No"} · Impacto financiero: ${init.impactoFinanciero} · Autonomía: ${init.autonomia}</p>
  `;
}

// ---------------- READINESS PANEL (interactivo) ----------------
function renderReadiness() {
  renderPortfolioList("portfolio-list-2", renderReadiness);
  const init = getInitiative(selectedInitiativeId);
  const r = computeReadiness(init, FRAMEWORK_CHECKLISTS, QUALITY_GATE);
  const panel = document.getElementById("readiness-panel");

  const statusClass = r.estado.startsWith("LISTO PARA") ? "ready" : r.estado.startsWith("LISTO CON") ? "conditional" : "notready";

  const catLabels = { confiabilidad: "Confiabilidad", seguridad: "Seguridad", gobernanza: "Gobernanza", operacion: "Operación" };

  panel.innerHTML = `
    <span class="section-label">Certification Readiness — ${init.nombre}</span>
    <div class="readiness-top">
      <div class="stat-card"><div class="val">${r.pct}%</div><div class="lbl">Readiness Score</div></div>
      <div class="stat-card"><div class="val">${r.completed}/${r.total}</div><div class="lbl">Evidencias/controles</div></div>
      <div class="stat-card"><div class="val" style="color:${r.blockers.length ? 'var(--red)' : 'var(--green)'}">${r.blockers.length}</div><div class="lbl">Bloqueantes</div></div>
      <div class="stat-card"><span class="status-pill ${statusClass}">${r.estado}</span></div>
    </div>
    <span class="section-label">Checklist de evidencias (marca para simular avance)</span>
    <div id="checklist-interactive"></div>
    <div class="blocker-box ${r.blockers.length ? '' : 'empty'}">
      <strong>${r.blockers.length ? 'Bloqueantes pendientes:' : 'Sin bloqueantes activos'}</strong>
      ${r.blockers.length ? `<ul>${r.blockers.map((b) => `<li>${b.texto} <em>(${catLabels[b.categoria]})</em></li>`).join("")}</ul>` : ""}
    </div>
  `;

  const checklistEl = document.getElementById("checklist-interactive");
  r.items.forEach((it) => {
    const checked = !!init.evidencias[it.id];
    const row = document.createElement("div");
    row.className = "checklist-item" + (it.bloqueante ? (checked ? " blocker-met" : " blocker-unmet") : "");
    row.innerHTML = `
      <input type="checkbox" id="chk-${it.id}" ${checked ? "checked" : ""} />
      <label for="chk-${it.id}">${it.texto}${it.bloqueante ? " ⚠" : ""}</label>
      <span class="cat-tag">${catLabels[it.categoria]}</span>
    `;
    checklistEl.appendChild(row);
    row.querySelector("input").addEventListener("change", (e) => {
      init.evidencias[it.id] = e.target.checked;
      renderReadiness();
    });
  });
}

// ---------------- ASSESSMENT ----------------
const selectedPatterns = new Set();

document.querySelectorAll("#chip-patterns .chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    const val = chip.dataset.val;
    if (selectedPatterns.has(val)) {
      selectedPatterns.delete(val);
      chip.classList.remove("selected");
    } else {
      selectedPatterns.add(val);
      chip.classList.add("selected");
    }
    renderAssessment();
  });
});

["sel-datos", "sel-impacto", "sel-autonomia"].forEach((id) => {
  document.getElementById(id).addEventListener("change", renderAssessment);
});

function renderAssessment() {
  const el = document.getElementById("assessment-result");
  if (selectedPatterns.size === 0) {
    el.innerHTML = `<div class="result-box"><p class="note">Selecciona al menos un patrón para generar el perfil de riesgo.</p></div>`;
    return;
  }
  const answers = {
    patterns: Array.from(selectedPatterns),
    datosSensibles: document.getElementById("sel-datos").value === "si",
    impacto: document.getElementById("sel-impacto").value,
    autonomia: document.getElementById("sel-autonomia").value,
  };
  const result = computeAssessmentRiskProfile(answers);
  const covered = answers.patterns.filter((p) => FRAMEWORK_CHECKLISTS[p]);
  const notCovered = answers.patterns.filter((p) => !FRAMEWORK_CHECKLISTS[p]);

  el.innerHTML = `
    <span class="section-label">Perfil de riesgo generado</span>
    <div class="result-box">
      <div class="big" style="color:${result.perfil === 'Bajo' ? 'var(--green)' : result.perfil === 'Medio' ? 'var(--amber)' : 'var(--red)'}">${result.perfil.toUpperCase()}</div>
      <div class="score-sub">Puntaje de perfilamiento: ${result.points}</div>
    </div>
    <p class="note">
      ${covered.length ? `Frameworks con checklist disponible en el Hub: <strong>${covered.join(", ")}</strong>.` : ""}
      ${notCovered.length ? `<br/>Frameworks seleccionados sin checklist cargado aún en este MVP: <strong>${notCovered.join(", ")}</strong> (extensión futura, ver pestaña Artefactos).` : ""}
    </p>
  `;
}

// ---------------- ARTEFACTOS DE GOBIERNO ----------------
function renderArtifacts() {
  const gateTable = document.getElementById("gate-table");
  gateTable.innerHTML = `
    <tr><th>Dimensión</th><th>Peso</th><th>Umbral mínimo (gate)</th></tr>
    ${Object.entries(QUALITY_GATE.weights).map(([k, w]) => `
      <tr><td>${k.charAt(0).toUpperCase() + k.slice(1)}</td><td class="center">${Math.round(w * 100)}%</td><td class="center">${QUALITY_GATE.passThreshold}%</td></tr>
    `).join("")}
    <tr><td>Readiness para certificar</td><td class="center">—</td><td class="center">≥ ${QUALITY_GATE.readinessPassPct}% sin bloqueantes</td></tr>
    <tr><td>Readiness con condiciones</td><td class="center">—</td><td class="center">≥ ${QUALITY_GATE.readinessConditionalPct}% sin bloqueantes</td></tr>
  `;

  const raciTable = document.getElementById("raci-table");
  raciTable.innerHTML = `
    <tr><th>Actividad</th><th>Dev</th><th>QA</th><th>Gobierno</th><th>Arquitectura</th></tr>
    ${RACI.map((r) => `
      <tr><td>${r.actividad}</td><td class="center">${r.dev}</td><td class="center">${r.qa}</td><td class="center">${r.gobierno}</td><td class="center">${r.arq}</td></tr>
    `).join("")}
  `;

  const checklistArtifact = document.getElementById("checklist-artifact");
  checklistArtifact.innerHTML = Object.entries(FRAMEWORK_CHECKLISTS).map(([fw, items]) => `
    <strong style="color:var(--accent)">${fw}</strong>
    <table class="gov-table" style="margin:8px 0 16px;">
      <tr><th>Evidencia / control</th><th>Categoría</th><th>Bloqueante</th></tr>
      ${items.map((it) => `<tr><td>${it.texto}</td><td>${it.categoria}</td><td class="center">${it.bloqueante ? "Sí" : "No"}</td></tr>`).join("")}
    </table>
  `).join("");
}

// ---------------- INIT ----------------
renderObservatory();
renderReadiness();
renderAssessment();
renderArtifacts();
