const { all, get, run } = require("../models/database");
const { asignarMesa } = require("../utils/asignarMesa");
const { PROGRAMAS, TIPOS_ATENCION, ESTADOS_TURNO } = require("../config/catalogo");

const ATTENTION_DURATION = {
    prestamo_equipos: 5,
    default: 15
};

const ATTENTION_LABELS = {
    matricula: "Matrícula",
    notas: "Notas",
    certificados: "Certificados",
    prestamo_equipos: "Préstamo de equipos",
    otro: "Otro"
};

const ALLOWED_TIPOS = new Set(TIPOS_ATENCION.map((item) => item.id));
const ALLOWED_PROGRAMAS = new Set(PROGRAMAS);

function formatCode(number) {
    return `T-${String(number).padStart(3, "0")}`;
}

function getDuration(tipoAtencion) {
    return tipoAtencion === "prestamo_equipos"
        ? ATTENTION_DURATION.prestamo_equipos
        : ATTENTION_DURATION.default;
}

function serializeTurno(row) {
    return {
        id: row.id,
        codigo: row.codigo,
        nombre: row.nombre,
        programa: row.programa,
        tipoAtencion: row.tipo_atencion,
        tipoAtencionLabel: ATTENTION_LABELS[row.tipo_atencion] || row.tipo_atencion,
        detalleOtro: row.detalle_otro,
        duracionMin: row.duracion_min,
        estado: row.estado,
        mesaId: row.mesa_id,
        mesaNombre: row.mesa_nombre || null,
        horaCreacion: row.hora_creacion,
        horaEstimada: row.hora_estimada
    };
}

async function crearTurno(req, res, next) {
    try {
        const {
            nombre = "",
            programa = "",
            tipoAtencion = "",
            detalleOtro = ""
        } = req.body || {};

        if (!programa.trim()) {
            res.status(400).json({ error: "El programa academico es obligatorio." });
            return;
        }

        if (!ALLOWED_PROGRAMAS.has(programa.trim())) {
            res.status(400).json({ error: "Programa academico no valido." });
            return;
        }

        if (!tipoAtencion.trim()) {
            res.status(400).json({ error: "El tipo de atencion es obligatorio." });
            return;
        }

        if (!ALLOWED_TIPOS.has(tipoAtencion)) {
            res.status(400).json({ error: "Tipo de atencion no valido." });
            return;
        }

        if (nombre.trim().length > 80) {
            res.status(400).json({ error: "El nombre supera la longitud permitida." });
            return;
        }

        if (tipoAtencion === "otro" && !detalleOtro.trim()) {
            res.status(400).json({ error: "Debes describir el tipo de atencion cuando seleccionas 'Otro'." });
            return;
        }

        if (detalleOtro.trim().length > 120) {
            res.status(400).json({ error: "El detalle supera la longitud permitida." });
            return;
        }

        const duracion = getDuration(tipoAtencion);
        const now = new Date();

        const queueSummary = await get(
            "SELECT COALESCE(SUM(duracion_min), 0) AS total FROM turnos WHERE estado = 'pendiente'"
        );
        const pendingMinutes = Number(queueSummary?.total || 0);
        const horaEstimada = new Date(now.getTime() + (pendingMinutes + duracion) * 60 * 1000).toISOString();

        const mesas = await all("SELECT * FROM mesas WHERE activa = 1 ORDER BY id ASC");
        const mesa = asignarMesa(mesas, programa, tipoAtencion);
        const mesaId = mesa ? mesa.id : null;

        const insertResult = await run(
            `
			INSERT INTO turnos (
				codigo,
				nombre,
				programa,
				tipo_atencion,
				detalle_otro,
				duracion_min,
				estado,
				mesa_id,
				hora_creacion,
				hora_estimada
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`,
            [
                "PENDIENTE",
                nombre.trim() || null,
                programa.trim(),
                tipoAtencion,
                detalleOtro.trim() || null,
                duracion,
                "pendiente",
                mesaId,
                now.toISOString(),
                horaEstimada
            ]
        );

        const codigo = formatCode(insertResult.lastID);
        await run("UPDATE turnos SET codigo = ? WHERE id = ?", [codigo, insertResult.lastID]);

        const created = await get(
            `
			SELECT t.*, m.nombre AS mesa_nombre
			FROM turnos t
			LEFT JOIN mesas m ON m.id = t.mesa_id
			WHERE t.id = ?
			`,
            [insertResult.lastID]
        );

        res.status(201).json({ turno: serializeTurno(created) });
    } catch (error) {
        next(error);
    }
}

