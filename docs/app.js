// AI Governance Observability Hub — app.js
// Capa de presentación: NO contiene reglas de negocio (están en engine.js/data.js).

let selectedInitiativeId = INITIATIVES[0].id;

const PILAR_KEYS = Object.keys(PILARES);

function pilarColor(val) {
  if (val === null || val === undefined) return "#3a4d6e";
  if (val >= 85) return "var(--green)";
  if (val >= 70) return "var(--amber)";
  return "var(--red)";
}

function badgeClass(risk) {
  const r = risk.toLowerCase();
  if (r === "bajo") return "bajo";
  if (r === "medio") return "medio";
  if (r === "pendiente") return "pendiente";
  return "crítico";
}

function getInitiative(id) {
  return INITIATIVES.find((i) => i.id === id);
}

function orgLabel(init) {
  const loc = findCelula(init.celulaId);
  return loc ? `${loc.tribu.nombre} · ${loc.celula.nombre}` : "";
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

// ---------------- PORTFOLIO LIST agrupado por Tribu / Célula ----------------
function renderPortfolioList(containerId, onSelect) {
  const el = document.getElementById(containerId);
  el.innerHTML = "";
  TRIBUS.forEach((tribu) => {
    const initsEnTribu = INITIATIVES.filter((i) => tribu.celulas.some((c) => c.id === i.celulaId));
    if (initsEnTribu.length === 0) return;

    const tribuHead = document.createElement("div");
    tribuHead.className = "tribu-head";
    tribuHead.textContent = tribu.nombre;
    el.appendChild(tribuHead);

    tribu.celulas.forEach((celula) => {
      const initsEnCelula = INITIATIVES.filter((i) => i.celulaId === celula.id);
      if (initsEnCelula.length === 0) return;

      const celulaHead = document.createElement("div");
      celulaHead.className = "celula-head";
      celulaHead.textContent = celula.nombre;
      el.appendChild(celulaHead);

      initsEnCelula.forEach((init) => {
        const pilarScores = computePilarScores(init, CHECKLISTS_POR_TIPO, PILARES);
        const health = computeAIHealth(pilarScores, QUALITY_GATE.pesos);
        const risk = computeRiskLevel(pilarScores, health, QUALITY_GATE);
        const item = document.createElement("div");
        item.className = "portfolio-item" + (init.id === selectedInitiativeId ? " selected" : "");
        item.innerHTML = `
          <div class="name">${init.nombre}</div>
          <div class="squad">${init.tiposSolucion.join(" + ")} · Fase: ${init.fase}</div>
          <span class="badge ${badgeClass(risk)}">Riesgo ${risk}${health !== null ? " · Health " + health : ""}</span>
        `;
        item.addEventListener("click", () => {
          selectedInitiativeId = init.id;
          onSelect();
        });
        el.appendChild(item);
      });
    });
  });
}

function renderFaseStepper(faseActual) {
  return `
    <div class="fase-stepper">
      ${FASES.map((f) => `<div class="fase-step${f === faseActual ? " current" : ""}">${f}</div>`).join('<div class="fase-arrow">›</div>')}
    </div>
  `;
}

// ---------------- OBSERVATORY PANEL ----------------
function renderObservatory() {
  renderPortfolioList("portfolio-list", renderObservatory);
  const init = getInitiative(selectedInitiativeId);
  const pilarScores = computePilarScores(init, CHECKLISTS_POR_TIPO, PILARES);
  const health = computeAIHealth(pilarScores, QUALITY_GATE.pesos);
  const risk = computeRiskLevel(pilarScores, health, QUALITY_GATE);
  const panel = document.getElementById("observatory-panel");

  panel.innerHTML = `
    <span class="section-label">${init.nombre} <span class="org-tag">${orgLabel(init)}</span></span>
    ${renderFaseStepper(init.fase)}
    <div class="score-row">
      <div>
        <div class="score-big">${health !== null ? health : "—"}</div>
        <div class="score-sub">AI HEALTH SCORE</div>
      </div>
      <div>
        <span class="badge ${badgeClass(risk)}" style="font-size:13px;padding:6px 14px;">RIESGO GLOBAL: ${risk.toUpperCase()}</span>
        <div class="score-sub" style="margin-top:8px;">Tipo(s) de solución: ${init.tiposSolucion.join(", ")}</div>
      </div>
    </div>
    ${PILAR_KEYS.map((k) => {
      const v = pilarScores[k];
      const display = v === null ? "No aplica" : v === undefined ? "Pendiente de ejecución" : v + "%";
      const width = typeof v === "number" ? v : 0;
      return `
      <div class="dim-row">
        <div class="dim-label"><span>${PILARES[k].label}</span><span>${display}</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${width}%; background:${pilarColor(v)};"></div></div>
      </div>
    `;
    }).join("")}
    <p class="note">Datos sensibles: ${init.datosSensibles ? "Sí" : "No"} · Impacto financiero: ${init.impactoFinanciero} · Autonomía: ${init.autonomia}</p>
  `;
}

// ---------------- DICTAMEN DE CALIDAD (post-ejecución, interactivo) ----------------
function renderReadiness() {
  renderPortfolioList("portfolio-list-2", renderReadiness);
  const init = getInitiative(selectedInitiativeId);
  const d = computeDictamen(init, CHECKLISTS_POR_TIPO, ENTREGABLES_REQUERIDOS);
  const panel = document.getElementById("readiness-panel");

  const statusClassMap = {
    "APROBADO": "ready",
    "APROBADO CON OBSERVACIONES": "conditional",
    "REQUIERE AJUSTE": "conditional",
    "BLOQUEANTES": "notready",
    "DICTAMEN NO APLICA AÚN": "pending",
  };
  const statusClass = statusClassMap[d.estado] || "pending";

  if (!d.aplica) {
    panel.innerHTML = `
      <span class="section-label">Dictamen de Calidad — ${init.nombre} <span class="org-tag">${orgLabel(init)}</span></span>
      ${renderFaseStepper(init.fase)}
      <div class="result-box">
        <span class="status-pill ${statusClass}">${d.estado}</span>
        <p class="note" style="margin-top:14px;">${d.motivo}</p>
      </div>
    `;
    return;
  }

  panel.innerHTML = `
    <span class="section-label">Dictamen de Calidad — ${init.nombre} <span class="org-tag">${orgLabel(init)}</span></span>
    ${renderFaseStepper(init.fase)}
    <div class="readiness-top">
      <div class="stat-card"><div class="val">${d.pct}%</div><div class="lbl">Métricas aprobadas</div></div>
      <div class="stat-card"><div class="val">${d.aprobados}/${d.total}</div><div class="lbl">Resultado vs. umbral</div></div>
      <div class="stat-card"><div class="val" style="color:${d.bloqueantesAbiertos.length ? 'var(--red)' : 'var(--green)'}">${d.bloqueantesAbiertos.length}</div><div class="lbl">Bloqueantes</div></div>
      <div class="stat-card"><span class="status-pill ${statusClass}">${d.estado}</span></div>
    </div>

    <span class="section-label">Checklist de resultados por métrica (marca para simular ejecución)</span>
    <div id="checklist-interactive"></div>
    <div class="blocker-box ${d.bloqueantesAbiertos.length ? '' : 'empty'}">
      <strong>${d.bloqueantesAbiertos.length ? 'Bloqueantes pendientes:' : 'Sin bloqueantes activos'}</strong>
      ${d.bloqueantesAbiertos.length ? `<ul>${d.bloqueantesAbiertos.map((b) => `<li>${b.metrica} <em>(${PILARES[b.pilar].label})</em> — umbral: ${b.umbral}</li>`).join("")}</ul>` : ""}
    </div>

    <span class="section-label" style="margin-top:18px;">Entregables requeridos (paquete auditable)</span>
    <div id="entregables-interactive"></div>
  `;

  const checklistEl = document.getElementById("checklist-interactive");
  d.items.forEach((it) => {
    const checked = !!init.resultados[it.id];
    const row = document.createElement("div");
    row.className = "checklist-item" + (it.bloqueante ? (checked ? " blocker-met" : " blocker-unmet") : "");
    row.innerHTML = `
      <input type="checkbox" id="chk-${it.id}" ${checked ? "checked" : ""} />
      <label for="chk-${it.id}">${it.metrica}${it.bloqueante ? " ⚠" : ""} <span class="umbral-tag">umbral: ${it.umbral}</span></label>
      <span class="cat-tag">${PILARES[it.pilar].label}</span>
    `;
    checklistEl.appendChild(row);
    row.querySelector("input").addEventListener("change", (e) => {
      init.resultados[it.id] = e.target.checked;
      renderReadiness();
    });
  });

  const entregablesEl = document.getElementById("entregables-interactive");
  d.entregables.forEach((e) => {
    const row = document.createElement("div");
    row.className = "checklist-item" + (e.presente ? "" : " blocker-unmet");
    row.innerHTML = `
      <input type="checkbox" id="chk-${e.id}" ${e.presente ? "checked" : ""} />
      <label for="chk-${e.id}">${e.texto}${!e.presente ? " ⚠" : ""}</label>
    `;
    entregablesEl.appendChild(row);
    row.querySelector("input").addEventListener("change", (ev) => {
      init.entregables[e.id] = ev.target.checked;
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

["inp-nombre", "sel-datos", "sel-impacto", "sel-autonomia"].forEach((id) => {
  const el = document.getElementById(id);
  el.addEventListener(el.tagName === "INPUT" ? "input" : "change", renderAssessment);
});

function renderAssessment() {
  const el = document.getElementById("assessment-result");
  const nombre = document.getElementById("inp-nombre").value.trim();

  if (selectedPatterns.size === 0) {
    el.innerHTML = `<div class="result-box"><p class="note">Ingresa el nombre de la iniciativa y selecciona al menos un tipo de solución para generar la ficha de Assessment.</p></div>`;
    return;
  }
  const answers = {
    tipos: Array.from(selectedPatterns),
    datosSensibles: document.getElementById("sel-datos").value === "si",
    impacto: document.getElementById("sel-impacto").value,
    autonomia: document.getElementById("sel-autonomia").value,
  };
  const out = computeAssessmentOutput(answers, CHECKLISTS_POR_TIPO, ESCENARIOS_SUGERIDOS);
  const { riskProfile } = out;

  el.innerHTML = `
    <span class="section-label">Ficha de Assessment${nombre ? " — " + nombre : ""}</span>
    <div class="result-box">
      <div class="big" style="color:${riskProfile.perfil === 'Bajo' ? 'var(--green)' : riskProfile.perfil === 'Medio' ? 'var(--amber)' : 'var(--red)'}">${riskProfile.perfil.toUpperCase()}</div>
      <div class="score-sub">Perfil de riesgo inicial (Inicio) · Puntaje: ${riskProfile.points}</div>
    </div>

    <span class="section-label">Dimensión / métrica / umbral aplicable (Planificación)</span>
    ${out.metricasAplicables.length ? `
    <table class="gov-table" style="margin-bottom:14px;">
      <tr><th>Pilar</th><th>Métrica</th><th>Umbral</th><th>Bloqueante</th></tr>
      ${out.metricasAplicables.map((m) => `
        <tr><td>${PILARES[m.pilar].label}</td><td>${m.metrica}</td><td>${m.umbral}</td><td class="center">${m.bloqueante ? "Sí" : "No"}</td></tr>
      `).join("")}
    </table>` : `<p class="note">Sin métricas cargadas aún para los tipos seleccionados.</p>`}

    <span class="section-label">Escenarios de prueba sugeridos (Diseño)</span>
    ${out.escenariosSugeridos.length ? `<ul class="scenario-list">${out.escenariosSugeridos.map((s) => `<li>${s}</li>`).join("")}</ul>` : ""}

    ${out.tiposSinCobertura.length ? `<p class="note">Tipos seleccionados sin checklist cargado aún en este MVP: <strong>${out.tiposSinCobertura.join(", ")}</strong> (extensión futura, ver pestaña Artefactos).</p>` : ""}
  `;
}

// ---------------- ARTEFACTOS DE GOBIERNO ----------------
function renderArtifacts() {
  const gateTable = document.getElementById("gate-table");
  gateTable.innerHTML = `
    <tr><th>Pilar</th><th>Qué agrupa</th><th>Peso en AI Health</th><th>Umbral mínimo (gate)</th></tr>
    ${PILAR_KEYS.map((k) => `
      <tr><td>${PILARES[k].label}</td><td>${PILARES[k].descripcion}</td><td class="center">${Math.round(PILARES[k].peso * 100)}%</td><td class="center">${QUALITY_GATE.passThreshold}%</td></tr>
    `).join("")}
  `;

  const fasesTable = document.getElementById("fases-table");
  fasesTable.innerHTML = `
    <tr><th>Fase del flujo existente</th><th>Qué hace el equipo</th><th>Módulo del Hub</th></tr>
    <tr><td>Inicio</td><td>Clasificar tipo de solución, análisis inicial de riesgo</td><td class="center">Assessment</td></tr>
    <tr><td>Planificación</td><td>Definir pilares, métricas y umbrales de aceptación</td><td class="center">Assessment</td></tr>
    <tr><td>Diseño</td><td>Diseñar casos de prueba, golden dataset, rúbricas</td><td class="center">Assessment</td></tr>
    <tr><td>Ejecución</td><td>Ejecutar, registrar evidencia y gestionar defectos</td><td class="center">Dictamen de Calidad</td></tr>
    <tr><td>Cierre</td><td>Emitir dictamen y criterio de decisión final</td><td class="center">Dictamen de Calidad</td></tr>
  `;

  const raciTable = document.getElementById("raci-table");
  raciTable.innerHTML = `
    <tr><th>Actividad</th><th>Dev</th><th>QA</th><th>Gobierno</th><th>Arquitectura</th></tr>
    ${RACI.map((r) => `
      <tr><td>${r.actividad}</td><td class="center">${r.dev}</td><td class="center">${r.qa}</td><td class="center">${r.gobierno}</td><td class="center">${r.arq}</td></tr>
    `).join("")}
  `;

  const entregablesTable = document.getElementById("entregables-table");
  entregablesTable.innerHTML = `
    <tr><th>Entregable del paquete auditable</th></tr>
    ${ENTREGABLES_REQUERIDOS.map((e) => `<tr><td>${e.texto}</td></tr>`).join("")}
  `;

  const checklistArtifact = document.getElementById("checklist-artifact");
  checklistArtifact.innerHTML = Object.entries(CHECKLISTS_POR_TIPO).map(([tipo, items]) => `
    <strong style="color:var(--accent)">${tipo}</strong>
    <table class="gov-table" style="margin:8px 0 16px;">
      <tr><th>Pilar</th><th>Métrica</th><th>Umbral</th><th>Bloqueante</th></tr>
      ${items.map((it) => `<tr><td>${PILARES[it.pilar].label}</td><td>${it.metrica}</td><td>${it.umbral}</td><td class="center">${it.bloqueante ? "Sí" : "No"}</td></tr>`).join("")}
    </table>
  `).join("");
}

// ---------------- INIT ----------------
renderObservatory();
renderReadiness();
renderAssessment();
renderArtifacts();
