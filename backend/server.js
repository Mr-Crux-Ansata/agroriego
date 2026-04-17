const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { getPool } = require('./db');

const app = express();

app.use(cors({
    origin: 'http://localhost:3000', // o el puerto de tu frontend
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// TEST
app.get('/test', (req, res) => {
    res.send('Backend funcionando');
});

// RUTAS (UNA SOLA VEZ)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/predios', require('./routes/predios'));
app.use('/api/areas', require('./routes/areas'));
app.use('/api/alertas', require('./routes/alertas'));

// PUERTO
const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
    console.log(`✅ Servidor corriendo en el puerto: ${PORT}`);

    try {
        await getPool();
        console.log('✅ DB conectada');
    } catch (error) {
        console.error('❌ Error DB:', error.message);
    }
});