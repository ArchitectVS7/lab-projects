import { useThemeStore } from '../store/theme';

// Hook to get performance-aware animation properties
export const usePerformanceAnimations = () => {
  const performanceMode = useThemeStore(state => state.performanceMode);
  const animationIntensity = useThemeStore(state => state.animationIntensity);

  const isDisabled = performanceMode === 'performance' || animationIntensity === 'none';
  const isReduced = animationIntensity === 'reduced';

  const getHoverScale = () => {
    if (isDisabled) {
      return { whileHover: {}, whileTap: {}, transition: { duration: 0 } };
    }
    if (isReduced) {
      return { whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 }, transition: { duration: 0.1 } };
    }
    return { whileHover: { scale: 1.08 }, whileTap: { scale: 0.92 }, transition: { duration: 0.2 } };
  };

  const getButtonHover = () => {
    if (isDisabled) {
      return { whileHover: {}, whileTap: {}, transition: { duration: 0 } };
    }
    if (isReduced) {
      return { whileHover: { scale: 1.05 }, whileTap: { scale: 0.97 }, transition: { duration: 0.1 } };
    }
    return { whileHover: { scale: 1.12 }, whileTap: { scale: 0.92 }, transition: { type: 'spring' as const, stiffness: 400, damping: 17 } };
  };

  const getTaskCardHover = () => {
    if (isDisabled) {
      return { whileHover: { y: 0, boxShadow: 'none' }, transition: { duration: 0 } };
    }
    if (isReduced) {
      return { whileHover: { y: -2 }, transition: { duration: 0.15 } };
    }
    return {
      whileHover: { y: -6, boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)' },
      transition: { duration: 0.3, type: 'spring' as const, stiffness: 300 }
    };
  };

  return {
    performanceMode,
    animationIntensity,
    getHoverScale,
    getButtonHover,
    getTaskCardHover
  };
};
