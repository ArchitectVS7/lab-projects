import { motion } from 'framer-motion';

interface XPGainAnimationProps {
  xp: number;
  source: string;
}

export const XPGainAnimation: React.FC<XPGainAnimationProps> = ({ xp, source }) => {
  return (
    <motion.div
      initial={{ y: 0, opacity: 1, scale: 0.5 }}
      animate={{ y: -100, opacity: 0, scale: 1.2 }}
      transition={{ duration: 1, ease: 'easeOut' }}
      className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none"
    >
      <motion.div
        initial={{ scale: 0.5 }}
        animate={{ scale: 1.2 }}
        transition={{ duration: 0.3 }}
        className="text-4xl font-bold text-yellow-500"
        style={{ textShadow: '0 0 10px rgba(234, 179, 8, 0.5)' }}
      >
        +{xp} XP
      </motion.div>
      <div className="text-center text-sm text-gray-600 mt-1">{source}</div>
    </motion.div>
  );
};
