const express = require('express');
const cors = require('cors');
const { getConnection } = require('./db');
const sql = require('mssql');

const app = express();
app.use(cors());
app.use(express.json());

// 🔹 Ruta base
app.get('/', (req, res) => {
  res.send('API funcionando');
});

// 🔹 Endpoint POST (Guardar)
app.post('/api/pacientes', async (req, res) => {
  try {
    const p = req.body;
    const pool = await getConnection();

    if (!pool) return res.status(500).json({ error: 'Error conexión BD' });

    // 1. Buscamos el ID numérico del usuario usando el firebase_uid que viene de Angular
    const userResult = await pool.request()
      .input('firebaseUid', sql.VarChar, p.ownerId)
      .query('SELECT id FROM usuarios WHERE firebase_uid = @firebaseUid');

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado en SQL Server' });
    }

    const userIdNumerico = userResult.recordset[0].id;

    // 2. Insertamos el paciente con los nombres de columna exactos de tu captura
    await pool.request()
      .input('nombre', sql.VarChar, p.nombre)
      .input('apellidos', sql.VarChar, p.apellidos)
      .input('fechaNac', sql.Date, p.fechaNacimiento)
      .input('correo', sql.VarChar, p.correoElectronico)
      .input('domicilio', sql.VarChar, p.domicilio)
      .input('usuarioId', sql.Int, userIdNumerico) // Usamos el ID numérico (1, 2, etc.)
      .query(`
        INSERT INTO pacientes (nombre, apellidos, fecha_nacimiento, correo_electronico, domicilio, usuario_id)
        VALUES (@nombre, @apellidos, @fechaNac, @correo, @domicilio, @usuarioId)
      `);

    res.status(201).json({ message: 'Paciente guardado en SQL Server' });
  } catch (error) {
    console.error('Error al insertar:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 🔹 Endpoint GET (Estadísticas)
app.get('/api/estadisticas/pacientes', async (req, res) => {
  try {
    const pool = await getConnection();
    if (!pool) return res.status(500).json({ error: 'Error conexión BD' });

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