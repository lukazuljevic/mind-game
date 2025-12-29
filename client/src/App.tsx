import { useState, useCallback } from 'react';
import { useSocket } from './hooks/useSocket';
import { GameRoom, Player, Screen, RoomInfo } from './types';
import HomePage from './pages/HomePage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import './App.css';

function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [availableRooms, setAvailableRooms] = useState<RoomInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = useCallback((message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const socket = useSocket({
    onRoomCreated: (roomCode, createdPlayer) => {
      setRoom({
        code: roomCode,
        players: [createdPlayer],
        state: {
          status: 'waiting',
          level: 1,
          lives: 3,
          playedCards: [],
          currentCard: null,
        },
        hostId: createdPlayer.id,
      });
      setPlayer(createdPlayer);
      setScreen('lobby');
      setError(null);
    },
    onRoomJoined: (joinedRoom) => {
      setRoom(joinedRoom);
      const me = joinedRoom.players[joinedRoom.players.length - 1];
      setPlayer(me);
      setScreen('lobby');
      setError(null);
    },
    onPlayerJoined: (newPlayer) => {
      setRoom((prev) => {
        if (!prev) return prev;
        return { ...prev, players: [...prev.players, newPlayer] };
      });
      showNotification(`${newPlayer.name} joined the game!`);
    },
    onPlayerLeft: (playerId) => {
      setRoom((prev) => {
        if (!prev) return prev;
        const leftPlayer = prev.players.find((p) => p.id === playerId);
        if (leftPlayer) {
          showNotification(`${leftPlayer.name} left the game`);
        }
        return {
          ...prev,
          players: prev.players.filter((p) => p.id !== playerId),
        };
      });
    },
    onHostChanged: (newHostId, newHostName) => {
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          hostId: newHostId,
          players: prev.players.map((p) => ({
            ...p,
            isHost: p.id === newHostId,
          })),
        };
      });
      setPlayer((prev) => {
        if (!prev) return prev;
        return { ...prev, isHost: prev.id === newHostId };
      });
      showNotification(`${newHostName} is now the host`);
    },
    onRoomsList: (rooms) => {
      setAvailableRooms(rooms);
    },
    onGameStarted: (startedRoom) => {
      setRoom(startedRoom);
      const me = startedRoom.players.find((p) => p.id === player?.id);
      if (me) setPlayer(me);
      setScreen('game');
    },
    onCardPlayed: (_playerId, card, updatedRoom) => {
      setRoom(updatedRoom);
      const me = updatedRoom.players.find((p) => p.id === player?.id);
      if (me) setPlayer(me);
      showNotification(`Card ${card} played!`);
    },
    onLevelComplete: (updatedRoom) => {
      setRoom(updatedRoom);
      const me = updatedRoom.players.find((p) => p.id === player?.id);
      if (me) setPlayer(me);
      showNotification(`🎉 Level ${updatedRoom.state.level - 1} complete!`);
    },
    onLifeLost: (updatedRoom, lostCards) => {
      setRoom(updatedRoom);
      const me = updatedRoom.players.find((p) => p.id === player?.id);
      if (me) setPlayer(me);
      showNotification(`💔 Lost a life! Cards ${lostCards.join(', ')} were skipped.`);
    },
    onGameOver: (updatedRoom, won) => {
      setRoom(updatedRoom);
      if (won) {
        showNotification('🏆 You won! Amazing synchronization!');
      } else {
        showNotification('💀 Game Over! Try again.');
      }
    },
    onGameStateSync: (syncedRoom) => {
      setRoom(syncedRoom);
      const me = syncedRoom.players.find((p) => p.id === player?.id);
      if (me) setPlayer(me);
      
      if (syncedRoom.state.status === 'lost' && screen === 'game') {
        showNotification('💀 Game Over - not enough players');
      }
    },
    onError: (message) => {
      setError(message);
      setTimeout(() => setError(null), 4000);
    },
  });

  const handleCreateRoom = (playerName: string) => {
    socket.createRoom(playerName);
  };

  const handleJoinRoom = (roomCode: string, playerName: string) => {
    socket.joinRoom(roomCode, playerName);
  };

  const handleStartGame = () => {
    if (room) {
      socket.startGame(room.code);
    }
  };

  const handlePlayCard = () => {
    if (room) {
      socket.playCard(room.code);
    }
  };

  const handleLeaveRoom = () => {
    if (room) {
      socket.leaveRoom(room.code);
    }
    setRoom(null);
    setPlayer(null);
    setScreen('home');
  };

  return (
    <div className="app">
      {notification && (
        <div className="notification animate-slideUp">
          {notification}
        </div>
      )}
      
      {error && (
        <div className="error-toast animate-slideUp">
          {error}
        </div>
      )}

      {screen === 'home' && (
        <HomePage
          availableRooms={availableRooms}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
        />
      )}

      {screen === 'lobby' && room && player && (
        <LobbyPage
          room={room}
          player={player}
          onStartGame={handleStartGame}
          onLeaveRoom={handleLeaveRoom}
        />
      )}

      {screen === 'game' && room && player && (
        <GamePage
          room={room}
          player={player}
          onPlayCard={handlePlayCard}
          onLeaveRoom={handleLeaveRoom}
        />
      )}
    </div>
  );
}

export default App;
