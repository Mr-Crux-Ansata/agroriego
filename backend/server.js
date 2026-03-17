const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { getPool } = require('./db'); // Importamos la conexión que arreglamos

const app = express();

app.use(cors());
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

app.listen(PORT, async () => {
    console.log(`✅ Servidor corriendo en el puerto:${PORT}`);
    
    try {
        // Forzamos la conexión a SQL Server al arrancar
        await getPool();
    } catch (error) {
        console.error('❌ La base de datos no respondió al arrancar el servidor.');
    }
});