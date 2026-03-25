const express = require('express');
const cors = require('cors');
const { pool } = require('./db'); // Importamos el pool desde db.js

const app = express();
app.use(cors());
app.use(express.json());

// 🔹 Ruta base para verificar que el servidor vive
app.get('/', (req, res) => {
  res.send('API de Pacientes funcionando en Aiven Cloud');
});

// 🔹 Endpoint POST (Guardar Paciente)
app.post('/api/pacientes', async (req, res) => {
  try {
    const p = req.body;
    
    // Log para depurar qué está enviando Angular exactamente
    console.log("--- Nueva petición de guardado ---");
    console.log("Datos recibidos:", p);

    // 1. Buscamos el ID numérico del usuario usando su UID de Firebase
    const userResult = await pool.query(
      'SELECT id FROM usuarios WHERE uid_firebase = $1', 
      [p.ownerId]
    );

    // Si no encontramos al usuario, detenemos el proceso
    if (userResult.rows.length === 0) {
      console.error("ERROR: No existe usuario en DB con UID:", p.ownerId);
      return res.status(404).json({ error: 'Usuario no encontrado en la base de datos' });
    }

    const userIdNumerico = userResult.rows[0].id;
    console.log("Usuario identificado. ID numérico:", userIdNumerico);

    // 2. Mapeo flexible de variables
    // Esto asegura que si Angular manda 'fechaNacimiento' o 'fecha_nacimiento', el valor se capture.
    const nombre = p.nombre;
    const apellidos = p.apellidos;
    const fecha = p.fechaNacimiento || p.fecha_nacimiento; 
    const email = p.correoElectronico || p.correo_electronico || p.correo;
    const domicilio = p.domicilio;

    // 3. Inserción en la tabla 'pacientes'
    const insertQuery = `
      INSERT INTO pacientes (nombre, apellidos, fecha_nacimiento, correo_electronico, domicilio, usuario_id)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    
    const values = [nombre, apellidos, fecha, email, domicilio, userIdNumerico];

    await pool.query(insertQuery, values);
    
    console.log("✅ Paciente guardado correctamente para el usuario:", userIdNumerico);
    res.status(201).json({ message: 'Paciente guardado exitosamente en la nube' });

  } catch (error) {
    // Si hay un error, lo imprimimos completo en Render para debuguear
    console.error('❌ Error detallado al insertar:', error.message);
    
    // Enviamos el mensaje de error real a Angular para verlo en la consola del navegador
    res.status(500).json({ 
      error: 'Error interno en el servidor',
      details: error.message 
    });
  }
});

// 🔹 Endpoint GET (Estadísticas)
app.get('/api/estadisticas/pacientes', async (req, res) => {
  try {
    // Cálculo de estadísticas usando funciones nativas de PostgreSQL
    const query = `
      SELECT 
        COUNT(*) AS total_pacientes,
        ROUND(AVG(EXTRACT(YEAR FROM AGE(NOW(), fecha_nacimiento)))::numeric, 1) AS edad_promedio
      FROM pacientes;
    `;
    
    const result = await pool.query(query);
    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error en estadísticas:', error.message);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// Configuración del puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT} conectado a Aiven`);
});