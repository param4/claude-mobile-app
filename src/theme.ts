// Anthropic palette: Ivory/Slate with Clay as the single accent, warm greys only.
import { Platform, useColorScheme } from 'react-native';

export const light = {
  dark: false,
  bg: '#FAF9F5',
  card: '#FFFFFF',
  fill: '#F0EEE6',
  code: '#F5F4ED',
  bubble: '#F0EEE6',
  text: '#141413',
  text2: '#5E5D59',
  text3: '#73726C',
  line: 'rgba(31,30,29,0.08)',
  line2: 'rgba(31,30,29,0.15)',
  line3: 'rgba(31,30,29,0.3)',
  hover: 'rgba(115,114,108,0.1)',
  primary: '#141413',
  onPrimary: '#FAF9F5',
  scrim: 'rgba(20,20,19,0.4)',
  clay: '#D97757',
  clayText: '#A9502F',
  clayTint: 'rgba(217,119,87,0.14)',
  warnBg: '#F6EBC8',
  warnText: '#6E5512',
  danger: '#A33A2B',
  ok: '#558A42',
  unread: '#2A78D6',
};

export type Theme = typeof light;

export const dark: Theme = {
  dark: true,
  bg: '#262624',
  card: '#30302E',
  fill: '#3D3D3A',
  code: '#1F1E1D',
  bubble: '#3D3D3A',
  text: '#FAF9F5',
  text2: '#C2C0B6',
  text3: '#9C9A92',
  line: 'rgba(255,255,255,0.08)',
  line2: 'rgba(255,255,255,0.14)',
  line3: 'rgba(255,255,255,0.28)',
  hover: 'rgba(255,255,255,0.08)',
  primary: '#FAF9F5',
  onPrimary: '#141413',
  scrim: 'rgba(0,0,0,0.55)',
  clay: '#D97757',
  clayText: '#E39A80',
  clayTint: 'rgba(217,119,87,0.18)',
  warnBg: '#4A3D16',
  warnText: '#F2D78A',
  danger: '#F08A78',
  ok: '#7FB069',
  unread: '#6A9BCC',
};

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

// Anthropic's own typefaces aren't public; Source Serif 4 stands in for the serif, system sans for UI.
export const fonts = {
  serif: 'SourceSerif4_500Medium',
  serifBody: 'SourceSerif4_400Regular',
  mono: Platform.select({ ios: 'Menlo', default: 'monospace' }),
};
