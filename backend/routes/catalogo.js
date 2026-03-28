const express = require("express");
const { PROGRAMAS, TIPOS_ATENCION, ESTADOS_TURNO } = require("../config/catalogo");

const router = express.Router();

router.get("/", (_req, res) => {
    res.json({
        catalogo: {
            programas: PROGRAMAS,
            tiposAtencion: TIPOS_ATENCION,
            estadosTurno: ESTADOS_TURNO
        }
    });
});

module.exports = router;
