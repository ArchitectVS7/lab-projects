import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the theme store before importing animations so shouldDisableAnimations()
// uses the mock rather than trying to initialise the real Zustand store.
vi.mock('../../store/theme', () => ({
  useThemeStore: {
    getState: vi.fn(),
  },
}));

import { useThemeStore } from '../../store/theme';
import {
  fadeIn,
  slideUp,
  scaleIn,
  staggerContainer,
  pageTransition,
  modalOverlay,
  modalContent,
  dragIndicator,
  listItemVariant,
  celebration,
  insightFadeIn,
  getPageTransition,
  getModalOverlay,
  getModalContent,
} from '../animations';

const mockGetState = useThemeStore.getState as ReturnType<typeof vi.fn>;

function setMode(performanceMode: string, animationIntensity: string) {
  mockGetState.mockReturnValue({ performanceMode, animationIntensity });
}

beforeEach(() => {
  mockGetState.mockReset();
  setMode('normal', 'full');    // default: animations enabled
});

// ── Variant shape helpers ─────────────────────────────────────────────────────

function hasInitialAndAnimate(v: object) {
  return 'initial' in v && 'animate' in v;
}

function hasExit(v: object) {
  return 'exit' in v;
}

// ── Exported constants ────────────────────────────────────────────────────────

describe('fadeIn', () => {
  it('has initial opacity 0 and animate opacity 1', () => {
    expect((fadeIn.initial as { opacity: number }).opacity).toBe(0);
    expect((fadeIn.animate as { opacity: number }).opacity).toBe(1);
  });

  it('has exit opacity 0', () => {
    expect((fadeIn.exit as { opacity: number }).opacity).toBe(0);
  });
});

describe('slideUp', () => {
  it('has initial opacity 0 and a positive y offset', () => {
    const init = slideUp.initial as { opacity: number; y: number };
    expect(init.opacity).toBe(0);
    expect(init.y).toBeGreaterThan(0);
  });

  it('animates to opacity 1 and y 0', () => {
    const anim = slideUp.animate as { opacity: number; y: number };
    expect(anim.opacity).toBe(1);
    expect(anim.y).toBe(0);
  });
});

describe('scaleIn', () => {
  it('has initial scale below 1', () => {
    const init = scaleIn.initial as { scale: number };
    expect(init.scale).toBeGreaterThan(0);
    expect(init.scale).toBeLessThan(1);
  });

  it('animates to scale 1', () => {
    const anim = scaleIn.animate as { scale: number };
    expect(anim.scale).toBe(1);
  });
});

describe('staggerContainer', () => {
  it('has a staggerChildren value on animate.transition', () => {
    const t = (staggerContainer.animate as { transition: { staggerChildren: number } }).transition;
    expect(typeof t.staggerChildren).toBe('number');
    expect(t.staggerChildren).toBeGreaterThan(0);
  });
});

describe('pageTransition', () => {
  it('has initial, animate, and exit states', () => {
    expect(hasInitialAndAnimate(pageTransition)).toBe(true);
    expect(hasExit(pageTransition)).toBe(true);
  });

  it('starts at opacity 0 with a positive y offset', () => {
    const init = pageTransition.initial as { opacity: number; y: number };
    expect(init.opacity).toBe(0);
    expect(init.y).toBeGreaterThan(0);
  });

  it('exit goes to a negative y offset', () => {
    const exit = pageTransition.exit as { y: number };
    expect(exit.y).toBeLessThan(0);
  });
});

describe('modalOverlay', () => {
  it('fades in from opacity 0 to opacity 1', () => {
    const init = modalOverlay.initial as { opacity: number };
    const anim = modalOverlay.animate as { opacity: number };
    expect(init.opacity).toBe(0);
    expect(anim.opacity).toBe(1);
  });

  it('has transition durations on animate and exit', () => {
    const animT = (modalOverlay.animate as { transition: { duration: number } }).transition;
    const exitT = (modalOverlay.exit as { transition: { duration: number } }).transition;
    expect(animT.duration).toBeGreaterThan(0);
    expect(exitT.duration).toBeGreaterThan(0);
  });

  it('exit is faster than enter (shorter duration)', () => {
    const animDur = (modalOverlay.animate as { transition: { duration: number } }).transition.duration;
    const exitDur = (modalOverlay.exit as { transition: { duration: number } }).transition.duration;
    expect(exitDur).toBeLessThan(animDur);
  });
});

