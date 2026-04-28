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
const DEFAULT_INTERVAL_MS = 300000;
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

  const humedadSuelo = clamp(26 + wave * 8 + randomInRange(-1.5, 1.5), 5, 55);
  const temperaturaSuelo = clamp(22 + wave * 4 + randomInRange(-1.2, 1.2), 5, 45);
  const temperaturaAmbiental = clamp(27 + wave * 7 + randomInRange(-2, 2), 10, 45);
  const humedadRelativa = clamp(50 - wave * 12 + randomInRange(-4, 4), 20, 95);
  const radiacionSolar = clamp(650 + wave * 260 + randomInRange(-30, 30), 0, 1300);

  const estatusRiego = humedadSuelo < 18;
  const flujoRiego = estatusRiego ? clamp(10 + randomInRange(-1, 2), 0, 20) : 0;

  return {
    id_area: areaId,
    humedad_suelo: round(humedadSuelo, 2),
    potencial_hidrico: round(clamp(-0.08 + wave * 0.03 + randomInRange(-0.01, 0.01), -1.2, -0.01), 3),
    electroconductividad: round(clamp(1.2 + randomInRange(-0.2, 0.2), 0.2, 4), 2),
    temperatura_suelo: round(temperaturaSuelo, 2),
    ndvi: round(clamp(0.65 + wave * 0.08 + randomInRange(-0.03, 0.03), 0.2, 0.95), 3),
    estatus_riego: estatusRiego,
    flujo_riego: round(flujoRiego, 2),
    temperatura_ambiental: round(temperaturaAmbiental, 2),
    humedad_relativa: round(humedadRelativa, 2),
    velocidad_viento: round(clamp(7 + randomInRange(-2, 2), 0, 25), 2),
    radiacion_solar: round(radiacionSolar, 2),
    evapotranspiracion: round(clamp(3.8 + wave * 1.2 + randomInRange(-0.4, 0.4), 0, 10), 2),
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
