import { memo, useMemo } from 'react';

interface PerformanceOptimizerProps {
  children: React.ReactNode;
  dependencies?: any[];
}

export const PerformanceOptimizer = memo(({ children, dependencies = [] }: PerformanceOptimizerProps) => {
  const memoizedContent = useMemo(() => children, dependencies);
  return <>{memoizedContent}</>;
});

PerformanceOptimizer.displayName = 'PerformanceOptimizer';

// Lazy loading component for images
interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
}

export const LazyImage = memo(({ src, alt, className, placeholder }: LazyImageProps) => {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={(e) => {
        if (placeholder) {
          e.currentTarget.src = placeholder;
        }
      }}
    />
  );
});

LazyImage.displayName = 'LazyImage';

// Optimized card component
interface OptimizedCardProps {
  children: React.ReactNode;
  className?: string;
  animationDelay?: string;
}

export const OptimizedCard = memo(({ children, className = '', animationDelay }: OptimizedCardProps) => {
  const style = animationDelay ? { animationDelay } : undefined;
  
  return (
    <div className={`hover-lift shadow-card hover:shadow-elegant transition-all duration-300 ${className}`} style={style}>
      {children}
    </div>
  );
});

OptimizedCard.displayName = 'OptimizedCard';