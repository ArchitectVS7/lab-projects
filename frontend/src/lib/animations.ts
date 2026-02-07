// Shared Framer Motion animation variants

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const slideUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const hoverScale = {
  whileHover: { scale: 1.08 },
  whileTap: { scale: 0.92 },
  transition: { duration: 0.2 }
};

export const buttonHover = {
  whileHover: { scale: 1.12 },
  whileTap: { scale: 0.92 },
  transition: { type: 'spring', stiffness: 400, damping: 17 }
};

// Page transition variants
export const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: 'easeIn' as const } },
};

// Modal overlay animation
export const modalOverlay = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

// Modal content animation
export const modalContent = {
  initial: { opacity: 0, scale: 0.95, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
  exit: { opacity: 0, scale: 0.97, y: 5, transition: { duration: 0.15, ease: 'easeIn' as const } },
};

// Task card hover effect
export const taskCardHover = {
  whileHover: { y: -6, boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)' },
  transition: { duration: 0.3, type: 'spring' as const, stiffness: 300 }
};

// Drag indicator pulse
export const dragIndicator = {
  animate: { scale: [1, 1.05, 1], transition: { repeat: Infinity, duration: 1.5 } },
};

// List item stagger
export const listItemVariant = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.4 } },
  exit: { opacity: 0, x: 10 },
};

// Celebratory animation
export const celebration = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.6, type: 'spring', stiffness: 200 }
  }
};

// Insight fade in animation (staggered)
export const insightFadeIn = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeInOutQuart' } }
};
