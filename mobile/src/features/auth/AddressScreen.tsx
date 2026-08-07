import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import AddressVerificationFlow from './AddressVerificationFlow';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Address'>;

// Thin wrapper around AddressVerificationFlow (extracted for Phase 61 reuse
// — see that file's comment) — first-time onboarding continues to
// ProfileSetup on success, same as before this refactor.
export default function AddressScreen({ navigation }: Props) {
  return <AddressVerificationFlow onDone={() => navigation.navigate('ProfileSetup')} />;
}
