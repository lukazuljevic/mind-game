import { GameRoom, Player } from '../types';
import './LobbyPage.css';

interface LobbyPageProps {
  room: GameRoom;
  player: Player;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

function LobbyPage({ room, player, onStartGame, onLeaveRoom }: LobbyPageProps) {
  const isHost = player.isHost;
  const canStart = room.players.length >= 2;

  return (
    <div className="lobby-page">
      <div className="lobby-content animate-fadeIn">
        <button className="back-button" onClick={onLeaveRoom}>
          ← Leave
        </button>

        <div className="room-header">
          <div className="room-code-label">Room Code</div>
          <div className="room-code">{room.code}</div>
          <p className="room-code-hint">Share this with your friends!</p>
        </div>

        <div className="players-section card">
          <h3>Players ({room.players.length}/4)</h3>
          <div className="players-list">
            {room.players.map((p) => (
              <div 
                key={p.id} 
                className={`player-item ${p.id === player.id ? 'is-me' : ''}`}
              >
                <div className="player-avatar">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div className="player-info">
                  <span className="player-name">
                    {p.name}
                    {p.id === player.id && <span className="you-badge">(You)</span>}
                  </span>
                  {p.isHost && <span className="host-badge">Host</span>}
                </div>
              </div>
            ))}
            
            {room.players.length < 4 && (
              <div className="player-item player-empty">
                <div className="player-avatar empty">?</div>
                <span className="waiting-text">Waiting for player...</span>
              </div>
            )}
          </div>
        </div>

        <div className="lobby-actions">
          {isHost ? (
            <button 
              className="btn btn-primary btn-large"
              onClick={onStartGame}
              disabled={!canStart}
            >
              {canStart ? '🚀 Start Game' : 'Need at least 2 players'}
            </button>
          ) : (
            <div className="waiting-for-host">
              <div className="spinner"></div>
              <span>Waiting for host to start...</span>
            </div>
          )}
        </div>

        <div className="game-rules card">
          <h4>Game Rules</h4>
          <ul>
            <li>Play cards in ascending order (1-100)</li>
            <li>Each level adds more cards per player</li>
            <li>Complete all 12 levels to win!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default LobbyPage;
