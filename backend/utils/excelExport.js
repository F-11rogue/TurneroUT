const ExcelJS = require("exceljs");

async function buildTurnosWorkbook(turnos) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Turnos");

    sheet.columns = [
        { header: "Codigo", key: "codigo", width: 12 },
        { header: "Nombre", key: "nombre", width: 26 },
        { header: "Programa", key: "programa", width: 30 },
        { header: "Tipo de atencion", key: "tipo", width: 24 },
        { header: "Detalle", key: "detalle", width: 30 },
        { header: "Duracion (min)", key: "duracion", width: 14 },
        { header: "Estado", key: "estado", width: 14 },
        { header: "Mesa", key: "mesa", width: 20 },
        { header: "Hora creacion", key: "creacion", width: 22 },
        { header: "Hora estimada", key: "estimada", width: 22 }
    ];

    turnos.forEach((turno) => {
        sheet.addRow({
            codigo: turno.codigo,
            nombre: turno.nombre || "No informado",
            programa: turno.programa,
            tipo: turno.tipo_atencion,
            detalle: turno.detalle_otro || "No aplica",
            duracion: turno.duracion_min,
            estado: turno.estado,
            mesa: turno.mesa_nombre || "Sin asignar",
            creacion: turno.hora_creacion,
            estimada: turno.hora_estimada
        });
    });

    sheet.getRow(1).font = { bold: true };
    sheet.autoFilter = {
        from: "A1",
        to: "J1"
    };

    return workbook.xlsx.writeBuffer();
}

module.exports = {
    buildTurnosWorkbook
};
