import { Platform, PlatformColor } from 'react-native';

export const CORE_COLORS = {
  WHITE: '#FFFFFF',
  BLACK: '#000000',
  GRAY_100: '#E0E0E0',
  GRAY_200: '#CCCCCC',
  GRAY_600: '#888888',
  GRAY_700: '#555555',
  GRAY_950: '#2a2a2a',
  GRAY_975: '#1a1a1a',
  RED_500:
    Platform.select({
      ios: PlatformColor('systemRed'),
      android: PlatformColor('?android:attr/colorError'),
    }) || '#FF4444',
  GREEN_500: '#3EA95F', // Same Chroma and Hue as WMBR_GREEN in LCH; WCAG AAA for normal text on black
  WMBR_GREEN: '#00843D',
  OVERLAY_WHITE_05: 'rgba(255, 255, 255, 0.05)',
  OVERLAY_WHITE_10: 'rgba(255, 255, 255, 0.1)',
  OVERLAY_BLACK_30: 'rgba(0, 0, 0, 0.3)',
} as const;

export const COLORS = {
  TEXT: {
    PRIMARY:
      Platform.select({
        ios: PlatformColor('label'),
        android: PlatformColor('?android:attr/textColorPrimary'),
      }) || CORE_COLORS.WHITE,
    SECONDARY:
      Platform.select({
        ios: PlatformColor('secondaryLabel'),
        android: PlatformColor('?android:attr/textColorSecondary'),
      }) || CORE_COLORS.GRAY_200,
    TERTIARY:
      Platform.select({
        ios: PlatformColor('tertiaryLabel'),
        android: PlatformColor('?android:attr/textColorTertiary'),
      }) || CORE_COLORS.GRAY_600,
    ACTIVE: CORE_COLORS.GRAY_100,
    ALERT: CORE_COLORS.RED_500,
    LINK: CORE_COLORS.GREEN_500,
    ACCENT: CORE_COLORS.WMBR_GREEN,
  },
  TEXT_SHADOW: {
    PRIMARY: CORE_COLORS.OVERLAY_BLACK_30,
  },
  BACKGROUND: {
    PRIMARY:
      Platform.select({
        ios: PlatformColor('systemBackground'),
        android: PlatformColor('?android:attr/colorBackground'),
      }) || CORE_COLORS.BLACK,
    SECONDARY:
      Platform.select({
        ios: PlatformColor('secondarySystemBackground'),
        android: PlatformColor('?android:attr/colorBackgroundFloating'),
      }) || CORE_COLORS.GRAY_975,
    ELEVATED:
      Platform.select({
        ios: PlatformColor('tertiarySystemBackground'),
        android: PlatformColor('?android:attr/colorBackgroundFloating'),
      }) || CORE_COLORS.GRAY_950,
  },
  BUTTON: {
    PRIMARY: {
      BORDER: CORE_COLORS.GRAY_700,
      TEXT:
        Platform.select({
          ios: PlatformColor('label'),
          android: PlatformColor('?android:attr/textColorPrimary'),
        }) || CORE_COLORS.WHITE,
    },
    ACCENT: {
      BACKGROUND: CORE_COLORS.WMBR_GREEN,
      TEXT: CORE_COLORS.WHITE,
      SHADOW: CORE_COLORS.WMBR_GREEN,
    },
    ALERT: {
      BACKGROUND: CORE_COLORS.RED_500,
      TEXT: CORE_COLORS.WHITE,
    },
    SWITCH: {
      BORDER: CORE_COLORS.RED_500,
      BACKGROUND: CORE_COLORS.RED_500,
      TEXT: CORE_COLORS.RED_500,
    },
    SWITCH_ACTIVE: {
      BORDER:
        Platform.select({
          ios: PlatformColor('label'),
          android: PlatformColor('?android:attr/textColorPrimary'),
        }) || CORE_COLORS.WHITE,
      BACKGROUND: CORE_COLORS.OVERLAY_WHITE_10,
      TEXT:
        Platform.select({
          ios: PlatformColor('label'),
          android: PlatformColor('?android:attr/textColorPrimary'),
        }) || CORE_COLORS.WHITE,
    },
  },
  CARD: {
    SUBTLE: {
      BORDER:
        Platform.select({
          ios: PlatformColor('separator'),
          android: PlatformColor('?android:attr/listDivider'),
        }) || CORE_COLORS.OVERLAY_WHITE_10,
      BACKGROUND:
        Platform.select({
          ios: PlatformColor('secondarySystemBackground'),
          android: PlatformColor('?android:attr/colorBackgroundFloating'),
        }) || CORE_COLORS.OVERLAY_WHITE_05,
    },
    ACTIVE: {
      BACKGROUND: `${CORE_COLORS.WMBR_GREEN}33`,
      BORDER: CORE_COLORS.WMBR_GREEN,
    },
  },
  BORDER: {
    SUBTLE:
      Platform.select({
        ios: PlatformColor('separator'),
        android: PlatformColor('?android:attr/listDivider'),
      }) || CORE_COLORS.OVERLAY_WHITE_10,
  },
} as const;
