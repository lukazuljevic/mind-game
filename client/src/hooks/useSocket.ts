import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, GameRoom, Player, RoomInfo, ServerToClientEvents } from '../types';

const SOCKET_URL = window.location.origin;
const PLAYER_ID_KEY = 'mind-player-id';

type SocketType = Socket<ServerToClientEvents, ClientToServerEvents>;

function randomId(): string {
  // crypto.randomUUID only exists in secure contexts (https/localhost), not on http://192.168.x.x
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * A stable id for this tab, so a reload or reconnect keeps the player's seat.
 * sessionStorage (not localStorage) so two tabs on one device are two different players.
 */
export function getPlayerId(): string {
  try {
    let id = sessionStorage.getItem(PLAYER_ID_KEY);
    if (!id) {
      id = randomId();
      sessionStorage.setItem(PLAYER_ID_KEY, id);
    }
    return id;
  } catch {
    return randomId();
  }
}

interface UseSocketProps {
  onSession?: (room: GameRoom | null) => void;
  onRoomJoined?: (room: GameRoom) => void;
  onPlayerJoined?: (room: GameRoom, player: Player) => void;
  onPlayerLeft?: (room: GameRoom, playerName: string, newHostName?: string) => void;
  onRoomsList?: (rooms: RoomInfo[]) => void;
  onGameStarted?: (room: GameRoom) => void;
  onCardPlayed?: (room: GameRoom, playerId: string, card: number) => void;
  onLifeLost?: (room: GameRoom, playerId: string, playedCard: number, lostCards: number[]) => void;
  onLevelComplete?: (room: GameRoom, completedLevel: number) => void;
  onGameOver?: (room: GameRoom, won: boolean) => void;
  onGameStateSync?: (room: GameRoom) => void;
  onError?: (message: string) => void;
}

export function useSocket(playerId: string, props: UseSocketProps) {
  const socketRef = useRef<SocketType | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket: SocketType = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: { playerId },
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('session', ({ room }) => propsRef.current.onSession?.(room));
    socket.on('room-joined', ({ room }) => propsRef.current.onRoomJoined?.(room));
    socket.on('player-joined', ({ room, player }) => propsRef.current.onPlayerJoined?.(room, player));
    socket.on('player-left', ({ room, playerName, newHostName }) =>
      propsRef.current.onPlayerLeft?.(room, playerName, newHostName));
    socket.on('rooms-list', ({ rooms }) => propsRef.current.onRoomsList?.(rooms));
    socket.on('game-started', ({ room }) => propsRef.current.onGameStarted?.(room));
    socket.on('card-played', ({ room, playerId, card }) => propsRef.current.onCardPlayed?.(room, playerId, card));
    socket.on('life-lost', ({ room, playerId, playedCard, lostCards }) =>
      propsRef.current.onLifeLost?.(room, playerId, playedCard, lostCards));
    socket.on('level-complete', ({ room, completedLevel }) =>
      propsRef.current.onLevelComplete?.(room, completedLevel));
    socket.on('game-over', ({ room, won }) => propsRef.current.onGameOver?.(room, won));
    socket.on('game-state-sync', ({ room }) => propsRef.current.onGameStateSync?.(room));
    socket.on('error', ({ message }) => propsRef.current.onError?.(message));

    return () => {
      socket.disconnect();
    };
  }, [playerId]);

  const createRoom = useCallback((playerName: string) => {
    socketRef.current?.emit('create-room', { playerName });
  }, []);

  const joinRoom = useCallback((roomCode: string, playerName: string) => {
    socketRef.current?.emit('join-room', { roomCode, playerName });
  }, []);

  const startGame = useCallback(() => {
    socketRef.current?.emit('start-game');
  }, []);

  const setReady = useCallback(() => {
    socketRef.current?.emit('player-ready');
  }, []);

  const playCard = useCallback(() => {
    socketRef.current?.emit('play-card');
  }, []);

  const returnToLobby = useCallback(() => {
    socketRef.current?.emit('return-to-lobby');
  }, []);

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('leave-room');
  }, []);

  return {
    connected,
    createRoom,
    joinRoom,
    startGame,
    setReady,
    playCard,
    returnToLobby,
    leaveRoom,
  };
}
