import { useEffect, useRef, useState } from 'react';
import Card from './Card';

const DURATION_MS = 350;

interface FlyingCardProps {
  startRect: DOMRect;
  endRect: DOMRect;
  number: number;
  onComplete: () => void;
}

/** A card that flies from where it was played to the pile, animated with transforms only. */
const FlyingCard = ({ startRect, endRect, number, onComplete }: FlyingCardProps) => {
  const [arrived, setArrived] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    let frame = requestAnimationFrame(() => {
      // Second frame so the start position is painted before transitioning
      frame = requestAnimationFrame(() => setArrived(true));
    });
    const timer = setTimeout(() => onCompleteRef.current(), DURATION_MS);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, []);

  const dx = startRect.left + startRect.width / 2 - (endRect.left + endRect.width / 2);
  const dy = startRect.top + startRect.height / 2 - (endRect.top + endRect.height / 2);
  const scale = Math.min(startRect.width / endRect.width, 1);

  return (
    <div
      style={{
        position: 'fixed',
        top: endRect.top,
        left: endRect.left,
        width: endRect.width,
        height: endRect.height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        pointerEvents: 'none',
        transition: `transform ${DURATION_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1)`,
        transform: arrived ? 'none' : `translate(${dx}px, ${dy}px) scale(${scale})`,
        willChange: 'transform',
      }}
    >
      <Card number={number} size="large" />
    </div>
  );
};

export default FlyingCard;
