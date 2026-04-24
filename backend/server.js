const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { getPool } = require('./db');

const app = express();

app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'], // React (3000) y Vite (5173)
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// LOGGING MIDDLEWARE
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});
app.use(express.urlencoded({ extended: true }));
app.use(express.text({ type: 'text/*' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// TEST
app.get('/test', (req, res) => {
    res.send('Backend funcionando');
});

app.get('/tes', (req, res) => {
    res.send('Backend funcionando (ruta alias /tes)');
});

// RUTAS (UNA SOLA VEZ)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/predios', require('./routes/predios'));
app.use('/api/areas', require('./routes/areas'));
app.use('/api/alertas', require('./routes/alertas'));
app.use('/api/reportes', require('./routes/reportes'));

// ERROR DE PARSEO JSON / BODY
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        console.error('❌ JSON malformado recibido:', err.message);
        return res.status(400).json({ error: 'JSON malformado en el cuerpo de la petición' });
    }
    next(err);
});

// PUERTO
const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en el puerto: ${PORT}`);
    console.log('⚡ Servidor listo para recibir peticiones');
});

server.on('error', (error) => {
    console.error('❌ Error en el servidor:', error.message);
    process.exit(1);
});

(async () => {
    try {
        await getPool();
        console.log('✅ DB conectada');
    } catch (error) {
        console.error('❌ Error DB:', error.message);
        console.log('⚠️ El servidor sigue escuchando aunque la conexión a la DB falló.');
    }
})();