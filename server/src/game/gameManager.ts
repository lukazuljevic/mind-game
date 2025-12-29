import { GameRoom, Player, RoomInfo } from '../types';

const ROOM_EXPIRY_MS = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000; // Check every 30 minutes

class GameManager {
  private rooms: Map<string, GameRoom> = new Map();
  private playerRooms: Map<string, string> = new Map();

  constructor() {
    setInterval(() => this.cleanupExpiredRooms(), CLEANUP_INTERVAL_MS);
  }

  private cleanupExpiredRooms(): void {
    const now = Date.now();
    const expiredCodes: string[] = [];

    this.rooms.forEach((room, code) => {
      if (now - room.createdAt >= ROOM_EXPIRY_MS) {
        expiredCodes.push(code);
      }
    });

    expiredCodes.forEach((code) => {
      const room = this.rooms.get(code);
      if (room) {
        room.players.forEach((player) => {
          this.playerRooms.delete(player.id);
        });
        this.rooms.delete(code);
        console.log(`Room ${code} expired and was deleted (created ${Math.round((now - room.createdAt) / 1000 / 60)} minutes ago)`);
      }
    });

    if (expiredCodes.length > 0) {
      console.log(`Cleaned up ${expiredCodes.length} expired room(s)`);
    }
  }

  generateRoomCode(): string {
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

  createRoom(hostId: string, hostName: string): GameRoom {
    const code = this.generateRoomCode();
    const host: Player = {
      id: hostId,
      name: hostName,
      cards: [],
      isHost: true,
      fails: 0,
    };

    const room: GameRoom = {
      code,
      players: [host],
      state: {
        status: 'waiting',
        level: 1,
        playedCards: [],
        currentCard: null,
      },
      hostId,
      createdAt: Date.now(),
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
      if (room.state.status === 'waiting') {
        const host = room.players.find(p => p.isHost);
        roomList.push({
          code: room.code,
          hostName: host?.name || 'Unknown',
          playerCount: room.players.length,
          status: room.state.status,
        });
      }
    });
    return roomList;
  }

  joinRoom(code: string, playerId: string, playerName: string): GameRoom | null {
    const room = this.rooms.get(code);
    if (!room) return null;
    if (room.state.status !== 'waiting') return null;

    const player: Player = {
      id: playerId,
      name: playerName,
      cards: [],
      isHost: false,
      fails: 0,
    };

    room.players.push(player);
    this.playerRooms.set(playerId, code);
    return room;
  }

  leaveRoom(code: string, playerId: string): { room: GameRoom | null; deleted: boolean; newHost?: Player } {
    const room = this.rooms.get(code);
    if (!room) return { room: null, deleted: false };

    this.playerRooms.delete(playerId);
    room.players = room.players.filter((p) => p.id !== playerId);

    if (room.players.length === 0) {
      this.rooms.delete(code);
      return { room: null, deleted: true };
    }

    let newHost: Player | undefined;

    if (room.hostId === playerId) {
      room.hostId = room.players[0].id;
      room.players[0].isHost = true;
      newHost = room.players[0];
    }

    if (room.state.status === 'playing' && room.players.length < 2) {
      room.state.status = 'lost';
    }

    return { room, deleted: false, newHost };
  }

  startGame(code: string): GameRoom | null {
    const room = this.rooms.get(code);
    if (!room) return null;
    if (room.players.length < 2) return null;

    room.state.status = 'playing';
    room.state.level = 1;
    room.state.playedCards = [];
    room.state.currentCard = null;

    room.players.forEach((p) => {
      p.fails = 0;
    });

    this.dealCards(room);
    return room;
  }

  private dealCards(room: GameRoom): void {
    const playerCount = room.players.length;
    const cardsPerPlayer = room.state.level;
    const totalCards = playerCount * cardsPerPlayer;

    const allCards: number[] = [];
    while (allCards.length < totalCards) {
      const card = Math.floor(Math.random() * 100) + 1;
      if (!allCards.includes(card)) {
        allCards.push(card);
      }
    }

    allCards.sort((a, b) => a - b);
    
    for (let i = allCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
    }

    room.players.forEach((player, index) => {
      player.cards = allCards
        .filter((_, i) => i % playerCount === index)
        .sort((a, b) => a - b);
    });
  }

  playCard(code: string, playerId: string): { 
    success: boolean; 
    card?: number; 
    lostLife?: boolean;
    lostCards?: number[];
    levelComplete?: boolean;
    gameWon?: boolean;
    gameLost?: boolean;
    room?: GameRoom;
  } {
    const room = this.rooms.get(code);
    if (!room) return { success: false };
    if (room.state.status !== 'playing') return { success: false };

    const player = room.players.find((p) => p.id === playerId);
    if (!player || player.cards.length === 0) return { success: false };

    const playedCard = player.cards[0]; 
    player.cards = player.cards.slice(1);

    const lostCards: number[] = [];
    room.players.forEach((p) => {
      if (p.id !== playerId) {
        while (p.cards.length > 0 && p.cards[0] < playedCard) {
          lostCards.push(p.cards[0]);
          p.cards = p.cards.slice(1);
        }
      }
    });

    room.state.playedCards.push(playedCard);
    room.state.currentCard = playedCard;

    let lostLife = false;
    let gameWon = false;
    let gameLost = false;
    let levelComplete = false;

    if (lostCards.length > 0) {
      player.fails++;
      lostLife = true;
      
      room.state.playedCards = [];
      room.state.currentCard = null;
      this.dealCards(room);
    }

    const totalCardsRemaining = room.players.reduce((sum, p) => sum + p.cards.length, 0);
    if (totalCardsRemaining === 0 && !gameLost) {
      if (room.state.level >= 12) {
        room.state.status = 'won';
        gameWon = true;
      } else {
        room.state.level++;
        room.state.playedCards = [];
        room.state.currentCard = null;
        this.dealCards(room);
        levelComplete = true;
      }
    }

    return {
      success: true,
      card: playedCard,
      lostLife,
      lostCards: lostCards.length > 0 ? lostCards : undefined,
      levelComplete,
      gameWon,
      gameLost,
      room,
    };
  }

  restartGame(code: string): GameRoom | null {
    const room = this.rooms.get(code);
    if (!room) return null;

    room.state = {
      status: 'waiting',
      level: 1,
      playedCards: [],
      currentCard: null,
    };

    room.players.forEach((p) => {
      p.cards = [];
      p.fails = 0;
    });

    return room;
  }

  getPlayer(room: GameRoom, playerId: string): Player | undefined {
    return room.players.find((p) => p.id === playerId);
  }
}

export const gameManager = new GameManager();
