import { useRef, useState, useLayoutEffect } from 'react';
import { GameRoom, LastPlay, Mistake, Player } from '../types';
import { useWakeLock } from '../utils/device';
import Card from '../components/Card';
import FlyingCard from '../components/FlyingCard';
import './GamePage.css';

interface GamePageProps {
  room: GameRoom;
  player: Player;
  mistake: Mistake | null;
  completedLevel: number | null;
  lastPlay: LastPlay | null;
  onReady: () => void;
  onPlayCard: () => void;
  onPlayAgain: () => void;
  onReturnToLobby: () => void;
  onLeaveRoom: () => void;
}

interface Flight {
  id: number;
  startRect: DOMRect;
  endRect: DOMRect;
  card: number;
}

function GamePage({
  room,
  player,
  mistake,
  completedLevel,
  lastPlay,
  onReady,
  onPlayCard,
  onPlayAgain,
  onReturnToLobby,
  onLeaveRoom,
}: GamePageProps) {
  const { state } = room;
  const otherPlayers = room.players.filter((p) => p.id !== player.id);
  const [playableCard, ...restCards] = player.cards;
  const isReadyPhase = state.status === 'ready';
  const isGameOver = state.status === 'won' || state.status === 'lost';
  const canPlay = playableCard !== undefined && state.status === 'playing' && !state.isLocked;
  const amReady = state.readyPlayers.includes(player.id);
  const totalFails = room.players.reduce((sum, p) => sum + p.fails, 0);
  const levelCleared =
    state.status === 'playing' && state.isLocked && !mistake && room.players.every((p) => p.cards.length === 0);

  const [confirmExit, setConfirmExit] = useState(false);
  const [flight, setFlight] = useState<Flight | null>(null);

  const playSlotRef = useRef<HTMLDivElement>(null);
  const playPileRef = useRef<HTMLDivElement>(null);
  const otherPlayerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const handledPlayRef = useRef(lastPlay?.id);

  useWakeLock(!isGameOver);

  // Layout effect so the flight starts before the pile paints the new card
  useLayoutEffect(() => {
    if (!lastPlay || lastPlay.id === handledPlayRef.current) return;
    handledPlayRef.current = lastPlay.id;

    const source = lastPlay.playerId === player.id
      ? playSlotRef.current
      : otherPlayerRefs.current[lastPlay.playerId];
    const target = playPileRef.current;
    if (!source || !target) return;

    setFlight({
      id: lastPlay.id,
      startRect: source.getBoundingClientRect(),
      endRect: target.getBoundingClientRect(),
      card: lastPlay.card,
    });
  }, [lastPlay, player.id]);

  // While a card is in flight, the pile keeps showing the card under it
  const playedCount = state.playedCards.length;
  const pileIndex = flight && state.currentCard === flight.card ? playedCount - 2 : playedCount - 1;
  const pileCard = pileIndex >= 0 ? state.playedCards[pileIndex] : null;
  const trail = state.playedCards.slice(Math.max(0, pileIndex - 3), Math.max(0, pileIndex));

  const nameOf = (id: string) =>
    id === player.id ? 'You' : room.players.find((p) => p.id === id)?.name ?? 'Someone';
  const notReady = room.players.filter((p) => !state.readyPlayers.includes(p.id));

  const handleExit = () => {
    if (isGameOver) {
      onLeaveRoom();
    } else {
      setConfirmExit(true);
    }
  };

  return (
    <div className="game-page">
      <div className="game-header">
        <button className="back-button" onClick={handleExit}>
          ← Exit
        </button>
        <div className="game-stats">
          <div className="stat">
            <span className="stat-label">Level</span>
            <span className="stat-value">
              {state.level}<span className="stat-max">/{state.maxLevel}</span>
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Fails</span>
            <span className="stat-value">{totalFails}</span>
          </div>
        </div>
      </div>

      <div className="other-players">
        {otherPlayers.map((p) => (
          <div
            key={p.id}
            className={`other-player ${p.connected ? '' : 'is-offline'} ${mistake?.playerId === p.id ? 'is-culprit' : ''}`}
            ref={(el) => (otherPlayerRefs.current[p.id] = el)}
          >
            <div className="player-avatar-small">
              {p.name.charAt(0).toUpperCase()}
              {p.fails > 0 && <span className="fail-badge">{p.fails}</span>}
              {isReadyPhase && state.readyPlayers.includes(p.id) && <span className="ready-badge">✓</span>}
            </div>
            <span className="player-name-small">{p.name}</span>
            <div className="card-count">
              {!p.connected ? 'offline' : `${p.cards.length} ${p.cards.length === 1 ? 'card' : 'cards'}`}
            </div>
          </div>
        ))}
      </div>

      <div className="game-board">
        {isReadyPhase ? (
          <div className="ready-panel card animate-fadeIn">
            {mistake ? (
              <>
                <div className="ready-title is-mistake">
                  {nameOf(mistake.playerId)} played {mistake.playedCard} too early
                </div>
                <div className="skipped-cards">
                  <span>Skipped:</span>
                  {mistake.lostCards.map((c) => (
                    <Card key={c} number={c} size="mini" danger />
                  ))}
                </div>
                <p className="ready-subtitle">Level {state.level} is dealt again</p>
              </>
            ) : completedLevel ? (
              <div className="ready-title">🎉 Level {completedLevel} complete!</div>
            ) : (
              <div className="ready-title">Get ready</div>
            )}

            <p className="ready-level">
              Level {state.level} of {state.maxLevel} · {state.level} {state.level === 1 ? 'card' : 'cards'} each
            </p>

            {amReady ? (
              <div className="ready-waiting">
                <div className="spinner"></div>
                <span>Waiting for {notReady.map((p) => nameOf(p.id)).join(', ')}…</span>
              </div>
            ) : (
              <button className="btn btn-primary btn-large ready-button" onClick={onReady}>
                I'm ready
              </button>
            )}
          </div>
        ) : (
          <div className="play-area">
            {trail.length > 0 && (
              <div className="played-trail" aria-label="Previously played cards">
                {trail.map((c) => (
                  <Card key={c} number={c} size="mini" />
                ))}
              </div>
            )}

            <div
              className={`play-pile ${pileCard !== null ? 'has-card' : ''} ${mistake ? 'pile-mistake' : ''} ${levelCleared ? 'pile-cleared' : ''}`}
              ref={playPileRef}
            >
              {pileCard !== null ? (
                <Card key={pileCard} number={pileCard} size="large" played danger={!!mistake && pileCard === mistake.playedCard} />
              ) : (
                <div className="pile-placeholder">
                  <span>Play cards here</span>
                  <span className="pile-hint">1 → 100</span>
                </div>
              )}
            </div>

            {mistake ? (
              <div className="mistake-info animate-fadeIn">
                <span>{nameOf(mistake.playerId)} played too early! Skipped:</span>
                <div className="skipped-cards">
                  {mistake.lostCards.map((c) => (
                    <Card key={c} number={c} size="mini" danger />
                  ))}
                </div>
              </div>
            ) : levelCleared ? (
              <div className="level-cleared animate-fadeIn">🎉 Level {state.level} complete!</div>
            ) : (
              playedCount > 0 && (
                <div className="played-count">{playedCount} played this level</div>
              )
            )}
          </div>
        )}
      </div>

      <div className="my-hand-section">
        <div className="hand-label">
          Your cards
          {player.fails > 0 && <span className="my-fail-badge">{player.fails} {player.fails === 1 ? 'fail' : 'fails'}</span>}
          {isReadyPhase && amReady && <span className="my-ready-badge">Ready ✓</span>}
        </div>

        {restCards.length > 0 && (
          <div className="hand-rest">
            {restCards.map((card) => (
              <Card key={card} number={card} disabled />
            ))}
          </div>
        )}

        <div className="play-slot" ref={playSlotRef}>
          {playableCard !== undefined ? (
            <Card
              key={playableCard}
              number={playableCard}
              size="play"
              isLowest
              onClick={onPlayCard}
              disabled={!canPlay}
            />
          ) : (
            <div className="no-cards">
              {state.status === 'playing' ? 'All your cards are played' : ''}
            </div>
          )}
        </div>

        <p className="play-hint">
          {canPlay ? 'Tap your lowest card when it feels right' : ' '}
        </p>
      </div>

      {isGameOver && (
        <div className="game-over-overlay animate-fadeIn">
          <div className="game-over-card card">
            {state.status === 'won' ? (
              <>
                <div className="game-over-icon">🏆</div>
                <h2>You Won!</h2>
                <p>
                  Amazing synchronization! All {state.maxLevel} levels completed with {totalFails}{' '}
                  {totalFails === 1 ? 'fail' : 'fails'}.
                </p>
              </>
            ) : (
              <>
                <div className="game-over-icon">💔</div>
                <h2>Game Over</h2>
                <p>Not enough players left. You reached level {state.level}.</p>
              </>
            )}
            {player.isHost ? (
              <div className="game-over-actions">
                <button
                  className="btn btn-primary"
                  onClick={onPlayAgain}
                  disabled={room.players.length < 2}
                >
                  {room.players.length < 2 ? 'Need 2+ players' : 'Play again'}
                </button>
                <button className="btn btn-secondary" onClick={onReturnToLobby}>
                  Back to lobby
                </button>
              </div>
            ) : (
              <div className="game-over-actions">
                <div className="ready-waiting">
                  <div className="spinner"></div>
                  <span>Waiting for the host…</span>
                </div>
                <button className="btn btn-secondary" onClick={onLeaveRoom}>
                  Leave
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {confirmExit && (
        <div className="game-over-overlay animate-fadeIn" onClick={() => setConfirmExit(false)}>
          <div className="game-over-card card" onClick={(e) => e.stopPropagation()}>
            <h2>Leave the game?</h2>
            <p>
              {otherPlayers.length < 2
                ? 'The game will end for everyone.'
                : 'Your cards will be removed and the level dealt again.'}
            </p>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setConfirmExit(false)}>
                Stay
              </button>
              <button className="btn btn-danger" onClick={onLeaveRoom}>
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {flight && (
        <FlyingCard
          key={flight.id}
          number={flight.card}
          startRect={flight.startRect}
          endRect={flight.endRect}
          onComplete={() => setFlight(null)}
        />
      )}
    </div>
  );
}

export default GamePage;
