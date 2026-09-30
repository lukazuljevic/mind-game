import { GameRoom, Player, RoomInfo } from '../types';

const ROOM_EXPIRY_MS = 6 * 60 * 60 * 1000; // 6 hours of inactivity
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000; // Check every 30 minutes
export const MAX_PLAYERS = 8; // 8 players × 8 levels = 64 cards, always fits in the 1–100 deck

// Official game length: fewer levels with more players
function maxLevelFor(playerCount: number): number {
  if (playerCount <= 2) return 12;
  if (playerCount === 3) return 10;
  return 8;
}

type JoinResult = { room: GameRoom } | { error: string };

export interface PlayResult {
  room: GameRoom;
  card: number;
  lostCards: number[];
  levelComplete: boolean;
  gameWon: boolean;
}

export interface LeaveResult {
  room: GameRoom | null;
  playerName: string;
  newHost?: Player;
  gameEnded: boolean;
}

class GameManager {
  private rooms: Map<string, GameRoom> = new Map();
  private playerRooms: Map<string, string> = new Map();
  private roomTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    setInterval(() => this.cleanupExpiredRooms(), CLEANUP_INTERVAL_MS);
  }

  private cleanupExpiredRooms(): void {
    const now = Date.now();

    this.rooms.forEach((room, code) => {
      if (now - room.lastActivityAt >= ROOM_EXPIRY_MS) {
        this.deleteRoom(code);
        console.log(`Room ${code} expired after ${Math.round((now - room.lastActivityAt) / 1000 / 60)} minutes of inactivity`);
      }
    });
  }

  private deleteRoom(code: string): void {
    const room = this.rooms.get(code);
    if (!room) return;
    room.players.forEach((player) => this.playerRooms.delete(player.id));
    this.clearRoomTimer(code);
    this.rooms.delete(code);
  }

  /** Schedules a delayed room transition, replacing any pending one. */
  scheduleRoomTimer(code: string, fn: () => void, delayMs: number): void {
    this.clearRoomTimer(code);
    this.roomTimers.set(code, setTimeout(() => {
      this.roomTimers.delete(code);
      fn();
    }, delayMs));
  }

  clearRoomTimer(code: string): void {
    const timer = this.roomTimers.get(code);
    if (timer) {
      clearTimeout(timer);
      this.roomTimers.delete(code);
    }
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    if (this.rooms.has(code)) {
      return this.generateRoomCode();
    }
    return code;
  }

  private createPlayer(id: string, name: string, isHost: boolean): Player {
    return { id, name, cards: [], isHost, fails: 0, connected: true };
  }

  createRoom(hostId: string, hostName: string): GameRoom {
    const code = this.generateRoomCode();
    const now = Date.now();

    const room: GameRoom = {
      code,
      players: [this.createPlayer(hostId, hostName, true)],
      state: {
        status: 'waiting',
        level: 1,
        maxLevel: maxLevelFor(1),
        playedCards: [],
        currentCard: null,
        isLocked: false,
        readyPlayers: [],
      },
      hostId,
      createdAt: now,
      lastActivityAt: now,
    };

    this.rooms.set(code, room);
    this.playerRooms.set(hostId, code);
    return room;
  }

  getRoom(code: string): GameRoom | undefined {
    return this.rooms.get(code);
  }

  getRoomByPlayerId(playerId: string): GameRoom | undefined {
    const roomCode = this.playerRooms.get(playerId);
    if (!roomCode) return undefined;
    return this.rooms.get(roomCode);
  }

  getAllRooms(): RoomInfo[] {
    const roomList: RoomInfo[] = [];
    this.rooms.forEach((room) => {
      if (room.state.status === 'waiting' && room.players.length < MAX_PLAYERS) {
        const host = room.players.find((p) => p.isHost);
        roomList.push({
          code: room.code,
          hostName: host?.name || 'Unknown',
          playerCount: room.players.length,
        });
      }
    });
    return roomList;
  }

  joinRoom(code: string, playerId: string, playerName: string): JoinResult {
    const room = this.rooms.get(code);
    if (!room) return { error: 'Room not found' };
    if (room.state.status !== 'waiting') return { error: 'Game already started' };
    if (room.players.length >= MAX_PLAYERS) return { error: 'Room is full' };

    room.players.push(this.createPlayer(playerId, playerName, false));
    room.state.maxLevel = maxLevelFor(room.players.length);
    room.lastActivityAt = Date.now();
    this.playerRooms.set(playerId, code);
    return { room };
  }

  setConnected(playerId: string, connected: boolean): GameRoom | undefined {
    const room = this.getRoomByPlayerId(playerId);
    const player = room?.players.find((p) => p.id === playerId);
    if (player) player.connected = connected;
    return room;
  }

  leaveRoom(code: string, playerId: string): LeaveResult {
    const room = this.rooms.get(code);
    if (!room) return { room: null, playerName: '', gameEnded: false };

    const leaving = room.players.find((p) => p.id === playerId);
    this.playerRooms.delete(playerId);
    room.players = room.players.filter((p) => p.id !== playerId);
    room.lastActivityAt = Date.now();

    if (room.players.length === 0) {
      this.deleteRoom(code);
      return { room: null, playerName: leaving?.name ?? '', gameEnded: false };
    }

    let newHost: Player | undefined;
    if (room.hostId === playerId) {
      room.hostId = room.players[0].id;
      room.players[0].isHost = true;
      newHost = room.players[0];
    }

    let gameEnded = false;
    const { state } = room;
    const inGame = state.status === 'ready' || state.status === 'playing';

    if (inGame && room.players.length < 2) {
      state.status = 'lost';
      state.isLocked = true;
      this.clearRoomTimer(code);
      gameEnded = true;
    } else if (state.status === 'ready' || (state.status === 'playing' && !state.isLocked)) {
      // The leaver's cards are gone, so the level can't be finished as dealt. Redeal it.
      // (If a transition is already pending, its timer will deal for the remaining players.)
      this.dealCards(room);
    } else if (state.status === 'waiting') {
      state.maxLevel = maxLevelFor(room.players.length);
    }

    return { room, playerName: leaving?.name ?? '', newHost, gameEnded };
  }

  /** Starts a new game. Also used for "Play again" after a game has ended. */
  startGame(code: string): GameRoom | null {
    const room = this.rooms.get(code);
    if (!room) return null;
    if (room.players.length < 2) return null;
    if (room.state.status === 'ready' || room.state.status === 'playing') return null;

    this.clearRoomTimer(code);
    room.state.level = 1;
    room.state.maxLevel = maxLevelFor(room.players.length);
    room.players.forEach((p) => {
      p.fails = 0;
    });

    this.dealCards(room);
    return room;
  }

  markReady(code: string, playerId: string): { room: GameRoom; started: boolean } | null {
    const room = this.rooms.get(code);
    if (!room || room.state.status !== 'ready') return null;

    const { state } = room;
    if (!state.readyPlayers.includes(playerId)) {
      state.readyPlayers.push(playerId);
    }
    room.lastActivityAt = Date.now();

    const started = room.players.every((p) => state.readyPlayers.includes(p.id));
    if (started) {
      state.status = 'playing';
      state.isLocked = false;
    }
    return { room, started };
  }

  advanceLevel(code: string): GameRoom | null {
    const room = this.rooms.get(code);
    if (!room || room.state.status !== 'playing') return null;

    room.state.level++;
    this.dealCards(room);
    return room;
  }

  resetLevel(code: string): GameRoom | null {
    const room = this.rooms.get(code);
    if (!room || room.state.status !== 'playing') return null;

    this.dealCards(room);
    return room;
  }

  returnToLobby(code: string): GameRoom | null {
    const room = this.rooms.get(code);
    if (!room) return null;

    this.clearRoomTimer(code);
    room.state = {
      status: 'waiting',
      level: 1,
      maxLevel: maxLevelFor(room.players.length),
      playedCards: [],
      currentCard: null,
      isLocked: false,
      readyPlayers: [],
    };
    room.players.forEach((p) => {
      p.cards = [];
      p.fails = 0;
    });
    return room;
  }

  /** Deals a fresh hand for the current level and waits for everyone to be ready. */
  private dealCards(room: GameRoom): void {
    const playerCount = room.players.length;
    const cardsPerPlayer = room.state.level;

    const deck = Array.from({ length: 100 }, (_, i) => i + 1);
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    room.players.forEach((player, index) => {
      player.cards = deck
        .slice(index * cardsPerPlayer, (index + 1) * cardsPerPlayer)
        .sort((a, b) => a - b);
    });

    room.state.status = 'ready';
    room.state.readyPlayers = [];
    room.state.playedCards = [];
    room.state.currentCard = null;
    room.state.isLocked = true;
  }

  playCard(code: string, playerId: string): PlayResult | null {
    const room = this.rooms.get(code);
    if (!room) return null;
    if (room.state.status !== 'playing') return null;
    if (room.state.isLocked) return null;

    const player = room.players.find((p) => p.id === playerId);
    if (!player || player.cards.length === 0) return null;

    const playedCard = player.cards[0];
    player.cards = player.cards.slice(1);

    const lostCards: number[] = [];
    room.players.forEach((p) => {
      if (p.id === playerId) return;
      while (p.cards.length > 0 && p.cards[0] < playedCard) {
        lostCards.push(p.cards[0]);
        p.cards = p.cards.slice(1);
      }
    });
    lostCards.sort((a, b) => a - b);

    room.state.playedCards.push(playedCard);
    room.state.currentCard = playedCard;
    room.lastActivityAt = Date.now();

    let gameWon = false;
    let levelComplete = false;

    if (lostCards.length > 0) {
      player.fails++;
      room.state.isLocked = true;
    } else if (room.players.every((p) => p.cards.length === 0)) {
      room.state.isLocked = true;
      if (room.state.level >= room.state.maxLevel) {
        gameWon = true;
        room.state.status = 'won';
      } else {
        levelComplete = true;
      }
    }

    return { room, card: playedCard, lostCards, levelComplete, gameWon };
  }
}

export const gameManager = new GameManager();
