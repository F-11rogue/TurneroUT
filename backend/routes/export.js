const express = require("express");
const { all } = require("../models/database");
const { buildTurnosWorkbook } = require("../utils/excelExport");
const { requireMesaAuth } = require("../middleware/mesaAuth");

const router = express.Router();

router.get("/turnos.xlsx", requireMesaAuth, async (req, res, next) => {
    try {
        const { mesaId } = req.query;
        const params = [];
        let where = "";

        if (mesaId) {
            where = "WHERE t.mesa_id = ?";
            params.push(mesaId);
        }

        const rows = await all(
            `
			SELECT t.*, m.nombre AS mesa_nombre
			FROM turnos t
			LEFT JOIN mesas m ON m.id = t.mesa_id
			${where}
			ORDER BY t.id DESC
			`
			,
			params
        );

        const buffer = await buildTurnosWorkbook(rows);

        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", "attachment; filename=turnos.xlsx");
        res.send(Buffer.from(buffer));
    } catch (error) {
        next(error);
    }
});

module.exports = router;
