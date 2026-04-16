const router = require('express').Router();
const { getPool, sql } = require('../db');
const { verificarToken } = require('../middleware/auth');

console.log('verificarToken:', verificarToken);
console.log('tipo:', typeof verificarToken); 

router.get('/', verificarToken, async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .query('SELECT * FROM Predio');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', verificarToken, async (req, res) => {
    const { nombre, latitud, longitud, id_usuario } = req.body;
    try {
        const pool = await getPool();
        await pool.request()
            .input('nombre', sql.VarChar, nombre)
            .input('lat', sql.Decimal(10, 8), latitud)
            .input('lng', sql.Decimal(11, 8), longitud)
            .input('id_usuario', sql.Int, id_usuario)
            .query(`INSERT INTO Predio (id_usuario, nombre, latitud, longitud)
              VALUES (@id_usuario, @nombre, @lat, @lng)`);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;