const router = require('express').Router();
const { getPool, sql } = require('../db');
const { verificarToken } = require('../middleware/auth');
const bcrypt = require('bcrypt');

// Obtener usuarios
router.get('/', verificarToken, async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .query('SELECT id_usuario, email, nombre_completo, rol FROM Usuario');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


router.post('/', verificarToken, async (req, res) => {
    const { email, password, nombre_completo, rol } = req.body;


    if (req.user.rol !== 'Administrador Sistema') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    try {
        const pool = await getPool();

        const existe = await pool.request()
            .input('email', sql.VarChar, email)
            .query('SELECT id_usuario FROM Usuario WHERE email = @email');

        if (existe.recordset.length > 0) {
            return res.status(400).json({ error: 'El correo ya está registrado' });
        }

        const rolesPermitidos = [
            'Administrador Sistema',
            'Administrador Predio',
            'Operador Campo'
        ];

        if (!rolesPermitidos.includes(rol)) {
            return res.status(400).json({ error: 'Rol inválido' });
        }


        const hash = await bcrypt.hash(password, 10);

        await pool.request()
            .input('email', sql.VarChar, email)
            .input('pass', sql.VarChar, hash)
            .input('nombre', sql.VarChar, nombre_completo)
            .input('rol', sql.VarChar, rol)
            .query(`INSERT INTO Usuario (email, password_hash, nombre_completo, rol)
                    VALUES (@email, @pass, @nombre, @rol)`);

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
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('DELETE FROM Usuario WHERE id_usuario = @id');

        res.json({ ok: true });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

