import './Card.css';

interface CardProps {
  number: number;
  size?: 'mini' | 'normal' | 'play' | 'large';
  played?: boolean;
  isLowest?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

function Card({
  number,
  size = 'normal',
  played = false,
  isLowest = false,
  danger = false,
  disabled = false,
  onClick
}: CardProps) {
  const clickable = !!onClick && !disabled;

  const handleClick = () => {
    if (clickable) {
      onClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (clickable && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  const className = [
    'card-component',
    `card-${size}`,
    played && 'card-played',
    isLowest && 'card-lowest',
    danger && 'card-danger',
    disabled && 'card-disabled',
    onClick && 'card-clickable',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={className}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      aria-label={onClick ? `Play card ${number}` : undefined}
      aria-disabled={onClick ? disabled : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="card-inner">
        <span className="card-number">{number}</span>
        {size !== 'mini' && (
          <>
            <div className="card-corner top-left">{number}</div>
            <div className="card-corner bottom-right">{number}</div>
          </>
        )}
      </div>
    </div>
  );
}

export default Card;
