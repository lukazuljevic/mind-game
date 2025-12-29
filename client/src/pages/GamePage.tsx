import { GameRoom, Player } from '../types';
import Card from '../components/Card';
import './GamePage.css';

interface GamePageProps {
  room: GameRoom;
  player: Player;
  onPlayCard: () => void;
  onLeaveRoom: () => void;
}

function GamePage({ room, player, onPlayCard, onLeaveRoom }: GamePageProps) {
  const { state } = room;
  const otherPlayers = room.players.filter((p) => p.id !== player.id);
  const myCards = player.cards;
  const canPlay = myCards.length > 0 && state.status === 'playing';
  const isGameOver = state.status === 'won' || state.status === 'lost';
  const totalFails = room.players.reduce((sum, p) => sum + p.fails, 0);

  return (
    <div className="game-page">
      <div className="game-header">
        <button className="back-button" onClick={onLeaveRoom}>
          ← Exit
        </button>
        <div className="game-stats">
          <div className="stat">
            <span className="stat-label">Level</span>
            <span className="stat-value">{state.level}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Fails</span>
            <span className="stat-value">{totalFails}</span>
          </div>
        </div>
      </div>

      <div className="game-board">
        {/* Other players */}
        <div className="other-players">
          {otherPlayers.map((p) => (
            <div key={p.id} className="other-player">
              <div className="player-avatar-small">
                {p.name.charAt(0).toUpperCase()}
                {p.fails > 0 && <span className="fail-badge">{p.fails}</span>}
              </div>
              <span className="player-name-small">{p.name}</span>
              <div className="card-count">
                {p.cards.length} {p.cards.length === 1 ? 'card' : 'cards'}
              </div>
            </div>
          ))}
        </div>

        {/* Play pile */}
        <div className="play-area">
          <div className={`play-pile ${state.currentCard ? 'has-card' : ''}`}>
            {state.currentCard !== null ? (
              <Card number={state.currentCard} size="large" played />
            ) : (
              <div className="pile-placeholder">
                <span>Play Cards Here</span>
                <span className="pile-hint">1 → 100</span>
              </div>
            )}
          </div>
          
          {state.playedCards.length > 1 && (
            <div className="played-count">
              {state.playedCards.length} cards played
            </div>
          )}
        </div>

        {/* Game over overlay */}
        {isGameOver && (
          <div className="game-over-overlay animate-fadeIn">
            <div className="game-over-card card">
              {state.status === 'won' ? (
                <>
                  <div className="game-over-icon">🏆</div>
                  <h2>You Won!</h2>
                  <p>Amazing synchronization! You completed all 12 levels.</p>
                </>
              ) : (
                <>
                  <div className="game-over-icon">💔</div>
                  <h2>Game Over</h2>
                  <p>You made it to level {state.level}. Try again!</p>
                </>
              )}
              <button className="btn btn-primary" onClick={onLeaveRoom}>
                Back to Home
              </button>
            </div>
          </div>
        )}
      </div>

      {/* My hand */}
      <div className="my-hand-section">
        <div className="hand-label">
          Your Cards
          {player.fails > 0 && <span className="my-fail-badge">{player.fails}</span>}
        </div>
        <div className="my-hand">
          {myCards.length > 0 ? (
            myCards.map((card, index) => (
              <Card
                key={card}
                number={card}
                isLowest={index === 0}
                onClick={index === 0 ? onPlayCard : undefined}
                disabled={!canPlay || index !== 0}
              />
            ))
          ) : (
            <div className="no-cards">
              {state.status === 'playing' ? 'All cards played!' : 'Waiting...'}
            </div>
          )}
        </div>
        {canPlay && myCards.length > 0 && (
          <p className="play-hint">Tap your lowest card when you feel it's time</p>
        )}
      </div>
    </div>
  );
}

export default GamePage;