describe('modalContent', () => {
  it('starts with opacity 0, scale < 1, and positive y', () => {
    const init = modalContent.initial as { opacity: number; scale: number; y: number };
    expect(init.opacity).toBe(0);
    expect(init.scale).toBeLessThan(1);
    expect(init.y).toBeGreaterThan(0);
  });

  it('animates to opacity 1, scale 1, y 0', () => {
    const anim = modalContent.animate as { opacity: number; scale: number; y: number };
    expect(anim.opacity).toBe(1);
    expect(anim.scale).toBe(1);
    expect(anim.y).toBe(0);
  });
});

describe('dragIndicator', () => {
  it('has an animate state with infinite repeat', () => {
    const t = (dragIndicator.animate as { transition: { repeat: number } }).transition;
    expect(t.repeat).toBe(Infinity);
  });

  it('pulses scale (array of values)', () => {
    const scale = (dragIndicator.animate as { scale: number[] }).scale;
    expect(Array.isArray(scale)).toBe(true);
    expect(scale.length).toBeGreaterThan(1);
  });
});

describe('listItemVariant', () => {
  it('slides in from a negative x offset', () => {
    const init = listItemVariant.initial as { x: number };
    expect(init.x).toBeLessThan(0);
  });

  it('exits to a positive x offset', () => {
    const exit = listItemVariant.exit as { x: number };
    expect(exit.x).toBeGreaterThan(0);
  });

  it('animates to x 0 and opacity 1', () => {
    const anim = listItemVariant.animate as { x: number; opacity: number };
    expect(anim.x).toBe(0);
    expect(anim.opacity).toBe(1);
  });
});

describe('celebration', () => {
  it('uses hidden/visible keys (not initial/animate)', () => {
    expect('hidden' in celebration).toBe(true);
    expect('visible' in celebration).toBe(true);
  });

  it('hidden state has scale below 1', () => {
    expect(celebration.hidden.scale).toBeLessThan(1);
  });

  it('visible state uses spring transition', () => {
    const t = celebration.visible.transition as { type: string };
    expect(t.type).toBe('spring');
  });
});

describe('insightFadeIn', () => {
  it('fades in from opacity 0', () => {
    const init = insightFadeIn.initial as { opacity: number };
    expect(init.opacity).toBe(0);
  });

  it('has a longer duration (>= 0.5s) for a gentle fade', () => {
    const t = (insightFadeIn.animate as { transition: { duration: number } }).transition;
    expect(t.duration).toBeGreaterThanOrEqual(0.5);
  });
});

// ── get* functions — animation-disabled path ──────────────────────────────────

describe('getPageTransition', () => {
  it('returns pageTransition when animations are enabled', () => {
    setMode('normal', 'full');
    expect(getPageTransition()).toBe(pageTransition);
  });

  it('returns instant (opacity-1 no-op) when performanceMode is "performance"', () => {
    setMode('performance', 'full');
    const result = getPageTransition() as { initial: { opacity: number } };
    expect(result.initial.opacity).toBe(1);
    expect(result).not.toBe(pageTransition);
  });

  it('returns instant when animationIntensity is "none"', () => {
    setMode('normal', 'none');
    const result = getPageTransition() as { initial: { opacity: number } };
    expect(result.initial.opacity).toBe(1);
  });
});

describe('getModalOverlay', () => {
  it('returns modalOverlay when animations are enabled', () => {
    setMode('normal', 'full');
    expect(getModalOverlay()).toBe(modalOverlay);
  });

  it('returns instant no-op when animations are disabled', () => {
    setMode('performance', 'full');
    const result = getModalOverlay() as { animate: { opacity: number } };
    expect(result.animate.opacity).toBe(1);
    expect(result).not.toBe(modalOverlay);
  });
});

describe('getModalContent', () => {
  it('returns modalContent when animations are enabled', () => {
    setMode('normal', 'full');
    expect(getModalContent()).toBe(modalContent);
  });

  it('returns instant no-op when performanceMode is "performance"', () => {
    setMode('performance', 'full');
    const result = getModalContent() as { initial: { opacity: number } };
    expect(result.initial.opacity).toBe(1);
    expect(result).not.toBe(modalContent);
  });

  it('returns instant no-op when animationIntensity is "none"', () => {
    setMode('normal', 'none');
    const result = getModalContent() as { initial: { opacity: number } };
    expect(result.initial.opacity).toBe(1);
  });

  it('returns modalContent for animationIntensity "reduced" (not fully disabled)', () => {
    setMode('normal', 'reduced');
    // "reduced" is not "none" and mode is not "performance" → full variants returned
    expect(getModalContent()).toBe(modalContent);
  });
});
