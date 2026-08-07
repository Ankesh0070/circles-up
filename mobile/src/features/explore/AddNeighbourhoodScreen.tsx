import { useNavigation } from '@react-navigation/native';
import AddressVerificationFlow from '../auth/AddressVerificationFlow';

// Phase 61 — reuses the exact same verification gauntlet as first-time
// onboarding (edgecase.md §9.4: fresh liveness capture required for every
// additional neighbourhood). Only difference from AddressScreen is where
// it goes afterward — back to NeighbourhoodSheet, not ProfileSetup, since
// the profile already exists.
export default function AddNeighbourhoodScreen() {
  const navigation = useNavigation();
  return (
    <AddressVerificationFlow
      heading="Add a neighbourhood"
      subheading="Same verification as before — a live selfie proves you actually live here too."
      continueLabel="Done"
      onDone={() => navigation.goBack()}
    />
  );
}
