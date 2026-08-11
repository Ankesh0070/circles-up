import { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import PlaceholderScreen from './PlaceholderScreen';
import { MODAL_SCREEN_NAMES } from './modals/modalScreens';
import CreatePostSheet from '../features/feed/CreatePostSheet';
import PostDetailScreen from '../features/feed/PostDetailScreen';
import ChatsTab from '../features/chat/ChatsTab';
import NewChatScreen from '../features/chat/NewChatScreen';
import ChatDetailScreen from '../features/chat/ChatDetailScreen';
import TrustedContactsScreen from '../features/guard/TrustedContactsScreen';
import ShareLocationScreen from '../features/guard/ShareLocationScreen';
import FakeCallScreen from '../features/guard/FakeCallScreen';
import SilentPhraseScreen from '../features/guard/SilentPhraseScreen';
import HeaderBackButton from './HeaderBackButton';
import ExploreTab from '../features/explore/ExploreTab';
import GuardScreen from '../features/guard/GuardScreen';
import UserProfileScreen from '../features/explore/UserProfileScreen';
import NeighbourhoodSheet from '../features/explore/NeighbourhoodSheet';
import AddNeighbourhoodScreen from '../features/explore/AddNeighbourhoodScreen';
import TopicScreen from '../features/explore/TopicScreen';
import GenieScreen from '../features/genie/GenieScreen';
import CreateListingScreen from '../features/bazaar/CreateListingScreen';
import ListingDetailScreen from '../features/bazaar/ListingDetailScreen';
import ScenesScreen from '../features/scenes/ScenesScreen';
import CreateEventScreen from '../features/scenes/CreateEventScreen';
import MyEventsScreen from '../features/scenes/MyEventsScreen';
import EventDetailScreen from '../features/scenes/EventDetailScreen';
import PageTypeSelectorScreen from '../features/pages/PageTypeSelectorScreen';
import CreatePageScreen from '../features/pages/CreatePageScreen';
import MyPagesScreen from '../features/pages/MyPagesScreen';
import PageDetailScreen from '../features/pages/PageDetailScreen';
import DonateScreen from '../features/pages/DonateScreen';
import AdsManagerScreen from '../features/ads/AdsManagerScreen';
import CreateAdScreen from '../features/ads/CreateAdScreen';
import EditProfileScreen from '../features/profile/EditProfileScreen';
import SettingsScreen from '../features/profile/SettingsScreen';
import SettingsDetailScreen from '../features/profile/SettingsDetailScreen';
import AchievementsScreen from '../features/profile/AchievementsScreen';
import ShareProfileSheet from '../features/profile/ShareProfileSheet';
import AccountSwitcherSheet from '../features/profile/AccountSwitcherSheet';
import ProfileMenuSheet from '../features/profile/ProfileMenuSheet';
import NotificationsScreen from '../features/profile/NotificationsScreen';
import { supabase } from '../shared/api/supabase';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator({
  navigationRef,
}: {
  navigationRef: NavigationContainerRefWithCurrent<RootStackParamList>;
}) {
  // `undefined` = still checking; `null` = signed out.
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  // Mirrors architecture.md's routing rule: signup runs the full
  // Address→ProfileSetup gauntlet, a returning already-onboarded user drops
  // straight into Main. `undefined` = still checking (only meaningful once a
  // session exists).
  const [onboarded, setOnboarded] = useState<boolean | undefined>(undefined);
  // Tracks whether we've ever HAD a session, so the reset effect below only
  // fires on a genuine sign-out transition (truthy -> null), never on the
  // very first render where session starts at `undefined`.
  const hadSessionRef = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) hadSessionRef.current = true;
  }, [session]);

  // Conditionally swapping which screen sits at index 0 (Main vs Auth, below)
  // only changes what a NEW navigation state would render — it does nothing
  // about screens already pushed on top from the OLD state, like Settings.
  // Signing out from inside Settings left people stuck staring at it with no
  // session and no way back in, because the stack still had ['Main',
  // 'Settings'] and 'Main' had just stopped being a valid screen out from
  // under it. resetRoot() throws out the entire navigation state and
  // rebuilds it from scratch, which is the only way to guarantee every
  // pushed modal actually goes away the instant the session does.
  useEffect(() => {
    if (session === null && hadSessionRef.current && navigationRef.isReady()) {
      navigationRef.resetRoot({ index: 0, routes: [{ name: 'Auth' }] });
      hadSessionRef.current = false;
    }
  }, [session, navigationRef]);

  useEffect(() => {
    if (!session) {
      setOnboarded(undefined);
      return;
    }
    let cancelled = false;

    (async () => {
      // A stored session is not proof the account still exists. getUser()
      // validates the token against the server, which is the only way to tell
      // a token for a deleted or revoked account from a healthy one — and
      // that distinction is load-bearing: without it such a session fell
      // through to the "assume onboarded" branch below and dropped the person
      // into a Main tab with no data and NO route back, because Login and
      // Signup only render when there's no session. The app looked like it
      // had stopped accepting logins entirely; really it was refusing to let
      // go of a dead one. An invalid token is a sign-out, not a shrug.
      const { error: authError } = await supabase.auth.getUser();
      if (cancelled) return;
      if (authError?.status === 401 || authError?.status === 403) {
        await supabase.auth.signOut();
        return; // onAuthStateChange clears `session`, which renders Login.
      }

      // maybeSingle(), not single(): "no row" has to be distinguishable from
      // "the request failed", since single() reports both as an error and the
      // two need opposite handling.
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', session.user.id)
        .maybeSingle();
      if (cancelled) return;

      if (error) {
        // Phase 97 (network-degradation testing) found a real bug here: a
        // failed request (network down) fell through the same `?? false`
        // as "row exists but onboarding_completed is false" — so a fully
        // verified returning user reopening the app with no connectivity
        // got routed straight back into the Address/live-selfie gauntlet
        // instead of Main. The token checked out just above, so this is a
        // transport problem; assume onboarded and let individual screens
        // handle their own offline states, rather than routing the entire
        // app on a request that never actually answered the question.
        setOnboarded(true);
        return;
      }

      // Reachable and answered: no row means onboarding genuinely isn't done.
      setOnboarded(data?.onboarding_completed ?? false);
    })();

    return () => {
      cancelled = true;
    };
  }, [session]);

  const stillChecking = session === undefined || (session && onboarded === undefined);
  if (stillChecking) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#006290" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Conditionally rendering (rather than a static initialRouteName) is
          the standard React Navigation pattern for auth flows — it
          re-renders/remounts when these booleans flip, which a fixed
          initialRouteName would not do. */}
      {session && onboarded ? (
        <Stack.Screen name="Main" component={MainTabs} />
      ) : session && !onboarded ? (
        <Stack.Screen name="Auth">{() => <AuthStack initialRouteName="Address" />}</Stack.Screen>
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}

      <Stack.Group
        screenOptions={{ presentation: 'modal', headerShown: true, headerLeft: () => <HeaderBackButton /> }}
      >
        {/* Explore and Guard left the tab bar in the nav redesign — they're
            pushed here now (Explore from the Home header compass, Guard from the
            SOS pill). Empty title = just a back chevron over each screen's own
            header. */}
        <Stack.Screen name="Explore" component={ExploreTab} options={{ title: '' }} />
        <Stack.Screen name="Guard" component={GuardScreen} options={{ title: '' }} />
        <Stack.Screen name="CreatePost" component={CreatePostSheet} options={{ title: 'New post' }} />
        <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ title: 'Post' }} />
        <Stack.Screen name="Chats" component={ChatsTab} options={{ title: 'Chats' }} />
        <Stack.Screen name="NewChat" component={NewChatScreen} options={{ title: 'New chat' }} />
        <Stack.Screen name="ChatDetail" component={ChatDetailScreen} options={{ headerShown: false }} />
        {/* Guard and Bazaar are TABS now (see MainTabs), not modals — keeping
            duplicate routes here would shadow the tabs, because a
            navigate('Guard') from a tab screen bubbles up to this stack and
            opens the modal copy instead of switching tabs. */}
        <Stack.Screen name="TrustedContacts" component={TrustedContactsScreen} options={{ title: 'Trusted Contacts' }} />
        <Stack.Screen name="ShareLocation" component={ShareLocationScreen} options={{ title: 'Share Location' }} />
        <Stack.Screen name="FakeCall" component={FakeCallScreen} options={{ headerShown: false }} />
        <Stack.Screen name="SilentPhrase" component={SilentPhraseScreen} options={{ title: 'Silent Phrase' }} />
        <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: 'Profile' }} />
        <Stack.Screen name="NeighbourhoodSheet" component={NeighbourhoodSheet} options={{ title: 'Your Neighbourhoods' }} />
        <Stack.Screen name="AddNeighbourhood" component={AddNeighbourhoodScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Topic" component={TopicScreen} options={{ title: 'Topic' }} />
        <Stack.Screen name="Genie" component={GenieScreen} options={{ title: 'Circle Genie' }} />
        <Stack.Screen name="CreateListing" component={CreateListingScreen} options={{ title: 'New listing' }} />
        <Stack.Screen name="ListingDetail" component={ListingDetailScreen} options={{ title: 'Listing' }} />
        <Stack.Screen name="Scenes" component={ScenesScreen} options={{ title: 'Scenes' }} />
        <Stack.Screen name="CreateEvent" component={CreateEventScreen} options={{ title: 'Host a Scene' }} />
        <Stack.Screen name="MyEvents" component={MyEventsScreen} options={{ title: 'My Events' }} />
        <Stack.Screen name="EventDetail" component={EventDetailScreen} options={{ title: 'Event' }} />
        <Stack.Screen name="PageTypeSelector" component={PageTypeSelectorScreen} options={{ title: 'New page' }} />
        <Stack.Screen name="CreatePage" component={CreatePageScreen} options={{ title: 'Create page' }} />
        <Stack.Screen name="MyPages" component={MyPagesScreen} options={{ title: 'Pages' }} />
        <Stack.Screen name="PageDetail" component={PageDetailScreen} options={{ title: 'Page' }} />
        <Stack.Screen name="Donate" component={DonateScreen} options={{ title: 'Donate' }} />
        <Stack.Screen name="AdsManager" component={AdsManagerScreen} options={{ title: 'Ads Manager' }} />
        <Stack.Screen name="CreateAd" component={CreateAdScreen} options={{ title: 'Create ad' }} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit Profile' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
        <Stack.Screen name="SettingsDetail" component={SettingsDetailScreen} options={{ title: 'Settings' }} />
        <Stack.Screen name="Achievements" component={AchievementsScreen} options={{ title: 'Achievements' }} />
        <Stack.Screen name="ShareProfile" component={ShareProfileSheet} options={{ title: 'Share Profile' }} />
        <Stack.Screen name="AccountSwitcher" component={AccountSwitcherSheet} options={{ title: 'Switch account' }} />
        <Stack.Screen name="ProfileMenu" component={ProfileMenuSheet} options={{ title: 'Create' }} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
        {MODAL_SCREEN_NAMES.map((name) => (
          <Stack.Screen key={name} name={name}>
            {() => <PlaceholderScreen name={name} />}
          </Stack.Screen>
        ))}
      </Stack.Group>
    </Stack.Navigator>
  );
}
