import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import PlaceholderScreen from './PlaceholderScreen';
import BottomNav from './BottomNav';
import HomeFeed from '../features/feed/HomeFeed';
import ChatsTab from '../features/chat/ChatsTab';
import type { MainTabsParamList } from './types';

const Tab = createBottomTabNavigator<MainTabsParamList>();

// 5-tab layout: Home / Explore / Chats / Search / Profile, custom tab bar
// (Phase 23) with the elevated gradient Chats pill. Tab *content* is real as
// each phase lands — Home (Phase 29) is real; the rest still PlaceholderScreen.
export default function MainTabs() {
  return (
    <Tab.Navigator tabBar={(props) => <BottomNav {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeFeed} />
      <Tab.Screen name="Explore">{() => <PlaceholderScreen name="Explore" />}</Tab.Screen>
      <Tab.Screen name="Chats" component={ChatsTab} />
      <Tab.Screen name="Search">{() => <PlaceholderScreen name="Search" />}</Tab.Screen>
      <Tab.Screen name="Profile">{() => <PlaceholderScreen name="Profile" />}</Tab.Screen>
    </Tab.Navigator>
  );
}
