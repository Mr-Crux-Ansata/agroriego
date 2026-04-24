const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../db');
const { verificarToken } = require('../middleware/auth');
const twilio = require('twilio');
require('dotenv').config();

const router = express.Router();

function getTwilioClient() {
    return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

async function sendSms({ to, message }) {
    const provider = (process.env.SMS_PROVIDER || 'textbelt').toLowerCase();

    if (provider === 'twilio') {
        await getTwilioClient().messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to,
        });
        return;
    }

    if (provider === 'textbelt') {
        if (typeof fetch !== 'function') {
            throw new Error('Fetch no disponible en este runtime de Node.js');
        }

        const textbeltKey = process.env.TEXTBELT_API_KEY || 'textbelt';
        const body = new URLSearchParams({
            phone: to,
            message,
            key: textbeltKey,
        });

        const response = await fetch('https://textbelt.com/text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Textbelt rechazó el envío');
        }
        return;
    }

    if (provider === 'mock') {
        console.log('[SMS MOCK] destino:', to, 'mensaje:', message);
        return;
    }

    throw new Error(`Proveedor SMS no soportado: ${provider}`);
}

function generarCodigo() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function ensureUsuarioOptionalColumns(pool) {
    await pool.request().query(`
        IF NOT EXISTS (
            SELECT *
            FROM sys.columns
            WHERE object_id = OBJECT_ID('Usuario')
              AND name = 'telefono'
        )
        BEGIN
            ALTER TABLE Usuario ADD telefono VARCHAR(20) NULL;
        END

        IF NOT EXISTS (
            SELECT *
            FROM sys.columns
            WHERE object_id = OBJECT_ID('Usuario')
              AND name = 'sms_codigo'
        )
        BEGIN
            ALTER TABLE Usuario ADD sms_codigo VARCHAR(6) NULL;
        END

        IF NOT EXISTS (
            SELECT *
            FROM sys.columns
            WHERE object_id = OBJECT_ID('Usuario')
              AND name = 'sms_codigo_expira'
        )
        BEGIN
            ALTER TABLE Usuario ADD sms_codigo_expira DATETIME NULL;
        END

        IF NOT EXISTS (
            SELECT *
            FROM sys.columns
            WHERE object_id = OBJECT_ID('Usuario')
              AND name = 'foto_perfil_url'
        )
        BEGIN
            ALTER TABLE Usuario ADD foto_perfil_url VARCHAR(255) NULL;
        END
    `);
}

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

router.post('/enviar-codigo', async (req, res) => {
    const { token, telefono } = req.body;

    if (!token || !telefono) {
        return res.status(400).json({ error: 'Token y teléfono son requeridos' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const codigo = generarCodigo();
        const expira = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

        const pool = await getPool();
        await ensureUsuarioOptionalColumns(pool);
        await pool.request()
            .input('id', sql.Int, parseInt(decoded.id_usuario, 10))
            .input('codigo', sql.VarChar, codigo)
            .input('expira', sql.DateTime, expira)
            .query(`
                UPDATE Usuario
                SET sms_codigo = @codigo, sms_codigo_expira = @expira
                WHERE id_usuario = @id
            `);

        await sendSms({
            to: telefono,
            message: `Tu código de verificación AgroRiego es: ${codigo}. Válido por 10 minutos.`,
        });

        res.json({ ok: true });
    } catch (err) {
        console.error('ERROR ENVIAR-CODIGO:', err);
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return res.status(400).json({ error: 'Token de activación inválido o expirado' });
        }
        res.status(500).json({ error: 'No se pudo enviar el SMS' });
    }
});

router.post('/activar', async (req, res) => {
    const { token, password, telefono, codigo_sms } = req.body;

    console.log("TOKEN RECIBIDO:", token);

    console.log('ACTIVAR BODY:', req.body);

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("ID DEL TOKEN:", decoded.id_usuario, typeof decoded.id_usuario);
        console.log('TOKEN DECODED:', decoded);

        const pool = await getPool();
        await ensureUsuarioOptionalColumns(pool);

        // Verificar OTP
        const otpResult = await pool.request()
            .input('id', sql.Int, parseInt(decoded.id_usuario, 10))
            .query(`SELECT sms_codigo, sms_codigo_expira FROM Usuario WHERE id_usuario = @id`);

        const usuario = otpResult.recordset[0];
        if (!usuario) {
            return res.status(400).json({ error: 'Usuario no encontrado' });
        }
        if (!usuario.sms_codigo || usuario.sms_codigo !== codigo_sms) {
            return res.status(400).json({ error: 'Código SMS incorrecto' });
        }
        if (!usuario.sms_codigo_expira || new Date() > new Date(usuario.sms_codigo_expira)) {
            return res.status(400).json({ error: 'El código SMS ha expirado' });
        }

        const hash = await bcrypt.hash(password, 10);

        const result = await pool.request()
    .input('id', sql.Int, parseInt(decoded.id_usuario, 10))
    .input('password', sql.VarChar, hash)
    .input('telefono', sql.VarChar, telefono || null)
    .query(`
        UPDATE Usuario
        SET password_hash = @password, activo = 1, telefono = @telefono,
            sms_codigo = NULL, sms_codigo_expira = NULL
        WHERE id_usuario = @id
    `);

console.log("FILAS AFECTADAS:", result.rowsAffected[0]);

if (result.rowsAffected[0] === 0) {
    return res.status(400).json({ error: 'No se actualizó el usuario' });
}

        res.json({ ok: true });

    } catch (err) {
        console.error('ERROR ACTIVAR:', err);
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

router.get('/me', verificarToken, async (req, res) => {
    try {
        const pool = await getPool();
        await ensureUsuarioOptionalColumns(pool);

        const result = await pool.request()
            .input('id', sql.Int, req.user.id_usuario)
            .query('SELECT id_usuario, email, nombre_completo, rol, activo, telefono, foto_perfil_url FROM Usuario WHERE id_usuario = @id');

        const user = result.recordset[0];

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({ user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;