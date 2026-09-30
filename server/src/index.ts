import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { setupSocketHandlers } from './socket/socketHandlers';
import { ClientToServerEvents, ServerToClientEvents, SocketData } from './types';
import path from 'path';

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(httpServer, {
  cors: {
    origin: "*",
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../static')));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA fallback (Express 4 wildcard syntax)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/socket.io')) return next();
  res.sendFile(path.join(__dirname, '../static/index.html'));
});

setupSocketHandlers(io);

const PORT = 9998;

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
