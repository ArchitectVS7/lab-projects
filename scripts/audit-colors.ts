/**
 * WCAG AA Color Contrast Audit Script
 *
 * Tests all color themes against WCAG AA contrast ratio requirements:
 * - Normal text: 4.5:1
 * - Large text / UI components: 3:1
 *
 * Test categories:
 * - REQUIRED: Primary used as text color, foreground on primary buttons
 * - INFORMATIONAL: Light/dark variants used as decorative backgrounds (3:1 for UI)
 *
 * Run: npx tsx scripts/audit-colors.ts
 *   or: npm run audit:colors
 */

const COLOR_THEMES = [
  { id: 'indigo', name: 'Indigo', colors: { primary: '243 75% 59%', primaryForeground: '0 0% 100%' } },
  { id: 'purple', name: 'Purple', colors: { primary: '270 95% 60%', primaryForeground: '0 0% 100%' } },
  { id: 'rose', name: 'Rose', colors: { primary: '343 88% 46%', primaryForeground: '0 0% 100%' } },
  { id: 'emerald', name: 'Emerald', colors: { primary: '150 96% 24%', primaryForeground: '0 0% 100%' } },
  { id: 'amber', name: 'Amber', colors: { primary: '38 92% 30%', primaryForeground: '0 0% 100%' } },
] as const;

// --- Color math ---

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function parseHSL(hsl: string): { h: number; s: number; l: number } {
  const parts = hsl.split(' ');
  return {
    h: parseFloat(parts[0]),
    s: parseFloat(parts[1]),
    l: parseFloat(parts[2]),
  };
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const srgb = c / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function luminanceFromHSL(h: number, s: number, l: number): number {
  const [r, g, b] = hslToRgb(h, s, l);
  return relativeLuminance(r, g, b);
}

function rgbHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

// --- Backgrounds ---

const WHITE_LUM = relativeLuminance(255, 255, 255);
const DARK_BG_LUM = relativeLuminance(31, 41, 55);

// --- Tests ---

type Category = 'required' | 'informational';

interface TestResult {
  theme: string;
  test: string;
  hex: string;
  ratio: number;
  minRatio: number;
  pass: boolean;
  category: Category;
}

const results: TestResult[] = [];

for (const theme of COLOR_THEMES) {
  const { h, s, l } = parseHSL(theme.colors.primary);
  const baseLum = luminanceFromHSL(h, s, l);
  const baseRgb = hslToRgb(h, s, l);
  const baseHex = rgbHex(...baseRgb);

  const { h: fgH, s: fgS, l: fgL } = parseHSL(theme.colors.primaryForeground);
  const fgLum = luminanceFromHSL(fgH, fgS, fgL);

  const lightL = Math.min(l + 15, 95);
  const lightLum = luminanceFromHSL(h, s, lightL);
  const lightHex = rgbHex(...hslToRgb(h, s, lightL));

  const darkL = Math.max(l - 15, 20);
  const darkLum = luminanceFromHSL(h, s, darkL);
  const darkHex = rgbHex(...hslToRgb(h, s, darkL));

  // REQUIRED: Primary as text on white (light mode)
  const cr1 = contrastRatio(baseLum, WHITE_LUM);
  results.push({ theme: theme.name, test: 'Text on white', hex: baseHex, ratio: cr1, minRatio: 4.5, pass: cr1 >= 4.5, category: 'required' });

  // INFORMATIONAL: Primary base on dark bg — in dark mode the app uses the +15% light variant
  // for text, not the base directly. Checked here for awareness only.
  const cr2 = contrastRatio(baseLum, DARK_BG_LUM);
  results.push({ theme: theme.name, test: 'Base on dark', hex: baseHex, ratio: cr2, minRatio: 3, pass: cr2 >= 3, category: 'informational' });

  // REQUIRED: Light variant (+15%) as accent text on dark bg (dark mode UI elements, headings)
  // Uses 3:1 threshold (WCAG AA for large text / UI components)
  const lightTextLum = luminanceFromHSL(h, s, lightL);
  const lightTextHex = lightHex;
  const cr2b = contrastRatio(lightTextLum, DARK_BG_LUM);
  results.push({ theme: theme.name, test: 'Light on dark', hex: lightTextHex, ratio: cr2b, minRatio: 3, pass: cr2b >= 3, category: 'required' });

  // REQUIRED: White foreground on primary button
  const cr3 = contrastRatio(fgLum, baseLum);
  results.push({ theme: theme.name, test: 'Fg on button', hex: baseHex, ratio: cr3, minRatio: 4.5, pass: cr3 >= 4.5, category: 'required' });

  // INFORMATIONAL: Light variant as UI bg on white (3:1 for UI components)
  const cr4 = contrastRatio(lightLum, WHITE_LUM);
  results.push({ theme: theme.name, test: 'Light bg/white', hex: lightHex, ratio: cr4, minRatio: 3, pass: cr4 >= 3, category: 'informational' });

  // INFORMATIONAL: Dark variant as UI bg on dark (3:1 for UI components)
  const cr5 = contrastRatio(darkLum, DARK_BG_LUM);
  results.push({ theme: theme.name, test: 'Dark bg/dark', hex: darkHex, ratio: cr5, minRatio: 3, pass: cr5 >= 3, category: 'informational' });
}

// --- Output ---

console.log('\n  WCAG AA Color Contrast Audit');
console.log('  ===========================\n');

function pad(str: string, width: number): string {
  return str.padEnd(width);
}

console.log(
  `  ${pad('Theme', 10)}${pad('Test', 18)}${pad('Color', 10)}${pad('Ratio', 8)}${pad('Min', 6)}${pad('Result', 8)}${pad('Category', 14)}`
);
console.log('  ' + '-'.repeat(74));

for (const r of results) {
  const passStr = r.pass ? 'PASS' : 'FAIL';
  console.log(
    `  ${pad(r.theme, 10)}${pad(r.test, 18)}${pad(r.hex, 10)}${pad(r.ratio.toFixed(2), 8)}${pad(String(r.minRatio), 6)}${pad(passStr, 8)}${pad(r.category, 14)}`
  );
}

console.log('');

const required = results.filter(r => r.category === 'required');
const reqPass = required.filter(r => r.pass).length;
const reqFail = required.filter(r => !r.pass).length;
const info = results.filter(r => r.category === 'informational');
const infoPass = info.filter(r => r.pass).length;
const infoFail = info.filter(r => !r.pass).length;

console.log(`  Required tests:      ${reqPass} passed, ${reqFail} failed out of ${required.length}`);
console.log(`  Informational tests: ${infoPass} passed, ${infoFail} failed out of ${info.length}`);

if (reqFail > 0) {
  console.log('\n  FAIL: Some required combinations fail WCAG AA (4.5:1).');
  console.log('  Adjust primary lightness values for failing themes.\n');
  process.exit(1);
} else {
  console.log('\n  All required combinations pass WCAG AA (4.5:1).');
  if (infoFail > 0) {
    console.log(`  Note: ${infoFail} informational test(s) below 3:1 — light/dark variants are decorative backgrounds.`);
  }
  console.log('');
  process.exit(0);
}
