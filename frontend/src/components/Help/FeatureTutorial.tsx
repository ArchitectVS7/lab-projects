import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useHelp } from '../../context/HelpContext';

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8; // px around the highlighted element

function getElementRect(selector: string): SpotlightRect | null {
  try {
    const el = document.querySelector(selector);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      top: rect.top - PADDING,
      left: rect.left - PADDING,
      width: rect.width + PADDING * 2,
      height: rect.height + PADDING * 2,
    };
  } catch {
    return null;
  }
}

type TooltipSide = 'below' | 'above' | 'left' | 'right' | 'center';

function computeTooltipPosition(
  spot: SpotlightRect | null,
  tooltipWidth: number,
  tooltipHeight: number,
  preferredSide?: 'top' | 'bottom' | 'left' | 'right'
): { side: TooltipSide; style: React.CSSProperties } {
  if (!spot) {
    return {
      side: 'center',
      style: {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      },
    };
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const gap = 16;

  // Map preferred side to our internal naming
  const order: TooltipSide[] =
    preferredSide === 'top'
      ? ['above', 'below', 'right', 'left']
      : preferredSide === 'left'
      ? ['left', 'right', 'below', 'above']
      : preferredSide === 'right'
      ? ['right', 'left', 'below', 'above']
      : ['below', 'above', 'right', 'left'];

  for (const side of order) {
    if (side === 'below') {
      const top = spot.top + spot.height + gap;
      const left = Math.min(
        Math.max(spot.left + spot.width / 2 - tooltipWidth / 2, 12),
        vw - tooltipWidth - 12
      );
      if (top + tooltipHeight < vh - 12) {
        return { side: 'below', style: { position: 'fixed', top, left } };
      }
    }
    if (side === 'above') {
      const top = spot.top - tooltipHeight - gap;
      const left = Math.min(
        Math.max(spot.left + spot.width / 2 - tooltipWidth / 2, 12),
        vw - tooltipWidth - 12
      );
      if (top > 12) {
        return { side: 'above', style: { position: 'fixed', top, left } };
      }
    }
    if (side === 'right') {
      const left = spot.left + spot.width + gap;
      const top = Math.min(
        Math.max(spot.top + spot.height / 2 - tooltipHeight / 2, 12),
        vh - tooltipHeight - 12
      );
      if (left + tooltipWidth < vw - 12) {
        return { side: 'right', style: { position: 'fixed', top, left } };
      }
    }
    if (side === 'left') {
      const left = spot.left - tooltipWidth - gap;
      const top = Math.min(
        Math.max(spot.top + spot.height / 2 - tooltipHeight / 2, 12),
        vh - tooltipHeight - 12
      );
      if (left > 12) {
        return { side: 'left', style: { position: 'fixed', top, left } };
      }
    }
  }

  // Fallback: center
  return {
    side: 'center',
    style: {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    },
  };
}

export function FeatureTutorial() {
  const {
    activeTutorial,
    tutorialStep,
    closeTutorial,
    nextTutorialStep,
    prevTutorialStep,
  } = useHelp();

  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<React.CSSProperties>({});

  const currentStep = activeTutorial?.steps[tutorialStep];

  const updatePositions = useCallback(() => {
    if (!activeTutorial || !currentStep) {
      setSpotlightRect(null);
      return;
    }
    const rect = currentStep.targetSelector
      ? getElementRect(currentStep.targetSelector)
      : null;
    setSpotlightRect(rect);

    const tooltipWidth = 320;
    const tooltipHeight = tooltipRef.current?.offsetHeight ?? 200;
    const { style } = computeTooltipPosition(
      rect,
      tooltipWidth,
      tooltipHeight,
      currentStep.position
    );
    setTooltipPos(style);
  }, [activeTutorial, currentStep]);

  // Recalculate on step change and resize
  useLayoutEffect(() => {
    updatePositions();
  }, [updatePositions]);

  useEffect(() => {
    window.addEventListener('resize', updatePositions);
    return () => window.removeEventListener('resize', updatePositions);
  }, [updatePositions]);

  // Keyboard support
  useEffect(() => {
    if (!activeTutorial) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeTutorial();
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextTutorialStep();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prevTutorialStep();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTutorial, closeTutorial, nextTutorialStep, prevTutorialStep]);

  if (!activeTutorial || !currentStep) return null;

  const isLastStep = tutorialStep === activeTutorial.steps.length - 1;
  const isFirstStep = tutorialStep === 0;
  const totalSteps = activeTutorial.steps.length;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50" aria-modal="true" role="dialog" aria-label={`${activeTutorial.name} tutorial`}>
        {/* Overlay */}
        <div
          className="absolute inset-0"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={closeTutorial}
        />

        {/* Spotlight hole */}
        {spotlightRect && (
          <div
            className="absolute pointer-events-none rounded-lg"
            style={{
              top: spotlightRect.top,
              left: spotlightRect.left,
              width: spotlightRect.width,
              height: spotlightRect.height,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)',
              borderRadius: 8,
              border: '2px solid rgba(99, 102, 241, 0.7)',
            }}
          />
        )}

        {/* Tooltip card */}
        <motion.div
          ref={tooltipRef}
          key={`step-${tutorialStep}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.18 }}
          className="absolute w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden"
          style={{ ...tooltipPos, pointerEvents: 'auto' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Card header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            {/* Step dots */}
            <div className="flex items-center gap-1.5">
              {activeTutorial.steps.map((_, i) => (
                <span
                  key={i}
                  className={`block rounded-full transition-all duration-200 ${
                    i === tutorialStep
                      ? 'w-4 h-2 bg-indigo-500'
                      : 'w-2 h-2 bg-gray-200 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={closeTutorial}
              aria-label="Skip tutorial"
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="px-4 pb-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg" aria-hidden="true">{activeTutorial.icon}</span>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-snug">
                {currentStep.title}
              </h3>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              {currentStep.description}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={prevTutorialStep}
              disabled={isFirstStep}
              aria-label="Previous step"
              className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
              Back
            </button>

            <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
              {tutorialStep + 1} / {totalSteps}
            </span>

            {isLastStep ? (
              <button
                onClick={closeTutorial}
                className="flex items-center gap-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg transition-colors"
              >
                Got it!
              </button>
            ) : (
              <button
                onClick={nextTutorialStep}
                aria-label="Next step"
                className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 transition-colors"
              >
                Next
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
