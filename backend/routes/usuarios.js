const router = require('express').Router();
const { getPool, sql } = require('../db');
const { verificarToken } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const { enviarCorreo } = require('../utils/email');

// Obtener usuarios
router.get('/', verificarToken, async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .query('SELECT id_usuario, email, nombre_completo, rol, activo FROM Usuario');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


router.post('/', verificarToken, async (req, res) => {
    const { email, nombre_completo, rol } = req.body;


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


        // No hashear password aquí, se hará en activar
        const result = await pool.request()
            .input('email', sql.VarChar, email)
            .input('pass', sql.VarChar, '') // password vacío temporal
            .input('nombre', sql.VarChar, nombre_completo)
            .input('rol', sql.VarChar, rol)
            .input('activo', sql.Bit, 0)
            .query(`INSERT INTO Usuario (email, password_hash, nombre_completo, rol, activo)
                    OUTPUT INSERTED.id_usuario
                    VALUES (@email, @pass, @nombre, @rol, @activo)`);

        const nuevoUsuarioId = result.recordset[0].id_usuario;

        // generar token temporal
        const token = jwt.sign(
            { id_usuario: nuevoUsuarioId },
            process.env.JWT_SECRET,
            { expiresIn: '24h' } // Cambiado a 24 horas para testing
        );

        // enviar correo
        try {
            await enviarCorreo(email, token);
        } catch (emailError) {
            // Si falla el envío, eliminar el usuario insertado
            await pool.request()
                .input('id', sql.Int, nuevoUsuarioId)
                .query('DELETE FROM Usuario WHERE id_usuario = @id');
            throw new Error('Error al enviar el correo de activación');
        }

        res.json({ ok: true });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Eliminar usuario
router.delete('/:id', verificarToken, async (req, res) => {
    const { id } = req.params;

    if (req.user.rol !== 'Administrador Sistema') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    try {
        const pool = await getPool();

        const result = await pool.request()
            .input('id', sql.Int, parseInt(id, 10))
            .query('DELETE FROM Usuario WHERE id_usuario = @id');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

