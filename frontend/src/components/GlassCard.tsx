import { motion, HTMLMotionProps } from 'framer-motion';
import { ReactNode } from 'react';
import clsx from 'clsx';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  className?: string;
}

export default function GlassCard({ children, className, ...props }: GlassCardProps) {
  return (
    <motion.div
      className={clsx(
        'glass-card dark:glass-card-dark rounded-lg',
        className
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
