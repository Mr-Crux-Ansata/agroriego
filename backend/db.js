const sql = require('mssql'); // <--- Solo UNA vez aquí arriba
require('dotenv').config({ override: true });

const rawServer = process.env.DB_SERVER || 'localhost';
const [serverHostRaw, instanceName] = rawServer.includes('\\')
    ? rawServer.split('\\', 2)
    : [rawServer, undefined];

const serverHost = serverHostRaw === '.' ? 'localhost' : serverHostRaw;
const isLocalServer = ['localhost', '127.0.0.1', '(local)'].includes((serverHost || '').toLowerCase());
const dbPort = Number(process.env.DB_PORT || 1433);
const connectionTimeout = Number(process.env.DB_CONNECTION_TIMEOUT || 60000);
const requestTimeout = Number(process.env.DB_REQUEST_TIMEOUT || 60000);

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: serverHost,
    database: process.env.DB_DATABASE,
    connectionTimeout,
    requestTimeout,
    ...(instanceName ? {} : { port: dbPort }),
    options: {
        ...(instanceName ? { instanceName } : {}),
        encrypt: process.env.DB_ENCRYPT
            ? process.env.DB_ENCRYPT === 'true'
            : !isLocalServer,
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE
            ? process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
            : isLocalServer
    }
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