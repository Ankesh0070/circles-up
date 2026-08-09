import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Modal, Image, ActivityIndicator, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { captureRef } from 'react-native-view-shot';

export type CaptureResult = {
  uri: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  timestamp: number;
  /** Android-only: true if the OS flagged this fix as coming from a mock
   * location provider — see edgecase.md §1.2. Consumed by Phase 15. */
  mocked?: boolean;
  /** Gallery uploads have no live-GPS guarantee — edgecase.md §1.8 requires
   * these be treated as lower-trust than a live camera capture. */
  source: 'camera' | 'gallery';
};

type Step = 'intro' | 'requesting' | 'camera' | 'processing' | 'denied' | 'unsupported';

// Ported from the prototype's GpsCameraModal (lines 1033–1500) intent: a
// permission state machine that ends either in a live camera capture with
// GPS+timestamp burned into the image, or (if camera/location is denied) a
// gallery-picker fallback. The prototype used a browser <canvas> overlay;
// here the equivalent is compositing an Image + overlay Text via
// react-native-view-shot, since RN has no canvas primitive.
//
// NOTE: live camera + GPS capture needs real device hardware to fully
// verify — not available in a CI/sandbox environment. Permission-denied and
// gallery-fallback paths are hardware-independent and are what's verified
// here; the happy-path camera capture needs an on-device test pass.
export default function GpsCameraModal({
  visible,
  onClose,
  onCapture,
}: {
  visible: boolean;
  onClose: () => void;
  onCapture: (result: CaptureResult) => void;
}) {
  const [step, setStep] = useState<Step>('intro');
  const [pendingPhoto, setPendingPhoto] = useState<{ uri: string; gps: Location.LocationObject } | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const compositeRef = useRef<View | null>(null);

  useEffect(() => {
    if (visible) setStep('intro');
  }, [visible]);

  const requestAccess = async () => {
    setStep('requesting');
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && !navigator.mediaDevices) {
      setStep('unsupported');
      return;
    }
    const camResult = cameraPermission?.granted ? cameraPermission : await requestCameraPermission();
    const locResult = await Location.requestForegroundPermissionsAsync();
    if (camResult?.granted && locResult.granted) {
      setStep('camera');
    } else {
      setStep('denied');
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    setStep('processing');
    const [photo, gps] = await Promise.all([
      cameraRef.current.takePictureAsync({ quality: 0.9 }),
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
    ]);
    if (!photo) {
      setStep('camera');
      return;
    }
    setPendingPhoto({ uri: photo.uri, gps });
  };

  // Once a photo + GPS fix are both available, render the composite (photo +
  // overlay text) off-screen, then snapshot it — this is the "burn GPS into
  // the image" step, done in two renders because view-shot needs the
  // overlay actually laid out before it can capture it.
  useEffect(() => {
    if (!pendingPhoto || !compositeRef.current) return;
    const t = setTimeout(async () => {
      try {
        const finalUri = await captureRef(compositeRef, { format: 'jpg', quality: 0.9 });
        onCapture({
          uri: finalUri,
          lat: pendingPhoto.gps.coords.latitude,
          lng: pendingPhoto.gps.coords.longitude,
          accuracy: pendingPhoto.gps.coords.accuracy,
          timestamp: pendingPhoto.gps.timestamp,
          mocked: (pendingPhoto.gps as unknown as { mocked?: boolean }).mocked,
          source: 'camera',
        });
      } finally {
        setPendingPhoto(null);
        setStep('intro');
      }
    }, 50);
    return () => clearTimeout(t);
  }, [pendingPhoto, onCapture]);

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (result.canceled || !result.assets[0]) return;
    const gps = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }).catch(() => null);
    onCapture({
      uri: result.assets[0].uri,
      lat: gps?.coords.latitude ?? 0,
      lng: gps?.coords.longitude ?? 0,
      accuracy: gps?.coords.accuracy ?? null,
      timestamp: gps?.timestamp ?? Date.now(),
      source: 'gallery',
    });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black">
        {step === 'intro' && (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-white text-[22px] font-bold text-center">Verify your location</Text>
            <Text className="text-gray-300 text-[14px] text-center mt-3 leading-relaxed">
              We'll take a live selfie and stamp it with your GPS location and timestamp — this proves you're really
              here, right now.
            </Text>
            <Pressable onPress={requestAccess} className="mt-8 bg-white rounded-2xl px-6 py-3.5">
              <Text className="font-semibold text-[#181C20]">Enable Camera & Location</Text>
            </Pressable>
            <Pressable onPress={onClose} className="mt-4">
              <Text className="text-ink-muted text-[13px]">Cancel</Text>
            </Pressable>
          </View>
        )}

        {step === 'requesting' && (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}

        {step === 'camera' && (
          <View className="flex-1">
            <CameraView ref={cameraRef} style={{ flex: 1 }} facing="front" />
            <View className="absolute bottom-10 w-full items-center">
              <Pressable
                onPress={handleCapture}
                className="w-16 h-16 rounded-full bg-white items-center justify-center"
                style={{ borderWidth: 4, borderColor: '#006290' }}
              />
            </View>
            <Pressable onPress={onClose} className="absolute top-12 left-6">
              <Text className="text-white text-[16px]">✕</Text>
            </Pressable>
          </View>
        )}

        {step === 'processing' && (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#fff" />
            <Text className="text-white mt-4">Stamping location…</Text>
          </View>
        )}

        {(step === 'denied' || step === 'unsupported') && (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-white text-[20px] font-bold text-center">
              {step === 'unsupported' ? "Camera isn't available here" : 'Camera or location access denied'}
            </Text>
            <Text className="text-gray-300 text-[13px] text-center mt-3 leading-relaxed">
              You can still continue with a photo from your gallery, but it won't have the same live-location
              guarantee — it may need manual review.
            </Text>
            <Pressable onPress={pickFromGallery} className="mt-8 bg-white rounded-2xl px-6 py-3.5">
              <Text className="font-semibold text-[#181C20]">Choose from Gallery</Text>
            </Pressable>
            <Pressable onPress={onClose} className="mt-4">
              <Text className="text-ink-muted text-[13px]">Cancel</Text>
            </Pressable>
          </View>
        )}

        {/* Off-screen composite used only to produce the final GPS-stamped
            image via view-shot; never actually shown to the user. */}
        {pendingPhoto && (
          <View collapsable={false} ref={compositeRef} style={{ position: 'absolute', top: -9999, left: -9999 }}>
            <Image source={{ uri: pendingPhoto.uri }} style={{ width: 400, height: 533 }} resizeMode="cover" />
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 10, backgroundColor: 'rgba(0,0,0,0.55)' }}>
              <Text style={{ color: '#4ADE80', fontSize: 11, fontWeight: '700' }}>✓ LOCATION VERIFIED</Text>
              <Text style={{ color: '#fff', fontSize: 10, marginTop: 2 }}>
                {pendingPhoto.gps.coords.latitude.toFixed(6)}, {pendingPhoto.gps.coords.longitude.toFixed(6)} · ±
                {Math.round(pendingPhoto.gps.coords.accuracy ?? 0)}m
              </Text>
              <Text style={{ color: '#fff', fontSize: 10 }}>{new Date(pendingPhoto.gps.timestamp).toLocaleString()}</Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}
