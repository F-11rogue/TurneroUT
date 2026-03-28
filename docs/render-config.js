(function () {
    "use strict";

    if (window.TURNERO_API_BASE) {
        return;
    }

    const saved = localStorage.getItem("TURNERO_API_BASE");
    if (saved) {
        window.TURNERO_API_BASE = saved;
        return;
    }

    // Default API host for GitHub Pages + Render deployment.
    // If your Render URL is different, replace this value.
    if (window.location.hostname.endsWith("github.io")) {
        window.TURNERO_API_BASE = "https://turnero-ut-api.onrender.com";
    }
})();