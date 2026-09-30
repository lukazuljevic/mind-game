import { useState } from 'react';
import { RoomInfo } from '../types';
import { loadPlayerName, savePlayerName } from '../utils/device';
import './HomePage.css';

interface HomePageProps {
  availableRooms: RoomInfo[];
  onCreateRoom: (playerName: string) => void;
  onJoinRoom: (roomCode: string, playerName: string) => void;
}

function getInviteCode(): string {
  const code = new URLSearchParams(window.location.search).get('room');
  return code ? code.toUpperCase().slice(0, 4) : '';
}

function HomePage({ availableRooms, onCreateRoom, onJoinRoom }: HomePageProps) {
  const [inviteCode] = useState(getInviteCode);
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>(inviteCode ? 'join' : 'menu');
  const [playerName, setPlayerName] = useState(loadPlayerName);
  const [roomCode, setRoomCode] = useState(inviteCode);

  const name = playerName.trim();

  const create = () => {
    savePlayerName(name);
    onCreateRoom(name);
  };

  const join = (code: string) => {
    savePlayerName(name);
    onJoinRoom(code, name);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (name) create();
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && roomCode.length === 4) join(roomCode);
  };

  const handleRoomClick = (code: string) => {
    setRoomCode(code);
    if (name) {
      join(code);
    } else {
      setMode('join');
    }
  };

  const nameField = (id: string) => (
    <div className="form-group">
      <label htmlFor={id}>Your Name</label>
      <input
        id={id}
        type="text"
        className="input"
        placeholder="Enter your name"
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
        autoFocus={!name}
        autoComplete="nickname"
        enterKeyHint={id === 'playerName' ? 'go' : 'next'}
        maxLength={20}
      />
    </div>
  );

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
                Create Room
              </button>
              <button
                className="btn btn-secondary btn-large"
                onClick={() => setMode('join')}
              >
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
                        <span className="room-item-code">{room.code}</span>
                      </div>
                      <div className="room-players">
                        {room.playerCount} {room.playerCount === 1 ? 'player' : 'players'}
                      </div>
                    </button>
                  ))}
                </div>
                {name && <p className="rooms-hint">Tap a room to join as {name}</p>}
              </div>
            )}
          </>
        )}

        {mode === 'create' && (
          <form className="form-card card animate-slideUp" onSubmit={handleCreate}>
            <h2>Create a Room</h2>
            {nameField('playerName')}
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
                disabled={!name}
              >
                Create
              </button>
            </div>
          </form>
        )}

        {mode === 'join' && (
          <form className="form-card card animate-slideUp" onSubmit={handleJoin}>
            <h2>{inviteCode ? "You're invited!" : 'Join a Room'}</h2>
            {nameField('joinPlayerName')}
            <div className="form-group">
              <label htmlFor="roomCode">Room Code</label>
              <input
                id="roomCode"
                type="text"
                className="input input-code"
                placeholder="XXXX"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                autoFocus={!!name && !roomCode}
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
                maxLength={4}
              />
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setMode('menu');
                  setRoomCode('');
                }}
              >
                Back
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!name || roomCode.length !== 4}
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
