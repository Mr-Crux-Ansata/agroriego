const router = require('express').Router();
const jwt = require('jsonwebtoken');
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
        const bcrypt = require('bcrypt');
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