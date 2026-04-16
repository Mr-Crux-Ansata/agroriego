const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../db');
require('dotenv').config();

const router = express.Router();


// 🔹 REGISTRO
router.post('/registro', async (req, res) => {
    const { email, password, nombre_completo, rol } = req.body;

    try {
        const pool = await getPool();

        // Verificar si ya existe
        const existe = await pool.request()
            .input('email', sql.VarChar, email)
            .query('SELECT * FROM Usuario WHERE email = @email');

        if (existe.recordset.length > 0) {
            return res.status(400).json({ error: 'Correo ya registrado' });
        }

        // Hash de contraseña
        const hash = await bcrypt.hash(password, 10);

        // Insertar usuario
        await pool.request()
            .input('email', sql.VarChar, email)
            .input('pass', sql.VarChar, hash)
            .input('nombre', sql.VarChar, nombre_completo)
            .input('rol', sql.VarChar, rol || 'Operador Campo')
            .query(`
                INSERT INTO Usuario (email, password_hash, nombre_completo, rol)
                VALUES (@email, @pass, @nombre, @rol)
            `);

        res.json({ ok: true, mensaje: 'Usuario registrado' });

    } catch (err) {
        console.error('🔥 ERROR REGISTRO:', err);
        res.status(500).json({ error: err.message });
    }
});


// 🔹 LOGIN
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const pool = await getPool();

        const result = await pool.request()
            .input('email', sql.VarChar, email)
            .query('SELECT * FROM Usuario WHERE email = @email');

        if (result.recordset.length === 0) {
            return res.status(401).json({ error: 'Usuario no existe' });
        }

        const user = result.recordset[0];

        const valido = await bcrypt.compare(password, user.password_hash);

        if (!valido) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }

        // 🔥 Token
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
        console.error('🔥 ERROR LOGIN:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;