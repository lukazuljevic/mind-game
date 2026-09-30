export type GameStatus = 'waiting' | 'ready' | 'playing' | 'won' | 'lost';

export interface Player {
  id: string;
  name: string;
  cards: number[];
  isHost: boolean;
  fails: number;
  connected: boolean;
}

export interface GameRoom {
  code: string;
  players: Player[];
  state: GameState;
  hostId: string;
  createdAt: number;
  lastActivityAt: number;
}

export interface GameState {
  status: GameStatus;
  level: number;
  maxLevel: number;
  playedCards: number[];
  currentCard: number | null;
  isLocked: boolean;
  readyPlayers: string[];
}

export interface RoomInfo {
  code: string;
  hostName: string;
  playerCount: number;
}

export interface ServerToClientEvents {
  'session': (data: { room: GameRoom | null }) => void;
  'room-joined': (data: { room: GameRoom }) => void;
  'player-joined': (data: { room: GameRoom; player: Player }) => void;
  'player-left': (data: { room: GameRoom; playerName: string; newHostName?: string }) => void;
  'rooms-list': (data: { rooms: RoomInfo[] }) => void;
  'game-started': (data: { room: GameRoom }) => void;
  'card-played': (data: { room: GameRoom; playerId: string; card: number }) => void;
  'life-lost': (data: { room: GameRoom; playerId: string; playedCard: number; lostCards: number[] }) => void;
  'level-complete': (data: { room: GameRoom; completedLevel: number }) => void;
  'game-over': (data: { room: GameRoom; won: boolean }) => void;
  'game-state-sync': (data: { room: GameRoom }) => void;
  'error': (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  'create-room': (data: { playerName: string }) => void;
  'join-room': (data: { roomCode: string; playerName: string }) => void;
  'start-game': () => void;
  'player-ready': () => void;
  'play-card': () => void;
  'return-to-lobby': () => void;
  'leave-room': () => void;
}

export interface SocketData {
  playerId: string;
}
