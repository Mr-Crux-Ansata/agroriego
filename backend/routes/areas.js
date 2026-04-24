const router = require('express').Router();
const { getPool, sql } = require('../db');
const { verificarToken } = require('../middleware/auth');
const { notificarAlertaPorCorreo } = require('../utils/alertasEmail');

router.get('/', verificarToken, async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .query(`SELECT a.*, p.nombre AS nombre_predio
              FROM AreaRiego a
              JOIN Predio p ON a.id_predio = p.id_predio`);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id/telemetria', verificarToken, async (req, res) => {
    const { desde, hasta } = req.query;
    try {
        const pool = await getPool();

        let query = `SELECT TOP 100 * FROM LecturaTelemetria
                 WHERE id_area = @id`;
        if (desde && hasta) {
            query = `SELECT * FROM LecturaTelemetria
               WHERE id_area = @id
               AND fecha_hora BETWEEN @desde AND @hasta`;
        }

        const request = pool.request()
            .input('id', sql.VarChar, req.params.id);

        if (desde && hasta) {
            const fechaDesde = new Date(`${desde}T00:00:00`);
            const fechaHasta = new Date(`${hasta}T23:59:59.999`);

            request
                .input('desde', sql.DateTime, fechaDesde)
                .input('hasta', sql.DateTime, fechaHasta);
        }

        const result = await request.query(query + ' ORDER BY fecha_hora DESC');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id/config', verificarToken, async (req, res) => {
    const { capacidad_campo, punto_marchitez, estatus_activo,
        nombre, tipo_cultivo, tipo_tierra, tamano_hectareas } = req.body;
    try {
        const pool = await getPool();
        await pool.request()
            .input('id', sql.VarChar, req.params.id)
            .input('cap', sql.Decimal(5, 2), capacidad_campo)
            .input('mar', sql.Decimal(5, 2), punto_marchitez)
            .input('est', sql.Bit, estatus_activo)
            .input('nombre', sql.VarChar, nombre)
            .input('cultivo', sql.VarChar, tipo_cultivo)
            .input('tierra', sql.VarChar, tipo_tierra)
            .input('tam', sql.Decimal(8, 2), tamano_hectareas)
            .query(`UPDATE AreaRiego
              SET capacidad_campo = @cap,
                  punto_marchitez = @mar,
                  estatus_activo  = @est,
                  nombre          = @nombre,
                  tipo_cultivo    = @cultivo,
                  tipo_tierra     = @tierra,
                  tamano_hectareas = @tam
              WHERE id_area = @id`);

        // Re-evalua la ultima lectura con los nuevos umbrales para reflejar alertas al instante.
        const ultimaLectura = await pool.request()
            .input('id', sql.VarChar, req.params.id)
            .query(`SELECT TOP 1 id_lectura, humedad_suelo
              FROM LecturaTelemetria
              WHERE id_area = @id
              ORDER BY fecha_hora DESC`);

        if (ultimaLectura.recordset.length > 0) {
            const lectura = ultimaLectura.recordset[0];
            const humedadActual = Number(lectura.humedad_suelo);
            const puntoMarchitez = Number(punto_marchitez);
            const capacidadCampo = Number(capacidad_campo);

            if (humedadActual < puntoMarchitez) {
                await upsertAlertaPendiente(
                    pool,
                    req.params.id,
                    lectura.id_lectura,
                    'Estrés Hídrico',
                    'Crítica',
                    `Humedad actual ${humedadActual}% bajo nuevo punto de marchitez ${puntoMarchitez}%.`
                );
                await marcarAlertasPendientesComoAtendidas(pool, req.params.id, ['Saturación']);
            } else if (humedadActual > capacidadCampo) {
                await upsertAlertaPendiente(
                    pool,
                    req.params.id,
                    lectura.id_lectura,
                    'Saturación',
                    'Advertencia',
                    `Humedad actual ${humedadActual}% supera nueva capacidad de campo ${capacidadCampo}%.`
                );
                await marcarAlertasPendientesComoAtendidas(pool, req.params.id, ['Estrés Hídrico']);
            } else {
                await marcarAlertasPendientesComoAtendidas(pool, req.params.id, ['Estrés Hídrico', 'Saturación']);
            }
        }

        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

async function upsertAlertaPendiente(pool, idArea, idLectura, tipo, severidad, mensaje) {
    const existePendiente = await pool.request()
        .input('id_area', sql.VarChar, idArea)
        .input('tipo', sql.VarChar, tipo)
        .query(`SELECT TOP 1 id_alerta
          FROM Alerta
          WHERE id_area = @id_area
            AND tipo_alerta = @tipo
            AND leida = 0
          ORDER BY fecha_generacion DESC`);

    if (existePendiente.recordset.length > 0) {
        const idAlerta = Number(existePendiente.recordset[0].id_alerta);

        await pool.request()
            .input('id_alerta', sql.BigInt, idAlerta)
            .input('id_lectura', sql.BigInt, idLectura)
            .input('fecha', sql.DateTime, new Date())
            .input('severidad', sql.VarChar, severidad)
            .input('mensaje', sql.VarChar, mensaje)
            .query(`UPDATE Alerta
              SET id_lectura = @id_lectura,
                  fecha_generacion = @fecha,
                  severidad = @severidad,
                  mensaje = @mensaje
              WHERE id_alerta = @id_alerta`);

        return;
    }

    const fecha = new Date();
    await pool.request()
        .input('id_area', sql.VarChar, idArea)
        .input('id_lectura', sql.BigInt, idLectura)
        .input('fecha', sql.DateTime, fecha)
        .input('tipo', sql.VarChar, tipo)
        .input('severidad', sql.VarChar, severidad)
        .input('mensaje', sql.VarChar, mensaje)
        .query(`INSERT INTO Alerta
          (id_area, id_lectura, fecha_generacion, tipo_alerta, severidad, mensaje, leida)
          VALUES (@id_area, @id_lectura, @fecha, @tipo, @severidad, @mensaje, 0)`);

    await notificarAlertaPorCorreo(pool, {
        id_area: idArea,
        tipo,
        severidad,
        mensaje,
        fecha,
    });
}

async function marcarAlertasPendientesComoAtendidas(pool, idArea, tipos) {
    if (!Array.isArray(tipos) || tipos.length === 0) {
        return;
    }

    const request = pool.request()
        .input('id_area', sql.VarChar, idArea)
        .input('fecha_lectura', sql.DateTime, new Date());

    const placeholders = tipos.map((tipo, index) => {
        const key = `tipo_${index}`;
        request.input(key, sql.VarChar, tipo);
        return `@${key}`;
    });

    await request.query(`UPDATE Alerta
      SET leida = 1,
          fecha_lectura = @fecha_lectura
      WHERE id_area = @id_area
        AND leida = 0
        AND tipo_alerta IN (${placeholders.join(', ')})`);
}

module.exports = router;