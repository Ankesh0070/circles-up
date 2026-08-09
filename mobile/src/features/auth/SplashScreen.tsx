import { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import CircleUpLogo from '../../shared/components/CircleUpLogo';
import GradientText from '../../shared/components/GradientText';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Splash'>;

// Ported from the prototype (lines 413–437).
export default function SplashScreen({ navigation }: Props) {
  useEffect(() => {
    const t = setTimeout(() => navigation.replace('Login'), 2200);
    return () => clearTimeout(t);
  }, [navigation]);

  return (
    <View className="flex-1 bg-white items-center justify-center px-8">
      <Animated.View entering={FadeIn.duration(500)}>
        <CircleUpLogo size={110} />
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(200).duration(500)}>
        <GradientText style={{ fontSize: 32, fontWeight: '700', marginTop: 24, letterSpacing: -0.5 }}>
          Circle Up
        </GradientText>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(350).duration(500)}>
        <Text className="text-[15px] text-ink-muted mt-2 font-medium">Aage badh, apni circle ke saath</Text>
      </Animated.View>
      <Animated.View
        entering={FadeInDown.delay(500).duration(500)}
        className="absolute bottom-10 flex-row items-center gap-1.5"
      >
        <Text className="text-xs text-ink-muted font-medium">from </Text>
        <GradientText style={{ fontSize: 12, fontWeight: '600' }}>India</GradientText>
      </Animated.View>
    </View>
  );
}
