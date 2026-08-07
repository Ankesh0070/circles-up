import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from '../features/auth/SplashScreen';
import LoginScreen from '../features/auth/LoginScreen';
import SignupScreen from '../features/auth/SignupScreen';
import OtpScreen from '../features/auth/OtpScreen';
import AddressScreen from '../features/auth/AddressScreen';
import ProfileSetupScreen from '../features/auth/ProfileSetupScreen';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

// Auth/onboarding flow — Splash → Login/Signup → Otp → Address (verification
// gate) → ProfileSetup. See implementationplan.md Group B (phases 7–21).
//
// `initialRouteName` is passed by RootNavigator: a fresh, unauthenticated
// visitor starts at Splash; a signed-in-but-not-yet-onboarded user (mid
// verification gauntlet) resumes at Address rather than seeing Login again.
export default function AuthStack({ initialRouteName = 'Splash' }: { initialRouteName?: keyof AuthStackParamList }) {
  return (
    <Stack.Navigator initialRouteName={initialRouteName} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="Otp" component={OtpScreen} />
      <Stack.Screen name="Address" component={AddressScreen} />
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
    </Stack.Navigator>
  );
}
