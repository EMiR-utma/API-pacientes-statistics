// This is the database code adapted for Aiven PostgreSQL
require('dotenv').config();
const { Pool } = require('pg');

// We create a single pool instance that will be shared across the app.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // This is often required for cloud databases like Aiven to not be rejected due to SSL issues
  }
});

// Function to get a database connection, in this case we return the pool since it manages connections internally.
// but we can still have this function for consistency and future flexibility if we want to add connection pooling logic or error handling.
async function getConnection() {
  try {
    return pool;
  } catch (error) {
    console.error('Error de conexión con Aiven:', error);
  }
}
// This module exports the getConnection function and the pool instance, so other parts of the app can use them to interact with the database.
module.exports = { getConnection, pool };