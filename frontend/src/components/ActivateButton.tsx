import { ActivateButtonProps } from '../types/components';
import '../styles/ActivateButton.css';

export function ActivateButton({ onClick, disabled = false }: ActivateButtonProps) {
  return (
    <button 
      className="activate-button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Activate workspace to control radio"
    >
      <svg 
        className="activate-button__icon"
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2"
      >
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
      <span className="activate-button__text">Activate</span>
    </button>
  );
}
