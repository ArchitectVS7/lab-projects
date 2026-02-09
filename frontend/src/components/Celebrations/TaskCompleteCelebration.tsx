import { useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

interface TaskCompleteCelebrationProps {
  taskName: string;
}

export const TaskCompleteCelebration: React.FC<TaskCompleteCelebrationProps> = ({
  taskName,
}) => {
  useEffect(() => {
    // Quick confetti burst
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#3B82F6', '#10B981', '#F59E0B'],
      ticks: 60,
    });
  }, []);

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className="fixed top-20 right-8 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 max-w-sm"
    >
      <div className="flex items-center gap-3">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 0.5 }}
          className="text-2xl"
        >
          ✓
        </motion.div>
        <div>
          <div className="font-bold">Task Complete!</div>
          <div className="text-sm opacity-90 truncate">{taskName}</div>
        </div>
      </div>
    </motion.div>
  );
};
