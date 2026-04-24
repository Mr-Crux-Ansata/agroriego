const router = require('express').Router();
const { getPool, sql } = require('../db');
const { verificarToken } = require('../middleware/auth');

const REQUIRED_COLUMNS = [
  'fecha_hora',
  'humedad_suelo',
  'potencial_hidrico',
  'electroconductividad',
  'temperatura_suelo',
  'estatus_riego',
  'flujo_riego',
  'temperatura_ambiental',
  'humedad_relativa',
  'velocidad_viento',
  'radiacion_solar',
  'evapotranspiracion',
];

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');
}

function splitCsvLine(line, delimiter) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      const nextChar = line[i + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

function parseNumber(value, label) {
  const raw = String(value ?? '').trim();
  if (!raw.length) {
    throw new Error(`Valor numerico faltante en ${label}`);
  }

  const parsed = Number(raw.replace(',', '.'));
  if (!Number.isFinite(parsed)) {
    throw new Error(`Numero invalido en ${label}: ${raw}`);
  }

  return parsed;
}

function parseDate(value) {
  const raw = String(value ?? '').trim();
  if (!raw.length) {
    throw new Error('fecha_hora vacia');
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`fecha_hora invalida: ${raw}`);
  }

  return date;
}

function parseBool(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw.length) {
    return false;
  }

  return ['1', 'true', 'si', 'sí', 'on', 'encendido', 'activo'].includes(raw);
}

router.post('/importar-csv', verificarToken, async (req, res) => {
  const { csvContent, areaId } = req.body || {};

  if (!csvContent || typeof csvContent !== 'string') {
    return res.status(400).json({ error: 'csvContent es requerido y debe ser texto CSV' });
  }

  const lines = csvContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return res.status(400).json({ error: 'El CSV debe incluir encabezados y al menos una fila de datos' });
  }

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const rawHeaders = splitCsvLine(lines[0], delimiter);
  const headers = rawHeaders.map(normalizeHeader);

  const missingColumns = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
  if (missingColumns.length > 0) {
    return res.status(400).json({
      error: `Faltan columnas requeridas: ${missingColumns.join(', ')}`,
    });
  }

  const hasAreaColumn = headers.includes('id_area');
  if (!hasAreaColumn && !String(areaId ?? '').trim()) {
    return res.status(400).json({
      error: 'Debes incluir la columna id_area en el CSV o enviar areaId en la peticion',
    });
  }

  const headerIndex = Object.fromEntries(headers.map((name, idx) => [name, idx]));

  try {
    const pool = await getPool();
    const inserted = [];
    const failed = [];

    for (let i = 1; i < lines.length; i += 1) {
      const lineNumber = i + 1;
      const cols = splitCsvLine(lines[i], delimiter);
      const rowAreaId = hasAreaColumn
        ? String(cols[headerIndex.id_area] ?? '').trim()
        : String(areaId ?? '').trim();

      if (!rowAreaId) {
        failed.push({ line: lineNumber, error: 'id_area vacio' });
        continue;
      }

      try {
        const areaExists = await pool.request()
          .input('id_area', sql.VarChar, rowAreaId)
          .query('SELECT TOP 1 id_area FROM AreaRiego WHERE id_area = @id_area');

        if (!areaExists.recordset.length) {
          throw new Error(`Area no existe: ${rowAreaId}`);
        }

        const fechaHora = parseDate(cols[headerIndex.fecha_hora]);
        const humedadSuelo = parseNumber(cols[headerIndex.humedad_suelo], 'humedad_suelo');
        const potencialHidrico = parseNumber(cols[headerIndex.potencial_hidrico], 'potencial_hidrico');
        const electroconductividad = parseNumber(cols[headerIndex.electroconductividad], 'electroconductividad');
        const temperaturaSuelo = parseNumber(cols[headerIndex.temperatura_suelo], 'temperatura_suelo');
        const ndvi = headers.includes('ndvi') && String(cols[headerIndex.ndvi] ?? '').trim().length
          ? parseNumber(cols[headerIndex.ndvi], 'ndvi')
          : null;
        const estatusRiego = parseBool(cols[headerIndex.estatus_riego]);
        const flujoRiego = parseNumber(cols[headerIndex.flujo_riego], 'flujo_riego');
        const temperaturaAmbiental = parseNumber(cols[headerIndex.temperatura_ambiental], 'temperatura_ambiental');
        const humedadRelativa = parseNumber(cols[headerIndex.humedad_relativa], 'humedad_relativa');
        const velocidadViento = parseNumber(cols[headerIndex.velocidad_viento], 'velocidad_viento');
        const radiacionSolar = parseNumber(cols[headerIndex.radiacion_solar], 'radiacion_solar');
        const evapotranspiracion = parseNumber(cols[headerIndex.evapotranspiracion], 'evapotranspiracion');

        await pool.request()
          .input('id_area', sql.VarChar, rowAreaId)
          .input('fecha_hora', sql.DateTime, fechaHora)
          .input('humedad_suelo', sql.Decimal(5, 2), humedadSuelo)
          .input('potencial_hidrico', sql.Decimal(8, 2), potencialHidrico)
          .input('electroconductividad', sql.Decimal(8, 2), electroconductividad)
          .input('temperatura_suelo', sql.Decimal(5, 2), temperaturaSuelo)
          .input('ndvi', ndvi === null ? sql.Decimal(4, 3) : sql.Decimal(4, 3), ndvi)
          .input('estatus_riego', sql.Bit, estatusRiego ? 1 : 0)
          .input('flujo_riego', sql.Decimal(8, 2), flujoRiego)
          .input('temperatura_ambiental', sql.Decimal(5, 2), temperaturaAmbiental)
          .input('humedad_relativa', sql.Decimal(5, 2), humedadRelativa)
          .input('velocidad_viento', sql.Decimal(6, 2), velocidadViento)
          .input('radiacion_solar', sql.Decimal(8, 2), radiacionSolar)
          .input('evapotranspiracion', sql.Decimal(6, 2), evapotranspiracion)
          .query(`
            INSERT INTO LecturaTelemetria (
              id_area,
              fecha_hora,
              humedad_suelo,
              potencial_hidrico,
              electroconductividad,
              temperatura_suelo,
              ndvi,
              estatus_riego,
              flujo_riego,
              temperatura_ambiental,
              humedad_relativa,
              velocidad_viento,
              radiacion_solar,
              evapotranspiracion
            ) VALUES (
              @id_area,
              @fecha_hora,
              @humedad_suelo,
              @potencial_hidrico,
              @electroconductividad,
              @temperatura_suelo,
              @ndvi,
              @estatus_riego,
              @flujo_riego,
              @temperatura_ambiental,
              @humedad_relativa,
              @velocidad_viento,
              @radiacion_solar,
              @evapotranspiracion
            )
          `);

        inserted.push(lineNumber);
      } catch (lineError) {
        failed.push({ line: lineNumber, error: lineError.message });
      }
    }

    return res.json({
      ok: true,
      total: lines.length - 1,
      inserted: inserted.length,
      failed: failed.length,
      errors: failed.slice(0, 25),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
