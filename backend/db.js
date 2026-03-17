const sql = require('mssql'); // <--- Solo UNA vez aquí arriba
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    port: 1433,
    options: {
        encrypt: true, // ¡ESTO ES OBLIGATORIO PARA AZURE!
        trustServerCertificate: false // Para producción en Azure debe ser false
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