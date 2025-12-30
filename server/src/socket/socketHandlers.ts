import { Server, Socket } from 'socket.io';
import { gameManager } from '../game/gameManager';
import { ClientToServerEvents, ServerToClientEvents } from '../types';

export function setupSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>
): void {
  
  const broadcastRoomList = () => {
    const rooms = gameManager.getAllRooms();
    io.emit('rooms-list', { rooms });
  };

  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    console.log(`Player connected: ${socket.id}`);
    
    socket.emit('rooms-list', { rooms: gameManager.getAllRooms() });

    socket.on('get-rooms', () => {
      socket.emit('rooms-list', { rooms: gameManager.getAllRooms() });
    });

    socket.on('create-room', ({ playerName }) => {
      const room = gameManager.createRoom(socket.id, playerName);
      socket.join(room.code);
      
      const player = gameManager.getPlayer(room, socket.id);
      socket.emit('room-created', { roomCode: room.code, player: player! });
      console.log(`Room ${room.code} created by ${playerName}`);
      
      broadcastRoomList();
    });

    socket.on('join-room', ({ roomCode, playerName }) => {
      const room = gameManager.joinRoom(roomCode.toUpperCase(), socket.id, playerName);
      
      if (!room) {
        socket.emit('error', { message: 'Room not found or game already started' });
        return;
      }

      socket.join(room.code);
      const player = gameManager.getPlayer(room, socket.id);
      
      socket.emit('room-joined', { room });
      socket.to(room.code).emit('player-joined', { player: player! });
      console.log(`${playerName} joined room ${room.code}`);
      
      broadcastRoomList();
    });

    socket.on('start-game', ({ roomCode }) => {
      const room = gameManager.getRoom(roomCode);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      if (room.hostId !== socket.id) {
        socket.emit('error', { message: 'Only the host can start the game' });
        return;
      }

      if (room.players.length < 2) {
        socket.emit('error', { message: 'Need at least 2 players to start' });
        return;
      }

      const startedRoom = gameManager.startGame(roomCode);
      if (startedRoom) {
        io.to(roomCode).emit('game-started', { room: startedRoom });
        console.log(`Game started in room ${roomCode}`);
        
        broadcastRoomList();
      }
    });

    socket.on('play-card', ({ roomCode }) => {
      const result = gameManager.playCard(roomCode, socket.id);
      
      if (!result.success || !result.room) {
        socket.emit('error', { message: 'Cannot play card' });
        return;
      }

      io.to(roomCode).emit('card-played', {
        playerId: socket.id,
        card: result.card!,
        room: result.room,
      });

      if (result.lostLife && result.lostCards) {
        io.to(roomCode).emit('life-lost', {
          room: result.room,
          lostCards: result.lostCards,
        });
        
        // Wait 1.5s before resetting the level
        setTimeout(() => {
          const resetRoom = gameManager.resetLevel(roomCode);
          if (resetRoom) {
            io.to(roomCode).emit('game-state-sync', { room: resetRoom });
          }
        }, 1500);
      }

      if (result.levelComplete) {
        // Wait 1.5s before advancing the level
        setTimeout(() => {
          const nextLevelRoom = gameManager.advanceLevel(roomCode);
          if (nextLevelRoom) {
            io.to(roomCode).emit('level-complete', { room: nextLevelRoom });
          }
        }, 1500);
      }

      if (result.gameWon || result.gameLost) {
        io.to(roomCode).emit('game-over', {
          room: result.room,
          won: result.gameWon ?? false,
        });
      }
    });

    socket.on('leave-room', ({ roomCode }) => {
      handlePlayerLeave(socket, roomCode);
    });

    socket.on('request-sync', ({ roomCode }) => {
      const room = gameManager.getRoom(roomCode);
      if (room) {
        socket.emit('game-state-sync', { room });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Player disconnected: ${socket.id}`);
      
      const room = gameManager.getRoomByPlayerId(socket.id);
      if (room) {
        handlePlayerLeave(socket, room.code);
      }
    });

    function handlePlayerLeave(socket: Socket<ClientToServerEvents, ServerToClientEvents>, roomCode: string) {
      const { room, deleted, newHost } = gameManager.leaveRoom(roomCode, socket.id);
      socket.leave(roomCode);
      
      if (!deleted && room) {
        socket.to(roomCode).emit('player-left', { playerId: socket.id });
        
        if (newHost) {
          io.to(roomCode).emit('host-changed', { 
            newHostId: newHost.id, 
            newHostName: newHost.name 
          });
        }
        
        if (room.state.status === 'lost') {
          io.to(roomCode).emit('game-over', { room, won: false });
        }
        
        io.to(roomCode).emit('game-state-sync', { room });
      }
      
      broadcastRoomList();
    }
  });
}
