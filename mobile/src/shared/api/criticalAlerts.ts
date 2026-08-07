import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Phase 48 (edgecase.md §3.6): SOS alerts to nearby neighbours should
// bypass Do Not Disturb — someone asleep with DND on is exactly who a
// "nearby neighbour" alert most needs to reach.
//
// HONEST LIMITATION: this sets up the client-side channel/permission
// plumbing only. Two things this repo does NOT yet have, and which are
// real prerequisites before this can actually deliver a notification:
//   1. Push credentials (Expo push token registration, APNs/FCM keys) —
//      no push infra exists yet, same gap as Sentry's DSN before Phase 6.
//   2. On iOS specifically, `allowCriticalAlerts` only takes effect if the
//      app has Apple's `com.apple.developer.usernotifications.critical-alerts`
//      entitlement, which requires a written request to Apple and their
//      approval — not something any code or config here can grant.
// Android's high-importance + bypassDnd channel works today, no vendor
// approval needed, as long as push delivery itself is wired up (item 1).
const SOS_CHANNEL_ID = 'sos-alerts';

export async function setupCriticalAlertChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(SOS_CHANNEL_ID, {
      name: 'SOS Alerts',
      importance: Notifications.AndroidImportance.MAX,
      bypassDnd: true,
      sound: 'default',
      vibrationPattern: [0, 500, 250, 500],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
}

export async function requestCriticalAlertPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowSound: true,
      allowCriticalAlerts: true, // no-op without Apple's entitlement — see note above
    },
  });
  return status === 'granted';
}

export { SOS_CHANNEL_ID };
