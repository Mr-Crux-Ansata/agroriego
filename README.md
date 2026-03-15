# 🌱 AgroRiego IoT — Sistema de Riego Automatizado

Sistema web para monitoreo y gestión de riego agrícola con sensores IoT.  
**Tecnológico de Monterrey, Campus Chihuahua** — Construcción de software y toma de decisiones, Grupo 400

**Equipo:** Andrés Alcocer · Paola Cruz · Mirka Gutiérrez · Regina Lechuga

---

## 📋 Requisitos previos

Antes de empezar, asegúrate de tener instalado:

- [Node.js](https://nodejs.org/) v18 o superior.
- [Git](https://git-scm.com/)
- SQL Server (ver opciones según tu sistema operativo abajo)

---

## 🗄️ Configuración de SQL Server

Elige la opción según tu sistema operativo:

### Windows
No necesitas Docker. Descarga SQL Server gratis:

1. Descarga [SQL Server Express](https://www.microsoft.com/es-mx/sql-server/sql-server-downloads) (versión gratuita)
2. Instálalo con las opciones por defecto
3. Descarga también [SQL Server Management Studio (SSMS)](https://learn.microsoft.com/es-es/sql/ssms/download-sql-server-management-studio-ssms) para administrarlo visualmente
4. En tu `.env`, usa:
   ```
   DB_SERVER=localhost\SQLEXPRESS
   ```

### Mac
Requiere Docker:

1. Descarga e instala [Docker Desktop para Mac](https://www.docker.com/products/docker-desktop/)
2. Abre Docker Desktop y espera a que esté corriendo
3. En tu terminal, levanta el contenedor de SQL Server:
   ```bash
   docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=dockerStrongPwd123" \
     -p 1433:1433 --name sqlserver2025 \
     -d mcr.microsoft.com/mssql/server:2025-latest
   ```
4. En tu `.env`, usa:
   ```
   DB_SERVER=localhost
   ```

### Linux
Dos opciones:

**Opción A — Docker (recomendado):**
```bash
docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=dockerStrongPwd123" \
  -p 1433:1433 --name sqlserver2025 \
  -d mcr.microsoft.com/mssql/server:2025-latest
```

**Opción B — Instalación nativa (Ubuntu/Debian):**
```bash
curl https://packages.microsoft.com/keys/microsoft.asc | sudo apt-key add -
curl https://packages.microsoft.com/config/ubuntu/20.04/mssql-server-2022.list \
  | sudo tee /etc/apt/sources.list.d/mssql-server.list
sudo apt-get update
sudo apt-get install -y mssql-server
sudo /opt/mssql/bin/mssql-conf setup
```

---

## 🚀 Instalación paso a paso

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/SistemaRiegoRETO.git
cd SistemaRiegoRETO
```

### 2. Configurar variables de entorno

```bash
cp backend/.env.example backend/.env
```

Abre el archivo `backend/.env` y edítalo con tus datos:

```env
DB_SERVER=localhost          # En Windows: localhost\SQLEXPRESS
DB_DATABASE=SistemaRiegoIoT
DB_USER=sa
DB_PASSWORD=dockerStrongPwd123   # La contraseña que pusiste al instalar SQL Server
DB_PORT=1433
JWT_SECRET=agroriego_jwt_secret_2024
PORT=3001
```

### 3. Crear la base de datos

Conéctate a tu SQL Server y ejecuta el DDL. Tienes dos formas:

**Con SSMS (Windows):** abre SSMS, conéctate a tu servidor y ejecuta el archivo `database/schema.sql`.

**Con sqlcmd (Mac/Linux):**
```bash
# Primero instala sqlcmd si no lo tienes
# Mac:
brew install sqlcmd

# Luego ejecuta el DDL:
sqlcmd -S localhost -U sa -P TU_PASSWORD -i database/schema.sql
```

> El archivo `database/schema.sql` ya está en el repositorio. Al ejecutarlo se crean todas las tablas y se insertan datos de prueba automáticamente.

### 4. Instalar dependencias del backend

```bash
cd backend
npm install
```

### 5. Instalar dependencias del frontend

```bash
cd ..
npm install
```

---

## ▶️ Correr el sistema

Necesitas **dos terminales abiertas al mismo tiempo**.

### Terminal 1 — Backend

```bash
cd backend
npm run dev
```

Deberías ver:
```
Servidor corriendo en puerto 3001
Conectado a SQL Server ✓
```

### Terminal 2 — Frontend

```bash
npm run dev
```

Deberías ver:
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

Abre tu navegador en **http://localhost:5173**

---

## 👤 Usuarios de prueba

| Rol | Correo | Contraseña |
|-----|--------|-----------|
| Administrador Sistema | admin@agroriego.mx | admin123 |
| Administrador Predio | predio@agroriego.mx | predio123 |
| Operador Campo | operador@agroriego.mx | op123 |

---

## 📁 Estructura del proyecto

```
SistemaRiegoRETO/
├── backend/
│   ├── server.js          # Servidor Express principal
│   ├── db.js              # Conexión a SQL Server
│   ├── .env               # Variables de entorno (NO subir a git)
│   ├── .env.example       # Plantilla de variables (sí subir a git)
│   ├── middleware/
│   │   └── auth.js        # Verificación de JWT
│   └── routes/
│       ├── auth.js        # Login
│       ├── predios.js
│       ├── areas.js
│       ├── alertas.js
│       ├── usuarios.js
│       └── telemetria.js
├── src/
│   ├── api.js             # Funciones de conexión con el backend
│   ├── App.tsx            # Enrutamiento principal
│   └── components/
│       ├── LoginScreen.tsx
│       ├── Sidebar.tsx
│       ├── Dashboard.tsx
│       ├── PrediosScreen.tsx
│       ├── AreasScreen.tsx
│       ├── AlertasScreen.tsx
│       ├── ReportesScreen.tsx
│       ├── AreaDetailScreen.tsx
│       ├── AreaConfigScreen.tsx
│       └── UsuariosScreen.tsx
├── database/
│   └── schema.sql         # DDL completo de la base de datos
└── README.md
```

---

## 🌿 Flujo de trabajo con Git (branches)

Nunca trabajen directamente en `main`. Cada quien trabaja en su propio branch:

```bash
# Crear tu branch
git checkout -b feature/nombre-de-tu-cambio

# Hacer commits
git add .
git commit -m "descripción de lo que hiciste"

# Subir tu branch
git push origin feature/nombre-de-tu-cambio
```

Cuando terminen un cambio, abren un **Pull Request** en GitHub para que el equipo lo revise antes de mergearlo a `main`.

---

## ❓ Problemas comunes

**El backend no conecta a la base de datos:**
- Verifica que SQL Server esté corriendo (Docker Desktop en Mac/Linux)
- Confirma que la contraseña en `.env` sea la misma que usaste al crear el contenedor
- En Windows, verifica que el servicio de SQL Server esté iniciado en el Administrador de tareas

**Error de CORS:**
- Asegúrate de que el frontend esté corriendo en el puerto correcto (`5173` o `3000`)
- El backend tiene CORS configurado para ambos puertos

**El comando `npm run dev` no funciona:**
- Verifica que estás en la carpeta correcta
- Corre `npm install` primero si acabas de clonar

---

## 📡 Módulo IoT (simulación)

Para simular el envío de datos de sensores, el endpoint de telemetría no requiere autenticación:

```bash
curl -X POST http://localhost:3001/api/telemetria \
  -H "Content-Type: application/json" \
  -d '{
    "id_area": 1,
    "humedad": 45.2,
    "temperatura": 24.5,
    "flujo_agua": 12.3
  }'
```

Los datos se insertan en la base de datos y el sistema genera alertas automáticas si los valores están fuera de los umbrales configurados.