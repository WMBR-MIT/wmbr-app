import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
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

const { width, height } = Dimensions.get('window');
const WMBR_GREEN = '#00843D';

const getWMBRLogoSVG = () => `
<svg viewBox="0 0 155.57 33.9" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>.b{fill:#00843D;}</style>
  </defs>
  <polygon class="b" points="22.7 18.9 31.2 33.7 44.1 5.8 42.4 5.8 36 19.6 28.3 5.3 19.9 19.8 12.8 5.8 0 5.8 14.2 33.9 22.7 18.9"/>
  <path class="b" d="M57.4,31.8V11.3s1.8-2.3,4.8-2.4c.9,0,2.1.4,2.5,1.4v21.5h11.8V11.6s2.3-2.1,4.6-2.3c1.6-.1,2.7,1,2.8,1.6v20.8h11.8V11.2c-.3-2.2-2.4-4.1-4.7-5-2.6-1-6.8-.7-9.2.3-2.7,1.1-5.8,3.1-5.8,3.1,0,0-1.8-2.5-4.4-3.3-2.6-.9-5.6-1-8.3-.2-2.7.9-5.9,2.9-5.9,2.9v-3.2h-11.9v26h11.9Z"/>
  <path class="b" d="M110.3,31.8v-2.5s1.8,1.8,4.7,2.6c3.5.9,9.3.1,12.8-4.1,3.9-4.7,4.2-12.1-.4-17.4-3.5-4.1-8.7-5.4-13.2-4.2-2.2.6-3.5,1.7-3.9,2.2V0h-11.8v31.8h11.8ZM113,8.4c2-1,3.2-.6,3.9-.2,1.1.7,1,1.6,1,1.6v18.2s.1.7-.8,1.5c-1.1,1-2.9.7-4.2-.2-1.8-1.2-2.6-2.4-2.6-2.4V10.8c.4-.5,1.4-1.8,2.7-2.4Z"/>
  <path class="b" d="M144.5,14s.6-2.5,3.8-4.7c2.4-1.6,3.8-1,4.1-.5.5,1.1,2.3,1.2,2.9.2.5-.8.3-2.1-.5-2.6-1.4-.9-3.9-1-6.7.9-2.8,2-3.5,2.9-3.5,2.9v-4.4h-11.6v26h11.5V14Z"/>
</svg>
`;

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
  }, []);

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
            <SvgXml xml={getWMBRLogoSVG()} width={200} height={43} />
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
    borderColor: WMBR_GREEN,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});