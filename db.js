require('dotenv').config();
const { Pool } = require('pg');

// Creamos un "Pool" de conexiones, que es más eficiente para apps en la nube
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Esto es OBLIGATORIO para que Aiven no te rechace
  }
});

// Función para obtener una conexión (mantengo el nombre para que no rompas app.js)
async function getConnection() {
  try {
    // En pg, el pool maneja las conexiones automáticamente, 
    // pero retornamos el pool para que tus consultas sigan funcionando.
    return pool;
  } catch (error) {
    console.error('Error de conexión con Aiven:', error);
  }
}

module.exports = { getConnection, pool };