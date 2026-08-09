import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FileText, Circle, Sparkles, Radio, type LucideIcon } from 'lucide-react-native';
import { supabase } from '../../shared/api/supabase';
import { uploadStoryMedia } from '../../shared/api/uploadMedia';
import type { RootStackParamList } from '../../navigation/types';

type Option = { key: string; label: string; desc: string; icon: LucideIcon; color: string; enabled: boolean };

const OPTIONS: Option[] = [
  { key: 'post', label: 'Post', desc: 'Share with your Circle', icon: FileText, color: '#006290', enabled: true },
  { key: 'story', label: 'Story', desc: 'Disappears in 24 hours', icon: Circle, color: '#A855F7', enabled: true },
  { key: 'highlight', label: 'Highlight', desc: 'Coming soon', icon: Sparkles, color: '#6F7881', enabled: false },
  { key: 'live', label: 'Live', desc: 'Coming soon', icon: Radio, color: '#6F7881', enabled: false },
];

// Phase 92 — Post/Story/Highlight/Live creation picker. Post and Story are
// real, working paths; Highlight/Live are honestly disabled ("Coming
// soon") rather than faked, matching this project's established pattern
// for unimplemented surfaces (e.g. Bazaar's legal-review gap).
export default function ProfileMenuSheet() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  const postStory = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (result.canceled || !result.assets[0]) return;

    setPosting(true);
    setError('');
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setPosting(false);
      setError('Not signed in.');
      return;
    }
    const { data: profile } = await supabase.from('profiles').select('active_neighbourhood_id').eq('id', user.id).single();
    if (!profile?.active_neighbourhood_id) {
      setPosting(false);
      setError('You need a verified neighbourhood membership to post a story.');
      return;
    }

    try {
      const mediaUrl = await uploadStoryMedia(result.assets[0].uri, user.id);
      const { error: insertError } = await supabase.from('stories').insert({
        author_id: user.id,
        neighbourhood_id: profile.active_neighbourhood_id,
        media_url: mediaUrl,
      });
      setPosting(false);
      if (insertError) {
        setError(insertError.message);
        return;
      }
      navigation.goBack();
    } catch (e) {
      setPosting(false);
      setError(e instanceof Error ? `Upload failed: ${e.message}` : 'Upload failed.');
    }
  };

  const onSelect = (key: string) => {
    if (key === 'post') navigation.replace('CreatePost');
    if (key === 'story') postStory();
  };

  return (
    <View className="flex-1 bg-white px-5 pt-6">
      {posting && (
        <View className="items-center py-3">
          <ActivityIndicator color="#006290" />
          <Text className="text-[12px] text-ink-muted mt-1">Uploading your story…</Text>
        </View>
      )}
      {error !== '' && <Text className="text-[12px] text-red-600 mb-3 text-center">{error}</Text>}

      <View className="gap-3">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          return (
            <Pressable
              key={opt.key}
              onPress={() => opt.enabled && onSelect(opt.key)}
              disabled={!opt.enabled || posting}
              className="flex-row items-center gap-3.5 rounded-2xl p-4"
              style={{ backgroundColor: '#F6F9FF', opacity: opt.enabled ? 1 : 0.55 }}
            >
              <View className="w-11 h-11 rounded-full items-center justify-center" style={{ backgroundColor: `${opt.color}1A` }}>
                <Icon size={20} color={opt.color} />
              </View>
              <View>
                <Text className="text-[15px] font-bold text-[#181C20]">{opt.label}</Text>
                <Text className="text-[12px] text-ink-muted">{opt.desc}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
