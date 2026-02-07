# Phase 2: Add Animation Intensity Preference

**Labels**: enhancement, phase-2, accessibility, settings
**Priority**: Medium
**Estimated Effort**: 3-4 hours

## Description

Add user preference for animation intensity (Normal, Reduced, None) to accommodate accessibility needs and user preferences.

## Background

Phase 1 increased animation intensity for better visual feedback:
- Button hover: 1.05x → 1.12x scale
- Hover scale: 1.02x → 1.08x scale
- Task cards: -2px → -6px vertical shift

While these enhancements feel more engaging, some users may find them:
- Distracting
- Motion-sickness inducing
- Too aggressive
- Not compatible with accessibility needs

## Requirements

### Settings UI
Add "Animation Intensity" setting to Settings page:
- **Normal** (default): Current Phase 1 values
- **Reduced**: Conservative animations (Phase 0 values)
- **None**: Disable animations, respect prefers-reduced-motion

### Animation Adjustments

**Normal** (current):
```ts
hoverScale: { scale: 1.08 }
buttonHover: { scale: 1.12 }
taskCardHover: { y: -6 }
```

**Reduced**:
```ts
hoverScale: { scale: 1.02 }
buttonHover: { scale: 1.05 }
taskCardHover: { y: -2 }
```

**None**:
```ts
// Disable all framer-motion animations
// Apply instant transitions only
```

### System Preference
- Automatically detect `prefers-reduced-motion`
- Override default to "None" if system preference is set
- User can still manually choose "Normal" if desired

## Implementation

1. **Zustand Store**: Add animation preference
```ts
interface AnimationState {
  intensity: 'normal' | 'reduced' | 'none';
  setIntensity: (intensity: AnimationState['intensity']) => void;
}
```

2. **Animation Library**: Update `frontend/src/lib/animations.ts`
```ts
export const getAnimationConfig = (intensity: AnimationIntensity) => {
  if (intensity === 'none') return disabledAnimations;
  if (intensity === 'reduced') return reducedAnimations;
  return normalAnimations;
};
```

3. **Settings UI**: Add to SettingsPage
```tsx
<select value={intensity} onChange={handleIntensityChange}>
  <option value="normal">Normal</option>
  <option value="reduced">Reduced</option>
  <option value="none">None</option>
</select>
```

4. **Detect System Preference**:
```ts
useEffect(() => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (prefersReducedMotion.matches && intensity === 'normal') {
    setIntensity('none');
  }
}, []);
```

## Acceptance Criteria

- [ ] Animation intensity setting added to Settings page
- [ ] Three options available: Normal, Reduced, None
- [ ] Setting persists across sessions (localStorage)
- [ ] System prefers-reduced-motion respected
- [ ] All framer-motion animations respect setting
- [ ] No visual glitches when switching
- [ ] Reduced mode uses conservative values
- [ ] None mode disables animations entirely

## Accessibility Impact

- ✅ Respects prefers-reduced-motion
- ✅ User control over animation intensity
- ✅ No loss of functionality when disabled
- ✅ WCAG 2.1 Level AAA compliance for motion

## Related

- Phase 1 review: docs/PHASE-1-REVIEW-REPORT.md
- Animation library: frontend/src/lib/animations.ts
- WCAG 2.1: https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html
