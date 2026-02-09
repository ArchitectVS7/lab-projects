import { motion } from 'framer-motion';

interface LevelBadgeProps {
  level: number;
  size?: 'sm' | 'md' | 'lg';
  showXP?: boolean;
  currentXP?: number;
  onClick?: () => void;
}

export const LevelBadge: React.FC<LevelBadgeProps> = ({
  level,
  size = 'md',
  showXP = false,
  currentXP,
  onClick,
}) => {
  const sizeClasses = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-14 h-14 text-lg',
    lg: 'w-20 h-20 text-2xl',
  };

  const getBadgeColor = (level: number) => {
    if (level >= 40) return 'from-purple-600 to-pink-600';
    if (level >= 30) return 'from-blue-600 to-purple-600';
    if (level >= 20) return 'from-green-600 to-blue-600';
    if (level >= 10) return 'from-yellow-600 to-green-600';
    return 'from-gray-600 to-gray-700';
  };

  return (
    <div className="flex items-center gap-2">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className={`
          ${sizeClasses[size]}
          rounded-full
          bg-gradient-to-br ${getBadgeColor(level)}
          text-white
          font-bold
          flex items-center justify-center
          shadow-lg
          relative
          overflow-hidden
          cursor-pointer
        `}
      >
        {/* Shine effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          animate={{
            x: ['-100%', '200%'],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 5,
          }}
        />

        <span className="relative z-10">{level}</span>
      </motion.button>

      {showXP && currentXP !== undefined && (
        <div className="flex flex-col">
          <span className="text-xs font-medium text-gray-600">Level {level}</span>
          <span className="text-xs text-gray-500">{currentXP.toLocaleString()} XP</span>
        </div>
      )}
    </div>
  );
};
