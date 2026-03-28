const { all, get } = require("../models/database");
const {
    isValidMesaPin,
    createMesaSession,
    revokeMesaSession
} = require("../middleware/mesaAuth");

function parseJsonSafe(value, fallback = []) {
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : fallback;
    } catch (error) {
        return fallback;
    }
}

async function listarMesas(req, res, next) {
    try {
        const mesas = await all("SELECT * FROM mesas ORDER BY id ASC");

        const data = mesas.map((mesa) => ({
            id: mesa.id,
            nombre: mesa.nombre,
            programas: parseJsonSafe(mesa.programas_json),
            tiposAtencion: parseJsonSafe(mesa.tipos_json),
            activa: Number(mesa.activa) === 1
        }));

        res.json({ mesas: data });
    } catch (error) {
        next(error);
    }
}

async function autenticarMesa(req, res, next) {
    try {
        const { pin = "", mesaId } = req.body || {};

        if (!isValidMesaPin(pin)) {
            res.status(401).json({ error: "PIN inválido." });
            return;
        }

        if (!mesaId) {
            res.status(400).json({ error: "Debes seleccionar una mesa." });
            return;
        }

        const mesa = await get("SELECT id, nombre FROM mesas WHERE id = ?", [mesaId]);
        if (!mesa) {
            res.status(404).json({ error: "Mesa no encontrada." });
            return;
        }

        const session = createMesaSession({ mesaId: mesa.id, mesaNombre: mesa.nombre });

        res.json({
            auth: {
                token: session.token,
                expiresAt: new Date(session.expiresAt).toISOString(),
                mesa: {
                    id: mesa.id,
                    nombre: mesa.nombre
                }
            }
        });
    } catch (error) {
        next(error);
    }
}

function cerrarSesionMesa(req, res) {
    const token = req.mesaSession?.token;
    revokeMesaSession(token);
    res.json({ ok: true, message: "Sesión cerrada." });
}

module.exports = {
    listarMesas,
    autenticarMesa,
    cerrarSesionMesa
};
