const express = require('express');
const admin = require('firebase-admin');
const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
const cors = require('cors');
const { pool } = require('./db'); 

//  Here we initialize our firebase admin credential, which allow us to interact with Firebase services.
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log("Firebase ha sido inicializado correctamente");
}
// We use a "if" to prevent double intialization in case Render restarts the server.

const dbFirebase = admin.firestore();

const app = express();
app.use(cors());
app.use(express.json());

// This is a simple test endpoint to verify that the server is running and can respond to requests.
app.get('/', (req, res) => {
  res.send('API de Pacientes funcionando en Aiven Cloud y sincronizada con Firebase');
});

// This is the endpoint POST it saves patients in PostgreSQL and Firebase database, both are in sync.
app.post('/api/pacientes', async (req, res) => {
  try {
    const p = req.body;
    
    console.log("Nueva petición de guardado de paciente:");
    console.log("Datos recibidos:", p);

    // First we find the user in PostgreSQL using the Firebase UID (ownerId) to get the corresponding numeric user ID.
    const userResult = await pool.query(
      'SELECT id FROM usuarios WHERE uid_firebase = $1', 
      [p.ownerId]
    );

    if (userResult.rows.length === 0) {
      console.error("ERROR: No existe usuario en DB con UID:", p.ownerId);
      return res.status(404).json({ error: 'Usuario no encontrado en la base de datos de Firebase' });
    }

    const userIdNumerico = userResult.rows[0].id;

    // Here we extract the data from the form, we cover different possible field names to be flexible with the frontend used.
    const nombre = p.nombre;
    const apellidos = p.apellidos;
    const fecha = p.fechaNacimiento || p.fecha_nacimiento; 
    const email = p.correoElectronico || p.correo_electronico || p.correo;
    const domicilio = p.domicilio;

    // This part is the insertion in PostgreSQL, we use parameterized queries to prevent SQL injection and ensure data integrity.
    const insertQuery = `
      INSERT INTO pacientes (nombre, apellidos, fecha_nacimiento, correo_electronico, domicilio, usuario_id)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
    `;
    
    const values = [nombre, apellidos, fecha, email, domicilio, userIdNumerico];
    const pgRes = await pool.query(insertQuery, values);
    const newIdPostgres = pgRes.rows[0].id;
    
    console.log("✅ Guardado en Postgres. ID:", newIdPostgres);

    // This will insert the same patient data into Firebase DB, including the reference to the PostgreSQL ID for cross-referencing.
    await dbFirebase.collection('pacientes').add({
      nombre: nombre,
      apellidos: apellidos,
      fechaNacimiento: fecha,
      correoElectronico: email,
      domicilio: domicilio,
      ownerId: p.ownerId, 
      postgresId: newIdPostgres,
      fechaRegistro: new Date().toISOString()
    });

    console.log("✅ Sincronizado con Firebase Firestore");
    
    res.status(201).json({ 
      message: 'Paciente guardado y sincronizado exitosamente',
      idPostgres: newIdPostgres 
    });

  } catch (error) {
    console.error('❌ Error en el proceso de guardado:', error.message);
    res.status(500).json({ 
      error: 'Error interno en el servidor',
      details: error.message 
    });
  }
});

// Endpoint GET of our API that provides statistics of patients, in this case total of patients and average age.
app.get('/api/estadisticas/pacientes', async (req, res) => {
  try {
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

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});