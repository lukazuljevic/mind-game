import { useEffect, useState } from 'react';
import Card from './Card';

interface FlyingCardProps {
  startRect: DOMRect;
  endRect: DOMRect;
  number: number;
  onComplete: () => void;
}

const FlyingCard = ({ startRect, endRect, number, onComplete }: FlyingCardProps) => {
  const [style, setStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    top: startRect.top,
    left: startRect.left,
    width: startRect.width,
    height: startRect.height,
    zIndex: 1000,
    transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
    pointerEvents: 'none',
  });

  useEffect(() => {
    requestAnimationFrame(() => {
      setStyle({
        position: 'fixed',
        top: endRect.top,
        left: endRect.left,
        width: endRect.width,
        height: endRect.height,
        zIndex: 1000,
        transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)', 
        pointerEvents: 'none',
        transform: 'rotate(5deg) scale(1.1)', 
      });
    });

    const timer = setTimeout(onComplete, 600); 
    return () => clearTimeout(timer);
  }, [endRect, onComplete]);

  return (
    <div style={style}>
      <Card number={number} played />
    </div>
  );
};

export default FlyingCard;
