const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const DB_DIR = path.resolve(__dirname, "../../database");
const DB_PATH = path.resolve(DB_DIR, "turnero.db");

if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH);

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function onRun(error) {
            if (error) {
                reject(error);
                return;
            }
            resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (error, row) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(row);
        });
    });
}

function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (error, rows) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(rows);
        });
    });
}

async function initDatabase() {
    await run(`
		CREATE TABLE IF NOT EXISTS mesas (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			nombre TEXT NOT NULL UNIQUE,
			programas_json TEXT NOT NULL,
			tipos_json TEXT NOT NULL,
			activa INTEGER NOT NULL DEFAULT 1,
			created_at TEXT NOT NULL DEFAULT (datetime('now'))
		)
	`);

    await run(`
		CREATE TABLE IF NOT EXISTS turnos (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			codigo TEXT NOT NULL UNIQUE,
			nombre TEXT,
			programa TEXT NOT NULL,
			tipo_atencion TEXT NOT NULL,
			detalle_otro TEXT,
			duracion_min INTEGER NOT NULL,
			estado TEXT NOT NULL DEFAULT 'pendiente',
			mesa_id INTEGER,
			hora_creacion TEXT NOT NULL,
			hora_estimada TEXT NOT NULL,
			FOREIGN KEY(mesa_id) REFERENCES mesas(id)
		)
	`);
}

async function seedMesas(asignaciones = []) {
    for (const item of asignaciones) {
        const existing = await get("SELECT id FROM mesas WHERE nombre = ?", [item.nombre]);

        if (existing) {
            await run(
                `
				UPDATE mesas
				SET programas_json = ?, tipos_json = ?, activa = ?
				WHERE id = ?
				`,
                [
                    JSON.stringify(item.programas || []),
                    JSON.stringify(item.tiposAtencion || []),
                    item.activa === false ? 0 : 1,
                    existing.id
                ]
            );
            continue;
        }

        await run(
            `
			INSERT INTO mesas (nombre, programas_json, tipos_json, activa)
			VALUES (?, ?, ?, ?)
			`,
            [
                item.nombre,
                JSON.stringify(item.programas || []),
                JSON.stringify(item.tiposAtencion || []),
                item.activa === false ? 0 : 1
            ]
        );
    }
}

module.exports = {
    db,
    run,
    get,
    all,
    initDatabase,
    seedMesas
};
