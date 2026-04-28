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
                        .query(`SELECT estatus_activo, capacidad_campo, punto_marchitez,
                                            umbral_humedad_min, umbral_humedad_max,
                                            umbral_temp_suelo_min, umbral_temp_suelo_max,
                                            umbral_ce_min, umbral_ce_max,
                                            umbral_potencial_min, umbral_potencial_max,
                                            umbral_et_min, umbral_et_max,
                                            umbral_temp_amb_min, umbral_temp_amb_max,
                                            umbral_hr_min, umbral_hr_max,
                                            umbral_viento_min, umbral_viento_max,
                                            umbral_ndvi_min, umbral_ndvi_max,
                                            umbral_flujo_min, umbral_flujo_max,
                                            umbral_radiacion_min, umbral_radiacion_max
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
        const lecturasRecientes = await obtenerLecturasRecientes(pool, id_area);
        const lecturaActual = lecturasRecientes[0] || req.body;

        // Alertas por promedio de últimas 6 lecturas fuera de rango
        for (const regla of construirReglasPorArea(area)) {
            if (!regla.promedioEsAnomalo(lecturasRecientes)) continue;
            if (!debeGenerarAlertaPromedio(lecturasRecientes, regla.promedioEsAnomalo)) continue;
            await insertarAlerta(pool, id_area, id_lectura, regla.tipoPromedio, regla.severidad, regla.crearMensajePromedio(lecturasRecientes));
        }

        // Auto-resolver alertas de promedio cuando promedio vuelve a ser normal
        for (const regla of construirReglasPorArea(area)) {
            if (debeLimpiarAlertaPromedio(lecturasRecientes, regla.promedioEsAnomalo)) {
                await resolverAlertasAbiertas(pool, id_area, regla.tipoPromedio);
            }
        }

        res.json({ ok: true, id_lectura });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

function debeLimpiarAlerta(lecturasRecientes, esAnomala) {
    if (lecturasRecientes.length < 6) return false;
    return lecturasRecientes.slice(0, 6).every(l => !esAnomala(l));
}

function promedioFueraDeRango(lecturas, campo, min, max) {
    const vals = lecturas.slice(0, 6).map(l => Number(l[campo])).filter(Number.isFinite);
    if (vals.length < 6) return false;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return avg < Number(min) || avg > Number(max);
}

function debeGenerarAlertaPromedio(lecturasRecientes, promedioEsAnomalo) {
    // Necesitamos al menos 7 lecturas para comparar la ventana actual (0-5) con la anterior (1-6)
    if (lecturasRecientes.length < 7) return false;
    const estadoActual = promedioEsAnomalo(lecturasRecientes);
    const estadoPrevio = promedioEsAnomalo(lecturasRecientes.slice(1));
    return estadoActual && !estadoPrevio;
}

function debeLimpiarAlertaPromedio(lecturasRecientes, promedioEsAnomalo) {
    if (lecturasRecientes.length < 7) return false;
    return !promedioEsAnomalo(lecturasRecientes) && promedioEsAnomalo(lecturasRecientes.slice(1));
}

async function resolverAlertasAbiertas(pool, id_area, tipo) {
    await pool.request()
        .input('id_area', sql.VarChar, id_area)
        .input('tipo', sql.VarChar, tipo)
        .query(`UPDATE Alerta SET leida=1, fecha_lectura=GETDATE()
                WHERE id_area=@id_area AND tipo_alerta=@tipo AND leida=0`);
}

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

async function obtenerLecturasRecientes(pool, id_area) {
    const result = await pool.request()
        .input('id_area', sql.VarChar, id_area)
        .query(`SELECT TOP 12
                    id_lectura, fecha_hora, humedad_suelo, potencial_hidrico,
                    electroconductividad, temperatura_suelo, ndvi, estatus_riego,
                    flujo_riego, temperatura_ambiental, humedad_relativa,
                    velocidad_viento, radiacion_solar, evapotranspiracion
          FROM LecturaTelemetria
          WHERE id_area = @id_area
          ORDER BY fecha_hora DESC, id_lectura DESC`);

    return result.recordset || [];
}

function cumpleReglaPersistencia(flags) {
    if (flags.length < 6) {
        return false;
    }

    const ultimas6 = flags.slice(0, 6);
    if (ultimas6.every(Boolean)) {
        return true;
    }

    if (flags.length < 7) {
        return false;
    }

    const ultimas7 = flags.slice(0, 7);
    const anormales = ultimas7.filter(Boolean).length;

    // Permite una lectura normal intermedia: ej. 5 anormales, 1 normal, 1 anormal.
    return anormales >= 6 && ultimas7[0] === true;
}

function debeGenerarAlerta(lecturasRecientes, esAnomala) {
    const flags = (lecturasRecientes || []).map((lectura) => Boolean(esAnomala(lectura)));
    const estadoActual = cumpleReglaPersistencia(flags);
    const estadoPrevio = cumpleReglaPersistencia(flags.slice(1));

    // Solo dispara cuando cruza el umbral de persistencia, evitando alertas repetidas.
    return estadoActual && !estadoPrevio;
}

function fueraDeRango(valor, min, max) {
    const n = Number(valor);
    if (!Number.isFinite(n)) return false;
    return n < Number(min) || n > Number(max);
}

function construirReglasPorArea(area) {
    return [
        {
            tipo: 'Humedad Fuera de Rango',
            tipoPromedio: 'Humedad Promedio Fuera de Rango',
            severidad: 'Advertencia',
            esAnomala: (l) => fueraDeRango(l.humedad_suelo, area.umbral_humedad_min, area.umbral_humedad_max),
            crearMensaje: (l) => `Humedad ${l.humedad_suelo}% fuera de rango [${area.umbral_humedad_min}-${area.umbral_humedad_max}]`,
            promedioEsAnomalo: (ls) => promedioFueraDeRango(ls, 'humedad_suelo', area.umbral_humedad_min, area.umbral_humedad_max),
            crearMensajePromedio: (ls) => { const avg = promedio(ls, 'humedad_suelo'); return `Promedio humedad últimas 6 lecturas: ${avg}% fuera de rango [${area.umbral_humedad_min}-${area.umbral_humedad_max}]`; },
        },
        {
            tipo: 'Temperatura Suelo Fuera de Rango',
            tipoPromedio: 'Temperatura Suelo Promedio Fuera de Rango',
            severidad: 'Advertencia',
            esAnomala: (l) => fueraDeRango(l.temperatura_suelo, area.umbral_temp_suelo_min, area.umbral_temp_suelo_max),
            crearMensaje: (l) => `Temperatura suelo ${l.temperatura_suelo} fuera de rango [${area.umbral_temp_suelo_min}-${area.umbral_temp_suelo_max}]`,
            promedioEsAnomalo: (ls) => promedioFueraDeRango(ls, 'temperatura_suelo', area.umbral_temp_suelo_min, area.umbral_temp_suelo_max),
            crearMensajePromedio: (ls) => { const avg = promedio(ls, 'temperatura_suelo'); return `Promedio temperatura suelo últimas 6 lecturas: ${avg} fuera de rango [${area.umbral_temp_suelo_min}-${area.umbral_temp_suelo_max}]`; },
        },
        {
            tipo: 'CE Fuera de Rango',
            tipoPromedio: 'CE Promedio Fuera de Rango',
            severidad: 'Advertencia',
            esAnomala: (l) => fueraDeRango(l.electroconductividad, area.umbral_ce_min, area.umbral_ce_max),
            crearMensaje: (l) => `CE ${l.electroconductividad} fuera de rango [${area.umbral_ce_min}-${area.umbral_ce_max}]`,
            promedioEsAnomalo: (ls) => promedioFueraDeRango(ls, 'electroconductividad', area.umbral_ce_min, area.umbral_ce_max),
            crearMensajePromedio: (ls) => { const avg = promedio(ls, 'electroconductividad'); return `Promedio CE últimas 6 lecturas: ${avg} fuera de rango [${area.umbral_ce_min}-${area.umbral_ce_max}]`; },
        },
        {
            tipo: 'Potencial Hídrico Fuera de Rango',
            tipoPromedio: 'Potencial Hídrico Promedio Fuera de Rango',
            severidad: 'Crítica',
            esAnomala: (l) => fueraDeRango(l.potencial_hidrico, area.umbral_potencial_min, area.umbral_potencial_max),
            crearMensaje: (l) => `Potencial hídrico ${l.potencial_hidrico} fuera de rango [${area.umbral_potencial_min}-${area.umbral_potencial_max}]`,
            promedioEsAnomalo: (ls) => promedioFueraDeRango(ls, 'potencial_hidrico', area.umbral_potencial_min, area.umbral_potencial_max),
            crearMensajePromedio: (ls) => { const avg = promedio(ls, 'potencial_hidrico'); return `Promedio potencial hídrico últimas 6 lecturas: ${avg} fuera de rango [${area.umbral_potencial_min}-${area.umbral_potencial_max}]`; },
        },
        {
            tipo: 'ET Fuera de Rango',
            tipoPromedio: 'ET Promedio Fuera de Rango',
            severidad: 'Advertencia',
            esAnomala: (l) => fueraDeRango(l.evapotranspiracion, area.umbral_et_min, area.umbral_et_max),
            crearMensaje: (l) => `ET ${l.evapotranspiracion} fuera de rango [${area.umbral_et_min}-${area.umbral_et_max}]`,
            promedioEsAnomalo: (ls) => promedioFueraDeRango(ls, 'evapotranspiracion', area.umbral_et_min, area.umbral_et_max),
            crearMensajePromedio: (ls) => { const avg = promedio(ls, 'evapotranspiracion'); return `Promedio ET últimas 6 lecturas: ${avg} fuera de rango [${area.umbral_et_min}-${area.umbral_et_max}]`; },
        },
        {
            tipo: 'Temperatura Ambiental Fuera de Rango',
            tipoPromedio: 'Temperatura Ambiental Promedio Fuera de Rango',
            severidad: 'Advertencia',
            esAnomala: (l) => fueraDeRango(l.temperatura_ambiental, area.umbral_temp_amb_min, area.umbral_temp_amb_max),
            crearMensaje: (l) => `Temperatura ambiental ${l.temperatura_ambiental} fuera de rango [${area.umbral_temp_amb_min}-${area.umbral_temp_amb_max}]`,
            promedioEsAnomalo: (ls) => promedioFueraDeRango(ls, 'temperatura_ambiental', area.umbral_temp_amb_min, area.umbral_temp_amb_max),
            crearMensajePromedio: (ls) => { const avg = promedio(ls, 'temperatura_ambiental'); return `Promedio temperatura ambiental últimas 6 lecturas: ${avg} fuera de rango [${area.umbral_temp_amb_min}-${area.umbral_temp_amb_max}]`; },
        },
        {
            tipo: 'Humedad Relativa Fuera de Rango',
            tipoPromedio: 'Humedad Relativa Promedio Fuera de Rango',
            severidad: 'Advertencia',
            esAnomala: (l) => fueraDeRango(l.humedad_relativa, area.umbral_hr_min, area.umbral_hr_max),
            crearMensaje: (l) => `Humedad relativa ${l.humedad_relativa} fuera de rango [${area.umbral_hr_min}-${area.umbral_hr_max}]`,
            promedioEsAnomalo: (ls) => promedioFueraDeRango(ls, 'humedad_relativa', area.umbral_hr_min, area.umbral_hr_max),
            crearMensajePromedio: (ls) => { const avg = promedio(ls, 'humedad_relativa'); return `Promedio humedad relativa últimas 6 lecturas: ${avg} fuera de rango [${area.umbral_hr_min}-${area.umbral_hr_max}]`; },
        },
        {
            tipo: 'Viento Fuera de Rango',
            tipoPromedio: 'Viento Promedio Fuera de Rango',
            severidad: 'Advertencia',
            esAnomala: (l) => fueraDeRango(l.velocidad_viento, area.umbral_viento_min, area.umbral_viento_max),
            crearMensaje: (l) => `Viento ${l.velocidad_viento} fuera de rango [${area.umbral_viento_min}-${area.umbral_viento_max}]`,
            promedioEsAnomalo: (ls) => promedioFueraDeRango(ls, 'velocidad_viento', area.umbral_viento_min, area.umbral_viento_max),
            crearMensajePromedio: (ls) => { const avg = promedio(ls, 'velocidad_viento'); return `Promedio viento últimas 6 lecturas: ${avg} fuera de rango [${area.umbral_viento_min}-${area.umbral_viento_max}]`; },
        },
        {
            tipo: 'NDVI Fuera de Rango',
            tipoPromedio: 'NDVI Promedio Fuera de Rango',
            severidad: 'Informativa',
            esAnomala: (l) => Number.isFinite(Number(l.ndvi)) && fueraDeRango(l.ndvi, area.umbral_ndvi_min, area.umbral_ndvi_max),
            crearMensaje: (l) => `NDVI ${l.ndvi} fuera de rango [${area.umbral_ndvi_min}-${area.umbral_ndvi_max}]`,
            promedioEsAnomalo: (ls) => {
                const vals = ls.slice(0, 6).map(l => Number(l.ndvi)).filter(Number.isFinite);
                if (vals.length < 6) return false;
                const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
                return avg < Number(area.umbral_ndvi_min) || avg > Number(area.umbral_ndvi_max);
            },
            crearMensajePromedio: (ls) => { const avg = promedio(ls, 'ndvi'); return `Promedio NDVI últimas 6 lecturas: ${avg} fuera de rango [${area.umbral_ndvi_min}-${area.umbral_ndvi_max}]`; },
        },
        {
            tipo: 'Flujo de Riego Fuera de Rango',
            tipoPromedio: 'Flujo de Riego Promedio Fuera de Rango',
            severidad: 'Advertencia',
            esAnomala: (l) => {
                const f = Number(l.flujo_riego);
                if (!Number.isFinite(f) || f <= 0) return false;
                return fueraDeRango(f, area.umbral_flujo_min, area.umbral_flujo_max);
            },
            crearMensaje: (l) => `Flujo ${l.flujo_riego} fuera de rango [${area.umbral_flujo_min}-${area.umbral_flujo_max}]`,
            promedioEsAnomalo: (ls) => {
                const vals = ls.slice(0, 6).map(l => Number(l.flujo_riego)).filter(v => Number.isFinite(v) && v > 0);
                // Solo evaluar promedio si al menos 4 de las 6 lecturas tienen riego activo
                if (vals.length < 4) return false;
                const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
                return avg < Number(area.umbral_flujo_min) || avg > Number(area.umbral_flujo_max);
            },
            crearMensajePromedio: (ls) => { const avg = promedio(ls, 'flujo_riego'); return `Promedio flujo últimas 6 lecturas: ${avg} fuera de rango [${area.umbral_flujo_min}-${area.umbral_flujo_max}]`; },
        },
        {
            tipo: 'Radiación Fuera de Rango',
            tipoPromedio: 'Radiación Promedio Fuera de Rango',
            severidad: 'Advertencia',
            esAnomala: (l) => fueraDeRango(l.radiacion_solar, area.umbral_radiacion_min, area.umbral_radiacion_max),
            crearMensaje: (l) => `Radiación ${l.radiacion_solar} fuera de rango [${area.umbral_radiacion_min}-${area.umbral_radiacion_max}]`,
            promedioEsAnomalo: (ls) => promedioFueraDeRango(ls, 'radiacion_solar', area.umbral_radiacion_min, area.umbral_radiacion_max),
            crearMensajePromedio: (ls) => { const avg = promedio(ls, 'radiacion_solar'); return `Promedio radiación últimas 6 lecturas: ${avg} fuera de rango [${area.umbral_radiacion_min}-${area.umbral_radiacion_max}]`; },
        },
    ];
}

function promedio(lecturas, campo) {
    const vals = lecturas.slice(0, 6).map(l => Number(l[campo])).filter(Number.isFinite);
    if (!vals.length) return 0;
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
}

module.exports = router;