const router = require('express').Router();
const { getPool, sql } = require('../db');
const { verificarToken } = require('../middleware/auth');

const RFC_REGEX = /^([A-ZÑ&]{3,4})(\d{2})(\d{2})(\d{2})([A-Z0-9]{2})([A-Z0-9])$/;

function normalizarRFC(value = '') {
    return value.toUpperCase().trim().replace(/[^A-Z0-9Ñ&]/g, '');
}

function validarRFCCompleto(rfcInput = '') {
    const rfc = normalizarRFC(rfcInput);
    const match = rfc.match(RFC_REGEX);

    if (!match) {
        return { ok: false, error: 'RFC inválido (formato).' };
    }

    const [, , yy, mm, dd] = match;

    if (!isValidDateYYMMDD(yy, mm, dd)) {
        return { ok: false, error: 'RFC inválido (fecha).' };
    }

    return { ok: true, rfc };
}

async function ensureConfiguracionTable(pool) {
    await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ConfiguracionGeneral' AND xtype='U')
        BEGIN
            CREATE TABLE ConfiguracionGeneral (
                id_configuracion INT IDENTITY(1,1) PRIMARY KEY,
                frecuencia_actualizacion_min INT NOT NULL DEFAULT 10,
                notificaciones_email BIT NOT NULL DEFAULT 1,
                email_notificaciones VARCHAR(100) NOT NULL DEFAULT 'admin@agroriego.com',
                nombre_cliente VARCHAR(150) NOT NULL DEFAULT 'AgroRiego Mexico S.A. de C.V.',
                rfc VARCHAR(13) NULL,
                email_contacto VARCHAR(100) NULL,
                actualizado_en DATETIME NOT NULL DEFAULT GETDATE()
            );
        END

        IF NOT EXISTS (SELECT 1 FROM ConfiguracionGeneral)
        BEGIN
            INSERT INTO ConfiguracionGeneral (
                frecuencia_actualizacion_min,
                notificaciones_email,
                email_notificaciones,
                nombre_cliente,
                rfc,
                email_contacto
            ) VALUES (
                10,
                1,
                'admin@agroriego.com',
                'AgroRiego Mexico S.A. de C.V.',
                'ARM123456ABC',
                'contacto@agroriego.com'
            );
        END
    `);
}

router.get('/', verificarToken, async (req, res) => {
    try {
        const pool = await getPool();
        await ensureConfiguracionTable(pool);

        const result = await pool.request().query(`
            SELECT TOP 1
                frecuencia_actualizacion_min,
                notificaciones_email,
                email_notificaciones,
                nombre_cliente,
                rfc,
                email_contacto,
                actualizado_en
            FROM ConfiguracionGeneral
            ORDER BY id_configuracion ASC
        `);

        res.json({ configuracion: result.recordset[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/', verificarToken, async (req, res) => {
    if (req.user.rol !== 'Administrador Sistema' && req.user.rol !== 'Administrador Predio') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    const {
        frecuencia_actualizacion_min,
        notificaciones_email,
        email_notificaciones,
        nombre_cliente,
        rfc,
        email_contacto,
    } = req.body;

    if (!nombre_cliente || !email_contacto || !email_notificaciones) {
        return res.status(400).json({ error: 'Nombre de cliente y correos son obligatorios' });
    }

    let rfcNormalizado = null;
    if (rfc) {
        const rfcValidation = validarRFCCompleto(rfc);
        if (!rfcValidation.ok) {
            return res.status(400).json({ error: rfcValidation.error });
        }
        rfcNormalizado = rfcValidation.rfc;
    }

    try {
        const pool = await getPool();
        await ensureConfiguracionTable(pool);

        const result = await pool.request()
            .input('frecuencia', sql.Int, Number(frecuencia_actualizacion_min) || 10)
            .input('notifEmail', sql.Bit, Boolean(notificaciones_email))
            .input('emailNotif', sql.VarChar(100), email_notificaciones)
            .input('nombreCliente', sql.VarChar(150), nombre_cliente)
            .input('rfc', sql.VarChar(13), rfcNormalizado)
            .input('emailContacto', sql.VarChar(100), email_contacto)
            .query(`
                UPDATE ConfiguracionGeneral
                SET
                    frecuencia_actualizacion_min = @frecuencia,
                    notificaciones_email = @notifEmail,
                    email_notificaciones = @emailNotif,
                    nombre_cliente = @nombreCliente,
                    rfc = @rfc,
                    email_contacto = @emailContacto,
                    actualizado_en = GETDATE()
                WHERE id_configuracion = (
                    SELECT TOP 1 id_configuracion
                    FROM ConfiguracionGeneral
                    ORDER BY id_configuracion ASC
                );

                SELECT TOP 1
                    frecuencia_actualizacion_min,
                    notificaciones_email,
                    email_notificaciones,
                    nombre_cliente,
                    rfc,
                    email_contacto,
                    actualizado_en
                FROM ConfiguracionGeneral
                ORDER BY id_configuracion ASC;
            `);

        res.json({ configuracion: result.recordset[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;