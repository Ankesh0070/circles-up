import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import PlaceholderScreen from './PlaceholderScreen';
import { MODAL_SCREEN_NAMES } from './modals/modalScreens';
import CreatePostSheet from '../features/feed/CreatePostSheet';
import PostDetailScreen from '../features/feed/PostDetailScreen';
import NewChatScreen from '../features/chat/NewChatScreen';
import ChatDetailScreen from '../features/chat/ChatDetailScreen';
import GuardScreen from '../features/guard/GuardScreen';
import TrustedContactsScreen from '../features/guard/TrustedContactsScreen';
import ShareLocationScreen from '../features/guard/ShareLocationScreen';
import FakeCallScreen from '../features/guard/FakeCallScreen';
import SilentPhraseScreen from '../features/guard/SilentPhraseScreen';
import UserProfileScreen from '../features/explore/UserProfileScreen';
import NeighbourhoodSheet from '../features/explore/NeighbourhoodSheet';
import AddNeighbourhoodScreen from '../features/explore/AddNeighbourhoodScreen';
import TopicScreen from '../features/explore/TopicScreen';
import GenieScreen from '../features/genie/GenieScreen';
import BazaarScreen from '../features/bazaar/BazaarScreen';
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
import { supabase } from '../shared/api/supabase';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  // `undefined` = still checking; `null` = signed out.
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  // Mirrors architecture.md's routing rule: signup runs the full
  // Address→ProfileSetup gauntlet, a returning already-onboarded user drops
  // straight into Main. `undefined` = still checking (only meaningful once a
  // session exists).
  const [onboarded, setOnboarded] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setOnboarded(undefined);
      return;
    }
    let cancelled = false;
    supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (!cancelled) setOnboarded(data?.onboarding_completed ?? false);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  const stillChecking = session === undefined || (session && onboarded === undefined);
  if (stillChecking) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2196D6" />
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

      <Stack.Group screenOptions={{ presentation: 'modal', headerShown: true }}>
        <Stack.Screen name="CreatePost" component={CreatePostSheet} options={{ title: 'New post' }} />
        <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ title: 'Post' }} />
        <Stack.Screen name="NewChat" component={NewChatScreen} options={{ title: 'New chat' }} />
        <Stack.Screen name="ChatDetail" component={ChatDetailScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Guard" component={GuardScreen} options={{ title: 'Circle Guard' }} />
        <Stack.Screen name="TrustedContacts" component={TrustedContactsScreen} options={{ title: 'Trusted Contacts' }} />
        <Stack.Screen name="ShareLocation" component={ShareLocationScreen} options={{ title: 'Share Location' }} />
        <Stack.Screen name="FakeCall" component={FakeCallScreen} options={{ headerShown: false }} />
        <Stack.Screen name="SilentPhrase" component={SilentPhraseScreen} options={{ title: 'Silent Phrase' }} />
        <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: 'Profile' }} />
        <Stack.Screen name="NeighbourhoodSheet" component={NeighbourhoodSheet} options={{ title: 'Your Neighbourhoods' }} />
        <Stack.Screen name="AddNeighbourhood" component={AddNeighbourhoodScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Topic" component={TopicScreen} options={{ title: 'Topic' }} />
        <Stack.Screen name="Genie" component={GenieScreen} options={{ title: 'Circle Genie' }} />
        <Stack.Screen name="Bazaar" component={BazaarScreen} options={{ title: 'Bazaar' }} />
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
        {MODAL_SCREEN_NAMES.map((name) => (
          <Stack.Screen key={name} name={name}>
            {() => <PlaceholderScreen name={name} />}
          </Stack.Screen>
        ))}
      </Stack.Group>
    </Stack.Navigator>
  );
}
