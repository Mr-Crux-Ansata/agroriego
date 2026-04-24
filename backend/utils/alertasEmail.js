const { enviarCorreoAlerta } = require('./email');

async function obtenerDestinatariosAlertas(pool) {
    try {
        const result = await pool.request().query(`
            DECLARE @email_notificaciones VARCHAR(100) = NULL;
            DECLARE @email_contacto VARCHAR(100) = NULL;

            IF OBJECT_ID('ConfiguracionGeneral', 'U') IS NOT NULL
            BEGIN
                SELECT TOP 1
                    @email_notificaciones = NULLIF(LTRIM(RTRIM(email_notificaciones)), ''),
                    @email_contacto = NULLIF(LTRIM(RTRIM(email_contacto)), '')
                FROM ConfiguracionGeneral
                ORDER BY id_configuracion ASC;
            END

            SELECT email
            FROM (
                SELECT @email_notificaciones AS email
                UNION
                SELECT @email_contacto AS email
            ) src
            WHERE email IS NOT NULL;
        `);

        return [...new Set((result.recordset || []).map((r) => r.email).filter(Boolean))];
    } catch (error) {
        console.error('No se pudieron obtener destinatarios de alertas:', error.message || error);
        return [];
    }
}

async function notificarAlertaPorCorreo(pool, alerta) {
    try {
        const destinatarios = await obtenerDestinatariosAlertas(pool);
        if (!destinatarios.length) {
            return;
        }

        await Promise.allSettled(
            destinatarios.map((email) => enviarCorreoAlerta(email, alerta))
        );
    } catch (error) {
        console.error('Fallo notificación de alerta por correo:', error.message || error);
    }
}

module.exports = { notificarAlertaPorCorreo };
