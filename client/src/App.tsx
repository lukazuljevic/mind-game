import { useState, useCallback, useRef, useMemo } from 'react';
import { getPlayerId, useSocket } from './hooks/useSocket';
import { GameRoom, LastPlay, Mistake, RoomInfo } from './types';
import { vibrate } from './utils/device';
import HomePage from './pages/HomePage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import './App.css';

interface Toast {
  message: string;
  kind: 'info' | 'error';
}

function App() {
  const myId = useMemo(getPlayerId, []);
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [availableRooms, setAvailableRooms] = useState<RoomInfo[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const [mistake, setMistake] = useState<Mistake | null>(null);
  const [completedLevel, setCompletedLevel] = useState<number | null>(null);
  const [lastPlay, setLastPlay] = useState<LastPlay | null>(null);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const playCounterRef = useRef(0);
  const roomRef = useRef(room);
  roomRef.current = room;

  const player = room?.players.find((p) => p.id === myId) ?? null;
  const screen = room && player ? (room.state.status === 'waiting' ? 'lobby' : 'game') : 'home';

  const showToast = useCallback((message: string, kind: Toast['kind'] = 'info') => {
    clearTimeout(toastTimerRef.current);
    setToast({ message, kind });
    toastTimerRef.current = setTimeout(() => setToast(null), kind === 'error' ? 4000 : 3000);
  }, []);

  const clearRoundInfo = () => {
    setMistake(null);
    setCompletedLevel(null);
  };

  const socket = useSocket(myId, {
    onSession: (sessionRoom) => {
      if (sessionRoom) {
        setRoom(sessionRoom);
      } else if (roomRef.current) {
        setRoom(null);
        clearRoundInfo();
        showToast('You were disconnected for too long and left the room', 'error');
      }
    },
    onRoomJoined: (joinedRoom) => {
      setRoom(joinedRoom);
      clearRoundInfo();
      // Drop ?room= so a reload doesn't reopen the join form
      if (window.location.search) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    },
    onPlayerJoined: (updatedRoom, newPlayer) => {
      setRoom(updatedRoom);
      showToast(`${newPlayer.name} joined`);
    },
    onPlayerLeft: (updatedRoom, playerName, newHostName) => {
      setRoom(updatedRoom);
      showToast(newHostName ? `${playerName} left · ${newHostName} is now the host` : `${playerName} left`);
    },
    onRoomsList: setAvailableRooms,
    onGameStarted: (startedRoom) => {
      setRoom(startedRoom);
      clearRoundInfo();
      setLastPlay(null);
    },
    onCardPlayed: (updatedRoom, playerId, card) => {
      setRoom(updatedRoom);
      setLastPlay({ id: ++playCounterRef.current, playerId, card });
    },
    onLifeLost: (updatedRoom, playerId, playedCard, lostCards) => {
      setRoom(updatedRoom);
      setMistake({ playerId, playedCard, lostCards });
      setCompletedLevel(null);
      vibrate(250);
    },
    onLevelComplete: (updatedRoom, level) => {
      setRoom(updatedRoom);
      setMistake(null);
      setCompletedLevel(level);
      vibrate([80, 60, 80]);
    },
    onGameOver: (updatedRoom, won) => {
      setRoom(updatedRoom);
      vibrate(won ? [80, 60, 80, 60, 160] : 400);
    },
    onGameStateSync: (syncedRoom) => {
      setRoom(syncedRoom);
      if (syncedRoom.state.status === 'playing' && !syncedRoom.state.isLocked) {
        clearRoundInfo();
      }
    },
    onError: (message) => showToast(message, 'error'),
  });

  const handleLeaveRoom = () => {
    socket.leaveRoom();
    setRoom(null);
    clearRoundInfo();
    setLastPlay(null);
  };

  return (
    <div className="app">
      {room && !socket.connected && (
        <div className="connection-banner">Reconnecting…</div>
      )}

      {toast && (
        <div key={toast.message} className={toast.kind === 'error' ? 'error-toast' : 'notification'} role="status">
          {toast.message}
        </div>
      )}

      {screen === 'home' && (
        <HomePage
          availableRooms={availableRooms}
          onCreateRoom={socket.createRoom}
          onJoinRoom={socket.joinRoom}
        />
      )}

      {screen === 'lobby' && room && player && (
        <LobbyPage
          room={room}
          player={player}
          onStartGame={socket.startGame}
          onLeaveRoom={handleLeaveRoom}
          onNotify={showToast}
        />
      )}

      {screen === 'game' && room && player && (
        <GamePage
          room={room}
          player={player}
          mistake={mistake}
          completedLevel={completedLevel}
          lastPlay={lastPlay}
          onReady={socket.setReady}
          onPlayCard={socket.playCard}
          onPlayAgain={socket.startGame}
          onReturnToLobby={socket.returnToLobby}
          onLeaveRoom={handleLeaveRoom}
        />
      )}
    </div>
  );
}

export default App;
