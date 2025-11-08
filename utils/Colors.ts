export const CORE_COLORS = {
  WHITE: '#FFFFFF',
  BLACK: '#000000',
  GRAY_100: '#E0E0E0',
  GRAY_200: '#CCCCCC',    
  GRAY_300: '#BBBBBB',
  GRAY_400: '#AAAAAA',
  GRAY_500: '#999999',
  GRAY_600: '#888888',
  GRAY_700: '#555555',
  GRAY_900: '#333333',
  GRAY_950: '#2a2a2a',
  GRAY_975: '#1a1a1a',
  RED_500: '#FF4444',
  GREEN_500: '#00D17A',
  WMBR_GREEN: '#00843D',
} as const;

export const COLORS = {
  TEXT: {
    PRIMARY: CORE_COLORS.WHITE,           // #FFFFFF - Main headings, primary text (86 uses)
    SECONDARY: CORE_COLORS.GRAY_200,      // #CCCCCC - Subtitles, descriptions (16 uses)  
    TERTIARY: CORE_COLORS.GRAY_600,       // #888888 - Placeholder, disabled text (15 uses)
    ACTIVE: CORE_COLORS.GRAY_100,         // #E0E0E0 - Active/highlighted text states (3 uses)
    META: CORE_COLORS.GRAY_500,           // #999999 - Metadata, footnotes (2 uses)
    ERROR: CORE_COLORS.RED_500,
    LINK: CORE_COLORS.GREEN_500,
  },
  BACKGROUND: {
    PRIMARY: CORE_COLORS.BLACK,           // #000000 - Main app background
    SECONDARY: CORE_COLORS.GRAY_975,      // #1a1a1a - Drawer, card backgrounds (7 uses)
    ELEVATED: CORE_COLORS.GRAY_950,       // #2a2a2a - Headers, elevated sections (4 uses)
  },
  BUTTON: {
    PRIMARY: {
      BORDER: CORE_COLORS.GRAY_700,
      TEXT: CORE_COLORS.WHITE,
    },
    ACCENT: {
      BACKGROUND: CORE_COLORS.WMBR_GREEN,
      TEXT: CORE_COLORS.WHITE,
      SHADOW: CORE_COLORS.WMBR_GREEN,
    },
  },
} as const;

