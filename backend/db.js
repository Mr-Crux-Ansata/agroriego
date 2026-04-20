const sql = require('mssql'); // <--- Solo UNA vez aquí arriba
require('dotenv').config();

function getRequiredEnv(name) {
    const value = process.env[name];
    if (!value || !String(value).trim()) {
        throw new Error(`Falta la variable de entorno ${name}. Configura backend/.env usando backend/.env.example`);
    }
    return value;
}

const config = {
    user: getRequiredEnv('DB_USER'),
    password: getRequiredEnv('DB_PASSWORD'),
    server: getRequiredEnv('DB_SERVER'),
    database: getRequiredEnv('DB_DATABASE'),
    port: Number(process.env.DB_PORT || 1433),
    options: {
        encrypt: false, 
        trustServerCertificate: true 
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