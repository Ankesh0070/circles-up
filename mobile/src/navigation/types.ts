// Route param lists for the whole app. Screens are stubbed with PlaceholderScreen
// in Phase 1 and get replaced one-by-one as their feature phase (per
// implementationplan.md) is implemented — the route list itself should not
// need to change shape after this.

export type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
  Signup: undefined;
  Otp: { phone: string };
  Address: undefined;
  ProfileSetup: undefined;
};

// Nav Redesign tab set: Home / Reels / Chat(centre) / Bazaar / Profile. Chat is
// a first-class centre tab (a raised gradient button — see BottomNav). Explore
// and Guard left the tab bar and are pushed screens now (Explore from the Home
// header compass, Guard from the SOS pill) — both registered on the modal stack
// below.
export type MainTabsParamList = {
  Home: undefined;
  Reels: undefined;
  Chat: undefined;
  Bazaar: undefined;
  Profile: undefined;
};

// Full-takeover / modal screens launched from any tab (mirrors the prototype's
// `subScreen` state machine — see architecture.md §4.2).
export type ModalStackParamList = {
  CreatePost: undefined;
  // Explore and Guard left the bottom tab bar in the nav redesign; they're
  // pushed screens now (Explore from the Home header, Guard from the SOS pill).
  Explore: undefined;
  Guard: undefined;
  Genie: undefined;
  Notifications: undefined;
  PostDetail: { postId: string };
  EditProfile: undefined;
  Settings: undefined;
  SettingsDetail: { section: string };
  UserProfile: { userId: string };
  NeighbourhoodSheet: undefined;
  AddNeighbourhood: undefined;
  // Chats left the tab bar in the Stitch redesign (see MainTabs) — it lives
  // here now, opened from the Feed header.
  Chats: undefined;
  NewChat: undefined;
  ChatDetail: { chatId: string };
  CreateListing: undefined;
  ListingDetail: { listingId: string };
  Scenes: undefined;
  Topic: { topic: string };
  Achievements: undefined;
  TrustedContacts: undefined;
  FakeCall: undefined;
  SilentPhrase: undefined;
  ShareLocation: undefined;
  CreateEvent: undefined;
  MyEvents: undefined;
  EventDetail: { eventId: string };
  CreatePage: { pageType: 'personal' | 'business' | 'ngo' };
  PageTypeSelector: undefined;
  MyPages: undefined;
  PageDetail: { pageId: string };
  Donate: { pageId: string };
  AdsManager: undefined;
  CreateAd: undefined;
  ShareProfile: undefined;
  AccountSwitcher: undefined;
  ProfileMenu: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
} & ModalStackParamList;
