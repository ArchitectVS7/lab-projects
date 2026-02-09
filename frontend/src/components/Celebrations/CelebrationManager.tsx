import { AnimatePresence } from 'framer-motion';
import { useCelebrationStore } from '../../store/celebration';
import { TaskCompleteCelebration } from './TaskCompleteCelebration';
import { XPGainAnimation } from './XPGainAnimation';
import { LevelUpCelebration } from './LevelUpCelebration';

export const CelebrationManager: React.FC = () => {
  const { current, nextCelebration } = useCelebrationStore();

  if (!current) return null;

  return (
    <AnimatePresence mode="wait" onExitComplete={nextCelebration}>
      {current.type === 'TASK' && (
        <TaskCompleteCelebration key={current.id} {...current.data} />
      )}
      {current.type === 'XP' && (
        <XPGainAnimation key={current.id} {...current.data} />
      )}
      {current.type === 'LEVEL_UP' && (
        <LevelUpCelebration key={current.id} {...current.data} onClose={nextCelebration} />
      )}
    </AnimatePresence>
  );
};
