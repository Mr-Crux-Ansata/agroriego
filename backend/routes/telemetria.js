const router = require('express').Router();
const { getPool, sql } = require('../db');
const { notificarAlertaPorCorreo } = require('../utils/alertasEmail');


router.post('/', async (req, res) => {
    const {
        id_area, humedad_suelo, potencial_hidrico,
        electroconductividad, temperatura_suelo, ndvi,
        estatus_riego, flujo_riego, temperatura_ambiental,
        humedad_relativa, velocidad_viento, radiacion_solar,
        evapotranspiracion
    } = req.body;

    try {
        const pool = await getPool();

        // Verificar si área existe y está activa
        const areaRes = await pool.request()
            .input('id_area', sql.VarChar, id_area)
            .query(`SELECT estatus_activo, capacidad_campo, punto_marchitez
              FROM AreaRiego WHERE id_area = @id_area`);

        const area = areaRes.recordset[0];
        if (!area || !area.estatus_activo) {
            return res.json({ ok: false, mensaje: 'Área inactiva, paquete descartado' });
        }

        // Guardar lectura
        const ins = await pool.request()
            .input('id_area', sql.VarChar, id_area)
            .input('fecha_hora', sql.DateTime, new Date())
            .input('humedad_suelo', sql.Decimal(5, 2), humedad_suelo)
            .input('potencial_hidrico', sql.Decimal(8, 2), potencial_hidrico)
            .input('electroconductividad', sql.Decimal(8, 2), electroconductividad)
            .input('temperatura_suelo', sql.Decimal(5, 2), temperatura_suelo)
            .input('ndvi', sql.Decimal(4, 3), ndvi || null)
            .input('estatus_riego', sql.Bit, estatus_riego ? 1 : 0)
            .input('flujo_riego', sql.Decimal(8, 2), flujo_riego)
            .input('temperatura_ambiental', sql.Decimal(5, 2), temperatura_ambiental)
            .input('humedad_relativa', sql.Decimal(5, 2), humedad_relativa)
            .input('velocidad_viento', sql.Decimal(6, 2), velocidad_viento)
            .input('radiacion_solar', sql.Decimal(8, 2), radiacion_solar)
            .input('evapotranspiracion', sql.Decimal(6, 2), evapotranspiracion)
            .query(`INSERT INTO LecturaTelemetria
              (id_area, fecha_hora, humedad_suelo, potencial_hidrico,
               electroconductividad, temperatura_suelo, ndvi, estatus_riego,
               flujo_riego, temperatura_ambiental, humedad_relativa,
               velocidad_viento, radiacion_solar, evapotranspiracion)
              VALUES
              (@id_area, @fecha_hora, @humedad_suelo, @potencial_hidrico,
               @electroconductividad, @temperatura_suelo, @ndvi, @estatus_riego,
               @flujo_riego, @temperatura_ambiental, @humedad_relativa,
               @velocidad_viento, @radiacion_solar, @evapotranspiracion);
              SELECT SCOPE_IDENTITY() AS id_lectura`);

        const id_lectura = ins.recordset[0].id_lectura;

        // Alerta por calibración (valores imposibles)
        const fueraRango =
            humedad_suelo < 0 || humedad_suelo > 100 ||
            temperatura_suelo < -10 || temperatura_suelo > 60 ||
            radiacion_solar < 0 || radiacion_solar > 1500;

        if (fueraRango) {
            await insertarAlerta(pool, id_area, id_lectura,
                'Falla de Calibración', 'Advertencia',
                `Valores fuera de rango lógico detectados. Revisar sensores.`);
        }

        // Alerta por estrés hídrico o saturación
        if (humedad_suelo < area.punto_marchitez) {
            await insertarAlerta(pool, id_area, id_lectura,
                'Estrés Hídrico', 'Crítica',
                `Humedad ${humedad_suelo}% bajo punto de marchitez ${area.punto_marchitez}%. Riego requerido.`);
        } else if (humedad_suelo > area.capacidad_campo) {
            await insertarAlerta(pool, id_area, id_lectura,
                'Saturación', 'Advertencia',
                `Humedad ${humedad_suelo}% supera capacidad de campo ${area.capacidad_campo}%.`);
        }

        res.json({ ok: true, id_lectura });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

async function insertarAlerta(pool, id_area, id_lectura, tipo, severidad, mensaje) {
    const fecha = new Date();
    await pool.request()
        .input('id_area', sql.VarChar, id_area)
        .input('id_lectura', sql.BigInt, id_lectura)
        .input('fecha', sql.DateTime, fecha)
        .input('tipo', sql.VarChar, tipo)
        .input('severidad', sql.VarChar, severidad)
        .input('mensaje', sql.VarChar, mensaje)
        .query(`INSERT INTO Alerta
            (id_area, id_lectura, fecha_generacion, tipo_alerta, severidad, mensaje, leida)
            VALUES (@id_area, @id_lectura, @fecha, @tipo, @severidad, @mensaje, 0)`);

    await notificarAlertaPorCorreo(pool, {
        id_area,
        tipo,
        severidad,
        mensaje,
        fecha,
    });
}

module.exports = router;