const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../db');
require('dotenv').config();

const router = express.Router();

router.get('/test', (req, res) => {
    res.send('AUTH TEST OK');
});

router.post('/registro', async (req, res) => {
    const { email, password, nombre_completo, rol } = req.body;

    try {
        const pool = await getPool();

        const existe = await pool.request()
            .input('email', sql.VarChar, email)
            .query('SELECT * FROM Usuario WHERE email = @email');

        if (existe.recordset.length > 0) {
            return res.status(400).json({ error: 'Correo ya registrado' });
        }

        const hash = await bcrypt.hash(password, 10);

        await pool.request()
            .input('email', sql.VarChar, email)
            .input('pass', sql.VarChar, hash)
            .input('nombre', sql.VarChar, nombre_completo)
            .input('rol', sql.VarChar, rol || 'Operador Campo')
            .input('activo', sql.Bit, 0)
            .query(`
                INSERT INTO Usuario (email, password_hash, nombre_completo, rol, activo)
                VALUES (@email, @pass, @nombre, @rol, @activo)
            `);

        res.json({ ok: true });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/activar', async (req, res) => {
    const { token, password } = req.body;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const pool = await getPool();
        const hash = await bcrypt.hash(password, 10);

        await pool.request()
            .input('id', sql.Int, decoded.id_usuario)
            .input('password', sql.VarChar, hash)
            .query(`
                UPDATE Usuario
                SET password_hash = @password, activo = 1
                WHERE id_usuario = @id
            `);

        res.json({ ok: true });

    } catch (err) {
        res.status(400).json({ error: 'Token inválido o expirado' });
    }
});

// 🔹 LOGIN
router.post('/login', async (req, res) => {
    console.log('BODY:', req.body);
    console.log('LOGIN HIT', req.body);

    const { email, password } = req.body;

    try {
        const pool = await getPool();

        const result = await pool.request()
            .input('email', sql.VarChar, email)
            .query('SELECT * FROM Usuario WHERE email = @email');

        const user = result.recordset[0];

        if (!user) {
            return res.status(401).json({ error: 'Correo no registrado' });
        }

        if (!user.activo) {
            return res.status(401).json({ error: 'Cuenta no activada. Verifica tu correo primero.' });
        }

        const valido = await bcrypt.compare(password, user.password_hash);

        if (!valido) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }

        const token = jwt.sign(
            { id_usuario: user.id_usuario, rol: user.rol },
            process.env.JWT_SECRET,
            { expiresIn: '4h' }
        );

        res.json({
            token,
            user: {
                id_usuario: user.id_usuario,
                email: user.email,
                nombre_completo: user.nombre_completo,
                rol: user.rol,
            },
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;