require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const app = require('./app');

const PORT = Number(process.env.PORT) || 3000;

const server = app.listen(PORT, () => {
  console.log(`Servidor de GameHouse iniciado en http://localhost:${PORT}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`El puerto ${PORT} ya está ocupado. Si GameHouse ya está iniciado, utiliza esa instancia o detenla con Ctrl+C en su terminal antes de volver a ejecutar npm start.`);
  } else {
    console.error('No se pudo iniciar GameHouse:', error.message);
  }
  process.exitCode = 1;
});
