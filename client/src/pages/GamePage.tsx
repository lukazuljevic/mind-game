import { GameRoom, Player } from '../types';
import { useRef, useState, useEffect } from 'react';
import Card from '../components/Card';
import FlyingCard from '../components/FlyingCard';
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
  const canPlay = myCards.length > 0 && state.status === 'playing' && !state.isLocked;
  const isGameOver = state.status === 'won' || state.status === 'lost';
  const totalFails = room.players.reduce((sum, p) => sum + p.fails, 0);

  const myHandRef = useRef<HTMLDivElement>(null);
  const playPileRef = useRef<HTMLDivElement>(null);
  const otherPlayerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  const [flyingCards, setFlyingCards] = useState<{
    id: number;
    startRect: DOMRect;
    endRect: DOMRect;
    card: number;
  }[]>([]);

  // Track the previous card to detect *new* plays
  const prevCardRef = useRef<number | null>(null);

  useEffect(() => {
    const currentCard = state.currentCard;
    const prevCard = prevCardRef.current;
    
    // Only animate if there's a new card and it's different from before
    // AND it's not a level reset (where currentCard might become null or change abruptly)
    // We check if currentCard is valid and actually 'new'
    if (currentCard !== null && currentCard !== prevCard) {
      // Find who played this card? We don't have that info directly in 'state', 
      // but we can infer it or we might need the server to send 'playerId' with state.
      // However, App.tsx receives 'card-played' event with playerId.
      // But GamePage relies on 'room' prop.
      // 
      // Workaround: We can't perfectly know WHO played it just from 'room' prop update 
      // without extra info. Beause 'room' update replaces the state.
      // 
      // ALTERNATIVE: Use a ref to track card counts to guess who played? 
      // Or just animate from "center" if unknown? 
      // 
      // BETTER: The user asked for "depending which player played it".
      // 'room.state.currentCard' doesn't say who played it.
      // But! In `App.tsx`, `onCardPlayed` updates the room. 
      // Effect in GamePage triggers on room update.
      // We need to know the SOURCE. 
      //
      // Let's deduce it: logic -> check whose card count decreased? 
      // That's tricky if multiple events fire.
      // 
      // Let's just animate from "bottom" if it was me, or "top/random" if others?
      // No, we want precision.
      //
      // Solution: We'll scan players to see who is missing this card in their original hand?
      // No, we don't have history.
      //
      // Actually, we can assume if *my* hand lost the card, it's me.
      // If *someone else* lost a card count, it's them.
      // We need `prevPlayers` state to compare.
    }
    prevCardRef.current = currentCard;
  }, [state.currentCard]);

  // Actually, a cleaner way is to expose an `onCardPlay` event from App.tsx OR
  // just compare the room state.
  // Let's implement a "Previous Room" ref to compare against.
  const prevRoomRef = useRef<GameRoom>(room);
  
  useEffect(() => {
    const prevRoom = prevRoomRef.current;
    const currentCard = room.state.currentCard;
    
    if (currentCard && currentCard !== prevRoom.state.currentCard) {
      let sourceRect: DOMRect | null = null;
      let targetRect = playPileRef.current?.getBoundingClientRect();

      // Check if I played it
      const myPrevCards = prevRoom.players.find(p => p.id === player.id)?.cards || [];
      const myCurrentCards = player.cards;
      
      if (myPrevCards.includes(currentCard) && !myCurrentCards.includes(currentCard)) {
        // I played it
        sourceRect = myHandRef.current?.getBoundingClientRect() || null;
      } else {
        // Someone else played it
        const otherPlayer = room.players.find(p => {
           if (p.id === player.id) return false;
           // We can't see their card numbers, only count. 
           // BUT, we know the card was played. 
           // If their count decreased, it *might* be them.
           // However, multpile people might play fast.
           // 
           // Simplified approach: Find the player whose card count decreased.
           const prevP = prevRoom.players.find(pp => pp.id === p.id);
           return prevP && prevP.cards.length > p.cards.length;
        });
        
        if (otherPlayer) {
           sourceRect = otherPlayerRefs.current[otherPlayer.id]?.getBoundingClientRect() || null;
        }
      }

      if (sourceRect && targetRect) {
         const newFlyingCard = {
           id: Date.now(),
           startRect: sourceRect,
           endRect: targetRect,
           card: currentCard
         };
         setFlyingCards(prev => [...prev, newFlyingCard]);
      }
    }
    
    prevRoomRef.current = room;
  }, [room, player.id]);

  const removeFlyingCard = (id: number) => {
    setFlyingCards(prev => prev.filter(fc => fc.id !== id));
  };

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
            <div 
              key={p.id} 
              className="other-player"
              ref={el => otherPlayerRefs.current[p.id] = el}
            >
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
          <div 
            className={`play-pile ${state.currentCard ? 'has-card' : ''}`}
            ref={playPileRef}
          >
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
        <div className="my-hand" ref={myHandRef}>
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
      
      {/* Render flying cards layer */}
      {flyingCards.map(fc => (
        <FlyingCard
          key={fc.id}
          number={fc.card}
          startRect={fc.startRect}
          endRect={fc.endRect}
          onComplete={() => removeFlyingCard(fc.id)}
        />
      ))}
    </div>
  );
}

export default GamePage;
