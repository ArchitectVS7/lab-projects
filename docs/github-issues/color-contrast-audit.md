# Phase 2: Color Contrast Accessibility Audit

**Labels**: accessibility, phase-2, testing
**Priority**: High
**Estimated Effort**: 2-3 hours

## Description

Perform automated color contrast audit for all color themes to ensure WCAG AA compliance, especially for primary color variants.

## Background

Phase 1 introduced dynamic primary color variants (light/dark) generated from base colors. While the generation logic ensures reasonable lightness ranges (20%-95%), we need to verify that all combinations meet WCAG AA standards:

- **Normal text**: 4.5:1 contrast ratio
- **Large text**: 3:1 contrast ratio
- **UI components**: 3:1 contrast ratio

## Themes to Audit

1. Indigo (default)
2. Purple
3. Rose
4. Emerald
5. Amber

## Test Scenarios

### Primary Color Variants
```ts
// Generated in frontend/src/store/theme.ts:66-79
--primary-light: hsl(h s (lightness + 15)%)
--primary-dark: hsl(h s (lightness - 15)%)
--primary-base: hsl(h s lightness%)
```

### Combinations to Test
- `var(--primary-base)` on white background
- `var(--primary-base)` on black background
- `var(--primary-light)` on white background (e.g., button backgrounds)
- `var(--primary-dark)` on dark backgrounds
- Text using `text-[var(--primary-base)]` on light/dark backgrounds
- Focus rings using `ring-[var(--primary-base)]`

## Tools

1. **Automated**: Use Pa11y or Axe DevTools
2. **Manual**: Chrome DevTools Lighthouse accessibility audit
3. **Script**: Create npm script to test all themes

```bash
npm run audit:colors
```

## Expected Issues

### Potential Failures
- Amber theme may have low contrast on white (too light)
- Emerald light variant may be too bright
- Rose dark variant may be too dark on black

### Solutions
- Adjust lightness calculation logic
- Add minimum/maximum contrast checks
- Use color-mix() for guaranteed contrast

## Implementation

### 1. Create Audit Script
```ts
// scripts/audit-colors.ts
import { COLOR_THEMES } from '../frontend/src/lib/themes';
import { contrast } from 'wcag-contrast';

for (const theme of COLOR_THEMES) {
  const primaryColor = hslToRgb(theme.colors.primary);
  const contrastOnWhite = contrast.hex(primaryColor, '#ffffff');
  const contrastOnBlack = contrast.hex(primaryColor, '#000000');

  console.log(`${theme.name}:`);
  console.log(`  On white: ${contrastOnWhite} ${contrastOnWhite >= 4.5 ? '✓' : '✗'}`);
  console.log(`  On black: ${contrastOnBlack} ${contrastOnBlack >= 4.5 ? '✓' : '✗'}`);
}
```

### 2. Add to CI Pipeline
```yaml
# .github/workflows/accessibility.yml
- name: Color Contrast Audit
  run: npm run audit:colors
```

### 3. Fix Failing Themes
If contrast ratios fail, adjust generation logic:

```ts
// Ensure minimum contrast
const ensureContrast = (color: string, background: string, minRatio: number) => {
  let adjustedColor = color;
  while (contrast.hex(adjustedColor, background) < minRatio) {
    // Adjust lightness until minimum contrast met
    adjustedColor = adjustLightness(adjustedColor, -5);
  }
  return adjustedColor;
};
```

## Acceptance Criteria

- [ ] Audit script created and runs successfully
- [ ] All 5 themes tested
- [ ] Contrast ratios documented
- [ ] Failing combinations identified
- [ ] Fixes implemented for failures
- [ ] CI pipeline includes color audit
- [ ] Documentation updated with contrast ratios

## Documentation

Create `docs/ACCESSIBILITY-COLOR-CONTRAST.md` with:
- Contrast ratios for each theme
- WCAG compliance status
- Known issues and mitigations
- Theme selection guidelines

## Related

- Phase 1 review: docs/PHASE-1-REVIEW-REPORT.md
- Theme system: frontend/src/store/theme.ts
- WCAG 2.1: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
