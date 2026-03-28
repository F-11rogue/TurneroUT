const PROGRAMAS = [
    "Ingeniería de Sistemas",
    "Administración de Empresas",
    "Contaduría Pública",
    "Derecho",
    "Licenciatura en Matemáticas",
    "Psicología"
];

const TIPOS_ATENCION = [
    { id: "matricula", label: "Matrícula" },
    { id: "notas", label: "Notas" },
    { id: "certificados", label: "Certificados" },
    { id: "prestamo_equipos", label: "Préstamo de equipos" },
    { id: "otro", label: "Otro" }
];

const ESTADOS_TURNO = ["pendiente", "en_atencion", "finalizado"];

module.exports = {
    PROGRAMAS,
    TIPOS_ATENCION,
    ESTADOS_TURNO
};
