const router = require('express').Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getPool, sql } = require('../db');
require('dotenv').config();

router.post('/login', async (req, res) => {
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

        let passwordValido = false;
        if (user.password_hash && String(user.password_hash).startsWith('$2')) {
            passwordValido = await bcrypt.compare(password, user.password_hash);
        } else {
            // Compatibilidad con datos legados en texto plano.
            passwordValido = password === user.password_hash;
        }

        if (!passwordValido) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }

        const token = jwt.sign(
            { id_usuario: user.id_usuario, rol: user.rol },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
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
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;