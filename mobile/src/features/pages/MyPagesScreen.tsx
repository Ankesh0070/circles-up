import { useCallback, useState } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Plus, Briefcase, User, HeartHandshake } from 'lucide-react-native';
import { supabase } from '../../shared/api/supabase';
import type { RootStackParamList } from '../../navigation/types';

type Tab = 'mine' | 'discover';

type PageRow = {
  id: string;
  name: string;
  bio: string | null;
  page_type: 'personal' | 'business' | 'ngo';
  ngo_approval_status: string;
};

const TYPE_ICON = { personal: User, business: Briefcase, ngo: HeartHandshake } as const;
const TYPE_COLOR = { personal: '#2196D6', business: '#F59E0B', ngo: '#DC2626' } as const;

// Phase 78 (Group I) — "My Pages" (stats/manage live in PageDetailScreen,
// reached by tapping a card) plus a "Discover" tab so business/NGO pages
// (visible app-wide per the pages RLS policy) are actually reachable from
// somewhere, which is what makes the donation flow (Phase 79/80) testable
// through real navigation rather than only by ID.
export default function MyPagesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [tab, setTab] = useState<Tab>('mine');
  const [pages, setPages] = useState<PageRow[] | null>(null);

  const load = useCallback(async (activeTab: Tab) => {
    setPages(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    let query = supabase.from('pages').select('id, name, bio, page_type, ngo_approval_status');
    query = activeTab === 'mine' ? query.eq('owner_id', user.id) : query.neq('owner_id', user.id).in('page_type', ['business', 'ngo']);
    const { data } = await query.order('created_at', { ascending: false });
    setPages(data ?? []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(tab);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab])
  );

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <View className="flex-row px-4 py-3 gap-2">
        {(['mine', 'discover'] as Tab[]).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            className="px-3 py-1.5 rounded-full"
            style={{ backgroundColor: tab === t ? '#059669' : '#F3F4F6' }}
          >
            <Text style={{ color: tab === t ? '#fff' : '#374151', fontSize: 12, fontWeight: '700' }}>
              {t === 'mine' ? 'My Pages' : 'Discover'}
            </Text>
          </Pressable>
        ))}
      </View>

      {pages === null ? (
        <ActivityIndicator className="mt-10" color="#059669" />
      ) : (
        <FlatList
          data={pages}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => {
            const Icon = TYPE_ICON[item.page_type];
            const color = TYPE_COLOR[item.page_type];
            return (
              <Pressable
                onPress={() => navigation.navigate('PageDetail', { pageId: item.id })}
                className="flex-row items-center gap-3 bg-white rounded-2xl p-3.5"
                style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }}
              >
                <View className="w-11 h-11 rounded-full items-center justify-center" style={{ backgroundColor: `${color}1A` }}>
                  <Icon size={18} color={color} />
                </View>
                <View className="flex-1">
                  <Text className="text-[14px] font-semibold text-[#1F1B17]">{item.name}</Text>
                  {item.bio && (
                    <Text className="text-[12px] text-gray-500 mt-0.5" numberOfLines={1}>
                      {item.bio}
                    </Text>
                  )}
                </View>
                {item.page_type === 'ngo' && (
                  <View
                    className="px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: item.ngo_approval_status === 'approved' ? '#D1FAE5' : '#FEF3C7' }}
                  >
                    <Text
                      className="text-[9px] font-semibold"
                      style={{ color: item.ngo_approval_status === 'approved' ? '#065F46' : '#92400E' }}
                    >
                      {item.ngo_approval_status === 'approved' ? 'APPROVED' : item.ngo_approval_status.toUpperCase()}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <Text className="text-center text-gray-400 text-[13px] mt-6">
              {tab === 'mine' ? "You haven't created a page yet." : 'No other pages to discover yet.'}
            </Text>
          }
        />
      )}

      {tab === 'mine' && (
        <Pressable
          onPress={() => navigation.navigate('PageTypeSelector')}
          className="absolute bottom-6 right-6 w-14 h-14 rounded-full items-center justify-center"
          style={{ backgroundColor: '#059669', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }}
        >
          <Plus size={24} color="#fff" strokeWidth={2.4} />
        </Pressable>
      )}
    </View>
  );
}
