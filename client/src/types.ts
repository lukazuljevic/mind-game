export interface Player {
  id: string;
  name: string;
  cards: number[];
  isHost: boolean;
  fails: number;
}

export interface GameRoom {
  code: string;
  players: Player[];
  state: GameState;
  hostId: string;
  createdAt: number;
}

export interface GameState {
  status: 'waiting' | 'playing' | 'won' | 'lost';
  level: number;
  playedCards: number[];
  currentCard: number | null;
  isLocked: boolean;
}

export interface RoomInfo {
  code: string;
  hostName: string;
  playerCount: number;
  status: 'waiting' | 'playing' | 'won' | 'lost';
}

export type Screen = 'home' | 'lobby' | 'game';
