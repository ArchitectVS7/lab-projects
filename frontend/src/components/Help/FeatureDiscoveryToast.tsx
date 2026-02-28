import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useHelp } from '../../context/HelpContext';

const TOAST_DURATION_MS = 6000;
const PROGRESS_TICK_MS = 50;

/**
 * Module-scoped store for the currently-displayed feature snapshot.
 * Using useSyncExternalStore so the value is available during render
 * without violating React 19's ref-during-render rules.
 */
type Feature = { featureId: string; name: string; tagline: string; icon: string };
let _latestFeature: Feature | null = null;
let _listeners: Array<() => void> = [];

function setLatestFeature(f: Feature | null) {
  _latestFeature = f;
  _listeners.forEach((l) => l());
}

function subscribeLatest(cb: () => void) {
  _listeners.push(cb);
  return () => {
    _listeners = _listeners.filter((l) => l !== cb);
  };
}

function getLatest() {
  return _latestFeature;
}

export function FeatureDiscoveryToast() {
  const { pendingDiscovery, markFeatureSeen, openTutorial } = useHelp();
  const displayedFeature = useSyncExternalStore(subscribeLatest, getLatest);

  // Track which featureId we've already shown to avoid re-triggering.
  const [shownFor, setShownFor] = useState<string | null>(null);
  // Bumped each time a new toast should appear; the effect uses this as a trigger.
  const [toastGeneration, setToastGeneration] = useState(0);
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  // Detect new discovery: pendingDiscovery changed to something we haven't shown.
  const newFeatureId = pendingDiscovery?.featureId ?? null;
  const isNewDiscovery = newFeatureId !== null && newFeatureId !== shownFor;

  // Respond to new discoveries — state updates during render are batched by React.
  if (isNewDiscovery && pendingDiscovery) {
    setShownFor(newFeatureId);
    setLatestFeature(pendingDiscovery as Feature);
    markFeatureSeen(newFeatureId);
    setToastGeneration((g) => g + 1);
    setVisible(true);
    setProgress(100);
  }

  // Progress countdown + auto-dismiss timer (syncing with the interval — valid effect)
  useEffect(() => {
    if (!visible) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / TOAST_DURATION_MS) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        setVisible(false);
        clearInterval(interval);
      }
    }, PROGRESS_TICK_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toastGeneration]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
  }, []);

  const handleLearnMore = useCallback(() => {
    if (displayedFeature) openTutorial(displayedFeature.featureId);
    setVisible(false);
  }, [displayedFeature, openTutorial]);

  return (
    <AnimatePresence>
      {visible && displayedFeature && (
        <motion.div
          key={displayedFeature.featureId}
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          className="fixed bottom-6 right-6 z-40 w-80 rounded-xl overflow-hidden shadow-2xl"
          style={{
            background: 'rgba(17, 24, 39, 0.92)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* Header */}
          <div className="flex items-start gap-3 px-4 pt-4 pb-3">
            <span className="text-2xl leading-none mt-0.5" aria-hidden="true">
              {displayedFeature.icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-0.5">
                Feature discovered
              </p>
              <h3 className="text-sm font-bold text-white leading-snug">
                {displayedFeature.name}
              </h3>
              <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                {displayedFeature.tagline}
              </p>
            </div>
            <button
              onClick={handleDismiss}
              aria-label="Dismiss"
              className="flex-shrink-0 text-gray-500 hover:text-gray-300 transition-colors mt-0.5"
            >
              <X size={14} />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 px-4 pb-3">
            <button
              onClick={handleDismiss}
              className="flex-1 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-200 rounded-lg transition-colors border border-transparent hover:border-gray-600"
            >
              Dismiss
            </button>
            <button
              onClick={handleLearnMore}
              className="flex-1 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
            >
              Learn More →
            </button>
          </div>

          {/* Progress bar */}
          <div className="h-0.5 w-full bg-gray-700">
            <motion.div
              className="h-full bg-indigo-500"
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.05, ease: 'linear' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
