(() => {
    "use strict";

    const API_BASE = resolveApiBase();
    const THEME_STORAGE_KEY = "ut_theme";

    function resolveApiBase() {
        const configuredBase = window.TURNERO_API_BASE || localStorage.getItem("TURNERO_API_BASE") || "";
        if (!configuredBase) {
            return "/api";
        }

        const normalized = configuredBase.replace(/\/+$/, "");
        return normalized.endsWith("/api") ? normalized : `${normalized}/api`;
    }

    const ATTENTION_META = {
        matricula: { label: "Matrícula", sigla: "MAT", hint: "Actualizaciones y procesos académicos" },
        notas: { label: "Notas", sigla: "NOT", hint: "Certificaciones y novedades de calificaciones" },
        certificados: { label: "Certificados", sigla: "CER", hint: "Documentos y constancias institucionales" },
        prestamo_equipos: { label: "Préstamo de equipos", sigla: "PRE", hint: "Soporte y entrega de recursos" },
        otro: { label: "Otro", sigla: "ADM", hint: "Trámite administrativo adicional" }
    };

    const DEFAULT_PROGRAMAS = [
        "Ingeniería de Sistemas",
        "Administración de Empresas",
        "Contaduría Pública",
        "Derecho",
        "Licenciatura en Matemáticas",
        "Psicología"
    ];

    const form = document.getElementById("turneroForm");
    const nombreInput = document.getElementById("nombre");
    const programaSelect = document.getElementById("programa");
    const tipoInput = document.getElementById("tipoAtencion");
    const detalleOtroInput = document.getElementById("detalleOtro");
    const otroField = document.getElementById("otroField");
    const errorMsg = document.getElementById("errorMsg");
    const result = document.getElementById("result");
    const btnGenerar = document.getElementById("btnGenerar");
    const btnLimpiar = document.getElementById("btnLimpiar");
    const btnDownloadTicket = document.getElementById("btnDownloadTicket");
    const btnNextStep = document.getElementById("btnNextStep");
    const btnPrevStep = document.getElementById("btnPrevStep");
    const btnReviewStep = document.getElementById("btnReviewStep");
    const btnBackToType = document.getElementById("btnBackToType");
    const themeToggle = document.getElementById("themeToggle");
    const tabEstudiantes = document.getElementById("tabEstudiantes");
    const tabFuncionarios = document.getElementById("tabFuncionarios");
    const panelEstudiantes = document.getElementById("panelEstudiantes");
    const panelFuncionarios = document.getElementById("panelFuncionarios");
    const goToFormBtn = document.getElementById("goToFormBtn");
    const turneroRequestPanel = document.getElementById("turneroRequestPanel");
    const tramiteCards = document.getElementById("tramiteCards");
    const publicQueueList = document.getElementById("publicQueueList");
    const publicMesasGrid = document.getElementById("publicMesasGrid");
    const colaTotal = document.getElementById("colaTotal");
    const colaPendientes = document.getElementById("colaPendientes");
    const colaMinutos = document.getElementById("colaMinutos");

    const stepSections = [
        document.getElementById("studentStep1"),
        document.getElementById("studentStep2"),
        document.getElementById("studentStep3")
    ];

    const stepDots = [
        document.getElementById("stepDot1"),
        document.getElementById("stepDot2"),
        document.getElementById("stepDot3")
    ];

    const stepLabels = Array.from(document.querySelectorAll(".step-label"));

    const review = {
        nombre: document.getElementById("reviewNombre"),
        programa: document.getElementById("reviewPrograma"),
        tipo: document.getElementById("reviewTipo"),
        detalle: document.getElementById("reviewDetalle")
    };

    const out = {
        ticketCode: document.getElementById("ticketCode"),
        nombre: document.getElementById("outNombre"),
        programa: document.getElementById("outPrograma"),
        tipo: document.getElementById("outTipo"),
        detalle: document.getElementById("outDetalle"),
        emision: document.getElementById("outEmision"),
        estimada: document.getElementById("outEstimada")
    };

    let currentStep = 1;
    let lastTicket = null;
    let currentTipos = Object.keys(ATTENTION_META).map((id) => ({ id, label: ATTENTION_META[id].label }));

    initialize();

    function initialize() {
        applyStoredTheme();
        setRoleTab("estudiantes");
        hydrateProgramas(DEFAULT_PROGRAMAS);
        renderTramiteCards(currentTipos);
        bindEvents();
        setStep(1);
        cargarCatalogo();
        refreshPublicBoard();
        setInterval(refreshPublicBoard, 30000);
    }

    function bindEvents() {
        form.addEventListener("submit", handleSubmit);
        btnLimpiar?.addEventListener("click", handleReset);
        btnDownloadTicket?.addEventListener("click", downloadTicket);
        btnNextStep?.addEventListener("click", goToStep2);
        btnPrevStep?.addEventListener("click", () => setStep(1));
        btnReviewStep?.addEventListener("click", goToReview);
        btnBackToType?.addEventListener("click", () => setStep(2));
        themeToggle?.addEventListener("click", toggleTheme);
        tabEstudiantes?.addEventListener("click", () => setRoleTab("estudiantes"));
        tabFuncionarios?.addEventListener("click", () => setRoleTab("funcionarios"));
        goToFormBtn?.addEventListener("click", () => {
            setRoleTab("estudiantes");
            turneroRequestPanel?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    }

    async function cargarCatalogo() {
        try {
            const response = await fetch(`${API_BASE}/catalogo`);
            const data = await response.json();
            if (!response.ok) {
                return;
            }

            hydrateProgramas(data.catalogo?.programas || DEFAULT_PROGRAMAS);
            currentTipos = data.catalogo?.tiposAtencion || currentTipos;
            renderTramiteCards(currentTipos);
        } catch (error) {
            renderTramiteCards(currentTipos);
        }
    }

    function hydrateProgramas(programas) {
        const options = programas.map((programa) => `<option>${escapeHtml(programa)}</option>`).join("");
        programaSelect.innerHTML = `<option value="">Selecciona tu programa</option>${options}`;
    }

    function renderTramiteCards(tipos) {
        tramiteCards.innerHTML = tipos.map((tipo) => {
            const meta = ATTENTION_META[tipo.id] || { label: tipo.label, sigla: "TRM", hint: tipo.label };
            return `
                <button class="tramite-card" type="button" data-tipo="${escapeHtml(tipo.id)}">
                    <span class="tramite-icon" aria-hidden="true">${escapeHtml(meta.sigla)}</span>
                    <strong>${escapeHtml(tipo.label)}</strong>
                    <span>${escapeHtml(meta.hint)}</span>
                </button>
            `;
        }).join("");

        const cards = tramiteCards.querySelectorAll("button[data-tipo]");
        cards.forEach((card) => {
            card.addEventListener("click", () => {
                const tipoId = card.getAttribute("data-tipo") || "";
                tipoInput.value = tipoId;
                cards.forEach((item) => item.classList.remove("is-selected"));
                card.classList.add("is-selected");
                toggleOtroField();
            });
        });
    }

    function toggleOtroField() {
        const isOtro = tipoInput.value === "otro";
        otroField.hidden = !isOtro;
        detalleOtroInput.required = isOtro;
        if (!isOtro) {
            detalleOtroInput.value = "";
        }
    }

    function goToStep2() {
        clearError();
        if (!programaSelect.value.trim()) {
            showError("Selecciona tu programa académico para continuar.");
            return;
        }
        setStep(2);
    }

    function goToReview() {
        clearError();
        if (!tipoInput.value) {
            showError("Selecciona un trámite para continuar.");
            return;
        }
        if (tipoInput.value === "otro" && !detalleOtroInput.value.trim()) {
            showError("Describe el trámite cuando seleccionas 'Otro'.");
            return;
        }

        updateReview();
        setStep(3);
    }

    function updateReview() {
        const tipo = currentTipos.find((item) => item.id === tipoInput.value);
        review.nombre.textContent = nombreInput.value.trim() || "No informado";
        review.programa.textContent = programaSelect.value || "-";
        review.tipo.textContent = tipo?.label || "-";
        review.detalle.textContent = detalleOtroInput.value.trim() || "No aplica";
    }

    function setStep(step) {
        currentStep = step;
        stepSections.forEach((section, index) => {
            const isActive = index + 1 === step;
            section.hidden = !isActive;
            section.classList.toggle("is-active", isActive);
        });

        stepDots.forEach((dot, index) => {
            dot.classList.toggle("is-active", index + 1 <= step);
        });

        stepLabels.forEach((label, index) => {
            label.classList.toggle("is-active", index + 1 === step);
        });
    }

    async function handleSubmit(event) {
        event.preventDefault();
        clearError();

        const payload = {
            nombre: nombreInput.value.trim(),
            programa: programaSelect.value.trim(),
            tipoAtencion: tipoInput.value,
            detalleOtro: detalleOtroInput.value.trim()
        };

        if (!payload.programa || !payload.tipoAtencion) {
            showError("Completa la información antes de generar el turno.");
            return;
        }

        try {
            setSubmitting(true);
            const response = await fetch(`${API_BASE}/turnos`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok) {
                showError(data.error || "No se pudo generar el turno.");
                return;
            }

            lastTicket = data.turno;
            renderTicket(data.turno);
            await refreshPublicBoard();
            form.reset();
            tipoInput.value = "";
            toggleOtroField();
            clearSelectedCards();
            setStep(1);
        } catch (error) {
            showError("No hay conexión con el servidor. Intenta nuevamente.");
        } finally {
            setSubmitting(false);
        }
    }

    async function refreshPublicBoard() {
        try {
            const [colaRes, turnosRes, mesasRes] = await Promise.all([
                fetch(`${API_BASE}/turnos/estado`),
                fetch(`${API_BASE}/turnos`),
                fetch(`${API_BASE}/mesas`)
            ]);

            const colaData = await colaRes.json();
            const turnosData = await turnosRes.json();
            const mesasData = await mesasRes.json();

            if (colaRes.ok && colaData.cola) {
                colaTotal.textContent = String(colaData.cola.total);
                colaPendientes.textContent = String(colaData.cola.pendientes);
                colaMinutos.textContent = String(colaData.cola.minutosPendientes);
            }

            const turnos = turnosRes.ok ? (turnosData.turnos || []) : [];
            const mesas = mesasRes.ok ? (mesasData.mesas || []) : [];

            renderPendingList(turnos);
            renderPublicMesas(mesas, turnos);
        } catch (error) {
            publicQueueList.innerHTML = "<div class=\"panel-empty\">No se pudo cargar la cola pública.</div>";
            publicMesasGrid.innerHTML = "<div class=\"panel-empty\">No se pudo cargar el estado de las mesas.</div>";
        }
    }

    function renderPendingList(turnos) {
        const pendientes = turnos.filter((turno) => turno.estado === "pendiente").slice().reverse().slice(0, 8);
        if (pendientes.length === 0) {
            publicQueueList.innerHTML = "<div class=\"panel-empty\">No hay turnos pendientes en este momento.</div>";
            return;
        }

        publicQueueList.innerHTML = pendientes.map((turno) => `
            <article class="queue-item">
                <div>
                    <strong>${escapeHtml(turno.codigo)}</strong>
                    <p>${escapeHtml(turno.programa)}</p>
                </div>
                <span class="queue-badge">${escapeHtml(turno.mesaNombre || "Por asignar")}</span>
            </article>
        `).join("");
    }

    function renderPublicMesas(mesas, turnos) {
        if (!mesas.length) {
            publicMesasGrid.innerHTML = "<div class=\"panel-empty\">No hay mesas configuradas.</div>";
            return;
        }

        publicMesasGrid.innerHTML = mesas.map((mesa) => {
            const mesaTurnos = turnos.filter((turno) => Number(turno.mesaId) === Number(mesa.id));
            const actual = mesaTurnos.find((turno) => turno.estado === "en_atencion");
            const pendiente = mesaTurnos.find((turno) => turno.estado === "pendiente");
            const estado = actual ? "Atendiendo" : (pendiente ? "En espera" : "Disponible");
            const clase = actual ? "mesa-status-attending" : (pendiente ? "mesa-status-waiting" : "mesa-status-open");
            const codigo = actual?.codigo || pendiente?.codigo || "Sin turnos";

            return `
                <article class="public-mesa-card ${clase}">
                    <div class="public-mesa-head">
                        <span class="mesa-selector-badge">Mesa ${escapeHtml(mesa.id)}</span>
                        <span class="public-mesa-state">${escapeHtml(estado)}</span>
                    </div>
                    <strong>${escapeHtml(mesa.nombre)}</strong>
                    <p>${escapeHtml(codigo)}</p>
                </article>
            `;
        }).join("");
    }

    function renderTicket(ticket) {
        out.ticketCode.textContent = ticket.codigo;
        out.nombre.textContent = ticket.nombre || "No informado";
        out.programa.textContent = ticket.programa;
        out.tipo.textContent = ticket.tipoAtencionLabel;
        out.detalle.textContent = ticket.detalleOtro || "No aplica";
        out.emision.textContent = formatDateTime(ticket.horaCreacion);
        out.estimada.textContent = formatDateTime(ticket.horaEstimada);
        result.classList.add("is-visible");
        result.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function downloadTicket() {
        if (!lastTicket) {
            return;
        }

        const lines = [
            "Universidad del Tolima",
            "Sistema de turnos administrativos",
            "",
            `Turno: ${lastTicket.codigo}`,
            `Programa: ${lastTicket.programa}`,
            `Trámite: ${lastTicket.tipoAtencionLabel}`,
            `Detalle: ${lastTicket.detalleOtro || "No aplica"}`,
            `Hora de emisión: ${formatDateTime(lastTicket.horaCreacion)}`,
            `Hora estimada: ${formatDateTime(lastTicket.horaEstimada)}`
        ].join("\n");

        const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${lastTicket.codigo}.txt`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    function handleReset() {
        form.reset();
        tipoInput.value = "";
        toggleOtroField();
        clearSelectedCards();
        clearError();
        result.classList.remove("is-visible");
        setStep(1);
    }

    function clearSelectedCards() {
        const cards = tramiteCards.querySelectorAll(".tramite-card");
        cards.forEach((card) => card.classList.remove("is-selected"));
    }

    function showError(message) {
        errorMsg.textContent = message;
        errorMsg.classList.add("is-visible");
    }

    function clearError() {
        errorMsg.textContent = "";
        errorMsg.classList.remove("is-visible");
    }

    function setSubmitting(isSubmitting) {
        btnGenerar.disabled = isSubmitting;
        btnGenerar.textContent = isSubmitting ? "Generando..." : "Confirmar y Obtener Turno";
    }

    function setRoleTab(role) {
        const isStudent = role === "estudiantes";
        tabEstudiantes?.classList.toggle("is-active", isStudent);
        tabFuncionarios?.classList.toggle("is-active", !isStudent);
        panelEstudiantes.hidden = !isStudent;
        panelFuncionarios.hidden = isStudent;
        panelEstudiantes?.classList.toggle("is-active", isStudent);
        panelFuncionarios?.classList.toggle("is-active", !isStudent);
    }

    function formatDateTime(isoString) {
        const date = new Date(isoString);
        return new Intl.DateTimeFormat("es-CO", {
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }).format(date);
    }

    function applyStoredTheme() {
        const theme = localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
        document.body.classList.toggle("theme-dark", theme === "dark");
        updateThemeButton(theme);
    }

    function toggleTheme() {
        const isDark = document.body.classList.toggle("theme-dark");
        const theme = isDark ? "dark" : "light";
        localStorage.setItem(THEME_STORAGE_KEY, theme);
        updateThemeButton(theme);
    }

    function updateThemeButton(theme) {
        if (!themeToggle) {
            return;
        }
        themeToggle.textContent = theme === "dark" ? "Modo claro" : "Modo oscuro";
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
})();