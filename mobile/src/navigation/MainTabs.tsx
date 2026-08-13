import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import BottomNav from './BottomNav';
import HomeFeed from '../features/feed/HomeFeed';
import ReelsScreen from '../features/reels/ReelsScreen';
import ChatsTab from '../features/chat/ChatsTab';
import GuardScreen from '../features/guard/GuardScreen';
import ProfileScreen from '../features/profile/ProfileScreen';
import type { MainTabsParamList } from './types';

const Tab = createBottomTabNavigator<MainTabsParamList>();

// Nav redesign (Circle Up Nav Redesign): Home / Reels / Chat / Guard /
// Profile, with Chat as the raised centre button (see BottomNav), opening on
// Home.
//
// Explore left the tab bar and is still one tap away as a pushed screen (the
// compass in the Home header) — discovery (Scenes / Genie / Pages / people)
// keeps its entry point without crowding the five-slot bar. Guard took
// Bazaar's old slot; Bazaar itself now opens from a card inside Guard rather
// than sitting in the tab bar directly.
export default function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <BottomNav {...props} />}
      screenOptions={{ headerShown: false }}
      initialRouteName="Home"
    >
      <Tab.Screen name="Home" component={HomeFeed} />
      <Tab.Screen name="Reels" component={ReelsScreen} />
      <Tab.Screen name="Chat" component={ChatsTab} />
      <Tab.Screen name="Guard" component={GuardScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
