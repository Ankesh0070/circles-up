import { View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import AddressVerificationFlow from '../auth/AddressVerificationFlow';
import { SURFACE, ON_SURFACE } from '../../shared/theme/tokens';

// Phase 61 — reuses the exact same verification gauntlet as first-time
// onboarding (edgecase.md §9.4: fresh liveness capture required for every
// additional neighbourhood). Only difference from AddressScreen is where
// it goes afterward — back to NeighbourhoodSheet, not ProfileSetup, since
// the profile already exists.
//
// AddressVerificationFlow itself has no back button (correct for onboarding,
// where the step is mandatory) — this entry point isn't mandatory, so it gets
// its own thin back bar rather than touching the shared component.
export default function AddNeighbourhoodScreen() {
  const navigation = useNavigation();
  return (
    <View style={{ flex: 1, backgroundColor: SURFACE }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 52, paddingBottom: 8 }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={{ alignSelf: 'flex-start' }}>
          <ArrowLeft size={22} color={ON_SURFACE} strokeWidth={2.2} />
        </Pressable>
      </View>
      <AddressVerificationFlow
        heading="Add a neighbourhood"
        subheading="Same verification as before — a live selfie proves you actually live here too."
        continueLabel="Done"
        onDone={() => navigation.goBack()}
      />
    </View>
  );
}
