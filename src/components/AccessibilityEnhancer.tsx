import { useEffect } from 'react';

// Skip to main content component for accessibility
export const SkipToMain = () => {
  return (
    <a 
      href="#main-content" 
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg z-50 transition-all duration-200"
      tabIndex={0}
    >
      Skip to main content
    </a>
  );
};

// Focus management hook
export const useFocusManagement = () => {
  useEffect(() => {
    // Ensure proper focus indicators are visible
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        document.body.classList.add('keyboard-navigation');
      }
    };

    const handleMousedown = () => {
      document.body.classList.remove('keyboard-navigation');
    };

    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('mousedown', handleMousedown);

    return () => {
      document.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('mousedown', handleMousedown);
    };
  }, []);
};

// Accessible button component
interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  ariaLabel?: string;
  variant?: 'default' | 'premium' | 'glass' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'xl' | 'icon';
}

export const AccessibleButton = ({ 
  children, 
  ariaLabel, 
  className = '',
  ...props 
}: AccessibleButtonProps) => {
  return (
    <button
      {...props}
      aria-label={ariaLabel}
      className={`focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${className}`}
    >
      {children}
    </button>
  );
};

// Screen reader announcements
export const announceToScreenReader = (message: string) => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.setAttribute('class', 'sr-only');
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};