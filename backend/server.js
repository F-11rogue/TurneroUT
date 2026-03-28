require("dotenv").config();

const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");

const turnosRoutes = require("./routes/turnos");
const mesasRoutes = require("./routes/mesas");
const exportRoutes = require("./routes/export");
const catalogoRoutes = require("./routes/catalogo");
const { initDatabase, seedMesas } = require("./models/database");

const app = express();

const PORT = Number(process.env.PORT || 3000);
const FRONTEND_DIR = path.resolve(__dirname, "../frontend");
const ASIGNACIONES_PATH = path.resolve(__dirname, "./data/asignaciones.json");

const defaultAllowedOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://f-11rogue.github.io"
];

const envAllowedOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...envAllowedOrigins])];

const corsOptions = {
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error(`Origen no permitido por CORS: ${origin}`));
    },
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false
};

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors(corsOptions));
app.use(express.static(FRONTEND_DIR));

app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "turnero-ut" });
});

app.use("/api/turnos", turnosRoutes);
app.use("/api/mesas", mesasRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/catalogo", catalogoRoutes);

app.use((error, _req, res, _next) => {
    console.error("[turnero-api-error]", error);
    res.status(500).json({ error: "Error interno del servidor." });
});

async function bootstrap() {
    await initDatabase();

    const asignacionesRaw = fs.readFileSync(ASIGNACIONES_PATH, "utf8");
    const asignaciones = JSON.parse(asignacionesRaw);
    await seedMesas(asignaciones);

    startServer(PORT);
}

function startServer(initialPort) {
    const server = app.listen(initialPort, () => {
        console.log(`Turnero UT activo en http://localhost:${initialPort}`);
    });

    server.on("error", (error) => {
        if (error.code === "EADDRINUSE") {
            const nextPort = initialPort + 1;
            console.warn(`Puerto ${initialPort} en uso, intentando con ${nextPort}...`);
            startServer(nextPort);
            return;
        }

        console.error("Error al iniciar el servidor:", error);
        process.exit(1);
    });
}

bootstrap().catch((error) => {
    console.error("No se pudo iniciar el servidor:", error);
    process.exit(1);
});
