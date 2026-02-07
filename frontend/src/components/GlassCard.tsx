import { motion, HTMLMotionProps } from 'framer-motion';
import { ReactNode } from 'react';
import clsx from 'clsx';
import { useThemeStore } from '../store/theme';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  className?: string;
}

export default function GlassCard({ children, className, ...props }: GlassCardProps) {
  const performanceMode = useThemeStore(state => state.performanceMode);
  
  // Skip animation in performance mode
  const shouldAnimate = performanceMode !== 'performance';
  
  return (
    <motion.div
      className={clsx(
        'glass-card dark:glass-card-dark rounded-lg',
        className
      )}
      initial={shouldAnimate ? { opacity: 0, y: 10 } : false}
      animate={shouldAnimate ? { opacity: 1, y: 0 } : {}}
      transition={shouldAnimate ? { duration: 0.2 } : { duration: 0 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
