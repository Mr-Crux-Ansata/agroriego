const express = require('express');
const cors = require('cors');
require('dotenv').config({ override: true });
const { getPool } = require('./db'); // Importamos la conexión que arreglamos

const app = express();

<<<<<<< Updated upstream
app.use(cors());
=======
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173')
    .split(',').map(o => o.trim());

app.use(cors({
    origin: (origin, callback) => {
        // Permitir peticiones sin origin (curl, Postman, sensores IoT)
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`CORS bloqueado: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
>>>>>>> Stashed changes
app.use(express.json());

// Ruta de prueba rápida
app.get('/test', (req, res) => {
    res.send('¡El backend está vivo y el puerto funciona!');
});

// Descomentamos las rutas para que la API funcione
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/predios',    require('./routes/predios'));
app.use('/api/areas',      require('./routes/areas'));
app.use('/api/alertas',    require('./routes/alertas'));
app.use('/api/usuarios',   require('./routes/usuarios'));
app.use('/api/telemetria', require('./routes/telemetria'));

// Encendemos el servidor e intentamos conectar a SQL de inmediato
const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, async () => {
    console.log(`✅ Servidor corriendo en el puerto:${PORT}`);
    
    try {
        // Forzamos la conexión a SQL Server al arrancar
        await getPool();
    } catch (error) {
        console.error('❌ La base de datos no respondió al arrancar el servidor.');
    }
});

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ El puerto ${PORT} ya está en uso. Cierra el proceso que lo ocupa e intenta de nuevo.`);
        return;
    }

    console.error('❌ Error al iniciar el servidor:', error.message);
});