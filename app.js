const express = require('express');
const cors = require('cors');
const { getConnection } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// 🔹 Ruta base (solo prueba)
app.get('/', (req, res) => {
  res.send('API funcionando');
});

// 🔹 Endpoint REAL
app.get('/estadisticas/pacientes', async (req, res) => {
  try {
    const pool = await getConnection();

    if (!pool) {
      return res.status(500).json({ error: 'Error conexión BD' });
    }

    const result = await pool.request().query(`
      SELECT 
        COUNT(*) AS total_pacientes,
        AVG(DATEDIFF(YEAR, fecha_nacimiento, GETDATE())) AS edad_promedio
      FROM pacientes;
    `);

    res.json(result.recordset[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});