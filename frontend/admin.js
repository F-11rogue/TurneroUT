(() => {
    "use strict";

    const API_BASE = "/api";
    const THEME_STORAGE_KEY = "ut_theme";
    const AUTH_STORAGE_KEY = "ut_mesa_auth";

    const themeToggle = document.getElementById("themeToggle");
    const loginForm = document.getElementById("funcionarioLoginForm");
    const mesaIdInput = document.getElementById("mesaId");
    const mesaPinInput = document.getElementById("mesaPin");
    const loginError = document.getElementById("loginError");
    const btnLoginFuncionario = document.getElementById("btnLoginFuncionario");

    applyStoredTheme();
    themeToggle?.addEventListener("click", toggleTheme);
    loginForm?.addEventListener("submit", handleLogin);

    async function handleLogin(event) {
        event.preventDefault();
        clearError();

        const mesaId = Number(mesaIdInput.value || 0);
        const pinDigits = mesaPinInput.value.trim();

        if (!mesaId) {
            showError("Selecciona la mesa para continuar.");
            return;
        }

        if (!/^\d{4}$/.test(pinDigits)) {
            showError("El PIN debe tener exactamente 4 dígitos.");
            return;
        }

        try {
            btnLoginFuncionario.disabled = true;
            btnLoginFuncionario.textContent = "Validando...";

            const response = await fetch(`${API_BASE}/mesas/auth`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ mesaId, pin: pinDigits })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "No se pudo iniciar sesión.");
            }

            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.auth));
            window.location.href = `./mesa-${mesaId}.html`;
        } catch (error) {
            showError(error.message || "No se pudo iniciar sesión.");
        } finally {
            btnLoginFuncionario.disabled = false;
            btnLoginFuncionario.textContent = "Ingresar al dashboard";
        }
    }

    function showError(message) {
        loginError.textContent = message;
        loginError.classList.add("is-visible");
    }

    function clearError() {
        loginError.textContent = "";
        loginError.classList.remove("is-visible");
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
})();