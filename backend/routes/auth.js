const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../db');
require('dotenv').config();

const router = express.Router();

// 🔥 TEST
router.get('/test', (req, res) => {
    res.send('AUTH TEST OK');
});

// 🔹 REGISTRO
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
            .query(`
                INSERT INTO Usuario (email, password_hash, nombre_completo, rol)
                VALUES (@email, @pass, @nombre, @rol)
            `);

        res.json({ ok: true });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 🔹 LOGIN
router.post('/login', async (req, res) => {
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