// Game Types for The Mind Client

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

export type Screen = 'home' | 'lobby' | 'game';
