const sql = require('mssql');

const config = {
  server: 'localhost',
  port: 1433,
  database: 'pacientes_api',
  user: 'api_user', // si usas Windows Auth, déjalo vacío
  password: 'ApiUser123!',
  options: {
    trustServerCertificate: true
  }
};

async function getConnection() {
  try {
    const pool = await sql.connect(config);
    return pool;
  } catch (error) {
    console.error('Error de conexión:', error);
  }
}

module.exports = { getConnection };