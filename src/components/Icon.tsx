import { Platform } from 'react-native';
import { SFSymbol } from 'react-native-sfsymbols';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

export interface IconName {
  ios: string;
  android: string;
}

export interface IconProps {
  /** Platform-specific icon names: SF Symbols on iOS, Material Icons on Android */
  name: IconName;
  /** Icon size (used on both platforms) */
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
