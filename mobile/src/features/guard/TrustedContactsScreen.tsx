import { useCallback, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Trash2 } from 'lucide-react-native';
import { supabase } from '../../shared/api/supabase';
import GradientButton from '../../shared/components/GradientButton';

type Contact = { id: string; name: string; phone: string; relation: string | null; last_confirmed_at: string };

const STALE_DAYS = 90; // edgecase.md §3.7 — re-confirm every ~3 months
const MAX_CONTACTS = 5;

// Ported from architecture.md's TrustedContactsScreen (Phase 50) — up to 5
// contacts, staleness prompt. Real persistence against trusted_contacts.
export default function TrustedContactsScreen() {
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('trusted_contacts').select('*').order('created_at', { ascending: true });
    setContacts(data ?? []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const addContact = async () => {
    if (!name.trim() || phone.trim().length < 10) {
      setError('Enter a name and a valid phone number.');
      return;
    }
    setSaving(true);
    setError('');
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error: insertError } = await supabase.from('trusted_contacts').insert({
      user_id: user.id,
      name: name.trim(),
      phone: phone.trim(),
      relation: relation.trim() || null,
    });
    setSaving(false);
    if (insertError) {
      setError(
        insertError.message.includes('trusted_contact_limit_exceeded')
          ? `You can save up to ${MAX_CONTACTS} trusted contacts.`
          : insertError.message
      );
      return;
    }
    setName('');
    setPhone('');
    setRelation('');
    load();
  };

  const confirmStillCurrent = async (id: string) => {
    await supabase.from('trusted_contacts').update({ last_confirmed_at: new Date().toISOString() }).eq('id', id);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from('trusted_contacts').delete().eq('id', id);
    load();
  };

  if (contacts === null) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#006290" />
      </View>
    );
  }

  const isStale = (c: Contact) => Date.now() - new Date(c.last_confirmed_at).getTime() > STALE_DAYS * 86400000;

  return (
    <View className="flex-1 bg-white">
      <FlatList
        data={contacts}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <Text className="text-[13px] text-ink-muted mb-3">
            These {contacts.length}/{MAX_CONTACTS} people get alerted (SMS + your live location) whenever you trigger SOS.
          </Text>
        }
        renderItem={({ item }) => (
          <View className="flex-row items-center gap-3 py-3 border-b border-outline-variant">
            <View className="flex-1">
              <Text className="text-[14px] font-semibold text-[#181C20]">{item.name}</Text>
              <Text className="text-[12px] text-ink-muted">
                {item.phone}
                {item.relation ? ` · ${item.relation}` : ''}
              </Text>
              {isStale(item) && (
                <Pressable onPress={() => confirmStillCurrent(item.id)} className="mt-1">
                  <Text className="text-[11px] text-amber-600 font-medium">Still current? Tap to confirm</Text>
                </Pressable>
              )}
            </View>
            <Pressable onPress={() => remove(item.id)} hitSlop={8}>
              <Trash2 size={18} color="#EF4444" />
            </Pressable>
          </View>
        )}
        ListEmptyComponent={<Text className="text-center text-ink-muted text-[13px] mt-6">No trusted contacts yet.</Text>}
        ListFooterComponent={
          contacts.length < MAX_CONTACTS ? (
            <View className="mt-5">
              <Text className="text-[13px] font-bold text-[#181C20] mb-2">Add a contact</Text>
              <TextInput value={name} onChangeText={setName} placeholder="Name" className="bg-surface-container rounded-xl px-3 py-2.5 text-[13px] mb-2" />
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="Phone number"
                keyboardType="phone-pad"
                className="bg-surface-container rounded-xl px-3 py-2.5 text-[13px] mb-2"
              />
              <TextInput
                value={relation}
                onChangeText={setRelation}
                placeholder="Relation (optional)"
                className="bg-surface-container rounded-xl px-3 py-2.5 text-[13px] mb-2"
              />
              {error !== '' && <Text className="text-[12px] text-red-600 mb-2">{error}</Text>}
              <GradientButton onPress={addContact} disabled={saving}>
                {saving ? 'Saving…' : 'Add contact'}
              </GradientButton>
            </View>
          ) : (
            <Text className="text-[12px] text-ink-muted mt-4 text-center">
              You've reached the {MAX_CONTACTS}-contact limit. Remove one to add another.
            </Text>
          )
        }
      />
    </View>
  );
}
