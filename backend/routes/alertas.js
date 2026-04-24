const router = require('express').Router();
const { getPool, sql } = require('../db');
const { verificarToken } = require('../middleware/auth');


router.get('/', verificarToken, async (req, res) => {
    try {
        const { estado } = req.query; 
        const pool = await getPool();
        
        let query = `
            SELECT a.*, ar.nombre AS nombre_area
            FROM Alerta a
            JOIN AreaRiego ar ON a.id_area = ar.id_area
        `;

        if (estado === 'pendientes') {
            query += ' WHERE a.leida = 0';
        } else if (estado === 'atendidas') {
            query += ' WHERE a.leida = 1';
        }

        query += ' ORDER BY a.fecha_generacion DESC';

        const result = await pool.request().query(query);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.patch('/:id/leer', verificarToken, async (req, res) => {
    try {
        const { id } = req.params;
        const idAlerta = Number(id);

        if (!Number.isInteger(idAlerta) || idAlerta <= 0) {
            return res.status(400).json({ error: 'ID de alerta inválido' });
        }

        console.log("Intentando marcar como leída la alerta ID:", idAlerta);

        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.BigInt, idAlerta)
            .query(`UPDATE Alerta 
                    SET leida = 1, fecha_lectura = GETDATE() 
                    WHERE id_alerta = @id`);

        console.log("Filas afectadas:", result.rowsAffected); // <-- ESTO ES CLAVE

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: "No se encontró la alerta con ese ID" });
        }

        res.json({ ok: true });
    } catch (err) {
        console.error("Error en el servidor:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;