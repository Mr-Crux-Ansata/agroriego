const router = require('express').Router();
const { getPool } = require('../db');
const { verificarToken } = require('../middleware/auth');

router.get('/resumen', verificarToken, async (req, res) => {
    try {
        const pool = await getPool();

        const tableCheck = await pool.request().query(`
            SELECT CASE WHEN OBJECT_ID('ConsumoAgua', 'U') IS NULL THEN 0 ELSE 1 END AS existe;
        `);
        const existeConsumoAgua = Number(tableCheck.recordset[0]?.existe || 0) === 1;

        let usarConsumoAgua = false;
        let fechaConsumo = null;
        if (existeConsumoAgua) {
            const consumoFechaCheck = await pool.request().query(`
                SELECT MAX(CAST(fecha_hora AS DATE)) AS fecha
                FROM ConsumoAgua;
            `);
            fechaConsumo = consumoFechaCheck.recordset[0]?.fecha || null;
            usarConsumoAgua = Boolean(fechaConsumo);
        }

        if (!usarConsumoAgua) {
            const telemetriaFechaCheck = await pool.request().query(`
                SELECT MAX(CAST(fecha_hora AS DATE)) AS fecha
                FROM LecturaTelemetria;
            `);
            fechaConsumo = telemetriaFechaCheck.recordset[0]?.fecha || null;
        }

        const resumenResult = await pool.request().query(`
            ;WITH UltimaLecturaPorArea AS (
                SELECT
                    id_area,
                    temperatura_ambiental,
                    ROW_NUMBER() OVER (PARTITION BY id_area ORDER BY fecha_hora DESC) AS rn
                FROM LecturaTelemetria
            )
            SELECT
                CAST(ISNULL(AVG(CASE WHEN ul.rn = 1 THEN ul.temperatura_ambiental END), 0) AS DECIMAL(10,2)) AS temperatura_actual,
                CAST(0 AS DECIMAL(10,2)) AS consumo_total_hoy
            FROM LecturaTelemetria lt
            LEFT JOIN UltimaLecturaPorArea ul
                ON ul.id_area = lt.id_area
               AND ul.rn = 1;
        `);

        const consumoTotalQuery = usarConsumoAgua
            ? `
                SELECT CAST(ISNULL(SUM(consumo_m3), 0) AS DECIMAL(10,2)) AS consumo_total_hoy
                FROM ConsumoAgua
                WHERE CAST(fecha_hora AS DATE) = @fecha_consumo;
            `
            : `
                SELECT CAST(ISNULL(SUM(CASE
                    WHEN estatus_riego = 1 THEN flujo_riego
                    ELSE 0
                END), 0) AS DECIMAL(10,2)) AS consumo_total_hoy
                FROM LecturaTelemetria
                WHERE CAST(fecha_hora AS DATE) = @fecha_consumo;
            `;

        const consumoHoraQuery = usarConsumoAgua
            ? `
                SELECT
                    RIGHT('0' + CAST(DATEPART(HOUR, fecha_hora) AS VARCHAR(2)), 2) + ':00' AS time,
                    CAST(ISNULL(SUM(consumo_m3), 0) AS DECIMAL(10,2)) AS consumo
                FROM ConsumoAgua
                WHERE CAST(fecha_hora AS DATE) = @fecha_consumo
                GROUP BY DATEPART(HOUR, fecha_hora)
                ORDER BY DATEPART(HOUR, fecha_hora);
            `
            : `
                SELECT
                    RIGHT('0' + CAST(DATEPART(HOUR, fecha_hora) AS VARCHAR(2)), 2) + ':00' AS time,
                    CAST(ISNULL(SUM(CASE WHEN estatus_riego = 1 THEN flujo_riego ELSE 0 END), 0) AS DECIMAL(10,2)) AS consumo
                FROM LecturaTelemetria
                WHERE CAST(fecha_hora AS DATE) = @fecha_consumo
                GROUP BY DATEPART(HOUR, fecha_hora)
                ORDER BY DATEPART(HOUR, fecha_hora);
            `;

        const [consumoTotalResult, consumoHoraResult] = await Promise.all([
            pool.request().input('fecha_consumo', fechaConsumo).query(consumoTotalQuery),
            pool.request().input('fecha_consumo', fechaConsumo).query(consumoHoraQuery),
        ]);

        const resumen = resumenResult.recordset[0] || {
            temperatura_actual: 0,
            consumo_total_hoy: 0,
        };

        const consumoTotalHoy = Number(consumoTotalResult.recordset[0]?.consumo_total_hoy || 0);
        const consumoPorHoraMap = new Map(
            consumoHoraResult.recordset.map((row) => [row.time, Number(row.consumo || 0)])
        );
        const consumoPorHoraCompleto = Array.from({ length: 24 }, (_, hour) => {
            const time = `${String(hour).padStart(2, '0')}:00`;
            return {
                time,
                consumo: consumoPorHoraMap.get(time) ?? 0,
            };
        });

        res.json({
            temperatura_actual: Number(resumen.temperatura_actual || 0),
            consumo_total_hoy: consumoTotalHoy,
            fuente_consumo: usarConsumoAgua ? 'ConsumoAgua' : 'LecturaTelemetria',
            fecha_consumo: fechaConsumo,
            consumo_por_hora: consumoPorHoraCompleto,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;