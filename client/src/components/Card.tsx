import './Card.css';

interface CardProps {
  number: number;
  size?: 'normal' | 'large';
  played?: boolean;
  isLowest?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

function Card({ 
  number, 
  size = 'normal', 
  played = false, 
  isLowest = false,
  disabled = false,
  onClick 
}: CardProps) {
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  return (
    <div 
      className={`
        card-component 
        ${size === 'large' ? 'card-large' : ''} 
        ${played ? 'card-played animate-fadeIn' : ''}
        ${isLowest ? 'card-lowest' : ''}
        ${disabled ? 'card-disabled' : ''}
        ${onClick ? 'card-clickable' : ''}
      `}
      onClick={handleClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="card-inner">
        <span className="card-number">{number}</span>
        <div className="card-corner top-left">{number}</div>
        <div className="card-corner bottom-right">{number}</div>
      </div>
      {isLowest && !played && (
        <div className="lowest-indicator">
          <span>Play</span>
        </div>
      )}
    </div>
  );
}

export default Card;
