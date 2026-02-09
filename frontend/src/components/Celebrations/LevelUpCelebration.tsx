import { useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

interface LevelUpCelebrationProps {
  newLevel: number;
  rewards?: {
    type: string;
    name: string;
    description: string;
  };
  onClose: () => void;
}

export const LevelUpCelebration: React.FC<LevelUpCelebrationProps> = ({
  newLevel,
  rewards,
  onClose,
}) => {
  useEffect(() => {
    // Epic confetti celebration
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function () {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);

      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-3xl p-12 text-center max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            repeatDelay: 1,
          }}
          className="text-8xl mb-4"
        >
          ⭐
        </motion.div>

        <h1 className="text-5xl font-bold text-white mb-2">LEVEL UP!</h1>

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5 }}
          className="text-7xl font-bold text-yellow-300 mb-6"
        >
          {newLevel}
        </motion.div>

        {rewards && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1 }}
            className="bg-white/20 rounded-xl p-6 backdrop-blur-sm"
          >
            <h3 className="text-xl font-bold text-white mb-2">New Reward Unlocked!</h3>
            <p className="text-lg text-yellow-200 mb-1">{rewards.name}</p>
            <p className="text-sm text-white/80">{rewards.description}</p>
          </motion.div>
        )}

        <motion.button
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.5 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="mt-8 bg-white text-purple-600 font-bold py-3 px-8 rounded-full shadow-lg"
          onClick={onClose}
        >
          Awesome!
        </motion.button>
      </motion.div>
    </motion.div>
  );
};
