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
  chevronUp: <Path d="M6 15l6-6 6 6" />,
  image: (
    <>
      <Rect x="3" y="4" width="18" height="16" rx="3" />
      <Circle cx="9" cy="10" r="2" />
      <Path d="M21 16l-5-5-9 9" />
    </>
  ),
  camera: (
    <>
      <Path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <Circle cx="12" cy="13" r="3.5" />
    </>
  ),
  file: (
    <>
      <Path d="M14 3H6v18h12V7z" />
      <Path d="M14 3v4h4" />
    </>
  ),
  clipboard: (
    <>
      <Rect x="6" y="4" width="12" height="17" rx="2" />
      <Path d="M9 4V3h6v1" />
      <Path d="M9 11h6" />
      <Path d="M9 15h4" />
    </>
  ),
  at: (
    <>
      <Circle cx="12" cy="12" r="3.5" />
      <Path d="M15.5 12v1.5a2.5 2.5 0 0 0 5 0V12a8.5 8.5 0 1 0-3.4 6.8" />
    </>
  ),
  copy: (
    <>
      <Rect x="8" y="8" width="12" height="12" rx="2" />
      <Path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
    </>
  ),
  edit: <Path d="M4 20h4L19 9l-4-4L4 16z" />,
  retry: (
    <>
      <Path d="M4 12a8 8 0 1 0 3-6.2" />
      <Path d="M4 4v4h4" />
    </>
  ),
  fork: (
    <>
      <Circle cx="6" cy="5" r="2" />
      <Circle cx="18" cy="5" r="2" />
      <Circle cx="12" cy="19" r="2" />
      <Path d="M6 7v2a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V7" />
      <Path d="M12 12v5" />
    </>
  ),
  rewind: (
    <>
      <Path d="M11 7l-6 5 6 5z" />
      <Path d="M19 7l-6 5 6 5z" />
    </>
  ),
  share: (
    <>
      <Path d="M12 15V3" />
      <Path d="M7 8l5-5 5 5" />
      <Path d="M5 13v7h14v-7" />
    </>
  ),
  more: (
    <>
      <Circle cx="5" cy="12" r="1" />
      <Circle cx="12" cy="12" r="1" />
      <Circle cx="19" cy="12" r="1" />
    </>
  ),
  bolt: <Path d="M13 3L5 14h6l-1 7 8-11h-6z" />,
  folderPlus: (
    <>
      <Path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <Path d="M12 11v5" />
      <Path d="M9.5 13.5h5" />
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
