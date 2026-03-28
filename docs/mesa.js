(() => {
    "use strict";

    const API_BASE = "/api";
    const THEME_STORAGE_KEY = "ut_theme";
    const AUTH_STORAGE_KEY = "ut_mesa_auth";

    const body = document.body;
    const mesaId = Number(body.dataset.mesaId || 0);
    const mesaNombre = body.dataset.mesaNombre || `Mesa ${mesaId}`;

    const themeToggle = document.getElementById("themeToggle");
    const btnLogout = document.getElementById("btnCerrarMesa");
    const btnLlamar = document.getElementById("btnLlamarSiguiente");
    const btnFinalizar = document.getElementById("btnFinalizarActual");
    const btnExportar = document.getElementById("btnExportar");
    const actionFeedback = document.getElementById("mesaActionFeedback");
    const authStatus = document.getElementById("mesaAuthStatus");
    const securePanel = document.getElementById("mesaSecurePanel");
    const dashboard = document.getElementById("mesaDashboard");
    const mesaTurnosBody = document.getElementById("mesaTurnosBody");
    const mesaQueueList = document.getElementById("mesaQueueList");
    const statPendientes = document.getElementById("statPendientes");
    const statActual = document.getElementById("statActual");
    const statFinalizados = document.getElementById("statFinalizados");
    const statFuncion = document.getElementById("statFuncion");
    const currentTurno = document.getElementById("currentTurno");
    const currentEstado = document.getElementById("currentEstado");
    const mesaMeta = document.getElementById("mesaMeta");
    const toast = document.getElementById("toast");

    let auth = null;
    let turnosMesa = [];
    let refreshHandle = null;

    applyStoredTheme();
    restoreAuth();
    themeToggle?.addEventListener("click", toggleTheme);
    btnLogout?.addEventListener("click", handleLogout);
    btnLlamar?.addEventListener("click", callNextTurn);
    btnFinalizar?.addEventListener("click", finishCurrentTurn);
    btnExportar?.addEventListener("click", handleExport);

    if (!auth?.token) {
        renderLockedState();
    } else {
        renderDashboardState();
        loadData();
        startAutoRefresh();
    }

    function restoreAuth() {
        try {
            const raw = localStorage.getItem(AUTH_STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : null;
            auth = parsed && Number(parsed?.mesa?.id) === mesaId ? parsed : null;
        } catch (error) {
            auth = null;
        }
    }

    function clearAuth() {
        auth = null;
        localStorage.removeItem(AUTH_STORAGE_KEY);
    }

    function renderLockedState() {
        securePanel.hidden = false;
        dashboard.hidden = true;
        authStatus.textContent = `Para ingresar a ${mesaNombre} debes autenticarte en el login de funcionarios.`;
        mesaMeta.textContent = `${mesaNombre} | Acceso restringido`;
        setActionFeedback("Inicia sesión para habilitar las acciones de mesa.");
        stopAutoRefresh();
    }

    function renderDashboardState() {
        securePanel.hidden = true;
        dashboard.hidden = false;
        authStatus.textContent = `Sesión activa en ${mesaNombre}.`;
        mesaMeta.textContent = `${mesaNombre} | Dashboard operativo`;
        setActionFeedback("Panel operativo listo.", "success");
    }

    async function handleLogout() {
        try {
            if (auth?.token) {
                await fetch(`${API_BASE}/mesas/logout`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${auth.token}`
                    }
                });
            }
        } finally {
            clearAuth();
            window.location.href = "./admin.html";
        }
    }

    async function loadData() {
        if (!auth?.token) {
            renderLockedState();
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/turnos?mesaId=${mesaId}`);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "No se pudo cargar la mesa.");
            }

            turnosMesa = data.turnos || [];
            renderStats();
            renderQueueSidebar();
            renderTable();
        } catch (error) {
            mesaTurnosBody.innerHTML = "<tr><td colspan=\"5\" class=\"muted\">No se pudo cargar la tabla de la mesa.</td></tr>";
            mesaQueueList.innerHTML = "<div class=\"panel-empty\">No se pudo cargar la cola.</div>";
        }
    }

    function renderStats() {
        const pendientes = turnosMesa.filter((turno) => turno.estado === "pendiente");
        const actual = turnosMesa.find((turno) => turno.estado === "en_atencion") || null;
        const finalizados = turnosMesa.filter((turno) => turno.estado === "finalizado");

        statPendientes.textContent = String(pendientes.length);
        statActual.textContent = actual ? actual.codigo : "Sin turno";
        statFinalizados.textContent = String(finalizados.length);
        statFuncion.textContent = mesaNombre;
        currentTurno.textContent = actual ? actual.codigo : (pendientes[0]?.codigo || "Esperando Siguiente Turno");
        currentEstado.textContent = actual ? "Atendiendo" : (pendientes.length ? "En espera" : "Disponible");

        btnLlamar.disabled = !auth?.token || pendientes.length === 0;
        btnFinalizar.disabled = !auth?.token || !actual;
        btnExportar.disabled = !auth?.token;
    }

    function renderQueueSidebar() {
        const pendientes = turnosMesa.filter((turno) => turno.estado === "pendiente");

        if (!pendientes.length) {
            mesaQueueList.innerHTML = "<div class=\"panel-empty\">No hay turnos pendientes.</div>";
            return;
        }

        mesaQueueList.innerHTML = pendientes.map((turno) => `
            <article class="queue-item">
                <div>
                    <strong>${escapeHtml(turno.codigo)}</strong>
                    <p>${escapeHtml(turno.programa)}</p>
                </div>
                <span class="queue-badge">${escapeHtml(turno.tipoAtencionLabel || turno.tipoAtencion)}</span>
            </article>
        `).join("");
    }

    function renderTable() {
        if (!turnosMesa.length) {
            mesaTurnosBody.innerHTML = "<tr><td colspan=\"5\" class=\"muted\">No hay turnos asignados a esta mesa.</td></tr>";
            return;
        }

        mesaTurnosBody.innerHTML = turnosMesa
            .map((turno) => {
                const estadoClass = turno.estado || "pendiente";
                return `
                    <tr>
                        <td>${escapeHtml(turno.codigo)}</td>
                        <td>${escapeHtml(turno.programa)}</td>
                        <td>${escapeHtml(turno.tipoAtencionLabel || turno.tipoAtencion)}</td>
                        <td><span class="badge ${escapeHtml(estadoClass)}">${escapeHtml(formatEstado(turno.estado))}</span></td>
                        <td>
                            <div class="mini-actions mini-actions-stacked">
                                <button class="mini-btn mini-btn-primary" data-id="${turno.id}" data-action="call">Atender</button>
                                <button class="mini-btn mini-btn-success" data-id="${turno.id}" data-action="finish">Finalizar</button>
                                <button class="mini-btn mini-btn-delete" data-id="${turno.id}" data-action="delete">Eliminar</button>
                            </div>
                        </td>
                    </tr>
                `;
            })
            .join("");

        bindRowActions();
    }

    function bindRowActions() {
        const buttons = mesaTurnosBody.querySelectorAll("button[data-id][data-action]");
        buttons.forEach((button) => {
            button.addEventListener("click", async () => {
                const id = button.getAttribute("data-id");
                const action = button.getAttribute("data-action");

                if (action === "call") {
                    await updateState(id, "en_atencion");
                    return;
                }

                if (action === "finish") {
                    await updateState(id, "finalizado");
                    return;
                }

                if (action === "delete") {
                    const codigo = button.closest("tr")?.querySelector("td:first-child")?.textContent || "turno";
                    await deleteTurn(id, codigo);
                }
            });
        });
    }

    async function callNextTurn() {
        const nextPending = turnosMesa.find((turno) => turno.estado === "pendiente");
        if (!nextPending) {
            showToast("No hay turnos pendientes en esta mesa.", true);
            return;
        }
        await updateState(nextPending.id, "en_atencion");
    }

    async function finishCurrentTurn() {
        const current = turnosMesa.find((turno) => turno.estado === "en_atencion");
        if (!current) {
            showToast("No hay un turno en atención.", true);
            return;
        }
        await updateState(current.id, "finalizado");
    }

    async function updateState(id, estado) {
        try {
            const response = await fetch(`${API_BASE}/turnos/${id}/estado`, {
                method: "PATCH",
                headers: authHeaders({
                    "Content-Type": "application/json"
                }),
                body: JSON.stringify({ estado })
            });

            const data = await response.json();
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    clearAuth();
                    renderLockedState();
                }
                throw new Error(data.error || "No se pudo actualizar el turno.");
            }

            await loadData();
            showToast("Turno actualizado correctamente.");
            setActionFeedback("Estado del turno actualizado.", "success");
        } catch (error) {
            showToast(error.message, true);
            setActionFeedback(error.message, "error");
        }
    }

    async function deleteTurn(id, codigo) {
        const confirmed = confirm(`¿Eliminar el turno ${codigo}? Esta acción no se puede deshacer.`);
        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/turnos/${id}`, {
                method: "DELETE",
                headers: authHeaders({
                    "Content-Type": "application/json"
                })
            });

            const data = await response.json();
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    clearAuth();
                    renderLockedState();
                }
                throw new Error(data.error || "No se pudo eliminar el turno.");
            }

            await loadData();
            showToast(`Turno ${codigo} eliminado.`);
            setActionFeedback(`Turno ${codigo} eliminado.`, "success");
        } catch (error) {
            showToast(error.message, true);
            setActionFeedback(error.message, "error");
        }
    }

    async function handleExport() {
        if (!auth?.token) {
            showToast("Debes iniciar sesión para exportar.", true);
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/export/turnos.xlsx?mesaId=${mesaId}`, {
                headers: authHeaders()
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || "No se pudo exportar.");
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `mesa-${mesaId}-turnos.xlsx`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
            setActionFeedback("Archivo exportado correctamente.", "success");
        } catch (error) {
            showToast(error.message, true);
            setActionFeedback(error.message, "error");
        }
    }

    function setActionFeedback(message, state = "") {
        if (!actionFeedback) {
            return;
        }

        actionFeedback.textContent = message;
        actionFeedback.classList.remove("is-success", "is-error");
        if (state === "success") {
            actionFeedback.classList.add("is-success");
        }
        if (state === "error") {
            actionFeedback.classList.add("is-error");
        }
    }

    function startAutoRefresh() {
        stopAutoRefresh();
        refreshHandle = setInterval(loadData, 15000);
    }

    function stopAutoRefresh() {
        if (!refreshHandle) {
            return;
        }
        clearInterval(refreshHandle);
        refreshHandle = null;
    }

    function authHeaders(base = {}) {
        if (!auth?.token) {
            return base;
        }

        return {
            ...base,
            Authorization: `Bearer ${auth.token}`
        };
    }

    function formatEstado(estado) {
        const labels = {
            pendiente: "En espera",
            en_atencion: "Atendiendo",
            finalizado: "Cerrado"
        };
        return labels[estado] || estado;
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

    function showToast(message, isError = false) {
        if (!toast) {
            return;
        }

        toast.textContent = message;
        toast.className = `toast ${isError ? "is-error" : "is-visible"}`;
        toast.classList.add("is-visible");

        clearTimeout(showToast.timer);
        showToast.timer = setTimeout(() => {
            toast.classList.remove("is-visible", "is-error");
        }, 2800);
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