async function listarTurnos(req, res, next) {
    try {
        const { estado, mesaId } = req.query;
        const params = [];
        const filters = [];

        if (estado) {
            filters.push("t.estado = ?");
            params.push(estado);
        }

        if (mesaId) {
            filters.push("t.mesa_id = ?");
            params.push(mesaId);
        }

        const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

        const rows = await all(
            `
			SELECT t.*, m.nombre AS mesa_nombre
			FROM turnos t
			LEFT JOIN mesas m ON m.id = t.mesa_id
			${where}
			ORDER BY t.id DESC
			`,
            params
        );

        res.json({ turnos: rows.map(serializeTurno) });
    } catch (error) {
        next(error);
    }
}

async function actualizarEstadoTurno(req, res, next) {
    try {
        const { id } = req.params;
        const { estado } = req.body || {};
        const estadosPermitidos = new Set(ESTADOS_TURNO);

        if (!estadosPermitidos.has(estado)) {
            res.status(400).json({ error: "Estado invalido." });
            return;
        }

        const existing = await get("SELECT id, mesa_id FROM turnos WHERE id = ?", [id]);
        if (!existing) {
            res.status(404).json({ error: "Turno no encontrado." });
            return;
        }

        if (Number(existing.mesa_id) !== Number(req.mesaSession?.mesaId)) {
            res.status(403).json({ error: "Solo puedes gestionar turnos de tu mesa." });
            return;
        }

        const updateResult = await run("UPDATE turnos SET estado = ? WHERE id = ?", [estado, id]);
        if (updateResult.changes === 0) {
            res.status(404).json({ error: "Turno no encontrado." });
            return;
        }

        const row = await get(
            `
			SELECT t.*, m.nombre AS mesa_nombre
			FROM turnos t
			LEFT JOIN mesas m ON m.id = t.mesa_id
			WHERE t.id = ?
			`,
            [id]
        );

        res.json({ turno: serializeTurno(row) });
    } catch (error) {
        next(error);
    }
}

async function estadoCola(req, res, next) {
    try {
        const summary = await get(
            `
			SELECT
				COUNT(*) AS total,
				COALESCE(SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END), 0) AS pendientes,
				COALESCE(SUM(CASE WHEN estado = 'pendiente' THEN duracion_min ELSE 0 END), 0) AS minutosPendientes
			FROM turnos
			`
        );

        res.json({
            cola: {
                total: Number(summary.total || 0),
                pendientes: Number(summary.pendientes || 0),
                minutosPendientes: Number(summary.minutosPendientes || 0)
            }
        });
    } catch (error) {
        next(error);
    }
}

async function eliminarTurno(req, res, next) {
    try {
        const { id } = req.params;

        if (!id) {
            res.status(400).json({ error: "ID del turno requerido." });
            return;
        }

        const existing = await get("SELECT id, mesa_id FROM turnos WHERE id = ?", [id]);
        if (!existing) {
            res.status(404).json({ error: "Turno no encontrado." });
            return;
        }

        if (Number(existing.mesa_id) !== Number(req.mesaSession?.mesaId)) {
            res.status(403).json({ error: "Solo puedes eliminar turnos de tu mesa." });
            return;
        }

        const deleteResult = await run("DELETE FROM turnos WHERE id = ?", [id]);

        if (deleteResult.changes === 0) {
            res.status(404).json({ error: "Turno no encontrado." });
            return;
        }

        res.json({
            success: true,
            message: "Turno eliminado correctamente.",
            deletedId: Number(id)
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    crearTurno,
    listarTurnos,
    actualizarEstadoTurno,
    estadoCola,
    eliminarTurno
};
