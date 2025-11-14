import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { SvgXml } from 'react-native-svg';
import { getWMBRLogoSVG } from '../../utils/WMBRLogo';
import { CORE_COLORS } from '../../utils/Colors';

interface SplashScreenProps {
  onAnimationEnd: () => void;
}

export default function SplashScreen({ onAnimationEnd }: SplashScreenProps) {
  const logoScale = useSharedValue(0.3);
  const logoOpacity = useSharedValue(0);
  const circleScale = useSharedValue(0);
  const backgroundOpacity = useSharedValue(1);

  useEffect(() => {
    const animationDuration = 2000;
    
    logoOpacity.value = withTiming(1, {
      duration: 300,
      easing: Easing.out(Easing.quad),
    });

    circleScale.value = withSequence(
      withTiming(1.2, {
        duration: animationDuration * 0.6,
        easing: Easing.out(Easing.back(1.2)),
      }),
      withTiming(1, {
        duration: animationDuration * 0.2,
        easing: Easing.inOut(Easing.quad),
      })
    );

    logoScale.value = withSequence(
      withDelay(200, withTiming(1.1, {
        duration: animationDuration * 0.4,
        easing: Easing.out(Easing.back(1.2)),
      })),
      withTiming(1, {
        duration: animationDuration * 0.2,
        easing: Easing.inOut(Easing.quad),
      }),
      withDelay(300, withTiming(0.9, {
        duration: 300,
        easing: Easing.in(Easing.quad),
      }))
    );

    backgroundOpacity.value = withDelay(
      animationDuration,
      withTiming(0, {
        duration: 500,
        easing: Easing.in(Easing.quad),
      }, () => {
        runOnJS(onAnimationEnd)();
      })
    );
  }, [backgroundOpacity, circleScale, logoOpacity, logoScale, onAnimationEnd]);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const circleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value }],
    opacity: logoOpacity.value * 0.3,
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backgroundOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent={false} />
      
      <LinearGradient
        colors={['#000000', '#1a1a1a', '#000000']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <Animated.View style={[styles.circleBackground, circleAnimatedStyle]} />
          
          <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
            <SvgXml xml={getWMBRLogoSVG(CORE_COLORS.WMBR_GREEN)} width={200} height={43} />
          </Animated.View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleBackground: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 2,
    borderColor: CORE_COLORS.WMBR_GREEN,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
