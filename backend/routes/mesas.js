const express = require("express");
const {
    listarMesas,
    autenticarMesa,
    cerrarSesionMesa
} = require("../controllers/mesaController");
const { requireMesaAuth } = require("../middleware/mesaAuth");

const router = express.Router();

router.get("/", listarMesas);
router.post("/auth", autenticarMesa);
router.post("/logout", requireMesaAuth, cerrarSesionMesa);

module.exports = router;
