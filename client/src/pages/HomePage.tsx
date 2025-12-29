import { useState } from 'react';
import { RoomInfo } from '../types';
import './HomePage.css';

interface HomePageProps {
  availableRooms: RoomInfo[];
  onCreateRoom: (playerName: string) => void;
  onJoinRoom: (roomCode: string, playerName: string) => void;
}

function HomePage({ availableRooms, onCreateRoom, onJoinRoom }: HomePageProps) {
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim()) {
      onCreateRoom(playerName.trim());
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const codeToJoin = selectedRoom || roomCode.trim().toUpperCase();
    if (playerName.trim() && codeToJoin) {
      onJoinRoom(codeToJoin, playerName.trim());
    }
  };

  const handleRoomClick = (code: string) => {
    setSelectedRoom(code);
    setRoomCode(code);
    setMode('join');
  };

  return (
    <div className="home-page">
      <div className="home-content animate-fadeIn">
        <div className="logo-section">
          <div className="logo-icon">🧠</div>
          <h1 className="logo-title">The Mind</h1>
          <p className="logo-subtitle">Synchronize without words</p>
        </div>

        {mode === 'menu' && (
          <>
            <div className="menu-buttons animate-slideUp">
              <button 
                className="btn btn-primary btn-large"
                onClick={() => setMode('create')}
              >
                <span className="btn-icon">✨</span>
                Create Room
              </button>
              <button 
                className="btn btn-secondary btn-large"
                onClick={() => setMode('join')}
              >
                <span className="btn-icon">🚀</span>
                Join with Code
              </button>
            </div>

            {availableRooms.length > 0 && (
              <div className="rooms-section animate-slideUp">
                <h3>Available Rooms</h3>
                <div className="rooms-list">
                  {availableRooms.map((room) => (
                    <button 
                      key={room.code}
                      className="room-item"
                      onClick={() => handleRoomClick(room.code)}
                    >
                      <div className="room-info">
                        <span className="room-host">{room.hostName}'s Room</span>
                        <span className="room-code">{room.code}</span>
                      </div>
                      <div className="room-players">
                        {room.playerCount} {room.playerCount === 1 ? 'player' : 'players'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {mode === 'create' && (
          <form className="form-card card animate-slideUp" onSubmit={handleCreate}>
            <h2>Create a Room</h2>
            <div className="form-group">
              <label htmlFor="playerName">Your Name</label>
              <input
                id="playerName"
                type="text"
                className="input"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                autoFocus
                maxLength={20}
              />
            </div>
            <div className="form-actions">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setMode('menu')}
              >
                Back
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={!playerName.trim()}
              >
                Create
              </button>
            </div>
          </form>
        )}

        {mode === 'join' && (
          <form className="form-card card animate-slideUp" onSubmit={handleJoin}>
            <h2>Join a Room</h2>
            <div className="form-group">
              <label htmlFor="joinPlayerName">Your Name</label>
              <input
                id="joinPlayerName"
                type="text"
                className="input"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                autoFocus
                maxLength={20}
              />
            </div>
            <div className="form-group">
              <label htmlFor="roomCode">Room Code</label>
              <input
                id="roomCode"
                type="text"
                className="input input-code"
                placeholder="XXXX"
                value={roomCode}
                onChange={(e) => {
                  setRoomCode(e.target.value.toUpperCase());
                  setSelectedRoom(null);
                }}
                maxLength={4}
              />
            </div>
            <div className="form-actions">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => {
                  setMode('menu');
                  setSelectedRoom(null);
                  setRoomCode('');
                }}
              >
                Back
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={!playerName.trim() || roomCode.length !== 4}
              >
                Join
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="bg-orbs">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>
    </div>
  );
}

export default HomePage;
