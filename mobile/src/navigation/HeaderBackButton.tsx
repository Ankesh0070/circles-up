import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { ON_SURFACE } from '../shared/theme/tokens';

// React Navigation's native-stack auto-generates a back button for
// `presentation: 'modal'` screens, but on the web export it renders as a
// near-invisible, non-functional element (an anchor stuck at opacity 0.3 that
// doesn't respond to taps) — indistinguishable from "no back button" to a
// user. This replaces it with an explicit, always-visible, always-working one
// wired straight to goBack(), set once via the modal Stack.Group's
// screenOptions so every screen in it gets it for free.
export default function HeaderBackButton() {
  const navigation = useNavigation();
  if (!navigation.canGoBack()) return null;
  return (
    <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={{ paddingRight: 12, paddingVertical: 4 }}>
      <ArrowLeft size={22} color={ON_SURFACE} strokeWidth={2.2} />
    </Pressable>
  );
}
