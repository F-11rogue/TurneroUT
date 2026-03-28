# Turnero UT

Sistema web de turnos administrativos para universidad, sin autenticacion y con flujo simple de 3 pasos.

## Stack

- Frontend: HTML + CSS + JavaScript puro
- Backend: Node.js + Express
- Base de datos: SQLite
- Exportacion: Excel con exceljs

## Sprint 2 (profesionalizacion)

- Catalogo centralizado de programas y tipos de atencion (`/api/catalogo`).
- Validaciones de entrada reforzadas en backend (programa/tipo/longitudes).
- Indicadores de cola en tiempo real en pantalla publica.
- Panel administrativo operativo en `frontend/admin.html`.
- Actualizacion de estado de turnos desde backoffice.

## Estructura

```
turnero-ut/
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── backend/
│   ├── server.js
│   ├── routes/
│   │   ├── turnos.js
│   │   ├── mesas.js
│   │   └── export.js
│   ├── controllers/
│   │   ├── turnoController.js
│   │   └── mesaController.js
│   ├── models/
│   │   └── database.js
│   ├── utils/
│   │   ├── asignarMesa.js
│   │   └── excelExport.js
│   └── data/
│       └── asignaciones.json
├── database/
│   └── turnero.db
├── package.json
├── .env
├── .gitignore
└── README.md
```

## Requisitos

- Node.js 18+

## Instalacion

```bash
npm install
```

## Ejecucion

```bash
npm run dev
```

o

```bash
npm start
```

Abre `http://localhost:3000`.

## Endpoints principales

- `GET /api/health`
- `GET /api/catalogo`
- `POST /api/turnos`
- `GET /api/turnos`
- `PATCH /api/turnos/:id/estado`
- `GET /api/turnos/estado`
- `GET /api/mesas`
- `GET /api/export/turnos.xlsx`

## Despliegue en Render (backend)

Este repositorio ya incluye `render.yaml` para crear el servicio web.

1. En Render, selecciona **New +** -> **Blueprint**.
2. Conecta el repositorio `F-11rogue/TurneroUT`.
3. Render detectara el archivo `render.yaml` y creara el servicio `turnero-ut-api`.
4. Espera a que termine el primer deploy y copia la URL publica del backend.

Variables importantes en Render:

- `NODE_ENV=production`
- `CORS_ORIGINS=https://f-11rogue.github.io,http://localhost:3000,http://127.0.0.1:3000`

Prueba de salud del backend desplegado:

- `https://TU-SERVICIO.onrender.com/api/health`

## GitHub Pages + backend Render

El frontend de Pages vive en `/docs`.

- URL esperada: `https://f-11rogue.github.io/TurneroUT/`
- Configuracion de API cliente: `docs/render-config.js`

Si la URL de Render cambia, actualiza `window.TURNERO_API_BASE` en `docs/render-config.js` y vuelve a hacer push.

## Datos de entrada para crear turno

```json
{
	"nombre": "Ana Perez",
	"programa": "Ingeniería de Sistemas",
	"tipoAtencion": "matricula",
	"detalleOtro": ""
}
```

Notas:
- `nombre` es opcional.
- Si `tipoAtencion` es `otro`, `detalleOtro` es obligatorio.

## Escalabilidad prevista

- Logica de negocio separada en controllers y utils.
- Modelo SQLite desacoplado para migrar a otro motor.
- Manejo de estados de cola para futuro panel administrativo.
- Exportacion de reportes en Excel lista para backoffice.
