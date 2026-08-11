import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import BottomNav from './BottomNav';
import HomeFeed from '../features/feed/HomeFeed';
import ReelsScreen from '../features/reels/ReelsScreen';
import ChatsTab from '../features/chat/ChatsTab';
import BazaarScreen from '../features/bazaar/BazaarScreen';
import ProfileScreen from '../features/profile/ProfileScreen';
import type { MainTabsParamList } from './types';

const Tab = createBottomTabNavigator<MainTabsParamList>();

// Nav redesign (Circle Up Nav Redesign): Home / Reels / Chat / Bazaar /
// Profile, with Chat as the raised centre button (see BottomNav), opening on
// Home.
//
// Explore and Guard left the tab bar. Both are still one tap away as pushed
// screens — Explore from the compass in the Home header, Guard from the SOS
// pill (see TopBar) — so discovery (Scenes / Genie / Pages / people) and the
// safety hub keep their entry points without crowding the five-slot bar.
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
      <Tab.Screen name="Bazaar" component={BazaarScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
