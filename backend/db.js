const sql = require('mssql'); // <--- Solo UNA vez aquí arriba
require('dotenv').config();

function getRequiredEnv(name) {
    const value = process.env[name];
    if (!value || !String(value).trim()) {
        throw new Error(`Falta la variable de entorno ${name}. Configura backend/.env usando backend/.env.example`);
    }
    return value;
}

// Parsear .\SQLEXPRESS → server=localhost, instanceName=SQLEXPRESS
const rawServer = getRequiredEnv('DB_SERVER');
const [serverHostRaw, instanceName] = rawServer.includes('\\')
    ? rawServer.split('\\', 2)
    : [rawServer, undefined];
const serverHost = (serverHostRaw === '.' || serverHostRaw === '(local)')
    ? 'localhost'
    : serverHostRaw;

const isLocalServer = ['localhost', '127.0.0.1'].includes((serverHost || '').toLowerCase());
const dbPort = Number(process.env.DB_PORT || 1433);

const config = {
    user:     getRequiredEnv('DB_USER'),
    password: getRequiredEnv('DB_PASSWORD'),
    server:   serverHost,
    database: getRequiredEnv('DB_DATABASE'),
    connectionTimeout: Number(process.env.DB_CONNECTION_TIMEOUT || 60000),
    requestTimeout:    Number(process.env.DB_REQUEST_TIMEOUT    || 60000),
    // Al usar instanceName, mssql descubre el puerto vía SQL Browser (no se pasa port)
    ...(instanceName ? {} : { port: dbPort }),
    options: {
        ...(instanceName ? { instanceName } : {}),
        encrypt: process.env.DB_ENCRYPT
            ? process.env.DB_ENCRYPT === 'true'
            : !isLocalServer,
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE
            ? process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
            : isLocalServer,
    },
};

let pool;

async function getPool() {
    try {
        if (!pool) {
            console.log('⏳ Intentando conectar a SQL Server...');
            pool = await sql.connect(config);
            console.log('✅ Conectado a SQL Server con éxito');
        }
        return pool;
    } catch (err) {
        console.error('❌ Error crítico al conectar a la DB:', err.message);
        pool = null; 
        throw err;
    }
}

module.exports = { getPool, sql }; // <--- Asegúrate de que esto esté al final