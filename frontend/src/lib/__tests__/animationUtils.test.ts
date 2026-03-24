import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the theme store before importing animationUtils so resolveAnimations()
// uses the mock rather than trying to initialise the real Zustand store.
vi.mock('../../store/theme', () => ({
  useThemeStore: {
    getState: vi.fn(),
  },
}));

import { useThemeStore } from '../../store/theme';
import {
  PERFORMANCE_ANIMATIONS,
  REDUCED_ANIMATIONS,
  NORMAL_ANIMATIONS,
  getAnimationVariants,
  getTaskCardHoverAnimation,
  getButtonHoverAnimation,
  getHoverScaleAnimation,
  getPerformanceAwareAnimation,
} from '../animationUtils';

// Convenience: set mock store state
const mockGetState = useThemeStore.getState as ReturnType<typeof vi.fn>;

function setMode(performanceMode: string, animationIntensity: string) {
  mockGetState.mockReturnValue({ performanceMode, animationIntensity });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('animationUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: balanced performance, normal animations
    setMode('balanced', 'normal');
  });

  // ── getAnimationVariants (resolveAnimations) ─────────────────────────────────

  describe('getAnimationVariants', () => {
    it('returns PERFORMANCE_ANIMATIONS when performanceMode is "performance"', () => {
      setMode('performance', 'normal');
      expect(getAnimationVariants()).toBe(PERFORMANCE_ANIMATIONS);
    });

    it('performanceMode overrides animationIntensity — even "reduced" gives PERFORMANCE', () => {
      setMode('performance', 'reduced');
      expect(getAnimationVariants()).toBe(PERFORMANCE_ANIMATIONS);
    });

    it('returns PERFORMANCE_ANIMATIONS when animationIntensity is "none"', () => {
      setMode('balanced', 'none');
      expect(getAnimationVariants()).toBe(PERFORMANCE_ANIMATIONS);
    });

    it('returns REDUCED_ANIMATIONS when animationIntensity is "reduced"', () => {
      setMode('balanced', 'reduced');
      expect(getAnimationVariants()).toBe(REDUCED_ANIMATIONS);
    });

    it('returns NORMAL_ANIMATIONS for default ("balanced" + "normal")', () => {
      setMode('balanced', 'normal');
      expect(getAnimationVariants()).toBe(NORMAL_ANIMATIONS);
    });

    it('returns NORMAL_ANIMATIONS for any unrecognised animationIntensity', () => {
      setMode('balanced', 'full');
      expect(getAnimationVariants()).toBe(NORMAL_ANIMATIONS);
    });
  });

  // ── Individual shorthand accessors ──────────────────────────────────────────

  describe('getTaskCardHoverAnimation', () => {
    it('returns the taskCardHover entry from PERFORMANCE_ANIMATIONS in performance mode', () => {
      setMode('performance', 'normal');
      expect(getTaskCardHoverAnimation()).toBe(PERFORMANCE_ANIMATIONS.taskCardHover);
    });

    it('returns the taskCardHover entry from REDUCED_ANIMATIONS in reduced mode', () => {
      setMode('balanced', 'reduced');
      expect(getTaskCardHoverAnimation()).toBe(REDUCED_ANIMATIONS.taskCardHover);
    });

    it('returns the taskCardHover entry from NORMAL_ANIMATIONS in normal mode', () => {
      setMode('balanced', 'normal');
      expect(getTaskCardHoverAnimation()).toBe(NORMAL_ANIMATIONS.taskCardHover);
    });
  });

  describe('getButtonHoverAnimation', () => {
    it('returns performance button animation when performance mode is active', () => {
      setMode('performance', 'normal');
      expect(getButtonHoverAnimation()).toBe(PERFORMANCE_ANIMATIONS.buttonHover);
    });

    it('returns normal button animation by default', () => {
      setMode('balanced', 'normal');
      expect(getButtonHoverAnimation()).toBe(NORMAL_ANIMATIONS.buttonHover);
    });
  });

  describe('getHoverScaleAnimation', () => {
    it('returns reduced hover scale animation in reduced mode', () => {
      setMode('balanced', 'reduced');
      expect(getHoverScaleAnimation()).toBe(REDUCED_ANIMATIONS.hoverScale);
    });

    it('returns normal hover scale animation by default', () => {
      setMode('balanced', 'normal');
      expect(getHoverScaleAnimation()).toBe(NORMAL_ANIMATIONS.hoverScale);
    });
  });

  // ── getPerformanceAwareAnimation ─────────────────────────────────────────────

  describe('getPerformanceAwareAnimation', () => {
    const base = { scale: 1.1, opacity: 0.9 };
    const fallback = { scale: 1 };

    it('returns fallback when performanceMode is "performance"', () => {
      setMode('performance', 'normal');
      expect(getPerformanceAwareAnimation(base, fallback)).toBe(fallback);
    });

    it('returns fallback when animationIntensity is "none"', () => {
      setMode('balanced', 'none');
      expect(getPerformanceAwareAnimation(base, fallback)).toBe(fallback);
    });

    it('returns base animation in normal mode', () => {
      setMode('balanced', 'normal');
      expect(getPerformanceAwareAnimation(base, fallback)).toBe(base);
    });

    it('returns base animation in reduced mode (not fully disabled)', () => {
      setMode('balanced', 'reduced');
      expect(getPerformanceAwareAnimation(base, fallback)).toBe(base);
    });

    it('defaults to empty-object fallback when second arg is omitted', () => {
      setMode('performance', 'normal');
      expect(getPerformanceAwareAnimation(base)).toEqual({});
    });

    it('empty-object fallback is a new object on each call when omitted', () => {
      setMode('performance', 'normal');
      const a = getPerformanceAwareAnimation(base);
      const b = getPerformanceAwareAnimation(base);
      expect(a).toEqual(b);
    });
  });

  // ── Animation constant shape verification ───────────────────────────────────

  describe('animation constant shapes', () => {
    it('PERFORMANCE_ANIMATIONS: all entries have zero-duration transitions', () => {
      for (const [key, anim] of Object.entries(PERFORMANCE_ANIMATIONS)) {
        expect(
          anim.transition.duration,
          `${key}.transition.duration should be 0`,
        ).toBe(0);
      }
    });

    it('PERFORMANCE_ANIMATIONS: all three keys are present', () => {
      expect(PERFORMANCE_ANIMATIONS).toHaveProperty('taskCardHover');
      expect(PERFORMANCE_ANIMATIONS).toHaveProperty('buttonHover');
      expect(PERFORMANCE_ANIMATIONS).toHaveProperty('hoverScale');
    });

    it('REDUCED_ANIMATIONS: transitions use short durations (≤ 0.2s)', () => {
      for (const [key, anim] of Object.entries(REDUCED_ANIMATIONS)) {
        const dur = anim.transition.duration as number | undefined;
        if (dur !== undefined) {
          expect(dur, `${key} duration should be ≤ 0.2s`).toBeLessThanOrEqual(0.2);
        }
      }
    });

    it('NORMAL_ANIMATIONS: taskCardHover lifts element (y < 0)', () => {
      const hover = NORMAL_ANIMATIONS.taskCardHover.whileHover as Record<string, unknown>;
      expect(typeof hover?.y).toBe('number');
      expect((hover.y as number)).toBeLessThan(0);
    });
  });
});
