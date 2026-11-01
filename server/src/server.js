require('dotenv').config();
const http = require('http');
const app = require('./app');
const sequelize = require('./config/db');
const { initSockets } = require('./sockets');

const server = http.createServer(app);
initSockets(server); // Socket.io usi server par chalta hai
const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('MySQL connected');

    await sequelize.sync();

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
}

start();