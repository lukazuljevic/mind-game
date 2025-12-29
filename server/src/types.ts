// Game Types for The Mind

export interface Player {
  id: string;
  name: string;
  cards: number[];
  isHost: boolean;
}

export interface GameRoom {
  code: string;
  players: Player[];
  state: GameState;
  hostId: string;
}

export interface GameState {
  status: 'waiting' | 'playing' | 'won' | 'lost';
  level: number;
  lives: number;
  playedCards: number[];
  currentCard: number | null;
}

export interface RoomInfo {
  code: string;
  hostName: string;
  playerCount: number;
  status: 'waiting' | 'playing' | 'won' | 'lost';
}

export interface ServerToClientEvents {
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

export interface ClientToServerEvents {
  'create-room': (data: { playerName: string }) => void;
  'join-room': (data: { roomCode: string; playerName: string }) => void;
  'start-game': (data: { roomCode: string }) => void;
  'play-card': (data: { roomCode: string }) => void;
  'leave-room': (data: { roomCode: string }) => void;
  'request-sync': (data: { roomCode: string }) => void;
  'get-rooms': () => void;
}
