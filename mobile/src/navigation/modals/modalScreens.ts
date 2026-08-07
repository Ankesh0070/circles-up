// Central registry of every modal/full-takeover screen so RootNavigator doesn't
// need a repeated <Stack.Screen> block per route. Add the real screen component
// here (replacing PlaceholderScreen) as each one is implemented per
// implementationplan.md.
export const MODAL_SCREEN_NAMES = [
  'Guard',
  'Genie',
  'Notifications',
  'EditProfile',
  'Settings',
  'SettingsDetail',
  'UserProfile',
  'Bazaar',
  'Scenes',
  'Topic',
  'Achievements',
  'TrustedContacts',
  'FakeCall',
  'SilentPhrase',
  'ShareLocation',
  'CreateEvent',
  'MyEvents',
  'CreatePage',
  'PageTypeSelector',
  'MyPages',
  'AdsManager',
  'CreateAd',
] as const;
