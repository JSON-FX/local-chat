import type { CSSProperties } from 'react';

export interface BubblePreset {
  key: string;
  name: string;
  type: 'solid' | 'gradient';
  light: {
    bg: string;
    border: string;
  };
  dark: {
    bg: string;
    border: string;
  };
}

export const BUBBLE_PRESETS: BubblePreset[] = [
  {
    key: 'default',
    name: 'Blue',
    type: 'solid',
    light: { bg: '#eff6ff', border: '#dbeafe' },
    dark: { bg: 'oklch(0.59 0.16 255 / 15%)', border: 'oklch(0.59 0.16 255 / 20%)' },
  },
  {
    key: 'emerald',
    name: 'Emerald',
    type: 'solid',
    light: { bg: '#ecfdf5', border: '#d1fae5' },
    dark: { bg: 'oklch(0.55 0.15 160 / 15%)', border: 'oklch(0.55 0.15 160 / 20%)' },
  },
  {
    key: 'violet',
    name: 'Violet',
    type: 'solid',
    light: { bg: '#f5f3ff', border: '#ede9fe' },
    dark: { bg: 'oklch(0.55 0.15 290 / 15%)', border: 'oklch(0.55 0.15 290 / 20%)' },
  },
  {
    key: 'rose',
    name: 'Rose',
    type: 'solid',
    light: { bg: '#fff1f2', border: '#ffe4e6' },
    dark: { bg: 'oklch(0.55 0.15 15 / 15%)', border: 'oklch(0.55 0.15 15 / 20%)' },
  },
  {
    key: 'amber',
    name: 'Amber',
    type: 'solid',
    light: { bg: '#fffbeb', border: '#fef3c7' },
    dark: { bg: 'oklch(0.55 0.15 75 / 15%)', border: 'oklch(0.55 0.15 75 / 20%)' },
  },
  {
    key: 'slate',
    name: 'Slate',
    type: 'solid',
    light: { bg: '#f8fafc', border: '#e2e8f0' },
    dark: { bg: 'oklch(0.40 0.02 260 / 25%)', border: 'oklch(0.40 0.02 260 / 35%)' },
  },
  {
    key: 'ocean',
    name: 'Ocean',
    type: 'gradient',
    light: { bg: 'linear-gradient(135deg, #e0f2fe, #ccfbf1)', border: '#bae6fd' },
    dark: { bg: 'linear-gradient(135deg, oklch(0.55 0.15 230 / 18%), oklch(0.55 0.15 175 / 18%))', border: 'oklch(0.55 0.15 230 / 25%)' },
  },
  {
    key: 'sunset',
    name: 'Sunset',
    type: 'gradient',
    light: { bg: 'linear-gradient(135deg, #fff7ed, #fff1f2)', border: '#fed7aa' },
    dark: { bg: 'linear-gradient(135deg, oklch(0.55 0.15 50 / 18%), oklch(0.55 0.15 10 / 18%))', border: 'oklch(0.55 0.15 50 / 25%)' },
  },
  {
    key: 'aurora',
    name: 'Aurora',
    type: 'gradient',
    light: { bg: 'linear-gradient(135deg, #ecfdf5, #f5f3ff)', border: '#bbf7d0' },
    dark: { bg: 'linear-gradient(135deg, oklch(0.55 0.15 155 / 18%), oklch(0.55 0.15 290 / 18%))', border: 'oklch(0.55 0.15 155 / 25%)' },
  },
  {
    key: 'lavender',
    name: 'Lavender',
    type: 'gradient',
    light: { bg: 'linear-gradient(135deg, #f5f3ff, #eff6ff)', border: '#ddd6fe' },
    dark: { bg: 'linear-gradient(135deg, oklch(0.55 0.15 290 / 18%), oklch(0.55 0.15 255 / 18%))', border: 'oklch(0.55 0.15 290 / 25%)' },
  },
];

export function getPreset(key: string): BubblePreset {
  return BUBBLE_PRESETS.find(p => p.key === key) || BUBBLE_PRESETS[0];
}

export function getBubbleStyle(presetKey: string, isDark: boolean): CSSProperties {
  const preset = getPreset(presetKey);
  const colors = isDark ? preset.dark : preset.light;

  const style: CSSProperties = {
    borderColor: colors.border,
  };

  if (preset.type === 'gradient') {
    style.background = colors.bg;
  } else {
    style.backgroundColor = colors.bg;
  }

  return style;
}
