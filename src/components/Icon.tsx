import { Animated, Platform } from 'react-native';
import { SFSymbol } from 'react-native-sfsymbols';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

export interface IconName {
  ios: string;
  android: string;
}

const AnimatedSFSymbol = Animated.createAnimatedComponent(SFSymbol);
const AnimatedMaterialIcon = Animated.createAnimatedComponent(MaterialIcons);

export interface IconProps {
  /** Platform-specific icon names: SF Symbols on iOS, Material Icons on Android */
  name: IconName;
  /** Icon size (used on both platforms) */
  size: number;
  color: string;
  style?: Record<string, any>;
}

export default function Icon({ name, size, color, style }: IconProps) {
  switch (Platform.OS) {
    case 'ios':
      return (
        <AnimatedSFSymbol
          name={name.ios}
          size={size}
          color={color}
          style={{
            height: size,
            width: size,
            ...style,
          }}
        />
      );
    case 'android':
      return (
        <AnimatedMaterialIcon
          name={name.android}
          size={size}
          color={color}
          style={{
            height: size,
            width: size,
            ...style,
          }}
        />
      );
    default:
      return null;
  }
}
