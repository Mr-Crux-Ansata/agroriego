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
        if (!user) {
            return res.status(401).json({ error: 'Correo no registrado' });
        }
        
        // Comparamos texto plano (admin123 === admin123)
        if (password !== user.password_hash) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }

        // Si JWT_SECRET no existe en Render, esto dará error 500
        const token = jwt.sign(
            { id_usuario: user.id_usuario, rol: user.rol },
            process.env.JWT_SECRET || 'secretatemporal123', 
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
        console.error("DETALLE DEL ERROR EN RENDER:", err);
        res.status(500).json({ 
            error: 'Error interno del servidor', 
            mensaje: err.message, 
            codigo: err.code 
        });
    } // <--- ESTA LLAVE FALTABA
});

module.exports = router;