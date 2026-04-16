const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../db');

const router = express.Router();


// 🔹 REGISTRO
router.post('/registro', async (req, res) => {
    const { email, password } = req.body;

    try {
        const pool = await getPool();

        // Verificar si ya existe
        const existe = await pool.request()
            .input('email', sql.VarChar, email)
            .query('SELECT * FROM usuarios WHERE email = @email');

        if (existe.recordset.length > 0) {
            return res.status(400).json({ error: 'Correo ya registrado' });
        }

        // Hash de contraseña
        const hash = await bcrypt.hash(password, 10);

        // Insertar usuario
        await pool.request()
            .input('email', sql.VarChar, email)
            .input('password', sql.VarChar, hash)
            .query('INSERT INTO usuarios (email, password) VALUES (@email, @password)');

        res.json({ mensaje: 'Usuario registrado' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error en registro' });
    }
});


// 🔹 LOGIN
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const pool = await getPool();

        const result = await pool.request()
            .input('email', sql.VarChar, email)
            .query('SELECT * FROM usuarios WHERE email = @email');

        if (result.recordset.length === 0) {
            return res.status(401).json({ error: 'Usuario no existe' });
        }

        const usuario = result.recordset[0];

        const valido = await bcrypt.compare(password, usuario.password);

        if (!valido) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }

        // 🔥 Generar token
        const token = jwt.sign(
            { id: usuario.id, email: usuario.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ token });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error en login' });
    }
});

module.exports = router;