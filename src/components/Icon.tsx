import { Platform } from 'react-native';
import { SFSymbol } from 'react-native-sfsymbols';
import {
  MaterialIcons,
  type MaterialIconsIconName,
} from '@react-native-vector-icons/material-icons/static';

export interface IconName {
  ios: string;
  android: MaterialIconsIconName;
}

export interface IconProps {
  /** SF Symbol name (iOS) or Material Symbol name (Android), or platform-specific object */
  name: IconName;
  /** Point size for SF Symbol configuration (iOS only) */
  size: number;
  color: string;
}

export default function Icon({ name, size, color }: IconProps) {
  switch (Platform.OS) {
    case 'ios':
      return (
        <SFSymbol
          name={name.ios}
          size={size}
          color={color}
          style={{ height: size, width: size }}
        />
      );
    case 'android':
      return (
        <MaterialIcons
          name={name.android}
          size={size}
          color={color}
          style={{ height: size, width: size }}
        />
      );
    default:
      return null;
  }
}
