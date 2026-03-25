const express = require('express');
const cors = require('cors');
const { pool } = require('./db'); // Importamos el pool que definimos en db.js

const app = express();
app.use(cors());
app.use(express.json());

// 🔹 Ruta base
app.get('/', (req, res) => {
  res.send('API funcionando en Aiven Cloud');
});

// 🔹 Endpoint POST (Guardar)
app.post('/api/pacientes', async (req, res) => {
  try {
    const p = req.body;

    // 1. Buscamos el ID del usuario usando el firebase_uid (Postgres usa $1 para parámetros)
    const userResult = await pool.query(
      'SELECT id FROM usuarios WHERE uid_firebase = $1', 
      [p.ownerId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado en Aiven' });
    }

    const userIdNumerico = userResult.rows[0].id;

    // 2. Insertamos el paciente (Sintaxis Postgres)
    const insertQuery = `
      INSERT INTO pacientes (nombre, apellidos, fecha_nacimiento, correo_electronico, domicilio, usuario_id)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    const values = [p.nombre, p.apellidos, p.fechaNacimiento, p.correoElectronico, p.domicilio, userIdNumerico];

    await pool.query(insertQuery, values);

    res.status(201).json({ message: 'Paciente guardado exitosamente en la nube' });
  } catch (error) {
    console.error('Error al insertar:', error);
    res.status(500).json({ error: 'Error interno en Aiven' });
  }
});

// 🔹 Endpoint GET (Estadísticas)
app.get('/api/estadisticas/pacientes', async (req, res) => {
  try {
    // Postgres usa EXTRACT y AGE para calcular edades
    const query = `
      SELECT 
        COUNT(*) AS total_pacientes,
        ROUND(AVG(EXTRACT(YEAR FROM AGE(NOW(), fecha_nacimiento)))::numeric, 1) AS edad_promedio
      FROM pacientes;
    `;
    
    const result = await pool.query(query);

    // En pg, los resultados vienen en .rows
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error en estadísticas:', error);
    res.status(500).json({ error: 'Error en el servidor de Aiven' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT} conectado a Aiven`);
});