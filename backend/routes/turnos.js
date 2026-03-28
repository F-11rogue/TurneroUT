const express = require("express");
const { requireMesaAuth } = require("../middleware/mesaAuth");
const {
    crearTurno,
    listarTurnos,
    actualizarEstadoTurno,
    estadoCola,
    eliminarTurno
} = require("../controllers/turnoController");

const router = express.Router();

router.get("/", listarTurnos);
router.get("/estado", estadoCola);
router.post("/", crearTurno);
router.patch("/:id/estado", requireMesaAuth, actualizarEstadoTurno);
router.delete("/:id", requireMesaAuth, eliminarTurno);

module.exports = router;
