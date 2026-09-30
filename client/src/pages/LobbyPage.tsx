import { GameRoom, Player } from '../types';
import { shareInvite } from '../utils/device';
import './LobbyPage.css';

const MAX_PLAYERS = 8;

interface LobbyPageProps {
  room: GameRoom;
  player: Player;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  onNotify: (message: string) => void;
}

function LobbyPage({ room, player, onStartGame, onLeaveRoom, onNotify }: LobbyPageProps) {
  const isHost = player.isHost;
  const canStart = room.players.length >= 2;

  const handleShare = async () => {
    const result = await shareInvite(room.code);
    if (result === 'copied') onNotify('Invite link copied');
    if (result === 'failed') onNotify(`Tell your friends the code: ${room.code}`);
  };

  return (
    <div className="lobby-page">
      <div className="lobby-content animate-fadeIn">
        <button className="back-button" onClick={onLeaveRoom}>
          ← Leave
        </button>

        <button className="room-header" onClick={handleShare}>
          <div className="room-code-label">Room Code</div>
          <div className="lobby-room-code">{room.code}</div>
          <div className="share-hint">Tap to share invite link</div>
        </button>

        <div className="players-section card">
          <h3>Players ({room.players.length}/{MAX_PLAYERS})</h3>
          <div className="players-list">
            {room.players.map((p) => (
              <div
                key={p.id}
                className={`player-item ${p.id === player.id ? 'is-me' : ''} ${p.connected ? '' : 'is-offline'}`}
              >
                <div className="player-avatar">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div className="player-info">
                  <span className="player-name">
                    {p.name}
                    {p.id === player.id && <span className="you-badge">(You)</span>}
                  </span>
                  {!p.connected && <span className="offline-text">Reconnecting…</span>}
                </div>
                {p.isHost && <span className="host-badge">Host</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="lobby-actions">
          {isHost ? (
            <button
              className="btn btn-primary btn-large"
              onClick={onStartGame}
              disabled={!canStart}
            >
              {canStart ? 'Start Game' : 'Waiting for at least 2 players'}
            </button>
          ) : (
            <div className="waiting-for-host">
              <div className="spinner"></div>
              <span>Waiting for host to start…</span>
            </div>
          )}
        </div>

        <div className="game-rules card">
          <h4>How to play</h4>
          <ul>
            <li>No talking! Play cards in ascending order (1–100)</li>
            <li>At level N, everyone gets N cards</li>
            <li>You can only play your lowest card. Tap it when it feels right</li>
            <li>Tap “I'm ready” together before each level</li>
            <li>Beat {room.state.maxLevel} levels to win (12 for 2 players, 10 for 3, 8 for 4+)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default LobbyPage;
