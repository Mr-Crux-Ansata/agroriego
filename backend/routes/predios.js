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

    if (req.user.rol !== 'Administrador Sistema' && req.user.rol !== 'Administrador Predio') {
        return res.status(403).json({ error: 'No autorizado' });
    }

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

router.put('/:id', verificarToken, async (req, res) => {
    const { nombre, latitud, longitud, id_usuario } = req.body;

    if (req.user.rol !== 'Administrador Sistema' && req.user.rol !== 'Administrador Predio') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, Number(req.params.id))
            .input('nombre', sql.VarChar, nombre)
            .input('lat', sql.Decimal(10, 8), latitud)
            .input('lng', sql.Decimal(11, 8), longitud)
            .input('id_usuario', sql.Int, id_usuario)
            .query(`UPDATE Predio
              SET nombre = @nombre,
                  latitud = @lat,
                  longitud = @lng,
                  id_usuario = @id_usuario
              WHERE id_predio = @id`);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Predio no encontrado' });
        }

        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', verificarToken, async (req, res) => {
    if (req.user.rol !== 'Administrador Sistema') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, Number(req.params.id))
            .query('DELETE FROM Predio WHERE id_predio = @id');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Predio no encontrado' });
        }

        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;