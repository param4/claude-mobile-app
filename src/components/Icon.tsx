import Svg, { Circle, Path, Rect } from 'react-native-svg';

const paths = {
  back: <Path d="M15 5l-7 7 7 7" />,
  chevronDown: <Path d="M6 9l6 6 6-6" />,
  chevronRight: <Path d="M9 6l6 6-6 6" />,
  search: (
    <>
      <Circle cx="11" cy="11" r="7" />
      <Path d="M20 20l-3.5-3.5" />
    </>
  ),
  plus: (
    <>
      <Path d="M12 5v14" />
      <Path d="M5 12h14" />
    </>
  ),
  folder: <Path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  sliders: (
    <>
      <Path d="M4 7h10" />
      <Path d="M18 7h2" />
      <Circle cx="16" cy="7" r="2" />
      <Path d="M4 17h4" />
      <Path d="M12 17h8" />
      <Circle cx="10" cy="17" r="2" />
    </>
  ),
  terminal: (
    <>
      <Path d="M4 17l6-5-6-5" />
      <Path d="M12 19h8" />
    </>
  ),
  mic: (
    <>
      <Rect x="9" y="3" width="6" height="11" rx="3" />
      <Path d="M5 11a7 7 0 0 0 14 0" />
      <Path d="M12 18v3" />
    </>
  ),
  slash: <Path d="M15 4L9 20" />,
  arrowUp: (
    <>
      <Path d="M12 19V5" />
      <Path d="M6 11l6-6 6 6" />
    </>
  ),
  shield: <Path d="M12 3l7 3v6c0 4-3 7.5-7 9-4-1.5-7-5-7-9V6z" />,
  check: <Path d="M5 12.5l4.5 4.5L19 7.5" />,
  close: (
    <>
      <Path d="M6 6l12 12" />
      <Path d="M18 6L6 18" />
    </>
  ),
  scan: (
    <>
      <Path d="M4 8V5a1 1 0 0 1 1-1h3" />
      <Path d="M16 4h3a1 1 0 0 1 1 1v3" />
      <Path d="M20 16v3a1 1 0 0 1-1 1h-3" />
      <Path d="M8 20H5a1 1 0 0 1-1-1v-3" />
      <Path d="M8 12h8" />
    </>
  ),
  newChat: (
    <>
      <Path d="M12 20H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v7" />
      <Path d="M18 15v6" />
      <Path d="M15 18h6" />
    </>
  ),
};

export type IconName = keyof typeof paths;

export function Icon({ name, size = 22, color, strokeWidth = 1.8 }: { name: IconName; size?: number; color: string; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </Svg>
  );
}

// Eight-ray spark, our own mark for "Claude is working".
export function Spark({ size = 20, color = '#D97757' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke={color} strokeWidth={4} strokeLinecap="round">
      <Path d="M24 6v12M24 30v12M6 24h12M30 24h12M11.3 11.3l8.5 8.5M28.2 28.2l8.5 8.5M36.7 11.3l-8.5 8.5M19.8 28.2l-8.5 8.5" />
    </Svg>
  );
}
