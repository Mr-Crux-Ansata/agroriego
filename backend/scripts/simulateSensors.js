/*
  Simulador de sensores IoT.
  Envia lecturas periodicas al endpoint de telemetria del backend.

  Uso rapido:
    npm run simulate:sensors

  Variables opcionales:
    SIM_BASE_URL=http://192.168.1.20:3001/api
    SIM_INTERVAL_MS=300000
    SIM_AREAS=AR-001,AR-002,AR-003
*/

const DEFAULT_BASE_URL = 'http://localhost:3001/api';
const DEFAULT_INTERVAL_MS = 600000;
const DEFAULT_AREAS = ['AR-001', 'AR-002', 'AR-003', 'AR-004', 'AR-005'];

function parseArgs(argv) {
  const args = {};

  for (let i = 0; i < argv.length; i += 1) {
    const part = argv[i];
    if (!part.startsWith('--')) continue;

    const key = part.slice(2);
    const next = argv[i + 1];

    if (next && !next.startsWith('--')) {
      args[key] = next;
      i += 1;
    } else {
      args[key] = 'true';
    }
  }

  return args;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function buildSample(areaId, tick) {
  const wave = Math.sin((tick % 360) * (Math.PI / 180));

  // Mantener valores dentro de rangos agronomicos tipicos para evitar picos irreales.
  const humedadSuelo = clamp(25 + wave * 5 + randomInRange(-1.2, 1.2), 10, 40);
  const temperaturaSuelo = clamp(22 + wave * 3 + randomInRange(-1, 1), 10, 35);
  const temperaturaAmbiental = clamp(27 + wave * 5 + randomInRange(-1.5, 1.5), 10, 40);
  const humedadRelativa = clamp(55 - wave * 10 + randomInRange(-3, 3), 20, 90);
  const radiacionSolar = clamp(600 + wave * 220 + randomInRange(-25, 25), 100, 1000);

  const estatusRiego = humedadSuelo < 16;
  const flujoRiego = estatusRiego ? round(clamp(180 + randomInRange(-60, 120), 10, 1000), 2) : 0;

  return {
    id_area: areaId,
    humedad_suelo: round(humedadSuelo, 2),
    potencial_hidrico: round(clamp(-180 + wave * 70 + randomInRange(-20, 20), -1500, -10), 2),
    electroconductividad: round(clamp(1.2 + randomInRange(-0.2, 0.2), 0.2, 4), 2),
    temperatura_suelo: round(temperaturaSuelo, 2),
    ndvi: round(clamp(0.7 + wave * 0.06 + randomInRange(-0.02, 0.02), 0.2, 0.9), 3),
    estatus_riego: estatusRiego,
    flujo_riego: flujoRiego,
    temperatura_ambiental: round(temperaturaAmbiental, 2),
    humedad_relativa: round(humedadRelativa, 2),
    velocidad_viento: round(clamp(3.5 + randomInRange(-1.5, 1.5), 0, 10), 2),
    radiacion_solar: round(radiacionSolar, 2),
    evapotranspiracion: round(clamp(4.6 + wave * 1.4 + randomInRange(-0.3, 0.3), 2, 8), 2),
  };
}

async function sendTelemetry(baseUrl, payload) {
  const res = await fetch(`${baseUrl}/telemetria`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(json)}`);
  }

  return json;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const baseUrl = args.baseUrl || process.env.SIM_BASE_URL || DEFAULT_BASE_URL;
  const intervalMs = Number(args.intervalMs || process.env.SIM_INTERVAL_MS || DEFAULT_INTERVAL_MS);
  const areas = (args.areas || process.env.SIM_AREAS || DEFAULT_AREAS.join(','))
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

  if (!Number.isFinite(intervalMs) || intervalMs < 1000) {
    throw new Error('SIM_INTERVAL_MS o --intervalMs debe ser un numero >= 1000');
  }

  if (!areas.length) {
    throw new Error('Debes especificar al menos un id_area en SIM_AREAS o --areas');
  }

  console.log('Simulador iniciado');
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Intervalo: ${intervalMs} ms`);
  console.log(`Areas: ${areas.join(', ')}`);

  let tick = 0;

  setInterval(async () => {
    tick += 10;

    for (const areaId of areas) {
      const payload = buildSample(areaId, tick);

      try {
        const response = await sendTelemetry(baseUrl, payload);
        console.log(`[${new Date().toISOString()}] ${areaId} OK`, response);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] ${areaId} ERROR`, error.message || error);
      }
    }
  }, intervalMs);
}

main().catch((error) => {
  console.error('No se pudo iniciar el simulador:', error.message || error);
  process.exit(1);
});
