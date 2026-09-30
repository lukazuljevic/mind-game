import { randomUUID } from 'crypto';
import { Server, Socket } from 'socket.io';
import { gameManager } from '../game/gameManager';
import { ClientToServerEvents, ServerToClientEvents, SocketData } from '../types';

type GameServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

const RECONNECT_GRACE_MS = 60 * 1000;
const MISTAKE_DELAY_MS = 2000;
const LEVEL_COMPLETE_DELAY_MS = 1500;
const MAX_NAME_LENGTH = 20;

function cleanName(name: unknown): string | null {
  if (typeof name !== 'string') return null;
  const trimmed = name.trim().slice(0, MAX_NAME_LENGTH);
  return trimmed || null;
}

export function setupSocketHandlers(io: GameServer): void {
  // playerId -> id of the socket currently representing that player
  const playerSockets = new Map<string, string>();
  const disconnectTimers = new Map<string, NodeJS.Timeout>();

  const broadcastRoomList = () => {
    io.emit('rooms-list', { rooms: gameManager.getAllRooms() });
  };

  const clearDisconnectTimer = (playerId: string) => {
    const timer = disconnectTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      disconnectTimers.delete(playerId);
    }
  };

  const removePlayer = (playerId: string) => {
    clearDisconnectTimer(playerId);
    const current = gameManager.getRoomByPlayerId(playerId);
    if (!current) return;

    const code = current.code;
    const socketId = playerSockets.get(playerId);
    if (socketId) io.sockets.sockets.get(socketId)?.leave(code);

    const { room, playerName, newHost, gameEnded } = gameManager.leaveRoom(code, playerId);
    if (room) {
      io.to(code).emit('player-left', { room, playerName, newHostName: newHost?.name });
      if (gameEnded) {
        io.to(code).emit('game-over', { room, won: false });
      }
    }
    broadcastRoomList();
  };

  // Clients send a persistent playerId so a reload or a brief network drop keeps their seat
  io.use((socket, next) => {
    const { playerId } = socket.handshake.auth ?? {};
    socket.data.playerId =
      typeof playerId === 'string' && playerId.length > 0 && playerId.length <= 64 ? playerId : randomUUID();
    next();
  });

  io.on('connection', (socket: GameSocket) => {
    const playerId = socket.data.playerId;
    console.log(`Player connected: ${playerId} (${socket.id})`);

    // A newer tab or connection for the same player takes over
    const previousSocketId = playerSockets.get(playerId);
    playerSockets.set(playerId, socket.id);
    if (previousSocketId && previousSocketId !== socket.id) {
      io.sockets.sockets.get(previousSocketId)?.disconnect(true);
    }
    clearDisconnectTimer(playerId);

    const existingRoom = gameManager.setConnected(playerId, true);
    if (existingRoom) {
      socket.join(existingRoom.code);
      socket.to(existingRoom.code).emit('game-state-sync', { room: existingRoom });
    }
    socket.emit('session', { room: existingRoom ?? null });
    socket.emit('rooms-list', { rooms: gameManager.getAllRooms() });

    const myRoom = () => gameManager.getRoomByPlayerId(playerId);

    socket.on('create-room', ({ playerName }) => {
      const name = cleanName(playerName);
      if (!name) {
        socket.emit('error', { message: 'Please enter a name' });
        return;
      }

      if (myRoom()) removePlayer(playerId);

      const room = gameManager.createRoom(playerId, name);
      socket.join(room.code);
      socket.emit('room-joined', { room });
      console.log(`Room ${room.code} created by ${name}`);

      broadcastRoomList();
    });

    socket.on('join-room', ({ roomCode, playerName }) => {
      const name = cleanName(playerName);
      const code = typeof roomCode === 'string' ? roomCode.trim().toUpperCase() : '';
      if (!name || !code) {
        socket.emit('error', { message: 'Please enter a name and room code' });
        return;
      }

      const current = myRoom();
      if (current?.code === code) {
        socket.emit('room-joined', { room: current });
        return;
      }
      if (current) removePlayer(playerId);

      const result = gameManager.joinRoom(code, playerId, name);
      if ('error' in result) {
        socket.emit('error', { message: result.error });
        return;
      }

      const { room } = result;
      socket.join(room.code);
      socket.emit('room-joined', { room });
      const player = room.players.find((p) => p.id === playerId)!;
      socket.to(room.code).emit('player-joined', { room, player });
      console.log(`${name} joined room ${room.code}`);

      broadcastRoomList();
    });

    socket.on('start-game', () => {
      const room = myRoom();
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      if (room.hostId !== playerId) {
        socket.emit('error', { message: 'Only the host can start the game' });
        return;
      }

      if (room.players.length < 2) {
        socket.emit('error', { message: 'Need at least 2 players to start' });
        return;
      }

      const startedRoom = gameManager.startGame(room.code);
      if (startedRoom) {
        io.to(room.code).emit('game-started', { room: startedRoom });
        console.log(`Game started in room ${room.code}`);
        broadcastRoomList();
      }
    });

    socket.on('player-ready', () => {
      const room = myRoom();
      if (!room) return;

      const result = gameManager.markReady(room.code, playerId);
      if (result) {
        io.to(room.code).emit('game-state-sync', { room: result.room });
      }
    });

    socket.on('play-card', () => {
      const current = myRoom();
      if (!current) return;
      const code = current.code;

      // Silently ignore plays while locked (e.g. a double tap during a transition)
      const result = gameManager.playCard(code, playerId);
      if (!result) return;

      const { room, card, lostCards } = result;
      io.to(code).emit('card-played', { room, playerId, card });

      if (lostCards.length > 0) {
        io.to(code).emit('life-lost', { room, playerId, playedCard: card, lostCards });
        gameManager.scheduleRoomTimer(code, () => {
          const resetRoom = gameManager.resetLevel(code);
          if (resetRoom) io.to(code).emit('game-state-sync', { room: resetRoom });
        }, MISTAKE_DELAY_MS);
      } else if (result.levelComplete) {
        const completedLevel = room.state.level;
        gameManager.scheduleRoomTimer(code, () => {
          const nextLevelRoom = gameManager.advanceLevel(code);
          if (nextLevelRoom) io.to(code).emit('level-complete', { room: nextLevelRoom, completedLevel });
        }, LEVEL_COMPLETE_DELAY_MS);
      } else if (result.gameWon) {
        io.to(code).emit('game-over', { room, won: true });
      }
    });

    socket.on('return-to-lobby', () => {
      const room = myRoom();
      if (!room || room.hostId !== playerId) return;

      const lobbyRoom = gameManager.returnToLobby(room.code);
      if (lobbyRoom) {
        io.to(room.code).emit('game-state-sync', { room: lobbyRoom });
        broadcastRoomList();
      }
    });

    socket.on('leave-room', () => {
      removePlayer(playerId);
    });

    socket.on('disconnect', () => {
      console.log(`Player disconnected: ${playerId} (${socket.id})`);

      // Ignore disconnects from sockets that were already replaced by a newer connection
      if (playerSockets.get(playerId) !== socket.id) return;
      playerSockets.delete(playerId);

      const room = gameManager.setConnected(playerId, false);
      if (!room) return;

      io.to(room.code).emit('game-state-sync', { room });
      disconnectTimers.set(playerId, setTimeout(() => {
        disconnectTimers.delete(playerId);
        console.log(`Player ${playerId} did not reconnect, removing from room ${room.code}`);
        removePlayer(playerId);
      }, RECONNECT_GRACE_MS));
    });
  });
}
