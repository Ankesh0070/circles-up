import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import BottomNav from './BottomNav';
import HomeFeed from '../features/feed/HomeFeed';
import ExploreTab from '../features/explore/ExploreTab';
import GuardScreen from '../features/guard/GuardScreen';
import BazaarScreen from '../features/bazaar/BazaarScreen';
import ProfileScreen from '../features/profile/ProfileScreen';
import type { MainTabsParamList } from './types';

const Tab = createBottomTabNavigator<MainTabsParamList>();

// Stitch design system tab order: Explore / Feed / Guard / Bazaar / Profile,
// opening on Feed.
//
// Two deliberate changes from the old layout:
//  - `Search` is gone. It was never built (a PlaceholderScreen since Phase 1),
//    and the design doesn't have it — Explore already covers discovery.
//  - `Chats` moves out of the tab bar to a header icon on the Feed (see
//    TopBar). It's a fully-built feature, so it stays one tap away rather
//    than being dropped along with its route.
export default function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <BottomNav {...props} />}
      screenOptions={{ headerShown: false }}
      initialRouteName="Feed"
    >
      <Tab.Screen name="Explore" component={ExploreTab} />
      <Tab.Screen name="Feed" component={HomeFeed} />
      <Tab.Screen name="Guard" component={GuardScreen} />
      <Tab.Screen name="Bazaar" component={BazaarScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
