import { Modal, Pressable, Text } from 'react-native';

// react-native-web's Alert.alert() is a total no-op (`static alert() {}` —
// see node_modules/react-native-web/dist/exports/Alert/index.js): it never
// renders anything, so any Alert.alert() call is silently invisible on
// web. This is the single-button (informational) equivalent — same
// Modal-based bottom-sheet pattern as ModerationMenu/EventDetailScreen's
// confirm sheet, which does render correctly everywhere. Works identically
// on native even though Alert.alert would have worked there too, so
// callers don't need to branch on Platform.OS.
export default function AlertModal({
  visible,
  title,
  message,
  onClose,
}: {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={onClose}>
        <Pressable className="bg-white rounded-t-2xl px-5 pt-5 pb-8" onPress={(e) => e.stopPropagation()}>
          <Text className="text-[16px] font-bold text-[#1F1B17]">{title}</Text>
          <Text className="text-[13px] text-gray-500 mt-2">{message}</Text>
          <Pressable onPress={onClose} className="mt-5 bg-gray-100 rounded-xl py-3 items-center">
            <Text className="text-[#1F1B17] font-semibold text-[14px]">OK</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
