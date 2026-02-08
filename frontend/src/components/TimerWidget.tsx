import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Square, ChevronUp, ChevronDown, Timer } from 'lucide-react';
import { useTimerStore } from '../store/timer';
import { timeEntriesApi } from '../lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '../store/toast';
import clsx from 'clsx';

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function TimerWidget() {
  const { activeEntry, isPomodoro, pomodoroSeconds, clearActiveEntry, tickPomodoro, stopPomodoro } = useTimerStore();
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const [expanded, setExpanded] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [stopping, setStopping] = useState(false);
  const audioPlayed = useRef(false);

  // Calculate elapsed time
  useEffect(() => {
    if (!activeEntry) {
      setElapsed(0);
      return;
    }
    const start = new Date(activeEntry.startTime).getTime();
    const update = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [activeEntry]);

  // Pomodoro countdown
  useEffect(() => {
    if (!isPomodoro || !activeEntry) return;
    const interval = setInterval(tickPomodoro, 1000);
    return () => clearInterval(interval);
  }, [isPomodoro, activeEntry, tickPomodoro]);

  // Pomodoro complete notification
  useEffect(() => {
    if (isPomodoro && pomodoroSeconds === 0 && !audioPlayed.current) {
      audioPlayed.current = true;
      // Play notification beep using Web Audio API
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 800;
        gain.gain.value = 0.3;
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.frequency.value = 1000;
          gain2.gain.value = 0.3;
          osc2.start();
          osc2.stop(ctx.currentTime + 0.3);
        }, 400);
      } catch {
        // Audio not available
      }
      addToast('Pomodoro complete! Take a break.', 'success');
      stopPomodoro();
    }
  }, [isPomodoro, pomodoroSeconds, addToast, stopPomodoro]);

  // Reset audio flag when pomodoro restarts
  useEffect(() => {
    if (isPomodoro && pomodoroSeconds > 0) {
      audioPlayed.current = false;
    }
  }, [isPomodoro, pomodoroSeconds]);

  const handleStop = useCallback(async () => {
    if (!activeEntry || stopping) return;
    setStopping(true);
    try {
      await timeEntriesApi.stop(activeEntry.id);
      clearActiveEntry();
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      addToast('Timer stopped', 'success');
    } catch (err) {
      addToast(`Failed to stop timer: ${(err as Error).message}`, 'error');
    } finally {
      setStopping(false);
    }
  }, [activeEntry, stopping, clearActiveEntry, queryClient, addToast]);

  if (!activeEntry) return null;

  const pomodoroProgress = isPomodoro ? 1 - pomodoroSeconds / (25 * 60) : 0;
  const circumference = 2 * Math.PI * 18;

  return (
    <AnimatePresence>
      <motion.div
        data-testid="timer-widget"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-4 right-4 z-30"
      >
        <div className="glass-card dark:glass-card-dark rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden min-w-[260px]">
          <div className="p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                {isPomodoro ? (
                  <div className="relative w-10 h-10 flex-shrink-0">
                    <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                      <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-200 dark:text-gray-700" />
                      <circle
                        cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2"
                        className="text-indigo-500"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference * (1 - pomodoroProgress)}
                        strokeLinecap="round"
                      />
                    </svg>
                    <Timer size={14} className="absolute inset-0 m-auto text-indigo-500" />
                  </div>
                ) : (
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {activeEntry.task?.title || 'Timer running'}
                  </p>
                  <p className={clsx(
                    'text-lg font-mono font-bold',
                    isPomodoro ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-gray-100'
                  )}>
                    {isPomodoro ? formatElapsed(pomodoroSeconds) : formatElapsed(elapsed)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleStop}
                  disabled={stopping}
                  className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors disabled:opacity-50"
                  title="Stop timer"
                >
                  <Square size={16} fill="currentColor" />
                </button>
                <button
                  aria-label={expanded ? "Collapse timer details" : "Expand timer details"}
                  onClick={() => setExpanded(!expanded)}
                  className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                    {activeEntry.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{activeEntry.description}</p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Started {new Date(activeEntry.startTime).toLocaleTimeString()}
                    </p>
                    {isPomodoro && (
                      <p className="text-xs text-indigo-500 mt-1">
                        Pomodoro - {formatElapsed(elapsed)} elapsed
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
