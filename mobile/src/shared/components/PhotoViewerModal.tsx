import { Modal, Pressable, Image, View, useWindowDimensions } from 'react-native';
import { X } from 'lucide-react-native';

// Full-screen viewer for a profile photo, opened by tapping the avatar on
// UserProfileScreen / ProfileScreen. Square frame per the design brief —
// most avatars are square crops anyway, so this avoids letterboxing a wide
// black backdrop around a small circle.
export default function PhotoViewerModal({
  visible,
  uri,
  onClose,
}: {
  visible: boolean;
  uri: string | null;
  onClose: () => void;
}) {
  const { width } = useWindowDimensions();
  const size = Math.min(width - 48, 420);

  if (!uri) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center' }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{ width: size, height: size, borderRadius: 20, overflow: 'hidden', backgroundColor: '#111' }}
        >
          <Image source={{ uri }} style={{ width: size, height: size }} resizeMode="cover" />
        </Pressable>

        <Pressable
          onPress={onClose}
          hitSlop={12}
          style={{
            position: 'absolute',
            top: 56,
            right: 24,
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: 'rgba(255,255,255,0.15)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={20} color="#fff" strokeWidth={2.4} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
