function normalize(value = "") {
    return String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}

function parseJsonSafe(value, fallback = []) {
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : fallback;
    } catch (error) {
        return fallback;
    }
}

function scoreMesa(mesa, programa, tipoAtencion) {
    const mesaProgramas = parseJsonSafe(mesa.programas_json).map(normalize);
    const mesaTipos = parseJsonSafe(mesa.tipos_json).map(normalize);

    const normalizedPrograma = normalize(programa);
    const normalizedTipo = normalize(tipoAtencion);

    const programaMatch = mesaProgramas.includes(normalizedPrograma) ? 2 : 0;
    const tipoMatch = mesaTipos.includes(normalizedTipo) ? 2 : 0;

    // Permite comodines para atender cualquier programa/tipo sin bloquear la asignacion.
    const wildcardPrograma = mesaProgramas.includes("*") ? 1 : 0;
    const wildcardTipo = mesaTipos.includes("*") ? 1 : 0;

    return programaMatch + tipoMatch + wildcardPrograma + wildcardTipo;
}

function asignarMesa(mesas = [], programa, tipoAtencion) {
    if (!Array.isArray(mesas) || mesas.length === 0) {
        return null;
    }

    const activeMesas = mesas.filter((mesa) => Number(mesa.activa) === 1);
    if (activeMesas.length === 0) {
        return null;
    }

    const ranked = activeMesas
        .map((mesa) => ({ mesa, score: scoreMesa(mesa, programa, tipoAtencion) }))
        .sort((a, b) => b.score - a.score || a.mesa.id - b.mesa.id);

    return ranked[0].mesa || null;
}

module.exports = {
    asignarMesa,
    normalize
};
