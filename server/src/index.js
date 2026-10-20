import http from 'node:http';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import { app } from './app.js';
import { env } from './config/env.js';
import { installMatchSockets } from './sockets/matchSocket.js';

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: env.clientOrigin, credentials: true },
  transports: ['websocket', 'polling'],
  pingInterval: 25000,
  pingTimeout: 20000,
  maxHttpBufferSize: 1e5,
});

installMatchSockets(io);

async function start() {
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 10000 });
  console.log('Connected to MongoDB.');
  server.listen(env.port, () => {
    console.log(`Hand Cricket API + Socket.IO listening at http://localhost:${env.port}`);
  });
}

start().catch((error) => {
  console.error('Server startup failed:', error.message);
  process.exit(1);
});

async function shutdown(signal) {
  console.log(`${signal} received; shutting down…`);
  io.close(async () => {
    try {
      await mongoose.disconnect();
    } finally {
      process.exit(0);
    }
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
