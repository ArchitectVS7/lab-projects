import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface XPBarProps {
  currentXP: number;
  level: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
}

export const XPBar: React.FC<XPBarProps> = ({
  currentXP,
  level,
  xpForCurrentLevel,
  xpForNextLevel,
}) => {
  const [displayXP, setDisplayXP] = useState(currentXP);

  useEffect(() => {
    // Animate XP changes
    const duration = 500;
    const startXP = displayXP;
    const diff = currentXP - startXP;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      setDisplayXP(Math.floor(startXP + diff * progress));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    if (diff !== 0) {
      requestAnimationFrame(animate);
    }
  }, [currentXP]);

  const progress = ((displayXP - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100;
  const xpProgress = displayXP - xpForCurrentLevel;
  const xpRemaining = xpForNextLevel - displayXP;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-600">
          Level {level}
        </span>
        <span className="text-xs text-gray-500">
          {xpProgress.toLocaleString()} / {(xpForNextLevel - xpForCurrentLevel).toLocaleString()} XP
        </span>
      </div>

      <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />

        {/* Shine effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          animate={{
            x: ['-100%', '200%'],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3,
          }}
        />
      </div>

      <div className="flex justify-between items-center mt-1">
        <span className="text-xs text-gray-500">
          {Math.floor(progress)}%
        </span>
        <span className="text-xs text-gray-500">
          {xpRemaining.toLocaleString()} XP to Level {level + 1}
        </span>
      </div>
    </div>
  );
};
