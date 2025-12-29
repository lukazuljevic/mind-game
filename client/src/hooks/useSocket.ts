import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameRoom, Player, RoomInfo } from '../types';

const SOCKET_URL = window.location.origin

interface ServerToClientEvents {
  'room-created': (data: { roomCode: string; player: Player }) => void;
  'room-joined': (data: { room: GameRoom }) => void;
  'player-joined': (data: { player: Player }) => void;
  'player-left': (data: { playerId: string }) => void;
  'host-changed': (data: { newHostId: string; newHostName: string }) => void;
  'rooms-list': (data: { rooms: RoomInfo[] }) => void;
  'game-started': (data: { room: GameRoom }) => void;
  'card-played': (data: { playerId: string; card: number; room: GameRoom }) => void;
  'level-complete': (data: { room: GameRoom }) => void;
  'life-lost': (data: { room: GameRoom; lostCards: number[] }) => void;
  'game-over': (data: { room: GameRoom; won: boolean }) => void;
  'game-state-sync': (data: { room: GameRoom }) => void;
  'error': (data: { message: string }) => void;
}

interface ClientToServerEvents {
  'create-room': (data: { playerName: string }) => void;
  'join-room': (data: { roomCode: string; playerName: string }) => void;
  'start-game': (data: { roomCode: string }) => void;
  'play-card': (data: { roomCode: string }) => void;
  'leave-room': (data: { roomCode: string }) => void;
  'request-sync': (data: { roomCode: string }) => void;
  'get-rooms': () => void;
}

type SocketType = Socket<ServerToClientEvents, ClientToServerEvents>;

interface UseSocketProps {
  onRoomCreated?: (roomCode: string, player: Player) => void;
  onRoomJoined?: (room: GameRoom) => void;
  onPlayerJoined?: (player: Player) => void;
  onPlayerLeft?: (playerId: string) => void;
  onHostChanged?: (newHostId: string, newHostName: string) => void;
  onRoomsList?: (rooms: RoomInfo[]) => void;
  onGameStarted?: (room: GameRoom) => void;
  onCardPlayed?: (playerId: string, card: number, room: GameRoom) => void;
  onLevelComplete?: (room: GameRoom) => void;
  onLifeLost?: (room: GameRoom, lostCards: number[]) => void;
  onGameOver?: (room: GameRoom, won: boolean) => void;
  onGameStateSync?: (room: GameRoom) => void;
  onError?: (message: string) => void;
}

export function useSocket(props: UseSocketProps) {
  const socketRef = useRef<SocketType | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    const socket: SocketType = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('room-created', ({ roomCode, player }) => {
      propsRef.current.onRoomCreated?.(roomCode, player);
    });

    socket.on('room-joined', ({ room }) => {
      propsRef.current.onRoomJoined?.(room);
    });

    socket.on('player-joined', ({ player }) => {
      propsRef.current.onPlayerJoined?.(player);
    });

    socket.on('player-left', ({ playerId }) => {
      propsRef.current.onPlayerLeft?.(playerId);
    });

    socket.on('host-changed', ({ newHostId, newHostName }) => {
      propsRef.current.onHostChanged?.(newHostId, newHostName);
    });

    socket.on('rooms-list', ({ rooms }) => {
      propsRef.current.onRoomsList?.(rooms);
    });

    socket.on('game-started', ({ room }) => {
      propsRef.current.onGameStarted?.(room);
    });

    socket.on('card-played', ({ playerId, card, room }) => {
      propsRef.current.onCardPlayed?.(playerId, card, room);
    });

    socket.on('level-complete', ({ room }) => {
      propsRef.current.onLevelComplete?.(room);
    });

    socket.on('life-lost', ({ room, lostCards }) => {
      propsRef.current.onLifeLost?.(room, lostCards);
    });

    socket.on('game-over', ({ room, won }) => {
      propsRef.current.onGameOver?.(room, won);
    });

    socket.on('game-state-sync', ({ room }) => {
      propsRef.current.onGameStateSync?.(room);
    });

    socket.on('error', ({ message }) => {
      propsRef.current.onError?.(message);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const createRoom = useCallback((playerName: string) => {
    socketRef.current?.emit('create-room', { playerName });
  }, []);

  const joinRoom = useCallback((roomCode: string, playerName: string) => {
    socketRef.current?.emit('join-room', { roomCode, playerName });
  }, []);

  const startGame = useCallback((roomCode: string) => {
    socketRef.current?.emit('start-game', { roomCode });
  }, []);

  const playCard = useCallback((roomCode: string) => {
    socketRef.current?.emit('play-card', { roomCode });
  }, []);

  const leaveRoom = useCallback((roomCode: string) => {
    socketRef.current?.emit('leave-room', { roomCode });
  }, []);

  const requestSync = useCallback((roomCode: string) => {
    socketRef.current?.emit('request-sync', { roomCode });
  }, []);

  const getRooms = useCallback(() => {
    socketRef.current?.emit('get-rooms');
  }, []);

  const getSocketId = useCallback(() => {
    return socketRef.current?.id;
  }, []);

  return {
    createRoom,
    joinRoom,
    startGame,
    playCard,
    leaveRoom,
    requestSync,
    getRooms,
    getSocketId,
  };
}
