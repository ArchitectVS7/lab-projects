import { useThemeStore } from '../store/theme';

// Define types for animation properties
type AnimationProperties = {
  whileHover?: Record<string, unknown>;
  whileTap?: Record<string, unknown>;
  transition: Record<string, unknown>;
};

// Zero-duration animations (performance mode or animation intensity = none)
export const PERFORMANCE_ANIMATIONS: Record<string, AnimationProperties> = {
  taskCardHover: {
    whileHover: { y: 0, boxShadow: 'none' },
    transition: { duration: 0 }
  },
  buttonHover: {
    whileHover: {},
    whileTap: {},
    transition: { duration: 0 }
  },
  hoverScale: {
    whileHover: {},
    whileTap: {},
    transition: { duration: 0 }
  }
};

// Conservative animations for reduced motion preference
export const REDUCED_ANIMATIONS: Record<string, AnimationProperties> = {
  taskCardHover: {
    whileHover: { y: -2 },
    transition: { duration: 0.15 }
  },
  buttonHover: {
    whileHover: { scale: 1.05 },
    whileTap: { scale: 0.97 },
    transition: { duration: 0.1 }
  },
  hoverScale: {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 },
    transition: { duration: 0.1 }
  }
};

// Full animations (normal intensity)
export const NORMAL_ANIMATIONS: Record<string, AnimationProperties> = {
  taskCardHover: {
    whileHover: { y: -6, boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)' },
    transition: { duration: 0.3, type: 'spring' as const, stiffness: 300 }
  },
  buttonHover: {
    whileHover: { scale: 1.12 },
    whileTap: { scale: 0.92 },
    transition: { type: 'spring', stiffness: 400, damping: 17 }
  },
  hoverScale: {
    whileHover: { scale: 1.08 },
    whileTap: { scale: 0.92 },
    transition: { duration: 0.2 }
  }
};

/**
 * Resolve animation set based on animationIntensity (primary) and performanceMode (secondary override).
 * Performance mode can still force-disable animations regardless of intensity preference.
 */
function resolveAnimations(): Record<string, AnimationProperties> {
  const { performanceMode, animationIntensity } = useThemeStore.getState();

  // Performance mode is a hard override
  if (performanceMode === 'performance') return PERFORMANCE_ANIMATIONS;

  switch (animationIntensity) {
    case 'none': return PERFORMANCE_ANIMATIONS;
    case 'reduced': return REDUCED_ANIMATIONS;
    default: return NORMAL_ANIMATIONS;
  }
}

export const getAnimationVariants = () => resolveAnimations();

export const getTaskCardHoverAnimation = () => resolveAnimations().taskCardHover;

export const getButtonHoverAnimation = () => resolveAnimations().buttonHover;

export const getHoverScaleAnimation = () => resolveAnimations().hoverScale;

// Utility function kept for backwards compat
export function getPerformanceAwareAnimation<T extends Record<string, unknown>>(baseAnimation: T, fallbackAnimation: T = {} as T): T {
  const { performanceMode, animationIntensity } = useThemeStore.getState();
  if (performanceMode === 'performance' || animationIntensity === 'none') {
    return fallbackAnimation;
  }
  return baseAnimation;
}
