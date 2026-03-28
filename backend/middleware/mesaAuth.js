const crypto = require("crypto");

const PIN_MESA = process.env.MESA_PIN || "ut2024";
const PIN_MESA_FALLBACK = process.env.MESA_PIN_FALLBACK || "2024";
const SESSION_TTL_MS = Number(process.env.MESA_SESSION_TTL_MS || 8 * 60 * 60 * 1000);
const sessions = new Map();

function cleanupExpiredSessions() {
    const now = Date.now();
    for (const [token, session] of sessions.entries()) {
        if (session.expiresAt <= now) {
            sessions.delete(token);
        }
    }
}

function createMesaSession({ mesaId, mesaNombre }) {
    cleanupExpiredSessions();

    const token = crypto.randomUUID();
    const expiresAt = Date.now() + SESSION_TTL_MS;

    sessions.set(token, {
        token,
        mesaId,
        mesaNombre,
        createdAt: Date.now(),
        expiresAt
    });

    return {
        token,
        expiresAt
    };
}

function getMesaSession(token) {
    if (!token) {
        return null;
    }

    cleanupExpiredSessions();
    const session = sessions.get(token);

    if (!session) {
        return null;
    }

    if (session.expiresAt <= Date.now()) {
        sessions.delete(token);
        return null;
    }

    return session;
}

function revokeMesaSession(token) {
    if (!token) {
        return;
    }

    sessions.delete(token);
}

function extractBearerToken(authorizationHeader = "") {
    if (!authorizationHeader || typeof authorizationHeader !== "string") {
        return "";
    }

    const [scheme, token] = authorizationHeader.split(" ");
    if ((scheme || "").toLowerCase() !== "bearer") {
        return "";
    }

    return token || "";
}

function isValidMesaPin(pin) {
    return Boolean(pin) && (pin === PIN_MESA || pin === PIN_MESA_FALLBACK);
}

function requireMesaAuth(req, res, next) {
    const token = extractBearerToken(req.headers.authorization);
    const session = getMesaSession(token);

    if (!session) {
        res.status(401).json({ error: "Acceso restringido. Debes iniciar sesión con PIN de mesa." });
        return;
    }

    req.mesaSession = session;
    next();
}

module.exports = {
    PIN_MESA,
    PIN_MESA_FALLBACK,
    isValidMesaPin,
    createMesaSession,
    getMesaSession,
    revokeMesaSession,
    requireMesaAuth
};
